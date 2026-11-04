import React, { useEffect, useState } from 'react';

interface UpdateModalProps {
    // Parent can optionally control close, but mostly self-managed
}

const UpdateModal: React.FC<UpdateModalProps> = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'available' | 'downloading' | 'ready' | 'error'>('idle');
    const [versionInfo, setVersionInfo] = useState<any>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!window.electronAPI) return;

        const handleUpdateAvailable = (info: any) => {
            setVersionInfo(info);
            setUpdateStatus('available');
            setIsOpen(true);
        };

        const handleDownloadProgress = (progressObj: any) => {
            setUpdateStatus('downloading');
            setProgress(progressObj.percent);
        };

        const handleUpdateDownloaded = (info: any) => {
            setUpdateStatus('ready');
            setVersionInfo(info);
            setIsOpen(true);
        };

        const handleUpdateError = (err: string) => {
            console.error("Update error:", err);
            setUpdateStatus('error');
            setIsOpen(true);
        };

        window.electronAPI.onUpdateAvailable(handleUpdateAvailable);
        window.electronAPI.onDownloadProgress(handleDownloadProgress);
        window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded);
        window.electronAPI.onUpdateError(handleUpdateError);

        return () => {
            window.electronAPI.removeAllListeners('update-available');
            window.electronAPI.removeAllListeners('download-progress');
            window.electronAPI.removeAllListeners('update-downloaded');
            window.electronAPI.removeAllListeners('update-error');
        };
    }, []);

    const handleDownload = () => window.electronAPI.startDownload();
    const handleInstall = () => window.electronAPI.quitAndInstall();
    const handleClose = () => setIsOpen(false);
    const handleMinimize = () => setIsOpen(false);

    if (!isOpen) return null;

    // Micro Capsule Theme
    // Single row, ultra minimal
    return (
        <div className="fixed bottom-4 right-4 z-[9999] animate-slide-in-up">
            <div className="bg-black/90 backdrop-blur text-white rounded-full border border-white/10 shadow-xl px-4 py-2 flex items-center gap-3 text-xs font-medium ring-1 ring-white/5 transition-all hover:scale-[1.02] cursor-default select-none">

                {/* Status Icon */}
                <div className="shrink-0">
                    {updateStatus === 'available' && <i className="fas fa-gift text-blue-400 animate-pulse"></i>}
                    {updateStatus === 'downloading' && (
                        <div className="relative w-4 h-4 flex items-center justify-center">
                            <i className="fas fa-arrow-down text-[10px] text-white/50"></i>
                            <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path className="text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                <path className="text-blue-500 transition-all duration-300" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                            </svg>
                        </div>
                    )}
                    {updateStatus === 'ready' && <i className="fas fa-check text-emerald-400"></i>}
                    {updateStatus === 'error' && <i className="fas fa-exclamation text-red-400"></i>}
                </div>

                {/* Text Content */}
                <div className="flex flex-col min-w-[80px] max-w-[120px]">
                    <span className="truncate font-semibold tracking-wide">
                        {updateStatus === 'available' && 'Update v' + versionInfo?.version}
                        {updateStatus === 'downloading' && `${Math.round(progress)}% Downloaded`}
                        {updateStatus === 'ready' && 'Ready to Install'}
                        {updateStatus === 'error' && 'Update Failed'}
                    </span>
                </div>

                {/* Actions Separator */}
                <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

                {/* Main Action Button */}
                {updateStatus === 'available' && (
                    <button onClick={handleDownload} className="text-blue-400 hover:text-white transition-colors uppercase text-[10px] font-bold tracking-wider">
                        Get
                    </button>
                )}

                {updateStatus === 'downloading' && (
                    <button onClick={handleMinimize} className="text-white/50 hover:text-white transition-colors">
                        <i className="fas fa-minus"></i>
                    </button>
                )}

                {updateStatus === 'ready' && (
                    <button onClick={handleInstall} className="text-emerald-400 hover:text-emerald-300 transition-colors uppercase text-[10px] font-bold tracking-wider">
                        Restart
                    </button>
                )}

                {/* Close Button always available */}
                {(updateStatus === 'available' || updateStatus === 'ready' || updateStatus === 'error') && (
                    <button onClick={handleClose} className="text-white/30 hover:text-white transition-colors ml-1">
                        <i className="fas fa-times"></i>
                    </button>
                )}
            </div>
        </div>
    );
};

export default UpdateModal;
