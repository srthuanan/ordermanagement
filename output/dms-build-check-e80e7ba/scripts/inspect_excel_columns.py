# -*- coding: utf-8 -*-
import openpyxl

EXCEL_PATH = r"C:\Users\Pham Thanh Nhan\Downloads\DATA.xlsx"

def main():
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    
    print(f"Tổng số dòng: {len(rows)}")
    print(f"Tiêu đề cột (Hàng 1): {rows[0]}")
    
    # In 10 dòng đầu
    print("\n--- 10 DÒNG ĐẦU TIÊN ---")
    for i, r in enumerate(rows[1:11], start=1):
        print(f"Dòng {i}: {r}")

    # Thu thập tất cả các dòng xe có trong file
    # Tìm cột dòng xe
    header = [str(c).strip().lower() if c is not None else "" for c in rows[0]]
    col_model_idx = None
    for idx, col in enumerate(header):
        if any(k in col for k in ["xe", "dòng", "model", "loại"]):
            col_model_idx = idx
            break

    print(f"\nCột dòng xe xác định là cột số: {col_model_idx} ({rows[0][col_model_idx] if col_model_idx is not None else 'Không tìm thấy'})")

    if col_model_idx is not None:
        models = set()
        for r in rows[1:]:
            if r and len(r) > col_model_idx and r[col_model_idx]:
                models.add(str(r[col_model_idx]).strip())
        print(f"Tất cả các dòng xe xuất hiện trong file: {models}")

if __name__ == "__main__":
    main()
