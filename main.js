const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { Auth, lexicon } = require('msmc');
const { Client } = require('minecraft-launcher-core');
const fetch = require('node-fetch');
const os = require('os');

app.whenReady().then(() => createWindow());

const launcher = new Client();
let loggedInUsername = '';
let userAuth;
let mainWindow;
let ramSettings = {
    maxRam: '6G',
    minRam: '1G'
};

function ShowApp() {
    mainWindow.show();
    splash.close();
}

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

    mainWindow.loadURL(path.join(__dirname, "assets/html/login.html"));

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

    ipcMain.on('LoginMicrosoft', async (event) => {
        const msmcInstance = new Auth('select_account');
        msmcInstance
            .on('load', console.log)
            .launch('electron')
            .then(async (e) => {
                const t = await e.getMinecraft();
                console.log(t.mclc());
                userAuth = t.mclc();
                loggedInUsername = t.profile.name;
                event.sender.send('LoginSuccess', userAuth);
                mainWindow.loadURL(path.join(__dirname, 'assets/html/app.html'));

                mainWindow.webContents.once('dom-ready', () => {
                    updateUserInfo(loggedInUsername);
                });
            })
            .catch((e) => {
                console.log(lexicon.wrapError(e));
                event.sender.send('LoginFailed', lexicon.wrapError(e));
            });
    });
}

async function downloadAndExtract(url, destPath, rootDirNameToRemove = '') {
    const response = await fetch(url);
    const buffer = await response.buffer();
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    for (const zipEntry of zipEntries) {
        const relativePath = rootDirNameToRemove ? zipEntry.entryName.replace(`${rootDirNameToRemove}/`, '') : zipEntry.entryName;
        const entryPath = path.join(destPath, relativePath);

        if (zipEntry.isDirectory) {
            if (!fs.existsSync(entryPath)) {
                fs.mkdirSync(entryPath, { recursive: true });
            }
        } else {
            const fileExists = fs.existsSync(entryPath);
            const fileContent = zipEntry.getData();
            const existingContent = fileExists ? fs.readFileSync(entryPath) : null;

            if (!fileExists || !fileContent.equals(existingContent)) {
                fs.writeFileSync(entryPath, fileContent);
            }
        }
    }
}

function cleanMinecraftFolder(folderPath) {
    fs.readdirSync(folderPath).forEach(file => {
        const filePath = path.join(folderPath, file);
        if (file !== 'options.txt' && file !== 'screenshots') {
            if (fs.lstatSync(filePath).isDirectory()) {
                fs.rmdirSync(filePath, { recursive: true });
            } else {
                fs.unlinkSync(filePath);
            }
        }
    });
}

