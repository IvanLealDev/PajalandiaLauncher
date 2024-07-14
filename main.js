// Importación de módulos.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Auth, lexicon } = require('msmc');
const { Client } = require('minecraft-launcher-core');
const { Launcher } = require('adlauncher-core');

app.whenReady().then(() => createWindow());

// Variables globales
const launcherOff = new Launcher();
const launcherOn = new Client();
let userAuth;
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
        const msmcInstance = new Auth('select_account'); // Inicialización de msmc
        msmcInstance
            .on('load', console.log)
            .launch('electron')
            .then(async (e) => {
                const t = await e.getMinecraft();
                console.log(t.mclc());
                userAuth = t.mclc(); // Almacenar los datos de autenticación del usuario
                event.sender.send('LoginSuccess', userAuth);
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

// Lanzar Minecraft Online
ipcMain.on('play', async (event) => {
    if (!userAuth) {
        console.error("User is not authenticated");
        return;
    }

    let opts = {
        authorization: userAuth,
        root: `${app.getPath('appData')}/.minecraft/`,
        version: {
            number: "1.21",
            type: "release",
            custom: "fabric-loader-0.15.11-1.21"  // Custom version to launch Fabric
        },
        memory: {
            max: "6G",
            min: "1G",
        },
        javaPath: path.join(`${app.getPath('appData')}/.minecraft/jdk-21.0.2/bin/javaw.exe`), // Ruta del javaw.exe para evitar abrir la consola
    };

    launcherOn.launch(opts);
    launcherOn.on('debug', (e) => console.log(e));
    launcherOn.on('data', (e) => console.log(e));

    // Cerrar la ventana de Electron después de iniciar Minecraft
    setTimeout(() => {
        console.log('Cerrando el lanzador después de 10 segundos...');
        mainWindow.close();
        app.quit();
    }, 10000); // Cerrar después de 10 segundos (10000 milisegundos)
});

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

// Lanzar Minecraft Offline
ipcMain.on('launch-game', (event, username) => {
    const launchOptions = {
        username: username, // Utiliza el nombre de usuario recibido
        version: 'fabric-loader-0.15.11-1.21', // Ingresa la versión de Fabric
        gameDirectory: `C:/Users/Harry/AppData/Roaming/.minecraft`, // Ingresa el directorio donde tienes descargado Minecraft
        memory: {
            // Define la memoria que quieras usar
            min: '1G', // Mínimo de memoria
            max: '6G', // Máximo de memoria
        },
        java: 'C:/Users/Harry/AppData/Roaming/.minecraft/jdk-21.0.2/bin/java.exe', // Ubicación exacta del archivo java.exe (OPCIONAL)
        java8: 'C:/Program Files/Java/jre-1.8/bin/java.exe', // Ubicación exacta del archivo java.exe v8 (OPCIONAL)
    };

    launcherOff.launch(launchOptions).then(() => {
        console.log('Minecraft lanzado con éxito');
        // No cerrar la aplicación de Electron cuando Minecraft se lanza
    }).catch(err => {
        console.error('Error al lanzar Minecraft:', err);
    });
});

// LoginOff
ipcMain.on('login-attempt', (event, username, password) => {
    if ((username === "TangaHD" && password === "123") || (username === "FernandezATR" && password === "234")) {
        event.sender.send('login-response', 'success');
        if (loginWindow) loginWindow.close();
        mainWindow.loadURL(path.join(__dirname, 'assets/html/appOff.html'));
    } else {
        event.sender.send('login-response', 'failure');
    }
});