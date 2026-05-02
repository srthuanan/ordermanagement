import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"
import nodemailer from "npm:nodemailer@6.9.13"
import { Buffer } from "node:buffer"

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
      const result = {
        ...fullOrder,
        ...record,
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

      // Nếu là yêu cầu xuất hóa đơn, lấy thêm thông tin từ yeucauxhd (Link file, chính sách, hoa hồng, vpoint)
      try {
        const { data: requestData } = await supabase
          .from('yeucauxhd')
          .select('*')
          .eq('so_don_hang', record.so_don_hang)
          .maybeSingle();
        
        if (requestData) {
          return {
            ...result,
            policy: record.policy || requestData.chinh_sach,
            commission: record.commission || requestData.hoa_hong_ung,
            vpoint: record.vpoint || requestData.vpoint,
            url_hop_dong: record.url_hop_dong || requestData.url_hop_dong,
            url_de_nghi_xhd: record.url_de_nghi_xhd || requestData.url_de_nghi_xhd,
            ghi_chu_ai: record.ghi_chu_ai || requestData.ghi_chu_ai,
          };
        }
      } catch (reqErr) {
        console.warn("Error enriching from yeucauxhd:", reqErr);
      }
      
      return result;
    }
  } catch (e) {
    console.warn("enrichRecord error:", e);
  }
  return record;
}

