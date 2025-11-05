import React, { useEffect, useState, useRef, useCallback } from 'react';
import animationDataUrl from '../../pictures/message_sent.json?url';

interface SuccessAnimationProps {
    show: boolean;
    title: string;
    message?: string;
    onClose: () => void;
    duration?: number;
}

const SuccessAnimation: React.FC<SuccessAnimationProps> = ({ title, message, onClose, duration = 3000 }) => {
    const [isExiting, setIsExiting] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const playerRef = useRef<any>(null);

    const handleClose = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsExiting(true);
        setTimeout(() => {
            onClose();
        }, 300); // Corresponds to animation duration
    }, [onClose]);

    useEffect(() => {
        if (playerRef.current) {
            playerRef.current.stop();
            playerRef.current.play();
        }

        timeoutRef.current = window.setTimeout(() => {
            handleClose();
        }, duration);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [duration, handleClose]);

    const animationClass = isExiting ? 'toast-hidden' : 'toast-visible';

    return (
        <div 
            className={`toast-container ${animationClass}`}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
        >
            <div className="toast-content">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                    <lottie-player
                        ref={playerRef}
                        src={animationDataUrl}
                        background="transparent"
                        speed="1"
                        style={{ width: '60px', height: '60px', margin: '-5px' }}
                        autoplay
                        loop={false}
                    >
                    </lottie-player>
                </div>
                <div className="toast-body flex-grow">
                    <p className="toast-title">{title}</p>
                    {message && <p className="toast-message">{message}</p>}
                </div>
                <div className="toast-close">
                    <button onClick={handleClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessAnimation;