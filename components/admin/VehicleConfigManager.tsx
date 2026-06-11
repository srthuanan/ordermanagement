import React, { useState } from 'react';
import { useVehicleConfig } from '../../hooks/useVehicleConfig';
import { addVehicleConfig, deleteVehicleConfig } from '../../services/api/vehicleConfigService';

export const VehicleConfigManager = ({ showToast }: { showToast: any }) => {
    const { refreshConfigs } = useVehicleConfig();
    const [newLine, setNewLine] = useState('');
    const [newVersion, setNewVersion] = useState('');
    const [selectedLine, setSelectedLine] = useState('');
    const [newColor, setNewColor] = useState('');
    const [newColorType, setNewColorType] = useState<'exterior' | 'interior'>('exterior');
    const [isProcessing, setIsProcessing] = useState(false);

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
        if (!window.confirm('Bạn có chắc muốn xóa? LƯU Ý: Việc này có thể ảnh hưởng đến dữ liệu cũ.')) return;
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

    if (isLoading) return <div className="p-8 text-center text-slate-500"><i className="fas fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu...</div>;

    const lines = rawConfigs.filter(c => c.type === 'line').sort((a,b) => a.value.localeCompare(b.value));
    const versions = rawConfigs.filter(c => c.type === 'version').sort((a,b) => a.value.localeCompare(b.value));
    const colors = rawConfigs.filter(c => c.type === 'exterior' || c.type === 'interior').sort((a,b) => a.value.localeCompare(b.value));

    const TableWrapper = ({ title, columns, children }: any) => (
        <div className="mb-6">
            <h3 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-sm">{title}</h3>
            <div className="border border-slate-300 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 border-b border-slate-300">
                        <tr>
                            {columns.map((col: string, i: number) => (
                                <th key={i} className={`p-1.5 border-r border-slate-300 last:border-r-0 font-bold text-slate-700 ${col === 'Thao tác' ? 'w-20 text-center' : ''}`}>{col}</th>
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
            <div className="mb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 uppercase">Quản Lý Cấu Hình Xe (Excel Mode)</h2>
                    <p className="text-slate-500 text-xs mt-1">Giao diện dạng bảng tính, cập nhật dữ liệu trực tiếp.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                <div>
                    {/* BẢNG DÒNG XE */}
                    <TableWrapper title="Bảng Dòng Xe" columns={['Tên Dòng Xe', 'Thao tác']}>
                        {lines.map(line => (
                            <tr key={line.id} className="border-b border-slate-200 hover:bg-slate-50">
                                <td className="p-1.5 border-r border-slate-300 font-medium text-slate-800">{line.value}</td>
                                <td className="p-1.5 text-center">
                                    <button onClick={() => handleDeleteConfig(line.id)} disabled={isProcessing} className="text-red-500 hover:bg-red-100 px-2 py-0.5 rounded text-xs"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-yellow-50/50">
                            <td className="p-1 border-r border-slate-300">
                                <input value={newLine} onChange={e => setNewLine(e.target.value)} onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddConfig('line', newLine);
                                }} placeholder="Nhập tên dòng xe mới..." className="w-full px-2 py-0.5 bg-transparent outline-none focus:bg-white" />
                            </td>
                            <td className="p-1 text-center">
                                <button disabled={isProcessing || !newLine.trim()} onClick={() => handleAddConfig('line', newLine)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-xs w-full disabled:opacity-50">Thêm</button>
                            </td>
                        </tr>
                    </TableWrapper>

                    {/* BẢNG PHIÊN BẢN */}
                    <TableWrapper title="Bảng Phiên Bản" columns={['Thuộc Dòng Xe', 'Tên Phiên Bản', 'Thao tác']}>
                        {versions.map(v => (
                            <tr key={v.id} className="border-b border-slate-200 hover:bg-slate-50">
                                <td className="p-1.5 border-r border-slate-300 text-slate-600">{v.parent_value}</td>
                                <td className="p-1.5 border-r border-slate-300 font-medium text-slate-800">{v.value}</td>
                                <td className="p-1.5 text-center">
                                    <button onClick={() => handleDeleteConfig(v.id)} disabled={isProcessing} className="text-red-500 hover:bg-red-100 px-2 py-0.5 rounded text-xs"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-yellow-50/50">
                            <td className="p-1 border-r border-slate-300">
                                <select value={selectedLine} onChange={e => setSelectedLine(e.target.value)} className="w-full px-1 py-0.5 bg-transparent outline-none focus:bg-white cursor-pointer">
                                    <option value="">-- Chọn --</option>
                                    {lines.map(l => <option key={l.id} value={l.value}>{l.value}</option>)}
                                </select>
                            </td>
                            <td className="p-1 border-r border-slate-300">
                                <input value={newVersion} onChange={e => setNewVersion(e.target.value)} onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddConfig('version', newVersion, selectedLine);
                                }} placeholder="Nhập phiên bản mới..." className="w-full px-2 py-0.5 bg-transparent outline-none focus:bg-white" />
                            </td>
                            <td className="p-1 text-center">
                                <button disabled={isProcessing || !selectedLine || !newVersion.trim()} onClick={() => handleAddConfig('version', newVersion, selectedLine)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-xs w-full disabled:opacity-50">Thêm</button>
                            </td>
                        </tr>
                    </TableWrapper>
                </div>

                <div>
                    {/* BẢNG MÀU SẮC */}
                    <TableWrapper title="Bảng Màu Sắc" columns={['Phân Loại', 'Tên Màu Sắc', 'Thao tác']}>
                        {colors.map(color => (
                            <tr key={color.id} className="border-b border-slate-200 hover:bg-slate-50">
                                <td className="p-1.5 border-r border-slate-300 text-slate-600 w-28">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${color.type === 'exterior' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                                        {color.type === 'exterior' ? 'Ngoại thất' : 'Nội thất'}
                                    </span>
                                </td>
                                <td className="p-1.5 border-r border-slate-300 font-medium text-slate-800">{color.value}</td>
                                <td className="p-1.5 text-center">
                                    <button onClick={() => handleDeleteConfig(color.id)} disabled={isProcessing} className="text-red-500 hover:bg-red-100 px-2 py-0.5 rounded text-xs"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-yellow-50/50">
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
                                <button disabled={isProcessing || !newColor.trim()} onClick={() => handleAddConfig(newColorType, newColor)} className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded text-xs w-full disabled:opacity-50">Thêm</button>
                            </td>
                        </tr>
                    </TableWrapper>
                </div>
            </div>
        </div>
    );
};

export default VehicleConfigManager;
