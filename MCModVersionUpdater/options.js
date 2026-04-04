const REQUIRED_ADDITIONAL_SOURCES = ["https://github.com/sakura-ryoko"];

const defaults = {
  includeBeta: false,
  includeAlpha: false,
  density: "comfortable",
  targetVersion: "",
  reverseCompatible: true,
  fuzzyDescriptionReplacementSearch: false,
  scanMode: "mods",
  searchMode: "standard",
  checkDuplicateMods: false,
  ignoreCurrentVersionMods: false,
  onlyUpdatesCurrentSelected: false,
  theme: "light",
  curseforgeApiKey: "",
  modrinthApiKey: "",
  preferAdditionalSources: false,
  minecraftVersionDatabase: [
    "26.1.1",
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
  ],
  additionalSourceUrls: [...REQUIRED_ADDITIONAL_SOURCES]
};

function normalizeSourceUrl(url) {
  if (!url) return "";
  let normalized = String(url).trim();
  if (!normalized) return "";
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
  normalized = normalized.replace(/^http:\/\//i, "https://");
  return normalized.replace(/\/$/, "");
}

function normalizeLegacyVersion(version) {
  const clean = String(version || "").trim();
  return clean === "1.26" ? "26.1" : clean;
}

const THEMES = new Set(["light", "dark", "github-dark", "snes-rainbow"]);
const SEARCH_MODES = new Set(["standard", "ignore-current-version", "only-current-selected", "duplicates", "attempt-update-fabric"]);
const PANEL_MODES = new Set([
  "upgrade_standard",
  "downgrade_standard",
  "compare",
  "current_target",
  "duplicates",
  "attempt_update_fabric",
  "upgrade_compare",
  "downgrade_compare",
  "upgrade_current_target",
  "downgrade_current_target",
  "upgrade_duplicates",
  "downgrade_duplicates"
]);

function normalizeTheme(theme) {
  const clean = String(theme || "").trim().toLowerCase();
  return THEMES.has(clean) ? clean : "light";
}

function normalizeSearchMode(mode) {
  const clean = String(mode || "").trim().toLowerCase();
  return SEARCH_MODES.has(clean) ? clean : "standard";
}

function normalizePanelMode(mode) {
  const clean = String(mode || "").trim().toLowerCase();
  return PANEL_MODES.has(clean) ? clean : "upgrade_standard";
}

function searchFlagsFromMode(searchMode) {
  const normalized = normalizeSearchMode(searchMode);
  if (normalized === "duplicates") {
    return {
      checkDuplicateMods: true,
      ignoreCurrentVersionMods: false,
      onlyUpdatesCurrentSelected: false
    };
  }
  if (normalized === "ignore-current-version") {
    return {
      checkDuplicateMods: false,
      ignoreCurrentVersionMods: true,
      onlyUpdatesCurrentSelected: false
    };
  }
  if (normalized === "only-current-selected") {
    return {
      checkDuplicateMods: false,
      ignoreCurrentVersionMods: false,
      onlyUpdatesCurrentSelected: true
    };
  }
  return {
    checkDuplicateMods: false,
    ignoreCurrentVersionMods: false,
    onlyUpdatesCurrentSelected: false
  };
}

function deriveSearchMode(items) {
  if (items.checkDuplicateMods === true) return "duplicates";
  if (items.onlyUpdatesCurrentSelected === true) return "only-current-selected";
  if (items.ignoreCurrentVersionMods === true) return "ignore-current-version";
  return normalizeSearchMode(items.searchMode || "standard");
}

function panelModeFromSettings(items) {
  const searchMode = deriveSearchMode(items);
  const scanMode = (items.scanMode || "mods") === "downgrade" ? "downgrade" : "mods";
  if (searchMode === "duplicates") return "duplicates";
  if (searchMode === "ignore-current-version") return "compare";
  if (searchMode === "only-current-selected") return "current_target";
  if (searchMode === "attempt-update-fabric") return "attempt_update_fabric";
  return scanMode === "downgrade" ? "downgrade_standard" : "upgrade_standard";
}

function settingsFromPanelMode(panelMode, fallbackScanMode = "mods") {
  const normalized = normalizePanelMode(panelMode);
  let scanMode = String(fallbackScanMode || "mods").trim().toLowerCase() === "downgrade" ? "downgrade" : "mods";
  if (normalized.startsWith("downgrade_")) scanMode = "downgrade";
  else if (normalized.startsWith("upgrade_")) scanMode = "mods";
  else if (normalized === "attempt_update_fabric") scanMode = "mods";
  let searchMode = "standard";
  if (normalized === "compare" || normalized.endsWith("_compare")) searchMode = "ignore-current-version";
  else if (normalized === "current_target" || normalized.endsWith("_current_target")) searchMode = "only-current-selected";
  else if (normalized === "duplicates" || normalized.endsWith("_duplicates")) searchMode = "duplicates";
  else if (normalized === "attempt_update_fabric") searchMode = "attempt-update-fabric";
  const searchFlags = searchFlagsFromMode(searchMode);
  return {
    panelMode: normalized,
    scanMode,
    searchMode,
    checkDuplicateMods: searchFlags.checkDuplicateMods,
    ignoreCurrentVersionMods: searchFlags.ignoreCurrentVersionMods,
    onlyUpdatesCurrentSelected: searchFlags.onlyUpdatesCurrentSelected
  };
}

function applyTheme(theme) {
  const body = document.body;
  if (!body) return;
  const classes = ["muc-theme-light", "muc-theme-dark", "muc-theme-github-dark", "muc-theme-snes-rainbow"];
  body.classList.remove(...classes);
  body.classList.add(`muc-theme-${normalizeTheme(theme)}`);
}

function sanitizeAdditionalSourceUrls(urls) {
  const combined = [...REQUIRED_ADDITIONAL_SOURCES, ...((urls || []).map(normalizeSourceUrl))];
  const seen = new Set();
  return combined.filter((url) => {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

function getAdditionalSourceInputLines() {
  return (document.getElementById("additionalSourceUrls")?.value || "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function updateAdditionalSourceSummary() {
  const countChip = document.getElementById("additionalSourceCount");
  const detail = document.getElementById("additionalSourceDetail");
  const preferAdditional = document.getElementById("preferAdditionalSources")?.checked === true;
  const additionalSourceUrls = sanitizeAdditionalSourceUrls(getAdditionalSourceInputLines());
  const additionalCount = additionalSourceUrls.length;
  const coreCount = 2;
  const totalCount = additionalCount + coreCount;
  if (countChip) countChip.textContent = `${totalCount} sources`;
  if (detail) {
    const orderLine = preferAdditional
      ? "Additional Sources are checked first."
      : "Modrinth and CurseForge are checked first.";
    detail.textContent = `${totalCount} sources will be searched (${additionalCount} Additional Sources + ${coreCount} core sources). ${orderLine}`;
  }
}

function sanitizeMinecraftVersionDatabase(versions) {
  const input = Array.isArray(versions) && versions.length ? versions : defaults.minecraftVersionDatabase;
  const seen = new Set();
  return input.filter((version) => {
    const clean = normalizeLegacyVersion(version);
    if (!clean || seen.has(clean)) return false;
    seen.add(clean);
    return true;
  });
}

function populateVersions(selected, versions) {
  const select = document.getElementById("targetVersion");
  const normalizedVersions = sanitizeMinecraftVersionDatabase(versions || defaults.minecraftVersionDatabase);
  const selectedVersion = normalizeLegacyVersion(selected || "");
  const hasSelected = selectedVersion && normalizedVersions.includes(selectedVersion);

  const options = [
    `<option value="">Use detected source version</option>`,
    ...normalizedVersions.map((v) => `<option value="${v}">${v}</option>`)
  ];
  if (selectedVersion && !hasSelected) {
    options.push(`<option value="${selectedVersion}">${selectedVersion}</option>`);
  }

  select.innerHTML = options.join("");
  select.value = selectedVersion || "";
}

let currentPanelScanMode = "mods";

function loadSettings() {
  chrome.storage.sync.get(defaults, (items) => {
    const versionDb = sanitizeMinecraftVersionDatabase(items.minecraftVersionDatabase);
    const targetVersion = normalizeLegacyVersion(items.targetVersion || "");
    const panelMode = panelModeFromSettings(items);
    const storedScanMode = (items.scanMode || "mods") === "downgrade" ? "downgrade" : "mods";
    const panelSettings = settingsFromPanelMode(panelMode, storedScanMode);
    const changedVersionDb = JSON.stringify(versionDb) !== JSON.stringify(items.minecraftVersionDatabase || []);
    const changedTargetVersion = targetVersion !== String(items.targetVersion || "");
    const storedSearchMode = normalizeSearchMode(items.searchMode || "standard");
    const changedSearchMode = storedScanMode !== panelSettings.scanMode
      || storedSearchMode !== panelSettings.searchMode
      || items.checkDuplicateMods !== panelSettings.checkDuplicateMods
      || items.ignoreCurrentVersionMods !== panelSettings.ignoreCurrentVersionMods
      || items.onlyUpdatesCurrentSelected !== panelSettings.onlyUpdatesCurrentSelected;
    currentPanelScanMode = storedScanMode;

    if (changedVersionDb || changedTargetVersion || changedSearchMode) {
      const normalizePayload = {};
      if (changedVersionDb) normalizePayload.minecraftVersionDatabase = versionDb.length ? versionDb : defaults.minecraftVersionDatabase;
      if (changedTargetVersion) normalizePayload.targetVersion = targetVersion;
      if (changedSearchMode) {
        normalizePayload.scanMode = panelSettings.scanMode;
        normalizePayload.searchMode = panelSettings.searchMode;
        normalizePayload.checkDuplicateMods = panelSettings.checkDuplicateMods;
        normalizePayload.ignoreCurrentVersionMods = panelSettings.ignoreCurrentVersionMods;
        normalizePayload.onlyUpdatesCurrentSelected = panelSettings.onlyUpdatesCurrentSelected;
      }
      chrome.storage.sync.set(normalizePayload);
    }

    document.getElementById("includeBeta").checked = items.includeBeta;
    document.getElementById("includeAlpha").checked = items.includeAlpha;
    document.getElementById("reverseCompatible").checked = items.reverseCompatible !== false;
    document.getElementById("fuzzyDescriptionReplacementSearch").checked = items.fuzzyDescriptionReplacementSearch === true;
    document.getElementById("searchMode").value = panelMode;
    document.getElementById("density").value = items.density || "comfortable";
    const theme = normalizeTheme(items.theme || "light");
    document.getElementById("theme").value = theme;
    applyTheme(theme);
    document.getElementById("curseforgeApiKey").value = items.curseforgeApiKey || "";
    document.getElementById("modrinthApiKey").value = items.modrinthApiKey || "";
    document.getElementById("preferAdditionalSources").checked = items.preferAdditionalSources === true;
    document.getElementById("minecraftVersionDatabase").value = versionDb.join("\n");
    document.getElementById("additionalSourceUrls").value = (items.additionalSourceUrls || []).join("\n");
    populateVersions(targetVersion, versionDb);
    updateAdditionalSourceSummary();
  });
}

function saveSettings() {
  const panelMode = normalizePanelMode(document.getElementById("searchMode").value);
  const panelSettings = settingsFromPanelMode(panelMode, currentPanelScanMode);
  currentPanelScanMode = panelSettings.scanMode;

  const versionDb = sanitizeMinecraftVersionDatabase(document.getElementById("minecraftVersionDatabase").value
    .split("\n")
    .map((v) => v.trim())
      .filter(Boolean));

  const additionalSourceUrls = sanitizeAdditionalSourceUrls(document.getElementById("additionalSourceUrls").value
    .split("\n")
    .map((v) => v.trim())
      .filter(Boolean));

  const payload = {
    includeBeta: document.getElementById("includeBeta").checked,
    includeAlpha: document.getElementById("includeAlpha").checked,
    reverseCompatible: document.getElementById("reverseCompatible").checked,
    fuzzyDescriptionReplacementSearch: document.getElementById("fuzzyDescriptionReplacementSearch").checked,
    scanMode: panelSettings.scanMode,
    searchMode: panelSettings.searchMode,
    checkDuplicateMods: panelSettings.checkDuplicateMods,
    ignoreCurrentVersionMods: panelSettings.ignoreCurrentVersionMods,
    onlyUpdatesCurrentSelected: panelSettings.onlyUpdatesCurrentSelected,
    targetVersion: normalizeLegacyVersion(document.getElementById("targetVersion").value),
    theme: normalizeTheme(document.getElementById("theme").value || "light"),
    curseforgeApiKey: document.getElementById("curseforgeApiKey").value.trim(),
    modrinthApiKey: document.getElementById("modrinthApiKey").value.trim(),
    preferAdditionalSources: document.getElementById("preferAdditionalSources").checked,
    density: document.getElementById("density").value,
    minecraftVersionDatabase: versionDb.length ? versionDb : defaults.minecraftVersionDatabase,
    additionalSourceUrls
  };

  chrome.storage.sync.set(payload, () => {
    applyTheme(payload.theme);
    const status = document.getElementById("status");
    status.textContent = "Settings saved.";
    setTimeout(() => { status.textContent = ""; }, 1800);
    populateVersions(payload.targetVersion, payload.minecraftVersionDatabase);
    updateAdditionalSourceSummary();
  });
}

function clearCache() {
  chrome.storage.local.get(null, (items) => {
    const keys = Object.keys(items).filter((k) => k.startsWith("cache_"));
    chrome.storage.local.remove(keys, () => {
      const status = document.getElementById("status");
      status.textContent = "Cache cleared.";
      setTimeout(() => { status.textContent = ""; }, 1800);
    });
  });
}

document.getElementById("saveBtn").addEventListener("click", saveSettings);
document.getElementById("clearCacheBtn").addEventListener("click", clearCache);
document.getElementById("additionalSourceUrls").addEventListener("input", updateAdditionalSourceSummary);
document.getElementById("preferAdditionalSources").addEventListener("change", updateAdditionalSourceSummary);
loadSettings();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !changes?.theme) return;
  const theme = normalizeTheme(changes.theme.newValue);
  document.getElementById("theme").value = theme;
  applyTheme(theme);
});
