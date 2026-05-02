import React, { useState, useEffect } from 'react';
import { Policy, policyAdminService } from '../../services/api/policyAdminService';
import Button from '../ui/Button';

interface SelectPolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (policyName: string) => void;
    currentPolicy?: string;
    carModel?: string;
}

const SelectPolicyModal: React.FC<SelectPolicyModalProps> = ({ isOpen, onClose, onSelect, currentPolicy, carModel }) => {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNames, setSelectedNames] = useState<string[]>([]);
    const [showOnlyMatchModel, setShowOnlyMatchModel] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const fetchPolicies = async () => {
                setLoading(true);
                const { status, data } = await policyAdminService.getAllPolicies();
                if (status === 'SUCCESS' && data) {
                    setPolicies(data.filter(p => p.trang_thai === 'Hoạt động'));
                }
                setLoading(false);
            };
            fetchPolicies();

            // Initialize selected names
            if (currentPolicy) {
                setSelectedNames(currentPolicy.split('; ').map(s => s.trim()).filter(Boolean));
            } else {
                setSelectedNames([]);
            }
        }
    }, [isOpen, currentPolicy]);

    if (!isOpen) return null;

    const togglePolicy = (name: string) => {
        setSelectedNames(prev => 
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const handleConfirm = () => {
        onSelect(selectedNames.join('; '));
        onClose();
    };

    let filteredPolicies = policies.filter(p => 
        p.ten_chinh_sach.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.dong_xe || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter by car model if requested
    if (showOnlyMatchModel && carModel) {
        filteredPolicies = filteredPolicies.filter(p => {
            if (!p.dong_xe || p.dong_xe.trim() === '' || p.dong_xe.toLowerCase().includes('tất cả')) return true;
            const modelLower = carModel.toLowerCase();
            const policyModelLower = p.dong_xe.toLowerCase();
            return policyModelLower.includes(modelLower) || modelLower.includes(policyModelLower);
        });
    }

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
            <div 
                className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-white">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Chọn Chính Sách</h2>
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                            Dòng xe: <span className="text-slate-800">{carModel || 'Tất cả'}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                {/* Filters & Search */}
                <div className="p-4 border-b border-gray-50 bg-gray-50/30 space-y-3">
                    <div className="relative group">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amber-500 transition-colors text-xs"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm chính sách..."
                            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    {carModel && (
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] font-bold text-slate-500">Lọc theo dòng xe {carModel}</span>
                            <button 
                                onClick={() => setShowOnlyMatchModel(!showOnlyMatchModel)}
                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${showOnlyMatchModel ? 'bg-amber-500' : 'bg-slate-200'}`}
                            >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showOnlyMatchModel ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 min-h-[300px] custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 space-y-4">
                            <i className="fas fa-spinner fa-spin text-amber-500 text-2xl"></i>
                            <p className="text-xs text-gray-400 font-medium">Đang tải danh sách...</p>
                        </div>
                    ) : filteredPolicies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
                                <i className="fas fa-scroll text-gray-200 text-2xl"></i>
                            </div>
                            <p className="text-sm font-bold text-gray-600">Không tìm thấy chính sách</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {showOnlyMatchModel ? 'Thử tắt "Lọc theo dòng xe" để xem tất cả' : 'Vui lòng thử từ khóa khác hoặc liên hệ Admin'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredPolicies.map(policy => {
                                const isSelected = selectedNames.includes(policy.ten_chinh_sach);
                                return (
                                    <div
                                        key={policy.ten_chinh_sach}
                                        onClick={() => togglePolicy(policy.ten_chinh_sach)}
                                        className={`group px-4 py-3 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden ${
                                            isSelected 
                                            ? 'bg-amber-50 border-amber-200 shadow-sm' 
                                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3 relative z-10">
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-sm font-bold mb-0.5 ${isSelected ? 'text-amber-700' : 'text-slate-700'}`}>
                                                    {policy.ten_chinh_sach}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {policy.dong_xe && (
                                                        <span className={`text-[10px] font-bold flex items-center gap-1 ${policy.dong_xe.toLowerCase().includes(carModel?.toLowerCase() || '') ? 'text-green-600' : 'text-purple-500'}`}>
                                                            <i className="fas fa-car text-[8px]"></i> {policy.dong_xe}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                        <i className="far fa-calendar-alt text-[8px]"></i> {policy.han_su_dung || 'Không giới hạn'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                                isSelected 
                                                ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20 scale-110' 
                                                : 'border-slate-200 bg-white group-hover:border-slate-300'
                                            }`}>
                                                {isSelected && <i className="fas fa-check text-[10px]"></i>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-500">
                        Đã chọn: <span className="text-amber-600">{selectedNames.length}</span> chính sách
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={onClose} variant="secondary" size="sm" className="font-bold">Hủy</Button>
                        <button 
                            onClick={handleConfirm} 
                            disabled={selectedNames.length === 0 && !currentPolicy}
                            className={`px-6 py-1.5 rounded-lg text-[11px] font-black transition-all shadow-md ${
                                selectedNames.length > 0 || currentPolicy
                                ? 'bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600 active:scale-95'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            }`}
                        >
                            Xác nhận
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelectPolicyModal;
