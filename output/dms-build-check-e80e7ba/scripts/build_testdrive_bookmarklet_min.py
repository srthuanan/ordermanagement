import re
import urllib.parse

def minify_js(js_code):
    # Remove single line comments
    lines = js_code.splitlines()
    clean_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("//"):
            continue
        # Remove trailing comments if not in string
        clean_lines.append(line)
    text = "\n".join(clean_lines)
    # Remove block comments
    text = re.sub(r'/\*[\s\S]*?\*/', '', text)
    # Remove extra whitespace while preserving string literals
    return text.strip()

def main():
    with open("scripts/bookmarklet_dms_bulk_testdrive.js", "r", encoding="utf-8") as f:
        code = f.read()
    
    clean_code = minify_js(code)
    # create oneliner
    # Replace newlines with spaces where safe or URL encode
    encoded = urllib.parse.quote(clean_code)
    bookmarklet_url = f"javascript:{encoded}"

    with open("scripts/bookmarklet_dms_bulk_testdrive_oneliner.txt", "w", encoding="utf-8") as f:
        f.write(bookmarklet_url)

    # Also update html installer to have the exact bookmarklet link directly in href
    with open("scripts/cai_dat_bookmarklet_nhap_lai_thu.html", "r", encoding="utf-8") as f:
        html = f.read()

    # Keep the draggable installer button synchronized with the generated source.
    # Older installer versions did not yet have an id, so match by its stable class.
    html, replacement_count = re.subn(
        r'<a\s+class="button-drag"(?:\s+id="dmsBookmarkletLink")?\s+href="[^"]*"',
        f'<a class="button-drag" id="dmsBookmarkletLink" href="{bookmarklet_url}"',
        html,
        count=1,
    )
    if replacement_count != 1:
        raise RuntimeError("Không tìm thấy nút bookmarklet trong file cài đặt HTML")
    
    with open("scripts/cai_dat_bookmarklet_nhap_lai_thu.html", "w", encoding="utf-8") as f:
        f.write(html)

    print("Success! Generated bookmarklet and updated HTML installer.")

if __name__ == "__main__":
    main()
