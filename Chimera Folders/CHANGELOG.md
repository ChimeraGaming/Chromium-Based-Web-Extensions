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

## 2.9.0 — Show Management & Confirmations Update
- Added white minus (➖) buttons next to each show inside folders
- Clicking the minus button prompts a confirmation before removing the show
- Clicking the red ❌ button on folders now prompts a confirmation before deleting the entire folder
- Improved toast notifications for better user feedback
- Minor spacing and UI alignment fixes to folder and show lists
- LICENSE file added (Personal Use Only + Stremio Collaboration offer)

## 2.9.1 — Sidebar Button Polish & Minimize Fix
- Re-added missing sidebar minimize/collapse button (top-right)
- Aligned Home ➕ Add ➕ Minimize buttons into one clean row
- Added hover effects to all top buttons (Home, Add, Minimize) for modern polish
  - Light background brighten effect on hover
  - Smooth transition animations
- Minor CSS tweaks for consistency

## 2.10.0 - Full Dark Mode UI, Auto-Hiding Sidebar, Collapsible Folders
- Complete dark mode rework to match Stremio visual theme
- Home and Add buttons redesigned with purple gradient styling
- Sidebar can now minimize fully and reveal itself on hover
- Folder groups can now collapse and expand individually with animated chevrons
- Added confirmation prompts before deleting folders or shows
- Optimized sidebar transitions for smooth animations
- Cleaned and organized code structure for Chrome Extension packaging

## 🚀 3.0.0 - [Release Candidate 1]
- **NEW:** GitHub icon button added to top-right
- **NEW:** GitHub button links directly to the public repository
- Matched the GitHub button color styling to the Stremio purple/blue gradient
- Minor tweaks to button alignment and hover glow for GitHub button

### 3.0.1 — Open Source Release
- Replaced `addon.min.js` with full, readable `addon.js` for public visibility and collaboration  
- Converted license to **MIT License** for open-source usage and proper credit attribution  
- Added complete `README.md` with Chrome Extension install instructions and GitHub repo link  
- Updated `manifest.json` to reflect `addon.js` usage (non-minified)  
- Cleaned and organized project structure for transparent development and GitHub releases


---

# 📌 Notes
- Version 1.x.x represents the Light Mode development.
- Version 2.x.x and beyond introduce Dark Mode and major UX improvements.
- From v2.8.0 onward, releases are Chrome-extension ready with minified code.

---

