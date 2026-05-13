import React from 'react';
import { X, Pencil, ScrollText } from 'lucide-react';
import { Order } from '../../types';
import { statusTone } from '../../constants';

interface OrderDetailModalProps {
  order: Order;
  canUnpair: boolean;
  canEdit: boolean;
  canPolicy: boolean;
  isUnpairing: boolean;
  isUpdatingPolicy: boolean;
  onClose: () => void;
  onUnpair: (orderId: string) => void;
  onEdit: (order: Order) => void;
  onSelectPolicy: (order: Order) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  canUnpair,
  canEdit,
  canPolicy,
  isUnpairing,
  isUpdatingPolicy,
  onClose,
  onUnpair,
  onEdit,
  onSelectPolicy
}) => {
  const timeline = [
    { label: 'Tạo đơn', active: true },
    { label: 'Chờ ghép', active: order.status !== 'Đã hủy' },
    { label: 'Đã ghép', active: ['Đã ghép', 'Chờ phê duyệt', 'Đã phê duyệt', 'Yêu cầu bổ sung', 'Đã bổ sung', 'Chờ ký hóa đơn', 'Đã xuất hóa đơn'].includes(order.status) },
    { label: 'Xuất HĐ', active: ['Chờ phê duyệt', 'Đã phê duyệt', 'Yêu cầu bổ sung', 'Đã bổ sung', 'Chờ ký hóa đơn', 'Đã xuất hóa đơn'].includes(order.status) },
    { label: 'Hoàn tất', active: order.status === 'Đã xuất hóa đơn' }
  ];

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Hồ sơ chi tiết</p>
            <h2 id="order-detail-title">{order.id}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="detail-body">
          <section className="detail-summary">
            <div>
              <span className={statusTone[order.status]}>{order.status}</span>
              <h3>{order.customer}</h3>
              <p>{order.phone}</p>
            </div>
            <div className="detail-total">
              <span>VIN liên kết</span>
              <strong>{order.vin || 'Chưa liên kết'}</strong>
            </div>
          </section>

          <section className="detail-grid">
            <DetailField label="Dòng xe" value={order.line} />
            <DetailField label="Phiên bản" value={order.version} />
            <DetailField label="Ngoại thất" value={order.exterior} />
            <DetailField label="Nội thất" value={order.interior} />
            <DetailField label="Tư vấn phụ trách" value={order.staff} />
            <DetailField label="Ngày khởi tạo" value={order.createdAt} />
            <DetailField label="Ngày đặt cọc" value={order.depositDate} />
            <DetailField label="Ngày hẹn cần xe" value={order.needDate} />
            <DetailField label="Ngày ghép xe" value={order.pairedAt} />
            <DetailField label="Chính sách áp dụng" value={order.policy || 'Chưa áp dụng'} />
            <DetailField label="Số máy" value={order.engineNo || 'N/A'} />
            <DetailField label="Mã DMS" value={order.dmsCode || 'N/A'} />
            <DetailField label="Lý do hủy (nếu có)" value={order.cancelNote || 'N/A'} />
          </section>

          <section className="detail-timeline" aria-label="Tiến độ đơn hàng">
            {timeline.map((step) => (
              <div className={step.active ? 'timeline-step active' : 'timeline-step'} key={step.label}>
                <span />
                <strong>{step.label}</strong>
              </div>
            ))}
          </section>

          <div className="modal-actions">
            {canUnpair ? (
              <button
                className="ghost-button"
                onClick={() => {
                  onUnpair(order.id);
                  onClose(); // Auto-close after unpairing trigger if confirmed
                }}
                disabled={isUnpairing}
                style={{ color: 'var(--error-color)' }}
              >
                <X size={16} />
                <span>{isUnpairing ? 'Đang xử lý...' : 'Hủy ghép xe'}</span>
              </button>
            ) : null}
            {canEdit ? (
              <button
                className="ghost-button"
                onClick={() => {
                  onEdit(order);
                  onClose();
                }}
              >
                <Pencil size={16} />
                <span>Sửa đơn</span>
              </button>
            ) : null}
            {canPolicy ? (
              <button
                className="ghost-button"
                onClick={() => {
                  onSelectPolicy(order);
                  onClose();
                }}
                disabled={isUpdatingPolicy}
              >
                <ScrollText size={16} />
                <span>{isUpdatingPolicy ? 'Đang lưu...' : 'Chọn chính sách'}</span>
              </button>
            ) : null}
            <button className="ghost-button" onClick={onClose}>
              Đóng cửa sổ
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const DetailField: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
};
