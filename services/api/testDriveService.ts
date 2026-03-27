import { supabase } from '../supabaseClient';
import { ApiResult } from './baseService';

export const getTestDriveSchedule = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase.from('test_drive_schedule').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const schedule = data.map(item => ({
            soPhieu: item.so_phieu, ngayThuXe: item.ngay_thu_xe, loaiXe: item.loai_xe, thoiGianKhoiHanh: item.thoi_gian_khoi_hanh, thoiGianTroVe: item.thoi_gian_tro_ve, loTrinh: item.lo_trinh, tenKhachHang: item.ten_khach_hang, dienThoai: item.dien_thoai, email: item.email, diaChi: item.dia_chi, tuLai: String(item.tu_lai), dacDiem: item.dac_diem, gplxSo: item.gplx_so, hieuLucGPLX: item.hieu_luc_gplx, ngayCamKet: item.ngay_cam_ket, tenTuVan: item.ten_tu_van, odoBefore: item.odo_before, imagesBefore: item.images_before, odoAfter: item.odo_after, imagesAfter: item.images_after,
        }));
        return { status: 'SUCCESS', data: schedule, message: "Lấy lịch lái thử thành công." };
    } catch (err: any) { return { status: 'ERROR', message: "Lỗi tải lịch lái thử: " + err.message }; }
};

export const saveTestDriveBooking = async (bookingData: any): Promise<ApiResult> => {
    try {
        const mapped = { so_phieu: bookingData.soPhieu, ngay_thu_xe: bookingData.ngayThuXe, loai_xe: bookingData.loaiXe, thoi_gian_khoi_hanh: bookingData.thoiGianKhoiHanh, thoi_gian_tro_ve: bookingData.thoiGianTroVe, lo_trinh: bookingData.loTrinh, ten_khach_hang: bookingData.tenKhachHang, dien_thoai: bookingData.dienThoai, email: bookingData.email, dia_chi: bookingData.diaChi, tu_lai: String(bookingData.tuLai), dac_diem: bookingData.dacDiem, gplx_so: bookingData.gplxSo, hieu_luc_gplx: bookingData.hieuLucGPLX, ngay_cam_ket: bookingData.ngayCamKet, ten_tu_van: bookingData.tenTuVan, odo_before: bookingData.odoBefore, images_before: bookingData.imagesBefore, odo_after: bookingData.odoAfter, images_after: bookingData.imagesAfter };
        const { data, error } = await supabase.from('test_drive_schedule').upsert(mapped).select().single();
        if (error) throw error;
        const nr = { soPhieu: data.so_phieu, ngayThuXe: data.ngay_thu_xe, loaiXe: data.loai_xe, thoiGianKhoiHanh: data.thoi_gian_khoi_hanh, thoiGianTroVe: data.thoi_gian_tro_ve, loTrinh: data.lo_trinh, tenKhachHang: data.ten_khach_hang, dienThoai: data.dien_thoai, email: data.email, diaChi: data.dia_chi, tuLai: String(data.tu_lai), dacDiem: data.dac_diem, gplxSo: data.gplx_so, hieuLucGPLX: data.hieu_luc_gplx, ngayCamKet: data.ngay_cam_ket, tenTuVan: data.ten_tu_van, odoBefore: data.odo_before, imagesBefore: data.images_before, odoAfter: data.odo_after, imagesAfter: data.images_after };
        return { status: 'SUCCESS', message: 'Lưu lịch lái thử thành công.', newRecord: nr };
    } catch (err: any) { return { status: 'ERROR', message: "Lỗi lưu lịch lái thử: " + err.message }; }
};

export const updateTestDriveCheckin = async (payload: { soPhieu: string; odoBefore?: string; imagesBefore?: any[]; odoAfter?: string; imagesAfter?: any[]; }): Promise<ApiResult> => {
    try {
        const up: any = {};
        const upload = async (images: any[], prefix: string) => {
            return Promise.all(images.map(async (img) => {
                const bytes = atob(img.data); const arr = new Uint8Array(bytes.length);
                for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                const path = `test-drive/${payload.soPhieu}/${prefix}_${Date.now()}_${img.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                const { error } = await supabase.storage.from('yeucauxhd-files').upload(path, new Blob([arr], { type: img.type }), { upsert: true });
                if (error) throw error;
                return supabase.storage.from('yeucauxhd-files').getPublicUrl(path).data.publicUrl;
            }));
        };
        const { data: ex } = await supabase.from('test_drive_schedule').select('images_before, images_after').eq('so_phieu', payload.soPhieu).maybeSingle();
        if (payload.odoBefore) up.odo_before = payload.odoBefore;
        if (payload.imagesBefore?.length) up.images_before = [...(Array.isArray(ex?.images_before) ? ex.images_before : []), ...(await upload(payload.imagesBefore, 'before'))];
        if (payload.odoAfter) up.odo_after = payload.odoAfter;
        if (payload.imagesAfter?.length) up.images_after = [...(Array.isArray(ex?.images_after) ? ex.images_after : []), ...(await upload(payload.imagesAfter, 'after'))];
        const { data: ud, error } = await supabase.from('test_drive_schedule').update(up).eq('so_phieu', payload.soPhieu).select().single();
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Cập nhật thành công.', updatedRecord: { soPhieu: ud.so_phieu, ngayThuXe: ud.ngay_thu_xe, loaiXe: ud.loai_xe, thoiGianKhoiHanh: ud.thoi_gian_khoi_hanh, thoiGianTroVe: ud.thoi_gian_tro_ve, loTrinh: ud.lo_trinh, tenKhachHang: ud.ten_khach_hang, dienThoai: ud.dien_thoai, email: ud.email, diaChi: ud.dia_chi, tuLai: String(ud.tu_lai), dacDiem: ud.dac_diem, gplxSo: ud.gplx_so, hieuLucGPLX: ud.hieu_luc_gplx, ngayCamKet: ud.ngay_cam_ket, tenTuVan: ud.ten_tu_van, odoBefore: ud.odo_before, imagesBefore: ud.images_before, odoAfter: ud.odo_after, imagesAfter: ud.images_after } };
    } catch (err: any) { return { status: 'ERROR', message: "Lỗi cập nhật: " + err.message }; }
};

export const deleteTestDriveBooking = async (soPhieu: string): Promise<ApiResult> => {
    try {
        await supabase.from('test_drive_schedule').delete().eq('so_phieu', soPhieu);
        return { status: 'SUCCESS', message: 'Xóa lịch lái thử thành công.' };
    } catch (err: any) { return { status: 'ERROR', message: "Lỗi xóa lịch lái thử: " + err.message }; }
};
