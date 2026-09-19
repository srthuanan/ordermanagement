import React, { useState, useEffect, useCallback } from 'react';
import { supabase, getAppSetting, recordUserPresence } from '../services/apiService';

interface Props {
    currentUserName: string;
    onLogout: () => void;
    children?: React.ReactNode;
}

const MaintenanceFeeBlocker: React.FC<Props> = ({ currentUserName, onLogout, children }) => {
    const [isBlocked, setIsBlocked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [feeData, setFeeData] = useState<{ amount: number; month: number; year: number } | null>(null);
    const [bankInfo, setBankInfo] = useState<{ bankId: string; accountNo: string; accountName: string } | null>(null);
    const [effectiveUserName, setEffectiveUserName] = useState<string>(currentUserName);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await getAppSetting('admin_bank_info');
                if (res.data && res.data.bankId) {
                    setBankInfo(res.data);
                }
            } catch (err) {
                console.error("Lỗi lấy thông tin ngân hàng admin:", err);
            }
        };
        fetchConfig();
    }, []);

    const checkFeeStatus = useCallback(async (isSilent: boolean = false) => {
        if (!isSilent) {
            setIsLoading(true);
            setHasError(false);
        }
        try {
            // =========================================================================
            // BẢO MẬT TUYỆT ĐỐI CHỐNG F12:
            // Xác thực danh tính qua Supabase Auth JWT mã hóa (chữ ký số máy chủ, không thể sửa qua F12)
            // =========================================================================
            const { data: authData } = await supabase.auth.getUser();
            const authEmail = authData?.user?.email?.toLowerCase() || '';

            // 1. Chỉ DUY NHẤT email quản trị hệ thống máy chủ mới được coi là Admin thực sự
            // Nếu người dùng dùng F12 sửa localStorage.currentUser = 'admin' thì authEmail vẫn là email thật của họ
            if (authEmail === 'showroomthuanan@gmail.com') {
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem("isFeeBlocked");
                }
                setIsBlocked(false);
                setIsLoading(false);
                return;
            }

            // 2. Truy vấn hồ sơ gốc từ Database theo email đã xác thực
            let verifiedFullName = currentUserName;
            if (authEmail) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('full_name, role, username')
                    .ilike('email', authEmail)
                    .maybeSingle();

                if (profile?.full_name) {
                    verifiedFullName = profile.full_name.trim();
                    setEffectiveUserName(verifiedFullName);

                    // Tự động vô hiệu hóa và đè lại dữ liệu nếu người dùng cố tình can thiệp F12 vào localStorage
                    if (typeof window !== 'undefined') {
                        if (localStorage.getItem("currentConsultant") !== verifiedFullName) {
                            localStorage.setItem("currentConsultant", verifiedFullName);
                        }
                        if (localStorage.getItem("currentUser") !== profile.username) {
                            localStorage.setItem("currentUser", profile.username);
                        }
                        if (localStorage.getItem("userRole") !== profile.role) {
                            localStorage.setItem("userRole", profile.role);
                        }
                    }
                }
            }

            if (!verifiedFullName || verifiedFullName === 'User' || verifiedFullName === 'Unknown User') {
                setIsLoading(false);
                return;
            }

            // 3. Quét kiểm tra nợ phí trên Supabase bằng danh tính đã được kiểm chứng an toàn
            const { data, error } = await supabase
                .from('tvbh_maintenance_fees')
                .select('status, amount, month, year')
                .eq('ten_tvbh', verifiedFullName)
                .eq('status', 'pending')
                .order('year', { ascending: false })
                .order('month', { ascending: false })
                .limit(1);

            if (error) {
                console.error("Error checking fee status:", error);
                if (!isSilent) {
                    // Cơ chế Fail-closed: Có lỗi kết nối thì kiên quyết không mở cửa
                    setHasError(true);
                    setErrorMessage(error.message || 'Không thể kết nối đến máy chủ xác thực.');
                    setIsLoading(false);
                }
                return;
            }

            if (data && data.length > 0) {
                const pendingRecord = data[0];
                setIsBlocked(true);
                setFeeData({ amount: pendingRecord.amount, month: pendingRecord.month, year: pendingRecord.year });
                sessionStorage.setItem("isFeeBlocked", "true");
                // Cập nhật trạng thái 'blocked_fee' lên giám sát live
                recordUserPresence('blocked_fee').catch(() => {});
            } else {
                setIsBlocked(false);
                setFeeData(null);
                sessionStorage.removeItem("isFeeBlocked");
                setHasError(false);
            }
        } catch (err: any) {
            console.error("Failed to check maintenance fee", err);
            if (!isSilent) {
                setHasError(true);
                setErrorMessage(err?.message || 'Lỗi hệ thống khi kiểm tra trạng thái.');
            }
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    }, [currentUserName]);

    useEffect(() => {
        checkFeeStatus();
    }, [checkFeeStatus]);

    // Lắng nghe thanh toán Realtime & Polling ngầm khi bị khóa
    useEffect(() => {
        const targetName = effectiveUserName || currentUserName;
        if (!isBlocked || !targetName) return;

        const channel = supabase
            .channel(`public:tvbh_maintenance_fees:ten_tvbh=${targetName}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'tvbh_maintenance_fees',
                    filter: `ten_tvbh=eq.${targetName}`
                },
                (payload) => {
                    const newRecord = payload.new as any;
                    if (newRecord.status === 'paid') {
                        checkFeeStatus(true);
                    }
                }
            )
            .subscribe();

        // Fallback polling mỗi 3 giây
        const interval = setInterval(() => {
            checkFeeStatus(true);
        }, 3000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [isBlocked, effectiveUserName, currentUserName, checkFeeStatus]);

    // 1. Màn hình chờ kiểm tra
    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center">
                <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                <p className="text-slate-600 font-medium">Đang kiểm tra trạng thái thuê bao...</p>
            </div>
        );
    }

    // 2. Màn hình báo lỗi (Fail-closed: Mất mạng hoặc bị can thiệp request)
    if (hasError) {
        return (
            <div className="fixed inset-0 z-[99999] bg-slate-900/95 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl animate-fade-in-up">
                    <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl ring-4 ring-rose-50/60">
                        <i className="fas fa-triangle-exclamation"></i>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-800 mb-2">Không Thể Xác Thực Dịch Vụ</h3>
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                        Hệ thống không thể kiểm tra trạng thái duy trì dịch vụ của bạn. 
                        Vui lòng kiểm tra kết nối mạng hoặc tắt tiện ích chặn trên trình duyệt rồi thử lại.
                    </p>
                    {errorMessage && (
                        <p className="text-[11px] text-rose-500 bg-rose-50 p-2 rounded-lg mb-4 font-mono">
                            {errorMessage}
                        </p>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={() => checkFeeStatus(false)}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-98"
                        >
                            Thử lại
                        </button>
                        <button
                            onClick={onLogout}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition-all"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Màn hình Khóa khi chưa thanh toán (CHỈ RENDER DUY NHẤT MÀN HÌNH NÀY, KHÔNG RENDER CHILDREN)
    if (isBlocked && feeData) {
        const displayName = effectiveUserName || currentUserName;
        return (
            <div className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
                <div className="w-full max-w-[460px] animate-fade-in-up relative my-auto">
                    
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
                                        src={`https://img.vietqr.io/image/${bankInfo.bankId}-${bankInfo.accountNo}-compact2.png?amount=${feeData.amount}&accountName=${encodeURIComponent(bankInfo.accountName)}&addInfo=SEVQR%20WEB%20T${feeData.month}%20${displayName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toUpperCase()}`}
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
    }

    // 4. Nếu đã đóng phí hợp lệ -> Render toàn bộ App bình thường
    return <>{children}</>;
};

export default MaintenanceFeeBlocker;
