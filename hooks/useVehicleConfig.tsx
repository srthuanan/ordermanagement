import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getVehicleConfigs } from '../services/api/vehicleConfigService';
import { getAvailableExteriors, getAvailableInteriors } from '../constants';
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
    getMappedExteriors: (line: string, version?: string) => string[];
    getMappedInteriors: (line: string, version?: string) => string[];
    getAllExteriorsForLine: (line: string) => string[];
    getAllInteriorsForLine: (line: string) => string[];
    rawColorMappings: any[];
}

const defaultContext: VehicleConfigContextProps = {
    versionsMap: defaultVersionsMap,
    allPossibleVersions: defaultAllVersions,
    vehicleLines: defaultLines,
    vehicleColors: defaultExteriors,
    vehicleInteriors: defaultInteriors,
    isLoading: true,
    refreshConfigs: async () => {},
    getMappedExteriors: () => defaultExteriors,
    getMappedInteriors: () => defaultInteriors,
    getAllExteriorsForLine: () => defaultExteriors,
    getAllInteriorsForLine: () => defaultInteriors,
    rawColorMappings: [],
};

const VehicleConfigContext = createContext<VehicleConfigContextProps>(defaultContext);

export const VehicleConfigProvider = ({ children }: { children: ReactNode }) => {
    const [configs, setConfigs] = useState<VehicleConfigContextProps>(defaultContext);

    const loadConfigs = async () => {
        const res = await getVehicleConfigs();
        if (res.status === 'SUCCESS' && res.data && res.data.length > 0) {
            const data = res.data;
            const lines = Array.from(new Set(data.filter((c: any) => c.type === 'line').map((c: any) => c.value as string)));
            const versionsMap: Record<string, string[]> = {};
            const allPossibleVersions = Array.from(new Set(data.filter((c: any) => c.type === 'version').map((c: any) => c.value as string)));
            const vehicleColors = Array.from(new Set(data.filter((c: any) => c.type === 'exterior').map((c: any) => c.value as string)));
            const vehicleInteriors = Array.from(new Set(data.filter((c: any) => c.type === 'interior').map((c: any) => c.value as string)));
            
            lines.forEach((line: string) => {
                versionsMap[line] = data.filter((c: any) => c.type === 'version' && c.parent_value === line).map((c: any) => c.value);
            });

            const rawColorMappings = data.filter((c: any) => c.parent_value !== null && (c.type === 'exterior' || c.type === 'interior'));

            const getMappedExteriors = (line: string, version?: string) => {
                if (!line) return vehicleColors;
                const parentExact = version ? `${line}___${version}`.toLowerCase().trim() : line.toLowerCase().trim();
                const parentLine = line.toLowerCase().trim();
                
                let matches = rawColorMappings.filter((c: any) => c.type === 'exterior' && c.parent_value?.toLowerCase().trim() === parentExact);
                if (matches.length === 0 && version) {
                    matches = rawColorMappings.filter((c: any) => c.type === 'exterior' && c.parent_value?.toLowerCase().trim() === parentLine);
                }

                if (matches.length > 0) return matches.map((c: any) => c.value);

                // Fallback
                return getAvailableExteriors(line, version);
            };

            const getMappedInteriors = (line: string, version?: string) => {
                if (!line) return vehicleInteriors;
                const parentExact = version ? `${line}___${version}`.toLowerCase().trim() : line.toLowerCase().trim();
                const parentLine = line.toLowerCase().trim();
                
                let matches = rawColorMappings.filter((c: any) => c.type === 'interior' && c.parent_value?.toLowerCase().trim() === parentExact);
                if (matches.length === 0 && version) {
                    matches = rawColorMappings.filter((c: any) => c.type === 'interior' && c.parent_value?.toLowerCase().trim() === parentLine);
                }

                if (matches.length > 0) return matches.map((c: any) => c.value);

                // Fallback
                return getAvailableInteriors(line, version);
            };

            const getAllExteriorsForLine = (line: string) => {
                if (!line) return vehicleColors;
                const lowerLine = line.toLowerCase().trim();
                const rawMatches = rawColorMappings.filter((c: any) => c.type === 'exterior' && c.parent_value?.toLowerCase().trim().startsWith(lowerLine)).map((c: any) => c.value);
                const versions = versionsMap[line] || [undefined];
                const constMatches = versions.flatMap(v => getAvailableExteriors(line, v));
                const combined = Array.from(new Set([...rawMatches, ...constMatches]));
                return combined.length > 0 ? combined : getAvailableExteriors(line);
            };

            const getAllInteriorsForLine = (line: string) => {
                if (!line) return vehicleInteriors;
                const lowerLine = line.toLowerCase().trim();
                const rawMatches = rawColorMappings.filter((c: any) => c.type === 'interior' && c.parent_value?.toLowerCase().trim().startsWith(lowerLine)).map((c: any) => c.value);
                const versions = versionsMap[line] || [undefined];
                const constMatches = versions.flatMap(v => getAvailableInteriors(line, v));
                const combined = Array.from(new Set([...rawMatches, ...constMatches]));
                return combined.length > 0 ? combined : getAvailableInteriors(line);
            };

            setConfigs({
                versionsMap,
                allPossibleVersions,
                vehicleLines: lines,
                vehicleColors,
                vehicleInteriors,
                isLoading: false,
                refreshConfigs: loadConfigs,
                getMappedExteriors,
                getMappedInteriors,
                getAllExteriorsForLine,
                getAllInteriorsForLine,
                rawColorMappings
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
