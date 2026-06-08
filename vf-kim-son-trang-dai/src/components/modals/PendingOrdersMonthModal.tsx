import React from 'react';
import { X, Calendar, User, Clock, Car, Tag } from 'lucide-react';
import { Order } from '../../types';

interface PendingOrdersMonthModalProps {
  month: string;
  orders: Order[];
  onClose: () => void;
}

export const PendingOrdersMonthModal: React.FC<PendingOrdersMonthModalProps> = ({ month, orders, onClose }) => {
  // Sắp xếp các đơn cũ lên trước (ưu tiên theo ngay_coc, nếu không có lấy thoi_gian_nhap)
  const sortedOrders = [...orders].sort((a, b) => {
    const timeA = new Date(a.depositDate && a.depositDate !== 'Chưa có' ? a.depositDate : a.createdAt).getTime();
    const timeB = new Date(b.depositDate && b.depositDate !== 'Chưa có' ? b.depositDate : b.createdAt).getTime();
    return timeA - timeB;
  });

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal detail-modal" role="dialog" aria-modal="true" style={{ width: 'min(1000px, 100vw)' }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Chi tiết tồn kho</p>
            <h2>Tháng {month}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>
        <div className="panel-content" style={{ overflowY: 'auto', padding: 0 }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>STT</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Mã Đơn / CRM</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Khách hàng</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>TVBH</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Dòng xe / Phiên bản</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Ngày cọc</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.length > 0 ? (
                sortedOrders.map((order, index) => {
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{index + 1}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{order.id}</td>
                      <td style={{ padding: '12px 16px' }}>{order.customer}</td>
                      <td style={{ padding: '12px 16px' }}>{order.staff}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div><strong>{order.line}</strong></div>
                        <div style={{ color: '#64748b', fontSize: '12px' }}>{order.version} • {order.exterior}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{order.depositDate && order.depositDate !== 'Chưa có' ? order.depositDate : <span style={{ color: '#94a3b8' }}>Chưa có</span>}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`status-badge status-${order.status === 'Chưa ghép' ? 'pending' : 'success'}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    Không có đơn hàng nào trong tháng này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="panel-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <button className="ghost-button" onClick={onClose}>
            Đóng bảng
          </button>
        </div>
      </section>
    </div>
  );
};
