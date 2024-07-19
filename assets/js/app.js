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
document.getElementById('launchButton').addEventListener('click', function () {
    // Deshabilitar el botón y añadir la clase de animación
    this.classList.add('disabled', 'buttonLoading');
    this.style.pointerEvents = 'none'; // Deshabilitar futuros clics
    ipcRenderer.send('prepare-launch');
    console.log("Preparing to launch...");
});