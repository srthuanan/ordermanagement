import React from 'react';
import { StockVehicle } from '../types';
import StockCard from './StockCard';

interface StockGridViewProps {
  vehicles: StockVehicle[];
  onHoldCar: (vin: string) => void;
  onReleaseCar: (vin: string) => void;
  onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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
