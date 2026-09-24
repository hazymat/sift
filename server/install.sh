#!/usr/bin/env bash
# Install or update the Sift server on Ubuntu / Debian (run as root, from this folder).
#
#   sudo ./install.sh home   192.168.1.20     # LAN: HTTPS from Caddy's own certificate authority
#   sudo ./install.sh public sift.example.com # internet: automatic Let's Encrypt certificate
#   sudo ./install.sh update                  # after `git pull`: refresh the code, keep settings and data
#
# Everything is fetched over https. Safe to run again.

set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Run as root (sudo)."; exit 1; }

MODE="${1:-}"; ADDRESS="${2:-}"
case "$MODE" in
  home|public) [ -n "$ADDRESS" ] || { echo "Usage: $0 $MODE <address>"; exit 1; } ;;
  update) ;;
  *) sed -n '2,8p' "$0" | sed 's/^# \?//'; exit 1 ;;
esac

HERE="$(cd "$(dirname "$0")" && pwd)"
APP=/opt/sift-server

# --- Node 24 (the server uses node:sqlite) ---
need_node=1
if command -v node >/dev/null; then
  [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 24 ] && need_node=0
fi
if [ "$need_node" = 1 ]; then
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y -qq nodejs
fi

# --- user, code, data, settings ---
id sift >/dev/null 2>&1 || useradd --system --home /var/lib/sift --shell /usr/sbin/nologin sift
install -d -o sift -g sift -m 700 /var/lib/sift
install -d "$APP" /etc/sift
install -m 644 "$HERE"/server.js "$HERE"/admin.js "$HERE"/package.json "$APP"/
[ -f /etc/sift/sift.env ] || install -m 640 -o root -g sift "$HERE"/deploy/sift.env.example /etc/sift/sift.env
install -m 644 "$HERE"/deploy/sift-server.service /etc/systemd/system/sift-server.service
# `registration` edits /etc/sift/sift.env and restarts the service, which needs root.
cat > /usr/local/bin/sift-admin <<'WRAP'
#!/bin/sh
if [ "$1" = registration ]; then exec env DATA_DIR=/var/lib/sift /usr/bin/node /opt/sift-server/admin.js "$@"; fi
exec runuser -u sift -- env DATA_DIR=/var/lib/sift /usr/bin/node /opt/sift-server/admin.js "$@"
WRAP
chmod 755 /usr/local/bin/sift-admin
systemctl daemon-reload
systemctl enable --now sift-server
systemctl restart sift-server

# --- Caddy (HTTPS in front) ---
if [ "$MODE" != update ]; then
  if ! command -v caddy >/dev/null; then
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gnupg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq
    apt-get install -y -qq caddy
  fi
  sed "s/__ADDRESS__/$ADDRESS/" "$HERE/deploy/Caddyfile.$MODE" > /etc/caddy/Caddyfile
  systemctl enable caddy
  systemctl restart caddy
fi

sleep 1
systemctl is-active sift-server >/dev/null && echo "sift-server is running."
if [ "$MODE" = home ]; then
  echo "Devices must trust Caddy's certificate authority once. Copy it with:"
  echo "  scp root@$ADDRESS:/var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt ./sift-home-ca.crt"
  echo "and see README.md (\"Trusting the home certificate\")."
fi
[ "$MODE" = update ] || echo "Check: https://$ADDRESS/api/health   Then in Sift: Settings -> Sync -> server https://$ADDRESS"
