const DEFAULT_OPTIONS = {
  includeBeta: false,
  includeAlpha: false,
  preferredSource: "modrinth",
  targetVersion: "",
  reverseCompatible: true,
  curseforgeApiKey: "",
  modrinthApiKey: "",
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

async function getLocalStorage(keys) { return await chrome.storage.local.get(keys); }
async function setLocalStorage(payload) { return await chrome.storage.local.set(payload); }

function normalizeArrayBuffer(input) {
  if (input instanceof ArrayBuffer) return input;
  if (Array.isArray(input)) return new Uint8Array(input).buffer;
  if (input && Array.isArray(input.data)) return new Uint8Array(input.data).buffer;
  throw new Error("ZIP payload was not received as binary data");
}

function textFromBytes(bytes) { return new TextDecoder().decode(bytes); }
function safeJsonParse(text) { try { return JSON.parse(text); } catch { return null; } }

function normalizeNameForSearch(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[_+]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-\.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function compareLooseVersions(a, b) {
  const tokenize = (v) => String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9\.]+/g, ".")
    .split(".")
    .filter(Boolean)
    .map((part) => /^\d+$/.test(part) ? Number(part) : part);

  const aa = tokenize(a), bb = tokenize(b), len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i++) {
    const av = aa[i], bv = bb[i];
    if (av === undefined && bv === undefined) return 0;
    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    if (typeof av === "number" && typeof bv === "number") {
      if (av > bv) return 1;
      if (av < bv) return -1;
      continue;
    }
    const as = String(av), bs = String(bv);
    if (as > bs) return 1;
    if (as < bs) return -1;
  }
  return 0;
}

function classifyOverridePath(path) {
  const lower = String(path || "").toLowerCase();
  if (lower.includes("/config/") || lower.startsWith("overrides/config/")) return "config";
  if (lower.includes("/kubejs/") || lower.startsWith("overrides/kubejs/")) return "kubejs";
  if (lower.includes("/resourcepacks/")) return "resource-pack";
  if (lower.includes("/shaderpacks/")) return "shader-pack";
  if (lower.includes("/datapacks/")) return "datapack";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".toml")) return "toml";
  if (lower.endsWith(".js")) return "script";
  if (lower.endsWith(".zs")) return "crafttweaker";
  return "file";
}

function extractMinecraftVersionFromFilename(fileName) {
  const raw = String(fileName || "").replace(/\.jar$/i, "");
  const directPatterns = [
    /(?:^|[\W_])mc\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i,
    /(?:^|[\W_])minecraft\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i,
    /(?:^|[\W_])(fabric|forge|quilt|neoforge|neo-?forge)[-_ ]*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i,
    /([0-9]+\.[0-9]+(?:\.[0-9]+)?)[-_ ]*(fabric|forge|quilt|neoforge|neo-?forge)/i
  ];

  for (const pattern of directPatterns) {
    const match = raw.match(pattern);
    if (!match) continue;
    const version = match[2] || match[1];
    if (version) return version;
  }

  return "Unknown";
}

function buildFilenameQuery(fileName) {
  return normalizeNameForSearch(
    String(fileName || "")
      .replace(/\.jar$/i, "")
      .replace(/(?:^|[-_+])mc\d+(?:\.\d+){1,2}/ig, "")
      .replace(/(?:^|[-_+])minecraft\d+(?:\.\d+){1,2}/ig, "")
      .replace(/(?:^|[-_+])(fabric|forge|quilt|neoforge|neo-forge)(?:[-_+]?\d+(?:\.\d+){1,2})?/ig, "")
      .replace(/(?:^|[-_+])v?\d+(?:\.\d+){1,}(?:[-_+][a-z0-9]+)*/ig, "")
      .replace(/[()\[\]]/g, " ")
  );
}

function parseJarName(fileName) {
  const base = String(fileName || "").split("/").pop() || "";
  const mcVersion = extractMinecraftVersionFromFilename(base);
  const query = buildFilenameQuery(base) || normalizeNameForSearch(base.replace(/\.jar$/i, ""));
  return {
    slugGuess: query,
    installedVersion: mcVersion,
    query,
    fileName: base
  };
}function parseHumanName(name) {
  const cleaned = String(name || "").trim();
  const slugGuess = normalizeNameForSearch(cleaned);
  return { slugGuess, installedVersion: "Listed in pack", query: slugGuess || cleaned };
}

