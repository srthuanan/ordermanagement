import { supabase } from './supabaseClient';
import {
  CustomerRow,
  DonhangRow,
  KhoxeRow,
  ProfileRow,
  Order,
  InventoryItem,
  CarActivityRow,
  SalesPolicyRow,
  VehicleLocationRow,
  UpdateOrderInput
} from '../types';
import { defaultSalesPolicies } from '../constants';

export function formatLocalDateTime(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function mapOrderRow(row: DonhangRow, customerMap: Map<string, CustomerRow>): Order {
  const customer = customerMap.get(row.ten_khach_hang.toLowerCase());
  const normalized = row.ket_qua.trim().toLowerCase();
  const status: Order['status'] = normalized.includes('hủy')
    ? 'Đã hủy'
    : normalized.includes('xuất hóa đơn')
      ? 'Đã xuất hóa đơn'
      : normalized.includes('chờ phê duyệt')
        ? 'Chờ phê duyệt'
        : normalized.includes('đã phê duyệt')
          ? 'Đã phê duyệt'
          : normalized.includes('yêu cầu bổ sung')
            ? 'Yêu cầu bổ sung'
            : normalized.includes('đã bổ sung')
              ? 'Đã bổ sung'
              : normalized.includes('chờ ký hóa đơn')
                ? 'Chờ ký hóa đơn'
                : normalized.includes('đã ghép')
                  ? 'Đã ghép'
                  : 'Chưa ghép';

  return {
    id: row.so_don_hang,
    customer: row.ten_khach_hang,
    phone: customer?.phone ?? 'Chưa có SĐT',
    area: customer?.area ?? 'Chưa có khu vực',
    line: row.dong_xe,
    version: row.phien_ban || row.dong_xe,
    exterior: row.ngoai_that || 'Chưa có màu',
    interior: row.noi_that || 'Chưa có nội thất',
    staff: row.ten_tu_van_ban_hang,
    status,
    vin: row.vin ?? '',
    createdAt: formatLocalDateTime(new Date(row.thoi_gian_nhap)),
    depositDate: row.ngay_coc ? new Intl.DateTimeFormat('vi-VN').format(new Date(row.ngay_coc)) : 'Chưa có',
    needDate: row.thoi_gian_can_xe ? new Intl.DateTimeFormat('vi-VN').format(new Date(row.thoi_gian_can_xe)) : 'Chưa có',
    needDateIso: row.thoi_gian_can_xe ?? null,
    pairedAt: row.thoi_gian_ghep ? formatLocalDateTime(new Date(row.thoi_gian_ghep)) : 'Chưa ghép',
    policy: row.chinh_sach ?? '',
    cancelNote: row.ghi_chu_huy ?? '',
    engineNo: row.so_may ?? '',
    dmsCode: row.ma_dms ?? '',
    depositAmount: row.so_tien_coc ?? null,
    invoiceAddress: row.dia_chi_xhd ?? '',
    contractCode: row.ma_hop_dong ?? '',
    paymentMethod: row.tm_vay ?? ''
  };
}

export function mapKhoxeRows(rows: KhoxeRow[]): InventoryItem[] {
  return rows.map((row) => ({
    vin: row.vin,
    line: row.dong_xe,
    version: row.phien_ban || row.dong_xe,
    exterior: row.ngoai_that || 'Chưa có màu',
    interior: row.noi_that || 'Chưa có nội thất',
    status: row.trang_thai as InventoryItem['status'],
    holder: row.nguoi_giu_xe ?? '',
    holderUsername: row.username_giu_xe ?? '',
    holdExpiry: row.thoi_gian_het_han_giu ?? '',
    location: row.vi_tri ?? '',
    dmsCode: row.ma_dms ?? '',
    engineNo: row.so_may ?? '',
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    isExtensionRequested: row.is_extension_requested || false,
    extensionReason: row.extension_reason ?? '',
    extensionEvidenceUrl: row.extension_evidence_url ?? '',
    extensionCount: row.extension_count || 0
  }));
}

type VehicleLocationDbRow = {
  vin: string;
  vi_tri: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
};

export function mapVehicleLocationRows(rows: VehicleLocationDbRow[]): VehicleLocationRow[] {
  return rows
    .map((row) => ({
      vin: row.vin,
      location: row.vi_tri ?? '',
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
    .filter((row) => row.latitude !== null && row.longitude !== null);
}

function normalizeVin(value: string) {
  return value.trim().toUpperCase();
}

type VehicleMatchInput = {
  line: string;
  version: string;
  exterior: string;
  interior: string;
};

type VehicleMatchRow = {
  vin: string;
  dong_xe: string;
  phien_ban: string | null;
  ngoai_that: string | null;
  noi_that: string | null;
  trang_thai: string;
  nguoi_giu_xe: string | null;
  username_giu_xe: string | null;
  ngay_nhap: string | null;
};

function canUseVehicleForPairRow(
  item: VehicleMatchRow,
  currentUsername: string,
  canOverrideHeldVehicle: boolean
) {
  if (item.trang_thai === 'Đã ghép') {
    return false;
  }

  if (item.trang_thai === 'Chưa ghép') {
    return true;
  }

  return canOverrideHeldVehicle || item.username_giu_xe === currentUsername;
}

async function findBestMatchingVehicle(
  config: VehicleMatchInput,
  currentUsername: string,
  canOverrideHeldVehicle: boolean
) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');

  const { data, error } = await supabase
    .from('khoxe')
    .select('vin,dong_xe,phien_ban,ngoai_that,noi_that,trang_thai,nguoi_giu_xe,username_giu_xe,ngay_nhap')
    .eq('dong_xe', config.line)
    .eq('phien_ban', config.version)
    .eq('ngoai_that', config.exterior)
    .eq('noi_that', config.interior)
    .order('ngay_nhap', { ascending: true });

  if (error) {
    return { data: null, error };
  }

  const match = (data || []).find((item: VehicleMatchRow) => canUseVehicleForPairRow(item, currentUsername, canOverrideHeldVehicle));
  return { data: match ? { vin: match.vin } : null, error: null };
}

// --- Authentication & Profiles ---
export const getProfile = async (userId: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
};

export const getProfiles = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('get_staff_directory');
};

const invokeStaffFunction = async (body: Record<string, unknown>) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!accessToken) {
    throw new Error('Phiên đăng nhập không hợp lệ.');
  }

  if (!supabaseUrl) {
    throw new Error('Thiếu cấu hình Supabase URL.');
  }

  if (!supabasePublishableKey) {
    throw new Error('Thiếu cấu hình Supabase key.');
  }

  const functionBaseUrl = new URL(supabaseUrl);
  functionBaseUrl.hostname = functionBaseUrl.hostname.replace('.supabase.co', '.functions.supabase.co');
  functionBaseUrl.pathname = '/manage-staff';
  functionBaseUrl.search = '';
  functionBaseUrl.hash = '';
  const functionUrl = functionBaseUrl.toString();
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabasePublishableKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const rawBody = await response.text();
  let parsedBody: any = null;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    const message =
      typeof parsedBody === 'object' && parsedBody?.error
        ? parsedBody.error
        : typeof parsedBody === 'string' && parsedBody.trim()
          ? parsedBody.trim()
          : `Edge Function returned ${response.status}`;
    throw new Error(message);
  }

  return { data: parsedBody, error: null };
};

