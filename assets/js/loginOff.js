// Importación de módulos.
const { ipcRenderer } = require('electron');

document.getElementById('loginForm').onsubmit = function(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    ipcRenderer.send('login-attempt', username, password);
}

ipcRenderer.on('login-response', (event, response) => {
    const loginMessage = document.getElementById('loginMessage');
    if (response === 'success') {
        loginMessage.style.color = 'green';
        loginMessage.textContent = 'Login successful!';
        setTimeout(() => {
            window.close();
        }, 500);
    } else {
        loginMessage.style.color = 'red';
        loginMessage.textContent = 'Usuario o contraseña incorrectos.';
    }
});