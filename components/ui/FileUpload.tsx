import React, { useState, useRef, useCallback } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  isProcessing: boolean;
  ocrStatus: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing, ocrStatus }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      onFileSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
        setSelectedFile(null);
        setPreviewUrl(null);
        onFileSelect(null);
    }
  }, [onFileSelect]);

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
            return 'text-red-500';
        }
        if (ocrStatus.includes('Đã điền')) {
            return 'text-green-600 font-medium';
        }
        return 'text-sky-600';
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
        className={`relative w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-300
                    ${dragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300'}
                    ${selectedFile ? 'border-solid' : ''}
                  `}
        onClick={onButtonClick}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!selectedFile && (
             <div className="text-center text-slate-500">
                <i className="fas fa-cloud-upload-alt fa-3x mb-2"></i>
                <p className="font-semibold">Kéo & thả hoặc nhấn để tải ảnh</p>
                <p className="text-xs">Chấp nhận file ảnh (tối đa 10MB)</p>
            </div>
        )}

        {selectedFile && previewUrl && (
            <>
            <div className="absolute inset-0 p-2 z-0">
                 <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-md" />
            </div>
            <div className="absolute inset-0 bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg cursor-pointer z-10">
                <span className="text-white font-bold">Thay đổi ảnh</span>
            </div>
             <button
                onClick={handleRemove}
                className="absolute top-2 right-2 z-20 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-transform duration-200 hover:scale-110"
                title="Xóa ảnh"
            >
                <i className="fas fa-times"></i>
            </button>
            </>
        )}
      </div>
      {(isProcessing || ocrStatus) && (
        <p className={`mt-2 text-sm text-center italic ${getOcrStatusClass()}`}>
            {isProcessing ? <><i className="fas fa-spinner fa-spin mr-2"></i>Đang xử lý ảnh...</> : ocrStatus}
        </p>
      )}
    </div>
  );
};

export default FileUpload;