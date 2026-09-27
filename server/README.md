# Sift server

Keeps your devices in step. It stores only **encrypted** copies of your data: the app scrambles everything on your device first, with a key that never leaves your devices, so the server (and anyone who gets into it) sees nothing readable. Plain Node 24 with its built-in SQLite; no other software to install.

You need one of:

- a small machine at home (a Raspberry Pi, a Proxmox container, an old PC) that your phone and laptop can reach, e.g. over a VPN; or
- a small server on the internet (a VPS).

## Accounts and passwords: the short version

Accounts are made in the app, never on the server. Everything is encrypted on your device with a key made from your password, so the server never sees a password and can't set, read or reset one.

| To do this | Do this |
|---|---|
| Create the first account | In Sift: Settings → Sync, type the server address, then email and password, and **Create account**. Save the recovery code it shows. |
| Add another person | On the server: `sudo sift-admin registration open`. They create their account in Sift as above. Then `sudo sift-admin registration closed`. |
| Change a password | In Sift, signed in: Settings → Sync → **Change password** (needs the current one). Other devices are signed out and sign in again with the new one. |
| Forgotten password | In Sift: Settings → Sync → **Forgot password?**, then the email, the recovery code and a new password. Other devices are signed out. |
| Forgotten password and lost recovery code | The data on the server can't be opened by anyone. On a device that still has the notes, make a backup first (Settings → Backup). Then `sudo sift-admin delete-user <email>`, open registration, create the account again and restore the backup. |
| Change an account's email | `sudo sift-admin rename-user <old email> <new email>` |
| Remove an account | `sudo sift-admin delete-user <email>` (deletes everything stored for it) |
| See accounts | `sudo sift-admin users` |

**Create account** only shows once the server address is typed and the server is accepting new accounts. By default (`REGISTRATION=first`) that's only until the first account exists; after that it closes by itself. With Docker, use `docker compose exec sift node admin.js <command>`; to change registration there, set `REGISTRATION` in `.env` and run `docker compose up -d`.

## Install: Ubuntu or Debian

Copy this `server/` folder to the machine, then, as root:

```bash
# Home network (use the machine's address: a name like sift.lan, an IP, or both
# separated by a comma, e.g. sift.lan,<ip>):
sudo ./install.sh home sift.lan

# Internet (the domain must already point at the machine; ports 80 and 443 open):
sudo ./install.sh public sift.example.com

# A machine that already runs a web server (Apache, nginx, ISPConfig): see the next section.
sudo ./install.sh proxy
```

This installs Node 24 and Caddy (which does the HTTPS), creates a `sift` user, puts the code in `/opt/sift-server`, your settings in `/etc/sift/sift.env` and your data in `/var/lib/sift`, and starts two services: `sift-server` and `caddy`. Run it again any time; it keeps your settings and data.

Check it: open `https://<address>/api/health` in a browser. You should see `{"ok":true,...}`.

Then create your account in Sift (see [Accounts and passwords](#accounts-and-passwords-the-short-version)). Save the recovery code somewhere safe: it's the only way back in if you forget your password.

## Install: behind a web server you already run

If the machine already has a web server on ports 80 and 443 (Apache, nginx, a control panel such as ISPConfig or Plesk), don't use `public`: Caddy would fight it for those ports and the existing sites would stop. Install the server on its own instead:

```bash
sudo ./install.sh proxy
```

This does everything `public` does except Caddy. The server listens only on `127.0.0.1:8787`, which nothing outside the machine can reach. Check it with `curl -s http://127.0.0.1:8787/api/health`.

Then make an HTTPS site for it (e.g. `sift.example.com`, with its DNS pointing at the machine and a Let's Encrypt certificate) and pass `/api/` through to the server.

**Apache**: switch on the proxy modules once (`sudo a2enmod proxy proxy_http`, then `sudo systemctl reload apache2`; sites that don't use them are unaffected), then in the site's HTTPS settings:

```apache
ProxyPreserveHost On
ProxyPass /api/ http://127.0.0.1:8787/api/
ProxyPassReverse /api/ http://127.0.0.1:8787/api/
LimitRequestBody 33554432
```

With **ISPConfig**: Sites → Add website, tick SSL and Let's Encrypt SSL, PHP off. Put the four lines above in the site's Options tab, "Apache Directives". They affect only that site.

**nginx**, in the site's `server { listen 443 ssl; ... }` block:

```nginx
client_max_body_size 32m;
location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Both add the caller's address as the last `X-Forwarded-For` entry, which is the one the server uses for its sign-in limits. Check `https://sift.example.com/api/health` in a browser, then create your account in Sift straight away.

To update later: get the new code, then `sudo ./install.sh update`.

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
- Sign-in is limited to 10 wrong tries per 15 minutes, for each email and for each address.
- On a machine that serves other sites, use `install.sh proxy`, never `public` (see [Behind a web server you already run](#install-behind-a-web-server-you-already-run)).
- Keep the machine updated (`apt upgrade`), and reachable only over your VPN if it's at home.
- Never put the server's address or certificate in a public repository.
