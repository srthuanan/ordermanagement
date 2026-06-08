import React from 'react';
import {
  Gauge,
  Clock3,
  Boxes,
  CheckCircle2,
  SlidersHorizontal,
  LockKeyhole,
  Archive,
  FileText,
  History,
  TrendingUp,
  AlertTriangle,
  User,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart as PieChartIcon, BarChart as BarChartIcon } from 'lucide-react';
import { Order, CarActivityRow, ProfileRow } from '../types';

interface DashboardProps {
  orders: Order[];
  availableStock: number;
  auditLogs: CarActivityRow[];
  currentProfile: ProfileRow | null;
  staffProfiles: ProfileRow[];
}

function formatActivityAction(log: CarActivityRow) {
  const actor = log.actor_name || 'Hệ thống';
  const orderPart = log.so_don_hang ? `đơn ${log.so_don_hang}` : '';
  const vinPart = log.vin ? `VIN ${log.vin}` : '';

  switch (log.action) {
    case 'hold':
      return <span><strong>{actor}</strong> đã giữ chỗ xe {vinPart}</span>;
    case 'release':
      return <span><strong>{actor}</strong> đã bỏ giữ chỗ xe {vinPart}</span>;
    case 'pair':
      return <span><strong>{actor}</strong> đã ghép {vinPart} vào {orderPart}</span>;
    case 'unpair':
      return <span><strong>{actor}</strong> đã hủy ghép {vinPart} khỏi {orderPart}</span>;
    case 'expire_hold':
      return <span style={{ color: 'var(--error-color)' }}><strong>Hệ thống</strong> tự động giải phóng xe {vinPart}</span>;
    case 'request_invoice':
      return <span><strong>{actor}</strong> đã tạo yêu cầu hóa đơn cho {orderPart}</span>;
    case 'finalize_invoice':
      return <span style={{ color: 'var(--success-color)' }}><strong>{actor}</strong> đã chốt xuất hóa đơn cho {orderPart}</span>;
    case 'cancel_order':
      return <span style={{ color: 'var(--error-color)' }}><strong>{actor}</strong> đã hủy đơn {orderPart}</span>;
    case 'queue_join':
      return <span><strong>{actor}</strong> đã đăng ký hàng chờ cho {vinPart}</span>;
    case 'queue_leave':
      return <span><strong>{actor}</strong> đã hủy hàng chờ cho {vinPart}</span>;
    case 'queue_prioritized':
      return <span style={{ color: 'var(--warning-color)' }}><strong>Hệ thống</strong> cấp ưu tiên 15 phút cho {vinPart}</span>;
    default:
      return <span><strong>{actor}</strong>: {log.detail || 'Thực hiện thao tác hệ thống'}</span>;
  }
}

