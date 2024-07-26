# Description
> This project focuses on developing a custom launcher for Minecraft, designed to offer an optimized and personalized experience for both players using Microsoft accounts (Online) and those who prefer to play offline (Offline).

> This launcher is specifically designed to work with Fabric 1.21 and has been created exclusively for the Minecraft server and project called Pajalandia in its fifth edition. The mod pack and Fabric version are obtained internally from another GitHub repository. It is important to note that the offline login feature is only available to users previously declared in the backend, as it is intended for a specific number of people on a whitelisted server.

> This project aims to provide a powerful and easy-to-use tool that significantly improves the experience of Minecraft players, giving them full control over setting up and launching their game.

# Objetives 🗒️
- [x] Starting Minecraft from the back-end
    - [x] Deploy custom version of Fabric
    - [x] Integrate Java
- [ ] Develop front-end and back-end for each view
    - [x] Splash View
        - [x] Load as first window and redirect to Login
        - [x] 2.9 second animation
        - [x] Include custom styled logo and loading bar
    - [x] Login View
        - [x] Maximize and close bar
        - [x] Custom styling and FadeIn and FadeOut animations
        - [x] Sign in with Microsoft account via pop-up window
        - [x] Sign in offline without Microsoft account, redirecting to LoginOff
    - [x] View LoginOff
        - [x] Maximize and close bar
        - [x] Custom styling and FadeIn and FadeOut animations
        - [x] Login offline by verifying username and password in the back-end
        - [x] Display error or success messages and redirect to App view if data is correct
        - [x] Button to save entered data
    - [x] App View
        - [x] Maximize and close bar
        - [x] Custom styling and FadeIn and FadeOut animations
        - [ ] Program buttons for:
            - [x] Launch Minecraft using the login method
            - [x] Redirect to settings and user via sliders
            - [ ] Ver el tráiler en YouTube (falta el enlace del tráiler)
            - [x] Join Discord Server
        - [ ] Mostrar estado del servidor y número de jugadores online (pendiente la conexión al back-end)
    - [x] Config View
        - [x] Custom styling and animations of sidepanels
        - [x] Modify and save RAM settings automatically
    - [x] Player View
        - [x] Custom styling and animations of sidepanels
        - [x] Display player's head and allow disconnection by redirecting to Login
- [x] Account Support
    - [x] Add support for Microsoft accounts - Online
    - [x] Add support for Non-Premium accounts - Offline, verifying username and password
- [x] Additional functions
    - [x] Automatic launcher updates
    - [x] Modular options
        - [x] Automatic Modpack Installation
        - [x] Automatic update of modpacks
    - [x] Language support in Spanish
    - [ ] Almacenar en caché ciertas funciones para acelerar tiempos de carga (pendiente)
    - [ ] Añadir instrucciones para compilar (pendiente)
    - [ ] Solucionar problemas de seguridad en Electron (pendiente)
    - [x] Save customizable data after app restart