export const inviteStaffMember = async (input: { email: string; fullName: string; role: ProfileRow['role'] }) => {
  return await invokeStaffFunction({
    action: 'invite',
    email: input.email,
    fullName: input.fullName,
    role: input.role
  });
};

export const resendStaffInvite = async (input: { email: string; fullName: string; role: ProfileRow['role'] }) => {
  return await invokeStaffFunction({
    action: 'resend',
    email: input.email,
    fullName: input.fullName,
    role: input.role
  });
};

export const cancelStaffInvite = async (input: { email: string; fullName: string; role: ProfileRow['role'] }) => {
  return await invokeStaffFunction({
    action: 'cancel',
    email: input.email,
    fullName: input.fullName,
    role: input.role
  });
};

// --- Queries ---
export const getCustomers = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.from('customers').select('*').limit(300);
};

export const getOrders = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase
    .from('donhang')
    .select('*')
    .order('thoi_gian_nhap', { ascending: false })
    .limit(200);
};

export const getInventory = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');

  const khoxeResult = await supabase
    .from('khoxe')
    .select('*')
    .order('ngay_nhap', { ascending: false });

  if (khoxeResult.error) {
    return khoxeResult;
  }

  return { data: (khoxeResult.data || []) as KhoxeRow[], error: null };
};

