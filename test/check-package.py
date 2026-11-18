"""Verify a distributable tarball without extracting it or reading user data."""
import hashlib
import pathlib
import sys
import tarfile

root = pathlib.Path(__file__).resolve().parents[1]
archive = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'local-douyin-research-plugin-0.2.0.tgz'
allowed_roots = {'index.js', 'lib', 'locale', 'cordis.patch.yml', 'icon.svg', 'README.md', 'LICENSE', 'package.json'}
with tarfile.open(archive, 'r:gz') as package:
    members = [member for member in package.getmembers() if member.isfile()]
    for member in package.getmembers():
        assert not member.issym() and not member.islnk(), f'Unexpected link: {member.name}'
    for member in members:
        relative = pathlib.PurePosixPath(member.name).relative_to('package')
        assert '..' not in relative.parts and relative.parts[0] in allowed_roots, f'Unexpected packaged path: {relative}'
        assert package.extractfile(member).read() == (root / str(relative)).read_bytes(), f'Stale packaged file: {relative}'
    paths = {member.name for member in members}
    for expected in ['package/index.js', 'package/lib/browser.js', 'package/lib/config.js', 'package/cordis.patch.yml']:
        assert expected in paths, f'Missing runtime file: {expected}'
print(f'PASS: {len(members)} packaged files match source; no extra data paths or links')
print('SHA256:', hashlib.sha256(archive.read_bytes()).hexdigest())
