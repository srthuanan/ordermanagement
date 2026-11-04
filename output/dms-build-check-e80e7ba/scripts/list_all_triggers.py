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

# Liệt kê tất cả các trigger trong schema public
sql_triggers = """
SELECT 
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS event,
    action_statement AS action
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY table_name, trigger_name;
"""
print("=== TẤT CẢ TRIGGER TRONG PUBLIC SCHEMA ===")
for t in run_query(sql_triggers):
    print(t)
