(() => {
  if (document.getElementById("muc-root")) return;

  function el(tag, props = {}, html = "") {
    const node = document.createElement(tag);
    Object.assign(node, props);
    if (html) node.innerHTML = html;
    return node;
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (m) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[m]));
  }

  function domainFromUrl(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch { return url; }
  }

  function isGithubRepoUrl(url) {
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/").filter(Boolean);
      return u.hostname.includes("github.com") && parts.length >= 2;
    } catch {
      return false;
    }
  }

  function buildExternalLinks(query, sourceUrls) {
    const encodedQuery = encodeURIComponent(query || "");
    return (sourceUrls || []).map((url) => {
      try {
        const parsed = new URL(url);
        if (isGithubRepoUrl(url)) {
          const parts = parsed.pathname.split("/").filter(Boolean);
          const repoBase = `https://github.com/${parts[0]}/${parts[1]}`;
          return {
            label: `${parts[0]}/${parts[1]}`,
            href: `${repoBase}/search?q=${encodedQuery}&type=code`
          };
        }
        const domain = parsed.hostname.replace(/^www\./, "");
        return {
          label: domain,
          href: `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${query || ""}`)}`
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  const DEFAULTS = {
    includeBeta: false,
    includeAlpha: false,
    density: "comfortable",
    targetVersion: "",
    reverseCompatible: true,
    fuzzyDescriptionReplacementSearch: false,
    ignoreCurrentVersionMods: false,
    onlyUpdatesCurrentSelected: false,
    theme: "light",
    curseforgeApiKey: "",
    modrinthApiKey: "",
    scanMode: "mods",
    additionalSourceUrls: [],
    minecraftVersionDatabase: [
      "26.1",
      "1.21.11","1.21.10","1.21.9","1.21.8","1.21.7","1.21.6","1.21.5","1.21.4","1.21.3","1.21.2","1.21.1","1.21",
      "1.20.6","1.20.5","1.20.4","1.20.3","1.20.2","1.20.1","1.20",
      "1.19.4","1.19.3","1.19.2","1.19.1","1.19",
      "1.18.2","1.18.1","1.18",
      "1.17.1","1.17",
      "1.16.5","1.16.4","1.16.3","1.16.2","1.16.1","1.16",
      "1.15.2","1.15.1","1.15",
      "1.14.4","1.14.3","1.14.2","1.14.1","1.14",
      "1.13.2","1.13.1","1.13",
      "1.12.2","1.12.1","1.12",
      "1.11.2","1.11.1","1.11",
      "1.10.2","1.10.1","1.10",
      "1.9.4","1.9","1.8.9"
    ]
  };

  function normalizeLegacyVersion(version) {
    const clean = String(version || "").trim();
    return clean === "1.26" ? "26.1" : clean;
  }

  function isKnownVersion(version) {
    const clean = String(version || "").trim();
    return !!clean && clean !== "Unknown" && clean !== "Listed in pack" && clean !== "ADD CURSEFORGE API";
  }

  function formatLastUpdated(value) {
    const raw = String(value || "").trim();
    if (!raw) return { label: "Unknown", search: "", title: "", timestamp: null };
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return { label: "Unknown", search: "", title: "", timestamp: null };

    return {
      label: date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }),
      search: date.toISOString().toLowerCase(),
      title: date.toISOString(),
      timestamp: date.getTime()
    };
  }

  function titleCaseWord(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  function formatSourceLabel(provider, siteUrl) {
    const fromProvider = String(provider || "").trim();
    if (fromProvider) return titleCaseWord(fromProvider);
    const host = String(domainFromUrl(siteUrl || "") || "").trim();
    if (!host) return "Unknown";
    if (host.includes("github")) return "Github";
    if (host.includes("modrinth")) return "Modrinth";
    if (host.includes("curseforge")) return "CurseForge";
    const root = host.split(".")[0];
    return titleCaseWord(root || host);
  }

  function parseFilterTokens(value) {
    return String(value || "")
      .split(";")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
  }

  function matchesFilterTokens(source, tokens) {
    if (!tokens.length) return true;
    const value = String(source || "").toLowerCase();
    return tokens.some((token) => value.includes(token));
  }

  function normalizeModIdentity(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\.jar$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function rowIdentity(row) {
    if (!row || (row.sourceType !== "jar" && row.sourceType !== "modlist.html")) return "";
    const fileName = String(row.path || "").split("/").pop() || "";
    const candidates = [
      row.mod,
      row.displayName,
      fileName,
      row.slug,
      row.query
    ];
    for (const value of candidates) {
      const normalized = normalizeModIdentity(value);
      if (normalized) return normalized;
    }
    return "";
  }

  function filterResultsByExistingMods(primaryScan, existingScan) {
    const existingIds = new Set(
      (existingScan?.results || [])
        .map((row) => rowIdentity(row))
        .filter(Boolean)
    );
    if (!existingIds.size) return primaryScan;

    const filteredResults = (primaryScan?.results || []).filter((row) => {
      if (row.sourceType !== "jar" && row.sourceType !== "modlist.html") return true;
      const id = rowIdentity(row);
      return !id || !existingIds.has(id);
    });

    return {
      ...primaryScan,
      results: filteredResults,
      count: filteredResults.length,
      comparedWith: existingScan?.fileName || null
    };
  }

  function sanitizeMinecraftVersionDatabase(versions) {
    const input = Array.isArray(versions) && versions.length ? versions : DEFAULTS.minecraftVersionDatabase;
    const seen = new Set();
    return input.filter((version) => {
      const clean = normalizeLegacyVersion(version);
      if (!clean || seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
  }

  async function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULTS, (items) => {
        const normalized = {
          ...items,
          targetVersion: normalizeLegacyVersion(items.targetVersion),
          minecraftVersionDatabase: sanitizeMinecraftVersionDatabase(items.minecraftVersionDatabase)
        };
        const changedTarget = normalized.targetVersion !== String(items.targetVersion || "");
        const changedDb = JSON.stringify(normalized.minecraftVersionDatabase) !== JSON.stringify(items.minecraftVersionDatabase || DEFAULTS.minecraftVersionDatabase);
        if (changedTarget || changedDb) {
          chrome.storage.sync.set({
            targetVersion: normalized.targetVersion,
            minecraftVersionDatabase: normalized.minecraftVersionDatabase
          }, () => resolve(normalized));
          return;
        }
        resolve(normalized);
      });
    });
  }

  async function setSettings(partial) {
    const payload = { ...(partial || {}) };
    if ("targetVersion" in payload) payload.targetVersion = normalizeLegacyVersion(payload.targetVersion);
    if ("minecraftVersionDatabase" in payload) payload.minecraftVersionDatabase = sanitizeMinecraftVersionDatabase(payload.minecraftVersionDatabase);
    return new Promise((resolve) => chrome.storage.sync.set(payload, resolve));
  }

  const THEMES = new Set(["light", "dark", "github-dark", "snes-rainbow"]);

  function normalizeTheme(theme) {
    const clean = String(theme || "").trim().toLowerCase();
    return THEMES.has(clean) ? clean : "light";
  }

  function setThemeClass(node, theme) {
    if (!node) return;
    const classes = ["muc-theme-light", "muc-theme-dark", "muc-theme-github-dark", "muc-theme-snes-rainbow"];
    node.classList.remove(...classes);
    node.classList.add(`muc-theme-${normalizeTheme(theme)}`);
  }

  function openRoadmap() {
    chrome.runtime.sendMessage({ type: "OPEN_ROADMAP_PAGE" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        window.open(chrome.runtime.getURL("roadmap.html"), "_blank");
      }
    });
  }

  function openSettings() {
    const openFallback = () => {
      try {
        window.open(chrome.runtime.getURL("options.html"), "_blank");
      } catch {}
    };
    try {
      chrome.runtime.sendMessage({ type: "OPEN_SETTINGS_PAGE" }, (response) => {
        if (chrome.runtime.lastError || !response?.ok) {
          openFallback();
        }
      });
    } catch {
      openFallback();
    }
  }

  function closeOverlay() {
    document.getElementById("muc-overlay")?.remove();
  }

  function downloadText(filename, text, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function sanitizeFilename(input, fallback) {
    const cleaned = String(input || "")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, " ");
    return cleaned || fallback;
  }

  function escapeXml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function inferExportFileName(url, fallbackName, index) {
    let fromUrl = "";
    try {
      const parsed = new URL(url);
      fromUrl = decodeURIComponent(parsed.pathname.split("/").pop() || "").trim();
    } catch {}
    const safe = sanitizeFilename(fromUrl || fallbackName || `mod-${index}`, `mod-${index}`);
    return /\.[a-z0-9]{2,8}$/i.test(safe) ? safe : `${safe}.jar`;
  }

  function buildMeta4(entries) {
    const lines = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<metalink xmlns="urn:ietf:params:xml:ns:metalink" version="4.0">',
      "  <generator>Mod Update Checker v1.0.0</generator>",
      `  <published>${new Date().toISOString()}</published>`
    ];
    for (const entry of entries) {
      lines.push(`  <file name="${escapeXml(entry.name)}">`);
      lines.push(`    <url>${escapeXml(entry.url)}</url>`);
      lines.push("  </file>");
    }
    lines.push("</metalink>");
    return lines.join("\n");
  }

  function renderOverlay(scanResult, settings) {
    closeOverlay();

    const selectedVersion = normalizeLegacyVersion(scanResult.targetVersion || scanResult.detectedGameVersion || "");
    const modeValue = (settings.scanMode || "mods") === "downgrade" ? "downgrade" : "upgrade";
    const modeLabel = modeValue === "downgrade" ? "Downgrade" : "Upgrade";
    const modeColumnLabel = modeValue === "downgrade" ? "Downgradable" : "Upgradable";
    const activeTheme = normalizeTheme(settings.theme);
    const density = ["compact", "comfortable", "expanded"].includes(settings.density) ? settings.density : "comfortable";
    const ignoreCurrentVersionMods = settings.ignoreCurrentVersionMods === true;
    const onlyUpdatesCurrentSelected = settings.onlyUpdatesCurrentSelected === true;
    const allRows = [...(scanResult.results || [])]
      .filter((row) => row.sourceType === "jar" || row.sourceType === "modlist.html")
      .map((row) => {
        const modFile = row.sourceType === "jar"
          ? (row.mod || row.displayName || (row.path ? row.path.split("/").pop() : "") || "")
          : (row.displayName || row.mod || "");
        const rawCurrentVersion = row.installedVersion || "Unknown";
        const currentVersion = row.sourceType === "modlist.html" && rawCurrentVersion === "Listed in pack"
          ? "Listed in modlist"
          : rawCurrentVersion;
        const isMatch = isKnownVersion(rawCurrentVersion)
          && selectedVersion
          && rawCurrentVersion === selectedVersion;
        const matchBaseLabel = row.match || modFile;
        const modrinthFiles = Array.isArray(row.recommended?.files) ? row.recommended.files : [];
        const primaryDownload = modrinthFiles.find((file) => file?.primary && file?.url) || modrinthFiles.find((file) => file?.url) || null;
        const directDownloadUrl = String(row.url || primaryDownload?.url || "").trim();
        const searchedVersion = String(row.searchedVersion || "");
        const strictVersionMatch = !selectedVersion || selectedVersion === "Unknown"
          ? !!directDownloadUrl
          : searchedVersion === selectedVersion;
        const modeAvailable = !!directDownloadUrl && strictVersionMatch;
        const matchFound = !!row.matchFound && modeAvailable;
        const siteUrl = String(row.projectUrl || row.listedUrl || "").trim();
        const sourceLabel = formatSourceLabel(row.provider, siteUrl || directDownloadUrl);
        const directLinkLabel = `Direct - ${sourceLabel}`;
        const siteLinkLabel = `Site - ${sourceLabel}`;
        const lastUpdatedRaw = row.lastUpdated || row.recommended?.date_published || primaryDownload?.date_published || "";
        const lastUpdated = formatLastUpdated(lastUpdatedRaw);
        return {
          modFile,
          currentVersion,
          currentVersionRaw: rawCurrentVersion,
          selectedVersion: selectedVersion || "Unknown",
          statusSymbol: isMatch ? "&#10004;" : "&#10060;",
          statusClass: isMatch ? "ok" : "bad",
          alreadyOnTarget: isMatch,
          modeSymbolHtml: modeAvailable ? (modeValue === "downgrade" ? "&#8595;" : "&#8593;") : "&#10060;",
          modeClass: modeAvailable ? "ok" : "bad",
          modeAvailable,
          lastUpdatedLabel: lastUpdated.label,
          lastUpdatedSearch: `${String(lastUpdated.label || "").toLowerCase()} ${lastUpdated.search}`.trim(),
          lastUpdatedTitle: lastUpdated.title,
          lastUpdatedTs: lastUpdated.timestamp,
          sourceLabel,
          directLinkLabel,
          siteLinkLabel,
          siteUrl,
          matchLabel: matchBaseLabel,
          matchSearch: `${matchBaseLabel} ${directLinkLabel} ${siteLinkLabel} ${sourceLabel}`.toLowerCase(),
          matchUrl: matchFound ? directDownloadUrl : "",
          matchFound,
          directDownloadUrl,
          searchedVersion
        };
      })
      .sort((a, b) => a.modFile.localeCompare(b.modFile, undefined, { sensitivity: "base" }));

    const rows = onlyUpdatesCurrentSelected
      ? allRows.filter((row) => row.alreadyOnTarget && row.matchFound)
      : ignoreCurrentVersionMods
        ? allRows.filter((row) => !row.alreadyOnTarget)
        : allRows;

    const overlay = el("div", { id: "muc-overlay", className: `muc-theme-${activeTheme}` });
    overlay.innerHTML = `
      <div class="muc-overlay-card muc-sheets-card" data-density="${escapeHtml(density)}">
        <div class="muc-overlay-top">
          <div class="muc-overlay-header">
            <div>
              <div class="muc-overlay-title">Scan Results</div>
              <div class="muc-overlay-file">${escapeHtml(scanResult.fileName || "ZIP file")}</div>
              <div class="muc-overlay-meta">Mode: ${escapeHtml(modeLabel)} | Loader: ${escapeHtml(scanResult.detectedLoader || "Unknown")} | Source MC: ${escapeHtml(scanResult.detectedGameVersion || "Unknown")} | Target MC: ${escapeHtml(selectedVersion || "Unknown")}</div>
              <div class="muc-overlay-filter-note">Note: Multiple filters can be set like: a;b;c;q;w;r and it will match any of those values.</div>
            </div>
            <div class="muc-actions muc-overlay-actions">
              <button class="muc-btn secondary" id="muc-export-jd2">Export META4</button>
              <button class="muc-btn secondary" id="muc-close-overlay">Close</button>
            </div>
          </div>
        </div>

        <div class="muc-table-wrap muc-sheets-wrap">
          <table class="muc-table muc-sheets-table">
            <thead>
              <tr>
                <th>Mod</th>
                <th>Current Version</th>
                <th>Selected Version</th>
                <th>Status</th>
                <th>${escapeHtml(modeColumnLabel)}</th>
                <th>Last Updated</th>
                <th>Match</th>
              </tr>
              <tr class="muc-filter-row">
                <th><input type="text" id="muc-filter-mod" class="muc-head-filter" placeholder="Filter mod"></th>
                <th><input type="text" id="muc-filter-current" class="muc-head-filter" placeholder="Filter current"></th>
                <th><input type="text" id="muc-filter-selected" class="muc-head-filter" placeholder="Filter selected"></th>
                <th>
                  <select id="muc-filter-status" class="muc-head-filter muc-head-select">
                    <option value="all">All</option>
                    <option value="match">Match</option>
                    <option value="mismatch">Mismatch</option>
                    <option value="no-match">No match</option>
                  </select>
                </th>
                <th>
                  <select id="muc-filter-mode" class="muc-head-filter muc-head-select">
                    <option value="all">All</option>
                    <option value="available">Available</option>
                    <option value="missing">Missing</option>
                  </select>
                </th>
                <th>
                  <div class="muc-last-updated-controls">
                    <input type="text" id="muc-filter-last-updated" class="muc-head-filter" placeholder="Filter date">
                    <select id="muc-sort-last-updated" class="muc-head-filter muc-head-select">
                      <option value="desc">Newest</option>
                      <option value="asc">Oldest</option>
                    </select>
                  </div>
                </th>
                <th><input type="text" id="muc-filter-match" class="muc-head-filter" placeholder="Filter match"></th>
              </tr>
            </thead>
            <tbody id="muc-overlay-rows"></tbody>
          </table>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const rowsBody = overlay.querySelector("#muc-overlay-rows");
    const modFilter = overlay.querySelector("#muc-filter-mod");
    const currentFilter = overlay.querySelector("#muc-filter-current");
    const selectedFilter = overlay.querySelector("#muc-filter-selected");
    const statusFilter = overlay.querySelector("#muc-filter-status");
    const modeFilter = overlay.querySelector("#muc-filter-mode");
    const lastUpdatedFilter = overlay.querySelector("#muc-filter-last-updated");
    const lastUpdatedSort = overlay.querySelector("#muc-sort-last-updated");
    const matchFilter = overlay.querySelector("#muc-filter-match");
    let filteredRows = rows;

    function renderRows() {
      const modTokens = parseFilterTokens(modFilter.value);
      const currentTokens = parseFilterTokens(currentFilter.value);
      const selectedTokens = parseFilterTokens(selectedFilter.value);
      const statusNeedle = statusFilter.value || "all";
      const modeNeedle = modeFilter.value || "all";
      const lastUpdatedTokens = parseFilterTokens(lastUpdatedFilter.value);
      const matchTokens = parseFilterTokens(matchFilter.value);
      const sortDirection = lastUpdatedSort?.value === "asc" ? "asc" : "desc";

      const filtered = rows.filter((row) => {
        if (!matchesFilterTokens(row.modFile, modTokens)) return false;
        if (!matchesFilterTokens(row.currentVersion, currentTokens)) return false;
        if (!matchesFilterTokens(row.selectedVersion, selectedTokens)) return false;
        if (!matchesFilterTokens(row.lastUpdatedSearch, lastUpdatedTokens)) return false;
        if (!matchesFilterTokens(row.matchSearch || row.matchLabel, matchTokens)) return false;
        if (statusNeedle === "match" && row.statusClass !== "ok") return false;
        if (statusNeedle === "mismatch" && (row.statusClass !== "bad" || !row.matchFound)) return false;
        if (statusNeedle === "no-match" && row.matchFound) return false;
        if (modeNeedle === "available" && !row.modeAvailable) return false;
        if (modeNeedle === "missing" && row.modeAvailable) return false;
        return true;
      });

      filtered.sort((a, b) => {
        const aTs = Number.isFinite(a.lastUpdatedTs) ? a.lastUpdatedTs : null;
        const bTs = Number.isFinite(b.lastUpdatedTs) ? b.lastUpdatedTs : null;
        if (aTs === null && bTs === null) {
          return a.modFile.localeCompare(b.modFile, undefined, { sensitivity: "base" });
        }
        if (aTs === null) return 1;
        if (bTs === null) return -1;
        if (aTs === bTs) {
          return a.modFile.localeCompare(b.modFile, undefined, { sensitivity: "base" });
        }
        return sortDirection === "asc" ? aTs - bTs : bTs - aTs;
      });

      filteredRows = filtered;

      rowsBody.innerHTML = filtered.length ? filtered.map((row) => `
        <tr>
          <td>${escapeHtml(row.modFile)}</td>
          <td>${escapeHtml(row.currentVersion)}</td>
          <td>${escapeHtml(row.selectedVersion)}</td>
          <td class="muc-status-cell"><span class="muc-status-symbol ${row.statusClass}">${row.statusSymbol}</span></td>
          <td class="muc-status-cell"><span class="muc-mode-symbol ${row.modeClass}">${row.modeSymbolHtml}</span></td>
          <td title="${escapeHtml(row.lastUpdatedTitle || "")}">${escapeHtml(row.lastUpdatedLabel)}</td>
          <td class="muc-match-cell">
            <div class="muc-match-links">
              ${row.matchFound
                ? `<a class="muc-link" href="${escapeHtml(row.matchUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.directLinkLabel)}</a>`
                : `<span class="muc-no-match">${escapeHtml(`${row.directLinkLabel} (No match)`)}</span>`
              }
              ${row.siteUrl
                ? `<a class="muc-link muc-link-secondary" href="${escapeHtml(row.siteUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.siteLinkLabel)}</a>`
                : `<span class="muc-no-match">${escapeHtml(`${row.siteLinkLabel} (Unavailable)`)}</span>`
              }
            </div>
          </td>
        </tr>
      `).join("") : `
        <tr>
          <td colspan="7" class="muc-empty-row">No rows match the current header filters.</td>
        </tr>
      `;
    }

    [modFilter, currentFilter, selectedFilter, lastUpdatedFilter, matchFilter].forEach((node) => {
      node.addEventListener("input", renderRows);
    });
    statusFilter.addEventListener("change", renderRows);
    modeFilter.addEventListener("change", renderRows);
    if (lastUpdatedSort) lastUpdatedSort.addEventListener("change", renderRows);
    renderRows();

    overlay.querySelector("#muc-close-overlay").addEventListener("click", closeOverlay);

    overlay.querySelector("#muc-export-jd2").addEventListener("click", () => {
      const exportRows = filteredRows
        .map((row) => ({
          url: String(row.directDownloadUrl || "").trim(),
          fallbackName: row.modFile || row.matchLabel || "mod"
        }))
        .filter((row) => row.url);

      const seenUrls = new Set();
      const uniqueRows = exportRows.filter((row) => {
        if (seenUrls.has(row.url)) return false;
        seenUrls.add(row.url);
        return true;
      });

      if (!uniqueRows.length) {
        alert("No direct download links were found for the current filters.");
        return;
      }

      const usedNames = new Map();
      const entries = uniqueRows.map((row, idx) => {
        const rawName = inferExportFileName(row.url, row.fallbackName, idx + 1);
        const lower = rawName.toLowerCase();
        const count = (usedNames.get(lower) || 0) + 1;
        usedNames.set(lower, count);
        if (count === 1) return { name: rawName, url: row.url };
        const extMatch = rawName.match(/(\.[a-z0-9]{2,8})$/i);
        const ext = extMatch ? extMatch[1] : "";
        const base = ext ? rawName.slice(0, -ext.length) : rawName;
        return { name: `${base}-${count}${ext}`, url: row.url };
      });

      const meta4 = buildMeta4(entries);
      const baseName = sanitizeFilename(
        String(scanResult.fileName || "mod-update-results").replace(/\.[^/.]+$/, ""),
        "mod-update-results"
      );
      const suggested = `${baseName}-${modeLabel.toLowerCase()}-links.meta4`;
      const userName = window.prompt("Save export as:", suggested);
      if (userName === null) return;
      const finalName = `${sanitizeFilename(String(userName || "").replace(/\.meta4$/i, ""), "mod-update-links")}.meta4`;
      downloadText(finalName, meta4, "application/metalink4+xml;charset=utf-8");
    });
  }

  function setProgress(root, percent, label, subtext = "") {
    const wrap = root.querySelector("#muc-progress-wrap");
    const fill = root.querySelector("#muc-progress-fill");
    const pct = root.querySelector("#muc-progress-pct");
    const lbl = root.querySelector("#muc-progress-text");
    const sub = root.querySelector("#muc-progress-subtext");
    if (!wrap || !fill || !pct || !lbl || !sub) return;
    wrap.classList.add("active");
    fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    pct.textContent = `${Math.round(percent)}%`;
    lbl.textContent = label || "Scanning...";
    sub.textContent = subtext || "";
  }

  function clearProgress(root) {
    const wrap = root.querySelector("#muc-progress-wrap");
    const fill = root.querySelector("#muc-progress-fill");
    const pct = root.querySelector("#muc-progress-pct");
    const lbl = root.querySelector("#muc-progress-text");
    const sub = root.querySelector("#muc-progress-subtext");
    if (!wrap || !fill || !pct || !lbl || !sub) return;
    fill.style.width = "0%";
    pct.textContent = "0%";
    lbl.textContent = "Idle";
    sub.textContent = "";
    wrap.classList.remove("active");
  }

  async function scanZipFile(file, root, options, preparingLabel = "Preparing ZIP") {
    setProgress(root, 2, preparingLabel, file.name);
    let port;
    try {
      const buffer = await file.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));

      port = chrome.runtime.connect({ name: "scan-progress" });
      const scanPromise = new Promise((resolve, reject) => {
        port.onMessage.addListener((msg) => {
          if (msg.type === "progress") {
            setProgress(root, msg.percent ?? 0, msg.label || "Scanning...", msg.subtext || "");
          } else if (msg.type === "result") {
            resolve(msg.payload);
          } else if (msg.type === "error") {
            reject(new Error(msg.error || "Unknown scan error"));
          }
        });
      });

      port.postMessage({
        type: "SCAN_WITH_PROGRESS",
        fileName: file.name,
        bytes,
        options
      });

      return await scanPromise;
    } finally {
      try { port?.disconnect(); } catch {}
    }
  }

  async function scanFolderFiles(files, root, options, preparingLabel = "Preparing folder") {
    setProgress(root, 2, preparingLabel, `${files.length} files selected`);
    const entries = [];
    const inlineTextFiles = new Set(["manifest.json", "modrinth.index.json", "modlist.html"]);
    const total = files.length || 1;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || !file.name) continue;
      const relPath = (file.webkitRelativePath || file.name || "").replace(/^\/+/, "");
      const baseName = relPath.split("/").pop().toLowerCase();
      if (inlineTextFiles.has(baseName)) {
        const text = await file.text();
        entries.push({ fileName: relPath, text });
      } else {
        entries.push({ fileName: relPath });
      }
      if (i % 200 === 0) {
        setProgress(root, 2 + Math.round((Math.min(i + 1, total) / total) * 18), "Indexing folder", `${i + 1}/${total} files prepared`);
      }
    }

    const folderName = (files[0]?.webkitRelativePath || "Selected Folder").split("/")[0] || "Selected Folder";
    let port;
    try {
      port = chrome.runtime.connect({ name: "scan-progress" });
      const scanPromise = new Promise((resolve, reject) => {
        port.onMessage.addListener((msg) => {
          if (msg.type === "progress") {
            setProgress(root, msg.percent ?? 0, msg.label || "Scanning...", msg.subtext || "");
          } else if (msg.type === "result") {
            resolve(msg.payload);
          } else if (msg.type === "error") {
            reject(new Error(msg.error || "Unknown scan error"));
          }
        });
      });

      port.postMessage({
        type: "SCAN_FOLDER_WITH_PROGRESS",
        fileName: folderName,
        entries,
        options
      });

      return await scanPromise;
    } finally {
      try { port?.disconnect(); } catch {}
    }
  }

  async function handleFile(file, triggerBtn, root, behavior = {}) {
    const idleText = behavior.idleText || "Upload ZIP";
    const busyText = behavior.busyText || "Scanning...";
    const preparingLabel = behavior.preparingLabel || "Preparing ZIP";
    const autoRender = behavior.autoRender !== false;
    const clearAfter = behavior.clearAfter !== false;

    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.textContent = busyText;
    }
    try {
      const options = behavior.options || await getSettings();
      const res = await scanZipFile(file, root, options, preparingLabel);
      if (res?.error) {
        alert("Scan failed: " + res.error);
        return null;
      }
      setProgress(root, 100, "Scan complete", `${res.count || 0} rows processed`);
      if (autoRender) renderOverlay(res, await getSettings());
      return res;
    } catch (err) {
      clearProgress(root);
      alert("Scan failed: " + (err?.message || String(err)));
      return null;
    } finally {
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.textContent = idleText;
      }
      if (clearAfter) setTimeout(() => clearProgress(root), 800);
    }
  }

  async function handleFolder(files, triggerBtn, root, behavior = {}) {
    const idleText = behavior.idleText || "Upload Folder";
    const busyText = behavior.busyText || "Scanning...";
    const preparingLabel = behavior.preparingLabel || "Preparing folder";
    const autoRender = behavior.autoRender !== false;
    const clearAfter = behavior.clearAfter !== false;

    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.textContent = busyText;
    }
    try {
      const options = behavior.options || await getSettings();
      const res = await scanFolderFiles(files, root, options, preparingLabel);
      if (res?.error) {
        alert("Scan failed: " + res.error);
        return null;
      }
      setProgress(root, 100, "Scan complete", `${res.count || 0} rows processed`);
      if (autoRender) renderOverlay(res, await getSettings());
      return res;
    } catch (err) {
      clearProgress(root);
      alert("Scan failed: " + (err?.message || String(err)));
      return null;
    } finally {
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.textContent = idleText;
      }
      if (clearAfter) setTimeout(() => clearProgress(root), 800);
    }
  }

  const root = el("div", { id: "muc-root" });
  root.innerHTML = `
    <div class="muc-card">
      <button class="muc-panel-close" id="muc-card-close" aria-label="Close">×</button>
      <div class="muc-title">Check Mod Updates?</div>
      <div class="muc-text">Upload or drag in a CurseForge or Modrinth ZIP. Pick what you want to do first, then scan. Advanced scan toggles now live in Settings.</div>

      <div class="muc-mode-row">
        <button class="muc-btn active" id="muc-mode-mods">Upgrade</button>
        <button class="muc-btn" id="muc-mode-downgrade">Downgrade</button>
      </div>

      <div class="muc-mode-row">
        <button class="muc-btn secondary" id="muc-open-settings">Settings</button>
        <button class="muc-btn secondary" id="muc-open-roadmap">RoadMap</button>
      </div>

      <div class="muc-grid">
        <div class="muc-field muc-full">
          <label class="muc-label">Target Minecraft version</label>
          <input class="muc-input" id="muc-target-version" list="muc-version-list" placeholder="Use detected source version">
          <datalist id="muc-version-list"></datalist>
        </div>
      </div>

      <div class="muc-source-row" id="muc-source-summary"></div>

      <div id="muc-standard-upload">
        <div class="muc-actions" style="margin-top:12px;">
          <button class="muc-btn primary" id="muc-upload">Upload ZIP</button>
          <button class="muc-btn secondary" id="muc-upload-folder">Upload Folder</button>
        </div>

        <div class="muc-dropzone" id="muc-dropzone">Drag and drop a ZIP here</div>
      </div>

      <div class="muc-dual-upload" id="muc-dual-upload" hidden>
        <div class="muc-dual-card">
          <div class="muc-dual-title">Upload Old ZIP/Folder</div>
          <div class="muc-actions">
            <button class="muc-btn primary" id="muc-upload-old-zip">Upload Old ZIP</button>
            <button class="muc-btn secondary" id="muc-upload-old-folder">Upload Old Folder</button>
          </div>
          <div class="muc-dual-status" id="muc-upload-old-status">Not selected</div>
        </div>

        <div class="muc-dual-card">
          <div class="muc-dual-title">Upload New ZIP/Folder</div>
          <div class="muc-actions">
            <button class="muc-btn primary" id="muc-upload-new-zip">Upload New ZIP</button>
            <button class="muc-btn secondary" id="muc-upload-new-folder">Upload New Folder</button>
          </div>
          <div class="muc-dual-status" id="muc-upload-new-status">Not selected</div>
        </div>

        <button class="muc-btn primary" id="muc-search-updates" disabled>Search for Updates</button>
      </div>

      <div class="muc-progress-wrap" id="muc-progress-wrap">
        <div class="muc-progress-label">
          <span id="muc-progress-text">Idle</span>
          <span id="muc-progress-pct">0%</span>
        </div>
        <div class="muc-progress-track"><div class="muc-progress-fill" id="muc-progress-fill"></div></div>
        <div class="muc-progress-subtext" id="muc-progress-subtext"></div>
      </div>

      <input type="file" id="muc-file" accept=".zip" hidden />
      <input type="file" id="muc-folder" webkitdirectory directory multiple hidden />
      <input type="file" id="muc-old-file" accept=".zip" hidden />
      <input type="file" id="muc-old-folder" webkitdirectory directory multiple hidden />
      <input type="file" id="muc-new-file" accept=".zip" hidden />
      <input type="file" id="muc-new-folder" webkitdirectory directory multiple hidden />
    </div>`;
  document.body.appendChild(root);
  setThemeClass(root, "light");

  const cardCloseBtn = root.querySelector("#muc-card-close");
  const standardUploadSection = root.querySelector("#muc-standard-upload");
  const dualUploadSection = root.querySelector("#muc-dual-upload");
  const uploadBtn = root.querySelector("#muc-upload");
  const folderBtn = root.querySelector("#muc-upload-folder");
  const fileInput = root.querySelector("#muc-file");
  const folderInput = root.querySelector("#muc-folder");
  const dropzone = root.querySelector("#muc-dropzone");
  const oldUploadZipBtn = root.querySelector("#muc-upload-old-zip");
  const oldUploadFolderBtn = root.querySelector("#muc-upload-old-folder");
  const newUploadZipBtn = root.querySelector("#muc-upload-new-zip");
  const newUploadFolderBtn = root.querySelector("#muc-upload-new-folder");
  const oldUploadStatus = root.querySelector("#muc-upload-old-status");
  const newUploadStatus = root.querySelector("#muc-upload-new-status");
  const searchUpdatesBtn = root.querySelector("#muc-search-updates");
  const oldFileInput = root.querySelector("#muc-old-file");
  const oldFolderInput = root.querySelector("#muc-old-folder");
  const newFileInput = root.querySelector("#muc-new-file");
  const newFolderInput = root.querySelector("#muc-new-folder");
  const targetInput = root.querySelector("#muc-target-version");
  const versionList = root.querySelector("#muc-version-list");
  const modeModsBtn = root.querySelector("#muc-mode-mods");
  const modeDownBtn = root.querySelector("#muc-mode-downgrade");
  const openSettingsBtn = root.querySelector("#muc-open-settings");
  const openRoadmapBtn = root.querySelector("#muc-open-roadmap");
  const sourceSummary = root.querySelector("#muc-source-summary");
  const compareUploads = { old: null, newer: null };
  let ignoreCurrentVersionMode = false;

  function describeSelection(selection) {
    if (!selection) return "Not selected";
    if (selection.kind === "folder") return `Folder: ${selection.label} (${selection.files.length} files)`;
    return `ZIP: ${selection.label}`;
  }

  function updateCompareSearchState() {
    searchUpdatesBtn.disabled = !(compareUploads.old && compareUploads.newer);
  }

  function setCompareSelection(which, selection) {
    compareUploads[which] = selection;
    if (which === "old") {
      oldUploadStatus.textContent = describeSelection(selection);
    } else {
      newUploadStatus.textContent = describeSelection(selection);
    }
    updateCompareSearchState();
  }

  function resetCompareSelections() {
    compareUploads.old = null;
    compareUploads.newer = null;
    oldUploadStatus.textContent = "Not selected";
    newUploadStatus.textContent = "Not selected";
    updateCompareSearchState();
  }

  function updateUploadModeLayout() {
    const dualMode = ignoreCurrentVersionMode === true;
    standardUploadSection.hidden = dualMode;
    dualUploadSection.hidden = !dualMode;
    if (!dualMode) resetCompareSelections();
    else updateCompareSearchState();
  }

  async function runSelectionScan(selection, rootNode, settings, phaseLabel) {
    if (!selection) return null;
    if (selection.kind === "folder") {
      return await scanFolderFiles(selection.files, rootNode, settings, phaseLabel || "Preparing folder");
    }
    return await scanZipFile(selection.file, rootNode, settings, phaseLabel || "Preparing ZIP");
  }

  getSettings().then((settings) => {
    const versions = (settings.minecraftVersionDatabase && settings.minecraftVersionDatabase.length) ? settings.minecraftVersionDatabase : DEFAULTS.minecraftVersionDatabase;
    versionList.innerHTML = versions.map(v => `<option value="${escapeHtml(v)}"></option>`).join("");
    targetInput.value = settings.targetVersion || "";
    ignoreCurrentVersionMode = settings.ignoreCurrentVersionMods === true && settings.onlyUpdatesCurrentSelected !== true;
    updateUploadModeLayout();
    setThemeClass(root, normalizeTheme(settings.theme));

    if ((settings.scanMode || "mods") === "downgrade") {
      modeDownBtn.classList.add("active");
      modeModsBtn.classList.remove("active");
    }

    const extraSources = settings.additionalSourceUrls || [];
    sourceSummary.innerHTML = extraSources.length
      ? extraSources.slice(0, 3).map((url) => `<span class="muc-source-chip">${escapeHtml(domainFromUrl(url))}</span>`).join("") + (extraSources.length > 3 ? `<span class="muc-source-chip">+${extraSources.length - 3} more</span>` : "")
      : `<span class="muc-source-chip">No extra sources saved</span>`;
  });

  targetInput.addEventListener("change", async () => { await setSettings({ targetVersion: targetInput.value.trim() }); });

  modeModsBtn.addEventListener("click", async () => {
    modeModsBtn.classList.add("active");
    modeDownBtn.classList.remove("active");
    await setSettings({ scanMode: "mods" });
  });

  modeDownBtn.addEventListener("click", async () => {
    modeDownBtn.classList.add("active");
    modeModsBtn.classList.remove("active");
    await setSettings({ scanMode: "downgrade" });
  });

  openSettingsBtn.addEventListener("click", openSettings);
  openRoadmapBtn.addEventListener("click", openRoadmap);

  cardCloseBtn.addEventListener("click", () => root.remove());
  uploadBtn.addEventListener("click", () => fileInput.click());
  folderBtn.addEventListener("click", () => folderInput.click());

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFile(file, uploadBtn, root);
    fileInput.value = "";
  });

  folderInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await handleFolder(files, folderBtn, root);
    folderInput.value = "";
  });

  oldUploadZipBtn.addEventListener("click", () => oldFileInput.click());
  oldUploadFolderBtn.addEventListener("click", () => oldFolderInput.click());
  newUploadZipBtn.addEventListener("click", () => newFileInput.click());
  newUploadFolderBtn.addEventListener("click", () => newFolderInput.click());

  oldFileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompareSelection("old", { kind: "file", file, label: file.name });
    oldFileInput.value = "";
  });

  newFileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompareSelection("newer", { kind: "file", file, label: file.name });
    newFileInput.value = "";
  });

  oldFolderInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const folderName = (files[0]?.webkitRelativePath || "Selected Folder").split("/")[0] || "Selected Folder";
    setCompareSelection("old", { kind: "folder", files, label: folderName });
    oldFolderInput.value = "";
  });

  newFolderInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const folderName = (files[0]?.webkitRelativePath || "Selected Folder").split("/")[0] || "Selected Folder";
    setCompareSelection("newer", { kind: "folder", files, label: folderName });
    newFolderInput.value = "";
  });

  searchUpdatesBtn.addEventListener("click", async () => {
    if (!compareUploads.old || !compareUploads.newer) {
      alert("Select both an old pack and a new pack before searching.");
      return;
    }

    const controls = [searchUpdatesBtn, oldUploadZipBtn, oldUploadFolderBtn, newUploadZipBtn, newUploadFolderBtn];
    controls.forEach((btn) => { btn.disabled = true; });
    const oldSearchLabel = searchUpdatesBtn.textContent;
    searchUpdatesBtn.textContent = "Searching...";

    try {
      const settings = await getSettings();
      const oldScan = await runSelectionScan(compareUploads.old, root, settings, "Preparing old pack");
      if (!oldScan || oldScan.error) throw new Error(oldScan?.error || "Old pack scan failed");

      const newScan = await runSelectionScan(compareUploads.newer, root, settings, "Preparing new pack");
      if (!newScan || newScan.error) throw new Error(newScan?.error || "New pack scan failed");

      const filtered = filterResultsByExistingMods(oldScan, newScan);
      const oldName = compareUploads.old.label || oldScan.fileName || "Old Pack";
      const newName = compareUploads.newer.label || newScan.fileName || "New Pack";
      filtered.fileName = `${oldName} -> ${newName}`;
      setProgress(root, 100, "Scan complete", `${filtered.count || 0} rows remain after ignoring existing mods`);
      setTimeout(() => clearProgress(root), 800);
      renderOverlay(filtered, await getSettings());
    } catch (err) {
      clearProgress(root);
      alert("Scan failed: " + (err?.message || String(err)));
    } finally {
      controls.forEach((btn) => { btn.disabled = false; });
      searchUpdatesBtn.textContent = oldSearchLabel;
      updateCompareSearchState();
    }
  });

  ["dragenter","dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("drag");
    });
  });

  ["dragleave","drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("drag");
    });
  });

  dropzone.addEventListener("drop", async (e) => {
    if (ignoreCurrentVersionMode) {
      alert("Use Upload Old and Upload New when ignore mode is enabled.");
      return;
    }
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    await handleFile(file, uploadBtn, root);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes?.theme) return;
    const nextTheme = normalizeTheme(changes.theme.newValue);
    setThemeClass(root, nextTheme);
    const overlay = document.getElementById("muc-overlay");
    if (overlay) setThemeClass(overlay, nextTheme);
  });
})();


