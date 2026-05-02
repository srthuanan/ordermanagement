import React, { useState } from 'react';
import * as xlsx from 'xlsx';
import { supabaseAdmin } from '../../services/supabaseClient';
import { logAction, getExteriorColorName, getInteriorColorName } from '../../services/api/baseService';

interface ThongTinXeUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess?: () => void;
}

const ThongTinXeUploadModal: React.FC<ThongTinXeUploadModalProps> = ({ isOpen, onClose, showToast, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    if (!isOpen) return null;

    const handleDownloadTemplate = () => {
        const ws = xlsx.utils.json_to_sheet([{
            'Số VIN': '12345678901234567',
            'Số máy': 'JKA1234567',
            'Mô tả sản phẩm': 'VF 3',
            'Khu vực': 'DMS-HCM',
            'Phiên bản': 'Base',
            'Màu ngoại thất xe': 'Trắng',
            'Màu nội thất xe': 'Đen',
            'Năm sản xuất': 2024
        }]);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'ThongTinXe');
        xlsx.writeFile(wb, 'ThongTinXe_Template.xlsx');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            showToast('Lỗi', 'Vui lòng chọn file Excel', 'error');
            return;
        }

        setIsUploading(true);
//         showToast('Đang xử lý', 'Đang đọc dữ liệu từ file...', 'loading');

        try {
            const data = await file.arrayBuffer();
            const workbook = xlsx.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

            if (rows.length === 0) {
                throw new Error('File Excel không có dữ liệu');
            }


            const formattedData = rows.map(row => {
                const normalizedRow: Record<string, any> = {};
                for (const key in row) {
                    normalizedRow[key.trim()] = row[key];
                }
                
                return {
                    vin: String(normalizedRow['Số VIN'] || '').trim().toUpperCase(),
                    so_may: String(normalizedRow['Số máy'] || normalizedRow['Số động cơ'] || ''),
                    mo_ta: String(normalizedRow['Mô tả sản phẩm'] || ''),
                    khu_vuc: String(normalizedRow['Khu vực'] || ''),
                    phien_ban: String(normalizedRow['Phiên bản'] || ''),
                    ngoai_that: String(normalizedRow['Màu ngoại thất xe'] || ''),
                    noi_that: String(normalizedRow['Màu nội thất xe'] || ''),
                    nam_san_xuat: normalizedRow['Năm sản xuất'] ? parseInt(normalizedRow['Năm sản xuất']) : null,
                    // Default the other table columns to empty string so it doesn't fail if they're required
                    inventory_id: '',
                    check_sum: '',
                    so_ton_kho: '',
                    so_tham_chieu: '',
                    ma_san_pham: '',
                    so_don_hang_cuoi: '',
                    _ngay_sua_doi: Number(normalizedRow['(Không Sửa đổi) Ngày sửa đổi']) || 0
                };
            }).filter(item => item.vin && item.vin.length === 17);


            // Remove duplicate VINs and keep the one with the latest modification date
            const uniqueDataMap = new Map();
            formattedData.forEach(item => {
                const existing = uniqueDataMap.get(item.vin);
                if (!existing || item._ngay_sua_doi >= existing._ngay_sua_doi) {
                    uniqueDataMap.set(item.vin, item);
                }
            });
            const uniqueFormattedData = Array.from(uniqueDataMap.values()).map(item => {
                const { _ngay_sua_doi, ...rest } = item;
                return rest;
            });

            if (uniqueFormattedData.length === 0) {
                throw new Error('Không có dòng nào có số VIN hợp lệ (17 ký tự)');
            }

            // Upsert dữ liệu vào thongtinxe theo từng cụm (Mặc định 500 dòng/lần)
            const UPSERT_CHUNK_SIZE = 500;
            for (let i = 0; i < uniqueFormattedData.length; i += UPSERT_CHUNK_SIZE) {
                const chunk = uniqueFormattedData.slice(i, i + UPSERT_CHUNK_SIZE);
                const { error: upsertError } = await (supabaseAdmin as any)
                    .from('thongtinxe')
                    .upsert(chunk, { onConflict: 'vin', ignoreDuplicates: false });

                if (upsertError) throw upsertError;
            }

            // --- SYNC KHÓ XE HÀNG LOẠT ---
//             showToast('Đang xử lý', 'Đang đồng bộ dữ liệu sang kho xe...', 'loading');
            const uploadedVins = uniqueFormattedData.map(d => d.vin);
            
            // Tìm tất cả VIN có trong khoxe hiện tại - CHIA NHỎ ĐỂ TRÁNH QUÁ TẢI URL (ERROR 400)
            const QUERY_CHUNK_SIZE = 200;
            let existingKhoxe: any[] = [];
            
            for (let i = 0; i < uploadedVins.length; i += QUERY_CHUNK_SIZE) {
                const chunk = uploadedVins.slice(i, i + QUERY_CHUNK_SIZE);
                const { data: chunkData, error: chunkErr } = await (supabaseAdmin as any)
                    .from('khoxe')
                    .select('vin')
                    .in('vin', chunk);
                
                if (chunkErr) throw chunkErr;
                if (chunkData) existingKhoxe = [...existingKhoxe, ...chunkData];
            }
            
            if (existingKhoxe && existingKhoxe.length > 0) {
                const existingVins = existingKhoxe.map((x: any) => x.vin);
                
                // Chuẩn bị dữ liệu cập nhật khoxe (chỉ update các dòng đã tồn tại, tránh thêm rác)
                const updates = uniqueFormattedData
                    .filter(d => existingVins.includes(d.vin))
                    .map(d => ({
                        vin: d.vin,
                        ngoai_that: getExteriorColorName(d.ngoai_that),
                        noi_that: getInteriorColorName(d.noi_that),
                        ma_dms: d.khu_vuc,
                        so_may: d.so_may
                    }));
                    
                // Cập nhật từng xe một (để an toàn không bị over-write cột khác của khoxe nếu lỡ upsert)
                const CHUNK_SIZE = 50;
                for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
                    const chunk = updates.slice(i, i + CHUNK_SIZE);
                    await Promise.all(chunk.map(updateData => 
                        (supabaseAdmin as any).from('khoxe').update({
                            ngoai_that: updateData.ngoai_that,
                            noi_that: updateData.noi_that,
                            ma_dms: updateData.ma_dms,
                            so_may: updateData.so_may
                        }).eq('vin', updateData.vin)
                    ));
                }

            }

            // --- TỰ ĐỘNG LẮP ĐẦY SỐ MÁY VÀO YÊU CẦU & LỊCH SỬ ---
            // Chạy cho toàn bộ dữ liệu Excel (không phụ thuộc vào việc xe còn ở Kho hay không)
            const CHUNK_SIZE = 50;
            for (let i = 0; i < uniqueFormattedData.length; i += CHUNK_SIZE) {
                const chunk = uniqueFormattedData.slice(i, i + CHUNK_SIZE);
                await Promise.all(chunk.filter(u => u.so_may).map(updateData => 
                    (supabaseAdmin as any).from('yeucauxhd').update({ so_may: updateData.so_may }).eq('vin', updateData.vin)
                ));
            }
            
            for (let i = 0; i < uniqueFormattedData.length; i += CHUNK_SIZE) {
                const chunk = uniqueFormattedData.slice(i, i + CHUNK_SIZE);
                await Promise.all(chunk.filter(u => u.so_may).map(updateData => 
                    (supabaseAdmin as any).from('archived_orders').update({ so_may: updateData.so_may }).eq('vin', updateData.vin)
                ));
            }
            // ----------------------------
            // ----------------------------

            await logAction('UPLOAD_THONGTINXE', { rowCount: uniqueFormattedData.length, syncedKhoXe: existingKhoxe?.length || 0 }, 'bulk_import', 'SETTINGS');
            showToast('Thành công', `Đã import ${uniqueFormattedData.length} mã vào Master. Đã đồng bộ ${existingKhoxe?.length || 0} xe ở Kho chứa.`, 'success');
            
            if (onSuccess) onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Lỗi import:', error);
            showToast('Lỗi Import', error.message || 'Lỗi không xác định', 'error');
        } finally {
            setIsUploading(false);
            setFile(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-0 md:p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-surface-card w-full md:max-w-xl h-full md:h-auto md:rounded-2xl shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-start justify-between p-4 md:p-5 border-b border-border-secondary">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-green-50 border border-green-100 shadow-inner">
                            <i className="fas fa-file-excel text-2xl text-green-600"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-text-primary tracking-tight">Cập Nhật Thông Tin Xe (Master)</h2>
                            <p className="text-sm text-text-secondary mt-1">Upload danh sách xe từ file Excel tĩnh</p>
                        </div>
                    </div>
                </header>

                <main className="p-5 md:p-6 space-y-6 flex-grow min-h-0 bg-white">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 text-sm text-slate-600">
                            <p className="flex items-start gap-2">
                                <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                                <span>Tải hoặc sử dụng file Excel hệ thống SAP để import dữ liệu xe mới hoặc cập nhật hàng loạt.</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <i className="fas fa-exclamation-triangle text-amber-500 mt-0.5"></i>
                                <span><b>Số VIN</b> là định danh chính. Nếu trùng, thông tin cũ sẽ được ghi đè.</span>
                            </p>
                            <div className="pt-2">
                                <button type="button" onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline">
                                    <i className="fas fa-download"></i> Tải file mẫu 
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Tải File Excel Lên</label>
                        <div className={`relative border-2 border-dashed rounded-xl p-5 transition-all duration-300 bg-slate-50 cursor-pointer flex flex-col items-center justify-center text-center group hover:bg-green-50/50 ${file ? 'border-green-400' : 'border-slate-200 hover:border-green-400'}`} onClick={() => document.getElementById('thongtinxe-file-upload')?.click()}>
                            <input
                                type="file"
                                id="thongtinxe-file-upload"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${file ? 'bg-green-100 text-green-600' : 'bg-white shadow-sm text-slate-400 group-hover:text-green-500'}`}>
                                <i className={`fas text-xl ${file ? 'fa-check' : 'fa-cloud-upload-alt'}`}></i>
                            </div>
                            
                            <span className={`text-base font-semibold mb-1 ${file ? 'text-green-700' : 'text-slate-700'}`}>
                                {file ? file.name : 'Chọn file Excel tải lên'}
                            </span>
                            {!file && <span className="text-sm text-slate-500">Hỗ trợ .xlsx, .xls, .csv</span>}
                        </div>
                    </div>
                </main>

                <footer className="px-5 py-4 flex justify-end items-center gap-3 bg-white md:rounded-b-2xl border-t border-border-secondary">
                    <button onClick={!isUploading ? onClose : undefined} className={`px-5 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 ${isUploading ? 'opacity-50' : 'hover:bg-slate-200'}`}>
                        Hủy
                    </button>
                    <button onClick={!isUploading ? handleUpload : undefined} className={`px-5 py-2 rounded-xl text-sm font-bold text-white bg-green-600 flex items-center gap-2 ${isUploading ? 'opacity-70' : 'hover:bg-green-700'}`}>
                        {isUploading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-upload"></i>}
                        Import
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ThongTinXeUploadModal;
