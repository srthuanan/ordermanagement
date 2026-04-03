const SPREADSHEET_ID = "1w4la6fv1UvPXuOfH4vB28f_hE2PIaOkAjcHwbA_fk2c";

// ===== CẤU HÌNH SUPABASE =====
var SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co";
var SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU";

var DRIVE_FOLDER_ID = "1jVRxCHz_mmevBb9nLTflGlCyO-ifRRPf";
const ADMIN_EMAIL = "showroomthuanan@gmail.com";

// Tên các sheet còn sử dụng
const MAIL_SHEET_NAME = "Mail";
const LOG_SHEET_NAME = "log";

// Cấu hình Telegram
const TELEGRAM_BOT_TOKEN = "8444242103:AAGupLJ1RJS3b3LD5LMEYIWMfwCFW3mzhB4";
const TELEGRAM_CHAT_ID = "5812034168";

const EMAIL_BACKGROUND_IMAGE_URL = "https://raw.githubusercontent.com/srthuanan/ordermanagement/refs/heads/main/pictures/b557cf85e54efd6a7da71db596ca4754.jpg";

// Headers cho các sheet log
const SHEET_HEADERS = {
  "log": ["Thời gian", "Hành động", "Chi tiết"],
  "lichsu_donhang": ["Thời gian", "Số đơn hàng", "VIN", "Hành động", "Chi tiết", "Người thực hiện", "Dữ liệu JSON"],
  "lichsu_xe": ["Thời gian", "VIN", "Hành động", "Chi tiết", "Người thực hiện", "Dữ liệu JSON"],
  "Mail": ["Tên tư vấn bán hàng", "Email"]
};