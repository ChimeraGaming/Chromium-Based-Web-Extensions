![Image](https://github.com/user-attachments/assets/5ef03321-0207-45a4-901a-baa9860ca938)

# Chimera Folders for Stremio Web

> Planned future direction: move this project toward a full addon release.

Organize your **Stremio Web** library with personal folders, a dark interface, fast navigation tools, and full backup and restore support.

![Version](https://img.shields.io/badge/version-4.0.0-blueviolet)
![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Made With](https://img.shields.io/badge/made%20with-%E2%9D%A4-red)

---

## Features

- Create, manage, and organize custom folders for shows and movies
- Add shows quickly with a popup picker
- Prevent duplicate entries inside folders
- Jump directly to show and movie pages
- Use a dark interface styled to fit Stremio
- Get toast notifications after successful actions
- Return to the main page with a Home button
- Collapse the sidebar for cleaner browsing
- Pin or unpin the sidebar with hover behavior
- Switch between left sidebar, right sidebar, and a draggable folder window view
- Close the panel and reopen it from the page launcher
- Toggle fullscreen auto hide from settings
- Search folders and saved titles from the sidebar
- Use Edit mode to rename folders and saved titles
- Drag and drop folders to reorder them
- Drag and drop saved titles within a folder or into another folder
- Remember folder collapse state after reloads and exports
- Open a dedicated settings tab from the sidebar
- Export and import folders, saved links, and extension settings
- Open the Stremio community Discord from the sidebar
- Open the GitHub project link from the UI
- Run with no external dependencies

Fully optimized for [web.stremio.com](https://web.stremio.com/).

---

## Installation Guide

![Chrome](https://img.shields.io/badge/Chrome-Verified-brightgreen)
![Brave](https://img.shields.io/badge/Brave-Verified-brightgreen)
![Firefox](https://img.shields.io/badge/Firefox-Verified-brightgreen)
![Edge](https://img.shields.io/badge/Edge-Verified-brightgreen)
![Opera](https://img.shields.io/badge/Opera-Verified-brightgreen)
![Vivaldi](https://img.shields.io/badge/Vivaldi-Verified-brightgreen)

Tested on Chrome, Brave, Firefox, Microsoft Edge, Opera, and Vivaldi.

### <img src="https://img.icons8.com/color/24/000000/chrome--v1.png" alt="Chrome logo" /> Chrome

1. Download the latest `.zip` from [Releases](https://github.com/ChimeraGaming/Stremio-Addons/releases), or clone this repository.
2. Extract the folder.
3. Open `chrome://extensions/`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the extracted folder.

### <img src="https://img.icons8.com/color/24/000000/brave-web-browser.png" alt="Brave logo" /> Brave

1. Follow the same steps as Chrome.
2. Open `brave://extensions/`.

### <img src="https://img.icons8.com/color/24/000000/ms-edge-new.png" alt="Edge logo" /> Microsoft Edge

1. Open `edge://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the extracted folder.

### <img src="https://img.icons8.com/color/24/000000/opera--v1.png" alt="Opera logo" /> Opera

1. Install the [Install Chrome Extensions](https://addons.opera.com/en/extensions/details/install-chrome-extensions/) addon if needed.
2. Open `opera://extensions/`.
3. Enable **Developer Mode**.
4. Click **Load unpacked** and select the extracted folder.

### <img src="https://img.icons8.com/fluent/512/vivaldi-web-browser.png" width="24" height="24" alt="Vivaldi logo" /> Vivaldi

1. Open `vivaldi://extensions/`.
2. Enable **Developer Mode**.
3. Click **Load unpacked** and select the extracted folder.

### <img src="https://img.icons8.com/color/24/000000/firefox.png" alt="Firefox logo" /> Firefox

1. Extract the `.zip` release.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on**.
4. Select the `manifest.json` file.

Note: Firefox only supports temporary installation unless the extension is submitted to the Mozilla Add-on Store.

---

## Recent Highlights

- Added Edit mode for folder renaming, title renaming, folder reordering, and drag and drop moves
- Added sidebar search and saved collapse state so larger libraries stay manageable
- Added view settings for left sidebar, right sidebar, and draggable folder window layouts
- Added a fullscreen auto hide toggle so the panel only hides when that setting is enabled
- Added a new settings tab with full export and import support
- Moved saved data into extension storage so backups restore folders and settings together
- Added automatic migration from the previous local site storage format
- Switched from a minified build to the full `addon.js` source for transparency
- Added the MIT License for open-source collaboration
- Improved the project structure for public GitHub releases
- Connected the missing Create Folder button so the sidebar flow works correctly

## Upgrade Notes

- Version 4.0.0 migrates existing folder data into extension storage the next time you open `web.stremio.com`
- After migrating once, use the new sidebar settings button to create or restore backups
- Edit mode now handles folder reordering, cross-folder title moves, and saved title renaming
- View settings now control layout mode and fullscreen auto hide behavior

---

## Future Plans

- Move folders to the cloud for cross-device support
- Explore converting the project into an official Stremio addon
- Welcome collaborators through issues and contributions

---

## License

This project is licensed under the [MIT License](LICENSE) (c) 2025 Chimera Gaming.

---

## Credits

Built by [Chimera Gaming](https://github.com/ChimeraGaming)  
Special thanks to the Stremio community for continued inspiration.
