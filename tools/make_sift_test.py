# Build an isolated copy of sift at commit REV into folder OUT (run inside a sift checkout): python3 make_sift_test.py REV OUT
# Own IndexedDB, cache and BroadcastChannel names, and every localStorage key prefixed "sifttest.", so on the shared
# github.io address it can never read, change or delete the live app's data.
import io, pathlib, re, subprocess, sys, tarfile
rev, out = sys.argv[1], pathlib.Path(sys.argv[2])
tarfile.open(fileobj=io.BytesIO(subprocess.run(['git', 'archive', rev, 'app'], check=True, capture_output=True).stdout)).extractall(out)
app = out / 'app'
def edit(rel, pairs):
    path = app / rel; text = path.read_text()
    for old, new in pairs:
        if old not in text: sys.exit(f'{rel}: missing {old!r}')
        text = text.replace(old, new, 1)
    path.write_text(text)
edit('js/store.js', [("'sift_local'", "'sifttest_local'"), ("'sift-store'", "'sifttest-store'")])
edit('sw.js', [('`sift-${VERSION}`', '`sifttest-${VERSION}`'), ("startsWith('sift-')", "startsWith('sifttest-')"), ("const VERSION = 'dev';", f"const VERSION = '{rev[:7]}';"), ("'index.html',", "'index.html',\n  'js/teststorage.js',")])
for path in list(app.rglob('*.js')) + list(app.rglob('*.html')):
    text = path.read_text()
    if 'localStorage' in text: path.write_text(re.sub(r'\blocalStorage\b', 'siftTestStorage', text))
(app / 'js/teststorage.js').write_text('''(function () {
  var prefix = 'sifttest.', real = window['local' + 'Storage'];
  var own = function () { var keys = []; for (var index = 0; index < real.length; index++) { var k = real.key(index); if (k.indexOf(prefix) === 0) keys.push(k.slice(prefix.length)); } return keys; };
  var api = {
    getItem: function (key) { return real.getItem(prefix + key); },
    setItem: function (key, value) { real.setItem(prefix + key, value); },
    removeItem: function (key) { real.removeItem(prefix + key); },
    clear: function () { own().forEach(function (key) { real.removeItem(prefix + key); }); },
    key: function (index) { var keys = own(); return index < keys.length ? keys[index] : null; }
  };
  window.siftTestStorage = new Proxy(api, {
    get: function (target, name) { if (name === 'length') return own().length; return name in target ? target[name] : undefined; },
    ownKeys: function () { return own(); },
    getOwnPropertyDescriptor: function (target, name) { var value = real.getItem(prefix + String(name)); return value === null ? undefined : { value: value, enumerable: true, configurable: true, writable: true }; }
  });
})();
''')
lt = chr(60)  # angle bracket, spelled this way so the script can be pasted anywhere
edit('index.html', [(lt + 'script', lt + 'script src="js/teststorage.js">' + lt + '/script>\n  ' + lt + 'script'), (lt + 'title>Sift' + lt + '/title>', lt + 'title>Sift test' + lt + '/title>'), ('content="Sift"', 'content="Sift test"')])
edit('manifest.webmanifest', [('"name": "Sift"', '"name": "Sift test"'), ('"short_name": "Sift"', '"short_name": "Sift test"')])
edit('js/app.js', [('· Sift`', '· Sift test`')])
(app / '.nojekyll').write_text('')
print('built', app)
