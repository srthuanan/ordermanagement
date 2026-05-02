import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

interface DataRecoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const tableOptions = [
    { value: 'donhang', label: 'Bảng Đơn Hàng (donhang)' },
    { value: 'khoxe', label: 'Bảng Kho Xe (khoxe)' },
    { value: 'yeucauxhd', label: 'Yêu Cầu Hóa Đơn (yeucauxhd)' },
    { value: 'yeucauvc', label: 'Yêu Cầu VinClub (yeucauvc)' },
    { value: 'thongtinxe', label: 'Thông Tin Xe Core (thongtinxe)' },
    { value: 'users', label: 'Tài Khoản Nhân Viên (users)' },
    { value: 'archived_orders', label: 'Lưu Trữ Đơn Hàng (archived_orders)' },
    { value: 'test_drive_schedule', label: 'Lịch Lái Thử (test_drive_schedule)' },
    { value: 'app_settings', label: 'Cấu Hình Hệ Thống (app_settings)' },
    { value: 'interactions', label: 'Lịch Sử Tương Tác (interactions)' },
    { value: 'chinhsach', label: 'Bảng Chính Sách (chinhsach)' },
    { value: 'car_inquiries', label: 'Yêu Cầu Tham Khảo Xe (car_inquiries)' },
    { value: 'car_hold_activities', label: 'Lịch Sử Giữ Xe (car_hold_activities)' },
    { value: 'donhang_ton', label: 'Đơn Hàng Tồn DMS (donhang_ton)' },
    { value: 'donhanghienhuu', label: 'Đơn Hàng Hiện Hữu (donhanghienhuu)' },
    { value: 'user_presence', label: 'Trạng Thái Online (user_presence)' },
    { value: 'reputation', label: 'Điểm Đánh Giá TVBH (reputation)' },
    { value: 'sync_logs', label: 'Nhật Ký Đồng Bộ (sync_logs)' },
];

const DataRecoveryModal: React.FC<DataRecoveryModalProps> = ({ isOpen, onClose, showToast }) => {
    const [selectedTable, setSelectedTable] = useState<string>('donhang');
    const [fileUrl, setFileUrl] = useState<string>('');
    const [isRestoring, setIsRestoring] = useState(false);
    const [stats, setStats] = useState<{ total: number; success: number }>({ total: 0, success: 0 });

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setFileUrl(content);
        };
        reader.readAsText(file);
    };

    const handleRestore = async () => {
        if (!fileUrl) {
            showToast('Lỗi', 'Vui lòng chọn file JSON để khôi phục.', 'error');
            return;
        }

        let parsedData: any[] = [];
        try {
            parsedData = JSON.parse(fileUrl);
            if (!Array.isArray(parsedData) || parsedData.length === 0) {
                showToast('Lỗi', 'File JSON trống hoặc không hợp lệ.', 'error');
                return;
            }
        } catch (e) {
            showToast('Lỗi', 'Định dạng file không phải JSON chuẩn.', 'error');
            return;
        }

        setIsRestoring(true);
        showToast('Đang khôi phục', `Phân tích ${parsedData.length} bản ghi... Xin vui lòng chờ!`, 'loading');
        setStats({ total: parsedData.length, success: 0 });

        try {
            const chunkSize = 200;
            let successCount = 0;

            for (let i = 0; i < parsedData.length; i += chunkSize) {
                const chunk = parsedData.slice(i, i + chunkSize);
                const { error } = await supabase.from(selectedTable).upsert(chunk);
                
                if (error) {
                    console.error("Restore Error Chunk:", error);
                    throw new Error(error.message);
                }
                successCount += chunk.length;
                setStats(prev => ({ ...prev, success: successCount }));
            }

            showToast('Hoàn tất!', `Đã khôi phục thành công ${successCount} dòng vào bảng ${selectedTable}`, 'success', 5000);
            setTimeout(() => onClose(), 2000);

        } catch (error: any) {
            showToast('Lỗi Khôi Phục', error.message || 'Có lỗi xảy ra khi nạp dữ liệu.', 'error', 5000);
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-red-600">
                        <i className="fas fa-database text-xl"></i>
                        <h3 className="font-bold text-lg">Khôi Phục Dữ Liệu (Restore)</h3>
                    </div>
                    <button onClick={onClose} disabled={isRestoring} className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-400 hover:text-red-600">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <div className="bg-amber-50 text-amber-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border border-amber-200/50">
                        <i className="fas fa-exclamation-triangle mt-0.5 text-base"></i>
                        Cảnh báo: Tính năng này sẽ GHI ĐÈ dữ liệu đang có trên hệ thống bằng danh sách từ file Backup cũ.
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            1. Bảng cần khôi phục
                        </label>
                        <div className="relative">
                            <select 
                                value={selectedTable}
                                onChange={e => setSelectedTable(e.target.value)}
                                disabled={isRestoring}
                                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                            >
                                {tableOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            2. Tải File Backup Lên (File .JSON)
                        </label>
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
                            <input 
                                type="file" 
                                accept=".json"
                                onChange={handleFileChange}
                                disabled={isRestoring}
                                className="text-sm font-medium text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer" 
                            />
                        </div>
                    </div>

                    {isRestoring && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                            <div className="flex justify-between text-xs font-bold text-slate-600">
                                <span>Tiến độ nạp:</span>
                                <span>{stats.success} / {stats.total} dòng</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${stats.total > 0 ? (stats.success / stats.total) * 100 : 0}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button 
                        onClick={onClose}
                        disabled={isRestoring}
                        className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleRestore}
                        disabled={isRestoring}
                        className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-500/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 min-w-[130px]"
                    >
                        {isRestoring ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-hammer"></i>}
                        {isRestoring ? `Đang bơm (${Math.round((stats.success/stats.total||0)*100)}%)` : 'Bắt đầu nạp đè'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataRecoveryModal;
