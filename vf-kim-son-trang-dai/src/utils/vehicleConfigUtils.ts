import { VehicleConfigRow } from '../types';

export function parseVehicleConfigs(configs: VehicleConfigRow[]) {
  const vehicleLines = configs.filter(c => c.type === 'line').map(c => c.value);
  
  const versionsMap: Record<string, string[]> = {};
  vehicleLines.forEach(line => {
    versionsMap[line] = configs
      .filter(c => c.type === 'version' && c.parent_value === line)
      .map(c => c.value);
  });

  const defaultExteriors = configs.filter(c => c.type === 'exterior').map(c => c.value);
  const defaultInteriors = configs.filter(c => c.type === 'interior').map(c => c.value);

  // Fallbacks if empty
  if (vehicleLines.length === 0) vehicleLines.push('VF 5');
  if (Object.keys(versionsMap).length === 0) versionsMap['VF 5'] = ['Plus'];
  if (defaultExteriors.length === 0) defaultExteriors.push('Chưa có màu');
  if (defaultInteriors.length === 0) defaultInteriors.push('Chưa có nội thất');

  return {
    vehicleLines,
    versionsMap,
    defaultExteriors,
    defaultInteriors
  };
}
