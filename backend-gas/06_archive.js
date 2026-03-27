/**
 * ====================================================================
 * 06_archive.js — Lưu Trữ File Cũ Từ Supabase Storage → Google Drive
 * ====================================================================
 *
 * MỤC ĐÍCH:
 *   Khi Supabase Storage gần đầy, hàm này sẽ tự động:
 *   1. Tìm các đơn hàng cũ đã xuất hóa đơn (> X tháng)
 *   2. Download file PDF từ Supabase Storage
 *   3. Upload lên Google Drive (thư mục lưu trữ)
 *   4. Cập nhật URL mới vào bảng yeucauxhd
 *   5. Xóa file cũ khỏi Supabase Storage để giải phóng dung lượng
 *
 * THIẾT LẬP LẦN ĐẦU:
 *   1. Vào GAS Editor → Project Settings → Script Properties
 *   2. Thêm property: SUPABASE_SERVICE_KEY = <service_role_key_của_bạn>
 *   3. Chạy hàm setupArchiveConfig() một lần để kiểm tra
 *   4. Đặt Trigger: archiveOldFilesToDrive → Time-driven → Hàng tuần (Chủ nhật)
 * ====================================================================
 */

// --- Cấu hình ---
const SUPABASE_URL_ARCHIVE = "https://jwvgxqrkjlbewvpkvucj.supabase.co";
const ARCHIVE_MONTHS_OLD = 3;    // Lưu trữ đơn hàng xuất HĐ cách đây > 3 tháng
const ARCHIVE_BATCH_SIZE = 20;   // Xử lý tối đa 20 đơn/lần (tránh timeout GAS 6 phút)
const ARCHIVE_FOLDER_NAME = "HoaDon_LuuTru"; // Tên thư mục con trong Drive

