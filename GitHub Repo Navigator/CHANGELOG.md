# Changelog

All notable changes to the GitHub Repo Navigator extension.

---

## [1.0.6]
### Added
- Switched to **GitHub REST API** for full recursive repo parsing.
- Support for **true nested folder rendering** (infinite depth).
- Files and folders are now:
  - **Sorted alphanumerically**
  - **Folders always appear above files**
- Folder names now display only their **own name**, not the full path.
- Visual cleanup for deeply nested UIs.
- Support for `.github` and other hidden folders when they contain valid files.

### Fixed
- Correctly loads and parses nested paths like `Folder/Subfolder/File.md`.
- No longer mislabels folders with full paths like `parent/child`.
- Resolved display issues for `.md` files in root folders appearing out of order.

### Changed
- `renderTree()` logic rebuilt to prioritize clean nesting and sort order.
- UI folder groups renamed to reflect only their **final segment** (e.g. `Chimera Folders`, not `Stremio Addons and Extensions/Chimera Folders`).
- Code cleanup and function separation for easier long-term updates.

---

## [1.0.5]
### Fixed
- Fully resolved folder/file parsing to show nested structures correctly.
- Properly identifies and groups:
  - Top-level folders (e.g. `Models`, `Troubleshooting`)
  - Nested folders and files (e.g. `Models/[2001] EZ-Flash Advance.md`)
- Correctly decodes and displays human-readable folder names from URLs.
- Fixed LICENSE and README appearing in wrong locations or folders.
- Improved root folder label to reflect actual GitHub repository name.
- Addressed issue where nothing was shown if hidden folders were present.
- Ensured folders are shown as folders, not files.

### Changed
- Root folder now dynamically reflects the repo name.
- File links open in the same tab for a smoother experience.
- Folder expand/collapse logic cleaned up for deeply nested files.

---

## [1.0.4]
### Fixed
- Removed duplicate file and folder entries.
- Filtered out:
  - Dotfiles and folders (e.g. `.github`)
  - Entries labeled `(folder)`
  - Empty or invalid entries

---

## [1.0.3]
### Changed
- Replaced loading spinner with terminal-style animated logging.
- Enhanced the step-by-step progress feedback during scraping.

---

## [1.0.2]
### Added
- Modernized floating UI with:
  - Search bar
  - Collapsible folders
  - Icons
- Search functionality with live filtering.

---

## [1.0.1]
### Added
- Grouped links by folder based on GitHub repo structure.
- Collapsible group UI for better organization.

---

## [1.0.0]
### Initial
- Scraped all visible `/blob/` and `/tree/` GitHub links.
- Displayed raw list in popup panel.
- Added basic floating UI with close and refresh buttons.
