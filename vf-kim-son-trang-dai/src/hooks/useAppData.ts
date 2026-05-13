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
  CarActivityRow,
  YeucauxhdRow
} from '../types';

export function useAppData() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [queuedVins, setQueuedVins] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<CarActivityRow[]>([]);
  const [invoiceRequests, setInvoiceRequests] = useState<YeucauxhdRow[]>([]);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [syncState, setSyncState] = useState<SyncState>(isSupabaseConfigured ? 'loading' : 'sample');
  const [syncMessage, setSyncMessage] = useState(
    isSupabaseConfigured ? 'Đang kết nối Supabase...' : 'Chưa cấu hình Supabase'
  );

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
        setOrders([]);
        setInventory([]);
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
      // 1. Tải & Bootstrap Profile người dùng
      const profileResult = await apiService.getProfile(session.user.id);
      let profileData = profileResult.data as ProfileRow | null;
      let profileBootstrapFailure = '';

      if (!profileData) {
        const fallbackName = String(session.user.user_metadata?.full_name || '').trim() || session.user.email || 'Nhân viên mới';
        const bootstrapResult = await apiService.bootstrapProfile(session.user.id, fallbackName);
        if (bootstrapResult.error) {
          profileBootstrapFailure = bootstrapResult.error.message;
        } else {
          profileData = {
            id: session.user.id,
            full_name: fallbackName,
            role: 'staff',
            created_at: new Date().toISOString()
          };
        }
      }
      setProfile(profileData);

      // Nhả các xe đã hết giờ giữ trước khi đọc kho, phòng trường hợp cron chưa kịp chạy.
      await apiService.expireHoldVehicles();

      // 2. Tải song song dữ liệu Donhang, Khoxe, Khachhang, Audit
      const [customersResult, ordersResult, inventoryResult, logsResult, invoicesResult, queueResult] = await Promise.all([
        apiService.getCustomers(),
        apiService.getOrders(),
        apiService.getInventory(),
        apiService.getCarHoldActivities(),
        apiService.getYeucauxhd(),
        apiService.getMyQueuedVins(session.user.email || '')
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

      setOrders(ordersResult.data.map((row) => apiService.mapOrderRow(row, customerMap)));
      setInventory(apiService.mapKhoxeRows(inventoryResult.data));
      setAuditLogs(logsResult.data || []);
      setInvoiceRequests(invoicesResult.data || []);
      setQueuedVins(queueResult.data || []);

      setSyncState('live');
      setSyncMessage(
        profileBootstrapFailure
          ? `Đồng bộ thành công nhưng lỗi profile: ${profileBootstrapFailure}`
          : `Đã tải ${ordersResult.data.length} đơn và ${inventoryResult.data.length} xe.`
      );
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
    queuedVins,
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
