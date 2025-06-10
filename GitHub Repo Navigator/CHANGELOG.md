# Changelog

All notable changes to the GitHub Repo Navigator extension.

---

## [1.0.4]
### Fixed
- Removed duplicate file and folder entries.
- Filtered out:
  - Dotfiles and folders (e.g. `.github`)
  - Entries labeled `(folder)`
  - Empty or invalid entries

## [1.0.3]
### Changed
- Replaced loading spinner with terminal-style animated logging.
- Enhanced the step-by-step progress feedback during scraping.

## [1.0.2]
### Added
- Modernized floating UI with:
  - Search bar
  - Collapsible folders
  - Icons
- Search functionality with live filtering.

## [1.0.1]
### Added
- Grouped links by folder based on GitHub repo structure.
- Collapsible group UI for better organization.

## [1.0.0]
### Initial
- Scraped all visible `/blob/` and `/tree/` GitHub links.
- Displayed raw list in popup panel.
- Added basic floating UI with close and refresh buttons.
