# Changelog

All notable changes to this project are documented here.

---

<details open>
<summary><strong>Version 0.3.0 </strong></summary>

### Added
- Mode-aware recommendation column in results:
  - `Upgradable` in Upgrade mode
  - `Downgradable` in Downgrade mode
- Header-level table filters for quick narrowing during review
- Filename prompt before export so users can name files before download
- Optional Modrinth API key input in Setting
- Themes!

### Changed
- Export flow is now JDownloader2-focused:
  - outputs direct download links only
  - respects currently active filters
- Folder scanning now sends lightweight metadata payloads to avoid Chrome extension message size limits (64MiB class failures)
- API key handling is now settings-only (removed file-based fallback config)
- Settings page simplified by removing redundant or unused controls from previous version
- Roadmap and release docs updated for current workflow

### Fixed
- Roadmap and Settings open behavior from injected panel context
- CurseForge missing-key clarity:
  - `Unknown` now replaced with `ADD CURSEFORGE API` where applicable

</details>

---

<details>
<summary><strong>Version 0.2.0</strong></summary>

### Added
- Upgrade mode for streamlined mod version transitions
- Fully integrated Roadmap page accessible from all UI entry points
- Refined navigation structure for a more intuitive workflow
- Simplified and cleaner settings experience

### Improved
- Enhanced source display to show only relevant providers
- Optimized UI layout across popup and injected panel
- Consistent navigation behavior across all extension views
- Improved handling of duplicate mod entries
- Enhanced scrollbar visibility and interaction

### Refined
- Reduced unnecessary dependencies and background logic
- Streamlined script structure for better maintainability
- Cleaned manifest configuration for a lighter footprint
- Removed redundant or unused components

</details>

---

<details>
<summary><strong>Version 0.1.0</strong></summary>

### Added
- Initial extension architecture using Manifest v3
- Modpack ZIP parsing and analysis system
- Filename based mod detection
- Version comparison engine
- Integration with CurseForge and Modrinth sources
- Structured results table including:
  - Mod Name
  - Current Version
  - Target Version
  - Match Status
  - Source
- Popup interface and injected panel UI
- Settings page
- Roadmap page

</details>
