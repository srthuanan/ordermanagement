import React, { useMemo, useState } from 'react';
import { X, Trophy, Clock, Search, Car } from 'lucide-react';
import { Order } from '../../types';

interface QueueRankingModalProps {
  orders: Order[];
  onClose: () => void;
}

function parseSortDate(value?: string | null) {
  if (!value || value === 'Chưa có') return 0;
  const trimmed = value.trim();
  const isoCandidate = new Date(trimmed);
  if (!Number.isNaN(isoCandidate.getTime()) && /\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return isoCandidate.getTime();
  }
  const match1 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(trimmed);
  if (match1) return new Date(Number(match1[3]), Number(match1[2]) - 1, Number(match1[1])).getTime();
  const match2 = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (match2) return new Date(Number(match2[1]), Number(match2[2]) - 1, Number(match2[3])).getTime();
  return 0;
}

export const QueueRankingModal: React.FC<QueueRankingModalProps> = ({ orders, onClose }) => {
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'Chưa ghép'), [orders]);
  
  // Lấy danh sách các dòng xe đang có đơn tồn
  const models = useMemo(() => {
    const set = new Set<string>();
    pendingOrders.forEach((o) => set.add(o.line || 'Khác'));
    return Array.from(set).sort();
  }, [pendingOrders]);

  const [selectedModel, setSelectedModel] = useState<string>(models.includes('VF 3') ? 'VF 3' : (models[0] || ''));

  const rankedOrders = useMemo(() => {
    return pendingOrders
      .filter((o) => (o.line || 'Khác') === selectedModel)
      .sort((a, b) => {
        const timeA = parseSortDate(a.depositDate) || parseSortDate(a.createdAt);
        const timeB = parseSortDate(b.depositDate) || parseSortDate(b.createdAt);
        return timeA - timeB;
      });
  }, [pendingOrders, selectedModel]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <Trophy size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Thứ tự phân xe (Hàng đợi)</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Xem vị trí ưu tiên ghép xe của các đơn hàng</p>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} style={{ alignSelf: 'flex-start' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {models.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
              Không có đơn hàng nào đang chờ ghép xe.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  Chọn dòng xe:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {models.map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedModel(m)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: selectedModel === m ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                        background: selectedModel === m ? '#eff6ff' : 'white',
                        color: selectedModel === m ? '#1d4ed8' : '#475569',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Danh sách xếp hạng ưu tiên</span>
                  <span style={{ fontSize: '12px', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>{rankedOrders.length} đơn</span>
                </div>
                
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {rankedOrders.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Không có đơn hàng</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>#Hạng</th>
                          <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Đơn hàng</th>
                          <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>TVBH</th>
                          <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Ngày cọc/tạo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankedOrders.map((order, idx) => (
                          <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: idx < 3 ? '#ef4444' : '#64748b', fontSize: '15px' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>{order.id}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>{order.customer}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{order.version} • {order.exterior}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>{order.staff}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} />
                                {(order.depositDate && order.depositDate !== 'Chưa có') ? order.depositDate : order.createdAt}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="primary-button" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