export const getVehicleLocations = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase
    .from('vehicle_locations')
    .select('*')
    .order('updated_at', { ascending: false });
};

export const expireHoldVehicles = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('expire_khoxe_holds');
};

export const getCarHoldActivities = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase
    .from('car_hold_activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
};

// --- Actions & Mutations ---
export const createCustomer = async (customer: CustomerRow) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.from('customers').upsert(customer, { onConflict: 'phone' });
};

export const createOrder = async (order: any) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.from('donhang').insert(order).select('*');
};

export const cancelOrder = async (
  orderId: string,
  notes: string,
  unmatchType: string = 'Hủy luôn đơn hàng (Hủy đơn)',
  needDate?: string
) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const { data: order, error: fetchError } = await supabase
    .from('donhang')
    .select('updated_at')
    .eq('so_don_hang', orderId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  return await supabase.rpc('cancel_order_donhang', {
    p_order_id: orderId,
    p_note: notes,
    p_unmatch_type: unmatchType,
    p_thoi_gian_can_xe: needDate || null,
    p_order_updated_at: order?.updated_at ?? null
  });
};

export const getSalesPolicies = async (): Promise<{ data: SalesPolicyRow[]; error: any }> => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');

  const { data, error } = await supabase
    .from('chinhsach')
    .select('ten_chinh_sach, dong_xe')
    .eq('trang_thai', 'Hoạt động')
    .order('ten_chinh_sach', { ascending: true });

  if (error) {
    return {
      data: defaultSalesPolicies.map((name) => ({ ten_chinh_sach: name, dong_xe: 'Tất cả' })),
      error
    };
  }

  return { data: (data || []) as SalesPolicyRow[], error: null };
};

export const updateOrderPolicy = async (orderId: string, policy: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');

  const { error: orderError } = await supabase
    .from('donhang')
    .update({
      chinh_sach: policy,
      updated_at: new Date().toISOString()
    })
    .eq('so_don_hang', orderId);

  if (orderError) return { data: null, error: orderError };

  // Đồng bộ sang yeucauxhd nếu có
  await supabase
    .from('yeucauxhd')
    .update({ chinh_sach: policy, updated_at: new Date().toISOString() })
    .eq('so_don_hang', orderId);

  return { data: { status: 'SUCCESS' }, error: null };
};

export const findAutoPairVehicle = async (
  config: VehicleMatchInput,
  currentUsername: string,
  canOverrideHeldVehicle: boolean
) => {
  return await findBestMatchingVehicle(config, currentUsername, canOverrideHeldVehicle);
};

