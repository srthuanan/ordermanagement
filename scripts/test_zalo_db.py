import sqlite3
import os

base = os.path.expandvars(r'%APPDATA%\ZaloData\Database\_production\2297773701172183608')

print("1. Testing Media.db...")
media_path = os.path.join(base, "Media.db")
try:
    conn = sqlite3.connect(f"file:{media_path}?mode=ro", uri=True)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = c.fetchall()
    print("Media.db tables:", tables)
except Exception as e:
    print("Media.db error:", e)

print("\n2. Testing Index.db...")
index_path = os.path.join(base, "Core", "Index.db")
try:
    conn = sqlite3.connect(f"file:{index_path}?mode=ro", uri=True)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = c.fetchall()
    print("Index.db tables:", tables)
except Exception as e:
    print("Index.db error:", e)

print("\n3. Testing a Message db...")
msg_dir = os.path.join(base, "Core", "Message")
msg_files = [f for f in os.listdir(msg_dir) if f.endswith(".db")]
if msg_files:
    sample_msg_db = os.path.join(msg_dir, msg_files[0])
    try:
        conn = sqlite3.connect(f"file:{sample_msg_db}?mode=ro", uri=True)
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = c.fetchall()
        print(f"Sample Message db ({msg_files[0]}) tables:", tables)
    except Exception as e:
        print(f"Sample Message db error:", e)
