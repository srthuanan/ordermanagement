import React, { useState, useEffect, useCallback } from 'react';
import { MaintenanceFee } from '../../types';
import BankConfigModal from '../modals/BankConfigModal';
import GenerateMonthlyModal from '../modals/GenerateMonthlyModal';

// Use same env logic as TvbhEmailManager
const SB_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const SB_HEADERS = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
};

async function sbFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
        ...options,
        headers: { ...SB_HEADERS, ...(options.headers || {}) },
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`${res.status}: ${body}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

interface Props {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info') => void;
}

const MaintenanceFeeManager: React.FC<Props> = ({ showToast }) => {
    const [fees, setFees] = useState<MaintenanceFee[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [defaultMonthlyAmount, setDefaultMonthlyAmount] = useState<number>(50000);

    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [availableTvbhs, setAvailableTvbhs] = useState<string[]>([]);

    useEffect(() => {
        const fetchTvbhs = async () => {
            try {
                const users = await sbFetch('users?select=full_name,role');
                if (users) {
                    const names = users
                        .filter((u: any) => u.role === 'Tư vấn bán hàng' || u.role === 'Trưởng Phòng Kinh Doanh')
                        .map((u: any) => u.full_name)
                        .filter(Boolean);
                    setAvailableTvbhs([...new Set(names)] as string[]);
                }
            } catch (e) {
                console.warn("Failed to fetch tvbhs", e);
            }
        };
        fetchTvbhs();
    }, []);

    const fetchFees = useCallback(async (isSilent: boolean = false) => {
        if (!isSilent) setIsLoading(true);
        try {
            const data = await sbFetch(`tvbh_maintenance_fees?month=eq.${selectedMonth}&year=eq.${selectedYear}&order=ten_tvbh.asc`);
            setFees(data || []);
        } catch (err: any) {
            if (!isSilent) showToast('Lỗi', err.message || 'Không thể tải dữ liệu', 'error');
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    }, [selectedMonth, selectedYear, showToast]);

    useEffect(() => {
        fetchFees();
        
        // Thêm tính năng tự động làm mới (polling ngầm) mỗi 5 giây cho màn hình Quản lý
        const intervalId = setInterval(() => {
            fetchFees(true);
        }, 5000);
        
        return () => clearInterval(intervalId);
    }, [fetchFees]);

    const handleMarkAsPaid = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
        try {
            await sbFetch(`tvbh_maintenance_fees?id=eq.${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                    status: newStatus,
                    paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                })
            });
            showToast('Thành công', `Đã cập nhật trạng thái thành ${newStatus}`, 'success');
            fetchFees();
        } catch (err: any) {
            showToast('Lỗi', err.message, 'error');
        }
    };

    const handleOpenGenerateModal = () => {
        if (availableTvbhs.length === 0) {
            showToast('Lỗi', 'Chưa tải được danh sách nhân viên.', 'warning');
            return;
        }
        setIsGenerateModalOpen(true);
    };

    const handleConfirmGenerate = async (selectedTvbhs: string[]) => {
        setIsGenerateModalOpen(false);
        setIsLoading(true);
        try {
            // Create fee records
            const records = selectedTvbhs.map((ten_tvbh: string) => ({
                ten_tvbh: ten_tvbh,
                month: selectedMonth,
                year: selectedYear,
                amount: defaultMonthlyAmount,
                status: 'pending'
            }));

            // We use POST with Prefer: resolution=ignore-duplicates
            await sbFetch('tvbh_maintenance_fees', {
                method: 'POST',
                headers: { 'Prefer': 'resolution=ignore-duplicates' },
                body: JSON.stringify(records)
            });

            showToast('Thành công', `Đã tạo danh sách thu tiền tháng ${selectedMonth}`, 'success');
            fetchFees();
        } catch (err: any) {
            showToast('Lỗi', err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const [isAdding, setIsAdding] = useState(false);
    const [isBankConfigOpen, setIsBankConfigOpen] = useState(false);
    const [newFee, setNewFee] = useState({ ten_tvbh: '', amount: 50000 });

    const handleAddManual = async () => {
        if (!newFee.ten_tvbh) return;
        try {
            await sbFetch('tvbh_maintenance_fees', {
                method: 'POST',
                body: JSON.stringify({
                    ten_tvbh: newFee.ten_tvbh,
                    month: selectedMonth,
                    year: selectedYear,
                    amount: newFee.amount,
                    status: 'pending'
                })
            });
            showToast('Thành công', 'Đã thêm thủ công', 'success');
            setIsAdding(false);
            setNewFee({ ten_tvbh: '', amount: 50000 });
            fetchFees();
        } catch (err: any) {
            showToast('Lỗi', err.message, 'error');
        }
    };

    const totalExpected = fees.reduce((acc, f) => acc + Number(f.amount), 0);
    const totalCollected = fees.filter(f => f.status === 'paid').reduce((acc, f) => acc + Number(f.amount), 0);

    return (
        <div className="flex flex-col h-full bg-[#f4f7f6] p-4 sm:p-6 overflow-y-auto">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                        <i className="fas fa-money-bill-wave text-lg"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Kinh Phí Web Hàng Tháng</h2>
                        <p className="text-sm text-slate-500">Quản lý đóng góp duy trì hệ thống web của TVBH</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
                    <select 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="px-3 py-2 border border-slate-300 rounded text-sm bg-white font-medium text-slate-700 outline-none"
                    >
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>Tháng {m}</option>
                        ))}
                    </select>
                    <select 
                        value={selectedYear} 
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="px-3 py-2 border border-slate-300 rounded text-sm bg-white font-medium text-slate-700 outline-none"
                    >
                        {[2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>Năm {y}</option>
                        ))}
                    </select>
                    
                    <div className="flex items-center gap-2 border border-slate-300 rounded bg-white px-2 overflow-hidden">
                        <i className="fas fa-coins text-slate-400 text-xs pl-1"></i>
                        <input
                            type="number"
                            value={defaultMonthlyAmount}
                            onChange={(e) => setDefaultMonthlyAmount(Number(e.target.value))}
                            className="py-2 text-sm font-medium text-slate-700 w-24 outline-none"
                            placeholder="Mức thu..."
                            title="Mức phí áp dụng chung khi tạo danh sách"
                        />
                    </div>
                    <button 
                        onClick={handleOpenGenerateModal}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded transition-colors flex items-center gap-2"
                    >
                        <i className="fas fa-magic text-xs"></i>
                        Tạo DS Tháng Này
                    </button>
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded transition-colors flex items-center gap-2"
                    >
                        <i className="fas fa-plus text-xs"></i>
                        Thêm
                    </button>
                    <button 
                        onClick={() => setIsBankConfigOpen(true)}
                        className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-sm font-semibold rounded transition-colors flex items-center gap-2"
                    >
                        <i className="fas fa-qrcode text-xs"></i>
                        Cấu Hình VietQR
                    </button>
                </div>
            </div>

            <BankConfigModal 
                isOpen={isBankConfigOpen}
                onClose={() => setIsBankConfigOpen(false)}
                showToast={showToast}
            />

            <GenerateMonthlyModal 
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                onGenerate={handleConfirmGenerate}
                availableTvbhs={availableTvbhs}
                month={selectedMonth}
                year={selectedYear}
                defaultAmount={defaultMonthlyAmount}
            />

            {/* Simple Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-sm text-slate-500 mb-1 font-medium">Tổng TVBH / Dòng</p>
                    <p className="text-2xl font-bold text-slate-800">{fees.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-sm text-slate-500 mb-1 font-medium">Đã Thu</p>
                    <p className="text-2xl font-bold text-green-600">{totalCollected.toLocaleString()} đ</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-sm text-slate-500 mb-1 font-medium">Dự Kiến Thu</p>
                    <p className="text-2xl font-bold text-blue-600">{totalExpected.toLocaleString()} đ</p>
                </div>
            </div>

            {/* Quick Add Form */}
            {isAdding && (
                <div className="mb-6 bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-wrap items-center gap-4 animate-fade-in-up">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Chọn TVBH</label>
                        <select
                            value={newFee.ten_tvbh}
                            onChange={e => setNewFee({...newFee, ten_tvbh: e.target.value})}
                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded text-sm font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option value="">-- Chọn một TVBH --</option>
                            {availableTvbhs.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-40">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Số Tiền (VNĐ)</label>
                        <input 
                            type="number" 
                            value={newFee.amount}
                            onChange={e => setNewFee({...newFee, amount: Number(e.target.value)})}
                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded text-sm font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-end gap-2 pt-5">
                        <button onClick={handleAddManual} disabled={!newFee.ten_tvbh} className={`px-6 py-2 rounded text-sm font-semibold transition-all ${newFee.ten_tvbh ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                            Lưu
                        </button>
                        <button onClick={() => setIsAdding(false)} className="px-6 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded text-sm font-semibold transition-all">
                            Hủy
                        </button>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="bg-white flex flex-col flex-1 overflow-hidden mt-2">
                <div className="overflow-x-auto overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
                        <thead className="bg-[#e8edf2] sticky top-0 z-10">
                            <tr>
                                <th className="border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider w-12 text-center">STT</th>
                                <th className="border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider">TÊN TVBH</th>
                                <th className="border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">SỐ TIỀN</th>
                                <th className="border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider text-center">TRẠNG THÁI</th>
                                <th className="border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider text-center">NGÀY ĐÓNG</th>
                                <th className="border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider text-center">THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && fees.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 border border-slate-200">
                                        <div className="inline-flex items-center justify-center mb-2">
                                            <i className="fas fa-spinner fa-spin text-blue-500 text-lg"></i>
                                        </div>
                                        <p className="text-slate-500 text-sm font-medium">Đang tải dữ liệu...</p>
                                    </td>
                                </tr>
                            ) : fees.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 border border-slate-200 text-slate-500 text-sm">
                                        Chưa có danh sách thu tiền.
                                    </td>
                                </tr>
                            ) : (
                                fees.map((fee, idx) => (
                                    <tr key={fee.id} className="hover:bg-blue-50/50 transition-colors bg-white">
                                        <td className="border border-slate-200 px-3 py-2 text-sm text-slate-600 text-center">{idx + 1}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800">
                                            {fee.ten_tvbh}
                                        </td>
                                        <td className="border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 text-right">
                                            {Number(fee.amount).toLocaleString()} đ
                                        </td>
                                        <td className="border border-slate-200 px-3 py-2 text-sm text-center">
                                            {fee.status === 'paid' ? (
                                                <span className="text-green-600 font-bold">Đã đóng</span>
                                            ) : fee.status === 'exempt' ? (
                                                <span className="text-purple-600 font-bold">Miễn phí</span>
                                            ) : (
                                                <span className="text-orange-600 font-bold">Chưa đóng</span>
                                            )}
                                        </td>
                                        <td className="border border-slate-200 px-3 py-2 text-sm text-slate-600 text-center">
                                            {fee.paid_at ? new Date(fee.paid_at).toLocaleDateString('vi-VN') : '-'}
                                        </td>
                                        <td className="border border-slate-200 px-3 py-2 text-center">
                                            <button 
                                                onClick={() => handleMarkAsPaid(fee.id, fee.status)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm ${
                                                    fee.status === 'paid' 
                                                    ? 'bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200' 
                                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/30'
                                                }`}
                                            >
                                                {fee.status === 'paid' ? 'Hủy Xác Nhận' : 'Đóng Tiền'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceFeeManager;
