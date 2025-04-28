# 📜 Changelog

All notable changes to this project are documented here.

---

## 1.x.x — Light Mode Era
---

### 1.0.0
- Initial release: Sidebar created to list folders
- Basic "Create Folder" functionality
- Very simple visual styling (light mode)

### 1.1.0
- Minor bugfixes to folder creation flow
- Prevented duplicate folder names at base level
- Basic toast message on folder creation

### 1.2.0
- Added basic "Add Show" functionality
- Implemented localStorage for folder persistence
- Basic validation to prevent empty folder names

### 1.3.0
- Introduced simple popup modal to choose folders
- Toast notification upon successful adding to folder
- Base groundwork for dynamic updating of folder list

---

## 2.x.x — Dark Mode + Modern UI
---

### 2.0.0 — Dark Mode Transformation
- Fully rebuilt UI with dark theme: sidebar, modals, buttons
- Polished visual elements (rounded corners, spacing)
- Updated font styles to match Stremio Web
- Better visual alignment of sidebar sections

### 2.1.0
- Added **Home** button to sidebar
- Home button redirects back to `https://web.stremio.com/`
- Basic home button styling added

### 2.2.0
- Added **"Add to Folder"** button next to Home
- Clean horizontal layout for Home/Add
- Buttons moved into sidebar header for better UX

### 2.3.0
- Improved toast popup appearance
- Enlarged font and padding for toasts
- Added smooth fade-in and fade-out for toast notifications
- Unified green success color to match overall dark theme

### 2.4.0
- Folder entries made clickable
- Clicking show names in a folder now navigates directly to their Stremio page
- Properly handles full page hash routes (e.g., `#/detail/series/tt12345678`)

### 2.5.0
- Proper duplicate detection for shows inside folders
- Prevents adding same show twice
- Different toast ("Already in folder!") if trying to re-add

### 2.6.0
- Folder tree dropdowns added
- Folders can expand/collapse shows inside
- Subtle animations and clean toggling for child items
- Margins/padding cleaned up for readability

### 2.7.0
- Home and Add buttons polished visually
- Added icon to Home button (🏠)
- Added icon to Add button (➕)
- Buttons sized properly for mobile and desktop scaling
- Minor sidebar responsiveness improvements

### 2.8.0 — Chrome Extension Ready
- Built `manifest.json` for Chrome Extension (Manifest v3)
- Added extension `icon.png` (128x128 recommended)
- Minified code into `addon.min.js` for public release
- Separated private source code from public distribution
- Prepared project for GitHub releases (structure and security best practices)

  ### 2.9.0 — Show Removal & Confirmations Update
- White minus ➖ button added next to each show
- Clicking minus asks confirmation before removing
- Red X on folders now asks confirmation before deletion
- Updated toast notifications
- Added LICENSE file (Personal Use + Stremio Collab offer)
- Small UI alignment and margin improvements

---

# 📌 Notes
- Version 1.x.x represents the Light Mode development.
- Version 2.x.x and beyond introduce Dark Mode and major UX improvements.
- From v2.8.0 onward, releases are Chrome-extension ready with minified code.

---

