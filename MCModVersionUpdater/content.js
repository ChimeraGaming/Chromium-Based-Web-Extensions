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

  function countSearchSources(additionalSourceUrls) {
    const extra = new Set(
      (Array.isArray(additionalSourceUrls) ? additionalSourceUrls : [])
        .map((url) => String(url || "").trim())
        .filter(Boolean)
    );
    const coreSources = 2;
    return coreSources + extra.size;
  }

  const DEFAULTS = {
    includeBeta: false,
    includeAlpha: false,
    density: "comfortable",
    targetVersion: "",
    reverseCompatible: true,
    fuzzyDescriptionReplacementSearch: false,
    checkDuplicateMods: false,
    ignoreCurrentVersionMods: false,
    onlyUpdatesCurrentSelected: false,
    theme: "light",
    curseforgeApiKey: "",
    modrinthApiKey: "",
    scanMode: "mods",
    searchMode: "standard",
    preferAdditionalSources: false,
    additionalSourceUrls: [],
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

  function normalizeVersionForCompare(value) {
    const clean = normalizeLegacyVersion(String(value || "").trim());
    if (!clean || clean === "Unknown" || clean === "Listed in pack" || clean === "ADD CURSEFORGE API") return "";
    return clean;
  }

  function extractFileNameFromUrl(url) {
    try {
      const parsed = new URL(String(url || ""));
      return decodeURIComponent(parsed.pathname.split("/").pop() || "").trim();
    } catch {
      return "";
    }
  }

  function buildFilenameIdentity(fileName) {
    return normalizeModIdentity(
      String(fileName || "")
        .replace(/\.jar$/i, "")
        .replace(/(?:^|[-_+])mc\d+(?:\.\d+){1,2}/ig, "")
        .replace(/(?:^|[-_+])minecraft\d+(?:\.\d+){1,2}/ig, "")
        .replace(/(?:^|[-_+])(fabric|forge|quilt|neoforge|neo-forge)(?:[-_+]?\d+(?:\.\d+){1,2})?/ig, "")
        .replace(/(?:^|[-_+])v?\d+(?:\.\d+){1,}(?:[-_+][a-z0-9]+)*/ig, "")
        .replace(/[()\[\]]/g, " ")
    );
  }

  function rowIdentityKeys(row) {
    if (!row || (row.sourceType !== "jar" && row.sourceType !== "modlist.html")) return [];
    const keys = new Set();
    const addKey = (prefix, value, transform = normalizeModIdentity, minLength = 3) => {
      const normalized = String(transform(value) || "").trim();
      if (!normalized) return;
      if (normalized.length < minLength) return;
      keys.add(`${prefix}:${normalized}`);
    };

    if (row.curseforgeProjectId !== null && row.curseforgeProjectId !== undefined && row.curseforgeProjectId !== "") {
      addKey("cf-project", String(row.curseforgeProjectId), (v) => String(v || "").trim(), 1);
    }

    const fileName = String(row.path || "").split("/").pop() || "";
    const displayName = String(row.displayName || row.mod || "").trim();
    const modName = String(row.mod || "").trim();
    const queryName = String(row.query || "").trim();

    if (row.sourceType === "jar") {
      addKey("file-stem", fileName, buildFilenameIdentity);
      addKey("file-name", fileName, (v) => normalizeModIdentity(String(v || "").replace(/\.jar$/i, "")));
    }
    addKey("display-stem", displayName, buildFilenameIdentity);
    addKey("mod-stem", modName, buildFilenameIdentity);
    addKey("query-stem", queryName, buildFilenameIdentity);
    addKey("display-name", displayName);
    addKey("mod-name", modName);

    return Array.from(keys);
  }

  function rowProjectKey(row) {
    const provider = normalizeModIdentity(row?.provider || "modrinth") || "modrinth";
    const projectId = row?.projectId ?? row?.curseforgeProjectId ?? "";
    const normalizedProjectId = String(projectId || "").trim().toLowerCase();
    if (!normalizedProjectId) return "";
    return `${provider}:${normalizedProjectId}`;
  }

  function rowTargetRecommendedStem(row, targetVersion) {
    const target = normalizeVersionForCompare(targetVersion);
    if (!target) return "";
    const searched = normalizeVersionForCompare(row?.searchedVersion);
    if (!searched || searched !== target) return "";
    const recommendedFileName = String(row?.recommendedFileName || "").trim();
    const recommendedFromUrl = extractFileNameFromUrl(row?.url || "");
    return buildFilenameIdentity(recommendedFileName || recommendedFromUrl || "");
  }

  function fileNameMentionsVersion(fileName, targetVersion) {
    const target = normalizeVersionForCompare(targetVersion);
    if (!target) return false;
    const lower = String(fileName || "").toLowerCase();
    if (!lower) return false;
    const compact = target.replace(/\./g, "");
    const dashed = target.replace(/\./g, "-");
    const underscored = target.replace(/\./g, "_");
    const tokens = [
      target,
      compact,
      dashed,
      underscored,
      `mc${target}`,
      `mc${compact}`,
      `mc-${dashed}`,
      `mc_${underscored}`,
      `minecraft${target}`,
      `minecraft-${dashed}`,
      `minecraft_${underscored}`
    ].filter(Boolean);
    return tokens.some((token) => lower.includes(token));
  }

  function rowIsOnTargetVersion(row, targetVersion) {
    const target = normalizeVersionForCompare(targetVersion);
    if (!target) return true;

    const installed = normalizeVersionForCompare(row?.installedVersion);
    if (installed && installed === target) return true;

    const searched = normalizeVersionForCompare(row?.searchedVersion);
    const status = String(row?.status || "").trim().toLowerCase();
    const currentFileName = String(row?.path || "").split("/").pop() || "";
    const recommendedFileName = String(row?.recommendedFileName || "").trim();
    const recommendedFromUrl = extractFileNameFromUrl(row?.url || "");

    const currentNorm = normalizeModIdentity(currentFileName);
    const recommendedNorm = normalizeModIdentity(recommendedFileName);
    const recommendedUrlNorm = normalizeModIdentity(recommendedFromUrl);
    const currentStem = buildFilenameIdentity(currentFileName);
    const recommendedStem = buildFilenameIdentity(recommendedFileName);
    const recommendedUrlStem = buildFilenameIdentity(recommendedFromUrl);

    if (searched && searched === target) {
      if (status === "up-to-date") return true;
      if (status === "update-available") return false;
      if (currentStem && recommendedStem && currentStem === recommendedStem) return true;
      if (currentStem && recommendedUrlStem && currentStem === recommendedUrlStem) return true;
      if (currentNorm && recommendedNorm && currentNorm === recommendedNorm) return true;
      if (currentNorm && recommendedUrlNorm && currentNorm === recommendedUrlNorm) return true;
      if (
        row?.sourceType === "modlist.html"
        && !!row?.matchFound
        && status !== "update-available"
      ) return true;
      if (fileNameMentionsVersion(currentFileName, target)) return true;
    }

    return false;
  }

  function filterResultsByExistingMods(primaryScan, existingScan, targetVersion) {
    const effectiveTarget = normalizeVersionForCompare(
      targetVersion
      || primaryScan?.targetVersion
      || existingScan?.targetVersion
      || ""
    );

    const existingAllRows = (existingScan?.results || [])
      .filter((row) => row.sourceType === "jar" || row.sourceType === "modlist.html");
    if (!existingAllRows.length) return primaryScan;

    const chooseBetterMatch = (current, candidate) => {
      if (!current) return candidate;
      const currentOnTarget = rowIsOnTargetVersion(current, effectiveTarget);
      const candidateOnTarget = rowIsOnTargetVersion(candidate, effectiveTarget);
      if (candidateOnTarget && !currentOnTarget) return candidate;
      if (currentOnTarget && !candidateOnTarget) return current;
      const currentKnown = isKnownVersion(current?.installedVersion);
      const candidateKnown = isKnownVersion(candidate?.installedVersion);
      if (candidateKnown && !currentKnown) return candidate;
      return current;
    };

    const indexProject = new Map();
    const indexIdentity = new Map();
    const indexCurrentStem = new Map();
    const addIndex = (map, key, row) => {
      if (!key) return;
      const existing = map.get(key) || null;
      map.set(key, chooseBetterMatch(existing, row));
    };

    for (const row of existingAllRows) {
      addIndex(indexProject, rowProjectKey(row), row);

      const identityKeys = rowIdentityKeys(row);
      for (const key of identityKeys) addIndex(indexIdentity, key, row);

      const currentFileName = String(row?.path || "").split("/").pop() || "";
      const displayName = String(row?.displayName || row?.mod || "").trim();
      const modName = String(row?.mod || "").trim();
      const stems = [
        buildFilenameIdentity(currentFileName),
        buildFilenameIdentity(displayName),
        buildFilenameIdentity(modName)
      ].filter(Boolean);
      for (const stem of stems) addIndex(indexCurrentStem, stem, row);
    }

    const filteredResults = [];
    for (const row of (primaryScan?.results || [])) {
      if (row.sourceType !== "jar" && row.sourceType !== "modlist.html") {
        filteredResults.push(row);
        continue;
      }

      let matchedExisting = null;

      const projectKey = rowProjectKey(row);
      if (projectKey && indexProject.has(projectKey)) {
        matchedExisting = indexProject.get(projectKey);
      }

      if (!matchedExisting) {
        const primaryTargetStem = rowTargetRecommendedStem(row, effectiveTarget);
        if (primaryTargetStem && indexCurrentStem.has(primaryTargetStem)) {
          matchedExisting = indexCurrentStem.get(primaryTargetStem);
        }
      }

      if (!matchedExisting) {
        const rowKeys = rowIdentityKeys(row);
        for (const key of rowKeys) {
          if (indexIdentity.has(key)) {
            matchedExisting = indexIdentity.get(key);
            break;
          }
        }
      }

      if (!matchedExisting) {
        filteredResults.push(row);
        continue;
      }

      if (rowIsOnTargetVersion(matchedExisting, effectiveTarget)) {
        continue;
      }

      filteredResults.push({
        ...row,
        installedVersion: matchedExisting.installedVersion || row.installedVersion
      });
    }

    return {
      ...primaryScan,
      results: filteredResults,
      count: filteredResults.length,
      comparedWith: existingScan?.fileName || null
    };
  }

  function duplicateWordsFromRow(row) {
    const raw = String(
      row?.mod
      || row?.displayName
      || (row?.path ? String(row.path).split("/").pop() : "")
      || ""
    )
      .replace(/\.[a-z0-9]{2,8}$/i, "")
      .toLowerCase()
      .replace(/\d+/g, " ")
      .replace(/[_+.\-()[\]]+/g, " ")
      .replace(/\b(mc|fabric|forge|quilt|neoforge|neo|release|beta|alpha|jar)\b/g, " ");

    const seen = new Set();
    return raw
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2 && !seen.has(word) && (seen.add(word), true));
  }

  function duplicateStemFromRow(row) {
    const fileName = String(row?.path || "").split("/").pop() || "";
    const candidates = [
      row?.mod,
      row?.displayName,
      fileName,
      row?.slug,
      row?.query
    ];

    for (const value of candidates) {
      const stem = buildFilenameIdentity(value);
      if (stem) return stem;
    }

    for (const value of candidates) {
      const normalized = normalizeModIdentity(String(value || "").replace(/\.jar$/i, ""));
      if (normalized) return normalized;
    }

    return "";
  }

  function sharedWordCount(wordsA, wordsB) {
    if (!wordsA.length || !wordsB.length) return 0;
    const setA = new Set(wordsA);
    let count = 0;
    for (const word of wordsB) {
      if (setA.has(word)) count += 1;
    }
    return count;
  }

  function filterResultsForDuplicateMods(scanResult) {
    const sourceRows = (scanResult?.results || []).filter((row) => row.sourceType === "jar" || row.sourceType === "modlist.html");
    const entries = sourceRows.map((row) => ({
      row,
      words: duplicateWordsFromRow(row),
      stem: duplicateStemFromRow(row)
    }));
    const duplicateIndexes = new Set();

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const fuzzyMatch = sharedWordCount(entries[i].words, entries[j].words) >= 2;
        const stemMatch = !!entries[i].stem && entries[i].stem === entries[j].stem;
        if (fuzzyMatch || stemMatch) {
          duplicateIndexes.add(i);
          duplicateIndexes.add(j);
        }
      }
    }

    const duplicateRows = entries
      .filter((_, idx) => duplicateIndexes.has(idx))
      .map((entry) => entry.row);

    return {
      ...scanResult,
      fileName: `${scanResult?.fileName || "Scan"} (Duplicate Check)`,
      results: duplicateRows,
      count: duplicateRows.length,
      duplicateMode: true,
      duplicateFuzzy: true
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

  function requestMinimumFabricLoaderVersion(gameVersion) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type: "GET_MIN_FABRIC_LOADER_VERSION", gameVersion }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || "Could not reach background service"));
            return;
          }
          if (!response?.ok || !response?.version) {
            reject(new Error(response?.error || "No Fabric Loader version found for selected target version"));
            return;
          }
          resolve(String(response.version));
        });
      } catch (error) {
        reject(error);
      }
    });
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

  function downloadBinary(filename, bytes, mime = "application/octet-stream") {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function normalizeArrayBufferForZip(input) {
    if (input instanceof ArrayBuffer) return input;
    if (input instanceof Uint8Array) return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    throw new Error("Archive payload was not binary data");
  }

  async function readZipEntriesFromBuffer(arrayBuffer) {
    const buffer = normalizeArrayBufferForZip(arrayBuffer);
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    const readU16 = (offset) => view.getUint16(offset, true);
    const readU32 = (offset) => view.getUint32(offset, true);

    const findEndOfCentralDirectory = () => {
      for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
        if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
      }
      throw new Error("Could not find ZIP central directory");
    };

    const inflateRaw = async (data) => {
      if (typeof DecompressionStream === "undefined") throw new Error("This browser does not support DecompressionStream");
      const ds = new DecompressionStream("deflate-raw");
      const stream = new Blob([data]).stream().pipeThrough(ds);
      const result = await new Response(stream).arrayBuffer();
      return new Uint8Array(result);
    };

    const eocdOffset = findEndOfCentralDirectory();
    const centralDirSize = readU32(eocdOffset + 12);
    const centralDirOffset = readU32(eocdOffset + 16);
    const decoder = new TextDecoder();
    const entries = [];
    let ptr = centralDirOffset;

    while (ptr < centralDirOffset + centralDirSize) {
      const sig = readU32(ptr);
      if (sig !== 0x02014b50) break;

      const compressionMethod = readU16(ptr + 10);
      const compressedSize = readU32(ptr + 20);
      const fileNameLength = readU16(ptr + 28);
      const extraLength = readU16(ptr + 30);
      const commentLength = readU16(ptr + 32);
      const localHeaderOffset = readU32(ptr + 42);

      const nameStart = ptr + 46;
      const fileName = decoder.decode(bytes.slice(nameStart, nameStart + fileNameLength));

      const localSig = readU32(localHeaderOffset);
      if (localSig !== 0x04034b50) throw new Error("Invalid local file header");

      const localNameLength = readU16(localHeaderOffset + 26);
      const localExtraLength = readU16(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

      let fileData = null;
      if (compressionMethod === 0) fileData = compressedData;
      else if (compressionMethod === 8) fileData = await inflateRaw(compressedData);
      else throw new Error(`Unsupported compression method: ${compressionMethod}`);

      entries.push({ fileName, data: fileData, compressionMethod });
      ptr += 46 + fileNameLength + extraLength + commentLength;
    }

    return entries;
  }

  const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function writeStoredZip(entries) {
    const encoder = new TextEncoder();
    const normalized = entries.map((entry) => {
      const name = String(entry.fileName || "").replace(/^\/+/, "");
      const fileNameBytes = encoder.encode(name);
      const data = entry.data instanceof Uint8Array
        ? entry.data
        : (entry.fileName || "").endsWith("/") ? new Uint8Array(0) : new Uint8Array(0);
      return {
        fileName: name,
        fileNameBytes,
        data,
        crc: crc32(data),
        localOffset: 0
      };
    }).filter((entry) => !!entry.fileName);

    let localSize = 0;
    let centralSize = 0;
    for (const entry of normalized) {
      localSize += 30 + entry.fileNameBytes.length + entry.data.length;
      centralSize += 46 + entry.fileNameBytes.length;
    }

    const totalSize = localSize + centralSize + 22;
    const out = new Uint8Array(totalSize);
    const view = new DataView(out.buffer);
    let offset = 0;

    const writeU16 = (value) => {
      view.setUint16(offset, value & 0xffff, true);
      offset += 2;
    };
    const writeU32 = (value) => {
      view.setUint32(offset, value >>> 0, true);
      offset += 4;
    };

    for (const entry of normalized) {
      entry.localOffset = offset;
      writeU32(0x04034b50);
      writeU16(20);
      writeU16(0);
      writeU16(0);
      writeU16(0);
      writeU16(0);
      writeU32(entry.crc);
      writeU32(entry.data.length);
      writeU32(entry.data.length);
      writeU16(entry.fileNameBytes.length);
      writeU16(0);
      out.set(entry.fileNameBytes, offset);
      offset += entry.fileNameBytes.length;
      out.set(entry.data, offset);
      offset += entry.data.length;
    }

    const centralStart = offset;
    for (const entry of normalized) {
      writeU32(0x02014b50);
      writeU16(20);
      writeU16(20);
      writeU16(0);
      writeU16(0);
      writeU16(0);
      writeU16(0);
      writeU32(entry.crc);
      writeU32(entry.data.length);
      writeU32(entry.data.length);
      writeU16(entry.fileNameBytes.length);
      writeU16(0);
      writeU16(0);
      writeU16(0);
      writeU16(0);
      writeU32(0);
      writeU32(entry.localOffset);
      out.set(entry.fileNameBytes, offset);
      offset += entry.fileNameBytes.length;
    }

    const centralSizeWritten = offset - centralStart;
    writeU32(0x06054b50);
    writeU16(0);
    writeU16(0);
    writeU16(normalized.length);
    writeU16(normalized.length);
    writeU32(centralSizeWritten);
    writeU32(centralStart);
    writeU16(0);

    return out;
  }

  function updateVersionTokenInString(value, targetVersion) {
    return String(value || "").replace(/\d+\.\d+(?:\.\d+)?/g, targetVersion);
  }

  function updateMinecraftDependencyValue(value, targetVersion) {
    if (typeof value === "string") return updateVersionTokenInString(value, targetVersion);
    if (Array.isArray(value)) {
      return value.map((item) => typeof item === "string" ? updateVersionTokenInString(item, targetVersion) : item);
    }
    if (value === null || value === undefined) return `>=${targetVersion}`;
    return value;
  }

  function updateFabricLoaderDependencyValue(value, loaderVersion) {
    const target = String(loaderVersion || "").trim();
    if (!target) return value;
    if (typeof value === "string") return `>=${target}`;
    if (Array.isArray(value)) return value.map(() => `>=${target}`);
    return `>=${target}`;
  }

  function asPrintableValue(value) {
    return typeof value === "string" ? value : JSON.stringify(value);
  }

  function stripJsonCommentsAndTrailingCommas(text) {
    return String(text || "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:\\])\/\/.*$/gm, "$1")
      .replace(/,\s*([}\]])/g, "$1");
  }

  function patchFabricModJsonText(text, targetVersion, loaderVersion) {
    const rawText = String(text || "");
    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      try {
        parsed = JSON.parse(stripJsonCommentsAndTrailingCommas(rawText));
      } catch {
        const minecraftPattern = /("minecraft"\s*:\s*")([^"]*)(")/i;
        const loaderPattern = /("(fabricloader|fabric-loader|fabric_loader|fabricLoader)"\s*:\s*")([^"]*)(")/i;

        const minecraftMatch = rawText.match(minecraftPattern);
        if (!minecraftMatch) throw new Error("fabric.mod.json is not valid JSON and minecraft dependency could not be located");

        const minecraftBefore = minecraftMatch[2];
        const minecraftAfter = updateVersionTokenInString(minecraftBefore, targetVersion);
        let updatedText = rawText.replace(minecraftPattern, (_m, prefix, _value, suffix) => `${prefix}${minecraftAfter}${suffix}`);

        let loaderBefore = "";
        let loaderAfter = "";
        let loaderKey = "";
        if (loaderVersion) {
          const loaderMatch = updatedText.match(loaderPattern);
          if (loaderMatch) {
            loaderKey = loaderMatch[2] || "fabricloader";
            loaderBefore = loaderMatch[3];
            loaderAfter = `>=${loaderVersion}`;
            updatedText = updatedText.replace(loaderPattern, (_m, prefix, _key, _value, suffix) => `${prefix}${loaderAfter}${suffix}`);
          } else {
            throw new Error("fabric.mod.json is not valid JSON and fabric loader dependency could not be located");
          }
        }

        return {
          text: updatedText,
          minecraftBefore,
          minecraftAfter,
          loaderKey,
          loaderBefore,
          loaderAfter
        };
      }
    }

    const depContainer = parsed.depends && typeof parsed.depends === "object"
      ? parsed.depends
      : parsed.dependencies && typeof parsed.dependencies === "object"
        ? parsed.dependencies
        : null;
    if (!depContainer) throw new Error("No depends or dependencies block was found in fabric.mod.json");

    if (!Object.prototype.hasOwnProperty.call(depContainer, "minecraft")) {
      throw new Error("No minecraft dependency was found in fabric.mod.json");
    }

    const minecraftBefore = depContainer.minecraft;
    depContainer.minecraft = updateMinecraftDependencyValue(depContainer.minecraft, targetVersion);
    const minecraftAfter = depContainer.minecraft;

    let loaderKey = "";
    let loaderBefore = "";
    let loaderAfter = "";

    if (loaderVersion) {
      const loaderKeys = ["fabricloader", "fabric-loader", "fabric_loader", "fabricLoader"];
      loaderKey = loaderKeys.find((key) => Object.prototype.hasOwnProperty.call(depContainer, key)) || "fabricloader";
      loaderBefore = asPrintableValue(depContainer[loaderKey]);
      depContainer[loaderKey] = updateFabricLoaderDependencyValue(depContainer[loaderKey], loaderVersion);
      loaderAfter = asPrintableValue(depContainer[loaderKey]);
    }

    return {
      text: `${JSON.stringify(parsed, null, 2)}\n`,
      minecraftBefore: asPrintableValue(minecraftBefore),
      minecraftAfter: asPrintableValue(minecraftAfter),
      loaderKey,
      loaderBefore,
      loaderAfter
    };
  }

  function renameJarForTargetVersion(originalName, targetVersion) {
    const safeName = String(originalName || "updated-mod.jar").trim();
    const dot = safeName.lastIndexOf(".");
    const ext = dot > 0 ? safeName.slice(dot) : ".jar";
    let stem = dot > 0 ? safeName.slice(0, dot) : safeName;
    let replaced = false;

    const applyReplace = (pattern, replacementBuilder) => {
      stem = stem.replace(pattern, (...args) => {
        replaced = true;
        return replacementBuilder(...args);
      });
    };

    applyReplace(/(mc[-_]?)(\d+\.\d+(?:\.\d+)?)/ig, (_m, prefix) => `${prefix}${targetVersion}`);
    applyReplace(/(minecraft[-_]?)(\d+\.\d+(?:\.\d+)?)/ig, (_m, prefix) => `${prefix}${targetVersion}`);
    applyReplace(/((?:fabric|forge|quilt|neoforge|neo-?forge)[-_+]?)(\d+\.\d+(?:\.\d+)?)/ig, (_m, prefix) => `${prefix}${targetVersion}`);

    if (!replaced) {
      const versionPattern = /\d+\.\d+(?:\.\d+)?/g;
      const matches = [...stem.matchAll(versionPattern)];
      if (matches.length) {
        const last = matches[matches.length - 1];
        stem = `${stem.slice(0, last.index)}${targetVersion}${stem.slice((last.index || 0) + last[0].length)}`;
        replaced = true;
      }
    }

    if (!replaced) stem = `${stem}-${targetVersion}`;
    return `${sanitizeFilename(stem, "updated-mod")}${ext.toLowerCase() === ".jar" ? ".jar" : ext}`;
  }

  async function updateFabricJarVersion(file, targetVersion, onProgress = () => {}) {
    const selectedTarget = normalizeLegacyVersion(targetVersion || "");
    if (!selectedTarget) throw new Error("Select a target Minecraft version first.");

    onProgress(4, "Resolving Fabric Loader", `Target MC ${selectedTarget}`);
    const minimumLoaderVersion = await requestMinimumFabricLoaderVersion(selectedTarget);
    if (!minimumLoaderVersion) {
      throw new Error(`Could not resolve Fabric Loader version for Minecraft ${selectedTarget}.`);
    }

    onProgress(8, "Reading JAR", file.name);
    const buffer = await file.arrayBuffer();
    const entries = await readZipEntriesFromBuffer(buffer);
    onProgress(30, "Scanning archive", `${entries.length} entries | Loader ${minimumLoaderVersion}`);

    const fabricIndex = entries.findIndex((entry) => {
      const lower = String(entry.fileName || "").toLowerCase();
      return lower.endsWith("fabric.mod.json") || lower.endsWith("fabric.mod.jsonm");
    });
    if (fabricIndex < 0) throw new Error("No fabric.mod.json file was found in this JAR.");

    const targetEntry = entries[fabricIndex];
    if (!(targetEntry.data instanceof Uint8Array)) throw new Error("fabric.mod.json could not be read from archive.");

    const currentText = new TextDecoder().decode(targetEntry.data);
    const patched = patchFabricModJsonText(currentText, selectedTarget, minimumLoaderVersion);
    targetEntry.data = new TextEncoder().encode(patched.text);
    targetEntry.compressionMethod = 0;
    onProgress(60, "Updating metadata", `${targetEntry.fileName}`);

    const outBytes = writeStoredZip(entries);
    const outputFileName = renameJarForTargetVersion(file.name, selectedTarget);
    onProgress(90, "Building output", outputFileName);

    return {
      bytes: outBytes,
      outputFileName,
      updatedPath: targetEntry.fileName,
      minimumLoaderVersion,
      minecraftBefore: patched.minecraftBefore,
      minecraftAfter: patched.minecraftAfter,
      loaderKey: patched.loaderKey,
      loaderBefore: patched.loaderBefore,
      loaderAfter: patched.loaderAfter
    };
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
      "  <generator>Mod Update Checker v2.1</generator>",
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
        const hasSelectedTarget = !!normalizeVersionForCompare(selectedVersion);
        const isMatch = hasSelectedTarget
          ? rowIsOnTargetVersion(row, selectedVersion)
          : (isKnownVersion(rawCurrentVersion) && selectedVersion && rawCurrentVersion === selectedVersion);
        const matchBaseLabel = row.match || modFile;
        const modrinthFiles = Array.isArray(row.recommended?.files) ? row.recommended.files : [];
        const primaryDownload = modrinthFiles.find((file) => file?.primary && file?.url) || modrinthFiles.find((file) => file?.url) || null;
        const directDownloadUrl = String(row.url || primaryDownload?.url || "").trim();
        const searchedVersion = String(row.searchedVersion || "");
        const strictVersionMatch = !selectedVersion || selectedVersion === "Unknown"
          ? !!directDownloadUrl
          : searchedVersion === selectedVersion;
        const modeAvailable = !!directDownloadUrl && strictVersionMatch && !isMatch;
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
              <button class="muc-btn secondary" id="muc-download-all">Download All</button>
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

    function collectFilteredDirectLinks() {
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

      return uniqueRows;
    }

    overlay.querySelector("#muc-download-all").addEventListener("click", () => {
      const uniqueRows = collectFilteredDirectLinks();
      if (!uniqueRows.length) {
        alert("No direct download links were found for the current filters.");
        return;
      }

      uniqueRows.forEach((entry) => {
        window.open(entry.url, "_blank", "noopener,noreferrer");
      });
    });

    overlay.querySelector("#muc-export-jd2").addEventListener("click", () => {
      const uniqueRows = collectFilteredDirectLinks();

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
    const autoClosePanel = behavior.autoClosePanel !== false;
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
      if (autoRender) {
        renderOverlay(res, await getSettings());
        if (autoClosePanel) root.remove();
      }
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
    const autoClosePanel = behavior.autoClosePanel !== false;
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
      if (autoRender) {
        renderOverlay(res, await getSettings());
        if (autoClosePanel) root.remove();
      }
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
      <div class="muc-title" id="muc-panel-title">Check Mod Updates?</div>
      <div class="muc-text" id="muc-panel-text">Upload a CurseForge or Modrinth ZIP or folder. Pick what you want to do first, then scan. Advanced scan toggles now live in Settings.</div>

      <div class="muc-grid">
        <div class="muc-field muc-full">
          <div class="muc-label-row">
            <label class="muc-label" for="muc-panel-mode">Scan mode</label>
            <div class="muc-info-wrap" aria-hidden="true">
              <span class="muc-info-btn">i</span>
              <div class="muc-info-pop">
                <div class="muc-info-item">
                  <div class="muc-info-mode">Upgrade Current Pack</div>
                  <div class="muc-info-desc">Find newer matching files for the target version.</div>
                </div>
                <div class="muc-info-item">
                  <div class="muc-info-mode">Downgrade Current Pack</div>
                  <div class="muc-info-desc">Find older compatible files for the target version.</div>
                </div>
                <div class="muc-info-item">
                  <div class="muc-info-mode">Missing Mods (Compare Old and New)</div>
                  <div class="muc-info-desc">Show old pack mods still missing in the new pack.</div>
                </div>
                <div class="muc-info-item">
                  <div class="muc-info-mode">Check for Updates</div>
                  <div class="muc-info-desc">Only scan mods already on the selected target version.</div>
                </div>
                <div class="muc-info-item">
                  <div class="muc-info-mode">Duplicate Check</div>
                  <div class="muc-info-desc">Find likely duplicate mods using name and stem matching.</div>
                </div>
                <div class="muc-info-item">
                  <div class="muc-info-mode">Attempt to update mod (Fabric only)</div>
                  <div class="muc-info-desc">Open a single JAR, update minecraft in fabric.mod.json, then download an updated JAR for the selected target version.</div>
                </div>
              </div>
            </div>
          </div>
          <select class="muc-select" id="muc-panel-mode">
            <option value="upgrade_standard">Upgrade Current Pack</option>
            <option value="downgrade_standard">Downgrade Current Pack</option>
            <option value="compare">Missing Mods (Compare Old and New)</option>
            <option value="current_target">Check for Updates</option>
            <option value="duplicates">Duplicate Check</option>
            <option value="attempt_update_fabric">Attempt to update mod (Fabric only)</option>
          </select>
        </div>
        <div class="muc-field muc-full">
          <div class="muc-label-row">
            <label class="muc-label" for="muc-target-version">Target Minecraft version</label>
            <div class="muc-info-wrap" aria-hidden="true">
              <span class="muc-info-btn">i</span>
              <div class="muc-info-pop">
                <div class="muc-info-title">Target version help</div>
                <div class="muc-info-line">Set this to the Minecraft version you want your matched files to be.</div>
              </div>
            </div>
          </div>
          <select class="muc-select" id="muc-target-version"></select>
        </div>
      </div>

      <div class="muc-source-row" id="muc-source-summary"></div>

      <div id="muc-standard-upload">
        <div class="muc-actions" style="margin-top:12px;">
          <div class="muc-upload-picker">
            <button class="muc-btn primary" id="muc-upload-main">Upload ZIP/Folder</button>
            <div class="muc-upload-picker-menu" id="muc-upload-main-menu" hidden>
              <button class="muc-btn secondary" id="muc-upload-main-zip" type="button">ZIP</button>
              <button class="muc-btn secondary" id="muc-upload-main-folder" type="button">Folder</button>
            </div>
          </div>
        </div>

      </div>

      <div class="muc-dual-upload muc-duplicate-upload" id="muc-duplicate-upload" hidden>
        <div class="muc-dual-card">
          <div class="muc-dual-title" id="muc-duplicate-title">Upload ZIP/Folder for Duplicate Check</div>
          <div class="muc-actions">
            <div class="muc-upload-picker">
              <button class="muc-btn primary" id="muc-upload-dup-main">Upload ZIP/Folder</button>
              <div class="muc-upload-picker-menu" id="muc-upload-dup-menu" hidden>
                <button class="muc-btn secondary" id="muc-upload-dup-zip" type="button">ZIP</button>
                <button class="muc-btn secondary" id="muc-upload-dup-folder" type="button">Folder</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="muc-dual-upload muc-duplicate-upload" id="muc-fabric-update-upload" hidden>
        <div class="muc-dual-card">
          <div class="muc-dual-title" id="muc-fabric-update-title">Upload Fabric JAR</div>
          <div class="muc-actions">
            <button class="muc-btn primary" id="muc-upload-fabric-jar">Upload JAR</button>
          </div>
          <div class="muc-dual-status" id="muc-upload-fabric-status">Not selected</div>
        </div>
      </div>

      <div class="muc-dual-upload" id="muc-dual-upload" hidden>
        <div class="muc-dual-card muc-compare-card">
          <div class="muc-compare-block">
            <div class="muc-dual-title" id="muc-old-upload-title">Old ZIP/Folder</div>
            <div class="muc-actions">
              <div class="muc-upload-picker">
                <button class="muc-btn primary" id="muc-upload-old-main">ZIP/Folder</button>
                <div class="muc-upload-picker-menu" id="muc-upload-old-menu" hidden>
                  <button class="muc-btn secondary" id="muc-upload-old-zip" type="button">ZIP</button>
                  <button class="muc-btn secondary" id="muc-upload-old-folder" type="button">Folder</button>
                </div>
              </div>
            </div>
            <div class="muc-dual-status" id="muc-upload-old-status">Not selected</div>
          </div>
          <div class="muc-compare-divider"></div>
          <div class="muc-compare-block">
            <div class="muc-dual-title" id="muc-new-upload-title">New ZIP/Folder</div>
            <div class="muc-actions">
              <div class="muc-upload-picker">
                <button class="muc-btn primary" id="muc-upload-new-main">ZIP/Folder</button>
                <div class="muc-upload-picker-menu" id="muc-upload-new-menu" hidden>
                  <button class="muc-btn secondary" id="muc-upload-new-zip" type="button">ZIP</button>
                  <button class="muc-btn secondary" id="muc-upload-new-folder" type="button">Folder</button>
                </div>
              </div>
            </div>
            <div class="muc-dual-status" id="muc-upload-new-status">Not selected</div>
          </div>
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

      <div class="muc-mode-row">
        <button class="muc-btn secondary" id="muc-open-settings">Settings</button>
        <button class="muc-btn secondary" id="muc-open-roadmap">RoadMap</button>
      </div>

      <input type="file" id="muc-file" accept=".zip" hidden />
      <input type="file" id="muc-folder" webkitdirectory directory multiple hidden />
      <input type="file" id="muc-dup-file" accept=".zip" hidden />
      <input type="file" id="muc-dup-folder" webkitdirectory directory multiple hidden />
      <input type="file" id="muc-old-file" accept=".zip" hidden />
      <input type="file" id="muc-old-folder" webkitdirectory directory multiple hidden />
      <input type="file" id="muc-new-file" accept=".zip" hidden />
      <input type="file" id="muc-new-folder" webkitdirectory directory multiple hidden />
      <input type="file" id="muc-fabric-jar-file" accept=".jar" hidden />
    </div>`;
  document.body.appendChild(root);
  setThemeClass(root, "light");

  function enablePanelDragging(rootNode, cardNode) {
    if (!rootNode || !cardNode) return;
    let dragState = null;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const isInteractiveTarget = (target) => {
      if (!(target instanceof Element)) return false;
      return !!target.closest("button, input, select, textarea, a, label, .muc-upload-picker-menu");
    };

    const startDrag = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (isInteractiveTarget(event.target)) return;

      const cardRect = cardNode.getBoundingClientRect();
      const rootRect = rootNode.getBoundingClientRect();
      const width = Math.round(cardRect.width);
      const height = Math.round(cardRect.height);

      rootNode.style.width = `${width}px`;
      rootNode.style.left = `${rootRect.left}px`;
      rootNode.style.top = `${rootRect.top}px`;
      rootNode.style.right = "auto";
      rootNode.style.bottom = "auto";

      dragState = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rootRect.left,
        offsetY: event.clientY - rootRect.top,
        width,
        height
      };
      cardNode.classList.add("muc-dragging");
      try { cardNode.setPointerCapture(event.pointerId); } catch {}
      event.preventDefault();
    };

    const moveDrag = (event) => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      const maxLeft = Math.max(0, window.innerWidth - dragState.width);
      const maxTop = Math.max(0, window.innerHeight - dragState.height);
      const nextLeft = clamp(event.clientX - dragState.offsetX, 0, maxLeft);
      const nextTop = clamp(event.clientY - dragState.offsetY, 0, maxTop);

      rootNode.style.left = `${nextLeft}px`;
      rootNode.style.top = `${nextTop}px`;
      event.preventDefault();
    };

    const endDrag = (event) => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      dragState = null;
      cardNode.classList.remove("muc-dragging");
      try { cardNode.releasePointerCapture(event.pointerId); } catch {}
    };

    cardNode.addEventListener("pointerdown", startDrag);
    cardNode.addEventListener("pointermove", moveDrag);
    cardNode.addEventListener("pointerup", endDrag);
    cardNode.addEventListener("pointercancel", endDrag);
  }

  const card = root.querySelector(".muc-card");
  enablePanelDragging(root, card);

  const cardCloseBtn = root.querySelector("#muc-card-close");
  const standardUploadSection = root.querySelector("#muc-standard-upload");
  const duplicateUploadSection = root.querySelector("#muc-duplicate-upload");
  const fabricUpdateUploadSection = root.querySelector("#muc-fabric-update-upload");
  const dualUploadSection = root.querySelector("#muc-dual-upload");
  const uploadMainBtn = root.querySelector("#muc-upload-main");
  const uploadMainMenu = root.querySelector("#muc-upload-main-menu");
  const uploadMainZipBtn = root.querySelector("#muc-upload-main-zip");
  const uploadMainFolderBtn = root.querySelector("#muc-upload-main-folder");
  const fileInput = root.querySelector("#muc-file");
  const folderInput = root.querySelector("#muc-folder");
  const dupUploadMainBtn = root.querySelector("#muc-upload-dup-main");
  const dupUploadMenu = root.querySelector("#muc-upload-dup-menu");
  const dupUploadZipBtn = root.querySelector("#muc-upload-dup-zip");
  const dupUploadFolderBtn = root.querySelector("#muc-upload-dup-folder");
  const dupFileInput = root.querySelector("#muc-dup-file");
  const dupFolderInput = root.querySelector("#muc-dup-folder");
  const fabricJarUploadBtn = root.querySelector("#muc-upload-fabric-jar");
  const fabricJarInput = root.querySelector("#muc-fabric-jar-file");
  const fabricJarStatus = root.querySelector("#muc-upload-fabric-status");
  const oldUploadMainBtn = root.querySelector("#muc-upload-old-main");
  const oldUploadMenu = root.querySelector("#muc-upload-old-menu");
  const oldUploadZipBtn = root.querySelector("#muc-upload-old-zip");
  const oldUploadFolderBtn = root.querySelector("#muc-upload-old-folder");
  const newUploadMainBtn = root.querySelector("#muc-upload-new-main");
  const newUploadMenu = root.querySelector("#muc-upload-new-menu");
  const newUploadZipBtn = root.querySelector("#muc-upload-new-zip");
  const newUploadFolderBtn = root.querySelector("#muc-upload-new-folder");
  const oldUploadStatus = root.querySelector("#muc-upload-old-status");
  const newUploadStatus = root.querySelector("#muc-upload-new-status");
  const searchUpdatesBtn = root.querySelector("#muc-search-updates");
  const oldFileInput = root.querySelector("#muc-old-file");
  const oldFolderInput = root.querySelector("#muc-old-folder");
  const newFileInput = root.querySelector("#muc-new-file");
  const newFolderInput = root.querySelector("#muc-new-folder");
  const panelTitle = root.querySelector("#muc-panel-title");
  const panelText = root.querySelector("#muc-panel-text");
  const duplicateTitle = root.querySelector("#muc-duplicate-title");
  const fabricUpdateTitle = root.querySelector("#muc-fabric-update-title");
  const oldUploadTitle = root.querySelector("#muc-old-upload-title");
  const newUploadTitle = root.querySelector("#muc-new-upload-title");
  const panelModeSelect = root.querySelector("#muc-panel-mode");
  const targetInput = root.querySelector("#muc-target-version");
  const openSettingsBtn = root.querySelector("#muc-open-settings");
  const openRoadmapBtn = root.querySelector("#muc-open-roadmap");
  const sourceSummary = root.querySelector("#muc-source-summary");
  const compareUploads = { old: null, newer: null };
  let duplicateMode = false;
  let fabricUpdateMode = false;
  let ignoreCurrentVersionSetting = false;
  let onlyUpdatesCurrentSetting = false;
  let ignoreCurrentVersionMode = false;
  let scanModeSetting = "mods";

  function normalizeSearchMode(value) {
    const clean = String(value || "").trim().toLowerCase();
    if (clean === "duplicates" || clean === "ignore-current-version" || clean === "only-current-selected" || clean === "attempt-update-fabric" || clean === "standard") {
      return clean;
    }
    return "standard";
  }

  function searchFlagsFromMode(searchMode) {
    const mode = normalizeSearchMode(searchMode);
    if (mode === "duplicates") {
      return {
        checkDuplicateMods: true,
        ignoreCurrentVersionMods: false,
        onlyUpdatesCurrentSelected: false
      };
    }
    if (mode === "ignore-current-version") {
      return {
        checkDuplicateMods: false,
        ignoreCurrentVersionMods: true,
        onlyUpdatesCurrentSelected: false
      };
    }
    if (mode === "only-current-selected") {
      return {
        checkDuplicateMods: false,
        ignoreCurrentVersionMods: false,
        onlyUpdatesCurrentSelected: true
      };
    }
    if (mode === "attempt-update-fabric") {
      return {
        checkDuplicateMods: false,
        ignoreCurrentVersionMods: false,
        onlyUpdatesCurrentSelected: false
      };
    }
    return {
      checkDuplicateMods: false,
      ignoreCurrentVersionMods: false,
      onlyUpdatesCurrentSelected: false
    };
  }

  function resolveSearchModeFromSettings(settings) {
    if (settings?.checkDuplicateMods === true) return "duplicates";
    if (settings?.onlyUpdatesCurrentSelected === true) return "only-current-selected";
    if (settings?.ignoreCurrentVersionMods === true) return "ignore-current-version";
    return normalizeSearchMode(settings?.searchMode || "standard");
  }

  function panelModeFromSettings(settings) {
    const scanPrefix = (settings?.scanMode || scanModeSetting) === "downgrade" ? "downgrade" : "upgrade";
    const searchMode = resolveSearchModeFromSettings(settings);
    if (searchMode === "duplicates") return "duplicates";
    if (searchMode === "ignore-current-version") return "compare";
    if (searchMode === "only-current-selected") return "current_target";
    if (searchMode === "attempt-update-fabric") return "attempt_update_fabric";
    return `${scanPrefix}_standard`;
  }

  function settingsFromPanelMode(value, fallbackScanMode = "mods") {
    const modeValue = String(value || "upgrade_standard").trim().toLowerCase();
    let scanMode = String(fallbackScanMode || "mods").trim().toLowerCase() === "downgrade" ? "downgrade" : "mods";
    if (modeValue.startsWith("downgrade_")) scanMode = "downgrade";
    else if (modeValue.startsWith("upgrade_")) scanMode = "mods";
    else if (modeValue === "attempt_update_fabric") scanMode = "mods";

    let searchMode = "standard";
    if (modeValue === "compare" || modeValue.endsWith("_compare")) searchMode = "ignore-current-version";
    else if (modeValue === "current_target" || modeValue.endsWith("_current_target")) searchMode = "only-current-selected";
    else if (modeValue === "duplicates" || modeValue.endsWith("_duplicates")) searchMode = "duplicates";
    else if (modeValue === "attempt_update_fabric") searchMode = "attempt-update-fabric";
    const flags = searchFlagsFromMode(searchMode);
    return {
      scanMode,
      searchMode,
      checkDuplicateMods: flags.checkDuplicateMods,
      ignoreCurrentVersionMods: flags.ignoreCurrentVersionMods,
      onlyUpdatesCurrentSelected: flags.onlyUpdatesCurrentSelected
    };
  }

  function populateTargetVersionOptions(versions, selected) {
    const list = sanitizeMinecraftVersionDatabase(versions);
    const selectedValue = normalizeLegacyVersion(selected || "");
    const hasSelected = selectedValue && list.includes(selectedValue);
    const options = [
      `<option value="">Use detected source version</option>`,
      ...list.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)
    ];
    if (selectedValue && !hasSelected) {
      options.push(`<option value="${escapeHtml(selectedValue)}">${escapeHtml(selectedValue)}</option>`);
    }
    targetInput.innerHTML = options.join("");
    targetInput.value = selectedValue || "";
  }

  function panelCopyForMode() {
    const dualMode = !duplicateMode && !fabricUpdateMode && ignoreCurrentVersionMode === true;

    if (fabricUpdateMode) {
      return {
        title: "Attempt to Update Mod?",
        text: "Upload a Fabric JAR. The tool will edit minecraft in fabric.mod.json to the selected target version and download an updated JAR.",
        duplicateTitle: "Upload ZIP/Folder for Duplicate Check",
        fabricUpdateTitle: "Upload Fabric JAR",
        oldUploadTitle: "Old ZIP/Folder",
        newUploadTitle: "New ZIP/Folder",
        searchLabel: "Search for Updates"
      };
    }

    if (duplicateMode) {
      return {
        title: "Check Duplicate Mods?",
        text: "Upload a ZIP or folder to scan for duplicate mods using name and stem matching.",
        duplicateTitle: "Upload ZIP/Folder for Duplicate Check",
        fabricUpdateTitle: "Upload Fabric JAR",
        oldUploadTitle: "Old ZIP/Folder",
        newUploadTitle: "New ZIP/Folder",
        searchLabel: "Search for Updates"
      };
    }

    if (dualMode) {
      return {
        title: "Compare Old and New Packs?",
        text: "Upload both packs in the compare area, then search for old-pack mods that still need matching in the new pack.",
        duplicateTitle: "Upload ZIP/Folder for Duplicate Check",
        fabricUpdateTitle: "Upload Fabric JAR",
        oldUploadTitle: "Old ZIP/Folder",
        newUploadTitle: "New ZIP/Folder",
        searchLabel: "Search for Remaining Updates"
      };
    }

    if (onlyUpdatesCurrentSetting) {
      return {
        title: "Check for Updates?",
        text: "Upload a ZIP or folder to check updates only for mods already on the selected target version.",
        duplicateTitle: "Upload ZIP/Folder for Duplicate Check",
        fabricUpdateTitle: "Upload Fabric JAR",
        oldUploadTitle: "Old ZIP/Folder",
        newUploadTitle: "New ZIP/Folder",
        searchLabel: "Search for Updates"
      };
    }

    if (scanModeSetting === "downgrade") {
      return {
        title: "Downgrade Pack?",
        text: "Upload a CurseForge or Modrinth ZIP or folder to find older compatible files for the selected target version.",
        duplicateTitle: "Upload ZIP/Folder for Duplicate Check",
        fabricUpdateTitle: "Upload Fabric JAR",
        oldUploadTitle: "Old ZIP/Folder",
        newUploadTitle: "New ZIP/Folder",
        searchLabel: "Search for Updates"
      };
    }

    return {
      title: "Upgrade Pack?",
      text: "Upload a CurseForge or Modrinth ZIP or folder to find newer matching files for the selected target version.",
      duplicateTitle: "Upload ZIP/Folder for Duplicate Check",
      fabricUpdateTitle: "Upload Fabric JAR",
      oldUploadTitle: "Old ZIP/Folder",
      newUploadTitle: "New ZIP/Folder",
      searchLabel: "Search for Updates"
    };
  }

  function updatePanelTitles() {
    const copy = panelCopyForMode();
    if (panelTitle) panelTitle.textContent = copy.title;
    if (panelText) panelText.textContent = copy.text;
    if (duplicateTitle) duplicateTitle.textContent = copy.duplicateTitle;
    if (fabricUpdateTitle) fabricUpdateTitle.textContent = copy.fabricUpdateTitle;
    if (oldUploadTitle) oldUploadTitle.textContent = copy.oldUploadTitle;
    if (newUploadTitle) newUploadTitle.textContent = copy.newUploadTitle;
    if (searchUpdatesBtn) searchUpdatesBtn.textContent = copy.searchLabel;
  }

  function updateSourceSummary(settings) {
    const totalSources = countSearchSources(settings?.additionalSourceUrls || []);
    sourceSummary.innerHTML = `<span class="muc-source-chip">${totalSources} sources</span>`;
  }

  const uploadPickers = [];

  function closeUploadPickers() {
    uploadPickers.forEach((picker) => {
      if (picker?.menu) picker.menu.hidden = true;
    });
  }

  function bindUploadPicker(mainButton, menu, zipButton, folderButton, onZip, onFolder) {
    if (!mainButton || !menu || !zipButton || !folderButton) return;
    uploadPickers.push({ mainButton, menu });

    mainButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (mainButton.disabled) return;
      const shouldOpen = menu.hidden;
      closeUploadPickers();
      menu.hidden = !shouldOpen;
    });

    zipButton.addEventListener("click", (e) => {
      e.preventDefault();
      menu.hidden = true;
      onZip();
    });

    folderButton.addEventListener("click", (e) => {
      e.preventDefault();
      menu.hidden = true;
      onFolder();
    });
  }

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
    const dualMode = !duplicateMode && !fabricUpdateMode && ignoreCurrentVersionMode === true;
    standardUploadSection.hidden = duplicateMode || dualMode || fabricUpdateMode;
    duplicateUploadSection.hidden = !duplicateMode;
    fabricUpdateUploadSection.hidden = !fabricUpdateMode;
    dualUploadSection.hidden = !dualMode;
    if (!dualMode) resetCompareSelections();
    if (dualMode) updateCompareSearchState();
    if (!fabricUpdateMode) fabricJarStatus.textContent = "Not selected";
    updatePanelTitles();
  }

  function syncModeFlagsFromSettings(settings) {
    scanModeSetting = (settings?.scanMode || scanModeSetting) === "downgrade" ? "downgrade" : "mods";
    const searchFlags = searchFlagsFromMode(resolveSearchModeFromSettings(settings));
    duplicateMode = searchFlags.checkDuplicateMods;
    fabricUpdateMode = resolveSearchModeFromSettings(settings) === "attempt-update-fabric";
    ignoreCurrentVersionSetting = searchFlags.ignoreCurrentVersionMods;
    onlyUpdatesCurrentSetting = searchFlags.onlyUpdatesCurrentSelected;
    ignoreCurrentVersionMode = !duplicateMode && !fabricUpdateMode && ignoreCurrentVersionSetting && !onlyUpdatesCurrentSetting;
    if (panelModeSelect) panelModeSelect.value = panelModeFromSettings({
      scanMode: scanModeSetting,
      checkDuplicateMods: duplicateMode,
      ignoreCurrentVersionMods: ignoreCurrentVersionSetting,
      onlyUpdatesCurrentSelected: onlyUpdatesCurrentSetting
    });
  }

  async function runSelectionScan(selection, rootNode, settings, phaseLabel) {
    if (!selection) return null;
    if (selection.kind === "folder") {
      return await scanFolderFiles(selection.files, rootNode, settings, phaseLabel || "Preparing folder");
    }
    return await scanZipFile(selection.file, rootNode, settings, phaseLabel || "Preparing ZIP");
  }

  async function renderDuplicateScan(scanResult) {
    const filtered = filterResultsForDuplicateMods(scanResult);
    setProgress(root, 100, "Duplicate scan complete", `${filtered.count || 0} duplicate rows found`);
    setTimeout(() => clearProgress(root), 800);
    renderOverlay(filtered, await getSettings());
    root.remove();
  }

  async function runFabricJarUpdate(file) {
    const settings = await getSettings();
    const targetVersion = normalizeLegacyVersion(targetInput.value || settings.targetVersion || "");
    if (!targetVersion) {
      alert("Select a target Minecraft version before updating a JAR.");
      return;
    }

    fabricJarUploadBtn.disabled = true;
    fabricJarUploadBtn.textContent = "Updating...";
    fabricJarStatus.textContent = `Selected: ${file.name}`;

    try {
      const result = await updateFabricJarVersion(file, targetVersion, (percent, label, subtext) => {
        setProgress(root, percent, label, subtext);
      });
      const loaderText = result.loaderKey
        ? `${result.loaderKey}: ${result.loaderBefore || "n/a"} -> ${result.loaderAfter || "n/a"}`
        : `fabricloader: >=${result.minimumLoaderVersion}`;
      setProgress(
        root,
        100,
        "Update complete",
        `${result.updatedPath} | minecraft: ${result.minecraftBefore} -> ${result.minecraftAfter} | ${loaderText}`
      );

      const suggested = sanitizeFilename(result.outputFileName.replace(/\.jar$/i, ""), "updated-mod");
      const userName = prompt("Save updated JAR as:", `${suggested}.jar`);
      if (userName !== null) {
        const finalName = `${sanitizeFilename(String(userName || "").replace(/\.jar$/i, ""), suggested)}.jar`;
        downloadBinary(finalName, result.bytes, "application/java-archive");
        fabricJarStatus.textContent = `Updated: ${finalName}`;
      } else {
        fabricJarStatus.textContent = "Update created. Save was cancelled.";
      }
    } catch (err) {
      clearProgress(root);
      fabricJarStatus.textContent = "Update failed.";
      alert("Fabric update failed: " + (err?.message || String(err)));
    } finally {
      fabricJarUploadBtn.disabled = false;
      fabricJarUploadBtn.textContent = "Upload JAR";
      setTimeout(() => clearProgress(root), 1200);
    }
  }

  getSettings().then((settings) => {
    const versions = (settings.minecraftVersionDatabase && settings.minecraftVersionDatabase.length) ? settings.minecraftVersionDatabase : DEFAULTS.minecraftVersionDatabase;
    populateTargetVersionOptions(versions, settings.targetVersion || "");
    syncModeFlagsFromSettings(settings);
    updateUploadModeLayout();
    setThemeClass(root, normalizeTheme(settings.theme));
    updateSourceSummary(settings);
  });

  targetInput.addEventListener("change", async () => { await setSettings({ targetVersion: targetInput.value }); });

  panelModeSelect.addEventListener("change", async () => {
    const nextSettings = settingsFromPanelMode(panelModeSelect.value, scanModeSetting);
    syncModeFlagsFromSettings(nextSettings);
    updateUploadModeLayout();
    await setSettings(nextSettings);
  });

  openSettingsBtn.addEventListener("click", openSettings);
  openRoadmapBtn.addEventListener("click", openRoadmap);
  cardCloseBtn.addEventListener("click", () => root.remove());
  bindUploadPicker(uploadMainBtn, uploadMainMenu, uploadMainZipBtn, uploadMainFolderBtn, () => fileInput.click(), () => folderInput.click());
  bindUploadPicker(dupUploadMainBtn, dupUploadMenu, dupUploadZipBtn, dupUploadFolderBtn, () => dupFileInput.click(), () => dupFolderInput.click());
  bindUploadPicker(oldUploadMainBtn, oldUploadMenu, oldUploadZipBtn, oldUploadFolderBtn, () => oldFileInput.click(), () => oldFolderInput.click());
  bindUploadPicker(newUploadMainBtn, newUploadMenu, newUploadZipBtn, newUploadFolderBtn, () => newFileInput.click(), () => newFolderInput.click());
  fabricJarUploadBtn.addEventListener("click", () => fabricJarInput.click());

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Node)) return;
    uploadPickers.forEach((picker) => {
      if (!picker.mainButton.contains(target) && !picker.menu.contains(target)) {
        picker.menu.hidden = true;
      }
    });
  });

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFile(file, uploadMainBtn, root, { idleText: "Upload ZIP/Folder" });
    fileInput.value = "";
  });

  folderInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await handleFolder(files, uploadMainBtn, root, { idleText: "Upload ZIP/Folder" });
    folderInput.value = "";
  });

  dupFileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await handleFile(file, dupUploadMainBtn, root, { autoRender: false, clearAfter: false, idleText: "Upload ZIP/Folder" });
    if (res) await renderDuplicateScan(res);
    dupFileInput.value = "";
  });

  dupFolderInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const res = await handleFolder(files, dupUploadMainBtn, root, { autoRender: false, clearAfter: false, idleText: "Upload ZIP/Folder" });
    if (res) await renderDuplicateScan(res);
    dupFolderInput.value = "";
  });

  fabricJarInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await runFabricJarUpdate(file);
    fabricJarInput.value = "";
  });

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

    closeUploadPickers();
    const controls = [
      searchUpdatesBtn,
      oldUploadMainBtn, oldUploadZipBtn, oldUploadFolderBtn,
      newUploadMainBtn, newUploadZipBtn, newUploadFolderBtn
    ];
    controls.forEach((btn) => { btn.disabled = true; });
    const oldSearchLabel = searchUpdatesBtn.textContent;
    searchUpdatesBtn.textContent = "Searching...";

    try {
      const settings = await getSettings();
      const oldScan = await runSelectionScan(compareUploads.old, root, settings, "Preparing old pack");
      if (!oldScan || oldScan.error) throw new Error(oldScan?.error || "Old pack scan failed");

      const newScan = await runSelectionScan(compareUploads.newer, root, settings, "Preparing new pack");
      if (!newScan || newScan.error) throw new Error(newScan?.error || "New pack scan failed");

      const selectedTarget = normalizeLegacyVersion(settings.targetVersion || oldScan.targetVersion || newScan.targetVersion || "");
      const filtered = filterResultsByExistingMods(oldScan, newScan, selectedTarget);
      const oldName = compareUploads.old.label || oldScan.fileName || "Old Pack";
      const newName = compareUploads.newer.label || newScan.fileName || "New Pack";
      filtered.fileName = `${oldName} -> ${newName}`;
      setProgress(root, 100, "Scan complete", `${filtered.count || 0} rows remain after ignoring existing mods`);
      setTimeout(() => clearProgress(root), 800);
      renderOverlay(filtered, await getSettings());
      root.remove();
    } catch (err) {
      clearProgress(root);
      alert("Scan failed: " + (err?.message || String(err)));
    } finally {
      controls.forEach((btn) => { btn.disabled = false; });
      searchUpdatesBtn.textContent = oldSearchLabel;
      updateCompareSearchState();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;

    if (changes?.theme) {
      const nextTheme = normalizeTheme(changes.theme.newValue);
      setThemeClass(root, nextTheme);
      const overlay = document.getElementById("muc-overlay");
      if (overlay) setThemeClass(overlay, nextTheme);
    }

    if (changes?.targetVersion || changes?.minecraftVersionDatabase) {
      getSettings().then((settings) => {
        const versions = settings.minecraftVersionDatabase || DEFAULTS.minecraftVersionDatabase;
        populateTargetVersionOptions(versions, settings.targetVersion || "");
      });
    }

    if (changes?.scanMode || changes?.searchMode || changes?.checkDuplicateMods || changes?.ignoreCurrentVersionMods || changes?.onlyUpdatesCurrentSelected) {
      const nextSettings = {
        scanMode: changes?.scanMode ? changes.scanMode.newValue : scanModeSetting,
        searchMode: changes?.searchMode ? changes.searchMode.newValue : resolveSearchModeFromSettings({
          checkDuplicateMods: duplicateMode,
          ignoreCurrentVersionMods: ignoreCurrentVersionSetting,
          onlyUpdatesCurrentSelected: onlyUpdatesCurrentSetting
        }),
        checkDuplicateMods: changes?.checkDuplicateMods ? changes.checkDuplicateMods.newValue : duplicateMode,
        ignoreCurrentVersionMods: changes?.ignoreCurrentVersionMods ? changes.ignoreCurrentVersionMods.newValue : ignoreCurrentVersionSetting,
        onlyUpdatesCurrentSelected: changes?.onlyUpdatesCurrentSelected ? changes.onlyUpdatesCurrentSelected.newValue : onlyUpdatesCurrentSetting
      };
      if (changes?.searchMode) {
        const flags = searchFlagsFromMode(changes.searchMode.newValue);
        nextSettings.checkDuplicateMods = flags.checkDuplicateMods;
        nextSettings.ignoreCurrentVersionMods = flags.ignoreCurrentVersionMods;
        nextSettings.onlyUpdatesCurrentSelected = flags.onlyUpdatesCurrentSelected;
      }
      syncModeFlagsFromSettings(nextSettings);
      updateUploadModeLayout();
    }

    if (changes?.additionalSourceUrls || changes?.preferAdditionalSources) {
      getSettings().then((settings) => {
        updateSourceSummary(settings);
      });
    }
  });
})();


