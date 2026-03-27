import React, { useState, useRef } from 'react';
import { StockVehicle } from '../../types';
import Button from '../ui/Button';

interface HoldExtensionModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: StockVehicle | null;
    onRequestExtension: (vin: string, file: File, reason: string) => void;
}

const HoldExtensionModal: React.FC<HoldExtensionModalProps> = ({ isOpen, onClose, vehicle, onRequestExtension }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen || !vehicle) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (selectedFile.type.startsWith('image/')) {
                const url = URL.createObjectURL(selectedFile);
                setPreviewUrl(url);
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const handleSubmit = () => {
        if (file && vehicle) {
            onRequestExtension(vehicle.VIN, file, reason);
            onClose();
            // Cleanup
            setFile(null);
            setPreviewUrl(null);
            setReason('');
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-zoom-in">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gia hạn giữ xe</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Yêu cầu thêm thời gian giữ VIN: {vehicle.VIN}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-400">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                            <i className="fas fa-info-circle"></i>
                        </div>
                        <div className="text-xs text-blue-800 leading-relaxed font-medium">
                            Hãy tải lên minh chứng (ảnh cọc, hợp đồng, hoặc tin nhắn khách hàng) để Quản trị viên phê duyệt yêu cầu gia hạn thêm 12h.
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lý do gia hạn</label>
                        <textarea 
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Nhập lý do ví dụ: Khách đang ở Showroom, đang làm thủ tục trả góp..."
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Minh chứng (Ảnh/PDF)</label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${file ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/20'}`}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*,application/pdf"
                                onChange={handleFileChange}
                            />

                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="max-h-32 rounded-lg shadow-md mb-3" />
                            ) : file ? (
                                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3 text-2xl">
                                    <i className="fas fa-file-pdf"></i>
                                </div>
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-3 text-2xl">
                                    <i className="fas fa-cloud-upload-alt"></i>
                                </div>
                            )}

                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                                {file ? file.name : 'Chọn tệp minh chứng'}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-1">Hỗ trợ IMAGE, PDF (Max 10MB)</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} size="sm" className="rounded-xl px-4 font-bold">Hủy bỏ</Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSubmit} 
                        disabled={!file} 
                        size="sm" 
                        className="rounded-xl px-6 bg-slate-900 border-none shadow-lg shadow-slate-900/20 font-black uppercase tracking-wider text-[10px]"
                    >
                        Gửi yêu cầu
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default HoldExtensionModal;
