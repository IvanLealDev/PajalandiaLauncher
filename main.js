//--------------------------------------------------
// main.js
//--------------------------------------------------
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const AdmZip = require('adm-zip');
const fetch = require('node-fetch');
const os = require('os');

const { Auth, lexicon } = require('msmc');
const { Client } = require('minecraft-launcher-core');
const { forge } = require('tomate-loaders');

let mainWindow;
let splash;
let loggedInUsername = '';
let userAuth;
let ramSettings = {
  maxRam: '6G',
  minRam: '1G'
};

const launcher = new Client();

// ===================================================
// 1) Detección de entorno dev vs prod
// ===================================================
/**
 * Retorna `true` si estamos corriendo con 'electronmon', 'nodemon', 
 * o si no está empaquetado (app.isPackaged === false).
 */
function isDev() {
  return !app.isPackaged;
  // O, si prefieres:
  // return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

/**
 * Retorna la ruta a la carpeta `resources/git-portable` dependiendo
 * de si estamos en desarrollo o en producción.
 */
function getGitPortableFolder() {
  if (isDev()) {
    // MODO DESARROLLO: asumiendo que la carpeta está en 
    //     ./resources/git-portable
    return path.join(__dirname, 'resources', 'git-portable');
  } else {
    // MODO PRODUCCIÓN: la carpeta se encontrará en 
    //     process.resourcesPath/git-portable
    // cuando electron-builder genere el .exe
    return path.join(process.resourcesPath, 'git-portable');
  }
}

/**
 * Retorna la ruta de 'git.exe' portable.
 */
function getGitExePath() {
  return path.join(getGitPortableFolder(), 'cmd', 'git.exe');
}

/**
 * Retorna la carpeta donde se ubica 'git-lfs.exe' y las DLLs 
 * (ej: libcurl, libcrypto, etc.).
 */
function getLFSBinFolder() {
  return path.join(getGitPortableFolder(), 'mingw64', 'bin');
}

// ===================================================
// 2) Crear la ventana principal y splash
// ===================================================
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
    setTimeout(() => {
      mainWindow.show();
      splash.close();
    }, 2900);
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

app.whenReady().then(() => {
  createWindow();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ===================================================
// 3) Funciones para usar Git + LFS portable
// ===================================================
function runGitCommand(args, cwd) {
  return new Promise((resolve, reject) => {
    const gitExe = getGitExePath();
    const lfsBinDir = getLFSBinFolder();

    // Extendemos PATH para que Git "vea" git-lfs.exe y las DLLs
    const originalPath = process.env.PATH || '';
    const newPath = `${lfsBinDir}${path.delimiter}${originalPath}`;

    // Opciones para spawn
    const options = {
      env: { 
        ...process.env, 
        PATH: newPath 
      }
    };
    if (cwd) {
      options.cwd = cwd;
    }

    console.log('[runGitCommand]', gitExe, args, '(cwd:', cwd, ')');

    // Chequeo rápido: ¿existe git.exe?
    if (!fs.existsSync(gitExe)) {
      console.error('ERROR: No existe git.exe en: ', gitExe);
    }

    const child = spawn(gitExe, args, options);

    // stdout
    child.stdout.on('data', (data) => {
      console.log(`[git stdout] ${data}`);
    });
    // stderr
    child.stderr.on('data', (data) => {
      console.error(`[git stderr] ${data}`);
    });
    // close
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Git process exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function cloneRepository(repoUrl, destFolder) {
  // Aseguramos la carpeta de destino
  if (!fs.existsSync(destFolder)) {
    fs.mkdirSync(destFolder, { recursive: true });
  }
  // git clone
  await runGitCommand(['clone', repoUrl, destFolder]);
}

async function setupAndPullLFS(destFolder) {
  // git lfs install --local
  await runGitCommand(['lfs', 'install', '--local'], destFolder);

  // git lfs pull
  await runGitCommand(['lfs', 'pull'], destFolder);
}

// ===================================================
// 4) Descarga ZIP, limpia .minecraft, etc.
// ===================================================
async function downloadAndExtract(url, destPath, rootDirNameToRemove = '') {
  const response = await fetch(url);
  const buffer = await response.buffer();
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();

  for (const zipEntry of zipEntries) {
    const relativePath = rootDirNameToRemove
      ? zipEntry.entryName.replace(`${rootDirNameToRemove}/`, '')
      : zipEntry.entryName;
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

function cleanMinecraftFolderExceptPreserve(folderPath) {
  const preserveFiles = ['options.txt', 'last_commit_sha.txt'];
  const preserveFolders = ['screenshots'];

  fs.readdirSync(folderPath).forEach(file => {
    const filePath = path.join(folderPath, file);
    const isDirectory = fs.lstatSync(filePath).isDirectory();

    if (isDirectory) {
      if (!preserveFolders.includes(file)) {
        fs.rmSync(filePath, { recursive: true, force: true });
      }
    } else {
      if (!preserveFiles.includes(file)) {
        fs.unlinkSync(filePath);
      }
    }
  });
}

async function fetchRemoteSha() {
  const commitsApiUrl = 'https://api.github.com/repos/IvanLealDev/Pajalandia-V-Pack-de-Mods/commits/main';
  const res = await fetch(commitsApiUrl);
  const data = await res.json();
  return data.sha; 
}

// ===================================================
// 5) IPC: "prepare-launch" => Clona/actualiza y lanza Minecraft
// ===================================================
ipcMain.on('prepare-launch', async (event) => {
  const appDataPath = app.getPath('appData');
  const minecraftPath = path.join(appDataPath, '.minecraft');
  const shaFilePath = path.join(minecraftPath, 'last_commit_sha.txt');

  const repoUrl = 'https://github.com/IvanLealDev/Pajalandia-V-Pack-de-Mods.git';
  const jdkUrl = 'https://download.oracle.com/java/21/archive/jdk-21.0.4_windows-x64_bin.zip';

  // Crear .minecraft si no existe
  if (!fs.existsSync(minecraftPath)) {
    fs.mkdirSync(minecraftPath, { recursive: true });
  }

  let latestCommitSha;
  try {
    latestCommitSha = await fetchRemoteSha();
  } catch (error) {
    console.error('Error al obtener el SHA remoto:', error);
    return;
  }

  let localCommitSha = null;
  if (fs.existsSync(shaFilePath)) {
    localCommitSha = fs.readFileSync(shaFilePath, 'utf8').trim();
  }

  if (!localCommitSha) {
    console.log('No existe last_commit_sha.txt. Borrando carpeta .minecraft completa...');
    fs.rmSync(minecraftPath, { recursive: true, force: true });
    fs.mkdirSync(minecraftPath, { recursive: true });

    try {
      await cloneRepository(repoUrl, minecraftPath);
      await setupAndPullLFS(minecraftPath);

      await downloadAndExtract(jdkUrl, minecraftPath);

      fs.writeFileSync(shaFilePath, latestCommitSha);
    } catch (error) {
      console.error('Error en clonación + LFS:', error);
      return;
    }
  } else {
    if (localCommitSha !== latestCommitSha) {
      console.log('SHA local distinto al remoto. Actualizando .minecraft...');

      cleanMinecraftFolderExceptPreserve(minecraftPath);

      // Borramos .git si existe
      const dotGit = path.join(minecraftPath, '.git');
      if (fs.existsSync(dotGit)) {
        fs.rmSync(dotGit, { recursive: true, force: true });
      }

      try {
        await cloneRepository(repoUrl, minecraftPath);
        await setupAndPullLFS(minecraftPath);

        await downloadAndExtract(jdkUrl, minecraftPath);

        fs.writeFileSync(shaFilePath, latestCommitSha);
      } catch (error) {
        console.error('Error al actualizar repositorio con LFS:', error);
        return;
      }
    } else {
      console.log('No hay actualizaciones disponibles. El repositorio local está al día.');
    }
  }

  // === Lanzar Minecraft ===
  const version = '1.20.1';
  const username = loggedInUsername;

  let launchConfig;
  try {
    launchConfig = await forge.getMCLCLaunchConfig({
      gameVersion: version,
      rootPath: minecraftPath,
    });
  } catch (error) {
    console.error('Error obteniendo config Forge:', error);
    return;
  }

  launchConfig.memory = {
    max: ramSettings.maxRam,
    min: ramSettings.minRam,
  };

  const javaExe = path.join(minecraftPath, 'jdk-21.0.4', 'bin', 'javaw.exe');
  launchConfig.javaPath = javaExe;

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

  launcher.launch(launchConfig);
  launcher.on('debug', (e) => console.log('[MC debug]', e));
  launcher.on('data', (e) => console.log('[MC data]', e));

  setTimeout(() => {
    console.log('Cerrando el lanzador después de 1 minuto y 30 segundos...');
    mainWindow.close();
    app.quit();
  }, 90000);
});

// ===================================================
// 6) Otros IPC y funciones
// ===================================================
ipcMain.on('open-login-window', () => {
  mainWindow.loadURL(path.join(__dirname, 'assets/html/loginOff.html'));
});

ipcMain.on('login-attempt', (event, username, password) => {
  const validLogins = [
    { user: "SDGames", pass: "IrAuOp" },
    { user: "FernandezATR", pass: "SJaMTR" },
    { user: "TangaHD", pass: "Ga7sUi" },
    { user: "Tutankamon", pass: "facil" },
    { user: "ElMosias", pass: "tUDycF" },
    { user: "ElGigaNigga", pass: "KylCBz" },
    { user: "nico1040", pass: "GwWxs9" },
    { user: "Gazpacho", pass: "Db9KiA" },
    { user: "ElNeizi", pass: "qIkF20" },
    { user: "nebadito", pass: "MXnQpx" }
  ];

  const found = validLogins.some(item => item.user === username && item.pass === password);
  if (found) {
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
  userAuth = null;
  loggedInUsername = '';
  mainWindow.loadURL(path.join(__dirname, 'assets/html/login.html'));
});

ipcMain.on('update-ram-settings', (event, { maxRam, minRam }) => {
  ramSettings.maxRam = maxRam;
  ramSettings.minRam = minRam;
  console.log(`RAM settings updated: Max - ${maxRam}, Min - ${minRam}`);
});

ipcMain.on('request-ram-info', (event) => {
  const totalRam = (os.totalmem() / (1024 ** 3)).toFixed(1);
  const availableRam = (os.freemem() / (1024 ** 3)).toFixed(1);
  event.sender.send('update-ram-info', totalRam, availableRam);
});

function getUUID(username) {
  const users = {
    "SDGames": "8bfe6d5b-80ca-4ff9-8c2c-c8fdbb1b872b",
    "FernandezATR": "987e6543-b21a-32d1-c456-789012345678",
    "TangaHD": "c0a81a7c-34af-412e-b101-ec16e2133d3c",
    "Tutankamon": "4fc95d55-2308-4ee2-8a5f-94b2ed98feb8",
    "ElMosias": "3aae1b1a-8447-4072-b1e9-1a53cbd097cb",
    "ElGigaNigga": "1cac60ce-5b28-4d34-b424-d3faa353d531",
    "nico1040": "fccd1b49-1ba4-4f5a-a3a1-fecc42198341",
    "Gazpacho": "c6931da6-d25a-464a-abfe-de214fc13f9d",
    "ElNeizi": "0c9ed05c-568a-4e97-9029-3ba762492982",
    "nebadito": "21804e14-1678-49ed-9b82-45391fa3ae28"
  };
  const uuid = users[username] || '00000000-0000-0000-0000-000000000000';
  console.log(`UUID for ${username}: ${uuid}`);
  return uuid;
}

function updateUserInfo(username) {
  const avatarUrl = `https://minotar.net/avatar/${username}/50`;
  console.log(`Enviando información del usuario: ${username}, ${avatarUrl}`);
  mainWindow.webContents.send('update-user-info', username, avatarUrl);
}