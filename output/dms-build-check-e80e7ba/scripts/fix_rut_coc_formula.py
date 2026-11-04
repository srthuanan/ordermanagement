import requests
import json

GAS_URL = "https://script.google.com/macros/s/AKfycbzC8Zf7QdBuFdTV_-8COtDLuUAtFZoQ6pkNy9XF-b1tz6Z7puV1dorjhj-Fmf-zdC7Dvg/exec"

js_code = """
(function() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('RÚT COC');
  if (!sheet) return { error: 'Sheet not found' };

  // 1. Kiểm tra giá trị hiện tại của M70, M71, M72, M73
  var rangeCheck = sheet.getRange(70, 11, 4, 5).getValues();
  
  // 2. Điền công thức tự động nhảy cho Cột M từ dòng 71 đến dòng 120
  // Nếu đã có ngày COC ở Cột O -> ✅ Đã có COC, nếu có VIN mà chưa có ngày -> Đã báo rút, nếu VIN trống -> trống
  var formulas = [];
  for (var r = 71; r <= 120; r++) {
    formulas.push(['=IF(E' + r + '=""; ""; IF(O' + r + '<>""; "✅ Đã có COC"; "Đã báo rút"))']);
  }
  sheet.getRange(71, 13, formulas.length, 1).setFormulas(formulas);
  SpreadsheetApp.flush();

  // 3. Đọc lại kết quả sau khi áp dụng công thức
  var resultValues = sheet.getRange(70, 1, 4, 15).getValues();
  var list = [];
  for (var i = 0; i < resultValues.length; i++) {
    list.push({
      row: 70 + i,
      vin: resultValues[i][4],
      kh: resultValues[i][5],
      ngay_xhd: resultValues[i][11],
      trang_thai_rut_coc: resultValues[i][12],
      ngay_coc_ve: resultValues[i][14]
    });
  }

  return { success: true, updatedRows: list };
})()
"""

def main():
    resp = requests.post(GAS_URL, json={"action": "EXECUTE_SCRIPT", "code": js_code}, timeout=35)
    print("GAS response status:", resp.status_code)
    try:
        data = resp.json()
        print(json.dumps(data, ensure_ascii=False, indent=2))
    except Exception as e:
        print("Raw response:", resp.text[:500])

if __name__ == "__main__":
    main()
