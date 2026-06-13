import sys

file_path = "c:\\Users\\USER\\Documents\\ordermanagement\\vf-kim-son-trang-dai\\src\\components\\InlineOrderEditForm.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I just need to append the closing braces.
if "  );\n}" not in content:
    content += "  );\n}\n"

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed syntax error.")
