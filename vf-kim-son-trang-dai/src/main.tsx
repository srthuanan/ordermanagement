import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { X } from 'lucide-react';

// Lớp Dữ liệu & API
import { supabase } from './services/supabaseClient';
import { useAppData } from './hooks/useAppData';
import { useOrderOperations } from './hooks/useOrderOperations';
import { TabKey } from './constants';
import { Order, InventoryItem, OrderStatus, YeucauxhdRow } from './types';

// Giao diện Layout
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SyncBanner } from './components/layout/SyncBanner';
import { AuthScreen } from './components/AuthScreen';

// Lớp Giao diện Từng Tab Chức năng
import { Dashboard } from './components/Dashboard';
import { OrdersPanel } from './components/OrdersPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { InvoiceRequestsPanel } from './components/InvoiceRequestsPanel';

// Lớp Popup Modal
import { CreateOrderModal } from './components/modals/CreateOrderModal';
import { OrderDetailModal } from './components/modals/OrderDetailModal';
import { PairVehicleModal } from './components/modals/PairVehicleModal';
import { HoldVehicleModal } from './components/modals/HoldVehicleModal';
import { CancelOrderModal } from './components/modals/CancelOrderModal';
import { InvoiceRequestModal } from './components/modals/InvoiceModal';
import { FinalizeInvoiceModal } from './components/modals/FinalizeInvoiceModal';
import { SupplementaryInvoiceModal } from './components/modals/SupplementaryInvoiceModal';
import { RequestSupplementModal } from './components/modals/RequestSupplementModal';
import { ImportInventoryModal } from './components/modals/ImportInventoryModal';
import { EditOrderModal } from './components/modals/EditOrderModal';
import { SelectPolicyModal } from './components/modals/SelectPolicyModal';

import './styles.css';

function App() {
  const {
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
    loadWorkspace
  } = useAppData();

  // Derivations
  const currentUsername = session?.user.email ?? '';
  const currentFullName = profile?.full_name || currentUsername || 'Nhân viên';
  const userRole = profile?.role ?? 'staff';

  const {
    isCreating,
    createError,
    setCreateError,
    handleCreateOrder,
    isHolding,
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
    loadWorkspace,
    setSyncState,
    setSyncMessage
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
  const [holdingItem, setHoldingItem] = useState<InventoryItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [invoicingOrder, setInvoicingOrder] = useState<Order | null>(null);
  const [finalizingRequest, setFinalizingRequest] = useState<YeucauxhdRow | null>(null);
  const [supplementingRequest, setSupplementingRequest] = useState<YeucauxhdRow | null>(null);
  const [requestingSupplement, setRequestingSupplement] = useState<YeucauxhdRow | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectingPolicyOrder, setSelectingPolicyOrder] = useState<Order | null>(null);
  
  // Phân quyền cơ bản (Roles)
  const canManageInventory = ['admin', 'manager', 'warehouse', 'sales'].includes(userRole);
  const canOverrideHeldVehicle = ['admin', 'manager', 'warehouse'].includes(userRole);
  const canCreateOrder = ['admin', 'manager', 'sales'].includes(userRole);

  // Thực thi Filter trên danh sách orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
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
  }, [orders, query, status]);

  // Lấy thống kê xe trống
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
    return <AuthScreen />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        profile={profile}
        userEmail={session.user.email}
        onSignOut={handleSignOut}
      />

      <main className="main">
        <Header
          activeTab={activeTab}
          canCreateOrder={canCreateOrder}
          setSidebarOpen={setSidebarOpen}
          setCreateOpen={(open) => {
            if (open) setCreateFromVehicle(null);
            setCreateOpen(open);
          }}
        />

        {sidebarOpen && (
          <button className="backdrop" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu">
            <X size={20} />
          </button>
        )}

        <SyncBanner state={syncState} message={syncMessage} />

        {/* Render Tab Component */}
        {activeTab === 'dashboard' && (
          <Dashboard
            orders={orders}
            availableStock={availableStock}
            auditLogs={auditLogs}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersPanel
            orders={filteredOrders}
            inventory={inventory}
            currentUsername={currentUsername}
            canOverrideHeldVehicle={canOverrideHeldVehicle}
            canManageInventory={canManageInventory}
            isUnpairingOrderId={isUnpairingOrderId}
            isUpdatingPolicy={isUpdatingPolicy}
            query={query}
            status={status}
            onQueryChange={setQuery}
            onStatusChange={setStatus}
            onViewOrder={setSelectedOrder}
            onPairOrder={(order) => {
              setPairError('');
              setPairingOrder(order);
            }}
            onUnpairOrder={handleUnpairVehicle}
            onInvoiceOrder={setInvoicingOrder}
            onCancelOrder={setCancelingOrder}
            onEditOrder={setEditingOrder}
            onSelectPolicy={setSelectingPolicyOrder}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryPanel
            items={inventory}
            canManageInventory={canManageInventory}
            currentUsername={currentUsername}
            canOverrideHeldVehicle={canOverrideHeldVehicle}
            isReleasingVin={isReleasingVin}
            isQueueingVin={isQueueingVin}
            queuedVins={queuedVins}
            onOpenImport={() => {
              setImportStockError('');
              setImportOpen(true);
            }}
            onHoldItem={(item) => {
              setHoldError('');
              setHoldingItem(item);
            }}
            onCreateOrderFromItem={(item) => {
              setCreateError('');
              setCreateFromVehicle(item);
              setCreateOpen(true);
            }}
            onReleaseItem={handleReleaseVehicle}
            onJoinQueue={handleJoinQueue}
            onLeaveQueue={handleLeaveQueue}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoiceRequestsPanel
            requests={invoiceRequests}
            canApprove={['admin', 'manager'].includes(userRole)}
            isProcessing={isAdvancingInvoice}
            onApprove={(request) => handleApproveInvoiceRequest(request.id)}
            onRequestSupplement={setRequestingSupplement}
            onPendingSignature={(request) => handleMarkInvoicePendingSignature(request.id)}
            onUploadInvoice={setFinalizingRequest}
            onSupplement={setSupplementingRequest}
          />
        )}

      </main>

      {/* === Render Modals === */}

      {createOpen && (
        <CreateOrderModal
          error={createError}
          isCreating={isCreating}
          initialVehicle={createFromVehicle}
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

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          canUnpair={canManageInventory && selectedOrder.status === 'Đã ghép'}
          canEdit={canManageInventory && selectedOrder.status !== 'Đã xuất hóa đơn' && selectedOrder.status !== 'Đã hủy'}
          canPolicy={canManageInventory && selectedOrder.status !== 'Đã hủy'}
          isUnpairing={isUnpairingOrderId === selectedOrder.id}
          isUpdatingPolicy={isUpdatingPolicy}
          onClose={() => setSelectedOrder(null)}
          onUnpair={handleUnpairVehicle}
          onEdit={setEditingOrder}
          onSelectPolicy={setSelectingPolicyOrder}
        />
      )}

      {pairingOrder && (
        <PairVehicleModal
          order={pairingOrder}
          currentUsername={currentUsername}
          canOverrideHeldVehicle={canOverrideHeldVehicle}
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

      {holdingItem && (
        <HoldVehicleModal
          error={holdError}
          isHolding={isHolding}
          item={holdingItem}
          onClose={() => {
            if (!isHolding) {
              setHoldingItem(null);
              setHoldError('');
            }
          }}
          onSubmit={async (vin) => {
            const success = await handleHoldVehicle(vin);
            if (success) {
              setHoldingItem(null);
            }
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
          onSubmit={handleRequestInvoice}
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
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
