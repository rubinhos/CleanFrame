# UN50AU8000 (Tizen 6.0): native Home replacement

A device report for an authorised, non-root experiment on a **Samsung UN50AU8000GXZD**
(internal model `T-NKLAUABC`, firmware `…-2310.0`, **Tizen 6.0.0, ARMv7/32-bit**). It records
how the physical **Home** button was reassigned to the sideloaded launcher, the mechanism and
its limits. Tooling is in [`scripts/native-home/au8000/`](../scripts/native-home/au8000/README.md).
Personal values (addresses, device identifier, certificate and application identities) are kept
out of this report and out of the committed source.

The physical-Home mechanism below was established by, and adapted from,
[DavidNgugi/samsung-tv-unlock](https://github.com/DavidNgugi/samsung-tv-unlock), which first
documented it on the same firmware `T-NKLAUABC-2310.0`.

## Summary

- The launcher **installs, signs, launches and is fully usable** with the normal remote.
- The **physical Home button can be reassigned** to the launcher — **working on this TV**.
- The mechanism is **not** vconf. The Home key is a row in a SQLite key-routing database;
  editing vconf (`home_appid`, `first_screen/type`, `overlay_home_appid`, the main app-control
  operation) has **no effect on the physical Home button** (verified first-hand). Those keys
  govern the warm-wake / first screen only.
- **Reversible, no root:** a data-plane edit of a system DB file, applied as SDK UID 901, with
  the stock DB kept for restore. A wall power-cycle is required to load it.

## The physical Home key (what actually works)

The physical Home key is a row in `/opt/dbspace/.app-context.db`, table `key_filter`:

```
appid='com.samsung.tv.csfs'  key='XF86Home'  request='launch'
  target_selector='package:com.samsung.tv.csfs'  args='entry_point:smarthub_key'
```

To route it to the launcher (`package:` holds the **application id**, not the package name):

```sql
INSERT OR IGNORE INTO managed_app(appid, ui_type, source) VALUES('<APP_ID>', NULL, NULL);
UPDATE key_filter SET target_selector='package:<APP_ID>', args=NULL
  WHERE key='XF86Home' AND appid='com.samsung.tv.csfs';
```

The launcher must be registered in `managed_app` with `ui_type = NULL` (the value full-screen
apps use). `/opt/dbspace` is group-writable by `system_share`, and UID 901 (sdk) is in that
group, so the replacement is written by: `rm` the live `.app-context.db` + its journal, then `cp`
the edited copy in. The router reads the file **at boot**, so a wall power-cycle is required.
See [`scripts/native-home/au8000/home_db.py`](../scripts/native-home/au8000/README.md).

## Device capability (read-only survey, as SDK user UID 901)

| Item | Value |
| --- | --- |
| Model / firmware | `T-NKLAUABC`, `…-2310.0`, Tizen 6.0.0, armv7l |
| Arbitrary `sdb shell` | Closed; SDK-user execution works via the appinstall-argument route as **UID 901** |
| `/opt/dbspace` | `drwxrwxr-x root system_share` — group-writable by UID 901 |
| `/usr/bin/sqlite3` | Present on the TV (edits were made locally regardless) |
| .NET runtime on TV | Microsoft.NETCore.App 2.0–3.1 only (no .NET 6) |

## Warm wake / first screen (vconf) and the cold-boot limit

For standby wake and the first screen, the stock values are overwritten with the launcher:

```
db/appfw/home_appid           stock org.tizen.tv-viewer
db/appfw/booting_appid_backup stock org.tizen.tv-viewer
db/first_screen/type          stock com.samsung.tv.csfs
db/appfw/overlay_home_appid   stock com.samsung.tv.csfs
```

**Existing** system keys can be overwritten by the SDK user; **missing** ones cannot be created.
`db/appfw/startup_appid` does not exist on this firmware, and writing it returns "Operation not
permitted". That key is the cold-boot first screen, so **a cold boot still opens the TV viewer**;
a public web-app launcher can own the Home key and warm wake, but not the cold-boot screen.

## Returning to Samsung Home after Controls / app exit (investigated 2026-11-27, not solved)

Separate from the physical Home key: closing the Samsung settings menu (CleanTV's "Controls"
→ `org.tizen.menu`) or exiting an app drops to **Samsung Home (`com.samsung.tv.csfs`)**, not
the launcher. Measured with a read-only foreground sampler (`aul_test getallappstatus`, status
2=focus 3=visible 4=bg 8=service): after the menu is dismissed, `csfs` goes to VISIBLE for ~8 s,
then the launcher returns. What was tried, and did **not** change it:

- **`db/appfw/overlay_home_appid` → launcher** (vconf): no effect on this transition; reverted.
- **`task_filter` rule on `org.tizen.menu`** (`pause`, `deactivate` and `stop` all present),
  `request=launch` → `package:<launcher>`: no effect, **including after a full wall power-cycle**.
  The rule never fired (no launcher flash), so the menu's exit to Samsung Home is a hardcoded
  route in the menu/exit path, not a framework fallback that `task_filter` can intercept. This
  matches couchroot's QN90A note that Samsung Home is hardcoded in the Exit route.
- **`task_filter` live reload does not work on this firmware**: setting
  `memory/appfw/app_context_db_change` (Int32) does not make the context manager re-read the
  rules; only a **boot** reloads them (same as `key_filter`). Plan tests around a power-cycle.

Transport notes for a future attempt: rules were edited in place with on-TV `sqlite3` as UID 901
(not whole-DB replacement), so the `XF86Home` row and SMACK label are untouched; the SDK-user
injection route **truncates long commands**, so each `INSERT`/`DELETE` must be a short, separate
call, and it runs each one **twice** (duplicate rows — harmless, `DELETE FROM task_filter` clears).

**Not yet tried (Option A):** a `task_filter` rule on `com.samsung.tv.csfs` itself (e.g.
`activate`) → launch the launcher, to catch Samsung Home whenever it comes forward. Caveats: it
would also redirect the launcher's own "open Samsung Home" control (breaking that escape), may
affect boot/warm-wake, may only yield a brief Samsung flash before the launcher, and each test
needs a power-cycle. The app-side alternative (a launcher-native controls panel so "Controls"
never launches `org.tizen.menu`) avoids the firmware entirely for the common case.

## What does NOT move the physical Home button (recorded to save repetition)

Setting any or all of the main app-control Home operation (`app_operation_set_current_app`),
`db/appfw/home_appid`, `db/first_screen/type` and `db/appfw/overlay_home_appid` to the launcher
left the physical Home button opening Samsung's menu. `util_is_appbooting_supported_webapp_byappid`
returns 0 for every app id on this firmware (including Samsung's own Home apps); it is not the
gate. The gate is the `key_filter` row above.

## Asynchronous-commit caveat (vconf)

`vconf` writes commit asynchronously through this transport: a fresh process can read a stale
value right after a write, and two writes in one process can leave only the first committed.
Protocol: one logical operation per invocation, wait ~20 s, confirm with two spaced read-only
queries. The `.app-context.db` edit is a file replacement and does not have this caveat.

## Reversal

Push the stock `.app-context.db` back (`home_db.py restore`), reset the four vconf keys to stock,
uninstall the launcher if desired, then wall power-cycle. The stock DB and its SHA are kept in
ignored `.local/native-home/au8000-home-db/`.

## Known limits

- **Cold boot** (wall power) still opens the TV viewer — see above.
- A **firmware update** can restore the stock DB and keys; re-apply afterward.
- SMACK: the replacement file carries the directory label rather than the stock `_`; accepted by
  the router on this firmware. Verify after any firmware change.
