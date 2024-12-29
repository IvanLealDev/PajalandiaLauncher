// Importación de módulos.
const { ipcRenderer } = require('electron');
const { shell } = require('electron');

// Variables globales
const ipc = ipcRenderer;

// Title Bar
document.querySelector("#minimize").addEventListener("click", () => {
    ipc.send("manualMinimize");
});

document.querySelector("#close").addEventListener("click", () => {
    ipc.send("manualClose");
});

// Side Panel
function toggleLeftSidePanel() {
    const sidepanel = document.getElementById('leftSidepanel');
    sidepanel.classList.toggle('show');
    sidepanel.classList.toggle('hide');
}

function toggleRightSidePanel() {
    const sidepanel = document.getElementById('rightSidepanel');
    sidepanel.classList.toggle('show');
    sidepanel.classList.toggle('hide');
}

// Cuando el usuario hace clic en el botón de Jugar.
document.getElementById('launchButton').addEventListener('click', function () {
    // Deshabilitar el botón y añadir la clase de animación
    this.classList.add('disabled', 'buttonLoading');
    this.style.pointerEvents = 'none'; // Deshabilitar futuros clics
    ipcRenderer.send('prepare-launch');
    console.log("Preparing to launch...");
});

// Actualizar los valores de RAM en tiempo real
const ramSliders = document.querySelectorAll('.ram-slider input[type="range"]');
ramSliders.forEach(slider => {
    slider.addEventListener('input', function () {
        const valueSpan = this.nextElementSibling;
        valueSpan.textContent = `${this.value}.0G`;
    });

    slider.addEventListener('change', function () {
        updateRamSettings();
    });
});

// Función para actualizar la configuración de RAM
function updateRamSettings() {
    const maxRam = document.getElementById('max-ram').value;
    const minRam = document.getElementById('min-ram').value;
    ipcRenderer.send('update-ram-settings', { maxRam, minRam });
}

// Escuchar el nombre de usuario y la URL del avatar
ipcRenderer.on('update-user-info', (event, username, avatarUrl) => {
    console.log("Actualizando información del usuario:", username, avatarUrl);
    document.querySelector('.user-details h2').textContent = username;
    document.querySelector('.avatar img').src = avatarUrl;
});

// Manejar el botón de desconexión
document.querySelector("#disconnect").addEventListener("click", () => {
    ipc.send("disconnect");
});

// Escuchar y actualizar la información de RAM
ipcRenderer.on('update-ram-info', (event, totalRam, availableRam) => {
    document.querySelector('.ram-total').textContent = `Total: ${totalRam}G`;
    document.querySelector('.ram-available').textContent = `Available: ${availableRam}G`;
});

// Solicitar la información de RAM al backend
ipcRenderer.send('request-ram-info');

// Interceptar clics en enlaces externos y abrir en navegador predeterminado
document.querySelectorAll('a.external-link').forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const url = link.href;
        shell.openExternal(url);
    });
});