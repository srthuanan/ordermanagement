import React, { Suspense, lazy, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { X, Users, CalendarDays, UserRound, ShieldCheck } from 'lucide-react';

// Lớp Dữ liệu & API
import { supabase } from './services/supabaseClient';
import { getProfile } from './services/apiService';
import { useAppData } from './hooks/useAppData';
import { useOrderOperations } from './hooks/useOrderOperations';
import { TabKey } from './constants';
import { InventoryItem, Order, OrderStatus, YeucauxhdRow, ProfileRow } from './types';

// Giao diện Layout
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AuthScreen } from './components/AuthScreen';
import { SetPasswordScreen } from './components/SetPasswordScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { CompleteProfileScreen } from './components/CompleteProfileScreen';
import { SettingsPanel } from './components/SettingsPanel';

// Lớp Giao diện Từng Tab Chức năng
const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));
const OrdersPanel = lazy(() => import('./components/OrdersPanel').then((module) => ({ default: module.OrdersPanel })));
const InventoryPanel = lazy(() => import('./components/InventoryPanel').then((module) => ({ default: module.InventoryPanel })));
const InvoiceRequestsPanel = lazy(() => import('./components/InvoiceRequestsPanel').then((module) => ({ default: module.InvoiceRequestsPanel })));
const PricingPanel = lazy(() => import('./components/PricingPanel').then((module) => ({ default: module.PricingPanel })));
const StaffPanel = lazy(() => import('./components/StaffPanel').then((module) => ({ default: module.StaffPanel })));
const HRPanel = lazy(() => import('./components/HRPanel').then((module) => ({ default: module.HRPanel })));

// Lớp Popup Modal
const CreateOrderModal = lazy(() => import('./components/modals/CreateOrderModal').then((module) => ({ default: module.CreateOrderModal })));
const PairVehicleModal = lazy(() => import('./components/modals/PairVehicleModal').then((module) => ({ default: module.PairVehicleModal })));
const VehicleGpsModal = lazy(() => import('./components/modals/VehicleGpsModal').then((module) => ({ default: module.VehicleGpsModal })));
const CancelOrderModal = lazy(() => import('./components/modals/CancelOrderModal').then((module) => ({ default: module.CancelOrderModal })));
const InvoiceRequestModal = lazy(() => import('./components/modals/InvoiceModal').then((module) => ({ default: module.InvoiceRequestModal })));
const ChangePasswordModal = lazy(() => import('./components/modals/ChangePasswordModal').then((module) => ({ default: module.ChangePasswordModal })));
const FinalizeInvoiceModal = lazy(() => import('./components/modals/FinalizeInvoiceModal').then((module) => ({ default: module.FinalizeInvoiceModal })));
const SupplementaryInvoiceModal = lazy(() => import('./components/modals/SupplementaryInvoiceModal').then((module) => ({ default: module.SupplementaryInvoiceModal })));
const RequestSupplementModal = lazy(() => import('./components/modals/RequestSupplementModal').then((module) => ({ default: module.RequestSupplementModal })));
const ImportInventoryModal = lazy(() => import('./components/modals/ImportInventoryModal').then((module) => ({ default: module.ImportInventoryModal })));
const EditOrderModal = lazy(() => import('./components/modals/EditOrderModal').then((module) => ({ default: module.EditOrderModal })));
const SelectPolicyModal = lazy(() => import('./components/modals/SelectPolicyModal').then((module) => ({ default: module.SelectPolicyModal })));
import {
  canApproveInvoice,
  canViewNotifications,
  canCreateOrder,
  canHoldVehicle,
  canManageInventory,
  canManageOrderActions,
  canManagePricingConfig,
  canOverrideHeldVehicle,
  canPairOrder,
  canAccessTab,
  getVisibleTabs,
  roleLabels
} from './constants';

import './styles.css';

