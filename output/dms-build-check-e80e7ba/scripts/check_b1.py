import requests

GAS_URL = "https://script.google.com/macros/s/AKfycbzC8Zf7QdBuFdTV_-8COtDLuUAtFZoQ6pkNy9XF-b1tz6Z7puV1dorjhj-Fmf-zdC7Dvg/exec"

js_code = """
(function() {
  var ss = SpreadsheetApp.openById("1GMAX4_0Xubwz4ByRN9eDIokZntLO98NlmzeURkYBc8M");
  var sheet = ss.getSheetByName("BÁO CÁO KPI");
  return {
    b1_val: sheet.getRange("B1").getValue(),
    b1_formula: sheet.getRange("B1").getFormula(),
    b1_validation: sheet.getRange("B1").getDataValidation() ? sheet.getRange("B1").getDataValidation().getCriteriaType().toString() : "none",
    rowHeights: [
      sheet.getRowHeight(1),
      sheet.getRowHeight(2),
      sheet.getRowHeight(3),
      sheet.getRowHeight(4),
      sheet.getRowHeight(5)
    ],
    maxRows: sheet.getMaxRows(),
    frozenRows: sheet.getFrozenRows()
  };
})()
"""

resp = requests.post(GAS_URL, json={"action": "EXECUTE_SCRIPT", "code": js_code}, timeout=60)
print(resp.json())
