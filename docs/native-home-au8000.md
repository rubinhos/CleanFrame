# UN50AU8000 (Tizen 6.0): native Home investigation report

A device report for an authorised, non-root experiment on a **Samsung UN50AU8000-class TV**
(internal model `T-NKLAUABC`, firmware generation `…-2310.0`, **Tizen 6.0.0, ARMv7/32-bit**).
It records what was tried to make the physical **Home** button open an installed public-signed
web launcher, and why it did not succeed on this firmware. The adapted helper and wrappers are
in [`scripts/native-home/au8000/`](../scripts/native-home/au8000/README.md). Personal values
(addresses, device identifier, certificate and application identities) are kept out of this
report and out of the committed source.

This complements, and does not change, the reference results in
[tv-status.md](tv-status.md) or the other reports in [compatibility.md](compatibility.md).

## Summary

- The launcher **installs, signs, launches and is fully usable** with the normal remote,
  including the fork's input dock and saved-channel features.
- The **physical Home button could not be reassigned** to the launcher. It keeps opening
  Samsung's menu even with every writable Home key pointed at the launcher.
- Root cause: `util_is_appbooting_supported_webapp_byappid()` returns **0 for every app id**
  on this firmware — including Samsung's own Home apps — so the real Home-launch path is a
  protected platform mechanism a public-signed web app cannot enter. This matches the earlier
  UN58TU7020 (Tizen 5.5) result where native Home also could not be achieved.

## Device capability (read-only survey, as SDK user UID 901)

| Item | Value |
| --- | --- |
| Model / firmware | `T-NKLAUABC`, `…-2310.0`, Tizen 6.0.0, armv7l |
| Arbitrary `sdb shell` | Closed (returns empty / `closed`), like the TU7020 |
| SDK-user execution | Works via the reviewed appinstall-argument route; runs as **UID 901 (sdk)** |
| .NET runtime on TV | Microsoft.NETCore.App **2.0–3.1 only** (no .NET 6) |
| Native libs present | `libapp-context-manager-common.so`, `libcapi-appfw-app-operation-tv.so.0`, `libvconf.so.0` |

### Helper adaptations required for Tizen 6.0

1. **Target runtime `netcoreapp3.1`** (the reference helper targeted .NET 6).
2. **Home-operation reader:** `libaul`'s `aul_get_default_app` is absent. The app-operation-tv
   library exports the matching reader `app_operation_get_current_app`, used instead.
3. **`db/appfw/startup_appid` is absent** on this TV and is excluded from the managed keys, so
   restore never recreates it.

## Original Home state (captured baseline)

```
Home operation (http://tizen.org/appcontrol/operation/main) = <samsung home webapp id>
db/appfw/home_appid           = org.tizen.tv-viewer
db/appfw/booting_appid_backup = org.tizen.tv-viewer
db/first_screen/type          = com.samsung.tv.csfs
db/appfw/overlay_home_appid   = com.samsung.tv.csfs
db/appfw/startup_appid        = (absent)
db/menu/smart_hub/ontvsetting/auto_start = 0
```

Read, write and exact-value restore of all of these were verified reliable (see the async-commit
note below). The TV was returned to this exact state at the end.

## What was tried, and the physical result

| Keys set to the launcher | Physical Home button |
| --- | --- |
| Main Home operation + `db/appfw/home_appid` | Opens Samsung menu (no change) |
| + `db/first_screen/type` | Still Samsung menu; Home now **exits** the app instead of overlaying |
| + `db/appfw/overlay_home_appid` | Still Samsung menu (no change) |

Each applied state was confirmed in software by a settled, independent query before the physical
check. None redirected the physical button.

## The eligibility gate

The function that governs app-booting support is
`util_is_appbooting_supported_webapp_byappid()` in `libapp-context-manager-common.so`. Its
string table references the metadata key `http://samsung.com/tv/metadata/appbootingsupport`
(and `…/disable.appbooting`). Adding `appbootingsupport=true` to the launcher manifest (verified
present in the installed package manifest) **did not** change the result, and the function
returns **0 for every app id tested**, including `WykOS4t4F0.cmsWebApp` (the live Home operation
holder), `org.tizen.tv-viewer` (`home_appid`) and `com.samsung.tv.csfs`. Eligibility therefore
depends on a platform/partner condition a public app cannot satisfy here; it is not a manifest
flag a self-signed app can set.

## Asynchronous-commit caveat

`vconf` / operation writes commit asynchronously through this transport. A fresh process can read
a stale value immediately after a write, and two writes in one process (apply-then-restore) can
leave only the first committed. Reliable protocol: **one logical operation per invocation, wait
~20 s, confirm with two spaced read-only queries.** Both apply and restore were verified to
persist and hold this way; the TV was confirmed back at its original state at the end.

## Conclusion

Native Home reassignment is **not achievable** on this TV with non-root, public-signed methods.
The only untried route is a signed TPK that intercepts the `XF86Home` key event, which the owner
had already found Samsung's own rule overrides on the UN58TU7020; it is not expected to behave
differently here. The launcher remains fully usable as a manually opened app.
