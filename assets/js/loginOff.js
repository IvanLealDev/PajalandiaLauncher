// Importación de módulos.
const { ipcRenderer } = require('electron');

// Sistema de Login
document.getElementById('loginForm').onsubmit = function(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Guardar el nombre de usuario en localStorage
    localStorage.setItem('username', username);

    ipcRenderer.send('login-attempt', username, password);
}

ipcRenderer.on('login-response', (event, response) => {
    const loginMessage = document.getElementById('loginMessage');
    if (response === 'success') {
        loginMessage.style.color = 'green';
        loginMessage.textContent = 'Login successful!';
    } else {
        loginMessage.style.color = 'red';
        loginMessage.textContent = 'Usuario o contraseña incorrectos.';
    }
});