# Mod Update Checker

Version 0.2.0

A Chromium-based extension that scans a Minecraft modpack ZIP and helps identify which mods have updates available for a target Minecraft version.

Built to reduce friction when upgrading modpacks between versions.

---

## Overview

Mod Update Checker analyzes your modpack and compares each mod against available versions from supported sources like CurseForge and Modrinth.

Instead of manually checking dozens or hundreds of mods, this tool gives you a clear, structured view of:

- What version you currently have
- What version exists for your target Minecraft version
- Whether a valid match was found
- Where the match came from

---

## Core Features

- Upload or drag and drop a modpack ZIP
- Automatically parses mod list data
- Detects current mod versions from filenames
- Identifies target Minecraft version compatibility
- Displays results in a structured table:
  - Mod Name
  - Current Version
  - Target Version
  - Match Status (✓ / ✗)
  - Source (cleaned, no full paths)

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
- Clean, minimal configuration (no API key required)

---

## Roadmap

Accessible directly from the extension UI.

Planned improvements include:

- Additional source support (GitHub, custom repos)
- Smarter filename to mod matching
- Better version resolution across loaders (Fabric, Forge, Quilt)
- UI enhancements (sorting, resizing columns, filtering)
- META4 export support for JDownloader2
- Improved duplicate detection

---

## Installation

1. Download or clone this repository
2. Open Chrome and go to:
   chrome://extensions
3. Enable Developer Mode
4. Click "Load unpacked"
5. Select the extension folder

---

## Usage

1. Open the extension
2. Select: Upgrade or Downgrade
3. Select: Mod version
4. Upload or drag in a modpack ZIP
5. Review results in the table

---

## Notes

- This tool does not guarantee compatibility between mods
- It is designed to assist discovery and reduce manual work
- Some mods may not have versions available for your target
- This tool does not guarantee 100% Conversion and the goal is 50% converstion to be successful.

---

## Project Status

Active development  
Version 0.2.0 introduces:

- UI cleanup and simplification
- Upgrade mode naming update
- Roadmap integration fixes
- Removal of unnecessary dependencies and settings

---

## License

See LICENSE file for details.

---

## Author

ChimeraGaming  
GitHub: https://github.com/ChimeraGaming