export const updateOrderDetails = async (
  input: UpdateOrderInput,
  currentUsername: string,
  canOverrideHeldVehicle: boolean
) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');

  const { data: currentOrder, error: orderFetchError } = await supabase
    .from('donhang')
    .select('*')
    .eq('so_don_hang', input.orderId)
    .single();
  if (orderFetchError) {
    return { data: null, error: orderFetchError };
  }

  const criticalChanged =
    (currentOrder.dong_xe || '') !== input.line ||
    (currentOrder.phien_ban || '') !== input.version ||
    (currentOrder.ngoai_that || '') !== input.exterior ||
    (currentOrder.noi_that || '') !== input.interior;

  // Nếu đổi cấu hình mà đang có VIN thì nhả xe cũ trước
  if (criticalChanged && currentOrder.vin) {
    await supabase
      .from('khoxe')
      .update({
        trang_thai: 'Chưa ghép',
        nguoi_giu_xe: null,
        username_giu_xe: null,
        thoi_gian_het_han_giu: null,
        hold_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('vin', currentOrder.vin);
  }

  const updateData: Record<string, any> = {
    ten_khach_hang: input.customer,
    ten_tu_van_ban_hang: input.staff,
    dong_xe: input.line,
    phien_ban: input.version,
    ngoai_that: input.exterior,
    noi_that: input.interior,
    ngay_coc: input.depositDate || null,
    thoi_gian_can_xe: input.needDate || null,
    updated_at: new Date().toISOString(),
    so_tien_coc: input.depositAmount || null,
    dia_chi_xhd: input.invoiceAddress || null,
    ma_hop_dong: input.contractCode || null,
    tm_vay: input.paymentMethod || null
  };

  if (criticalChanged) {
    updateData.ket_qua = 'Chưa ghép';
    updateData.vin = null;
    updateData.so_may = null;
    updateData.ma_dms = null;
    updateData.thoi_gian_ghep = null;
  }

  const { error: updateError } = await supabase
    .from('donhang')
    .update(updateData)
    .eq('so_don_hang', input.orderId);
  if (updateError) {
    return { data: null, error: updateError };
  }

  // Đồng bộ thông tin cơ bản cho yeucauxhd (nếu có)
  await supabase
    .from('yeucauxhd')
    .update({
      ten_khach_hang: input.customer,
      updated_at: new Date().toISOString()
    })
    .eq('so_don_hang', input.orderId);

  // Tự ghép lại theo FIFO nếu đổi cấu hình
  let autoMatchedVin = '';
  if (criticalChanged) {
    const { data: candidateCar } = await findBestMatchingVehicle(
      {
        line: input.line,
        version: input.version,
        exterior: input.exterior,
        interior: input.interior
      },
      currentUsername,
      canOverrideHeldVehicle
    );

    if (candidateCar?.vin) {
      autoMatchedVin = candidateCar.vin;

      await supabase
        .from('donhang')
        .update({
          ket_qua: 'Đã ghép',
          vin: autoMatchedVin,
          thoi_gian_ghep: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('so_don_hang', input.orderId);

      await supabase
        .from('khoxe')
        .update({
          trang_thai: 'Đã ghép',
          nguoi_giu_xe: input.staff,
          thoi_gian_het_han_giu: 'Vô thời hạn',
          updated_at: new Date().toISOString()
        })
        .eq('vin', autoMatchedVin);

      await supabase
        .from('car_hold_activities')
        .delete()
        .eq('vin', autoMatchedVin)
        .eq('type', 'QUEUE');
    }
  }

  return {
    data: {
      status: 'SUCCESS',
      autoMatched: !!autoMatchedVin,
      vin: autoMatchedVin
    },
    error: null
  };
};

export const updateInvoiceInfo = async (
  orderId: string,
  invoiceLink: string,
  contractLink: string,
  policy: string
) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase
    .from('donhang')
    .update({
      ket_qua: 'Đã xuất hóa đơn',
      link_hoa_don_da_xuat: invoiceLink,
      link_hop_dong: contractLink,
      chinh_sach: policy,
      updated_at: new Date().toISOString()
    })
    .eq('so_don_hang', orderId);
};

// --- Safe Inventory / Pairing Actions (Optimistic Transaction RPCs) ---
export const holdVehicle = async (vin: string, username: string, fullName: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('rpc_hold_car', {
    p_vin: vin.trim(),
    p_username: username,
    p_full_name: fullName
  });
};

export const releaseVehicle = async (vin: string, outcome: 'released' | 'expired' | 'matched' = 'released') => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('rpc_release_car', {
    p_vin: vin.trim(),
    p_outcome: outcome
  });
};

export const joinHoldQueue = async (vin: string, username: string, fullName: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('rpc_join_hold_queue', {
    p_vin: vin.trim(),
    p_username: username,
    p_full_name: fullName
  });
};

export const leaveHoldQueue = async (vin: string, username: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('rpc_leave_hold_queue', {
    p_vin: vin.trim(),
    p_username: username
  });
};

export const getMyQueuedVins = async (username: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const { data, error } = await supabase.rpc('rpc_get_my_queued_vins', {
    p_username: username
  });
  if (error) {
    return { data: [], error };
  }

  const vins = (data || []).map((row: any) => String(row.vin || '').trim()).filter(Boolean);
  return { data: vins, error: null };
};

export const pairVehicle = async (orderId: string, vin: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const [{ data: order, error: orderError }, { data: vehicle, error: vehicleError }] = await Promise.all([
    supabase.from('donhang').select('updated_at').eq('so_don_hang', orderId).single(),
    supabase.from('khoxe').select('updated_at').eq('vin', vin.trim()).single()
  ]);

  if (orderError) {
    return { data: null, error: orderError };
  }
  if (vehicleError) {
    return { data: null, error: vehicleError };
  }

  return await supabase.rpc('pair_donhang_with_khoxe_safe', {
    p_order_id: orderId,
    p_vin: vin.trim(),
    p_order_updated_at: order?.updated_at ?? null,
    p_vehicle_updated_at: vehicle?.updated_at ?? null
  });
};

export const unpairVehicle = async (orderId: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const { data: order, error: fetchError } = await supabase
    .from('donhang')
    .select('updated_at')
    .eq('so_don_hang', orderId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  return await supabase.rpc('unpair_donhang_with_khoxe_safe', {
    p_order_id: orderId,
    p_order_updated_at: order?.updated_at ?? null
  });
};

export const addNewVehicle = async (vehicle: KhoxeRow) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.from('khoxe').insert(vehicle);
};

export const bulkUpsertVehicles = async (
  vehicles: Array<{
    vin: string;
    dong_xe?: string;
    phien_ban?: string;
    ngoai_that?: string;
    noi_that?: string;
    vi_tri?: string;
    latitude?: number | null;
    longitude?: number | null;
    ngay_nhap?: string | null;
  }>
) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const syncedAt = new Date().toISOString();

  const rows = vehicles.map((item) => ({
    vin: normalizeVin(item.vin),
    dong_xe: item.dong_xe?.trim() || 'Chưa xác định',
    phien_ban: item.phien_ban?.trim() || '',
    ngoai_that: item.ngoai_that?.trim() || '',
    noi_that: item.noi_that?.trim() || '',
    vi_tri: item.vi_tri?.trim() || null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    ngay_nhap: item.ngay_nhap || null,
    trang_thai: 'Chưa ghép',
    updated_at: syncedAt
  }));

  const vehicleResult = await supabase
    .from('khoxe')
    .upsert(rows, { onConflict: 'vin' })
    .select('vin');

  if (vehicleResult.error) {
    return vehicleResult;
  }

  const locationRows = rows
    .filter((item) => item.vi_tri || item.latitude !== null || item.longitude !== null)
    .map((item) => ({
      vin: item.vin,
      vi_tri: item.vi_tri,
      latitude: item.latitude,
      longitude: item.longitude,
      updated_at: syncedAt
    }));

  if (locationRows.length > 0) {
    const locationResult = await supabase
      .from('vehicle_locations')
      .upsert(locationRows, { onConflict: 'vin' })
      .select('vin');

    if (locationResult.error) {
      return locationResult;
    }
  }

  return vehicleResult;
};

