import JSZip from 'jszip';
import { Order } from '../types';
import { supabase } from './supabaseClient';

const TEMPLATE_BASE64 = "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";

function escapeXml(str: string): string {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function normalizeFilename(str: string): string {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');
}

/**
 * Tạo và tải trực tiếp file Thông báo sẵn sàng giao xe (.docx) từ trình duyệt
 */
export async function downloadDeliveryNoticeDocx(order: Order) {
    try {
        // Nạp trực tiếp template từ base64 nhúng (không phụ thuộc URL/Domain)
        const zip = await JSZip.loadAsync(TEMPLATE_BASE64, { base64: true });
        const docFile = zip.file('word/document.xml');
        if (!docFile) {
            throw new Error('Không tìm thấy cấu trúc word/document.xml trong file mẫu.');
        }

        let xml = await docFile.async('text');

        const pairedDate = order['Thời gian ghép'] ? new Date(order['Thời gian ghép']) : new Date();
        const ngay = String(pairedDate.getDate()).padStart(2, '0');
        const thang = String(pairedDate.getMonth() + 1).padStart(2, '0');
        const nam = String(pairedDate.getFullYear());

        // Tính STT ghép xe trong tháng
        let sttNumber = 1;
        try {
            const startOfMonth = new Date(pairedDate.getFullYear(), pairedDate.getMonth(), 1).toISOString();
            const { count, error } = await supabase
                .from('donhang')
                .select('*', { count: 'exact', head: true })
                .not('vin', 'is', null)
                .gte('thoi_gian_ghep', startOfMonth)
                .lte('thoi_gian_ghep', pairedDate.toISOString());

            if (!error && count && count > 0) {
                sttNumber = count;
            }
        } catch (e) {
            console.warn('Lỗi tính STT thông báo giao xe:', e);
        }

        const stt = String(sttNumber).padStart(2, '0');
        const soThongBao = `Số : ${nam}/${thang}/${stt}`;

        const tenKhachHang = order['Tên khách hàng'] || 'Quý khách hàng';
        const soDonHang = order['Số đơn hàng'] || '';
        const dongXe = order['Dòng xe'] || '';
        const phienBan = order['Phiên bản'] || '';
        const carName = [dongXe, phienBan].filter(Boolean).join(' ') || 'VinFast';
        const carStr = `${carName}${order.VIN ? ` (Số VIN: ${order.VIN})` : ''}`;

        // 1. Tên khách hàng (thay thế CT PHÚ BÌNH)
        xml = xml.replace(
            '<w:t>Kính gửi : CT TNHH ĐẦU TƯ CÔNG NGHỆ CƠ KHÍ &amp; XD PHÚ BÌNH</w:t>',
            `<w:t>Kính gửi : ${escapeXml(tenKhachHang)}</w:t>`
        );

        // 2. Ngày tháng năm
        xml = xml.replace('<w:t>\u2026\u2026</w:t>', `<w:t> ${ngay} </w:t>`);
        xml = xml.replace('<w:t>\u2026.</w:t>', `<w:t> ${thang} </w:t>`);
        xml = xml.replace('<w:t>\u2026\u2026.</w:t>', `<w:t> ${nam}</w:t>`);

        // 3. Số đơn hàng DMS
        xml = xml.replace(
            '<w:t xml:space="preserve"> đơn hàng:………………………………</w:t>',
            `<w:t xml:space="preserve"> đơn hàng: ${escapeXml(soDonHang)}</w:t>`
        );

        // 4. Dòng xe và Số VIN
        xml = xml.replace(
            '<w:t>\u2026..</w:t>',
            `<w:t>${escapeXml(carStr)}</w:t>`
        );

        // 5. Số thông báo theo NĂM/THÁNG/STT (thay thế Số : 27-11)
        xml = xml.replace(
            /<w:t>Số\s*:\s*27-11<\/w:t>/,
            `<w:t>${soThongBao}</w:t>`
        );

        // 6. Tiêu đề: THÔNG BÁO SẴN SÀNG GIAO XE Ô TÔ VINFAST (thay thế THÔNG BÁO BÀN GIAO XE)
        xml = xml.replace(
            "THÔNG BÁO BÀN GIAO XE ",
            "THÔNG BÁO SẴN SÀNG GIAO XE "
        );
        xml = xml.replace(
            "V/v: Thông báo bàn giao xe ô tô VINFAST",
            "V/v: Thông báo sẵn sàng giao xe ô tô VINFAST"
        );

        // Cập nhật lại XML vào zip
        zip.file('word/document.xml', xml);

        // Xuất file blob để tải về
        const blob = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            compression: 'DEFLATE'
        });

        const safeCust = normalizeFilename(tenKhachHang);
        const fileName = `Thong_bao_san_sang_giao_xe_${soDonHang}_${safeCust}.docx`;

        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        return { success: true, fileName };
    } catch (error: any) {
        console.error('Lỗi tạo file Thông báo giao xe:', error);
        throw error;
    }
}