function App() {
  const {
    session,
    profile,
    profiles,
    orders,
    allOrders,
    inventory,
    vehicleLocations,
    queuedVins,
    auditLogs,
    invoiceRequests,
    hrLeaveRequests,
    vehicleConfigs,
    authReady,
    syncState,
    syncMessage,
    setSyncState,
    setSyncMessage,
    setProfile,
    loadWorkspace,
    updateInventoryItem
  } = useAppData();

  // Derivations
  const currentUsername = session?.user.email ?? '';
  const currentFullName = profile?.full_name || currentUsername || 'Nhân viên';
  const userRole = profile?.role ?? 'sales';
  const visibleTabs = getVisibleTabs(userRole);

  const {
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
  } = useOrderOperations({
    session,
    currentUsername,
    currentFullName,
    canOverrideHeldVehicle: canOverrideHeldVehicle(userRole),
    loadWorkspace,
    setSyncState,
    setSyncMessage,
    updateInventoryItem
  });

  // UI states
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'Tất cả'>('Tất cả');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal toggle states
  const [createOpen, setCreateOpen] = useState(false);
  const [createFromVehicle, setCreateFromVehicle] = useState<InventoryItem | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pairingOrder, setPairingOrder] = useState<Order | null>(null);
  const [gpsItem, setGpsItem] = useState<InventoryItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [invoicingOrder, setInvoicingOrder] = useState<Order | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(true);
  const [finalizingRequest, setFinalizingRequest] = useState<YeucauxhdRow | null>(null);
  const [supplementingRequest, setSupplementingRequest] = useState<YeucauxhdRow | null>(null);
  const [requestingSupplement, setRequestingSupplement] = useState<YeucauxhdRow | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectingPolicyOrder, setSelectingPolicyOrder] = useState<Order | null>(null);
  const [staffSubTab, setStaffSubTab] = useState<'system' | 'hr'>('system');
  const isSetPasswordRoute = window.location.pathname === '/set-password';
  const isResetPasswordRoute = window.location.pathname === '/reset-password';
  
  // Thực thi Filter trên danh sách orders
  const filteredOrders = useMemo(() => {
    let result = orders.filter((order) => {
      const matchesStatus = status === 'Tất cả' || order.status === status;
      if (!matchesStatus) return false;

      const normQuery = query.trim().toLowerCase();
      if (!normQuery) return true;

      return (
        order.id.toLowerCase().includes(normQuery) ||
        order.customer.toLowerCase().includes(normQuery) ||
        order.phone.includes(normQuery) ||
        order.vin.toLowerCase().includes(normQuery) ||
        order.line.toLowerCase().includes(normQuery) ||
        order.version.toLowerCase().includes(normQuery) ||
        order.exterior.toLowerCase().includes(normQuery) ||
        order.interior.toLowerCase().includes(normQuery)
      );
    });
    
    // SLA Warning: Đưa các đơn cảnh báo lên đầu
    result.sort((a, b) => {
      if (a.isWarning && !b.isWarning) return -1;
      if (!a.isWarning && b.isWarning) return 1;
      return 0; // fallback to original order (often by createdAt)
    });

    return result;
  }, [orders, query, status]);

  // Lấy thống kê xe trống
    // Đếm số đơn cảnh báo
  const slaWarningCount = useMemo(() => {
    return orders.filter(o => o.isWarning).length;
  }, [orders]);

  const availableStock = useMemo(
    () => inventory.filter((item) => item.status === 'Chưa ghép').length,
    [inventory]
  );

  // Đăng xuất
  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  React.useEffect(() => {
    if (!canAccessTab(userRole, activeTab)) {
      setActiveTab(visibleTabs[0]?.key ?? 'dashboard');
    }
  }, [activeTab, userRole, visibleTabs]);

  React.useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { tab, search } = customEvent.detail;
      if (tab) setActiveTab(tab);
      if (search) setQuery(search);
    };
    window.addEventListener('navigate-to', handleNavigate);
    return () => window.removeEventListener('navigate-to', handleNavigate);
  }, []);

  // Màn hình Loading cấu hình
  if (!authReady) {
    return (
      <div className="auth-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'white', opacity: 0.8 }}>
          <p>Đang khởi tạo cổng truy cập...</p>
        </div>
      </div>
    );
  }

  // Yêu cầu Login qua Supabase Auth nếu chưa có session
  if (!session) {
    if (isSetPasswordRoute) {
      return <SetPasswordScreen />;
    }
    if (isResetPasswordRoute) {
      return <ResetPasswordScreen />;
    }
    return <AuthScreen />;
  }

  if (isSetPasswordRoute) {
    return <SetPasswordScreen />;
  }

  if (isResetPasswordRoute) {
    return <ResetPasswordScreen />;
  }

  if (session && !profile && syncState === 'error') {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div>
            <p className="eyebrow">TRUY CẬP BỊ TỪ CHỐI</p>
            <h1>Tài khoản chưa được admin cấp quyền</h1>
            <p className="auth-note">{syncMessage}</p>
          </div>
          <button className="primary-button" type="button" onClick={handleSignOut}>
            Đăng xuất
          </button>
        </section>
              {/* Cảnh báo SLA Global */}
        {slaWarningCount > 0 && canViewNotifications(userRole) && (
          <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)', zIndex: 9999 }}>
            <AlertTriangle size={20} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Cảnh báo tiến độ!</span>
              <span style={{ fontSize: '12.5px', opacity: 0.9 }}>Có {slaWarningCount} đơn hàng bị quá hạn XHĐ.</span>
            </div>
            <button 
              onClick={() => {
                setActiveTab('orders');
                setSidebarOpen(false);
              }}
              style={{ background: 'white', color: '#ef4444', border: 'none', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', marginLeft: '10px' }}>
              Xem ngay
            </button>
          </div>
        )}
      </main>
    );
  }

  const isProfileIncomplete = profile 
    && profile.role !== 'admin' 
    && (!profile.phone || !profile.dob || !profile.gender || !profile.address);
  
  if (profile && isProfileIncomplete && showProfileModal) {
    return (
      <CompleteProfileScreen
        profile={profile}
        onComplete={async () => {
          // Ẩn modal NGAY LẬP TỨC trước khi gọi bất kỳ async nào
          setShowProfileModal(false);
          try {
            const result = await getProfile(session.user.id);
            if (result.data) {
              setProfile(result.data as ProfileRow);
            }
            await loadWorkspace({ showLoading: false });
          } catch (err) {
            console.error('Lỗi khi tải lại workspace:', err);
          }
        }}
        onLogout={handleSignOut}
      />
    );
  }

  if (editProfileOpen && profile) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', overflow: 'auto', display: 'grid', placeItems: 'center', padding: '20px' }}>
        <CompleteProfileScreen
          profile={profile}
          onComplete={async () => {
            // Refresh profile after successful update
            const result = await getProfile(session.user.id);
            if (result.data) {
              setProfile(result.data as ProfileRow);
            }
            setEditProfileOpen(false);
          }}
          onLogout={() => {
            handleSignOut();
          }}
          onCancel={() => setEditProfileOpen(false)}
        />
      </div>
    );
  }

  const activeTabObj = visibleTabs.find((t) => t.key === activeTab);
  const panelFallback = (
    <div className="panel" style={{ minHeight: '20rem', display: 'grid', placeItems: 'center' }}>
      <p>Đang tải giao diện...</p>
    </div>
  );

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        profile={profile}
        visibleTabs={visibleTabs}
        userEmail={session.user.email}
        onSignOut={handleSignOut}
        onChangePassword={() => setChangePasswordOpen(true)}
        onEditProfile={() => setEditProfileOpen(true)}
      />

      <main className="main">
        <Header
          canCreateOrder={canCreateOrder(userRole)}
          isAdmin={canViewNotifications(userRole)}
          setSidebarOpen={setSidebarOpen}
          setCreateOpen={(open) => {
            if (open) setCreateFromVehicle(null);
            setCreateOpen(open);
          }}
          activeTabLabel={activeTabObj?.label}
          activeTabIcon={activeTabObj?.icon}
        />

        <nav className="mobile-tab-strip" aria-label="Điều hướng nhanh trên di động">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={isActive ? 'mobile-tab-chip active' : 'mobile-tab-chip'}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {sidebarOpen && (
          <button className="backdrop" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu">
            <X size={20} />
          </button>
        )}

        <div className="main-content">
          <Suspense fallback={panelFallback}>
            {/* Render Tab Component */}
            {activeTab === 'dashboard' && (
              <Dashboard
                orders={orders}
                availableStock={availableStock}
                auditLogs={auditLogs}
                currentProfile={profile}
                staffProfiles={profiles}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersPanel
                orders={filteredOrders}
                allOrders={allOrders}
                inventory={inventory}
                currentUsername={currentUsername}
                canOverrideHeldVehicle={canOverrideHeldVehicle(userRole)}
                canPairOrder={canPairOrder(userRole)}
                canManageOrderActions={canManageOrderActions(userRole)}
                showStaffColumn={userRole === 'admin' || userRole === 'sales_manager'}
                isUnpairingOrderId={isUnpairingOrderId}
                isUpdatingPolicy={isUpdatingPolicy}
                query={query}
                status={status}
                onQueryChange={setQuery}
                onStatusChange={setStatus}
                onViewOrder={setSelectedOrder}
                onPairOrderSubmit={handlePairVehicle}
                onUnpairOrder={handleUnpairVehicle}
                onInvoiceOrder={setInvoicingOrder}
                onCancelOrderSubmit={handleCancelOrder}
                onEditOrder={setEditingOrder}
                onUpdateOrder={handleUpdateOrder}
                isUpdatingOrder={isUpdatingOrder}
                vehicleConfigs={vehicleConfigs}
                onSelectPolicy={setSelectingPolicyOrder}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryPanel
                items={inventory}
                vehicleLocations={vehicleLocations}
                canManageInventory={canManageInventory(userRole)}
                canHoldVehicle={canHoldVehicle(userRole)}
                currentUsername={currentUsername}
                canOverrideHeldVehicle={canOverrideHeldVehicle(userRole)}
                isReleasingVin={isReleasingVin}
                isHoldingVin={isHoldingVin}
                isQueueingVin={isQueueingVin}
                isUpdatingVehicleLocation={isUpdatingVehicleLocation}
                queuedVins={queuedVins}
                onOpenImport={() => {
                  setImportStockError('');
                  setImportOpen(true);
                }}
                onHoldItem={(item) => {
                  handleHoldVehicle(item.vin);
                }}
                onCreateOrderFromItem={(item) => {
                  setCreateError('');
                  setCreateFromVehicle(item);
                  setCreateOpen(true);
                }}
                onReleaseItem={handleReleaseVehicle}
                onJoinQueue={handleJoinQueue}
                onLeaveQueue={handleLeaveQueue}
                onUpdateVehicleLocation={(item) => {
                  setSyncState('idle');
                  setSyncMessage('');
                  setGpsItem(item);
                }}
                vehicleConfigs={vehicleConfigs}
                onRefresh={() => loadWorkspace({ showLoading: false })}
              />
            )}

            {activeTab === 'invoices' && (
              <div className="invoice-panel" style={{ height: '100%', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <InvoiceRequestsPanel
                  requests={invoiceRequests}
                  canApprove={canApproveInvoice(userRole)}
                  isProcessing={isAdvancingInvoice}
                  onApprove={(request) => handleApproveInvoiceRequest(request.id)}
                  onRequestSupplement={setRequestingSupplement}
                  onPendingSignature={(request) => handleMarkInvoicePendingSignature(request.id)}
                  onUploadInvoice={setFinalizingRequest}
                  onSupplement={setSupplementingRequest}
                />
              </div>
            )}

            {activeTab === 'pricing' && <PricingPanel isAdmin={canManagePricingConfig(userRole)} />}

            {activeTab === 'staff' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflowX: 'auto', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setStaffSubTab('system')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px',
                        border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                        background: staffSubTab === 'system' ? '#eff6ff' : 'transparent',
                        color: staffSubTab === 'system' ? '#0284c7' : '#64748b'
                      }}
                    >
                      <Users size={16} /> Quản lý tài khoản
                    </button>
                    <button
                      onClick={() => setStaffSubTab('hr')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px',
                        border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                        background: staffSubTab === 'hr' ? '#eff6ff' : 'transparent',
                        color: staffSubTab === 'hr' ? '#0284c7' : '#64748b'
                      }}
                    >
                      <CalendarDays size={16} /> Chấm công & Phép
                      {hrLeaveRequests.filter(r => r.status === 'pending').length > 0 && userRole === 'admin' && (
                        <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', padding: '0 6px', fontSize: '10px' }}>
                          {hrLeaveRequests.filter(r => r.status === 'pending').length}
                        </span>
                      )}
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setEditProfileOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; }}
                    >
                      <UserRound size={14} /> Cập nhật hồ sơ
                    </button>
                    <button 
                      onClick={() => setChangePasswordOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; }}
                    >
                      <ShieldCheck size={14} /> Đổi mật khẩu
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  {staffSubTab === 'system' && (
                    <StaffPanel 
                      staff={profiles} 
                      currentProfile={profile} 
                      onReload={loadWorkspace} 
                      onEditProfile={() => setIsEditProfileOpen(true)}
                      onChangePassword={() => setIsChangePasswordOpen(true)}
                    />
                  )}
                  {staffSubTab === 'hr' && (
                    <HRPanel
                      requests={hrLeaveRequests}
                      currentProfile={profile}
                      currentUsername={currentUsername}
                      staffProfiles={profiles}
                      onReload={() => loadWorkspace({ showLoading: false })}
                    />
                  )}
                </div>
              </div>
            )}
            {activeTab === 'settings' && <SettingsPanel configs={vehicleConfigs} onRefresh={loadWorkspace} />}
          </Suspense>
        </div>

      </main>

      {/* === Render Modals === */}

      <Suspense fallback={null}>
        {createOpen && (
          <CreateOrderModal
            error={createError}
            isCreating={isCreating}
            initialVehicle={createFromVehicle}
            currentStaffName={currentFullName}
            vehicleConfigs={vehicleConfigs}
            onClose={() => {
              if (!isCreating) {
                setCreateOpen(false);
                setCreateFromVehicle(null);
                setCreateError('');
              }
            }}
            onSubmit={async (input) => {
              const success = await handleCreateOrder(input);
              if (success) {
                setCreateOpen(false);
                setCreateFromVehicle(null);
              }
            }}
          />
        )}

        {pairingOrder && (
          <PairVehicleModal
            order={pairingOrder}
            currentUsername={currentUsername}
            canOverrideHeldVehicle={canOverrideHeldVehicle(userRole)}
            error={pairError}
            inventory={inventory}
            isPairing={isPairing}
            onClose={() => {
              if (!isPairing) {
                setPairingOrder(null);
                setPairError('');
              }
            }}
            onSubmit={async (orderId, vin) => {
              const success = await handlePairVehicle(orderId, vin);
              if (success) {
                setPairingOrder(null);
              }
            }}
          />
        )}

        {gpsItem && (
          <VehicleGpsModal
            item={gpsItem}
            isSaving={isUpdatingVehicleLocation === gpsItem.vin}
            error={syncState === 'error' ? syncMessage : ''}
            onClose={() => {
              if (isUpdatingVehicleLocation !== gpsItem.vin) {
                setGpsItem(null);
              }
            }}
            onSubmit={async (input) => {
              const success = await handleUpdateVehicleLocation(gpsItem.vin, input);
              if (success) {
                setGpsItem(null);
              }
              return success;
            }}
          />
        )}

        {importOpen && (
          <ImportInventoryModal
            error={importStockError}
            isSubmitting={isImportingStock}
            onClose={() => {
              if (!isImportingStock) {
                setImportOpen(false);
                setImportStockError('');
              }
            }}
            onSubmit={handleImportStock}
          />
        )}

        {cancelingOrder && (
          <CancelOrderModal
            orderId={cancelingOrder.id}
            currentNeedDate={cancelingOrder.needDateIso ? cancelingOrder.needDateIso.slice(0, 10) : ''}
            isCanceling={isCanceling}
            onClose={() => setCancelingOrder(null)}
            onSubmit={handleCancelOrder}
          />
        )}

        {invoicingOrder && (
          <InvoiceRequestModal
            order={invoicingOrder}
            isSubmitting={isRequestingInvoice}
            onClose={() => setInvoicingOrder(null)}
            onSubmit={async (input) => {
              const success = await handleRequestInvoice(input);
              if (success) {
                setInvoicingOrder(null);
              }
              return success;
            }}
          />
        )}

        {changePasswordOpen && (
          <ChangePasswordModal
            onClose={() => {
              setChangePasswordOpen(false);
            }}
          />
        )}

        {finalizingRequest && (
          <FinalizeInvoiceModal
            requestId={finalizingRequest.id}
            orderId={finalizingRequest.so_don_hang}
            customerName={finalizingRequest.ten_khach_hang}
            isSubmitting={isFinalizingInvoice}
            onClose={() => setFinalizingRequest(null)}
            onSubmit={handleUploadIssuedInvoice}
          />
        )}

        {requestingSupplement && (
          <RequestSupplementModal
            request={requestingSupplement}
            isSubmitting={isAdvancingInvoice}
            onClose={() => setRequestingSupplement(null)}
            onSubmit={handleRequestInvoiceSupplement}
          />
        )}

        {supplementingRequest && (
          <SupplementaryInvoiceModal
            request={supplementingRequest}
            isSubmitting={isSupplementingInvoice}
            onClose={() => setSupplementingRequest(null)}
            onSubmit={handleSupplementInvoice}
          />
        )}

        {editingOrder && (
          <EditOrderModal
            order={editingOrder}
            isSubmitting={isUpdatingOrder}
            vehicleConfigs={vehicleConfigs}
            onClose={() => setEditingOrder(null)}
            onSubmit={handleUpdateOrder}
          />
        )}

        {selectingPolicyOrder && (
          <SelectPolicyModal
            orderId={selectingPolicyOrder.id}
            orderLine={selectingPolicyOrder.line}
            currentPolicy={selectingPolicyOrder.policy}
            isSubmitting={isUpdatingPolicy}
            onClose={() => setSelectingPolicyOrder(null)}
            onSubmit={handleUpdatePolicy}
          />
        )}
      </Suspense>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
