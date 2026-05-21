import React, { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, FileSpreadsheet, Download, Plus, List } from 'lucide-react';
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
  const [mode, setMode] = useState<'single' | 'excel'>('single');

  // Excel Mode States
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [localError, setLocalError] = useState('');
  const [csvData, setCsvData] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single Mode States
  const [vin, setVin] = useState('');
  const [dongXe, setDongXe] = useState('');
  const [phienBan, setPhienBan] = useState('');
  const [ngoaiThat, setNgoaiThat] = useState('');
  const [noiThat, setNoiThat] = useState('');
  const [maDms, setMaDms] = useState('');

  const downloadSampleExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['vin', 'dong_xe', 'phien_ban', 'ngoai_that', 'noi_that', 'ma_dms'],
      ['RLV12345678900001', 'VF 8', 'Eco', 'Trắng', 'Đen', 'N31913']
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
    setLocalError('');

    if (mode === 'excel') {
      if (!csvData) {
        setLocalError('Vui lòng chọn file Excel hợp lệ.');
        return;
      }
      const ok = await onSubmit(csvData);
      if (ok) {
        onClose();
      }
    } else {
      if (!vin.trim()) {
        setLocalError('Vui lòng nhập số VIN hợp lệ.');
        return;
      }
      
      const singleCsv = `${vin.trim().toUpperCase()},${dongXe.trim()},${phienBan.trim()},${ngoaiThat.trim()},${noiThat.trim()},${maDms.trim()}`;
      const header = 'vin,dong_xe,phien_ban,ngoai_that,noi_that,ma_dms';
      
      const ok = await onSubmit(`${header}\n${singleCsv}`);
      if (ok) {
        onClose();
      }
    }
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true" style={{ maxWidth: '500px' }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Kho xe</p>
            <h2>Thêm xe vào kho</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <div className="order-form" style={{ paddingBottom: '0', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setMode('single')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 0',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: mode === 'single' ? '#ffffff' : 'transparent',
                color: mode === 'single' ? '#0f766e' : '#64748b',
                boxShadow: mode === 'single' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={16} />
              Nhập đơn lẻ
            </button>
            <button
              type="button"
              onClick={() => setMode('excel')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 0',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: mode === 'excel' ? '#ffffff' : 'transparent',
                color: mode === 'excel' ? '#0f766e' : '#64748b',
                boxShadow: mode === 'excel' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <List size={16} />
              Nhập từ Excel
            </button>
          </div>

          <form id="import-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '8px' }}>
            {mode === 'single' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label className="full-span">
                  <span>Số VIN (Bắt buộc)</span>
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    placeholder="Nhập 17 ký tự VIN..."
                    required
                  />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label>
                    <span>Dòng xe</span>
                    <input
                      type="text"
                      value={dongXe}
                      onChange={(e) => setDongXe(e.target.value)}
                      placeholder="VD: VF 8"
                    />
                  </label>
                  <label>
                    <span>Phiên bản</span>
                    <input
                      type="text"
                      value={phienBan}
                      onChange={(e) => setPhienBan(e.target.value)}
                      placeholder="VD: Eco"
                    />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label>
                    <span>Màu Ngoại thất</span>
                    <input
                      type="text"
                      value={ngoaiThat}
                      onChange={(e) => setNgoaiThat(e.target.value)}
                      placeholder="VD: Trắng"
                    />
                  </label>
                  <label>
                    <span>Màu Nội thất</span>
                    <input
                      type="text"
                      value={noiThat}
                      onChange={(e) => setNoiThat(e.target.value)}
                      placeholder="VD: Đen"
                    />
                  </label>
                </div>
                <label className="full-span">
                  <span>Mã DMS</span>
                  <input
                    type="text"
                    value={maDms}
                    onChange={(e) => setMaDms(e.target.value)}
                    placeholder="Ví dụ: N31913"
                  />
                </label>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            )}
          </form>
        </div>

        <div className="order-form" style={{ paddingTop: '0', display: 'flex', flexDirection: 'column' }}>
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
            <button type="submit" form="import-form" className="primary-button" disabled={isSubmitting || (mode === 'excel' && !fileSelected)}>
              <Upload size={18} />
              <span>{isSubmitting ? 'Đang xử lý...' : (mode === 'single' ? 'Thêm xe này' : 'Import vào kho')}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
