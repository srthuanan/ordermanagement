import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import * as apiService from '../services/apiService';
import {
  Order,
  InventoryItem,
  ProfileRow,
  SyncState,
  CustomerRow,
  VehicleLocationRow,
  CarActivityRow,
  YeucauxhdRow
} from '../types';

export function useAppData() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [vehicleLocations, setVehicleLocations] = useState<VehicleLocationRow[]>([]);
  const [queuedVins, setQueuedVins] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<CarActivityRow[]>([]);
  const [invoiceRequests, setInvoiceRequests] = useState<YeucauxhdRow[]>([]);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [syncState, setSyncState] = useState<SyncState>(isSupabaseConfigured ? 'loading' : 'sample');
  const [syncMessage, setSyncMessage] = useState(
    isSupabaseConfigured ? 'Đang kết nối Supabase...' : 'Chưa cấu hình Supabase'
  );

  const normalizeIdentity = (value: string) => value.trim().toLowerCase();
  const matchesCurrentUser = (value: string | null | undefined, currentFullName: string, currentEmail: string) => {
    const normalizedValue = normalizeIdentity(value || '');
    if (!normalizedValue) return false;
    return (
      normalizedValue === normalizeIdentity(currentFullName) ||
      normalizedValue === normalizeIdentity(currentEmail)
    );
  };

  useEffect(() => {
    let active = true;
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setProfiles([]);
        setOrders([]);
        setInventory([]);
        setVehicleLocations([]);
        setQueuedVins([]);
        setSyncState('loading');
        setSyncMessage('Đăng nhập để đồng bộ Supabase');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadWorkspace = useCallback(async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
    if (!supabase) return false;
    if (!session) {
      setOrders([]);
      setInventory([]);
      setVehicleLocations([]);
      setQueuedVins([]);
      setSyncState('loading');
      setSyncMessage('Đăng nhập để đồng bộ Supabase');
      return false;
    }

    if (showLoading) {
      setSyncState('loading');
      setSyncMessage('Đang tải dữ liệu tài khoản...');
    }

    try {
      // 1. Tải Profile người dùng
      const profileResult = await apiService.getProfile(session.user.id);
      let profileData = profileResult.data as ProfileRow | null;

      if (!profileData) {
        setProfile(null);
        setProfiles([]);
        setSyncState('error');
        setSyncMessage('Tài khoản này chưa được admin cấp quyền.');
        return false;
      }
      setProfile(profileData);

      // Nhả các xe đã hết giờ giữ trước khi đọc kho, phòng trường hợp cron chưa kịp chạy.
      await apiService.expireHoldVehicles();

      // 2. Tải song song dữ liệu Donhang, Khoxe, Khachhang, Audit
      const [customersResult, ordersResult, inventoryResult, locationsResult, logsResult, invoicesResult, queueResult, profilesResult] = await Promise.all([
        apiService.getCustomers(),
        apiService.getOrders(),
        apiService.getInventory(),
        apiService.getVehicleLocations().catch((error) => ({ data: null, error })),
        apiService.getCarHoldActivities(),
        apiService.getYeucauxhd(),
        apiService.getMyQueuedVins(session.user.email || ''),
        apiService.getProfiles()
      ]);

      if (customersResult.error || !customersResult.data ||
          ordersResult.error || !ordersResult.data ||
          inventoryResult.error || !inventoryResult.data) {
        setSyncState('error');
        setSyncMessage('Lỗi Supabase: Không thể tải dữ liệu đầy đủ.');
        return false;
      }

      const customerMap = new Map(
        customersResult.data.map((row) => [row.full_name.toLowerCase(), row as CustomerRow])
      );

      const currentFullName = profileData.full_name || session.user.email || '';
      const currentEmail = session.user.email || '';
      const isSalesUser = profileData.role === 'sales';

      const mappedOrders = ordersResult.data.map((row) => apiService.mapOrderRow(row, customerMap));
      const visibleOrders = isSalesUser
        ? mappedOrders.filter((order) => matchesCurrentUser(order.staff, currentFullName, currentEmail))
        : mappedOrders;

      const visibleLogs = isSalesUser
        ? (logsResult.data || []).filter((log) => matchesCurrentUser(log.actor_name, currentFullName, currentEmail))
        : (logsResult.data || []);

      const visibleInvoices = isSalesUser
        ? (invoicesResult.data || []).filter(
            (row) =>
              matchesCurrentUser(row.requested_by_name, currentFullName, currentEmail) ||
              matchesCurrentUser(row.tvbh, currentFullName, currentEmail)
          )
        : (invoicesResult.data || []);

      const visibleQueue = isSalesUser
        ? (queueResult.data || []).filter((vin) =>
            typeof vin === 'string' ? true : Boolean(vin)
          )
        : (queueResult.data || []);

      setOrders(visibleOrders);
      setInventory(apiService.mapKhoxeRows(inventoryResult.data));
      setVehicleLocations(
        locationsResult.error || !locationsResult.data
          ? []
          : apiService.mapVehicleLocationRows(locationsResult.data as VehicleLocationRow[])
      );
      setAuditLogs(visibleLogs);
      setInvoiceRequests(visibleInvoices);
      setQueuedVins(visibleQueue);
      setProfiles((profilesResult.data || []) as ProfileRow[]);

      setSyncState('live');
      setSyncMessage(`Đã tải ${ordersResult.data.length} đơn và ${inventoryResult.data.length} xe.`);
      return true;
    } catch (err: any) {
      setSyncState('error');
      setSyncMessage(`Lỗi kết nối: ${err.message}`);
      return false;
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      loadWorkspace();
      return;
    }

    loadWorkspace();

    if (!supabase) return;

    // Đăng ký kênh realtime để đồng bộ ngay lập tức khi có bất kỳ ai cập nhật dữ liệu
      const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donhang' },
        () => {
          loadWorkspace({ showLoading: false });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'khoxe' },
        () => {
          loadWorkspace({ showLoading: false });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_locations' },
        () => {
          loadWorkspace({ showLoading: false });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'thongtinxe' },
        () => {
          loadWorkspace({ showLoading: false });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'car_hold_activities' },
        () => {
          loadWorkspace({ showLoading: false });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'yeucauxhd' },
        () => {
          loadWorkspace({ showLoading: false });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          loadWorkspace({ showLoading: false });
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [session, loadWorkspace]);

  return {
    session,
    profile,
    orders,
    inventory,
    vehicleLocations,
    queuedVins,
    profiles,
    auditLogs,
    invoiceRequests,
    authReady,
    syncState,
    syncMessage,
    setSyncState,
    setSyncMessage,
    setOrders,
    loadWorkspace
  };
}
