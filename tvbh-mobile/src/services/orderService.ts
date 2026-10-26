import { supabase } from './supabase';
import { OrderItem, InvoiceRequestPayload } from '../types';
import * as FileSystem from 'expo-file-system';

export const fetchConsultantOrders = async (
  consultantName: string
): Promise<{ success: boolean; data: OrderItem[]; error?: string }> => {
  try {
    const cName = (consultantName || '').trim();

    // 1. Lấy đơn hàng đang hoạt động từ bảng donhang
    let query = supabase.from('donhang').select('*').not('ket_qua', 'ilike', 'Đã hủy%');
    if (cName.toLowerCase() !== 'admin') {
      query = query.ilike('ten_tu_van_ban_hang', `%${cName}%`);
    }

    const { data: activeOrders, error: activeErr } = await query.order('thoi_gian_nhap', { ascending: false });
    if (activeErr) throw activeErr;

    // 2. Lấy thông tin bổ trợ từ bảng yeucauxhd
    const activeOrderNumbers = (activeOrders || [])
      .map((o: any) => (o.so_don_hang || '').trim())
      .filter((s: string) => s.length > 0);

    let yeucauList: any[] = [];
    if (activeOrderNumbers.length > 0) {
      const { data: ycData } = await supabase
        .from('yeucauxhd')
        .select('so_don_hang, ghi_chu_admin, url_hop_dong, url_de_nghi_xhd, ngay_coc_ve, ma_hd_cyber')
        .in('so_don_hang', activeOrderNumbers);
      yeucauList = ycData || [];
    }
    const yeucauMap = new Map(yeucauList.map((y: any) => [y.so_don_hang?.trim(), y]));

    // 3. Map chuẩn 100% với hàm mapOrderDbToUi của bản web
    const formattedActive: OrderItem[] = (activeOrders || []).map((row: any) => {
      const yc = yeucauMap.get(row.so_don_hang?.trim());
      const cocDate = row.ngay_coc_ve || yc?.ngay_coc_ve || '';
      const invoiceUrl = row.link_hoa_don_da_xuat || row.url_hoa_don_da_xuat || row.LinkHoaDonDaXuat || '';
      const isActuallyInvoiced = !!(row.ngay_xuat_hoa_don || invoiceUrl);
      const finalResult = isActuallyInvoiced ? 'Đã xuất hóa đơn' : (row.ket_qua || 'Chờ phê duyệt');

      return {
        id: row.id,
        "Số đơn hàng": row.so_don_hang || '',
        so_don_hang: row.so_don_hang || '',
        "Tên khách hàng": row.ten_khach_hang || 'Chưa có tên',
        ten_khach_hang: row.ten_khach_hang || 'Chưa có tên',
        "Tên tư vấn bán hàng": row.ten_tu_van_ban_hang || '',
        ten_tu_van_ban_hang: row.ten_tu_van_ban_hang || '',
        "Dòng xe": row.dong_xe || '',
        dong_xe: row.dong_xe || '',
        "Phiên bản": row.phien_ban || '',
        phien_ban: row.phien_ban || '',
        "Ngoại thất": row.ngoai_that || '',
        ngoai_that: row.ngoai_that || '',
        "Nội thất": row.noi_that || '',
        noi_that: row.noi_that || '',
        VIN: row.vin || '',
        vin: row.vin || '',
        "Kết quả": finalResult,
        ket_qua: finalResult,
        "Ngày cọc": row.ngay_coc || '',
        ngay_coc: row.ngay_coc || '',
        "Thời gian nhập": row.thoi_gian_nhap || '',
        thoi_gian_nhap: row.thoi_gian_nhap || '',
        "Thời gian ghép": row.thoi_gian_ghep || '',
        thoi_gian_ghep: row.thoi_gian_ghep || '',
        "Số ngày ghép": row.so_ngay_ghep ? Number(row.so_ngay_ghep) : undefined,
        so_ngay_ghep: row.so_ngay_ghep ? Number(row.so_ngay_ghep) : undefined,
        "Ngày xuất hóa đơn": row.ngay_xuat_hoa_don || '',
        ngay_xuat_hoa_don: row.ngay_xuat_hoa_don || '',
        "CHÍNH SÁCH": row.chinh_sach || '',
        chinh_sach: row.chinh_sach || '',
        LinkHoaDonDaXuat: invoiceUrl,
        link_hoa_don_da_xuat: invoiceUrl,
        LinkHopDong: yc?.url_hop_dong || row.link_hop_dong || '',
        link_hop_dong: yc?.url_hop_dong || row.link_hop_dong || '',
        LinkDeNghiXHD: yc?.url_de_nghi_xhd || row.link_de_nghi_xhd || '',
        link_de_nghi_xhd: yc?.url_de_nghi_xhd || row.link_de_nghi_xhd || '',
        ghi_chu_admin: yc?.ghi_chu_admin || row.ghi_chu_admin || '',
        "Trạng thái VC": row.trang_thai_vc || '',
        trang_thai_vc: row.trang_thai_vc || '',
        "Mã HĐ Cyber": yc?.ma_hd_cyber || row.ma_hd_cyber || '',
        ma_hd_cyber: yc?.ma_hd_cyber || row.ma_hd_cyber || '',
        "Số CT DNX": row.so_ct_dnx || '',
        so_ct_dnx: row.so_ct_dnx || '',
        "Số CT TD4": row.so_ct_td4 || '',
        so_ct_td4: row.so_ct_td4 || '',
        ghi_chu_xuat_xe: row.ghi_chu_xuat_xe || '',
        "Ngày COC về": cocDate,
        ngay_coc_ve: cocDate,
        canh_bao_sai_dms: row.canh_bao_sai_dms || '',
        canh_bao_qua_han: row.canh_bao_qua_han || '',
      };
    });

    return { success: true, data: formattedActive };
  } catch (err: any) {
    return { success: false, data: [], error: err.message || 'Lỗi tải đơn hàng' };
  }
};

