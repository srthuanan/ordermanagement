import { supabase } from './supabase';
import { StockVehicle } from '../types';

export const fetchStockVehicles = async (): Promise<{ success: boolean; data: StockVehicle[]; error?: string }> => {
  try {
    const [{ data, error }, { data: telemetryData }] = await Promise.all([
      supabase.from('khoxe').select('*').order('dong_xe', { ascending: true }),
      supabase.from('car_telemetry').select('vin, lat, lng, speed, heading, captured_at')
    ]);

    if (error) throw error;

    const telemetryMap = new Map<string, any>();
    if (telemetryData && Array.isArray(telemetryData)) {
      telemetryData.forEach((t: any) => {
        if (t.vin) telemetryMap.set(t.vin.trim().toUpperCase(), t);
      });
    }

    const list: StockVehicle[] = (data || []).map((row: any) => {
      const cleanVin = (row.vin || '').trim().toUpperCase();
      const tel = telemetryMap.get(cleanVin);

      return {
        VIN: cleanVin,
        vin: cleanVin,
        "Dòng xe": row.dong_xe || 'Chưa rõ',
        dong_xe: row.dong_xe || 'Chưa rõ',
        "Phiên bản": row.phien_ban || '',
        phien_ban: row.phien_ban || '',
        "Ngoại thất": row.ngoai_that || '',
        ngoai_that: row.ngoai_that || '',
        "Nội thất": row.noi_that || '',
        noi_that: row.noi_that || '',
        "Trạng thái": row.trang_thai || 'Chưa ghép',
        trang_thai: row.trang_thai || 'Chưa ghép',
        "Người Giữ Xe": row.nguoi_giu_xe || null,
        nguoi_giu_xe: row.nguoi_giu_xe || null,
        "Thời Gian Hết Hạn Giữ": row.thoi_gian_het_han_giu || row.thoi_gian_giu || null,
        thoi_gian_het_han_giu: row.thoi_gian_het_han_giu || row.thoi_gian_giu || null,
        thoi_gian_giu: row.thoi_gian_giu || row.thoi_gian_het_han_giu || null,
        "Vị trí": row.vi_tri || row.vi_tri_kho || row.kho_hien_tai || 'Thuận An',
        vi_tri: row.vi_tri || row.vi_tri_kho || row.kho_hien_tai || 'Thuận An',
        vi_tri_kho: row.vi_tri_kho || row.vi_tri || row.kho_hien_tai || 'Thuận An',
        so_ngay_ton: row.so_ngay_ton ? Number(row.so_ngay_ton) : 0,
        gia_niem_yet: row.gia_niem_yet ? Number(row.gia_niem_yet) : 0,
        pin_kem_theo: row.pin_kem_theo || '',
        "Thời gian nhập": row.ngay_nhap || null,
        ngay_nhap: row.ngay_nhap || null,
        "Số máy": row.so_may || null,
        so_may: row.so_may || null,
        "Số COC": row.so_coc || null,
        so_coc: row.so_coc || null,
        "Ngày COC về": row.ngay_coc_ve || null,
        ngay_coc_ve: row.ngay_coc_ve || null,
        queue: Array.isArray(row.queue) ? row.queue : [],
        telemetry: tel ? {
          lat: Number(tel.lat),
          lng: Number(tel.lng),
          speed: Number(tel.speed || 0),
          heading: Number(tel.heading || 0),
          captured_at: tel.captured_at
        } : null
      };
    });

    return { success: true, data: list };
  } catch (err: any) {
    return { success: false, data: [], error: err.message || 'Lỗi tải kho xe' };
  }
};

export const holdCar = async (
  vin: string,
  username: string,
  fullName: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. Ràng buộc FIFO chuẩn xác như web: So sánh theo cấu hình xe và ngày nhập
    if (username.toLowerCase() !== 'admin') {
      const { data: currentCar } = await supabase
        .from('khoxe')
        .select('dong_xe, phien_ban, ngoai_that, noi_that, ngay_nhap')
        .eq('vin', vin)
        .single();

      if (currentCar && currentCar.ngay_nhap) {
        const { data: olderCars } = await supabase
          .from('khoxe')
          .select('vin')
          .eq('trang_thai', 'Chưa ghép')
          .is('nguoi_giu_xe', null)
          .eq('dong_xe', currentCar.dong_xe)
          .eq('phien_ban', currentCar.phien_ban)
          .eq('ngoai_that', currentCar.ngoai_that)
          .eq('noi_that', currentCar.noi_that)
          .lt('ngay_nhap', currentCar.ngay_nhap)
          .order('ngay_nhap', { ascending: true })
          .limit(1);

        if (olderCars && olderCars.length > 0) {
          return {
            success: false,
            message: `Quy tắc FIFO: Xe này nhập sau.\nVui lòng ưu tiên giữ xe nhập kho trước (VIN: ${olderCars[0].vin})!`,
          };
        }
      }
    }

    // 2. Gọi Supabase RPC rpc_hold_car chuẩn xác
    const { data, error } = await supabase.rpc('rpc_hold_car', {
      p_vin: vin,
      p_username: username,
      p_full_name: fullName,
    });

    if (error) throw error;
    if (data?.status === 'SUCCESS') {
      return { success: true, message: data.message || 'Giữ xe thành công (thời hạn 2 giờ)!' };
    }
    return { success: false, message: data?.message || 'Không thể giữ xe này.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi kết nối khi giữ xe.' };
  }
};

export const releaseCar = async (
  vin: string,
  username: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Thử gọi RPC rpc_release_car nếu có
    const { data: rpcData, error: rpcErr } = await supabase.rpc('rpc_release_car', {
      p_vin: vin,
      p_outcome: 'released'
    });

    if (!rpcErr && rpcData?.status === 'SUCCESS') {
      return { success: true, message: 'Đã nhả xe thành công!' };
    }

    // Fallback: Cập nhật trực tiếp bảng khoxe
    const { error } = await supabase
      .from('khoxe')
      .update({
        nguoi_giu_xe: null,
        thoi_gian_giu: null,
        thoi_gian_het_han_giu: null,
      })
      .eq('vin', vin);

    if (error) throw error;
    return { success: true, message: 'Đã nhả xe thành công!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi khi nhả xe.' };
  }
};

export const joinQueue = async (
  vin: string,
  consultantName: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: car } = await supabase.from('khoxe').select('queue').eq('vin', vin).single();
    const currentQueue: string[] = Array.isArray(car?.queue) ? car.queue : [];
    if (currentQueue.includes(consultantName)) {
      return { success: false, message: 'Bạn đã ở trong hàng đợi xe này.' };
    }
    const newQueue = [...currentQueue, consultantName];
    const { error } = await supabase.from('khoxe').update({ queue: newQueue }).eq('vin', vin);
    if (error) throw error;
    return { success: true, message: 'Đã tham gia hàng đợi thành công! Khi xe nhả sẽ ưu tiên cho bạn.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi khi tham gia hàng đợi.' };
  }
};

export const leaveQueue = async (
  vin: string,
  consultantName: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: car } = await supabase.from('khoxe').select('queue').eq('vin', vin).single();
    const currentQueue: string[] = Array.isArray(car?.queue) ? car.queue : [];
    const newQueue = currentQueue.filter(name => name !== consultantName);
    const { error } = await supabase.from('khoxe').update({ queue: newQueue }).eq('vin', vin);
    if (error) throw error;
    return { success: true, message: 'Đã rời khỏi hàng đợi.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi khi rời hàng đợi.' };
  }
};
