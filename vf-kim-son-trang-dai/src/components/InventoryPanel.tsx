import React from 'react';
import { PackageCheck, X, Clock, FilePlus2 } from 'lucide-react';
import { InventoryItem } from '../types';
import { stockTone } from '../constants';

interface InventoryPanelProps {
  items: InventoryItem[];
  canManageInventory: boolean;
  currentUsername: string;
  canOverrideHeldVehicle: boolean;
  isReleasingVin: string;
  isQueueingVin: string;
  queuedVins: string[];
  onOpenImport: () => void;
  onHoldItem: (item: InventoryItem) => void;
  onCreateOrderFromItem: (item: InventoryItem) => void;
  onReleaseItem: (vin: string) => void;
  onJoinQueue: (vin: string) => void;
  onLeaveQueue: (vin: string) => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  items,
  canManageInventory,
  currentUsername,
  canOverrideHeldVehicle,
  isReleasingVin,
  isQueueingVin,
  queuedVins,
  onOpenImport,
  onHoldItem,
  onCreateOrderFromItem,
  onReleaseItem,
  onJoinQueue,
  onLeaveQueue
}) => {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Tồn kho và giữ chỗ</p>
          <h2>Kho xe</h2>
        </div>
        <button
          className="primary-button"
          disabled={!canManageInventory}
          onClick={onOpenImport}
          title={canManageInventory ? 'Import danh sách xe vào kho' : 'Bạn không có quyền nhập kho'}
        >
          <PackageCheck size={18} />
          <span>Nhập kho</span>
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>VIN</th>
              <th>Dòng xe</th>
              <th>Phiên bản</th>
              <th>Ngoại thất</th>
              <th>Nội thất</th>
              <th>Ngày vận tải</th>
              <th>Trạng thái</th>
              <th>Người giữ</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">Không có dữ liệu kho xe phù hợp.</div>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.vin}>
                  <td>
                    <strong>{item.vin}</strong>
                    <small>{item.dmsCode || item.engineNo || 'Chưa có mã'}</small>
                  </td>
                  <td>{item.line}</td>
                  <td>{item.version}</td>
                  <td>{item.exterior}</td>
                  <td>{item.interior}</td>
                  <td>{item.transportDate || 'Chưa rõ'}</td>
                  <td>
                    <span className={stockTone[item.status]}>{item.status}</span>
                    {item.holdExpiry ? <small>Hạn: {item.holdExpiry}</small> : null}
                  </td>
                  <td>{item.holder || 'Trống'}</td>
                  <td>
                    <div className="row-actions">
                      {item.status === 'Đang giữ' && item.holderUsername !== currentUsername && (
                        queuedVins.some((vin) => vin.toUpperCase() === item.vin.toUpperCase()) ? (
                          <button
                            className="ghost-button row-action-button"
                            disabled={isQueueingVin === item.vin}
                            style={{ color: 'var(--text-muted)' }}
                            onClick={() => onLeaveQueue(item.vin)}
                            title="Hủy đăng ký hàng chờ"
                          >
                            <X size={16} />
                            <span>{isQueueingVin === item.vin ? 'Đang hủy...' : 'Hủy chờ'}</span>
                          </button>
                        ) : (
                          <button
                            className="ghost-button row-action-button"
                            disabled={isQueueingVin === item.vin}
                            onClick={() => onJoinQueue(item.vin)}
                            title="Đăng ký hàng chờ ưu tiên khi xe được nhả"
                          >
                            <Clock size={16} />
                            <span>{isQueueingVin === item.vin ? 'Đang đăng ký...' : 'Chờ xe'}</span>
                          </button>
                        )
                      )}

                      {item.status === 'Chưa ghép' && (
                        <button
                          className="ghost-button row-action-button"
                          disabled={!canManageInventory}
                          onClick={() => onHoldItem(item)}
                          title="Giữ xe tạm thời trong 24h."
                        >
                          <PackageCheck size={16} />
                          <span>Giữ xe</span>
                        </button>
                      )}

                      {(canOverrideHeldVehicle || item.holderUsername === currentUsername) && item.status === 'Đang giữ' && (
                        <button
                          className="ghost-button row-action-button"
                          style={{ color: 'var(--success-color)', borderColor: 'var(--success-color)' }}
                          onClick={() => onCreateOrderFromItem(item)}
                          title="Tạo đơn hàng mới và ghép luôn VIN đang giữ."
                        >
                          <FilePlus2 size={16} />
                          <span>Tạo đơn</span>
                        </button>
                      )}

                      {(canOverrideHeldVehicle || item.holderUsername === currentUsername) && item.status === 'Đang giữ' && (
                        <button
                          className="ghost-button row-action-button"
                          disabled={isReleasingVin === item.vin}
                          onClick={() => onReleaseItem(item.vin)}
                          title="Hủy bỏ giữ xe, trả lại kho rảnh."
                        >
                          <X size={16} />
                          <span>{isReleasingVin === item.vin ? 'Đang nhả...' : 'Bỏ giữ'}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
