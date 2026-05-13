import React from 'react';
import { X, PackageCheck, AlertTriangle } from 'lucide-react';
import { Order, InventoryItem } from '../../types';
import { matchesVehicleConfig, canUseVehicleForPair } from '../../utils/matching';

interface PairVehicleModalProps {
  order: Order;
  currentUsername: string;
  canOverrideHeldVehicle: boolean;
  error: string;
  inventory: InventoryItem[];
  isPairing: boolean;
  onClose: () => void;
  onSubmit: (orderId: string, vin: string) => void;
}

export const PairVehicleModal: React.FC<PairVehicleModalProps> = ({
  order,
  currentUsername,
  canOverrideHeldVehicle,
  error,
  inventory,
  isPairing,
  onClose,
  onSubmit
}) => {
  const candidates = React.useMemo(
    () =>
      inventory.filter(
        (item) =>
          matchesVehicleConfig(order, item) &&
          canUseVehicleForPair(item, currentUsername, canOverrideHeldVehicle)
      ),
    [canOverrideHeldVehicle, currentUsername, inventory, order]
  );

  const [vin, setVin] = React.useState(candidates[0]?.vin ?? '');

  React.useEffect(() => {
    setVin(candidates[0]?.vin ?? '');
  }, [candidates]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (vin) {
      onSubmit(order.id, vin);
    }
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="pair-vehicle-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Liên kết ghép xe</p>
            <h2 id="pair-vehicle-title">Đơn hàng {order.id}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isPairing}>
            <X size={18} />
          </button>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          <label className="full-span">
            <span>Thông tin đơn hàng</span>
            <input
              value={`${order.customer} · ${order.line} / ${order.version} · ${order.exterior} / ${order.interior}`}
              readOnly
            />
          </label>
          <label className="full-span">
            <span>Số khung (VIN) phù hợp *</span>
            <select
              value={vin}
              onChange={(event) => setVin(event.target.value)}
              disabled={candidates.length === 0}
            >
              {candidates.length === 0 ? <option value="">Không tìm thấy xe trống phù hợp cấu hình</option> : null}
              {candidates.map((item) => (
                <option key={item.vin} value={item.vin}>
                  {item.vin} · Vị trí: {item.location || 'Chưa có'} · Trạng thái: {item.status}
                  {item.holder ? ` · Giữ bởi ${item.holder}` : ''}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={isPairing}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={isPairing || !vin}>
              <PackageCheck size={18} />
              <span>{isPairing ? 'Đang xử lý ghép...' : 'Liên kết ghép xe'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
