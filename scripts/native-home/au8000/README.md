# Native Home control — AU8000 / Tizen 6.0 profile

A separate reference profile from [the LS03D / Tizen 9 helper](../README.md) and
[the LS03T / Tizen 5.5 profile](../frame-2020/README.md). It records what an authorised,
non-root, public-signed experiment found on a **UN50AU8000-class TV (Tizen 6.0, ARMv7)**,
and the adapted helper used to establish it.

Read [the device report](../../../docs/native-home-au8000.md) and
[the staged setup guide](../../../docs/agent-tv-setup-guide.md) first. The existing
reference-TV helper and its model guard remain unchanged; do not remove that guard to run
anything here.

## Outcome (read this first)

**The physical Home button CAN be reassigned to the sideloaded launcher on this TV — working.**
The mechanism is a row in a SQLite key-routing database, not vconf:
`/opt/dbspace/.app-context.db`, table `key_filter`, row `key='XF86Home'`. [`home_db.py`](home_db.py)
backs up, edits and restores it. This mechanism was established by, and adapted from,
[DavidNgugi/samsung-tv-unlock](https://github.com/DavidNgugi/samsung-tv-unlock) on the same
firmware `T-NKLAUABC-2310.0`.

The `Control.cs` helper below (main Home operation + `home_appid` / `first_screen/type` /
`overlay_home_appid`) governs only the **warm-wake / first screen**; those keys do **not** move
the physical Home button (verified). `util_is_appbooting_supported_webapp_byappid()` returns 0
for every app id here and is not the gate. **Cold boot** still opens the TV viewer because
`db/appfw/startup_appid` does not exist and the SDK user cannot create a system key.

## home_db.py — the physical Home key

`home_db.py` runs as SDK UID 901 through the owner-supplied injection transport (kept in
`.local/`). Subcommands:

| Command | Effect |
| --- | --- |
| `backup` | Copy the stock `.app-context.db` (+journal) to a local backup (the restore source) |
| `dump` | Print the `key_filter` `XF86Home` rows and `managed_app` schema from the local copy |
| `apply` | Register the launcher in `managed_app` (ui_type NULL) and point the `XF86Home` row at `package:<APP_ID>`, then replace the live DB |
| `restore` | Push the stock DB back into place |

`apply`/`restore` replace the live DB (`rm` live + journal, `cp` the new file as UID 901). The
key router reads the file at boot, so **a wall power-cycle is required** after either. Always
`backup` before the first `apply`.

## What differs from the Tizen 9 reference helper (all established on-device)

| Area | Tizen 9 reference | This TV (Tizen 6.0) |
| --- | --- | --- |
| .NET runtime on TV | .NET 6 | .NET Core **3.1 only** → target `netcoreapp3.1` |
| Home-operation reader | `libaul` `aul_get_default_app` | **absent**; use `app_operation_get_current_app` (app-operation-tv) |
| `db/appfw/startup_appid` | present | **absent**; excluded from managed keys, never recreated |
| Physical Home control | home_appid + main operation | also `db/first_screen/type` and `db/appfw/overlay_home_appid` |
| Boot eligibility | positive | `util_is_appbooting_supported...` returns 0 for all apps |

## Build (Docker, nothing installed on the host)

The helper only P/Invokes native TV libraries (resolved on-device), so a plain .NET Core 3.1
SDK image builds it — no Tizen NuGet needed. Fill the three placeholder constants in
`Control.cs` (`<APP_ID>`, `<PACKAGE_ID>`, `<FIRMWARE>`) from your private config first.

```sh
docker run --rm -v "$PWD/scripts/native-home/au8000:/src" -w /src \
  mcr.microsoft.com/dotnet/sdk:3.1 dotnet publish -c Release -o /src/out
```

This produces `CleanFrameHomeControl.dll`, `.runtimeconfig.json` and `.deps.json`.

## Modes

`Control.cs` exposes `query`, `eligible <appid>`, `applyhome SNAPSHOT`, `applyfs SNAPSHOT`
and `restore SNAPSHOT`. Each checks UID 901, 32-bit ARM and exact firmware. `applyhome` sets
the main Home operation + `home_appid`; `applyfs` additionally sets `first_screen/type` and
`overlay_home_appid`. `restore` returns all four string keys and the Home operation to the
captured original. The matching `*.sh` wrappers invoke the staged DLL; `inspect.sh` is a
read-only device survey.

## Transport, baseline and private files

The SDK-user staging/invocation transport is **owner-supplied and intentionally not recorded
here**, consistent with the frame-2020 profile. Query/inspect still stage temporary files and
are authorised device operations. The compiled DLL, the captured `CleanFrameHomeOriginal.json`
baseline and any device/identity values live only in ignored `.local/native-home/`; GitHub is
a source backup, not a recovery store.

### Captured original state (this TV, for reference; values are per-device)

```
Home operation (main)        = <samsung home webapp id>
db/appfw/home_appid          = org.tizen.tv-viewer
db/appfw/booting_appid_backup= org.tizen.tv-viewer
db/first_screen/type         = com.samsung.tv.csfs
db/appfw/overlay_home_appid  = com.samsung.tv.csfs
db/appfw/startup_appid       = (absent)
db/menu/smart_hub/ontvsetting/auto_start = 0
```

## Important observation: asynchronous commit

On this TV, `vconf` / operation writes commit asynchronously through this transport. Immediately
after a write, a fresh process may still read a stale value, and rapid back-to-back writes in a
single process (e.g. apply-then-restore) can leave only the first committed. Protocol: issue one
logical operation per invocation, wait ~20 s, then confirm with two spaced read-only queries.
apply and restore were each verified to persist and hold this way.
