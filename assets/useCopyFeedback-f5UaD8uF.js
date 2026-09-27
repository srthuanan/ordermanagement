import{r as s}from"./vendor-react-eCFT3dHp.js";function p(){const t=s.useRef(null);return s.useCallback((o,r)=>{o&&navigator.clipboard.writeText(o).then(()=>{t.current&&document.body.contains(t.current)&&(document.body.removeChild(t.current),t.current=null);const e=document.createElement("div");e.innerHTML=`
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
            `,e.style.cssText=`
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
            `;const i=(r==null?void 0:r.clientX)??window.innerWidth/2,n=(r==null?void 0:r.clientY)??100;e.style.left=`${i-40}px`,e.style.top=`${n-44}px`,document.body.appendChild(e),t.current=e,requestAnimationFrame(()=>{requestAnimationFrame(()=>{e.style.opacity="1",e.style.transform="translateY(0px) scale(1)"})}),setTimeout(()=>{t.current===e&&(e.style.opacity="0",e.style.transform="translateY(-6px) scale(0.95)",e.style.transition="opacity 0.22s ease, transform 0.22s ease",setTimeout(()=>{document.body.contains(e)&&document.body.removeChild(e),t.current===e&&(t.current=null)},220))},900)}).catch(()=>{})},[])}export{p as u};
