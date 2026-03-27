import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabaseAdmin } from '../../services/supabaseClient';
import { policyAdminService, Policy, normalizePolicyName } from '../../services/api/policyAdminService';
import AnimatedBackground from '../ui/AnimatedBackground';
import Button from '../ui/Button';

export const PolicyManagementView: React.FC<{showToast: any}> = ({showToast}) => {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFolder, setSelectedFolder] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPolicyName, setSelectedPolicyName] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // For the form (Create/Edit)
    const [editData, setEditData] = useState<Policy>({ ten_chinh_sach: '', trang_thai: 'Hoạt động', han_su_dung: '' });
    const [isAiScanning, setIsAiScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // AI Review mode (inline, no modal)
    const [aiReviewMode, setAiReviewMode] = useState(false);
    const [pendingAiPolicies, setPendingAiPolicies] = useState<any[]>([]);
    const [selectedAiIndices, setSelectedAiIndices] = useState<Set<number>>(new Set());

    // Mobile View State
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');

    const fetchPolicies = async () => {
        setLoading(true);
        const { status, data, message } = await policyAdminService.getAllPolicies();
        if (status === 'SUCCESS' && data) {
            setPolicies(data);
            if (data.length > 0 && !selectedPolicyName) {
                setSelectedPolicyName(data[0].ten_chinh_sach);
            }
        } else {
            showToast('Lỗi', message || 'Lỗi tải danh sách chính sách', 'error');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPolicies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const folders = [
        { id: 'all', label: 'Tất Cả Chính Sách', icon: 'fa-list', count: policies.length },
        { id: 'active', label: 'Đang Hoạt Động', icon: 'fa-check-circle', count: policies.filter(p => p.trang_thai === 'Hoạt động').length },
        { id: 'inactive', label: 'Ngừng Hoạt Động', icon: 'fa-times-circle', count: policies.filter(p => p.trang_thai === 'Ngừng hoạt động').length },
    ];

    const filteredPolicies = useMemo(() => {
        return policies.filter(p => {
            if (selectedFolder === 'active' && p.trang_thai !== 'Hoạt động') return false;
            if (selectedFolder === 'inactive' && p.trang_thai !== 'Ngừng hoạt động') return false;
            
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const titleMatch = p.ten_chinh_sach.toLowerCase().includes(q);
                const modelMatch = (p.dong_xe || '').toLowerCase().includes(q);
                if (!titleMatch && !modelMatch) return false;
            }
            
            return true;
        });
    }, [policies, selectedFolder, searchQuery]);

    useEffect(() => {
        if (filteredPolicies.length > 0 && (!selectedPolicyName || !filteredPolicies.find(p => p.ten_chinh_sach === selectedPolicyName))) {
            setSelectedPolicyName(filteredPolicies[0].ten_chinh_sach);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFolder]);

    const handleFolderChange = (folder: string) => {
        setSelectedFolder(folder);
        setMobileView('list');
    };

    const selectedPolicy = policies.find(p => p.ten_chinh_sach === selectedPolicyName) || null;

    const handleSelectPolicy = (name: string | null) => {
        setSelectedPolicyName(name);
        setIsEditing(false);
        setAiReviewMode(false);
        if (name) setMobileView('detail');
    };

    const handleStartCreate = () => {
        setEditData({ ten_chinh_sach: '', trang_thai: 'Hoạt động', han_su_dung: '' });
        setSelectedPolicyName(null);
        setIsEditing(true);
        setAiReviewMode(false);
        setMobileView('detail');
    };

    const handleStartEdit = () => {
        if (selectedPolicy) {
            setEditData({ ...selectedPolicy });
            setIsEditing(true);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (policies.length > 0 && !selectedPolicyName) {
            setSelectedPolicyName(policies[0].ten_chinh_sach);
        } else if (!selectedPolicyName) {
            setMobileView('list');
        }
    };

    const handleSave = async () => {
        if (!editData.ten_chinh_sach.trim()) {
            showToast('Cảnh báo', 'Tên chính sách không được để trống', 'warning');
            return;
        }
        const { status, message } = await policyAdminService.upsertPolicy(editData);
        if (status === 'SUCCESS') {
            showToast('Thành công', message, 'success');
            setIsEditing(false);
            setSelectedPolicyName(editData.ten_chinh_sach);
            fetchPolicies();
        } else {
            showToast('Lỗi', message, 'error');
        }
    };

    const handleDelete = async (ten_chinh_sach: string) => {
        if (!window.confirm(`Bạn có chắc muốn xóa chính sách "${ten_chinh_sach}"?`)) return;
        const { status, message } = await policyAdminService.deletePolicy(ten_chinh_sach);
        if (status === 'SUCCESS') {
            showToast('Thành công', message, 'success');
            if (selectedPolicyName === ten_chinh_sach) {
                setSelectedPolicyName(null);
                setMobileView('list');
            }
            fetchPolicies();
        } else {
            showToast('Lỗi', message, 'error');
        }
    };

    const handleSaveAiPolicies = async () => {
        const toSave = pendingAiPolicies.filter((_, i) => selectedAiIndices.has(i));
        if (toSave.length === 0) {
            showToast('Cảnh báo', 'Vui lòng chọn ít nhất một chính sách để lưu', 'warning');
            return;
        }

        showToast('Đang xử lý', `Đang lưu ${toSave.length} chính sách...`, 'loading');
        let count = 0;
        for (const sub of toSave) {
            const response = await policyAdminService.upsertPolicy(sub);
            if (response.status === 'SUCCESS') count++;
        }
        showToast('Thành công', `Đã lưu ${count}/${toSave.length} chính sách!`, 'success');
        fetchPolicies();
        setIsEditing(false);
        setAiReviewMode(false);
        setPendingAiPolicies([]);
        setSelectedAiIndices(new Set());
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showToast('Lỗi', 'Chỉ hỗ trợ file PDF hoặc Hình ảnh (JPG, PNG)', 'error');
            return;
        }

        setIsAiScanning(true);
        showToast('Đang xử lý', 'AI đang phân tích tài liệu...', 'loading');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64String = (reader.result as string).split(',')[1];
                    
                    const { data: result, error: invokeError } = await supabaseAdmin.functions.invoke('scan-policy', {
                        body: { base64Data: base64String, mimeType: file.type }
                    });

                    if (invokeError) throw invokeError;

                    if (result && result.success && result.data) {
                        const subPolicies = result.data.danh_sach_chinh_sach_con;
                        if (Array.isArray(subPolicies) && subPolicies.length > 0) {
                            const currentPolicyNorms = policies.map(p => normalizePolicyName(p.ten_chinh_sach));
                            
                            const mapped = subPolicies
                                .map((p: any) => ({
                                    ten_chinh_sach: p.ten_uu_dai || '',
                                    han_su_dung: p.han_su_dung || '',
                                    dong_xe: p.dong_xe_ap_dung || '',
                                    trang_thai: 'Hoạt động'
                                }))
                                .filter((p: any) => {
                                    // CHỈ HIỂN THỊ CHÍNH SÁCH HOÀN TOÀN MỚI
                                    const norm = normalizePolicyName(p.ten_chinh_sach);
                                    return !currentPolicyNorms.includes(norm);
                                });

                            if (mapped.length === 0) {
                                showToast('Thông tin', 'AI không tìm thấy chính sách nào mới so với hệ thống.', 'info');
                                return;
                            }

                            setPendingAiPolicies(mapped);
                            setSelectedAiIndices(new Set(mapped.keys()));
                            setAiReviewMode(true);
                            setIsEditing(false);
                            setSelectedPolicyName(null);
                            setMobileView('detail');
                            showToast('Thành công', `AI tìm thấy ${mapped.length} chính sách MỚI. Hãy xem lại trước khi lưu!`, 'success');
                        } else {
                            // ... existing logic for single policy if needed ...
                            showToast('Thành công', 'AI trích xuất thành công!', 'success');
                            setEditData({
                                ...editData,
                                ten_chinh_sach: result.data.ten_chinh_sach_chinh || result.data.ten_chinh_sach || editData.ten_chinh_sach,
                                han_su_dung: result.data.han_su_dung || editData.han_su_dung,
                                trang_thai: 'Hoạt động'
                             });
                            if (!isEditing) {
                                setSelectedPolicyName(null);
                                setIsEditing(true);
                                setMobileView('detail');
                            }
                        }
                    } else {
                        showToast('Lỗi AI', 'AI không thể đọc được: ' + (result?.error || 'Lỗi không xác định'), 'error');
                    }
                } catch(e: any) {
                    showToast('Lỗi', 'Lỗi kết nối tới AI Scanner: ' + e.message, 'error');
                } finally {
                    setIsAiScanning(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
        } catch (error) {
            showToast('Lỗi', 'Lỗi đọc file', 'error');
            setIsAiScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const renderPolicyListItem = (policy: Policy) => {
        const isSelected = selectedPolicyName === policy.ten_chinh_sach && !isEditing && !aiReviewMode;
        return (
            <div
                key={policy.ten_chinh_sach}
                onClick={() => handleSelectPolicy(policy.ten_chinh_sach)}
                className={`px-4 py-3 cursor-pointer transition-all duration-300 group relative border-l-2 ${isSelected
                    ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-accent-primary z-10'
                    : 'bg-transparent border-transparent hover:bg-slate-50/80 hover:border-slate-200'
                    }`}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div
                            className={`text-[13px] font-bold truncate mb-1 cursor-pointer transition-colors ${isSelected ? 'text-accent-primary' : 'text-slate-700 group-hover:text-accent-primary'}`}
                            title={policy.ten_chinh_sach}
                        >
                            {policy.ten_chinh_sach}
                        </div>
                        <div className="flex flex-col gap-0.5">
                            {policy.dong_xe && (
                                <div className="text-[10px] text-purple-500 font-bold uppercase tracking-wider flex items-center gap-1.5 leading-none mt-1">
                                    <i className="fas fa-car opacity-70"></i>
                                    <span className="truncate" title={policy.dong_xe}>{policy.dong_xe}</span>
                                </div>
                            )}
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 leading-none mt-1">
                                <i className="far fa-calendar-alt opacity-70"></i>
                                <span className="truncate">{policy.han_su_dung || 'Không giới hạn'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100/50 pt-2">
                    <span className={`px-2 py-0.5 inline-flex text-[9px] font-bold uppercase tracking-wider rounded border ${
                        policy.trang_thai === 'Hoạt động' 
                        ? 'bg-green-50 text-green-600 border-green-200' 
                        : 'bg-gray-100 text-gray-400 border-gray-200'
                    }`}>
                        {policy.trang_thai}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-slate-50 md:rounded-xl shadow-md border-0 md:border border-border-primary overflow-hidden animate-fade-in relative z-0">
            <AnimatedBackground />
            
            {/* Column 1: Folders */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-border-primary bg-surface-ground/90 flex flex-col relative z-10 ${mobileView !== 'folders' ? 'hidden md:flex' : 'flex'}`}>
                <div className="md:hidden p-3 bg-white border-b border-border-secondary flex items-center justify-center relative">
                    <span className="font-bold text-sm">Chính Sách</span>
                </div>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {folders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => handleFolderChange(folder.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedFolder === folder.id ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
                        >
                            <div className="flex items-center gap-3">
                                <i className={`fas ${folder.icon} w-5 text-center`}></i>
                                <span>{folder.label}</span>
                            </div>
                            {folder.count > 0 && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedFolder === folder.id ? 'bg-accent-primary text-white' : 'bg-surface-hover text-text-secondary'}`}>{folder.count}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-3 border-t border-border-secondary bg-slate-50 relative z-20 flex justify-center">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept=".pdf,image/png,image/jpeg,image/webp"
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="primary"
                        className="w-full font-bold shadow-sm py-2.5 text-xs flex items-center justify-center gap-2"
                        leftIcon={<i className={`fas fa-magic ${isAiScanning ? 'animate-pulse' : ''}`}></i>}
                        disabled={isAiScanning}
                        isLoading={isAiScanning}
                    >
                        {isAiScanning ? 'Đang phân tích...' : 'Thêm bằng AI'}
                    </Button>
                </div>
            </div>

            {/* Column 2: List */}
            <div className={`w-full md:w-[450px] lg:w-[600px] xl:w-[700px] flex-shrink-0 border-r border-border-primary flex flex-col bg-white/90 relative z-10 ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                <div className="md:hidden p-2.5 bg-white border-b border-border-secondary flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMobileView('folders')} className="p-1.5 hover:bg-surface-ground rounded-full">
                            <i className="fas fa-arrow-left text-gray-500"></i>
                        </button>
                        <span className="font-bold text-sm">{folders.find(f => f.id === selectedFolder)?.label || 'Danh sách'}</span>
                    </div>
                    <button onClick={handleStartCreate} className="w-8 h-8 rounded-full bg-accent-primary text-white flex items-center justify-center">
                        <i className="fas fa-plus text-xs"></i>
                    </button>
                </div>

                <div className="hidden md:flex p-2.5 bg-white border-b border-border-secondary items-center justify-between gap-2">
                    <span className="font-bold text-[11px] text-gray-500 uppercase tracking-widest pl-2">
                        {folders.find(f => f.id === selectedFolder)?.label}
                    </span>
                    <button onClick={handleStartCreate} className="px-2 py-1 rounded bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary text-[10px] font-bold uppercase transition-colors flex items-center gap-1">
                        <i className="fas fa-plus"></i> Tạo mới
                    </button>
                </div>

                {/* Search Bar - Both Desktop and Mobile */}
                <div className="p-2.5 bg-white border-b border-border-secondary/60 shrink-0">
                    <div className="relative group">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs group-focus-within:text-accent-primary transition-colors"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên chính sách, dòng xe..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-100/50 hover:bg-slate-100 border border-transparent focus:bg-white focus:border-accent-primary/50 text-xs font-medium pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all text-gray-700"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 z-10 transition-colors">
                                <i className="fas fa-times-circle text-xs"></i>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto relative no-scrollbar">
                    {loading && filteredPolicies.length === 0 ? (
                        <div className="divide-y divide-border-secondary">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="p-4 md:p-3 flex items-center justify-between">
                                    <div className="flex-1 space-y-2">
                                        <div className="skeleton-item h-4 w-3/4 rounded-md"></div>
                                        <div className="skeleton-item h-3 w-1/2 rounded-md"></div>
                                    </div>
                                    <div className="skeleton-item h-6 w-12 rounded-full ml-3"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredPolicies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 h-full bg-slate-50/50">
                            <div className="w-16 h-16 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center mb-4">
                                <i className="fas fa-inbox text-gray-300 text-2xl"></i>
                            </div>
                            <p className="text-sm font-semibold text-gray-400 text-center">Không có chính sách</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-secondary">
                            {filteredPolicies.map(policy => renderPolicyListItem(policy))}
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Detail / AI Review */}
            <div className={`flex-1 flex flex-col bg-surface-ground/90 min-w-0 relative z-10 ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {aiReviewMode ? (
                    // === AI REVIEW PANEL (inline) ===
                    <div className="flex flex-col h-full">
                        <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setMobileView('list')} className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                    <i className="fas fa-arrow-left text-xs"></i>
                                </button>
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                                    <i className="fas fa-magic text-base"></i>
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-slate-800 tracking-tight">Xác Nhận Kết Quả AI</h2>
                                    <p className="text-[10px] text-blue-500 font-semibold">Tìm thấy {pendingAiPolicies.length} chính sách — Kiểm tra & chỉnh sửa trước khi lưu</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-1 bg-slate-50/80 rounded-xl border border-slate-200/50 ml-auto">
                                <Button
                                    onClick={() => { setAiReviewMode(false); setPendingAiPolicies([]); }}
                                    variant="secondary" size="sm"
                                    leftIcon={<i className="fas fa-times text-[10px]"></i>}
                                    className="font-bold px-3"
                                >
                                    Huỷ
                                </Button>
                                <Button
                                    onClick={handleSaveAiPolicies}
                                    variant="success" size="sm"
                                    leftIcon={<i className="fas fa-check-double text-[10px]"></i>}
                                    className="font-bold px-3 whitespace-nowrap"
                                >
                                    Lưu Toàn Bộ
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 no-scrollbar">
                            <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 p-2 rounded-lg mb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedAiIndices.size === pendingAiPolicies.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedAiIndices(new Set(pendingAiPolicies.keys()));
                                            } else {
                                                setSelectedAiIndices(new Set());
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-tight">Chọn tất cả ({pendingAiPolicies.length})</span>
                                </label>
                                <span className="text-[10px] text-blue-500 italic">Lưu ý: Chỉ các mục được chọn mới được lưu vào hệ thống</span>
                            </div>
                            
                            {pendingAiPolicies.map((p, i) => (
                                <div key={i} className={`bg-white border p-3 rounded-xl shadow-sm flex flex-col gap-3 relative transition-all animate-fade-in ${selectedAiIndices.has(i) ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200 grayscale-[0.3] opacity-80'}`}>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedAiIndices.has(i)}
                                            onChange={() => {
                                                const next = new Set(selectedAiIndices);
                                                if (next.has(i)) next.delete(i);
                                                else next.add(i);
                                                setSelectedAiIndices(next);
                                            }}
                                            className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <div className={`bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg ${!selectedAiIndices.has(i) ? 'grayscale' : ''}`}>
                                            {i + 1}
                                        </div>
                                        <h3 className={`text-xs font-bold truncate flex-1 ${selectedAiIndices.has(i) ? 'text-gray-800' : 'text-gray-400'}`}>{p.ten_chinh_sach}</h3>
                                        <button
                                            onClick={() => {
                                                setPendingAiPolicies(prev => prev.filter((_, idx) => idx !== i));
                                                const next = new Set(selectedAiIndices);
                                                next.delete(i);
                                                setSelectedAiIndices(next);
                                            }}
                                            className="w-8 h-8 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                                            title="Bỏ qua"
                                        >
                                            <i className="fas fa-trash-alt text-[10px]"></i>
                                        </button>
                                    </div>
                                    
                                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-1 px-1 transition-opacity ${selectedAiIndices.has(i) ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                        <div className="col-span-1 md:col-span-2 lg:col-span-2">
                                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1 tracking-widest pl-1">Tên Chính Sách</label>
                                            <input
                                                type="text"
                                                value={p.ten_chinh_sach}
                                                onChange={e => {
                                                    const newArr = [...pendingAiPolicies];
                                                    newArr[i] = { ...newArr[i], ten_chinh_sach: e.target.value };
                                                    setPendingAiPolicies(newArr);
                                                }}
                                                className="w-full text-xs font-bold border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-gray-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1 tracking-widest pl-1">Dòng Xe</label>
                                            <input
                                                type="text"
                                                value={p.dong_xe}
                                                onChange={e => {
                                                    const newArr = [...pendingAiPolicies];
                                                    newArr[i] = { ...newArr[i], dong_xe: e.target.value };
                                                    setPendingAiPolicies(newArr);
                                                }}
                                                className="w-full text-xs font-bold border border-gray-200 rounded-lg px-3 py-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-purple-700"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1 tracking-widest pl-1">Hạn Áp Dụng</label>
                                            <input
                                                type="text"
                                                value={p.han_su_dung}
                                                onChange={e => {
                                                    const newArr = [...pendingAiPolicies];
                                                    newArr[i] = { ...newArr[i], han_su_dung: e.target.value };
                                                    setPendingAiPolicies(newArr);
                                                }}
                                                className="w-full text-xs font-bold border border-gray-200 rounded-lg px-3 py-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-orange-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3 flex items-center justify-between gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
                            <span className="text-xs text-gray-500 font-medium">
                                <i className="fas fa-info-circle text-blue-400 mr-1"></i>
                                Đã chọn: <b className="text-blue-600">{selectedAiIndices.size}</b> / {pendingAiPolicies.length}
                            </span>
                            <Button
                                onClick={handleSaveAiPolicies}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transform transition-all hover:-translate-y-0.5 whitespace-nowrap font-bold"
                                size="sm"
                                disabled={selectedAiIndices.size === 0}
                            >
                                <i className="fas fa-check-double mr-2"></i> Lưu {selectedAiIndices.size} Chính Sách
                            </Button>
                        </div>
                    </div>
                ) : selectedPolicy || isEditing ? (
                    <>
                        <div className="bg-white border-b border-gray-100 z-10">
                            <div className="px-4 md:px-6 py-2 md:py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <button
                                        onClick={() => setMobileView('list')}
                                        className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:scale-90 transition-all shadow-sm"
                                    >
                                        <i className="fas fa-arrow-left text-xs"></i>
                                    </button>
                                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/50 border border-indigo-100/50 flex items-center justify-center text-accent-primary font-black text-lg md:text-xl flex-shrink-0 shadow-sm ring-4 ring-white">
                                        {isEditing ? <i className="fas fa-edit"></i> : (selectedPolicy?.ten_chinh_sach.charAt(0) || 'P')}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5 overflow-hidden">
                                            <h2 className="text-sm md:text-base font-black text-slate-800 truncate tracking-tight">
                                                {isEditing ? (selectedPolicy ? 'Chỉnh Sửa Chính Sách' : 'Tạo Chính Sách Mới') : selectedPolicy?.ten_chinh_sach}
                                            </h2>
                                            {!isEditing && selectedPolicy && (
                                                <span className={`px-2 py-0.5 inline-flex text-[9px] font-bold uppercase tracking-wider rounded border ${selectedPolicy.trang_thai === 'Hoạt động' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                    {selectedPolicy.trang_thai}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 border border-slate-200/50">
                                                <i className="fas fa-info-circle text-[8px] opacity-60"></i>
                                                <span className="uppercase tracking-tighter">{isEditing ? 'ĐIỀN CÁC THÔNG TIN BÊN DƯỚI' : 'XEM THÔNG TIN CHI TIẾT'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-1 bg-slate-50/80 rounded-xl border border-slate-200/50 ml-auto overflow-x-auto no-scrollbar">
                                    {!isEditing && selectedPolicy && (
                                        <>
                                            <Button onClick={handleStartEdit} variant="primary" size="sm" leftIcon={<i className="fas fa-pen text-[10px]"></i>} className="font-bold px-3">Sửa Đổi</Button>
                                            <Button onClick={() => handleDelete(selectedPolicy.ten_chinh_sach)} variant="danger" size="sm" leftIcon={<i className="fas fa-trash-alt text-[10px]"></i>} className="font-bold px-3">Xóa Bỏ</Button>
                                        </>
                                    )}
                                    {isEditing && (
                                        <>
                                            <Button onClick={handleCancelEdit} variant="secondary" size="sm" leftIcon={<i className="fas fa-times text-[10px]"></i>} className="font-bold px-3">Hủy</Button>
                                            <Button onClick={handleSave} variant="success" size="sm" leftIcon={<i className="fas fa-save text-[10px]"></i>} className="font-bold px-3">Lưu Lại</Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-2 md:p-3 flex flex-col gap-2 md:gap-3 min-h-0 overflow-y-auto bg-gray-50/30 lg:overflow-hidden">
                            <div className="max-w-3xl flex flex-col gap-3 flex-shrink-0">
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                    <div className="bg-gray-50/50 px-3 py-1.5 border-b border-gray-100 flex items-center gap-2">
                                        <i className="fas fa-file-contract text-accent-primary text-[10px]"></i>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nội Dung Chính Sách</h3>
                                    </div>
                                    <div className="p-3 space-y-1">
                                        {isEditing ? (
                                            <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
                                                <div className="lg:col-span-2">
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-0.5">Tên Chính Sách <span className="text-red-500">*</span></label>
                                                    <input
                                                        type="text"
                                                        value={editData.ten_chinh_sach}
                                                        onChange={e => setEditData({ ...editData, ten_chinh_sach: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all shadow-inner"
                                                        placeholder="Theo thông báo chính thống..."
                                                    />
                                                </div>
                                                <div className="mt-3 lg:mt-0">
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-0.5">Dòng Xe Áp Dụng</label>
                                                    <input
                                                        type="text"
                                                        value={editData.dong_xe || ''}
                                                        onChange={e => setEditData({ ...editData, dong_xe: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all shadow-inner"
                                                        placeholder="VD: VF 5, VF 6..."
                                                    />
                                                </div>
                                                <div className="mt-3 lg:mt-0">
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-0.5">Hạn Sử Dụng</label>
                                                    <input
                                                        type="text"
                                                        value={editData.han_su_dung || ''}
                                                        onChange={e => setEditData({ ...editData, han_su_dung: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all shadow-inner"
                                                        placeholder="VD: 31/12/2026..."
                                                    />
                                                </div>
                                                <div className="mt-3 lg:mt-0">
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-0.5">Trạng Thái Kiểm Soát</label>
                                                    <select
                                                        value={editData.trang_thai}
                                                        onChange={e => setEditData({ ...editData, trang_thai: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all shadow-inner appearance-none"
                                                    >
                                                        <option value="Hoạt động">Hoạt động (Hiển thị cho tư vấn)</option>
                                                        <option value="Ngừng hoạt động">Ngừng hoạt động (Ẩn khỏi hệ thống)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        ) : selectedPolicy ? (
                                            <>
                                                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors group">
                                                    <div className="flex items-center gap-2.5">
                                                        <i className="fas fa-tag text-blue-500 opacity-40 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tên Hệ Thống</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-900 truncate ml-4 w-2/3 text-right" title={selectedPolicy.ten_chinh_sach}>
                                                        {selectedPolicy.ten_chinh_sach}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors group mt-2 pt-2 border-t border-gray-50">
                                                    <div className="flex items-center gap-2.5">
                                                        <i className="fas fa-car text-purple-500 opacity-40 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Dòng Xe Khả Dụng</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-700 truncate ml-4 w-2/3 text-right">
                                                        {selectedPolicy.dong_xe || 'Dành cho mọi dòng xe'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors group mt-2 pt-2 border-t border-gray-50">
                                                    <div className="flex items-center gap-2.5">
                                                        <i className="far fa-calendar-check text-orange-400 opacity-40 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Hiệu lực chương trình</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-700 truncate ml-4 w-2/3 text-right">
                                                        {selectedPolicy.han_su_dung || 'Không giới hạn thời gian'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors group mt-2 pt-2 border-t border-gray-50">
                                                    <div className="flex items-center gap-2.5">
                                                        <i className="fas fa-tools text-green-500 opacity-40 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Cho Phép Sử Dụng</span>
                                                    </div>
                                                    <div className="text-[10px] font-black text-green-600 truncate ml-4 font-mono w-2/3 text-right">
                                                        {selectedPolicy.trang_thai}
                                                    </div>
                                                </div>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent">
                        <div className="w-20 h-20 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-4">
                            <i className="fas fa-hand-pointer text-gray-200 text-3xl"></i>
                        </div>
                        <p className="text-gray-400 font-medium text-sm">Chọn một chính sách từ danh sách để xem nội dung</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PolicyManagementView;
