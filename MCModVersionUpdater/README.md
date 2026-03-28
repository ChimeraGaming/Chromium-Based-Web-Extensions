# Mod Update Checker

Version `2.0`

Mod Update Checker is a Chromium-based extension that scans Minecraft modpacks and compares mods against a selected target Minecraft version.

It is built to speed up upgrade, downgrade, comparison, duplicate check, and targeted update workflows.

<img width="1123" height="902" alt="image" src="https://github.com/user-attachments/assets/b05be34e-4f26-4db7-bdb4-92eac887d46f" />
<img width="354" height="373" alt="image" src="https://github.com/user-attachments/assets/11b06a93-e9c4-4961-a87c-b5b50cd2c1a3" />

---

## Overview

Mod Update Checker analyzes ZIP files and folders, then compares each mod against supported sources.

The results table includes:

- Mod name
- Current version
- Selected version
- Match status
- Upgrade or downgrade state by mode
- Last updated date
- Direct and site links

---

## Core Features

- Single upload flow with ZIP and folder support
- Header filters with multi-token `;` matching
- Last Updated filtering with newest and oldest sorting
- Match links split into `Direct - Source` for downloads and `Site - Source` for project pages
- Export to `.meta4` for JDownloader2
- `Download All` support for filtered direct links
- Theme support for Light, Dark, Github (Dark), and SNES
- Draggable in-page panel that closes after successful scans

---

## Scan Modes

- `Upgrade Current Pack`
- `Downgrade Current Pack`
- `Missing Mods (Compare Old and New)`
- `Check for Updates`
- `Duplicate Check`
- `Attempt to update mod (Fabric only)`

---

## Attempt To Update Mod (Fabric Only)

This mode takes one Fabric JAR and:

- Opens the archive
- Locates `fabric.mod.json` or `fabric.mod.jsonm`
- Updates the `minecraft` dependency to the selected target version
- Updates the Fabric Loader dependency using the minimum available loader for the target version
- Rebuilds the JAR and prompts for an output filename

---

## Settings

- Target Minecraft version database
- Default search mode
- Reverse search toggle
- Include beta and alpha toggles
- Fuzzy replacement search toggle
- Theme and table density
- Additional Sources list
- Prefer Additional Sources toggle
- CurseForge API key support
- Optional Modrinth API key support

---

## Additional Sources

Additional Sources can be added one URL per line.

If `Prefer Additional Sources over Modrinth/CurseForge` is enabled, those sources are checked first and fallback sources are used only when no match is found.

---

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer Mode**.
4. Click **Load unpacked**.
5. Select the extension folder.

---

## Usage

1. Open Modrinth or CurseForge.
2. Open the panel.
3. Select a scan mode.
4. Select a target Minecraft version.
5. Upload a ZIP or folder.
6. Review and filter the results.
7. Export `.meta4` or use `Download All`.

---

## Notes

- This tool assists with discovery and matching. It does not guarantee full pack compatibility.
- Some mods may not have files for the selected target version.
- If CurseForge API is not configured, CurseForge rows can show `ADD CURSEFORGE API`.
- Version `26.1` is included in the default version database.
- If you want something added, please open a GitHub issue.

---

## Release Status

Current stable release: `2.0`

For full release history, see [CHANGELOG.md](./CHANGELOG.md).

---

## License

See [LICENSE](./LICENSE).

---

## Author

ChimeraGaming  
GitHub: https://github.com/ChimeraGaming
