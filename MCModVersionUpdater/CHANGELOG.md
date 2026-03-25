# Changelog

All notable changes to this project are documented here.

---

<details open>
<summary><strong>Version 0.3.2</strong></summary>

### Added
- New optional setting: fuzzy description-based replacement search for better mod substitution suggestions during major version shifts
- Two-link Match cell layout:
  - `Direct - Source` (direct file URL, used by export)
  - `Site - Source` (project/mod page URL, excluded from export)
- New `Last Updated` controls:
  - date filter
  - `Newest` / `Oldest` sorting
- Multi-token filter support using `;` separators in header text filters (OR matching)
- New compare workflow when ignore-on-target mode is enabled:
  - `Upload Old ZIP/Folder`
  - `Upload New ZIP/Folder`
  - `Search for Updates` is locked until both sides are selected

### Changed
- Filter note added under scan metadata to document multi-token filter syntax
- Ignore-on-target flow now compares old pack results against new pack contents before final render/export

</details>

---

<details>
<summary><strong>Version 0.3.1</strong></summary>

### Added
- Added extension icons across required sizes and manifest mappings

### Fixed
- Corrected all `1.26` references to `26.1`
- Fixed upgrade logic to properly follow target-version matching behavior
- Fixed export file conversion

</details>

---

<details>
<summary><strong>Version 0.3.0 </strong></summary>

### Added
- Mode-aware recommendation column in results:
  - `Upgradable` in Upgrade mode
  - `Downgradable` in Downgrade mode
- Header-level table filters for quick narrowing during review
- Filename prompt before export so users can name files before download
- Optional Modrinth API key input in Settings

### Changed
- Export flow is now JDownloader2-focused:
  - outputs `.meta4` (Metalink v4) using found direct download links
  - respects currently active filters
- Folder scanning now sends lightweight metadata payloads to avoid Chrome extension message size limits (64MiB class failures)
- API key handling is now settings-only (removed file-based fallback config)
- SNES theme naming and styling pass updated (`SNES`)
- Settings page simplified by removing redundant or unused controls
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
