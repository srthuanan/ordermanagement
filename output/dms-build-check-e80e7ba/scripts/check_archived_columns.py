import os
import requests
from dotenv import load_dotenv

load_dotenv()
token = os.environ.get('SUPABASE_ACCESS_TOKEN')
ref = 'jwvgxqrkjlbewvpkvucj'

def run_query(sql):
    resp = requests.post(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"query": sql},
        timeout=30
    )
    return resp.json()

sql_arch_cols = """
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'archived_orders'
ORDER BY ordinal_position;
"""
print("--- CÁC CỘT TRONG BẢNG ARCHIVED_ORDERS ---")
cols = [r['column_name'] for r in run_query(sql_arch_cols)]
print(cols)
