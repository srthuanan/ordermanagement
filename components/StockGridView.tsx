import React from 'react';
import { StockVehicle, StockSortConfig } from '../types';
import StockCard from './StockCard';

interface StockGridViewProps {
  vehicles: StockVehicle[];
  sortConfig: StockSortConfig | null;
  onSort: (key: keyof StockVehicle) => void;
  startIndex: number;
  onHoldCar: (vin: string) => void;
  onReleaseCar: (vin: string) => void;
  onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
  onShowDetails: (vehicle: StockVehicle) => void;
  currentUser: string;
  isAdmin: boolean;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
  highlightedVins: Set<string>;
  processingVin: string | null;
}

const StockGridView: React.FC<StockGridViewProps> = (props) => {
  if (props.vehicles.length === 0) {
    return (
      <div className="text-center py-16 text-text-secondary">
        <i className="fas fa-box-open fa-3x mb-4 text-text-placeholder"></i>
        <p className="font-semibold text-text-primary">Không tìm thấy xe nào trong kho.</p>
        <p className="text-sm">Hãy thử thay đổi bộ lọc hoặc kiểm tra lại sau.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
      {props.vehicles.map((vehicle) => (
        <StockCard
          key={vehicle.VIN}
          vehicle={vehicle}
          {...props}
        />
      ))}
    </div>
  );
};

export default StockGridView;