import React, { useState, useMemo, useEffect } from 'react';
import { exportOrdersToExcel } from '../../utils/excelUtils';
import { getCarPrices, getPolicyRules, getCarColorPrices, CarPrice, PolicyRule, ColorPrice } from '../../services/api/priceService';
import { Check, Receipt, Car, Palette, ShieldCheck, FileText, Info } from 'lucide-react';

export const PricingCalculatorView: React.FC = () => {
    const [carPrices, setCarPrices] = useState<CarPrice[]>([]);
    const [policyRules, setPolicyRules] = useState<PolicyRule[]>([]);
    const [colorPrices, setColorPrices] = useState<ColorPrice[]>([]);
    const [selectedCarIndex, setSelectedCarIndex] = useState<number>(0);
    const [selectedColorIndex, setSelectedColorIndex] = useState<number>(-1);
    const [selectedPolicies, setSelectedPolicies] = useState<Set<string>>(new Set());
    const [csbhDiscount, setCsbhDiscount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [mobileTab, setMobileTab] = useState<'car' | 'policy' | 'result'>('car');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [prices, rules, colors] = await Promise.all([
                getCarPrices(), 
                getPolicyRules(),
                getCarColorPrices()
            ]);
            setCarPrices(prices);
            setPolicyRules(rules);
            setColorPrices(colors);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const selectedCar = carPrices[selectedCarIndex];
    
    const availableColors = useMemo(() => {
        if (!selectedCar) return [];
        return colorPrices.filter(c => c.model === selectedCar.model);
    }, [selectedCar, colorPrices]);

    const availablePolicies = useMemo(() => {
        if (!selectedCar) return [];
        return policyRules.filter(p => {
            if (p.name.includes('CSBH NPP') || p.name.includes('CSBH Đại lý')) return false;
            return !p.apply_to_models || p.apply_to_models.includes(selectedCar.model);
        });
    }, [selectedCar, policyRules]);

    const togglePolicy = (id: string) => {
        const next = new Set(selectedPolicies);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedPolicies(next);
    };

    const calculation = useMemo(() => {
        if (!selectedCar) return { msrp: 0, colorPrice: 0, totalBase: 0, invoiceSurcharges: 0, invoiceDeductions: 0, nonInvoiceDeductions: 0, invoicePrice: 0, collectionPrice: 0 };
        
        const msrp = selectedCar.msrp_price;
        let colorPrice = selectedColorIndex >= 0 ? availableColors[selectedColorIndex].additional_price : 0;
        
        const totalBase = msrp + colorPrice;

        let invoiceDeductions = csbhDiscount;
        let invoiceSurcharges = 0;
        let nonInvoiceDeductions = 0;

        availablePolicies.forEach(p => {
            if (selectedPolicies.has(p.id)) {
                let amount = p.is_percentage ? (msrp * p.value / 100) : p.value;
                
                if (p.name.includes('Miễn phí màu') && colorPrice > 0) {
                    amount = colorPrice;
                }

                if (p.rule_type === 'SURCHARGE') {
                    if (p.deduct_from_invoice) {
                        invoiceSurcharges += amount;
                    }
                } else {
                    if (p.deduct_from_invoice) {
                        invoiceDeductions += amount;
                    } else {
                        nonInvoiceDeductions += amount;
                    }
                }
            }
        });

        const invoicePrice = totalBase + invoiceSurcharges - invoiceDeductions;
        const collectionPrice = invoicePrice - nonInvoiceDeductions;

        return {
            msrp, colorPrice, totalBase, invoiceSurcharges, invoiceDeductions, nonInvoiceDeductions, invoicePrice, collectionPrice
        };
    }, [selectedCar, selectedColorIndex, availableColors, selectedPolicies, policyRules, availablePolicies, csbhDiscount]);

    const handleExport = () => {
        if (!selectedCar) return;
        const data = [
            {
                'Dòng xe': selectedCar.model,
                'Phiên bản': selectedCar.version,
                'Loại': selectedCar.type,
                'Giá Niêm Yết': calculation.msrp,
                'Màu sắc': selectedColorIndex >= 0 ? availableColors[selectedColorIndex].color_name : 'Tiêu chuẩn',
                'Phụ phí màu': calculation.colorPrice,
                'Tổng giá cơ bản': calculation.totalBase,
                'Phụ phí trang bị': calculation.invoiceSurcharges,
                'Ưu đãi NPP & Đại lý': csbhDiscount,
                'Chính sách áp dụng': Array.from(selectedPolicies).map(id => policyRules.find(r => r.id === id)?.name).join('; '),
                'Tổng giảm hóa đơn': calculation.invoiceDeductions,
                'Giá Hóa Đơn': calculation.invoicePrice,
                'Tổng giảm ngoài': calculation.nonInvoiceDeductions,
                'Giá Thu': calculation.collectionPrice
            }
        ];
        exportOrdersToExcel(data, `Bang_Tinh_Gia_${selectedCar.model.replace(/ /g, '_')}`);
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    if (isLoading) return <div className="p-12 text-center text-slate-500 animate-pulse">Đang tải dữ liệu tính giá...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
            {/* Mobile Tab Switcher */}
            <div className="flex lg:hidden border-b border-slate-200 bg-white shrink-0">
                {([['car', 'Chọn Xe', 'fa-car'], ['policy', 'Chính Sách', 'fa-shield-alt'], ['result', 'Kết Quả', 'fa-receipt']] as const).map(([tab, label, icon]) => (
                    <button key={tab} onClick={() => setMobileTab(tab)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-black uppercase tracking-wider transition-colors border-b-2 ${
                            mobileTab === tab ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}>
                        <i className={`fas ${icon} text-xs`}></i>
                        <span>{label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* 1. Car & Color Selection (Ultra Compact Left) */}
                <div className={`lg:w-64 flex-col bg-white border-r border-slate-200 overflow-hidden ${mobileTab === 'car' ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'}`}>
                    <div className="p-3 flex-1 flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Car size={14} className="text-slate-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dòng Xe</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 no-scrollbar">
                            {carPrices.map((car, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => { setSelectedCarIndex(idx); setSelectedColorIndex(-1); }}
                                    className={`p-2 rounded-lg border transition-all cursor-pointer ${selectedCarIndex === idx ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="font-black text-[10px] truncate">{car.model}</div>
                                        <div className={`text-[7px] font-black px-1 rounded-full ${selectedCarIndex === idx ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{car.type}</div>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <div className={`text-[8px] opacity-70 truncate`}>{car.version}</div>
                                        <div className={`text-[9px] font-black ${selectedCarIndex === idx ? 'text-white' : 'text-indigo-600'}`}>{formatMoney(car.msrp_price).replace(',00\u00a0\u20ab', 'M')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <Palette size={14} className="text-slate-400" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Màu sắc</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                <div 
                                    onClick={() => setSelectedColorIndex(-1)}
                                    className={`p-1.5 rounded-md border text-center cursor-pointer transition-all ${selectedColorIndex === -1 ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <div className="text-[8px] font-black">Tiêu chuẩn</div>
                                </div>
                                {availableColors.map((color, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => setSelectedColorIndex(idx)}
                                        className={`p-1.5 rounded-md border text-center cursor-pointer transition-all ${selectedColorIndex === idx ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <div className="text-[8px] font-black truncate">{color.color_name}</div>
                                        <div className={`text-[7px] mt-0.5 opacity-80`}>+{formatMoney(color.additional_price).replace(',00\u00a0\u20ab', 'M')}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Policies (The "Tùm Lum" Area Fixed) */}
                <div className={`flex-1 bg-slate-50 flex-col overflow-hidden ${mobileTab === 'policy' ? 'flex' : 'hidden lg:flex'}`}>
                    <div className="p-4 overflow-y-auto no-scrollbar">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={16} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Chính sách ưu đãi & Trang bị</span>
                            </div>
                            
                            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Ưu đãi NPP & Đại lý</span>
                                <input 
                                    type="text" 
                                    value={csbhDiscount.toLocaleString('vi-VN')}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                        setCsbhDiscount(val);
                                    }}
                                    className="w-24 bg-transparent outline-none text-[11px] font-black text-indigo-600 text-right"
                                    placeholder="0"
                                />
                                <span className="text-[9px] font-black text-slate-300">đ</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(
                                availablePolicies.reduce((acc, p) => {
                                    if (!acc[p.category]) acc[p.category] = [];
                                    acc[p.category].push(p);
                                    return acc;
                                }, {} as Record<string, typeof availablePolicies>)
                            ).map(([category, policies]) => (
                                <div key={category} className="space-y-2">
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                                        <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                        {category}
                                    </div>
                                    <div className="space-y-1">
                                        {policies.map(p => (
                                            <div 
                                                key={p.id} 
                                                className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${selectedPolicies.has(p.id) ? (p.rule_type === 'SURCHARGE' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200') : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                                onClick={() => togglePolicy(p.id)}
                                            >
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="text-[10px] font-black text-slate-700 truncate">{p.name}</div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`text-[9px] font-black ${p.rule_type === 'SURCHARGE' ? 'text-red-500' : 'text-emerald-600'}`}>
                                                            {p.rule_type === 'SURCHARGE' ? '+' : '-'}{p.is_percentage ? `${p.value}%` : formatMoney(p.value).replace(',00\u00a0\u20ab', 'M')}
                                                        </span>
                                                        <span className={`text-[7px] font-black px-1 rounded bg-slate-100 text-slate-500 uppercase`}>
                                                            {p.deduct_from_invoice ? 'HĐ' : 'Thu'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`shrink-0 w-4 h-4 rounded flex items-center justify-center ${selectedPolicies.has(p.id) ? (p.rule_type === 'SURCHARGE' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white') : 'bg-slate-100 text-transparent'}`}>
                                                    <Check size={10} strokeWidth={4} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Result Summary (Premium Sticky Right) */}
                <div className={`lg:w-80 bg-slate-900 flex-col shadow-2xl relative overflow-hidden ${mobileTab === 'result' ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'}`}>
                    <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full bg-indigo-500 blur-3xl"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 rounded-full bg-emerald-500 blur-3xl"></div>
                    </div>

                    <div className="relative p-5 flex flex-col h-full text-white overflow-y-auto no-scrollbar">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 opacity-60">
                                <Receipt size={16} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Chi phí chi tiết</span>
                            </div>
                            <button onClick={handleExport} className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center gap-1.5 transition-all">
                                <FileText size={12} />
                                <span className="text-[8px] font-black">EXCEL</span>
                            </button>
                        </div>

                        <div className="space-y-5 flex-1">
                            <div className="pb-4 border-b border-white/10">
                                <div className="text-xl font-black tracking-tight mb-0.5">{selectedCar?.model}</div>
                                <div className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">{selectedCar?.version} • {selectedCar?.type}</div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] opacity-50">
                                    <span>Giá Niêm Yết</span>
                                    <span>{formatMoney(calculation.msrp)}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="opacity-50">Màu: {selectedColorIndex >= 0 ? availableColors[selectedColorIndex].color_name : 'Tiêu chuẩn'}</span>
                                    <span className="text-indigo-400 font-black">+{formatMoney(calculation.colorPrice)}</span>
                                </div>
                                {calculation.invoiceSurcharges > 0 && (
                                    <div className="flex justify-between text-[10px]">
                                        <span className="opacity-50">Phụ phí trang bị</span>
                                        <span className="text-red-400 font-black">+{formatMoney(calculation.invoiceSurcharges)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 font-black text-xs border-t border-white/5">
                                    <span>Tổng giá cơ bản</span>
                                    <span className="text-sm">{formatMoney(calculation.totalBase + calculation.invoiceSurcharges)}</span>
                                </div>
                            </div>

                            <div className="space-y-5 pt-4 border-t border-white/10">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-orange-400 font-black uppercase tracking-wider">Khấu trừ hóa đơn</span>
                                        <span className="text-orange-400 font-black">-{formatMoney(calculation.invoiceDeductions)}</span>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                                        <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Giá Xuất Hóa Đơn</div>
                                        <div className="text-xl font-black text-white">{formatMoney(calculation.invoicePrice)}</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-emerald-400 font-black uppercase tracking-wider">Khấu trừ giá thu</span>
                                        <span className="text-emerald-400 font-black">-{formatMoney(calculation.nonInvoiceDeductions)}</span>
                                    </div>
                                    <div className="bg-emerald-500/20 p-5 rounded-2xl border border-emerald-500/30 text-center shadow-[0_0_40px_-12px_rgba(16,185,129,0.3)]">
                                        <div className="text-[8px] text-emerald-400 font-black uppercase tracking-widest mb-0.5">Giá Thu Thực Tế</div>
                                        <div className="text-2xl font-black text-emerald-400">{formatMoney(calculation.collectionPrice)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10 opacity-30">
                            <div className="flex items-start gap-1.5">
                                <Info size={12} className="shrink-0" />
                                <p className="text-[8px] italic leading-tight">Giá bao gồm VAT. Không bao gồm thuế phí đăng ký xe.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingCalculatorView;
