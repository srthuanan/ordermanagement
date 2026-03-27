import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const TELEGRAM_BOT_TOKEN = "8444242103:AAGupLJ1RJS3b3LD5LMEYIWMfwCFW3mzhB4"
const SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
async function sendTelegramMessage(chatId: string, text: string, reply_markup?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  try {
    const body: any = { chat_id: chatId, text: text, parse_mode: 'HTML' }
    if (reply_markup) body.reply_markup = reply_markup
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (err) {
    console.error('Fetch error sending telegram message:', err)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return new Response('🟢 Telegram Webhook status: ALIVE!', { status: 200 })
  }
  let currentChatId = "Unknown"
  try {
    const update = await req.json()
    console.log("Received Update:", JSON.stringify(update))
    
    const message = update.message
    if (!message) return new Response('OK', { status: 200 })

    currentChatId = String(message.chat.id)
    let text = message.text || message.caption || "";

    // Intercept ForceReply
    if (message.reply_to_message?.from?.is_bot) {
      const botMsgText = message.reply_to_message.text || "";
      if (botMsgText.includes("Bạn muốn tìm xe gì")) {
        text = `/kho ${text}`;
      } else if (botMsgText.includes("nhập nội dung thông báo")) {
        text = `/all ${text}`;
      } else if (botMsgText.includes("gửi tài liệu mẫu nào")) {
        text = `/doc ${text}`;
      } else if (botMsgText.includes("số VIN của xe")) {
        text = `/addxe ${text}`;
      }
    }

    // --- CHỨC NĂNG MỚI: BROADCAST FILE/HÌNH ẢNH ---
    if (message.document || message.photo) {
      try {
        const doc = message.document;
        const photo = message.photo?.[message.photo.length - 1]; // Lấy bản phân giải cao nhất
        const fileId = doc ? doc.file_id : photo.file_id;
        let fileName = doc ? doc.file_name : `photo_${Date.now()}.jpg`;
        
        // --- SANITIZE FILENAME (Remove Vietnamese & Special chars) ---
        fileName = fileName.normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Xóa dấu tiếng Việt
          .replace(/[đĐ]/g, 'd')
          .replace(/[^a-zA-Z0-9._-]/g, '_'); // Thay các ký tự khác bằng dấu gạch dưới

        const caption = message.caption || (doc ? "Tài liệu mới từ Admin" : "Hình ảnh từ Admin");

        // 1. Lấy thông tin file từ Telegram
        const fileInfoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
        const fileInfo = await fileInfoRes.json();

        if (fileInfo.ok) {
          const filePath = fileInfo.result.file_path;
          const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

          // 2. Tải file về
          const fileRes = await fetch(downloadUrl);
          const fileBlob = await fileRes.blob();

          // 3. Upload lên Supabase Storage (bucket yeucauxhd-files)
          const storagePath = `broadcasts/${Date.now()}_${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from('yeucauxhd-files')
            .upload(storagePath, fileBlob, { contentType: fileBlob.type, upsert: true });

          if (uploadError) throw uploadError;

          // 4. Lấy Public URL
          const { data: { publicUrl } } = supabase.storage.from('yeucauxhd-files').getPublicUrl(storagePath);

          // 5. Tạo nội dung Broadcast (HTML) - Native & Clean (V3)
          let broadcastMsg = "";
          if (message.photo) {
            broadcastMsg = `
              <div class="mt-1">
                <span class="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">${caption}</span>
                <div class="rounded-xl overflow-hidden border border-slate-200 shadow-sm transition-transform active:scale-[0.98]">
                  <img src="${publicUrl}" class="w-full h-auto max-h-48 object-cover" />
                </div>
              </div>`;
          } else {
            const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
            const fileIcon = isExcel ? 'fa-file-excel text-emerald-600' : 'fa-file-pdf text-red-500';
            
            broadcastMsg = `
              <div class="mt-1">
                <span class="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">${caption}</span>
                <div class="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm group">
                  <div class="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                    <i class="fas ${fileIcon} text-lg"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-slate-800 break-words line-clamp-2 leading-tight mb-0.5" title="${fileName}">${fileName}</p>
                    <a href="${publicUrl}" download target="_blank" class="text-[10px] font-black text-blue-600 uppercase tracking-tighter hover:text-blue-700 flex items-center gap-1">
                      <i class="fas fa-download"></i> Tải về ngay
                    </a>
                  </div>
                </div>
              </div>`;
          }

          // 6. Chèn vào bảng tương tác
          await supabase.from('interactions').insert({
            recipient: 'ALL',
            type: 'broadcast',
            category: 'NOTIFICATION',
            message: broadcastMsg,
            actor_id: 'Admin',
            actor_name: 'Admin',
            is_read: false
          });

          await sendTelegramMessage(currentChatId, `✅ <b>Broadcast thành công!</b>\n📄 Link: <a href="${publicUrl}">${fileName}</a>`);
          return new Response('OK', { status: 200 });
        }
      } catch (err: any) {
        console.error("File broadcast error:", err);
        await sendTelegramMessage(currentChatId, `❌ <b>Lỗi upload file:</b> ${err.message}`);
        return new Response('OK', { status: 200 }); // Return 200 to stop Telegram retries
      }
    }

    // --- CHỨC NĂNG 1: KIỂM TRA KHO NHANH (/kho [từ khóa]) ---
    if (text.startsWith('/kho')) {
      const keyword = text.replace('/kho', '').trim()
      if (!keyword) {
        await sendTelegramMessage(currentChatId, "🔍 <b>Bạn muốn tìm xe gì?</b>\n<i>(Gõ từ khóa bảo gồm Tên xe, Màu sắc hoặc VIN)</i>", { force_reply: true, input_field_placeholder: "Vios Trắng..." })
        return new Response('OK', { status: 200 })
      }

      const { data: cars, error: stockError } = await supabase
        .from('khoxe')
        .select('vin, dong_xe, phien_ban, ngoai_that, trang_thai, ma_dms')
        .or(`dong_xe.ilike.%${keyword}%,phien_ban.ilike.%${keyword}%,ngoai_that.ilike.%${keyword}%,vin.ilike.%${keyword}%`)
        .eq('trang_thai', 'Chưa ghép')
        .limit(10)

      if (stockError) throw new Error(`Lỗi kho: ${stockError.message}`)

      if (!cars || cars.length === 0) {
        await sendTelegramMessage(currentChatId, `❌ Không tìm thấy xe nào trống khớp với từ khóa: <b>${keyword}</b>`)
      } else {
        let responseText = `<b>🔍 KẾT QUẢ TÌM KHO (${cars.length} xe trống):</b>\n\n`
        cars.forEach((car, index) => {
          responseText += `${index + 1}. 🚘 <b>${car.dong_xe} ${car.phien_ban}</b>\n`
          responseText += `   🎨 Màu: ${car.ngoai_that} | 📍 Khu vực: ${car.ma_dms || 'N/A'}\n`
          responseText += `   🆔 VIN: <code>${car.vin}</code>\n\n`
        })
        await sendTelegramMessage(currentChatId, responseText)
      }
      return new Response('OK', { status: 200 })
    }

    // --- CHỨC NĂNG 2: THÔNG BÁO KHẨN (Broadcast /all [nội dung]) ---
    if (text.startsWith('/all')) {
      const broadcastMsg = text.replace('/all', '').trim()
      if (!broadcastMsg) {
        await sendTelegramMessage(currentChatId, "📢 <b>Vui lòng nhập nội dung thông báo khẩn:</b>\n<i>(Tin nhắn sẽ được gửi lên màn hình toàn bộ Sale)</i>", { force_reply: true, input_field_placeholder: "Bắt đầu nhập thông báo..." })
        return new Response('OK', { status: 200 })
      }

      // Ở đây tôi sẽ gửi cho "ALL" (đã được frontend hỗ trợ sẵn)
      const { error: broadcastError } = await supabase.from('interactions').insert({
        recipient: 'ALL', 
        type: 'broadcast',
        category: 'NOTIFICATION',
        message: `📢 THÔNG BÁO KHẨN: ${broadcastMsg}`,
        actor_id: 'Admin',
        actor_name: 'Admin',
        is_read: false,
        created_at: new Date().toISOString()
      })

      if (broadcastError) throw new Error(`Lỗi broadcast: ${broadcastError.message}`)
      
      await sendTelegramMessage(currentChatId, `✅ <b>Đã phát thông báo khẩn tới toàn bộ Sale:</b>\n\n"${broadcastMsg}"`)
      return new Response('OK', { status: 200 })
    }

    // --- CHỨC NĂNG 3: GỬI TÀI LIỆU BIỂU MẪU (/doc [từ khóa]) ---
    if (text.startsWith('/doc')) {
      const docName = text.replace('/doc', '').trim().toLowerCase()
      const docs: Record<string, { label: string, url: string }> = {
        'hop_dong': { label: 'Mẫu hợp đồng mua bán 2026', url: 'https://example.com/hop-dong.pdf' },
        'bang_gia': { label: 'Bảng giá xe tháng 03/2026', url: 'https://example.com/bang-gia.pdf' },
        'chinh_sach': { label: 'Chính sách ưu đãi quý 1', url: 'https://example.com/chinh-sach.pdf' }
      }

      if (!docName || !docs[docName]) {
        let helpText = "📑 <b>Bạn muốn gửi tài liệu mẫu nào?</b>\n<i>Nhập một trong các mã sau:</i>\n"
        Object.keys(docs).forEach(k => helpText += `- <code>${k}</code>: ${docs[k].label}\n`)
        await sendTelegramMessage(currentChatId, helpText, { force_reply: true, input_field_placeholder: "Ví dụ: bang_gia" })
        return new Response('OK', { status: 200 })
      }

      const targetDoc = docs[docName]
      await supabase.from('interactions').insert({
        recipient: 'ALL',
        type: 'info',
        category: 'NOTIFICATION',
        message: `📑 FILE QUAN TRỌNG: Admin vừa gửi <b>${targetDoc.label}</b>. <a href="${targetDoc.url}">Nhấn vào đây để tải về</a>`,
        actor_id: 'Admin',
        actor_name: 'Admin',
        is_read: false
      })

      await sendTelegramMessage(currentChatId, `✅ Đã gửi tài liệu <b>${targetDoc.label}</b> đến toàn bộ hệ thống Web.`)
      return new Response('OK', { status: 200 })
    }

    // --- CHỨC NĂNG MỚI: THÊM XE VÀO KHO (/addxe) ---
    if (text.startsWith('/addxe')) {
      const carInfo = text.replace('/addxe', '').trim();
      
      if (!carInfo) {
        let helpText = "➕ <b>Vui lòng nhập số VIN của xe cần thêm:</b>\n\n";
        helpText += "<code>[Số VIN]</code> (Hệ thống tự động tra cứu)\n";
        helpText += "Hoặc: <code>[Số VIN], [Phiên bản]</code> (Nhập thủ công nếu xe mới)\n\n";
        helpText += "<i>Hệ thống sẽ tra cứu Dòng xe, Màu sắc, Số máy... từ CSDL chuẩn.</i>";
        await sendTelegramMessage(currentChatId, helpText, { force_reply: true, input_field_placeholder: "Nhập số VIN..." });
        return new Response('OK', { status: 200 });
      }

      try {
        const parts = carInfo.split(',').map(p => p.trim());
        const vin = parts[0].toUpperCase();
        const customVersion = parts.length > 1 ? parts.slice(1).join(', ').trim() : '';
        
        if (vin.length !== 17) {
           throw new Error("Số VIN không hợp lệ (Phải đủ 17 ký tự).");
        }

        // 1. Tra cứu thông tin gốc từ bảng thongtinxe
        const { data: master, error: dbError } = await supabase
            .from('thongtinxe')
            .select('*')
            .ilike('vin', vin)
            .maybeSingle();

        if (dbError) throw dbError;

        let finalModel = '';
        if (master && master.mo_ta) {
            finalModel = master.mo_ta.toLowerCase().includes('limo green') ? 'LIMO' : master.mo_ta;
        }

        // Helpers lấy màu sắc
        const defaultExteriors = [
            "Brahminy White (CE18)", "Yellow (CE1U)", "Sunset ORB (CE1A)", "Crimson Red (CE1M)",
            "Vinfast Blue (CE1N)", "Neptune Grey (CE14)", "Jet Black (CE11)", "Electric Blue (CE1J)",
            "Zenith Grey (CE1V)", "Urbant Mint (CE1W)", "Vinbus Green (CE2B)", "Deep Ocean (CE1H)", 
            "Iris Berry (CE1X)", "Silver (CE17)", "Pink Gold (CE2K)", "Solar Ruby (CE2Q)"
        ];
        
        const getExterior = (code: string) => {
            if (!code) return '';
            const match = defaultExteriors.find(name => name.toUpperCase().includes(`(${code.toUpperCase().trim()})`));
            return match || code;
        };

        const getInterior = (code: string) => {
            if (!code) return '';
            const mapping: Record<string, string> = { 'CI11': 'Black', 'CI1H': 'Black', 'CI12': 'Brown', 'CI18': 'Brown', 'CI13': 'Beige', 'CI1M': 'Grey' };
            return mapping[code.toUpperCase().trim()] || code;
        };

        const payload = {
          vin,
          dong_xe: finalModel,
          phien_ban: customVersion || master?.phien_ban || '',
          ngoai_that: getExterior(master?.ngoai_that || ''),
          noi_that: getInterior(master?.noi_that || ''),
          so_may: master?.so_may || '',
          ma_dms: master?.khu_vuc || '',
          trang_thai: 'Chưa ghép',
          ngay_nhap: new Date().toISOString()
        };

        const { error: insertError } = await supabase.from('khoxe').insert([payload]);

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error(`Xe có số VIN ${vin} đã tồn tại trong kho!`);
          }
          throw insertError;
        }
        
        let successMsg = `✅ <b>Thêm xe thành công vào hệ thống!</b>\n\n`;
        if (master) {
            successMsg += `🚘 <b>Dòng xe:</b> ${payload.dong_xe} ${payload.phien_ban}\n🎨 <b>Ngoại thất:</b> ${payload.ngoai_that || 'N/A'}\n🆔 <b>VIN:</b> <code>${vin}</code>`;
        } else {
            successMsg += `⚠️ <b>VIN:</b> <code>${vin}</code>\n🚘 <b>Phiên bản:</b> ${payload.phien_ban || 'Chưa rõ'}\n*(Dòng xe và màu chưa có dữ liệu nhà máy, chỉ lưu tạo chỗ)*`;
        }

        // Log action (tương tự như Admin UI logic)
        await supabase.from('audit_logs').insert({ action: 'ADD_CAR', details: { vin, version: payload.phien_ban }, target_id: vin, target_type: 'stock', user_email: 'admin@system.com', user_full_name: 'Admin', timestamp: new Date().toISOString() });
        await supabase.from('interactions').insert({ recipient: 'ALL', type: 'stock_hero', category: 'NOTIFICATION', message: `<b>${finalModel || 'Xe mới'}</b> ${payload.phien_ban} (${vin}) đã nhập kho.`, target_view: 'stock', target_id: vin, actor_id: 'Admin', actor_name: 'Admin', is_read: false });

        await sendTelegramMessage(currentChatId, successMsg);
        return new Response('OK', { status: 200 });

      } catch (e: any) {
        await sendTelegramMessage(currentChatId, `❌ <b>Lỗi thêm xe:</b> ${e.message}`);
        return new Response('OK', { status: 200 });
      }
    }

    let inquiryId: string | null = null;

    // 1. Phân tích Inquiry ID từ Topic Thread ID (NẾU Admin chat thẳng trong phòng)
    const threadId = message.message_thread_id;
    if (threadId && currentChatId === "-1003202763251") {
      const { data: threadInquiries, error: threadErr } = await supabase
          .from('car_inquiries')
          .select('id')
          .contains('chat_history', `[{"telegram_thread_id": ${threadId}}]`)
          .limit(1);
          
      if (threadInquiries && threadInquiries.length > 0) {
        inquiryId = threadInquiries[0].id;
      }
    }

    // 2. Chế độ Reply Fallback (NẾU Admin reply tin nhắn chứa MÃ)
    const replyTo = message.reply_to_message
    const repliedText = replyTo ? (replyTo.text || "") : ""

    if (!inquiryId && repliedText) {
      // --- CHỨC NĂNG 4: DUYỆT GIA HẠN GIỮ XE QUA TELEGRAM ---
      if (repliedText.includes('EXT-')) {
        const vinMatch = repliedText.match(/EXT-([A-Z0-9]{17})/)
        if (!vinMatch) return new Response('No VIN match', { status: 200 })
        const vin = vinMatch[1]
        const action = text.toLowerCase()

        if (action.includes('duyệt')) {
          // 1. Lấy dữ liệu xe
          const { data: car } = await supabase.from('khoxe').select('thoi_gian_het_han_giu, extension_count, nguoi_giu_xe').eq('vin', vin).single()
          if (!car) throw new Error("Xe không tồn tại trong kho")

          // 2. Tính toán thời gian mới (+12 tiếng)
          const parts = car.thoi_gian_het_han_giu.split(' ')
          const d = parts[0].split('/'); const t = parts[1].split(':')
          const exp = new Date(parseInt(d[2]), parseInt(d[1]) - 1, parseInt(d[0]), parseInt(t[0]), parseInt(t[1]), parseInt(t[2]))
          exp.setHours(exp.getHours() + 12)
          
          const pad = (n: number) => n < 10 ? '0' + n : n
          const newExpStr = `${pad(exp.getDate())}/${pad(exp.getMonth() + 1)}/${exp.getFullYear()} ${pad(exp.getHours())}:${pad(exp.getMinutes())}:${pad(exp.getSeconds())}`

          // 3. Cập nhật database
          await supabase.from('khoxe').update({
            thoi_gian_het_han_giu: newExpStr,
            is_extension_requested: false,
            extension_count: (car.extension_count || 0) + 1
          }).eq('vin', vin)

          // 4. Thông báo cho Sale
          if (car.nguoi_giu_xe) {
            await supabase.from('interactions').insert({
              recipient: car.nguoi_giu_xe,
              type: 'success',
              category: 'NOTIFICATION',
              message: `✅ Admin đã DUYỆT gia hạn giữ xe ${vin} đến ${newExpStr}.`,
              target_view: 'stock',
              target_id: vin,
              is_read: false,
              actor_name: 'Admin'
            })
          }

          await sendTelegramMessage(currentChatId, `✅ <b>Đã Duyệt!</b>\n🚘 Xe: <code>${vin}</code>\n⏰ Hạn mới: <b>${newExpStr}</b>`)
          return new Response('OK', { status: 200 })

        } else if (action.includes('từ chối')) {
          await supabase.from('khoxe').update({ is_extension_requested: false }).eq('vin', vin)
          const { data: car } = await supabase.from('khoxe').select('nguoi_giu_xe').eq('vin', vin).single()
          
          if (car?.nguoi_giu_xe) {
            await supabase.from('interactions').insert({
              recipient: car.nguoi_giu_xe,
              type: 'danger',
              category: 'NOTIFICATION',
              message: `❌ Admin đã TỪ CHỐI yêu cầu gia hạn giữ xe ${vin}.`,
              target_view: 'stock',
              target_id: vin,
              is_read: false,
              actor_name: 'Admin'
            })
          }
          await sendTelegramMessage(currentChatId, `❌ <b>Đã Từ Chối!</b>\n🚘 Xe: <code>${vin}</code> đã được phản hồi cho Sale.`)
          return new Response('OK', { status: 200 })
        }
      }

      // Trích xuất Inquiry ID (Chỉ lấy UUID chính xác để tránh nhầm lẫn với các mã khác)
      const memMatch = repliedText.match(/([a-fA-F\d]{8}-[a-fA-F\d]{4}-[a-fA-F\d]{4}-[a-fA-F\d]{4}-[a-fA-F\d]{12})/);
      if (memMatch) inquiryId = memMatch[1].trim()
    }
    
    if (!inquiryId) {
      // Nếu không phải trong Topic và không có Reply chứa mã thì không làm gì
      return new Response('Not an inquiry message', { status: 200 })
    }

    console.log(`Processing Inquiry ID: ${inquiryId}`)

    // 4. Lấy dữ liệu Inquiry
    const { data: inquiryData, error: fetchError } = await supabase
      .from('car_inquiries')
      .select('chat_history, tvbh_email, status, model, version')
      .eq('id', inquiryId)
      .maybeSingle()

    if (fetchError) throw new Error(`Lỗi Database: ${fetchError.message}`)
    if (!inquiryData) {
      await sendTelegramMessage(currentChatId, `❌ Không tìm thấy yêu cầu ID <code>${inquiryId}</code> trên hệ thống web.`)
      return new Response('Not found', { status: 200 })
    }

    // 5. Cập nhật lịch sử Chat
    const history = inquiryData.chat_history || []
    const newComment = {
      id: crypto.randomUUID(),
      inquiry_id: inquiryId,
      sender_name: "Admin",
      sender_email: "admin@system.com",
      content: text,
      is_admin_comment: true,
      created_at: new Date().toISOString()
    }
    history.push(newComment)

    const lowerText = text.toLowerCase()
    const updateData: any = {
      chat_history: history,
      is_read_by_tvbh: false,
      is_read_by_admin: true
    }

    // Xử lý logic trạng thái
    let statusUpdated = false
    if (lowerText.includes("giữ xe") || lowerText.includes("đã giữ")) {
      updateData.status = "held"
      updateData.admin_response = `Admin đã giữ xe: ${text}`
      statusUpdated = true
    } else if (lowerText.includes("không có") || lowerText.includes("hết xe")) {
      updateData.status = "not_found"
      updateData.admin_response = text
      statusUpdated = true
    } else {
      updateData.status = "manual_responded"
      updateData.admin_response = text
    }

    const { error: updateError } = await supabase
      .from('car_inquiries')
      .update(updateData)
      .eq('id', inquiryId)

    if (updateError) throw new Error(`Lỗi cập nhật đơn hàng: ${updateError.message}`)

    // 6. Gửi thông báo cho Sale (Interaction)
    if (inquiryData.tvbh_email) {
      await supabase.from('interactions').insert({
        recipient: inquiryData.tvbh_email,
        type: statusUpdated && lowerText.includes("giữ") ? 'success' : 'info',
        category: "NOTIFICATION",
        message: `[Tra cứu kho] Admin phản hồi: ${text.substring(0, 60)}...`,
        target_view: "inquiry",
        target_id: inquiryId,
        is_read: false,
        actor_id: "System",
        actor_name: "Admin"
      })
    }

    // 7. Xác nhận lại với Admin trên Telegram
    if (!threadId || currentChatId !== "-1003202763251") {
       await sendTelegramMessage(currentChatId, `✅ <b>Đã phản hồi Sale!</b>\n📧 <b>Người nhận:</b> ${inquiryData.tvbh_email}\n🚘 <b>Xe:</b> ${inquiryData.model} ${inquiryData.version}\n\n💬 <i>Nội dung: ${text}</i>`)
    }

    return new Response('OK', { status: 200 })

  } catch (err: any) {
    console.error('Error:', err.message)
    await sendTelegramMessage(currentChatId, `❌ <b>Lỗi xử lý:</b> ${err.message}`)
    return new Response(err.message, { status: 200 }) // Trả về 200 để Telegram không retry liên tục
  }
})