function extractAnchorsFromHtml(html) {
  const items = [];
  const regex = /<a\b[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gim;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1] || "";
    const inner = match[2] || "";
    const text = inner.replace(/<[^>]+>/g, "").trim();
    if (text) items.push({ text, href });
  }
  return items;
}

function detectLoader(manifest, modrinthIndex, jarNames) {
  const fromManifest = manifest?.minecraft?.modLoaders?.[0]?.id || "";
  if (fromManifest) {
    if (fromManifest.includes("fabric")) return "fabric";
    if (fromManifest.includes("quilt")) return "quilt";
    if (fromManifest.includes("neoforge")) return "neoforge";
    if (fromManifest.includes("forge")) return "forge";
  }

  const idxDeps = modrinthIndex?.dependencies || {};
  if (idxDeps.fabric_loader) return "fabric";
  if (idxDeps.quilt_loader) return "quilt";
  if (idxDeps.neoforge) return "neoforge";
  if (idxDeps.forge) return "forge";

  const joined = jarNames.join(" ").toLowerCase();
  if (joined.includes("fabric")) return "fabric";
  if (joined.includes("quilt")) return "quilt";
  if (joined.includes("neoforge") || joined.includes("neo-forge")) return "neoforge";
  if (joined.includes("forge")) return "forge";

  return "Unknown";
}

function detectGameVersion(manifest, modrinthIndex, jarNames) {
  if (manifest?.minecraft?.version) return manifest.minecraft.version;
  if (modrinthIndex?.dependencies?.minecraft) return modrinthIndex.dependencies.minecraft;

  for (const name of jarNames) {
    const match = name.match(/mc(\d+\.\d+(?:\.\d+)?)/i) || name.match(/(?:^|[-_])(\d+\.\d+(?:\.\d+)?)(?:[-_]|$)/);
    if (match) return match[1];
  }
  return "Unknown";
}

function buildVersionSearchPath(versionDatabase, targetVersion, detectedVersion, reverseCompatible) {
  const db = Array.isArray(versionDatabase) && versionDatabase.length ? versionDatabase : DEFAULT_OPTIONS.minecraftVersionDatabase;
  const baseVersion = targetVersion || detectedVersion || "";
  if (!baseVersion) return [];
  if (!db.includes(baseVersion)) return [baseVersion];
  const start = db.indexOf(baseVersion);
  if (!reverseCompatible) return [baseVersion];
  return db.slice(start);
}

async function readZipEntries(arrayBuffer) {
  const buffer = normalizeArrayBuffer(arrayBuffer);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  function readU16(offset) { return view.getUint16(offset, true); }
  function readU32(offset) { return view.getUint32(offset, true); }

  function findEndOfCentralDirectory() {
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (bytes[i]===0x50 && bytes[i+1]===0x4b && bytes[i+2]===0x05 && bytes[i+3]===0x06) return i;
    }
    throw new Error("Could not find ZIP central directory");
  }

  async function inflateRaw(data) {
    if (typeof DecompressionStream === "undefined") throw new Error("This browser does not support DecompressionStream");
    const ds = new DecompressionStream("deflate-raw");
    const stream = new Blob([data]).stream().pipeThrough(ds);
    const result = await new Response(stream).arrayBuffer();
    return new Uint8Array(result);
  }

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

    entries.push({ fileName, compressionMethod, data: fileData });
    ptr += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

async function cachedFetchJson(url, cacheKey, headers = {}) {
  const key = `cache_${cacheKey}`;
  const now = Date.now();
  const all = await getLocalStorage([key]);
  const cached = all[key];
  if (cached && now - cached.ts < 1000 * 60 * 60 * 12) return cached.data;

  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  const data = await response.json();
  await setLocalStorage({ [key]: { ts: now, data } });
  return data;
}

function normalizeApiKey(raw) {
  return String(raw || "").trim();
}

function resolveApiKey(scanOptions, fieldName) {
  return normalizeApiKey(scanOptions?.[fieldName]);
}

function modrinthHeaders(apiKey) {
  const headers = { "Accept": "application/json" };
  if (apiKey) headers.Authorization = apiKey;
  return headers;
}

