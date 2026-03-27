import React, { useState, useEffect } from 'react';
import * as apiService from '../../services/apiService';
import Button from '../ui/Button';
import moment from 'moment';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';

interface ReportBacklogModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info') => void;
    currentUser: string;
}

const ReportBacklogModal: React.FC<ReportBacklogModalProps> = ({ isOpen, onClose, showToast, currentUser }) => {
    const copyWithFeedback = useCopyFeedback();
    const [soDonHang, setSoDonHang] = useState('');
    const [ghiChu, setGhiChu] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
    const [myBacklogs, setMyBacklogs] = useState<any[]>([]);
    const [isLoadingBacklogs, setIsLoadingBacklogs] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterModel, setFilterModel] = useState('all');
    const [filterVinStatus, setFilterVinStatus] = useState('all');

    const uniqueModels = React.useMemo(() => {
        const models = myBacklogs.map(o => o.displayModel).filter(Boolean);
        return Array.from(new Set(models)).sort();
    }, [myBacklogs]);

    const filteredBacklogs = React.useMemo(() => {
        return myBacklogs.filter(order => {
            const query = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery || 
                 (order.so_don_hang || '').toLowerCase().includes(query) ||
                 (order.khach_hang || '').toLowerCase().includes(query) ||
                 (order.ma_khach_hang || '').toLowerCase().includes(query) ||
                 (order.vin || '').toLowerCase().includes(query) ||
                 (order.displayModel || '').toLowerCase().includes(query) ||
                 (order.displayVersion || '').toLowerCase().includes(query) ||
                 (order.ngoai_that || '').toLowerCase().includes(query) ||
                 (order.noi_that || '').toLowerCase().includes(query) ||
                 (order.ghi_chu || '').toLowerCase().includes(query);
                 
            const matchesModel = filterModel === 'all' || order.displayModel === filterModel;
            
            const hasVin = order.vin && order.vin.length > 5;
            const matchesVinStatus = filterVinStatus === 'all' || 
                (filterVinStatus === 'paired' && hasVin) || 
                (filterVinStatus === 'unpaired' && !hasVin);
                
            return matchesSearch && matchesModel && matchesVinStatus;
        });
    }, [myBacklogs, searchQuery, filterModel, filterVinStatus]);

    const fetchMyBacklogs = async () => {
        setIsLoadingBacklogs(true);
        try {
            const res = await apiService.getBacklogOrders();
            if (res.status === 'SUCCESS' && res.data) {
                const mine = res.data.filter((o: any) => o.tvbh_name === currentUser);
                setMyBacklogs(mine);
            }
        } catch (e) {
            console.error("Failed to load personal backlogs", e);
        } finally {
            setIsLoadingBacklogs(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMyBacklogs();
            setActiveTab('new');
        }
    }, [isOpen, currentUser]);

    if (!isOpen) return null;

    const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
        if (e && e.preventDefault) e.preventDefault();
        const pattern = /^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$/;
        if (!pattern.test(soDonHang)) {
            showToast('Sai Định Dạng', 'Số đơn hàng không đúng định dạng (VD: N31913-VSO-26-03-0311)', 'warning');
            return;
        }
        
        setIsSubmitting(true);
        try {
            const res = await apiService.addBacklogOrder(soDonHang, ghiChu, currentUser);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', res.message, 'success');
                setSoDonHang('');
                setGhiChu('');
                fetchMyBacklogs(); // Refresh the list
                setActiveTab('history'); // Switch to history tab to show the new entry
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message || 'Không thể tạo báo cáo đơn tồn.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden"
            onClick={onClose}
        >
            {/* Full-Screen Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-orange-900/10 to-slate-800/40">
                {/* Animated Gradient Orbs - Orange/Amber Theme */}
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/15 to-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-to-tl from-red-500/10 to-orange-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
            </div>

            {/* Floating Content Container */}
            <div
                className="relative z-10 w-full max-w-[1280px] mx-auto px-2 md:px-6 flex flex-col justify-center min-h-[100dvh] pointer-events-none"
            >
                <div
                    className="flex flex-col w-full h-[88vh] animate-fade-in-scale-up pointer-events-auto border border-white/30 rounded-2xl overflow-hidden shadow-2xl bg-white/95 backdrop-blur-3xl relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
                    
                    <header className="flex-shrink-0">
                        <div className="bg-gradient-to-r from-orange-50/80 via-white to-orange-50/80 p-4 md:p-5 border-b border-orange-200/30 shadow-sm relative overflow-hidden group">
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-orange-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-400/20 transition-all duration-700"></div>

                            <div className="flex items-center justify-between relative z-10">
                                {/* Branding Layout from RequestInvoiceModal */}
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-10 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shadow-sm"></div>
                                    <div className="flex flex-col">
                                        <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2 uppercase">
                                            BÁO CÁO <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">ĐƠN TỒN</span>
                                        </h1>
                                    </div>
                                </div>

                                {/* Close Button Style */}
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 hover:bg-white text-gray-400 hover:text-gray-900 transition-all hover:rotate-90 hover:scale-110 shadow-sm border border-gray-100"
                                >
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* Tab Navigation Mimicking RequestInvoiceModal Steps style but as tabs */}
                    <div className="flex justify-center border-b border-gray-100 bg-white/40 backdrop-blur-md relative z-10">
                        <button
                            onClick={() => setActiveTab('new')}
                            className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'new' ? 'border-orange-500 text-orange-600 bg-orange-50/20' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50/40'}`}
                        >
                            <i className="fas fa-plus-circle mr-2 opacity-60 text-[10px]"></i> Tạo Báo Cáo
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-2.5 ${activeTab === 'history' ? 'border-orange-500 text-orange-600 bg-orange-50/20' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50/40'}`}
                        >
                            <i className="fas fa-layer-group opacity-60 text-[10px]"></i> Đơn Tồn
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm ${activeTab === 'history' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {myBacklogs.length}
                            </span>
                        </button>
                    </div>

                    <main className="flex-grow min-h-[300px] overflow-y-auto custom-scrollbar relative z-10 bg-white/40">
                        {activeTab === 'new' ? (
                            <div className="p-4 md:p-6 flex flex-col h-full animate-fade-in gap-4 md:gap-5">
                                <div className="bg-white rounded-[10px] border-l-4 border-l-orange-500 border-y border-r border-gray-200 p-3 md:p-4 relative overflow-hidden shadow-sm flex-shrink-0 bg-gradient-to-r from-orange-50/40 to-white">
                                    <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                                        <i className="fas fa-exclamation-circle text-5xl text-orange-600 transform rotate-12"></i>
                                    </div>
                                    <div className="relative z-10">
                                        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
                                            <i className="fas fa-info-circle text-orange-500"></i> Hướng dẫn nhập liệu
                                        </h3>
                                        <p className="text-xs text-gray-600">Nhập <b>Số đơn hàng bán</b> từ hệ thống DMS để quản trị viên nắm bắt được tình hình và lý do tồn xe (chưa lấy xe, đang chờ màu, etc.).</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 flex-grow bg-white/60 p-4 rounded-xl border border-gray-200/60 shadow-sm">
                                    <div>
                                        <label className="block text-[11px] md:text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Số đơn hàng bán <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <i className="fas fa-hashtag text-gray-400"></i>
                                            </div>
                                            <input 
                                                type="text"
                                                value={soDonHang}
                                                onChange={(e) => setSoDonHang(e.target.value.toUpperCase())}
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-gray-700 shadow-sm"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col">
                                        <label className="block text-[11px] md:text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Ghi chú (Lý do chậm lấy) <span className="text-red-500">*</span></label>
                                        <div className="relative flex-1 flex flex-col">
                                            <div className="absolute top-3.5 left-0 pl-3.5 flex items-start pointer-events-none">
                                                <i className="fas fa-comment-alt text-gray-400"></i>
                                            </div>
                                            <textarea 
                                                value={ghiChu}
                                                onChange={(e) => setGhiChu(e.target.value)}
                                                className="w-full flex-1 pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none text-gray-700 shadow-sm min-h-[120px]"
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 md:p-6 flex flex-col h-full animate-fade-in gap-4 max-w-[100%] overflow-hidden">
                                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-white/80 p-2.5 rounded-xl border border-gray-200 shadow-sm relative z-20">
                                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 flex-1">
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <i className="fas fa-search text-gray-400 text-[12px]"></i>
                                            </div>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Tìm kiếm bất cứ gì..."
                                                className="w-full pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm font-medium text-gray-700 shadow-sm"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Model Filter */}
                                            <div className="relative min-w-[125px]">
                                                <select 
                                                    value={filterModel}
                                                    onChange={(e) => setFilterModel(e.target.value)}
                                                    className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-[11px] font-bold text-gray-600 shadow-sm appearance-none cursor-pointer"
                                                >
                                                    <option value="all">Tất cả mẫu xe</option>
                                                    {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <i className="fas fa-filter text-[9px]"></i>
                                                </div>
                                            </div>

                                            {/* VIN Status Filter */}
                                            <div className="relative min-w-[125px]">
                                                <select 
                                                    value={filterVinStatus}
                                                    onChange={(e) => setFilterVinStatus(e.target.value)}
                                                    className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-[11px] font-bold text-gray-600 shadow-sm appearance-none cursor-pointer"
                                                >
                                                    <option value="all">Tất cả trạng thái</option>
                                                    <option value="paired">Đã ghép VIN</option>
                                                    <option value="unpaired">Chưa ghép VIN</option>
                                                </select>
                                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <i className="fas fa-chevron-down text-[9px]"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button onClick={fetchMyBacklogs} className="text-orange-500 hover:text-white bg-orange-50 hover:bg-orange-500 px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm border border-orange-100 whitespace-nowrap min-w-[100px]">
                                        <i className={`fas fa-sync-alt ${isLoadingBacklogs ? 'fa-spin' : ''} text-[10px]`}></i>
                                        Làm mới
                                    </button>
                                </div>
                                
                                <div className="bg-white/60 rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex-grow flex flex-col relative z-10">
                                    <div className="overflow-x-auto custom-scrollbar flex-grow">
                                        <table className="w-full text-left border-collapse min-w-[900px]">
                                            <thead>
                                                <tr className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-md">
                                                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 w-12 text-center">STT</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">Thông Tin Đơn / VIN</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">Khách Hàng</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">Xe & Màu Sắc</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">Ghi Chú</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {isLoadingBacklogs && myBacklogs.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-20 text-center">
                                                            <div className="flex flex-col items-center justify-center">
                                                                <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-3"></div>
                                                                <p className="text-sm text-gray-500 font-medium">Đang tải danh sách tồn xe...</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : filteredBacklogs.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-20 text-center">
                                                            <div className="flex flex-col items-center justify-center opacity-50">
                                                                <i className="fas fa-box-open text-gray-300 text-6xl mb-4"></i>
                                                                <span className="text-sm text-gray-400 font-medium tracking-wide">
                                                                    {myBacklogs.length > 0 ? 'Không tìm thấy đơn hàng phù hợp với bộ lọc.' : 'Bạn chưa có đơn tồn nào cần xử lý.'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredBacklogs.map((order, index) => (
                                                        <tr key={order.id} className="hover:bg-orange-50/40 transition-all group">
                                                            <td className="px-4 py-4 align-top text-center">
                                                                <span className="text-[11px] font-black text-gray-400 group-hover:text-orange-500 transition-colors">
                                                                    {(index + 1).toString().padStart(2, '0')}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 align-top">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <span 
                                                                        onClick={(e) => copyWithFeedback(order.so_don_hang, e)}
                                                                        title="Click để copy số đơn hàng"
                                                                        className="font-mono text-[12px] font-bold text-orange-700 bg-orange-50/50 px-2 py-0.5 rounded border border-orange-100/50 self-start cursor-pointer hover:bg-orange-100/50 hover:border-orange-300 transition-all"
                                                                    >
                                                                        #{order.so_don_hang}
                                                                    </span>
                                                                    <div 
                                                                        onClick={(e) => order.vin && order.vin.length > 5 && copyWithFeedback(order.vin, e)}
                                                                        title={order.vin && order.vin.length > 5 ? "Click để copy số VIN" : ""}
                                                                        className={`text-[11px] font-mono font-bold flex items-center gap-1.5 ${order.vin && order.vin.length > 5 ? 'text-green-600 cursor-pointer hover:text-green-700' : 'text-gray-400 italic'}`}
                                                                    >
                                                                        <i className={`fas ${order.vin && order.vin.length > 5 ? 'fa-check-circle' : 'fa-circle-notch'} text-[10px]`}></i>
                                                                        {order.vin && order.vin.length > 5 ? order.vin : 'Chưa ghép VIN'}
                                                                    </div>
                                                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                        <i className="far fa-calendar-alt"></i>
                                                                        GD: {moment(order.ngay_giao_dich).format('DD/MM/YYYY')}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 align-top">
                                                                <div className="flex flex-col">
                                                                    <span 
                                                                        onClick={(e) => copyWithFeedback(order.khach_hang, e)}
                                                                        title="Click để copy tên khách hàng"
                                                                        className="text-[13px] font-black text-gray-800 cursor-pointer hover:text-orange-600 transition-colors"
                                                                    >
                                                                        {order.khach_hang || 'Chưa cập nhật'}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 font-mono mt-0.5">{order.ma_khach_hang || '---'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 align-top">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[12px] font-extrabold text-slate-700 leading-tight">
                                                                        {order.displayModel ? `${order.displayModel} - ${order.displayVersion}` : (order.phien_ban || '-')}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase border border-slate-200/50">
                                                                            {order.ngoai_that || '-'} / {order.noi_that || '-'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 align-top">
                                                                <div className="flex flex-col gap-2 min-w-[200px]">
                                                                    <div className="bg-white/40 border border-gray-100 p-2 rounded-lg relative">
                                                                        <p className="text-[12px] text-gray-600 font-medium italic leading-relaxed">
                                                                            {order.ghi_chu || <span className="text-gray-300">Không có ghi chú</span>}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center justify-end gap-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                                                                        <i className="far fa-clock"></i>
                                                                        Báo cáo: {moment(order.created_at).format('HH:mm DD/MM')}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>

                    <footer className="flex-shrink-0 p-3 md:p-4 border-t border-orange-200/30 bg-gradient-to-r from-orange-50/95 via-white/95 to-orange-50/95 backdrop-blur-xl flex justify-end gap-3 items-center relative z-10 shadow-inner">
                        <Button onClick={onClose} disabled={isSubmitting} variant="secondary" size="sm">
                            Đóng
                        </Button>
                        
                        {activeTab === 'new' && (
                            <Button onClick={handleSubmit} disabled={isSubmitting || !soDonHang || !ghiChu} variant="primary" size="sm" isLoading={isSubmitting} leftIcon={!isSubmitting ? <i className="fas fa-paper-plane"></i> : undefined} className="!bg-orange-500 hover:!bg-orange-600 shadow-orange-500/20 shadow-md">
                                Gửi Báo Cáo
                            </Button>
                        )}
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default ReportBacklogModal;