export const updateVehicleLocation = async (
  vin: string,
  location: {
    vi_tri: string;
    latitude: number | null;
    longitude: number | null;
  }
) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const syncedAt = new Date().toISOString();

  const vehicleResult = await supabase
    .from('khoxe')
    .update({
      vi_tri: location.vi_tri.trim() || null,
      latitude: location.latitude,
      longitude: location.longitude,
      updated_at: syncedAt
    })
    .eq('vin', vin.trim().toUpperCase())
    .select('vin')
    .maybeSingle();

  if (vehicleResult.error) {
    return vehicleResult;
  }

  const locationResult = await supabase
    .from('vehicle_locations')
    .upsert(
      [
        {
          vin: vin.trim().toUpperCase(),
          vi_tri: location.vi_tri.trim() || null,
          latitude: location.latitude,
          longitude: location.longitude,
          updated_at: syncedAt
        }
      ],
      { onConflict: 'vin' }
    )
    .select('vin')
    .maybeSingle();

  return locationResult.error ? locationResult : vehicleResult;
};

// --- 2-Stage Invoicing ---
type RequestInvoiceInput = {
  order: Order;
  contractFile: File;
  proposalFile: File;
  policy: string;
  commission: string;
  vpoint: string;
  aiNote?: string;
  xeXangVin?: string;
  xeXangHang?: string;
  xeXangModel?: string;
  requesterName: string;
  requesterUsername: string;
};