// ==========================================================
// HÀM CHÍNH — Đặt Trigger chạy tự động hàng tuần
// ==========================================================
function archiveOldFilesToDrive() {
    const serviceKey = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');
    if (!serviceKey) {
        Logger.log("❌ Chưa cấu hình SUPABASE_SERVICE_KEY trong Script Properties!");
        sendAdminAlert("Lỗi Archive", "Chưa cấu hình SUPABASE_SERVICE_KEY trong Script Properties!");
        return;
    }

    Logger.log("=== BẮT ĐẦU LƯU TRỮ FILE CŨ ===");

    // 1. Tính ngày cutoff
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - ARCHIVE_MONTHS_OLD);
    const cutoffIso = cutoffDate.toISOString();
    Logger.log(`Tìm đơn hàng cũ hơn: ${cutoffDate.toLocaleDateString('vi-VN')}`);

    // 2. Lấy danh sách đơn hàng cũ từ Supabase
    let orders = [];
    try {
        const res = UrlFetchApp.fetch(
            `${SUPABASE_URL_ARCHIVE}/rest/v1/yeucauxhd?select=so_don_hang,url_hop_dong,url_de_nghi_xhd&ngay_xuat_hoa_don=not.is.null&ngay_yeu_cau=lt.${cutoffIso}&limit=${ARCHIVE_BATCH_SIZE}&url_hop_dong=like.*supabase*`,
            {
                method: 'GET',
                headers: _supabaseHeaders(serviceKey),
                muteHttpExceptions: true
            }
        );
        if (res.getResponseCode() !== 200) {
            Logger.log("❌ Lỗi lấy danh sách từ Supabase: " + res.getContentText());
            return;
        }
        orders = JSON.parse(res.getContentText());
    } catch (e) {
        Logger.log("❌ Lỗi kết nối Supabase: " + e.message);
        return;
    }

    Logger.log(`Tìm thấy ${orders.length} đơn hàng cần lưu trữ`);
    if (orders.length === 0) {
        Logger.log("✅ Không có file nào cần lưu trữ.");
        return;
    }

    // 3. Tìm hoặc tạo thư mục lưu trữ trên Drive
    const archiveFolder = _getOrCreateArchiveFolder();
    if (!archiveFolder) {
        Logger.log("❌ Không thể tạo thư mục lưu trữ trên Drive.");
        return;
    }

    // 4. Xử lý từng đơn hàng
    let successCount = 0;
    let errorCount = 0;

    orders.forEach(order => {
        const soDonHang = order.so_don_hang;
        const updates = {};
        const pathsToDelete = [];

        try {
            // Tạo thư mục con theo tên đơn hàng
            const orderFolder = _getOrCreateSubFolder(archiveFolder, soDonHang);

            // Xử lý từng loại file
            const filesToProcess = [
                { url: order.url_hop_dong, dbField: 'url_hop_dong', prefix: 'HDMB' },
                { url: order.url_de_nghi_xhd, dbField: 'url_de_nghi_xhd', prefix: 'DNXHD' }
            ];

            filesToProcess.forEach(({ url, dbField, prefix }) => {
                if (!url || !url.includes('supabase')) return; // Bỏ qua nếu đã là Drive URL

                try {
                    Logger.log(`  Đang xử lý: [${soDonHang}] ${prefix}`);

                    // Download file từ Supabase
                    const fileResponse = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
                    if (fileResponse.getResponseCode() !== 200) {
                        Logger.log(`  ⚠️ Không download được file: ${url}`);
                        return;
                    }

                    // Upload lên Google Drive
                    const blob = fileResponse.getBlob().setName(`${soDonHang}_${prefix}.pdf`);
                    const driveFile = orderFolder.createFile(blob);

                    // Đặt quyền xem cho bất kỳ ai có link
                    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

                    // Tạo URL dạng xem trực tiếp
                    const driveViewUrl = `https://drive.google.com/file/d/${driveFile.getId()}/view`;
                    updates[dbField] = driveViewUrl;

                    // Ghi nhớ path Supabase để xóa sau
                    const storagePath = _extractStoragePath(url);
                    if (storagePath) pathsToDelete.push(storagePath);

                    Logger.log(`  ✅ [${soDonHang}] ${prefix} → Drive`);
                } catch (fileErr) {
                    Logger.log(`  ❌ Lỗi file [${soDonHang}] ${prefix}: ${fileErr.message}`);
                    errorCount++;
                }
            });

            // Nếu có file nào được chuyển, cập nhật DB và xóa file Supabase
            if (Object.keys(updates).length > 0) {
                // Cập nhật URL mới vào Supabase
                _updateSupabase(serviceKey, soDonHang, updates);

                // Xóa file cũ khỏi Supabase Storage
                if (pathsToDelete.length > 0) {
                    _deleteFromSupabaseStorage(serviceKey, pathsToDelete);
                    Logger.log(`  🗑️ Đã xóa ${pathsToDelete.length} file khỏi Supabase Storage`);
                }

                successCount++;
            }

        } catch (orderErr) {
            Logger.log(`❌ Lỗi xử lý đơn [${soDonHang}]: ${orderErr.message}`);
            errorCount++;
        }
    });

    // 5. Ghi log tổng kết
    const summary = `Lưu trữ hoàn tất: ${successCount} thành công, ${errorCount} lỗi trong tổng ${orders.length} đơn hàng.`;
    Logger.log(`\n=== KẾT THÚC === ${summary}`);

    // Ghi vào sheet log
    _logArchiveResult(summary, successCount, errorCount, orders.length);
}

// ==========================================================
// HÀM THIẾT LẬP — Chạy MỘT LẦN để cài đặt toàn bộ
// ==========================================================
function setupArchiveConfig() {
    // 1. Lưu Service Key vào Script Properties (an toàn, không lộ trong code)
    const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU";
    PropertiesService.getScriptProperties().setProperty('SUPABASE_SERVICE_KEY', SERVICE_KEY);
    Logger.log("✅ Bước 1: Đã lưu SUPABASE_SERVICE_KEY vào Script Properties.");

    // 2. Xóa tất cả trigger cũ của archiveOldFilesToDrive (nếu có) để tránh trùng lặp
    ScriptApp.getProjectTriggers().forEach(trigger => {
        if (trigger.getHandlerFunction() === 'archiveOldFilesToDrive') {
            ScriptApp.deleteTrigger(trigger);
        }
    });

    // 3. Tạo trigger tự động chạy mỗi Chủ nhật lúc 2:00 sáng
    ScriptApp.newTrigger('archiveOldFilesToDrive')
        .timeBased()
        .onWeekDay(ScriptApp.WeekDay.SUNDAY)
        .atHour(2)
        .create();
    Logger.log("✅ Bước 2: Đã tạo Trigger tự động chạy mỗi Chủ nhật 2:00 sáng.");

    // 4. Test kết nối Supabase ngay
    testArchiveConnection();
    Logger.log("\n🎉 CÀI ĐẶT HOÀN TẤT! Hệ thống sẽ tự động lưu trữ file cũ mỗi tuần.");
}

