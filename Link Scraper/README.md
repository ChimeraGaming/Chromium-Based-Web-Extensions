# Link Scraper

![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![Chromium Based](https://img.shields.io/badge/Chromium-Based-0F172A?style=for-the-badge&logo=googlechrome&logoColor=white)
![Meta4 Export](https://img.shields.io/badge/Export-.meta4-2563EB?style=for-the-badge)
![License](https://img.shields.io/badge/License-Custom%20MIT-16A34A?style=for-the-badge)

Link Scraper is a Chromium based extension that opens a floating overlay panel on the current page and collects visible `http` and `https` links.

It is built for fast link collection, include and exclude filtering, lightweight cleanup, optional descriptions, PokeHarbor ROM hack workflows, and `.meta4` export for download manager tools such as JDownloader2.

---

## Features

- Scrape links directly from the current page
- Filter results with visible **Filter In** and **Filter Out** fields
- Use **Edit** mode to remove links from the current result set
- Use **Descriptions** mode to attach notes to links
- Save filtered links as a `.meta4` file
- Work from a draggable, resizable overlay panel
- Use **All Links** mode for general page scraping
- Use **PokeHarbor** mode for ROM hack download collection
- Follow PokeHarbor category pagination automatically
- Detect the current PokeHarbor category page automatically
- Scrape PokeHarbor ROM hack posts from the main content area only
- Ignore PokeHarbor navigation, ads, sidebars, author links, footer links, and pagination links
- Open each PokeHarbor ROM hack post and choose one usable download host link
- Prefer common download hosts such as MediaFire, Mega, Google Drive, Dropbox, Pixeldrain, GoFile, Archive.org, and 1fichier
- Show live progress bars for scraping steps such as collecting ROM posts and finding download links
- Include page number and ROM hack title descriptions in the visible output

---

## PokeHarbor Mode

PokeHarbor mode is designed for category pages such as:

```text
https://www.pokeharbor.com/category/roms/gba/
https://www.pokeharbor.com/category/roms/nds-roms/
https://www.pokeharbor.com/category/roms/gbc/
https://www.pokeharbor.com/category/rpgxp/
https://www.pokeharbor.com/category/completed-roms/
```

It also works when opened from later pagination pages, such as:

```text
https://www.pokeharbor.com/category/roms/gba/page/2/
```

When PokeHarbor mode is active, the extension:

1. Detects the current category.
2. Finds the real first page for that category.
3. Detects the last pagination page.
4. Scrapes ROM hack post links from the main content grid.
5. Opens each ROM hack post.
6. Finds the best available download host button or link.
7. Keeps one working download link per ROM hack.
8. Saves the final list as a `.meta4` file.

This prevents JDownloader2 from receiving the PokeHarbor article pages when the actual goal is to collect the host download links.

---

## Download Host Priority

PokeHarbor mode currently prioritizes download hosts in this order:

```text
MediaFire
Mega
Google Drive
Dropbox
Pixeldrain
GoFile
Archive.org
1fichier
Other likely download links
```

If no download link is found inside a ROM hack post, the item is skipped from the `.meta4` output and counted as a missing download in the status text.

---

## Manual Installation

1. Clone or download this repository.
2. Open `chrome://extensions/`.
3. Enable **Developer Mode**.
4. Click **Load unpacked**.
5. Select the `Link Scraper` folder.

---

## Basic Usage

1. Open the page you want to inspect.
2. Click the extension icon to open the overlay.
3. Choose **All Links** or **PokeHarbor** mode.
4. Click **Scrape links** or **Scrape PokeHarbor**.
5. Use **Filter In** and **Filter Out** if needed.
6. Switch to **Edit** or **Descriptions** mode when you want to refine the list.
7. Save the filtered result as `.meta4` when ready.

---

## Interface Preview

### Scraping

<img width="416" height="357" alt="Link Scraper scraping view" src="https://github.com/user-attachments/assets/eade60d1-f3e1-4432-9313-f9f22220b410" />

### Filtering

<img width="415" height="355" alt="Link Scraper filtering view" src="https://github.com/user-attachments/assets/62a3d215-1e7d-4371-8f1a-1d4783da3d3d" />

### Descriptions

<img width="414" height="324" alt="Link Scraper descriptions view" src="https://github.com/user-attachments/assets/65288608-8ee5-43f7-9d41-77e0473d5f73" />

### Main View

<img width="1867" height="952" alt="Link Scraper main view" src="https://github.com/user-attachments/assets/a47680f9-85f6-424f-be4a-fd6300aa0e3c" />

### PokeHarbor Scraping

<img width="478" height="492" alt="Link Scraper PokeHarbor scraping view" src="https://github.com/user-attachments/assets/06259ac9-ffa0-4b4e-bc53-21c8903e7757" />

---

## Output Format

In the overlay, PokeHarbor results include descriptions like:

```text
Page 1 | Pokemon Null
https://download-host-link.example/file
```

The saved `.meta4` file stores the actual download URL inside each file entry:

```xml
<file name="Page 1 | Pokemon Null">
  <url>https://download-host-link.example/file</url>
</file>
```

This lets the visible list stay readable while keeping the exported file useful for download managers.

---

## Permissions

The extension uses the following permissions:

```json
{
  "permissions": ["activeTab", "scripting", "clipboardWrite"]
}
```

PokeHarbor mode also requires host access for PokeHarbor pages so it can follow category pagination and read individual ROM hack posts.

---

## Project Notes

- Built for Chromium based browsers
- Uses Manifest V3
- Runs as a floating overlay injected into the active tab
- No external framework required
- Designed for quick download manager workflows
- General link scraping remains separate from PokeHarbor specific scraping

---

## License

This project uses a custom MIT style license.

The name **ChimeraGaming** must remain credited as the primary original creator in public forks, redistributions, or derivative works.
