import requests
import json
import urllib.parse

# Supabase URL & Service Role Key
# Let's read from .env if available or query through Supabase
import os

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"

# Let's check with an admin query or test generateLink directly
print("Testing Link generation for user nanajackychan@gmail.com...")
