# -*- coding: utf-8 -*-
import openpyxl
from collections import Counter

EXCEL_PATH = r"C:\Users\Pham Thanh Nhan\Downloads\DATA.xlsx"

wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
sheet = wb.active
rows = list(sheet.iter_rows(values_only=True))

models = []
for r in rows[1:]:
    if r and len(r) > 3 and r[3]:
        models.append(str(r[3]).strip())

c = Counter(models)
print(f"Tổng số dòng có xe: {len(models)}")
print("Phân bố dòng xe trong file:")
for k, v in c.items():
    print(f"  - '{k}': {v} xe")
