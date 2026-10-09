import urllib.request
import json

GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzC8Zf7QdBuFdTV_-8COtDLuUAtFZoQ6pkNy9XF-b1tz6Z7puV1dorjhj-Fmf-zdC7Dvg/exec"

vins = [
    'RNXVGRWK2TT717690', 'RLLVFPNTOTH826987', 'RLNV5JSE7TH845792',
    'RLLVAG8C3TH843146', 'RLLVAG8C0TH841158', 'RLNVBL9K7TT749738', 'RLNVMNRS8TT709545'
]
target_date = "07/10/2026"

js_code = f"""
(function() {{
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('RÚT COC');
  if (!sheet) return {{ success: false, error: 'Sheet not found' }};
  
  var vins = {json.dumps(vins)};
  var targetDate = "{target_date}";
  var maxR = sheet.getLastRow();
  if (maxR < 3) return {{ success: true, updated: 0 }};
  
  var vinColVals = sheet.getRange(3, 5, maxR - 2, 1).getValues();
  var updatedCount = 0;
  var updatedRows = [];
  
  for (var i = 0; i < vinColVals.length; i++) {{
    var cellVin = String(vinColVals[i][0] || '').trim().toUpperCase();
    if (!cellVin) continue;
    
    for (var j = 0; j < vins.length; j++) {{
      if (cellVin === vins[j]) {{
        var rIdx = i + 3;
        var cellO = sheet.getRange(rIdx, 15);
        cellO.setValue(targetDate);
        cellO.setBackground('#E6F4EA');
        cellO.setFontWeight('bold');
        cellO.setHorizontalAlignment('center');
        updatedCount++;
        updatedRows.push({{ row: rIdx, vin: cellVin }});
        break;
      }}
    }}
  }}
  
  return {{
    success: true,
    updatedCount: updatedCount,
    updatedRows: updatedRows,
    targetDate: targetDate
  }};
}})()
"""

req = urllib.request.Request(
    GAS_WEBAPP_URL,
    data=json.dumps({"action": "EXECUTE_SCRIPT", "code": js_code}).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

with urllib.request.urlopen(req, timeout=30) as resp:
    res = json.loads(resp.read().decode("utf-8"))
    print("Ket qua cap nhat ngay Zalo 08/10/2026:", res.get("data"))
