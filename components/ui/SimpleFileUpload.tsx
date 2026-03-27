import React, { useState, useRef, useCallback, useEffect } from 'react';
import Button from './Button';
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
}

const SimpleFileUpload: React.FC<SimpleFileUploadProps> = ({ id, label, onFileSelect, required = false, accept, disableCompression = false, showPreview = true, compact = false }) => {
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
        setSelectedFile(null);
        onFileSelect(null);
        if (inputRef.current) inputRef.current.value = '';
        return;
      }

      setIsProcessing(true);
      try {
        let processedFile: File;
        if (file.type.startsWith('image/')) {
          if (!disableCompression) {
            setProcessingStatus('Đang nén ảnh...');
            processedFile = await compressImage(file);
          } else {
            processedFile = file;
          }
        } else if (file.type === 'application/pdf') {
          if (!disableCompression) {
            setProcessingStatus('Đang tối ưu file...');
            processedFile = await compressPdf(file, (_progress: number) => {
              // User requested to remove % display
              setProcessingStatus('Đang tối ưu file...');
            });
          } else {
            processedFile = file;
          }
        } else {
          processedFile = file;
        }
        setSelectedFile(processedFile);
        onFileSelect(processedFile);
      } catch (error) {
        console.error("File processing failed:", error);
        alert('Lỗi xử lý file. Vui lòng thử lại.');
        setSelectedFile(null);
        onFileSelect(null);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setSelectedFile(null);
      onFileSelect(null);
    }
  }, [onFileSelect, validateFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0] || null);
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const handleCancelProcessing = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsProcessing(false);
    setSelectedFile(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = '';
    // Note: The async compression process might continue in background but result will be ignored 
    // because we reset the state, although a true cancellation would require AbortController which is complex here.
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };



  return (
    <div className="relative">
      <label className={`block font-medium text-text-primary ${compact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      {selectedFile ? (
        <div className="relative group overflow-hidden rounded-lg border border-accent-primary/20 bg-surface-accent transition-all duration-300 hover:shadow-md">
          {showPreview && (
            <div className="w-full h-48 bg-surface-ground flex items-center justify-center overflow-hidden relative border-b border-accent-primary/10">
              {selectedFile.type === 'application/pdf' && previewUrl ? (
                <PdfThumbnail url={previewUrl} width={500} className="w-full h-full flex justify-center" />
              ) : selectedFile.type.startsWith('image/') && previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <i className="fas fa-file-alt text-accent-primary text-6xl opacity-50 self-center"></i>
              )}

              <div className="absolute top-2 right-2 z-10">
                <Button type="button" onClick={handleRemoveFile} disabled={isProcessing} variant="ghost" className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-danger hover:text-white transition-colors backdrop-blur-sm !p-0 shadow-sm"><i className="fas fa-times"></i></Button>
              </div>
            </div>
          )}

          <div className={`${compact ? 'p-1.5 px-2' : 'p-3'} bg-surface-card flex items-center justify-between gap-2`}>
            <div className={`min-w-0 flex-1 ${compact ? 'flex flex-row items-center gap-2' : ''}`}>
              <p className={`${compact ? 'text-xs max-w-[120px]' : 'text-sm'} font-bold text-text-primary truncate`} title={selectedFile.name}>{selectedFile.name}</p>
              <p className={`text-[10px] text-text-secondary ${compact ? 'mt-0' : 'mt-1'}`}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <Button
              type="button"
              onClick={handleRemoveFile}
              disabled={isProcessing}
              variant="ghost"
              className={`text-text-secondary hover:text-danger hover:bg-danger/10 ${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full flex items-center justify-center transition-colors flex-shrink-0 !p-0`}
              title="Xóa file"
            >
              <i className={`fas fa-trash-alt ${compact ? 'text-xs' : ''}`}></i>
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`mt-1 flex items-center justify-center cursor-pointer transition-all duration-300 border group ${dragActive ? 'border-accent-primary bg-accent-primary/5' : 'border-border-primary/50 bg-gradient-to-br from-surface-ground to-surface-card hover:border-accent-primary/50 hover:shadow-lg hover:shadow-accent-primary/5'} ${compact ? 'h-9 flex-row gap-2 px-3 rounded-lg' : 'h-32 flex-col rounded-2xl'}`}
        >
          <div className={`${compact ? 'w-5 h-5 mb-0 bg-transparent shadow-none border-none' : 'w-12 h-12 mb-3 bg-white shadow-sm border border-border-primary/50'} rounded-full flex flex-shrink-0 items-center justify-center group-hover:scale-110 group-hover:bg-accent-primary group-hover:text-white transition-all duration-300`}>
            <i className={`fas fa-cloud-upload-alt ${compact ? 'text-[11px]' : 'text-xl'} ${dragActive ? 'text-accent-primary' : 'text-text-secondary'} group-hover:text-white transition-colors`}></i>
          </div>

          <div className={compact ? 'text-left flex items-center gap-1.5' : 'text-center'}>
            <span className={`block font-semibold text-text-primary group-hover:text-accent-primary transition-colors ${compact ? 'text-xs' : 'text-sm'}`}>
              Chạm tải tệp
            </span>
            <input ref={inputRef} id={id} name={id} type="file" className="sr-only" onChange={handleFileChange} accept={accept} />
            {!compact && <p className="text-[10px] text-text-secondary/70 mt-0.5 uppercase tracking-wider font-medium">hoặc kéo và thả</p>}
          </div>
        </div>
      )}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-20">
          <i className="fas fa-spinner fa-spin text-2xl text-accent-primary"></i>
          <p className="text-sm font-semibold text-accent-primary mt-2 mb-3">
            {processingStatus ? processingStatus : "Đang xử lý..."}
          </p>
          <Button
            type="button"
            onClick={handleCancelProcessing}
            variant="ghost"
            className="text-xs text-danger hover:bg-danger-bg px-3 py-1 rounded-full border border-danger/30"
          >
            Hủy bỏ
          </Button>
        </div>
      )}
    </div>
  );
};

export default SimpleFileUpload;