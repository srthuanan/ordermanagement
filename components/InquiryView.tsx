import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as apiService from '../services/apiService';
import { submitCarInquiry, getCarInquiries, markInquiryAsRead, deleteCarInquiry } from '../services/apiService';
import { CarInquiry } from '../types';
import Button from './ui/Button';
import MultiSelectDropdown from './ui/MultiSelectDropdown';
import { versionsMap, defaultExteriors, defaultInteriors, interiorColorRules, VALID_IMAGES_BY_MODEL } from '../constants';
import moment from 'moment';
import AnimatedBackground from './ui/AnimatedBackground';
import CarImage from './ui/CarImage';
import StatusBadge from './ui/StatusBadge';

interface CarInquiryViewProps {
    currentUser: { name: string, email: string };
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info') => void;
    initialInquiryId?: string;
    onProcessed?: () => void;
}

const CarInquiryView: React.FC<CarInquiryViewProps> = ({ currentUser, showToast, initialInquiryId, onProcessed }) => {
    // --- State ---
    const [formData, setFormData] = useState({
        model: '',
        version: '',
        exterior_color: '',
        interior_color: ''
    });

    const [availableExteriors, setAvailableExteriors] = useState<string[]>(defaultExteriors);
    const [availableInteriors, setAvailableInteriors] = useState<string[]>(defaultInteriors);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [history, setHistory] = useState<CarInquiry[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Layout State
    const [selectedFolder, setSelectedFolder] = useState<'all' | 'pending' | 'found'>('all');
    const [selectedInquiryId, setSelectedInquiryId] = useState<string | 'new' | null>(null);
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');

    // Chat logic (input state)
    const [newComment, setNewComment] = useState('');
    const [isSendingComment, setIsSendingComment] = useState(false);
    const selectedInquiry = useMemo(() => {
        if (selectedInquiryId === 'new') return null;
        return history.find(h => h.id === selectedInquiryId);
    }, [history, selectedInquiryId]);

    const chatContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (selectedInquiryId && selectedInquiryId !== 'new' && selectedInquiry?.chat_history) {
            // Scroll to bottom when history changes or inquiry changes
            setTimeout(scrollToBottom, 100);
        }
    }, [selectedInquiry?.chat_history?.length, selectedInquiryId]);

    // --- Data Fetching ---
    // Auto-select inquiry from notification or external link
    useEffect(() => {
        if (initialInquiryId === 'new') {
            setSelectedInquiryId('new');
            setMobileView('detail');
            setSelectedFolder('all');
            if (onProcessed) onProcessed();
            return;
        }

        if (initialInquiryId && history.length > 0) {
            const inquiry = history.find(i => i.id === initialInquiryId);
            if (inquiry) {
                setSelectedInquiryId(inquiry.id);
                setMobileView('detail');
                setSelectedFolder('all');

                if (!inquiry.is_read_by_tvbh) {
                    markInquiryAsRead(inquiry.id, 'tvbh');
                    setHistory(prev => prev.map(item => item.id === inquiry.id ? { ...item, is_read_by_tvbh: true } : item));
                }
            }
            if (onProcessed) onProcessed();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialInquiryId, history.length]);

    useEffect(() => {
        fetchHistory();

        // --- REALTIME SUBSCRIPTION ---
        const channel = apiService.supabase
            .channel('car_inquiries_tvbh_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'car_inquiries' },
                (payload: any) => {
                    console.log('Car Inquiry Update (TVBH Side):', payload);
                    fetchHistory();
                }
            )
            .subscribe();

        return () => {
            apiService.supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchHistory = async () => {
        if (!currentUser.email) return;
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

    // --- Formatting & Helpers ---
    const getInquiryStatus = (status: string) => {
        switch (status) {
            case 'auto_found': return 'Đã tìm thấy';
            case 'manual_responded': return 'Admin phản hồi';
            case 'pending': return 'Đang chờ';
            case 'auto_checking': return 'Admin đang check';
            case 'held': return 'Đã giữ xe';
            default: return status;
        }
    };

    // Filtered History
    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            if (selectedFolder === 'all') return true;
            if (selectedFolder === 'pending') return item.status === 'pending' || item.status === 'auto_checking';
            if (selectedFolder === 'found') return item.status === 'auto_found' || item.status === 'manual_responded';
            return true;
        });
    }, [history, selectedFolder]);



    // Cascading logic for Version and Colors
    useEffect(() => {
        const { model, version } = formData;
        if (model) {
            const modelKey = model.toLowerCase().replace(/\s+/g, '');
            const validCodes = VALID_IMAGES_BY_MODEL[modelKey];
            if (validCodes) {
                const filteredExteriors = defaultExteriors.filter(color => {
                    const match = color.match(/\(([^)]+)\)/);
                    return match && match[1] && validCodes.includes(match[1].toLowerCase());
                });
                setAvailableExteriors(filteredExteriors);
            } else {
                setAvailableExteriors(defaultExteriors);
            }
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

    // --- Actions ---
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

    const handleSubmitInquiry = async (e: React.FormEvent) => {
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
                setSelectedInquiryId(null);
                setMobileView('list');
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (error: any) {
            showToast('Lỗi', error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteInquiry = async (id: string) => {
        try {
            const res = await deleteCarInquiry(id);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', 'Đã xóa yêu cầu.', 'success');
                fetchHistory();
                setSelectedInquiryId(null);
                setMobileView('list');
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (error: any) {
            showToast('Lỗi', error.message, 'error');
        }
    };

    const handleHoldCar = async (inquiry: CarInquiry) => {
        if (!inquiry.matched_vin) return;
        try {
            const res = await apiService.holdCar(inquiry.matched_vin);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', 'Đã giữ xe thành công!', 'success');
                await apiService.deleteCarInquiry(inquiry.id);
                fetchHistory();
                setSelectedInquiryId(null);
                setMobileView('list');
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (error: any) {
            showToast('Lỗi', error.message, 'error');
        }
    };


    const handleSendComment = async () => {
        if (!selectedInquiryId || selectedInquiryId === 'new' || !newComment.trim()) return;
        setIsSendingComment(true);
        try {
            const res = await apiService.addInquiryComment({
                inquiry_id: selectedInquiryId,
                sender_email: currentUser.email,
                sender_name: currentUser.name,
                content: newComment,
                is_admin_comment: false
            });
            if (res.status === 'SUCCESS') {
                setNewComment('');
            }
        } finally {
            setIsSendingComment(false);
        }
    };

    const folders = [
        { id: 'all', label: 'Tất cả yêu cầu', icon: 'fa-layer-group', count: history.length },
        { id: 'pending', label: 'Đang chờ check', icon: 'fa-hourglass-half', count: history.filter(h => h.status === 'pending' || h.status === 'auto_checking').length },
        { id: 'found', label: 'Đã phản hồi', icon: 'fa-check-circle', count: history.filter(h => h.status === 'auto_found' || h.status === 'manual_responded').length },
    ] as const;

    // Navigation handlers
    const handleFolderChange = (id: 'all' | 'pending' | 'found') => {
        setSelectedFolder(id);
        setSelectedInquiryId(null);
        setMobileView('list');
    };

    const handleInquirySelect = (id: string | 'new') => {
        setSelectedInquiryId(id);
        setMobileView('detail');
    };

    const availableVersions = formData.model ? (versionsMap[formData.model as keyof typeof versionsMap] || []) : [];

    return (
        <div className="flex h-full bg-slate-50 md:rounded-xl shadow-md border-0 md:border border-border-primary overflow-hidden animate-fade-in relative z-0">
            <AnimatedBackground />

            {/* Column 1: Sidebar / Folders */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-border-primary bg-surface-ground/90 flex flex-col relative z-10 ${mobileView !== 'folders' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-5 border-b border-border-secondary/50">
                    <Button
                        onClick={() => handleInquirySelect('new')}
                        variant="primary"
                        className="w-full flex items-center justify-center gap-2 py-3 shadow-lg shadow-accent-primary/20"
                        leftIcon={<i className="fas fa-plus-circle"></i>}
                    >
                        TẠO YÊU CẦU MỚI
                    </Button>
                </div>

                <div className="flex-1 p-2 space-y-1 overflow-y-auto">
                    <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh mục</div>
                    {folders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => handleFolderChange(folder.id)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                                selectedFolder === folder.id 
                                ? 'bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/20' 
                                : 'text-slate-500 hover:bg-white hover:text-slate-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <i className={`fas ${folder.icon} w-5 text-center ${selectedFolder === folder.id ? 'text-accent-primary' : 'text-slate-400'}`}></i>
                                <span>{folder.label}</span>
                            </div>
                            {folder.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedFolder === folder.id ? 'bg-accent-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {folder.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>


            </div>

            {/* Column 2: List */}
            <div className={`w-full md:w-80 flex-shrink-0 border-r border-border-primary flex flex-col bg-white/95 relative z-10 ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                <div className="md:hidden p-4 bg-white border-b border-border-secondary flex items-center gap-3">
                    <button onClick={() => setMobileView('folders')} className="w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100">
                        <i className="fas fa-chevron-left text-slate-500"></i>
                    </button>
                    <span className="font-black text-slate-800 uppercase tracking-tight">Tra cứu kho xe</span>
                </div>

                <header className="px-5 py-4 border-b border-border-secondary/30 flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                        {folders.find(f => f.id === selectedFolder)?.label || 'Yêu cầu'}
                    </h3>
                    <button onClick={fetchHistory} className={`p-1.5 text-slate-400 hover:text-accent-primary transition-colors ${isLoadingHistory ? 'animate-spin' : ''}`}>
                        <i className="fas fa-sync-alt text-xs"></i>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                    {filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 px-10 text-center animate-fade-in">
                            <div className="w-20 h-20 bg-slate-50 rounded-[1.8rem] flex items-center justify-center text-slate-200 mb-6 border border-slate-100/50">
                                <i className="fas fa-search text-3xl opacity-20"></i>
                            </div>
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                                Bạn chưa có yêu cầu nào trong mục này
                            </h4>
                        </div>
                    ) : (
                        <div className="space-y-1 px-2">
                            {filteredHistory.map(item => {
                                const isSelected = selectedInquiryId === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleInquirySelect(item.id)}
                                        className={`group px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-300 relative border ${
                                            isSelected 
                                            ? 'bg-accent-primary/[0.03] border-accent-primary shadow-sm' 
                                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`text-[13px] font-black truncate tracking-tight uppercase ${isSelected ? 'text-accent-primary' : 'text-slate-800'}`}>{item.model}</h4>
                                                <p className={`text-[10px] font-bold truncate ${isSelected ? 'text-accent-primary/60' : 'text-slate-400'}`}>{item.version}</p>
                                            </div>
                                            {!isSelected && (
                                                <div className={`w-2 h-2 rounded-full ${item.status === 'auto_found' || item.status === 'manual_responded' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : (item.status === 'pending' || item.status === 'auto_checking' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-slate-300')}`}></div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <div className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition-colors ${isSelected ? 'bg-accent-primary/10 border-accent-primary/20 text-accent-primary' : 'bg-slate-100 border-slate-200/50 text-slate-500'}`}>{item.exterior_color}</div>
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-accent-primary/40' : 'text-slate-300'}`}>{moment(item.created_at).format('HH:mm DD/MM')}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Detail / Form */}
            <div className={`flex-1 flex flex-col bg-surface-ground/90 relative z-10 ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {selectedInquiryId === 'new' ? (
                    /* NEW INQUIRY FORM */
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <header className="px-6 py-4 bg-white border-b border-border-primary flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setMobileView('list')} className="md:hidden w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100">
                                    <i className="fas fa-chevron-left text-slate-500"></i>
                                </button>
                                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Yêu cầu mới</h2>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 flex items-center justify-center bg-slate-50/50">
                            <div className="w-full max-w-[800px] bg-white rounded-[2rem] shadow-sm border border-slate-100/60 p-8 sm:p-12 lg:p-16 animate-fade-in-up">
                                <div className="text-center mb-12">
                                    <div className="w-16 h-16 bg-[#eef2f9] rounded-[1.25rem] flex items-center justify-center text-[#1e40af] mx-auto mb-6 transition-transform hover:scale-105">
                                        <i className="fas fa-paper-plane text-2xl -rotate-12 translate-x-[-1px] translate-y-[-1px]"></i>
                                    </div>
                                    <h3 className="text-[22px] font-black text-slate-800 tracking-tight uppercase mb-2">Cấu hình xe cần tìm</h3>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Hệ thống sẽ tự động thông báo khi có xe phù hợp</p>
                                </div>

                                <form onSubmit={handleSubmitInquiry} className="space-y-10 max-w-[600px] mx-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Dòng xe</label>
                                            <div className="border border-transparent hover:border-slate-100 rounded-xl transition-colors">
                                                <MultiSelectDropdown
                                                    id="model" label="Dòng xe" placeholder="Chọn dòng xe..."
                                                    options={Object.keys(versionsMap)}
                                                    selectedOptions={formData.model ? [formData.model] : []}
                                                    onChange={(s) => handleSelectChange('model', s[0] || '')}
                                                    icon="fa-car" selectionMode="single" variant="modern" searchable={false}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Phiên bản</label>
                                            <div className="border border-transparent hover:border-slate-100 rounded-xl transition-colors">
                                                <MultiSelectDropdown
                                                    id="version" label="Phiên bản" placeholder="Chọn phiên bản..."
                                                    options={availableVersions}
                                                    selectedOptions={formData.version ? [formData.version] : []}
                                                    onChange={(s) => handleSelectChange('version', s[0] || '')}
                                                    icon="fa-code-branch" selectionMode="single" variant="modern" searchable={false}
                                                    disabled={!formData.model}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Ngoại thất</label>
                                            <div className="border border-transparent hover:border-slate-100 rounded-xl transition-colors">
                                                <MultiSelectDropdown
                                                    id="exterior_color" label="Ngoại thất" placeholder="Màu sơn..."
                                                    options={availableExteriors}
                                                    selectedOptions={formData.exterior_color ? [formData.exterior_color] : []}
                                                    onChange={(s) => handleSelectChange('exterior_color', s[0] || '')}
                                                    icon="fa-palette" selectionMode="single" variant="modern" searchable={false}
                                                    disabled={!formData.version}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Nội thất</label>
                                            <div className="border border-transparent hover:border-slate-100 rounded-xl transition-colors">
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
                                            className="w-full py-4 text-xs font-black tracking-widest uppercase rounded-[1rem] bg-[#f0f4fa] hover:bg-[#e2e8f0] text-[#1e40af] border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all duration-300 flex justify-center items-center gap-2 group"
                                        >
                                            GỬI YÊU CẦU NGAY
                                            <i className="fas fa-paper-plane text-[10px] opacity-70 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all"></i>
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                ) : selectedInquiry ? (
                    /* INQUIRY DETAIL VIEW */
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <header className="px-4 py-3 sm:px-6 sm:py-4 bg-white border-b border-border-primary flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                <button onClick={() => setMobileView('list')} className="md:hidden w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100 transition-colors">
                                    <i className="fas fa-arrow-left text-slate-500 text-sm"></i>
                                </button>
                                <div className="min-w-0">
                                    <h2 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight truncate">{selectedInquiry.model}</h2>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{selectedInquiry.version}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <StatusBadge status={getInquiryStatus(selectedInquiry.status)} size="sm" />
                                <button
                                    onClick={() => handleDeleteInquiry(selectedInquiry.id)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100/50"
                                    title="Xóa yêu cầu"
                                >
                                    <i className="fas fa-trash-alt text-[10px]"></i>
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden border-t border-slate-100 bg-white">
                            {/* LEFT COLUMN: Car Details & System Response */}
                            <div className="lg:w-2/5 p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4 sm:gap-6">
                                {/* Car Config Table-like Section */}
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                        <i className="fas fa-car text-slate-400 text-[10px]"></i>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Thông số yêu cầu</span>
                                    </div>
                                    <div className="p-3 sm:p-4 grid grid-cols-2 gap-x-4 gap-y-2">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tight">Dòng xe</span>
                                            <span className="text-[11px] sm:text-xs font-black text-slate-800 italic truncate">{selectedInquiry.model}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tight">Phiên bản</span>
                                            <span className="text-[11px] sm:text-xs font-black text-blue-600 truncate">{selectedInquiry.version}</span>
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

                                {/* System Response & Action */}
                                <div className={`rounded-xl border overflow-hidden shadow-sm ${selectedInquiry.matched_vin ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <div className={`px-3 py-2 border-b flex items-center justify-between ${selectedInquiry.matched_vin ? 'bg-emerald-100/50 border-emerald-200' : 'bg-amber-100/50 border-amber-200'}`}>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${selectedInquiry.matched_vin ? 'text-emerald-700' : 'text-amber-700'}`}>Phản hồi kho xe</span>
                                        <i className={`fas ${selectedInquiry.matched_vin ? 'fa-check-circle text-emerald-600' : 'fa-hourglass-start text-amber-500'} text-xs`}></i>
                                    </div>
                                    <div className="p-3 sm:p-4">
                                        {selectedInquiry.matched_vin ? (
                                            <div className="space-y-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="text-lg sm:text-xl font-black text-emerald-900 font-mono tracking-widest">{selectedInquiry.matched_vin}</div>
                                                    <div className="text-[8px] font-bold text-emerald-600 uppercase mt-0.5 italic text-center">Đã tìm thấy xe phù hợp</div>
                                                </div>
                                                
                                                {selectedInquiry.status !== 'held' && (
                                                    <button
                                                        onClick={() => handleHoldCar(selectedInquiry)}
                                                        className="w-full py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] flex flex-col items-center justify-center font-black"
                                                    >
                                                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                                                            <i className="fas fa-lock text-[10px]"></i>
                                                            <span>GIỮ XE NGAY (24H)</span>
                                                        </div>
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-2 sm:py-4">
                                                <p className="text-xs sm:text-sm font-black text-amber-900 leading-tight">
                                                    {selectedInquiry.admin_response || "Hệ thống đang rà soát dữ liệu..."}
                                                </p>
                                                <p className="text-[8px] sm:text-[9px] text-amber-600 font-bold mt-1 uppercase tracking-tight opacity-70">
                                                    BẠN SẼ NHẬN ĐƯỢC THÔNG BÁO KHI CÓ XE
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="mt-2 sm:mt-auto">
                                    <CarImage
                                        model={selectedInquiry.model}
                                        exteriorColor={selectedInquiry.exterior_color}
                                        className="h-24 sm:h-32 w-auto object-contain drop-shadow-2xl mx-auto motion-safe:animate-pulse duration-[3s]"
                                    />
                                </div>
                            </div>
                            {/* RIGHT COLUMN: Chat Area */}
                            <div className="lg:w-3/5 flex flex-col border-l border-slate-200 bg-slate-50/30 p-4 sm:p-6 overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trao đổi nội bộ</label>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-full shadow-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                        <span className="text-[8px] font-black text-slate-500 uppercase italic">Kết nối Admin</span>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div 
                                        ref={chatContainerRef}
                                        className="flex-1 space-y-3 sm:space-y-4 mb-4 sm:mb-6 overflow-y-auto px-1 custom-scrollbar flex flex-col pt-1 sm:pt-2 scroll-smooth"
                                    >
                                        {(!selectedInquiry.chat_history || selectedInquiry.chat_history.filter((c: any) => !c.telegram_thread_id).length === 0) ? (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                                                <i className="fas fa-comments text-4xl opacity-20"></i>
                                                <p className="text-sm">Chưa có trao đổi nào.</p>
                                            </div>
                                        ) : (
                                            selectedInquiry.chat_history.filter((c: any) => !c.telegram_thread_id).map((comment: any) => (
                                                <div key={comment.id} className={`flex flex-col ${comment.sender_email === currentUser.email ? 'items-end' : 'items-start'}`}>
                                                    <div className={`flex items-end gap-2 max-w-[90%] ${comment.sender_email === currentUser.email ? 'flex-row-reverse' : 'flex-row'}`}>
                                                        <div className={`px-4 py-2.5 rounded-2xl text-xs ${
                                                            comment.sender_email === currentUser.email 
                                                            ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-500/10' 
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

                                    <div className="space-y-3 pt-2 sm:pt-3 border-t border-slate-100">
                                        <div className="relative">
                                            <textarea
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl min-h-[46px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium placeholder:text-slate-300 resize-none shadow-sm"
                                                placeholder="Nhập nội dung trao đổi..."
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        if (newComment.trim()) handleSendComment();
                                                    }
                                                }}
                                                rows={1}
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <Button
                                                variant="primary"
                                                onClick={handleSendComment}
                                                isLoading={isSendingComment}
                                                disabled={!newComment.trim()}
                                                className="bg-blue-600 border-none px-6 py-1.5 h-auto text-[10px] font-black rounded-lg shadow-lg shadow-blue-600/10 text-white"
                                            >
                                                GỬI CHAT
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* SIMPLIFIED EMPTY STATE */
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/20">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 text-slate-300">
                            <i className="fas fa-mouse-pointer text-xl opacity-20"></i>
                        </div>
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Chọn yêu cầu để xem</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 text-center max-w-[200px] uppercase tracking-widest leading-relaxed">
                            Vui lòng chọn một yêu cầu từ danh sách để bắt đầu.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CarInquiryView;
