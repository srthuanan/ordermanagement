import React from 'react';
import { Search, Filter, Download, Eye, PackageCheck, X, FileCheck, Ban, Pencil, ScrollText } from 'lucide-react';
import { Order, OrderStatus, InventoryItem } from '../types';
import { statusTone } from '../constants';
import { matchesVehicleConfig, canUseVehicleForPair } from '../utils/matching';

interface OrdersPanelProps {
  orders: Order[];
  inventory: InventoryItem[];
  currentUsername: string;
  canOverrideHeldVehicle: boolean;
  canManageInventory: boolean;
  isUnpairingOrderId: string;
  isUpdatingPolicy: boolean;
  query: string;
  status: OrderStatus | 'Tất cả';
  onQueryChange: (value: string) => void;
  onStatusChange: (value: OrderStatus | 'Tất cả') => void;
  onViewOrder: (order: Order) => void;
  onPairOrder: (order: Order) => void;
  onUnpairOrder: (orderId: string) => void;
  onInvoiceOrder: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onSelectPolicy: (order: Order) => void;
}

export const OrdersPanel: React.FC<OrdersPanelProps> = ({
  orders,
  inventory,
  currentUsername,
  canOverrideHeldVehicle,
  canManageInventory,
  isUnpairingOrderId,
  isUpdatingPolicy,
  query,
  status,
  onQueryChange,
  onStatusChange,
  onViewOrder,
  onPairOrder,
  onUnpairOrder,
  onInvoiceOrder,
  onCancelOrder,
  onEditOrder,
  onSelectPolicy
}) => {
  return (
    <section className="panel">
      <div className="panel-heading section-heading">
        <div>
          <p className="eyebrow">Quản lý bán hàng</p>
          <h2>Đơn hàng</h2>
        </div>
      </div>

      <div className="toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Tìm số đơn, khách hàng, VIN, cấu hình xe..."
          />
        </label>
        <label className="select-box">
          <Filter size={18} />
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as OrderStatus | 'Tất cả')}
          >
            <option>Tất cả</option>
            <option>Chưa ghép</option>
            <option>Đã ghép</option>
            <option>Chờ phê duyệt</option>
            <option>Đã phê duyệt</option>
            <option>Yêu cầu bổ sung</option>
            <option>Đã bổ sung</option>
            <option>Chờ ký hóa đơn</option>
            <option>Đã xuất hóa đơn</option>
            <option>Đã hủy</option>
          </select>
        </label>
        <button className="ghost-button" onClick={() => alert('Tính năng xuất Excel đang được xây dựng')}>
          <Download size={17} />
          <span>Xuất Excel</span>
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Số đơn</th>
              <th>Khách hàng</th>
              <th>Cấu hình xe</th>
              <th>Tư vấn</th>
              <th>Ngày tạo</th>
              <th>Kết quả</th>
              <th>VIN</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">Không tìm thấy đơn hàng phù hợp.</div>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const candidates = inventory.filter(
                  (item) =>
                    matchesVehicleConfig(order, item) &&
                    canUseVehicleForPair(item, currentUsername, canOverrideHeldVehicle)
                );
                const canPair = canManageInventory && order.status === 'Chưa ghép' && candidates.length > 0;
                const canUnpair = canManageInventory && order.status === 'Đã ghép';
                const canInvoice = canManageInventory && order.status === 'Đã ghép';
                const canCancel = canManageInventory && order.status !== 'Đã hủy' && order.status !== 'Đã xuất hóa đơn';
                const canEdit = canManageInventory && !['Đã xuất hóa đơn', 'Đã hủy', 'Chờ ký hóa đơn'].includes(order.status);
                const canPolicy = canManageInventory && order.status !== 'Đã hủy';

                return (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.id}</strong>
                      <small>Cọc: {order.depositDate}</small>
                    </td>
                    <td>
                      <strong>{order.customer}</strong>
                      <small>{order.phone}</small>
                    </td>
                    <td>
                      <strong>{order.line} / {order.version}</strong>
                      <small>{order.exterior} · {order.interior}</small>
                    </td>
                    <td>{order.staff}</td>
                    <td>{order.createdAt}</td>
                    <td>
                      <span className={statusTone[order.status]}>{order.status}</span>
                    </td>
                    <td>{order.vin || 'Trống'}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          title="Xem chi tiết"
                          onClick={() => onViewOrder(order)}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="ghost-button row-action-button"
                          disabled={!canPair}
                          title={
                            canPair
                              ? `Có ${candidates.length} xe phù hợp trong kho`
                              : order.status !== 'Chưa ghép'
                                ? 'Đơn đã ghép hoặc đã hoàn tất'
                                : 'Không có xe rảnh tương ứng trong kho'
                          }
                          onClick={() => onPairOrder(order)}
                        >
                          <PackageCheck size={16} />
                          <span>Ghép xe</span>
                        </button>
                        <button
                          className="ghost-button row-action-button"
                          disabled={!canInvoice}
                          title={canInvoice ? 'Cập nhật hồ sơ bàn giao xe & xuất hóa đơn GTGT' : 'Chỉ đơn đã ghép mới được chốt xuất hóa đơn'}
                          onClick={() => onInvoiceOrder(order)}
                        >
                          <FileCheck size={16} />
                          <span>Xuất HĐ</span>
                        </button>
                        <button
                          className="ghost-button row-action-button"
                          disabled={!canUnpair || isUnpairingOrderId === order.id}
                          title={canUnpair ? 'Hủy ghép và trả xe về trạng thái trống' : 'Chỉ đơn đã ghép mới hủy ghép được'}
                          onClick={() => onUnpairOrder(order.id)}
                        >
                          <X size={16} />
                          <span>{isUnpairingOrderId === order.id ? 'Đang hủy...' : 'Hủy ghép'}</span>
                        </button>
                        <button
                          className="ghost-button row-action-button"
                          disabled={!canEdit}
                          title={canEdit ? 'Sửa thông tin đơn hàng' : 'Không cho sửa đơn đã hoàn tất'}
                          onClick={() => onEditOrder(order)}
                        >
                          <Pencil size={16} />
                          <span>Sửa</span>
                        </button>
                        <button
                          className="ghost-button row-action-button"
                          disabled={!canPolicy || isUpdatingPolicy}
                          title={canPolicy ? 'Chọn chính sách áp dụng cho đơn hàng' : 'Đơn đã hủy'}
                          onClick={() => onSelectPolicy(order)}
                        >
                          <ScrollText size={16} />
                          <span>{isUpdatingPolicy ? 'Đang lưu...' : 'Chọn CS'}</span>
                        </button>
                        <button
                          className="ghost-button row-action-button"
                          disabled={!canCancel}
                          style={{ color: canCancel ? 'var(--error-color)' : 'inherit' }}
                          title={canCancel ? 'Hủy đơn hàng và hoàn cọc' : 'Không cho phép hủy đơn đã hoàn tất hoặc đã hủy'}
                          onClick={() => onCancelOrder(order)}
                        >
                          <Ban size={16} />
                          <span>Hủy đơn</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
