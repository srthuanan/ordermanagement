import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import moment from 'moment';
import { getGoogleMapsUrl, reverseGeocode, getQuickLocationName } from '../../utils/geocodeUtils';

interface MiniGpsMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicleName?: string;
    vin?: string;
    lat: number;
    lng: number;
    locationName?: string;
    capturedAt?: string;
}

export const MiniGpsMapModal: React.FC<MiniGpsMapModalProps> = ({
    isOpen,
    onClose,
    vehicleName,
    vin,
    lat,
    lng,
    locationName,
    capturedAt
}) => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null);
    const [detailedAddress, setDetailedAddress] = useState<string>('');
    const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(true);

    // Fetch detailed address via reverse geocode
    useEffect(() => {
        if (!isOpen || !lat || !lng) return;

        let isMounted = true;
        setIsLoadingAddress(true);

        const initialQuick = locationName || getQuickLocationName(lat, lng);
        if (initialQuick) {
            setDetailedAddress(initialQuick);
        }

        reverseGeocode(lat, lng)
            .then((addr) => {
                if (isMounted && addr) {
                    setDetailedAddress(addr);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (isMounted) setIsLoadingAddress(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, lat, lng, locationName]);

    // Init Leaflet Map
    useEffect(() => {
        if (!isOpen || !lat || !lng) return;

        const timer = setTimeout(() => {
            if (!mapContainerRef.current) return;
            const L = (window as any).L;
            if (!L) return;

            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            try {
                const map = L.map(mapContainerRef.current, {
                    attributionControl: false,
                    zoomControl: false, // Clean look, no clunky + - buttons
                }).setView([lat, lng], 15);

                mapInstanceRef.current = map;

                // Google Maps Road Tiles
                L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                    maxZoom: 19,
                }).addTo(map);

                // Elegant Minimalist Pin Marker
                const customIcon = L.divIcon({
                    className: 'custom-minimal-marker',
                    html: `
                        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
                            <div style="position: absolute; inset: 0; border-radius: 50%; background: #3b82f6; opacity: 0.25; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                            <div style="width: 28px; height: 28px; border-radius: 50%; background: #1e40af; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.4); border: 2.5px solid white;">
                                <i class="fas fa-truck" style="font-size: 11px;"></i>
                            </div>
                        </div>
                    `,
                    iconSize: [34, 34],
                    iconAnchor: [17, 17],
                });

                L.marker([lat, lng], { icon: customIcon }).addTo(map);

                setTimeout(() => {
                    map.invalidateSize();
                }, 150);
            } catch (err) {
                console.error('Lỗi khởi tạo Leaflet mini map:', err);
            }
        }, 60);

        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isOpen, lat, lng]);

    if (!isOpen) return null;

    const gmapsUrl = getGoogleMapsUrl(lat, lng);

    const modalContent = (
        <div 
            className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-[2px] animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col animate-scale-up"
                onClick={(e) => e.stopPropagation()}
                style={{ animationDuration: '150ms' }}
            >
                {/* Header Minimalist */}
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <i className="fas fa-location-arrow text-[10px]"></i>
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-[12px] text-slate-800 truncate">
                                {vehicleName || 'Xe đang vận tải'}
                            </h3>
                            {vin && (
                                <p className="text-[10px] font-mono text-blue-600 truncate">
                                    {vin}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-6 h-6 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
                    >
                        <i className="fas fa-times text-xs"></i>
                    </button>
                </div>

                {/* Map Display */}
                <div className="relative w-full h-[220px] bg-slate-100">
                    <div ref={mapContainerRef} className="w-full h-full" />
                </div>

                {/* Clear Real Address Banner */}
                <div className="px-3.5 py-2.5 bg-slate-50/90 border-t border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-start gap-2">
                        <i className="fas fa-map-marker-alt text-rose-500 text-[12px] mt-0.5 shrink-0"></i>
                        <div className="flex-1 min-w-0">
                            <div className="text-[11.5px] font-semibold text-slate-800 leading-snug break-words">
                                {detailedAddress || 'Đang xác định địa chỉ...'}
                                {isLoadingAddress && (
                                    <span className="inline-block ml-1 text-slate-400 animate-pulse text-[10px]">
                                        (đang nạp...)
                                    </span>
                                )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                Tọa độ: {lat.toFixed(5)}, {lng.toFixed(5)}
                                {capturedAt && ` • ${moment(capturedAt).format('HH:mm DD/MM')}`}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 mt-0.5">
                        <a
                            href={gmapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            <span>Xem trên Google Maps</span>
                            <i className="fas fa-external-link-alt text-[8.5px]"></i>
                        </a>

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
