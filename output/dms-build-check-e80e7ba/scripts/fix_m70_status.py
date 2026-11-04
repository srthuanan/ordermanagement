import requests
import json

GAS_URL = "https://script.google.com/macros/s/AKfycbzC8Zf7QdBuFdTV_-8COtDLuUAtFZoQ6pkNy9XF-b1tz6Z7puV1dorjhj-Fmf-zdC7Dvg/exec"

js_code = """
(function() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('RÚT COC');
  if (!sheet) return { error: 'Sheet not found' };

  var cellM70 = sheet.getRange('M70');
  var val = cellM70.getValue();

  // Đính kèm ghi chú thời gian kế toán đã gõ
  var noteText = "⏰ Thời gian báo rút: " + val + "\\n🕒 Ghi nhận lúc: 19/10/2026 09:16";
  cellM70.setNote(noteText);
  
  // Chuyển giá trị hiển thị sang Đã báo rút
  cellM70.setValue("Đã báo rút");

  SpreadsheetApp.flush();

  return {
    row: 70,
    val: cellM70.getValue(),
    note: cellM70.getNote()
  };
})()
"""

def main():
    resp = requests.post(GAS_URL, json={"action": "EXECUTE_SCRIPT", "code": js_code}, timeout=30)
    print(resp.json())

if __name__ == "__main__":
    main()
