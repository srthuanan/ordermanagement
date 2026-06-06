import React, { useState, useEffect } from 'react';
import * as apiService from '../../services/apiService';
import { submitCarInquiry, getCarInquiries, markInquiryAsRead, deleteCarInquiry } from '../../services/apiService';
import { CarInquiry } from '../../types';
import Button from '../ui/Button';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
import { versionsMap, defaultExteriors, defaultInteriors, interiorColorRules, getAvailableExteriors } from '../../constants';
import moment from 'moment';

interface CarInquiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: { name: string, email: string };
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info') => void;
}

// Define persistent state outside of the component to keep data when modal closes
let persistentFormData = {
    model: '',
    version: '',
    exterior_color: '',
    interior_color: ''
};

const CarInquiryModal: React.FC<CarInquiryModalProps> = ({ isOpen, onClose, currentUser, showToast }) => {
    const [formData, setFormData] = useState(persistentFormData);
    
    const [availableExteriors, setAvailableExteriors] = useState<string[]>(defaultExteriors);
    const [availableInteriors, setAvailableInteriors] = useState<string[]>(defaultInteriors);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [history, setHistory] = useState<CarInquiry[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Sync local state to persistent storage
    useEffect(() => {
        persistentFormData = formData;
    }, [formData]);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    // Cascading logic for Version and Colors
    useEffect(() => {
        const { model, version } = formData;
        
        if (model) {
            const versions = versionsMap[model as keyof typeof versionsMap] || [];
            if (versions.length === 1 && formData.version !== versions[0]) {
                setFormData(prev => ({ ...prev, version: versions[0] }));
            }

            setAvailableExteriors(getAvailableExteriors(model, version));
        } else {
            setAvailableExteriors(defaultExteriors);
        }

        if (!model) {
            setAvailableInteriors(defaultInteriors);
        } else {
            const lowerModel = model.toLowerCase();
            const lowerVersion = version.toLowerCase();
            let interiors = defaultInteriors;
            for (const rule of interiorColorRules) {
                if (rule.models.includes(lowerModel) && (!rule.versions || rule.versions.includes(lowerVersion))) {
                    interiors = rule.colors;
                    break;
                }
            }
            setAvailableInteriors(interiors);
            if (interiors.length === 1 && formData.interior_color !== interiors[0]) {
                setFormData(prev => ({ ...prev, interior_color: interiors[0] }));
            }
        }
    }, [formData.model, formData.version]);

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const data = await getCarInquiries(currentUser.email);
            setHistory(data);
            
            const unreadIds = data.filter(i => !i.is_read_by_tvbh && (i.status === 'manual_responded' || i.status === 'auto_found')).map(i => i.id);
            for (const id of unreadIds) {
                markInquiryAsRead(id, 'tvbh');
            }
        } catch (error) {
            console.error("Error fetching inquiry history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    if (!isOpen) return null;

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'model') {
                newState.version = '';
                newState.exterior_color = '';
                newState.interior_color = '';
            }
            if (name === 'version') {
                newState.exterior_color = '';
                newState.interior_color = '';
            }
            return newState;
        });
    };

    const handleDeleteInquiry = async (id: string) => {
        try {
            const res = await deleteCarInquiry(id);
            if (res.status === 'SUCCESS') {
                fetchHistory();
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (error: any) {
            showToast('Lỗi', error.message, 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.model || !formData.version || !formData.exterior_color || !formData.interior_color) {
            showToast('Lỗi', 'Vui lòng chọn đầy đủ thông tin.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await submitCarInquiry({
                tvbh_name: currentUser.name,
                tvbh_email: currentUser.email,
                ...formData
            });

            if (res.status === 'SUCCESS') {
                showToast('Thành công', res.message, 'success');
                setFormData({ model: '', version: '', exterior_color: '', interior_color: '' });
                fetchHistory(); 
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (error: any) {
            showToast('Lỗi', error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'auto_found': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'manual_responded': return 'text-blue-600 bg-blue-50 border-blue-100';
            case 'pending': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'auto_checking': return 'text-amber-600 bg-amber-50 border-amber-100 animate-pulse';
            case 'held': return 'text-purple-600 bg-purple-50 border-purple-100';
            default: return 'text-slate-500 bg-slate-50 border-slate-100';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'auto_found': return 'Đã tìm thấy';
            case 'manual_responded': return 'Đã phản hồi';
            case 'pending': return 'Đang chờ';
            case 'auto_checking': return 'Admin đang check';
            case 'held': return 'Đã giữ xe';
            default: return status;
        }
    };

    const availableVersions = formData.model ? (versionsMap[formData.model as keyof typeof versionsMap] || []) : [];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Standard Header */}
                <header className="px-10 py-7 flex items-center justify-between border-b border-slate-50 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Hỏi Tra Cứu Kho</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Yêu cầu kiểm tra xe và nhận phản hồi từ Admin</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all font-bold"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </header>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
                    
                    {/* LEFT: Inquiry Section */}
                    <section className="w-full md:w-5/12 p-8 overflow-y-auto custom-scrollbar border-r border-slate-50 bg-slate-50/20">
                        <div className="sticky top-0 bg-white/0 backdrop-blur-sm z-10 -mx-8 px-8 pb-6 mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                                    <i className="fas fa-search-plus"></i>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Tạo yêu cầu mới</h3>
                            </div>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block ml-1">Dòng xe</label>
                                    <MultiSelectDropdown
                                        id="model" label="Dòng xe" placeholder="Chọn dòng xe..."
                                        options={Object.keys(versionsMap)}
                                        selectedOptions={formData.model ? [formData.model] : []}
                                        onChange={(s) => handleSelectChange('model', s[0] || '')}
                                        icon="fa-car" selectionMode="single" variant="modern" searchable={false}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block ml-1">Phiên bản</label>
                                    <MultiSelectDropdown
                                        id="version" label="Phiên bản" placeholder="Chọn phiên bản..."
                                        options={availableVersions}
                                        selectedOptions={formData.version ? [formData.version] : []}
                                        onChange={(s) => handleSelectChange('version', s[0] || '')}
                                        icon="fa-code-branch" selectionMode="single" variant="modern" searchable={false}
                                        disabled={!formData.model}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-600 block ml-1">Ngoại thất</label>
                                        <MultiSelectDropdown
                                            id="exterior_color" label="Ngoại thất" placeholder="Màu sơn..."
                                            options={availableExteriors}
                                            selectedOptions={formData.exterior_color ? [formData.exterior_color] : []}
                                            onChange={(s) => handleSelectChange('exterior_color', s[0] || '')}
                                            icon="fa-fill-drip" selectionMode="single" variant="modern" searchable={false}
                                            disabled={!formData.version}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-600 block ml-1">Nội thất</label>
                                        <MultiSelectDropdown
                                            id="interior_color" label="Nội thất" placeholder="Màu ghế..."
                                            options={availableInteriors}
                                            selectedOptions={formData.interior_color ? [formData.interior_color] : []}
                                            onChange={(s) => handleSelectChange('interior_color', s[0] || '')}
                                            icon="fa-couch" selectionMode="single" variant="modern" searchable={false}
                                            disabled={!formData.version}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <Button
                                    type="submit" variant="primary" isLoading={isSubmitting}
                                    className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white py-4 h-auto text-sm font-bold rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <span>Gửi yêu cầu kiểm tra</span>
                                    <i className="fas fa-paper-plane text-xs"></i>
                                </Button>
                                <p className="text-center text-xs text-slate-400 mt-4 px-4 italic leading-relaxed">
                                    Yêu cầu sẽ được chuyển đến Admin kho để kiểm tra tình trạng xe.
                                </p>
                            </div>
                        </form>
                    </section>

                    {/* RIGHT: History Section */}
                    <section className="w-full md:w-7/12 p-8 overflow-y-auto custom-scrollbar bg-white">
                        <div className="sticky top-0 bg-white z-10 -mx-8 px-8 pb-6 mb-2 flex items-center justify-between border-b border-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                                    <i className="fas fa-history"></i>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Lịch sử yêu cầu</h3>
                            </div>
                            {history.length > 0 && (
                                <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-slate-100">
                                    {history.length} mục
                                </span>
                            )}
                        </div>

                        <div className="space-y-5">
                            {isLoadingHistory ? (
                                <div className="py-20 text-center text-slate-300">
                                    <i className="fas fa-spinner fa-spin text-2xl mb-3"></i>
                                    <p className="text-sm font-medium">Đang tải dữ liệu...</p>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="py-20 text-center border-2 border-dashed border-slate-50 rounded-3xl">
                                    <i className="fas fa-inbox text-4xl text-slate-100 mb-4 block"></i>
                                    <p className="text-slate-400 text-sm font-bold">Bạn chưa gởi yêu cầu tra cứu nào.</p>
                                </div>
                            ) : (
                                history.map(item => (
                                    <div key={item.id} className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-base font-bold text-slate-900 tracking-tight">{item.model} {item.version}</h4>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-xs text-slate-500 font-medium italic">{item.exterior_color}</span>
                                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                    <span className="text-xs text-slate-500 font-medium italic">{item.interior_color}</span>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold border shadow-sm ${getStatusStyle(item.status)}`}>
                                                {getStatusLabel(item.status)}
                                            </div>
                                        </div>

                                        {(item.admin_response || item.matched_vin) && (
                                            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100/50">
                                                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                    <i className="fas fa-reply-all"></i> Phản hồi từ Admin
                                                </div>
                                                <p className="text-xs text-slate-700 leading-relaxed font-semibold italic">
                                                    "{item.admin_response || "Đã tìm thấy xe phù hợp trong kho."}"
                                                </p>
                                                {item.matched_vin && (
                                                    <div className="mt-3 flex flex-col gap-2">
                                                        <div className="overflow-hidden bg-white/60 rounded-lg border border-white p-2.5 flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">VIN Khớp:</span>
                                                            <span className="text-xs font-black text-slate-900 font-mono italic tracking-wider">{item.matched_vin}</span>
                                                        </div>
                                                        
                                                        {item.status !== 'held' && (
                                                            <button
                                                                onClick={async () => {
                                                                    const res = await apiService.holdCar(item.matched_vin!);
                                                                    if (res.status === 'SUCCESS') {
                                                                        showToast('Thành công', 'Đã giữ xe thành công!', 'success');
                                                                        // Tự động xóa yêu cầu sau khi giữ xe thành công
                                                                        await apiService.deleteCarInquiry(item.id);
                                                                        fetchHistory();
                                                                    } else {
                                                                        showToast('Lỗi', res.message, 'error');
                                                                    }
                                                                }}
                                                                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                                                            >
                                                                <i className="fas fa-lock"></i>
                                                                GIỮ XE NGAY (24H)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <i className="far fa-calendar-alt opacity-50"></i>
                                                    {moment(item.created_at).format('DD/MM/YYYY')}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <i className="far fa-clock opacity-50"></i>
                                                    {moment(item.created_at).format('HH:mm')}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteInquiry(item.id)}
                                                className="w-7 h-7 rounded-full bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center group"
                                                title="Xóa yêu cầu"
                                            >
                                                <i className="fas fa-trash-alt text-[9px] group-active:scale-90"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <footer className="px-10 py-5 bg-slate-50/50 flex justify-end gap-3 border-t border-slate-100 flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors uppercase tracking-widest"
                    >
                        Đóng
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default CarInquiryModal;
