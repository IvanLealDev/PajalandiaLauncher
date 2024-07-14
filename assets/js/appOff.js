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

// Guardar el nombre de usuario en localStorage o en una variable global
let username = localStorage.getItem('username');

// Cuando el usuario hace clic en el botón de Jugar.
document.getElementById('launchButton').addEventListener('click', () => {
    ipcRenderer.send('launch-game', username);
    console.log("run");
    // Cerrar la ventana de Electron después de lanzar Minecraft
    setTimeout(() => {
        window.close();
    }, 1000);
});