import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import nodemailer from "npm:nodemailer@6.9.13"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SMTP_EMAIL = Deno.env.get("SMTP_EMAIL") || "showroomthuanan@gmail.com";
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD") || "";

// Reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: SMTP_EMAIL,
    pass: SMTP_PASSWORD.replace(/\s/g, ''),
  },
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function normalizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

async function getEmailForAdvisor(advisorName: string): Promise<string | null> {
  if (!advisorName) return null;
  const { data, error } = await supabase.from("users").select("full_name, username, email").limit(500);
  if (error || !data) return null;
  const normalizedTarget = normalizeString(advisorName);
  const rawTarget = String(advisorName).trim().toLowerCase();
  
  for (const row of data) {
    if (normalizeString(row.full_name || "") === normalizedTarget) return row.email || null;
    const uName = String(row.username || "").trim().toLowerCase();
    if (uName && uName === rawTarget) return row.email || null;
  }
  return null;
}

/**
 * Enrich record with full order data from Supabase `donhang` table
 * This ensures emails always have complete information even when 
 * frontend sends partial data.
 */
async function enrichRecord(record: Record<string, any>): Promise<Record<string, any>> {
  if (!record.so_don_hang) return record;
  
  try {
    const { data: fullOrder } = await supabase
      .from('donhang')
      .select('*')
      .eq('so_don_hang', record.so_don_hang)
      .maybeSingle();
    
    if (fullOrder) {
      // Merge: record (caller's data) takes precedence, but fill in missing fields from DB
      return {
        ...fullOrder,
        ...record,
        // Normalize advisor name field (DB uses ten_tu_van_ban_hang, email funcs use ten_ban_hang)
        ten_ban_hang: record.ten_ban_hang || record.ten_tu_van_ban_hang || fullOrder.ten_tu_van_ban_hang || fullOrder.ten_ban_hang,
        ten_tu_van_ban_hang: record.ten_tu_van_ban_hang || fullOrder.ten_tu_van_ban_hang,
        ten_khach_hang: record.ten_khach_hang || fullOrder.ten_khach_hang,
        dong_xe: record.dong_xe || fullOrder.dong_xe,
        phien_ban: record.phien_ban || fullOrder.phien_ban,
        ngoai_that: record.ngoai_that || fullOrder.ngoai_that,
        noi_that: record.noi_that || fullOrder.noi_that,
        vin: record.vin || fullOrder.vin,
        ngay_coc: record.ngay_coc || fullOrder.ngay_coc,
      };
    }
  } catch (e) {
    console.warn("enrichRecord error:", e);
  }
  return record;
}