ipcMain.on('prepare-launch', async (event) => {
    const appDataPath = app.getPath('appData');
    const minecraftPath = path.join(appDataPath, '.minecraft');
    const shaFilePath = path.join(minecraftPath, 'last_commit_sha.txt');
    const repoUrl = 'https://github.com/IvanLealDev/Pajalandia-V-Pack-de-Mods/archive/refs/heads/main.zip';
    const commitsApiUrl = 'https://api.github.com/repos/IvanLealDev/Pajalandia-V-Pack-de-Mods/commits/main';
    const jdkUrl = 'https://download.oracle.com/java/21/archive/jdk-21.0.2_windows-x64_bin.zip';

    if (!fs.existsSync(minecraftPath)) {
        fs.mkdirSync(minecraftPath, { recursive: true });
    }

    const commitsResponse = await fetch(commitsApiUrl);
    const commitsData = await commitsResponse.json();
    const latestCommitSha = commitsData.sha;

    let localCommitSha = null;
    if (fs.existsSync(shaFilePath)) {
        localCommitSha = fs.readFileSync(shaFilePath, 'utf8').trim();
    }

    if (localCommitSha !== latestCommitSha) {
        cleanMinecraftFolder(minecraftPath);
        await downloadAndExtract(repoUrl, minecraftPath, 'Pajalandia-V-Pack-de-Mods-main');
        await downloadAndExtract(jdkUrl, minecraftPath);
        fs.writeFileSync(shaFilePath, latestCommitSha);
    }

    const username = loggedInUsername;
    if (!userAuth) {
        console.warn("User is not authenticated, launching in offline mode");

        let optsOffline = {
            authorization: {
                access_token: '',
                client_token: '',
                uuid: getUUID(username),
                name: username,
                user_properties: '{}'
            },
            root: `${app.getPath('appData')}/.minecraft/`,
            version: {
                number: "1.21",
                type: "release",
                custom: "fabric-loader-0.15.11-1.21"
            },
            memory: {
                max: `${ramSettings.maxRam}G`,
                min: `${ramSettings.minRam}G`,
            },
            javaPath: path.join(`${app.getPath('appData')}/.minecraft/jdk-21.0.2/bin/javaw.exe`),
        };

        launcher.launch(optsOffline);
    } else {
        let opts = {
            authorization: userAuth,
            root: `${app.getPath('appData')}/.minecraft/`,
            version: {
                number: "1.21",
                type: "release",
                custom: "fabric-loader-0.15.11-1.21"
            },
            memory: {
                max: `${ramSettings.maxRam}G`,
                min: `${ramSettings.minRam}G`,
            },
            javaPath: path.join(`${app.getPath('appData')}/.minecraft/jdk-21.0.2/bin/javaw.exe`),
        };

        launcher.launch(opts);
    }

    launcher.on('debug', (e) => console.log(e));
    launcher.on('data', (e) => console.log(e));

    setTimeout(() => {
        console.log('Cerrando el lanzador después de 10 segundos...');
        mainWindow.close();
        app.quit();
    }, 10000);
});

ipcMain.on('open-login-window', () => {
    mainWindow.loadURL(path.join(__dirname, 'assets/html/loginOff.html'));
});

ipcMain.on('login-attempt', (event, username, password) => {
    if ((username === "SDGames" && password === "123") || (username === "FernandezATR" && password === "234")) {
        loggedInUsername = username;
        event.sender.send('login-response', 'success');
        mainWindow.loadURL(path.join(__dirname, 'assets/html/app.html'));

        mainWindow.webContents.once('dom-ready', () => {
            updateUserInfo(loggedInUsername);
        });
    } else {
        event.sender.send('login-response', 'failure');
    }
});

ipcMain.on("manualMinimize", () => {
    mainWindow.minimize();
});

ipcMain.on("manualClose", () => {
    app.quit();
});

ipcMain.on("disconnect", () => {
    // Realizar la limpieza de la sesión de usuario
    userAuth = null;
    loggedInUsername = '';

    // Redirigir a la página de login
    mainWindow.loadURL(path.join(__dirname, 'assets/html/login.html'));
});

ipcMain.on('update-ram-settings', (event, { maxRam, minRam }) => {
    ramSettings.maxRam = maxRam;
    ramSettings.minRam = minRam;
    console.log(`RAM settings updated: Max - ${maxRam}G, Min - ${minRam}G`);
});

ipcMain.on('request-ram-info', (event) => {
    const totalRam = (os.totalmem() / (1024 ** 3)).toFixed(1);
    const availableRam = (os.freemem() / (1024 ** 3)).toFixed(1);
    event.sender.send('update-ram-info', totalRam, availableRam);
});

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});

function getUUID(username) {
    const users = {
        "SDGames": "8bfe6d5b-80ca-4ff9-8c2c-c8fdbb1b872b",
        "FernandezATR": "987e6543-b21a-32d1-c456-789012345678"
    };
    const uuid = users[username] || '00000000-0000-0000-0000-000000000000';
    console.log(`UUID for ${username}: ${uuid}`);
    return uuid;
}

async function updateUserInfo(username) {
    const avatarUrl = `https://minotar.net/avatar/${username}/50`;
    console.log(`Enviando información del usuario: ${username}, ${avatarUrl}`);
    mainWindow.webContents.send('update-user-info', username, avatarUrl);
}