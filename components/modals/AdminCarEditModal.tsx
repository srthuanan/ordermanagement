import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Wrench, Trash2, Save, AlertTriangle } from 'lucide-react';
import { StockVehicle } from '../../types';
import { useVehicleConfig } from '../../hooks/useVehicleConfig';
import CarImage from '../ui/CarImage';
import Button from '../ui/Button';
import * as apiService from '../../services/apiService';
import './create-request-sheet.css';

interface AdminCarEditModalProps {
    isOpen: boolean;
    vehicle: StockVehicle | null;
    initialMode?: 'edit' | 'delete';
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess: () => void;
}

const AdminCarEditModal: React.FC<AdminCarEditModalProps> = ({ isOpen, vehicle, initialMode = 'edit', onClose, showToast, onSuccess }) => {
    const { versionsMap, vehicleLines, vehicleColors, vehicleInteriors } = useVehicleConfig();
    const [mode, setMode] = useState<'edit' | 'delete'>('edit');
    const [isSaving, setIsSaving] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [localChanges, setLocalChanges] = useState<Partial<StockVehicle>>({});

    const sheetRef = useRef<HTMLElement>(null);
    const layerRef = useRef<HTMLDivElement>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [closing, setClosing] = useState(false);

    const requestClose = useCallback(() => {
        if (closeTimer.current) return;
        setClosing(true);
        closeTimer.current = setTimeout(onClose, 180);
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        setClosing(false);
        const previousFocus = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        sheetRef.current?.focus();
        return () => {
            if (closeTimer.current) clearTimeout(closeTimer.current);
            closeTimer.current = null;
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && vehicle) {
            setMode(initialMode || 'edit');
            setDeleteReason('');
            setIsSaving(false);
            const initialModel = vehicle['Dòng xe'] || '';
            const initialVersion = vehicle['Phiên bản'] || '';
            const versions = versionsMap[initialModel] || [];
            if (versions.length === 1 && !initialVersion) {
                setLocalChanges({ 'Phiên bản': versions[0] });
            } else {
                setLocalChanges({});
            }
        }
    }, [isOpen, vehicle?.VIN, versionsMap, initialMode]);

    if (!isOpen || !vehicle) return null;

    const currentModel = localChanges['Dòng xe'] !== undefined ? localChanges['Dòng xe'] : vehicle['Dòng xe'];
    const currentVersion = localChanges['Phiên bản'] !== undefined ? localChanges['Phiên bản'] : vehicle['Phiên bản'];
    const currentExterior = localChanges['Ngoại thất'] !== undefined ? localChanges['Ngoại thất'] : vehicle['Ngoại thất'];
    const currentInterior = localChanges['Nội thất'] !== undefined ? localChanges['Nội thất'] : vehicle['Nội thất'];
    const currentSoMay = localChanges['Số máy'] !== undefined ? localChanges['Số máy'] : vehicle['Số máy'];
    const currentMaDMS = localChanges['Mã DMS'] !== undefined ? localChanges['Mã DMS'] : vehicle['Mã DMS'];
    const currentViTri = localChanges['Vị trí'] !== undefined ? localChanges['Vị trí'] : vehicle['Vị trí'];
    const currentVIN = localChanges.VIN !== undefined ? localChanges.VIN : vehicle.VIN;

    const handleFieldChange = (field: keyof StockVehicle, value: string) => {
        setLocalChanges(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'Dòng xe') {
                const versions = versionsMap[value] || [];
                if (versions.length === 1) {
                    next['Phiên bản'] = versions[0];
                } else if (value === 'VF5' || value === 'vf5' || value === 'VF 5') {
                    next['Phiên bản'] = 'Plus';
                }
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
                requestClose();
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
                requestClose();
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (err: any) {
            showToast('Lỗi', err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const versions = versionsMap[(currentModel || '')] || [];

    return createPortal(
        <div ref={layerRef} className="create-request-sheet-layer fixed" data-closing={closing}>
            <div className="create-request-sheet-backdrop" onClick={requestClose} aria-hidden="true" />
            <section
                ref={sheetRef}
                className="create-request-sheet admin-car-edit-top-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-car-edit-sheet-title"
                tabIndex={-1}
                onKeyDown={event => {
                    if (event.key === 'Escape') {
                        event.stopPropagation();
                        event.preventDefault();
                        requestClose();
                    }
                }}
            >
                {/* Header 100% đồng bộ chuẩn sheet Yêu cầu ghép xe */}
                <header className="create-request-sheet-heading">
                    <div className="create-request-sheet-heading-copy">
                        <div className="w-8 h-8 rounded-lg bg-[#eef3fb] flex items-center justify-center overflow-hidden p-0.5 border border-[#d8e3f3] flex-shrink-0">
                            <CarImage model={currentModel} exteriorColor={currentExterior} className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h2 id="admin-car-edit-sheet-title" className="text-[13px] font-bold text-[#24374e] tracking-tight">{vehicle.VIN}</h2>
                            <p className="text-[10px] text-[#869ab8] font-medium leading-none mt-0.5">{currentModel} {currentVersion || 'Tiêu chuẩn'} · Quản trị thông số kho</p>
                        </div>
                    </div>
                    <button type="button" className="create-request-sheet-close" onClick={requestClose} aria-label="Đóng quản trị xe" style={{ width: 24, height: 24 }}>
                        <X size={14} />
                    </button>
                </header>

                {/* Mode Toggle Bar */}
                <div className="px-4 py-1.5 bg-[#fbfcfe] border-b border-[#e8edf5] flex-shrink-0">
                    <div className="flex gap-1 p-0.5 bg-[#f0f4f9] rounded-lg border border-[#e2eaf4]">
                        <button
                            type="button"
                            onClick={() => setMode('edit')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                                mode === 'edit'
                                    ? 'bg-white text-[#1e3a5f] shadow-sm font-bold'
                                    : 'text-[#64748b] hover:text-[#1e3a5f]'
                            }`}
                        >
                            <Wrench size={12} /> Sửa thông tin xe
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('delete')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                                mode === 'delete'
                                    ? 'bg-rose-500 text-white shadow-sm font-bold'
                                    : 'text-[#64748b] hover:text-rose-600'
                            }`}
                        >
                            <Trash2 size={12} /> Xóa xe khỏi kho
                        </button>
                    </div>
                </div>

                {/* Body Form */}
                <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
                    {mode === 'edit' ? (
                        <div className="space-y-2.5">
                            {/* VIN */}
                            <div className="space-y-0.5">
                                <label className="text-[9.5px] font-bold text-[#556982] uppercase tracking-wider ml-0.5">Số VIN</label>
                                <input
                                    type="text"
                                    placeholder="Nhập số VIN..."
                                    className="w-full h-[34px] text-xs font-mono font-bold border border-[#dbe4ef] rounded-lg px-3 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all uppercase bg-amber-50/40 focus:bg-white"
                                    value={currentVIN || ''}
                                    onChange={(e) => handleFieldChange('VIN', e.target.value.toUpperCase())}
                                />
                                {currentVIN !== vehicle.VIN && currentVIN.length === 17 && (
                                    <p className="text-[10px] text-amber-700 mt-1 font-medium flex items-start gap-1 bg-amber-50 p-2 rounded-md border border-amber-200">
                                        <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> Chú ý: Việc thay đổi số VIN có thể ảnh hưởng đến lịch sử ghép xe.
                                    </p>
                                )}
                                {vinInvalid && (
                                    <p className="text-[10px] text-red-600 mt-1 font-bold flex items-center gap-1 bg-red-50 p-1.5 rounded-md border border-red-200 animate-fade-in">
                                        <AlertTriangle size={13} className="flex-shrink-0" /> Số VIN phải đủ 17 ký tự ({currentVIN.length}/17)
                                    </p>
                                )}
                            </div>

                            {/* Model & Version */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-0.5">
                                    <label className="text-[9.5px] font-bold text-[#556982] uppercase tracking-wider ml-0.5">Dòng Xe</label>
                                    <select
                                        className="w-full h-[34px] text-xs font-bold border border-[#dbe4ef] rounded-lg px-2.5 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all bg-[#f9fbfe]"
                                        value={currentModel || ''}
                                        onChange={(e) => handleFieldChange('Dòng xe', e.target.value)}
                                    >
                                        <option value="">-- Chọn --</option>
                                        {vehicleLines.slice().sort().map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[9.5px] font-bold text-[#556982] uppercase tracking-wider ml-0.5">Phiên Bản</label>
                                    <select
                                        className="w-full h-[34px] text-xs font-bold border border-[#dbe4ef] rounded-lg px-2.5 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all bg-[#f9fbfe]"
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
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-0.5">
                                    <label className="text-[9.5px] font-bold text-[#556982] uppercase tracking-wider ml-0.5">Ngoại Thất</label>
                                    <select
                                        className="w-full h-[34px] text-xs border border-[#dbe4ef] rounded-lg px-2.5 outline-none focus:border-[#3b82f6] transition-all bg-[#f9fbfe]"
                                        value={vehicleColors.includes(currentExterior || '') ? currentExterior : ''}
                                        onChange={(e) => handleFieldChange('Ngoại thất', e.target.value)}
                                    >
                                        <option value="">-- Chọn --</option>
                                        {vehicleColors.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[9.5px] font-bold text-[#556982] uppercase tracking-wider ml-0.5">Nội Thất</label>
                                    <select
                                        className="w-full h-[34px] text-xs border border-[#dbe4ef] rounded-lg px-2.5 outline-none focus:border-[#3b82f6] transition-all bg-[#f9fbfe]"
                                        value={currentInterior || ''}
                                        onChange={(e) => handleFieldChange('Nội thất', e.target.value)}
                                    >
                                        <option value="">-- Chọn --</option>
                                        {vehicleInteriors.map(c => <option key={c} value={c}>{c}</option>)}
                                        {currentInterior && !vehicleInteriors.includes(currentInterior) && <option value={currentInterior}>{currentInterior}</option>}
                                    </select>
                                </div>
                            </div>

                            {/* Engine & DMS */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-0.5">
                                    <label className="text-[9.5px] font-bold text-[#556982] uppercase tracking-wider ml-0.5">Số Máy</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập số máy..."
                                        className="w-full h-[34px] text-xs font-mono font-bold border border-[#dbe4ef] rounded-lg px-2.5 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all bg-[#f9fbfe]"
                                        value={currentSoMay || ''}
                                        onChange={(e) => handleFieldChange('Số máy', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[9.5px] font-bold text-[#556982] uppercase tracking-wider ml-0.5">Mã DMS</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập mã DMS..."
                                        className="w-full h-[34px] text-xs font-mono font-bold border border-[#dbe4ef] rounded-lg px-2.5 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all bg-[#f9fbfe]"
                                        value={currentMaDMS || ''}
                                        onChange={(e) => handleFieldChange('Mã DMS', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Vị trí kho */}
                            <div className="space-y-0.5">
                                <label className="text-[9.5px] font-bold text-[#556982] uppercase tracking-wider ml-0.5">Vị Trí Kho Xe</label>
                                <input
                                    type="text"
                                    placeholder="Nhập vị trí kho (VD: Hà Huy Giáp, Thuận An...)"
                                    className="w-full h-[34px] text-xs font-medium border border-[#dbe4ef] rounded-lg px-2.5 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all bg-[#f9fbfe]"
                                    value={currentViTri || ''}
                                    onChange={(e) => handleFieldChange('Vị trí', e.target.value)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Warning */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="text-red-600" size={15} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-red-800">Hành động này không thể hoàn tác dễ dàng!</p>
                                    <p className="text-[10.5px] text-red-600 mt-0.5 leading-tight">Xe sẽ bị xóa khỏi Kho. Nếu xe đang ghép với đơn hàng, hệ thống sẽ tự động hủy ghép.</p>
                                </div>
                            </div>

                            {/* Reason */}
                            <div className="space-y-1">
                                <label className="text-[9.5px] font-bold text-[#556982] uppercase tracking-wider ml-0.5">Lý do xóa (bắt buộc)</label>
                                <textarea
                                    className="w-full text-xs border border-[#dbe4ef] rounded-lg px-3 py-2 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200 transition-all resize-none h-20 bg-[#f9fbfe]"
                                    placeholder="VD: Xe bán lô, xe điều chuyển, sai dữ liệu..."
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer chuẩn sheet nhỏ gọn */}
                <footer className="px-4 py-2.5 border-t border-[#e8edf5] bg-[#fcfdff] flex items-center justify-between flex-shrink-0">
                    <button
                        type="button"
                        onClick={requestClose}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
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
                            leftIcon={<Save size={13} />}
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
                            leftIcon={<Trash2 size={13} />}
                        >
                            Xóa Xe Khỏi Kho
                        </Button>
                    )}
                </footer>

                {/* Bottom Grip Handle */}
                <div className="create-request-sheet-grip" aria-hidden="true"><span /></div>
            </section>
        </div>,
        document.body
    );
};

export default React.memo(AdminCarEditModal);
