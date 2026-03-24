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
    hideUnmatched: false,
    hideOverrideFiles: false,
    outdatedOnly: false,
    sortBy: "status",
    sortDir: "asc",
    statusFilter: "all",
    sourceFilter: "all",
    density: "comfortable",
    preferredSource: "modrinth",
    targetVersion: "",
    reverseCompatible: true,
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

  function rowStatus(row) {
    if (row.sourceType === "override-file") return "override-file";
    if (!row.matchFound) return "not-found";
    if (row.status === "update-available") return "update-available";
    if (row.status === "up-to-date") return "up-to-date";
    if (row.sourceType === "modlist.html" && row.matchFound) return "converted";
    return "matched";
  }

  function statusBadge(status) {
    if (status === "override-file") return '<span class="muc-badge gray">Override File</span>';
    if (status === "not-found") return '<span class="muc-badge red">Not Found</span>';
    if (status === "update-available") return '<span class="muc-badge yellow">Update Candidate</span>';
    if (status === "up-to-date") return '<span class="muc-badge green">Up to Date</span>';
    if (status === "converted") return '<span class="muc-badge purple">Converted</span>';
    return '<span class="muc-badge blue">Matched</span>';
  }

  function applyFilters(scanResult, settings) {
    let rows = [...(scanResult.results || [])].map((row) => ({
      ...row,
      _rowStatus: rowStatus(row),
      _recommendedVersion: row.recommended?.version_number || row.recommended?.name || ""
    }));

    if (settings.hideUnmatched) rows = rows.filter((r) => r.matchFound);
    if (settings.hideOverrideFiles) rows = rows.filter((r) => r.sourceType !== "override-file");
    if (settings.outdatedOnly) rows = rows.filter((r) => r._rowStatus === "update-available");
    if (settings.statusFilter && settings.statusFilter !== "all") rows = rows.filter((r) => r._rowStatus === settings.statusFilter);
    if (settings.sourceFilter && settings.sourceFilter !== "all") rows = rows.filter((r) => r.sourceType === settings.sourceFilter);

    const sortBy = settings.sortBy || "status";
    const dir = settings.sortDir === "desc" ? -1 : 1;

    rows.sort((a, b) => {
      let result = 0;
      if (sortBy === "name") result = String(a.fileName || a.displayName || a.mod || "").localeCompare(String(b.fileName || b.displayName || b.mod || ""));
      else if (sortBy === "source") result = String(a.sourceType || "").localeCompare(String(b.sourceType || ""));
      else if (sortBy === "installed") result = String(a.installedVersion || "").localeCompare(String(b.installedVersion || ""));
      else if (sortBy === "searchedVersion") result = String(a.searchedVersion || "").localeCompare(String(b.searchedVersion || ""));
      else {
        const order = ["update-available","not-found","converted","matched","up-to-date","override-file"];
        result = order.indexOf(a._rowStatus) - order.indexOf(b._rowStatus);
      }
      return result * dir;
    });

    return rows;
  }

  function renderOverlay(scanResult, settings) {
    closeOverlay();

    const rows = applyFilters(scanResult, settings);
    const allRows = scanResult.results || [];
    const matched = allRows.filter(r => r.matchFound).length;
    const overrides = allRows.filter(r => r.sourceType === "override-file").length;
    const updates = allRows.filter(r => r.status === "update-available").length;
    const uptodate = allRows.filter(r => r.status === "up-to-date").length;
    const notFound = allRows.filter(r => !r.matchFound && r.sourceType !== "override-file").length;
    const extraSources = settings.additionalSourceUrls || [];

    const overlay = el("div", { id:"muc-overlay" });
    overlay.innerHTML = `
      <div class="muc-overlay-card" data-density="${escapeHtml(settings.density || "comfortable")}">
        <div class="muc-overlay-header">
          <div>
            <div class="muc-overlay-title">Scan Results</div>
            <div class="muc-muted muc-small">${escapeHtml(scanResult.fileName || "ZIP file")}</div>
            <div class="muc-muted muc-small">Mode: ${escapeHtml(scanResult.manifestType || "unknown")} | Loader: ${escapeHtml(scanResult.detectedLoader || "Unknown")} | Source MC: ${escapeHtml(scanResult.detectedGameVersion || "Unknown")} | Target MC: ${escapeHtml(scanResult.targetVersion || "Auto")}</div>
          </div>
          <div class="muc-actions">
            <button class="muc-btn secondary" id="muc-export-json">Export JSON</button>
            <button class="muc-btn secondary" id="muc-export-csv">Export CSV</button>
            <button class="muc-btn secondary" id="muc-export-md">Export Markdown</button>
            <button class="muc-btn secondary" id="muc-close-overlay">Close</button>
          </div>
        </div>

        <div class="muc-summary">
          <span class="muc-chip">Rows: ${allRows.length}</span>
          <span class="muc-chip">Matched: ${matched}</span>
          <span class="muc-chip">Update candidates: ${updates}</span>
          <span class="muc-chip">Up to date: ${uptodate}</span>
          <span class="muc-chip">Not found: ${notFound}</span>
          <span class="muc-chip">Override files: ${overrides}</span>
          <span class="muc-chip">modlist.html entries: ${scanResult.modlistCount || 0}</span>
          <span class="muc-chip">manifest entries: ${scanResult.manifestSummary || 0}</span>
          <span class="muc-chip">Version path: ${escapeHtml((scanResult.versionSearchPath || []).join(" > "))}</span>
          <span class="muc-chip">Extra sources: ${extraSources.length}</span>
        </div>

        <div class="muc-toolbar">
          <div class="muc-field">
            <label class="muc-label">Status filter</label>
            <select class="muc-select" id="muc-status-filter">
              <option value="all">All</option>
              <option value="update-available">Update Candidate</option>
              <option value="up-to-date">Up to Date</option>
              <option value="matched">Matched</option>
              <option value="converted">Converted</option>
              <option value="not-found">Not Found</option>
              <option value="override-file">Override File</option>
            </select>
          </div>
          <div class="muc-field">
            <label class="muc-label">Source filter</label>
            <select class="muc-select" id="muc-source-filter">
              <option value="all">All</option>
              <option value="jar">jar</option>
              <option value="modlist.html">modlist.html</option>
              <option value="override-file">override-file</option>
            </select>
          </div>
          <div class="muc-field">
            <label class="muc-label">Sort by</label>
            <select class="muc-select" id="muc-sort">
              <option value="status">Status</option>
              <option value="name">File Name</option>
              <option value="source">Source</option>
              <option value="installed">Installed Version</option>
              <option value="searchedVersion">Searched Version</option>
            </select>
          </div>
          <div class="muc-field">
            <label class="muc-label">Direction</label>
            <select class="muc-select" id="muc-sort-dir">
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div class="muc-field">
            <label class="muc-label">Table size</label>
            <select class="muc-select" id="muc-density">
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="expanded">Expanded</option>
            </select>
          </div>
          <div class="muc-field">
            <label class="muc-label">Quick toggles</label>
            <div class="muc-actions">
              <button class="muc-btn secondary" id="muc-toggle-beta">${settings.includeBeta ? "Beta On" : "Beta Off"}</button>
              <button class="muc-btn secondary" id="muc-toggle-alpha">${settings.includeAlpha ? "Alpha On" : "Alpha Off"}</button>
            </div>
          </div>
        </div>

        <div class="muc-table-wrap">
          <table class="muc-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>File Name</th>
                <th>Status</th>
                <th>Query</th>
                <th>Match</th>
                <th>Installed</th>
                <th>Recommended</th>
                <th>Searched Version</th>
                <th>Channels</th>
                <th>Classification</th>
                <th>Extra Sources</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((row) => {
                const externalLinks = buildExternalLinks(row.query || row.fileName || row.displayName || row.mod || "", extraSources);
                return `
                <tr>
                  <td>
                    <div>${escapeHtml(row.sourceType || "unknown")}</div>
                    <div class="muc-muted muc-small">${escapeHtml(row.path || "")}</div>
                  </td>
                  <td>
                    ${row.url
                      ? `<div><a class="muc-link" href="${escapeHtml(row.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.fileName || row.displayName || row.mod || "")}</a></div>`
                      : `<div>${escapeHtml(row.fileName || row.displayName || row.mod || "")}</div>`
                    }
                    <div class="muc-muted muc-small">slug guess: ${escapeHtml(row.slugGuess || "n/a")}</div>
                  </td>
                  <td>${statusBadge(row._rowStatus)}</td>
                  <td><span class="muc-pre">${escapeHtml(row.query || "n/a")}</span></td>
                  <td>
                    ${row.matchFound
                      ? `${row.url ? `<a class="muc-link" href="${escapeHtml(row.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.match || "Unknown")}</a>` : `<div>${escapeHtml(row.match || "Unknown")}</div>`}
                         ${row.provider ? `<div class="muc-muted muc-small">provider: ${escapeHtml(row.provider)}</div>` : ""}`
                      : `<span class="muc-muted">No match</span>`
                    }
                  </td>
                  <td>${escapeHtml(row.installedVersion || "Unknown")}</td>
                  <td>
                    ${row.recommended
                      ? `${row.recommendedType === "release" ? '<span class="muc-badge green">release</span>' : row.recommendedType === "beta" ? '<span class="muc-badge yellow">beta</span>' : '<span class="muc-badge gray">alpha</span>'}
                         <div style="margin-top:6px;">${escapeHtml(row._recommendedVersion || "Unknown")}</div>`
                      : `<span class="muc-muted">-</span>`
                    }
                  </td>
                  <td>${escapeHtml(row.searchedVersion || "-")}</td>
                  <td class="muc-small">
                    <div>Release: ${escapeHtml(row.latestRelease?.version_number || "-")}</div>
                    <div>Beta: ${escapeHtml(row.latestBeta?.version_number || "-")}</div>
                    <div>Alpha: ${escapeHtml(row.latestAlpha?.version_number || "-")}</div>
                  </td>
                  <td class="muc-small">
                    <div>${escapeHtml(row.overrideCategory || "")}</div>
                    <div class="muc-muted">${escapeHtml(row.classification || "")}</div>
                  </td>
                  <td class="muc-small">
                    ${externalLinks.length
                      ? externalLinks.map((link) => `<div><a class="muc-link" href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a></div>`).join("")
                      : '<span class="muc-muted">-</span>'
                    }
                  </td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>

        <div class="muc-note">This build cleans up the launch UI, adds better labeled filters, supports ascending and descending sorting, adds table size controls, links matched mod names, and stores extra sources for quick fallback searching. Deep crawling of arbitrary sites and repos is still pending.</div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector("#muc-close-overlay").addEventListener("click", closeOverlay);

    overlay.querySelector("#muc-status-filter").value = settings.statusFilter || "all";
    overlay.querySelector("#muc-source-filter").value = settings.sourceFilter || "all";
    overlay.querySelector("#muc-sort").value = settings.sortBy || "status";
    overlay.querySelector("#muc-sort-dir").value = settings.sortDir || "asc";
    overlay.querySelector("#muc-density").value = settings.density || "comfortable";

    overlay.querySelector("#muc-status-filter").addEventListener("change", async (e) => { await setSettings({ statusFilter: e.target.value }); renderOverlay(scanResult, await getSettings()); });
    overlay.querySelector("#muc-source-filter").addEventListener("change", async (e) => { await setSettings({ sourceFilter: e.target.value }); renderOverlay(scanResult, await getSettings()); });
    overlay.querySelector("#muc-sort").addEventListener("change", async (e) => { await setSettings({ sortBy: e.target.value }); renderOverlay(scanResult, await getSettings()); });
    overlay.querySelector("#muc-sort-dir").addEventListener("change", async (e) => { await setSettings({ sortDir: e.target.value }); renderOverlay(scanResult, await getSettings()); });
    overlay.querySelector("#muc-density").addEventListener("change", async (e) => { await setSettings({ density: e.target.value }); renderOverlay(scanResult, await getSettings()); });
    overlay.querySelector("#muc-toggle-beta").addEventListener("click", async () => { await setSettings({ includeBeta: !settings.includeBeta }); renderOverlay(scanResult, await getSettings()); });
    overlay.querySelector("#muc-toggle-alpha").addEventListener("click", async () => { await setSettings({ includeAlpha: !settings.includeAlpha }); renderOverlay(scanResult, await getSettings()); });

    overlay.querySelector("#muc-export-json").addEventListener("click", () => {
      downloadText("mod-update-results.json", JSON.stringify(scanResult, null, 2), "application/json;charset=utf-8");
    });

    overlay.querySelector("#muc-export-csv").addEventListener("click", () => {
      const header = ["Source","Path","Name","Status","Query","Match","Installed","Recommended","SearchedVersion","Release","Beta","Alpha","Classification","OverrideCategory","URL"];
      const rowsCsv = (scanResult.results || []).map((row) => {
        const status = rowStatus(row);
        const rec = row.recommended?.version_number || row.recommended?.name || "";
        const vals = [row.sourceType||"", row.path||"", row.fileName||row.displayName||row.mod||"", status, row.query||"", row.match||"", row.installedVersion||"", rec, row.searchedVersion||"", row.latestRelease?.version_number||"", row.latestBeta?.version_number||"", row.latestAlpha?.version_number||"", row.classification||"", row.overrideCategory||"", row.url||""];
        return vals.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",");
      });
      downloadText("mod-update-results.csv", [header.join(","), ...rowsCsv].join("\n"), "text/csv;charset=utf-8");
    });

    overlay.querySelector("#muc-export-md").addEventListener("click", () => {
      const lines = [
        "# Mod Update Results",
        "",
        `File: ${scanResult.fileName || ""}`,
        `Mode: ${scanResult.manifestType || ""}`,
        `Loader: ${scanResult.detectedLoader || "Unknown"}`,
        `Source Minecraft: ${scanResult.detectedGameVersion || "Unknown"}`,
        `Target Minecraft: ${scanResult.targetVersion || "Auto"}`,
        "",
        "| Name | Source | Status | Installed | Recommended | Search Version | Match |",
        "|---|---|---|---|---|---|---|"
      ];
      for (const row of (scanResult.results || [])) {
        const status = rowStatus(row);
        const rec = row.recommended?.version_number || row.recommended?.name || "-";
        lines.push(`| ${String(row.displayName || row.mod || "").replace(/\|/g, "\\|")} | ${row.sourceType || ""} | ${status} | ${row.installedVersion || ""} | ${rec} | ${row.searchedVersion || ""} | ${String(row.match || "").replace(/\|/g, "\\|")} |`);
      }
      downloadText("mod-update-results.md", lines.join("\n"), "text/markdown;charset=utf-8");
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

  const root = el("div", { id: "muc-root" });
  root.innerHTML = `
    <div class="muc-card">
      <div class="muc-title">Check Mod Updates?</div>
      <div class="muc-text">Upload or drag in a CurseForge or Modrinth ZIP. Pick what you want to do first, then scan.</div>

      <div class="muc-mode-row">
        <button class="muc-btn active" id="muc-mode-mods">Mods</button>
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
    </div>`;
  document.body.appendChild(root);

  const uploadBtn = root.querySelector("#muc-upload");
  const fileInput = root.querySelector("#muc-file");
  const dropzone = root.querySelector("#muc-dropzone");
  const targetInput = root.querySelector("#muc-target-version");
  const reverseCheck = root.querySelector("#muc-reverse-compatible");
  const versionList = root.querySelector("#muc-version-list");
  const modeModsBtn = root.querySelector("#muc-mode-mods");
  const modeDownBtn = root.querySelector("#muc-mode-downgrade");
  const openSettingsBtn = root.querySelector("#muc-open-settings");
  const openRoadmapBtn = root.querySelector("#muc-open-roadmap");
  const sourceSummary = root.querySelector("#muc-source-summary");

  getSettings().then((settings) => {
    const versions = (settings.minecraftVersionDatabase && settings.minecraftVersionDatabase.length) ? settings.minecraftVersionDatabase : DEFAULTS.minecraftVersionDatabase;
    versionList.innerHTML = versions.map(v => `<option value="${escapeHtml(v)}"></option>`).join("");
    targetInput.value = settings.targetVersion || "";
    reverseCheck.checked = settings.reverseCompatible !== false;

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

  uploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFile(file, uploadBtn, root);
    fileInput.value = "";
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
