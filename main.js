// Importación de módulos.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Auth, lexicon } = require('msmc');
const { Client } = require('minecraft-launcher-core');

app.whenReady().then(() => createWindow());

// Variables globales
const launcher = new Client();
let loggedInUsername = '';
let userAuth;
let mainWindow;

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

// Obtener UUID según el nombre de usuario
function getUUID(username) {
    const users = {
        "SDGames": "8bfe6d5b-80ca-4ff9-8c2c-c8fdbb1b872b",
        "FernandezATR": "987e6543-b21a-32d1-c456-789012345678"
    };
    const uuid = users[username] || '00000000-0000-0000-0000-000000000000';
    console.log(`UUID for ${username}: ${uuid}`);
    return uuid;
}

// Lanzar Minecraft
ipcMain.on('play', async (event) => {
    const username = loggedInUsername;  // Obtener el nombre de usuario guardado
    console.log(`Launching game for username: ${username}`);
    if (!userAuth) {
        // Si no hay datos de autenticación, usar modo offline
        console.warn("User is not authenticated, launching in offline mode");

        let optsOffline = {
            authorization: {
                access_token: '',
                client_token: '',
                uuid: getUUID(username),  // Obtener el UUID según el nombre de usuario
                name: username,  // Nombre de usuario offline
                user_properties: '{}'
            },
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

        console.log('Launching options:', optsOffline);
        launcher.launch(optsOffline);
    } else {
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

        launcher.launch(opts);
    }

    launcher.on('debug', (e) => console.log(e));
    launcher.on('data', (e) => console.log(e));

    // Cerrar la ventana de Electron después de iniciar Minecraft
    setTimeout(() => {
        console.log('Cerrando el lanzador después de 10 segundos...');
        mainWindow.close();
        app.quit();
    }, 10000); // Cerrar después de 10 segundos (10000 milisegundos)
});

// Cuando se carga la aplicación, muestra la ventana de loginOff.
ipcMain.on('open-login-window', () => {
    mainWindow.loadURL(path.join(__dirname, 'assets/html/loginOff.html'));
});

// LoginOff
ipcMain.on('login-attempt', (event, username, password) => {
    if ((username === "SDGames" && password === "123") || (username === "FernandezATR" && password === "234")) {
        loggedInUsername = username;  // Guardar el nombre de usuario
        event.sender.send('login-response', 'success');
        mainWindow.loadURL(path.join(__dirname, 'assets/html/app.html'));
    } else {
        event.sender.send('login-response', 'failure');
    }
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