function serviceError(message: string) {
  return { data: null, error: { message } };
}

function safeStorageName(name: string) {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  return normalized.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function maybeDate(value?: string | null) {
  if (!value || value === 'Chưa có') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parts = value.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

async function uploadInvoiceFile(orderId: string, kind: 'hop_dong' | 'de_nghi_xhd', file: File) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const path = `yeucauxhd/${orderId}/${kind}_${Date.now()}_${safeStorageName(file.name)}`;
  const { error } = await supabase.storage
    .from('yeucauxhd-files')
    .upload(path, file, { upsert: false });

  if (error) return { url: '', error };

  const { data } = supabase.storage.from('yeucauxhd-files').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

async function getOrderRow(orderId: string) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase
    .from('donhang')
    .select('*')
    .eq('so_don_hang', orderId)
    .single();
}

async function getVehicleMetadata(vin: string) {
  if (!supabase || !vin) return { so_may: null, ma_dms: null };
  const { data } = await supabase
    .from('khoxe')
    .select('so_may, ma_dms')
    .eq('vin', vin)
    .maybeSingle();
  if (data?.so_may || data?.ma_dms) {
    return {
      so_may: data?.so_may ?? null,
      ma_dms: data?.ma_dms ?? null
    };
  }

  return { so_may: null, ma_dms: null };
}

export const getYeucauxhd = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase
    .from('yeucauxhd')
    .select('*')
    .order('ngay_yeu_cau', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
};

export const requestInvoiceDonhang = async (input: RequestInvoiceInput) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const orderId = input.order.id;
  const { data: orderRow, error: fetchError } = await getOrderRow(orderId);

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  if (!orderRow?.vin && !input.order.vin) {
    return serviceError('Đơn hàng chưa có VIN, không thể yêu cầu xuất hóa đơn.');
  }

  const existingRequest = await supabase
    .from('yeucauxhd')
    .select('id, status')
    .eq('so_don_hang', orderId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingRequest.data) {
    return serviceError('Đơn hàng này đang có yêu cầu xuất hóa đơn chờ duyệt.');
  }

  const xeXangVin = input.xeXangVin?.trim() || '';
  if (xeXangVin) {
    const { data: duplicateGasVin, error: duplicateError } = await supabase
      .from('yeucauxhd')
      .select('so_don_hang')
      .eq('xe_xang_vin', xeXangVin)
      .limit(1);

    if (duplicateError) return { data: null, error: duplicateError };
    if (duplicateGasVin && duplicateGasVin.length > 0) {
      return serviceError(`VIN xe xăng ${xeXangVin} đã được khai báo ở đơn ${duplicateGasVin[0].so_don_hang}.`);
    }
  }

  const [contractUpload, proposalUpload] = await Promise.all([
    uploadInvoiceFile(orderId, 'hop_dong', input.contractFile),
    uploadInvoiceFile(orderId, 'de_nghi_xhd', input.proposalFile)
  ]);

  if (contractUpload.error) return { data: null, error: contractUpload.error };
  if (proposalUpload.error) return { data: null, error: proposalUpload.error };

  const vin = orderRow.vin || input.order.vin;
  const vehicleMeta = await getVehicleMetadata(vin);
  const { data: userData } = await supabase.auth.getUser();
  const requestedBy = userData.user?.id ?? null;

  const invoiceRow = {
    so_don_hang: orderId,
    ten_khach_hang: orderRow.ten_khach_hang || input.order.customer,
    tvbh: orderRow.ten_tu_van_ban_hang || input.order.staff,
    dong_xe: orderRow.dong_xe || input.order.line,
    phien_ban: orderRow.phien_ban || input.order.version,
    ngoai_that: orderRow.ngoai_that || input.order.exterior,
    noi_that: orderRow.noi_that || input.order.interior,
    ngay_coc: orderRow.ngay_coc || maybeDate(input.order.depositDate),
    ngay_yeu_cau: new Date().toISOString(),
    chinh_sach: input.policy,
    hoa_hong_ung: input.commission.trim(),
    vpoint: input.vpoint.trim(),
    url_hop_dong: contractUpload.url,
    url_de_nghi_xhd: proposalUpload.url,
    link_de_nghi_xhd: proposalUpload.url,
    so_may: orderRow.so_may || vehicleMeta.so_may || input.order.engineNo || null,
    vin,
    ma_dms: orderRow.ma_dms || vehicleMeta.ma_dms || input.order.dmsCode || null,
    ghi_chu_ai: input.aiNote?.trim() || null,
    xe_xang_vin: xeXangVin || null,
    xe_xang_hang: input.xeXangHang?.trim() || null,
    xe_xang_model: input.xeXangModel?.trim() || null,
    requested_by: requestedBy,
    requested_by_name: input.requesterName,
    requested_by_username: input.requesterUsername,
    status: 'pending',
    trang_thai_xu_ly: 'Chờ phê duyệt',
    note: 'Chờ phê duyệt xuất hóa đơn'
  };

  const { error: insertError } = await supabase.from('yeucauxhd').insert(invoiceRow);
  if (insertError) return { data: null, error: insertError };

  const { error: orderUpdateError } = await supabase
    .from('donhang')
    .update({
      ket_qua: 'Chờ phê duyệt',
      chinh_sach: input.policy,
      link_hop_dong: contractUpload.url,
      link_de_nghi_xhd: proposalUpload.url,
      so_may: invoiceRow.so_may,
      ma_dms: invoiceRow.ma_dms,
      updated_at: new Date().toISOString()
    })
    .eq('so_don_hang', orderId);

  if (orderUpdateError) return { data: null, error: orderUpdateError };

  if (vin) {
    await supabase.from('khoxe').delete().eq('vin', vin);
  }

  await supabase.from('car_hold_activities').insert({
    action: 'request_invoice',
    so_don_hang: orderId,
    vin,
    actor_name: input.requesterName,
    actor_username: input.requesterUsername,
    detail: `Gửi hồ sơ xuất hóa đơn: ${input.policy}`
  });

  return { data: { status: 'SUCCESS' }, error: null };
};

