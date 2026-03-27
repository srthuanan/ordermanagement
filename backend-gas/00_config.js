const SPREADSHEET_ID = "1CzYUfDAcwt4D64UIZIUC77lZ2lOYQ257xlmVXy2nZG0";

// ===== CẤU HÌNH SUPABASE =====
// Dùng để lấy email TVBH từ bảng tvbh_emails thay vì sheet "Mail"
var SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co";
// Anon key (format mới sb_publishable_) - dùng cho read với RLS disabled
var SUPABASE_ANON_KEY = "sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX";
var SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU";

var DRIVE_FOLDER_ID = "1jVRxCHz_mmevBb9nLTflGlCyO-ifRRPf";
const ADMIN_EMAIL = "showroomthuanan@gmail.com";
const NOTIFICATION_SHEET_NAME = "ThongBaoWebApp";
const DA_GHEP_SHEET_NAME = "DaGhep";
const CHUA_GHEP_SHEET_NAME = "ChuaGhep";
const DANG_KY_CHO_SHEET_NAME = "DangKyCho";
const STOCK_SHEET_NAME = "KhoXe";
const CANCELLED_SHEET_NAME = "HuyGhep";
const YEU_CAU_VC_SHEET_NAME = "YeuCauVC";
const MAIL_SHEET_NAME = "Mail";
const XUAT_HOA_DON_SHEET_NAME = "Xuathoadon";
const THONG_TIN_XE_SHEET_NAME = "Thongtinxe";
const NHOM_KINH_DOANH_SHEET_NAME = "NhomKinhDoanh";
const CHINH_SACH_SHEET_NAME = "Chinhsach";
const HOLD_DURATION_HOURS = 24
const USER_SHEET_NAME = 'Users';
const TEAM_SHEET_NAME = 'Teams';
const TEST_DRIVE_SHEET_NAME = 'TestDriveSchedule';
const CHAT_SHEET_NAME = 'ChatHistory';
const CHAT_FILES_FOLDER_ID = '1Xf1H9_qXf1H9_qXf1H9_qXf1H9_qXf1H'; // Will be created or used
const DEFAULT_ROLE = 'Tư vấn bán hàng';
const OTP_EXPIRY_MINUTES = 5;
const TEST_DRIVE_IMAGE_FOLDER_ID = '1yblvOyGy18nyleEXg27-Bk071y2_NTtu';
const CHAT_IMAGES_FOLDER_NAME = "ChatUploadedFiles"; const TELEGRAM_BOT_TOKEN = "8444242103:AAGupLJ1RJS3b3LD5LMEYIWMfwCFW3mzhB4";
const TELEGRAM_CHAT_ID = "5812034168";
const EMAIL_BACKGROUND_IMAGE_URL = "https://raw.githubusercontent.com/srthuanan/ordermanagement/refs/heads/main/pictures/b557cf85e54efd6a7da71db596ca4754.jpg";
const UI_CONFIG = {
  headerBgColor: "#4682b4",
  headerFontColor: "#ffffff",
  headerFont: "Roboto",
  headerFontSize: 12,
  headerFontWeight: "bold",
  rowBgColor: "#f5f7fa",
  altRowBgColor: "#e8eef7",
  borderColor: "#d3d9e6",
  textColor: "#333333",
  fontFamily: "Roboto",
  fontSize: 11,
  columnWidth: 180
};

