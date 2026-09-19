import json
import requests

cfg = json.load(open('dms_dealers_config.json', 'r', encoding='utf-8'))
d = cfg[0]
cookie = d['cookie']

headers = {
    'accept': 'application/json',
    'accept-language': 'en-US,en;q=0.9',
    'clienthost': 'Browser',
    'content-type': 'application/json',
    'prefer': 'odata.include-annotations="*"',
    'referer': 'https://vinfastdms.crm5.dynamics.com/main.aspx?appid=b760a67b-4bf3-e911-a811-000d3aa399d6',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
    'x-ms-app-id': 'b760a67b-4bf3-e911-a811-000d3aa399d6',
    'x-ms-user-agent': 'PowerApps-UCI/1.4.12378-2608.4 (Browser; AppName=xvf_vinfastyanaapps)',
    'cookie': cookie
}

base_url = 'https://vinfastdms.crm5.dynamics.com/api/data/v9.0'
vins = ['RLNVBL9K9TT725716', 'RLLVFPTTXTH775145']

for vin in vins:
    print(f"\n[TESTING VIN]: {vin}")
    q_vp = f"{base_url}/xts_vehiclepublics"
    params_vp = {
        '$filter': f"xts_chassisnumber eq '{vin}' or xts_vehicleidentificationnumber eq '{vin}'",
        '$select': 'xts_vehiclepublicid'
    }
    r_vp = requests.get(q_vp, headers=headers, params=params_vp, timeout=10)
    print("r_vp status:", r_vp.status_code)
    d_vp = r_vp.json().get('value', [])
    if d_vp:
        vp_id = d_vp[0]['xts_vehiclepublicid']
        fxml = f'''<fetch><entity name="itv_vehicleregistration">
            <all-attributes/>
            <filter>
                <condition attribute="itv_vin" operator="eq" value="{vp_id}"/>
            </filter>
        </entity></fetch>'''
        r_reg = requests.get(f"{base_url}/itv_vehicleregistrations", headers=headers, params={'fetchXml': fxml}, timeout=10)
        print("r_reg status:", r_reg.status_code)
        for row in r_reg.json().get('value', []):
            print(f" -> Biển số: {row.get('itv_plateno')} | Đại lý: {row.get('itv_name')}")
