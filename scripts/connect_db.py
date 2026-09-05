import pyodbc
import pandas as pd

server = '27.71.30.92,7521'
database = 'CYBNET9_VANDAO'
username = '02.NHANPT'
password = 'Nhan@1176411'

# Thử nhiều driver khác nhau để đảm bảo tương thích
drivers = ['ODBC Driver 17 for SQL Server', 'SQL Server Native Client 11.0', 'SQL Server']

print(f"Đang tiến hành kết nối tới Server {server} với tài khoản {username}...")
print("-" * 50)

success = False
for driver in drivers:
    connection_string = f'DRIVER={{{driver}}};SERVER={server};DATABASE={database};UID={username};PWD={password}'
    try:
        conn = pyodbc.connect(connection_string, timeout=5)
        print(f"✅ Kết nối Database thành công bằng {driver}!")
        success = True
        
        # Test lấy 5 dòng dữ liệu khách hàng
        try:
            print("Đang thử lấy 5 dòng dữ liệu từ bảng Khách hàng...")
            df = pd.read_sql("SELECT TOP 5 * FROM DmKh", conn)
            print("Dữ liệu:")
            print(df.head())
        except Exception as query_err:
            print("Kết nối thành công nhưng truy vấn dữ liệu bị lỗi:", query_err)
        break
    except Exception as e:
        pass

if not success:
    print("❌ Đăng nhập Database thất bại!")
    print("Rất có thể đây là TÀI KHOẢN PHẦN MỀM CYBER chứ không phải TÀI KHOẢN DATABASE SQL SERVER.")
