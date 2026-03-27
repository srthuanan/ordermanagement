import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  iconOnly?: boolean;
}

const getStatusInfo = (statusText: string): { className: string, icon: string, pulse: boolean } => {
  if (!statusText || typeof statusText !== 'string') {
    return { className: 'status-default', icon: 'help', pulse: false };
  }
  const lowerStatus = statusText.toLowerCase().trim().normalize('NFC');

  switch (lowerStatus) {
    // Negative
    case 'đã hủy': case 'đã hủy (ui)': return { className: 'status-da-huy', icon: 'do_not_disturb_on', pulse: false };
    case 'từ chối ycvc': return { className: 'status-tu-choi-ycvc', icon: 'block', pulse: false };

    // Pending / Waiting
    case 'chưa ghép': case 'chưa tìm thấy vin': return { className: 'status-chua-ghep', icon: 'electric_car', pulse: false };
    case 'chờ phê duyệt': return { className: 'status-cho-phe-duyet', icon: 'assignment_late', pulse: false };
    case 'chờ ký hóa đơn': case 'chờ ký hóa đơn': return { className: 'status-cho-ky-hoa-don', icon: 'signature', pulse: false };
    case 'chờ duyệt ycvc': return { className: 'status-cho-duyet-ycvc', icon: 'manage_history', pulse: false };
    case 'chờ check-in': return { className: 'status-cho-check-in', icon: 'event_available', pulse: false };

    // Action Required
    case 'yêu cầu bổ sung': return { className: 'status-yeu-cau-bo-sung', icon: 'report_problem', pulse: true };
    case 'chờ xác thực vc (tvbh)': return { className: 'status-cho-xac-thuc-vc', icon: 'report_problem', pulse: true };

    // In Progress
    case 'đang giữ': return { className: 'status-dang-giu', icon: 'lock_person', pulse: false };
    case 'đang lái thử': return { className: 'status-dang-lai-thu', icon: 'minor_crash', pulse: false };
    case 'đã ghép': return { className: 'status-da-ghep', icon: 'vpn_key', pulse: false };

    // Positive / Completed
    case 'đã bổ sung': return { className: 'status-da-bo-sung', icon: 'add_task', pulse: false };
    case 'đã phê duyệt': return { className: 'status-da-phe-duyet', icon: 'verified', pulse: false };
    case 'đã xuất hóa đơn': return { className: 'status-da-xuat-hoa-don', icon: 'receipt_long', pulse: false };
    case 'yêu cầu vinclub': return { className: 'status-yeu-cau-vinclub', icon: 'loyalty', pulse: false };
    case 'đã có vc': return { className: 'status-da-co-vc', icon: 'confirmation_number', pulse: false };
    case 'đã hoàn tất': return { className: 'status-da-hoan-tat', icon: 'flag_circle', pulse: false };

    // Car Inquiry Statuses
    case 'đang chờ': return { className: 'status-cho-phe-duyet', icon: 'hourglass_empty', pulse: false };
    case 'admin đang check': return { className: 'status-cho-phe-duyet', icon: 'manage_search', pulse: true };
    case 'đã tìm thấy': return { className: 'status-da-phe-duyet', icon: 'check_circle', pulse: false };
    case 'admin phản hồi': return { className: 'status-da-bo-sung', icon: 'quick_phrases', pulse: false };
    case 'đã giữ xe': return { className: 'status-dang-giu', icon: 'lock_person', pulse: false };

    // New VC Statuses
    case 'chờ duyệt vc': return { className: 'status-cho-duyet-vc', icon: 'manage_history', pulse: true };
    case 'đã cấp vc': return { className: 'status-da-cap-vc', icon: 'verified', pulse: false };
    case 'từ chối vc': return { className: 'status-tu-choi-vc', icon: 'cancel', pulse: false };

    default:
      if (lowerStatus.startsWith('vpas') || /^[a-z0-9]{17}$/.test(lowerStatus)) {
        return { className: 'status-san-sang', icon: 'directions_car', pulse: false };
      }
      return { className: 'status-default', icon: 'help_center', pulse: false };
  }
};


const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', iconOnly = false }) => {
  const { className, icon, pulse } = getStatusInfo(status);

  if (iconOnly) {
    return (
      <div className={`status-badge ${className} ${pulse ? 'pulse-icon' : ''} flex items-center justify-center rounded-lg w-8 h-8 p-0 shadow-sm border border-white/20`} title={status}>
        <span className="material-symbols-outlined text-[20px] leading-none">{icon}</span>
      </div>
    );
  }

  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : '';

  return (
    <div className={`status-badge ${className} ${pulse ? 'pulse-icon' : ''} ${sizeClass}`} title={status}>
      <span className="badge-icon flex items-center">
        <span className="material-symbols-outlined text-[14px] leading-none">{icon}</span>
      </span>
      <span className="badge-text truncate">{status}</span>
    </div>
  );
};

export default React.memo(StatusBadge);