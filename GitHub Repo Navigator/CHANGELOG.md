# Changelog

All notable changes to the GitHub Repo Navigator extension.

---

## [2.2.0]
### Added
- Inline code comments added across all sections to improve readability and modding ease.
- Animated `pulse-glow` effect on the Start button for visual feedback.
- The Start button now uses a single magnifying glass icon instead of text.
- Start button glow color matches selected theme dynamically.
- LiquiGlass theme enhancements: sharper text, smoother backdrop blur, and improved contrast for accessibility.

### Changed
- Button size increased and centered for visual prominence.
- Theming logic updated to dynamically control both color and glow for buttons.
- UI structure now better handles themes with transparency or high contrast.

### Fixed
- Button display issues under light and LiquiGlass themes.
- Folder hover inconsistencies resolved in edge themes.
- Resolved minor sizing bugs from dynamic content injection.

---

## [2.1.0]
### Added
- Manual panel resizing with persisted width/height via `ResizeObserver`.
- Auto-reset fallback for corrupted or too-small width/height values (< 50px).
- Floating UI correctly reappears at last saved position and size.
- Theming system continues to apply properly to folders, text, and background.

### Fixed
- Dragging and resizing logic moved fully inside the IIFE scope to prevent variable issues.
- Removed broken size dropdown and restored full manual size control.
- Folder collapse animation and hover styles cleaned up for consistency.

---

## [2.0.1]
### Added
- Section headers for every logical block of code for maintainability.
- Theme settings now affect folder hover states and link colors dynamically.
- Drag-and-resize events persist position and size in real-time.
- Tooltip hover styling added to links and folders for better UX.
- Modularized logic structure into: theme config, UI, events, scraping, rendering, search.

### Changed
- Refactored `renderTree`, `makeFolderGroup`, and `applyTheme` for clarity and maintainability.
- Moved DOM references to a centralized block.
- Updated folder group generation with improved animations and accessibility.

---

## [2.0.0]
### Added
- Full working release using GitHub REST API.
- True nested folder rendering (infinite depth).
- Alphanumeric sorting with folders always above files.
- Folder names now display only their final segment.
- Search bar with live filtering.
- Start button to trigger scraping.
- Modern panel UI with blur and shadows.
- Theme support: Dark, Light, and Solarized.
- Draggable and resizable UI panel.
- Panel size and position now saved in `localStorage`.
- Close (`✖`) button re-added for convenience.

---

## [1.0.6]
### Added
- Switched to GitHub REST API for full recursive repo parsing.
- Support for deeply nested folders.
- Folders sorted above files, all in alphanumeric order.
- Folder names cleaned to only show the last segment.
- Supports hidden folders like `.github` if they contain valid files.

### Fixed
- Correctly parses nested paths like `Folder/Subfolder/File.md`.
- Resolved display issues with `.md` files and misplaced README/LICENSE files.

### Changed
- Rebuilt renderTree() logic.
- Simplified folder display names.
- Cleaned up logic for sorting and UI generation.

---

## [1.0.5]
### Fixed
- Folder/file parsing now shows nested structures correctly.
- Identifies and groups top-level and nested content.
- Fixed incorrect folder names and display of LICENSE/README.
- Improved root folder naming.
- Handles hidden folders.

### Changed
- File links open in same tab.
- Folder collapse logic improved.

---

## [1.0.4]
### Fixed
- Removed duplicate entries.
- Filtered dotfiles, hidden folders, and invalid entries.

---

## [1.0.3]
### Changed
- Replaced spinner with animated status text.
- Improved scrape progress visibility.

---

## [1.0.2]
### Added
- Floating UI with collapsible folders and search bar.

---

## [1.0.1]
### Added
- Grouped GitHub links by folder structure.

---

## [1.0.0]
### Initial
- Scraped visible `/blob/` and `/tree/` GitHub links.
- Basic floating UI with close and refresh buttons.
