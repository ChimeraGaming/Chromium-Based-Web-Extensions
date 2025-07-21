let scanInterval = null;
const scannedItems = new Map();

function createSidebar() {
  if (document.getElementById('save-sort-sidebar')) return;

  const bar = document.createElement('div');
  bar.id = 'save-sort-sidebar';
  bar.innerHTML = `
    <h2>📂 Save for Later</h2>
    <div id="scan-status">✅ Populated 0 Lost Items</div>
    <div id="progress-bar-container"><div id="progress-bar"></div></div>
    <input type="text" id="sidebar-search" placeholder="Search saved items...">
    <button id="scan-control">Start Scan</button>
    <div id="category-list"></div>
  `;
  document.body.appendChild(bar);

  const scanButton = document.getElementById('scan-control');
  scanButton.dataset.state = "start";

  scanButton.addEventListener('click', () => {
    const state = scanButton.dataset.state;

    if (state === "running") {
      clearInterval(scanInterval);
      scanButton.textContent = "Populate";
      scanButton.dataset.state = "populate";
      const count = scannedItems.size;
      const total = parseInt(document.querySelector('[data-saved-item-quantity]')?.dataset.savedItemQuantity || count);
      document.getElementById('scan-status').textContent = `Scan stopped. ${count} of ${total} items loaded.`;
    } else if (state === "populate") {
      const items = [...scannedItems.values()];
      const queue = items.map(el => {
        const link = el.querySelector('a[href*="/dp/"], a[href*="/gp/product/"]');
        let href = link?.href || "";
        if (href.startsWith("/")) href = "https://www.amazon.com" + href;
        return { url: href };
      });

      if (queue.length) {
        let total = queue.length;
        let opened = 0;

        queue.forEach(({ url }, i) => {
          setTimeout(() => {
            chrome.runtime.sendMessage({ action: "scrapeTab", url });
            opened++;
            const pct = Math.round((opened / total) * 100);
            document.getElementById("progress-bar").style.width = pct + "%";
            document.getElementById("scan-status").innerHTML = `<span style="color: #22c55e;">✅</span> Populating ${opened}/${total}`;

            if (opened === total) {
              setTimeout(() => {
                scanButton.style.display = "none";
                document.getElementById("scan-status").innerHTML = `<span style="color: #22c55e;">✅</span> Populated ${total} Lost Items`;
              }, 500);
            }
          }, i * 1000);
        });

        scanButton.disabled = true;
        scanButton.textContent = "Populating...";
      }
    } else {
      scanButton.textContent = "Stop Scan";
      scanButton.dataset.state = "running";
      beginScrollingScan();
    }
  });

  const searchInput = document.getElementById("sidebar-search");
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    const items = document.querySelectorAll(".item-line");

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(term) ? "block" : "none";
    });
  });

  makeDraggable(bar);

  // Toggle Button
  const toggleBtn = document.createElement("div");
  toggleBtn.id = "sidebar-toggle-button";
  toggleBtn.innerHTML = "❌";
  document.body.appendChild(toggleBtn);

  toggleBtn.addEventListener("click", () => {
    const sidebar = document.getElementById("save-sort-sidebar");
    const isHidden = sidebar.style.display === "none";
    sidebar.style.display = isHidden ? "flex" : "none";
    toggleBtn.innerHTML = isHidden ? "❌" : "🗂️";
    localStorage.setItem("sidebar-visible", isHidden);
  });

  const lastVisible = localStorage.getItem("sidebar-visible");
  if (lastVisible === "false") {
    bar.style.display = "none";
    toggleBtn.innerHTML = "🗂️";
  }
}

function makeDraggable(el) {
  let offsetX = 0, offsetY = 0, dragging = false;

  const saved = JSON.parse(localStorage.getItem("sidebar-position"));
  if (saved) {
    el.style.top = saved.top;
    el.style.left = saved.left;
    el.style.bottom = "auto";
    el.style.right = "auto";
    el.style.position = "fixed";
  }

  el.addEventListener("mousedown", (e) => {
    if (e.target.closest("input, button, a, textarea")) return;
    dragging = true;
    offsetX = e.clientX - el.getBoundingClientRect().left;
    offsetY = e.clientY - el.getBoundingClientRect().top;
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    el.style.left = `${e.clientX - offsetX}px`;
    el.style.top = `${e.clientY - offsetY}px`;
    el.style.bottom = "auto";
    el.style.right = "auto";
    el.style.position = "fixed";
  });

  document.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
      document.body.style.userSelect = "";
      localStorage.setItem("sidebar-position", JSON.stringify({
        top: el.style.top,
        left: el.style.left
      }));
    }
  });
}

function beginScrollingScan() {
  const targetCount = parseInt(document.querySelector('[data-saved-item-quantity]')?.dataset.savedItemQuantity || '0');
  scannedItems.clear();

  scanInterval = setInterval(() => {
    window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' });

    const items = document.querySelectorAll('[data-itemid]');
    for (const el of items) {
      const id = el.dataset.itemid;
      if (id && !scannedItems.has(id)) {
        scannedItems.set(id, el);
      }
    }

    const count = scannedItems.size;
    document.getElementById('scan-status').textContent = `Scanning... ${count} items found...`;

    if (count >= targetCount) {
      clearInterval(scanInterval);
      document.getElementById('scan-control').textContent = "Populate";
      document.getElementById('scan-control').dataset.state = "populate";
    }
  }, 1000);
}

if (document.readyState === "complete") {
  createSidebar();
} else {
  window.addEventListener("load", createSidebar);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "addScrapedItem") {
    const { title, url } = msg.item;

    const li = document.createElement("li");
    li.className = "item-line";

    const a = document.createElement("a");
    a.href = url;
    a.textContent = title;
    a.target = "_blank";
    a.title = title;

    li.appendChild(a);
    document.getElementById("category-list").appendChild(li);
  }
});
