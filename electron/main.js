const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

// Keep a global reference of the window object to avoid GC
let mainWindow = null;
let nextServer = null;
const NEXT_PORT = 3000;
const NEXT_URL = `http://localhost:${NEXT_PORT}`;

/**
 * Get the user data directory for storing the database.
 * This is writable and persists across app updates.
 * - Windows: %APPDATA%/knowledge-graph-math/
 * - macOS: ~/Library/Application Support/knowledge-graph-math/
 * - Linux: ~/.config/knowledge-graph-math/
 */
function getUserDataDir() {
  return app.getPath('userData');
}

/**
 * Initialize the database in the user data directory.
 * On first run, copy the seed database from resources.
 * On subsequent runs, use the existing database.
 */
function initializeDatabase() {
  const userDataDir = getUserDataDir();
  const dbDir = path.join(userDataDir, 'db');
  const dbFile = path.join(dbDir, 'dev.db');

  // Ensure db directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // If database doesn't exist, copy from resources (first run)
  if (!fs.existsSync(dbFile)) {
    console.log('[Electron] First run - initializing database...');
    const seedDbPath = path.join(process.resourcesPath, 'standalone', 'db', 'custom.db');
    if (fs.existsSync(seedDbPath)) {
      fs.copyFileSync(seedDbPath, dbFile);
      console.log('[Electron] Database copied from:', seedDbPath);
    } else {
      console.warn('[Electron] Seed database not found at:', seedDbPath);
      // Try alternate path
      const altSeedDbPath = path.join(process.resourcesPath, 'standalone', 'db', 'dev.db');
      if (fs.existsSync(altSeedDbPath)) {
        fs.copyFileSync(altSeedDbPath, dbFile);
        console.log('[Electron] Database copied from alternate path:', altSeedDbPath);
      } else {
        console.error('[Electron] No seed database found. App will start with empty database.');
      }
    }
  } else {
    console.log('[Electron] Using existing database at:', dbFile);
  }

  return dbFile;
}

// Check if Next.js server is ready
function waitForServer(maxRetries = 30, interval = 1000) {
  return new Promise((resolve) => {
    let retries = 0;
    const check = () => {
      http
        .get(NEXT_URL, (res) => {
          if (res.statusCode === 200 || res.statusCode === 302) {
            resolve(true);
          } else {
            retries++;
            if (retries < maxRetries) {
              setTimeout(check, interval);
            } else {
              resolve(false);
            }
          }
        })
        .on('error', () => {
          retries++;
          if (retries < maxRetries) {
            setTimeout(check, interval);
          } else {
            resolve(false);
          }
        });
    };
    check();
  });
}

// Start Next.js standalone server
function startNextServer(dbFilePath) {
  return new Promise((resolve, reject) => {
    const isDev = !app.isPackaged;

    if (isDev) {
      // In dev mode, Next.js dev server should already be running
      console.log('[Electron] Dev mode - assuming Next.js dev server is running on port', NEXT_PORT);
      resolve(true);
      return;
    }

    // In production, run the standalone server
    const standaloneDir = path.join(process.resourcesPath, 'standalone');
    const serverPath = path.join(standaloneDir, 'server.js');

    console.log('[Electron] Starting Next.js standalone server from:', serverPath);
    console.log('[Electron] Database file:', dbFilePath);
    console.log('[Electron] Standalone dir:', standaloneDir);

    // Prisma requires forward slashes in DATABASE_URL, even on Windows
    const normalizedDbPath = dbFilePath.replace(/\\/g, '/');
    const prismaEnginesPath = path.join(standaloneDir, 'node_modules', '.prisma', 'client');
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(NEXT_PORT),
      HOSTNAME: 'localhost',
      DATABASE_URL: `file:${normalizedDbPath}`,
      PRISMA_ENGINES_MIRROR: prismaEnginesPath,
    };

    console.log('[Electron] DATABASE_URL:', env.DATABASE_URL);

    nextServer = spawn(process.execPath, [serverPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: standaloneDir,
    });

    nextServer.stdout.on('data', (data) => {
      console.log('[Next.js]', data.toString().trim());
    });

    nextServer.stderr.on('data', (data) => {
      console.error('[Next.js]', data.toString().trim());
    });

    nextServer.on('error', (err) => {
      console.error('[Electron] Failed to start Next.js server:', err);
      reject(err);
    });

    nextServer.on('close', (code) => {
      console.log('[Electron] Next.js server exited with code:', code);
    });

    resolve(true);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: '高等数学知识图谱',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Show when ready to avoid visual flash
    backgroundColor: '#ffffff',
  });

  // Custom application menu
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '重置数据',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (!mainWindow) return;
            dialog.showMessageBox(mainWindow, {
              type: 'question',
              buttons: ['取消', '重置'],
              defaultId: 0,
              title: '重置数据',
              message: '确定要重置为默认数据吗？所有自定义修改将丢失。',
            }).then((result) => {
              if (result.response === 1) {
                mainWindow.webContents.send('reset-data');
              }
            });
          },
        },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'forceReload', label: '强制刷新' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            if (!mainWindow) return;
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: '高等数学知识图谱',
              detail:
                '版本 1.0.0\n\n基于 Next.js + D3.js 构建的交互式高等数学知识图谱可视化工具。\n\n支持节点/关系的增删改查、Markdown 批量导入、离线 HTML 导出等功能。\n\n数据存储位置：' + path.join(getUserDataDir(), 'db'),
            });
          },
        },
      ],
    },
  ];

  // Add dev tools in dev mode
  if (!app.isPackaged) {
    template[template.length - 1].submenu.push(
      { type: 'separator' },
      { role: 'toggleDevTools', label: '开发者工具' }
    );
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Show window when ready to avoid visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    let dbFilePath = '';

    if (!app.isPackaged) {
      // In dev mode, Next.js dev server should already be running
      console.log('[Electron] Dev mode - connecting to existing Next.js dev server on port', NEXT_PORT);
    } else {
      // In production, initialize database and start standalone server
      dbFilePath = initializeDatabase();
      await startNextServer(dbFilePath);
    }

    // Wait for Next.js to be ready
    const maxRetries = app.isPackaged ? 60 : 10;
    const ready = await waitForServer(maxRetries, 1000);

    if (!ready) {
      const errorMsg = app.isPackaged
        ? 'Next.js 服务器启动失败，请检查应用是否完整。'
        : '未检测到 Next.js 开发服务器。请先运行 "bun run dev" 启动开发服务器。';
      console.error('[Electron]', errorMsg);
      dialog.showErrorBox('启动失败', errorMsg);
      app.quit();
      return;
    }

    console.log('[Electron] Next.js server is ready, creating window...');
    createWindow();
    mainWindow.loadURL(NEXT_URL);
  } catch (err) {
    console.error('[Electron] Failed to start:', err);
    dialog.showErrorBox('启动失败', `应用启动时发生错误：${err.message}`);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      mainWindow.loadURL(NEXT_URL);
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    console.log('[Electron] Stopping Next.js server...');
    nextServer.kill();
    nextServer = null;
  }
});
