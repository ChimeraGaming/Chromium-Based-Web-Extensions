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

  async function getSettings() {
    return new Promise((resolve) => chrome.storage.sync.get(DEFAULTS, resolve));
  }

  async function setSettings(partial) {
    return new Promise((resolve) => chrome.storage.sync.set(partial, resolve));
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

  function renderOverlay(scanResult, settings) {
    closeOverlay();

    const selectedVersion = scanResult.targetVersion || scanResult.detectedGameVersion || "";
    const modeValue = (settings.scanMode || "mods") === "downgrade" ? "downgrade" : "upgrade";
    const modeLabel = modeValue === "downgrade" ? "Downgrade" : "Upgrade";
    const modeColumnLabel = modeValue === "downgrade" ? "Downgradable" : "Upgradable";
    const activeTheme = normalizeTheme(settings.theme);
    const density = ["compact", "comfortable", "expanded"].includes(settings.density) ? settings.density : "comfortable";
    const rows = [...(scanResult.results || [])]
      .filter((row) => row.sourceType === "jar" || row.sourceType === "modlist.html")
      .map((row) => {
        const modFile = row.sourceType === "jar"
          ? (row.mod || row.displayName || (row.path ? row.path.split("/").pop() : "") || "")
          : (row.displayName || row.mod || "");
        const rawCurrentVersion = row.installedVersion || "Unknown";
        const currentVersion = row.sourceType === "modlist.html" && rawCurrentVersion === "Listed in pack"
          ? "Listed in modlist"
          : rawCurrentVersion;
        const isMatch = rawCurrentVersion !== "Unknown"
          && rawCurrentVersion !== "Listed in pack"
          && rawCurrentVersion !== "ADD CURSEFORGE API"
          && selectedVersion
          && rawCurrentVersion === selectedVersion;
        const matchBaseLabel = row.match || modFile;
        const matchLabel = row.matchFound
          ? `${matchBaseLabel}${row.provider ? ` - ${row.provider}` : ""}`
          : "No match";
        const modrinthFiles = Array.isArray(row.recommended?.files) ? row.recommended.files : [];
        const primaryDownload = modrinthFiles.find((file) => file?.primary && file?.url) || modrinthFiles.find((file) => file?.url) || null;
        const directDownloadUrl = primaryDownload?.url || "";
        const modeAvailable = !!directDownloadUrl;
        return {
          modFile,
          currentVersion,
          selectedVersion: selectedVersion || "Unknown",
          statusSymbol: isMatch ? "✔" : "❌",
          statusClass: isMatch ? "ok" : "bad",
          modeSymbolHtml: modeAvailable ? (modeValue === "downgrade" ? "&#8595;" : "&#8593;") : "&#10060;",
          modeClass: modeAvailable ? "ok" : "bad",
          modeAvailable,
          matchLabel,
          matchUrl: row.url || row.listedUrl || "",
          matchFound: !!row.matchFound,
          directDownloadUrl
        };
      })
      .sort((a, b) => a.modFile.localeCompare(b.modFile, undefined, { sensitivity: "base" }));

    const overlay = el("div", { id: "muc-overlay", className: `muc-theme-${activeTheme}` });
    overlay.innerHTML = `
      <div class="muc-overlay-card muc-sheets-card" data-density="${escapeHtml(density)}">
        <div class="muc-overlay-top">
          <div class="muc-overlay-header">
            <div>
              <div class="muc-overlay-title">Scan Results</div>
              <div class="muc-overlay-file">${escapeHtml(scanResult.fileName || "ZIP file")}</div>
              <div class="muc-overlay-meta">Mode: ${escapeHtml(modeLabel)} | Loader: ${escapeHtml(scanResult.detectedLoader || "Unknown")} | Source MC: ${escapeHtml(scanResult.detectedGameVersion || "Unknown")} | Target MC: ${escapeHtml(selectedVersion || "Unknown")}</div>
            </div>
            <div class="muc-actions muc-overlay-actions">
              <button class="muc-btn secondary" id="muc-export-jd2">Export JDownloader2</button>
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
    const matchFilter = overlay.querySelector("#muc-filter-match");
    let filteredRows = rows;

    function renderRows() {
      const modNeedle = String(modFilter.value || "").trim().toLowerCase();
      const currentNeedle = String(currentFilter.value || "").trim().toLowerCase();
      const selectedNeedle = String(selectedFilter.value || "").trim().toLowerCase();
      const statusNeedle = statusFilter.value || "all";
      const modeNeedle = modeFilter.value || "all";
      const matchNeedle = String(matchFilter.value || "").trim().toLowerCase();

      const filtered = rows.filter((row) => {
        if (modNeedle && !String(row.modFile || "").toLowerCase().includes(modNeedle)) return false;
        if (currentNeedle && !String(row.currentVersion || "").toLowerCase().includes(currentNeedle)) return false;
        if (selectedNeedle && !String(row.selectedVersion || "").toLowerCase().includes(selectedNeedle)) return false;
        if (matchNeedle && !String(row.matchLabel || "").toLowerCase().includes(matchNeedle)) return false;
        if (statusNeedle === "match" && row.statusClass !== "ok") return false;
        if (statusNeedle === "mismatch" && (row.statusClass !== "bad" || !row.matchFound)) return false;
        if (statusNeedle === "no-match" && row.matchFound) return false;
        if (modeNeedle === "available" && !row.modeAvailable) return false;
        if (modeNeedle === "missing" && row.modeAvailable) return false;
        return true;
      });
      filteredRows = filtered;

      rowsBody.innerHTML = filtered.length ? filtered.map((row) => `
        <tr>
          <td>${escapeHtml(row.modFile)}</td>
          <td>${escapeHtml(row.currentVersion)}</td>
          <td>${escapeHtml(row.selectedVersion)}</td>
          <td class="muc-status-cell"><span class="muc-status-symbol ${row.statusClass}">${row.statusSymbol}</span></td>
          <td class="muc-status-cell"><span class="muc-mode-symbol ${row.modeClass}">${row.modeSymbolHtml}</span></td>
          <td>
            ${row.matchFound
              ? `<a class="muc-link" href="${escapeHtml(row.matchUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.matchLabel)}</a>`
              : `<span class="muc-no-match">${escapeHtml(row.matchLabel)}</span>`
            }
          </td>
        </tr>
      `).join("") : `
        <tr>
          <td colspan="6" class="muc-empty-row">No rows match the current header filters.</td>
        </tr>
      `;
    }

    [modFilter, currentFilter, selectedFilter, matchFilter].forEach((node) => {
      node.addEventListener("input", renderRows);
    });
    statusFilter.addEventListener("change", renderRows);
    modeFilter.addEventListener("change", renderRows);
    renderRows();

    overlay.querySelector("#muc-close-overlay").addEventListener("click", closeOverlay);

    overlay.querySelector("#muc-export-jd2").addEventListener("click", () => {
      const unique = [...new Set(
        filteredRows
          .map((row) => String(row.directDownloadUrl || "").trim())
          .filter(Boolean)
      )];
      if (!unique.length) {
        alert("No direct download links were found for the current filters.");
        return;
      }
      const baseName = sanitizeFilename(
        String(scanResult.fileName || "mod-update-results").replace(/\.[^/.]+$/, ""),
        "mod-update-results"
      );
      const suggested = `${baseName}-${modeLabel.toLowerCase()}-jd2-links.txt`;
      const userName = window.prompt("Save export as:", suggested);
      if (userName === null) return;
      const finalName = `${sanitizeFilename(String(userName || "").replace(/\.txt$/i, ""), "mod-update-jdownloader2-links")}.txt`;
      downloadText(finalName, unique.join("\n"), "text/plain;charset=utf-8");
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

  async function handleFile(file, uploadBtn, root) {
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Scanning...";
    setProgress(root, 2, "Preparing ZIP", file.name);

    let port;
    try {
      const buffer = await file.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));
      const options = await getSettings();

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

      const res = await scanPromise;

      if (res?.error) {
        alert("Scan failed: " + res.error);
      } else {
        setProgress(root, 100, "Scan complete", `${res.count || 0} rows processed`);
        setTimeout(() => clearProgress(root), 800);
        renderOverlay(res, await getSettings());
      }
    } catch (err) {
      clearProgress(root);
      alert("Scan failed: " + (err?.message || String(err)));
    } finally {
      try { port?.disconnect(); } catch {}
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload ZIP";
    }
  }


  async function handleFolder(files, folderBtn, root) {
    folderBtn.disabled = true;
    folderBtn.textContent = "Scanning...";
    setProgress(root, 2, "Preparing folder", `${files.length} files selected`);

    let port;
    try {
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

      const options = await getSettings();
      const folderName = (files[0]?.webkitRelativePath || "Selected Folder").split("/")[0] || "Selected Folder";

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

      const res = await scanPromise;

      if (res?.error) {
        alert("Scan failed: " + res.error);
      } else {
        setProgress(root, 100, "Scan complete", `${res.count || 0} rows processed`);
        setTimeout(() => clearProgress(root), 800);
        renderOverlay(res, await getSettings());
      }
    } catch (err) {
      clearProgress(root);
      alert("Scan failed: " + (err?.message || String(err)));
    } finally {
      try { port?.disconnect(); } catch {}
      folderBtn.disabled = false;
      folderBtn.textContent = "Upload Folder";
    }
  }

  const root = el("div", { id: "muc-root" });
  root.innerHTML = `
    <div class="muc-card">
      <button class="muc-panel-close" id="muc-card-close" aria-label="Close">×</button>
      <div class="muc-title">Check Mod Updates?</div>
      <div class="muc-text">Upload or drag in a CurseForge or Modrinth ZIP. Pick what you want to do first, then scan.</div>

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
        <div class="muc-field">
          <label class="muc-label">Theme</label>
          <select class="muc-select" id="muc-theme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="github-dark">Github (Dark)</option>
            <option value="snes-rainbow">SNES</option>
          </select>
        </div>
      </div>

      <div class="muc-switch-row">
        <div class="muc-switch-label">Search backwards if target version has no result</div>
        <label class="muc-switch">
          <input type="checkbox" id="muc-reverse-compatible">
          <span class="muc-slider"></span>
        </label>
      </div>

      <div class="muc-source-row" id="muc-source-summary"></div>

      <div class="muc-actions" style="margin-top:12px;">
        <button class="muc-btn primary" id="muc-upload">Upload ZIP</button>
        <button class="muc-btn secondary" id="muc-upload-folder">Upload Folder</button>
      </div>

      <div class="muc-dropzone" id="muc-dropzone">Drag and drop a ZIP here</div>

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
    </div>`;
  document.body.appendChild(root);
  setThemeClass(root, "light");

  const cardCloseBtn = root.querySelector("#muc-card-close");
  const uploadBtn = root.querySelector("#muc-upload");
  const folderBtn = root.querySelector("#muc-upload-folder");
  const fileInput = root.querySelector("#muc-file");
  const folderInput = root.querySelector("#muc-folder");
  const dropzone = root.querySelector("#muc-dropzone");
  const targetInput = root.querySelector("#muc-target-version");
  const reverseCheck = root.querySelector("#muc-reverse-compatible");
  const versionList = root.querySelector("#muc-version-list");
  const modeModsBtn = root.querySelector("#muc-mode-mods");
  const modeDownBtn = root.querySelector("#muc-mode-downgrade");
  const themeSelect = root.querySelector("#muc-theme");
  const openSettingsBtn = root.querySelector("#muc-open-settings");
  const openRoadmapBtn = root.querySelector("#muc-open-roadmap");
  const sourceSummary = root.querySelector("#muc-source-summary");

  getSettings().then((settings) => {
    const versions = (settings.minecraftVersionDatabase && settings.minecraftVersionDatabase.length) ? settings.minecraftVersionDatabase : DEFAULTS.minecraftVersionDatabase;
    versionList.innerHTML = versions.map(v => `<option value="${escapeHtml(v)}"></option>`).join("");
    targetInput.value = settings.targetVersion || "";
    reverseCheck.checked = settings.reverseCompatible !== false;
    themeSelect.value = normalizeTheme(settings.theme);
    setThemeClass(root, themeSelect.value);

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
  reverseCheck.addEventListener("change", async () => { await setSettings({ reverseCompatible: reverseCheck.checked }); });
  themeSelect.addEventListener("change", async () => {
    const theme = normalizeTheme(themeSelect.value);
    setThemeClass(root, theme);
    await setSettings({ theme });
  });

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
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    await handleFile(file, uploadBtn, root);
  });
})();

