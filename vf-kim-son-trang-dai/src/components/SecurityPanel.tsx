import React from 'react';
import {
  ShieldCheck,
  History,
  Archive,
  Download,
  LockKeyhole,
  Gauge,
  BadgeCheck,
  CheckCircle2
} from 'lucide-react';

export const SecurityPanel: React.FC = () => {
  const features = [
    ['Phân quyền vai trò', 'Chỉ còn Admin và TVBH để vận hành gọn hơn.', ShieldCheck],
    ['Audit Log tự động', 'Tự động lưu lại actor, timestamp, bảng dữ liệu thay đổi.', History],
    ['Hủy bỏ linh hoạt', 'Đánh dấu xóa mềm, bảo toàn lịch sử giao dịch.', Archive],
    ['Bảo vệ xuất dữ liệu', 'Chỉ Admin mới được quyền chiết xuất file Excel thông tin KH.', Download],
    ['Bảo mật luồng chốt', 'Đơn đã ghép và xuất hóa đơn được khóa cứng, hạn chế chỉnh sửa.', LockKeyhole],
    ['Hiệu năng cao', 'Kết nối WebSocket truyền dữ liệu chênh lệch, tối ưu băng thông.', Gauge]
  ] as const;

  return (
    <section className="security-layout">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Bảo mật & hiệu năng</p>
            <h2>Bảo mật dữ liệu chuẩn hóa</h2>
          </div>
          <BadgeCheck size={21} className="muted-icon" />
        </div>
        <div className="feature-grid">
          {features.map(([title, text, Icon]) => (
            <article className="feature-card" key={title}>
              <Icon size={22} />
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Chính sách bảo mật</p>
            <h2>Quy tắc vận hành hệ thống</h2>
          </div>
        </div>
        <div className="policy-list">
          <PolicyRow icon={CheckCircle2} text="Tự động thu hồi quyền truy cập trái phép." />
          <PolicyRow icon={CheckCircle2} text="Cơ chế tìm kiếm được tối ưu chỉ mục DB Indexes." />
          <PolicyRow icon={CheckCircle2} text="Dữ liệu giới hạn tải 200 đơn hàng gần nhất để tăng tốc màn hình." />
          <PolicyRow icon={CheckCircle2} text="Giữ xe tạm thời tự động hết hạn sau 24 giờ nếu không phát sinh ghép xe." />
          <PolicyRow icon={CheckCircle2} text="Kiểm soát quyền RLS (Row Level Security) cấp độ dòng trực tiếp trên Supabase." />
        </div>
      </div>
    </section>
  );
};

const PolicyRow: React.FC<{ icon: any; text: string }> = ({ icon: Icon, text }) => {
  return (
    <div className="policy-row">
      <Icon size={18} />
      <span>{text}</span>
    </div>
  );
};
