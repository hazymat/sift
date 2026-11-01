"""Create GitHub Releases for new versions, with notes from tools/release_notes.py.

    python tools/release.py 1.22.08 <full commit hash> [1.22.09 <hash> ...]

    python tools/release.py --since 1.60.28 1.61.95 <full commit hash>

The last pair is marked latest. Full hashes only (git rev-parse <short>).
--since makes one release holding the notes of every version after the one named.
GitHub often times out: run again; "already exists" means that one is done.
"""
import datetime
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from release_notes import NOTES  # noqa: E402

os.chdir(os.path.dirname(HERE))
a = sys.argv[1:]
since = None
if a[:1] == ['--since']: since, a = a[1], a[2:]
key = lambda version: tuple(map(int, version.split('.')))
pairs = list(zip(a[::2], a[1::2]))
for n, (v, h) in enumerate(pairs):
    d = datetime.date.today()
    if since: notes = [line for ver in sorted((ver for ver in NOTES if key(since) < key(ver) <= key(v)), key=key, reverse=True) for line in [f'### {ver}'] + NOTES[ver] + ['']]
    else: notes = NOTES[v]
    body = f'Released {d.day} {d:%B %Y}.\n\n' + '\n'.join(notes) + '\n'
    r = subprocess.run(['gh', 'release', 'create', f'v{v}', '--target', h, '--title', v, '--notes', body,
                        f'--latest={"true" if n == len(pairs) - 1 else "false"}'],
                       capture_output=True, text=True, encoding='utf-8', timeout=60)
    print(v, 'ok' if not r.returncode else r.stderr.strip()[:200])
