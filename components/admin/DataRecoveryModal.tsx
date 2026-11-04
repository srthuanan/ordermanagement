import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

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
    const [fileName, setFileName] = useState<string>('');
    const [isRestoring, setIsRestoring] = useState(false);
    const [stats, setStats] = useState<{ total: number; success: number }>({ total: 0, success: 0 });

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isRestoring) onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, isRestoring, onClose]);

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setFileUrl(content);
        };
        reader.readAsText(file);
    };

    const handleRestore = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
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
        } catch (err) {
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
            setTimeout(() => onClose(), 1200);
        } catch (error: any) {
            showToast('Lỗi Khôi Phục', error.message || 'Có lỗi xảy ra khi nạp dữ liệu.', 'error', 5000);
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div
            className="dr-sheet"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isRestoring) { window.dispatchEvent(new CustomEvent('close-all-sheets')); onClose(); }
            }}
        >
            <style>{`
                .dr-sheet {
                    position: fixed;
                    inset: 0 0 0 64px;
                    width: calc(100vw - 64px);
                    height: 100dvh;
                    z-index: 1005;
                    display: flex;
                    align-items: stretch;
                    justify-content: flex-start;
                    background: rgba(15, 23, 42, 0.08);
                    overflow: hidden;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                @media (max-width: 768px) {
                    .dr-sheet {
                        inset: 0;
                        width: 100vw;
                    }
                }
                .dr-sheet-panel {
                    width: clamp(320px, 28vw, 420px);
                    max-width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    color: #17263b;
                    border-right: 1px solid #e2e8f0;
                    box-shadow: 18px 0 42px -14px rgba(20, 34, 54, 0.16);
                    animation: drSlideInLeft 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes drSlideInLeft {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .dr-header {
                    padding: 22px 20px 14px;
                    border-bottom: 1px solid #e9edf2;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                }
                .dr-title {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 650;
                    line-height: 1.15;
                    letter-spacing: -0.5px;
                    color: #17263b;
                }
                .dr-subtitle {
                    margin: 4px 0 0;
                    font-size: 11.5px;
                    font-weight: 450;
                    color: #7b879a;
                }
                .dr-close-btn {
                    width: 28px;
                    height: 28px;
                    border: 0;
                    border-radius: 6px;
                    background: transparent;
                    color: #64748b;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                .dr-close-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .dr-body {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding: 18px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .dr-warn {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    padding: 10px 12px;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    background: #fef2f2;
                    color: #b91c1c;
                    font-size: 11.5px;
                    font-weight: 500;
                    line-height: 1.45;
                }
                .dr-field {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .dr-label {
                    font-size: 11px;
                    font-weight: 600;
                    color: #475569;
                }
                .dr-select {
                    width: 100%;
                    height: 36px;
                    padding: 0 11px;
                    border: 1px solid #dbe2ea;
                    border-radius: 8px;
                    background: #ffffff;
                    font-size: 12.5px;
                    font-weight: 500;
                    color: #17263b;
                    outline: none;
                }
                .dr-select:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
                }
                .dr-dropzone {
                    border: 1px dashed #cbd5e1;
                    border-radius: 8px;
                    padding: 16px 12px;
                    text-align: center;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: border-color 140ms ease, background-color 140ms ease;
                }
                .dr-dropzone:hover {
                    border-color: #94a3b8;
                    background: #f1f5f9;
                }
                .dr-progress-box {
                    padding: 11px 12px;
                    border: 1px solid #e9edf2;
                    border-radius: 8px;
                    background: #f8fafc;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .dr-footer {
                    padding: 12px 20px;
                    border-top: 1px solid #eef2f6;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                }
                .dr-btn-cancel {
                    height: 34px;
                    padding: 0 14px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #475569;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                }
                .dr-btn-cancel:hover:not(:disabled) {
                    background: #f8fafc;
                    color: #17263b;
                }
                .dr-btn-submit {
                    height: 34px;
                    padding: 0 16px;
                    border: 0;
                    border-radius: 8px;
                    background: #dc2626;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .dr-btn-submit:hover:not(:disabled) {
                    background: #b91c1c;
                }
                .dr-btn-submit:disabled, .dr-btn-cancel:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
            `}</style>

            <form onSubmit={handleRestore} className="dr-sheet-panel" onClick={e => e.stopPropagation()}>
                <header className="dr-header">
                    <div>
                        <h3 className="dr-title">Khôi phục CSDL lõi</h3>
                        <p className="dr-subtitle">Nạp dữ liệu từ tệp sao lưu JSON</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={isRestoring} className="dr-close-btn" aria-label="Đóng">
                        <X size={16} strokeWidth={2} />
                    </button>
                </header>

                <main className="dr-body">
                    <div className="dr-warn">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>Tính năng này sẽ ghi đè dữ liệu hiện tại của bảng được chọn bằng danh sách từ tệp sao lưu.</span>
                    </div>

                    <div className="dr-field">
                        <label className="dr-label">Bảng dữ liệu cần khôi phục</label>
                        <select
                            value={selectedTable}
                            onChange={e => setSelectedTable(e.target.value)}
                            disabled={isRestoring}
                            className="dr-select"
                        >
                            {tableOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="dr-field">
                        <label className="dr-label">Tệp sao lưu (.json)</label>
                        <label className="dr-dropzone">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                disabled={isRestoring}
                                className="hidden"
                            />
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#17263b' }}>
                                {fileName || 'Bấm để chọn tệp sao lưu .json'}
                            </div>
                            <div style={{ fontSize: 11, color: '#7b879a', marginTop: 3 }}>
                                Định dạng mảng JSON chuẩn từ hệ thống Backup
                            </div>
                        </label>
                    </div>

                    {isRestoring && (
                        <div className="dr-progress-box">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 600, color: '#475569' }}>
                                <span>Tiến độ nạp</span>
                                <span>{stats.success} / {stats.total} bản ghi</span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                                <div
                                    style={{
                                        height: '100%',
                                        background: '#dc2626',
                                        width: `${stats.total > 0 ? (stats.success / stats.total) * 100 : 0}%`,
                                        transition: 'width 200ms ease'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </main>

                <footer className="dr-footer">
                    <button type="button" onClick={onClose} disabled={isRestoring} className="dr-btn-cancel">
                        Hủy bỏ
                    </button>
                    <button type="submit" disabled={isRestoring || !fileUrl} className="dr-btn-submit">
                        {isRestoring ? `Đang nạp (${Math.round((stats.success / (stats.total || 1)) * 100)}%)` : 'Bắt đầu khôi phục'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default DataRecoveryModal;
