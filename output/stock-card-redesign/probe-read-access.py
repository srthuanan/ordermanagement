from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json
import requests

root=Path(__file__).resolve().parents[2]
settings={}
for name in ['.env','.env.local']:
    file=root/name
    if file.exists():
        for line in file.read_text(encoding='utf-8').splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                k,v=line.split('=',1)
                if k.strip() in ['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY']:
                    settings[k.strip()]=v.strip().strip('"\'')
url=settings.get('VITE_SUPABASE_URL') or 'https://jwvgxqrkjlbewvpkvucj.supabase.co'
key=settings.get('VITE_SUPABASE_ANON_KEY') or 'sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX'
if key.startswith(('sb_secret_','service_role')):raise RuntimeError('Refusing privileged credentials in browser access probe.')
headers={'apikey':key,'Prefer':'count=exact'}
if key.startswith('eyJ'):headers['Authorization']='Bearer '+key
def probe(item):
    table,params=item
    response=requests.get(url+'/rest/v1/'+table,params=params,headers=headers,timeout=25)
    try:data=response.json()
    except Exception:data={}
    return {'table':table,'http':response.status_code,'range':response.headers.get('content-range'),'error_code':data.get('code') if isinstance(data,dict) else None,'error':data.get('message') if isinstance(data,dict) else None}
queries=[('donhang',{'select':'so_don_hang','ket_qua':'not.ilike.Đã hủy%','limit':1}),('yeucauxhd',{'select':'so_don_hang,ghi_chu_admin,url_hop_dong,url_de_nghi_xhd,ngay_coc_ve','limit':0}),('khoxe',{'select':'vin,trang_thai','limit':0}),('car_hold_activities',{'select':'vin,username,type,status','limit':0})]
with ThreadPoolExecutor(max_workers=4) as pool:
    for result in pool.map(probe,queries):print(json.dumps(result,ensure_ascii=False))
response=requests.get(url+'/rest/v1/',headers={**headers,'Accept':'application/openapi+json'},timeout=25)
data=response.json() if response.ok else {}
paths=data.get('paths',{})
print(json.dumps({'rpc_schema_http':response.status_code,'rpc_visible':{name:'/rpc/'+name in paths for name in ['rpc_hold_car','rpc_release_car','rpc_leave_hold_queue']}}))
