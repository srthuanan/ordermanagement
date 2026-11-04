import React, { useState, useEffect } from 'react';
import { getAppSetting, updateAppSetting } from '../../services/apiService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, desc: string, type: 'success' | 'error' | 'info') => void;
}

const BankConfigModal: React.FC<Props> = ({ isOpen, onClose, showToast }) => {
    const [bankId, setBankId] = useState('');
    const [accountNo, setAccountNo] = useState('');
    const [accountName, setAccountName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadConfig();
        }
    }, [isOpen]);

    const loadConfig = async () => {
        try {
            const res = await getAppSetting('admin_bank_info');
            if (res.data && res.data.bankId) {
                setBankId(res.data.bankId || '');
                setAccountNo(res.data.accountNo || '');
                setAccountName(res.data.accountName || '');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateAppSetting('admin_bank_info', {
                bankId,
                accountNo,
                accountName
            });
            showToast('Thành công', 'Đã lưu cấu hình thanh toán', 'success');
            onClose();
        } catch (err: any) {
            showToast('Lỗi', err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[440px] overflow-hidden flex flex-col relative">
                {/* Subtle top accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
                
                <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center ring-4 ring-blue-50/50">
                            <i className="fas fa-university"></i>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Cấu Hình Thanh Toán</h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <div className="p-6 space-y-5">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 rounded-2xl border border-blue-100/50">
                        <p className="text-[13px] text-blue-800/80 leading-relaxed flex gap-2">
                            <i className="fas fa-info-circle mt-0.5 text-blue-600"></i>
                            <span>Thông tin này sẽ được dùng để tạo mã VietQR tự động trên màn hình khóa của TVBH.</span>
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Mã Ngân Hàng <span className="text-slate-400 font-normal lowercase">(Tên viết tắt)</span></label>
                            <input 
                                type="text" 
                                value={bankId}
                                onChange={e => setBankId(e.target.value.toUpperCase())}
                                placeholder="VD: VCB, MB, TCB, VPB..." 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-[15px] transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Số Tài Khoản</label>
                            <input 
                                type="text" 
                                value={accountNo}
                                onChange={e => setAccountNo(e.target.value)}
                                placeholder="Nhập số tài khoản..." 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-[15px] font-mono transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Tên Chủ Tài Khoản</label>
                            <input 
                                type="text" 
                                value={accountName}
                                onChange={e => setAccountName(e.target.value.toUpperCase())}
                                placeholder="VD: NGUYEN VAN A" 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-[15px] transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                        <button 
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-500 font-medium hover:bg-slate-50 rounded-xl text-[14px] transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-[14px] font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100"
                        >
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                            Lưu Cấu Hình
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BankConfigModal;
