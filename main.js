const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { simpleGit, CleanOptions } = require('simple-git');
const { Auth, lexicon } = require('msmc');
const { Client } = require('minecraft-launcher-core');
const fetch = require('node-fetch');
const os = require('os');
const { forge } = require('tomate-loaders');

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
                fs.rmSync(filePath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(filePath);
            }
        }
    });
}

ipcMain.on('prepare-launch', async (event) => {
    const appDataPath = app.getPath('appData');
    const minecraftPath = path.join(appDataPath, '.minecraft');
    const version = '1.20.1';
    const shaFilePath = path.join(minecraftPath, 'last_commit_sha.txt');
    const repoUrl = 'https://github.com/IvanLealDev/Pajalandia-V-Pack-de-Mods.git';
    const commitsApiUrl = 'https://api.github.com/repos/IvanLealDev/Pajalandia-V-Pack-de-Mods/commits/main';
    const jdkUrl = 'https://download.oracle.com/java/21/archive/jdk-21.0.4_windows-x64_bin.zip';

    // Ensure the Minecraft directory exists
    if (!fs.existsSync(minecraftPath)) {
        fs.mkdirSync(minecraftPath, { recursive: true });
    }

    // Fetch the latest commit SHA from the remote repository
    const commitsResponse = await fetch(commitsApiUrl);
    const commitsData = await commitsResponse.json();
    const latestCommitSha = commitsData.sha;

    // Read the local commit SHA if it exists
    let localCommitSha = null;
    if (fs.existsSync(shaFilePath)) {
        localCommitSha = fs.readFileSync(shaFilePath, 'utf8').trim();
    }

    const git = simpleGit(minecraftPath);

    // Check if the local commit SHA is different from the latest commit SHA
    if (localCommitSha !== latestCommitSha) {
        // Check if the directory is a Git repository
        const isRepo = await git.checkIsRepo();

        if (isRepo) {
            // Forzar que la carpeta local sea idéntica a la de 'origin/main'
            try {
                // 1. Trae la info más reciente
                await git.fetch('origin', 'main');

                // 2. Reset --hard para descartar cambios y apuntar a 'origin/main'
                await git.reset(['--hard', 'origin/main']);

                // 3. Limpieza forzada de archivos/carpetas no rastreados
                await git.clean(CleanOptions.FORCE, ['-d']);

                console.log('Repositorio local forzado a coincidir con la rama remota.');
            } catch (error) {
                console.error('Error forzando el estado del repositorio:', error);
                return; // Detenemos si falla
            }
        } else {
            // Si no es repo, clonamos desde cero
            try {
                await git.clone(repoUrl, minecraftPath);
                console.log('Repositorio clonado correctamente.');
            } catch (error) {
                console.error('Error clonando el repositorio:', error);
                return; // Detenemos si falla
            }
        }

        // Asegurar que se preserven 'options.txt' y 'screenshots' si existían
        preserveFiles(minecraftPath);

        // Descargar e instalar JDK
        await downloadAndExtract(jdkUrl, minecraftPath);

        // Actualizar el archivo con el último SHA
        fs.writeFileSync(shaFilePath, latestCommitSha);
    } else {
        console.log('No hay actualizaciones disponibles. El repositorio local está al día.');
    }

    const username = loggedInUsername;
    // Obtener configuración de lanzamiento con Forge
    const launchConfig = await forge.getMCLCLaunchConfig({
        gameVersion: version, // Versión del juego
        rootPath: minecraftPath,
    });

    // Configuración adicional
    launchConfig.memory = {
        max: `${ramSettings.maxRam}`,
        min: `${ramSettings.minRam}`,
    };
    launchConfig.javaPath = path.join(minecraftPath, 'jdk-21.0.4/bin/javaw.exe');

    if (!userAuth) {
        console.warn("User is not authenticated, launching in offline mode");

        launchConfig.authorization = {
            access_token: '',
            client_token: '',
            uuid: getUUID(username),
            name: username,
            user_properties: '{}'
        };
    } else {
        launchConfig.authorization = userAuth;
    }

    // Lanzar Minecraft
    launcher.launch(launchConfig);

    launcher.on('debug', (e) => console.log(e));
    launcher.on('data', (e) => console.log(e));

    setTimeout(() => {
        console.log('Cerrando el lanzador después de 1 minuto y 30 segundos...');
        mainWindow.close();
        app.quit();
    }, 90000);
});

// Function to preserve specific files and folders
function preserveFiles(minecraftPath) {
    const filesToPreserve = ['options.txt'];
    const foldersToPreserve = ['screenshots'];

    // Check for files to preserve
    filesToPreserve.forEach(file => {
        const filePath = path.join(minecraftPath, file);
        if (fs.existsSync(filePath)) {
            console.log(`Preserving file: ${filePath}`);
        }
    });

    // Check for folders to preserve
    foldersToPreserve.forEach(folder => {
        const folderPath = path.join(minecraftPath, folder);
        if (fs.existsSync(folderPath)) {
            console.log(`Preserving folder: ${folderPath}`);
        }
    });
}

ipcMain.on('open-login-window', () => {
    mainWindow.loadURL(path.join(__dirname, 'assets/html/loginOff.html'));
});

ipcMain.on('login-attempt', (event, username, password) => {
    if ((username === "SDGames" && password === "IrAuOp") || (username === "FernandezATR" && password === "SJaMTR") || (username === "TangaHD" && password === "Ga7sUi") || (username === "Tutankamon" && password === "facil") || (username === "ElMosias" && password === "tUDycF")) {
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
        "FernandezATR": "987e6543-b21a-32d1-c456-789012345678",
        "TangaHD": "c0a81a7c-34af-412e-b101-ec16e2133d3c",
        "Tutankamon": "4fc95d55-2308-4ee2-8a5f-94b2ed98feb8",
        "ElMosias": "3aae1b1a-8447-4072-b1e9-1a53cbd097cb"
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