"""When each version went live, for What's new (PUBLISHED in app/js/whatsnew.js).

  python tools/published_times.py --now        stamp every What's new version that has
                                               no time yet with the time now (run just
                                               before publishing, then commit it)
  python tools/published_times.py --backfill   work the times out from GitHub: the Pages
                                               deploy that first carried each version

A version's time is when it was pushed to main (the deploy run that pushed it,
or the first push after it). Times are kept in UTC; the app shows them in the
device's own time.
"""
import json
import re
import subprocess
import sys
from datetime import datetime, timezone

FILE = 'app/js/whatsnew.js'
START = 'export const PUBLISHED = {'


def git(*args):
    return subprocess.run(['git', *args], capture_output=True, text=True, encoding='utf-8', check=True).stdout


def read():
    return open(FILE, encoding='utf-8').read()


def versions(src):
    body = src[src.index('export const WHATS_NEW = {'):]
    return re.findall(r"^  '(\d+\.\d+\.\d+)':", body, re.M)


def published(src):
    i = src.index(START)
    j = src.index('};', i)
    return dict(re.findall(r"'(\d+\.\d+\.\d+)': '([^']+)'", src[i:j]))


def write(src, times):
    num = lambda v: tuple(int(x) for x in v.split('.'))
    lines = ''.join(f"  '{v}': '{times[v]}',\n" for v in sorted(times, key=num, reverse=True))
    i = src.index(START) + len(START)
    j = src.index('};', i)
    open(FILE, 'w', encoding='utf-8', newline='\n').write(src[:i] + '\n' + lines + src[j:])


def backfill():
    runs = json.loads(subprocess.run(['gh', 'run', 'list', '--branch', 'main', '--event', 'push', '--limit', '1000', '--json', 'headSha,createdAt'],
                                     capture_output=True, text=True, check=True).stdout)
    chain = git('rev-list', '--first-parent', '--reverse', 'origin/main').split()
    # A rewritten history (e.g. the author fixed) leaves deploys pointing at the old
    # commits: any copy still here (a backup branch) is matched by date and message.
    same = {}
    for line in git('log', '--all', '--format=%H%x09%aI%x09%s').splitlines():
        sha, when, subject = line.split('\t', 2)
        same.setdefault((when, subject), []).append(sha)
    on_chain = set(chain)
    now_sha = {}
    for shas in same.values():
        new = [s for s in shas if s in on_chain]
        for s in shas:
            if new:
                now_sha[s] = new[0]
    pushed = {}
    for r in runs:
        sha = now_sha.get(r['headSha'], r['headSha'])
        pushed[sha] = min(pushed.get(sha, r['createdAt']), r['createdAt'])
    # Each commit on main goes live with the first deploy at or after it.
    live, pending = {}, []
    for sha in chain:
        pending.append(sha)
        if sha in pushed:
            for p in pending:
                live[p] = pushed[sha]
            pending = []
    first = {}
    for sha in git('log', '--first-parent', '--reverse', '--format=%H', 'origin/main', '--', 'app/js/version.js').split():
        m = re.search(r"VERSION = '([\d.]+)'", git('show', f'{sha}:app/js/version.js'))
        if m and m.group(1) not in first and sha in live:
            first[m.group(1)] = live[sha]
    return first


def main():
    src = read()
    times = published(src)
    if '--backfill' in sys.argv:
        found = backfill()
        for v in versions(src):
            if v in found:
                times[v] = found[v]
    elif '--now' in sys.argv:
        now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        for v in versions(src):
            times.setdefault(v, now)
    else:
        print(__doc__)
        return
    write(src, times)
    missing = [v for v in versions(src) if v not in times]
    print(f'{len(times)} versions have a time' + (f'; none for {", ".join(missing)}' if missing else ''))


main()
