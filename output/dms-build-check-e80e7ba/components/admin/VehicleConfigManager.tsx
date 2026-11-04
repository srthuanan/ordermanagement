import React, { useState } from 'react';
import { useVehicleConfig } from '../../hooks/useVehicleConfig';
import { getVehicleConfigs, addVehicleConfig, deleteVehicleConfig, updateVehicleConfig, saveColorMappings } from '../../services/api/vehicleConfigService';
import { getAvailableExteriors, getAvailableInteriors } from '../../constants';


const TableWrapper = ({ title, columns, children }: any) => (
    <div className="mb-6 flex flex-col max-h-[80vh]">
        <h3 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-xs flex-shrink-0">{title}</h3>
        <div className="border border-slate-200 bg-white rounded-2xl shadow-2xs flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                    <tr>
                        {columns.map((col: any, i: number) => (
                            <th key={i} className={`p-2.5 border-r border-slate-200 last:border-r-0 font-bold text-slate-600 uppercase tracking-wider ${col === 'Thao tác' ? 'w-24 text-center' : ''}`}>{col}</th>
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

export const VehicleConfigManager = ({ showToast }: { showToast: any }) => {
    const { refreshConfigs } = useVehicleConfig();
    const [newLine, setNewLine] = useState('');
    const [newVersion, setNewVersion] = useState('');
    const [newColor, setNewColor] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<{ value: string, parent_value: string | null }>({ value: '', parent_value: null });

    // Tree state
    const [collapsedLines, setCollapsedLines] = useState<Set<string>>(new Set());
    const [addingVersionToLine, setAddingVersionToLine] = useState<string | null>(null);

    const [rawConfigs, setRawConfigs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Mapping states
    const [mapSelectedLine, setMapSelectedLine] = useState('');
    const [mapSelectedVersion, setMapSelectedVersion] = useState('');
    const [mapExteriorColors, setMapExteriorColors] = useState<Set<string>>(new Set());
    const [mapInteriorColors, setMapInteriorColors] = useState<Set<string>>(new Set());

    React.useEffect(() => {
        loadRawConfigs();
    }, []);

    const loadRawConfigs = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
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
        if (!window.confirm('Bạn có chắc chắn muốn xóa?')) return;
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

    const handleSaveMapping = async () => {
        if (!mapSelectedLine) return;
        setIsProcessing(true);
        const parentValue = mapSelectedVersion ? `${mapSelectedLine}___${mapSelectedVersion}` : mapSelectedLine;
        
        const res = await saveColorMappings(parentValue, Array.from(mapExteriorColors), Array.from(mapInteriorColors));
        if (res.status === 'SUCCESS') {
            showToast('Thành công', 'Đã lưu liên kết màu sắc.', 'success');
            await loadRawConfigs(false);
            refreshConfigs();
        } else {
            showToast('Lỗi', 'Không thể lưu: ' + res.message, 'error');
        }
        setIsProcessing(false);
    };

    React.useEffect(() => {
        if (!mapSelectedLine) {
            setMapExteriorColors(new Set());
            setMapInteriorColors(new Set());
            return;
        }
        const parentValue = mapSelectedVersion ? `${mapSelectedLine}___${mapSelectedVersion}` : mapSelectedLine;
        const mappedExt = rawConfigs.filter(c => c.type === 'exterior' && c.parent_value === parentValue).map(c => c.value);
        const mappedInt = rawConfigs.filter(c => c.type === 'interior' && c.parent_value === parentValue).map(c => c.value);
        
        if (mappedExt.length > 0 || mappedInt.length > 0) {
            setMapExteriorColors(new Set(mappedExt));
            setMapInteriorColors(new Set(mappedInt));
        } else {
            // Fallback to constants for smooth transition
            setMapExteriorColors(new Set(getAvailableExteriors(mapSelectedLine, mapSelectedVersion || undefined)));
            setMapInteriorColors(new Set(getAvailableInteriors(mapSelectedLine, mapSelectedVersion || undefined)));
        }
    }, [mapSelectedLine, mapSelectedVersion, rawConfigs]);

    if (isLoading) return <div className="p-8 text-center text-slate-500"><i className="fas fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu...</div>;

    const lines = rawConfigs.filter(c => c.type === 'line').sort((a,b) => a.value.localeCompare(b.value));
    const versions = rawConfigs.filter(c => c.type === 'version').sort((a,b) => {
        const parentCompare = (a.parent_value || '').localeCompare(b.parent_value || '');
        if (parentCompare !== 0) return parentCompare;
        return a.value.localeCompare(b.value);
    });
    const colors = rawConfigs.filter(c => (c.type === 'exterior' || c.type === 'interior') && c.parent_value === null).sort((a,b) => {
        const typeCompare = a.type.localeCompare(b.type);
        if (typeCompare !== 0) return typeCompare;
        return a.value.localeCompare(b.value);
    });

    return (
        <div className="p-4 h-full flex flex-col bg-slate-50 overflow-y-auto">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                <div>
                    {/* BẢNG CÂY THƯ MỤC DÒNG XE & PHIÊN BẢN */}
                    <TableWrapper title="Bảng Dòng Xe & Phiên Bản" columns={['Cấu trúc', 'Thao tác']}>
                        <tr className="bg-yellow-50/50 sticky top-[33px] z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
                            <td className="p-1 border-r border-slate-300">
                                <div className="flex items-center pl-2">
                                    <i className="fas fa-folder-plus text-amber-500 mr-2 text-sm w-4 text-center"></i>
                                    <input value={newLine} onChange={e => setNewLine(e.target.value)} onKeyDown={e => {
                                        if (e.key === 'Enter') handleAddConfig('line', newLine);
                                    }} placeholder="Nhập tên dòng xe mới..." className="w-full px-2 py-0.5 bg-transparent outline-none focus:bg-white text-sm" />
                                </div>
                            </td>
                            <td className="p-1 text-center w-24">
                                <button disabled={isProcessing || !newLine.trim()} onClick={() => handleAddConfig('line', newLine)} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs w-full disabled:opacity-50 font-medium">Thêm</button>
                            </td>
                        </tr>
                        {lines.map(line => {
                            const lineVersions = versions.filter(v => v.parent_value === line.value);
                            const isCollapsed = collapsedLines.has(line.value);
                            return (
                                <React.Fragment key={line.id}>
                                    {/* Line Row */}
                                    <tr className={`border-b border-slate-200 ${editingId === line.id ? 'bg-blue-50' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                        <td className={`p-1.5 border-r border-slate-300 cursor-pointer ${mapSelectedLine === line.value && !mapSelectedVersion ? 'bg-blue-50/50' : ''}`} onClick={() => { setMapSelectedLine(line.value); setMapSelectedVersion(''); }}>
                                            <div className="flex items-center">
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCollapsedLines(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(line.value)) next.delete(line.value);
                                                        else next.add(line.value);
                                                        return next;
                                                    });
                                                }} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors">
                                                    <i className={`fas ${isCollapsed ? 'fa-caret-right' : 'fa-caret-down'} text-sm`}></i>
                                                </button>
                                                <i className={`fas fa-folder ${mapSelectedLine === line.value && !mapSelectedVersion ? 'text-blue-500' : 'text-amber-500'} mr-2 text-sm`}></i>
                                                {editingId === line.id ? (
                                                    <input autoFocus value={editData.value} onChange={e => setEditData({...editData, value: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleUpdateConfig()} onClick={e => e.stopPropagation()} className="w-full px-2 py-0.5 border border-blue-300 rounded outline-none" />
                                                ) : (
                                                    <span className={`font-bold ${mapSelectedLine === line.value && !mapSelectedVersion ? 'text-blue-700' : 'text-slate-800'}`}>{line.value}</span>
                                                )}
                                                <span className="ml-2 text-xs text-slate-400">({lineVersions.length})</span>
                                                {mapSelectedLine === line.value && !mapSelectedVersion && <i className="fas fa-link text-blue-400 ml-auto mr-2 text-xs" title="Đang cấu hình màu"></i>}
                                            </div>
                                        </td>
                                        <td className="p-1.5 text-center">
                                            {editingId === line.id ? (
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={handleUpdateConfig} disabled={isProcessing} className="bg-blue-600 text-white px-1.5 py-1 rounded hover:bg-blue-700"><i className="fas fa-check text-xs"></i></button>
                                                    <button onClick={() => setEditingId(null)} className="bg-slate-200 text-slate-700 px-1.5 py-1 rounded hover:bg-slate-300"><i className="fas fa-times text-xs"></i></button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => setAddingVersionToLine(addingVersionToLine === line.id ? null : line.id)} title="Thêm phiên bản" className="text-emerald-600 hover:bg-emerald-100 px-1.5 py-1 rounded transition-colors"><i className="fas fa-plus text-xs"></i></button>
                                                    <button onClick={() => startEdit(line)} disabled={isProcessing} className="text-blue-500 hover:bg-blue-100 px-1.5 py-1 rounded transition-colors"><i className="fas fa-pen text-xs"></i></button>
                                                    <button onClick={() => handleDeleteConfig(line.id)} disabled={isProcessing} className="text-red-500 hover:bg-red-100 px-1.5 py-1 rounded transition-colors"><i className="fas fa-trash text-xs"></i></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>

                                    {/* Adding Version Inline Row */}
                                    {addingVersionToLine === line.id && !isCollapsed && (
                                        <tr className="bg-emerald-50/30 border-b border-slate-200">
                                            <td className="p-1.5 border-r border-slate-300">
                                                <div className="flex items-center pl-8 text-slate-400">
                                                    <div className="w-4 h-6 border-l-2 border-b-2 border-slate-300 rounded-bl-md mr-2 -mt-3"></div>
                                                    <input 
                                                        autoFocus
                                                        value={newVersion} 
                                                        onChange={e => setNewVersion(e.target.value)} 
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                handleAddConfig('version', newVersion, line.value);
                                                                setAddingVersionToLine(null);
                                                            } else if (e.key === 'Escape') setAddingVersionToLine(null);
                                                        }} 
                                                        placeholder={`Nhập tên phiên bản cho ${line.value}...`} 
                                                        className="w-full px-2 py-0.5 bg-white border border-emerald-300 focus:border-emerald-500 rounded outline-none text-sm text-slate-700" 
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-1.5 text-center">
                                                <div className="flex justify-center gap-1">
                                                    <button disabled={isProcessing || !newVersion.trim()} onClick={() => { handleAddConfig('version', newVersion, line.value); setAddingVersionToLine(null); }} className="bg-emerald-600 text-white px-1.5 py-1 rounded hover:bg-emerald-700 disabled:opacity-50"><i className="fas fa-check text-xs"></i></button>
                                                    <button onClick={() => setAddingVersionToLine(null)} className="bg-slate-200 text-slate-700 px-1.5 py-1 rounded hover:bg-slate-300"><i className="fas fa-times text-xs"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {/* Versions Rows */}
                                    {!isCollapsed && lineVersions.map((v, index) => {
                                        const isLast = index === lineVersions.length - 1;
                                        return (
                                            <tr key={v.id} className={`border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors`}>
                                                <td className={`p-1.5 border-r border-slate-300 cursor-pointer ${mapSelectedLine === line.value && mapSelectedVersion === v.value ? 'bg-blue-50/50' : ''}`} onClick={() => { setMapSelectedLine(line.value); setMapSelectedVersion(v.value); }}>
                                                    <div className="flex items-center pl-8 text-slate-700 h-full relative">
                                                        {/* Tree line connecting to parent */}
                                                        <div className={`absolute left-4 top-0 w-4 border-l-2 border-slate-300 ${isLast ? 'h-1/2 rounded-bl-md border-b-2' : 'h-full'} ${isLast ? '-mt-1' : ''}`}></div>
                                                        {isLast ? null : <div className="absolute left-4 top-1/2 w-4 border-b-2 border-slate-300"></div>}

                                                        <div className="pl-6 w-full flex items-center">
                                                            <i className={`far fa-file-alt ${mapSelectedLine === line.value && mapSelectedVersion === v.value ? 'text-blue-500' : 'text-slate-400'} mr-2 text-xs`}></i>
                                                            {editingId === v.id ? (
                                                                <input autoFocus value={editData.value} onChange={e => setEditData({...editData, value: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleUpdateConfig()} onClick={e => e.stopPropagation()} className="w-full px-2 py-0.5 border border-blue-300 rounded outline-none text-slate-700" />
                                                            ) : (
                                                                <span className={`text-sm ${mapSelectedLine === line.value && mapSelectedVersion === v.value ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>{v.value}</span>
                                                            )}
                                                            {mapSelectedLine === line.value && mapSelectedVersion === v.value && <i className="fas fa-link text-blue-400 ml-auto mr-2 text-xs" title="Đang cấu hình màu"></i>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-1.5 text-center">
                                                    {editingId === v.id ? (
                                                        <div className="flex justify-center gap-1">
                                                            <button onClick={handleUpdateConfig} disabled={isProcessing} className="bg-blue-600 text-white px-1.5 py-1 rounded hover:bg-blue-700"><i className="fas fa-check text-xs"></i></button>
                                                            <button onClick={() => setEditingId(null)} className="bg-slate-200 text-slate-700 px-1.5 py-1 rounded hover:bg-slate-300"><i className="fas fa-times text-xs"></i></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                                            <button onClick={() => startEdit(v)} disabled={isProcessing} className="text-blue-500 hover:bg-blue-100 px-1.5 py-1 rounded transition-colors"><i className="fas fa-pen text-xs"></i></button>
                                                            <button onClick={() => handleDeleteConfig(v.id)} disabled={isProcessing} className="text-red-500 hover:bg-red-100 px-1.5 py-1 rounded transition-colors"><i className="fas fa-trash text-xs"></i></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </TableWrapper>
                </div>

                <div>
                    {/* BẢNG MÀU SẮC DẠNG CÂY */}
                    <TableWrapper 
                        title={mapSelectedLine ? `CẤU HÌNH MÀU CHO: ${mapSelectedLine} ${mapSelectedVersion ? `- ${mapSelectedVersion}` : ''}` : "Bảng Cây Màu Sắc"} 
                        columns={['Phân loại & Tên màu', mapSelectedLine ? (
                            <div className="flex justify-center items-center gap-2 -my-1">
                                <button onClick={() => { setMapSelectedLine(''); setMapSelectedVersion(''); }} className="text-xs text-slate-500 hover:text-slate-700 underline font-normal px-1">
                                    Hủy chọn
                                </button>
                                <button onClick={handleSaveMapping} disabled={isProcessing} className="bg-blue-600 text-white px-2 py-1 rounded shadow hover:bg-blue-700 font-normal flex items-center">
                                    {isProcessing ? <i className="fas fa-spinner fa-spin mr-1 text-xs"></i> : <i className="fas fa-save mr-1 text-xs"></i>}
                                    <span className="text-xs">Lưu</span>
                                </button>
                            </div>
                        ) : 'Thao tác']}
                    >
                        {['exterior', 'interior'].map(type => {
                            const typeColors = colors.filter(c => c.type === type);
                            const isCollapsed = collapsedLines.has(type);
                            const title = type === 'exterior' ? 'Màu Ngoại Thất' : 'Màu Nội Thất';
                            const iconColor = type === 'exterior' ? 'text-amber-500' : 'text-slate-500';

                            return (
                                <React.Fragment key={type}>
                                    {/* Category Row */}
                                    <tr className="bg-slate-100 hover:bg-slate-200 border-b border-slate-200">
                                        <td className="p-1.5 border-r border-slate-300">
                                            <div className="flex items-center">
                                                <button onClick={() => {
                                                    setCollapsedLines(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(type)) next.delete(type);
                                                        else next.add(type);
                                                        return next;
                                                    });
                                                }} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors">
                                                    <i className={`fas ${isCollapsed ? 'fa-caret-right' : 'fa-caret-down'} text-sm`}></i>
                                                </button>
                                                <i className={`fas fa-palette ${iconColor} mr-2 text-sm`}></i>
                                                <span className="font-bold text-slate-800">{title}</span>
                                                <span className="ml-2 text-xs text-slate-400">({typeColors.length})</span>
                                            </div>
                                        </td>
                                        <td className="p-1.5 text-center">
                                            <button onClick={() => {
                                                setAddingVersionToLine(addingVersionToLine === type ? null : type);
                                                setNewColor(''); // reset input
                                            }} title="Thêm màu mới" className="text-emerald-600 hover:bg-emerald-100 px-1.5 py-1 rounded transition-colors"><i className="fas fa-plus text-xs"></i></button>
                                        </td>
                                    </tr>

                                    {/* Adding Color Inline Row */}
                                    {addingVersionToLine === type && !isCollapsed && (
                                        <tr className="bg-emerald-50/30 border-b border-slate-200">
                                            <td className="p-1.5 border-r border-slate-300">
                                                <div className="flex items-center pl-8 text-slate-400">
                                                    <div className="w-4 h-6 border-l-2 border-b-2 border-slate-300 rounded-bl-md mr-2 -mt-3"></div>
                                                    <input 
                                                        autoFocus
                                                        value={newColor} 
                                                        onChange={e => setNewColor(e.target.value)} 
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                handleAddConfig(type, newColor);
                                                                setAddingVersionToLine(null);
                                                            } else if (e.key === 'Escape') setAddingVersionToLine(null);
                                                        }} 
                                                        placeholder={`Nhập tên ${title.toLowerCase()} mới...`} 
                                                        className="w-full px-2 py-0.5 bg-white border border-emerald-300 focus:border-emerald-500 rounded outline-none text-sm text-slate-700" 
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-1.5 text-center">
                                                <div className="flex justify-center gap-1">
                                                    <button disabled={isProcessing || !newColor.trim()} onClick={() => { handleAddConfig(type, newColor); setAddingVersionToLine(null); }} className="bg-emerald-600 text-white px-1.5 py-1 rounded hover:bg-emerald-700 disabled:opacity-50"><i className="fas fa-check text-xs"></i></button>
                                                    <button onClick={() => setAddingVersionToLine(null)} className="bg-slate-200 text-slate-700 px-1.5 py-1 rounded hover:bg-slate-300"><i className="fas fa-times text-xs"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {/* Colors Rows */}
                                    {!isCollapsed && typeColors.map((color, index) => {
                                        const isLast = index === typeColors.length - 1;
                                        return (
                                            <tr key={color.id} className={`border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors`}>
                                                <td className="p-1.5 border-r border-slate-300">
                                                    <div className="flex items-center pl-8 text-slate-400 h-full relative">
                                                        {/* Tree line connecting to parent */}
                                                        <div className={`absolute left-4 top-0 w-4 border-l-2 border-slate-300 ${isLast ? 'h-1/2 rounded-bl-md border-b-2' : 'h-full'} ${isLast ? '-mt-1' : ''}`}></div>
                                                        {isLast ? null : <div className="absolute left-4 top-1/2 w-4 border-b-2 border-slate-300"></div>}

                                                        <div className="pl-6 w-full flex items-center">
                                                            {mapSelectedLine && (
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="mr-3 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                                    checked={type === 'exterior' ? mapExteriorColors.has(color.value) : mapInteriorColors.has(color.value)}
                                                                    onChange={(e) => {
                                                                        const setColors = type === 'exterior' ? setMapExteriorColors : setMapInteriorColors;
                                                                        setColors(prev => {
                                                                            const next = new Set(prev);
                                                                            if (e.target.checked) next.add(color.value);
                                                                            else next.delete(color.value);
                                                                            return next;
                                                                        });
                                                                    }}
                                                                />
                                                            )}
                                                            <div className={`w-3 h-3 rounded-full mr-2 shadow-sm ${type === 'exterior' ? 'bg-amber-300 border border-amber-400' : 'bg-slate-300 border border-slate-400'}`}></div>
                                                            {editingId === color.id ? (
                                                                <input autoFocus value={editData.value} onChange={e => setEditData({...editData, value: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleUpdateConfig()} onClick={e => e.stopPropagation()} className="w-full px-2 py-0.5 border border-indigo-300 rounded outline-none text-slate-700" />
                                                            ) : (
                                                                <span className={`text-sm text-slate-700 ${mapSelectedLine && (type === 'exterior' ? mapExteriorColors.has(color.value) : mapInteriorColors.has(color.value)) ? 'font-bold text-indigo-800' : ''}`}>{color.value}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-1.5 text-center">
                                                    {!mapSelectedLine && (
                                                        editingId === color.id ? (
                                                            <div className="flex justify-center gap-1">
                                                                <button onClick={handleUpdateConfig} disabled={isProcessing} className="bg-indigo-600 text-white px-1.5 py-1 rounded hover:bg-indigo-700"><i className="fas fa-check text-xs"></i></button>
                                                                <button onClick={() => setEditingId(null)} className="bg-slate-200 text-slate-700 px-1.5 py-1 rounded hover:bg-slate-300"><i className="fas fa-times text-xs"></i></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                                                <button onClick={() => startEdit(color)} disabled={isProcessing} className="text-blue-500 hover:bg-blue-100 px-1.5 py-1 rounded transition-colors"><i className="fas fa-pen text-xs"></i></button>
                                                                <button onClick={() => handleDeleteConfig(color.id)} disabled={isProcessing} className="text-red-500 hover:bg-red-100 px-1.5 py-1 rounded transition-colors"><i className="fas fa-trash text-xs"></i></button>
                                                            </div>
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </TableWrapper>
                </div>
            </div>
        </div>
    );
};

export default VehicleConfigManager;
