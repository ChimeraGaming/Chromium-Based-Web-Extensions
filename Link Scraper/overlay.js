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
    links: [],
    editMode: false,
    descMode: false
  };

  var root = document.createElement("div");
  root.id = "cg-link-scraper-root";
  root.style.position = "fixed";
  root.style.bottom = "16px";
  root.style.right = "16px";
  root.style.width = "420px";
  root.style.maxWidth = "95vw";
  root.style.height = "360px";
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
    }

    .cg-top-btn {
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

    .cg-top-btn.active {
      background: radial-gradient(circle at 30 percent 0, #0f172a, #1d4ed8);
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

    #cg-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #cg-scrapeBtn {
      font-size: 12px;
      padding: 5px 12px;
      border-radius: 999px;
      border: 1px solid #4b5563;
      background: radial-gradient(circle at top, #111827, #020617);
      color: #e5e7eb;
      cursor: pointer;
    }

    #cg-mainView {
      flex: 1;
      background: #020617;
      border-radius: 18px;
      border: 1px solid #111827;
      padding: 6px;
      overflow-y: auto;
    }

    #cg-linksBox {
      width: 100 percent;
      height: 100 percent;
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
      font-family: ui-monospace, monospace;
    }

    #cg-listView {
      width: 100 percent;
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
      grid-column: 2 span 2;
      margin-top: 2px;
    }

    .cg-row-desc textarea {
      width: 100 percent;
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

    #cg-resizeHandle {
      position: absolute;
      right: 8px;
      bottom: 8px;
      width: 14px;
      height: 14px;
      border-radius: 6px;
      border: 1px solid #4b5563;
      background: radial-gradient(circle at 30 percent 0, #111827, #020617);
      cursor: se-resize;
    }
  </style>

  <div id="cg-panel">
    <div id="cg-headerBar">
      <button id="cg-editBtn" class="cg-top-btn">Edit</button>
      <span id="cg-headerTitle">Link Scraper</span>
      <button id="cg-descBtn" class="cg-top-btn">Descriptions</button>
      <button id="cg-primaryBtn" class="cg-top-btn">Copy all</button>
      <button id="cg-closeTopBtn" class="cg-top-btn">X</button>
    </div>

    <div id="cg-content">
      <div id="cg-toolbar">
        <button id="cg-scrapeBtn">Scrape links</button>
        <div id="cg-status">Ready.</div>
      </div>

      <div id="cg-mainView">
        <textarea id="cg-linksBox" readonly></textarea>
        <div id="cg-listView"></div>
      </div>

      <div class="cg-footer-hint">
        Edit mode adds numbered rows so you can delete links.
        Descriptions mode lets you attach notes.
        Copy only appears when both modes are off.
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
  var linksBox = root.querySelector("#cg-linksBox");
  var listView = root.querySelector("#cg-listView");
  var closeTopBtn = root.querySelector("#cg-closeTopBtn");
  var resizeHandle = root.querySelector("#cg-resizeHandle");

  closeTopBtn.addEventListener("click", function () {
    root.style.display = "none";
  });

  var drag = { active: false, offsetX: 0, offsetY: 0 };

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

      if (newW < 260) newW = 260;
      if (newH < 220) newH = 220;

      root.style.width = newW + "px";
      root.style.height = newH + "px";
    }
  });

  var resize = { active: false };

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

  scrapeBtn.addEventListener("click", function () {
    statusEl.textContent = "Scraping links from page...";
    var linkObjs = collectLinksOnPage();
    state.links = linkObjs.map(function (obj) {
      return {
        url: obj.url,
        desc: obj.label || ""
      };
    });

    if (state.links.length === 0) {
      statusEl.textContent = "No links found.";
    } else {
      statusEl.textContent =
        "Found " + state.links.length + " unique links.";
    }
    render();
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
      var text = linksBox.value.trim();
      if (!text) return;
      navigator.clipboard.writeText(text);
      statusEl.textContent = "Copied.";
    } else {
      statusEl.textContent = "Saved.";
      syncFromListView();
      buildTextarea();
    }
  });

  function render() {
    editBtn.classList.toggle("active", state.editMode);
    descBtn.classList.toggle("active", state.descMode);

    if (!state.editMode && !state.descMode) {
      linksBox.style.display = "block";
      listView.style.display = "none";
      primaryBtn.textContent = "Copy all";
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
      return d ? item.url + " - " + d : item.url;
    });
    linksBox.value = lines.join("\\n");
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
      urlEl.textContent = item.url;

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
      if (!href.startsWith("http")) return;
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

  render();
})();