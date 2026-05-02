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
  onJoinQueue: (vin: string) => void;
  onLeaveQueue: (vin: string) => void;
  onOpenExtensionModal: (vehicle: StockVehicle) => void;
  onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
  onShowDetails: (vehicle: StockVehicle) => void;
  onAdminEdit?: (vehicle: StockVehicle) => void;
  currentUser: string;
  isAdmin: boolean;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
  highlightedVins: Set<string>;
  processingVin: string | null;
  queuedVins: string[];
  canHoldMore: boolean;
  onViewCarOnMap?: (vin: string) => void;
}

const StockGridView: React.FC<StockGridViewProps> = (props) => {
  if (props.vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 w-full h-full bg-slate-50 rounded-2xl">
        <div className="relative w-24 h-24 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-6">
          <div className="absolute inset-0 border border-gray-200/60 rounded-full transform scale-110"></div>
          <div className="absolute inset-0 border border-gray-100 rounded-full transform scale-125"></div>
          <i className="fas fa-car-side text-gray-300 text-4xl"></i>
        </div>
        <h3 className="text-xl font-bold text-gray-600 mb-2 tracking-tight">Trống Không!</h3>
        <p className="text-sm text-gray-400 max-w-sm text-center">Không tìm thấy chiếc xe nào trong kho thỏa mãn tiêu chí của bạn. Hãy thử thay đổi bộ lọc nhé.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2">
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