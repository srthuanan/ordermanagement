import json
import requests

cfg = json.load(open('dms_dealers_config.json', 'r', encoding='utf-8'))
d = cfg[0]
cookie = d['cookie']

headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
    'Cookie': cookie
}

url = 'https://vinfastdms.crm5.dynamics.com/main.aspx?appid=b760a67b-4bf3-e911-a811-000d3aa399d6&pagetype=entitylist&etn=itv_vehicleregistration'
r = requests.get(url, headers=headers, allow_redirects=False)
print('HTTP main.aspx status:', r.status_code)
print('Redirect Location:', r.headers.get('Location'))
