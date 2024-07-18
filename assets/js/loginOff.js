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

// Sistema de Login
document.getElementById('loginForm').onsubmit = function(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Guardar el nombre de usuario en localStorage
    if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('username', username);
        localStorage.setItem('password', password);
    } else {
        localStorage.setItem('rememberMe', 'false');
        localStorage.removeItem('username');
        localStorage.removeItem('password');
    }

    ipcRenderer.send('login-attempt', username, password);
}

ipcRenderer.on('login-response', (event, response) => {
    const loginMessage = document.getElementById('loginMessage');
    loginMessage.style.display = 'block';
    if (response === 'success') {
        loginMessage.style.color = 'green';
        loginMessage.textContent = 'Login successful!';
    } else {
        loginMessage.style.color = 'red';
        loginMessage.textContent = 'Usuario o contraseña incorrectos.';
    }
});

// Al cargar la página, verifica si "Remember Me" está activado y llena los campos automáticamente
window.onload = function() {
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    if (rememberMe) {
        document.getElementById('username').value = localStorage.getItem('username');
        document.getElementById('password').value = localStorage.getItem('password');
        document.getElementById('rememberMe').checked = true;
    }
}