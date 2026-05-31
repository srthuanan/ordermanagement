import React, { useState, useEffect } from 'react';
import { supabase, getAppSetting } from '../services/apiService';

interface Props {
    currentUserName: string;
    onLogout: () => void;
}

const MaintenanceFeeBlocker: React.FC<Props> = ({ currentUserName, onLogout }) => {
    const [isBlocked, setIsBlocked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [feeData, setFeeData] = useState<{ amount: number; month: number; year: number } | null>(null);
    const [bankInfo, setBankInfo] = useState<{ bankId: string; accountNo: string; accountName: string } | null>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await getAppSetting('admin_bank_info');
                if (res.data && res.data.bankId) {
                    setBankInfo(res.data);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchConfig();
    }, []);

    const checkFeeStatus = async (isSilent: boolean = false) => {
        if (!isSilent) setIsLoading(true);
        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            
            // Query Supabase for the fee record
            const { data, error } = await supabase
                .from('tvbh_maintenance_fees')
                .select('status, amount, month, year')
                .eq('ten_tvbh', currentUserName)
                .eq('month', currentMonth)
                .eq('year', currentYear)
                .maybeSingle();

            if (error) {
                console.error("Error checking fee status:", error);
                if (!isSilent) setIsLoading(false);
                return;
            }

            if (data && data.status === 'pending') {
                setIsBlocked(true);
                setFeeData({ amount: data.amount, month: data.month, year: data.year });
            } else {
                setIsBlocked(false);
            }
        } catch (err) {
            console.error("Failed to check maintenance fee", err);
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!currentUserName || currentUserName === 'User' || currentUserName === 'Unknown User') {
            setIsLoading(false);
            return;
        }
        checkFeeStatus();
    }, [currentUserName]);

    useEffect(() => {
        if (!isBlocked || !feeData || !currentUserName) return;

        // Bật ăng-ten (Realtime) lắng nghe thanh toán
        const channel = supabase
            .channel(`public:tvbh_maintenance_fees:ten_tvbh=${currentUserName}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'tvbh_maintenance_fees',
                    filter: `ten_tvbh=eq.${currentUserName}`
                },
                (payload) => {
                    const newRecord = payload.new as any;
                    if (
                        newRecord.month === feeData.month &&
                        newRecord.year === feeData.year &&
                        newRecord.status === 'paid'
                    ) {
                        setIsBlocked(false);
                    }
                }
            )
            .subscribe();

        // Fallback: Tự động kiểm tra mỗi 3 giây phòng trường hợp chưa bật Realtime trên Supabase
        const interval = setInterval(() => {
            checkFeeStatus(true); // Kiểm tra ngầm, không bật Loading
        }, 3000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [isBlocked, feeData, currentUserName]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
                <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                <p className="text-slate-600 font-medium">Đang kiểm tra trạng thái truy cập...</p>
            </div>
        );
    }

    if (!isBlocked || !feeData) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="w-full max-w-[460px] animate-fade-in-up relative">
                
                {/* Top Section - Alert & Amount */}
                <div className="bg-white rounded-t-3xl pt-5 pb-4 px-6 relative flex flex-col">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center ring-[4px] ring-amber-50/50 shrink-0">
                            <i className="fas fa-clock text-xl"></i>
                        </div>
                        <div className="text-left">
                            <h2 className="text-[18px] font-extrabold text-slate-800 tracking-tight leading-tight mb-0.5">Thông Báo Gia Hạn</h2>
                            <p className="text-slate-500 text-[12px] leading-relaxed">
                                Dịch vụ đang tạm ngưng. Quý khách vui lòng thanh toán để tiếp tục sử dụng.
                            </p>
                        </div>
                    </div>

                    <div className="w-full flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div>
                            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Kỳ thanh toán</p>
                            <p className="text-slate-700 text-[13px] font-medium">Tháng {feeData.month}/{feeData.year}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Cần thanh toán</p>
                            <p className="font-extrabold text-blue-600 text-[20px] tracking-tight">{Number(feeData.amount).toLocaleString()} <span className="text-[14px] text-blue-500 font-bold">₫</span></p>
                        </div>
                    </div>
                </div>

                {/* Divider with Ticket Cutouts */}
                <div className="relative h-5 bg-white flex items-center justify-center overflow-hidden">
                    <div className="absolute left-[-12px] w-6 h-6 bg-slate-900 rounded-full"></div>
                    <div className="absolute right-[-12px] w-6 h-6 bg-slate-900 rounded-full"></div>
                    <div className="w-full border-t-[2px] border-dashed border-slate-200 mx-5"></div>
                </div>

                {/* Bottom Section - QR & Actions */}
                <div className="bg-white rounded-b-3xl pt-3 pb-5 px-6 flex flex-col">
                    {bankInfo ? (
                        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-stretch">
                            {/* QR Code */}
                            <div className="p-2 bg-white rounded-xl shadow-[0_4px_15px_rgb(0,0,0,0.06)] border border-slate-100 w-44 h-44 shrink-0 relative group flex items-center justify-center">
                                <img 
                                    src={`https://img.vietqr.io/image/${bankInfo.bankId}-${bankInfo.accountNo}-compact2.png?amount=${feeData.amount}&accountName=${encodeURIComponent(bankInfo.accountName)}&addInfo=SEVQR%20WEB%20T${feeData.month}%20${currentUserName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toUpperCase()}`}
                                    alt="VietQR"
                                    className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/png?text=Loi+QR';
                                    }}
                                />
                            </div>
                            
                            {/* Bank Details & Buttons */}
                            <div className="flex flex-col w-full justify-between">
                                <div className="text-left w-full bg-slate-50 rounded-lg p-3 mb-3 border border-slate-100">
                                    <p className="text-[14px] font-bold text-slate-800 mb-0.5 tracking-wide">{bankInfo.accountNo}</p>
                                    <p className="text-[11px] font-bold text-slate-700 uppercase mb-0.5">{bankInfo.accountName}</p>
                                    <p className="text-[11px] font-medium text-slate-500">{bankInfo.bankId}</p>
                                </div>
                                
                                <div className="space-y-2 mt-auto">
                                    <button 
                                        onClick={() => checkFeeStatus()}
                                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[13px] transition-all flex justify-center items-center gap-2 active:scale-[0.98] shadow-lg shadow-slate-900/20"
                                    >
                                        Tôi đã chuyển khoản
                                    </button>

                                    <button 
                                        onClick={onLogout}
                                        className="w-full py-2 bg-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-semibold rounded-xl text-[13px] transition-colors flex justify-center items-center gap-2"
                                    >
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-[12px] text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            Chưa có thông tin nhận thanh toán. Quý khách vui lòng liên hệ Quản trị viên.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default MaintenanceFeeBlocker;
