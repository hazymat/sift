# Sift server

Keeps your devices in step. It stores only **encrypted** copies of your data: the app scrambles everything on your device first, with a key that never leaves your devices, so the server (and anyone who gets into it) sees nothing readable. Plain Node 24 with its built-in SQLite; no other software to install.

You need one of:

- a small machine at home (a Raspberry Pi, a Proxmox container, an old PC) that your phone and laptop can reach, e.g. over a VPN; or
- a small server on the internet (a VPS).

## Install: Ubuntu or Debian

Copy this `server/` folder to the machine, then, as root:

```bash
# Home network (use the machine's address: a name like sift.lan, an IP, or both
# separated by a comma, e.g. sift.lan,<ip>):
sudo ./install.sh home sift.lan

# Internet (the domain must already point at the machine; ports 80 and 443 open):
sudo ./install.sh public sift.example.com
```

This installs Node 24 and Caddy (which does the HTTPS), creates a `sift` user, puts the code in `/opt/sift-server`, your settings in `/etc/sift/sift.env` and your data in `/var/lib/sift`, and starts two services: `sift-server` and `caddy`. Run it again any time; it keeps your settings and data.

Check it: open `https://<address>/api/health` in a browser. You should see `{"ok":true,...}`.

Then in Sift: **Settings → Sync**, type the server address, and **Create account**. Save the recovery code somewhere safe: it's the only way back in if you forget your password.

## Install: Docker (a VPS)

```bash
echo "SIFT_DOMAIN=sift.example.com" > .env
docker compose up -d --build
```

Caddy gets a real certificate for the domain. Settings (`REGISTRATION`, `ALLOWED_ORIGINS`, `QUOTA_MB`) go in the same `.env`. Docker on Proxmox containers can fail (an AppArmor clash); use the plain install there.

## Trusting the home certificate

**Only home installs (`install.sh home`) need this.** A server installed with `install.sh public <domain>` gets a real certificate from Let's Encrypt, which every device already trusts; skip this section.

A home server has no public domain, so Caddy makes its own certificate authority and each device trusts it once. The easiest way is from the device itself: in Sift, Settings → Sync, type the server's address and use **Get the certificate** (it opens `http://<address>/sift-ca.crt`). A name such as `sift.lan` works only if your router (or each device) knows it; otherwise use the IP, or install with both (`sift.lan,<ip>`). If the download says the file isn't there, Caddy hadn't finished making its certificate when you installed: run `sudo ./install.sh update`.

Or get the root certificate from the machine:

```bash
scp root@<address>:/var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt sift-home-ca.crt
```

- **Windows**: double-click the file → Install Certificate → Local Machine → "Trusted Root Certification Authorities".
- **iPhone**: open `http://<address>/sift-ca.crt` in **Safari** (not WhatsApp or Files; those can't install it) and allow the download. Then Settings → Profile Downloaded → Install; then Settings → General → About → Certificate Trust Settings → switch it on. After an iOS update, check that switch again: it can be turned off.
- **Android**: download it, then Settings → Security → Encryption & credentials → Install a certificate → CA certificate.
- **Mac**: double-click → Keychain Access → set "Always Trust".

Keep this certificate out of any public repository.

Chrome will also ask once whether the site may "access devices on your local network" when the app calls a private address. Allow it.

## Everyday care

`sift-admin` (installed by `install.sh`; run as root):

```bash
sift-admin users                    # accounts, devices, stored size
sift-admin devices [email]          # devices and when each last synced
sift-admin revoke <device id>       # sign one device out (a lost phone)
sift-admin registration [first|open|closed]
sift-admin rename-user <old email> <new email>
sift-admin delete-user <email>
```

With Docker: `docker compose exec sift node admin.js users`.

**Settings** are in `/etc/sift/sift.env`; after editing, `systemctl restart sift-server`.
- `REGISTRATION`: `first` (default) lets the first account be created and then closes; `open`; `closed`.
- `ALLOWED_ORIGINS`: the web address(es) the app runs from. Add yours if you host the app yourself.
- `QUOTA_MB`: per-account storage limit.

**Update**: get the new code, then `sudo ./install.sh update`.

**Backup**: everything is one file, `/var/lib/sift/sift.db` (the folder also holds `-wal` and `-shm` files while running). Copy it while the server is stopped (`systemctl stop sift-server`), or take a consistent copy any time with (`apt install sqlite3` first):

```bash
sqlite3 /var/lib/sift/sift.db ".backup /root/sift-backup.db"
```

The copy is still encrypted; it's useless without your password. Your devices also hold complete copies, and Sift's own backup file (Settings → Backup) is independent of the server.

**Test**: `node test.js` starts a throwaway server and runs a register / sign in / push / conflict / pull check.

## Hardening

- The server listens only on `127.0.0.1`; Caddy is the only thing exposed. Keep it that way.
- Leave `REGISTRATION=first` (or `closed`) unless you're inviting people.
- Sign-in is limited to 10 wrong tries per 15 minutes.
- Keep the machine updated (`apt upgrade`), and reachable only over your VPN if it's at home.
- Never put the server's address or certificate in a public repository.
