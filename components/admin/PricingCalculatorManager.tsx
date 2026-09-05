import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '../../services/supabaseClient';

export interface PromoOption {
    name: string;
    value: string;
}

export interface PromoProgram {
    id: string;
    title?: string;
    value?: string;
    calc_type?: 'base' | 'after' | string;
    priority?: number;
    excludes?: string[];
    includes?: string[];
    is_default?: boolean;
    options?: PromoOption[];
}

export interface CarPriceConfig {
    car_name: string;
    post_id?: number;
    dlpp_discount_cap?: number; // Trần giảm giá đại lý
    versions: {
        name: string;
        price: number;
    }[];
}

export interface PricingConfigOverride {
    cars: CarPriceConfig[];
    global_promos: PromoProgram[];
}

const DEFAULT_PROMOS: PromoProgram[] = [
    {
        id: 'vinclub',
        title: 'Chương trình VinClub',
        value: '',
        calc_type: 'after',
        priority: 2,
        excludes: ['ca_qd'],
        includes: [],
        is_default: false,
        options: [
            { name: 'KH chưa có hạng', value: '0.5%' },
            { name: 'Hạng GOLD (x3 quyền lợi)', value: '1.5%' },
            { name: 'Hạng Platinum (x3 quyền lợi)', value: '3%' },
            { name: 'Hạng Diamond (x3 quyền lợi)', value: '4.5%' },
            { name: 'Hạng GOLD (Tiêu chuẩn)', value: '0.5%' },
            { name: 'Hạng Platinum (Tiêu chuẩn)', value: '1%' },
            { name: 'Hạng Diamond (Tiêu chuẩn)', value: '1.5%' }
        ]
    },
    {
        id: 'tri_an_xe_xang',
        title: 'Tri ân khách hàng xe xăng',
        value: '',
        calc_type: 'base',
        priority: 0,
        excludes: [],
        includes: [],
        is_default: false,
        options: [
            { name: 'Fadil', value: '30000000' },
            { name: 'Lux A', value: '60000000' },
            { name: 'Lux SA', value: '80000000' }
        ]
    },
    {
        id: 'ca_qd',
        title: 'Ưu đãi Công an / Quân đội',
        value: '5%',
        calc_type: 'base',
        priority: 0,
        excludes: ['vinclub'],
        includes: [],
        is_default: false
    },
    {
        id: 'coctienphong',
        title: 'Ưu đãi Cọc tiên phong',
        value: '8000000',
        calc_type: 'base',
        priority: 0,
        excludes: [],
        includes: [],
        is_default: true
    },
    {
        id: 'dong_xe',
        title: 'Ưu đãi theo dòng xe',
        value: '25000000',
        calc_type: 'base',
        priority: 0,
        excludes: [],
        includes: [],
        is_default: true
    },
    {
        id: 'vnpost',
        title: 'Ưu đãi VNPost',
        value: '',
        calc_type: 'base',
        priority: 0,
        excludes: ['ca_qd'],
        includes: [],
        is_default: false,
        options: [
            { name: 'CBNV', value: '3%' },
            { name: 'CBLĐ', value: '5%' }
        ]
    }
];

