/**
 * Stremio Addon - Chimera Folders
 * Version: 3.0.0
 * Description: Enhances Stremio Web with customizable folders, GitHub integration, and improved UI.
 * Author: Chimera Gaming
 * GitHub: https://github.com/ChimeraGaming/Stremio-Addons
 * License: MIT
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'streamio_folders';

  function getFolders() {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  }

  function saveFolders(folders) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  }

  function showToast(message) {
      let toast = document.getElementById('toast-message');
      if (!toast) {
          toast = document.createElement('div');
          toast.id = 'toast-message';
          Object.assign(toast.style, {
              position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
              background: '#5A1F9A', color: '#fff', padding: '12px 30px', fontSize: '16px',
              borderRadius: '8px', zIndex: '10002', opacity: '0', transition: 'opacity 0.5s'
          });
          document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.style.opacity = '1';
      setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  }

  const sidebar = document.createElement('div');
  sidebar.id = 'folder-sidebar';
  sidebar.innerHTML = `
    <div id="sidebar-top" style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
      <button id="home-button" class="fancy-btn">Home</button>
      <button id="add-button" class="fancy-btn">Add</button>
      <button id="github-button" class="fancy-btn" style="padding: 6px 8px;">
        <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" style="width:20px; height:20px;">
      </button>
      <button id="minimize-button" class="fancy-btn">📌</button>
    </div>
    <div id="sidebar-content">
      <h3 style="margin: 0; color: #fff;">My Folders</h3>
      <div id="folder-controls" style="margin-top: 10px;">
        <input id="folder-name" type="text" placeholder="New folder..." style="width: 100%; margin-bottom: 8px; padding: 6px; background: #333; border: 1px solid #555; color: #fff; border-radius: 6px;">
        <button id="create-folder" class="create-folder-btn">Create Folder</button>
      </div>
      <ul id="folder-list" style="margin-top: 15px; list-style: none; padding: 0;"></ul>
    </div>
  `;
  Object.assign(sidebar.style, {
      position: 'fixed', top: '70px', left: '0', width: '260px', height: '90%',
      background: '#1c1c1c', borderRight: '2px solid #333', padding: '15px',
      zIndex: '10000', overflowY: 'auto', boxShadow: '3px 0 10px rgba(0,0,0,0.5)',
      fontFamily: 'Arial, sans-serif', borderRadius: '0 10px 10px 0', transition: 'transform 0.3s'
  });
  document.body.appendChild(sidebar);

  const style = document.createElement('style');
  style.innerHTML = `
    .fancy-btn {
      background: linear-gradient(to bottom, #7b61ff, #0040ff);
      border: none;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      color: white;
      font-weight: bold;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .fancy-btn:hover {
      background: linear-gradient(to bottom, #8b71ff, #0050ff);
      transform: scale(1.05);
      box-shadow: 0 0 8px #7b61ff;
    }
    .create-folder-btn {
      width: 100%;
      padding: 8px;
      border-radius: 8px;
      background: linear-gradient(to bottom, #7b61ff, #0040ff);
      color: white;
      font-weight: bold;
      border: none;
    }
    .create-folder-btn:hover {
      background: linear-gradient(to bottom, #8b71ff, #0050ff);
    }
    #folder-sidebar.minimized {
      transform: translateX(-240px);
    }
    #folder-sidebar.minimized:hover {
      transform: translateX(0);
    }
    .chevron {
      cursor: pointer;
      transition: transform 0.3s ease;
      color: white;
    }
    .chevron.collapsed {
      transform: rotate(-90deg);
    }
  `;
  document.head.appendChild(style);

  function renderFolders() {
      const folderList = document.getElementById('folder-list');
      folderList.innerHTML = '';
      const folders = getFolders();

      folders.forEach(folder => {
          const li = document.createElement('li');
          li.style.marginBottom = '8px';

          const titleWrapper = document.createElement('div');
          titleWrapper.style.display = 'flex';
          titleWrapper.style.justifyContent = 'space-between';
          titleWrapper.style.alignItems = 'center';
          titleWrapper.style.background = '#333';
          titleWrapper.style.color = '#fff';
          titleWrapper.style.padding = '5px';
          titleWrapper.style.borderRadius = '5px';

          const leftPart = document.createElement('div');
          leftPart.style.display = 'flex';
          leftPart.style.alignItems = 'center';
          leftPart.style.gap = '5px';

          const chevron = document.createElement('span');
          chevron.classList.add('chevron');
          chevron.innerHTML = '▶';

          const title = document.createElement('span');
          title.textContent = folder.name;

          leftPart.appendChild(chevron);
          leftPart.appendChild(title);

          const delBtn = document.createElement('button');
          delBtn.textContent = '❌';
          delBtn.style.background = 'transparent';
          delBtn.style.border = 'none';
          delBtn.style.color = 'red';
          delBtn.style.cursor = 'pointer';
          delBtn.onclick = () => {
              if (confirm(`Delete folder "${folder.name}"?`)) {
                  const newFolders = folders.filter(f => f.id !== folder.id);
                  saveFolders(newFolders);
                  renderFolders();
              }
          };

          titleWrapper.appendChild(leftPart);
          titleWrapper.appendChild(delBtn);
          li.appendChild(titleWrapper);

          const ul = document.createElement('ul');
          ul.style.marginLeft = '15px';
          ul.style.marginTop = '5px';

          if (folder.items && folder.items.length > 0) {
              folder.items.forEach(item => {
                  const child = document.createElement('li');
                  child.style.display = 'flex';
                  child.style.justifyContent = 'space-between';
                  child.style.alignItems = 'center';
                  child.style.marginBottom = '4px';

                  const link = document.createElement('a');
                  link.textContent = item.title;
                  link.href = item.url;
                  link.style.color = '#00bfff';
                  link.style.textDecoration = 'none';
                  link.style.fontSize = '14px';
                  link.target = '_blank';

                  const removeBtn = document.createElement('button');
                  removeBtn.textContent = '➖';
                  removeBtn.style.background = 'transparent';
                  removeBtn.style.border = 'none';
                  removeBtn.style.color = '#fff';
                  removeBtn.style.cursor = 'pointer';
                  removeBtn.onclick = () => {
                      if (confirm(`Remove "${item.title}" from "${folder.name}"?`)) {
                          folder.items = folder.items.filter(i => i.url !== item.url);
                          saveFolders(folders);
                          renderFolders();
                      }
                  };

                  child.appendChild(link);
                  child.appendChild(removeBtn);
                  ul.appendChild(child);
              });
          }

          li.appendChild(ul);

          chevron.onclick = () => {
              ul.style.display = ul.style.display === 'none' ? 'block' : 'none';
              chevron.classList.toggle('collapsed');
          };

          folderList.appendChild(li);
      });
  }

  document.getElementById('home-button').onclick = () => {
      window.location.href = 'https://web.stremio.com/';
  };

  document.getElementById('add-button').onclick = () => {
      const folders = getFolders();
      const poster = document.querySelector('img.logo-X3hTV');
      if (!poster) {
          showToast('No show selected!');
          return;
      }
      const title = poster.getAttribute('title') || 'Untitled';
      const url = window.location.hash;

      const picker = document.createElement('div');
      Object.assign(picker.style, {
          position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: '10001'
      });

      const box = document.createElement('div');
      box.style.background = '#222';
      box.style.padding = '20px';
      box.style.borderRadius = '10px';
      box.style.minWidth = '300px';
      box.style.color = '#fff';
      box.innerHTML = `<h3>Select Folder</h3>`;

      folders.forEach(folder => {
          const btn = document.createElement('button');
          btn.textContent = folder.name;
          Object.assign(btn.style, {
              display: 'block', margin: '10px 0', width: '100%',
              padding: '10px', background: '#7b61ff', color: '#fff',
              border: 'none', borderRadius: '5px', fontSize: '16px',
              cursor: 'pointer', fontWeight: 'bold'
          });
          btn.onclick = () => {
              const exists = folder.items.some(i => i.url === url);
              if (!exists) {
                  folder.items.push({ title, url });
                  saveFolders(folders);
                  showToast(`Added to "${folder.name}"`);
              } else {
                  showToast(`Already in "${folder.name}"`);
              }
              picker.remove();
              renderFolders();
          };
          box.appendChild(btn);
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      Object.assign(cancelBtn.style, {
          marginTop: '10px', padding: '10px', width: '100%',
          background: '#d9534f', border: 'none', borderRadius: '5px',
          fontSize: '16px', cursor: 'pointer', color: 'white', fontWeight: 'bold'
      });
      cancelBtn.onclick = () => picker.remove();

      box.appendChild(cancelBtn);
      picker.appendChild(box);
      document.body.appendChild(picker);
  };

  document.getElementById('github-button').onclick = () => {
      window.open('https://github.com/ChimeraGaming/Stremio-Addons', '_blank');
  };

  document.getElementById('minimize-button').onclick = () => {
      sidebar.classList.toggle('minimized');
  };

  document.getElementById('create-folder').onclick = () => {
      const nameInput = document.getElementById('folder-name');
      const name = nameInput.value.trim();
      if (!name) {
          showToast('Folder name cannot be empty!');
          return;
      }

      const folders = getFolders();
      const exists = folders.some(folder => folder.name.toLowerCase() === name.toLowerCase());
      if (exists) {
          showToast('Folder already exists!');
          return;
      }

      const newFolder = {
          id: Date.now(),
          name,
          items: []
      };

      folders.push(newFolder);
      saveFolders(folders);
      nameInput.value = '';
      renderFolders();
      showToast(`Folder "${name}" created!`);
  };

  renderFolders();
})();
