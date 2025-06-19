## **2025**
## June 18th
![image](https://github.com/user-attachments/assets/031beea4-4d7b-4009-b9a1-5ab710e6bfe0)
![image](https://github.com/user-attachments/assets/34b9f87c-243d-4885-860f-b7cc613f39cf)


---

## June 19th
![image](https://github.com/user-attachments/assets/72f48174-b803-4986-b940-0f1284440ede)
![image](https://github.com/user-attachments/assets/d305202a-79a6-4b6c-a14f-8e3ef98d959d)
![image](https://github.com/user-attachments/assets/a111d25a-9720-429f-8208-2fe22b83e9c9)

![image](https://github.com/user-attachments/assets/158825f8-2ac7-461e-91e5-258f5f6612d3)
![image](https://github.com/user-attachments/assets/8ea3fdd0-dbfa-4e36-8333-a78074edd8c1)



---

## 📝 Extension Changelog – Amazon Save For Later Organizer

---

### [v0.1.0] – Initial Console Scan
- Basic console script for scanning “Save for Later” items.
- Extracted title from anchor, image, or span fallback.
- Logged results in console, no categorization or UI.

---

### [v0.2.0] – Keyword Categorization
- Introduced `CATEGORY_KEYWORDS` for auto-sorting items.
- Implemented `classifyProduct()` scoring based on keyword hits.
- Console logs now include category results and match count.

---

### [v0.3.0] – Sidebar UI Framework
- Injected floating sidebar with buttons and category container.
- Buttons: `Start Scan`, `Stop`, `Populate`.
- Status indicator added for scan progress feedback.

---

### [v0.4.0] – Scrolling Scan Engine
- Enabled scroll-based page scan using `setInterval`.
- Detected and collected `data-itemid` elements on scroll.
- Tracked number of items seen and estimated remaining.

---

### [v0.5.0] – Item Categorization and Display
- Rendered categorized items into collapsible sections.
- Each item displayed as a shortened link.
- Marked out-of-stock and broken links with special styling.

---

### [v0.6.0] – Search and Filtering
- Added search bar to sidebar.
- Filters visible items in real-time by search term match.
- Retains category grouping while filtering.

---

### [v0.7.0] – Title Normalization
- Added `getBestTitle()` function for consistent title extraction.
- Improved fallback behavior for weak or missing link text.
- Title cleanup to remove unnecessary spacing or boilerplate.

---

### [v0.8.0] – Classification Logging
- Refined console output format for easier debug reading.
- Each scan step shows what item is being classified and how.
- Added scan summary with categorized and failed item count.

---

### [v0.9.0] – Rename Untitled Items Logic
- Implemented rename routine for items labeled `Untitled Item #`.
- Re-checks DOM to find accurate item titles.
- Updates textContent of affected list entries and shows result count.

---

### [v0.10.0] – Persistent Repopulation Support
- Added `Repopulate` button to rebuild UI without re-scanning.
- Stores scanned elements in memory to reuse later.
- Avoids duplicate scan unless explicitly triggered.

---

### [v0.11.0] – Duplicate Button Fix
- Ensured `Rename` button does not appear multiple times.
- Prevents re-insertion of handlers on each repopulate.
- Slight style tweaks for button alignment.

---

### [v1.0.0] – Visual Theme and UI Polish
- Introduced neon dark-mode theme with glowing gradient effects.
- Progress bar, search, cards, and sidebar now match visually.
- Finalized layout, animations, and default injection behavior.

---

### [v1.1.0] – Unified Theme Integration
- Applied consistent neon-glow theme across all components.
- Matched progress bar styling to rest of UI (gradient, pulsing animation, shadow).
- Replaced any legacy neutral styling with vibrant card-shadow and accent tones.

---

### [v1.2.0] – Button Fade + Content Shift
- Improved end-of-scan UX:
  - "Populate" button fades out smoothly.
  - Remaining sidebar content slides up to fill space.
- Prevents leftover blank area at the top of the sidebar.

---

### [v1.3.0] – Sidebar Injection Fixes
- Corrected a regression where sidebar failed to auto-inject on some page loads.
- Hardened `DOMContentLoaded` and fallback listener.
- Ensured multiple instances aren’t injected by mistake.

---

### [v1.4.0] – Stability + Style Patch
- Polished layout to fix spacing on search + result list.
- Increased reliability of scroll detection and population accuracy.
- Improved `item-line` spacing and hover lighting for visual clarity.


