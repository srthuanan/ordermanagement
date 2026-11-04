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
      <div className="space-y-3">
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-slate-200/80" />
          <span className="text-xs font-normal text-slate-400">Hoặc</span>
          <span className="h-px flex-1 bg-slate-200/80" />
        </div>
        <button type="button" onClick={onSignIn} disabled={busy} aria-busy={busy}
          title="Windows Hello, Touch ID, mã PIN hoặc Passkey trên điện thoại"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200/70 bg-white/35 px-4 transition-all duration-200 hover:border-slate-300 hover:bg-white/65 active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50/70 text-blue-500">
            {busy ? <LoaderCircle size={14} strokeWidth={1.6} className="animate-spin" aria-hidden="true" /> : <KeyRound size={14} strokeWidth={1.6} aria-hidden="true" />}
          </span>
          <span className="text-xs font-medium text-slate-600">Đăng nhập bằng Passkey</span>
        </button>
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