function buildHtml(title: string, user: string, details: Record<string, string>, note: string, color: string = "#1e3a8a") {
  let rows = "";
  for (const [key, val] of Object.entries(details)) {
    const isAction = key === 'Hành động';
    const isVin = ['vin', 'số vin', 'vin đã hủy', 'xe mới đã về'].includes(key.toLowerCase());
    
    if (isAction) {
       rows += `
        <tr>
          <td colspan="2" style="padding: 20px 0; text-align: center;">
            ${val}
          </td>
        </tr>
      `;
      continue;
    }

    const rowBg = isVin ? "background-color: #f8fafc;" : "";
    const valColor = isVin ? "color: #1e40af; font-weight: 700;" : "color: #334155; font-weight: 600;";
    
    const rowClass = isVin ? "row-highlight" : "";
    rows += `
      <tr class="${rowClass}" style="${rowBg}">
        <td class="text-muted" style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9; color: #94a3b8; width: 35%; font-weight: 500; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; vertical-align: top;">${key}</td>
        <td class="${isVin ? 'text-blue' : 'text-main'}" style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; ${valColor} font-size: 13px; text-align: right; word-break: break-word;">${val}</td>
      </tr>
    `;
  }

  const fontStack = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, Arial, 'Helvetica Neue', Helvetica";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <style>
    :root { color-scheme: light; supported-color-schemes: light; }
    body { font-family: ${fontStack} !important; -webkit-font-smoothing: antialiased; background-color: #f4f7f9; }
    .btn-primary:hover { opacity: 0.9 !important; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .header-content { padding: 20px !important; }
      .body-content { padding: 0 20px 30px 20px !important; }
      .detail-card { padding: 15px !important; }
      .logo { height: 32px !important; }
      .header-text { font-size: 11px !important; }
    }
    /* Professional Dark Mode Overrides */
    @media (prefers-color-scheme: dark) {
      body { background-color: #111827 !important; }
      .container { background-color: #1f2937 !important; border-color: #374151 !important; color: #f9fafb !important; }
      /* Protect Header: Keep it light for the logo */
      .header-content { background-color: #ffffff !important; border-bottom: 1px solid #f1f5f9 !important; }
      .header-text { color: #1e3a8a !important; }
      
      .body-content { background-color: #1f2937 !important; }
      .detail-card { background-color: #111827 !important; border-color: #374151 !important; }
      
      /* Text Colors */
      .text-main { color: #f9fafb !important; }
      .text-muted { color: #9ca3af !important; }
      .text-blue { color: #60a5fa !important; }
      
      /* Table Adjustments */
      td { border-bottom-color: #374151 !important; }
      .row-highlight { background-color: #1e293b !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f9; color: #334155; font-family: ${fontStack};">
    <div style="background-color: #f4f7f9; padding: 20px 0;">
      <table class="container" align="center" width="550" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto; width: 100%; max-width: 550px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.04); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
          <td class="header-content" style="padding: 30px 40px 25px 40px; background-color: #ffffff;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="left" style="vertical-align: middle;">
                  <img class="logo" src="https://jwvgxqrkjlbewvpkvucj.supabase.co/storage/v1/object/public/car-images/logoweb.png" alt="VinFast" style="height: 48px; width: auto; display: block;">
                </td>
                <td align="right" style="text-align: right; vertical-align: middle;">
                  <div style="font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Hệ thống thông báo</div>
                  <div class="header-text" style="font-size: 14px; font-weight: 800; color: #1e3a8a; white-space: nowrap; letter-spacing: -0.5px;">VINFAST THUẬN AN</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Main Body -->
        <tr>
          <td class="body-content" style="padding: 0 40px 40px 40px; background-color: #ffffff;">
            <div style="height: 1px; background-color: #1e3a8a; margin-bottom: 30px; opacity: 0.15;"></div>
            
            <div class="text-muted" style="font-size: 13px; color: #64748b; margin-bottom: 5px; font-weight: 500;">Thân gửi,</div>
            <div class="text-main" style="font-size: 18px; color: #0f172a; font-weight: 700; margin-bottom: 20px;">${user}</div>
            
            <div class="detail-card" style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #f1f5f9;">
              <div class="text-blue" style="color: ${color}; margin-top: 0; margin-bottom: 15px; font-size: 15px; font-weight: 700;">
                ${title}
              </div>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                ${rows}
              </table>

              ${note ? `
                <div style="height: 1px; background-color: #f1f5f9; margin: 12px 0;"></div>
                <div style="color: #64748b; font-size: 13px; line-height: 1.6; padding: 0 5px; text-align: center;">
                  ${note}
                </div>
              ` : ''}
            </div>

            <!-- Footer Section -->
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #1e3a8a; border-top-color: rgba(30, 58, 138, 0.4); text-align: center;">
              <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Hệ thống Quản lý Bán hàng</div>
              <div style="font-size: 9px; color: #cbd5e1;">Đây là email tự động từ hệ thống quản trị. Vui lòng không phản hồi.</div>
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
    from: `"VINFAST THUAN AN MANAGEMENT SYSTEM" <${SMTP_EMAIL}>`,
    to,
    subject,
    html,
    attachments: attachments.map(a => ({
      ...a,
      // Ensure content is passed correctly to nodemailer using Node-compatible Buffer
      content: a.content instanceof Uint8Array ? Buffer.from(a.content) : a.content
    }))
  };
  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Email sent to ${to} (ID: ${info.messageId}) with ${attachments.length} attachments`);
  return info;
}

/**
 * Common helper to download a file from URL and add to attachments array
 */
async function attachFileFromUrl(url: string, label: string, orderNumber: string, attachments: any[]) {
  if (!url) return;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout per file

  try {
    // Basic URL conversion for Google Drive
    let downloadUrl = url;
    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
      const match = url.match(/\/file\/d\/([^/]+)/);
      if (match) downloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }

    const res = await fetch(downloadUrl, { signal: controller.signal });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      // Use clean filenames
      const filename = `${label}_${orderNumber}.pdf`.replace(/\s+/g, '_');
      attachments.push({ 
        filename: filename, 
        content: new Uint8Array(buffer) 
      });
      console.log(`📎 Attached: ${filename} (${buffer.byteLength} bytes)`);
    } else {
      console.warn(`⚠️ Failed to download attachment from ${url}: ${res.statusText}`);
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.warn(`⚠️ Timeout: Bỏ qua đính kèm ${label} do tải quá lâu (>12s)`);
    } else {
      console.warn(`⚠️ Error attaching file from ${url}:`, e);
    }
  } finally {
    clearTimeout(timeoutId);
  }
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
    let recipientEmail = payload.recipient_email;

    // Đối với các tác vụ liên quan đến tài khoản, lấy thẳng từ record.email
    if (actionId === 'welcome_new_user' || actionId === 'forgot_password_otp' || actionId === 'forgot_password_secure') {
      recipientEmail = record.email;
    }

    // Nếu chưa có recipientEmail thì mới tra cứu theo tên TVBH
    if (!recipientEmail) {
      recipientEmail = await getEmailForAdvisor(tenTVBH);
    }
    
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
      subject = `✅ [Hóa Đơn Đã Phát Hành] - Đơn hàng ${record.so_don_hang} cho KH ${(record.ten_khach_hang || "KH").toUpperCase()}`;
      const details: Record<string, string> = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Tên khách hàng": `<b>${(record.ten_khach_hang || "N/A").toUpperCase()}</b>`,
        "Số VIN": `<b>${record.vin || "N/A"}</b>`,
        "Ngày xuất hóa đơn": formatDate(new Date().toISOString()),
        "Dòng xe": record.dong_xe || "N/A",
        "Phiên bản": record.phien_ban || "N/A",
        "Ngoại thất": record.ngoai_that || "N/A",
        "Nội thất": record.noi_that || "N/A",
      };
      htmlBody = buildHtml("🎉 Hóa đơn đã được phát hành thành công!", tenTVBH, details, "Hóa đơn điện tử đã được phát hành và đính kèm trong email này. Anh/Chị vui lòng tải về và gửi cho khách hàng. Trân trọng!", "#1e3a8a");

      // Đính kèm file hóa đơn (Ưu tiên Base64 nếu có, sau đó đến URL)
      if (record.invoice_content) {
        // Hỗ trợ gửi trực tiếp content (Base64) từ caller
        attachments.push({ 
          filename: `HOADON_${record.so_don_hang}_${normalizeString(record.ten_khach_hang || 'KH').replace(/\s+/g, '_')}.png`, 
          content: record.invoice_content,
          encoding: 'base64'
        });
      } else {
        const invoiceUrl = record.link_hoa_don_da_xuat || record.url_hoa_don_da_xuat;
        if (invoiceUrl) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
          try {
            let downloadUrl = invoiceUrl;
            if (invoiceUrl.includes('drive.google.com') && invoiceUrl.includes('/file/d/')) {
              const match = invoiceUrl.match(/\/file\/d\/([^/]+)/);
              if (match) downloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
            }
            const res = await fetch(downloadUrl, { signal: controller.signal });
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              const safeName = normalizeString(record.ten_khach_hang || 'KH').replace(/\s+/g, '_');
              attachments.push({ 
                filename: `HOADON_${record.so_don_hang}_${safeName}.pdf`, 
                content: new Uint8Array(buffer) 
              });
            }
          } catch (e: any) { 
            console.warn("⚠️ Lỗi đính kèm hóa đơn:", e.name === 'AbortError' ? "Timeout (>15s)" : e.message); 
          } finally {
            clearTimeout(timeoutId);
          }
        }
      }
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
      htmlBody = buildHtml("Nộp Bổ Sung Hồ Sơ Thành Công!", tenTVBH, details, "Hệ thống đã ghi nhận các chứng từ cập nhật của bạn an toàn trên nền tảng Cloud. Các tệp tin được đính kèm bên dưới để bạn lưu trữ.", "#2e7d32");

      // Đính kèm các file đã nộp
      await Promise.all([
        attachFileFromUrl(record.url_hop_dong, 'HDMB_BoSung', record.so_don_hang, attachments),
        attachFileFromUrl(record.url_de_nghi_xhd, 'DNXHD_BoSung', record.so_don_hang, attachments)
      ]);
    }
    // ============================================================
    // 7. XÁC NHẬN YÊU CẦU XHĐ (invoice_request_submitted) 
    // ============================================================
    else if (actionId === 'invoice_request_submitted') {
      subject = `[XÁC NHẬN] Yêu cầu xuất hóa đơn cho ĐH ${record.so_don_hang} đã được gửi`;
      const formatCurrency = (val: any) => {
        if (!val) return "0";
        const num = String(val).replace(/[^0-9]/g, "");
        return new Intl.NumberFormat('vi-VN').format(parseInt(num || "0"));
      };

      const details: Record<string, string> = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Tên khách hàng": record.ten_khach_hang || "N/A",
        "Số VIN": `<b>${record.vin || "N/A"}</b>`,
        "Chính sách": Array.isArray(record.policy) ? record.policy.join(', ') : (record.policy || "N/A"),
        "Hoa hồng ứng": record.commission ? `<b>${formatCurrency(record.commission)} VND</b>` : "0 VND",
        "Vpoint dùng": record.vpoint ? `<b>${formatCurrency(record.vpoint)} Điểm</b>` : "0 Điểm",
        "Trạng thái mới": "<b>Chờ xuất hóa đơn</b>",
      };
      htmlBody = buildHtml("Yêu cầu xuất hóa đơn đã được gửi thành công!", tenTVBH, details, "Yêu cầu của bạn đã được chuyển đến bộ phận liên quan để xử lý. Các tệp hồ sơ gốc bạn đã nộp được đính kèm bên dưới. Trân trọng!", "#1e3a8a");

      // Đính kèm các file hồ sơ gốc
      await Promise.all([
        attachFileFromUrl(record.url_hop_dong, 'HDMB', record.so_don_hang, attachments),
        attachFileFromUrl(record.url_de_nghi_xhd, 'DNXHD', record.so_don_hang, attachments)
      ]);
    }
    // ============================================================
    // 8. CHÀO MỪNG NHÂN VIÊN MỚI (welcome_new_user - NEW FLOW)
    // ============================================================
    else if (actionId === 'welcome_new_user') {
      const { email, full_name, redirectTo } = record;
      
      // 1. Tạo Link Invite từ Supabase (Mặc định cho nhân viên mới)
      let { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: { redirectTo: redirectTo }
      });

      // 2. FALLBACK: Nếu nhân viên đã tồn tại, chuyển sang dùng Link Recovery (Khôi phục)
      if (linkErr && linkErr.message.includes('already been registered')) {
        console.log("User already exists, falling back to recovery link...");
        const recoveryResult = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: { redirectTo: redirectTo }
        });
        linkData = recoveryResult.data;
        linkErr = recoveryResult.error;
      }

      if (linkErr) {
        console.error("Link Generation Error:", linkErr.message);
        return new Response(JSON.stringify({ success: false, message: "Không thể tạo link xác thực. " + linkErr.message }), { status: 200, headers: corsHeaders });
      }

      const actionLink = linkData.properties.action_link;

      subject = `✨ [CHÀO MỪNG] Tài khoản truy cập hệ thống Quản lý VinFast Thuận An`;
      recipientEmail = email;
      
      const details: Record<string, string> = {
        "Họ và tên": `<b>${full_name}</b>`,
        "Tên đăng nhập": `<b>${email}</b>`,
        "Vai trò": "Nhân viên (TVBH)",
        "Hành động": `<a href="${actionLink}" class="btn-primary" style="display: inline-block; background-color: #1e3a8a; color: #ffffff; padding: 10px 22px; border-radius: 30px; text-decoration: none; font-weight: 600; font-size: 13px; margin: 5px 0; transition: all 0.3s ease;">Kích hoạt tài khoản</a>`
      };
      
      htmlBody = buildHtml(
        "Chào mừng Bạn đến với hệ thống!", 
        full_name, 
        details, 
        "<b>Chào mừng Bạn gia nhập đội ngũ VinFast Thuận An!</b><br/>Tài khoản của bạn đã được khởi tạo thành công. Vui lòng bấm vào nút phía trên để thiết lập mật khẩu và bắt đầu hành trình tuyệt vời cùng chúng tôi.", 
        "#1e3a8a"
      );
    }
    // ============================================================
    // 9. QUÊN MẬT KHẨU - LINK BẢO MẬT (forgot_password_secure - NEW)
    // ============================================================
    else if (actionId === 'forgot_password_secure') {
      const { email, redirectTo } = record;
      
      // Tạo Link bảo mật từ Supabase Auth
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: { redirectTo: redirectTo }
      });

      if (linkErr) {
        console.error("Link Generation Error:", linkErr.message);
        return new Response(JSON.stringify({ success: false, message: "Không thể tạo link khôi phục. Email có thể không tồn tại." }), { status: 200, headers: corsHeaders });
      }

      const resetLink = linkData.properties.action_link;
      
      // Tìm tên nhân viên để đưa vào email
      const { data: userData } = await supabase.from('users').select('full_name, username').eq('email', email).maybeSingle();
      const displayName = userData?.full_name || email.split('@')[0];

      subject = `🔐 [XÁC THỰC] Yêu cầu đặt lại mật khẩu - VinFast Thuận An`;
      recipientEmail = email;
      
      const details: Record<string, string> = {
        "Tên tài khoản": `<b>${email}</b>`,
        "Hành động": "Đặt lại mật khẩu truy cập",
        "Truy cập ngay": `<a href="${resetLink}" class="btn-primary" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 10px 22px; border-radius: 30px; text-decoration: none; font-weight: 600; font-size: 13px; margin: 5px 0; transition: all 0.3s ease;">Đặt lại mật khẩu</a>`
      };
      
      htmlBody = buildHtml("Khôi Phục Mật Khẩu Truy Cập", displayName, details, "Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản này. Vui lòng bấm vào nút phía trên để tiếp tục. <br/><br/><b>Lưu ý:</b> Đường dẫn này chỉ có hiệu lực trong thời gian ngắn. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.", "#dc2626");
    }
    // ============================================================
    // 10. THAY THẾ VIN (vin_replaced)
    // ============================================================
    else if (actionId === 'vin_replaced') {
      subject = `⚠️ [THAY ĐỔI VIN] Đơn hàng ${record.so_don_hang} đã được thay VIN`;
      const details: Record<string, string> = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Tên khách hàng": record.ten_khach_hang || "N/A",
        "Dòng xe": record.dong_xe || "N/A",
        "Phiên bản": record.phien_ban || "N/A",
        "Ngoại thất": record.ngoai_that || "N/A",
        "Nội thất": record.noi_that || "N/A",
        "VIN cũ": `<span style="color:#dc2626; text-decoration: line-through; font-weight:700;">${record.old_vin || "N/A"}</span>`,
        "VIN mới": `<span style="color:#16a34a; font-weight:700;">${record.new_vin || "N/A"}</span>`,
      };
      htmlBody = buildHtml("Thông báo thay đổi số VIN trên đơn hàng:", tenTVBH, details, "Số VIN trên đơn hàng của Anh/Chị đã được Admin cập nhật. Vui lòng kiểm tra lại thông tin trên hệ thống. Trân trọng.", "#d97706");
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