const SHEET_HEADERS = {
  "NhatKyChinhSua": ["Thời gian", "Người sửa", "Tên Sheet", "Ô", "Giá trị cũ", "Giá trị mới", "Action ID", "Trạng thái Log"],
  "DaGhep": ["Tên tư vấn bán hàng", "Tên khách hàng", "Dòng xe", "Phiên bản", "Ngoại thất", "Nội thất", "Số đơn hàng", "Ngày cọc", "Thời gian nhập", "VIN", "Thời gian ghép", "Số ngày ghép", "Kết quả", "Trạng thái gửi mail", "Ngày xuất hóa đơn", "Cảnh báo quá hạn", "Cảnh báo sai DMS", "LinkHoaDonDaXuat", "Trạng thái VC"],
  "YeuCauVC": ["Số đơn hàng", "Tên khách hàng", "Thời gian YC", "Người YC", "Loại YC", "Trạng thái xử lý", "Ghi chú", "FileUrls", "Mã KH DMS", "VIN"],
  "ChuaGhep": ["Tên tư vấn bán hàng", "Tên khách hàng", "Dòng xe", "Phiên bản", "Ngoại thất", "Nội thất", "Số đơn hàng", "Ngày cọc", "Thời gian nhập", "Kết quả", "Trạng thái gửi mail"],
  "DangKyCho": ["ID Yêu Cầu", "Thời gian đăng ký", "Tên TVBH", "Tên khách hàng", "Dòng xe", "Phiên bản", "Ngoại thất", "Nội thất", "Trạng thái", "VIN gợi ý", "Ghi chú"],
  "KhoXe": ["Dòng xe", "Phiên bản", "Ngoại thất", "Nội thất", "VIN", "Mã DMS", "Trạng thái", "Ngày nhập", "Đã thông báo", "Người Giữ Xe", "Thời Gian Hết Hạn Giữ", "Ngày vận tải"],
  "HuyGhep": ["Tên tư vấn bán hàng", "Tên khách hàng", "Dòng xe", "Phiên bản", "Số đơn hàng", "VIN", "Kết quả", "Người hủy", "Thời gian hủy"],
  "Mail": ["Tên tư vấn bán hàng", "Email"],
  "ThongBaoWebApp": ["Timestamp", "Message", "Type", "TargetView", "TargetID", "CreatedBy", "IsRead", "Recipient"],
  "lichsu_donhang": ["Thời gian", "Số đơn hàng", "VIN", "Hành động", "Chi tiết", "Người thực hiện", "Dữ liệu JSON"],
  "lichsu_xe": ["Thời gian", "VIN", "Hành động", "Chi tiết", "Người thực hiện", "Dữ liệu JSON"],
  "log": ["Thời gian", "Hành động", "Chi tiết"],
  "Xuathoadon": ["SỐ TT", "TÊN KHÁCH HÀNG", "SỐ ĐƠN HÀNG", "DÒNG XE", "PHIÊN BẢN", "NGOẠI THẤT", "NỘI THẤT", "TƯ VẤN BÁN HÀNG", "SỐ VIN", "SỐ ĐỘNG CƠ", "NGÀY YÊU CẦU XHĐ", "NGÀY XUẤT HÓA ĐƠN", "Hoa hồng ứng", "Điểm Vpoint sử dụng", "CHÍNH SÁCH", "NGÀY CỌC", "KẾT QUẢ GỬI MAIL", "URL Hợp Đồng", "URL Đề Nghị XHĐ", "URL Hóa Đơn Đã Xuất", "Trạng thái VC"],
  "Thongtinxe": ["Số VIN", "Số tồn kho", "Số tham chiếu", "Mã sản phẩm", "Phiên bản", "Khu vực", "Màu ngoại thất xe", "Màu nội thất xe", "Số động cơ", "Mô tả sản phẩm", "Số đơn hàng cuối cùng", "Năm sản xuất"],
  "removed_cars_log": ["Thời gian xóa", "Người xóa", "Dòng xe", "Phiên bản", "Ngoại thất", "Nội thất", "VIN", "Mã DMS (cũ)", "Trạng thái (cũ)", "Ngày nhập (cũ)", "Đã thông báo (cũ)", "Lý do xóa"],
  "Chinhsach": ["Tên Chính Sách", "Trạng thái"],
  "ChatHistory": ["Timestamp", "Sender", "Role", "Message", "MentionedUsers", "Reactions", "ReplyTo", "IsPinned", "FileId"]
};


const VALID_EXTERIOR_COLORS = [
  "Brahminy White (CE18)",
  "Sunset ORB (CE1A)",
  "Crimson Red (CE1M)",
  "Vinfast Blue (CE1N)",
  "Neptune Grey (CE14)",
  "Jet Black (CE11)",
  "Electric Blue (CE1J)",
  "Zenith Grey (CE1V)",
  "Jet Black Roof- Summer Yellow Body (111U)",
  "Brahminy White Roof- Aquatic Azure Body (181Y)",
  "Brahminy White Roof- Rose Pink Body (1821)",
  "Brahminy White Roof - Iris Berry Body (181X)",
  "Urbant Mint (CE1W)",
  "Vinbus Green (CE2B)",
  "Deep Ocean (CE1H)",
  "Brahminy White Roof- Summer Yellow Body (181U)", // Trùng lặp trong danh sách cung cấp, giữ lại để đảm bảo tính chính xác
  "Iris Berry (CE1X)",
  "Zenith Grey-Desat Silver Roof (171V)",
  "Urbant Mint Green - Desat Silv (171W)",
  "Ivy Green-Desat Silver Roof (1722)",
  "Atlantic Blue-Aquatic Azure Ro (1Y26)",
  "Jet Black-Champagne Creme Roof (2311)",
  "Infinity Blanc _ Silky White R (2418)",
  "Champagne Creme - Matte Champa (2523)",
  "Jet Black - Graphite Roof (2811)",
  "Crimson Velvet - Mystery Bronz (2927)",
  "Ivy_Green_GNE (CE22)",
  "Champagne_Creme_YLG (CE23)",
  "Crimson Red - Jet Black Roof (111M)",
  "Infinity Blanc_Zenith Grey Roof (1V18)",
  "Deep Ocean_Jet Black Roof (111H)",
  "Alantic Blue_Denim Blue Roof (2A26)",
  "Jet Black_Mystery Bronze Roof (2911)",
  "Champagne Creme_Infinity Blanc Roof (1823)",
  "De Sat Silver IND12007 (CE17)"
];
/**
 * TỔNG HỢP: Thiết lập tất-cả-trong-một cho toàn bộ các trang tính.
 * Hàm này sẽ tạo các sheet người dùng, lái thử và tất cả các sheet nghiệp vụ.
 */
const PRESENCE_EXPIRY_MINUTES = 5; // Người dùng được coi là offline sau 5 phút
const PRESENCE_PREFIX = 'presence_'; // Tiền tố để nhận diện key

/**
 * [HÀM MỚI] Ghi lại "heartbeat" của người dùng.
 * Hàm này sẽ được gọi từ client-side (web app của bạn).
 */