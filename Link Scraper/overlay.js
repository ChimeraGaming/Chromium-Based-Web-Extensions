(function () {
  if (window.__cgLinkScraperLoaded) {
    var existing = document.getElementById("cg-link-scraper-root");
    if (existing) {
      existing.style.display =
        existing.style.display === "none" ? "block" : "none";
    }
    return;
  }
  window.__cgLinkScraperLoaded = true;

  var state = {
    activeTab: "all",
    allLinks: [],
    links: [],
    editMode: false,
    descMode: false,
    isScraping: false
  };

  var root = document.createElement("div");
  root.id = "cg-link-scraper-root";
  root.style.position = "fixed";
  root.style.bottom = "16px";
  root.style.right = "16px";
  root.style.width = "540px";
  root.style.maxWidth = "95vw";
  root.style.height = "420px";
  root.style.maxHeight = "80vh";
  root.style.zIndex = "999999";
  root.style.borderRadius = "26px";
  root.style.overflow = "hidden";
  root.style.boxShadow = "0 18px 45px rgba(0,0,0,0.75)";
  root.style.fontFamily =
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  root.style.color = "#e5e7eb";
  root.style.background =
    "radial-gradient(circle at top left, #020617, #000000)";

  root.innerHTML = `
  <style>
    #cg-link-scraper-root * {
      box-sizing: border-box;
    }

    #cg-panel {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      border-radius: 26px;
      border: 1px solid #111827;
      background: radial-gradient(circle at top left, #020617, #000000);
      overflow: hidden;
    }

    #cg-headerBar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      background: linear-gradient(to right, #020617, #030712);
      border-bottom: 1px solid #111827;
      cursor: move;
      user-select: none;
    }

    #cg-headerTitle {
      flex: 1;
      text-align: center;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9ca3af;
      white-space: nowrap;
    }

    .cg-top-btn,
    .cg-tab-btn {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid #374151;
      background: #020617;
      color: #e5e7eb;
      cursor: pointer;
      min-width: 70px;
      text-align: center;
    }

    .cg-top-btn.active,
    .cg-tab-btn.active {
      background: radial-gradient(circle at 30% 0, #0f172a, #1d4ed8);
      border-color: #3b82f6;
      color: #f9fafb;
      box-shadow: 0 0 0 1px rgba(59,130,246,0.5);
    }

    #cg-closeTopBtn {
      min-width: auto;
      padding: 4px 10px;
      border-color: #7f1d1d;
      background: #991b1b;
      color: #fee2e2;
    }

    #cg-closeTopBtn:hover {
      background: #b91c1c;
    }

    #cg-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 8px;
      gap: 6px;
      min-height: 0;
    }

    #cg-tabBar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 2px 0 4px;
    }

    #cg-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #cg-scrapeBtn {
      font-size: 12px;
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid #4b5563;
      background: radial-gradient(circle at top, #111827, #020617);
      color: #e5e7eb;
      cursor: pointer;
      white-space: nowrap;
    }

    #cg-scrapeBtn:disabled {
      opacity: 0.55;
      cursor: wait;
    }

    #cg-status {
      font-size: 11px;
      color: #cbd5e1;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 4px 0;
    }

    #cg-progressPanel {
      display: none;
      flex-direction: column;
      gap: 6px;
      padding: 8px 10px;
      border: 1px solid rgba(59,130,246,0.35);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.96));
      box-shadow: inset 0 0 0 1px rgba(15,23,42,0.9);
    }

    .cg-progressRow {
      display: grid;
      grid-template-columns: 122px minmax(0, 1fr) 44px;
      align-items: center;
      gap: 8px;
      font-size: 10px;
      color: #cbd5e1;
    }

    .cg-progressLabel {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #e5e7eb;
    }

    .cg-progressTrack {
      height: 9px;
      overflow: hidden;
      border-radius: 999px;
      border: 1px solid #1e3a8a;
      background: #020617;
    }

    .cg-progressFill {
      width: 0%;
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #1d4ed8, #38bdf8);
      transition: width 140ms linear;
    }

    .cg-progressPct {
      text-align: right;
      color: #93c5fd;
      font-variant-numeric: tabular-nums;
    }

    #cg-filterBar {
      margin-top: 4px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      padding: 8px;
      border: 1px solid rgba(59,130,246,0.38);
      border-radius: 16px;
      background: rgba(15,23,42,0.72);
    }

    .cg-filterWrap {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .cg-filterLabel {
      font-size: 10px;
      color: #bfdbfe;
      letter-spacing: 0.02em;
    }

    .cg-filterInput {
      width: 100%;
      padding: 8px 11px;
      font-size: 12px;
      border-radius: 12px;
      border: 1px solid #2563eb;
      background: #030712;
      color: #f9fafb;
      outline: none;
      box-shadow: inset 0 0 0 1px rgba(15,23,42,0.95);
    }

    .cg-filterInput::placeholder {
      color: #94a3b8;
      opacity: 1;
    }

    .cg-filterInput:focus {
      border-color: #38bdf8;
      box-shadow:
        0 0 0 1px rgba(56,189,248,0.75),
        0 0 14px rgba(37,99,235,0.32);
    }

    #cg-mainView {
      flex: 1;
      background: #020617;
      border-radius: 18px;
      border: 1px solid #111827;
      padding: 6px;
      overflow-y: auto;
      min-height: 0;
    }

    #cg-linksBox {
      width: 100%;
      height: 100%;
      border-radius: 12px;
      border: 1px solid #111827;
      background: #020617;
      color: #e5e7eb;
      padding: 8px;
      font-size: 11px;
      resize: none;
      outline: none;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-y: auto;
      overflow-x: hidden;
      font-family: ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    #cg-listView {
      width: 100%;
      display: none;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .cg-row {
      display: grid;
      grid-template-columns: auto minmax(0,1fr) auto;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      border-radius: 10px;
      font-size: 11px;
    }

    .cg-row:nth-child(odd) {
      background: rgba(15,23,42,0.85);
    }

    .cg-row:nth-child(even) {
      background: rgba(15,23,42,0.55);
    }

    .cg-row-index {
      width: 28px;
      text-align: right;
      color: #9ca3af;
      font-variant-numeric: tabular-nums;
    }

    .cg-deleteBtn {
      border-radius: 999px;
      border: 1px solid #7f1d1d;
      background: #991b1b;
      color: #fee2e2;
      padding: 2px 8px;
      cursor: pointer;
      font-size: 11px;
    }

    .cg-deleteBtn:hover {
      background: #b91c1c;
    }

    .cg-row-desc {
      grid-column: 2 / span 2;
      margin-top: 2px;
    }

    .cg-row-desc textarea {
      width: 100%;
      font-size: 11px;
      padding: 4px 6px;
      border-radius: 8px;
      border: 1px solid #1f2937;
      background: #020617;
      color: #e5e7eb;
      outline: none;
      resize: none;
      min-height: 36px;
      overflow-y: auto;
      overflow-x: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .cg-row-desc textarea:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 1px rgba(59,130,246,0.4);
    }

    #cg-mainView::-webkit-scrollbar,
    #cg-linksBox::-webkit-scrollbar,
    #cg-listView::-webkit-scrollbar,
    .cg-row-desc textarea::-webkit-scrollbar {
      width: 10px;
    }

    #cg-mainView::-webkit-scrollbar-track,
    #cg-linksBox::-webkit-scrollbar-track,
    #cg-listView::-webkit-scrollbar-track,
    .cg-row-desc textarea::-webkit-scrollbar-track {
      background: #020617;
      border-radius: 6px;
    }

    #cg-mainView::-webkit-scrollbar-thumb,
    #cg-linksBox::-webkit-scrollbar-thumb,
    #cg-listView::-webkit-scrollbar-thumb,
    .cg-row-desc textarea::-webkit-scrollbar-thumb {
      background: #1d4ed8;
      border-radius: 6px;
    }

    #cg-mainView::-webkit-scrollbar-thumb:hover,
    #cg-linksBox::-webkit-scrollbar-thumb:hover,
    #cg-listView::-webkit-scrollbar-thumb:hover,
    .cg-row-desc textarea::-webkit-scrollbar-thumb:hover {
      background: #2563eb;
    }

    #cg-linksBox::-webkit-scrollbar-corner {
      background: #020617;
    }

    #cg-footerHint {
      font-size: 10px;
      color: #6b7280;
      padding-top: 4px;
      border-top: 1px solid #020617;
      margin-top: 3px;
    }

    #cg-resizeHandle {
      position: absolute;
      right: 8px;
      bottom: 8px;
      width: 14px;
      height: 14px;
      border-radius: 6px;
      border: 1px solid #4b5563;
      background: radial-gradient(circle at 30% 0, #111827, #020617);
      cursor: se-resize;
    }
  </style>

  <div id="cg-panel">
    <div id="cg-headerBar">
      <button id="cg-editBtn" class="cg-top-btn">Edit</button>
      <span id="cg-headerTitle">Link Scraper</span>
      <button id="cg-descBtn" class="cg-top-btn">Descriptions</button>
      <button id="cg-primaryBtn" class="cg-top-btn">Save .meta4</button>
      <button id="cg-closeTopBtn" class="cg-top-btn">X</button>
    </div>

    <div id="cg-content">
      <div id="cg-tabBar">
        <button id="cg-allTabBtn" class="cg-tab-btn active">All Links</button>
        <button id="cg-pokeTabBtn" class="cg-tab-btn">PokeHarbor</button>
      </div>

      <div id="cg-toolbar">
        <button id="cg-scrapeBtn">Scrape links</button>
        <div id="cg-status">Ready.</div>
      </div>

      <div id="cg-progressPanel"></div>

      <div id="cg-filterBar">
        <label class="cg-filterWrap">
          <span class="cg-filterLabel">Filter in</span>
          <input id="cg-filterInInput" class="cg-filterInput" type="text" placeholder="Include terms, comma or semicolon separated. Press Enter.">
        </label>
        <label class="cg-filterWrap">
          <span class="cg-filterLabel">Filter out</span>
          <input id="cg-filterOutInput" class="cg-filterInput" type="text" placeholder="Exclude terms, comma or semicolon separated. Press Enter.">
        </label>
      </div>

      <div id="cg-mainView">
        <textarea id="cg-linksBox" readonly></textarea>
        <div id="cg-listView"></div>
      </div>

      <div id="cg-footerHint">
        PokeHarbor mode scrapes only ROM hack posts from the main content area and follows pagination.
      </div>
    </div>

    <div id="cg-resizeHandle">⋰</div>
  </div>
  `;

  document.documentElement.appendChild(root);

  var headerBar = root.querySelector("#cg-headerBar");
  var editBtn = root.querySelector("#cg-editBtn");
  var descBtn = root.querySelector("#cg-descBtn");
  var primaryBtn = root.querySelector("#cg-primaryBtn");
  var scrapeBtn = root.querySelector("#cg-scrapeBtn");
  var statusEl = root.querySelector("#cg-status");
  var progressPanel = root.querySelector("#cg-progressPanel");
  var linksBox = root.querySelector("#cg-linksBox");
  var listView = root.querySelector("#cg-listView");
  var closeTopBtn = root.querySelector("#cg-closeTopBtn");
  var resizeHandle = root.querySelector("#cg-resizeHandle");
  var filterInInput = root.querySelector("#cg-filterInInput");
  var filterOutInput = root.querySelector("#cg-filterOutInput");
  var allTabBtn = root.querySelector("#cg-allTabBtn");
  var pokeTabBtn = root.querySelector("#cg-pokeTabBtn");

  closeTopBtn.addEventListener("click", function () {
    root.style.display = "none";
  });

  var drag = { active: false, offsetX: 0, offsetY: 0 };
  var resize = { active: false };

  headerBar.addEventListener("mousedown", function (e) {
    drag.active = true;
    var rect = root.getBoundingClientRect();
    drag.offsetX = e.clientX - rect.left;
    drag.offsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  window.addEventListener("mouseup", function () {
    drag.active = false;
    resize.active = false;
  });

  window.addEventListener("mousemove", function (e) {
    if (drag.active) {
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var left = e.clientX - drag.offsetX;
      var top = e.clientY - drag.offsetY;

      if (left < 4) left = 4;
      if (top < 4) top = 4;
      if (left > vw - root.offsetWidth - 4)
        left = vw - root.offsetWidth - 4;
      if (top > vh - root.offsetHeight - 4)
        top = vh - root.offsetHeight - 4;

      root.style.left = left + "px";
      root.style.top = top + "px";
      root.style.right = "auto";
      root.style.bottom = "auto";
    }

    if (resize.active) {
      var dx = e.clientX - resize.startX;
      var dy = e.clientY - resize.startY;

      var newW = resize.startW + dx;
      var newH = resize.startH + dy;

      if (newW < 300) newW = 300;
      if (newH < 260) newH = 260;

      root.style.width = newW + "px";
      root.style.height = newH + "px";
    }
  });

  resizeHandle.addEventListener("mousedown", function (e) {
    resize.active = true;
    var rect = root.getBoundingClientRect();
    resize.startX = e.clientX;
    resize.startY = e.clientY;
    resize.startW = rect.width;
    resize.startH = rect.height;
    e.stopPropagation();
    e.preventDefault();
  });

  allTabBtn.addEventListener("click", function () {
    setActiveTab("all");
  });

  pokeTabBtn.addEventListener("click", function () {
    setActiveTab("pokeharbor");
  });

  function setActiveTab(tabName) {
    state.activeTab = tabName;
    state.allLinks = [];
    state.links = [];
    linksBox.value = "";
    listView.innerHTML = "";
    renderTabButtons();
    render();

    if (tabName === "pokeharbor") {
      statusEl.textContent = "PokeHarbor mode ready.";
      scrapeBtn.textContent = "Scrape PokeHarbor";
    } else {
      statusEl.textContent = "All Links mode ready.";
      scrapeBtn.textContent = "Scrape links";
    }
  }

  function renderTabButtons() {
    allTabBtn.classList.toggle("active", state.activeTab === "all");
    pokeTabBtn.classList.toggle("active", state.activeTab === "pokeharbor");
  }

  function parseTerms(value) {
    return value
      .split(/[;,]/)
      .map(function (s) { return s.trim().toLowerCase(); })
      .filter(function (s) { return s.length > 0; });
  }

  function setProgressSteps(steps) {
    progressPanel.innerHTML = "";
    if (!steps || !steps.length) {
      progressPanel.style.display = "none";
      return;
    }

    steps.forEach(function (step) {
      var row = document.createElement("div");
      row.className = "cg-progressRow";
      row.dataset.step = step.id;

      var label = document.createElement("div");
      label.className = "cg-progressLabel";
      label.textContent = step.label;

      var track = document.createElement("div");
      track.className = "cg-progressTrack";

      var fill = document.createElement("div");
      fill.className = "cg-progressFill";
      track.appendChild(fill);

      var pct = document.createElement("div");
      pct.className = "cg-progressPct";
      pct.textContent = "0%";

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(pct);
      progressPanel.appendChild(row);
    });

    progressPanel.style.display = "flex";
  }

  function updateProgressStep(id, current, total, labelText) {
    var row = progressPanel.querySelector('[data-step="' + id + '"]');
    if (!row) return;

    var label = row.querySelector(".cg-progressLabel");
    var fill = row.querySelector(".cg-progressFill");
    var pct = row.querySelector(".cg-progressPct");

    if (labelText) label.textContent = labelText;

    var percent = 0;
    if (total && total > 0) {
      percent = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
    }

    fill.style.width = percent + "%";
    pct.textContent = percent + "%";
  }

  function completeProgressStep(id, labelText) {
    updateProgressStep(id, 1, 1, labelText);
  }

  scrapeBtn.addEventListener("click", function () {
    if (state.isScraping) return;

    if (state.activeTab === "pokeharbor") {
      scrapeAllPokeHarborPages();
      return;
    }

    statusEl.textContent = "Scraping links from page...";
    setProgressSteps([
      { id: "allLinks", label: "Collect links" }
    ]);
    updateProgressStep("allLinks", 0, 1);

    var linkObjs = collectLinksOnPage();

    completeProgressStep("allLinks", "Collect links");

    state.allLinks = linkObjs.map(function (obj) {
      return {
        url: obj.url,
        desc: obj.label || ""
      };
    });

    if (!state.allLinks.length) {
      state.links = [];
      buildTextarea();
      render();
      statusEl.textContent = "No links found.";
      return;
    }

    applyFilter();
  });

  editBtn.addEventListener("click", function () {
    state.editMode = !state.editMode;
    render();
  });

  descBtn.addEventListener("click", function () {
    state.descMode = !state.descMode;
    render();
  });

  primaryBtn.addEventListener("click", function () {
    if (!state.editMode && !state.descMode) {
      if (!state.links || !state.links.length) {
        statusEl.textContent = "Nothing to save.";
        return;
      }
      saveAsMeta4();
      statusEl.textContent = "Saved .meta4 with " + state.links.length + " links.";
    } else {
      statusEl.textContent = "Saved edits.";
      syncFromListView();
      buildTextarea();
    }
  });

  function handleFilterKey(e) {
    if (e.key === "Enter") {
      applyFilter();
    }
  }

  filterInInput.addEventListener("keydown", handleFilterKey);
  filterOutInput.addEventListener("keydown", handleFilterKey);

  function applyFilter() {
    if (!state.allLinks.length) {
      statusEl.textContent = "No links to filter. Use Scrape links first.";
      return;
    }

    var includeTerms = parseTerms(filterInInput.value || "");
    var excludeTerms = parseTerms(filterOutInput.value || "");
    var totalBefore = state.allLinks.length;

    var filtered = state.allLinks.filter(function (item) {
      var url = item.url.toLowerCase();
      var desc = (item.desc || "").toLowerCase();
      var haystack = url + " " + desc;

      if (includeTerms.length) {
        var includeMatch = includeTerms.some(function (term) {
          return haystack.indexOf(term) !== -1;
        });
        if (!includeMatch) return false;
      }

      if (excludeTerms.length) {
        var excludeMatch = excludeTerms.some(function (term) {
          return haystack.indexOf(term) !== -1;
        });
        if (excludeMatch) return false;
      }

      return true;
    });

    state.links = filtered;
    render();

    if (!includeTerms.length && !excludeTerms.length) {
      statusEl.textContent =
        "Filter cleared. Showing " + state.links.length + " links.";
    } else {
      statusEl.textContent =
        "Filtered " + totalBefore + " to " + state.links.length + " links.";
    }
  }

  function render() {
    editBtn.classList.toggle("active", state.editMode);
    descBtn.classList.toggle("active", state.descMode);
    renderTabButtons();

    if (!state.editMode && !state.descMode) {
      linksBox.style.display = "block";
      listView.style.display = "none";
      primaryBtn.textContent = "Save .meta4";
      buildTextarea();
    } else {
      linksBox.style.display = "none";
      listView.style.display = "block";
      primaryBtn.textContent = "Save";
      buildListView();
    }
  }

  function buildTextarea() {
    var lines = state.links.map(function (item) {
      var d = (item.desc || "").trim();
      return d ? d + "\n" + item.url : item.url;
    });
    linksBox.value = lines.join("\n\n");
  }

  function buildListView() {
    listView.innerHTML = "";
    state.links.forEach(function (item, index) {
      var row = document.createElement("div");
      row.className = "cg-row";

      var idx = document.createElement("div");
      idx.className = "cg-row-index";
      idx.textContent = (index + 1) + ".";

      var urlEl = document.createElement("div");
      urlEl.style.whiteSpace = "nowrap";
      urlEl.style.overflow = "hidden";
      urlEl.style.textOverflow = "ellipsis";
      urlEl.textContent = item.desc ? item.desc + " | " + item.url : item.url;

      var del = document.createElement("button");
      del.className = "cg-deleteBtn";
      del.textContent = "X";
      del.addEventListener("click", function () {
        state.links.splice(index, 1);
        buildListView();
      });

      row.appendChild(idx);
      row.appendChild(urlEl);
      row.appendChild(del);
      listView.appendChild(row);

      if (state.descMode) {
        var descRow = document.createElement("div");
        descRow.className = "cg-row-desc";

        var ta = document.createElement("textarea");
        ta.placeholder = "Description (optional)";
        ta.value = item.desc || "";
        ta.addEventListener("input", function () {
          item.desc = ta.value;
        });

        descRow.appendChild(ta);
        listView.appendChild(descRow);
      }
    });
  }

  function syncFromListView() {
    state.links = state.links.filter(function (item) {
      return item.url && item.url.trim();
    });
  }

  function collectLinksOnPage() {
    var anchors = document.querySelectorAll("a[href]");
    var seen = new Set();
    var results = [];

    anchors.forEach(function (a) {
      var href = a.href;
      if (!href || typeof href !== "string") return;
      if (!href.startsWith("http://") && !href.startsWith("https://")) return;
      if (seen.has(href)) return;

      seen.add(href);

      var label = (a.textContent || "").trim().replace(/\s+/g, " ");

      results.push({
        url: href,
        label: label
      });
    });

    return results;
  }

  function isPokeHarborSite(url) {
    try {
      var u = new URL(url);
      return u.hostname.replace(/^www\./, "") === "pokeharbor.com";
    } catch (e) {
      return false;
    }
  }

  function isPokeHarborRomHackUrl(url) {
    try {
      var u = new URL(url);
      if (u.hostname.replace(/^www\./, "") !== "pokeharbor.com") return false;

      var path = u.pathname;
      if (!/^\/20\d{2}\/\d{2}\/[a-z0-9][a-z0-9-]*\/?$/i.test(path)) return false;

      var blocked = [
        "/author/",
        "/category/",
        "/tag/",
        "/page/",
        "/feed/",
        "/comments/",
        "/contact",
        "/contacts-us",
        "/privacy-policy",
        "/site-terms",
        "/pokemon-center"
      ];

      return !blocked.some(function (part) {
        return path.indexOf(part) !== -1;
      });
    } catch (e) {
      return false;
    }
  }

  function cleanPokeHarborTitle(text, url) {
    var title = String(text || "")
      .replace(/\s+/g, " ")
      .replace(/\bAdmin\b/gi, "")
      .replace(/\b\d+\s*Min\s*Read\b/gi, "")
      .trim();

    if (!title || title.length < 3) {
      try {
        var slug = new URL(url).pathname.split("/").filter(Boolean).pop();
        title = slug
          .replace(/-/g, " ")
          .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      } catch (e) {
        title = url;
      }
    }

    return title;
  }

  function getPokeHarborMainContainer(doc) {
    return (
      doc.querySelector("main") ||
      doc.querySelector("#primary") ||
      doc.querySelector(".site-main") ||
      doc.querySelector(".content-area") ||
      doc.querySelector(".main-content") ||
      doc.querySelector(".td-ss-main-content") ||
      doc.body
    );
  }

  function scrapePokeHarborCurrentDocument(doc, pageNumber) {
    var main = getPokeHarborMainContainer(doc);
    var results = new Map();

    var cardSelectors = [
      "article",
      ".post",
      ".type-post",
      ".blog-post",
      ".entry",
      ".card",
      ".post-item",
      ".td_module_wrap"
    ];

    var cards = main.querySelectorAll(cardSelectors.join(","));

    function addResultFromLink(a) {
      if (!a || !a.href) return;

      var href = a.href;
      if (!isPokeHarborRomHackUrl(href)) return;

      var title = cleanPokeHarborTitle(a.textContent, href);
      if (/^admin$/i.test(title)) return;

      results.set(href, {
        title: title,
        postUrl: href,
        page: pageNumber || 1
      });
    }

    function scrapeFromCard(card) {
      var titleLink =
        card.querySelector("h1 a[href], h2 a[href], h3 a[href], .entry-title a[href], .post-title a[href], .td-module-title a[href]") ||
        card.querySelector("a[href]");

      addResultFromLink(titleLink);
    }

    if (cards.length) {
      cards.forEach(scrapeFromCard);
    }

    if (!results.size) {
      main.querySelectorAll("a[href]").forEach(addResultFromLink);
    }

    return Array.from(results.values());
  }

  function getPokeHarborBaseCategoryUrl(url) {
    try {
      var u = new URL(url);
      var path = u.pathname;

      path = path.replace(/\/page\/\d+\/?$/, "/");
      if (!path.endsWith("/")) path += "/";

      return u.origin + path;
    } catch (e) {
      return window.location.href;
    }
  }

  function getPokeHarborPageUrl(baseUrl, pageNum) {
    if (pageNum <= 1) return baseUrl;
    return baseUrl.replace(/\/?$/, "/") + "page/" + pageNum + "/";
  }

  function getPokeHarborLastPage(doc) {
    var maxPage = 1;

    doc.querySelectorAll("a[href]").forEach(function (a) {
      try {
        var u = new URL(a.href);
        var match = u.pathname.match(/\/page\/(\d+)\/?$/);

        if (match) {
          var n = parseInt(match[1], 10);
          if (!isNaN(n) && n > maxPage) maxPage = n;
        }

        var textNum = parseInt((a.textContent || "").trim(), 10);
        if (!isNaN(textNum) && textNum > maxPage) maxPage = textNum;
      } catch (e) {}
    });

    return maxPage;
  }

  function unwrapPossibleRedirectUrl(href) {
    try {
      var u = new URL(href, window.location.href);
      var keys = ["url", "u", "target", "redirect", "redirect_to", "to", "link"];
      for (var i = 0; i < keys.length; i++) {
        var raw = u.searchParams.get(keys[i]);
        if (raw && /^https?:\/\//i.test(raw)) return decodeURIComponent(raw);
      }
      return u.href;
    } catch (e) {
      return href;
    }
  }

  function getHostRank(url) {
    try {
      var host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();

      if (host.indexOf("mediafire.com") !== -1) return 1;
      if (host.indexOf("mega.nz") !== -1 || host.indexOf("mega.io") !== -1) return 2;
      if (host.indexOf("drive.google.com") !== -1) return 3;
      if (host.indexOf("dropbox.com") !== -1) return 4;
      if (host.indexOf("pixeldrain.com") !== -1) return 5;
      if (host.indexOf("gofile.io") !== -1) return 6;
      if (host.indexOf("archive.org") !== -1) return 7;
      if (host.indexOf("1fichier.com") !== -1) return 8;

      return 50;
    } catch (e) {
      return 999;
    }
  }

  function isBlockedDownloadHost(url) {
    try {
      var host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();

      var blockedHosts = [
        "pokeharbor.com",
        "facebook.com",
        "twitter.com",
        "x.com",
        "instagram.com",
        "wordpress.org",
        "youtube.com",
        "youtu.be",
        "discord.gg",
        "discord.com",
        "reddit.com"
      ];

      return blockedHosts.some(function (blocked) {
        return host === blocked || host.endsWith("." + blocked);
      });
    } catch (e) {
      return true;
    }
  }

  function isLikelyDownloadAnchor(anchor, url) {
    var text = (anchor.textContent || "").toLowerCase();
    var cls = (anchor.className || "").toString().toLowerCase();
    var href = String(url || "").toLowerCase();

    var haystack = text + " " + cls + " " + href;

    var goodWords = [
      "mediafire",
      "mega",
      "download",
      "mirror",
      "google drive",
      "gdrive",
      "dropbox",
      "pixeldrain",
      "gofile",
      "archive",
      "1fichier"
    ];

    return goodWords.some(function (word) {
      return haystack.indexOf(word) !== -1;
    });
  }

  function extractBestPokeHarborDownload(postDoc, postUrl) {
    var candidates = [];

    postDoc.querySelectorAll("a[href]").forEach(function (a) {
      var href = unwrapPossibleRedirectUrl(a.href);
      if (!href || !/^https?:\/\//i.test(href)) return;
      if (isBlockedDownloadHost(href)) return;
      if (!isLikelyDownloadAnchor(a, href)) return;

      candidates.push({
        url: href,
        text: (a.textContent || "").replace(/\s+/g, " ").trim(),
        rank: getHostRank(href)
      });
    });

    candidates.sort(function (a, b) {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.url.length - b.url.length;
    });

    if (candidates.length) {
      return candidates[0];
    }

    return null;
  }

  async function scrapePokeHarborPostDownload(post) {
    var res = await fetch(post.postUrl, { credentials: "same-origin" });
    if (!res.ok) throw new Error("Failed to fetch post " + post.postUrl);

    var html = await res.text();
    var postDoc = new DOMParser().parseFromString(html, "text/html");
    var best = extractBestPokeHarborDownload(postDoc, post.postUrl);

    if (!best) {
      return {
        title: post.title,
        url: "",
        postUrl: post.postUrl,
        page: post.page,
        missingDownload: true
      };
    }

    return {
      title: post.title,
      url: best.url,
      postUrl: post.postUrl,
      page: post.page,
      host: best.text || best.url
    };
  }

  async function scrapeAllPokeHarborPages() {
    if (!isPokeHarborSite(window.location.href)) {
      statusEl.textContent = "PokeHarbor mode only works on pokeharbor.com.";
      return;
    }

    state.isScraping = true;
    scrapeBtn.disabled = true;

    try {
      setProgressSteps([
        { id: "postLinks", label: "Get ROM posts" },
        { id: "downloadLinks", label: "Get downloads" }
      ]);
      updateProgressStep("postLinks", 0, 1);
      updateProgressStep("downloadLinks", 0, 1);

      var baseUrl = getPokeHarborBaseCategoryUrl(window.location.href);

      statusEl.textContent = "Reading PokeHarbor category page count...";

      var firstRes = await fetch(baseUrl, { credentials: "same-origin" });
      if (!firstRes.ok) throw new Error("Failed to fetch first page " + baseUrl);
      var firstHtml = await firstRes.text();
      var firstDoc = new DOMParser().parseFromString(firstHtml, "text/html");

      var lastPage = getPokeHarborLastPage(firstDoc);
      if (!lastPage || lastPage < 1) lastPage = 1;

      updateProgressStep("postLinks", 0, lastPage, "Get ROM posts");

      var allPosts = new Map();

      for (var page = 1; page <= lastPage; page++) {
        var pageUrl = getPokeHarborPageUrl(baseUrl, page);
        var doc;

        statusEl.textContent =
          "Reading PokeHarbor page " + page + " of " + lastPage + "...";

        if (page === 1) {
          doc = firstDoc;
        } else {
          var res = await fetch(pageUrl, { credentials: "same-origin" });
          if (!res.ok) throw new Error("Failed to fetch " + pageUrl);
          var html = await res.text();
          doc = new DOMParser().parseFromString(html, "text/html");
        }

        var pageResults = scrapePokeHarborCurrentDocument(doc, page);
        pageResults.forEach(function (item) {
          if (!allPosts.has(item.postUrl)) {
            allPosts.set(item.postUrl, item);
          }
        });

        updateProgressStep("postLinks", page, lastPage, "Get ROM posts");

        await delay(50);
      }

      completeProgressStep("postLinks", "Get ROM posts");

      var posts = Array.from(allPosts.values());
      var downloads = [];
      updateProgressStep("downloadLinks", 0, posts.length, "Get downloads");

      for (var i = 0; i < posts.length; i++) {
        var post = posts[i];
        statusEl.textContent =
          "Finding download link " + (i + 1) + " of " + posts.length +
          " | Page " + post.page + " | " + post.title;

        try {
          var item = await scrapePokeHarborPostDownload(post);
          downloads.push(item);
        } catch (e) {
          downloads.push({
            title: post.title,
            url: "",
            postUrl: post.postUrl,
            page: post.page,
            missingDownload: true
          });
        }

        updateProgressStep("downloadLinks", i + 1, posts.length, "Get downloads");

        await delay(75);
      }

      completeProgressStep("downloadLinks", "Get downloads");

      state.allLinks = downloads
        .filter(function (item) { return item.url; })
        .map(function (item) {
          return {
            url: item.url,
            desc: "Page " + item.page + " | " + item.title,
            title: item.title,
            page: item.page,
            postUrl: item.postUrl,
            host: item.host || ""
          };
        });

      state.links = state.allLinks.slice();
      render();

      var missing = downloads.filter(function (item) { return !item.url; }).length;

      statusEl.textContent =
        "PokeHarbor scrape complete. Found " + state.links.length +
        " download links. Missing downloads: " + missing + ".";
    } catch (e) {
      statusEl.textContent = "PokeHarbor scrape failed: " + e.message;
    } finally {
      state.isScraping = false;
      scrapeBtn.disabled = false;
    }
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function saveAsMeta4() {
    function escapeXml(str) {
      return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    }

    var filesXml = state.links.map(function (item, index) {
      var url = item.url || "";
      var filename = (item.desc || "").trim() || "link" + (index + 1);

      if (!filename || filename.indexOf("http") === 0) {
        try {
          var urlObj = new URL(url);
          var parts = urlObj.pathname.split("/").filter(Boolean);
          filename = parts[parts.length - 1] || "link" + (index + 1);
        } catch (e) {
          filename = "link" + (index + 1);
        }
      }

      filename = filename.replace(/[\\/:*?"<>|]/g, "_").trim();

      return (
        '  <file name="' + escapeXml(filename) + '">\n' +
        '    <url>' + escapeXml(url) + '</url>\n' +
        "  </file>"
      );
    }).join("\n");

    var xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<metalink xmlns="urn:ietf:params:xml:ns:metalink">\n' +
      filesXml + "\n" +
      "</metalink>\n";

    var blob = new Blob([xml], { type: "application/metalink4+xml" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "links-" + Date.now() + ".meta4";

    (document.body || document.documentElement).appendChild(a);
    a.click();
    setTimeout(function () {
      a.remove();
      URL.revokeObjectURL(url);
    }, 0);
  }

  render();
})();
