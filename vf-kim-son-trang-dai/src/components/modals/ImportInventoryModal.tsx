import React, { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportInventoryModalProps {
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (csvText: string) => Promise<boolean>;
}

export const ImportInventoryModal: React.FC<ImportInventoryModalProps> = ({
  isSubmitting,
  error,
  onClose,
  onSubmit
}) => {
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [localError, setLocalError] = useState('');
  const [csvData, setCsvData] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadSampleExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['vin', 'dong_xe', 'phien_ban', 'ngoai_that', 'noi_that'],
      ['RLV12345678900001', 'VF 8', 'Eco', 'Trắng', 'Đen']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KhoXe');
    XLSX.writeFile(wb, 'Mau_Nhap_Kho.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileSelected(file);
    setLocalError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(ws);
        setCsvData(csv);
      } catch (err) {
        setLocalError('Lỗi đọc file Excel. Vui lòng kiểm tra lại định dạng.');
        setCsvData('');
      }
    };
    reader.onerror = () => {
      setLocalError('Không thể đọc file.');
    };
    reader.readAsBinaryString(file);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!csvData) {
      setLocalError('Vui lòng chọn file Excel hợp lệ.');
      return;
    }
    const ok = await onSubmit(csvData);
    if (ok) {
      onClose();
    }
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true" style={{ maxWidth: '500px' }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Kho xe</p>
            <h2>Nhập kho bằng Excel</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <div className="order-form" style={{ paddingBottom: '0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>1. Tải file mẫu</span>
                <button type="button" className="ghost-button" onClick={downloadSampleExcel} style={{ fontSize: '12px', height: '28px', padding: '0 10px' }}>
                  <Download size={14} />
                  <span>Tải file Excel mẫu</span>
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Sử dụng file mẫu để đảm bảo cấu trúc các cột (VIN, dòng xe, phiên bản...) chính xác.
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>2. Tải lên dữ liệu</span>
              </div>
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '24px 16px', 
                  background: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  style={{ display: 'none' }} 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <FileSpreadsheet size={32} style={{ color: fileSelected ? '#10b981' : '#94a3b8', marginBottom: '12px' }} />
                {fileSelected ? (
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{fileSelected.name}</strong>
                ) : (
                  <>
                    <strong style={{ fontSize: '13px', color: '#3b82f6', marginBottom: '4px' }}>Bấm để chọn file Excel</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Hỗ trợ định dạng .xlsx, .xls</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          {(error || localError) && (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{localError || error}</span>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={isSubmitting}>
              Đóng
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting || !fileSelected}>
              <Upload size={18} />
              <span>{isSubmitting ? 'Đang import...' : 'Import vào kho'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
