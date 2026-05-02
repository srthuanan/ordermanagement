import React, { useState, useRef, useCallback, useEffect } from 'react';
import { compressImage, compressPdf } from '../../services/ocrService';
import PdfThumbnail from './PdfThumbnail';

interface SimpleFileUploadProps {
  id: string;
  label: string;
  onFileSelect: (file: File | null) => void;
  required?: boolean;
  accept?: string;
  disableCompression?: boolean;
  showPreview?: boolean;
  compact?: boolean;
  showScan?: boolean; // Legacy prop, can be removed or ignored
  className?: string;
}

const SimpleFileUpload: React.FC<SimpleFileUploadProps> = ({ id, label, onFileSelect, required = false, accept, disableCompression = false, showPreview = true, compact = false, className = "" }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const validateFile = useCallback((file: File) => {
    if (accept) {
      const fileType = file.type;
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const isAccepted = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.slice(0, -1));
        }
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type);
        }
        return fileType === type;
      });
      if (!isAccepted) {
        alert(`Loại tệp không hợp lệ. Vui lòng chọn tệp có định dạng: ${accept}`);
        return false;
      }
    }
    return true;
  }, [accept]);

  const handleFile = useCallback(async (file: File | null) => {
    if (file) {
      if (!validateFile(file)) {
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      setIsProcessing(true);
      try {
        let processedFile: File = file;
        
        // 1. Nén nếu là ảnh
        if (file.type.startsWith('image/')) {
          if (!disableCompression) {
            setProcessingStatus('Đang nén ảnh...');
            processedFile = await compressImage(file);
          }
        } 
        // 2. Tối ưu PDF
        else if (file.type === 'application/pdf') {
          if (!disableCompression) {
            setProcessingStatus('Đang tối ưu file...');
            processedFile = await compressPdf(file, (p) => {
              setProcessingStatus(`Đang tối ưu (${p}%)`);
            });
          }
        }

        setSelectedFile(processedFile);
        onFileSelect(processedFile);

        // 3. TÁCH TRANG PDF THÀNH ẢNH NGAY LẬP TỨC (LIỀN)
        // Đây chính là yêu cầu của người dùng: tách ngay khi tải lên
        if (processedFile) {
            const { preProcessFile } = await import('../../utils/aiGeminiPdfScanner');
            setProcessingStatus('Đang tách trang...');
            const payload = await preProcessFile(processedFile);
            
            // Nếu component cha có prop này, gửi payload đã tách xong lên
            if ((onFileSelect as any).onPayloadReady) {
                (onFileSelect as any).onPayloadReady(payload);
            }
            // Một cách sạch hơn là thêm prop mới vào SimpleFileUpload (sẽ làm ở bước sau nếu cần)
            // Hiện tại tôi sẽ bắn sự kiện custom để parent bắt được
            const event = new CustomEvent(`file_processed_${id}`, { detail: payload });
            window.dispatchEvent(event);
        }

      } catch (error: any) {
        console.error("File processing failed:", error);
        alert('Lỗi xử lý file: ' + error.message);
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    } else {
      setSelectedFile(null);
      onFileSelect(null);
    }
  }, [onFileSelect, validateFile, disableCompression, id]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0] || null);
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className={`relative ${className}`}>
      <label className={`block font-bold text-text-primary ${compact ? 'text-[10px] mb-1' : 'text-sm mb-2'}`}>
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      
      {selectedFile ? (
        <div className="relative overflow-hidden rounded-xl bg-surface-ground border border-border-primary/50 shadow-sm animate-fade-in group">
          {showPreview && (
            <div className="w-full h-40 bg-black flex items-center justify-center overflow-hidden relative border-b border-border-primary/20">
              {selectedFile.type === 'application/pdf' && previewUrl ? (
                <PdfThumbnail url={previewUrl} width={500} className="w-full h-full flex justify-center" />
              ) : selectedFile.type.startsWith('image/') && previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <i className="fas fa-file-alt text-accent-primary text-5xl opacity-40"></i>
              )}
              <div className="absolute top-2 right-2 flex items-center gap-2">
                 {isProcessing && (
                   <span className="bg-black/60 backdrop-blur-xl text-[8px] font-black text-white px-2 py-1 rounded-full animate-pulse border border-white/10 uppercase">{processingStatus}</span>
                 )}
                 <button onClick={handleRemoveFile} className="w-8 h-8 bg-danger text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform border border-danger shadow-lg shadow-danger/20"><i className="fas fa-times"></i></button>
              </div>
            </div>
          )}
          <div className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-text-primary truncate uppercase tracking-widest">{selectedFile.name}</p>
              <p className="text-[9px] text-text-secondary mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <div className="flex items-center gap-2">
                <p className="text-[8px] font-black text-accent-primary bg-accent-primary/10 px-2 py-1 rounded-full uppercase tracking-tighter">ĐÃ TẢI LÊN</p>
                {!showPreview && (
                  <button 
                    onClick={handleRemoveFile} 
                    className="w-6 h-6 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors border border-red-100"
                    title="Xóa tệp"
                  >
                    <i className="fas fa-times text-[10px]"></i>
                  </button>
                )}
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative group flex items-center justify-center transition-all duration-500 border rounded-2xl cursor-pointer ${dragActive ? 'border-accent-primary bg-accent-primary/5 ring-4 ring-accent-primary/5' : 'border-border-primary/50 bg-gradient-to-br from-surface-ground to-surface-card hover:border-accent-primary/40'} ${compact ? 'h-10 px-4' : 'h-32 flex-col flex-grow'}`}
        >
          <div className={`flex items-center gap-3 ${compact ? 'w-full' : 'flex-col'}`}>
            <div className={`flex items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary transition-transform group-hover:scale-110 duration-500 ${compact ? 'w-6 h-6' : 'w-12 h-12'}`}>
              <i className={`fas fa-cloud-upload-alt ${compact ? 'text-xs' : 'text-xl'}`}></i>
            </div>
            <div className={compact ? 'flex-1' : 'text-center'}>
              <p className={`font-black text-text-primary uppercase tracking-[0.2em] ${compact ? 'text-[9px]' : 'text-[10px]'}`}>Chọn tệp tin</p>
              {!compact && <p className="text-[8px] text-text-secondary font-medium tracking-tight mt-1">Hỗ trợ Ảnh, PDF (Tối ưu tự động)</p>}
            </div>
            {!compact && isProcessing && (
               <div className="absolute inset-0 bg-black/50 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center text-white z-10 animate-fade-in">
                  <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest">{processingStatus}</p>
               </div>
            )}
          </div>
          
          <input
            id={id}
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
};

export default SimpleFileUpload;