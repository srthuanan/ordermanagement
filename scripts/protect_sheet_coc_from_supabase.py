import urllib.request
import json

# 1. Lấy danh sách users từ Supabase
SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

req_sb = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/users?select=username,full_name,email,role",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}
)

with urllib.request.urlopen(req_sb, timeout=15) as resp:
    supabase_users = json.loads(resp.read().decode("utf-8"))

print(f"Đã tải {len(supabase_users)} nhân sự từ bảng users của Supabase.")

# 2. Xây dựng code thực thi bảo vệ dòng trên Google Sheet
GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzC8Zf7QdBuFdTV_-8COtDLuUAtFZoQ6pkNy9XF-b1tz6Z7puV1dorjhj-Fmf-zdC7Dvg/exec"

js_code = f"""
(function() {{
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("RÚT COC");
  if (!sheet) return {{ error: "Sheet not found" }};
  
  var users = {json.dumps(supabase_users)};
  
  var adminEmails = [
    "showroomthuanan@gmail.com",
    "ptnhan190697@gmail.com",
    "hoanghanh2089@gmail.com"
  ];
  
  // Hàm tìm email dựa trên dữ liệu Supabase users
  function findEmail(tvbhRaw) {{
    if (!tvbhRaw) return null;
    var raw = tvbhRaw.trim().toUpperCase().normalize('NFC');
    
    // 1. Khớp chính xác full_name
    for (var i = 0; i < users.length; i++) {{
      var fn = (users[i].full_name || "").trim().toUpperCase().normalize('NFC');
      if (fn && (fn === raw || raw === fn)) return users[i].email;
    }}
    
    // 2. Khớp username
    var rawLower = raw.toLowerCase();
    for (var i = 0; i < users.length; i++) {{
      var un = (users[i].username || "").trim().toLowerCase();
      if (un && un === rawLower) return users[i].email;
    }}
    
    // 3. Khớp tên ngắn / từ cuối
    var words = raw.split(/\\s+/);
    var lastName = words[words.length - 1]; // từ cuối cùng (ví dụ: THUẬN, CƯỜNG, TRÂM)
    
    for (var i = 0; i < users.length; i++) {{
      var fn = (users[i].full_name || "").trim().toUpperCase().normalize('NFC');
      var uWords = fn.split(/\\s+/);
      var uLastName = uWords[uWords.length - 1];
      if (uLastName === lastName) {{
        // Nếu tên có 2 từ như "KHANG HUY" hoặc "HUY PHẠM"
        if (words.length >= 2) {{
          var twoWords = words.slice(-2).join(" ");
          if (fn.indexOf(twoWords) !== -1) return users[i].email;
        }} else {{
          return users[i].email;
        }}
      }}
    }}
    
    // 4. Khớp chứa chuỗi con
    for (var i = 0; i < users.length; i++) {{
      var fn = (users[i].full_name || "").trim().toUpperCase().normalize('NFC');
      if (fn.indexOf(raw) !== -1 || raw.indexOf(fn) !== -1) return users[i].email;
    }}
    
    return null;
  }}
  
  // Lấy protections hiện có
  var existingProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  var protectedMap = {{}};
  for (var p = 0; p < existingProtections.length; p++) {{
    var pRange = existingProtections[p].getRange().getA1Notation();
    protectedMap[pRange] = existingProtections[p];
  }}
  
  var protectedResults = [];
  var lastRow = sheet.getLastRow();
  
  for (var r = 3; r <= lastRow; r++) {{
    var vin = String(sheet.getRange(r, 5).getValue() || "").trim();
    if (!vin) continue; // Bỏ qua dòng trống chưa có xe
    
    var tvbh = String(sheet.getRange(r, 14).getValue() || "").trim();
    var email = findEmail(tvbh);
    
    var targetA1 = "A" + r + ":N" + r;
    var range = sheet.getRange(r, 1, 1, 14);
    var desc = "RÚT COC - Dòng " + r + " (VIN: " + vin + " - " + (tvbh || "Chưa rõ") + ")";
    
    var prot = protectedMap[targetA1];
    if (!prot) {{
      prot = range.protect().setDescription(desc);
    }} else {{
      prot.setDescription(desc);
    }}
    
    // Danh sách được quyền sửa: Admin + chính TVBH của dòng đó
    var allowed = adminEmails.slice();
    if (email && allowed.indexOf(email) === -1) {{
      allowed.push(email);
    }}
    
    prot.removeEditors(prot.getEditors());
    prot.addEditors(allowed);
    if (prot.canDomainEdit()) {{
      prot.setDomainEdit(false);
    }}
    
    protectedResults.push({{
      row: r,
      vin: vin,
      tvbh: tvbh,
      email: email || "Chỉ Admin",
      editorsCount: allowed.length
    }});
  }}
  
  return {{
    success: true,
    totalProtected: protectedResults.length,
    details: protectedResults
  }};
}})()
"""

req_gas = urllib.request.Request(
    GAS_WEBAPP_URL,
    data=json.dumps({"action": "EXECUTE_SCRIPT", "code": js_code}).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req_gas, timeout=60) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print("\n=== KẾT QUẢ THIẾT LẬP BẢO VỆ DÒNG TRÊN GOOGLE SHEET ===")
        print(f"Tổng số dòng được bảo vệ: {res.get('data', {}).get('totalProtected')}")
        details = res.get('data', {}).get('details', [])
        for d in details[:10]:
            print(f"  + Dòng {d['row']}: {d['vin']} | TVBH: {d['tvbh']} -> Email: {d['email']}")
        if len(details) > 10:
            print(f"  ... và {len(details) - 10} dòng khác.")
except Exception as e:
    print("Lỗi thực thi bảo vệ Google Sheet:", e)
