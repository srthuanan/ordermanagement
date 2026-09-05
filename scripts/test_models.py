import os
import urllib.request, json

key = os.environ.get('GEMINI_API_KEY', '')
models = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-pro-latest']

for m in models:
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}'
    data = json.dumps({
        'contents': [{'parts': [{'text': 'Reply with JSON { "hello": "world" }'}]}],
        'generationConfig': { 'responseMimeType': 'application/json' }
    }).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            print(f'[OK] {m}')
    except urllib.error.HTTPError as e:
        error_message = e.read().decode('utf-8')
        print(f'[FAIL] {m}: {e.code} - {error_message}')
    except Exception as e:
        print(f'[FAIL] {m}: {e}')
