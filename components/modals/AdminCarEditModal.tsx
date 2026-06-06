import React, { useState, useEffect } from 'react';
import { StockVehicle } from '../../types';
import { versionsMap, defaultExteriors, defaultInteriors, getAvailableExteriors } from '../../constants';
import CarImage from '../ui/CarImage';
import Button from '../ui/Button';
import * as apiService from '../../services/apiService';

interface AdminCarEditModalProps {
    isOpen: boolean;
    vehicle: StockVehicle | null;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess: () => void;
}

const AdminCarEditModal: React.FC<AdminCarEditModalProps> = ({ isOpen, vehicle, onClose, showToast, onSuccess }) => {
    const [mode, setMode] = useState<'edit' | 'delete'>('edit');
    const [isSaving, setIsSaving] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [localChanges, setLocalChanges] = useState<Partial<StockVehicle>>({});

    useEffect(() => {
        if (isOpen) {
            setMode('edit');
            setLocalChanges({});
            setDeleteReason('');
            setIsSaving(false);
        }
    }, [isOpen, vehicle?.VIN]);

    if (!isOpen || !vehicle) return null;

    const currentModel = localChanges['Dòng xe'] !== undefined ? localChanges['Dòng xe'] : vehicle['Dòng xe'];
    const currentVersion = localChanges['Phiên bản'] !== undefined ? localChanges['Phiên bản'] : vehicle['Phiên bản'];
    const currentExterior = localChanges['Ngoại thất'] !== undefined ? localChanges['Ngoại thất'] : vehicle['Ngoại thất'];
    const currentInterior = localChanges['Nội thất'] !== undefined ? localChanges['Nội thất'] : vehicle['Nội thất'];
    const currentSoMay = localChanges['Số máy'] !== undefined ? localChanges['Số máy'] : vehicle['Số máy'];
    const currentMaDMS = localChanges['Mã DMS'] !== undefined ? localChanges['Mã DMS'] : vehicle['Mã DMS'];
    const currentVIN = localChanges.VIN !== undefined ? localChanges.VIN : vehicle.VIN;

    const handleFieldChange = (field: keyof StockVehicle, value: string) => {
        setLocalChanges(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'Dòng xe' && (value === 'VF5' || value === 'vf5' || value === 'VF 5')) {
                next['Phiên bản'] = 'Plus';
            }
            return next;
        });
    };

    const hasChanges = Object.keys(localChanges).length > 0;
    const vinInvalid = currentVIN !== undefined && currentVIN.length !== 17 && currentVIN !== vehicle.VIN;
    const canSave = hasChanges && !vinInvalid;

    const handleSave = async () => {
        if (!hasChanges) return;
        setIsSaving(true);
        try {
            const res = await apiService.updateCarInfo(vehicle.VIN, localChanges);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', `Đã cập nhật thông tin xe ${vehicle.VIN}`, 'success');
                onSuccess();
                onClose();
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (err: any) {
            showToast('Lỗi', err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteReason.trim()) {
            showToast('Thiếu thông tin', 'Vui lòng nhập lý do xóa xe.', 'warning');
            return;
        }
        setIsSaving(true);
        try {
            const res = await apiService.performAdminAction('deleteCarFromStockLogic', {
                vinToDelete: vehicle.VIN,
                reason: deleteReason
            });
            if (res.status === 'SUCCESS') {
                showToast('Đã xóa', res.message, 'success');
                onSuccess();
                onClose();
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (err: any) {
            showToast('Lỗi', err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const getFilteredExteriors = () => {
        return getAvailableExteriors(currentModel, currentVersion);
    };

    const versions = versionsMap[(currentModel || '') as keyof typeof versionsMap] || [];

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-[slideUp_0.3s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-slate-800 to-slate-700 p-4 text-white">
                    <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <i className="fas fa-times text-[11px]"></i>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden p-1">
                            <CarImage model={currentModel} exteriorColor={currentExterior} className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black tracking-tight">{vehicle.VIN}</h2>
                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{currentModel} {currentVersion}</p>
                        </div>
                    </div>
                    {/* Mode Toggle */}
                    <div className="flex gap-1 mt-3 bg-white/10 rounded-lg p-0.5">
                        <button
                            onClick={() => setMode('edit')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${mode === 'edit' ? 'bg-white text-slate-800 shadow-sm' : 'text-white/70 hover:text-white'}`}
                        >
                            <i className="fas fa-pen text-[9px]"></i> Sửa Thông Tin
                        </button>
                        <button
                            onClick={() => setMode('delete')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${mode === 'delete' ? 'bg-red-500 text-white shadow-sm' : 'text-white/70 hover:text-white'}`}
                        >
                            <i className="fas fa-trash-alt text-[9px]"></i> Xóa Xe
                        </button>
                    </div>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {mode === 'edit' ? (
                        <div className="space-y-4">
                            {/* VIN */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Số VIN</label>
                                <input
                                    type="text"
                                    placeholder="Nhập số VIN..."
                                    className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10 transition-all uppercase bg-amber-50 focus:bg-white"
                                    value={currentVIN || ''}
                                    onChange={(e) => handleFieldChange('VIN', e.target.value.toUpperCase())}
                                />
                                {currentVIN !== vehicle.VIN && currentVIN.length === 17 && (
                                    <p className="text-[10px] text-amber-600 mt-1 font-medium flex items-start gap-1.5 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                        <i className="fas fa-exclamation-triangle mt-0.5"></i> Chú ý: Việc thay đổi số VIN có thể ảnh hưởng đến lịch sử ghép xe.
                                    </p>
                                )}
                                {vinInvalid && (
                                    <p className="text-[10px] text-red-600 mt-1 font-bold flex items-center gap-1.5 bg-red-50 p-2 rounded-lg border border-red-200 animate-fade-in">
                                        <i className="fas fa-times-circle"></i> Số VIN phải đủ 17 ký tự (hiện tại: {currentVIN.length}/17)
                                    </p>
                                )}
                            </div>

                            {/* Model & Version */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Dòng Xe</label>
                                    <select
                                        className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10 transition-all bg-slate-50/50"
                                        value={currentModel || ''}
                                        onChange={(e) => handleFieldChange('Dòng xe', e.target.value)}
                                    >
                                        <option value="">-- Chọn --</option>
                                        {Object.keys(versionsMap).sort().map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Phiên Bản</label>
                                    <select
                                        className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10 transition-all bg-slate-50/50"
                                        value={currentVersion || ''}
                                        onChange={(e) => handleFieldChange('Phiên bản', e.target.value)}
                                        disabled={!currentModel}
                                    >
                                        <option value="">-- Chọn --</option>
                                        {versions.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Colors */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Ngoại Thất</label>
                                    <select
                                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary transition-all"
                                        value={defaultExteriors.includes(currentExterior || '') ? currentExterior : ''}
                                        onChange={(e) => handleFieldChange('Ngoại thất', e.target.value)}
                                    >
                                        <option value="">-- Chọn --</option>
                                        {getFilteredExteriors().map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nội Thất</label>
                                    <select
                                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary transition-all"
                                        value={currentInterior || ''}
                                        onChange={(e) => handleFieldChange('Nội thất', e.target.value)}
                                    >
                                        <option value="">-- Chọn --</option>
                                        {defaultInteriors.map(c => <option key={c} value={c}>{c}</option>)}
                                        {currentInterior && !defaultInteriors.includes(currentInterior) && <option value={currentInterior}>{currentInterior}</option>}
                                    </select>
                                </div>
                            </div>

                            {/* Engine & DMS */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Số Máy</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập số máy..."
                                        className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10 transition-all"
                                        value={currentSoMay || ''}
                                        onChange={(e) => handleFieldChange('Số máy', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mã DMS</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập mã DMS..."
                                        className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10 transition-all"
                                        value={currentMaDMS || ''}
                                        onChange={(e) => handleFieldChange('Mã DMS', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Warning */}
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-exclamation-triangle text-red-500 text-sm"></i>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-red-800">Hành động này không thể hoàn tác dễ dàng!</p>
                                    <p className="text-[10px] text-red-600 mt-1">Xe sẽ bị xóa khỏi Kho. Nếu xe đang ghép với đơn hàng, hệ thống sẽ tự động hủy ghép.</p>
                                </div>
                            </div>

                            {/* Reason */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Lý do xóa (bắt buộc)</label>
                                <textarea
                                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all resize-none h-20"
                                    placeholder="VD: Xe bán lô, xe điều chuyển, sai dữ liệu..."
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        Hủy
                    </button>
                    {mode === 'edit' ? (
                        <Button
                            onClick={handleSave}
                            variant="success"
                            size="sm"
                            isLoading={isSaving}
                            disabled={!canSave || isSaving}
                            leftIcon={<i className="fas fa-save"></i>}
                        >
                            Lưu Thay Đổi
                        </Button>
                    ) : (
                        <Button
                            onClick={handleDelete}
                            variant="danger"
                            size="sm"
                            isLoading={isSaving}
                            disabled={!deleteReason.trim() || isSaving}
                            leftIcon={<i className="fas fa-trash-alt"></i>}
                        >
                            Xóa Xe Khỏi Kho
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminCarEditModal;
