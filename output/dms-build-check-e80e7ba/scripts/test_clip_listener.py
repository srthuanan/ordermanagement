import ctypes
from ctypes import wintypes
import time

user32 = ctypes.windll.user32

WM_CLIPBOARDUPDATE = 0x031D

WNDPROCTYPE = ctypes.WINFUNCTYPE(ctypes.c_long, wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)

def wnd_proc(hwnd, msg, wparam, lparam):
    if msg == WM_CLIPBOARDUPDATE:
        print(">>> REALTIME CLIPBOARD UPDATE DETECTED! <<<")
        return 0
    return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

wndproc_cb = WNDPROCTYPE(wnd_proc)

class WNDCLASSEX(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.UINT),
        ("style", wintypes.UINT),
        ("lpfnWndProc", WNDPROCTYPE),
        ("cbClsExtra", ctypes.c_int),
        ("cbWndExtra", ctypes.c_int),
        ("hInstance", wintypes.HINSTANCE),
        ("hIcon", wintypes.HICON),
        ("hCursor", wintypes.HICON),
        ("hbrBackground", wintypes.HBRUSH),
        ("lpszMenuName", wintypes.LPCWSTR),
        ("lpszClassName", wintypes.LPCWSTR),
        ("hIconSm", wintypes.HICON),
    ]

wc = WNDCLASSEX()
wc.cbSize = ctypes.sizeof(WNDCLASSEX)
wc.lpfnWndProc = wndproc_cb
wc.lpszClassName = "ZaloCocClipboardWatcherClass"

atom = user32.RegisterClassExW(ctypes.byref(wc))
print("Registered class:", atom)

# Create message-only window
HWND_MESSAGE = -3
hwnd = user32.CreateWindowExW(0, wc.lpszClassName, "ZaloCocClipWatcher", 0, 0, 0, 0, 0, HWND_MESSAGE, 0, 0, 0)
print("Created message window:", hwnd)

success = user32.AddClipboardFormatListener(hwnd)
print("AddClipboardFormatListener success:", success)

user32.RemoveClipboardFormatListener(hwnd)
user32.DestroyWindow(hwnd)
print("Cleaned up successfully!")