function parseDateForDashboard(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isoCandidate = new Date(trimmed);
  if (!Number.isNaN(isoCandidate.getTime()) && /\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return isoCandidate;
  }
  const match1 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(trimmed);
  if (match1) return new Date(Number(match1[3]), Number(match1[2]) - 1, Number(match1[1]));
  const match2 = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (match2) return new Date(Number(match2[1]), Number(match2[2]) - 1, Number(match2[3]));
  return null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  availableStock,
  auditLogs,
  currentProfile,
  staffProfiles
}) => {
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === 'Chưa ghép').length;
  const pairedOrders = orders.filter((o) => o.status === 'Đã ghép').length;
  const invoicedOrders = orders.filter((o) => o.status === 'Đã xuất hóa đơn').length;
  const canceledOrders = orders.filter((o) => o.status === 'Đã hủy').length;
  const activeOrders = orders.filter((o) => !['Đã xuất hóa đơn', 'Đã hủy'].includes(o.status)).length;
  const pairingRate = totalOrders > 0 ? Math.round((pairedOrders / totalOrders) * 100) : 0;
  const pipelineFill = totalOrders > 0 ? Math.round(((pairedOrders + invoicedOrders) / totalOrders) * 100) : 0;
  const recentLogs = auditLogs.slice(0, 6);
  const currentDepartment = currentProfile?.department?.trim() || '';
  const isManagerView = currentProfile?.role === 'manager';
  const departmentSalesCount = isManagerView
    ? staffProfiles.filter(
        (staff) =>
          staff.role === 'sales' &&
          staff.manager_id === currentProfile.id
      ).length
    : 0;

  const modelDistribution = React.useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      const model = o.line || 'Khác';
      counts[model] = (counts[model] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [orders]);

  const pendingInsights = React.useMemo(() => {
    let oldPendingCount = 0;
    const now = new Date();
    const pendingOrders = orders.filter(o => o.status === 'Chưa ghép');
    const pendingByMonthMap: Record<string, { total: number, models: Record<string, number> }> = {};
    
    pendingOrders.forEach(o => {
      const dateStr = (o.depositDate && o.depositDate !== 'Chưa có') ? o.depositDate : o.createdAt;
      const d = parseDateForDashboard(dateStr);
      
      let monthKey = 'Chưa xác định';
      if (d) {
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const y = d.getFullYear();
        monthKey = `Tháng ${m}/${y}`;
        
        const diffTime = Math.abs(now.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 7) {
          oldPendingCount++;
        }
      }
      
      if (!pendingByMonthMap[monthKey]) {
        pendingByMonthMap[monthKey] = { total: 0, models: {} };
      }
      pendingByMonthMap[monthKey].total++;
      const model = o.line || 'Khác';
      pendingByMonthMap[monthKey].models[model] = (pendingByMonthMap[monthKey].models[model] || 0) + 1;
    });

    const pendingByMonth = Object.entries(pendingByMonthMap).map(([month, data]) => ({
      month,
      total: data.total,
      models: data.models
    })).sort((a, b) => {
      if (a.month === 'Chưa xác định') return 1;
      if (b.month === 'Chưa xác định') return -1;
      return b.month.localeCompare(a.month);
    });

    return { oldPendingCount, pendingByMonth };
  }, [orders]);

  const COLORS = ['#0f766e', '#0284c7', '#ea580c', '#eab308', '#8b5cf6', '#ec4899', '#64748b'];

  const salesLeaderboard = React.useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      const saleName = o.staff || 'Hệ thống';
      counts[saleName] = (counts[saleName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [orders]);

  const dynamicInsights = React.useMemo(() => {
    const insights = [];
    const pendingInvoices = orders.filter(o => o.status === 'Chờ phê duyệt' || o.status === 'Yêu cầu bổ sung').length;
    if (pendingInvoices > 0) {
      insights.push({ icon: FileText, title: 'Hóa đơn', text: `Có ${pendingInvoices} đơn hàng đang chờ duyệt.` });
    }
    
    const unmappedOrders = orders.filter(o => o.status === 'Chưa ghép').length;
    if (unmappedOrders > 0) {
      insights.push({ icon: Boxes, title: 'Ghép xe', text: `Có ${unmappedOrders} đơn hàng đang đợi ghép VIN.`, tone: 'warning' });
    }
    
    if (pendingInsights.oldPendingCount > 0) {
      insights.push({ 
        icon: AlertTriangle, 
        title: 'Tồn kho lâu', 
        text: `Có ${pendingInsights.oldPendingCount} đơn hàng chưa ghép đã chờ từ 7-10 ngày trở lên. Cần kiểm tra lại với TVBH.`,
        tone: 'error'
      });
    }

    if (availableStock < 5) {
      insights.push({ icon: Archive, title: 'Tồn kho', text: `Kho xe trống hiện chỉ còn ${availableStock} chiếc.` });
    }

    if (insights.length === 0) {
      insights.push({ icon: CheckCircle2, title: 'Tuyệt vời', text: 'Mọi hoạt động vận hành đều đang trơn tru.' });
    }
    return insights;
  }, [orders, availableStock, pendingInsights]);

  return (
    <div className="dashboard-shell">
      <section className="dashboard-hero dashboard-hero-compact">
        <div className="hero-mini-grid hero-mini-grid-compact" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <MiniStat label="Đơn đang hoạt động" value={activeOrders} icon={Gauge} tone="teal" />
          <MiniStat label="Tỷ lệ đã ghép" value={pairingRate} icon={CheckCircle2} tone="blue" suffix="%" />
          <MiniStat label="Xe trống" value={availableStock} icon={Boxes} tone="amber" />
        </div>
      </section>

      {isManagerView && (
        <section className="dashboard-band">
          <div className="dashboard-band-card dashboard-band-card-soft" style={{ gridColumn: '1 / -1' }}>
            <div className="dashboard-band-header">
              <div>
                <p className="eyebrow">Phòng ban hiện tại</p>
                <h3>{currentDepartment || 'Chưa xác định'}</h3>
              </div>
              <div className="hero-pill" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                TPKD
              </div>
            </div>

            <div className="hero-mini-grid hero-mini-grid-compact" style={{ marginTop: 0, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              <MiniStat label="Tổng đơn trong phòng" value={totalOrders} icon={Archive} tone="blue" />
              <MiniStat label="TVBH cùng phòng" value={departmentSalesCount} icon={User} tone="teal" />
              <MiniStat label="Chưa ghép" value={pendingOrders} icon={Clock3} tone="amber" />
              <MiniStat label="Đã xuất hóa đơn" value={invoicedOrders} icon={FileText} tone="blue" />
            </div>

            <div className="dashboard-footnote" style={{ marginTop: '0.9rem' }}>
              <TrendingUp size={16} />
              <span>Dữ liệu trong dashboard đang được lọc theo phòng ban của bạn.</span>
            </div>
          </div>
        </section>
      )}

      <section className="dashboard-band">
        <div className="dashboard-band-card">
          <div className="dashboard-band-header">
            <div>
              <p className="eyebrow">Luồng đơn</p>
              <h3>Trạng thái xử lý</h3>
            </div>
          </div>

          <div className="pipeline modern-pipeline">
            {[
              ['Chờ ghép xe', pendingOrders, 'pending'],
              ['Đã ghép xe', pairedOrders, 'preparing'],
              ['Đã xuất hóa đơn', invoicedOrders, 'done'],
              ['Đã hủy bỏ', canceledOrders, 'canceled']
            ].map(([label, count, className]) => {
              const percent = totalOrders > 0 ? Math.round((Number(count) / totalOrders) * 100) : 0;
              return (
                <div className="pipeline-step modern-step" key={String(label)}>
                  <div className="pipeline-step-top">
                    <span className={`dot ${className}`} />
                    <strong>{String(label)}</strong>
                  </div>
                  <small>{String(count)} đơn</small>
                  <div className="progress">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dashboard-footnote">
            <TrendingUp size={16} />
            <span>{pipelineFill}% pipeline đã đi qua bước ghép hoặc xuất hóa đơn.</span>
          </div>
        </div>

        <div className="dashboard-band-card dashboard-band-card-soft">
          <div className="dashboard-band-header">
            <div>
              <p className="eyebrow">Cảnh báo vận hành</p>
              <h3>Điểm cần chú ý</h3>
            </div>
            <AlertTriangle size={18} className="muted-icon" />
          </div>
          <div className="insight-list">
            {dynamicInsights.map((insight, idx) => (
              <InsightItem key={idx} icon={insight.icon} title={insight.title} text={insight.text} tone={(insight as any).tone} />
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-band" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="dashboard-band-card dashboard-band-card-soft">
          <div className="dashboard-band-header">
            <div>
              <p className="eyebrow">Phân tích</p>
              <h3>Tỷ trọng Dòng Xe</h3>
            </div>
            <PieChartIcon size={18} className="muted-icon" />
          </div>
          <div style={{ height: '220px', width: '100%', marginTop: '0.5rem', overflowY: 'auto' }}>
            <table className="compact-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px' }}>
                  <th style={{ padding: '8px', fontWeight: 500 }}>Dòng Xe</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500 }}>Số lượng</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500 }}>Tỷ trọng</th>
                </tr>
              </thead>
              <tbody>
                {modelDistribution.map((entry, index) => {
                  const percentage = orders.length > 0 ? ((entry.value / orders.length) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                      <td style={{ padding: '8px', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
                          {entry.name}
                        </div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{entry.value}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{percentage}%</td>
                    </tr>
                  );
                })}
                {modelDistribution.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-band-card dashboard-band-card-soft" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="dashboard-band-header">
            <div>
              <p className="eyebrow">Phân tích</p>
              <h3>Đơn tồn theo tháng</h3>
            </div>
            <Clock3 size={18} className="muted-icon" />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', marginTop: '0.5rem', paddingRight: '4px' }}>
            {pendingInsights.pendingByMonth.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Không có đơn chưa ghép</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingInsights.pendingByMonth.map((item, idx) => (
                  <details key={idx} style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <summary style={{ padding: '10px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
                      <span>{item.month}</span>
                      <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '999px', fontSize: '11px' }}>{item.total} đơn</span>
                    </summary>
                    <div style={{ padding: '0 12px 12px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.entries(item.models).sort((a,b) => b[1] - a[1]).map(([model, count], mIdx) => (
                        <div key={mIdx} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#334155', fontWeight: 500 }}>
                          {model}: <span style={{ color: '#ef4444' }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-band-card dashboard-band-card-soft">
          <div className="dashboard-band-header">
            <div>
              <p className="eyebrow">Phân tích</p>
              <h3>Top Nhân Viên (Sales)</h3>
            </div>
            <BarChartIcon size={18} className="muted-icon" />
          </div>
          <div style={{ height: '220px', width: '100%', marginTop: '0.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salesLeaderboard}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={130}
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [`${value} đơn`, 'Thành tích']}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={16}>
                  {salesLeaderboard.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="dashboard-lower dashboard-lower-wide">
        <div className="dashboard-card dashboard-card-wide">
          <div className="dashboard-card-header">
            <div>
              <p className="eyebrow">Nhật ký</p>
              <h3>Hoạt động gần đây</h3>
            </div>
            <History size={18} className="muted-icon" />
          </div>
          <div className="activity-feed">
            {recentLogs.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                Chưa có giao dịch gần đây.
              </div>
            ) : (
              recentLogs.map((log, index) => {
                let dateStr = 'N/A';
                try {
                  dateStr = new Intl.DateTimeFormat('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    day: '2-digit',
                    month: '2-digit'
                  }).format(new Date(log.created_at));
                } catch (e) {}
                return (
                  <div className="activity-row" key={log.id}>
                    <span className="activity-index">#{recentLogs.length - index}</span>
                    <div className="activity-copy">
                      <p>{formatActivityAction(log)}</p>
                      <small>{dateStr}</small>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

function Metric({
  title,
  value,
  icon: Icon,
  tone
}: {
  title: string;
  value: string;
  icon: any;
  tone: string;
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={24} />
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
  suffix = ''
}: {
  label: string;
  value: number;
  icon: any;
  tone: string;
  suffix?: string;
}) {
  return (
    <div className={`mini-stat mini-stat-${tone}`}>
      <Icon size={16} />
      <div>
        <strong>{value}{suffix}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function InsightItem({
  icon: Icon,
  title,
  text,
  tone
}: {
  icon: any;
  title: string;
  text: string;
  tone?: 'error' | 'warning' | 'success';
}) {
  return (
    <article className={`insight-item ${tone ? 'insight-item-' + tone : ''}`}>
      <Icon size={18} style={{ color: tone === 'error' ? 'var(--error-color)' : tone === 'warning' ? 'var(--warning-color)' : 'inherit' }} />
      <div>
        <strong style={{ color: tone === 'error' ? 'var(--error-color)' : tone === 'warning' ? 'var(--warning-color)' : 'inherit' }}>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}