export const uploadSupplementaryInvoiceFiles = async (
  orderId: string,
  contractFile: File | null,
  proposalFile: File | null,
  aiNote: string,
  actorName: string,
  actorUsername: string
) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  if (!contractFile && !proposalFile && !aiNote.trim()) {
    return serviceError('Chưa có nội dung bổ sung.');
  }

  const updates: Record<string, any> = {
    status: 'pending',
    trang_thai_xu_ly: 'Đã bổ sung',
    note: 'Đã bổ sung hồ sơ',
    updated_at: new Date().toISOString()
  };

  if (aiNote.trim()) updates.ghi_chu_ai = aiNote.trim();

  if (contractFile) {
    const upload = await uploadInvoiceFile(orderId, 'hop_dong', contractFile);
    if (upload.error) return { data: null, error: upload.error };
    updates.url_hop_dong = upload.url;
  }

  if (proposalFile) {
    const upload = await uploadInvoiceFile(orderId, 'de_nghi_xhd', proposalFile);
    if (upload.error) return { data: null, error: upload.error };
    updates.url_de_nghi_xhd = upload.url;
    updates.link_de_nghi_xhd = upload.url;
  }

  const { error: reqError } = await supabase
    .from('yeucauxhd')
    .update(updates)
    .eq('so_don_hang', orderId)
    .neq('status', 'approved');

  if (reqError) return { data: null, error: reqError };

  const orderUpdates: Record<string, any> = {
    ket_qua: 'Đã bổ sung',
    updated_at: new Date().toISOString()
  };
  if (updates.url_hop_dong) orderUpdates.link_hop_dong = updates.url_hop_dong;
  if (updates.url_de_nghi_xhd) orderUpdates.link_de_nghi_xhd = updates.url_de_nghi_xhd;

  const { error: orderError } = await supabase
    .from('donhang')
    .update(orderUpdates)
    .eq('so_don_hang', orderId);

  if (orderError) return { data: null, error: orderError };

  await supabase.from('car_hold_activities').insert({
    action: 'request_invoice',
    so_don_hang: orderId,
    vin: null,
    actor_name: actorName,
    actor_username: actorUsername,
    detail: 'Bổ sung hồ sơ xuất hóa đơn'
  });

  return { data: { status: 'SUCCESS' }, error: null };
};

