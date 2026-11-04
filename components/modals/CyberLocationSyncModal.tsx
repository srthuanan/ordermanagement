import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { syncCyberLocations } from '../../services/api/stockService';

interface LocationChangeItem {
    vin: string;
    dong_xe: string;
    phien_ban: string;
    ngoai_that: string;
    current_location: string;
    new_location: string;
    cyber_raw_kho: string;
    is_changed: boolean;
}

interface CyberLocationSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess?: () => void;
}

export const CyberLocationSyncModal: React.FC<CyberLocationSyncModalProps> = ({
    isOpen,
    onClose,
    showToast,
    onSuccess
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [changes, setChanges] = useState<LocationChangeItem[]>([]);
    const [totalCars, setTotalCars] = useState(0);
    const [changedCount, setChangedCount] = useState(0);
    const [onlyChangedFilter, setOnlyChangedFilter] = useState(true);
    const [searchVin, setSearchVin] = useState('');

    useEffect(() => {
        if (isOpen) {
            handleScan();
        } else {
            setChanges([]);
            setSearchVin('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isUpdating) onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, isLoading, isUpdating, onClose]);

    if (!isOpen) return null;

    const handleScan = async () => {
        setIsLoading(true);
        try {
            const res = await syncCyberLocations({ preview: true });
            if (res && res.success) {
                setChanges(res.changes || []);
                setTotalCars(res.total_cars || 0);
                setChangedCount(res.changed_count || 0);

                if (res.changed_count > 0) {
                    showToast(
                        'Đã quét xong CyberSoft',
                        `Tìm thấy ${res.changed_count} xe có vị trí mới từ CyberSoft cần cập nhật!`,
                        'info'
                    );
                } else {
                    showToast(
                        'Đã quét xong CyberSoft',
                        `Tất cả ${res.total_cars || 0} xe trong kho đã khớp 100% vị trí CyberSoft!`,
                        'success'
                    );
                }
            } else {
                throw new Error(res?.error || 'Không thể quét vị trí từ CyberSoft.');
            }
        } catch (err: any) {
            showToast('Lỗi quét vị trí Cyber', err.message || 'Lỗi kết nối CyberSoft', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplySync = async () => {
        if (changedCount === 0) {
            showToast('Không có thay đổi', 'Vị trí của tất cả các xe đã hoàn toàn trùng khớp.', 'info');
            return;
        }

        setIsUpdating(true);
        try {
            showToast('Đang cập nhật...', `Đang cập nhật vị trí cho ${changedCount} xe từ CyberSoft...`, 'loading', 3000);
            const res = await syncCyberLocations({ preview: false });
            if (res && res.success) {
                showToast(
                    'Cập nhật thành công!',
                    `Đã đồng bộ vị trí thực tế cho ${res.updated_count || changedCount} xe trong kho!`,
                    'success',
                    5000
                );
                if (onSuccess) onSuccess();
                onClose();
            } else {
                throw new Error(res?.error || 'Cập nhật vị trí thất bại.');
            }
        } catch (err: any) {
            showToast('Lỗi cập nhật', err.message || 'Không thể ghi nhận vị trí vào Kho xe', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredList = changes.filter(item => {
        if (onlyChangedFilter && !item.is_changed) return false;
        if (searchVin && !item.vin.toLowerCase().includes(searchVin.toLowerCase())) return false;
        return true;
    });

    return (
        <div
            className="cls-sheet"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isUpdating) { window.dispatchEvent(new CustomEvent('close-all-sheets')); onClose(); }
            }}
        >
            <style>{`
                .cls-sheet {
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
                    .cls-sheet {
                        inset: 0;
                        width: 100vw;
                    }
                }
                .cls-sheet-panel {
                    width: clamp(580px, 64vw, 900px);
                    max-width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    color: #17263b;
                    border-right: 1px solid #e2e8f0;
                    box-shadow: 18px 0 42px -14px rgba(20, 34, 54, 0.16);
                    animation: clsSlideInLeft 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes clsSlideInLeft {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .cls-header {
                    padding: 22px 24px 14px;
                    border-bottom: 1px solid #e9edf2;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                }
                .cls-title {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 650;
                    line-height: 1.15;
                    letter-spacing: -0.5px;
                    color: #17263b;
                }
                .cls-subtitle {
                    margin: 4px 0 0;
                    font-size: 11.5px;
                    font-weight: 450;
                    color: #7b879a;
                }
                .cls-close-btn {
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
                .cls-close-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .cls-toolbar {
                    padding: 10px 24px;
                    border-bottom: 1px solid #e9edf2;
                    background: #f8fafc;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    font-size: 11.5px;
                    color: #475569;
                }
                .cls-body {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding: 18px 24px;
                }
                .cls-table-wrap {
                    border: 1px solid #e9edf2;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #ffffff;
                }
                .cls-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    text-align: left;
                }
                .cls-table th {
                    padding: 9px 10px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e9edf2;
                    border-right: 1px solid #eef2f6;
                    font-size: 10.5px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                    color: #64748b;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .cls-table th:last-child {
                    border-right: 0;
                }
                .cls-table td {
                    padding: 9px 10px;
                    border-bottom: 1px solid #eef2f6;
                    border-right: 1px solid #f1f5f9;
                    color: #17263b;
                }
                .cls-table td:last-child {
                    border-right: 0;
                }
                .cls-table tr:last-child td {
                    border-bottom: 0;
                }
                .cls-footer {
                    padding: 12px 24px;
                    border-top: 1px solid #eef2f6;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                .cls-btn-secondary {
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
                .cls-btn-secondary:hover:not(:disabled) {
                    background: #f8fafc;
                    color: #17263b;
                }
                .cls-btn-primary {
                    height: 34px;
                    padding: 0 16px;
                    border: 0;
                    border-radius: 8px;
                    background: #17263b;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .cls-btn-primary:hover:not(:disabled) {
                    background: #0f172a;
                }
                .cls-btn-primary:disabled, .cls-btn-secondary:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
            `}</style>

            <div className="cls-sheet-panel" onClick={e => e.stopPropagation()}>
                <header className="cls-header">
                    <div>
                        <h3 className="cls-title">Vị trí kho Cyber</h3>
                        <p className="cls-subtitle">Đối soát và đồng bộ trực tiếp sổ cái kho xe (CT70BEX) từ CyberSoft ERP</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading || isUpdating}
                        className="cls-close-btn"
                        aria-label="Đóng"
                    >
                        <X size={16} strokeWidth={2} />
                    </button>
                </header>

                <div className="cls-toolbar">
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span>Tổng xe trong kho: <strong style={{ color: '#17263b' }}>{totalCars}</strong></span>
                        <span>Có vị trí mới: <strong style={{ color: '#16a34a' }}>{changedCount}</strong></span>
                        <span>Đã khớp: <strong style={{ color: '#2563eb' }}>{Math.max(0, totalCars - changedCount)}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            type="text"
                            placeholder="Tìm số VIN..."
                            value={searchVin}
                            onChange={e => setSearchVin(e.target.value)}
                            style={{
                                height: 30,
                                width: 150,
                                padding: '0 10px',
                                border: '1px solid #dbe2ea',
                                borderRadius: 6,
                                background: '#ffffff',
                                fontSize: 12,
                                color: '#17263b',
                                outline: 'none'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setOnlyChangedFilter(!onlyChangedFilter)}
                            style={{
                                height: 30,
                                padding: '0 10px',
                                border: `1px solid ${onlyChangedFilter ? '#3b82f6' : '#dbe2ea'}`,
                                borderRadius: 6,
                                background: onlyChangedFilter ? '#eff6ff' : '#ffffff',
                                color: onlyChangedFilter ? '#1d4ed8' : '#475569',
                                fontSize: 11.5,
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Chỉ xe thay đổi ({changedCount})
                        </button>
                    </div>
                </div>

                <main className="cls-body">
                    {isLoading ? (
                        <div style={{ padding: '56px 20px', textAlign: 'center', fontSize: 12, color: '#7b879a' }}>
                            Đang kết nối CyberSoft và tra cứu vị trí kho thực tế...
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div style={{ padding: '56px 20px', textAlign: 'center', fontSize: 12, color: '#7b879a' }}>
                            {onlyChangedFilter
                                ? 'Không có xe nào thay đổi vị trí kho. Tất cả đã khớp với CyberSoft.'
                                : 'Không tìm thấy xe nào phù hợp với bộ lọc.'}
                        </div>
                    ) : (
                        <div className="cls-table-wrap">
                            <table className="cls-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 42, textAlign: 'center' }}>#</th>
                                        <th>Số VIN</th>
                                        <th>Dòng xe / Bản</th>
                                        <th>Màu sắc</th>
                                        <th>Vị trí hiện tại</th>
                                        <th>Vị trí CyberSoft</th>
                                        <th>Kho gốc ERP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredList.map((item, idx) => (
                                        <tr key={item.vin}>
                                            <td style={{ textAlign: 'center', color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace' }}>
                                                {idx + 1}
                                            </td>
                                            <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontWeight: 600 }}>
                                                {item.vin}
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 600 }}>{item.dong_xe}</span>
                                                {item.phien_ban && <span style={{ color: '#7b879a', fontSize: 11, marginLeft: 4 }}>({item.phien_ban})</span>}
                                            </td>
                                            <td style={{ color: '#475569' }}>
                                                {item.ngoai_that || '-'}
                                            </td>
                                            <td style={{ color: '#64748b' }}>
                                                {item.current_location || 'Chưa có'}
                                            </td>
                                            <td style={{ fontWeight: item.is_changed ? 600 : 500, color: item.is_changed ? '#16a34a' : '#17263b' }}>
                                                {item.is_changed ? `→ ${item.new_location}` : item.new_location}
                                            </td>
                                            <td style={{ fontSize: 11, color: '#7b879a' }}>
                                                {item.cyber_raw_kho || '(Chưa nhập kho vật lý)'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>

                <footer className="cls-footer">
                    <button
                        type="button"
                        onClick={handleScan}
                        disabled={isLoading || isUpdating}
                        className="cls-btn-secondary"
                    >
                        Quét lại từ CyberSoft
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isUpdating}
                            className="cls-btn-secondary"
                        >
                            Đóng
                        </button>
                        <button
                            type="button"
                            onClick={handleApplySync}
                            disabled={isLoading || isUpdating || changedCount === 0}
                            className="cls-btn-primary"
                        >
                            {isUpdating ? 'Đang cập nhật...' : `Cập nhật vị trí (${changedCount} xe)`}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};
