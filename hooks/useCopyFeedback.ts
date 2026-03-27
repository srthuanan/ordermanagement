import { useCallback, useRef } from 'react';

/**
 * Hook to copy text and show a premium floating "Đã Copy" label near the mouse cursor.
 */
export function useCopyFeedback() {
    const labelRef = useRef<HTMLDivElement | null>(null);

    const copyWithFeedback = useCallback((text: string, event?: React.MouseEvent) => {
        if (!text) return;

        navigator.clipboard.writeText(text).then(() => {
            // Remove any existing label
            if (labelRef.current && document.body.contains(labelRef.current)) {
                document.body.removeChild(labelRef.current);
                labelRef.current = null;
            }

            // Wrapper with enter animation
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 5px;
                ">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 6.5L4.8 9.5L10 3" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span style="color: #0d9468; font-weight: 700; font-size: 11px; letter-spacing: 0.04em; font-family: system-ui, -apple-system, sans-serif;">Đã Copy</span>
                </div>
            `;

            wrapper.style.cssText = `
                position: fixed;
                background: rgba(255, 255, 255, 0.96);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(16, 185, 129, 0.25);
                padding: 5px 11px 5px 9px;
                border-radius: 999px;
                pointer-events: none;
                z-index: 99999;
                opacity: 0;
                transform: translateY(4px) scale(0.92);
                transition: opacity 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
                white-space: nowrap;
                box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15), 0 1px 4px rgba(0,0,0,0.06);
            `;

            // Position near the cursor (above and slightly left)
            const x = event?.clientX ?? window.innerWidth / 2;
            const y = event?.clientY ?? 100;
            wrapper.style.left = `${x - 40}px`;
            wrapper.style.top = `${y - 44}px`;

            document.body.appendChild(wrapper);
            labelRef.current = wrapper as unknown as HTMLDivElement;

            // Trigger enter animation
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    wrapper.style.opacity = '1';
                    wrapper.style.transform = 'translateY(0px) scale(1)';
                });
            });

            // Animate out after 900ms
            setTimeout(() => {
                if (labelRef.current === (wrapper as unknown as HTMLDivElement)) {
                    wrapper.style.opacity = '0';
                    wrapper.style.transform = 'translateY(-6px) scale(0.95)';
                    wrapper.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
                    setTimeout(() => {
                        if (document.body.contains(wrapper)) {
                            document.body.removeChild(wrapper);
                        }
                        if (labelRef.current === (wrapper as unknown as HTMLDivElement)) {
                            labelRef.current = null;
                        }
                    }, 220);
                }
            }, 900);
        }).catch(() => { });
    }, []);

    return copyWithFeedback;
}
