import React from 'react';
import { Search, X, CheckSquare, AlertTriangle } from 'lucide-react';
import * as apiService from '../../services/apiService';
import { SalesPolicyRow } from '../../types';

interface SelectPolicyModalProps {
  orderId: string;
  orderLine: string;
  currentPolicy: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (orderId: string, policy: string) => Promise<boolean>;
}

export const SelectPolicyModal: React.FC<SelectPolicyModalProps> = ({
  orderId,
  orderLine,
  currentPolicy,
  isSubmitting,
  onClose,
  onSubmit
}) => {
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [error, setError] = React.useState('');
  const [rows, setRows] = React.useState<SalesPolicyRow[]>([]);
  const [selected, setSelected] = React.useState<string[]>(
    (currentPolicy || '')
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean)
  );

  React.useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: fetchError } = await apiService.getSalesPolicies();
      if (!active) return;
      setRows(data || []);
      setError(fetchError ? 'Không đọc được bảng chính sách, đang dùng danh sách dự phòng.' : '');
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const filteredRows = React.useMemo(() => {
    const orderLineNorm = orderLine.toLowerCase().trim();
    const queryNorm = query.toLowerCase().trim();

    return rows.filter((item) => {
      const name = (item.ten_chinh_sach || '').toLowerCase();
      const line = (item.dong_xe || '').toLowerCase();

      const matchesQuery = !queryNorm || name.includes(queryNorm) || line.includes(queryNorm);
      if (!matchesQuery) return false;

      if (!line || line.includes('tất cả') || line.includes('all')) return true;
      return line.includes(orderLineNorm) || orderLineNorm.includes(line);
    });
  }, [rows, query, orderLine]);

  const selectedCount = selected.length;

  function togglePolicy(name: string) {
    setSelected((prev) => (
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    ));
  }

  async function handleApply() {
    if (selectedCount === 0) {
      setError('Vui lòng chọn ít nhất 1 chính sách.');
      return;
    }

    setError('');
    const ok = await onSubmit(orderId, selected.join('; '));
    if (ok) onClose();
    else setError('Không thể cập nhật chính sách cho đơn hàng.');
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Chính sách bán hàng</p>
            <h2>Chọn chính sách cho {orderId}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <div className="order-form">
          <label className="field-label">
            Tìm kiếm chính sách
          </label>
          <label className="full-span search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm chính sách theo tên hoặc dòng xe..."
            />
          </label>

          <div className="full-span dropdown-list" style={{ display: 'block', position: 'static', maxHeight: 320, border: '1px solid #d7e0ea', boxShadow: 'none' }}>
            {loading ? (
              <div style={{ padding: '1rem', color: '#64748b', textAlign: 'center', fontSize: '13px' }}>Đang tải danh sách chính sách...</div>
            ) : filteredRows.length === 0 ? (
              <div style={{ padding: '1rem', color: '#64748b', textAlign: 'center', fontSize: '13px' }}>Không có chính sách phù hợp.</div>
            ) : (
              filteredRows.map((item) => {
                const checked = selected.includes(item.ten_chinh_sach);
                return (
                  <label key={item.ten_chinh_sach}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePolicy(item.ten_chinh_sach)}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '13px', color: '#111827' }}>{item.ten_chinh_sach}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Áp dụng: {item.dong_xe || 'Tất cả'}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {error ? (
            <div className="form-error full-span">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button type="button" className="primary-button" onClick={handleApply} disabled={isSubmitting || selectedCount === 0}>
              <CheckSquare size={18} />
              <span>{isSubmitting ? 'Đang lưu...' : `Áp dụng (${selectedCount})`}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
