import React from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { InventoryItem, VehicleConfigRow } from '../../types';
import { parseVehicleConfigs } from '../../utils/vehicleConfigUtils';
import { stockTone } from '../../constants';

interface EditVehicleModalProps {
  vehicle: InventoryItem;
  vehicleConfigs: VehicleConfigRow[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (vin: string, updates: Partial<InventoryItem>) => Promise<boolean>;
}

export const EditVehicleModal: React.FC<EditVehicleModalProps> = ({
  vehicle,
  vehicleConfigs,
  isSubmitting,
  onClose,
  onSubmit
}) => {
  const { vehicleLines, versionsMap, defaultExteriors, defaultInteriors } = React.useMemo(
    () => parseVehicleConfigs(vehicleConfigs),
    [vehicleConfigs]
  );

  const [error, setError] = React.useState('');
  const [line, setLine] = React.useState(vehicle.line);
  const [version, setVersion] = React.useState(vehicle.version);
  const [exterior, setExterior] = React.useState(vehicle.exterior);
  const [interior, setInterior] = React.useState(vehicle.interior);
  const [engineNo, setEngineNo] = React.useState(vehicle.engineNo);
  const [maDms, setMaDms] = React.useState(vehicle.ma_dms || '');
  
  // Available options
  const versions = versionsMap[line] || [];
  const exteriors = defaultExteriors;
  const interiors = defaultInteriors;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line || !version || !exterior || !interior) {
      setError('Vui lòng điền đầy đủ Dòng xe, Phiên bản, Màu sắc.');
      return;
    }

    const success = await onSubmit(vehicle.vin, {
      line,
      version,
      exterior,
      interior,
      location: vehicle.location,
      engineNo,
      ma_dms: maDms
    });

    if (success) {
      onClose();
    } else {
      setError('Cập nhật thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#ffffff', zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Chỉnh sửa xe: <span style={{ color: '#0f766e' }}>{vehicle.vin}</span>
          </h2>
          <button type="button" onClick={onClose} disabled={isSubmitting} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '4px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertTriangle size={18} color="#ef4444" style={{ marginTop: '2px' }} />
              <p style={{ margin: 0, color: '#991b1b', fontSize: '14px', lineHeight: '1.4' }}>{error}</p>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Trạng thái (Không thể sửa)</label>
                <div className={stockTone[vehicle.status]} style={{ padding: '10px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: '1px solid #e2e8f0', color: '#334155' }}>
                  {vehicle.status}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Dòng xe <span style={{color: '#ef4444'}}>*</span></label>
              <select
                required
                value={line}
                onChange={(e) => {
                  setLine(e.target.value);
                  setVersion('');
                }}
                disabled={isSubmitting}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="">Chọn dòng xe</option>
                {vehicleLines.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Phiên bản <span style={{color: '#ef4444'}}>*</span></label>
              <select
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={!line || isSubmitting}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', backgroundColor: !line ? '#f8fafc' : '#fff' }}
              >
                <option value="">Chọn phiên bản</option>
                {versions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Ngoại thất <span style={{color: '#ef4444'}}>*</span></label>
              <select
                required
                value={exterior}
                onChange={(e) => setExterior(e.target.value)}
                disabled={isSubmitting}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="">Chọn màu ngoại thất</option>
                {exteriors.map((color: string) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Nội thất <span style={{color: '#ef4444'}}>*</span></label>
              <select
                required
                value={interior}
                onChange={(e) => setInterior(e.target.value)}
                disabled={isSubmitting}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="">Chọn màu nội thất</option>
                {interiors.map((color: string) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Mã DMS</label>
              <input
                type="text"
                value={maDms}
                onChange={(e) => setMaDms(e.target.value)}
                disabled={isSubmitting}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '10px 16px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
            >
              <Save size={16} />
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
