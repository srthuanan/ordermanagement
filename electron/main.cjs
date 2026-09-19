const { app, BrowserWindow } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Handle creating/removing shortcuts on Windows when installing/uninstalling.


const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

// Configure autoUpdater
autoUpdater.autoDownload = false; // Ask user before downloading
autoUpdater.log = require('electron-log'); // Optional: setup logger if needed

// --- Update Events ---

const { ipcMain } = require('electron');

// --- Update Events ---

autoUpdater.on('checking-for-update', () => {
    // Optional: send status to renderer
});

autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
        mainWindow.webContents.send('update-available', info);
    }
});

autoUpdater.on('update-not-available', (info) => {
    // Optional: send status
});

autoUpdater.on('error', (err) => {
    if (mainWindow) {
        mainWindow.webContents.send('update-error', err.toString());
    }
});

autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
        mainWindow.webContents.send('download-progress', progressObj);
    }
});

autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
        mainWindow.webContents.send('update-downloaded', info);
    }
});

// --- IPC Handlers ---
ipcMain.on('start-download', () => {
    if (process.env.NODE_ENV === 'development') {
        // SIMULATION: Mock download progress
        console.log("Simulating download...");
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            if (mainWindow) {
                mainWindow.webContents.send('download-progress', { percent: progress });
            }
            if (progress >= 100) {
                clearInterval(interval);
                if (mainWindow) {
                    mainWindow.webContents.send('update-downloaded', { version: '9.9.9' });
                }
            }
        }, 200);
    } else {
        autoUpdater.downloadUpdate();
    }
});

ipcMain.on('quit-and-install', () => {
    if (process.env.NODE_ENV === 'development') {
        console.log("Simulating quit and install...");
        app.quit();
    } else {
        autoUpdater.quitAndInstall();
    }
});

// --- CyberSoft Allocation Sync IPC ---
const { spawn } = require('child_process');
ipcMain.handle('cyber-sync-allocations', async (event, { fromDate, toDate, preview }) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(__dirname, '..', 'scripts', 'sync_thuan_an_allocations.py');
        const args = [scriptPath];
        if (fromDate) args.push('--from', fromDate);
        if (toDate) args.push('--to', toDate);
        if (preview) args.push('--preview');

        const py = spawn('python', args);
        let stdout = '';
        let stderr = '';

        try {
            py.stdin.write(JSON.stringify({ fromDate, toDate, preview, ...(arguments[1] || {}) }));
            py.stdin.end();
        } catch (e) {}

        py.stdout.on('data', (d) => { stdout += d.toString(); });
        py.stderr.on('data', (d) => { stderr += d.toString(); });

        py.on('close', (code) => {
            if (code !== 0) {
                return resolve({ success: false, error: stderr || `Process exited with code ${code}` });
            }
            try {
                const lines = stdout.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                const res = JSON.parse(lastLine);
                resolve(res);
            } catch (err) {
                resolve({ success: false, error: err.message, raw: stdout });
            }
        });
    });
});


let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false, // Disable native frame
        titleBarStyle: 'hidden', // Hide title bar but keep window controls overlay (handled by custom UI mostly)
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Remove the default menu
    mainWindow.setMenu(null);

    // --- Window Control IPC ---
    ipcMain.on('window-minimize', () => {
        if (mainWindow) mainWindow.minimize();
    });

    ipcMain.on('window-maximize', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });

    ipcMain.on('window-close', () => {
        if (mainWindow) mainWindow.close();
    });

    const startUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, '../dist/index.html')}`;

    mainWindow.loadURL(startUrl);

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Check for updates after a short delay
    setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
            // SIMULATION: Mock update available
            console.log("Simulating update available...");
            if (mainWindow) {
                mainWindow.webContents.send('update-available', {
                    version: '9.9.9',
                    releaseNotes: '<h3>Phiên bản thử nghiệm</h3><p>Đây là bản cập nhật giả lập để kiểm tra giao diện.</p>'
                });
            }
        } else {
            autoUpdater.checkForUpdatesAndNotify();
        }
    }, 5000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