async function modrinthSearch(query, apiKey) {
  return (await cachedFetchJson(
    `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=5`,
    `search_${query}`,
    modrinthHeaders(apiKey)
  )).hits || [];
}

async function modrinthVersions(projectId, loader, gameVersion, apiKey) {
  const params = [];
  if (loader && loader !== "Unknown") params.push(`loaders=${encodeURIComponent(JSON.stringify([loader]))}`);
  if (gameVersion && gameVersion !== "Unknown") params.push(`game_versions=${encodeURIComponent(JSON.stringify([gameVersion]))}`);
  const qs = params.length ? `?${params.join("&")}` : "";
  return await cachedFetchJson(
    `https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version${qs}`,
    `versions_${projectId}_${loader || "any"}_${gameVersion || "any"}`,
    modrinthHeaders(apiKey)
  );
}


async function curseforgeFetch(path, apiKey) {
  if (!apiKey) return null;
  try {
    const response = await cachedFetchJson(
      `https://api.curseforge.com${path}`,
      `cf_${path.replace(/[^a-z0-9]+/gi, "_")}`,
      { "x-api-key": apiKey, "Accept": "application/json" }
    );
    return response?.data || null;
  } catch {
    return null;
  }
}

async function curseforgeGetMod(projectId, apiKey) {
  if (!projectId) return null;
  return await curseforgeFetch(`/v1/mods/${encodeURIComponent(projectId)}`, apiKey);
}

async function curseforgeGetFile(projectId, fileId, apiKey) {
  if (!projectId || !fileId) return null;
  return await curseforgeFetch(`/v1/mods/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}`, apiKey);
}

function extractMinecraftVersionFromCurseForgeFile(fileData) {
  const versions = Array.isArray(fileData?.gameVersions) ? fileData.gameVersions : [];
  const direct = versions.find((value) => /^\d+\.\d+(?:\.\d+)?$/.test(String(value || "").trim()));
  if (direct) return direct;
  return extractMinecraftVersionFromFilename(fileData?.fileName || "");
}

function pickChannels(versions) {
  const sorted = [...versions].sort((a, b) => new Date(b.date_published) - new Date(a.date_published));
  const channels = { release: null, beta: null, alpha: null };
  for (const version of sorted) {
    const type = version.version_type;
    if (type in channels && !channels[type]) channels[type] = version;
  }
  return channels;
}

