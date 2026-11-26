#!/usr/bin/env python3
"""Physical Home-key routing for the AU8000 / Tizen 6.0 (firmware T-NKLAUABC-2310.0).

The physical Home key is NOT a vconf value on this firmware. It is a row in the SQLite
key-routing database /opt/dbspace/.app-context.db (table key_filter, key='XF86Home'). This
tool backs up, edits and restores that routing. It runs as SDK UID 901 through the appinstall
injection route (same foothold as scripts/native-home/run.py); /opt/dbspace is group-writable
by system_share, which UID 901 is in, so the live DB is replaced by rm + cp. The router reads
the file at boot, so a wall power-cycle is required after apply/restore.

Mechanism credit: https://github.com/DavidNgugi/samsung-tv-unlock (same firmware).

No root. Reversible: always run `backup` before the first `apply`; keep the stock DB.

  TV_IP=192.168.1.5 CLEANFRAME_APP_ID=<APP_ID> python3 home_db.py backup|dump|apply|restore

Personal values (TV address, application id) come from the environment; nothing device- or
owner-specific is hard-coded here. The backup lives in ignored .local/.
"""
import base64, hashlib, os, shutil, sqlite3, subprocess, sys, time

SDB = os.environ.get("SDB", os.path.expanduser("~/tizen-studio/tools/sdb"))
HOST = os.environ.get("TV_IP", "127.0.0.1") + ":26101"
APP = os.environ.get("CLEANFRAME_APP_ID", "<APP_ID>")   # the launcher's application id
STAGE = "/home/owner/share/tmp/sdk_tools/"
LIVE = "/opt/dbspace/.app-context.db"
LIVEJ = LIVE + "-journal"
BK = os.environ.get("CLEANFRAME_HOMEDB_DIR",
                    os.path.join(os.path.dirname(__file__), "../../../.local/native-home/au8000-home-db"))
BK = os.path.abspath(BK)


def sdb(*a, t=40):
    return subprocess.run([SDB, *a], capture_output=True, text=True, timeout=t)


def inject(cmd):
    """Run `cmd` as UID 901 via the reviewed appinstall-argument route."""
    enc = base64.b64encode(cmd.encode()).decode()
    name = "new2.tpk`printf${IFS}%s${IFS}" + enc + "|base64${IFS}-d|bash`.tpk"
    return sdb("-s", HOST, "shell", "0 appinstall tpk " + name)


def run_out(cmd):
    out = STAGE + "o-" + hashlib.sha1(os.urandom(8)).hexdigest()[:12]
    inject("{ " + cmd + " ; } > " + out + " 2>&1")
    time.sleep(2.5)
    local = os.path.join(BK, "_out.txt")
    sdb("-s", HOST, "pull", out, local)
    try:
        return open(local, encoding="utf-8", errors="replace").read()
    except FileNotFoundError:
        return "(no output)"


def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "backup"
    sdb("connect", os.environ.get("TV_IP", "127.0.0.1"))
    os.makedirs(BK, exist_ok=True)
    stock = os.path.join(BK, "app-context-STOCK.db")

    if mode == "backup":
        print(run_out("cp " + LIVE + " " + STAGE + "ac_stock.db; "
                      "cp " + LIVEJ + " " + STAGE + "ac_stock.db-journal 2>/dev/null; "
                      "ls -l " + STAGE + "ac_stock.db*"))
        sdb("-s", HOST, "pull", STAGE + "ac_stock.db", stock)
        sdb("-s", HOST, "pull", STAGE + "ac_stock.db-journal", stock + "-journal")
        print("stock:", os.path.getsize(stock), sha(stock)[:16])

    elif mode == "dump":
        c = sqlite3.connect(stock)
        print("key_filter XF86Home:")
        for r in c.execute("SELECT appid,key,target_selector,args FROM key_filter WHERE key='XF86Home'"):
            print(" ", r)
        print("managed_app has launcher:", list(c.execute("SELECT * FROM managed_app WHERE appid=?", (APP,))))
        c.close()

    elif mode == "apply":
        if APP.startswith("<"):
            sys.exit("set CLEANFRAME_APP_ID to the launcher application id")
        edit = os.path.join(BK, "app-context-EDIT.db")
        shutil.copy(stock, edit)
        c = sqlite3.connect(edit)
        c.execute("INSERT OR IGNORE INTO managed_app(appid, ui_type, source) VALUES(?,NULL,NULL)", (APP,))
        c.execute("UPDATE key_filter SET target_selector=?, args=NULL "
                  "WHERE key='XF86Home' AND appid='com.samsung.tv.csfs'", ("package:" + APP,))
        c.commit()
        for r in c.execute("SELECT appid,target_selector,args FROM key_filter WHERE key='XF86Home'"):
            print(" ", r)
        c.close()
        sdb("-s", HOST, "push", edit, STAGE + "ac_edit.db")
        print(run_out("rm -f " + LIVE + " " + LIVEJ + "; cp " + STAGE + "ac_edit.db " + LIVE +
                      "; chmod 644 " + LIVE + "; ls -l " + LIVE))
        print("APPLIED. Power-cycle the TV at the wall, then test Home.")

    elif mode == "restore":
        sdb("-s", HOST, "push", stock, STAGE + "ac_restore.db")
        print(run_out("rm -f " + LIVE + " " + LIVEJ + "; cp " + STAGE + "ac_restore.db " + LIVE +
                      "; chmod 644 " + LIVE + "; ls -l " + LIVE))
        print("RESTORED stock Home DB. Power-cycle the TV at the wall.")

    else:
        sys.exit("usage: home_db.py backup|dump|apply|restore")


if __name__ == "__main__":
    main()
