import React, { useState, useMemo, useEffect } from 'react';
import { StockVehicle } from '../../types';
import { versionsMap, defaultExteriors, defaultInteriors, getAvailableExteriors } from '../../constants';
import Button from '../ui/Button';
import CarImage from '../ui/CarImage';
import * as apiService from '../../services/apiService';
import AnimatedBackground from '../ui/AnimatedBackground';

interface IncompleteCarsViewProps {
    stockData: StockVehicle[];
    onRefresh: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}
const IncompleteCarsView: React.FC<IncompleteCarsViewProps> = ({ stockData, onRefresh, showToast }) => {
    const [updatingVin, setUpdatingVin] = useState<string | null>(null);
    const [localChanges, setLocalChanges] = useState<Record<string, Partial<StockVehicle>>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<string>('all');
    const [selectedVin, setSelectedVin] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');

    const incompleteCars = useMemo(() => {
        return stockData.filter(car =>
            !car['Dòng xe'] || car['Dòng xe'].trim() === '' ||
            !car['Phiên bản'] || car['Phiên bản'].trim() === '' ||
            !car['Ngoại thất'] || car['Ngoại thất'].trim() === '' ||
            !car['Số máy'] || car['Số máy'].trim() === '' ||
            !car['Mã DMS'] || (car['Mã DMS'] && car['Mã DMS'].trim() === '')
        );
    }, [stockData]);

    const displayCars = useMemo(() => {
        if (searchQuery.trim()) {
            return stockData.filter(car => 
                car.VIN.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                car['Số máy']?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                car['Mã DMS']?.toLowerCase().includes(searchQuery.toLowerCase().trim())
            ).slice(0, 50);
        }

        switch (selectedFolder) {
            case 'missing_model': return incompleteCars.filter(c => !c['Dòng xe'] || c['Dòng xe'].trim() === '');
            case 'missing_version': return incompleteCars.filter(c => !c['Phiên bản'] || c['Phiên bản'].trim() === '');
            case 'missing_color': return incompleteCars.filter(c => !c['Ngoại thất'] || !c['Nội thất']);
            case 'missing_dms': return incompleteCars.filter(c => !c['Số máy'] || !c['Mã DMS']);
            default: return incompleteCars;
        }
    }, [incompleteCars, stockData, selectedFolder, searchQuery]);

    const folders = [
        { id: 'all', label: 'Tất Cả', icon: 'fa-layer-group', count: incompleteCars.length },
        { id: 'missing_model', label: 'Thiếu Dòng Xe', icon: 'fa-car', count: incompleteCars.filter(c => !c['Dòng xe'] || c['Dòng xe'].trim() === '').length },
        { id: 'missing_version', label: 'Thiếu Phiên Bản', icon: 'fa-tag', count: incompleteCars.filter(c => !c['Phiên bản'] || c['Phiên bản'].trim() === '').length },
        { id: 'missing_color', label: 'Thiếu Màu Sắc', icon: 'fa-palette', count: incompleteCars.filter(c => !c['Ngoại thất'] || !c['Nội thất']).length },
        { id: 'missing_dms', label: 'Thiếu Số Máy/DMS', icon: 'fa-id-card', count: incompleteCars.filter(c => !c['Số máy'] || !c['Mã DMS']).length },
    ];

    const selectedCar = useMemo(() => stockData.find(c => c.VIN === selectedVin), [stockData, selectedVin]);

    // Auto-select first car
    useEffect(() => {
        if (displayCars.length > 0) {
            setSelectedVin(displayCars[0].VIN);
        } else {
            setSelectedVin(null);
        }
    }, [selectedFolder, searchQuery, displayCars.length]);

    const handleFieldChange = (vin: string, field: keyof StockVehicle, value: string) => {
        setLocalChanges(prev => {
            const next = { ...prev };
            const currentChanges = { ...(next[vin] || {}), [field]: value };
            
            // VF5 version default logic
            if (field === 'Dòng xe' && (value === 'VF5' || value === 'vf5')) {
                currentChanges['Phiên bản'] = 'Plus';
            }
            
            next[vin] = currentChanges;
            return next;
        });
    };

    const handleSave = async (vin: string) => {
        const updates = localChanges[vin];
        if (!updates || Object.keys(updates).length === 0) return;

        setUpdatingVin(vin);
        try {
            const res = await apiService.updateCarInfo(vin, updates);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', `Đã cập nhật thông tin cho xe ${vin}`, 'success');
                onRefresh();
                setLocalChanges(prev => {
                    const next = { ...prev };
                    delete next[vin];
                    return next;
                });
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (err: any) {
            showToast('Lỗi', err.message, 'error');
        } finally {
            setUpdatingVin(null);
        }
    };

    const handleFolderChange = (folderId: string) => {
        setSelectedFolder(folderId);
        setMobileView('list');
    };

    const handleCarSelect = (vin: string) => {
        setSelectedVin(vin);
        setMobileView('detail');
    };

    if (incompleteCars.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-full bg-slate-50/50">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-emerald-400 border border-slate-100">
                    <i className="fas fa-check-circle fa-2x"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-700 uppercase tracking-tight">Tuyệt vời!</h3>
                <p className="text-slate-400 text-sm font-medium">Tất cả xe trong kho đều đã có đầy đủ thông tin.</p>
                <Button onClick={onRefresh} variant="secondary" size="sm" className="mt-6" leftIcon={<i className="fas fa-sync-alt"></i>}>
                    Làm mới dữ liệu
                </Button>
            </div>
        );
    }

    const renderCarListItem = (car: StockVehicle) => {
        const isSelected = selectedVin === car.VIN;
        const carUpdates = localChanges[car.VIN] || {};
        const currentModel = carUpdates['Dòng xe'] !== undefined ? carUpdates['Dòng xe'] : car['Dòng xe'];
        const currentExt = carUpdates['Ngoại thất'] !== undefined ? carUpdates['Ngoại thất'] : car['Ngoại thất'];

        return (
            <div
                key={car.VIN}
                onClick={() => handleCarSelect(car.VIN)}
                className={`px-4 py-3 cursor-pointer transition-all duration-300 group relative border-l-2 ${isSelected
                    ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-accent-primary z-10'
                    : 'bg-transparent border-transparent hover:bg-slate-50/80 hover:border-slate-200'
                    }`}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className={`text-[13px] font-black truncate mb-0.5 ${isSelected ? 'text-accent-primary' : 'text-slate-700'}`}>
                            {car.VIN}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 leading-none">
                            <span>{currentModel || 'Chưa có dòng xe'}</span>
                        </div>
                    </div>
                    <div className="w-12 h-9 flex-shrink-0 relative overflow-hidden bg-slate-50 rounded-lg border border-slate-100/50 p-1">
                        <CarImage
                            model={currentModel}
                            exteriorColor={currentExt}
                            className={`w-full h-full object-contain transition-all duration-500 ${isSelected ? 'scale-110' : 'opacity-40 scale-95 grayscale'}`}
                        />
                    </div>
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
                    <span className="font-bold text-sm">Bổ Sung Thông Tin</span>
                </div>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {folders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => handleFolderChange(folder.id)}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${selectedFolder === folder.id ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
                        >
                            <div className="flex items-center gap-3">
                                <i className={`fas ${folder.icon} w-5 text-center text-sm ${selectedFolder === folder.id ? 'text-accent-primary' : 'text-slate-400'}`}></i>
                                <span>{folder.label}</span>
                            </div>
                            {folder.count > 0 && <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${selectedFolder === folder.id ? 'bg-accent-primary text-white' : 'bg-slate-200 text-slate-500'}`}>{folder.count}</span>}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-border-primary">
                    <Button onClick={onRefresh} variant="secondary" size="sm" fullWidth leftIcon={<i className="fas fa-sync-alt"></i>}>
                        Làm mới
                    </Button>
                </div>
            </div>

            {/* Column 2: List */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-border-primary flex flex-col bg-white/90 relative z-10 ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 bg-white border-b border-border-secondary flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMobileView('folders')} className="md:hidden p-1.5 hover:bg-surface-ground rounded-full">
                            <i className="fas fa-arrow-left text-gray-500"></i>
                        </button>
                        <span className="font-bold text-sm uppercase tracking-tight text-slate-700">
                            {searchQuery ? 'Tìm kiếm VIN' : (folders.find(f => f.id === selectedFolder)?.label || 'Danh sách')}
                        </span>
                    </div>
                    
                    {/* Search Bar - Allow Admin to search any car to edit */}
                    <div className="relative group">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-accent-primary transition-colors text-[10px]"></i>
                        <input 
                            type="text"
                            placeholder="Tìm VIN / Máy / DMS..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-bold focus:bg-white focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-500 rounded-full transition-colors"
                            >
                                <i className="fas fa-times text-[8px]"></i>
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {displayCars.map(car => renderCarListItem(car))}
                    {displayCars.length === 0 && (
                        <div className="p-8 text-center">
                            <i className="fas fa-search text-slate-100 fa-3x mb-3"></i>
                            <p className="text-[10px] text-slate-300 font-bold uppercase">Không tìm thấy xe</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Detail */}
            <div className={`flex-1 flex flex-col bg-surface-ground/90 min-w-0 relative z-10 ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {selectedCar ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3 min-w-0">
                                <button onClick={() => setMobileView('list')} className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100">
                                    <i className="fas fa-arrow-left text-xs text-slate-500"></i>
                                </button>
                                <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold shadow-sm border border-accent-primary/20">
                                    <i className="fas fa-car-side"></i>
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-black text-slate-800 truncate">{selectedCar.VIN}</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Chi tiết thông tin xe</p>
                                </div>
                            </div>
                            <Button
                                onClick={() => handleSave(selectedCar.VIN)}
                                variant="success"
                                size="sm"
                                isLoading={updatingVin === selectedCar.VIN}
                                disabled={!localChanges[selectedCar.VIN] || updatingVin === selectedCar.VIN}
                                leftIcon={<i className="fas fa-save"></i>}
                            >
                                Lưu Thay Đổi
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
                            {/* Car Preview Card */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
                                <div className="w-full md:w-1/3 aspect-video bg-slate-50 rounded-2xl p-4 flex items-center justify-center relative overflow-hidden group">
                                    <CarImage
                                        model={localChanges[selectedCar.VIN]?.['Dòng xe'] || selectedCar['Dòng xe']}
                                        exteriorColor={localChanges[selectedCar.VIN]?.['Ngoại thất'] || selectedCar['Ngoại thất']}
                                        className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute bottom-2 left-2 text-[8px] font-black text-slate-300 uppercase letter-spacing-widest">Vehicle Preview</div>
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Dòng Xe</label>
                                        <select
                                            className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary transition-all bg-slate-50/50"
                                            value={localChanges[selectedCar.VIN]?.['Dòng xe'] !== undefined ? localChanges[selectedCar.VIN]?.['Dòng xe'] : (selectedCar['Dòng xe'] || '')}
                                            onChange={(e) => handleFieldChange(selectedCar.VIN, 'Dòng xe', e.target.value)}
                                        >
                                            <option value="">-- Chọn Dòng Xe --</option>
                                            {Object.keys(versionsMap).sort().map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Phiên Bản</label>
                                        <select
                                            className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary transition-all bg-slate-50/50"
                                            value={localChanges[selectedCar.VIN]?.['Phiên bản'] !== undefined ? localChanges[selectedCar.VIN]?.['Phiên bản'] : (selectedCar['Phiên bản'] || '')}
                                            onChange={(e) => handleFieldChange(selectedCar.VIN, 'Phiên bản', e.target.value)}
                                            disabled={!(localChanges[selectedCar.VIN]?.['Dòng xe'] || selectedCar['Dòng xe'])}
                                        >
                                            <option value="">-- Chọn Phiên Bản --</option>
                                            {(versionsMap[(localChanges[selectedCar.VIN]?.['Dòng xe'] || selectedCar['Dòng xe']) as keyof typeof versionsMap] || []).map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Colors Section */}
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4 flex items-center gap-2">
                                        <i className="fas fa-palette text-accent-primary"></i> Màu sắc xe
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Ngoại thất</label>
                                            <div className="flex flex-col gap-2">
                                                <select
                                                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary transition-all"
                                                    value={defaultExteriors.includes((localChanges[selectedCar.VIN]?.['Ngoại thất'] || selectedCar['Ngoại thất']) || '') ? (localChanges[selectedCar.VIN]?.['Ngoại thất'] || selectedCar['Ngoại thất']) : ''}
                                                    onChange={(e) => handleFieldChange(selectedCar.VIN, 'Ngoại thất', e.target.value)}
                                                >
                                                    <option value="">-- Chọn Màu --</option>
                                                    {(() => {
                                                        const currentModel = localChanges[selectedCar.VIN]?.['Dòng xe'] || selectedCar['Dòng xe'];
                                                        const currentVersion = localChanges[selectedCar.VIN]?.['Phiên bản'] || selectedCar['Phiên bản'];
                                                        return getAvailableExteriors(currentModel, currentVersion).map(c => <option key={c} value={c}>{c}</option>);
                                                    })()}
                                                </select>
                                                <input
                                                    type="text"
                                                    placeholder="Hoặc nhập thủ công..."
                                                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary transition-all"
                                                    value={localChanges[selectedCar.VIN]?.['Ngoại thất'] !== undefined ? localChanges[selectedCar.VIN]?.['Ngoại thất'] : (selectedCar['Ngoại thất'] || '')}
                                                    onChange={(e) => handleFieldChange(selectedCar.VIN, 'Ngoại thất', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nội thất</label>
                                            <select
                                                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary transition-all"
                                                value={localChanges[selectedCar.VIN]?.['Nội thất'] !== undefined ? localChanges[selectedCar.VIN]?.['Nội thất'] : (selectedCar['Nội thất'] || '')}
                                                onChange={(e) => handleFieldChange(selectedCar.VIN, 'Nội thất', e.target.value)}
                                            >
                                                <option value="">-- Chọn Nội Thất --</option>
                                                {defaultInteriors.map(c => <option key={c} value={c}>{c}</option>)}
                                                {selectedCar['Nội thất'] && !defaultInteriors.includes(selectedCar['Nội thất']) && <option value={selectedCar['Nội thất']}>{selectedCar['Nội thất']}</option>}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Identification Section */}
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4 flex items-center gap-2">
                                        <i className="fas fa-id-card text-accent-primary"></i> Định danh hệ thống
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Số Máy</label>
                                            <input
                                                type="text"
                                                placeholder="Nhập số máy..."
                                                className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary transition-all"
                                                value={localChanges[selectedCar.VIN]?.['Số máy'] !== undefined ? localChanges[selectedCar.VIN]?.['Số máy'] : (selectedCar['Số máy'] || '')}
                                                onChange={(e) => handleFieldChange(selectedCar.VIN, 'Số máy', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mã DMS</label>
                                            <input
                                                type="text"
                                                placeholder="Nhập mã DMS..."
                                                className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary transition-all"
                                                value={localChanges[selectedCar.VIN]?.['Mã DMS'] !== undefined ? localChanges[selectedCar.VIN]?.['Mã DMS'] : (selectedCar['Mã DMS'] || '')}
                                                onChange={(e) => handleFieldChange(selectedCar.VIN, 'Mã DMS', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4 opacity-50">
                            <i className="fas fa-mouse-pointer text-slate-300 text-2xl"></i>
                        </div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Chưa chọn xe</h3>
                        <p className="text-xs text-slate-400 mt-2">Vui lòng chọn một mã VIN từ danh sách bên trái.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IncompleteCarsView;
