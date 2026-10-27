import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, LoaderCircle } from 'lucide-react';

interface DesktopPasskeyControlsProps {
  busy: boolean;
  onSignIn: () => void;
  pendingAccount?: string;
  enrolling: boolean;
  onEnroll: () => void;
  onContinue: () => void;
}

export const DesktopPasskeyControls: React.FC<DesktopPasskeyControlsProps> = ({
  busy, onSignIn, pendingAccount, enrolling, onEnroll, onContinue,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef(onContinue);
  const enrollingRef = useRef(enrolling);
  continueRef.current = onContinue;
  enrollingRef.current = enrolling;

  useEffect(() => {
    if (!pendingAccount) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !enrollingRef.current) {
        event.preventDefault();
        continueRef.current();
      }
      if (event.key !== 'Tab') return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (!buttons?.length) { event.preventDefault(); return; }
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [pendingAccount]);

  return (
    <>
      <div className="space-y-3 rounded-xl bg-white/95 p-3">
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-slate-300/50" />
          <span className="text-xs font-semibold text-slate-500">HOẶC</span>
          <span className="h-px flex-1 bg-slate-300/50" />
        </div>
        <button type="button" onClick={onSignIn} disabled={busy} aria-busy={busy}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60">
          {busy ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <KeyRound size={20} className="text-blue-600" aria-hidden="true" />}
          Đăng nhập bằng Passkey
        </button>
        <p className="text-center text-xs leading-relaxed text-slate-500">
          Dùng Windows Hello, Touch ID, mã PIN hoặc Passkey trên điện thoại.
        </p>
      </div>
      {pendingAccount && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-6 backdrop-blur-sm">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="desktop-passkey-title" aria-describedby="desktop-passkey-description"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 font-sans text-slate-800 shadow-2xl">
            <KeyRound size={30} className="mb-4 text-blue-600" aria-hidden="true" />
            <h2 id="desktop-passkey-title" className="text-xl font-bold">Kích hoạt đăng nhập bằng Passkey</h2>
            <p id="desktop-passkey-description" className="mt-3 text-sm leading-relaxed text-slate-600">
              Tạo Passkey cho <strong className="break-all">{pendingAccount}</strong> để đăng nhập lần sau bằng Windows Hello, Touch ID, mã PIN hoặc thiết bị khác. Bạn sẽ chọn cách xác thực trong hộp thoại của trình duyệt.
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={onContinue} disabled={enrolling}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">Để sau</button>
              <button type="button" onClick={onEnroll} disabled={enrolling} aria-busy={enrolling}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {enrolling && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
                {enrolling ? 'Đang kích hoạt...' : 'Kích hoạt ngay'}
              </button>
            </div>
          </div>
        </div>, document.body,
      )}
    </>
  );
};
