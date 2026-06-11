import React, { useState } from 'react';
import { useVehicleConfig } from '../../hooks/useVehicleConfig';
import { addVehicleConfig, deleteVehicleConfig } from '../../services/api/vehicleConfigService';

export const VehicleConfigManager = ({ showToast }: { showToast: any }) => {
    const { refreshConfigs } = useVehicleConfig();
    const [activeTab, setActiveTab] = useState<'versions' | 'colors'>('versions');
    const [newLine, setNewLine] = useState('');
    const [newVersion, setNewVersion] = useState('');
    const [selectedLine, setSelectedLine] = useState('');
    const [newColor, setNewColor] = useState('');
    const [newColorType, setNewColorType] = useState<'exterior' | 'interior'>('exterior');
    const [isProcessing, setIsProcessing] = useState(false);

    const LineCard = ({ line, versions, handleAddConfig, handleDeleteConfig, isProcessing }: any) => {
        const [versionInput, setVersionInput] = useState('');
        return (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4 animate-fade-in-scale-up relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 pl-2">
                    <h4 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        {line.value}
                    </h4>
                    <button onClick={() => handleDeleteConfig(line.id)} disabled={isProcessing} className="text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
                        <i className="fas fa-trash mr-1"></i> Xóa dòng xe
                    </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4 pl-2">
                    {versions.map((version: any) => (
                        <span key={version.id} className="inline-flex items-center bg-slate-50 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                            {version.value}
                            <button onClick={() => handleDeleteConfig(version.id)} disabled={isProcessing} className="ml-2 text-slate-400 hover:text-red-500 transition-colors w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50">
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </span>
                    ))}
                    {versions.length === 0 && <span className="text-slate-400 text-sm italic py-1">Chưa có phiên bản nào.</span>}
                </div>
                
                <div className="flex gap-2 max-w-sm pl-2">
                    <input 
                        value={versionInput}
                        onChange={e => setVersionInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && versionInput.trim()) {
                                handleAddConfig('version', versionInput, line.value);
                                setVersionInput('');
                            }
                        }}
                        placeholder={`+ Thêm phiên bản cho ${line.value}...`}
                        className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                    />
                    <button 
                        disabled={isProcessing || !versionInput.trim()} 
                        onClick={() => { handleAddConfig('version', versionInput, line.value); setVersionInput(''); }}
                        className="px-4 py-2 bg-slate-800 text-white text-sm rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors font-semibold"
                    >
                        Lưu
                    </button>
                </div>
            </div>
        );
    };
    
    const [rawConfigs, setRawConfigs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
        loadRawConfigs();
    }, []);

    const loadRawConfigs = async () => {
        setIsLoading(true);
        const { getVehicleConfigs } = await import('../../services/api/vehicleConfigService');
        const res = await getVehicleConfigs();
        if (res.status === 'SUCCESS') setRawConfigs(res.data || []);
        setIsLoading(false);
    };

    const handleAddConfig = async (type: string, value: string, parentValue: string | null = null) => {
        if (!value.trim()) return;
        setIsProcessing(true);
        const res = await addVehicleConfig(type, value.trim(), parentValue);
        if (res.status === 'SUCCESS') {
            showToast('Thành công', 'Đã thêm cấu hình.', 'success');
            await loadRawConfigs();
            await refreshConfigs();
            setNewLine(''); setNewVersion(''); setNewColor('');
        } else {
            showToast('Lỗi', 'Không thể thêm: ' + res.message, 'error');
        }
        setIsProcessing(false);
    };

    const handleDeleteConfig = async (id: string) => {
        if (!window.confirm('Bạn có chắc muốn xóa? LƯU Ý: Xóa cấu hình có thể ảnh hưởng đến lịch sử hiển thị nếu cấu hình này đang được dùng trong hệ thống.')) return;
        setIsProcessing(true);
        const res = await deleteVehicleConfig(id);
        if (res.status === 'SUCCESS') {
            showToast('Thành công', 'Đã xóa.', 'success');
            await loadRawConfigs();
            await refreshConfigs();
        } else {
            showToast('Lỗi', 'Không thể xóa: ' + res.message, 'error');
        }
        setIsProcessing(false);
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500"><i className="fas fa-spinner fa-spin mr-2"></i> Đang tải cấu hình hệ thống...</div>;

    const lines = rawConfigs.filter(c => c.type === 'line').sort((a,b) => a.value.localeCompare(b.value));
    const versions = rawConfigs.filter(c => c.type === 'version').sort((a,b) => a.value.localeCompare(b.value));
    const exteriors = rawConfigs.filter(c => c.type === 'exterior').sort((a,b) => a.value.localeCompare(b.value));
    const interiors = rawConfigs.filter(c => c.type === 'interior').sort((a,b) => a.value.localeCompare(b.value));

    return (
        <div className="p-6 h-full flex flex-col bg-slate-50/50 overflow-y-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Quản Lý Cấu Hình Xe</h2>
                <p className="text-slate-500 text-sm mt-1">Quản lý linh hoạt dòng xe, phiên bản và màu sắc trên toàn hệ thống mà không cần sửa code.</p>
            </div>

            <div className="flex gap-2 mb-6 border-b border-slate-200">
                <button 
                    className={`pb-3 px-6 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'versions' ? 'border-b-2 border-red-500 text-red-600' : 'text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setActiveTab('versions')}
                >
                    <i className="fas fa-car-side mr-2"></i> Dòng Xe & Phiên Bản
                </button>
                <button 
                    className={`pb-3 px-6 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'colors' ? 'border-b-2 border-red-500 text-red-600' : 'text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setActiveTab('colors')}
                >
                    <i className="fas fa-palette mr-2"></i> Màu Sắc
                </button>
            </div>

            {activeTab === 'versions' && (
                <div className="w-full lg:w-5/6 xl:w-3/4">
                    {/* Add new line */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-3 md:items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><i className="fas fa-tags text-indigo-500 mr-1"></i> Thêm dòng xe mới</label>
                            <input value={newLine} onChange={e => setNewLine(e.target.value)} onKeyDown={e => {
                                if (e.key === 'Enter' && newLine.trim()) {
                                    handleAddConfig('line', newLine);
                                    setNewLine('');
                                }
                            }} placeholder="VD: VF 6, VF 7..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all" />
                        </div>
                        <button disabled={isProcessing || !newLine.trim()} onClick={() => { handleAddConfig('line', newLine); setNewLine(''); }} className="px-6 py-2 h-[42px] bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                            <i className="fas fa-plus mr-1"></i> Thêm Dòng Xe
                        </button>
                    </div>

                    {/* List lines */}
                    <div className="space-y-4 pb-10">
                        {lines.map(line => (
                            <LineCard 
                                key={line.id} 
                                line={line} 
                                versions={versions.filter(v => v.parent_value === line.value)} 
                                handleAddConfig={handleAddConfig} 
                                handleDeleteConfig={handleDeleteConfig} 
                                isProcessing={isProcessing} 
                            />
                        ))}
                        {lines.length === 0 && <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed font-medium"><i className="fas fa-folder-open block text-3xl mb-3 text-slate-300"></i> Chưa có dòng xe nào trong hệ thống.</div>}
                    </div>
                </div>
            )}

            {activeTab === 'colors' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full lg:w-2/3 xl:w-1/2">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><i className="fas fa-fill-drip text-amber-500"></i> Quản lý Màu Sắc</h3>
                    <div className="flex flex-col gap-3 mb-4">
                        <select value={newColorType} onChange={e => setNewColorType(e.target.value as any)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none cursor-pointer">
                            <option value="exterior">Ngoại Thất</option>
                            <option value="interior">Nội Thất</option>
                        </select>
                        <div className="flex gap-2">
                            <input value={newColor} onChange={e => setNewColor(e.target.value)} placeholder="VD: Brahminy White (CE18)..." className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all" />
                            <button disabled={isProcessing || !newColor.trim()} onClick={() => handleAddConfig(newColorType, newColor)} className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors">
                                <i className="fas fa-plus"></i> Thêm
                            </button>
                        </div>
                    </div>
                    <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {(newColorType === 'exterior' ? exteriors : interiors).map(color => (
                            <li key={color.id} className="flex justify-between items-center bg-slate-50 p-3 border border-slate-100 rounded-xl">
                                <span className="text-slate-700 font-medium">{color.value}</span>
                                <button onClick={() => handleDeleteConfig(color.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center transition-colors">
                                    <i className="fas fa-trash"></i>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default VehicleConfigManager;
