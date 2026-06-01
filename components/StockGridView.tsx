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
  isReferenceAccount?: boolean;
}

import { useNightMode } from '../hooks/useNightMode';

const StockGridView: React.FC<StockGridViewProps> = (props) => {
  const isNight = useNightMode();

  if (props.vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 w-full h-full">
        <div className="text-6xl mb-6 drop-shadow-md animate-bounce" style={{ animationDuration: '2s' }}>🏖️</div>
        <h3 className={`text-xl font-bold mb-2 tracking-tight ${isNight ? 'text-slate-200' : 'text-gray-700'}`}>Không có xe nào ở đây!</h3>
        <p className={`text-sm max-w-sm text-center ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
          Tất cả xe đã được bán hết hoặc bộ lọc của bạn quá khắt khe. Hãy thử đổi bộ lọc rồi ra biển dạo chơi nhé!
        </p>
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