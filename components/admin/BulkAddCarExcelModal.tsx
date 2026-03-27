import React, { useState } from 'react';
import * as xlsx from 'xlsx';

interface BulkAddCarExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess: (data: any[]) => void;
}

const BulkAddCarExcelModal: React.FC<BulkAddCarExcelModalProps> = ({ isOpen, onClose, showToast, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    if (!isOpen) return null;

    const handleDownloadTemplate = () => {
        const ws = xlsx.utils.json_to_sheet([
            { 
                'Số VIN': '12345678901234567',
                'Dòng xe': 'VF 3',
                'Phiên bản': 'Base',
                'Ngoại thất': 'Trắng',
                'Nội thất': 'Đen',
                'Số máy': 'SO-MAY-123',
                'Khu vực': 'DMS-HCM'
            }
        ]);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'DanhSachXe');
        xlsx.writeFile(wb, 'Mau_Nhap_Xe_Tu_Excel.xlsx');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            showToast('Lỗi', 'Vui lòng chọn file Excel', 'error');
            return;
        }

        setIsUploading(true);

        try {
            const data = await file.arrayBuffer();
            const workbook = xlsx.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

            if (rows.length === 0) {
                throw new Error('File Excel không có dữ liệu');
            }

            // Define mapping based on user language or common Excel exports
            const findColumn = (row: any, keywords: string[]) => {
                const keys = Object.keys(row);
                for (const kw of keywords) {
                    const found = keys.find(k => k.toLowerCase().includes(kw.toLowerCase()));
                    if (found) return found;
                }
                return null;
            };

            const processedData = rows.map(row => {
                const vinKey = findColumn(row, ['Số VIN', 'VIN', 'Số khung', 'Chassis']) || '';
                const modelKey = findColumn(row, ['Dòng xe', 'Mô tả sản phẩm', 'Model', 'Loại xe']) || '';
                const versionKey = findColumn(row, ['Phiên bản', 'Version', 'Option']) || '';
                const exteriorKey = findColumn(row, ['Ngoại thất', 'Màu ngoại thất', 'Màu xe', 'Exterior']) || '';
                const interiorKey = findColumn(row, ['Nội thất', 'Màu nội thất', 'Interior']) || '';
                const engineKey = findColumn(row, ['Số máy', 'Số động cơ', 'Engine']) || '';
                const regionKey = findColumn(row, ['Khu vực', 'Mã DMS', 'Vị trí', 'Region']) || '';

                return {
                    vin: String(row[vinKey] || '').trim().toUpperCase(),
                    dong_xe: String(row[modelKey] || '').trim(),
                    phien_ban: String(row[versionKey] || '').trim(),
                    ngoai_that: String(row[exteriorKey] || '').trim(),
                    noi_that: String(row[interiorKey] || '').trim(),
                    so_may: String(row[engineKey] || '').trim(),
                    ma_dms: String(row[regionKey] || '').trim()
                };
            }).filter(item => item.vin && item.vin.length === 17);

            if (processedData.length === 0) {
                throw new Error('Không tìm thấy số VIN hợp lệ (17 ký tự) trong file.');
            }

            // Remove duplicates within the file itself
            const uniqueMap = new Map();
            processedData.forEach(item => uniqueMap.set(item.vin, item));
            const finalData = Array.from(uniqueMap.values());

            onSuccess(finalData);
            onClose();

        } catch (error: any) {
            console.error('Lỗi đọc file:', error);
            showToast('Lỗi Đọc File', error.message || 'Lỗi không xác định', 'error');
        } finally {
            setIsUploading(false);
            setFile(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-0 md:p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-surface-card w-full md:max-w-xl h-full md:h-auto md:rounded-2xl shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-start justify-between p-4 md:p-5 border-b border-border-secondary">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 border border-emerald-100 shadow-inner">
                            <i className="fas fa-file-excel text-2xl text-emerald-600"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-text-primary tracking-tight">Nhập Xe Từ Excel (Nguyên Bản)</h2>
                            <p className="text-sm text-text-secondary mt-1">Dữ liệu từ file sẽ được giữ nguyên khi vào kho</p>
                        </div>
                    </div>
                </header>

                <main className="p-5 md:p-6 space-y-6 flex-grow min-h-0 bg-white overflow-y-auto">
                    <div className="space-y-4">
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-800">
                            <p className="flex items-start gap-2 mb-2">
                                <i className="fas fa-check-circle mt-0.5"></i>
                                <span><b>Giữ nguyên dữ liệu:</b> Toàn bộ thông tin từ file (Dòng xe, Màu sắc...) sẽ được nhập thẳng vào kho mà không tra cứu lại từ danh mục Master.</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <i className="fas fa-info-circle mt-0.5"></i>
                                <span>Hãy đảm bảo các cột trong file Excel có tên tương tự: "Số VIN", "Dòng xe", "Ngoại thất", "Nội thất", "Số máy".</span>
                            </p>
                        </div>
                        
                        <div className="flex justify-center">
                            <button type="button" onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 text-sm text-emerald-600 font-bold hover:text-emerald-700 hover:underline">
                                <i className="fas fa-download"></i> Tải file mẫu chuẩn tại đây
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-slate-700">Tải File Excel Lên</label>
                        <div 
                            className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 bg-slate-50 cursor-pointer flex flex-col items-center justify-center text-center group hover:bg-emerald-50/50 ${file ? 'border-emerald-400' : 'border-slate-200 hover:border-emerald-400'}`} 
                            onClick={() => document.getElementById('bulk-car-excel-detailed-upload')?.click()}
                        >
                            <input
                                type="file"
                                id="bulk-car-excel-detailed-upload"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-white shadow-sm text-slate-400 group-hover:text-emerald-500'}`}>
                                <i className={`fas text-2xl ${file ? 'fa-check' : 'fa-cloud-upload'}`}></i>
                            </div>
                            
                            <span className={`text-lg font-bold mb-1 ${file ? 'text-emerald-700' : 'text-slate-700'}`}>
                                {file ? file.name : 'Chọn file Excel chứa dữ liệu xe'}
                            </span>
                            {!file && <span className="text-sm text-slate-500">Hỗ trợ .xlsx, .xls, .csv</span>}
                        </div>
                    </div>
                </main>

                <footer className="px-5 py-4 flex justify-end items-center gap-3 bg-white md:rounded-b-2xl border-t border-border-secondary">
                    <button onClick={!isUploading ? onClose : undefined} className={`px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 ${isUploading ? 'opacity-50' : 'hover:bg-slate-200'}`}>
                        Hủy
                    </button>
                    <button onClick={!isUploading ? handleUpload : undefined} className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 flex items-center gap-2 shadow-lg shadow-emerald-200 ${isUploading ? 'opacity-70' : 'hover:bg-emerald-700 active:scale-95 transition-all'}`}>
                        {isUploading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-import"></i>}
                        Import Nguyên Bản
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default BulkAddCarExcelModal;
