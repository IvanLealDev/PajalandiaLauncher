// Importación de módulos.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Auth, lexicon } = require('msmc');

app.whenReady().then(() => createWindow());

// Variables globales
let mainWindow;
let loginWindow;

// Ventana splash
function ShowApp() {
    mainWindow.show()
    splash.close();
};

// Ventana principal
function createWindow() {
    mainWindow = new BrowserWindow({
        title: "Pajalandia Launcher",
        icon: path.join(__dirname, "assets/img/logo.ico"),
        width: 1290,
        minWidth: 1290,
        height: 750,
        minHeight: 750,
        show: false,
        titleBarStyle: "hidden",
        frame: false,
        backgroundColor: '#FFF',
        webPreferences: {
            contextIsolation: false,
            enableRemoteModule: true,
            nodeIntegration: true
        },
    });

    mainWindow.loadURL(path.join(__dirname, "assets/html/login.html"))

    // mainWindow.setMenuBarVisibility(false);

    // Dev Tools
    // mainWindow.webContents.openDevTools();

    // Creación de la pantalla de bienvenida.
    splash = new BrowserWindow({
        width: 300,
        icon: path.join(__dirname, "assets/img/logo.ico"),
        height: 400,
        frame: false,
        alwaysOnTop: true,
        transparent: true
    });
    splash.loadFile(path.join(__dirname, 'assets/html/splash.html'));
    mainWindow.once('ready-to-show', () => {
        setTimeout(ShowApp, 2900);
    });

    // Login Microsoft.
    ipcMain.on('LoginMicrosoft', async (event) => {
        const msmc = new Auth('select_account');
        msmc
            .on('load', console.log)
            .launch('electron')
            .then(async (e) => {
                const t = await e.getMinecraft();
                console.log(t.mclc());
                const a = await t.refresh(true);
                console.log(t.mclc());
                event.sender.send('LoginSuccess', t.mclc());
                mainWindow.loadURL(path.join(__dirname, 'assets/html/app.html'));
            })
            .catch((e) => {
                console.log(lexicon.wrapError(e));
                event.sender.send('LoginFailed', lexicon.wrapError(e));
            });
    });
}

// Venta LoginOff
function createLoginWindow() {
    loginWindow = new BrowserWindow({
        title: "Pajalandia Launcher",
        icon: path.join(__dirname, "assets/img/logo.ico"),
        width: 400,
        height: 300,
        minWidth: 400,
        minHeight: 300,
        parent: mainWindow,
        modal: true,
        titleBarStyle: "hidden",
        frame: false,
        backgroundColor: '#FFF',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    loginWindow.loadFile('assets/html/loginOff.html');
    loginWindow.on('closed', () => {
        loginWindow = null;
    });
}

// Botones de Cerrar y minimizar
ipcMain.on("manualMinimize", () => {
    mainWindow.minimize();
});

ipcMain.on("manualClose", () => {
    app.quit();
})

// Cuando se carga la aplicación, muestra la ventana princiapal.
app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// Cuando se carga la aplicación, muestra la ventana de loginOff.
ipcMain.on('open-login-window', () => {
    if (!loginWindow) {
        createLoginWindow();
    }
});

// LoginOff
ipcMain.on('login-attempt', (event, username, password) => {
    if (username === "TangaHD" && password === "123") {
        event.sender.send('login-response', 'success');
        loginWindow.close();
        mainWindow.loadURL(path.join(__dirname, 'assets/html/app.html'));
    } else {
        event.sender.send('login-response', 'failure');
    }
});