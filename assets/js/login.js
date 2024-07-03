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
    // Manejar el éxito del inicio de sesión.
});

ipcRenderer.on('LoginFailed', (event, error) => {
    console.error('Login failed:', error);
    // Manejar el error del inicio de sesión.
});

// Cuando el usuario hace clic en el botón de Offline.
function openLoginWindow() {
    ipcRenderer.send('open-login-window');
}