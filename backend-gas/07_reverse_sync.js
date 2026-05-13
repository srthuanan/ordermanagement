/**
 * 07_reverse_sync.js - Đồng bộ ngược từ Google Sheet về Supabase
 * ⛔️ ĐÃ VÔ HIỆU HÓA HOÀN TOÀN THEO YÊU CẦU HỆ THỐNG (CHỈ DÙNG SUPABASE LÀM NGUỒN SỰ THẬT DUY NHẤT)
 */

/**
 * Hàm tự động chạy khi có sự thay đổi trên Sheet (Đã vô hiệu hóa)
 */
function onEditReverseSync(e) {
  // Đã tắt tính năng này để bảo vệ dữ liệu gốc trên Supabase.
  return;
}

/**
 * Hàm cưỡng bức đẩy dữ liệu từ Sheet hiện tại lên Supabase (Đã vô hiệu hóa)
 */
function syncCurrentSheetToSupabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast("🚫 Chức năng đồng bộ ngược từ Sheet -> Supabase đã bị vô hiệu hóa hoàn toàn để bảo vệ tính toàn vẹn của cơ sở dữ liệu.", "Hệ thống", 10);
  Browser.msgBox("Hệ thống", "Chức năng đồng bộ ngược từ Sheet sang Supabase đã bị vô hiệu hóa vĩnh viễn.\\n\\nVui lòng chỉ thao tác dữ liệu trên giao diện React App để làm nguồn dữ liệu duy nhất.", Browser.Buttons.OK);
}