function buildHtml(title: string, user: string, details: Record<string, string>, note: string, color: string = "#1e3a8a") {
  let rows = "";
  for (const [key, val] of Object.entries(details)) {
    const isVin = ['vin', 'số vin', 'vin đã hủy', 'xe mới đã về'].includes(key.toLowerCase());
    const rowBg = isVin ? "background-color: #eff6ff;" : "";
    const valColor = isVin ? "color: #2563eb; font-weight: 700;" : "color: #1f2937; font-weight: 600;";
    rows += `
      <tr style="${rowBg}">
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 40%; font-weight: 500; font-size: 13px;">${key}:</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; ${valColor} font-size: 14px;">${val}</td>
      </tr>
    `;
  }
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; background-color: #f3f4f6;">
    <div style="background-color: #f3f4f6; padding: 40px 0;">
      <table align="center" width="600" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color: ${color}; padding: 25px 40px; text-align: center;">
            <h1 style="margin: 0; font-size: 20px; color: #ffffff; font-weight: 700; letter-spacing: 0.5px;">THÔNG BÁO HỆ THỐNG</h1>
            <div style="color: #bfdbfe; font-size: 13px; margin-top: 5px;">VinFast Thuận An</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px 40px;">
            <div style="font-size: 15px; color: #374151; margin-bottom: 20px;">
              Kính gửi <b>${user}</b>,
            </div>
            <h3 style="color: ${color}; margin-top: 0; margin-bottom: 20px; font-size: 18px; line-height: 1.4;">
              ${title}
            </h3>
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
              ${rows}
            </table>
            <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">
              ${note}
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Thông báo tự động từ hệ thống quản lý.</div>
              <div style="font-size: 12px; color: #9ca3af;">Vui lòng không trả lời email này.</div>
            </div>
          </td>
        </tr>
      </table>
    </div>
</body>
</html>`;
}

function formatDate(isoStr: string | null): string {
  if (!isoStr) return "N/A";
  try {
    const d = new Date(isoStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch {
    return String(isoStr);
  }
}

async function sendMail(to: string, subject: string, html: string, attachments: any[] = []) {
  const mailOptions: any = {
    from: `"Hệ thống Quản lý VinFast Thuận An" <${SMTP_EMAIL}>`,
    to,
    subject,
    html,
  };
  if (attachments.length > 0) {
    mailOptions.attachments = attachments;
  }
  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Email sent to ${to} (ID: ${info.messageId})`);
  return info;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  try {
    if (!SMTP_PASSWORD) return new Response(JSON.stringify({ error: "Missing SMTP_PASSWORD" }), { status: 500, headers: corsHeaders });

    const payload = await req.json();
    const actionId = payload.actionId || payload.emailType;
    let record = payload.record;

    // === RAW EMAIL: Gửi email trực tiếp với nội dung HTML cho sẵn (từ GAS) ===
    if (actionId === 'raw') {
      const toEmails = Array.isArray(payload.recipient_email) ? payload.recipient_email.join(',') : payload.recipient_email;
      if (!toEmails) return new Response(JSON.stringify({ error: "Missing recipient_email for raw email" }), { status: 400, headers: corsHeaders });
      
      const rawAttachments: any[] = [];
      if (payload.attachments && Array.isArray(payload.attachments)) {
        for (const a of payload.attachments) {
          rawAttachments.push({ filename: a.name || 'attachment.pdf', content: a.content, encoding: 'base64' });
        }
      }

      await sendMail(toEmails, payload.subject, payload.html, rawAttachments);
      return new Response(JSON.stringify({ status: "SUCCESS" }), { status: 200, headers: corsHeaders });
    }

    // === BUSINESS EMAILS: Xử lý trực tiếp tại Edge, tra cứu thông tin từ Supabase ===
    if (!record && !actionId) {
      return new Response(JSON.stringify({ error: "No record or actionId found in payload" }), { status: 400, headers: corsHeaders });
    }

    // Bổ sung thông tin đầy đủ của đơn hàng từ DB
    if (record) {
      record = await enrichRecord(record);
    }

    const tenTVBH = record?.ten_ban_hang || record?.ten_tu_van_ban_hang || record?.tvbh || "TVBH";
    let recipientEmail = await getEmailForAdvisor(tenTVBH);
    
    if (!recipientEmail) {
      console.warn(`❌ Could not find email for advisor: "${tenTVBH}" (actionId: ${actionId})`);
      return new Response(JSON.stringify({ success: false, message: `Không tìm thấy email cho TVBH: ${tenTVBH}` }), { status: 200, headers: corsHeaders });
    }

    let subject = "";
    let htmlBody = "";
    const attachments: any[] = [];

    // ============================================================
    // 1. GHÉP XE THÀNH CÔNG (match_success)
    // ============================================================
    if (actionId === 'match_success') {
      subject = `[THÔNG BÁO] V/v Ghép xe thành công cho Đơn hàng ${record.so_don_hang}`;
      const details: Record<string, string> = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Tên khách hàng": record.ten_khach_hang || "N/A",
        "Dòng xe": record.dong_xe || "N/A",
        "Phiên bản": record.phien_ban || "N/A",
        "Ngoại thất": record.ngoai_that || "N/A",
        "Nội thất": record.noi_that || "N/A",
        "Ngày cọc": formatDate(record.ngay_coc),
        "Thời gian ghép": formatDate(record.thoi_gian_ghep || new Date().toISOString()),
        "VIN": record.vin || "N/A",
      };
      htmlBody = buildHtml("Đơn hàng của Anh/Chị đã được ghép VIN thành công:", tenTVBH, details, "Vui lòng kiểm tra và xác nhận thông tin. Trân trọng.", "#1e3a8a");
    }
    // ============================================================
    // 2. CHỜ GHÉP XE (match_request_pending) 
    // ============================================================
    else if (actionId === 'match_request_pending') {
      subject = `[HỆ THỐNG] Đã tiếp nhận yêu cầu ghép xe cho Đơn hàng ${record.so_don_hang}`;
      const details: Record<string, string> = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Tên khách hàng": record.ten_khach_hang || "N/A",
        "Dòng xe": record.dong_xe || "N/A",
        "Phiên bản": record.phien_ban || "N/A",
        "Ngoại thất": record.ngoai_that || "N/A",
        "Nội thất": record.noi_that || "N/A",
        "Ngày cọc": formatDate(record.ngay_coc),
        "Thời gian nhập": formatDate(record.thoi_gian_nhap || new Date().toISOString()),
      };
      htmlBody = buildHtml("Đơn hàng sau đang trong trạng thái chờ ghép VIN:", tenTVBH, details, "Hệ thống sẽ tự động tìm xe phù hợp. Vui lòng chờ hoặc liên hệ Admin nếu cần hỗ trợ.", "#1e3a8a");
    }
    // ============================================================
    // 3. HỦY ĐƠN HÀNG / HỦY GHÉP (order_self_cancelled)
    // ============================================================
    else if (actionId === 'order_self_cancelled') {
      const isWaiting = record.is_waiting === true || record.status === 'Chưa ghép';
      subject = `[THÔNG BÁO] V/v hủy ghép xe cho đơn hàng ${record.so_don_hang}`;
      const details: Record<string, string> = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Tên khách hàng": record.ten_khach_hang || "N/A",
        "Dòng xe": record.dong_xe || "N/A",
        "VIN đã hủy": record.vin || "N/A",
        "Thời gian hủy": formatDate(new Date().toISOString()),
        "Lý do hủy": record.ghi_chu_huy || "Hủy theo yêu cầu.",
        "Trạng thái mới": isWaiting ? "Chờ xe (Đơn hàng vẫn giữ)" : "Đã hủy hoàn toàn",
      };
      const noteColor = isWaiting ? "#d97706" : "#dc2626";
      htmlBody = buildHtml("Đơn hàng sau đã được hủy ghép VIN:", tenTVBH, details, "Vui lòng kiểm tra thông tin lại với Admin!", noteColor);
    }
    // ============================================================
    // 4. XUẤT HÓA ĐƠN (invoice_issued)
    // ============================================================
    else if (actionId === 'invoice_issued') {
      subject = `✅ [Hóa Đơn] ${record.ten_khach_hang || "KH"} (${record.so_don_hang})`;
      const details: Record<string, string> = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Tên khách hàng": `<b>${record.ten_khach_hang || "N/A"}</b>`,
        "VIN": `<b>${record.vin || "N/A"}</b>`,
        "Dòng xe": `${record.dong_xe || ""} - ${record.phien_ban || ""}`,
        "Ngoại thất / Nội thất": `${record.ngoai_that || ""} / ${record.noi_that || ""}`,
      };
      htmlBody = buildHtml("🎉 Đơn hàng đã được xuất hóa đơn thành công!", tenTVBH, details, "Đơn hàng đã được cập nhật trạng thái đã xuất hóa đơn. Vui lòng liên hệ bộ phận Kế toán để nhận tài liệu. Trân trọng!", "#1e3a8a");
    }
    // ============================================================
    // 5. YÊU CẦU BỔ SUNG HỒ SƠ (invoice_supplement_requested)
    // ============================================================
    else if (actionId === 'invoice_supplement_requested') {
      subject = `[YÊU CẦU BỔ SUNG] ĐH ${record.so_don_hang} cần nộp thêm hồ sơ`;
      const details: Record<string, string> = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Tên khách hàng": record.ten_khach_hang || "N/A",
        "VIN": record.vin || "N/A",
        "Lý do yêu cầu": `<b style="color:#d97706;">${record.ghi_chu_admin || "Bổ sung hồ sơ"}</b>`,
      };
      htmlBody = buildHtml("⚠️ Yêu Cầu Bổ Sung Hồ Sơ", tenTVBH, details, "Hồ sơ của bạn hiện đang thiếu một số chứng từ. Vui lòng vào hệ thống để tải lên bổ sung sớm nhất có thể.", "#d97706");
    }
    // ============================================================
    // 6. ĐÃ NỘP BỔ SUNG (invoice_supplement_submitted)
    // ============================================================
    else if (actionId === 'invoice_supplement_submitted') {
      subject = `[BIÊN NHẬN] Xác nhận nộp bổ sung hồ sơ ĐH ${record.so_don_hang}`;
      const details: Record<string, string> = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Tên khách hàng": `<b>${record.ten_khach_hang || "N/A"}</b>`,
        "Chứng từ đã nộp": `<b style="color: #2e7d32;">${record.filesInfo || 'Các tệp bổ sung'}</b>`,
      };
      htmlBody = buildHtml("Nộp Bổ Sung Hồ Sơ Thành Công!", tenTVBH, details, "Hệ thống đã ghi nhận các chứng từ cập nhật của bạn an toàn trên nền tảng Cloud.", "#2e7d32");

      // Tải và đính kèm file
      try {
        const fetchAttachment = async (url: string, prefix: string) => {
          if (!url) return null;
          try {
            const res = await fetch(url);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              return { filename: `BoSung_${prefix}_${record.so_don_hang}.pdf`, content: new Uint8Array(buffer) };
            }
          } catch (e) { console.warn(`Fetch lỗi cho ${prefix}:`, e) }
          return null;
        };

        const results = await Promise.all([
          fetchAttachment(record.url_hop_dong, 'HD'),
          fetchAttachment(record.url_de_nghi_xhd, 'DNXHD')
        ]);

        if (results[0]) attachments.push(results[0]);
        if (results[1]) attachments.push(results[1]);
      } catch (e) {
        console.error("Lỗi đính kèm file:", e);
      }
    }
    // ============================================================
    // 7. XÁC NHẬN YÊU CẦU XHĐ (invoice_request_submitted) 
    // ============================================================
    else if (actionId === 'invoice_request_submitted') {
      subject = `[XÁC NHẬN] Yêu cầu xuất hóa đơn cho ĐH ${record.so_don_hang} đã được gửi`;
      const details: Record<string, string> = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Tên khách hàng": record.ten_khach_hang || "N/A",
        "Số VIN": `<b>${record.vin || "N/A"}</b>`,
        "Trạng thái mới": "<b>Chờ xuất hóa đơn</b>",
      };
      htmlBody = buildHtml("Yêu cầu xuất hóa đơn đã được gửi thành công!", tenTVBH, details, "Yêu cầu của bạn đã được chuyển đến bộ phận liên quan để xử lý. Hệ thống sẽ có thông báo tiếp theo khi hóa đơn được chính thức phát hành. Xin cảm ơn!", "#1e3a8a");
    }
    // ============================================================
    // UNKNOWN ACTION
    // ============================================================
    else {
      console.warn(`Unknown actionId: ${actionId}`);
      return new Response(JSON.stringify({ error: `Unknown actionId: ${actionId}` }), { status: 400, headers: corsHeaders });
    }

    // === GỬI EMAIL ===
    await sendMail(recipientEmail, subject, htmlBody, attachments);
    return new Response(JSON.stringify({ status: "SUCCESS", success: true, message: "Email sent" }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("SMTP Error:", err);
    return new Response(JSON.stringify({ error: err.message, success: false }), { status: 500, headers: corsHeaders });
  }
});
