import { Order, InventoryItem } from '../types';

export function matchesVehicleConfig(order: Order, item: InventoryItem) {
  return (
    order.line === item.line &&
    order.version === item.version &&
    order.exterior === item.exterior &&
    order.interior === item.interior
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
