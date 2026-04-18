# Changelog

All notable changes to this project are documented here.

---

<details open>
<summary><strong>Version 2.x</strong></summary>

<details open>
<summary><strong>Version 2.1</strong></summary>

### Fixed
- Scan failures caused by `Resource::kQuotaBytes quota exceeded` now fail safely, and Settings now points you to `Clear API cache` when that error appears.

</details>

</details>

<details>
<summary><strong>Version 1.x</strong></summary>

<details>
<summary><strong>Version 1.0.0</strong></summary>

### Changed
- Promoted the extension to the `1.0.0` stable release line.
- Moved advanced runtime toggles to the Settings page for a cleaner in-page panel:
  - reverse search
  - fuzzy replacement search
  - ignore current-target mods
  - only updates on current-target mods
- Moved theme selection to Settings-only while keeping live theme updates on save.

### Improved
- Match column now clearly separates links:
  - `Direct - Source` for exportable file links
  - `Site - Source` for project pages excluded from export
- Results filtering supports `;` token lists and Last Updated sort direction control.

### Refined
- Removed legacy script `content_display_filename.js` with no remaining runtime references.

</details>

</details>

---

<details>
<summary><strong>Beta (0.x)</strong></summary>

<details open>
<summary><strong>Version 0.3.2</strong></summary>

### Added
- Optional setting for fuzzy description-based replacement search.
- Two-link Match layout:
  - `Direct - Source`
  - `Site - Source`
- New Last Updated controls:
  - date filter
  - `Newest` and `Oldest` sorting
- Header filters support `;` multi-token OR matching.
- Compare workflow for ignore-on-target mode:
  - old pack upload
  - new pack upload
  - gated search once both are selected

### Changed
- Added filter syntax note under scan metadata.
- Ignore-on-target flow compares old pack rows against new pack rows before render and export.

</details>

<details>
<summary><strong>Version 0.3.1</strong></summary>

### Added
- Added extension icons with manifest mappings.

### Fixed
- Corrected `1.26` references to `26.1`.
- Fixed upgrade logic for strict target-version matching.
- Fixed export file conversion.

</details>

<details>
<summary><strong>Version 0.3.0</strong></summary>

### Added
- Mode-aware recommendation column:
  - `Upgradable` in Upgrade mode
  - `Downgradable` in Downgrade mode
- Header-level table filters.
- Filename prompt before export save.
- Optional Modrinth API key in settings.

### Changed
- Export flow moved to JDownloader2 `.meta4`.
- Export uses found direct links and respects active filters.
- Folder scanning sends compact metadata payloads to avoid extension message size failures.
- API keys moved to settings-only handling.
- Theme naming updated to `SNES`.
- Settings page cleaned to remove redundant controls.

### Fixed
- Roadmap and settings open behavior from panel context.
- Missing CurseForge key clarity:
  - `Unknown` replaced with `ADD CURSEFORGE API` where applicable

</details>

<details>
<summary><strong>Version 0.2.0</strong></summary>

### Added
- Upgrade mode for streamlined mod version transitions.
- Integrated roadmap page from all extension entry points.
- Simplified navigation and settings flow.

### Improved
- Cleaner source display.
- Better UI layout consistency.
- Improved duplicate handling.
- Improved scrollbar visibility.

### Refined
- Reduced unnecessary dependencies and background logic.
- Streamlined script structure and manifest.

</details>

<details>
<summary><strong>Version 0.1.0</strong></summary>

### Added
- Initial Manifest v3 extension architecture.
- Modpack ZIP parsing and analysis.
- Filename-based mod detection.
- Version comparison engine.
- CurseForge and Modrinth integration.
- Structured results table and panel UI.
- Settings and roadmap pages.

</details>

</details>
