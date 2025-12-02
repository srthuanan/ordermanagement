import React, { useState, useRef, useCallback } from 'react';
import Button from './Button';
import { compressImage, compressPdf } from '../../services/ocrService';

interface SimpleFileUploadProps {
  id: string;
  label: string;
  onFileSelect: (file: File | null) => void;
  required?: boolean;
  accept?: string;
}

const SimpleFileUpload: React.FC<SimpleFileUploadProps> = ({ id, label, onFileSelect, required = false, accept }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
          processedFile = await compressImage(file);
        } else if (file.type === 'application/pdf') {
          processedFile = await compressPdf(file);
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

  const getAcceptHint = () => {
    if (!accept) return "PDF, PNG, JPG, DOCX, etc.";
    if (accept.includes(".pdf")) return "Chỉ chấp nhận file PDF";
    if (accept.includes("image/*")) return "Chỉ chấp nhận file ảnh (PNG, JPG)";
    return `Chấp nhận: ${accept}`;
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-text-primary mb-2">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      {selectedFile ? (
        <div className="flex items-center gap-3 p-2 bg-surface-accent border border-accent-primary/20 rounded-lg">
          <i className="fas fa-file-alt text-accent-primary text-xl flex-shrink-0 ml-2"></i>
          <div className="flex-grow min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate" title={selectedFile.name}>{selectedFile.name}</p>
            <p className="text-xs text-text-secondary">{(selectedFile.size / 1024).toFixed(1)} KB</p>
          </div>
          <Button type="button" onClick={handleRemoveFile} disabled={isProcessing} variant="ghost" className="flex-shrink-0 w-8 h-8 bg-surface-hover text-text-secondary rounded-full flex items-center justify-center hover:bg-danger-bg hover:text-danger-hover transition-colors disabled:opacity-50 !p-0"><i className="fas fa-times"></i></Button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${dragActive ? 'border-accent-primary bg-surface-accent' : 'border-border-primary hover:border-accent-primary'}`}
        >
          <div className="space-y-1 text-center">
            <i className="fas fa-folder-open text-text-placeholder text-3xl"></i>
            <div className="flex text-sm text-text-secondary">
              <span
                className="relative rounded-md font-semibold text-accent-primary hover:text-accent-primary-hover"
              >
                <span>Tải lên một file</span>
                <input ref={inputRef} id={id} name={id} type="file" className="sr-only" onChange={handleFileChange} accept={accept} />
              </span>
              <p className="pl-1">hoặc kéo và thả</p>
            </div>
            <p className="text-xs text-text-placeholder">{getAcceptHint()}</p>
          </div>
        </div>
      )}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-20">
          <i className="fas fa-spinner fa-spin text-2xl text-accent-primary"></i>
          <p className="text-sm font-semibold text-accent-primary mt-2">Đang xử lý...</p>
        </div>
      )}
    </div>
  );
};

export default SimpleFileUpload;