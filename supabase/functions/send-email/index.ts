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

function normalizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

async function getEmailForAdvisor(supabase: ReturnType<typeof createClient>, advisorName: string): Promise<string | null> {
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

function buildHtml(title: string, user: string, details: Record<string, string>, note: string, color: string = "#1e3a8a") {
  let rows = "";
  for (const [key, val] of Object.entries(details)) {
    rows += `
      <tr>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 40%; font-weight: 500; font-size: 13px;">${key}:</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-weight: 600; font-size: 14px;">${val}</td>
      </tr>
    `;
  }
  return `
    <div style="font-family: 'Roboto', Arial, sans-serif; background-color: #f3f4f6; padding: 40px 0;">
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
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
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
    const record = payload.record;

    if (!actionId || (actionId !== 'raw' && !record)) {
      return new Response(JSON.stringify({ error: "No record or actionId found in payload" }), { status: 400, headers: corsHeaders });
    }

    let tenTVBH = "TVBH";
    let recipientEmail: string | null = null;
    let subject = "";
    let htmlBody = "";
    const attachments: any[] = [];

    if (actionId === 'raw') {
      subject = payload.subject;
      htmlBody = payload.html;
      if (payload.recipient_email) {
        recipientEmail = Array.isArray(payload.recipient_email) ? payload.recipient_email.join(',') : payload.recipient_email;
      }
    } else {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      tenTVBH = record.ten_tu_van_ban_hang || record.tvbh || record.ten_ban_hang || "TVBH";
      recipientEmail = await getEmailForAdvisor(supabase, tenTVBH);

      if (!recipientEmail) {
        console.warn(`Không tìm thấy email cho TVBH '${tenTVBH}'`);
        return new Response(JSON.stringify({ error: `Không tìm thấy email cho TVBH: ${tenTVBH}` }), { status: 400, headers: corsHeaders });
      }
    }

    // Xử lý các loại email khác nhau
    if (actionId === 'invoice_issued') {
      subject = `✅ [Hóa Đơn] ${record.ten_khach_hang || "KH"} (${record.so_don_hang})`;
      const details = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Tên khách hàng": `<b>${record.ten_khach_hang || "N/A"}</b>`,
        "VIN": `<b>${record.vin || "N/A"}</b>`,
        "Dòng xe": `${record.dong_xe || ""} - ${record.phien_ban || ""}`,
        "Ngoại thất / Nội thất": `${record.ngoai_that || ""} / ${record.noi_that || ""}`
      };
      htmlBody = buildHtml(`🎉 Đơn hàng đã được xuất hóa đơn thành công!`, tenTVBH, details, "Đơn hàng đã được cập nhật trạng thái đã xuất hóa đơn. Vui lòng liên hệ bộ phận Kế toán để nhận tài liệu. Trân trọng!", "#1e3a8a");
    } 
    else if (actionId === 'invoice_supplement_requested') {
      subject = `[YÊU CẦU BỔ SUNG] ĐH ${record.so_don_hang} cần nộp thêm hồ sơ`;
      const details = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Lý do yêu cầu": `<b style="color:#d97706;">${record.ghi_chu_admin || "Bổ sung hồ sơ"}</b>`
      };
      htmlBody = buildHtml(`⚠️ Yêu Cầu Bổ Sung Hồ Sơ`, tenTVBH, details, "Hồ sơ của bạn hiện đang thiếu một số chứng từ. Vui lòng vào hệ thống để tải lên bổ sung sớm nhất có thể.", "#d97706");
    }
    else if (actionId === 'invoice_supplement_submitted') {
      subject = `[BIÊN NHẬN] Xác nhận nộp bổ sung hồ sơ ĐH ${record.so_don_hang}`;
      const details = {
        "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
        "Tên khách hàng": `<b>${record.ten_khach_hang || "N/A"}</b>`,
        "Chứng từ đã nộp": `<b style="color: #2e7d32;">${record.filesInfo || 'Các tệp bổ sung'}</b>`
      };
      htmlBody = buildHtml(`Nộp Bổ Sung Hồ Sơ Thành Công!`, tenTVBH, details, "Hệ thống đã ghi nhận các chứng từ cập nhật của bạn an toàn trên nền tảng Cloud.", "#2e7d32");

      // Tải và đính kèm file siêu tốc qua Promise.all phân giải đồng thời
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
      } catch(e) {
        console.error("Lỗi đính kèm file:", e);
      }
    }
    else if (actionId === 'raw') {
      subject = payload.subject;
      htmlBody = payload.html;
      if (payload.recipient_email) {
        // Ghi đè người nhận nếu action raw truyền sang (vi GAS đã tính sẵn email)
        const toEmails = Array.isArray(payload.recipient_email) ? payload.recipient_email.join(',') : payload.recipient_email;
        if (toEmails) {
             const mailOptions: any = {
                from: `"Hệ thống Quản lý VinFast Thuận An" <${SMTP_EMAIL}>`,
                to: toEmails,
                subject: subject,
                html: htmlBody,
              };
              if (payload.attachments && Array.isArray(payload.attachments)) {
                mailOptions.attachments = payload.attachments.map((a: any) => ({
                    filename: a.name || 'attachment.pdf',
                    content: a.content,
                    encoding: 'base64'
                }));
              }
              const info = await transporter.sendMail(mailOptions);
              console.log(`Đã gửi email RAW tới ${toEmails}`);
              return new Response(JSON.stringify({ status: "SUCCESS" }), { status: 200, headers: corsHeaders });
        }
      }
    }
    else {
      return new Response(JSON.stringify({ message: "Unknown actionId" }), { status: 400, headers: corsHeaders });
    }

    const mailOptions: any = {
      from: `"Hệ thống Quản lý VinFast Thuận An" <${SMTP_EMAIL}>`,
      to: recipientEmail,
      subject: subject,
      html: htmlBody,
    };

    if (attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`Đã gửi email SMTP thành công tới ${recipientEmail} (ID: ${info.messageId})`);

    return new Response(JSON.stringify({ status: "SUCCESS", message: "Email sent" }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("SMTP Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
