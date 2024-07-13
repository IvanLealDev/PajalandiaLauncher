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

// Cuando el usuario hace clic en el botón de Jugar.
document.getElementById('launchButton').addEventListener('click', () => {
    ipcRenderer.send('play');
    console.log("run");
});