const DEFAULT_CARS: CarPriceConfig[] = [
    { car_name: 'VF 3', dlpp_discount_cap: 6000000, versions: [{ name: 'Plus', price: 296000000 }, { name: 'Eco', price: 285000000 }] },
    { car_name: 'VF 5', dlpp_discount_cap: 0, versions: [{ name: 'Plus', price: 496000000 }] },
    { car_name: 'VF 6', dlpp_discount_cap: 12000000, versions: [{ name: 'Plus', price: 699000000 }, { name: 'Eco', price: 646000000 }] },
    { car_name: 'VF 7', dlpp_discount_cap: 15000000, versions: [{ name: 'Eco', price: 740000000 }, { name: 'Eco (Có HUD)', price: 750000000 }, { name: 'Plus 1 Cầu (Trần Thép)', price: 830000000 }, { name: 'Plus 2 Cầu (Trần Thép)', price: 920000000 }] },
    { car_name: 'VF 8', dlpp_discount_cap: 20000000, versions: [{ name: 'Plus (2 Cầu)', price: 1079000000 }, { name: 'Eco (1 Cầu)', price: 898000000 }, { name: 'Eco (2 Cầu)', price: 910000000 }] },
    { car_name: 'VF 8 All-New', dlpp_discount_cap: 20000000, versions: [{ name: 'All-New Plus', price: 899000000 }] },
    { car_name: 'VF 9', dlpp_discount_cap: 25000000, versions: [{ name: 'Plus 6 Chỗ (Trần Thép)', price: 1561000000 }, { name: 'Plus 7 Chỗ (Trần Thép)', price: 1529000000 }, { name: 'Eco', price: 1348000000 }] },
    { car_name: 'VF 2', dlpp_discount_cap: 6000000, versions: [{ name: 'Tiêu Chuẩn', price: 188000000 }] },
    { car_name: 'VF MPV 7', dlpp_discount_cap: 15000000, versions: [{ name: 'Tiêu Chuẩn', price: 750000000 }] }
];

