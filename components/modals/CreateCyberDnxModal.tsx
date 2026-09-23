import React, { useState, useEffect } from 'react';
import { createCyberDnxTicket, lookupCyberVinWarehouse, CyberDnxCreateResult } from '../../services/api/stockService';
import { supabaseAdmin } from '../../services/supabaseClient';
import { formatShortWarehouseName } from '../../utils/stringUtils';
import { SearchableWarehouseSelect } from '../ui/SearchableWarehouseSelect';

interface CreateCyberDnxModalProps {
    isOpen: boolean;
    onClose: () => void;
    vins: string[];
    initialCustomerName?: string;
    onSuccess?: (result: CyberDnxCreateResult) => void;
}

export const CreateCyberDnxModal: React.FC<CreateCyberDnxModalProps> = ({
    isOpen,
    onClose,
    vins,
    initialCustomerName = '',
    onSuccess
}) => {
    const [maKhoXuat, setMaKhoXuat] = useState('K87');
    const [maKhoNhan, setMaKhoNhan] = useState('K83');
    const [maGd, setMaGd] = useState<'4' | '9'>('4');
    const [khachHang, setKhachHang] = useState(initialCustomerName);
    const [lyDo, setLyDo] = useState(initialCustomerName ? `Lấy xe về PDI giao KH ${initialCustomerName}` : 'Điều chuyển xe nội bộ làm PDI chuẩn bị giao KH');
    const [userName, setUserName] = useState('02.NHANPT');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [resultData, setResultData] = useState<CyberDnxCreateResult | null>(null);
    const [existingTicket, setExistingTicket] = useState<any | null>(null);
    const [isCheckingVins, setIsCheckingVins] = useState(false);

    useEffect(() => {
        if (!isOpen || !vins || vins.length === 0) {
            setExistingTicket(null);
            return;
        }
        let isMounted = true;
        setIsCheckingVins(true);
        lookupCyberVinWarehouse(vins)
            .then(res => {
                if (!isMounted) return;
                if (res && res.found && res.ma_kho) {
                    setMaKhoXuat(res.ma_kho);
                    if (res.ma_kho === 'K83') {
                        setMaKhoNhan(prev => (prev === 'K83' ? 'K87' : prev));
                    } else {
                        setMaKhoNhan('K83');
                    }
                    if (['K83', 'K87', 'K86', 'K85', 'K106', 'KHCM.PVD'].includes(res.ma_kho)) {
                        setMaGd('4');
                    } else {
                        setMaGd('9');
                    }
                }
                if (res && res.cars) {
                    for (const c of res.cars) {
                        if (c.has_td4 && c.td4) {
                            setExistingTicket({
                                type: 'TD4',
                                title: 'Phiếu Hẹn Giao Xe / Giấy Ra Cổng (TD4)',
                                so_ct: c.td4.so_ct,
                                ngay_ct: c.td4.ngay_ct,
                                vin: c.vin,
                                ten_kh: c.td4.ten_kh
                            });
                            return;
                        }
                        if (c.has_dnx && c.dnx) {
                            setExistingTicket({
                                type: 'DNX',
                                title: 'Phiếu Đề Nghị Xuất Xe (DNX)',
                                so_ct: c.dnx.so_ct,
                                ngay_ct: c.dnx.ngay_ct,
                                vin: c.vin,
                                ten_kh: c.dnx.ten_kh
                            });
                            return;
                        }
                    }
                }
                setExistingTicket(null);
            })
            .catch(() => {})
            .finally(() => {
                if (isMounted) setIsCheckingVins(false);
            });
        return () => { isMounted = false; };
    }, [isOpen, vins.join(',')]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vins || vins.length === 0) {
            setErrorMsg('Vui lòng chọn ít nhất 1 xe để tạo giấy chuyển');
            return;
        }

        if (existingTicket) {
            setErrorMsg(`Xe có số VIN ${existingTicket.vin} đã có ${existingTicket.title} số ${existingTicket.so_ct}. Không thể tạo trùng.`);
            return;
        }

        setLoading(true);
        setErrorMsg('');
        setResultData(null);

        try {
            const res = await createCyberDnxTicket({
                vins,
                ma_gd: maGd,
                ma_kho_xuat: maKhoXuat,
                ma_kho_nhan: maKhoNhan,
                khach_hang: khachHang,
                ly_do: lyDo,
                user_name: userName,
                ma_dvcs: '02',
                ma_ttcp: '02.01.08'
            });

            if (res.success) {
                setResultData(res);
                // Tự động cập nhật vị trí mới vào bảng khoxe cho các số VIN trong phiếu DNX sang kho nhận
                try {
                    const toLoc = formatShortWarehouseName(maKhoNhan) || maKhoNhan;
                    for (const v of vins) {
                        const cleanVin = v.trim().toUpperCase();
                        await supabaseAdmin.from('khoxe').update({ vi_tri: toLoc }).eq('vin', cleanVin);
                    }
                } catch (eKhoxe) {
                    console.warn('[CreateCyberDnxModal] Lỗi cập nhật vị trí khoxe:', eKhoxe);
                }
                if (onSuccess) onSuccess(res);
            } else {
                setErrorMsg(res.error || 'Không thể ghi nhận giấy chuyển lên Cyber. Vui lòng thử lại.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Lỗi hệ thống khi kết nối tới Cyber.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
            <div className="bg-slate-900 text-white rounded-2xl border border-slate-700/60 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30 shadow-inner">
                            🚚
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white">Lập Giấy Đề Nghị Xuất Xe (Cyber)</h3>
                            <p className="text-xs text-slate-400">Ghi nhận phiếu DNX trực tiếp vào CSDL CyberSoft ERP</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-4">
                    {resultData ? (
                        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-5 text-center space-y-3">
                            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold border border-emerald-500/30">
                                ✓
                            </div>
                            <h4 className="text-lg font-bold text-emerald-300">Tạo Giấy Chuyển Thành Công!</h4>
                            <p className="text-sm text-slate-300">
                                Đã ghi nhận phiếu <span className="font-mono text-emerald-400 font-bold px-2 py-0.5 bg-emerald-900/60 rounded border border-emerald-500/30">{resultData.so_ct}</span> vào CSDL CyberSoft ERP.
                            </p>
                            <div className="text-left bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1 font-mono">
                                <div>• Mã phiếu (stt_rec): <span className="text-white">{resultData.stt_rec}</span></div>
                                <div>• Người lập: <span className="text-white">{resultData.user_name} (ID: {resultData.user_id})</span></div>
                                <div>• Tổng số xe xuất: <span className="text-emerald-400 font-bold">{resultData.total_cars} chiếc</span></div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-colors text-sm"
                            >
                                Hoàn tất & Đóng
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {errorMsg && (
                                <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center space-x-2">
                                    <span>⚠️</span>
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {existingTicket && (
                                <div className="p-3 bg-amber-950/40 border-2 border-amber-500/60 rounded-xl space-y-1.5 shadow-md">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-600 text-white">
                                            CHẶN TẠO TRÙNG LẶP
                                        </span>
                                        <span className="text-xs font-bold text-amber-300">
                                            Xe đã tồn tại {existingTicket.title}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300">
                                        Xe số VIN <strong className="text-white font-mono">{existingTicket.vin}</strong> đã được lập phiếu số <strong className="text-amber-300 font-mono">{existingTicket.so_ct}</strong> (ngày {existingTicket.ngay_ct || 'N/A'}).
                                    </p>
                                    <p className="text-[11px] text-rose-400 font-semibold">
                                        Hệ thống chặn tạo trùng lặp chứng từ trên cơ sở dữ liệu.
                                    </p>
                                </div>
                            )}

                            {/* Danh sách xe */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Danh sách xe xuất ({vins.length} VIN):
                                </label>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-950/60 border border-slate-800 rounded-xl">
                                    {vins.map(vin => (
                                        <span key={vin} className="font-mono text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 text-emerald-400 rounded-lg font-bold">
                                            {vin}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Loại phiếu đề nghị xuất (CyberSoft Loại 4 vs 9) */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Loại phiếu đề nghị xuất (CyberSoft):
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <label
                                        onClick={() => setMaGd('4')}
                                        className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                                            maGd === '4'
                                                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                                                : 'bg-slate-950/60 border-slate-700 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="modal_ma_gd"
                                            checked={maGd === '4'}
                                            onChange={() => setMaGd('4')}
                                            className="text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <div>
                                            <div className="text-xs font-bold">4. Điều chuyển nội bộ điểm KD</div>
                                            <div className="text-[10px] text-slate-400 font-normal">Giữa các kho trong showroom</div>
                                        </div>
                                    </label>
                                    <label
                                        onClick={() => setMaGd('9')}
                                        className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                                            maGd === '9'
                                                ? 'bg-purple-950/40 border-purple-500 text-purple-300 ring-1 ring-purple-500/50'
                                                : 'bg-slate-950/60 border-slate-700 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="modal_ma_gd"
                                            checked={maGd === '9'}
                                            onChange={() => setMaGd('9')}
                                            className="text-purple-500 focus:ring-purple-500"
                                        />
                                        <div>
                                            <div className="text-xs font-bold">9. Điều chuyển xe các điểm KD</div>
                                            <div className="text-[10px] text-slate-400 font-normal">Chuyển sang showroom/đại lý khác</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Kho xuất & Kho nhận */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Kho xuất:
                                    </label>
                                    <SearchableWarehouseSelect
                                        value={maKhoXuat}
                                        onChange={(val) => setMaKhoXuat(val)}
                                        size="md"
                                        theme="dark"
                                        placeholder="Chọn kho xuất..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Kho nhận (Đích đến):
                                    </label>
                                    <SearchableWarehouseSelect
                                        value={maKhoNhan}
                                        onChange={(val) => {
                                            setMaKhoNhan(val);
                                            if (['K83', 'K87', 'K86', 'K85', 'K106', 'KHCM.PVD'].includes(val)) {
                                                setMaGd('4');
                                            } else {
                                                setMaGd('9');
                                            }
                                        }}
                                        size="md"
                                        theme="dark"
                                        placeholder="Chọn kho nhận..."
                                    />
                                </div>
                            </div>

                            {/* Tài khoản lập */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Tài khoản người lập Cyber (`User_Name`):
                                </label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="02.NHANPT"
                                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                                />
                            </div>

                            {/* Tên Khách hàng */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Tên Khách hàng / Đối tượng giao:
                                </label>
                                <input
                                    type="text"
                                    value={khachHang}
                                    onChange={(e) => setKhachHang(e.target.value)}
                                    placeholder="Ví dụ: Ngô Trí Dũng"
                                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* Lý do xuất xe */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Lý do xuất / điều chuyển xe:
                                </label>
                                <textarea
                                    rows={2}
                                    value={lyDo}
                                    onChange={(e) => setLyDo(e.target.value)}
                                    placeholder="Lấy xe về PDI giao KH Ngô Trí Dũng"
                                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || isCheckingVins || Boolean(existingTicket)}
                                    className={`px-5 py-2.5 font-bold rounded-xl text-sm transition-all flex items-center space-x-2 ${
                                        existingTicket
                                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                                            : 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-900/40 cursor-pointer'
                                    }`}
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Đang tạo trên Cyber...</span>
                                        </>
                                    ) : existingTicket ? (
                                        <span>⛔ Không thể tạo (Đã có phiếu {existingTicket.so_ct})</span>
                                    ) : (
                                        <>
                                            <span>⚡ Tạo Giấy Chuyển Cyber</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
