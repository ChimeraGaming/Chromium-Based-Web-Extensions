(function () {
    'use strict';

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ PAGE STATE AND DOM REFERENCES                            ║
    ╚════════════════════════════════════════════════════════════╝
    */

    const APP_VERSION = '4.0.0';
    const STORAGE_KEY = 'chimera_folders_state';
    const SETTINGS_SECTION_IDS = [
        'settings-views',
        'current-data',
        'statistics',
        'export-import',
        'folder-views',
        'master-pin'
    ];
    const DEFAULT_SETTINGS = {
        sidebarMinimized: false,
        layoutMode: 'sidebar-left',
        settingsViewMode: 'default',
        collapsedSettingsSections: createDefaultCollapsedSettingsSections(),
        autoHideFullscreen: true,
        masterCredentialType: '',
        masterCredentialHash: '',
        allowDeleteLockedFoldersWithoutPin: false,
        useMasterCredentialForNewLocks: false,
        bypassShowPopups: false,
        lastAddTargetFolderId: null
    };
    const DEFAULT_STATS = {
        showsWatched: 0,
        moviesWatched: 0,
        totalWatchSeconds: 0,
        updatedAt: ''
    };

    const folderCountElement = document.getElementById('folder-count');
    const itemCountElement = document.getElementById('item-count');
    const layoutModeLabelElement = document.getElementById('layout-mode-label');
    const autoHideStateElement = document.getElementById('autohide-state');
    const showsWatchedElement = document.getElementById('shows-watched');
    const moviesWatchedElement = document.getElementById('movies-watched');
    const totalWatchTimeElement = document.getElementById('total-watch-time');
    const masterTypeLabelElement = document.getElementById('master-type-label');
    const deleteOverrideLabelElement = document.getElementById('delete-override-label');
    const statusElement = document.getElementById('status');
    const exportButton = document.getElementById('export-button');
    const importButton = document.getElementById('import-button');
    const importFileInput = document.getElementById('import-file');
    const exportRemoveLocksInput = document.getElementById('export-remove-locks');
    const saveSettingsButton = document.getElementById('save-settings-button');
    const saveMasterButton = document.getElementById('save-master-button');
    const removeAllLocksButton = document.getElementById('remove-all-locks-button');
    const clearMasterButton = document.getElementById('clear-master-button');
    const autoHideFullscreenInput = document.getElementById('autohide-fullscreen');
    const settingsViewModeSelect = document.getElementById('settings-view-mode');
    const masterTypeSelect = document.getElementById('master-type-select');
    const currentMasterLabel = document.getElementById('current-master-label');
    const newMasterLabel = document.getElementById('new-master-label');
    const confirmMasterLabel = document.getElementById('confirm-master-label');
    const currentMasterSecretInput = document.getElementById('current-master-secret');
    const newMasterSecretInput = document.getElementById('new-master-secret');
    const confirmMasterSecretInput = document.getElementById('confirm-master-secret');
    const allowDeleteLockedInput = document.getElementById('allow-delete-locked');
    const useMasterForNewLocksInput = document.getElementById('use-master-for-new-locks');
    const bypassShowPopupsInput = document.getElementById('bypass-show-popups');
    const layoutModeInputs = Array.from(document.querySelectorAll('input[name="layout-mode"]'));
    const collapsiblePanels = Array.from(document.querySelectorAll('[data-section-id]'));
    let collapsedSettingsSections = createDefaultCollapsedSettingsSections();

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ DATA SHAPE AND NORMALIZATION                             ║
    ╚════════════════════════════════════════════════════════════╝
    */

    function createDefaultState() {
        return {
            version: APP_VERSION,
            folders: [],
            settings: { ...DEFAULT_SETTINGS },
            stats: { ...DEFAULT_STATS }
        };
    }

    function getSafeText(value, fallback) {
        if (typeof value !== 'string') {
            return fallback;
        }

        const trimmed = value.trim();
        return trimmed || fallback;
    }

    function getSafeBoolean(value, fallback) {
        if (value === true || value === false) {
            return value;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === 'true') {
                return true;
            }

            if (normalized === 'false') {
                return false;
            }
        }

        return fallback;
    }

    function createDefaultCollapsedSettingsSections() {
        return SETTINGS_SECTION_IDS.reduce((sections, sectionId) => {
            sections[sectionId] = false;
            return sections;
        }, {});
    }

    function normalizeCollapsedSettingsSections(value) {
        const normalized = createDefaultCollapsedSettingsSections();

        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return normalized;
        }

        SETTINGS_SECTION_IDS.forEach((sectionId) => {
            normalized[sectionId] = getSafeBoolean(value[sectionId], false);
        });

        return normalized;
    }

    function normalizeItems(items) {
        if (!Array.isArray(items)) {
            return [];
        }

        return items
            .map((item) => {
                if (!item || typeof item !== 'object') {
                    return null;
                }

                const url = typeof item.url === 'string' ? item.url.trim() : '';
                if (!url) {
                    return null;
                }

                return {
                    title: getSafeText(item.title, 'Untitled'),
                    url
                };
            })
            .filter(Boolean);
    }

    function normalizeFolderLock(lock) {
        const source = lock && typeof lock === 'object' ? lock : {};
        const type = typeof source.type === 'string' ? source.type : '';
        const hash = typeof source.hash === 'string' ? source.hash.trim() : '';
        const useMasterCredential = getSafeBoolean(source.useMasterCredential, false);

        if (useMasterCredential) {
            if (!['pin4', 'pin6', 'password'].includes(type)) {
                return null;
            }

            return {
                type,
                hash: '',
                useMasterCredential: true
            };
        }

        if (!['pin4', 'pin6', 'password'].includes(type) || !hash) {
            return null;
        }

        return {
            type,
            hash,
            useMasterCredential: false
        };
    }

    function normalizeFolders(folders) {
        if (!Array.isArray(folders)) {
            return [];
        }

        const normalizedFolders = folders
            .map((folder, index) => {
                if (!folder || typeof folder !== 'object') {
                    return null;
                }

                const numericId = Number(folder.id);
                const numericParentId = Number(folder.parentId);
                const hasExplicitType = typeof folder.type === 'string' && folder.type.trim();
                const hasParentId = Number.isFinite(numericParentId);
                const type = hasParentId
                    ? 'folder'
                    : hasExplicitType && folder.type.trim().toLowerCase() === 'folder'
                        ? 'folder'
                        : 'profile';

                return {
                    id: Number.isFinite(numericId) ? numericId : Date.now() + index,
                    type,
                    parentId: hasParentId ? numericParentId : null,
                    name: getSafeText(folder.name, 'Untitled Folder'),
                    collapsed: getSafeBoolean(folder.collapsed, false),
                    items: normalizeItems(folder.items),
                    lock: normalizeFolderLock(folder.lock)
                };
            })
            .filter(Boolean);

        const validIds = new Set(normalizedFolders.map((folder) => folder.id));

        return normalizedFolders.map((folder) => {
            if (!folder.parentId || !validIds.has(folder.parentId)) {
                return {
                    ...folder,
                    type: 'profile',
                    parentId: null
                };
            }

            return {
                ...folder,
                type: 'folder'
            };
        });
    }

    function normalizeSettings(settings) {
        const source = settings && typeof settings === 'object' ? settings : {};
        const layoutMode = typeof source.layoutMode === 'string'
            ? source.layoutMode
            : DEFAULT_SETTINGS.layoutMode;
        const settingsViewMode = typeof source.settingsViewMode === 'string'
            ? source.settingsViewMode.trim().toLowerCase()
            : DEFAULT_SETTINGS.settingsViewMode;
        let normalizedSettingsViewMode = DEFAULT_SETTINGS.settingsViewMode;

        if (settingsViewMode === 'property-sheet') {
            normalizedSettingsViewMode = 'property-sheet';
        }
        const normalized = {
            ...DEFAULT_SETTINGS,
            ...source,
            sidebarMinimized: getSafeBoolean(source.sidebarMinimized, false),
            layoutMode: ['sidebar-left', 'sidebar-right', 'folder-view'].includes(layoutMode)
                ? layoutMode
                : DEFAULT_SETTINGS.layoutMode,
            settingsViewMode: normalizedSettingsViewMode,
            collapsedSettingsSections: normalizeCollapsedSettingsSections(source.collapsedSettingsSections),
            autoHideFullscreen: getSafeBoolean(source.autoHideFullscreen, true),
            masterCredentialType: ['pin4', 'pin6', 'password'].includes(source.masterCredentialType)
                ? source.masterCredentialType
                : '',
            masterCredentialHash: typeof source.masterCredentialHash === 'string'
                ? source.masterCredentialHash.trim()
                : '',
            allowDeleteLockedFoldersWithoutPin: getSafeBoolean(source.allowDeleteLockedFoldersWithoutPin, false),
            useMasterCredentialForNewLocks: getSafeBoolean(source.useMasterCredentialForNewLocks, false),
            bypassShowPopups: getSafeBoolean(source.bypassShowPopups, false),
            lastAddTargetFolderId: Number.isFinite(Number(source.lastAddTargetFolderId))
                ? Number(source.lastAddTargetFolderId)
                : null
        };

        if (!normalized.masterCredentialType || !normalized.masterCredentialHash) {
            normalized.masterCredentialType = '';
            normalized.masterCredentialHash = '';
            normalized.allowDeleteLockedFoldersWithoutPin = false;
        }

        return normalized;
    }

    function normalizeStats(stats) {
        const source = stats && typeof stats === 'object' ? stats : {};

        return {
            showsWatched: Number.isFinite(Number(source.showsWatched))
                ? Math.max(0, Math.floor(Number(source.showsWatched)))
                : DEFAULT_STATS.showsWatched,
            moviesWatched: Number.isFinite(Number(source.moviesWatched))
                ? Math.max(0, Math.floor(Number(source.moviesWatched)))
                : DEFAULT_STATS.moviesWatched,
            totalWatchSeconds: Number.isFinite(Number(source.totalWatchSeconds))
                ? Math.max(0, Math.floor(Number(source.totalWatchSeconds)))
                : DEFAULT_STATS.totalWatchSeconds,
            updatedAt: typeof source.updatedAt === 'string'
                ? source.updatedAt
                : DEFAULT_STATS.updatedAt
        };
    }

    function normalizeState(rawState) {
        if (Array.isArray(rawState)) {
            return {
                version: APP_VERSION,
                folders: normalizeFolders(rawState),
                settings: { ...DEFAULT_SETTINGS },
                stats: { ...DEFAULT_STATS }
            };
        }

        const source = rawState && typeof rawState === 'object' ? rawState : {};

        return {
            version: typeof source.version === 'string' ? source.version : APP_VERSION,
            folders: normalizeFolders(source.folders),
            settings: normalizeSettings(source.settings),
            stats: normalizeStats(source.stats)
        };
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ STORAGE READS AND WRITES                                 ║
    ╚════════════════════════════════════════════════════════════╝
    */

    async function getState() {
        return new Promise((resolve) => {
            chrome.storage.local.get([STORAGE_KEY], (result) => {
                if (chrome.runtime.lastError) {
                    resolve(createDefaultState());
                    return;
                }

                resolve(normalizeState(result[STORAGE_KEY]));
            });
        });
    }

    async function saveState(nextState) {
        const normalizedState = normalizeState(nextState);

        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [STORAGE_KEY]: normalizedState }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                resolve(normalizedState);
            });
        });
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ STATUS AND SUMMARY UI                                    ║
    ╚════════════════════════════════════════════════════════════╝
    */

    function setStatus(message, tone) {
        statusElement.textContent = message;
        statusElement.className = 'status';

        if (tone) {
            statusElement.classList.add(tone);
        }
    }

    function getLayoutModeLabel(layoutMode) {
        if (layoutMode === 'sidebar-right') {
            return 'Sidebar Right';
        }

        if (layoutMode === 'folder-view') {
            return 'Folder View';
        }

        return 'Sidebar Left';
    }

    function formatWatchTime(totalSeconds) {
        let remainingSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
        if (!remainingSeconds) {
            return '0 Seconds';
        }

        const units = [
            ['Year', 31536000],
            ['Month', 2592000],
            ['Day', 86400],
            ['Hour', 3600],
            ['Minute', 60],
            ['Second', 1]
        ];
        const parts = [];

        units.forEach(([label, unitSeconds]) => {
            if (remainingSeconds < unitSeconds) {
                return;
            }

            const amount = Math.floor(remainingSeconds / unitSeconds);
            remainingSeconds -= amount * unitSeconds;
            parts.push(`${amount} ${label}${amount === 1 ? '' : 's'}`);
        });

        return parts.join(' ');
    }

    function getCredentialLabel(type) {
        if (type === 'pin4') {
            return '4 Digit PIN';
        }

        if (type === 'pin6') {
            return '6 Digit PIN';
        }

        if (type === 'password') {
            return 'Password';
        }

        return 'Not Set';
    }

    function getCredentialFieldLabel(type) {
        if (type === 'password') {
            return 'Password';
        }

        return 'PIN';
    }

    function getCredentialPlaceholder(type) {
        if (type === 'pin4') {
            return '4 digits';
        }

        if (type === 'pin6') {
            return '6 digits';
        }

        return 'Up to 32 characters';
    }

    function getCredentialMaxLength(type) {
        if (type === 'pin4') {
            return 4;
        }

        if (type === 'pin6') {
            return 6;
        }

        return 32;
    }

    function validateCredential(type, value) {
        const secret = typeof value === 'string' ? value.trim() : '';
        if (!secret) {
            return `Enter a ${getCredentialFieldLabel(type).toLowerCase()}.`;
        }

        if (type === 'pin4' && !/^\d{4}$/.test(secret)) {
            return 'Use exactly 4 digits.';
        }

        if (type === 'pin6' && !/^\d{6}$/.test(secret)) {
            return 'Use exactly 6 digits.';
        }

        if (type === 'password' && secret.length > 32) {
            return 'Passwords can be up to 32 characters.';
        }

        return '';
    }

    async function hashSecret(secret) {
        const digest = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(String(secret))
        );

        return Array.from(new Uint8Array(digest))
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('');
    }

    async function secretMatchesHash(secret, hash) {
        if (!hash) {
            return false;
        }

        return (await hashSecret(secret.trim())) === hash;
    }

    function hasMasterCredential(settings) {
        return Boolean(settings.masterCredentialType && settings.masterCredentialHash);
    }

    function getLockedFolderCount(folders) {
        return Array.isArray(folders)
            ? folders.reduce((total, folder) => total + (folder && folder.lock ? 1 : 0), 0)
            : 0;
    }

    function getDescendantFolderIds(folderId, folders) {
        const descendants = [];
        const stack = folders.filter((folder) => (folder.parentId || null) === folderId);

        while (stack.length) {
            const childFolder = stack.shift();
            descendants.push(childFolder.id);
            stack.unshift(...folders.filter((folder) => (folder.parentId || null) === childFolder.id));
        }

        return descendants;
    }

    function clearMasterFields() {
        currentMasterSecretInput.value = '';
        newMasterSecretInput.value = '';
        confirmMasterSecretInput.value = '';
    }

    function showCredentialPromptDialog(title, description, type) {
        return new Promise((resolve) => {
            const backdrop = document.createElement('div');
            backdrop.className = 'credential-prompt-backdrop';

            const box = document.createElement('div');
            box.className = 'credential-prompt-box';

            const heading = document.createElement('h3');
            heading.textContent = title;

            const copy = document.createElement('p');
            copy.textContent = description;

            const input = document.createElement('input');
            input.className = 'text-input';
            input.type = 'password';
            input.autocomplete = 'off';
            input.placeholder = getCredentialPlaceholder(type);
            input.maxLength = getCredentialMaxLength(type);
            input.inputMode = type === 'password' ? 'text' : 'numeric';

            const error = document.createElement('div');
            error.className = 'credential-prompt-error';

            const actionRow = document.createElement('div');
            actionRow.className = 'button-row';

            const submitButton = document.createElement('button');
            submitButton.type = 'button';
            submitButton.textContent = 'Continue';

            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'secondary-button';
            cancelButton.textContent = 'Cancel';

            const closeDialog = (value) => {
                backdrop.remove();
                resolve(value);
            };

            submitButton.addEventListener('click', () => {
                const secret = input.value.trim();
                if (!secret) {
                    error.textContent = `Enter a ${getCredentialFieldLabel(type).toLowerCase()}.`;
                    return;
                }

                error.textContent = '';
                closeDialog(secret);
            });

            cancelButton.addEventListener('click', () => {
                closeDialog(null);
            });

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    submitButton.click();
                }
            });

            actionRow.appendChild(submitButton);
            actionRow.appendChild(cancelButton);
            box.appendChild(heading);
            box.appendChild(copy);
            box.appendChild(input);
            box.appendChild(error);
            box.appendChild(actionRow);
            backdrop.appendChild(box);
            document.body.appendChild(backdrop);
            input.focus();
        });
    }

    function updateMasterFormLabels(existingType) {
        const selectedType = masterTypeSelect.value;
        const currentLabel = existingType
            ? getCredentialFieldLabel(existingType)
            : 'PIN';
        const nextLabel = getCredentialFieldLabel(selectedType);

        currentMasterLabel.textContent = `Current ${currentLabel}`;
        newMasterLabel.textContent = `New ${nextLabel}`;
        confirmMasterLabel.textContent = `Confirm ${nextLabel}`;

        currentMasterSecretInput.placeholder = existingType
            ? getCredentialPlaceholder(existingType)
            : 'Only needed after setup';
        currentMasterSecretInput.maxLength = existingType ? getCredentialMaxLength(existingType) : 32;
        currentMasterSecretInput.inputMode = existingType && existingType !== 'password' ? 'numeric' : 'text';

        newMasterSecretInput.placeholder = getCredentialPlaceholder(selectedType);
        confirmMasterSecretInput.placeholder = getCredentialPlaceholder(selectedType);
        newMasterSecretInput.maxLength = getCredentialMaxLength(selectedType);
        confirmMasterSecretInput.maxLength = getCredentialMaxLength(selectedType);
        newMasterSecretInput.inputMode = selectedType === 'password' ? 'text' : 'numeric';
        confirmMasterSecretInput.inputMode = selectedType === 'password' ? 'text' : 'numeric';
    }

    function buildExportState(state, removeLocks) {
        const skippedIds = new Set();

        if (!removeLocks) {
            state.folders.forEach((folder) => {
                if (!folder.lock) {
                    return;
                }

                skippedIds.add(folder.id);
                getDescendantFolderIds(folder.id, state.folders).forEach((entryId) => {
                    skippedIds.add(entryId);
                });
            });
        }

        const folders = removeLocks
            ? state.folders.map((folder) => ({
                ...folder,
                lock: null
            }))
            : state.folders.filter((folder) => !skippedIds.has(folder.id));

        const settings = removeLocks
            ? {
                ...state.settings,
                masterCredentialType: '',
                masterCredentialHash: '',
                allowDeleteLockedFoldersWithoutPin: false,
                useMasterCredentialForNewLocks: false,
                bypassShowPopups: false
            }
            : state.settings;

        return normalizeState({
            ...state,
            folders,
            settings
        });
    }

    function applySettingsViewMode(viewMode) {
        const normalizedViewMode = viewMode === 'property-sheet'
            ? 'property-sheet'
            : DEFAULT_SETTINGS.settingsViewMode;
        document.body.classList.add('settings-view-compact');
        document.body.classList.toggle('settings-view-properties', normalizedViewMode === 'property-sheet');
    }

    function applyCollapsedSettingsSections(nextCollapsedSettingsSections) {
        collapsedSettingsSections = normalizeCollapsedSettingsSections(nextCollapsedSettingsSections);

        collapsiblePanels.forEach((panel) => {
            const sectionId = panel.dataset.sectionId;
            const isCollapsed = Boolean(collapsedSettingsSections[sectionId]);
            const toggleButton = panel.querySelector('.section-toggle');
            const sectionBody = panel.querySelector('.section-body');
            const toggleIcon = panel.querySelector('.section-toggle-icon');

            panel.classList.toggle('is-collapsed', isCollapsed);

            if (toggleButton) {
                toggleButton.setAttribute('aria-expanded', String(!isCollapsed));
            }

            if (sectionBody) {
                sectionBody.hidden = isCollapsed;
            }

            if (toggleIcon) {
                toggleIcon.textContent = isCollapsed ? '+' : '-';
            }
        });
    }

    async function persistCollapsedSettingsSections(nextCollapsedSettingsSections) {
        const state = await getState();
        const normalizedSections = normalizeCollapsedSettingsSections(nextCollapsedSettingsSections);

        await saveState({
            ...state,
            settings: {
                ...state.settings,
                collapsedSettingsSections: normalizedSections
            }
        });
    }

    function bindCollapsibleSections() {
        collapsiblePanels.forEach((panel) => {
            const toggleButton = panel.querySelector('.section-toggle');
            const sectionId = panel.dataset.sectionId;

            if (!toggleButton || !sectionId) {
                return;
            }

            toggleButton.addEventListener('click', () => {
                const previousSections = { ...collapsedSettingsSections };
                const nextSections = {
                    ...collapsedSettingsSections,
                    [sectionId]: !collapsedSettingsSections[sectionId]
                };

                applyCollapsedSettingsSections(nextSections);
                persistCollapsedSettingsSections(nextSections).catch(() => {
                    applyCollapsedSettingsSections(previousSections);
                    setStatus('Could not update collapsed sections.', 'error');
                });
            });
        });
    }

    function loadFormFromState(state) {
        layoutModeInputs.forEach((input) => {
            input.checked = input.value === state.settings.layoutMode;
        });

        const lockedFolderCount = getLockedFolderCount(state.folders);

        settingsViewModeSelect.value = state.settings.settingsViewMode;
        applySettingsViewMode(state.settings.settingsViewMode);
        applyCollapsedSettingsSections(state.settings.collapsedSettingsSections);
        autoHideFullscreenInput.checked = state.settings.autoHideFullscreen;
        masterTypeSelect.value = state.settings.masterCredentialType || 'pin4';
        allowDeleteLockedInput.checked = state.settings.allowDeleteLockedFoldersWithoutPin;
        useMasterForNewLocksInput.checked = state.settings.useMasterCredentialForNewLocks;
        bypassShowPopupsInput.checked = state.settings.bypassShowPopups;
        clearMasterButton.disabled = !hasMasterCredential(state.settings);
        removeAllLocksButton.disabled = !hasMasterCredential(state.settings) || !lockedFolderCount;
        currentMasterSecretInput.disabled = !hasMasterCredential(state.settings);
        updateMasterFormLabels(state.settings.masterCredentialType);
    }

    async function refreshSummary() {
        const state = await getState();
        const itemCount = state.folders.reduce((total, folder) => total + folder.items.length, 0);
        const stats = normalizeStats(state.stats);

        folderCountElement.textContent = String(state.folders.length);
        itemCountElement.textContent = String(itemCount);
        layoutModeLabelElement.textContent = getLayoutModeLabel(state.settings.layoutMode);
        autoHideStateElement.textContent = state.settings.autoHideFullscreen ? 'On' : 'Off';
        showsWatchedElement.textContent = String(stats.showsWatched);
        moviesWatchedElement.textContent = String(stats.moviesWatched);
        totalWatchTimeElement.textContent = formatWatchTime(stats.totalWatchSeconds);
        masterTypeLabelElement.textContent = hasMasterCredential(state.settings)
            ? getCredentialLabel(state.settings.masterCredentialType)
            : 'Not Set';
        deleteOverrideLabelElement.textContent = state.settings.allowDeleteLockedFoldersWithoutPin ? 'On' : 'Off';
        loadFormFromState(state);
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ VIEW SETTINGS                                            ║
    ╚════════════════════════════════════════════════════════════╝
    */

    async function saveViewSettings() {
        saveSettingsButton.disabled = true;
        setStatus('Saving view settings.');

        try {
            const state = await getState();
            const selectedLayoutInput = layoutModeInputs.find((input) => input.checked);
            const layoutMode = selectedLayoutInput
                ? selectedLayoutInput.value
                : DEFAULT_SETTINGS.layoutMode;

            await saveState({
                ...state,
                settings: {
                    ...state.settings,
                    layoutMode,
                    settingsViewMode: settingsViewModeSelect.value === 'property-sheet'
                        ? 'property-sheet'
                        : DEFAULT_SETTINGS.settingsViewMode,
                    autoHideFullscreen: autoHideFullscreenInput.checked
                }
            });

            await refreshSummary();
            setStatus('View settings saved.', 'success');
        } catch (error) {
            setStatus('Could not save view settings.', 'error');
        } finally {
            saveSettingsButton.disabled = false;
        }
    }

    async function saveSettingsViewMode() {
        const state = await getState();
        const previousViewMode = state.settings.settingsViewMode;
        const nextViewMode = settingsViewModeSelect.value === 'property-sheet'
            ? 'property-sheet'
            : DEFAULT_SETTINGS.settingsViewMode;
        applySettingsViewMode(nextViewMode);
        setStatus('Saving settings view.');

        try {
            await saveState({
                ...state,
                settings: {
                    ...state.settings,
                    settingsViewMode: nextViewMode
                }
            });

            await refreshSummary();
            setStatus('Settings view saved.', 'success');
        } catch (error) {
            settingsViewModeSelect.value = previousViewMode;
            applySettingsViewMode(previousViewMode);
            setStatus('Could not save the settings view.', 'error');
        }
    }

    async function saveMasterSettings() {
        saveMasterButton.disabled = true;
        clearMasterButton.disabled = true;
        setStatus('Saving master pin.');

        try {
            const state = await getState();
            const currentSettings = normalizeSettings(state.settings);
            const selectedType = masterTypeSelect.value;
            const currentSecret = currentMasterSecretInput.value.trim();
            const newSecret = newMasterSecretInput.value.trim();
            const confirmSecret = confirmMasterSecretInput.value.trim();
            const masterExists = hasMasterCredential(currentSettings);
            const typeChanged = masterExists && selectedType !== currentSettings.masterCredentialType;
            const overrideChanged = allowDeleteLockedInput.checked !== currentSettings.allowDeleteLockedFoldersWithoutPin;
            const useMasterForNewLocksChanged = useMasterForNewLocksInput.checked !== currentSettings.useMasterCredentialForNewLocks;
            const bypassShowPopupsChanged = bypassShowPopupsInput.checked !== currentSettings.bypassShowPopups;
            const secretChanged = Boolean(newSecret || confirmSecret);

            if (!masterExists && !secretChanged) {
                setStatus('Enter a master pin before saving.', 'error');
                return;
            }

            if (masterExists && (typeChanged || secretChanged || overrideChanged || useMasterForNewLocksChanged || bypassShowPopupsChanged)) {
                if (!currentSecret) {
                    setStatus(`Enter the current ${getCredentialLabel(currentSettings.masterCredentialType).toLowerCase()}.`, 'error');
                    return;
                }

                if (!(await secretMatchesHash(currentSecret, currentSettings.masterCredentialHash))) {
                    setStatus('The current master pin did not match.', 'error');
                    return;
                }
            }

            if (!typeChanged && !secretChanged && !overrideChanged && !useMasterForNewLocksChanged && !bypassShowPopupsChanged && masterExists) {
                setStatus('No master pin changes to save.', 'error');
                return;
            }

            let nextType = currentSettings.masterCredentialType;
            let nextHash = currentSettings.masterCredentialHash;

            if (!masterExists || typeChanged || secretChanged) {
                const validationError = validateCredential(selectedType, newSecret);
                if (validationError) {
                    setStatus(validationError, 'error');
                    return;
                }

                if (newSecret !== confirmSecret) {
                    setStatus('The new master entries do not match.', 'error');
                    return;
                }

                nextType = selectedType;
                nextHash = await hashSecret(newSecret);
            }

            const nextFolders = state.folders.map((folder) => {
                if (!folder.lock || !folder.lock.useMasterCredential) {
                    return folder;
                }

                return {
                    ...folder,
                    lock: {
                        ...folder.lock,
                        type: nextType,
                        hash: ''
                    }
                };
            });

            await saveState({
                ...state,
                folders: nextFolders,
                settings: {
                    ...currentSettings,
                    masterCredentialType: nextType,
                    masterCredentialHash: nextHash,
                    allowDeleteLockedFoldersWithoutPin: allowDeleteLockedInput.checked,
                    useMasterCredentialForNewLocks: useMasterForNewLocksInput.checked,
                    bypassShowPopups: bypassShowPopupsInput.checked
                }
            });

            clearMasterFields();
            await refreshSummary();
            setStatus('Master pin saved.', 'success');
        } catch (error) {
            setStatus('Could not save the master pin.', 'error');
        } finally {
            saveMasterButton.disabled = false;
            await refreshSummary().catch(() => {
            });
        }
    }

    async function clearMasterSettings() {
        saveMasterButton.disabled = true;
        removeAllLocksButton.disabled = true;
        clearMasterButton.disabled = true;
        setStatus('Removing master pin.');

        try {
            const state = await getState();
            const currentSettings = normalizeSettings(state.settings);

            if (!hasMasterCredential(currentSettings)) {
                setStatus('No master pin is set.', 'error');
                return;
            }

            if (state.folders.some((folder) => folder.lock && folder.lock.useMasterCredential)) {
                setStatus('Change or remove folders using the master lock first.', 'error');
                return;
            }

            const currentSecret = currentMasterSecretInput.value.trim();
            if (!currentSecret) {
                setStatus(`Enter the current ${getCredentialLabel(currentSettings.masterCredentialType).toLowerCase()}.`, 'error');
                return;
            }

            if (!(await secretMatchesHash(currentSecret, currentSettings.masterCredentialHash))) {
                setStatus('The current master pin did not match.', 'error');
                return;
            }

            await saveState({
                ...state,
                settings: {
                    ...currentSettings,
                    masterCredentialType: '',
                    masterCredentialHash: '',
                    allowDeleteLockedFoldersWithoutPin: false,
                    useMasterCredentialForNewLocks: false,
                    bypassShowPopups: false
                }
            });

            clearMasterFields();
            await refreshSummary();
            setStatus('Master pin removed.', 'success');
        } catch (error) {
            setStatus('Could not remove the master pin.', 'error');
        } finally {
            saveMasterButton.disabled = false;
            await refreshSummary().catch(() => {
            });
        }
    }

    async function removeAllLocks() {
        saveMasterButton.disabled = true;
        removeAllLocksButton.disabled = true;
        clearMasterButton.disabled = true;
        setStatus('Removing all locks.');

        try {
            const state = await getState();
            const currentSettings = normalizeSettings(state.settings);
            const lockedFolderCount = getLockedFolderCount(state.folders);

            if (!hasMasterCredential(currentSettings)) {
                setStatus('Set a master PIN first.', 'error');
                return;
            }

            if (!lockedFolderCount) {
                setStatus('No locks were found.', 'error');
                return;
            }

            const secret = await showCredentialPromptDialog(
                'Remove All Locks',
                'Enter the current master PIN or password to remove every lock from profiles, folders, and sub folders.',
                currentSettings.masterCredentialType
            );

            if (secret === null) {
                setStatus('Remove all locks cancelled.', 'error');
                return;
            }

            if (!(await secretMatchesHash(secret, currentSettings.masterCredentialHash))) {
                setStatus('The current master PIN did not match.', 'error');
                return;
            }

            await saveState({
                ...state,
                folders: state.folders.map((folder) => (
                    folder.lock
                        ? {
                            ...folder,
                            lock: null
                        }
                        : folder
                ))
            });

            await refreshSummary();
            setStatus(`Removed ${lockedFolderCount} lock${lockedFolderCount === 1 ? '' : 's'}.`, 'success');
        } catch (error) {
            setStatus('Could not remove all locks.', 'error');
        } finally {
            saveMasterButton.disabled = false;
            await refreshSummary().catch(() => {
            });
        }
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ EXPORT FLOW                                              ║
    ╚════════════════════════════════════════════════════════════╝
    */

    function downloadBackup(content) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 10);

        anchor.href = url;
        anchor.download = `chimera-folders-backup-${stamp}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    }

    async function exportEverything() {
        exportButton.disabled = true;
        setStatus('Building backup file.');

        try {
            const state = await getState();
            const lockedFolders = state.folders.filter((folder) => folder.lock);
            const removeLocks = exportRemoveLocksInput.checked;

            if (removeLocks && lockedFolders.length) {
                const currentSettings = normalizeSettings(state.settings);
                if (!hasMasterCredential(currentSettings)) {
                    setStatus('Set a master PIN before exporting locked folders without locks.', 'error');
                    return;
                }

                const secret = await showCredentialPromptDialog(
                    'Remove Locks',
                    'Enter the current master PIN or password to export locked folders without locks.',
                    currentSettings.masterCredentialType
                );

                if (secret === null) {
                    setStatus('Export cancelled.', 'error');
                    return;
                }

                if (!(await secretMatchesHash(secret, currentSettings.masterCredentialHash))) {
                    setStatus('The current master PIN did not match.', 'error');
                    return;
                }
            }

            const exportState = buildExportState(state, removeLocks);
            const payload = {
                source: 'chimera-folders',
                version: APP_VERSION,
                exportedAt: new Date().toISOString(),
                data: exportState
            };

            downloadBackup(JSON.stringify(payload, null, 2));
            await refreshSummary();

            if (removeLocks && lockedFolders.length) {
                setStatus('Backup exported with locks removed.', 'success');
                return;
            }

            if (!removeLocks && lockedFolders.length) {
                setStatus(`Backup exported. ${lockedFolders.length} locked folder${lockedFolders.length === 1 ? ' was' : 's were'} skipped.`, 'success');
                return;
            }

            setStatus('Backup exported successfully.', 'success');
        } catch (error) {
            setStatus('Export failed. Try again.', 'error');
        } finally {
            exportButton.disabled = false;
        }
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ IMPORT FLOW                                              ║
    ╚════════════════════════════════════════════════════════════╝
    */

    function parseImportedState(rawValue) {
        const parsed = JSON.parse(rawValue);

        if (Array.isArray(parsed)) {
            return normalizeState(parsed);
        }

        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid backup format.');
        }

        const candidate = Object.prototype.hasOwnProperty.call(parsed, 'data')
            ? parsed.data
            : parsed;

        if (
            !Array.isArray(candidate) &&
            (
                !candidate ||
                typeof candidate !== 'object' ||
                (
                    !Object.prototype.hasOwnProperty.call(candidate, 'folders') &&
                    !Object.prototype.hasOwnProperty.call(candidate, 'settings')
                )
            )
        ) {
            throw new Error('Invalid backup format.');
        }

        return normalizeState(candidate);
    }

    async function importEverything() {
        const file = importFileInput.files && importFileInput.files[0];
        if (!file) {
            setStatus('Choose a backup file first.', 'error');
            return;
        }

        importButton.disabled = true;
        setStatus('Importing backup.');

        try {
            const rawContent = await file.text();
            const importedState = parseImportedState(rawContent);
            await saveState(importedState);
            await refreshSummary();
            setStatus('Backup imported successfully.', 'success');
        } catch (error) {
            setStatus('Import failed. Make sure the backup file is valid JSON.', 'error');
        } finally {
            importButton.disabled = false;
            importFileInput.value = '';
        }
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ PAGE EVENTS AND LIVE REFRESH                             ║
    ╚════════════════════════════════════════════════════════════╝
    */

    saveSettingsButton.addEventListener('click', () => {
        saveViewSettings().catch(() => {
            setStatus('Could not save view settings.', 'error');
        });
    });

    settingsViewModeSelect.addEventListener('change', () => {
        saveSettingsViewMode().catch(() => {
            setStatus('Could not save the settings view.', 'error');
        });
    });

    masterTypeSelect.addEventListener('change', () => {
        getState().then((state) => {
            updateMasterFormLabels(state.settings.masterCredentialType);
        }).catch(() => {
        });
    });

    saveMasterButton.addEventListener('click', () => {
        saveMasterSettings().catch(() => {
            setStatus('Could not save the master pin.', 'error');
        });
    });

    clearMasterButton.addEventListener('click', () => {
        clearMasterSettings().catch(() => {
            setStatus('Could not remove the master pin.', 'error');
        });
    });

    removeAllLocksButton.addEventListener('click', () => {
        removeAllLocks().catch(() => {
            setStatus('Could not remove all locks.', 'error');
        });
    });

    exportButton.addEventListener('click', () => {
        exportEverything().catch(() => {
            setStatus('Export failed. Try again.', 'error');
        });
    });

    importButton.addEventListener('click', () => {
        importEverything().catch(() => {
            setStatus('Import failed. Try again.', 'error');
        });
    });

    bindCollapsibleSections();

    if (chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== 'local' || !changes[STORAGE_KEY]) {
                return;
            }

            refreshSummary().catch(() => {
                setStatus('Could not refresh current data.', 'error');
            });
        });
    }

    refreshSummary().catch(() => {
        setStatus('Could not load current data.', 'error');
    });
})();
