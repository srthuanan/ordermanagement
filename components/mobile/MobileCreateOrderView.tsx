import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  Check,
  Car,
  UploadCloud,
  X,
  ArrowRight,
  Search,
  Loader2,
  Lock,
  FileText,
} from 'lucide-react';
import { Order, StockVehicle } from '../../types';
import { useVehicleConfig } from '../../hooks/useVehicleConfig';
import * as apiService from '../../services/apiService';
import { cleanCyberContractCode } from '../../utils/stringUtils';
import { getExteriorSwatchColor, getCarImage } from '../../utils/styleUtils';
import SelectPolicyModal from '../modals/SelectPolicyModal';

interface MobileCreateOrderViewProps {
  onSuccess: (newOrder: Order) => void;
  onBack: () => void;
  showToast: (
    title: string,
    message: string,
    type: 'success' | 'error' | 'loading' | 'warning' | 'info',
    duration?: number
  ) => void;
  currentUser: string;
  currentUserName?: string;
  existingOrderNumbers?: string[];
  initialVehicle?: StockVehicle;
}

export const MobileCreateOrderView: React.FC<MobileCreateOrderViewProps> = ({
  onSuccess,
  onBack,
  showToast,
  currentUser,
  currentUserName: _currentUserName,
  existingOrderNumbers = [],
  initialVehicle,
}) => {
  const [step, setStep] = useState<1 | 2>(initialVehicle ? 2 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    ten_ban_hang: currentUser,
    ten_khach_hang: '',
    so_don_hang: '',
    ma_hd_cyber: '',
    dong_xe: initialVehicle?.['Dòng xe'] || '',
    phien_ban: initialVehicle?.['Phiên bản'] || '',
    ngoai_that: initialVehicle?.['Ngoại thất'] || initialVehicle?.['Màu ngoại thất'] || '',
    noi_that: initialVehicle?.['Nội thất'] || initialVehicle?.['Màu nội thất'] || '',
    ngay_coc: '', // 🌟 BẮT BUỘC RỖNG - CHỈ TRÍCH XUẤT TỪ UNC, TUYỆT ĐỐI KHÔNG ĐIỀN TAY
    thoi_gian_can_xe: '',
    vin: initialVehicle?.VIN || '',
    chinh_sach: '',
  });

  const [uncFile, setUncFile] = useState<File | null>(null);
  const [uncPreview, setUncPreview] = useState<string | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');

  // Hàm chuẩn hoá ngày trích xuất từ OCR thành định dạng chuẩn YYYY-MM-DD
  const parseExtractedDate = useCallback((rawDate: string | null | undefined): string | null => {
    if (!rawDate) return null;
    const trimmed = rawDate.trim();
    if (!trimmed) return null;

    if (trimmed.includes('T')) {
      const part = trimmed.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return null;
  }, []);

  // Hàm hiển thị định dạng ngày thân thiện DD/MM/YYYY cho TVBH
  const formatDisplayDate = useCallback((isoDate: string): string => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  }, []);

  // Cọc tồn Cyber
  const [backlogOrders, setBacklogOrders] = useState<any[]>([]);
  const [isLoadingBacklog, setIsLoadingBacklog] = useState(false);
  const [isBacklogSheetOpen, setIsBacklogSheetOpen] = useState(false);
  const [backlogSearch, setBacklogSearch] = useState('');

  const {
    versionsMap,
    allPossibleVersions,
    vehicleLines,
    getMappedExteriors,
    getMappedInteriors,
  } = useVehicleConfig();

  const isPreFilled = !!initialVehicle;

  // Cập nhật danh sách ngoại thất & nội thất phù hợp với dòng xe / phiên bản
  const availableVersions = useMemo(() => {
    if (!formData.dong_xe) return [];
    return versionsMap[formData.dong_xe] || allPossibleVersions || [];
  }, [formData.dong_xe, versionsMap, allPossibleVersions]);

  const availableExteriors = useMemo(() => {
    if (!formData.dong_xe || !formData.phien_ban) return [];
    return getMappedExteriors(formData.dong_xe, formData.phien_ban);
  }, [formData.dong_xe, formData.phien_ban, getMappedExteriors]);

  const availableInteriors = useMemo(() => {
    if (!formData.dong_xe || !formData.phien_ban) return [];
    return getMappedInteriors(formData.dong_xe, formData.phien_ban);
  }, [formData.dong_xe, formData.phien_ban, getMappedInteriors]);

  // Chọn dòng xe
  const handleSelectModel = (model: string) => {
    if (isPreFilled) return;
    const versions = versionsMap[model] || [];
    const autoVersion = versions.length === 1 ? versions[0] : '';
    setFormData((prev) => ({
      ...prev,
      dong_xe: model,
      phien_ban: autoVersion,
      ngoai_that: '',
      noi_that: '',
    }));
  };

  // Chọn phiên bản
  const handleSelectVersion = (version: string) => {
    if (isPreFilled) return;
    setFormData((prev) => ({
      ...prev,
      phien_ban: version,
      ngoai_that: '',
      noi_that: '',
    }));
  };

  // Tải danh sách hợp đồng cọc tồn của TVBH CHỈ KHI TVBH mở modal cọc tồn
  const handleOpenBacklogSheet = async () => {
    setIsBacklogSheetOpen(true);
    if (backlogOrders.length > 0) return;
    setIsLoadingBacklog(true);
    try {
      const res = await apiService.getBacklogOrders();
      if (res.status === 'SUCCESS' && Array.isArray(res.data)) {
        setBacklogOrders(res.data);
      }
    } catch (err) {
      console.error('[MobileCreateOrder] Lỗi tải cọc tồn:', err);
    } finally {
      setIsLoadingBacklog(false);
    }
  };

  // Lọc cọc tồn của chính TVBH
  const userBacklogList = useMemo(() => {
    if (!backlogOrders || backlogOrders.length === 0) return [];
    const isAdm =
      currentUser?.toLowerCase() === 'admin' ||
      currentUser?.toLowerCase() === 'quản trị viên';
    return backlogOrders.filter((item) => {
      const tvbh = (item.tvbh_name || '').toLowerCase();
      const me = (currentUser || '').toLowerCase();
      if (!isAdm && !tvbh.includes(me) && !me.includes(tvbh)) return false;
      const td = (item.tien_do || '').toLowerCase();
      return td !== 'hoàn cọc' && td !== 'hủy cọc';
    });
  }, [backlogOrders, currentUser]);

  const filteredBacklog = useMemo(() => {
    if (!backlogSearch.trim()) return userBacklogList;
    const q = backlogSearch.toLowerCase().trim();
    return userBacklogList.filter((item) => {
      const soHd = (item.so_hop_dong || item.so_don_hang || '').toLowerCase();
      const kh = (item.khach_hang || '').toLowerCase();
      const sdt = (item.so_dien_thoai || '').toLowerCase();
      return soHd.includes(q) || kh.includes(q) || sdt.includes(q);
    });
  }, [userBacklogList, backlogSearch]);

  // Xử lý chọn 1 hợp đồng cọc tồn
  const handleSelectBacklogContract = (contract: any) => {
    const cyberCode = cleanCyberContractCode(
      contract.so_hop_dong || contract.so_ct || contract.so_don_hang || ''
    );
    const customerName = (contract.khach_hang || '').trim().toUpperCase();
    setFormData((prev) => ({
      ...prev,
      ma_hd_cyber: cyberCode,
      ten_khach_hang: customerName || prev.ten_khach_hang,
    }));
    setIsBacklogSheetOpen(false);
    showToast('Đã chọn HĐ', `Đã chọn: ${cyberCode} - ${customerName}`, 'success', 2500);
  };

  // Xử lý chọn file UNC / Đặt cọc và tự động trích xuất ngày cọc qua OCR
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Xóa ngày cọc cũ và khởi động trạng thái đọc ảnh
      setFormData((prev) => ({ ...prev, ngay_coc: '' }));
      setIsProcessingOcr(true);
      setOcrStatus('Đang chuẩn bị ảnh...');

      let processedFile: File = file;
      try {
        const { compressImage, extractDateWithGemini, extractDateFromImageTesseract } =
          await import('../../services/ocrService');

        try {
          setOcrStatus('Đang nén ảnh...');
          const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.75 });
          processedFile = compressed;
          setUncFile(compressed);
          const reader = new FileReader();
          reader.onloadend = () => {
            setUncPreview(reader.result as string);
          };
          reader.readAsDataURL(compressed);
        } catch {
          setUncFile(file);
          setUncPreview(URL.createObjectURL(file));
        }

        setOcrStatus('AI đang quét ngày cọc...');
        let extractedDate = await extractDateWithGemini(processedFile, (status) =>
          setOcrStatus(status)
        );

        if (!extractedDate) {
          setOcrStatus('Thử nhận diện phụ...');
          try {
            extractedDate = await extractDateFromImageTesseract(processedFile, (status) =>
              setOcrStatus(status)
            );
          } catch {
            // fallback tesseract
          }
        }

        const validDate = parseExtractedDate(extractedDate);
        if (validDate) {
          setFormData((prev) => ({ ...prev, ngay_coc: validDate }));
          setOcrStatus('Đã trích xuất');
          showToast(
            'Đã lấy ngày cọc',
            `Ngày cọc ghi nhận từ UNC: ${formatDisplayDate(validDate)}`,
            'success',
            3500
          );
        } else {
          setOcrStatus('Không tìm thấy ngày cọc');
          showToast(
            'Không đọc được ngày cọc',
            'Không tìm thấy ngày nộp tiền/giao dịch trên UNC. Vui lòng chụp hoặc tải ảnh rõ nét hơn.',
            'error',
            5000
          );
        }
      } catch (err) {
        console.error('[MobileCreateOrder] Lỗi OCR:', err);
        setOcrStatus('Lỗi nhận diện');
        showToast(
          'Lỗi đọc ảnh UNC',
          'Không thể trích xuất ngày cọc từ ảnh này. Vui lòng thử lại với ảnh rõ nét hơn.',
          'error',
          4500
        );
      } finally {
        setIsProcessingOcr(false);
      }
    },
    [showToast, parseExtractedDate, formatDisplayDate]
  );

  // Kiểm tra tính hợp lệ Bước 1
  const validateStep1 = () => {
    const { dong_xe, phien_ban, ngoai_that, noi_that } = formData;
    if (!dong_xe) {
      showToast('Thiếu dòng xe', 'Vui lòng chọn Dòng xe.', 'warning', 2500);
      return false;
    }
    if (!phien_ban) {
      showToast('Thiếu phiên bản', 'Vui lòng chọn Phiên bản xe.', 'warning', 2500);
      return false;
    }
    if (!ngoai_that) {
      showToast('Thiếu màu sắc', 'Vui lòng chọn Màu ngoại thất.', 'warning', 2500);
      return false;
    }
    if (!noi_that) {
      showToast('Thiếu màu sắc', 'Vui lòng chọn Màu nội thất.', 'warning', 2500);
      return false;
    }
    return true;
  };

  const handleNextToStep2 = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  // Submit tạo đơn hàng
  const handleSubmitOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    const { ten_khach_hang, so_don_hang, ma_hd_cyber, chinh_sach, ngay_coc } = formData;
    if (!ten_khach_hang.trim()) {
      showToast('Thiếu tên khách', 'Vui lòng nhập Tên khách hàng.', 'warning', 3000);
      return;
    }
    if (!so_don_hang.trim()) {
      showToast('Thiếu SĐH', 'Vui lòng nhập Số đơn hàng VinFast DMS.', 'warning', 3000);
      return;
    }
    const pattern = new RegExp('^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$');
    if (!pattern.test(so_don_hang.trim())) {
      showToast(
        'Sai định dạng SĐH',
        'Số đơn hàng phải chuẩn định dạng DMS: Nxxxxx-VSO-xx-xx-xxxx.',
        'warning',
        4000
      );
      return;
    }
    if (existingOrderNumbers.includes(so_don_hang.trim())) {
      showToast('Trùng SĐH', 'Số đơn hàng này đã tồn tại trên hệ thống.', 'error', 4000);
      return;
    }
    if (!ma_hd_cyber.trim()) {
      showToast('Thiếu Mã HĐ', 'Vui lòng nhập hoặc chọn Mã HĐ Cyber.', 'warning', 3500);
      return;
    }
    if (!chinh_sach.trim()) {
      showToast('Thiếu CSBH', 'Vui lòng chọn Chính sách bán hàng.', 'warning', 3000);
      return;
    }
    if (!uncFile) {
      showToast('Thiếu UNC', 'Vui lòng chụp hoặc đính kèm ảnh UNC cọc.', 'warning', 3000);
      return;
    }
    if (!ngay_coc) {
      showToast(
        'Chưa có Ngày Cọc',
        'Ngày cọc bắt buộc trích xuất tự động từ ảnh UNC (không điền tay). Vui lòng tải lại ảnh UNC rõ nét.',
        'error',
        4500
      );
      return;
    }

    setIsSubmitting(true);
    showToast('Đang tạo đơn', 'Hệ thống đang ghi nhận đơn hàng lên máy chủ...', 'loading');

    try {
      const requestPayload = {
        ...formData,
        ma_hd_cyber: cleanCyberContractCode(formData.ma_hd_cyber) || null,
        ten_khach_hang: formData.ten_khach_hang.trim().toUpperCase(),
        so_don_hang: formData.so_don_hang.trim().toUpperCase(),
        is_flex_match: 'false',
        ngoai_that_flex: '[]',
        noi_that_flex: '[]',
      };

      const result = await apiService.addRequest(requestPayload as any, uncFile);
      if (result.status === 'SUCCESS' && result.newRecord) {
        showToast('Thành công', 'Đơn hàng mới đã được tạo và gửi thành công!', 'success', 3500);
        onSuccess(result.newRecord);
        onBack();
      } else {
        throw new Error(result.message || 'Không thể tạo đơn hàng.');
      }
    } catch (err: any) {
      showToast('Lỗi tạo đơn', err.message || 'Đã có lỗi xảy ra khi tạo đơn hàng.', 'error', 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewCarImg = useMemo(() => {
    if (!formData.dong_xe) return '';
    return getCarImage(formData.dong_xe, formData.ngoai_that, formData.phien_ban);
  }, [formData.dong_xe, formData.ngoai_that, formData.phien_ban]);

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
      className="fixed inset-0 h-[100dvh] w-full bg-[#f2f2f7] text-slate-800 flex flex-col z-50 overflow-hidden select-none"
    >
      {/* 🍏 1. APPLE NAVIGATION BAR */}
      <header className="w-full bg-white border-b border-slate-150 flex-shrink-0 z-30 shadow-2xs">
        {/* Grab handle thanh kéo chuẩn iOS */}
        <div className="pt-2 pb-0.5 flex justify-center">
          <div className="w-8 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="px-3.5 py-1.5 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-[13px] font-semibold text-slate-600 hover:text-slate-900 active:opacity-60 transition-opacity flex items-center gap-0.5 py-1 px-1 -ml-1 rounded-lg"
          >
            <ChevronLeft size={18} />
            <span>Hủy</span>
          </button>

          <div className="text-center">
            <h1 className="text-[13.5px] font-bold text-slate-900 tracking-tight">
              Tạo Đơn Hàng
            </h1>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
            aria-label="Đóng"
          >
            <X size={15} />
          </button>
        </div>

        {/* Apple Segmented Step Indicator */}
        <div className="px-3.5 pb-2">
          <div className="bg-slate-100/90 p-0.5 rounded-xl grid grid-cols-2 gap-1 border border-black/[0.04]">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`py-1.5 rounded-[10px] text-[11.5px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                step === 1
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>1. Cấu hình xe</span>
            </button>
            <button
              type="button"
              onClick={handleNextToStep2}
              className={`py-1.5 rounded-[10px] text-[11.5px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                step === 2
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>2. Thông tin & UNC</span>
            </button>
          </div>
        </div>
      </header>

      {/* 📋 2. BODY CONTENT (SCROLLABLE) */}
      <main className="flex-1 overflow-y-auto px-3.5 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] space-y-3.5 no-scrollbar">
        {/* ========================================================================= */}
        {/* BƯỚC 1: CẤU HÌNH DÒNG XE • PHIÊN BẢN • MÀU SẮC */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            {/* Card Preview xe 3D */}
            {formData.dong_xe && (
              <div className="bg-gradient-to-b from-white to-slate-50/80 rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex items-center gap-3">
                <div className="w-24 h-16 flex items-center justify-center bg-slate-100/70 rounded-xl overflow-hidden p-1 flex-shrink-0">
                  {previewCarImg ? (
                    <img
                      src={previewCarImg}
                      alt={formData.dong_xe}
                      className="max-h-full max-w-full object-contain filter drop-shadow-md"
                    />
                  ) : (
                    <Car size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[14px] text-slate-900">
                      {formData.dong_xe}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {formData.phien_ban}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-0.5 truncate">
                    {formData.ngoai_that && (
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white ring-1 ring-slate-300 flex-shrink-0"
                          style={{ backgroundColor: getExteriorSwatchColor(formData.ngoai_that) }}
                        />
                        <span className="truncate">{formData.ngoai_that}</span>
                      </span>
                    )}
                  </div>
                  {formData.vin && (
                    <div className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded w-fit mt-1 border border-emerald-200/70">
                      VIN: {formData.vin}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 1. Chọn Dòng xe */}
            <div className="bg-white rounded-2xl border border-slate-150 p-3.5 shadow-2xs space-y-2">
              <label className="text-[11px] font-semibold text-slate-500 block">
                1. Dòng Xe <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {vehicleLines.map((model) => {
                  const isSel = formData.dong_xe === model;
                  return (
                    <button
                      key={model}
                      type="button"
                      disabled={isPreFilled}
                      onClick={() => handleSelectModel(model)}
                      className={`py-2 px-1 rounded-xl text-center font-semibold text-[11.5px] transition-all border ${
                        isSel
                          ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                          : 'bg-slate-50/80 text-slate-700 border-slate-200/80 hover:bg-slate-100 active:scale-95'
                      } ${isPreFilled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {model}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Chọn Phiên bản */}
            {formData.dong_xe && (
              <div className="bg-white rounded-2xl border border-slate-150 p-3.5 shadow-2xs space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 block">
                  2. Phiên Bản <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableVersions.length > 0 ? (
                    availableVersions.map((ver) => {
                      const isSel = formData.phien_ban === ver;
                      return (
                        <button
                          key={ver}
                          type="button"
                          disabled={isPreFilled}
                          onClick={() => handleSelectVersion(ver)}
                          className={`py-1.5 px-3 rounded-xl font-semibold text-[11.5px] transition-all border ${
                            isSel
                              ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                              : 'bg-slate-50/80 text-slate-700 border-slate-200/80 hover:bg-slate-100 active:scale-95'
                          } ${isPreFilled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {ver}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic py-1">Không có phiên bản phụ.</p>
                  )}
                </div>
              </div>
            )}

            {/* 3. Chọn Màu ngoại thất */}
            {formData.phien_ban && (
              <div className="bg-white rounded-2xl border border-slate-150 p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-500">
                    3. Ngoại Thất <span className="text-rose-500">*</span>
                  </label>
                  {formData.ngoai_that && (
                    <span className="text-[11px] font-bold text-slate-800">
                      {formData.ngoai_that}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableExteriors.map((col) => {
                    const isSel = formData.ngoai_that === col;
                    const hex = getExteriorSwatchColor(col);
                    return (
                      <button
                        key={col}
                        type="button"
                        disabled={isPreFilled}
                        onClick={() => setFormData((prev) => ({ ...prev, ngoai_that: col }))}
                        className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all ${
                          isSel
                            ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                            : 'bg-slate-50/80 text-slate-800 border-slate-200/80 hover:bg-slate-100 active:scale-95'
                        } ${isPreFilled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white ring-1 ring-slate-300 flex-shrink-0 shadow-2xs"
                          style={{ backgroundColor: hex }}
                        />
                        <span className={`text-[11px] font-semibold truncate ${isSel ? 'text-white' : 'text-slate-800'}`}>
                          {col}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Chọn Màu nội thất */}
            {formData.ngoai_that && (
              <div className="bg-white rounded-2xl border border-slate-150 p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-500">
                    4. Nội Thất <span className="text-rose-500">*</span>
                  </label>
                  {formData.noi_that && (
                    <span className="text-[11px] font-bold text-slate-800">
                      {formData.noi_that}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableInteriors.map((col) => {
                    const isSel = formData.noi_that === col;
                    const hex = col.toLowerCase().includes('nâu') || col.toLowerCase().includes('brown')
                      ? '#78350f'
                      : col.toLowerCase().includes('be') || col.toLowerCase().includes('beige')
                      ? '#d6d3d1'
                      : '#1f2937';
                    return (
                      <button
                        key={col}
                        type="button"
                        disabled={isPreFilled}
                        onClick={() => setFormData((prev) => ({ ...prev, noi_that: col }))}
                        className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all ${
                          isSel
                            ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                            : 'bg-slate-50/80 text-slate-800 border-slate-200/80 hover:bg-slate-100 active:scale-95'
                        } ${isPreFilled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white ring-1 ring-slate-300 flex-shrink-0 shadow-2xs"
                          style={{ backgroundColor: hex }}
                        />
                        <span className={`text-[11px] font-semibold truncate ${isSel ? 'text-white' : 'text-slate-800'}`}>
                          {col}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* BƯỚC 2: THÔNG TIN HỢP ĐỒNG • KHÁCH HÀNG • UNC (CHUẨN iOS GROUPED) */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Tóm tắt xe đã chọn chuẩn Apple Card */}
            <div className="bg-white rounded-2xl p-3 border border-slate-150 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 p-1">
                  {previewCarImg ? (
                    <img src={previewCarImg} alt="" className="max-h-full max-w-full object-contain filter drop-shadow-xs" />
                  ) : (
                    <Car size={18} className="text-slate-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-slate-900 truncate">
                    {formData.dong_xe} {formData.phien_ban}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
                      style={{ backgroundColor: getExteriorSwatchColor(formData.ngoai_that) }}
                    />
                    <span className="truncate">{formData.ngoai_that || 'Màu tiêu chuẩn'}</span>
                    {formData.vin && (
                      <span className="font-mono text-[9.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/70 ml-1">
                        VIN: {formData.vin}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!isPreFilled && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[11.5px] font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg active:bg-blue-50 transition-colors"
                >
                  Đổi
                </button>
              )}
            </div>

            {/* Apple Inset Grouped Card: Thông tin khách hàng & DMS */}
            <div className="bg-white rounded-2xl border border-slate-150 p-3.5 space-y-3 shadow-2xs">
              {/* Tên khách hàng */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Tên Khách Hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="NGUYỄN VĂN A"
                  value={formData.ten_khach_hang}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ten_khach_hang: e.target.value.toUpperCase(),
                    }))
                  }
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[12px] font-semibold text-slate-900 placeholder:text-slate-400 uppercase focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>

              {/* Số đơn hàng DMS */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Số Đơn Hàng DMS <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="N31913-VSO-26-04-0001"
                  value={formData.so_don_hang}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      so_don_hang: e.target.value.toUpperCase(),
                    }))
                  }
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[12px] font-mono font-semibold text-slate-900 placeholder:text-slate-400 uppercase focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
                />
                <p className="text-[9.5px] text-slate-400 mt-1">Định dạng chuẩn: Nxxxxx-VSO-xx-xx-xxxx</p>
              </div>

              {/* Mã HĐ Cyber */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-500 block">
                    Mã HĐ Cyber <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenBacklogSheet}
                    className="text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                  >
                    Chọn Cọc tồn Cyber
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="HDMB/26/..."
                  value={formData.ma_hd_cyber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ma_hd_cyber: e.target.value.toUpperCase(),
                    }))
                  }
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[12px] font-mono font-semibold text-slate-900 placeholder:text-slate-400 uppercase focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>

              {/* Chính sách bán hàng */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-500 block">
                    Chính Sách Bán Hàng <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPolicyModalOpen(true)}
                    className="text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                  >
                    Chọn danh mục
                  </button>
                </div>
                <div
                  onClick={() => setIsPolicyModalOpen(true)}
                  className="w-full min-h-9 px-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-800 flex items-center justify-between cursor-pointer active:bg-slate-100 transition-colors"
                >
                  <span className={formData.chinh_sach ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                    {formData.chinh_sach || 'Chạm để chọn chính sách bán hàng...'}
                  </span>
                  <ArrowRight size={14} className="text-slate-400 flex-shrink-0" />
                </div>
              </div>

              {/* Ngày đặt cọc & Ngày cần xe */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-500 block">
                      Ngày Cọc <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[9px] font-medium text-slate-400">
                      Từ UNC
                    </span>
                  </div>

                  {/* KHÓA CỨNG: TUYỆT ĐỐI KHÔNG ĐIỀN TAY, CHỈ GHI NHẬN TỰ ĐỘNG TỪ ẢNH UNC */}
                  <div
                    className={`w-full h-9 px-2.5 rounded-xl border flex items-center transition-all select-none ${
                      formData.ngay_coc
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : isProcessingOcr
                        ? 'bg-blue-50/60 border-blue-200 text-blue-800 animate-pulse'
                        : 'bg-slate-50/80 border-slate-200 text-slate-400'
                    }`}
                  >
                    {isProcessingOcr ? (
                      <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-blue-700">
                        <Loader2 size={13} className="animate-spin text-blue-600 shrink-0" />
                        <span className="truncate">{ocrStatus || 'Đang quét UNC...'}</span>
                      </div>
                    ) : formData.ngay_coc ? (
                      <div className="flex items-center gap-1.5">
                        <Check size={14} className="text-emerald-600 stroke-[3] shrink-0" />
                        <span className="text-[12px] font-mono font-bold text-emerald-800 tracking-tight">
                          {formatDisplayDate(formData.ngay_coc)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 italic">
                        <Lock size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">Chờ ảnh UNC</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 block">
                    Ngày Cần Xe
                  </label>
                  <input
                    type="date"
                    value={formData.thoi_gian_can_xe}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, thoi_gian_can_xe: e.target.value }))
                    }
                    className="w-full h-9 px-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-[12px] font-semibold text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-colors"
                  />
                </div>
              </div>

              {/* Đính kèm ảnh UNC / Phiếu cọc */}
              <div className="space-y-1 pt-0.5">
                <label className="text-[11px] font-semibold text-slate-500 block">
                  Ảnh UNC / Chứng Từ Cọc <span className="text-rose-500">*</span>
                </label>
                {uncFile ? (
                  <div className="w-full h-12 px-2.5 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/90 rounded-xl flex items-center justify-between transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0 shadow-2xs">
                        {uncPreview ? (
                          <img
                            src={uncPreview}
                            alt="UNC"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText size={14} className="text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[12px] font-semibold text-slate-800 truncate block">
                          {uncFile.name || 'Ảnh chứng từ UNC cọc'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>Đã quét xong ngày cọc</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUncFile(null);
                        setUncPreview(null);
                        setFormData((prev) => ({ ...prev, ngay_coc: '' }));
                        setOcrStatus('');
                        showToast('Đã xóa UNC', 'Ngày cọc đã được xóa theo ảnh UNC.', 'info', 2000);
                      }}
                      className="w-6 h-6 rounded-full bg-slate-200/70 hover:bg-rose-100 hover:text-rose-600 text-slate-400 flex items-center justify-center active:scale-90 transition-all shrink-0 ml-2 cursor-pointer"
                      title="Gỡ ảnh UNC"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-11 px-3 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-6 h-6 rounded-lg bg-slate-200/70 text-slate-500 flex items-center justify-center shrink-0">
                        <UploadCloud size={14} />
                      </div>
                      <span className="text-[12px] font-semibold text-slate-700">Chụp / Tải ảnh UNC</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                      JPG, PNG
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 🌟 3. APPLE FLOATING BOTTOM ACTION BAR (ĐỒNG BỘ VỚI CÁC SHEET KHÁC) */}
      <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-150 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 shadow-[0_-8px_25px_rgba(0,0,0,0.06)]">
        {step === 1 ? (
          <button
            type="button"
            onClick={handleNextToStep2}
            className="w-full h-10 rounded-xl bg-slate-800 active:bg-slate-900 text-white font-semibold text-[12px] tracking-tight flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-xs"
          >
            <span>Tiếp tục</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-24 h-10 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-600 font-medium text-[12px] tracking-tight flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
            >
              Quay lại
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitOrder}
              className="flex-1 h-10 rounded-xl bg-slate-800 active:bg-slate-900 disabled:opacity-50 text-white font-semibold text-[12px] tracking-tight flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Đang gửi đơn...</span>
                </>
              ) : (
                <>
                  <Check size={14} strokeWidth={2.4} />
                  <span>Tạo Đơn Hàng</span>
                </>
              )}
            </button>
          </div>
        )}
      </footer>

      {/* 📄 MODAL CHỌN CHÍNH SÁCH BÁN HÀNG */}
      {isPolicyModalOpen && (
        <SelectPolicyModal
          isOpen={isPolicyModalOpen}
          onClose={() => setIsPolicyModalOpen(false)}
          onSelect={(pol) => setFormData((prev) => ({ ...prev, chinh_sach: pol }))}
          currentPolicy={formData.chinh_sach}
          carModel={formData.dong_xe}
          embeddedMobile
        />
      )}

      {/* 📋 BOTTOM SHEET CHỌN HỢP ĐỒNG CỌC TỒN CYBER */}
      {isBacklogSheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
          onClick={() => setIsBacklogSheetOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[80vh] p-4 space-y-3 overflow-hidden"
          >
            <div className="pt-1 pb-0.5 flex justify-center">
              <div className="w-8 h-1 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-150 px-1">
              <div>
                <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight">Chọn Hợp Đồng Cọc Tồn</h3>
                <p className="text-[11px] text-slate-400">Danh sách hợp đồng cọc của bạn trên Cyber</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBacklogSheetOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Ô tìm kiếm cọc tồn */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã HĐ, tên khách, SĐT..."
                value={backlogSearch}
                onChange={(e) => setBacklogSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white"
              />
            </div>

            {/* Danh sách hợp đồng */}
            <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar min-h-[200px]">
              {isLoadingBacklog ? (
                <div className="py-12 flex flex-col items-center justify-center text-xs text-slate-400">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                  <span>Đang tải cọc tồn Cyber...</span>
                </div>
              ) : filteredBacklog.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Không tìm thấy hợp đồng cọc tồn nào.
                </div>
              ) : (
                filteredBacklog.map((item, idx) => (
                  <div
                    key={item.id || item.so_hop_dong || idx}
                    onClick={() => handleSelectBacklogContract(item)}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-blue-50/80 active:bg-blue-100/80 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-blue-700">
                        {item.so_hop_dong || item.so_don_hang}
                      </span>
                      <span className="font-bold text-xs text-emerald-700">
                        {Number(item.tien_coc || 0).toLocaleString('vi-VN')} ₫
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1">
                      <span className="font-semibold uppercase text-slate-800">
                        {item.khach_hang}
                      </span>
                      <span className="font-mono text-slate-500">{item.so_dien_thoai}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileCreateOrderView;
