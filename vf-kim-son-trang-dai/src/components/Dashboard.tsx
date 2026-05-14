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
  AlertTriangle
} from 'lucide-react';
import { Order, CarActivityRow } from '../types';

interface DashboardProps {
  orders: Order[];
  availableStock: number;
  auditLogs: CarActivityRow[];
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

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  availableStock,
  auditLogs
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

  return (
    <div className="dashboard-shell">
      <section className="dashboard-hero dashboard-hero-compact">

        <div className="hero-mini-grid hero-mini-grid-compact">
          <MiniStat label="Đơn đang hoạt động" value={activeOrders} icon={Gauge} tone="teal" />
          <MiniStat label="Tỷ lệ đã ghép" value={pairingRate} icon={CheckCircle2} tone="blue" suffix="%" />
          <MiniStat label="Xe trống" value={availableStock} icon={Boxes} tone="amber" />
        </div>
      </section>

      <section className="dashboard-band">
        <div className="dashboard-band-card">
          <div className="dashboard-band-header">
            <div>
              <p className="eyebrow">Luồng đơn</p>
              <h3>Trạng thái xử lý</h3>
            </div>
            <button className="ghost-button" type="button">
              <SlidersHorizontal size={17} />
              <span>Tùy chỉnh</span>
            </button>
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
            <InsightItem icon={LockKeyhole} title="Truy cập" text="RLS khóa dữ liệu theo quyền hệ thống." />
            <InsightItem icon={Archive} title="Giữ xe" text="Xe quá hạn được cron tự trả về kho." />
            <InsightItem icon={FileText} title="Ghép xe" text="Ghép VIN đi qua RPC để tránh ghi đè." />
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
  text
}: {
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <article className="insight-item">
      <Icon size={18} />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}
