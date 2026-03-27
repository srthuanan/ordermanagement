import React, { useState, useEffect, FormEvent } from 'react';
import { Order } from '../../types';
import { versionsMap, allPossibleVersions, defaultExteriors, interiorColorRules } from '../../constants';
import * as apiService from '../../services/apiService';
import moment from 'moment';

import Button from '../ui/Button';

interface SuperEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    order: Order | null;
}

const SuperEditModal: React.FC<SuperEditModalProps> = ({ isOpen, onClose, onSuccess, showToast, order }) => {
    const [formData, setFormData] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableInteriors, setAvailableInteriors] = useState<string[]>(defaultExteriors);

    useEffect(() => {
        if (order) {
            setFormData({
                "Tên khách hàng": order["Tên khách hàng"],
                "Số đơn hàng": order["Số đơn hàng"],
                "Dòng xe": order["Dòng xe"],
                "Phiên bản": order["Phiên bản"],
                "Ngoại thất": order["Ngoại thất"],
                "Nội thất": order["Nội thất"],
                "Ngày cọc": order["Ngày cọc"] ? moment(order["Ngày cọc"]).format('YYYY-MM-DDTHH:mm') : '',
                "Tên tư vấn bán hàng": order["Tên tư vấn bán hàng"],
                "VIN": order["VIN"] || order["SỐ VIN"] || '',
                "Số máy": order["Số động cơ"] || order["SỐ ĐỘNG CƠ"] || '',
                "Kết quả": order["Kết quả"],
                "Trạng thái VC": order["Trạng thái VC"],
                "Ngày xuất hóa đơn": order["Ngày xuất hóa đơn"] ? moment(order["Ngày xuất hóa đơn"], ["DD/MM/YYYY", "YYYY-MM-DD"]).format('YYYY-MM-DD') : '',
                "LinkHoaDonDaXuat": order["LinkHoaDonDaXuat"] || order["url_hoa_don_da_xuat"] || ''
            });
        }
    }, [order]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
        const { 'Dòng xe': dong_xe, 'Phiên bản': phien_ban } = formData;
        if (!dong_xe) { setAvailableInteriors(defaultExteriors); return; }
        const lowerDongXe = (dong_xe as string).toLowerCase();
        const lowerPhienBan = (phien_ban as string).toLowerCase();
        let interiors = defaultExteriors;
        for (const rule of interiorColorRules) {
            if (rule.models.includes(lowerDongXe) && (!rule.versions || rule.versions.includes(lowerPhienBan))) {
                interiors = rule.colors; break;
            }
        }
        setAvailableInteriors(interiors);
    }, [formData['Dòng xe'], formData['Phiên bản']]);

    if (!isOpen || !order) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
