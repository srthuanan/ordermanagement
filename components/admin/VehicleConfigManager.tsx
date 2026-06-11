import React, { useState } from 'react';
import { useVehicleConfig } from '../../hooks/useVehicleConfig';
import { addVehicleConfig, deleteVehicleConfig, updateVehicleConfig } from '../../services/api/vehicleConfigService';

export const VehicleConfigManager = ({ showToast }: { showToast: any }) => {
    const { refreshConfigs } = useVehicleConfig();
    const [newLine, setNewLine] = useState('');
    const [newVersion, setNewVersion] = useState('');
    const [selectedLine, setSelectedLine] = useState('');
    const [newColor, setNewColor] = useState('');
    const [newColorType, setNewColorType] = useState<'exterior' | 'interior'>('exterior');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<{ value: string, parent_value: string | null }>({ value: '', parent_value: null });

    const [rawConfigs, setRawConfigs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
        loadRawConfigs();
    }, []);

    const loadRawConfigs = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        const { getVehicleConfigs } = await import('../../services/api/vehicleConfigService');
        const res = await getVehicleConfigs();
        if (res.status === 'SUCCESS') setRawConfigs(res.data || []);
        if (showLoading) setIsLoading(false);
    };

    const handleAddConfig = async (type: string, value: string, parentValue: string | null = null) => {
        if (!value.trim()) return;
        setIsProcessing(true);
        const res = await addVehicleConfig(type, value.trim(), parentValue);
        if (res.status === 'SUCCESS') {
            showToast('Thành công', 'Đã thêm cấu hình.', 'success');
            if (res.data) setRawConfigs(prev => [...prev, res.data]);
            refreshConfigs(); // update global context quietly
            setNewLine(''); setNewVersion(''); setNewColor('');
        } else {
            showToast('Lỗi', 'Không thể thêm: ' + res.message, 'error');
        }
        setIsProcessing(false);
    };

    const handleUpdateConfig = async () => {
        if (!editingId || !editData.value.trim()) return;
        setIsProcessing(true);
        const res = await updateVehicleConfig(editingId, editData.value.trim(), editData.parent_value);
        if (res.status === 'SUCCESS') {
            showToast('Thành công', 'Đã cập nhật.', 'success');
            if (res.data) setRawConfigs(prev => prev.map(item => item.id === editingId ? res.data : item));
            refreshConfigs(); // update global context quietly
            setEditingId(null);
        } else {
            showToast('Lỗi', 'Không thể cập nhật: ' + res.message, 'error');
        }
        setIsProcessing(false);
    };

    const startEdit = (item: any) => {
        setEditingId(item.id);
        setEditData({ value: item.value, parent_value: item.parent_value });
    };

    const handleDeleteConfig = async (id: string) => {
        setIsProcessing(true);
        const res = await deleteVehicleConfig(id);
        if (res.status === 'SUCCESS') {
            showToast('Thành công', 'Đã xóa.', 'success');
            setRawConfigs(prev => prev.filter(item => item.id !== id));
            refreshConfigs(); // update global context quietly
        } else {
            showToast('Lỗi', 'Không thể xóa: ' + res.message, 'error');
        }
        setIsProcessing(false);
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500"><i className="fas fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu...</div>;

    const lines = rawConfigs.filter(c => c.type === 'line').sort((a,b) => a.value.localeCompare(b.value));
    const versions = rawConfigs.filter(c => c.type === 'version').sort((a,b) => {
        const parentCompare = (a.parent_value || '').localeCompare(b.parent_value || '');
        if (parentCompare !== 0) return parentCompare;
        return a.value.localeCompare(b.value);
    });
    const colors = rawConfigs.filter(c => c.type === 'exterior' || c.type === 'interior').sort((a,b) => {
        const typeCompare = a.type.localeCompare(b.type);
        if (typeCompare !== 0) return typeCompare;
        return a.value.localeCompare(b.value);
    });

    const TableWrapper = ({ title, columns, children }: any) => (
        <div className="mb-6 flex flex-col max-h-[80vh]">
            <h3 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-sm flex-shrink-0">{title}</h3>
            <div className="border border-slate-300 bg-white shadow-sm flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 border-b border-slate-300 sticky top-0 z-10 shadow-sm">
                        <tr>
                            {columns.map((col: string, i: number) => (
                                <th key={i} className={`p-1.5 border-r border-slate-300 last:border-r-0 font-bold text-slate-700 ${col === 'Thao tác' ? 'w-24 text-center' : ''}`}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {children}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="p-4 h-full flex flex-col bg-slate-50 overflow-y-auto">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                <div>
                    {/* BẢNG DÒNG XE */}
                    <TableWrapper title="Bảng Dòng Xe" columns={['Tên Dòng Xe', 'Thao tác']}>
                        <tr className="bg-yellow-50/50 sticky top-[33px] z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
                            <td className="p-1 border-r border-slate-300">
                                <input value={newLine} onChange={e => setNewLine(e.target.value)} onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddConfig('line', newLine);
                                }} placeholder="Nhập tên dòng xe mới..." className="w-full px-2 py-0.5 bg-transparent outline-none focus:bg-white" />
                            </td>
                            <td className="p-1 text-center">
                                <button disabled={isProcessing || !newLine.trim()} onClick={() => handleAddConfig('line', newLine)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-xs w-full disabled:opacity-50 font-medium">Thêm</button>
                            </td>
                        </tr>
                        {lines.map(line => (
                            <tr key={line.id} className={`border-b border-slate-200 ${editingId === line.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-1 border-r border-slate-300">
                                    {editingId === line.id ? (
                                        <input autoFocus value={editData.value} onChange={e => setEditData({...editData, value: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleUpdateConfig()} className="w-full px-2 py-0.5 border border-indigo-300 rounded outline-none" />
                                    ) : (
                                        <span className="font-medium text-slate-800 px-1.5">{line.value}</span>
                                    )}
                                </td>
                                <td className="p-1 text-center">
                                    {editingId === line.id ? (
                                        <div className="flex justify-center gap-1">
                                            <button onClick={handleUpdateConfig} disabled={isProcessing} className="bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700"><i className="fas fa-check text-xs"></i></button>
                                            <button onClick={() => setEditingId(null)} className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded hover:bg-slate-300"><i className="fas fa-times text-xs"></i></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => startEdit(line)} disabled={isProcessing} className="text-blue-500 hover:bg-blue-100 px-2 py-0.5 rounded text-xs"><i className="fas fa-pen"></i></button>
                                            <button onClick={() => handleDeleteConfig(line.id)} disabled={isProcessing} className="text-red-500 hover:bg-red-100 px-2 py-0.5 rounded text-xs"><i className="fas fa-trash"></i></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </TableWrapper>

                    {/* BẢNG PHIÊN BẢN */}
                    <TableWrapper title="Bảng Phiên Bản" columns={['Thuộc Dòng Xe', 'Tên Phiên Bản', 'Thao tác']}>
                        <tr className="bg-yellow-50/50 sticky top-[33px] z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
                            <td className="p-1 border-r border-slate-300">
                                <select value={selectedLine} onChange={e => setSelectedLine(e.target.value)} className="w-full px-1 py-0.5 bg-transparent outline-none focus:bg-white cursor-pointer">
                                    <option value="">-- Chọn Dòng Xe --</option>
                                    {lines.map(l => <option key={l.id} value={l.value}>{l.value}</option>)}
                                </select>
                            </td>
                            <td className="p-1 border-r border-slate-300">
                                <input value={newVersion} onChange={e => setNewVersion(e.target.value)} onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddConfig('version', newVersion, selectedLine);
                                }} placeholder="Nhập phiên bản mới..." className="w-full px-2 py-0.5 bg-transparent outline-none focus:bg-white" />
                            </td>
                            <td className="p-1 text-center">
                                <button disabled={isProcessing || !selectedLine || !newVersion.trim()} onClick={() => handleAddConfig('version', newVersion, selectedLine)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-xs w-full disabled:opacity-50 font-medium">Thêm</button>
                            </td>
                        </tr>
                        {versions.map(v => (
                            <tr key={v.id} className={`border-b border-slate-200 ${editingId === v.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-1 border-r border-slate-300">
                                    {editingId === v.id ? (
                                        <select value={editData.parent_value || ''} onChange={e => setEditData({...editData, parent_value: e.target.value})} className="w-full px-1 py-0.5 border border-indigo-300 rounded outline-none cursor-pointer">
                                            {lines.map(l => <option key={l.id} value={l.value}>{l.value}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-slate-600 px-1.5">{v.parent_value}</span>
                                    )}
                                </td>
                                <td className="p-1 border-r border-slate-300">
                                    {editingId === v.id ? (
                                        <input autoFocus value={editData.value} onChange={e => setEditData({...editData, value: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleUpdateConfig()} className="w-full px-2 py-0.5 border border-indigo-300 rounded outline-none" />
                                    ) : (
                                        <span className="font-medium text-slate-800 px-1.5">{v.value}</span>
                                    )}
                                </td>
                                <td className="p-1 text-center">
                                    {editingId === v.id ? (
                                        <div className="flex justify-center gap-1">
                                            <button onClick={handleUpdateConfig} disabled={isProcessing} className="bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700"><i className="fas fa-check text-xs"></i></button>
                                            <button onClick={() => setEditingId(null)} className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded hover:bg-slate-300"><i className="fas fa-times text-xs"></i></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => startEdit(v)} disabled={isProcessing} className="text-blue-500 hover:bg-blue-100 px-2 py-0.5 rounded text-xs"><i className="fas fa-pen"></i></button>
                                            <button onClick={() => handleDeleteConfig(v.id)} disabled={isProcessing} className="text-red-500 hover:bg-red-100 px-2 py-0.5 rounded text-xs"><i className="fas fa-trash"></i></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </TableWrapper>
                </div>

                <div>
                    {/* BẢNG MÀU SẮC */}
                    <TableWrapper title="Bảng Màu Sắc" columns={['Phân Loại', 'Tên Màu Sắc', 'Thao tác']}>
                        <tr className="bg-yellow-50/50 sticky top-[33px] z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
                            <td className="p-1 border-r border-slate-300">
                                <select value={newColorType} onChange={e => setNewColorType(e.target.value as any)} className="w-full px-1 py-0.5 bg-transparent outline-none focus:bg-white cursor-pointer text-xs">
                                    <option value="exterior">Ngoại Thất</option>
                                    <option value="interior">Nội Thất</option>
                                </select>
                            </td>
                            <td className="p-1 border-r border-slate-300">
                                <input value={newColor} onChange={e => setNewColor(e.target.value)} onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddConfig(newColorType, newColor);
                                }} placeholder="Nhập tên màu mới..." className="w-full px-2 py-0.5 bg-transparent outline-none focus:bg-white" />
                            </td>
                            <td className="p-1 text-center">
                                <button disabled={isProcessing || !newColor.trim()} onClick={() => handleAddConfig(newColorType, newColor)} className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded text-xs w-full disabled:opacity-50 font-medium">Thêm</button>
                            </td>
                        </tr>
                        {colors.map(color => (
                            <tr key={color.id} className={`border-b border-slate-200 ${editingId === color.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-1 border-r border-slate-300 w-28">
                                    {editingId === color.id ? (
                                        <select value={editData.parent_value || color.type} onChange={() => setEditData({...editData, parent_value: null})} disabled className="w-full px-1 py-0.5 bg-slate-100 text-slate-500 rounded outline-none cursor-not-allowed text-xs">
                                            <option value={color.type}>{color.type === 'exterior' ? 'Ngoại Thất' : 'Nội Thất'}</option>
                                        </select>
                                    ) : (
                                        <div className="px-1.5">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${color.type === 'exterior' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                                                {color.type === 'exterior' ? 'Ngoại thất' : 'Nội thất'}
                                            </span>
                                        </div>
                                    )}
                                </td>
                                <td className="p-1 border-r border-slate-300">
                                    {editingId === color.id ? (
                                        <input autoFocus value={editData.value} onChange={e => setEditData({...editData, value: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleUpdateConfig()} className="w-full px-2 py-0.5 border border-indigo-300 rounded outline-none" />
                                    ) : (
                                        <span className="font-medium text-slate-800 px-1.5">{color.value}</span>
                                    )}
                                </td>
                                <td className="p-1 text-center">
                                    {editingId === color.id ? (
                                        <div className="flex justify-center gap-1">
                                            <button onClick={handleUpdateConfig} disabled={isProcessing} className="bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700"><i className="fas fa-check text-xs"></i></button>
                                            <button onClick={() => setEditingId(null)} className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded hover:bg-slate-300"><i className="fas fa-times text-xs"></i></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => startEdit(color)} disabled={isProcessing} className="text-blue-500 hover:bg-blue-100 px-2 py-0.5 rounded text-xs"><i className="fas fa-pen"></i></button>
                                            <button onClick={() => handleDeleteConfig(color.id)} disabled={isProcessing} className="text-red-500 hover:bg-red-100 px-2 py-0.5 rounded text-xs"><i className="fas fa-trash"></i></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </TableWrapper>
                </div>
            </div>
        </div>
    );
};

export default VehicleConfigManager;
