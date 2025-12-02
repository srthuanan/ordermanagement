import React, { useState, useRef, useCallback } from 'react';
import Button from './Button';
import { compressImage } from '../../services/ocrService';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  isProcessing: boolean;
  ocrStatus: string;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing, ocrStatus, showToast }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);


  const handleFile = useCallback(async (file: File | null) => {
    // Reset states for a new file selection
    onFileSelect(null);
    setSelectedFile(null);
    setPreviewUrl(null);

    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Tệp không hợp lệ', 'Vui lòng chỉ chọn tệp hình ảnh.', 'warning');
        return;
      }

      setIsCompressing(true);
      try {
        const compressedFile = await compressImage(file);

        setSelectedFile(compressedFile);
        onFileSelect(compressedFile); // This triggers the OCR in the parent component

        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);

      } catch (error) {
        console.error("Image compression failed:", error);
        showToast('Lỗi Nén Ảnh', 'Không thể xử lý ảnh của bạn. Vui lòng thử ảnh khác.', 'error');
      } finally {
        setIsCompressing(false);
      }
    }
  }, [onFileSelect, showToast]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleFile(null);
  }

  const getOcrStatusClass = () => {
    if (ocrStatus.includes('Lỗi') || ocrStatus.includes('Không tìm thấy')) {
      return 'text-danger';
    }
    if (ocrStatus.includes('Đã điền')) {
      return 'text-success font-medium';
    }
    return 'text-accent-secondary';
  }

  return (
    <div
      onDragEnter={handleDrag}
      className="w-full"
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleChange}
      />
      <div
        className={`relative w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-300 group cursor-pointer overflow-hidden bg-surface-ground
                    ${dragActive ? 'border-accent-primary bg-surface-accent' : 'border-border-primary'}
                    ${selectedFile ? 'border-solid border-accent-primary/50' : ''}`}
        onClick={onButtonClick}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!selectedFile && (
          <div className="text-center text-text-placeholder group-hover:text-text-primary transition-colors">
            <i className="fas fa-cloud-upload-alt fa-3x mb-2 group-hover:text-accent-primary"></i>
            <p className="font-semibold text-text-primary">Kéo & thả hoặc nhấn để tải ảnh</p>
            <p className="text-xs">Chấp nhận file ảnh (tối đa 10MB)</p>
          </div>
        )}

        {selectedFile && previewUrl && (
          <>
            <div className="absolute inset-0 p-2 z-0">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-md" />
            </div>
            <div className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg cursor-pointer z-10">
              <span className="text-white font-bold">Thay đổi ảnh</span>
              <Button
                type="button"
                onClick={handleRemove}
                disabled={isProcessing}
                variant="ghost"
                className="flex-shrink-0 w-8 h-8 bg-surface-hover text-text-secondary rounded-full flex items-center justify-center hover:bg-danger-bg hover:text-danger-hover transition-colors disabled:opacity-50 !p-0"
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>
          </>
        )}
      </div>
      {(isCompressing || isProcessing || ocrStatus) && (
        <p className={`mt-2 text-sm text-center italic ${getOcrStatusClass()} `}>
          {isCompressing ? <><i className="fas fa-spinner fa-spin mr-2"></i>Đang nén ảnh...</> : (isProcessing ? <><i className="fas fa-spinner fa-spin mr-2"></i>{ocrStatus}</> : ocrStatus)}
        </p>
      )}
    </div>
  );
};

export default FileUpload;