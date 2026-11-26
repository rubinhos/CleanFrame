set -eu
# Diagnostic: report util_is_appbooting_supported_webapp_byappid() for several app ids.
# On this firmware every app id returns 0, including Samsung's own Home apps.
printf 'CLEANFRAME_HOME_INSPECT_BEGIN\n'
for a in "$@"; do
  /usr/bin/dotnet /home/owner/share/tmp/sdk_tools/CleanFrameHomeControl.dll eligible "$a" || true
done
printf 'CLEANFRAME_HOME_INSPECT_END\n'
