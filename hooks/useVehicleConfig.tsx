import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getVehicleConfigs } from '../services/api/vehicleConfigService';
import { versionsMap as defaultVersionsMap, allPossibleVersions as defaultAllVersions, defaultExteriors, defaultInteriors } from '../constants';

const defaultLines = Object.keys(defaultVersionsMap);

interface VehicleConfigContextProps {
    versionsMap: Record<string, string[]>;
    allPossibleVersions: string[];
    vehicleLines: string[];
    vehicleColors: string[];
    vehicleInteriors: string[];
    isLoading: boolean;
    refreshConfigs: () => Promise<void>;
}

const defaultContext: VehicleConfigContextProps = {
    versionsMap: defaultVersionsMap,
    allPossibleVersions: defaultAllVersions,
    vehicleLines: defaultLines,
    vehicleColors: defaultExteriors,
    vehicleInteriors: defaultInteriors,
    isLoading: true,
    refreshConfigs: async () => {},
};

const VehicleConfigContext = createContext<VehicleConfigContextProps>(defaultContext);

export const VehicleConfigProvider = ({ children }: { children: ReactNode }) => {
    const [configs, setConfigs] = useState<VehicleConfigContextProps>(defaultContext);

    const loadConfigs = async () => {
        const res = await getVehicleConfigs();
        if (res.status === 'SUCCESS' && res.data && res.data.length > 0) {
            const data = res.data;
            const lines = data.filter((c: any) => c.type === 'line').map((c: any) => c.value);
            const versionsMap: Record<string, string[]> = {};
            const allPossibleVersions = data.filter((c: any) => c.type === 'version').map((c: any) => c.value);
            const vehicleColors = data.filter((c: any) => c.type === 'exterior').map((c: any) => c.value);
            const vehicleInteriors = data.filter((c: any) => c.type === 'interior').map((c: any) => c.value);
            
            lines.forEach((line: string) => {
                versionsMap[line] = data.filter((c: any) => c.type === 'version' && c.parent_value === line).map((c: any) => c.value);
            });

            setConfigs({
                versionsMap,
                allPossibleVersions,
                vehicleLines: lines,
                vehicleColors,
                vehicleInteriors,
                isLoading: false,
                refreshConfigs: loadConfigs,
            });
        } else {
            // Fallback to defaults if DB is empty or fails
            setConfigs(prev => ({ ...prev, isLoading: false }));
        }
    };

    useEffect(() => {
        loadConfigs();
    }, []);

    return (
        <VehicleConfigContext.Provider value={configs}>
            {children}
        </VehicleConfigContext.Provider>
    );
};

export const useVehicleConfig = () => useContext(VehicleConfigContext);
