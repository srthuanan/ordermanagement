import React, { useState } from 'react';
import { Settings, Plus, Trash2, Car, PaintBucket, Armchair, GitBranch } from 'lucide-react';
import { VehicleConfigRow } from '../types';
import * as apiService from '../services/apiService';

interface SettingsPanelProps {
  configs: VehicleConfigRow[];
  onRefresh: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ configs, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'lines' | 'exteriors' | 'interiors'>('lines');
  
  const [newLine, setNewLine] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [newVersion, setNewVersion] = useState('');
  
  const [newExterior, setNewExterior] = useState('');
  const [newInterior, setNewInterior] = useState('');

  const lines = configs.filter(c => c.type === 'line').sort((a, b) => a.value.localeCompare(b.value));
  const versions = configs.filter(c => c.type === 'version' && c.parent_value === selectedLine).sort((a, b) => a.value.localeCompare(b.value));
  const exteriors = configs.filter(c => c.type === 'exterior').sort((a, b) => a.value.localeCompare(b.value));
  const interiors = configs.filter(c => c.type === 'interior').sort((a, b) => a.value.localeCompare(b.value));

  // Set default selected line
  React.useEffect(() => {
    if (lines.length > 0 && !selectedLine) {
      setSelectedLine(lines[0].value);
    }
  }, [lines, selectedLine]);

  const handleAddLine = async () => {
    const val = newLine.trim();
    if (!val) return;
    if (lines.some(l => l.value.toLowerCase() === val.toLowerCase())) {
      alert('Dòng xe đã tồn tại!');
      return;
    }
    const { error } = await apiService.createVehicleConfig({ type: 'line', value: val, parent_value: null });
    if (error) {
      alert(`Lỗi thêm dòng xe: ${error.message}`);
      return;
    }
    setNewLine('');
    setSelectedLine(val);
    onRefresh();
  };

  const handleAddVersion = async () => {
    const val = newVersion.trim();
    if (!val || !selectedLine) return;
    if (versions.some(v => v.value.toLowerCase() === val.toLowerCase())) {
      alert('Phiên bản đã tồn tại cho dòng xe này!');
      return;
    }
    const { error } = await apiService.createVehicleConfig({ type: 'version', value: val, parent_value: selectedLine });
    if (error) {
      alert(`Lỗi thêm phiên bản: ${error.message}`);
      return;
    }
    setNewVersion('');
    onRefresh();
  };

  const handleAddExterior = async () => {
    const val = newExterior.trim();
    if (!val) return;
    if (exteriors.some(c => c.value.toLowerCase() === val.toLowerCase())) {
      alert('Màu ngoại thất đã tồn tại!');
      return;
    }
    const { error } = await apiService.createVehicleConfig({ type: 'exterior', value: val, parent_value: null });
    if (error) {
      alert(`Lỗi thêm màu ngoại thất: ${error.message}`);
      return;
    }
    setNewExterior('');
    onRefresh();
  };

  const handleAddInterior = async () => {
    const val = newInterior.trim();
    if (!val) return;
    if (interiors.some(c => c.value.toLowerCase() === val.toLowerCase())) {
      alert('Màu nội thất đã tồn tại!');
      return;
    }
    const { error } = await apiService.createVehicleConfig({ type: 'interior', value: val, parent_value: null });
    if (error) {
      alert(`Lỗi thêm màu nội thất: ${error.message}`);
      return;
    }
    setNewInterior('');
    onRefresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${name}"?`)) {
      const { error } = await apiService.deleteVehicleConfig(id);
      if (error) {
        alert(`Lỗi xóa: ${error.message}`);
        return;
      }
      onRefresh();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', padding: '20px', gap: '20px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Settings size={28} className="text-primary" />
        <h1 style={{ fontSize: '24px', color: '#0f172a', margin: 0, fontWeight: 700 }}>Cấu hình hệ thống</h1>
      </div>

      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <button
          className={activeSubTab === 'lines' ? 'primary-button' : 'ghost-button'}
          onClick={() => setActiveSubTab('lines')}
        >
          <Car size={18} /> Dòng xe & Phiên bản
        </button>
        <button
          className={activeSubTab === 'exteriors' ? 'primary-button' : 'ghost-button'}
          onClick={() => setActiveSubTab('exteriors')}
        >
          <PaintBucket size={18} /> Màu ngoại thất
        </button>
        <button
          className={activeSubTab === 'interiors' ? 'primary-button' : 'ghost-button'}
          onClick={() => setActiveSubTab('interiors')}
        >
          <Armchair size={18} /> Màu nội thất
        </button>
      </div>

      {activeSubTab === 'lines' && (
        <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
          {/* Cột Dòng xe */}
          <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Car size={18} /> Dòng xe</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="Tên dòng xe (VD: VF 5)..." 
                value={newLine} 
                onChange={(e) => setNewLine(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <button className="primary-button" onClick={handleAddLine} disabled={!newLine.trim()}>Thêm</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {lines.map(line => (
                <div 
                  key={line.id} 
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '10px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                    background: selectedLine === line.value ? '#f0fdf4' : 'transparent',
                    borderLeft: selectedLine === line.value ? '3px solid #16a34a' : '3px solid transparent'
                  }}
                  onClick={() => setSelectedLine(line.value)}
                >
                  <span style={{ fontWeight: selectedLine === line.value ? 700 : 500 }}>{line.value}</span>
                  <button className="icon-button" style={{ color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); handleDelete(line.id, line.value); }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cột Phiên bản */}
          <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitBranch size={18} /> Phiên bản của {selectedLine || '...'}
            </h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="Tên phiên bản (VD: Plus)..." 
                value={newVersion} 
                onChange={(e) => setNewVersion(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddVersion()}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                disabled={!selectedLine}
              />
              <button className="primary-button" onClick={handleAddVersion} disabled={!newVersion.trim() || !selectedLine}>Thêm</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {versions.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>Chưa có phiên bản nào.</p>
              ) : (
                versions.map(version => (
                  <div key={version.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                    <span>{version.value}</span>
                    <button className="icon-button" style={{ color: '#ef4444' }} onClick={() => handleDelete(version.id, version.value)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'exteriors' && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><PaintBucket size={18} /> Danh sách Màu Ngoại thất</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', maxWidth: '500px' }}>
            <input 
              type="text" 
              placeholder="VD: Trắng Brahminy (CE18)" 
              value={newExterior} 
              onChange={(e) => setNewExterior(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddExterior()}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button className="primary-button" onClick={handleAddExterior} disabled={!newExterior.trim()}>Thêm mới</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px', alignContent: 'start' }}>
            {exteriors.map(ext => (
              <div key={ext.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 500, color: '#334155' }}>{ext.value}</span>
                <button className="icon-button" style={{ color: '#ef4444' }} onClick={() => handleDelete(ext.id, ext.value)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'interiors' && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Armchair size={18} /> Danh sách Màu Nội thất</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', maxWidth: '500px' }}>
            <input 
              type="text" 
              placeholder="VD: Đen" 
              value={newInterior} 
              onChange={(e) => setNewInterior(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddInterior()}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button className="primary-button" onClick={handleAddInterior} disabled={!newInterior.trim()}>Thêm mới</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px', alignContent: 'start' }}>
            {interiors.map(int => (
              <div key={int.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 500, color: '#334155' }}>{int.value}</span>
                <button className="icon-button" style={{ color: '#ef4444' }} onClick={() => handleDelete(int.id, int.value)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
