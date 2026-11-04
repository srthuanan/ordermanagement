import os
import requests
import json
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

def main():
    sql = """
    SELECT id, type, value, parent_value 
    FROM public.vehicle_configs 
    WHERE value ILIKE '%CE18%' OR value ILIKE '%White%' OR value ILIKE '%Brahminy%' OR value ILIKE '%Blanc%';
    """
    rows = run_query(sql)
    print(f"Total matching configs: {len(rows)}")
    for r in rows:
        print(r)

if __name__ == '__main__':
    main()
