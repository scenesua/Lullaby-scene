#!/usr/bin/env python3
import http.cookiejar
import importlib.util
import urllib.request
from pathlib import Path

script = Path(__file__).with_name('finish_forest_temple_korean_sutra.py')
spec = importlib.util.spec_from_file_location('forest_finisher', script)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)

original_fetch = module.fetch
cookie_jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
gongu_warmed = False

def browser_fetch(url, out, referer=None):
    global gongu_warmed
    if 'gongu.copyright.or.kr' not in url:
        return original_fetch(url, out, referer)
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,audio/*;q=0.8,*/*;q=0.7',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.7',
    }
    if not gongu_warmed:
        req = urllib.request.Request(module.GONGU_PAGE, headers=headers)
        with opener.open(req, timeout=90) as response:
            response.read()
        gongu_warmed = True
        print('Gongu session warmed; cookies:', [c.name for c in cookie_jar], flush=True)
    if referer:
        headers['Referer'] = referer
    req = urllib.request.Request(url, headers=headers)
    with opener.open(req, timeout=90) as response:
        data = response.read()
        print('Gongu download response:', response.status, response.headers.get('Content-Type'), len(data), data[:16].hex(), flush=True)
        out.write_bytes(data)

module.fetch = browser_fetch
module.main()
