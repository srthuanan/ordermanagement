import re

with open("bookmarklets/dms_batch_verify_all_customers_vinclub.txt", "r", encoding="utf-8") as f:
    code = f.read()

# Strip single-line comments
lines = code.split("\n")
cleaned_lines = []
for line in lines:
    stripped = line.strip()
    if stripped.startswith("//"):
        continue
    # Remove trailing comments if present (simple check)
    if "//" in line and not "http://" in line and not "https://" in line:
        line = line.split("//")[0]
    cleaned_lines.append(line)

code = "\n".join(cleaned_lines)
# Minify whitespace
minified = re.sub(r'\s+', ' ', code).strip()

with open("bookmarklets/single_line_dms_vinclub.txt", "w", encoding="utf-8") as f:
    f.write(minified)

print("Minified length:", len(minified))