export const finalizeInvoiceDonhang = async (requestId: string, linkHoaDon: string, linkHopDong: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('finalize_invoice_donhang', {
    p_request_id: requestId,
    p_link_hoa_don_da_xuat: linkHoaDon,
    p_link_hop_dong: linkHopDong,
    p_mail_status: 'Đã gửi'
  });
};

export const approveInvoiceRequest = async (requestId: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('approve_invoice_request', {
    p_request_id: requestId
  });
};

export const requestInvoiceSupplement = async (requestId: string, reason: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('request_invoice_supplement', {
    p_request_id: requestId,
    p_reason: reason
  });
};

export const markInvoicePendingSignature = async (requestId: string, invoiceDate?: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('mark_invoice_pending_signature', {
    p_request_id: requestId,
    p_ngay_xuat_hoa_don: invoiceDate || null
  });
};

export const uploadIssuedInvoice = async (requestId: string, orderId: string, customerName: string, file: File) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const safeCustomer = safeStorageName(customerName || 'KH').toUpperCase();
  const path = `yeucauxhd/${orderId}/HOADON_${safeCustomer}_${Date.now()}_${safeStorageName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from('yeucauxhd-files')
    .upload(path, file, { upsert: false });

  if (uploadError) return { data: null, error: uploadError };

  const { data } = supabase.storage.from('yeucauxhd-files').getPublicUrl(path);
  return await supabase.rpc('complete_issued_invoice', {
    p_request_id: requestId,
    p_invoice_url: data.publicUrl,
    p_mail_status: 'Chưa gửi mail'
  });
};
