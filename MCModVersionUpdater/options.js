const REQUIRED_ADDITIONAL_SOURCES = ["https://github.com/sakura-ryoko"];

const defaults = {
  includeBeta: false,
  includeAlpha: false,
  density: "comfortable",
  targetVersion: "",
  reverseCompatible: true,
  theme: "light",
  curseforgeApiKey: "",
  modrinthApiKey: "",
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

function sanitizeAdditionalSourceUrls(urls) {
  const combined = [...REQUIRED_ADDITIONAL_SOURCES, ...((urls || []).map(normalizeSourceUrl))];
  const seen = new Set();
  return combined.filter((url) => {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

function sanitizeMinecraftVersionDatabase(versions) {
  const input = Array.isArray(versions) && versions.length ? versions : defaults.minecraftVersionDatabase;
  const seen = new Set();
  return input.filter((version) => {
    const clean = String(version || "").trim();
    if (!clean || seen.has(clean)) return false;
    seen.add(clean);
    return true;
  });
}

function populateVersions(selected, versions) {
  const list = document.getElementById("mcVersionList");
  list.innerHTML = sanitizeMinecraftVersionDatabase(versions || defaults.minecraftVersionDatabase)
    .map((v) => `<option value="${v}"></option>`)
    .join("");
  document.getElementById("targetVersion").value = selected || "";
}

function loadSettings() {
  chrome.storage.sync.get(defaults, (items) => {
    document.getElementById("includeBeta").checked = items.includeBeta;
    document.getElementById("includeAlpha").checked = items.includeAlpha;
    document.getElementById("reverseCompatible").checked = items.reverseCompatible !== false;
    document.getElementById("density").value = items.density || "comfortable";
    document.getElementById("theme").value = items.theme || "light";
    document.getElementById("curseforgeApiKey").value = items.curseforgeApiKey || "";
    document.getElementById("modrinthApiKey").value = items.modrinthApiKey || "";
    document.getElementById("minecraftVersionDatabase").value = (items.minecraftVersionDatabase || defaults.minecraftVersionDatabase).join("\n");
    document.getElementById("additionalSourceUrls").value = (items.additionalSourceUrls || []).join("\n");
    populateVersions(items.targetVersion || "", items.minecraftVersionDatabase || defaults.minecraftVersionDatabase);
  });
}

function saveSettings() {
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
    targetVersion: document.getElementById("targetVersion").value.trim(),
    theme: document.getElementById("theme").value || "light",
    curseforgeApiKey: document.getElementById("curseforgeApiKey").value.trim(),
    modrinthApiKey: document.getElementById("modrinthApiKey").value.trim(),
    density: document.getElementById("density").value,
    minecraftVersionDatabase: versionDb.length ? versionDb : defaults.minecraftVersionDatabase,
    additionalSourceUrls
  };

  chrome.storage.sync.set(payload, () => {
    const status = document.getElementById("status");
    status.textContent = "Settings saved.";
    setTimeout(() => { status.textContent = ""; }, 1800);
    populateVersions(payload.targetVersion, payload.minecraftVersionDatabase);
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
loadSettings();
