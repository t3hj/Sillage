"""Restore credited bottle images with pinned SHA-256 verification; stdlib only."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1] / 'dist'
MAX_BYTES = 15_000_000

def restore(item, verify_only=False):
    scent_id, info = item
    if not info.get('path'):
        return scent_id, 'unavailable', None
    relative = Path(info['path'])
    if relative.is_absolute() or '..' in relative.parts or relative.parts[:2] != ('assets', 'bottles'):
        return scent_id, 'failed', 'Unsafe image path'
    expected = info.get('sha256', '')
    if not re.fullmatch(r'[0-9a-f]{64}', expected):
        return scent_id, 'failed', 'Missing pinned SHA-256'
    destination = ROOT / relative
    try:
        if destination.is_file() and hashlib.sha256(destination.read_bytes()).hexdigest() == expected:
            return scent_id, 'verified', None
        if verify_only:
            raise ValueError('Missing image or checksum mismatch')
        url = info['url']
        if urlparse(url).scheme != 'https':
            raise ValueError('Only HTTPS image sources are accepted')
        request = Request(url, headers={'User-Agent': 'Sillage-photo-restore/1.0'})
        with urlopen(request, timeout=30) as response:
            if urlparse(response.geturl()).scheme != 'https':
                raise ValueError('Image source redirected away from HTTPS')
            content = response.read(MAX_BYTES + 1)
        if len(content) > MAX_BYTES:
            raise ValueError('Image exceeds 15 MB')
        if hashlib.sha256(content).hexdigest() != expected:
            raise ValueError('Source image changed; reverify the bottle before updating its manifest')
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(destination.suffix + '.tmp')
        temporary.write_bytes(content)
        temporary.replace(destination)
        return scent_id, 'downloaded', None
    except Exception as error:
        return scent_id, 'failed', str(error)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'photos.json').read_text())
    failures = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        for scent_id, status, error in pool.map(lambda item: restore(item, args.verify_only), manifest.items()):
            print(json.dumps({'id': scent_id, 'status': status, **({'error': error} if error else {})}))
            if error:
                failures.append(scent_id)
    raise SystemExit(bool(failures))
