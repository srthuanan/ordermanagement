import { useState } from 'react';
import * as apiService from '../services/apiService';
import { NewOrderInput, Order, UpdateOrderInput } from '../types';

export function useOrderOperations({
  session,
  currentUsername,
  currentFullName,
  canOverrideHeldVehicle,
  loadWorkspace,
  setSyncState,
  setSyncMessage,
  updateInventoryItem
}: {
  session: any;
  currentUsername: string;
  currentFullName: string;
  canOverrideHeldVehicle: boolean;
  loadWorkspace: (options?: { showLoading?: boolean }) => Promise<boolean>;
  setSyncState: any;
  setSyncMessage: any;
  updateInventoryItem?: (vin: string, patch: any) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  
  const [isHolding, setIsHolding] = useState(false);
  const [isHoldingVin, setIsHoldingVin] = useState('');
  const [holdError, setHoldError] = useState('');
  const [isReleasingVin, setIsReleasingVin] = useState('');
  const [isQueueingVin, setIsQueueingVin] = useState('');
  const [isImportingStock, setIsImportingStock] = useState(false);
  const [importStockError, setImportStockError] = useState('');
  const [isUpdatingVehicleLocation, setIsUpdatingVehicleLocation] = useState('');
  
  const [isPairing, setIsPairing] = useState(false);
  const [pairError, setPairError] = useState('');
  const [isUnpairingOrderId, setIsUnpairingOrderId] = useState('');

  async function handleCreateOrder(input: NewOrderInput) {
    const orderId = input.orderId.trim().toUpperCase();
    const customer = input.customer.trim();

    if (!orderId || !customer || !input.line || !input.version || !input.exterior || !input.depositDate || !input.policy?.length) {
      setCreateError('Vui lòng nhập đầy đủ thông tin bắt buộc.');
      return false;
    }

    setIsCreating(true);
    setCreateError('');

    try {
      if (session) {
        // Insert order row. Số điện thoại không bắt buộc trong luồng tạo đơn này.
        const orderRes = await apiService.createOrder({
          so_don_hang: orderId,
          ten_tu_van_ban_hang: input.staff,
          ten_khach_hang: customer,
          dong_xe: input.line,
          phien_ban: input.version,
          ngoai_that: input.exterior,
          noi_that: input.interior,
          ngay_coc: input.depositDate || null,
          thoi_gian_can_xe: input.needDate || null,
          thoi_gian_nhap: new Date().toISOString(),
          ket_qua: 'Chưa ghép',
          chinh_sach: input.policy.join('; '),
          so_tien_coc: input.depositAmount || null,
          so_tien_khach_da_dong: input.soTienKhachDaDong ?? input.depositAmount ?? null,
          ngay_ky_hop_dong: input.ngayKyHopDong || null,
          dia_chi_xhd: input.invoiceAddress || null,
          dia_chi: input.invoiceAddress || null,
          ma_hop_dong: input.contractCode || null,
          so_hop_dong: input.contractCode || null,
          tm_vay: input.paymentMethod || null,
          hinh_thuc_tt: input.paymentMethod || null,
          nguon_khach: input.nguonKhach?.trim() || null,
          mua_bao_hiem: input.muaBaoHiem ?? null,
          dang_ky_xe: input.dangKyXe ?? null,
          xe_xang_vin: input.xeXangVin?.trim() || null,
          xe_xang_hang: input.xeXangHang?.trim() || null,
          xe_xang_model: input.xeXangModel?.trim() || null,
          gia_cong_bo: input.giaCongBo ?? null,
          ghi_chu: input.ghiChu?.trim() || null
        });

        if (orderRes.error) {
          setCreateError(orderRes.error.code === '23505' ? `Số đơn hàng ${orderId} đã tồn tại.` : `Lỗi tạo đơn hàng trên Supabase: ${orderRes.error.message}`);
          setIsCreating(false);
          return false;
        }

        if (input.pairedVin) {
          const pairRes = await apiService.pairVehicle(orderId, input.pairedVin);
          if (pairRes.error) {
            setCreateError(`Đã tạo đơn ${orderId} nhưng chưa ghép được VIN ${input.pairedVin}: ${pairRes.error.message}`);
            setIsCreating(false);
            await loadWorkspace({ showLoading: false });
            return false;
          }
        } else {
          const autoMatch = await apiService.findAutoPairVehicle(
            {
              line: input.line,
              version: input.version,
              exterior: input.exterior,
              interior: input.interior
            },
            currentUsername,
            canOverrideHeldVehicle
          );

          if (!autoMatch.error && autoMatch.data?.vin) {
            const pairRes = await apiService.pairVehicle(orderId, autoMatch.data.vin);
            if (pairRes.error) {
              setCreateError(`Đã tạo đơn ${orderId} nhưng chưa tự ghép được VIN ${autoMatch.data.vin}: ${pairRes.error.message}`);
              setIsCreating(false);
              await loadWorkspace({ showLoading: false });
              return false;
            }
          }
        }

        await loadWorkspace({ showLoading: false });
      }
      setIsCreating(false);
      return true;
    } catch (err: any) {
      setCreateError(err.message || 'Lỗi không xác định.');
      setIsCreating(false);
      return false;
    }
  }

  async function handleHoldVehicle(vin: string) {
    setIsHolding(true);
    setIsHoldingVin(vin);
    setHoldError('');
    try {
      const { data, error } = await apiService.holdVehicle(vin, currentUsername, currentFullName);
      
      if (error) {
        setHoldError(error.message);
        setSyncState('error');
        setSyncMessage(`Lỗi giữ xe ${vin}: ${error.message}`);
        return false;
      }
      if (data && data.status === 'ERROR') {
        const msg = String(data.message || 'Không thể giữ xe.');
        setHoldError(msg);
        setSyncState('error');
        setSyncMessage(`Lỗi giữ xe ${vin}: ${msg}`);
        return false;
      }
      
      // Không hiển thị Toast thông báo thành công (theo yêu cầu user)
      // Cập nhật optimistic: chỉ đổi trạng thái của 1 xe, không reload toàn bộ
      if (updateInventoryItem) {
        updateInventoryItem(vin, {
          status: 'Đang giữ',
          holder: currentFullName,
          holderUsername: currentUsername,
        });
      } else {
        await loadWorkspace({ showLoading: false });
      }
      return true;
    } catch (err: any) {
      console.error("CATCH ERROR IN handleHoldVehicle:", err);
      const errMsg = err.message || 'Lỗi kết nối';
      setHoldError(errMsg);
      setSyncState('error');
      setSyncMessage(`Lỗi hệ thống khi giữ xe ${vin}: ${errMsg}`);
      return false;
    } finally {
      setIsHolding(false);
      setIsHoldingVin('');
    }
  }

  async function handleReleaseVehicle(vin: string) {
    setIsReleasingVin(vin);
    try {
      const { data, error } = await apiService.releaseVehicle(vin, 'released');
      if (error) {
        setSyncState('error');
        setSyncMessage(`Lỗi nhả xe ${vin}: ${error.message}`);
      } else if (data && data.status === 'ERROR') {
        setSyncState('error');
        setSyncMessage(`Lỗi nhả xe ${vin}: ${String(data.message || 'Không thể bỏ giữ xe.')}`);
      } else {
        // Cập nhật optimistic: chỉ đổi trạng thái của 1 xe, không reload toàn bộ
        if (updateInventoryItem) {
          updateInventoryItem(vin, {
            status: 'Chưa ghép',
            holder: '',
            holderUsername: '',
            holdExpiry: '',
            isExtensionRequested: false,
            extensionCount: 0,
          });
        } else {
          await loadWorkspace({ showLoading: false });
        }
      }
    } finally {
      setIsReleasingVin('');
    }
  }

  async function handleJoinQueue(vin: string) {
    setIsQueueingVin(vin);
    try {
      const { data, error } = await apiService.joinHoldQueue(vin, currentUsername, currentFullName);
      if (error) {
        setSyncState('error');
        setSyncMessage(`Lỗi đăng ký chờ xe ${vin}: ${error.message}`);
        return false;
      }
      if (data && data.status === 'ERROR') {
        setSyncState('error');
        setSyncMessage(String(data.message || 'Không thể đăng ký chờ xe.'));
        return false;
      }

      await loadWorkspace({ showLoading: false });
      return true;
    } finally {
      setIsQueueingVin('');
    }
  }

  async function handleLeaveQueue(vin: string) {
    setIsQueueingVin(vin);
    try {
      const { data, error } = await apiService.leaveHoldQueue(vin, currentUsername);
      if (error) {
        setSyncState('error');
        setSyncMessage(`Lỗi hủy chờ xe ${vin}: ${error.message}`);
        return false;
      }
      if (data && data.status === 'ERROR') {
        setSyncState('error');
        setSyncMessage(String(data.message || 'Không thể hủy chờ xe.'));
        return false;
      }

      await loadWorkspace({ showLoading: false });
      return true;
    } finally {
      setIsQueueingVin('');
    }
  }

  async function handleImportStock(csvText: string) {
    setIsImportingStock(true);
    setImportStockError('');

    try {
      const lines = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        setImportStockError('Dữ liệu import đang trống.');
        setIsImportingStock(false);
        return false;
      }

      const looksLikeHeader = lines[0].toLowerCase().includes('vin');
      const dataLines = looksLikeHeader ? lines.slice(1) : lines;

      if (dataLines.length === 0) {
        setImportStockError('Chưa có dòng dữ liệu hợp lệ sau dòng tiêu đề.');
        setIsImportingStock(false);
        return false;
      }

      const parsed = dataLines.map((line, idx) => {
        const cols = line.split(',').map((x) => x.trim());
        if (cols.length < 1) {
          throw new Error(`Dòng ${idx + 1}: cần tối thiểu 1 cột VIN.`);
        }
        const [vin, dong_xe, phien_ban, ngoai_that, noi_that, ma_dms] = cols;
        if (!vin) {
          throw new Error(`Dòng ${idx + 1}: VIN đang trống.`);
        }

        return {
          vin: vin.trim().toUpperCase(),
          dong_xe: dong_xe || '',
          phien_ban,
          ngoai_that,
          noi_that,
          vi_tri: null,
          latitude: null,
          longitude: null,
          ngay_nhap: null,
          ma_dms: ma_dms || null
        };
      });

      const vinList = parsed.map((item) => item.vin);
      
      // Kiểm tra VIN đã tồn tại trong kho
      const { data: existingVehicles, error: checkError } = await apiService.checkExistingVins(vinList);
      if (checkError) {
        setImportStockError(`Không thể kiểm tra dữ liệu kho: ${checkError.message}`);
        setIsImportingStock(false);
        return false;
      }

      const existingVinSet = new Set(existingVehicles?.map((v: { vin: string }) => v.vin) || []);
      
      const validVehicles = [];
      const duplicateVins = new Set<string>();
      const seenInFile = new Set<string>();

      for (const item of parsed) {
        if (existingVinSet.has(item.vin)) {
          duplicateVins.add(item.vin);
        } else if (seenInFile.has(item.vin)) {
          duplicateVins.add(item.vin);
        } else {
          validVehicles.push(item);
          seenInFile.add(item.vin);
        }
      }

      if (validVehicles.length === 0) {
        setImportStockError(`Tất cả ${parsed.length} xe trong dữ liệu đều đã tồn tại trong kho hoặc bị trùng lặp. Không có xe mới nào được nhập.`);
        setIsImportingStock(false);
        return false;
      }
      // ------------------------------------------

      const { error } = await apiService.bulkUpsertVehicles(validVehicles);
      if (error) {
        setImportStockError(`Import thất bại: ${error.message}`);
        setIsImportingStock(false);
        return false;
      }

      await loadWorkspace({ showLoading: false });
      setIsImportingStock(false);

      if (duplicateVins.size > 0) {
        alert(`Đã nhập thành công ${validVehicles.length} xe mới.\n\nBỏ qua ${duplicateVins.size} xe bị trùng (đã tồn tại): ${Array.from(duplicateVins).join(', ')}`);
      }

      return true;
    } catch (err: any) {
      setImportStockError(err.message || 'Import kho thất bại');
      setIsImportingStock(false);
      return false;
    }
  }

  async function handleUpdateVehicleLocation(
    vin: string,
    location: {
      vi_tri: string;
      latitude: number | null;
      longitude: number | null;
    }
  ) {
    setIsUpdatingVehicleLocation(vin);
    try {
      const { error } = await apiService.updateVehicleLocation(vin, location);
      if (error) {
        setSyncState('error');
        setSyncMessage(`Không thể cập nhật GPS cho xe ${vin}: ${error.message}`);
        return false;
      }

      await loadWorkspace({ showLoading: false });
      return true;
    } catch (err: any) {
      setSyncState('error');
      setSyncMessage(`Không thể cập nhật GPS cho xe ${vin}: ${err.message || 'Lỗi không xác định'}`);
      return false;
    } finally {
      setIsUpdatingVehicleLocation('');
    }
  }

  async function handlePairVehicle(orderId: string, vin: string) {
    setIsPairing(true);
    setPairError('');
    try {
      const { error } = await apiService.pairVehicle(orderId, vin);
      if (error) {
        setPairError(error.message);
        setIsPairing(false);
        return false;
      }
      await loadWorkspace({ showLoading: false });
      setIsPairing(false);
      return true;
    } catch (err: any) {
      setPairError(err.message);
      setIsPairing(false);
      return false;
    }
  }

  async function handleUnpairVehicle(orderId: string) {
    if (!window.confirm(`Hủy ghép cho đơn ${orderId}?`)) return false;
    setIsUnpairingOrderId(orderId);
    try {
      const { error } = await apiService.unpairVehicle(orderId);
      if (error) {
        setSyncState('error');
        setSyncMessage(`Không thể hủy ghép ${orderId}: ${error.message}`);
        return false;
      }
      await loadWorkspace({ showLoading: false });
      return true;
    } finally {
      setIsUnpairingOrderId('');
    }
  }

  const [isCanceling, setIsCanceling] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);
  const [isUpdatingInvoice, setIsUpdatingInvoice] = useState(false);

  async function handleCancelOrder(
    orderId: string,
    note: string,
    unmatchType: string = 'Hủy luôn đơn hàng (Hủy đơn)',
    needDate?: string
  ): Promise<{ success: boolean; error?: string }> {
    setIsCanceling(true);
    try {
      const { error } = await apiService.cancelOrder(orderId, note, unmatchType, needDate);
      if (error) {
        setSyncState('error');
        setSyncMessage(`Không thể hủy đơn ${orderId}: ${error.message}`);
        setIsCanceling(false);
        return { success: false, error: error.message };
      }
      await loadWorkspace({ showLoading: false });
      setIsCanceling(false);
      return { success: true };
    } catch (err: any) {
      setIsCanceling(false);
      return { success: false, error: err.message };
    }
  }

  async function handleUpdateOrder(input: UpdateOrderInput) {
    setIsUpdatingOrder(true);
    try {
      const { data, error } = await apiService.updateOrderDetails(input, currentUsername, canOverrideHeldVehicle);
      if (error) {
        setSyncState('error');
        setSyncMessage(`Không thể cập nhật đơn ${input.orderId}: ${error.message}`);
        setIsUpdatingOrder(false);
        return false;
      }

      await loadWorkspace({ showLoading: false });
      if (data?.autoMatched && data.vin) {
        setSyncState('live');
        setSyncMessage(`Đã cập nhật đơn ${input.orderId} và tự ghép VIN ${data.vin}.`);
      }
      setIsUpdatingOrder(false);
      return true;
    } catch {
      setIsUpdatingOrder(false);
      return false;
    }
  }

  async function handleUpdatePolicy(orderId: string, policy: string) {
    setIsUpdatingPolicy(true);
    try {
      const { error } = await apiService.updateOrderPolicy(orderId, policy);
      if (error) {
        setSyncState('error');
        setSyncMessage(`Không thể cập nhật chính sách cho ${orderId}: ${error.message}`);
        setIsUpdatingPolicy(false);
        return false;
      }

      await loadWorkspace({ showLoading: false });
      setIsUpdatingPolicy(false);
      return true;
    } catch {
      setIsUpdatingPolicy(false);
      return false;
    }
  }

  const [isRequestingInvoice, setIsRequestingInvoice] = useState(false);
  const [isFinalizingInvoice, setIsFinalizingInvoice] = useState(false);
  const [isSupplementingInvoice, setIsSupplementingInvoice] = useState(false);
  const [isAdvancingInvoice, setIsAdvancingInvoice] = useState(false);

  async function handleRequestInvoice(input: {
    order: Order;
    hsXhdFile: File;
    cdxFile: File | null;
    transactionImages: File[];
    policy: string;
    soTienKhachDaDong?: number | null;
    aiNote?: string;
    xeXangVin?: string;
    xeXangHang?: string;
    xeXangModel?: string;
    nguonKhach?: string;
    ngayKyHopDong?: string;
    soHopDong?: string;
    hinhThucTT?: string;
    muaBaoHiem?: boolean;
    dangKyXe?: boolean;
    giaCongBo?: string | number | null;
    ghiChu?: string;
    diaChi?: string;
  }) {
    setIsRequestingInvoice(true);
    try {
    const { error } = await apiService.requestInvoiceDonhang({
        ...input,
        requesterName: currentFullName,
        requesterUsername: currentUsername
      });
      if (error) {
        setSyncState('error');
        setSyncMessage(`Lỗi tạo yêu cầu hóa đơn cho đơn ${input.order.id}: ${error.message}`);
        setIsRequestingInvoice(false);
        return false;
      }
      await loadWorkspace({ showLoading: false });
      setIsRequestingInvoice(false);
      return true;
    } catch (err) {
      setIsRequestingInvoice(false);
      return false;
    }
  }

  async function handleSupplementInvoice(
    orderId: string,
    contractFile: File | null,
    proposalFile: File | null,
    aiNote: string
  ) {
    setIsSupplementingInvoice(true);
    try {
      const { error } = await apiService.uploadSupplementaryInvoiceFiles(
        orderId,
        contractFile,
        proposalFile,
        aiNote,
        currentFullName,
        currentUsername
      );
      if (error) {
        setSyncState('error');
        setSyncMessage(`Lỗi bổ sung hồ sơ hóa đơn cho đơn ${orderId}: ${error.message}`);
        setIsSupplementingInvoice(false);
        return false;
      }
      await loadWorkspace({ showLoading: false });
      setIsSupplementingInvoice(false);
      return true;
    } catch {
      setIsSupplementingInvoice(false);
      return false;
    }
  }

  async function handleFinalizeInvoice(requestId: string, linkHoaDon: string, linkHopDong: string) {
    setIsFinalizingInvoice(true);
    try {
      const { error } = await apiService.finalizeInvoiceDonhang(requestId, linkHoaDon, linkHopDong);
      if (error) {
        setSyncState('error');
        setSyncMessage(`Lỗi phê duyệt hóa đơn: ${error.message}`);
        setIsFinalizingInvoice(false);
        return false;
      }
      await loadWorkspace({ showLoading: false });
      setIsFinalizingInvoice(false);
      return true;
    } catch (err) {
      setIsFinalizingInvoice(false);
      return false;
    }
  }

  async function handleApproveInvoiceRequest(requestId: string) {
    setIsAdvancingInvoice(true);
    try {
      const { error, data } = await apiService.approveInvoiceRequest(requestId);
      if (error || data?.status === 'ERROR') {
        setSyncState('error');
        setSyncMessage(`Lỗi phê duyệt hồ sơ: ${error?.message || data?.message}`);
        return false;
      }
      await loadWorkspace({ showLoading: false });
      return true;
    } finally {
      setIsAdvancingInvoice(false);
    }
  }

  async function handleRequestInvoiceSupplement(requestId: string, reason: string) {
    setIsAdvancingInvoice(true);
    try {
      const { error, data } = await apiService.requestInvoiceSupplement(requestId, reason);
      if (error || data?.status === 'ERROR') {
        setSyncState('error');
        setSyncMessage(`Lỗi yêu cầu bổ sung hồ sơ: ${error?.message || data?.message}`);
        return false;
      }
      await loadWorkspace({ showLoading: false });
      return true;
    } finally {
      setIsAdvancingInvoice(false);
    }
  }

  async function handleMarkInvoicePendingSignature(requestId: string, invoiceDate?: string) {
    setIsAdvancingInvoice(true);
    try {
      const { error, data } = await apiService.markInvoicePendingSignature(requestId, invoiceDate);
      if (error || data?.status === 'ERROR') {
        setSyncState('error');
        setSyncMessage(`Lỗi chuyển chờ ký hóa đơn: ${error?.message || data?.message}`);
        return false;
      }
      await loadWorkspace({ showLoading: false });
      return true;
    } finally {
      setIsAdvancingInvoice(false);
    }
  }

  async function handleUploadIssuedInvoice(requestId: string, orderId: string, customerName: string, file: File) {
    setIsFinalizingInvoice(true);
    try {
      const { error, data } = await apiService.uploadIssuedInvoice(requestId, orderId, customerName, file);
      if (error || data?.status === 'ERROR') {
        setSyncState('error');
        setSyncMessage(`Lỗi tải hóa đơn đã xuất: ${error?.message || data?.message}`);
        return false;
      }
      await loadWorkspace({ showLoading: false });
      return true;
    } finally {
      setIsFinalizingInvoice(false);
    }
  }

  return {
    isCreating,
    createError,
    setCreateError,
    handleCreateOrder,
    isHolding,
    isHoldingVin,
    holdError,
    setHoldError,
    handleHoldVehicle,
    isReleasingVin,
    handleReleaseVehicle,
    isQueueingVin,
    handleJoinQueue,
    handleLeaveQueue,
    isImportingStock,
    importStockError,
    setImportStockError,
    handleImportStock,
    isUpdatingVehicleLocation,
    handleUpdateVehicleLocation,
    isPairing,
    pairError,
    setPairError,
    handlePairVehicle,
    isUnpairingOrderId,
    handleUnpairVehicle,
    isCanceling,
    handleCancelOrder,
    isUpdatingOrder,
    handleUpdateOrder,
    isUpdatingPolicy,
    handleUpdatePolicy,
    isRequestingInvoice,
    handleRequestInvoice,
    isSupplementingInvoice,
    handleSupplementInvoice,
    isAdvancingInvoice,
    handleApproveInvoiceRequest,
    handleRequestInvoiceSupplement,
    handleMarkInvoicePendingSignature,
    isFinalizingInvoice,
    handleFinalizeInvoice,
    handleUploadIssuedInvoice
  };
}
