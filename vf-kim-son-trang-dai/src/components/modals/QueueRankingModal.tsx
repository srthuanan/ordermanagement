import React, { useMemo, useState } from 'react';
import { X, Trophy, Clock, Search, Car, ChevronRight } from 'lucide-react';
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
  
  // Nhóm theo Cấu hình (Dòng xe + Phiên bản + Màu ngoại thất + Màu nội thất)
  const configGroups = useMemo(() => {
    const map = new Map<string, {
      id: string;
      line: string;
      version: string;
      exterior: string;
      interior: string;
      orders: Order[];
    }>();
    
    pendingOrders.forEach(o => {
      const line = o.line || 'Khác';
      const version = o.version || 'Khác';
      const exterior = o.exterior || 'Khác';
      const interior = o.interior || 'Khác';
      
      const configId = `${line}|${version}|${exterior}|${interior}`;
      if (!map.has(configId)) {
        map.set(configId, {
          id: configId,
          line,
          version,
          exterior,
          interior,
          orders: []
        });
      }
      map.get(configId)!.orders.push(o);
    });
    
    // Sort groups by demand (highest orders first), then by line name
    return Array.from(map.values()).sort((a, b) => {
      if (b.orders.length !== a.orders.length) {
        return b.orders.length - a.orders.length;
      }
      return a.line.localeCompare(b.line);
    });
  }, [pendingOrders]);

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  const selectedGroup = useMemo(() => {
    if (!selectedConfigId) return null;
    return configGroups.find(g => g.id === selectedConfigId) || null;
  }, [configGroups, selectedConfigId]);

  const rankedOrders = useMemo(() => {
    if (!selectedGroup) return [];
    return [...selectedGroup.orders].sort((a, b) => {
      const timeA = parseSortDate(a.depositDate) || parseSortDate(a.createdAt);
      const timeB = parseSortDate(b.depositDate) || parseSortDate(b.createdAt);
      return timeA - timeB;
    });
  }, [selectedGroup]);

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal detail-modal" role="dialog" aria-modal="true" style={{ width: 'min(1000px, 100vw)' }}>
        <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <Trophy size={22} />
            </div>
            <div>
              <p className="eyebrow">Thống kê nhu cầu & Xếp hạng</p>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Thứ tự chờ ghép xe</h2>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 160px)', padding: '24px', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '20px', height: '100%', minHeight: 0 }}>
            {/* Left Column: List of Configurations */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                <span>Cấu hình đang chờ</span>
                <span style={{ color: '#ef4444', background: '#fee2e2', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{pendingOrders.length} đơn</span>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
                {configGroups.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    Không có đơn hàng nào đang chờ ghép xe.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {configGroups.map(g => {
                      const isSelected = selectedConfigId === g.id;
                      return (
                        <div
                          key={g.id}
                          onClick={() => setSelectedConfigId(g.id)}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                            background: isSelected ? '#eff6ff' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc' }}
                          onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'white' }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: isSelected ? '#1d4ed8' : '#0f172a', fontSize: '14px' }}>
                              {g.line} <span style={{ color: isSelected ? '#3b82f6' : '#64748b', fontWeight: 400 }}>• {g.version}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                              Ngoại thất: <strong style={{ color: '#475569' }}>{g.exterior}</strong> - Nội thất: <strong style={{ color: '#475569' }}>{g.interior}</strong>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px', color: isSelected ? '#1d4ed8' : '#334155' }}>{g.orders.length}</span>
                            <ChevronRight size={16} color={isSelected ? '#3b82f6' : '#cbd5e1'} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Ranked Orders */}
            <div style={{ flex: '1.5', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', overflow: 'hidden' }}>
              {!selectedGroup ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '12px' }}>
                  <Car size={40} style={{ opacity: 0.5 }} />
                  <span style={{ fontSize: '14px' }}>Chọn một cấu hình bên trái để xem hàng đợi chi tiết.</span>
                </div>
              ) : (
                <>
                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>Thứ tự ưu tiên ghép</span>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>{selectedGroup.line} • {selectedGroup.version}</span>
                    </div>
                    <span style={{ color: '#0f766e', background: '#ccfbf1', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{rankedOrders.length} đơn</span>
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Hạng</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Mã / Khách hàng</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>TVBH</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Ngày chờ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankedOrders.map((order, idx) => (
                          <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: idx < 3 ? '#ef4444' : '#64748b', fontSize: '15px' }}>
                              #{idx + 1}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{order.id}</div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>{order.customer}</div>
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 500, color: '#334155' }}>
                              {order.staff}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={14} />
                                {(order.depositDate && order.depositDate !== 'Chưa có') ? order.depositDate : order.createdAt}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="panel-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="primary-button" onClick={onClose}>
            Đóng
          </button>
        </div>
      </section>
    </div>
  );
};