export const PricingCalculatorManager: React.FC<{ showToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void }> = ({ showToast }) => {
    const [activeTab, setActiveTab] = useState<'promos' | 'prices'>('promos');
    const [promos, setPromos] = useState<PromoProgram[]>([]);
    const [cars, setCars] = useState<CarPriceConfig[]>([]);

    // Modal state for adding new promo
    const [isAddingPromo, setIsAddingPromo] = useState(false);
    const [newPromo, setNewPromo] = useState<Partial<PromoProgram>>({
        id: '',
        title: '',
        value: '',
        calc_type: 'base',
        is_default: false
    });

    // Sub-option adding state
    const [addingOptionPromoId, setAddingOptionPromoId] = useState<string | null>(null);
    const [newOptName, setNewOptName] = useState('');
    const [newOptValue, setNewOptValue] = useState('');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            // 1. Fetch from Supabase app_settings table first
            const { data, error } = await supabaseAdmin
                .from('app_settings')
                .select('value')
                .eq('key', 'vfe_pricing_config_override')
                .maybeSingle();

            if (error) {
                console.error("Supabase select error:", error);
            }

            if (data && data.value) {
                const parsed: PricingConfigOverride = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                if (parsed.global_promos && parsed.global_promos.length > 0) setPromos(parsed.global_promos);
                else setPromos(DEFAULT_PROMOS);
                if (parsed.cars && parsed.cars.length > 0) setCars(parsed.cars);
                else setCars(DEFAULT_CARS);

                localStorage.setItem('vfe_pricing_config_override', JSON.stringify(parsed));
                return;
            }

            // 2. Fallback to localStorage
            const saved = localStorage.getItem('vfe_pricing_config_override');
            if (saved) {
                const parsed: PricingConfigOverride = JSON.parse(saved);
                if (parsed.global_promos && parsed.global_promos.length > 0) setPromos(parsed.global_promos);
                else setPromos(DEFAULT_PROMOS);
                if (parsed.cars && parsed.cars.length > 0) setCars(parsed.cars);
                else setCars(DEFAULT_CARS);
            } else {
                setPromos(DEFAULT_PROMOS);
                setCars(DEFAULT_CARS);
            }
        } catch (e) {
            console.error("Error loading pricing config:", e);
            setPromos(DEFAULT_PROMOS);
            setCars(DEFAULT_CARS);
        }
    };

    const handleSaveAll = async () => {
        const configToSave: PricingConfigOverride = {
            global_promos: promos,
            cars: cars
        };

        // Save locally for instant cache
        localStorage.setItem('vfe_pricing_config_override', JSON.stringify(configToSave));
        window.dispatchEvent(new Event('vfe_pricing_config_updated'));

        // Save to Supabase Cloud app_settings
        try {
            const { data, error } = await supabaseAdmin
                .from('app_settings')
                .upsert({
                    key: 'vfe_pricing_config_override',
                    value: configToSave,
                    updated_at: new Date().toISOString(),
                    updated_by: 'ADMIN'
                }, { onConflict: 'key' })
                .select();

            if (error) {
                console.error("Supabase upsert error:", error);
                showToast('Lỗi Supabase', 'Gặp lỗi khi đồng bộ Supabase: ' + error.message, 'error');
                return;
            }

            console.log("Upserted vfe_pricing_config_override:", data);
            showToast('Thành công', 'Đã lưu & đồng bộ cấu hình Báo Giá lên Supabase Cloud!', 'success');
        } catch (err: any) {
            console.error("Error saving to Supabase:", err);
            showToast('Lỗi', 'Không thể lưu lên Supabase: ' + (err.message || String(err)), 'error');
        }
    };

    const handleResetDefaults = async () => {
        if (!window.confirm('Bạn có chắc muốn khôi phục về cấu hình ưu đãi & giá mặc định?')) return;
        localStorage.removeItem('vfe_pricing_config_override');
        setPromos(DEFAULT_PROMOS);
        setCars(DEFAULT_CARS);

        try {
            await supabaseAdmin.from('app_settings').delete().eq('key', 'vfe_pricing_config_override');
        } catch(e) {}

        window.dispatchEvent(new Event('vfe_pricing_config_updated'));
        showToast('Đã khôi phục', 'Đã khôi phục về cài đặt gốc thành công.', 'info');
    };

    // PROMO HANDLERS
    const handleAddPromoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPromo.id || !newPromo.title) {
            showToast('Lỗi', 'Vui lòng nhập Mã ưu đãi và Tên chương trình', 'error');
            return;
        }
        const cleanId = newPromo.id.trim().toLowerCase().replace(/\s+/g, '_');
        if (promos.some(p => p.id === cleanId)) {
            showToast('Lỗi', 'Mã ưu đãi này đã tồn tại!', 'error');
            return;
        }
        const created: PromoProgram = {
            id: cleanId,
            title: newPromo.title.trim(),
            value: newPromo.value || '',
            calc_type: newPromo.calc_type || 'base',
            priority: 0,
            excludes: [],
            includes: [],
            is_default: !!newPromo.is_default,
            options: []
        };

        setPromos(prev => [...prev, created]);
        setIsAddingPromo(false);
        setNewPromo({ id: '', title: '', value: '', calc_type: 'base', is_default: false });
        showToast('Thành công', `Đã thêm ưu đãi "${created.title}"`, 'success');
    };

    const handleDeletePromo = (id: string) => {
        if (!window.confirm(`Bạn có chắc muốn xóa chương trình ưu đãi [${id}]?`)) return;
        setPromos(prev => prev.filter(p => p.id !== id));
        showToast('Đã xóa', 'Đã xóa chương trình ưu đãi.', 'info');
    };

    const handleTogglePromoDefault = (id: string) => {
        setPromos(prev => prev.map(p => p.id === id ? { ...p, is_default: !p.is_default } : p));
    };

    const handleUpdatePromoTitle = (promoId: string, title: string) => {
        setPromos(prev => prev.map(p => p.id === promoId ? { ...p, title } : p));
    };

    const handleUpdatePromoValue = (promoId: string, value: string) => {
        setPromos(prev => prev.map(p => p.id === promoId ? { ...p, value } : p));
    };

    const handleUpdatePromoCalcType = (promoId: string, calc_type: string) => {
        setPromos(prev => prev.map(p => p.id === promoId ? { ...p, calc_type } : p));
    };

    const handleAddOption = (promoId: string) => {
        if (!newOptName.trim() || !newOptValue.trim()) {
            showToast('Lỗi', 'Vui lòng nhập Tên tùy chọn và Giá trị', 'error');
            return;
        }
        setPromos(prev => prev.map(p => {
            if (p.id === promoId) {
                const currentOpts = p.options || [];
                return {
                    ...p,
                    options: [...currentOpts, { name: newOptName.trim(), value: newOptValue.trim() }]
                };
            }
            return p;
        }));
        setAddingOptionPromoId(null);
        setNewOptName('');
        setNewOptValue('');
    };

    const handleUpdateOption = (promoId: string, optIndex: number, field: 'name' | 'value', val: string) => {
        setPromos(prev => prev.map(p => {
            if (p.id === promoId && p.options) {
                const updated = [...p.options];
                updated[optIndex] = { ...updated[optIndex], [field]: val };
                return { ...p, options: updated };
            }
            return p;
        }));
    };

    const handleDeleteOption = (promoId: string, optIndex: number) => {
        setPromos(prev => prev.map(p => {
            if (p.id === promoId && p.options) {
                const updated = [...p.options];
                updated.splice(optIndex, 1);
                return { ...p, options: updated };
            }
            return p;
        }));
    };

    // CAR PRICE HANDLERS
    const handleUpdateCarVersionPrice = (carIndex: number, verIndex: number, newPrice: number) => {
        setCars(prev => {
            const next = [...prev];
            next[carIndex] = {
                ...next[carIndex],
                versions: next[carIndex].versions.map((v, i) => i === verIndex ? { ...v, price: newPrice } : v)
            };
            return next;
        });
    };

    const handleUpdateCarDlppCap = (carIndex: number, newCap: number) => {
        setCars(prev => {
            const next = [...prev];
            next[carIndex] = { ...next[carIndex], dlpp_discount_cap: newCap };
            return next;
        });
    };

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col bg-slate-50 overflow-y-auto custom-scrollbar">
            {/* MAIN ADMIN TOOLBAR HEADER - UNIFIED DESIGN */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                        <i className="fas fa-calculator text-blue-600"></i>
                        Cấu Hình Báo Giá Xe & Ưu Đãi
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Quản lý các chương trình ưu đãi, tùy chọn hạng VinClub, bảng giá niêm yết và trần đại lý</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setIsAddingPromo(true)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                    >
                        <i className="fas fa-plus"></i> Thêm Ưu Đãi Mới
                    </button>
                    <button
                        onClick={handleResetDefaults}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <i className="fas fa-undo text-xs"></i> Khôi phục mặc định
                    </button>
                    <button
                        onClick={handleSaveAll}
                        className="flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5"
                    >
                        <i className="fas fa-save"></i> Lưu Cấu Hình Ngay
                    </button>
                </div>
            </div>

            {/* FOLDER TABS NAVIGATION - MATCHING ADMIN CATEGORY FOLDER TABS */}
            <div className="flex items-center gap-2 border-b border-slate-200 mb-5 bg-white px-2 pt-2 rounded-t-xl border-x shadow-2xs">
                <button
                    onClick={() => setActiveTab('promos')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
                        activeTab === 'promos'
                            ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
                    }`}
                >
                    <i className={`fas fa-folder ${activeTab === 'promos' ? 'text-amber-500' : 'text-slate-400'}`}></i>
                    <span>Chương Trình Ưu Đãi</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono ${activeTab === 'promos' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                        {promos.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('prices')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
                        activeTab === 'prices'
                            ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
                    }`}
                >
                    <i className={`fas fa-folder ${activeTab === 'prices' ? 'text-amber-500' : 'text-slate-400'}`}></i>
                    <span>Bảng Giá Xe & Trần Đại Lý</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono ${activeTab === 'prices' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                        {cars.length}
                    </span>
                </button>
            </div>

            {/* TAB 1: QUẢN LÝ CHƯƠNG TRÌNH ƯU ĐÃI */}
            {activeTab === 'promos' && (
                <div className="space-y-5">
                    {/* MODAL THÊM ƯU ĐÃI */}
                    {isAddingPromo && (
                        <form onSubmit={handleAddPromoSubmit} className="bg-white p-4 rounded-xl border-2 border-blue-500 shadow-md space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider flex items-center gap-2">
                                    <i className="fas fa-plus-circle text-blue-600"></i> Thêm Chương Trình Ưu Đãi Mới
                                </h3>
                                <button type="button" onClick={() => setIsAddingPromo(false)} className="text-slate-400 hover:text-slate-600">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mã Ưu Đãi (ID độc nhất)</label>
                                    <input
                                        type="text"
                                        placeholder="Vd: uu_dai_thang_8"
                                        value={newPromo.id || ''}
                                        onChange={e => setNewPromo({ ...newPromo, id: e.target.value })}
                                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Chương Trình</label>
                                    <input
                                        type="text"
                                        placeholder="Vd: Ưu đãi đặc biệt tháng 8"
                                        value={newPromo.title || ''}
                                        onChange={e => setNewPromo({ ...newPromo, title: e.target.value })}
                                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mức Giảm Tùy Chọn (% hoặc tiền)</label>
                                    <input
                                        type="text"
                                        placeholder="Vd: 5% hoặc 10000000"
                                        value={newPromo.value || ''}
                                        onChange={e => setNewPromo({ ...newPromo, value: e.target.value })}
                                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Kiểu Tính Giá</label>
                                    <select
                                        value={newPromo.calc_type || 'base'}
                                        onChange={e => setNewPromo({ ...newPromo, calc_type: e.target.value as any })}
                                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                                    >
                                        <option value="base">Trừ trước (Giá gốc niêm yết)</option>
                                        <option value="after">Trừ sau (VinClub - Trừ sau ưu đãi khác)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={!!newPromo.is_default}
                                        onChange={e => setNewPromo({ ...newPromo, is_default: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    Tự động Tích chọn Mặc định khi tải trang
                                </label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setIsAddingPromo(false)} className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-medium">Hủy</button>
                                    <button type="submit" className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold">Xác nhận Thêm</button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* PROMO CARDS GRID - MATCHING ADMIN TABLE / CARD STYLE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {promos.map((promo) => (
                            <div key={promo.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                                {/* CARD HEADER */}
                                <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex justify-between items-center">
                                    <div className="flex items-center gap-2 flex-1">
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-mono font-bold text-[10px] rounded-md uppercase">{promo.id}</span>
                                        <input
                                            type="text"
                                            value={promo.title || ''}
                                            onChange={e => handleUpdatePromoTitle(promo.id, e.target.value)}
                                            className="font-bold text-xs text-slate-800 flex-1 px-2 py-1 bg-white border border-slate-300 rounded outline-none focus:border-blue-500"
                                            placeholder="Tên chương trình ưu đãi..."
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleDeletePromo(promo.id)}
                                        className="text-slate-400 hover:text-red-600 p-1 transition-colors ml-2"
                                        title="Xóa ưu đãi này"
                                    >
                                        <i className="fas fa-trash-alt text-xs"></i>
                                    </button>
                                </div>

                                <div className="p-3 space-y-3">
                                    {/* PROMO VALUE & CALC TYPE */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                            <span className="text-slate-500 font-medium">Mức giảm:</span>
                                            <input
                                                type="text"
                                                value={promo.value || ''}
                                                onChange={e => handleUpdatePromoValue(promo.id, e.target.value)}
                                                placeholder="Vd: 5% hoặc 8tr"
                                                className="w-full font-bold text-slate-800 px-1.5 py-0.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                            <span className="text-slate-500 font-medium">Loại:</span>
                                            <select
                                                value={promo.calc_type || 'base'}
                                                onChange={e => handleUpdatePromoCalcType(promo.id, e.target.value)}
                                                className="w-full font-semibold text-slate-800 px-1 py-0.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500"
                                            >
                                                <option value="base">Trừ trước (Giá gốc)</option>
                                                <option value="after">Trừ sau (VinClub)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* SUB-OPTIONS TABLE */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-700">
                                            <span>Dropdown con ({promo.options?.length || 0})</span>
                                            <button
                                                onClick={() => setAddingOptionPromoId(addingOptionPromoId === promo.id ? null : promo.id)}
                                                className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold flex items-center gap-1"
                                            >
                                                <i className="fas fa-plus-circle"></i> Thêm tùy chọn
                                            </button>
                                        </div>

                                        {addingOptionPromoId === promo.id && (
                                            <div className="flex gap-2 items-center bg-blue-50/50 p-2 border-b border-slate-200">
                                                <input
                                                    type="text"
                                                    placeholder="Tên (Vd: Hạng Diamond)"
                                                    value={newOptName}
                                                    onChange={e => setNewOptName(e.target.value)}
                                                    className="flex-1 text-xs px-2 py-1 border border-slate-300 rounded outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Giá trị (Vd: 4.5%)"
                                                    value={newOptValue}
                                                    onChange={e => setNewOptValue(e.target.value)}
                                                    className="w-28 text-xs px-2 py-1 border border-slate-300 rounded outline-none"
                                                />
                                                <button onClick={() => handleAddOption(promo.id)} className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-bold hover:bg-blue-700">Lưu</button>
                                            </div>
                                        )}

                                        {promo.options && promo.options.length > 0 ? (
                                            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto custom-scrollbar">
                                                {promo.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 text-xs">
                                                        <input
                                                            type="text"
                                                            value={opt.name}
                                                            onChange={e => handleUpdateOption(promo.id, oIdx, 'name', e.target.value)}
                                                            className="flex-1 font-medium text-slate-700 px-1.5 py-0.5 border border-slate-200 rounded outline-none focus:border-blue-500"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={opt.value}
                                                            onChange={e => handleUpdateOption(promo.id, oIdx, 'value', e.target.value)}
                                                            className="w-24 font-bold text-blue-700 text-center px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded outline-none text-[11px]"
                                                        />
                                                        <button
                                                            onClick={() => handleDeleteOption(promo.id, oIdx)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                            title="Xóa dòng này"
                                                        >
                                                            <i className="fas fa-times text-xs"></i>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[11px] italic text-slate-400 p-2.5 text-center">Không có tùy chọn con (Áp dụng mức giảm chung)</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-slate-50 px-3 py-2 border-t border-slate-200 flex justify-between items-center">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                                        <input
                                            type="checkbox"
                                            checked={!!promo.is_default}
                                            onChange={() => handleTogglePromoDefault(promo.id)}
                                            className="w-3.5 h-3.5 text-blue-600 rounded"
                                        />
                                        Tự động tích chọn mặc định
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: BẢNG GIÁ XE & TRẦN GIẢM GIÁ ĐẠI LÝ - MATCHING ADMIN TABLE STYLE */}
            {activeTab === 'prices' && (
                <div className="border border-slate-200 bg-white rounded-xl shadow-2xs overflow-hidden">
                    <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <i className="fas fa-shield-alt text-blue-600"></i>
                            Bảng Giá Niêm Yết & Trần Giảm Giá Showroom/Đại Lý (ĐLPP)
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 border-r border-slate-200 font-bold text-slate-700 uppercase tracking-wider w-36">Dòng Xe</th>
                                    <th className="p-3 border-r border-slate-200 font-bold text-slate-700 uppercase tracking-wider w-64">Trần ĐLPP Giảm Tối Đa</th>
                                    <th className="p-3 font-bold text-slate-700 uppercase tracking-wider">Phiên Bản & Giá Niêm Yết</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {cars.map((car, cIdx) => (
                                    <tr key={car.car_name} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-bold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-car-side text-blue-500"></i>
                                                <span className="text-sm">{car.car_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 border-r border-slate-200">
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="number"
                                                    step="1000000"
                                                    value={car.dlpp_discount_cap ?? 0}
                                                    onChange={e => handleUpdateCarDlppCap(cIdx, Number(e.target.value))}
                                                    className="w-36 text-xs px-2.5 py-1 bg-white border border-slate-300 rounded font-bold text-slate-800 focus:border-blue-500 outline-none"
                                                />
                                                <span className="text-xs text-slate-500 font-semibold">VNĐ</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {car.versions.map((ver, vIdx) => (
                                                    <div key={ver.name} className="bg-slate-50 p-2 rounded border border-slate-200 flex justify-between items-center">
                                                        <span className="text-xs font-semibold text-slate-700">{ver.name}</span>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                step="1000000"
                                                                value={ver.price}
                                                                onChange={e => handleUpdateCarVersionPrice(cIdx, vIdx, Number(e.target.value))}
                                                                className="w-28 text-xs font-bold text-blue-700 px-2 py-1 border border-slate-300 rounded text-right focus:border-blue-500 outline-none"
                                                            />
                                                            <span className="text-[10px] text-slate-400">đ</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PricingCalculatorManager;
