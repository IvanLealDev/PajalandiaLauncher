// Importación de módulos.
const { ipcRenderer } = require('electron');

// Variables globales
const ipc = ipcRenderer;

// Title Bar
document.querySelector("#minimize").addEventListener("click", () => {
    ipc.send("manualMinimize");
});

document.querySelector("#close").addEventListener("click", () => {
    ipc.send("manualClose");
});

// Cuando el usuario hace clic en el botón de Microsoft.
function loginMS(element) {
    element.classList.add('buttonLoading');
    ipcRenderer.send('LoginMicrosoft');
}

ipcRenderer.on('LoginSuccess', (event, data) => {
    console.log('Login successful:', data);
    stopLoadingAnimation();
});

ipcRenderer.on('LoginFailed', (event, error) => {
    console.error('Login failed:', error);
    stopLoadingAnimation();
});

ipcRenderer.on('LoginWindowClosed', () => {
    stopLoadingAnimation();
});

function stopLoadingAnimation() {
    const msLoginButton = document.getElementById('ms-login-button');
    msLoginButton.classList.remove('buttonLoading');
    msLoginButton.innerHTML = '<img src="../img/microsoft.png" alt="Microsoft" class="img-microsoft"> Login with Microsoft';
}

// Cuando el usuario hace clic en el botón de Offline.
function openLoginWindow() {
    ipcRenderer.send('open-login-window');
}