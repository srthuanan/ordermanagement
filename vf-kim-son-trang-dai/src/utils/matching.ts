import { Order, InventoryItem } from '../types';

export function matchesVehicleConfig(order: Order, item: InventoryItem) {
  const norm = (str: string | undefined | null) => (str || '').trim().toLowerCase();
  
  return (
    norm(order.line) === norm(item.line) &&
    norm(order.version) === norm(item.version) &&
    norm(order.exterior) === norm(item.exterior) &&
    norm(order.interior) === norm(item.interior)
  );
}

export function canUseVehicleForPair(
  item: InventoryItem,
  currentUsername: string,
  canOverrideHeldVehicle: boolean
) {
  if (item.status === 'Đã ghép') {
    return false;
  }

  if (item.status === 'Chưa ghép') {
    return true;
  }

  // Trạng thái là Đang giữ: cho phép nếu có quyền ghi đè, hoặc chính người giữ muốn ghép
  return canOverrideHeldVehicle || item.holderUsername === currentUsername;
}