function betterMatch(hits, local) {
  if (!hits.length) return null;
  const slug = (local.slugGuess || "").toLowerCase();
  const query = (local.query || "").toLowerCase();
  const queryTokens = query.split("-").filter(Boolean);

  const scored = hits.map((hit) => {
    const title = (hit.title || "").toLowerCase();
    const hitSlug = (hit.slug || "").toLowerCase();
    const titleNorm = normalizeNameForSearch(title);
    const slugNorm = normalizeNameForSearch(hitSlug);
    let score = 0;

    if (slugNorm === slug) score += 140;
    if (titleNorm === slug) score += 130;
    if (slugNorm === query) score += 120;
    if (titleNorm === query) score += 110;
    if (slug && slugNorm.startsWith(slug)) score += 40;
    if (slug && titleNorm.startsWith(slug)) score += 35;

    const tokenHits = queryTokens.filter((t) => slugNorm.includes(t) || titleNorm.includes(t)).length;
    score += tokenHits * 8;

    if ((slug && slugNorm.includes(slug)) || (slug && titleNorm.includes(slug))) score += 15;
    if ((query && slugNorm.includes(query)) || (query && titleNorm.includes(query))) score += 10;

    return { hit, score, tokenHits };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) return null;
  const minTokens = Math.max(1, Math.min(2, queryTokens.length));
  if (best.score < 60 && best.tokenHits < minTokens) return null;
  return best.hit;
}function chooseRecommended(channels, options) {
  if (options.includeAlpha && channels.alpha) return { data: channels.alpha, type: "alpha" };
  if (options.includeBeta && channels.beta) return { data: channels.beta, type: "beta" };
  if (channels.release) return { data: channels.release, type: "release" };
  if (options.includeBeta && channels.beta) return { data: channels.beta, type: "beta" };
  if (options.includeAlpha && channels.alpha) return { data: channels.alpha, type: "alpha" };
  return { data: null, type: null };
}

function decideStatus(installedVersion, recommendedVersion, sourceType, matchFound) {
  if (sourceType === "override-file") return "override-file";
  if (!matchFound) return "not-found";
  if (
    installedVersion === "Listed in pack" ||
    installedVersion === "Unknown" ||
    installedVersion === "ADD CURSEFORGE API" ||
    !recommendedVersion
  ) {
    return sourceType === "modlist.html" ? "converted" : "matched";
  }
  const cmp = compareLooseVersions(recommendedVersion, installedVersion);
  if (cmp > 0) return "update-available";
  return "up-to-date";
}

async function enrichLookup(baseRow, parsed, detectedLoader, searchPath, options) {
  const modrinthApiKey = resolveApiKey(options, "modrinthApiKey");
  const queryList = [...new Set([parsed.query, normalizeNameForSearch((parsed.fileName || "").replace(/\.jar$/i, ""))].filter(Boolean))];
  let chosen = null;
  for (const q of queryList) {
    const hits = await modrinthSearch(q, modrinthApiKey);
    chosen = betterMatch(hits, { ...parsed, query: q });
    if (chosen) {
      parsed.query = q;
      break;
    }
  }

  let latestRelease = null;
  let latestBeta = null;
  let latestAlpha = null;
  let recommended = null;
  let recommendedType = null;
  let searchedVersion = null;

  if (chosen?.project_id) {
    const toCheck = searchPath.length ? searchPath : ["Unknown"];
    for (const version of toCheck) {
      try {
        const versions = await modrinthVersions(chosen.project_id, detectedLoader, version, modrinthApiKey);
        const channels = pickChannels(versions);
        const rec = chooseRecommended(channels, options);
        if (channels.release || channels.beta || channels.alpha) {
          latestRelease = channels.release;
          latestBeta = channels.beta;
          latestAlpha = channels.alpha;
          recommended = rec.data;
          recommendedType = rec.type;
          searchedVersion = version;
          break;
        }
      } catch {}
    }
  }

  const status = decideStatus(parsed.installedVersion, recommended?.version_number || recommended?.name, baseRow.sourceType, !!chosen);
  return {
    ...baseRow,
    provider: "modrinth",
    slugGuess: parsed.slugGuess,
    installedVersion: parsed.installedVersion,
    query: parsed.query,
    matchFound: !!chosen,
    match: chosen?.title || null,
    slug: chosen?.slug || null,
    url: chosen?.slug ? `https://modrinth.com/mod/${chosen.slug}` : null,
    latestRelease,
    latestBeta,
    latestAlpha,
    recommended,
    recommendedType,
    searchedVersion,
    status
  };
}


async function scanEntries(entries, fileName, options = {}, progress = () => {}) {
  const scanOptions = { ...DEFAULT_OPTIONS, ...(options || {}) };

  const manifestEntry = entries.find((entry) => entry.fileName.toLowerCase() === "manifest.json" && entry.data);
  const modrinthIndexEntry = entries.find((entry) => entry.fileName.toLowerCase() === "modrinth.index.json" && entry.data);
  const modlistEntry = entries.find((entry) => entry.fileName.toLowerCase() === "modlist.html" && entry.data);

  const manifest = manifestEntry ? safeJsonParse(textFromBytes(manifestEntry.data)) : null;
  const modrinthIndex = modrinthIndexEntry ? safeJsonParse(textFromBytes(modrinthIndexEntry.data)) : null;
  const modlistHtml = modlistEntry ? textFromBytes(modlistEntry.data) : null;
  const modlistItems = modlistHtml ? extractAnchorsFromHtml(modlistHtml) : [];
  const manifestFiles = Array.isArray(manifest?.files) ? manifest.files : [];

  const jarEntries = entries.filter((entry) => entry.fileName.toLowerCase().endsWith(".jar"));
  const jarNames = jarEntries.map((entry) => entry.fileName.split("/").pop());

  const detectedLoader = detectLoader(manifest, modrinthIndex, jarNames);
  const detectedGameVersion = detectGameVersion(manifest, modrinthIndex, jarNames);
  const versionSearchPath = buildVersionSearchPath(scanOptions.minecraftVersionDatabase, scanOptions.targetVersion, detectedGameVersion, scanOptions.reverseCompatible !== false);

  const results = [];
  const seenKeys = new Set();

  const totalWork = Math.max(1, jarEntries.length + modlistItems.length + manifestFiles.length + 4);
  let workDone = 0;
  const bump = (label, subtext = "") => {
    workDone += 1;
    const percent = 12 + Math.min(80, (workDone / totalWork) * 80);
    progress(percent, label, subtext);
  };

  bump("Parsed pack metadata", `Loader: ${detectedLoader} | Source MC: ${detectedGameVersion} | Target: ${scanOptions.targetVersion || detectedGameVersion || "Auto"}`);

  for (let i = 0; i < jarEntries.length; i++) {
    const entry = jarEntries[i];
    const mod = entry.fileName.split("/").pop();
    const parsed = parseJarName(mod);
    results.push(await enrichLookup({
      sourceType: "jar",
      path: entry.fileName,
      displayName: mod,
      mod,
      classification: "jar-mod"
    }, parsed, detectedLoader, versionSearchPath, scanOptions));
    seenKeys.add(`jar:${mod.toLowerCase()}`);
    bump("Scanning JAR mods", `${i + 1}/${jarEntries.length} processed`);
  }

  if (manifestFiles.length) {
    const apiKey = resolveApiKey(scanOptions, "curseforgeApiKey");
    for (let i = 0; i < manifestFiles.length; i++) {
      const fileRef = manifestFiles[i] || {};
      const displayItem = modlistItems[i] || null;
      const cfMod = apiKey ? await curseforgeGetMod(fileRef.projectID, apiKey) : null;
      const cfFile = apiKey ? await curseforgeGetFile(fileRef.projectID, fileRef.fileID, apiKey) : null;

      const displayName = String(cfMod?.name || displayItem?.text || `Project ${fileRef.projectID || i + 1}`).trim();
      const listedUrl = displayItem?.href || cfMod?.links?.websiteUrl || null;
      const installedVersion = apiKey
        ? (extractMinecraftVersionFromCurseForgeFile(cfFile) || "Unknown")
        : "ADD CURSEFORGE API";
      const parsed = parseHumanName(displayName);

      results.push(await enrichLookup({
        sourceType: "modlist.html",
        path: "modlist.html",
        displayName,
        mod: displayName,
        listedUrl,
        classification: "html-listed-mod",
        curseforgeProjectId: fileRef.projectID || null,
        curseforgeFileId: fileRef.fileID || null,
        installedVersionSource: apiKey && cfFile ? "curseforge-manifest" : apiKey ? "modlist-fallback" : "curseforge-api-missing"
      }, { ...parsed, installedVersion }, detectedLoader, versionSearchPath, scanOptions));

      seenKeys.add(`modlist:${displayName.toLowerCase()}`);
      if (displayItem?.text) seenKeys.add(`modlist:${displayItem.text.toLowerCase()}`);
      if (fileRef.projectID) seenKeys.add(`cf:${fileRef.projectID}`);
      bump("Scanning CurseForge manifest", `${i + 1}/${manifestFiles.length} processed`);
    }
  } else {
    for (let i = 0; i < modlistItems.length; i++) {
      const item = modlistItems[i];
      const key = `modlist:${item.text.toLowerCase()}`;
      if (!seenKeys.has(key)) {
        const parsed = parseHumanName(item.text);
        results.push(await enrichLookup({
          sourceType: "modlist.html",
          path: "modlist.html",
          displayName: item.text,
          mod: item.text,
          listedUrl: item.href || null,
          classification: "html-listed-mod",
          installedVersionSource: "modlist-fallback"
        }, parsed, detectedLoader, versionSearchPath, scanOptions));
        seenKeys.add(key);
      }
      bump("Scanning modlist.html", `${i + 1}/${modlistItems.length} processed`);
    }
  }

  const overrideEntries = entries.filter((entry) => entry.fileName.toLowerCase().startsWith("overrides/"));
  for (const entry of overrideEntries) {
    const lower = entry.fileName.toLowerCase();
    if (lower.endsWith("/") || lower.endsWith(".jar")) continue;
    const rel = entry.fileName.replace(/^overrides\//i, "");
    const displayName = rel.split("/").pop();
    const ext = displayName.includes(".") ? displayName.split(".").pop().toLowerCase() : "";
    results.push({
      sourceType: "override-file",
      path: entry.fileName,
      displayName,
      mod: displayName,
      slugGuess: "",
      installedVersion: ext ? `File: .${ext}` : "File",
      query: "",
      matchFound: false,
      match: null,
      slug: null,
      url: null,
      latestRelease: null,
      latestBeta: null,
      latestAlpha: null,
      recommended: null,
      recommendedType: null,
      searchedVersion: null,
      status: "override-file",
      overrideCategory: classifyOverridePath(entry.fileName),
      classification: "override"
    });
  }

  bump("Classifying overrides", `${overrideEntries.length} override paths scanned`);
  const curseforgeApiKey = resolveApiKey(scanOptions, "curseforgeApiKey");
  const modrinthApiKey = resolveApiKey(scanOptions, "modrinthApiKey");
  bump(
    "Checking API settings",
    `CurseForge: ${curseforgeApiKey ? "present" : "ADD CURSEFORGE API"} | Modrinth: ${modrinthApiKey ? "present" : "blank"}`
  );
  progress(96, "Finalizing results", `${results.length} total rows`);

  return {
    fileName: fileName || null,
    count: results.length,
    manifestType: manifest ? "curseforge-manifest" : modrinthIndex ? "modrinth-index" : modlistHtml ? "curseforge-modlist" : "jar-scan",
    manifestSummary: manifest?.files?.length || modrinthIndex?.files?.length || 0,
    modlistCount: modlistItems.length,
    detectedLoader,
    detectedGameVersion,
    targetVersion: scanOptions.targetVersion || detectedGameVersion || "",
    versionSearchPath,
    parsedCurseForgeIds: manifest?.files?.length || 0,
    results
  };
}

async function scanZip(bytes, fileName, options = {}, progress = () => {}) {
  const scanOptions = { ...DEFAULT_OPTIONS, ...(options || {}) };
  progress(5, "Reading ZIP", fileName || "Preparing archive");
  const entries = await readZipEntries(bytes);
  return scanEntries(entries, fileName, scanOptions, progress);
}

async function scanFolder(folderEntries, fileName, options = {}, progress = () => {}) {
  const scanOptions = { ...DEFAULT_OPTIONS, ...(options || {}) };
  progress(5, "Reading folder", fileName || "Preparing folder");
  const encoder = new TextEncoder();
  const entries = (folderEntries || []).map((entry) => {
    const hasBytes = Array.isArray(entry?.bytes) && entry.bytes.length > 0;
    const hasText = typeof entry?.text === "string" && entry.text.length > 0;
    const data = hasBytes ? new Uint8Array(entry.bytes) : hasText ? encoder.encode(entry.text) : null;
    return {
      fileName: String(entry.fileName || entry.path || "").replace(/^\/+/, ""),
      compressionMethod: 0,
      data
    };
  });
  return scanEntries(entries, fileName, scanOptions, progress);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "OPEN_ROADMAP_PAGE") {
    chrome.tabs.create({ url: chrome.runtime.getURL("roadmap.html") }, () => {
      sendResponse({ ok: !chrome.runtime.lastError });
    });
    return true;
  }

  if (msg?.type === "OPEN_SETTINGS_PAGE") {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") }, () => {
      sendResponse({ ok: !chrome.runtime.lastError });
    });
    return true;
  }

  return false;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "scan-progress") return;
  port.onMessage.addListener(async (msg) => {
    if (msg?.type !== "SCAN_WITH_PROGRESS" && msg?.type !== "SCAN_FOLDER_WITH_PROGRESS") return;
    const sendProgress = (percent, label, subtext = "") => {
      try { port.postMessage({ type: "progress", percent, label, subtext }); } catch {}
    };
    try {
      sendProgress(1, "Starting scan", msg.fileName || "");
      const result = msg?.type === "SCAN_FOLDER_WITH_PROGRESS"
        ? await scanFolder(msg.entries, msg.fileName, msg.options, sendProgress)
        : await scanZip(msg.bytes, msg.fileName, msg.options, sendProgress);
      sendProgress(100, "Done", `${result.count || 0} rows ready`);
      port.postMessage({ type: "result", payload: result });
    } catch (error) {
      port.postMessage({ type: "error", error: error?.message || String(error) });
    }
  });
});