export const uploadImageToStorage = async (
  localUri: string,
  prefix: string = 'mobile_docs'
): Promise<string | null> => {
  try {
    if (!localUri) return null;
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    const { error } = await supabase.storage
      .from('documents')
      .upload(filename, byteArray, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.warn('Storage upload error:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filename);

    return publicUrlData.publicUrl || null;
  } catch (err) {
    console.warn('uploadImageToStorage exception:', err);
    return null;
  }
};

export const createInvoiceRequest = async (
  payload: InvoiceRequestPayload
): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. Upload tài liệu lên Supabase Storage bucket documents
    let urlHopDong = '';
    let urlDeNghi = '';
    let urlUnc = '';

    if (payload.file_hop_dong_uri) {
      urlHopDong = (await uploadImageToStorage(payload.file_hop_dong_uri, 'contract')) || '';
    }
    if (payload.file_de_nghi_uri) {
      urlDeNghi = (await uploadImageToStorage(payload.file_de_nghi_uri, 'denghi')) || '';
    }
    if (payload.file_unc_uri) {
      urlUnc = (await uploadImageToStorage(payload.file_unc_uri, 'unc')) || '';
    }

    // 2. Ghi bản ghi vào bảng yeucauxhd chuẩn xác
    const record = {
      so_don_hang: payload.so_don_hang || '',
      vin: payload.vin.trim().toUpperCase(),
      dong_xe: payload.dong_xe,
      phien_ban: payload.phien_ban,
      ngoai_that: payload.ngoai_that,
      noi_that: payload.noi_that,
      ten_khach_hang: payload.ten_khach_hang,
      so_dien_thoai: payload.so_dien_thoai,
      cmnd_cccd: payload.cmnd_cccd || '',
      dia_chi: payload.dia_chi || '',
      ten_tu_van_ban_hang: payload.ten_tu_van_ban_hang,
      chinh_sach: payload.chinh_sach.join(', '),
      hoa_hong: payload.hoa_hong || '',
      vpoint: payload.vpoint || '',
      ma_hd_cyber: payload.ma_hd_cyber || '',
      ghi_chu_tvbh: payload.ghi_chu || '',
      url_hop_dong: urlHopDong,
      url_de_nghi_xhd: urlDeNghi,
      url_uy_nhiem_chi: urlUnc,
      trang_thai: 'Chờ duyệt XHĐ',
      ngay_yeu_cau: new Date().toISOString(),
    };

    const { error: insertErr } = await supabase.from('yeucauxhd').insert(record);
    if (insertErr) throw insertErr;

    // 3. Cập nhật trạng thái xe trong khoxe sang Đã ghép
    await supabase
      .from('khoxe')
      .update({ trang_thai: 'Đã ghép' })
      .eq('vin', payload.vin.trim().toUpperCase());

    return {
      success: true,
      message: 'Gửi yêu cầu xuất hóa đơn thành công! Kế toán và Admin đã nhận thông báo.',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi khi gửi yêu cầu xuất hóa đơn.' };
  }
};
