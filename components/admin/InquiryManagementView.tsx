import React, { useEffect, useState, useRef } from 'react';
import * as apiService from '../../services/apiService';
import moment from 'moment';
import Button from '../ui/Button';
import { StockVehicle, CarInquiry } from '../../types';

interface InquiryManagementViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info') => void;
    initialInquiryId?: string;
    onProcessed?: () => void;
}

const InquiryManagementView: React.FC<InquiryManagementViewProps> = ({ showToast, initialInquiryId, onProcessed }) => {
    const [inquiries, setInquiries] = useState<CarInquiry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [responseMessage, setResponseMessage] = useState('');
    const [isResponding, setIsResponding] = useState(false);
    const [matchingVehicles, setMatchingVehicles] = useState<StockVehicle[]>([]);
    const [similarVehicles, setSimilarVehicles] = useState<StockVehicle[]>([]);
    const [showQuickMatch, setShowQuickMatch] = useState(false);
    
    // Chat logic
    const [isSendingComment, setIsSendingComment] = useState(false);
    const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
    const selectedInquiry = React.useMemo(() => inquiries.find(i => i.id === selectedInquiryId), [inquiries, selectedInquiryId]);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (selectedInquiryId && selectedInquiry?.chat_history) {
            // Scroll to bottom when history changes or inquiry changes
            setTimeout(scrollToBottom, 100);
        }
    }, [selectedInquiry?.chat_history?.length, selectedInquiryId]);

    const fetchInquiries = async () => {
        setIsLoading(true);
        const data = await apiService.getCarInquiries();
        setInquiries(data);
        setIsLoading(false);
    };

    useEffect(() => {
        if (initialInquiryId && inquiries.length > 0) {
            const inquiry = inquiries.find(i => i.id === initialInquiryId);
            if (inquiry) {
                handleSelectInquiry(inquiry);
            }
            if (onProcessed) onProcessed();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialInquiryId, inquiries.length]);

    useEffect(() => {
        fetchInquiries();

        // --- REALTIME SUBSCRIPTION ---
        const channel = apiService.supabase
            .channel('car_inquiries_admin_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'car_inquiries' },
                (payload: any) => {
                    console.log('Car Inquiry Change Detected:', payload);
                    fetchInquiries();
                }
            )
            .subscribe();

        return () => {
            apiService.supabase.removeChannel(channel);
        };
    }, []);

    const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
    const [sidebarTab, setSidebarTab] = useState<'list' | 'stats'>('list');

    const handleSelectInquiry = async (inquiry: CarInquiry) => {
        setSelectedInquiryId(inquiry.id);
        setResponseMessage(inquiry.admin_response || '');
        setShowQuickMatch(false);
        setMatchingVehicles([]);
        setMobileView('detail');

        // Mark as checking if it was pending or checking
        if (inquiry.status === 'pending') {
            apiService.respondToCarInquiry(inquiry.id, inquiry.admin_response || '', undefined, 'auto_checking');
            setInquiries(prev => prev.map(item => item.id === inquiry.id ? { ...item, status: 'auto_checking' as any } : item));
        }

        if (!inquiry.is_read_by_admin) {
            apiService.markInquiryAsRead(inquiry.id, 'admin');
            setInquiries(prev => prev.map(item => item.id === inquiry.id ? { ...item, is_read_by_admin: true } : item));
        }

        // Search matching cars in stock
        try {
            const stockRes = await apiService.getStockData();
            if (stockRes.status === 'SUCCESS' && stockRes.khoxe) {
                const allStock = stockRes.khoxe as StockVehicle[];
                
                // EXACT Matches
                const matches = allStock.filter(car => 
                    car.trang_thai === 'Chưa ghép' &&
                    car['Dòng xe'] === inquiry.model &&
                    car['Phiên bản'] === inquiry.version &&
                    car['Ngoại thất'] === inquiry.exterior_color &&
                    car['Nội thất'] === inquiry.interior_color
                );
                
                // SIMILAR Matches (Same model, but different version or color)
                const similar = allStock.filter(car => {
                    const isSameModel = car['Dòng xe'] === inquiry.model;
                    const isDifferent = car['Phiên bản'] !== inquiry.version || car['Ngoại thất'] !== inquiry.exterior_color;
                    const isAvailable = car.trang_thai === 'Chưa ghép';
                    return isAvailable && isSameModel && isDifferent;
                }).slice(0, 5); // Limit to 5 suggestions

                setMatchingVehicles(matches);
                setSimilarVehicles(similar);
                setShowQuickMatch(true);
            }
        } catch (e) {
            console.error("Error searching matching cars:", e);
        }
    };

    const handleSendComment = async () => {
        if (!selectedInquiry || !responseMessage.trim()) return;
        setIsSendingComment(true);
        try {
            const res = await apiService.addInquiryComment({
                inquiry_id: selectedInquiry.id,
                sender_email: 'admin@showroom.com', // Replace with actual admin email
                sender_name: 'Admin',
                content: responseMessage,
                is_admin_comment: true
            });
            if (res.status === 'SUCCESS') {
                setResponseMessage('');
            }
        } finally {
            setIsSendingComment(false);
        }
    };

    const handleSendResponse = async (matchedVin?: string) => {
        const msg = matchedVin ? `Đã tìm thấy xe phù hợp: ${matchedVin}` : responseMessage;
        if (!selectedInquiry || !msg.trim()) return;

        setIsResponding(true);
        try {
            const res = await apiService.respondToCarInquiry(selectedInquiry.id, msg, matchedVin);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', 'Đã phản hồi yêu cầu cho TVBH.', 'success');
                fetchInquiries();
                setSelectedInquiryId(null);
                setMobileView('list');
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (error: any) {
            showToast('Lỗi', error.message, 'error');
        } finally {
            setIsResponding(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'auto_found':
                return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px] font-black uppercase tracking-widest border border-emerald-200">Auto Found</span>;
            case 'manual_responded':
                return <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest border border-blue-200">Responded</span>;
            case 'not_found':
                return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200">Not Found</span>;
            case 'auto_checking':
                return <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-[9px] font-black uppercase tracking-widest border border-amber-200 animate-pulse">Checking</span>;
            case 'held':
                return <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded text-[9px] font-black uppercase tracking-widest border border-purple-200">Car Secured</span>;
            default:
                return <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-[9px] font-black uppercase tracking-widest border border-amber-200">Pending</span>;
        }
    };

    const demandStats = inquiries.reduce((acc, curr) => {
        const key = `${curr.model} - ${curr.version}|${curr.exterior_color}|${curr.interior_color}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sortedDemand = Object.entries(demandStats).sort((a, b) => b[1] - a[1]);

    return (
        <div className="flex h-full bg-slate-50/50 overflow-hidden relative">
            {/* Sidebar: List of Inquiries */}
            <div className={`w-full md:w-[320px] bg-white flex-col h-full shadow-[2px_0_10px_rgba(0,0,0,0.02)] absolute md:relative z-10 transition-transform duration-300 ${mobileView !== 'list' ? '-translate-x-full md:translate-x-0 hidden md:flex' : 'flex'}`}>
                <div className="px-5 pt-5 pb-3 bg-white sticky top-0 z-10">
                    <h2 className="text-[13px] font-black text-[#1e40af] uppercase tracking-wide flex items-center gap-2 mb-4">
                        <i className="fas fa-search"></i>
                        TRA CỨU KHO XE
                    </h2>
                    
                    {/* Sidebar Tabs */}
                    <div className="flex p-1 bg-slate-50 border border-slate-100/80 rounded-xl mb-2">
                        <button 
                            onClick={() => setSidebarTab('list')}
                            className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${sidebarTab === 'list' ? 'bg-white text-slate-800 shadow-sm border border-slate-100/50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Danh sách
                        </button>
                        <button 
                            onClick={() => setSidebarTab('stats')}
                            className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${sidebarTab === 'stats' ? 'bg-white text-slate-800 shadow-sm border border-slate-100/50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Nhu cầu
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {sidebarTab === 'stats' ? (
                        <div className="p-4 space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 mb-3">TOP nhu cầu tìm kiếm</h4>
                            {sortedDemand.map(([key, count]) => {
                                const [carInfo, extColor, intColor] = key.split('|');
                                return (
                                    <div key={key} className="flex flex-col p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-100 transition-colors shadow-sm gap-2">
                                        <div className="flex items-start justify-between">
                                            <div className="text-xs font-black text-slate-800 break-words pr-2">{carInfo}</div>
                                            <div className="px-2 py-0.5 bg-[#f0f4fa] text-[#1e40af] border border-[#e2e8f0] text-[10px] font-black rounded-lg min-w-[24px] text-center shrink-0">{count}</div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {extColor && <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase">Ngoại: {extColor}</span>}
                                            {intColor && <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase">Nội: {intColor}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : isLoading ? (
                        <div className="p-8 text-center text-slate-400">
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                        </div>
                    ) : inquiries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-[300px]">
                            <div className="w-16 h-16 bg-[#f8fafc] rounded-[1.25rem] flex items-center justify-center mb-4 transition-transform hover:scale-105">
                                <i className="fas fa-search text-2xl text-slate-200"></i>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Hiện chưa có yêu cầu nào</p>
                        </div>
                    ) : (
                        <div className="px-3 pb-3 space-y-1">
                            {inquiries.map((item: CarInquiry) => {
                                const isSelected = selectedInquiry?.id === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelectInquiry(item)}
                                        className={`px-4 py-3 cursor-pointer transition-all rounded-xl relative border ${
                                            isSelected 
                                            ? 'bg-blue-50/50 border-blue-200/60 shadow-sm' 
                                            : 'bg-white border-transparent hover:border-slate-100 hover:bg-slate-50'
                                        }`}
                                    >
                                        {!item.is_read_by_admin && (
                                            <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></div>
                                        )}
                                        <div className="flex justify-between items-center mb-1.5">
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{moment(item.created_at).format('DD/MM • HH:mm')}</div>
                                            {getStatusBadge(item.status)}
                                        </div>
                                        <h3 className={`font-black text-xs truncate ${isSelected ? 'text-[#1e40af]' : 'text-slate-700'}`}>{item.tvbh_name}</h3>
                                        <div className="text-[10px] text-slate-500 mt-0.5 truncate flex items-center gap-1.5">
                                            <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{item.model}</span> 
                                            <span className="truncate">{item.version}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content: Response Area */}
            <div className={`flex-1 flex-col h-full overflow-hidden ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {selectedInquiry ? (
                    <div className="p-2 md:p-4 w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {/* Compact Header - Expanded to full height */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
                            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <button 
                                        onClick={() => setMobileView('list')} 
                                        className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 mr-1 active:scale-95 shadow-sm"
                                    >
                                        <i className="fas fa-arrow-left text-xs"></i>
                                    </button>
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs shrink-0">
                                        <span className="text-[10px]">{selectedInquiry.tvbh_name.substring(0, 2).toUpperCase()}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-black text-slate-800 truncate">{selectedInquiry.tvbh_name}</h2>
                                        <p className="text-[9px] md:text-[10px] text-slate-400 font-bold truncate tracking-tight">{selectedInquiry.tvbh_email}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase">Gửi lúc</div>
                                    <div className="text-[10px] md:text-[11px] font-bold text-slate-600">{moment(selectedInquiry.created_at).format('HH:mm - DD/MM')}</div>
                                </div>
                            </div>

                            {/* Horizontal Layout Container - Flexible and Hidden Overflow */}
                            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden border-t border-slate-100">
                                
                                {/* LEFT COLUMN: Configuration & Suggestions - Independent Scroll if needed */}
                                <div className="lg:w-2/5 space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                            <i className="fas fa-car text-slate-400 text-[10px]"></i>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cấu hình yêu cầu</span>
                                        </div>
                                        <div className="p-3 sm:p-4 grid grid-cols-2 gap-x-4 gap-y-2">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tight">Phiên bản</span>
                                                <span className="text-[11px] sm:text-xs font-black text-blue-600 truncate">{selectedInquiry.version}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tight">Dòng xe</span>
                                                <span className="text-[11px] sm:text-xs font-black text-slate-800 italic truncate">{selectedInquiry.model}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tight">Ngoại thất</span>
                                                <span className="text-[9px] sm:text-[10px] font-black text-slate-700 uppercase truncate">{selectedInquiry.exterior_color}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tight">Nội thất</span>
                                                <span className="text-[9px] sm:text-[10px] font-black text-slate-700 uppercase truncate">{selectedInquiry.interior_color}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className={`rounded-xl border overflow-hidden ${selectedInquiry.matched_vin ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                        <div className={`px-3 py-2 border-b flex items-center justify-between ${selectedInquiry.matched_vin ? 'bg-emerald-100/50 border-emerald-200' : 'bg-amber-100/50 border-amber-200'}`}>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${selectedInquiry.matched_vin ? 'text-emerald-700' : 'text-amber-700'}`}>Trạng thái kho</span>
                                            {selectedInquiry.matched_vin && <i className="fas fa-check-circle text-emerald-600 text-xs"></i>}
                                        </div>
                                        <div className="p-2 sm:p-4 flex flex-col items-center justify-center min-h-[50px] sm:min-h-[60px]">
                                            {selectedInquiry.matched_vin ? (
                                                <>
                                                    <div className="text-base sm:text-lg font-black text-emerald-900 font-mono tracking-widest">{selectedInquiry.matched_vin}</div>
                                                    <div className="text-[8px] font-bold text-emerald-600 uppercase mt-0.5">Sẳn sàng bàn giao</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="text-[11px] sm:text-xs font-black text-amber-800 uppercase text-center">Chưa có xe khớp</div>
                                                    <p className="text-[8px] sm:text-[9px] text-amber-700/70 font-bold mt-0.5">Cần hỗ trợ tìm kiếm</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    </div>

                                    { /* Quick match from stock */ }
                                    {showQuickMatch && matchingVehicles.length > 0 && !selectedInquiry.matched_vin && (
                                        <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4">
                                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <i className="fas fa-magic"></i>
                                                Gợi ý khớp ({matchingVehicles.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {matchingVehicles.map(car => (
                                                    <div key={car.VIN} className="bg-white p-3 rounded-lg border border-blue-100 flex items-center justify-between shadow-sm">
                                                        <div className="text-xs font-black text-slate-800 font-mono tracking-wider">{car.VIN}</div>
                                                        <button
                                                            onClick={() => {
                                                                setResponseMessage(`Đã tìm thấy xe phù hợp: ${car.VIN}`);
                                                                handleSendResponse(car.VIN);
                                                            }}
                                                            className="px-2 py-1 bg-blue-600 text-white text-[8px] font-black rounded hover:bg-blue-700 uppercase"
                                                        >
                                                            Ghép
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Similar Alternatives */}
                                    {showQuickMatch && similarVehicles.length > 0 && matchingVehicles.length === 0 && !selectedInquiry.matched_vin && (
                                        <div className="bg-amber-50/50 rounded-xl border border-amber-100 p-4">
                                            <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <i className="fas fa-lightbulb"></i>
                                                Xe tương đương
                                            </h4>
                                            <div className="space-y-2">
                                                {similarVehicles.map(car => (
                                                    <div key={car.VIN} className="bg-white p-3 rounded-lg border border-amber-100 flex items-center justify-between shadow-sm">
                                                        <div className="min-w-0 flex-1 pr-2">
                                                            <div className="text-[10px] font-black text-slate-800 font-mono">{car.VIN}</div>
                                                            <div className="text-[8px] font-bold text-slate-400 truncate">{car['Phiên bản']} • {car['Ngoại thất']}</div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setResponseMessage(`Mẫu ${selectedInquiry.version} hiện hết hàng. Có sẵn bản ${car['Phiên bản']} màu ${car['Ngoại thất']} (VIN: ${car.VIN}). Bạn tư vấn khách thử nhé!`);
                                                            }}
                                                            className="px-2 py-1 bg-amber-500 text-white text-[8px] font-black rounded hover:bg-amber-600 uppercase"
                                                        >
                                                            Gợi ý
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT COLUMN: Internal Chat */}
                                <div className="lg:w-3/5 flex flex-col border-l border-slate-200 bg-slate-50/30 p-4 sm:p-6 overflow-hidden">
                                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trao đổi nội bộ</label>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-full shadow-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[8px] font-black text-slate-500 uppercase italic">Trực tuyến</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        <div 
                                            ref={chatContainerRef}
                                            className="flex-1 space-y-3 mb-4 sm:mb-6 overflow-y-auto px-1 custom-scrollbar flex flex-col pt-1 sm:pt-2 scroll-smooth"
                                        >
                                            {(!selectedInquiry.chat_history || selectedInquiry.chat_history.filter((c: any) => !c.telegram_thread_id).length === 0) ? (
                                                <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                                                    <i className="fas fa-comments text-3xl mb-2"></i>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest">Chưa có trao đổi</p>
                                                </div>
                                            ) : (
                                                selectedInquiry.chat_history.filter((c: any) => !c.telegram_thread_id).map((comment: any) => (
                                                    <div key={comment.id} className={`flex flex-col ${comment.is_admin_comment ? 'items-end' : 'items-start'}`}>
                                                        <div className={`flex items-end gap-2 max-w-[90%] ${comment.is_admin_comment ? 'flex-row-reverse' : 'flex-row'}`}>
                                                            <div className={`px-4 py-2.5 rounded-2xl text-xs ${
                                                                comment.is_admin_comment 
                                                                ? 'bg-slate-900 text-white rounded-tr-none shadow-md' 
                                                                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                                                            }`}>
                                                                <p className="leading-relaxed font-medium">{comment.content}</p>
                                                            </div>
                                                            <p className="text-[8px] font-black text-slate-400 mb-1 shrink-0 italic">{moment(comment.created_at).format('HH:mm')}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="space-y-3 pt-3 border-t border-slate-50">
                                            <div className="relative">
                                                <textarea
                                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[46px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent-primary/10 focus:border-accent-primary transition-all text-xs font-medium placeholder:text-slate-300 resize-none shadow-inner"
                                                    placeholder="Nhập nội dung trao đổi..."
                                                    value={responseMessage}
                                                    onChange={(e) => setResponseMessage(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            if (responseMessage.trim()) {
                                                                handleSendComment();
                                                            }
                                                        }
                                                    }}
                                                    rows={1}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="secondary"
                                                    onClick={handleSendComment}
                                                    isLoading={isSendingComment}
                                                    disabled={!responseMessage.trim()}
                                                    className="px-3 py-1.5 h-auto text-[9px] font-black rounded-lg border-slate-200 shadow-sm"
                                                >
                                                    GỬI CHAT
                                                </Button>
                                                <Button
                                                    variant="primary"
                                                    onClick={() => handleSendResponse()}
                                                    isLoading={isResponding}
                                                    disabled={!responseMessage.trim()}
                                                    className="bg-slate-900 border-none px-4 py-1.5 h-auto text-[9px] font-black rounded-lg shadow-lg shadow-slate-900/10"
                                                >
                                                    PHẢN HỒI & ĐÓNG
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/10">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-4 text-slate-200">
                            <i className="fas fa-comment-dots text-lg opacity-20"></i>
                        </div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Chọn yêu cầu để xem chi tiết</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InquiryManagementView;
