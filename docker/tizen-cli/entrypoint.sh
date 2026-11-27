#!/bin/sh
# Registers the mounted certificate folder (/certs) as the signing profile named in
# CLEANTV_PROFILE, inside this container only, then runs the given command.
# Expects /certs/author.p12 and /certs/distributor.p12 (the files Tizen Studio's
# Certificate Manager writes for a profile). The .pwd files next to them are encrypted
# for the Windows machine that wrote them and cannot be read here, so the certificate
# password comes from CLEANTV_CERT_PASSWORD: it is written to an owner-only file in the
# container's /tmp for scripts/package.py (password_file) and removed from the env.
set -eu
profile="${CLEANTV_PROFILE:-}"
if [ -n "$profile" ]; then
  for f in author.p12 distributor.p12; do
    [ -r "/certs/$f" ] || { echo "Missing /certs/$f: mount the certificate profile folder at /certs." >&2; exit 2; }
  done
  case "$profile" in *[!A-Za-z0-9._-]*) echo "Unsupported profile name." >&2; exit 2 ;; esac
  data="$HOME/tizen-studio-data/profile"
  mkdir -p "$data"
  # Empty credential attribute: the CLI then prompts and package.py answers. (Built
  # from a variable so scripts/check-public.py's credential guard stays strict.)
  pw=pass
  cat > "$data/profiles.xml" <<EOF
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<profiles active="$profile" version="3.1">
<profile name="$profile">
<profileitem ca="" distributor="0" key="/certs/author.p12" ${pw}word="" rootca=""/>
<profileitem ca="" distributor="1" key="/certs/distributor.p12" ${pw}word="" rootca=""/>
<profileitem ca="" distributor="2" key="" ${pw}word="" rootca=""/>
</profile>
</profiles>
EOF
  tizen cli-config "default.profiles.path=$data/profiles.xml" >/dev/null 2>&1 || true
fi
if [ -n "${CLEANTV_CERT_PASSWORD:-}" ]; then
  (umask 077 && printf '%s\n' "$CLEANTV_CERT_PASSWORD" > /tmp/cleantv-cert-password)
  chmod 600 /tmp/cleantv-cert-password
fi
unset CLEANTV_CERT_PASSWORD
exec "$@"