// ==========================================================
// HÀM KIỂM TRA — Chạy để test kết nối trước khi đặt Trigger
// ==========================================================
function testArchiveConnection() {
    const serviceKey = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');
    if (!serviceKey) {
        Logger.log("❌ Chưa có SUPABASE_SERVICE_KEY. Hãy chạy setupArchiveConfig() trước.");
        return;
    }

    const res = UrlFetchApp.fetch(
        `${SUPABASE_URL_ARCHIVE}/rest/v1/yeucauxhd?select=count&limit=1`,
        { method: 'GET', headers: _supabaseHeaders(serviceKey), muteHttpExceptions: true }
    );

    if (res.getResponseCode() === 200) {
        Logger.log("✅ Kết nối Supabase thành công!");
        Logger.log("✅ Sẵn sàng đặt Trigger cho archiveOldFilesToDrive()");
    } else {
        Logger.log("❌ Lỗi kết nối: " + res.getContentText());
    }
}

// ==========================================================
// HÀM TIỆN ÍCH (private)
// ==========================================================
function _supabaseHeaders(serviceKey) {
    return {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json"
    };
}

function _extractStoragePath(publicUrl) {
    try {
        const marker = '/yeucauxhd-files/';
        const idx = publicUrl.indexOf(marker);
        if (idx === -1) return null;
        return decodeURIComponent(publicUrl.substring(idx + marker.length));
    } catch (e) {
        return null;
    }
}

function _getOrCreateArchiveFolder() {
    try {
        const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        const it = rootFolder.getFoldersByName(ARCHIVE_FOLDER_NAME);
        if (it.hasNext()) return it.next();
        return rootFolder.createFolder(ARCHIVE_FOLDER_NAME);
    } catch (e) {
        Logger.log("Lỗi tạo thư mục gốc: " + e.message);
        return null;
    }
}

function _getOrCreateSubFolder(parent, name) {
    const it = parent.getFoldersByName(name);
    if (it.hasNext()) return it.next();
    return parent.createFolder(name);
}

function _updateSupabase(serviceKey, soDonHang, updates) {
    UrlFetchApp.fetch(
        `${SUPABASE_URL_ARCHIVE}/rest/v1/yeucauxhd?so_don_hang=eq.${encodeURIComponent(soDonHang)}`,
        {
            method: 'PATCH',
            headers: { ..._supabaseHeaders(serviceKey), "Prefer": "return=minimal" },
            payload: JSON.stringify(updates),
            muteHttpExceptions: true
        }
    );
}

/**
 * [HÀM MỚI] Đồng bộ kết quả gửi mail trực tiếp lên Supabase
 * @param {string} soDonHang 
 * @param {string} status 
 */
function updateSupabaseInvoiceMailStatus(soDonHang, status) {
    try {
        const serviceKey = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');
        if (!serviceKey) return;

        const updates = { ket_qua_gui_mail: status };
        _updateSupabase(serviceKey, soDonHang, updates);
        Logger.log(`✅ Đã đồng bộ kết quả gửi mail lên Supabase cho đơn ${soDonHang}: ${status}`);
    } catch (e) {
        Logger.log(`⚠️ Lỗi khi đồng bộ kết quả mail lên Supabase: ${e.message}`);
    }
}

function _deleteFromSupabaseStorage(serviceKey, paths) {
    try {
        UrlFetchApp.fetch(
            `${SUPABASE_URL_ARCHIVE}/storage/v1/object/yeucauxhd-files`,
            {
                method: 'DELETE',
                headers: _supabaseHeaders(serviceKey),
                payload: JSON.stringify({ prefixes: paths }),
                muteHttpExceptions: true
            }
        );
    } catch (e) {
        Logger.log("Lỗi xóa file Storage: " + e.message);
    }
}

function _logArchiveResult(summary, ok, err, total) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = getOrCreateSheet(ss, "log", SHEET_HEADERS["log"]);
        appendAndFormatRow(sheet, [new Date(), "ARCHIVE_FILES", summary]);
    } catch (e) {
        Logger.log("Không ghi được log: " + e.message);
    }
}

function sendAdminAlert(subject, body) {
    try {
        sendEmailViaEdge(ADMIN_EMAIL, `[GAS Alert] ${subject}`, body);
    } catch (e) {
        Logger.log("Không gửi được email alert: " + e.message);
    }
}