//         showToast('Đang xử lý siêu đồng bộ...', 'Vui lòng chờ trong giây lát.', 'loading');

        try {
            const result = await apiService.superUpdateOrderDetails(order['Số đơn hàng'], formData);
            onSuccess(result.message);
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Lỗi không xác định.";
            showToast('Thất Bại', message, 'error', 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = "w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-sm";
    const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 shadow-sm";

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
            
            <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-white/20 animate-fade-in-scale-up flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
                <header className="shrink-0 p-5 border-b border-red-100 bg-gradient-to-r from-red-50 via-white to-red-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                            <i className="fas fa-shield-alt text-xl"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">SIÊU CHỈNH SỬA ADMIN</h2>
                            <p className="text-xs text-red-600 font-bold uppercase tracking-tighter">Chế độ đồng bộ dữ liệu toàn hệ thống</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-6 flex items-start gap-4 shadow-inner">
                        <i className="fas fa-info-circle text-red-500 mt-1"></i>
                        <div>
                            <p className="text-xs font-bold text-red-800">CẢNH BÁO:</p>
                            <p className="text-xs text-red-700 leading-relaxed">
                                Bạn đang ở chế độ chỉnh sửa cấp cao nhất. Thay đổi tại đây sẽ được <b>ép buộc đồng bộ</b> trên tất cả các bảng dữ liệu (Đơn hàng, Yêu cầu XHĐ, Yêu cầu VC, Lưu trữ) dựa trên Số đơn hàng cũ. 
                                Nếu thay đổi Số đơn hàng hoặc VIN, hệ thống sẽ tự động cập nhật liên kết.
                            </p>
                        </div>
                    </div>

                    <form id="super-edit-form" onSubmit={handleSubmit} className="space-y-8">
                        {/* Section 1: Core Identifiers */}
                        <section>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="w-8 h-px bg-slate-200"></span> 01. ĐỊNH DANH CỐT LÕI
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1">
                                    <label className={labelClass}>Số Đơn Hàng</label>
                                    <input name="Số đơn hàng" value={formData["Số đơn hàng"] || ''} onChange={handleInputChange} className={`${inputClass} font-mono text-red-700 border-red-100 bg-red-50/30`} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className={labelClass}>Số Khung (VIN)</label>
                                    <input name="VIN" value={formData["VIN"] || ''} onChange={handleInputChange} className={`${inputClass} font-mono`} placeholder="Nhập VIN..." />
                                </div>
                                <div className="md:col-span-1">
                                    <label className={labelClass}>Số Máy</label>
                                    <input name="Số máy" value={formData["Số máy"] || ''} onChange={handleInputChange} className={`${inputClass} font-mono`} placeholder="Nhập số máy..." />
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Customer & Sales */}
                        <section>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="w-8 h-px bg-slate-200"></span> 02. KHÁCH HÀNG & TVBH
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Tên Khách Hàng</label>
                                    <input name="Tên khách hàng" value={formData["Tên khách hàng"] || ''} onChange={handleInputChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Tên TVBH</label>
                                    <input name="Tên tư vấn bán hàng" value={formData["Tên tư vấn bán hàng"] || ''} onChange={handleInputChange} className={inputClass} />
                                </div>
                            </div>
                        </section>

                        {/* Section 3: Vehicle Specs */}
                        <section>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="w-8 h-px bg-slate-200"></span> 03. CẤU HÌNH SẢN PHẨM
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <label className={labelClass}>Dòng Xe</label>
                                    <select name="Dòng xe" value={formData["Dòng xe"] || ''} onChange={handleInputChange} className={inputClass}>
                                        <option value="">Chọn dòng xe</option>
                                        {Object.keys(versionsMap).map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Phiên Bản</label>
                                    <select name="Phiên bản" value={formData["Phiên bản"] || ''} onChange={handleInputChange} className={inputClass}>
                                        <option value="">Chọn phiên bản</option>
                                        {(formData["Dòng xe"] ? versionsMap[formData["Dòng xe"] as keyof typeof versionsMap] || allPossibleVersions : allPossibleVersions).map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Ngoại Thất</label>
                                    <select name="Ngoại thất" value={formData["Ngoại thất"] || ''} onChange={handleInputChange} className={inputClass}>
                                        {defaultExteriors.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Nội Thất</label>
                                    <select name="Nội thất" value={formData["Nội thất"] || ''} onChange={handleInputChange} className={inputClass}>
                                        {availableInteriors.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Section 4: Status & Timeline */}
                        <section>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="w-8 h-px bg-slate-200"></span> 04. TRẠNG THÁI & THỜI GIAN
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={labelClass}>Kết Quả (Trạng Thái ĐH)</label>
                                    <input name="Kết quả" value={formData["Kết quả"] || ''} onChange={handleInputChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Trạng Thái VC</label>
                                    <input name="Trạng thái VC" value={formData["Trạng thái VC"] || ''} onChange={handleInputChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Ngày Cọc</label>
                                    <input name="Ngày cọc" type="datetime-local" value={formData["Ngày cọc"] || ''} onChange={handleInputChange} className={inputClass} />
                                </div>
                            </div>
                        </section>

                        {/* Section 5: Invoice Info */}
                        <section>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="w-8 h-px bg-slate-200"></span> 05. THÔNG TIN HÓA ĐƠN
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Ngày Xuất Hóa Đơn</label>
                                    <input name="Ngày xuất hóa đơn" type="date" value={formData["Ngày xuất hóa đơn"] || ''} onChange={handleInputChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Link Hóa Đơn (URL)</label>
                                    <input name="LinkHoaDonDaXuat" value={formData["LinkHoaDonDaXuat"] || ''} onChange={handleInputChange} className={inputClass} placeholder="https://..." />
                                </div>
                            </div>
                        </section>
                    </form>
                </main>

                <footer className="shrink-0 p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Hủy Bỏ</Button>
                    <div className="flex gap-3">
                        <Button 
                            type="submit" 
                            form="super-edit-form" 
                            variant="primary" 
                            className="bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shadow-red-600/20"
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                        >
                            XÁC NHẬN SIÊU ĐỒNG BỘ
                        </Button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default SuperEditModal;
