import requests

GAS_URL = "https://script.google.com/macros/s/AKfycbzC8Zf7QdBuFdTV_-8COtDLuUAtFZoQ6pkNy9XF-b1tz6Z7puV1dorjhj-Fmf-zdC7Dvg/exec"

js_code = """
(function() {
  var ss = SpreadsheetApp.openById("1GMAX4_0Xubwz4ByRN9eDIokZntLO98NlmzeURkYBc8M");
  var kpiSheet = ss.getSheetByName("BÁO CÁO KPI");
  
  return {
    rows1to15: kpiSheet.getRange(1, 1, 15, 2).getDisplayValues(),
    rows16to36: kpiSheet.getRange(16, 1, 21, 2).getDisplayValues(),
    hidden: kpiSheet.isRowHiddenByUser(16),
    maxRows: kpiSheet.getMaxRows()
  };
})()
"""

resp = requests.post(GAS_URL, json={"action": "EXECUTE_SCRIPT", "code": js_code}, timeout=30)
data = resp.json().get("data", {})
print("Max rows:", data.get("maxRows"))
print("Hidden row 16:", data.get("hidden"))
print("\nRows 16-36 on sheet:")
for idx, r in enumerate(data.get("rows16to36", [])):
    print(f"Row {idx+16:>2}: {r}")
