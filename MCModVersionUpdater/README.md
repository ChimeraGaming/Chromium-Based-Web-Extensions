# Mod Update Checker

Version 0.3.0

A Chromium-based extension that scans a Minecraft modpack ZIP or folder and helps identify which mods have compatible versions available for a target Minecraft version.

Built to reduce friction when upgrading or downgrading modpacks between versions.

---

## Overview

Mod Update Checker analyzes your pack and compares each mod against available versions from supported sources like CurseForge and Modrinth.

Instead of manually checking dozens or hundreds of mods, this tool gives you a clear, structured view of:

- What version you currently have
- What version exists for your target Minecraft version
- Whether a valid match was found
- Whether a mod is upgradable or downgradable in the active mode
- Where the match came from

---

## Core Features

- Upload or drag and drop a modpack ZIP
- Upload a full modpack folder (large folder handling improved)
- Automatically parses:
  - `manifest.json`
  - `modrinth.index.json`
  - `modlist.html`
- Detects current mod versions from filenames and manifest metadata
- Supports target Minecraft version matching with reverse-compatible search
- Displays results in a structured table with header-level filters
- Theme support:
  - Light
  - Dark
  - Github (Dark)
  - SNES
- JDownloader2 export:
  - Uses direct links only from found versions
  - Respects active filters
  - Prompts for filename before saving

---

## Modes

### Upgrade
Scan mods and find available updates for a newer Minecraft version.

### Downgrade
Scan mods and find compatible versions for an older Minecraft version.

---

## Settings

- Use detected source version or manually define target version
- Toggle backward search if no results are found
- Include or exclude beta and alpha recommendations
- Configure table density and theme
- Set API keys from Settings:
  - `CurseForge API key` for CurseForge metadata lookups
  - `Modrinth API key` for optional authenticated Modrinth requests

---

## Roadmap

Accessible directly from the extension UI.

Planned improvements include:

- Additional source support (GitHub and curated custom repos)
- Smarter filename-to-project matching
- Better cross-loader version resolution (Fabric, Forge, Quilt, NeoForge)
- Dependency-aware warnings before export
- Manual match correction flow for edge cases
- Optional rebuild flow after review

---

## Installation

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click **Load unpacked**.
5. Select the extension folder.

---

## Usage

1. Open Modrinth or CurseForge.
2. Open the extension panel.
3. Select mode: Upgrade or Downgrade.
4. Choose or enter a target Minecraft version.
5. Upload a ZIP or folder.
6. Review and filter results.
7. Export links for JDownloader2 if needed.

---

## Notes

- This tool helps discovery and does not guarantee full modpack compatibility.
- Some mods may not have versions available for your target.
- If CurseForge API is not set, CurseForge-based version rows can show `ADD CURSEFORGE API`.
- Current version database includes `26.1` and stable historical versions.

---

## Project Status

Active development.

Version 0.3.0 introduces:

- Mode-aware `Upgradable` and `Downgradable` result column
- Filter-aware JDownloader2 export with filename prompt
- Folder scan payload improvements to avoid extension message size errors
- Settings simplification and settings-only API key handling
- Theme system expansion and refinement

For detailed release history, see [CHANGELOG.md](./CHANGELOG.md).

---

## License

See LICENSE file for details.

---

## Author

ChimeraGaming
GitHub: https://github.com/ChimeraGaming
