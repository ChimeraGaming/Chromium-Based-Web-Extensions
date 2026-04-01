/**
 * Stremio Addon - Chimera Folders
 * Version: 4.1.0
 * Description: Enhances Stremio Web with customizable folders, edit tools, shared extension storage, and backup tools.
 * Author: Chimera Gaming
 * GitHub: https://github.com/ChimeraGaming/Stremio-Addons
 * License: MIT
 */

(function () {
    'use strict';

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ BOOT GUARD AND CORE STATE                                ║
    ╚════════════════════════════════════════════════════════════╝
    */

    if (window.__chimeraFoldersLoaded) {
        return;
    }
    window.__chimeraFoldersLoaded = true;

    const APP_VERSION = '4.1.0';
    const LEGACY_STORAGE_KEY = 'streamio_folders';
    const STORAGE_KEY = 'chimera_folders_state';
    const DRAG_MIME = 'application/x-chimera-folders-drag';
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
    const LOCKED_GLYPH = '\uD83D\uDD12';
    const UNLOCKED_GLYPH = '\uD83D\uDD13';

    let appState = createDefaultState();
    let sidebar;
    let folderList;
    let folderNameInput;
    let searchInput;
    let editToggleButton;
    let launcherButton;
    let isEditMode = false;
    let searchQuery = '';
    let sidebarPlaybackHidden = false;
    let panelClosed = false;
    const unlockedFolderIds = new Set();
    let panelDragState = {
        active: false,
        pointerId: null,
        offsetX: 0,
        offsetY: 0
    };
    let launcherDragState = {
        active: false,
        pointerId: null,
        offsetX: 0,
        offsetY: 0,
        moved: false,
        suppressClick: false
    };
    let windowPosition = {
        left: 88,
        top: 96
    };
    let launcherPositions = {
        'sidebar-left': {
            left: 58,
            top: 84,
            custom: false
        },
        'sidebar-right': {
            left: null,
            top: 84,
            custom: false
        },
        'folder-view': {
            left: 20,
            top: 20,
            custom: false
        },
        'compact-folder-view': {
            left: 20,
            top: 20,
            custom: false
        }
    };
    const trackedVideos = new WeakSet();

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
            layoutMode: ['sidebar-left', 'sidebar-right', 'folder-view', 'compact-folder-view'].includes(layoutMode)
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

    function storageAvailable() {
        return Boolean(
            typeof chrome !== 'undefined' &&
            chrome.storage &&
            chrome.storage.local
        );
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ STORAGE BRIDGE AND LEGACY MIGRATION                      ║
    ╚════════════════════════════════════════════════════════════╝
    */

    function showToast(message) {
        let toast = document.getElementById('toast-message');

        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-message';
            Object.assign(toast.style, {
                position: 'fixed',
                bottom: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#5A1F9A',
                color: '#fff',
                padding: '12px 30px',
                fontSize: '16px',
                borderRadius: '8px',
                zIndex: '10002',
                opacity: '0',
                transition: 'opacity 0.5s',
                pointerEvents: 'none'
            });
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.opacity = '1';
        window.clearTimeout(showToast.timeoutId);
        showToast.timeoutId = window.setTimeout(() => {
            toast.style.opacity = '0';
        }, 2500);
    }

    function showPopupNotice(message, durationMs) {
        let popup = document.getElementById('popup-notice');

        if (!popup) {
            popup = document.createElement('button');
            popup.id = 'popup-notice';
            popup.type = 'button';
            Object.assign(popup.style, {
                position: 'fixed',
                left: '50%',
                bottom: '30px',
                transform: 'translateX(-50%)',
                minWidth: '240px',
                maxWidth: 'min(460px, calc(100vw - 32px))',
                padding: '12px 18px',
                borderRadius: '10px',
                border: '1px solid rgba(123, 97, 255, 0.5)',
                background: 'linear-gradient(to bottom, rgba(123, 97, 255, 0.95), rgba(0, 64, 255, 0.95))',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: '700',
                textAlign: 'center',
                boxShadow: '0 0 18px rgba(123, 97, 255, 0.35)',
                zIndex: '10003',
                opacity: '0',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
            });

            popup.addEventListener('click', () => {
                popup.style.opacity = '0';
            });

            document.body.appendChild(popup);
        }

        popup.textContent = message;
        popup.style.opacity = '1';
        window.clearTimeout(showPopupNotice.timeoutId);
        showPopupNotice.timeoutId = window.setTimeout(() => {
            popup.style.opacity = '0';
        }, Math.max(1000, Number(durationMs) || 5000));
    }

    function readLegacyFolders() {
        try {
            return JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '[]');
        } catch (error) {
            return [];
        }
    }

    function syncLegacyFolders() {
        try {
            localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(appState.folders));
        } catch (error) {
        }
    }

    async function getStoredState() {
        if (!storageAvailable()) {
            return normalizeState(readLegacyFolders());
        }

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
        appState = normalizeState(nextState);
        syncLegacyFolders();

        if (!storageAvailable()) {
            return appState;
        }

        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [STORAGE_KEY]: appState }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                resolve(appState);
            });
        });
    }

    async function migrateLegacyStateIfNeeded() {
        appState = await getStoredState();

        if (appState.folders.length > 0) {
            syncLegacyFolders();
            return;
        }

        const legacyFolders = normalizeFolders(readLegacyFolders());
        if (!legacyFolders.length) {
            return;
        }

        await saveState({
            version: APP_VERSION,
            folders: legacyFolders,
            settings: appState.settings,
            stats: appState.stats
        });
    }

    function normalizeMediaType(value) {
        if (typeof value !== 'string') {
            return '';
        }

        const normalized = value.trim().toLowerCase();
        if (['movie', 'film'].includes(normalized)) {
            return 'movie';
        }

        if (['series', 'show', 'tv', 'tvshow', 'tv-series'].includes(normalized)) {
            return 'show';
        }

        return '';
    }

    function getCandidateMediaType(candidate) {
        if (!candidate || typeof candidate !== 'object') {
            return '';
        }

        const sources = [
            candidate.type,
            candidate.metaType,
            candidate.contentType,
            candidate.itemType,
            candidate.kind,
            candidate.meta && candidate.meta.type,
            candidate.metaItem && candidate.metaItem.type,
            candidate.id && candidate.id.type
        ];

        for (const value of sources) {
            const mediaType = normalizeMediaType(value);
            if (mediaType) {
                return mediaType;
            }
        }

        return '';
    }

    function serializeIdentity(value) {
        if (value === null || value === undefined) {
            return '';
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }

        if (Array.isArray(value)) {
            const serializedItems = value
                .map((entry) => serializeIdentity(entry))
                .filter(Boolean);

            return serializedItems.length ? serializedItems.join('|') : '';
        }

        if (typeof value === 'object') {
            const preferredKeys = ['id', 'type', 'videoId', 'season', 'episode', 'imdb_id', 'imdbId'];
            const pickedEntries = preferredKeys
                .filter((key) => Object.prototype.hasOwnProperty.call(value, key))
                .map((key) => [key, value[key]]);

            if (pickedEntries.length) {
                return pickedEntries
                    .map(([key, entryValue]) => `${key}:${serializeIdentity(entryValue)}`)
                    .join('|');
            }

            return Object.keys(value)
                .sort()
                .map((key) => `${key}:${serializeIdentity(value[key])}`)
                .join('|');
        }

        return '';
    }

    function getCandidateIdentity(candidate) {
        if (!candidate || typeof candidate !== 'object') {
            return '';
        }

        const sources = [
            candidate.id,
            candidate._id,
            candidate.metaId,
            candidate.imdbId,
            candidate.imdb_id,
            candidate.meta && candidate.meta.id,
            candidate.metaItem && candidate.metaItem.id
        ];

        for (const value of sources) {
            const identity = serializeIdentity(value);
            if (identity) {
                return identity;
            }
        }

        return '';
    }

    function getStateContainer(candidate) {
        if (candidate && candidate.state && typeof candidate.state === 'object') {
            return candidate.state;
        }

        return candidate;
    }

    function getNumericFieldValue(sources, fieldNames) {
        for (const source of sources) {
            if (!source || typeof source !== 'object') {
                continue;
            }

            for (const fieldName of fieldNames) {
                if (!Object.prototype.hasOwnProperty.call(source, fieldName)) {
                    continue;
                }

                const numericValue = Number(source[fieldName]);
                if (Number.isFinite(numericValue) && numericValue > 0) {
                    return {
                        value: numericValue,
                        field: fieldName
                    };
                }
            }
        }

        return {
            value: 0,
            field: ''
        };
    }

    function getFieldValue(sources, fieldNames) {
        for (const source of sources) {
            if (!source || typeof source !== 'object') {
                continue;
            }

            for (const fieldName of fieldNames) {
                if (!Object.prototype.hasOwnProperty.call(source, fieldName)) {
                    continue;
                }

                const value = source[fieldName];
                if (value !== null && value !== undefined && value !== '') {
                    return value;
                }
            }
        }

        return null;
    }

    function hasWatchedBitField(value) {
        if (typeof value === 'string') {
            return /[1-9a-f]/i.test(value);
        }

        if (Array.isArray(value)) {
            return value.some(Boolean);
        }

        if (typeof value === 'number') {
            return value > 0;
        }

        return Boolean(value && typeof value === 'object' && Object.keys(value).length > 0);
    }

    function buildWatchCandidate(candidate) {
        const mediaType = getCandidateMediaType(candidate);
        const identity = getCandidateIdentity(candidate);

        if (!mediaType || !identity) {
            return null;
        }

        const stateContainer = getStateContainer(candidate);
        const sources = [stateContainer, candidate];
        const durationSample = getNumericFieldValue(sources, [
            'overallTimeWatched',
            'overall_time_watched',
            'timeWatched',
            'time_watched',
            'timeOffset',
            'time_offset'
        ]);
        const timesWatched = getNumericFieldValue(sources, [
            'timesWatched',
            'times_watched',
            'watchedCount',
            'watchCount'
        ]).value;
        const watchedFlag = Boolean(getFieldValue(sources, ['watched', 'isWatched']));
        const watchedBits = getFieldValue(sources, [
            'watchedBitField',
            'watchedBitfield',
            'watchedVideos',
            'videosWatched'
        ]);
        const lastWatched = getFieldValue(sources, [
            'lastWatched',
            'last_watched',
            'lastVideoId',
            'last_video_id'
        ]);
        const watched = mediaType === 'movie'
            ? watchedFlag || timesWatched > 0
            : watchedFlag || timesWatched > 0 || hasWatchedBitField(watchedBits);
        const hasActivity = watched || durationSample.value > 0 || Boolean(lastWatched);

        if (!hasActivity) {
            return null;
        }

        return {
            key: `${mediaType}:${identity}`,
            mediaType,
            watched,
            durationRaw: durationSample.value,
            durationField: durationSample.field
        };
    }

    function walkJsonTree(node, visitor, seenObjects) {
        if (!node || typeof node !== 'object') {
            return;
        }

        if (seenObjects.has(node)) {
            return;
        }

        seenObjects.add(node);
        visitor(node);

        if (Array.isArray(node)) {
            node.forEach((entry) => {
                walkJsonTree(entry, visitor, seenObjects);
            });
            return;
        }

        Object.values(node).forEach((value) => {
            walkJsonTree(value, visitor, seenObjects);
        });
    }

    function sampleLooksLikeMilliseconds(sample) {
        if (!sample || !Number.isFinite(sample.value) || sample.value <= 0) {
            return false;
        }

        const fieldName = sample.field.toLowerCase();
        if (fieldName.includes('offset')) {
            return sample.value > 43200;
        }

        if (fieldName.includes('overall')) {
            return sample.value > 432000;
        }

        return sample.value > 432000;
    }

    function convertSampleToSeconds(sample, useMilliseconds) {
        if (!sample || !Number.isFinite(sample.value) || sample.value <= 0) {
            return 0;
        }

        if (useMilliseconds) {
            return Math.max(0, Math.floor(sample.value / 1000));
        }

        return Math.max(0, Math.floor(sample.value));
    }

    function collectWatchStats() {
        const candidates = new Map();
        const durationSamples = [];

        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (!key) {
                continue;
            }

            let parsedValue;

            try {
                parsedValue = JSON.parse(localStorage.getItem(key) || '');
            } catch (error) {
                continue;
            }

            walkJsonTree(parsedValue, (node) => {
                const watchCandidate = buildWatchCandidate(node);
                if (!watchCandidate) {
                    return;
                }

                const previousCandidate = candidates.get(watchCandidate.key);
                if (previousCandidate) {
                    previousCandidate.watched = previousCandidate.watched || watchCandidate.watched;

                    if (watchCandidate.durationRaw > previousCandidate.durationRaw) {
                        previousCandidate.durationRaw = watchCandidate.durationRaw;
                        previousCandidate.durationField = watchCandidate.durationField;
                    }

                    return;
                }

                candidates.set(watchCandidate.key, watchCandidate);
                if (watchCandidate.durationRaw > 0) {
                    durationSamples.push({
                        value: watchCandidate.durationRaw,
                        field: watchCandidate.durationField || ''
                    });
                }
            }, new WeakSet());
        }

        const populatedSamples = durationSamples.filter((sample) => sample.value > 0);
        const millisecondVotes = populatedSamples.filter((sample) => sampleLooksLikeMilliseconds(sample)).length;
        const useMilliseconds = populatedSamples.length > 0 && millisecondVotes >= Math.ceil(populatedSamples.length / 2);

        let showsWatched = 0;
        let moviesWatched = 0;
        let totalWatchSeconds = 0;

        candidates.forEach((candidate) => {
            if (candidate.watched) {
                if (candidate.mediaType === 'movie') {
                    moviesWatched += 1;
                } else {
                    showsWatched += 1;
                }
            }

            totalWatchSeconds += convertSampleToSeconds({
                value: candidate.durationRaw,
                field: candidate.durationField
            }, useMilliseconds);
        });

        return normalizeStats({
            showsWatched,
            moviesWatched,
            totalWatchSeconds,
            updatedAt: new Date().toISOString()
        });
    }

    function statsChanged(leftStats, rightStats) {
        return (
            leftStats.showsWatched !== rightStats.showsWatched ||
            leftStats.moviesWatched !== rightStats.moviesWatched ||
            leftStats.totalWatchSeconds !== rightStats.totalWatchSeconds
        );
    }

    async function refreshWatchStats() {
        const nextStats = collectWatchStats();
        if (!statsChanged(appState.stats, nextStats)) {
            return;
        }

        await saveState({
            ...appState,
            stats: nextStats
        });
    }

    function startWatchStatsSync() {
        const syncStats = () => {
            refreshWatchStats().catch(() => {
            });
        };

        window.setTimeout(syncStats, 900);
        window.addEventListener('focus', syncStats);
        window.addEventListener('hashchange', () => {
            window.setTimeout(syncStats, 400);
        });
        window.setInterval(syncStats, 60000);
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

        return 'Master PIN';
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

    function hasMasterCredential() {
        return Boolean(appState.settings.masterCredentialType && appState.settings.masterCredentialHash);
    }

    function hasFolderLock(folder) {
        return Boolean(
            folder &&
            folder.lock &&
            folder.lock.type &&
            (folder.lock.useMasterCredential || folder.lock.hash)
        );
    }

    function isFolderUsingMasterLock(folder) {
        return Boolean(folder && folder.lock && folder.lock.useMasterCredential);
    }

    function getFolderLockType(folder) {
        if (!hasFolderLock(folder)) {
            return '';
        }

        if (isFolderUsingMasterLock(folder) && appState.settings.masterCredentialType) {
            return appState.settings.masterCredentialType;
        }

        return folder.lock.type;
    }

    function getFolderLockHash(folder) {
        if (!hasFolderLock(folder)) {
            return '';
        }

        if (isFolderUsingMasterLock(folder)) {
            return appState.settings.masterCredentialHash || '';
        }

        return folder.lock.hash;
    }

    function isFolderUnlocked(folderId) {
        return unlockedFolderIds.has(folderId);
    }

    function getFolderLockSignature(folder, settings) {
        if (!folder || !folder.lock || !folder.lock.type) {
            return '';
        }

        if (folder.lock.useMasterCredential) {
            const masterType = settings && settings.masterCredentialType
                ? settings.masterCredentialType
                : folder.lock.type;
            const masterHash = settings && settings.masterCredentialHash
                ? settings.masterCredentialHash
                : '';
            return `master:${masterType}:${masterHash}`;
        }

        return `folder:${folder.lock.type}:${folder.lock.hash}`;
    }

    function syncUnlockedFolderIds(previousFolders, nextFolders, previousSettings, nextSettings) {
        const nextLockMap = new Map(
            nextFolders.map((folder) => [folder.id, getFolderLockSignature(folder, nextSettings)])
        );

        Array.from(unlockedFolderIds).forEach((folderId) => {
            const previousFolder = previousFolders.find((folder) => folder.id === folderId);
            const nextLockSignature = nextLockMap.get(folderId) || '';
            const previousLockSignature = getFolderLockSignature(previousFolder, previousSettings);

            if (!nextLockSignature || previousLockSignature !== nextLockSignature) {
                unlockedFolderIds.delete(folderId);
            }
        });
    }

    function createDialogShell(title, description) {
        const backdrop = document.createElement('div');
        backdrop.className = 'picker-backdrop';

        const box = document.createElement('div');
        box.className = 'picker-box dialog-box';

        const heading = document.createElement('h3');
        heading.textContent = title;
        box.appendChild(heading);

        if (description) {
            const details = document.createElement('p');
            details.className = 'dialog-description';
            details.textContent = description;
            box.appendChild(details);
        }

        const error = document.createElement('div');
        error.className = 'dialog-error';
        box.appendChild(error);

        backdrop.appendChild(box);

        return {
            backdrop,
            box,
            setError(message) {
                error.textContent = message || '';
                error.classList.toggle('visible', Boolean(message));
            }
        };
    }

    function showChoiceDialog(title, description, choices) {
        return new Promise((resolve) => {
            const dialog = createDialogShell(title, description);
            const buttonList = document.createElement('div');
            buttonList.className = 'picker-button-list';

            const closeDialog = (value) => {
                dialog.backdrop.remove();
                resolve(value);
            };

            choices.forEach((choice) => {
                const button = document.createElement('button');
                button.className = 'picker-action';
                button.type = 'button';
                button.textContent = choice.label;
                button.addEventListener('click', () => {
                    closeDialog(choice.value);
                });
                buttonList.appendChild(button);
            });

            const cancelButton = document.createElement('button');
            cancelButton.className = 'picker-cancel';
            cancelButton.type = 'button';
            cancelButton.textContent = 'Cancel';
            cancelButton.addEventListener('click', () => {
                closeDialog(null);
            });

            dialog.box.appendChild(buttonList);
            dialog.box.appendChild(cancelButton);
            document.body.appendChild(dialog.backdrop);
        });
    }

    async function showConfirmDialog(title, description, confirmLabel) {
        const result = await showChoiceDialog(title, description, [
            {
                label: confirmLabel || 'Confirm',
                value: 'confirm'
            }
        ]);

        return result === 'confirm';
    }

    async function confirmShowRemoval(folderName, itemTitle) {
        if (appState.settings.bypassShowPopups) {
            return true;
        }

        return showConfirmDialog(
            'Remove Saved Title',
            `Remove "${itemTitle}" from "${folderName}"?`,
            'Remove'
        );
    }

    function showCredentialSetupDialog(title, description, initialType) {
        return new Promise((resolve) => {
            const dialog = createDialogShell(title, description);
            const form = document.createElement('form');
            form.className = 'dialog-form';

            const typeField = document.createElement('div');
            typeField.className = 'dialog-field';
            const typeLabel = document.createElement('span');
            typeLabel.textContent = 'Security Type';
            const typeNote = document.createElement('div');
            typeNote.className = 'dialog-helper dialog-type-note';
            typeNote.textContent = 'Pick a lock type below. You can switch between them before saving.';
            const typeGrid = document.createElement('div');
            typeGrid.className = 'dialog-type-grid';
            let selectedType = initialType || 'pin4';
            const typeButtons = [];

            [
                {
                    type: 'pin4',
                    copy: 'Quick 4 digit lock'
                },
                {
                    type: 'pin6',
                    copy: 'Stronger 6 digit lock'
                },
                {
                    type: 'password',
                    copy: 'Up to 32 characters'
                }
            ].forEach((entry) => {
                const button = document.createElement('button');
                button.className = 'dialog-type-option';
                button.type = 'button';
                button.dataset.type = entry.type;

                const titleNode = document.createElement('span');
                titleNode.className = 'dialog-type-option-title';
                titleNode.textContent = getCredentialLabel(entry.type);

                const copyNode = document.createElement('span');
                copyNode.className = 'dialog-type-option-copy';
                copyNode.textContent = entry.copy;

                button.appendChild(titleNode);
                button.appendChild(copyNode);
                button.addEventListener('click', () => {
                    selectedType = entry.type;
                    applyTypeLabels();
                });

                typeButtons.push(button);
                typeGrid.appendChild(button);
            });

            typeField.appendChild(typeLabel);
            typeField.appendChild(typeNote);
            typeField.appendChild(typeGrid);

            const secretField = document.createElement('label');
            secretField.className = 'dialog-field';
            const secretLabel = document.createElement('span');
            const secretInput = document.createElement('input');
            secretInput.className = 'dialog-input';
            secretInput.type = 'password';
            secretInput.autocomplete = 'off';

            const confirmField = document.createElement('label');
            confirmField.className = 'dialog-field';
            const confirmLabel = document.createElement('span');
            const confirmInput = document.createElement('input');
            confirmInput.className = 'dialog-input';
            confirmInput.type = 'password';
            confirmInput.autocomplete = 'off';

            const helper = document.createElement('div');
            helper.className = 'dialog-helper';

            const applyTypeLabels = () => {
                const type = selectedType;
                const fieldLabel = getCredentialFieldLabel(type);
                const placeholder = getCredentialPlaceholder(type);
                const maxLength = getCredentialMaxLength(type);

                typeButtons.forEach((button) => {
                    button.classList.toggle('active', button.dataset.type === type);
                });
                secretLabel.textContent = fieldLabel;
                confirmLabel.textContent = `Confirm ${fieldLabel}`;
                secretInput.placeholder = placeholder;
                confirmInput.placeholder = placeholder;
                secretInput.maxLength = maxLength;
                confirmInput.maxLength = maxLength;
                secretInput.inputMode = type === 'password' ? 'text' : 'numeric';
                confirmInput.inputMode = type === 'password' ? 'text' : 'numeric';
                helper.textContent = type === 'password'
                    ? 'Passwords can be up to 32 characters.'
                    : `Use exactly ${maxLength} digits.`;
            };

            applyTypeLabels();

            secretField.appendChild(secretLabel);
            secretField.appendChild(secretInput);
            confirmField.appendChild(confirmLabel);
            confirmField.appendChild(confirmInput);

            const actionRow = document.createElement('div');
            actionRow.className = 'dialog-actions';

            const saveButton = document.createElement('button');
            saveButton.className = 'picker-action';
            saveButton.type = 'submit';
            saveButton.textContent = 'Save';

            const cancelButton = document.createElement('button');
            cancelButton.className = 'picker-cancel dialog-inline-cancel';
            cancelButton.type = 'button';
            cancelButton.textContent = 'Cancel';

            const closeDialog = (value) => {
                dialog.backdrop.remove();
                resolve(value);
            };

            cancelButton.addEventListener('click', () => {
                closeDialog(null);
            });

            form.addEventListener('submit', (event) => {
                event.preventDefault();

                const type = selectedType;
                const secret = secretInput.value.trim();
                const confirm = confirmInput.value.trim();
                const error = validateCredential(type, secret);
                if (error) {
                    dialog.setError(error);
                    return;
                }

                if (secret !== confirm) {
                    dialog.setError('The entries do not match.');
                    return;
                }

                closeDialog({
                    type,
                    secret
                });
            });

            actionRow.appendChild(saveButton);
            actionRow.appendChild(cancelButton);
            form.appendChild(typeField);
            form.appendChild(secretField);
            form.appendChild(confirmField);
            form.appendChild(helper);
            form.appendChild(actionRow);
            dialog.box.appendChild(form);
            document.body.appendChild(dialog.backdrop);
            secretInput.focus();
        });
    }

    function showSecretEntryDialog(title, description, type) {
        return new Promise((resolve) => {
            const dialog = createDialogShell(title, description);
            const form = document.createElement('form');
            form.className = 'dialog-form';

            const secretField = document.createElement('label');
            secretField.className = 'dialog-field';
            const secretLabel = document.createElement('span');
            secretLabel.textContent = getCredentialFieldLabel(type);
            const secretInput = document.createElement('input');
            secretInput.className = 'dialog-input';
            secretInput.type = 'password';
            secretInput.autocomplete = 'off';
            secretInput.placeholder = `${getCredentialPlaceholder(type)} or master credential`;
            secretInput.maxLength = 32;
            secretInput.inputMode = appState.settings.masterCredentialType === 'password' || type === 'password'
                ? 'text'
                : 'numeric';
            secretField.appendChild(secretLabel);
            secretField.appendChild(secretInput);

            const helper = document.createElement('div');
            helper.className = 'dialog-helper';
            helper.textContent = type === 'password'
                ? 'The master password also works here.'
                : 'The master credential also works here.';

            const actionRow = document.createElement('div');
            actionRow.className = 'dialog-actions';

            const unlockButton = document.createElement('button');
            unlockButton.className = 'picker-action';
            unlockButton.type = 'submit';
            unlockButton.textContent = 'Continue';

            const cancelButton = document.createElement('button');
            cancelButton.className = 'picker-cancel dialog-inline-cancel';
            cancelButton.type = 'button';
            cancelButton.textContent = 'Cancel';

            const closeDialog = (value) => {
                dialog.backdrop.remove();
                resolve(value);
            };

            cancelButton.addEventListener('click', () => {
                closeDialog(null);
            });

            form.addEventListener('submit', (event) => {
                event.preventDefault();
                const secret = secretInput.value.trim();
                if (!secret) {
                    dialog.setError(`Enter a ${getCredentialFieldLabel(type).toLowerCase()}.`);
                    return;
                }

                closeDialog(secret);
            });

            actionRow.appendChild(unlockButton);
            actionRow.appendChild(cancelButton);
            form.appendChild(secretField);
            form.appendChild(helper);
            form.appendChild(actionRow);
            dialog.box.appendChild(form);
            document.body.appendChild(dialog.backdrop);
            secretInput.focus();
        });
    }

    async function ensureMasterCredentialConfigured() {
        if (hasMasterCredential()) {
            return true;
        }

        const masterSetup = await showCredentialSetupDialog(
            'Set Master Pin',
            'Choose the master override you want to use for locked folders.',
            'pin4'
        );

        if (!masterSetup) {
            return false;
        }

        await saveState({
            ...appState,
            settings: {
                ...appState.settings,
                masterCredentialType: masterSetup.type,
                masterCredentialHash: await hashSecret(masterSetup.secret),
                allowDeleteLockedFoldersWithoutPin: appState.settings.allowDeleteLockedFoldersWithoutPin
            }
        });

        showToast('Master pin saved.');
        return true;
    }

    async function requestFolderAccess(folder, actionLabel, options) {
        const accessOptions = options && typeof options === 'object' ? options : {};
        const alwaysPrompt = Boolean(accessOptions.alwaysPrompt);
        const keepUnlocked = accessOptions.keepUnlocked !== false;
        const lockType = getFolderLockType(folder);
        const lockHash = getFolderLockHash(folder);

        if (!hasFolderLock(folder)) {
            return true;
        }

        if (!alwaysPrompt && isFolderUnlocked(folder.id)) {
            return true;
        }

        if (!lockType || !lockHash) {
            showToast('Set the master pin first.');
            return false;
        }

        const enteredSecret = await showSecretEntryDialog(
            `${actionLabel} "${folder.name}"`,
            'Enter the folder credential or the master credential.',
            lockType
        );

        if (enteredSecret === null) {
            return false;
        }

        const matchesFolder = !isFolderUsingMasterLock(folder)
            ? await secretMatchesHash(enteredSecret, lockHash)
            : false;
        const matchesMaster = hasMasterCredential()
            ? await secretMatchesHash(enteredSecret, appState.settings.masterCredentialHash)
            : false;

        if (!matchesFolder && !matchesMaster) {
            showToast('That code or password did not match.');
            return false;
        }

        if (keepUnlocked) {
            unlockedFolderIds.add(folder.id);
        }

        return true;
    }

    async function saveFolderLock(folderId, type, secret) {
        const nextFolders = appState.folders.map((folder) => {
            if (folder.id !== folderId) {
                return folder;
            }

            return {
                ...folder,
                collapsed: true,
                lock: {
                    type,
                    hash: '',
                    useMasterCredential: false
                }
            };
        });

        const hash = await hashSecret(secret);
        const finalFolders = nextFolders.map((folder) => {
            if (folder.id !== folderId || !folder.lock) {
                return folder;
            }

            return {
                ...folder,
                collapsed: true,
                lock: {
                    type,
                    hash,
                    useMasterCredential: false
                }
            };
        });

        unlockedFolderIds.delete(folderId);
        await persistFolders(finalFolders);
    }

    async function saveFolderLockWithMaster(folderId) {
        const nextFolders = appState.folders.map((folder) => {
            if (folder.id !== folderId) {
                return folder;
            }

            return {
                ...folder,
                collapsed: true,
                lock: {
                    type: appState.settings.masterCredentialType,
                    hash: '',
                    useMasterCredential: true
                }
            };
        });

        unlockedFolderIds.delete(folderId);
        await persistFolders(nextFolders);
    }

    async function removeFolderLock(folderId) {
        const nextFolders = appState.folders.map((folder) => {
            if (folder.id !== folderId) {
                return folder;
            }

            return {
                ...folder,
                lock: null
            };
        });

        unlockedFolderIds.delete(folderId);
        await persistFolders(nextFolders);
    }

    async function handleFolderLockAction(folderId) {
        const folder = getFolderById(folderId);
        if (!folder) {
            return;
        }

        if (hasLockedDescendant(folder.id)) {
            showToast(`${getFolderDisplayName(folder)} cannot change while a child section is locked.`);
            return;
        }

        if (!hasFolderLock(folder)) {
            const ready = await ensureMasterCredentialConfigured();
            if (!ready) {
                return;
            }

            if (appState.settings.useMasterCredentialForNewLocks) {
                await saveFolderLockWithMaster(folder.id);
                showToast(`Locked "${folder.name}" with the master pin.`);
                return;
            }

            const lockSetup = await showCredentialSetupDialog(
                `Lock "${folder.name}"`,
                `Choose a ${getFolderLabel(folder).toLowerCase()} pin or password. The master credential will always work as an override.`,
                'pin4'
            );

            if (!lockSetup) {
                return;
            }

            await saveFolderLock(folder.id, lockSetup.type, lockSetup.secret);
            showToast(`Locked "${folder.name}".`);
            return;
        }

        const verified = await requestFolderAccess(folder, 'Manage', {
            alwaysPrompt: true,
            keepUnlocked: false
        });
        if (!verified) {
            return;
        }

        const action = await showChoiceDialog(
            `Manage "${folder.name}"`,
            `Choose what to do with this locked ${getFolderLabel(folder).toLowerCase()}.`,
            [
                { label: 'Change Lock', value: 'change' },
                { label: 'Remove Lock', value: 'remove' }
            ]
        );

        if (!action) {
            return;
        }

        if (action === 'remove') {
            await removeFolderLock(folder.id);
            showToast(`Removed lock from "${folder.name}".`);
            return;
        }

        const updatedLock = await showCredentialSetupDialog(
            `Change "${folder.name}"`,
            `Choose the new pin or password for this ${getFolderLabel(folder).toLowerCase()}.`,
            getFolderLockType(folder)
        );

        if (!updatedLock) {
            return;
        }

        await saveFolderLock(folder.id, updatedLock.type, updatedLock.secret);
        showToast(`Updated the lock on "${folder.name}".`);
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ SIDEBAR MARKUP AND STYLING                               ║
    ╚════════════════════════════════════════════════════════════╝
    */

    function buildSidebar() {
        const iconUrl = storageAvailable() && chrome.runtime
            ? chrome.runtime.getURL('icon.png')
            : '';

        sidebar = document.createElement('div');
        sidebar.id = 'folder-sidebar';
        sidebar.innerHTML = `
            <div id="panel-titlebar">
                <div id="panel-brand">
                    <img id="panel-logo" src="${iconUrl}" alt="Chimera Folders logo">
                    <div id="panel-brand-copy">
                        <strong>Chimera Folders</strong>
                        <span>Stremio File Explorer</span>
                    </div>
                </div>
                <button id="window-close-button" class="panel-close-btn" type="button" title="Close folders" aria-label="Close folders">X</button>
            </div>
            <div id="sidebar-top">
                <div class="sidebar-button-row sidebar-link-row">
                    <button id="github-button" class="fancy-btn icon-btn" title="GitHub" aria-label="Open GitHub">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 2C6.48 2 2 6.59 2 12.24c0 4.52 2.87 8.35 6.84 9.7.5.1.66-.22.66-.49 0-.24-.01-1.04-.01-1.88-2.78.62-3.37-1.21-3.37-1.21-.45-1.19-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .08 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.04 1.03-2.76-.11-.26-.45-1.3.1-2.72 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 6.84c.85 0 1.71.12 2.51.36 1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.21 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.93-2.34 4.8-4.57 5.05.36.32.68.95.68 1.92 0 1.39-.01 2.51-.01 2.85 0 .27.18.59.67.49A10.29 10.29 0 0 0 22 12.24C22 6.59 17.52 2 12 2z"></path>
                        </svg>
                    </button>
                    <button id="discord-button" class="fancy-btn icon-btn" title="Discord" aria-label="Open Discord">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M20.32 4.37a16.72 16.72 0 0 0-4.15-1.29l-.2.4c-.24.47-.51 1.09-.7 1.58a15.38 15.38 0 0 0-4.54 0 11.18 11.18 0 0 0-.71-1.58l-.2-.4a16.6 16.6 0 0 0-4.15 1.29C3.05 8.36 2.34 12.26 2.7 16.1a16.88 16.88 0 0 0 5.09 2.59l.42-.68c.32-.52.61-1.07.86-1.64a10.78 10.78 0 0 1-1.35-.66l.33-.24.22-.18a11.8 11.8 0 0 0 10.46 0 9.7 9.7 0 0 0 .56.42 10.6 10.6 0 0 1-1.36.67c.25.57.54 1.12.87 1.64l.41.68a16.77 16.77 0 0 0 5.09-2.59c.43-4.45-.74-8.31-3.98-11.73zM9.55 13.73c-1.02 0-1.86-.93-1.86-2.07s.82-2.07 1.86-2.07c1.05 0 1.88.94 1.86 2.07 0 1.14-.82 2.07-1.86 2.07zm4.9 0c-1.03 0-1.86-.93-1.86-2.07s.82-2.07 1.86-2.07 1.88.94 1.86 2.07c0 1.14-.82 2.07-1.86 2.07z"></path>
                        </svg>
                    </button>
                    <button id="settings-button" class="fancy-btn icon-btn" title="Settings" aria-label="Open settings">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M19.14 12.94a7.43 7.43 0 0 0 .05-.94 7.43 7.43 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.49.49 0 0 0-.6-.22l-2.39.96a7.45 7.45 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54a7.45 7.45 0 0 0-1.63.94l-2.39-.96a.49.49 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58a7.43 7.43 0 0 0-.05.94 7.43 7.43 0 0 0 .05.94L2.83 14.16a.5.5 0 0 0-.12.64l1.92 3.32a.49.49 0 0 0 .6.22l2.39-.96c.5.39 1.05.7 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.8a.5.5 0 0 0 .49-.42l.36-2.54c.58-.24 1.13-.55 1.63-.94l2.39.96a.49.49 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64zm-7.14 2.56A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z"></path>
                        </svg>
                    </button>
                    <button id="minimize-button" class="fancy-btn icon-btn" title="Pin sidebar" aria-label="Pin sidebar">
                        <span class="icon-glyph" aria-hidden="true">&#128204;</span>
                    </button>
                </div>
                <div class="sidebar-button-row sidebar-action-row">
                    <button id="home-button" class="fancy-btn text-btn">Home</button>
                    <button id="add-button" class="fancy-btn text-btn">Add</button>
                    <button id="edit-button" class="fancy-btn text-btn">Edit</button>
                </div>
            </div>
            <div id="sidebar-content">
                <h3>My Folders</h3>
                <input id="folder-search" type="text" placeholder="Search folders or titles...">
                <div id="folder-controls">
                    <button id="create-profile" class="create-folder-btn secondary-create-btn">Create Profile</button>
                    <button id="create-folder" class="create-folder-btn">Create Folder</button>
                </div>
                <ul id="folder-list"></ul>
                <div id="sidebar-footer">
                    <button id="close-button" class="fancy-btn text-btn close-text-btn" type="button" title="Close folders" aria-label="Close folders">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(sidebar);
        folderList = sidebar.querySelector('#folder-list');
        folderNameInput = null;
        searchInput = sidebar.querySelector('#folder-search');
        editToggleButton = sidebar.querySelector('#edit-button');

        launcherButton = document.createElement('button');
        launcherButton.id = 'folder-launcher';
        launcherButton.type = 'button';
        launcherButton.innerHTML = `
            <img src="${iconUrl}" alt="">
            <span>Chimera Folders</span>
        `;
        document.body.appendChild(launcherButton);
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #folder-sidebar {
                position: fixed;
                top: 70px;
                width: 280px;
                height: 90%;
                background: #1c1c1c;
                border: 1px solid rgba(123, 97, 255, 0.18);
                padding: 15px;
                z-index: 10000;
                overflow-y: auto;
                box-shadow: 3px 0 10px rgba(0, 0, 0, 0.5);
                font-family: Arial, sans-serif;
                border-radius: 10px;
                transition: transform 0.3s, opacity 0.2s;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            #folder-sidebar.edit-mode .folder-header,
            #folder-sidebar.edit-mode .folder-item {
                cursor: grab;
            }

            #folder-sidebar.layout-sidebar-left {
                left: 0;
                right: auto;
                border-left: none;
                border-radius: 0 10px 10px 0;
            }

            #folder-sidebar.layout-sidebar-right {
                left: auto;
                right: 0;
                border-right: none;
                border-radius: 10px 0 0 10px;
            }

            #folder-sidebar.layout-folder-view {
                top: 96px;
                left: 88px;
                width: min(440px, calc(100vw - 32px));
                height: min(78vh, 760px);
                background:
                    linear-gradient(180deg, rgba(24, 24, 44, 0.98), rgba(28, 28, 28, 0.96)),
                    #1c1c1c;
                border: 1px solid rgba(123, 97, 255, 0.35);
                border-radius: 18px;
                box-shadow: 0 28px 70px rgba(0, 0, 0, 0.5);
            }

            #panel-titlebar {
                display: none;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin: -15px -15px 14px;
                padding: 14px 16px;
                background:
                    linear-gradient(180deg, rgba(123, 97, 255, 0.22), rgba(0, 64, 255, 0.08)),
                    rgba(255, 255, 255, 0.03);
                border-bottom: 1px solid rgba(123, 97, 255, 0.2);
                border-radius: 18px 18px 0 0;
                cursor: move;
                user-select: none;
            }

            #folder-sidebar.layout-folder-view #panel-titlebar {
                display: flex;
            }

            #panel-brand {
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 0;
            }

            #panel-logo {
                width: 28px;
                height: 28px;
                border-radius: 7px;
                flex: 0 0 auto;
            }

            #panel-brand-copy {
                display: flex;
                flex-direction: column;
                min-width: 0;
            }

            #panel-brand-copy strong {
                color: #fff;
                font-size: 14px;
                line-height: 1.1;
            }

            #panel-brand-copy span {
                color: #b7b7cc;
                font-size: 11px;
                line-height: 1.1;
            }

            #sidebar-top {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 15px;
            }

            .sidebar-button-row {
                display: grid;
                gap: var(--sidebar-btn-gap, 8px);
            }

            .sidebar-link-row {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }

            .sidebar-action-row {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            #folder-sidebar.layout-folder-view #sidebar-top {
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(123, 97, 255, 0.14);
            }

            #folder-sidebar.layout-folder-view .sidebar-link-row {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            #window-close-button {
                display: none;
            }

            #folder-sidebar.layout-folder-view #window-close-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            #folder-sidebar.layout-folder-view #sidebar-footer,
            #folder-sidebar.layout-folder-view #minimize-button {
                display: none;
            }

            #sidebar-content {
                display: flex;
                flex: 1;
                flex-direction: column;
                min-height: 0;
            }

            #sidebar-content h3 {
                margin: 0 0 10px;
                color: #fff;
            }

            #folder-sidebar.layout-folder-view #sidebar-content h3 {
                margin-top: 2px;
            }

            #folder-controls {
                margin-top: 10px;
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
            }

            #folder-search {
                width: 100%;
                margin-bottom: 8px;
                padding: 8px;
                background: #333;
                border: 1px solid #555;
                color: #fff;
                border-radius: 6px;
                box-sizing: border-box;
            }

            #folder-list {
                margin-top: 15px;
                list-style: none;
                padding: 0;
                flex: 1;
                min-height: 0;
                overflow-y: auto;
            }

            #sidebar-footer {
                margin-top: auto;
                padding-top: 12px;
            }

            .fancy-btn {
                background: linear-gradient(to bottom, #7b61ff, #0040ff);
                border: none;
                padding: 8px 12px;
                border-radius: 8px;
                cursor: pointer;
                color: #fff;
                font-weight: bold;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 36px;
                width: 100%;
                min-width: 0;
                white-space: nowrap;
                line-height: 1;
                text-align: center;
            }

            .fancy-btn:hover,
            .create-folder-btn:hover,
            .picker-action:hover,
            .picker-cancel:hover {
                background: linear-gradient(to bottom, #8b71ff, #0050ff);
                transform: scale(1.05);
                box-shadow: 0 0 8px #7b61ff;
            }

            .fancy-btn.active-mode {
                box-shadow: 0 0 10px rgba(123, 97, 255, 0.85);
            }

            .text-btn {
                padding-inline: 10px;
            }

            .close-text-btn {
                width: 100%;
                min-width: 100%;
            }

            .icon-btn {
                padding: 8px 0;
            }

            .icon-btn svg {
                width: 18px;
                height: 18px;
                fill: currentColor;
            }

            .icon-glyph {
                font-size: 17px;
                line-height: 1;
            }

            .panel-close-btn {
                min-width: 34px;
                height: 34px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.06);
                color: #fff;
                cursor: pointer;
                font-weight: 700;
                transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
            }

            .panel-close-btn:hover {
                background: rgba(123, 97, 255, 0.18);
                border-color: rgba(123, 97, 255, 0.5);
                transform: scale(1.04);
            }

            .create-folder-btn,
            .picker-action,
            .picker-cancel {
                width: 100%;
                padding: 8px;
                border-radius: 8px;
                background: linear-gradient(to bottom, #7b61ff, #0040ff);
                color: #fff;
                font-weight: bold;
                border: none;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .picker-cancel {
                background: linear-gradient(to bottom, #6d6d6d, #474747);
                margin-top: 10px;
            }

            #folder-sidebar.layout-sidebar-left.minimized {
                transform: translateX(-260px);
            }

            #folder-sidebar.layout-sidebar-left.minimized:hover {
                transform: translateX(0);
            }

            #folder-sidebar.layout-sidebar-right.minimized {
                transform: translateX(260px);
            }

            #folder-sidebar.layout-sidebar-right.minimized:hover {
                transform: translateX(0);
            }

            #folder-sidebar.layout-sidebar-left.playback-hidden,
            #folder-sidebar.layout-sidebar-left.playback-hidden:hover {
                transform: translateX(-320px);
                opacity: 0;
                pointer-events: none;
            }

            #folder-sidebar.layout-sidebar-right.playback-hidden,
            #folder-sidebar.layout-sidebar-right.playback-hidden:hover {
                transform: translateX(320px);
                opacity: 0;
                pointer-events: none;
            }

            #folder-sidebar.layout-folder-view.playback-hidden,
            #folder-sidebar.layout-folder-view.playback-hidden:hover,
            #folder-sidebar.panel-closed {
                opacity: 0;
                pointer-events: none;
                transform: scale(0.96);
            }

            #folder-launcher {
                position: fixed;
                top: 84px;
                left: 58px;
                display: none;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                border: 1px solid rgba(123, 97, 255, 0.28);
                border-radius: 14px;
                background:
                    linear-gradient(180deg, rgba(123, 97, 255, 0.22), rgba(0, 64, 255, 0.18)),
                    rgba(28, 28, 28, 0.94);
                color: #fff;
                cursor: grab;
                box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
                user-select: none;
                touch-action: none;
                z-index: 10001;
            }

            #folder-launcher.visible {
                display: inline-flex;
            }

            #folder-launcher.dragging {
                cursor: grabbing;
            }

            #folder-launcher img {
                width: 22px;
                height: 22px;
                border-radius: 6px;
            }

            #folder-launcher.layout-sidebar-right {
                left: auto;
                right: 16px;
            }

            #folder-launcher.layout-folder-view {
                top: 20px;
                left: 20px;
                right: auto;
            }

            .folder-row {
                margin-bottom: 10px;
                --folder-count-offset: 0px;
                --folder-count-outset: 0px;
            }

            .folder-row.dragging,
            .folder-item.dragging {
                opacity: 0.45;
            }

            .folder-row.drop-target .folder-header,
            .folder-item.drop-target,
            .folder-items.drop-target {
                box-shadow: inset 0 0 0 1px #7b61ff, 0 0 8px rgba(123, 97, 255, 0.35);
            }

            .folder-header {
                display: flex;
                flex-direction: column;
                align-items: stretch;
                background: #333;
                color: #fff;
                padding: 7px 8px;
                border-radius: 5px;
                gap: 8px;
            }

            .folder-top {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: 6px;
            }

            .folder-left {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                min-width: 0;
                flex: 1;
                width: 100%;
                position: relative;
                box-sizing: border-box;
                padding-right: 0;
            }

            .folder-title {
                flex: 1;
                min-width: 0;
                white-space: normal;
                overflow-wrap: anywhere;
                word-break: break-word;
                line-height: 1.25;
            }

            .folder-title.locked-title {
                color: #d9d9f2;
            }

            .folder-count {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                min-width: 24px;
                padding: 2px 0;
                border-radius: 999px;
                background: rgba(123, 97, 255, 0.28);
                color: #fff;
                font-size: 12px;
                text-align: center;
                font-variant-numeric: tabular-nums;
                line-height: 1;
                position: absolute;
                right: calc(var(--folder-count-offset) - var(--folder-count-outset));
                top: 50%;
                transform: translateY(-50%);
            }

            .chevron {
                cursor: pointer;
                color: #fff;
                font-weight: bold;
                width: 12px;
                text-align: center;
                user-select: none;
            }

            .chevron.collapsed {
                transform: none;
            }

            .folder-actions,
            .item-actions {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .folder-actions {
                justify-content: flex-end;
                flex-wrap: wrap;
            }

            .folder-lock-state {
                font-size: 13px;
                flex: 0 0 auto;
            }

            .folder-row.locked-folder .folder-header {
                border: 1px solid rgba(123, 97, 255, 0.18);
            }

            .folder-action,
            .item-action {
                background: transparent;
                border: 1px solid #555;
                color: #fff;
                cursor: pointer;
                border-radius: 5px;
                padding: 2px 6px;
                font-size: 11px;
                white-space: nowrap;
            }

            .folder-action:hover,
            .item-action:hover {
                border-color: #7b61ff;
                color: #fff;
            }

            .folder-items {
                margin-left: 12px;
                margin-top: 2px;
                padding: 4px 4px 2px;
                list-style: none;
                border-radius: 6px;
            }

            .folder-branch {
                display: block;
            }

            .child-folder-list {
                list-style: none;
                margin: 1px 0 0 0;
                padding: 0 0 0 12px;
                border-left: 1px solid rgba(123, 97, 255, 0.16);
            }

            .child-folder-list .folder-row {
                margin-bottom: 4px;
            }

            .child-folder-list .folder-row:last-child {
                margin-bottom: 0;
            }

            .child-folder-list .folder-header {
                padding-top: 5px;
                padding-bottom: 5px;
                gap: 6px;
            }

            .child-folder-list .folder-items {
                margin-top: 1px;
                padding-top: 2px;
                padding-bottom: 1px;
            }

            .folder-row.profile-row > .folder-header {
                box-shadow: inset 0 0 0 1px rgba(123, 97, 255, 0.08);
            }

            .folder-depth-1 {
                --folder-count-offset: -12px;
                margin-left: 2px;
            }

            .folder-depth-2,
            .folder-depth-3 {
                --folder-count-offset: -24px;
                margin-left: 4px;
            }

            #folder-sidebar.layout-folder-view .folder-row {
                padding: 6px 0 8px;
                border-radius: 0;
                background: transparent;
                border: none;
                overflow: visible;
                --folder-count-outset: 8px;
            }

            #folder-sidebar.layout-folder-view .folder-header {
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(123, 97, 255, 0.22);
                border-radius: 4px;
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
            }

            #folder-sidebar.layout-folder-view .folder-items {
                margin-left: 14px;
                border-left: 1px solid rgba(123, 97, 255, 0.16);
                padding: 3px 0 0 10px;
                border-radius: 0;
                background: transparent;
            }

            #folder-sidebar.layout-folder-view .child-folder-list {
                border-left-color: rgba(123, 97, 255, 0.14);
            }

            #folder-sidebar.layout-folder-view .folder-count {
                min-height: 16px;
                padding: 1px 6px;
                border-radius: 4px;
                border: 1px solid rgba(123, 97, 255, 0.18);
                background: rgba(123, 97, 255, 0.18);
            }

            .folder-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
                padding: 5px 6px;
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.03);
            }

            #folder-sidebar.layout-folder-view .folder-item {
                position: relative;
                background: rgba(255, 255, 255, 0.035);
                border: 1px solid rgba(123, 97, 255, 0.16);
                border-radius: 4px;
            }

            #folder-sidebar.layout-folder-view .folder-item::before {
                content: '';
                position: absolute;
                top: 50%;
                left: -15px;
                width: 13px;
                border-top: 1px solid rgba(123, 97, 255, 0.22);
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact {
                width: min(360px, calc(100vw - 32px));
                height: min(68vh, 620px);
                padding: 11px;
                border-radius: 15px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact #panel-titlebar {
                gap: 10px;
                margin: -11px -11px 10px;
                padding: 10px 12px;
                border-radius: 15px 15px 0 0;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact #panel-logo {
                width: 22px;
                height: 22px;
                border-radius: 6px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact #panel-brand {
                gap: 10px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact #panel-brand-copy strong {
                font-size: 12px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact #panel-brand-copy span {
                font-size: 9px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact #window-close-button {
                min-width: 28px;
                height: 28px;
                border-radius: 8px;
                font-size: 13px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact #sidebar-top {
                gap: 6px;
                margin-bottom: 10px;
                padding-bottom: 8px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .sidebar-button-row {
                gap: 6px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .fancy-btn {
                min-height: 30px;
                padding: 6px 9px;
                border-radius: 7px;
                font-size: 13px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .icon-btn svg {
                width: 15px;
                height: 15px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .icon-glyph {
                font-size: 14px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact #sidebar-content h3 {
                margin: 0 0 8px;
                font-size: 18px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact #folder-search {
                margin-bottom: 6px;
                padding: 6px 7px;
                font-size: 13px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact #folder-controls {
                margin-top: 8px;
                gap: 6px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .create-folder-btn {
                padding: 6px 8px;
                font-size: 13px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact #folder-list {
                margin-top: 8px;
                width: 100%;
                zoom: 0.82;
                transform-origin: top left;
                box-sizing: border-box;
                padding-right: 0;
                overflow-x: hidden;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .folder-row {
                padding: 4px 0 5px;
                border-radius: 0;
                max-width: 100%;
                box-sizing: border-box;
                margin-right: 0;
                overflow: hidden;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .folder-header {
                padding: 4px 6px;
                gap: 4px;
                border-radius: 4px;
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .folder-title {
                font-size: 12px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .folder-count {
                width: 22px;
                min-width: 22px;
                padding: 1px 0;
                font-size: 10px;
                min-height: 14px;
                border-radius: 4px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .folder-items {
                margin-left: 7px;
                padding-left: 6px;
                max-width: 100%;
                box-sizing: border-box;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .folder-item {
                padding: 3px 4px;
                border-radius: 4px;
                gap: 5px;
                max-width: 100%;
                box-sizing: border-box;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .folder-item::before {
                left: -7px;
                width: 5px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .child-folder-list {
                padding-left: 8px;
                margin-top: 0;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .folder-item-link {
                font-size: 13px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .folder-action,
            #folder-sidebar.layout-folder-view.layout-folder-view-compact .item-action {
                padding: 2px 5px;
                font-size: 10px;
            }

            #folder-sidebar.layout-folder-view.layout-folder-view-compact .empty-state,
            #folder-sidebar.layout-folder-view.layout-folder-view-compact .folder-drop-note {
                font-size: 11px;
            }

            .item-left {
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 0;
                flex: 1;
            }

            .drag-handle {
                color: #8e8eb6;
                font-size: 12px;
                user-select: none;
            }

            .folder-item-link {
                color: #00bfff;
                text-decoration: none;
                font-size: 14px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex: 1;
            }

            .empty-state,
            .folder-drop-note {
                color: #b7b7cc;
                font-size: 12px;
                padding: 4px 4px 2px;
            }

            .picker-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
            }

            .picker-box {
                background: #222;
                padding: 20px;
                border-radius: 10px;
                min-width: 300px;
                max-width: min(420px, calc(100vw - 32px));
                color: #fff;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
            }

            .dialog-box {
                border: 1px solid rgba(123, 97, 255, 0.24);
            }

            .picker-box h3 {
                margin-top: 0;
                margin-bottom: 14px;
            }

            .dialog-description {
                margin: 0 0 14px;
                color: #b7b7cc;
                line-height: 1.45;
            }

            .dialog-form {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .dialog-field {
                display: flex;
                flex-direction: column;
                gap: 6px;
                font-size: 13px;
            }

            .dialog-field span {
                color: #d7d7eb;
                font-weight: 600;
            }

            .dialog-checkbox-row {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 13px;
                padding: 10px 12px;
                border-radius: 8px;
                border: 1px solid #555;
                background: #303030;
                cursor: pointer;
            }

            .dialog-checkbox-row input {
                width: 16px;
                height: 16px;
                margin: 0;
                flex: 0 0 auto;
                accent-color: #7b61ff;
            }

            .dialog-checkbox-row span {
                color: #fff;
                font-weight: 600;
            }

            .dialog-type-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 10px;
                padding-top: 2px;
                padding-inline: 1px;
            }

            .dialog-type-option {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
                width: 100%;
                padding: 12px;
                border-radius: 10px;
                border: 1px solid #555;
                background: #303030;
                color: #fff;
                cursor: pointer;
                text-align: left;
                transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
            }

            .dialog-type-option:hover {
                border-color: rgba(123, 97, 255, 0.55);
                box-shadow: 0 0 10px rgba(123, 97, 255, 0.18);
                transform: translateY(-1px);
            }

            .dialog-type-option.active {
                border-color: rgba(123, 97, 255, 0.82);
                background:
                    linear-gradient(180deg, rgba(123, 97, 255, 0.18), rgba(0, 64, 255, 0.12)),
                    #303030;
                box-shadow: 0 0 12px rgba(123, 97, 255, 0.28);
            }

            .dialog-type-option-title {
                font-size: 13px;
                font-weight: 700;
                line-height: 1.2;
            }

            .dialog-type-option-copy {
                color: #b7b7cc;
                font-size: 11px;
                line-height: 1.35;
            }

            .dialog-input,
            .dialog-select {
                width: 100%;
                padding: 10px 12px;
                border-radius: 8px;
                border: 1px solid #555;
                background: #303030;
                color: #fff;
                box-sizing: border-box;
            }

            .dialog-helper {
                color: #b7b7cc;
                font-size: 12px;
                line-height: 1.45;
            }

            .dialog-type-note {
                margin-top: -2px;
            }

            .dialog-error {
                display: none;
                margin-bottom: 12px;
                padding: 10px 12px;
                border-radius: 8px;
                background: rgba(154, 43, 43, 0.18);
                border: 1px solid rgba(230, 92, 92, 0.35);
                color: #fff;
                font-size: 12px;
                line-height: 1.4;
            }

            .dialog-error.visible {
                display: block;
            }

            .dialog-actions {
                display: flex;
                gap: 10px;
                margin-top: 4px;
            }

            .dialog-inline-cancel {
                margin-top: 0;
            }

            .picker-button-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .add-picker-box {
                display: flex;
                flex-direction: column;
                width: fit-content;
                min-width: min(360px, calc(100vw - 48px));
                max-width: calc(100vw - 48px);
            }

            .add-picker-grid {
                --profile-card-width: 260px;
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: flex-start;
                gap: 18px;
                width: 100%;
            }

            .add-picker-card {
                display: flex;
                flex-direction: column;
                gap: 12px;
                flex: 0 1 var(--profile-card-width);
                width: min(100%, var(--profile-card-width));
                max-width: var(--profile-card-width);
                padding: 14px;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(123, 97, 255, 0.18);
                box-shadow: 0 16px 30px rgba(0, 0, 0, 0.24);
            }

            .add-picker-card-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
            }

            .add-picker-card-title {
                margin: 0;
                font-size: 1rem;
                line-height: 1.25;
                overflow-wrap: anywhere;
                word-break: break-word;
            }

            .add-picker-card-close {
                flex: 0 0 auto;
                width: 28px;
                height: 28px;
                border-radius: 8px;
                border: 1px solid rgba(123, 97, 255, 0.24);
                background: rgba(255, 255, 255, 0.04);
                color: #fff;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
            }

            .add-picker-card-close:hover {
                background: rgba(123, 97, 255, 0.18);
                border-color: rgba(123, 97, 255, 0.45);
                transform: translateY(-1px);
            }

            .add-picker-card-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .add-picker-action {
                min-height: 54px;
                white-space: normal;
                text-align: left;
                line-height: 1.25;
            }

            .add-picker-action-label {
                display: block;
                width: 100%;
            }

            .add-picker-action-type {
                display: block;
                margin-bottom: 3px;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.78);
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }

            .add-picker-action-name {
                display: block;
                font-size: 15px;
                font-weight: 700;
                overflow-wrap: anywhere;
                word-break: break-word;
            }

            .add-picker-empty {
                width: min(100%, 360px);
                max-width: 360px;
                margin: 0 auto;
                padding: 10px 12px;
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: #b7b7cc;
                font-size: 13px;
                line-height: 1.45;
                text-align: center;
                overflow-wrap: anywhere;
                word-break: break-word;
            }
        `;

        document.head.appendChild(style);
    }

    function getLayoutMode() {
        return appState.settings.layoutMode;
    }

    function isCompactFolderViewLayout() {
        return getLayoutMode() === 'compact-folder-view';
    }

    function isFolderViewLayout() {
        return getLayoutMode() === 'folder-view' || isCompactFolderViewLayout();
    }

    function applyWindowPosition() {
        if (!sidebar || !isFolderViewLayout()) {
            return;
        }

        sidebar.style.left = `${windowPosition.left}px`;
        sidebar.style.top = `${windowPosition.top}px`;
        sidebar.style.right = 'auto';
    }

    function applyLauncherMode() {
        if (!launcherButton) {
            return;
        }

        launcherButton.classList.remove('layout-sidebar-left', 'layout-sidebar-right', 'layout-folder-view', 'layout-folder-view-compact');

        if (isCompactFolderViewLayout()) {
            launcherButton.classList.add('layout-folder-view', 'layout-folder-view-compact');
            return;
        }

        launcherButton.classList.add(`layout-${getLayoutMode()}`);
    }

    function getDefaultLauncherPosition(mode) {
        if (mode === 'sidebar-right') {
            const launcherWidth = launcherButton ? (launcherButton.offsetWidth || 178) : 178;
            return {
                left: Math.max(16, window.innerWidth - launcherWidth - 16),
                top: 84
            };
        }

        if (mode === 'folder-view' || mode === 'compact-folder-view') {
            return {
                left: 20,
                top: 20
            };
        }

        return {
            left: 58,
            top: 84
        };
    }

    function applyLauncherPosition() {
        if (!launcherButton) {
            return;
        }

        const mode = getLayoutMode();
        const defaultPosition = getDefaultLauncherPosition(mode);
        const storedPosition = launcherPositions[mode] || {
            left: defaultPosition.left,
            top: defaultPosition.top,
            custom: false
        };
        const baseLeft = storedPosition.custom && Number.isFinite(storedPosition.left)
            ? storedPosition.left
            : defaultPosition.left;
        const baseTop = storedPosition.custom && Number.isFinite(storedPosition.top)
            ? storedPosition.top
            : defaultPosition.top;
        const launcherWidth = launcherButton.offsetWidth || 178;
        const launcherHeight = launcherButton.offsetHeight || 46;
        const maxLeft = Math.max(16, window.innerWidth - launcherWidth - 16);
        const maxTop = Math.max(16, window.innerHeight - launcherHeight - 16);
        const clampedLeft = Math.max(16, Math.min(baseLeft, maxLeft));
        const clampedTop = Math.max(16, Math.min(baseTop, maxTop));

        if (storedPosition.custom) {
            storedPosition.left = clampedLeft;
            storedPosition.top = clampedTop;
        }

        launcherPositions[mode] = storedPosition;
        launcherButton.style.left = `${clampedLeft}px`;
        launcherButton.style.top = `${clampedTop}px`;
        launcherButton.style.right = 'auto';
    }

    function setLauncherPosition(left, top) {
        if (!launcherButton) {
            return;
        }

        const mode = getLayoutMode();
        const launcherWidth = launcherButton.offsetWidth || 178;
        const launcherHeight = launcherButton.offsetHeight || 46;
        const maxLeft = Math.max(16, window.innerWidth - launcherWidth - 16);
        const maxTop = Math.max(16, window.innerHeight - launcherHeight - 16);

        launcherPositions[mode] = {
            left: Math.max(16, Math.min(left, maxLeft)),
            top: Math.max(16, Math.min(top, maxTop)),
            custom: true
        };

        applyLauncherPosition();
    }

    function applySidebarLayout() {
        if (!sidebar) {
            return;
        }

        sidebar.classList.remove('layout-sidebar-left', 'layout-sidebar-right', 'layout-folder-view', 'layout-folder-view-compact');

        if (isCompactFolderViewLayout()) {
            sidebar.classList.add('layout-folder-view', 'layout-folder-view-compact');
        } else {
            sidebar.classList.add(`layout-${getLayoutMode()}`);
        }

        if (isFolderViewLayout()) {
            applyWindowPosition();
        } else {
            sidebar.style.top = '70px';
            sidebar.style.left = '';
            sidebar.style.right = '';
        }

        applyLauncherMode();
        applyLauncherPosition();
    }

    function setPanelClosed(closed) {
        panelClosed = Boolean(closed);
        applySidebarVisibility();
    }

    function applySidebarVisibility() {
        if (!sidebar) {
            return;
        }

        applySidebarLayout();

        const shouldHideForFullscreen = appState.settings.autoHideFullscreen && sidebarPlaybackHidden;

        sidebar.classList.toggle('minimized', !isFolderViewLayout() && appState.settings.sidebarMinimized);
        sidebar.classList.toggle('playback-hidden', shouldHideForFullscreen);
        sidebar.classList.toggle('panel-closed', panelClosed);
        sidebar.classList.toggle('edit-mode', isEditMode);

        if (launcherButton) {
            launcherButton.classList.toggle('visible', panelClosed && !shouldHideForFullscreen);
        }

        if (editToggleButton) {
            editToggleButton.textContent = isEditMode ? 'Done' : 'Edit';
            editToggleButton.classList.toggle('active-mode', isEditMode);
        }
    }

    function clampWindowPosition(left, top) {
        const maxLeft = Math.max(16, window.innerWidth - sidebar.offsetWidth - 16);
        const maxTop = Math.max(16, window.innerHeight - 120);

        windowPosition.left = Math.max(16, Math.min(left, maxLeft));
        windowPosition.top = Math.max(16, Math.min(top, maxTop));
        applyWindowPosition();
    }

    function beginWindowDrag(event) {
        if (!isFolderViewLayout()) {
            return;
        }

        panelDragState.active = true;
        panelDragState.pointerId = event.pointerId;
        panelDragState.offsetX = event.clientX - windowPosition.left;
        panelDragState.offsetY = event.clientY - windowPosition.top;
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function moveWindowDrag(event) {
        if (!panelDragState.active || !isFolderViewLayout()) {
            return;
        }

        clampWindowPosition(
            event.clientX - panelDragState.offsetX,
            event.clientY - panelDragState.offsetY
        );
    }

    function endWindowDrag() {
        panelDragState.active = false;
        panelDragState.pointerId = null;
    }

    function beginLauncherDrag(event) {
        if (!launcherButton || !panelClosed) {
            return;
        }

        launcherDragState.active = true;
        launcherDragState.pointerId = event.pointerId;
        launcherDragState.offsetX = event.clientX - launcherButton.getBoundingClientRect().left;
        launcherDragState.offsetY = event.clientY - launcherButton.getBoundingClientRect().top;
        launcherDragState.moved = false;
        launcherButton.classList.add('dragging');
        launcherButton.setPointerCapture(event.pointerId);
    }

    function moveLauncherDrag(event) {
        if (!launcherDragState.active || !launcherButton) {
            return;
        }

        const nextLeft = event.clientX - launcherDragState.offsetX;
        const nextTop = event.clientY - launcherDragState.offsetY;

        if (
            !launcherDragState.moved &&
            (
                Math.abs(nextLeft - launcherButton.getBoundingClientRect().left) > 2 ||
                Math.abs(nextTop - launcherButton.getBoundingClientRect().top) > 2
            )
        ) {
            launcherDragState.moved = true;
        }

        setLauncherPosition(nextLeft, nextTop);
    }

    function endLauncherDrag() {
        if (!launcherButton) {
            return;
        }

        if (launcherDragState.active && launcherDragState.moved) {
            launcherDragState.suppressClick = true;
        }

        if (
            launcherDragState.pointerId !== null &&
            launcherButton.hasPointerCapture &&
            launcherButton.hasPointerCapture(launcherDragState.pointerId)
        ) {
            launcherButton.releasePointerCapture(launcherDragState.pointerId);
        }

        launcherDragState.active = false;
        launcherDragState.pointerId = null;
        launcherDragState.offsetX = 0;
        launcherDragState.offsetY = 0;
        launcherDragState.moved = false;
        launcherButton.classList.remove('dragging');
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ PLAYBACK AUTO HIDE                                       ║
    ╚════════════════════════════════════════════════════════════╝
    */

    function getFullscreenElement() {
        return (
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement ||
            null
        );
    }

    function hasFullscreenPlayback() {
        const fullscreenElement = getFullscreenElement();
        if (fullscreenElement) {
            return true;
        }

        return Array.from(document.querySelectorAll('video')).some((video) => {
            return Boolean(video && video.webkitDisplayingFullscreen);
        });
    }

    function updatePlaybackHiddenState() {
        const nextHiddenState = hasFullscreenPlayback();
        if (sidebarPlaybackHidden === nextHiddenState) {
            return;
        }

        sidebarPlaybackHidden = nextHiddenState;
        applySidebarVisibility();
    }

    function bindVideoPlaybackEvents(video) {
        if (!video || trackedVideos.has(video)) {
            return;
        }

        trackedVideos.add(video);

        ['fullscreenchange', 'webkitbeginfullscreen', 'webkitendfullscreen'].forEach((eventName) => {
            video.addEventListener(eventName, updatePlaybackHiddenState);
        });
    }

    function scanPlaybackTargets() {
        document.querySelectorAll('video').forEach((video) => {
            bindVideoPlaybackEvents(video);
        });

        updatePlaybackHiddenState();
    }

    function startPlaybackWatcher() {
        scanPlaybackTargets();

        const playbackObserver = new MutationObserver(() => {
            scanPlaybackTargets();
        });

        playbackObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        ['fullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange'].forEach((eventName) => {
            document.addEventListener(eventName, updatePlaybackHiddenState);
        });

        window.addEventListener('hashchange', () => {
            sidebarPlaybackHidden = false;
            applySidebarVisibility();
            window.setTimeout(scanPlaybackTargets, 200);
        });

        window.setInterval(() => {
            updatePlaybackHiddenState();
        }, 1500);
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ SIDEBAR STATE HELPERS                                    ║
    ╚════════════════════════════════════════════════════════════╝
    */

    async function persistFolders(nextFolders, nextSettings) {
        await saveState({
            ...appState,
            folders: nextFolders,
            settings: nextSettings
                ? {
                    ...appState.settings,
                    ...nextSettings
                }
                : appState.settings
        });
        applySidebarVisibility();
        renderFolders();
    }

    function getFolderById(folderId, folders) {
        const sourceFolders = Array.isArray(folders) ? folders : appState.folders;
        return sourceFolders.find((folder) => folder.id === folderId) || null;
    }

    function getChildFolders(parentId, folders) {
        const sourceFolders = Array.isArray(folders) ? folders : appState.folders;
        return sourceFolders.filter((folder) => {
            return (folder.parentId || null) === (parentId || null);
        });
    }

    function getFolderDepth(folderId, folders) {
        const sourceFolders = Array.isArray(folders) ? folders : appState.folders;
        let depth = 0;
        let currentFolder = getFolderById(folderId, sourceFolders);
        const visited = new Set();

        while (currentFolder && currentFolder.parentId && !visited.has(currentFolder.parentId)) {
            visited.add(currentFolder.parentId);
            depth += 1;
            currentFolder = getFolderById(currentFolder.parentId, sourceFolders);
        }

        return depth;
    }

    function getFolderLabel(folder, folders) {
        if (!folder || folder.parentId === null) {
            return 'Profile';
        }

        const parentFolder = getFolderById(folder.parentId, folders);
        if (parentFolder && parentFolder.parentId !== null) {
            return 'Sub Folder';
        }

        return 'Folder';
    }

    function getFolderDisplayName(folder, folders) {
        return `${getFolderLabel(folder, folders)} "${folder.name}"`;
    }

    function getChildFolderLabel(parentFolder) {
        if (!parentFolder || parentFolder.parentId === null) {
            return 'Folder';
        }

        return 'Sub Folder';
    }

    function getRootProfiles(folders) {
        return getChildFolders(null, folders).filter((folder) => folder.type === 'profile');
    }

    function collectAddTargetsForProfile(profileId, folders, depth) {
        const sourceFolders = Array.isArray(folders) ? folders : appState.folders;
        const nextDepth = Number.isFinite(depth) ? depth : 0;
        const entries = [];

        getChildFolders(profileId, sourceFolders).forEach((folder) => {
            entries.push({
                folder,
                depth: nextDepth
            });

            entries.push(...collectAddTargetsForProfile(folder.id, sourceFolders, nextDepth + 1));
        });

        return entries;
    }

    function getFolderDescendants(folderId, folders) {
        const sourceFolders = Array.isArray(folders) ? folders : appState.folders;
        const descendants = [];
        const stack = getChildFolders(folderId, sourceFolders);

        while (stack.length) {
            const childFolder = stack.shift();
            descendants.push(childFolder);
            stack.unshift(...getChildFolders(childFolder.id, sourceFolders));
        }

        return descendants;
    }

    function hasLockedDescendant(folderId, folders) {
        return getFolderDescendants(folderId, folders).some((folder) => hasFolderLock(folder));
    }

    function findLockedDescendant(folderId, folders) {
        return getFolderDescendants(folderId, folders).find((folder) => hasFolderLock(folder)) || null;
    }

    function findLockedAncestor(folderId, folders) {
        const sourceFolders = Array.isArray(folders) ? folders : appState.folders;
        let currentFolder = getFolderById(folderId, sourceFolders);
        const visited = new Set();

        while (currentFolder && currentFolder.parentId && !visited.has(currentFolder.parentId)) {
            visited.add(currentFolder.parentId);
            currentFolder = getFolderById(currentFolder.parentId, sourceFolders);

            if (currentFolder && hasFolderLock(currentFolder) && !isFolderUnlocked(currentFolder.id)) {
                return currentFolder;
            }
        }

        return null;
    }

    function canEditFolderNode(folder, folders) {
        const lockedDescendant = findLockedDescendant(folder.id, folders);
        if (!lockedDescendant) {
            return true;
        }

        showToast(`${getFolderDisplayName(folder)} cannot change while ${getFolderDisplayName(lockedDescendant, folders)} is locked.`);
        return false;
    }

    function canDeleteFolderNode(folder, folders) {
        const lockedDescendant = findLockedDescendant(folder.id, folders);
        if (!lockedDescendant) {
            return true;
        }

        showToast(`${getFolderDisplayName(folder)} cannot be deleted while ${getFolderDisplayName(lockedDescendant, folders)} is locked.`);
        return false;
    }

    function getFolderItemCount(folderId, folders) {
        const sourceFolders = Array.isArray(folders) ? folders : appState.folders;
        const folder = getFolderById(folderId, sourceFolders);
        if (!folder) {
            return 0;
        }

        return [folder, ...getFolderDescendants(folderId, sourceFolders)].reduce((total, entry) => {
            return total + entry.items.length;
        }, 0);
    }

    function reorderArray(array, fromIndex, toIndex) {
        const nextArray = [...array];
        const [movedItem] = nextArray.splice(fromIndex, 1);
        nextArray.splice(toIndex, 0, movedItem);
        return nextArray;
    }

    function findFolderIndex(folderId) {
        return appState.folders.findIndex((folder) => folder.id === folderId);
    }

    function canViewFolderItems(folder) {
        return !hasFolderLock(folder) || isFolderUnlocked(folder.id);
    }

    function canMoveFolderItems(folder) {
        return !hasFolderLock(folder);
    }

    function getVisibleFolderData() {
        const query = searchQuery.trim().toLowerCase();
        const collectVisibleFolders = (parentId) => {
            return getChildFolders(parentId).reduce((visibleFolders, folder) => {
                const folderMatch = folder.name.toLowerCase().includes(query);
                const visibleItems = canViewFolderItems(folder)
                    ? folder.items
                    .map((item, itemIndex) => ({
                        item,
                        itemIndex
                    }))
                    .filter(({ item }) => {
                        if (!query) {
                            return true;
                        }

                        if (folderMatch) {
                            return true;
                        }

                        return (
                            item.title.toLowerCase().includes(query) ||
                            item.url.toLowerCase().includes(query)
                        );
                    })
                    : [];
                const visibleChildren = canViewFolderItems(folder)
                    ? collectVisibleFolders(folder.id)
                    : [];

                if (!query || folderMatch || visibleItems.length > 0 || visibleChildren.length > 0) {
                    visibleFolders.push({
                        folder,
                        visibleItems,
                        visibleChildren
                    });
                }

                return visibleFolders;
            }, []);
        };

        return collectVisibleFolders(null);
    }

    async function setFolderCollapsed(folderId, collapsed) {
        const nextFolders = appState.folders.map((folder) => {
            if (folder.id !== folderId) {
                return folder;
            }

            return {
                ...folder,
                collapsed
            };
        });

        await persistFolders(nextFolders);
    }

    async function renameFolder(folderId) {
        const folder = getFolderById(folderId);
        if (!folder) {
            return;
        }

        if (!canEditFolderNode(folder)) {
            return;
        }

        if (hasFolderLock(folder)) {
            const verified = await requestFolderAccess(folder, 'Rename', {
                alwaysPrompt: true,
                keepUnlocked: false
            });
            if (!verified) {
                return;
            }
        }

        const nextName = window.prompt(`Rename ${getFolderLabel(folder).toLowerCase()}:`, folder.name);
        if (nextName === null) {
            return;
        }

        const name = getSafeText(nextName, '');
        if (!name) {
            showToast('Folder name cannot be empty.');
            return;
        }

        const exists = appState.folders.some((entry) => {
            return (
                entry.id !== folderId &&
                (entry.parentId || null) === (folder.parentId || null) &&
                entry.name.toLowerCase() === name.toLowerCase()
            );
        });

        if (exists) {
            showToast(`${getFolderLabel(folder)} already exists.`);
            return;
        }

        const nextFolders = appState.folders.map((entry) => {
            if (entry.id !== folderId) {
                return entry;
            }

            return {
                ...entry,
                name
            };
        });

        await persistFolders(nextFolders);
        showToast(`${getFolderLabel(folder)} renamed to "${name}".`);
    }

    async function renameItem(folderId, itemIndex) {
        const folder = getFolderById(folderId);
        const item = folder && folder.items[itemIndex];
        if (!folder || !item) {
            return;
        }

        const nextTitle = window.prompt('Edit saved title:', item.title);
        if (nextTitle === null) {
            return;
        }

        const title = getSafeText(nextTitle, '');
        if (!title) {
            showToast('Title cannot be empty.');
            return;
        }

        const nextFolders = appState.folders.map((entry) => {
            if (entry.id !== folderId) {
                return entry;
            }

            return {
                ...entry,
                items: entry.items.map((entryItem, entryIndex) => {
                    if (entryIndex !== itemIndex) {
                        return entryItem;
                    }

                    return {
                        ...entryItem,
                        title
                    };
                })
            };
        });

        await persistFolders(nextFolders);
        showToast('Saved title updated.');
    }

    function buildMovedItemsState(sourceFolderId, sourceItemIndex, targetFolderId, targetItemIndex) {
        const nextFolders = appState.folders.map((folder) => ({
            ...folder,
            items: [...folder.items]
        }));

        const sourceFolder = getFolderById(sourceFolderId, nextFolders);
        const targetFolder = getFolderById(targetFolderId, nextFolders);

        if (!sourceFolder || !targetFolder) {
            return { error: 'Could not find that folder.' };
        }

        if (!canMoveFolderItems(sourceFolder) || !canMoveFolderItems(targetFolder)) {
            return { error: 'Locked folders cannot move saved titles.' };
        }

        if (sourceItemIndex < 0 || sourceItemIndex >= sourceFolder.items.length) {
            return { error: 'Could not find that saved title.' };
        }

        const movingToSameFolder = sourceFolderId === targetFolderId;
        const existingTargetItem = !movingToSameFolder && targetFolder.items.some((item) => {
            return item.url === sourceFolder.items[sourceItemIndex].url;
        });

        if (existingTargetItem) {
            return { error: `Already in "${targetFolder.name}".` };
        }

        const [movedItem] = sourceFolder.items.splice(sourceItemIndex, 1);

        let insertIndex = typeof targetItemIndex === 'number'
            ? targetItemIndex
            : targetFolder.items.length;

        if (movingToSameFolder && sourceItemIndex < insertIndex) {
            insertIndex -= 1;
        }

        insertIndex = Math.max(0, Math.min(insertIndex, targetFolder.items.length));
        targetFolder.items.splice(insertIndex, 0, movedItem);

        return { folders: nextFolders };
    }

    async function reorderFolders(sourceFolderId, targetFolderId) {
        if (sourceFolderId === targetFolderId) {
            return;
        }

        const sourceFolder = getFolderById(sourceFolderId);
        const targetFolder = getFolderById(targetFolderId);
        if (!sourceFolder || !targetFolder) {
            return;
        }

        if ((sourceFolder.parentId || null) !== (targetFolder.parentId || null)) {
            showToast('Only matching sections can be reordered.');
            return;
        }

        const sourceIndex = findFolderIndex(sourceFolderId);
        const targetIndex = findFolderIndex(targetFolderId);
        if (sourceIndex === -1 || targetIndex === -1) {
            return;
        }

        const nextFolders = reorderArray(appState.folders, sourceIndex, targetIndex);
        await persistFolders(nextFolders);
    }

    async function moveItem(sourceFolderId, sourceItemIndex, targetFolderId, targetItemIndex) {
        const result = buildMovedItemsState(
            sourceFolderId,
            sourceItemIndex,
            targetFolderId,
            targetItemIndex
        );

        if (result.error) {
            showToast(result.error);
            return;
        }

        await persistFolders(result.folders);

        if (sourceFolderId !== targetFolderId) {
            const targetFolder = result.folders.find((folder) => folder.id === targetFolderId);
            if (targetFolder) {
                showToast(`Moved to "${targetFolder.name}".`);
            }
        }
    }

    function clearDragIndicators() {
        if (!sidebar) {
            return;
        }

        sidebar.querySelectorAll('.dragging, .drop-target').forEach((element) => {
            element.classList.remove('dragging', 'drop-target');
        });
    }

    function writeDragPayload(event, payload) {
        if (!event.dataTransfer) {
            return;
        }

        const rawPayload = JSON.stringify(payload);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(DRAG_MIME, rawPayload);
        event.dataTransfer.setData('text/plain', rawPayload);
    }

    function readDragPayload(event) {
        if (!event.dataTransfer) {
            return null;
        }

        const rawPayload = event.dataTransfer.getData(DRAG_MIME) || event.dataTransfer.getData('text/plain');
        if (!rawPayload) {
            return null;
        }

        try {
            return JSON.parse(rawPayload);
        } catch (error) {
            return null;
        }
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ SIDEBAR RENDERING                                        ║
    ╚════════════════════════════════════════════════════════════╝
    */

    function renderEmptyState(message) {
        const emptyRow = document.createElement('li');
        emptyRow.className = 'empty-state';
        emptyRow.textContent = message;
        folderList.appendChild(emptyRow);
    }

    function renderFolderTree(folderData, container) {
        const { folder, visibleItems, visibleChildren } = folderData;
        const row = document.createElement('li');
        row.className = 'folder-row';
        row.classList.add(`folder-depth-${Math.min(getFolderDepth(folder.id), 3)}`);
        row.classList.toggle('locked-folder', hasFolderLock(folder));
        row.classList.toggle('profile-row', folder.parentId === null);
        row.draggable = isEditMode && !hasFolderLock(folder) && !hasLockedDescendant(folder.id);

        const header = document.createElement('div');
        header.className = 'folder-header';

        const top = document.createElement('div');
        top.className = 'folder-top';

        const left = document.createElement('div');
        left.className = 'folder-left';
        const folderLocked = hasFolderLock(folder);
        const folderUnlocked = canViewFolderItems(folder);

        const toggleFolderAccess = async (event) => {
            event.stopPropagation();

            if (searchQuery) {
                return;
            }

            if (folderLocked && !folderUnlocked) {
                const verified = await requestFolderAccess(folder, 'Open');
                if (!verified) {
                    return;
                }
            }

            await setFolderCollapsed(folder.id, !folder.collapsed);
        };

        const chevron = document.createElement('span');
        chevron.className = 'chevron';
        chevron.textContent = folder.collapsed && !searchQuery ? '+' : '-';
        chevron.classList.toggle('collapsed', folder.collapsed && !searchQuery);
        chevron.addEventListener('click', (event) => {
            toggleFolderAccess(event).catch(() => {
                showToast('Could not update folder state.');
            });
        });

        if (folderLocked) {
            const lockState = document.createElement('span');
            lockState.className = 'folder-lock-state';
            lockState.textContent = LOCKED_GLYPH;
            left.appendChild(lockState);
        }

        const title = document.createElement('span');
        title.className = 'folder-title';
        title.classList.toggle('locked-title', folderLocked && !folderUnlocked);
        title.textContent = folder.name;
        title.addEventListener('click', (event) => {
            if (!folderLocked || folderUnlocked) {
                return;
            }

            toggleFolderAccess(event).catch(() => {
                showToast('Could not update folder state.');
            });
        });

        if (isEditMode) {
            const actions = document.createElement('div');
            actions.className = 'folder-actions';

            const renameButton = document.createElement('button');
            renameButton.className = 'folder-action';
            renameButton.type = 'button';
            renameButton.textContent = 'Rename';
            renameButton.addEventListener('click', (event) => {
                event.stopPropagation();
                renameFolder(folder.id).catch(() => {
                    showToast(`Could not rename that ${getFolderLabel(folder).toLowerCase()}.`);
                });
            });
            actions.appendChild(renameButton);

            const lockButton = document.createElement('button');
            lockButton.className = 'folder-action';
            lockButton.type = 'button';
            lockButton.textContent = folderLocked ? LOCKED_GLYPH : UNLOCKED_GLYPH;
            lockButton.title = folderLocked ? `Manage ${getFolderLabel(folder).toLowerCase()} lock` : `Add ${getFolderLabel(folder).toLowerCase()} lock`;
            lockButton.addEventListener('click', (event) => {
                event.stopPropagation();
                handleFolderLockAction(folder.id).catch(() => {
                    showToast('Could not update that lock.');
                });
            });
            actions.appendChild(lockButton);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'folder-action';
            deleteButton.type = 'button';
            deleteButton.textContent = 'X';
            deleteButton.title = `Delete ${getFolderLabel(folder).toLowerCase()}`;
            deleteButton.addEventListener('click', async (event) => {
                event.stopPropagation();

                const latestState = await getStoredState();
                appState = latestState;

                const latestFolder = getFolderById(folder.id, latestState.folders);
                if (!latestFolder) {
                    showToast('Could not find that section.');
                    return;
                }

                if (!canDeleteFolderNode(latestFolder, latestState.folders)) {
                    return;
                }

                if (hasFolderLock(latestFolder)) {
                    const verified = await requestFolderAccess(latestFolder, 'Delete', {
                        alwaysPrompt: true,
                        keepUnlocked: false
                    });
                    if (!verified) {
                        return;
                    }
                }

                const descendantIds = getFolderDescendants(latestFolder.id, latestState.folders).map((entry) => entry.id);
                const deleteConfirmed = await showConfirmDialog(
                    `Delete ${getFolderLabel(latestFolder)}`,
                    descendantIds.length
                        ? `Delete ${getFolderLabel(latestFolder).toLowerCase()} "${latestFolder.name}", its child sections, and all saved titles?`
                        : `Delete ${getFolderLabel(latestFolder).toLowerCase()} "${latestFolder.name}" and its saved titles?`,
                    'Delete'
                );
                if (!deleteConfirmed) {
                    return;
                }

                const blockedIds = new Set([latestFolder.id, ...descendantIds]);
                const nextFolders = latestState.folders.filter((entry) => !blockedIds.has(entry.id));
                blockedIds.forEach((entryId) => {
                    unlockedFolderIds.delete(entryId);
                });
                await persistFolders(nextFolders);
            });
            actions.appendChild(deleteButton);

            top.appendChild(actions);
            header.appendChild(top);
        }

        left.appendChild(chevron);
        left.appendChild(title);
        header.appendChild(left);
        row.appendChild(header);

        if (isEditMode && row.draggable) {
            row.addEventListener('dragstart', (event) => {
                writeDragPayload(event, {
                    type: 'folder',
                    sourceFolderId: folder.id
                });
                row.classList.add('dragging');
            });

            row.addEventListener('dragend', () => {
                clearDragIndicators();
            });
        }

        if (isEditMode) {
            header.addEventListener('dragover', (event) => {
                const payload = readDragPayload(event);
                if (!payload) {
                    return;
                }

                if (payload.type === 'item' && !canMoveFolderItems(folder)) {
                    return;
                }

                if (payload.type === 'folder') {
                    const sourceFolder = getFolderById(payload.sourceFolderId);
                    if (!sourceFolder || (sourceFolder.parentId || null) !== (folder.parentId || null)) {
                        return;
                    }
                }

                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                row.classList.add('drop-target');
            });

            header.addEventListener('dragleave', (event) => {
                if (!row.contains(event.relatedTarget)) {
                    row.classList.remove('drop-target');
                }
            });

            header.addEventListener('drop', (event) => {
                const payload = readDragPayload(event);
                if (!payload) {
                    return;
                }

                if (payload.type === 'item' && !canMoveFolderItems(folder)) {
                    return;
                }

                event.preventDefault();
                clearDragIndicators();

                if (payload.type === 'folder') {
                    reorderFolders(payload.sourceFolderId, folder.id).catch(() => {
                        showToast('Could not reorder sections.');
                    });
                    return;
                }

                if (payload.type === 'item') {
                    moveItem(payload.sourceFolderId, payload.sourceItemIndex, folder.id).catch(() => {
                        showToast('Could not move that title.');
                    });
                }
            });
        }

        const branch = document.createElement('div');
        branch.className = 'folder-branch';
        const forceOpen = Boolean(searchQuery);
        branch.style.display = folderLocked && !folderUnlocked
            ? 'none'
            : folder.collapsed && !forceOpen
                ? 'none'
                : 'block';

        const itemsList = document.createElement('ul');
        itemsList.className = 'folder-items';

        if (isEditMode) {
            itemsList.addEventListener('dragover', (event) => {
                const payload = readDragPayload(event);
                if (!payload || payload.type !== 'item') {
                    return;
                }

                if (!canMoveFolderItems(folder)) {
                    return;
                }

                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                itemsList.classList.add('drop-target');
            });

            itemsList.addEventListener('dragleave', (event) => {
                if (!itemsList.contains(event.relatedTarget)) {
                    itemsList.classList.remove('drop-target');
                }
            });

            itemsList.addEventListener('drop', (event) => {
                const payload = readDragPayload(event);
                if (!payload || payload.type !== 'item') {
                    return;
                }

                if (!canMoveFolderItems(folder)) {
                    return;
                }

                event.preventDefault();
                clearDragIndicators();
                moveItem(
                    payload.sourceFolderId,
                    payload.sourceItemIndex,
                    folder.id,
                    folder.items.length
                ).catch(() => {
                    showToast('Could not move that title.');
                });
            });
        }

        if (!folder.items.length && !visibleChildren.length) {
            const hint = document.createElement('li');
            hint.className = 'folder-drop-note';
            hint.textContent = isEditMode
                ? 'Drop saved titles here.'
                : 'No saved titles yet.';
            itemsList.appendChild(hint);
        } else if (folder.items.length && !visibleItems.length && !visibleChildren.length) {
            const hint = document.createElement('li');
            hint.className = 'folder-drop-note';
            hint.textContent = 'No saved titles match this search.';
            itemsList.appendChild(hint);
        } else {
            visibleItems.forEach(({ item, itemIndex }) => {
                const itemRow = document.createElement('li');
                itemRow.className = 'folder-item';
                itemRow.draggable = isEditMode && canMoveFolderItems(folder);

                const itemLeft = document.createElement('div');
                itemLeft.className = 'item-left';

                if (isEditMode) {
                    const dragHandle = document.createElement('span');
                    dragHandle.className = 'drag-handle';
                    dragHandle.textContent = '::';
                    itemLeft.appendChild(dragHandle);
                }

                const link = document.createElement('a');
                link.className = 'folder-item-link';
                link.textContent = item.title;
                link.href = item.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.draggable = false;

                const itemActions = document.createElement('div');
                itemActions.className = 'item-actions';

                if (isEditMode) {
                    const renameItemButton = document.createElement('button');
                    renameItemButton.className = 'item-action';
                    renameItemButton.type = 'button';
                    renameItemButton.textContent = 'Name';
                    renameItemButton.addEventListener('click', (event) => {
                        event.stopPropagation();
                        renameItem(folder.id, itemIndex).catch(() => {
                            showToast('Could not rename that title.');
                        });
                    });
                    itemActions.appendChild(renameItemButton);
                }

                const removeButton = document.createElement('button');
                removeButton.className = 'item-action';
                removeButton.type = 'button';
                removeButton.textContent = 'X';
                removeButton.title = 'Remove item';
                removeButton.addEventListener('click', async (event) => {
                    event.stopPropagation();

                    const removeConfirmed = await confirmShowRemoval(folder.name, item.title);
                    if (!removeConfirmed) {
                        return;
                    }

                    const nextFolders = appState.folders.map((entry) => {
                        if (entry.id !== folder.id) {
                            return entry;
                        }

                        return {
                            ...entry,
                            items: entry.items.filter((entryItem) => entryItem.url !== item.url)
                        };
                    });

                    await persistFolders(nextFolders);
                });
                itemActions.appendChild(removeButton);

                itemLeft.appendChild(link);
                itemRow.appendChild(itemLeft);
                itemRow.appendChild(itemActions);
                itemsList.appendChild(itemRow);

                if (isEditMode) {
                    itemRow.addEventListener('dragstart', (event) => {
                        event.stopPropagation();
                        writeDragPayload(event, {
                            type: 'item',
                            sourceFolderId: folder.id,
                            sourceItemIndex: itemIndex
                        });
                        itemRow.classList.add('dragging');
                    });

                    itemRow.addEventListener('dragend', () => {
                        clearDragIndicators();
                    });

                    itemRow.addEventListener('dragover', (event) => {
                        const payload = readDragPayload(event);
                        if (!payload || payload.type !== 'item') {
                            return;
                        }

                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = 'move';
                        itemRow.classList.add('drop-target');
                    });

                    itemRow.addEventListener('dragleave', (event) => {
                        if (!itemRow.contains(event.relatedTarget)) {
                            itemRow.classList.remove('drop-target');
                        }
                    });

                    itemRow.addEventListener('drop', (event) => {
                        const payload = readDragPayload(event);
                        if (!payload || payload.type !== 'item') {
                            return;
                        }

                        event.preventDefault();
                        event.stopPropagation();
                        clearDragIndicators();
                        moveItem(
                            payload.sourceFolderId,
                            payload.sourceItemIndex,
                            folder.id,
                            itemIndex
                        ).catch(() => {
                            showToast('Could not move that title.');
                        });
                    });
                }
            });
        }

        if (itemsList.childNodes.length) {
            branch.appendChild(itemsList);
        }

        if (visibleChildren.length) {
            const childList = document.createElement('ul');
            childList.className = 'child-folder-list';
            visibleChildren.forEach((childFolderData) => {
                renderFolderTree(childFolderData, childList);
            });
            branch.appendChild(childList);
        }

        row.appendChild(branch);
        container.appendChild(row);
    }

    function renderFolders() {
        if (!folderList) {
            return;
        }

        folderList.innerHTML = '';

        const visibleFolders = getVisibleFolderData();

        if (!getRootProfiles().length) {
            renderEmptyState('Create your first profile to get started.');
            return;
        }

        if (!visibleFolders.length) {
            renderEmptyState('No folders or titles match that search.');
            return;
        }

        visibleFolders.forEach((folderData) => {
            renderFolderTree(folderData, folderList);
        });
        return;

        if (!appState.folders.length) {
            renderEmptyState('Create your first folder to get started.');
            return;
        }

        if (!visibleFolders.length) {
            renderEmptyState('No folders or titles match that search.');
            return;
        }

        visibleFolders.forEach(({ folder, visibleItems }) => {
            const row = document.createElement('li');
            row.className = 'folder-row';
            row.classList.toggle('locked-folder', hasFolderLock(folder));
            row.draggable = isEditMode;

            const header = document.createElement('div');
            header.className = 'folder-header';

            const top = document.createElement('div');
            top.className = 'folder-top';

            const left = document.createElement('div');
            left.className = 'folder-left';
            const folderLocked = hasFolderLock(folder);
            const folderUnlocked = canViewFolderItems(folder);

            const toggleFolderAccess = async (event) => {
                event.stopPropagation();

                if (searchQuery) {
                    return;
                }

                if (folderLocked && !folderUnlocked) {
                    const verified = await requestFolderAccess(folder, 'Open');
                    if (!verified) {
                        return;
                    }
                }

                await setFolderCollapsed(folder.id, !folder.collapsed);
            };

            const chevron = document.createElement('span');
            chevron.className = 'chevron';
            chevron.textContent = folder.collapsed && !searchQuery ? '+' : '-';
            chevron.classList.toggle('collapsed', folder.collapsed && !searchQuery);
            chevron.addEventListener('click', (event) => {
                toggleFolderAccess(event).catch(() => {
                    showToast('Could not update folder state.');
                });
            });

            if (folderLocked) {
                const lockState = document.createElement('span');
                lockState.className = 'folder-lock-state';
                lockState.textContent = LOCKED_GLYPH;
                left.appendChild(lockState);
            }

            const title = document.createElement('span');
            title.className = 'folder-title';
            title.classList.toggle('locked-title', folderLocked && !folderUnlocked);
            title.textContent = folder.name;
            title.addEventListener('click', (event) => {
                if (!folderLocked || folderUnlocked) {
                    return;
                }

                toggleFolderAccess(event).catch(() => {
                    showToast('Could not update folder state.');
                });
            });

            if (isEditMode) {
                const actions = document.createElement('div');
                actions.className = 'folder-actions';

                const renameButton = document.createElement('button');
                renameButton.className = 'folder-action';
                renameButton.type = 'button';
                renameButton.textContent = 'Rename';
                renameButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    renameFolder(folder.id).catch(() => {
                        showToast('Could not rename folder.');
                    });
                });
                actions.appendChild(renameButton);

                const lockButton = document.createElement('button');
                lockButton.className = 'folder-action';
                lockButton.type = 'button';
                lockButton.textContent = folderLocked ? LOCKED_GLYPH : UNLOCKED_GLYPH;
                lockButton.title = folderLocked ? 'Manage folder lock' : 'Add folder lock';
                lockButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    handleFolderLockAction(folder.id).catch(() => {
                        showToast('Could not update that folder lock.');
                    });
                });
                actions.appendChild(lockButton);

                const deleteButton = document.createElement('button');
                deleteButton.className = 'folder-action';
                deleteButton.type = 'button';
                deleteButton.textContent = 'X';
                deleteButton.title = 'Delete folder';
                deleteButton.addEventListener('click', async (event) => {
                    event.stopPropagation();

                    const latestState = await getStoredState();
                    appState = latestState;

                    const latestFolder = latestState.folders.find((entry) => entry.id === folder.id);
                    if (!latestFolder) {
                        showToast('Could not find that folder.');
                        return;
                    }

                    if (hasFolderLock(latestFolder)) {
                        const verified = await requestFolderAccess(latestFolder, 'Delete', {
                            alwaysPrompt: true,
                            keepUnlocked: false
                        });
                        if (!verified) {
                            return;
                        }
                    }

                    const deleteConfirmed = await showConfirmDialog(
                        'Delete Folder',
                        `Delete folder "${latestFolder.name}" and its saved titles?`,
                        'Delete'
                    );
                    if (!deleteConfirmed) {
                        return;
                    }

                    const nextFolders = latestState.folders.filter((entry) => entry.id !== folder.id);
                    unlockedFolderIds.delete(folder.id);
                    await persistFolders(nextFolders);
                });
                actions.appendChild(deleteButton);

                top.appendChild(actions);
                header.appendChild(top);
            }

            left.appendChild(chevron);
            left.appendChild(title);
            header.appendChild(left);
            row.appendChild(header);

            if (isEditMode) {
                row.addEventListener('dragstart', (event) => {
                    writeDragPayload(event, {
                        type: 'folder',
                        sourceFolderId: folder.id
                    });
                    row.classList.add('dragging');
                });

                row.addEventListener('dragend', () => {
                    clearDragIndicators();
                });

                header.addEventListener('dragover', (event) => {
                    const payload = readDragPayload(event);
                    if (!payload) {
                        return;
                    }

                    if (payload.type === 'item' && !canMoveFolderItems(folder)) {
                        return;
                    }

                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    row.classList.add('drop-target');
                });

                header.addEventListener('dragleave', (event) => {
                    if (!row.contains(event.relatedTarget)) {
                        row.classList.remove('drop-target');
                    }
                });

                header.addEventListener('drop', (event) => {
                    const payload = readDragPayload(event);
                    if (!payload) {
                        return;
                    }

                    if (payload.type === 'item' && !canMoveFolderItems(folder)) {
                        return;
                    }

                    event.preventDefault();
                    clearDragIndicators();

                    if (payload.type === 'folder') {
                        reorderFolders(payload.sourceFolderId, folder.id).catch(() => {
                            showToast('Could not reorder folders.');
                        });
                        return;
                    }

                    if (payload.type === 'item') {
                        moveItem(payload.sourceFolderId, payload.sourceItemIndex, folder.id).catch(() => {
                            showToast('Could not move that title.');
                        });
                    }
                });
            }

            const itemsList = document.createElement('ul');
            itemsList.className = 'folder-items';
            const forceOpen = Boolean(searchQuery);
            itemsList.style.display = folderLocked && !folderUnlocked
                ? 'none'
                : folder.collapsed && !forceOpen
                    ? 'none'
                    : 'block';

            if (isEditMode) {
                itemsList.addEventListener('dragover', (event) => {
                    const payload = readDragPayload(event);
                    if (!payload || payload.type !== 'item') {
                        return;
                    }

                    if (!canMoveFolderItems(folder)) {
                        return;
                    }

                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    itemsList.classList.add('drop-target');
                });

                itemsList.addEventListener('dragleave', (event) => {
                    if (!itemsList.contains(event.relatedTarget)) {
                        itemsList.classList.remove('drop-target');
                    }
                });

                itemsList.addEventListener('drop', (event) => {
                    const payload = readDragPayload(event);
                    if (!payload || payload.type !== 'item') {
                        return;
                    }

                    if (!canMoveFolderItems(folder)) {
                        return;
                    }

                    event.preventDefault();
                    clearDragIndicators();
                    moveItem(
                        payload.sourceFolderId,
                        payload.sourceItemIndex,
                        folder.id,
                        folder.items.length
                    ).catch(() => {
                        showToast('Could not move that title.');
                    });
                });
            }

            if (!folder.items.length) {
                const hint = document.createElement('li');
                hint.className = 'folder-drop-note';
                hint.textContent = isEditMode
                    ? 'Drop saved titles here.'
                    : 'No saved titles yet.';
                itemsList.appendChild(hint);
            } else if (!visibleItems.length) {
                const hint = document.createElement('li');
                hint.className = 'folder-drop-note';
                hint.textContent = 'No saved titles match this search.';
                itemsList.appendChild(hint);
            } else {
                visibleItems.forEach(({ item, itemIndex }) => {
                    const itemRow = document.createElement('li');
                    itemRow.className = 'folder-item';
                    itemRow.draggable = isEditMode && canMoveFolderItems(folder);

                    const itemLeft = document.createElement('div');
                    itemLeft.className = 'item-left';

                    if (isEditMode) {
                        const dragHandle = document.createElement('span');
                        dragHandle.className = 'drag-handle';
                        dragHandle.textContent = '::';
                        itemLeft.appendChild(dragHandle);
                    }

                    const link = document.createElement('a');
                    link.className = 'folder-item-link';
                    link.textContent = item.title;
                    link.href = item.url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.draggable = false;

                    const itemActions = document.createElement('div');
                    itemActions.className = 'item-actions';

                    if (isEditMode) {
                        const renameItemButton = document.createElement('button');
                        renameItemButton.className = 'item-action';
                        renameItemButton.type = 'button';
                        renameItemButton.textContent = 'Name';
                        renameItemButton.addEventListener('click', (event) => {
                            event.stopPropagation();
                            renameItem(folder.id, itemIndex).catch(() => {
                                showToast('Could not rename that title.');
                            });
                        });
                        itemActions.appendChild(renameItemButton);
                    }

                    const removeButton = document.createElement('button');
                    removeButton.className = 'item-action';
                    removeButton.type = 'button';
                    removeButton.textContent = 'X';
                    removeButton.title = 'Remove item';
                    removeButton.addEventListener('click', async (event) => {
                        event.stopPropagation();

                        const removeConfirmed = await confirmShowRemoval(folder.name, item.title);
                        if (!removeConfirmed) {
                            return;
                        }

                        const nextFolders = appState.folders.map((entry) => {
                            if (entry.id !== folder.id) {
                                return entry;
                            }

                            return {
                                ...entry,
                                items: entry.items.filter((entryItem) => entryItem.url !== item.url)
                            };
                        });

                        await persistFolders(nextFolders);
                    });
                    itemActions.appendChild(removeButton);

                    itemLeft.appendChild(link);
                    itemRow.appendChild(itemLeft);
                    itemRow.appendChild(itemActions);
                    itemsList.appendChild(itemRow);

                    if (isEditMode) {
                        itemRow.addEventListener('dragstart', (event) => {
                            event.stopPropagation();
                            writeDragPayload(event, {
                                type: 'item',
                                sourceFolderId: folder.id,
                                sourceItemIndex: itemIndex
                            });
                            itemRow.classList.add('dragging');
                        });

                        itemRow.addEventListener('dragend', () => {
                            clearDragIndicators();
                        });

                        itemRow.addEventListener('dragover', (event) => {
                            const payload = readDragPayload(event);
                            if (!payload || payload.type !== 'item') {
                                return;
                            }

                            event.preventDefault();
                            event.stopPropagation();
                            event.dataTransfer.dropEffect = 'move';
                            itemRow.classList.add('drop-target');
                        });

                        itemRow.addEventListener('dragleave', (event) => {
                            if (!itemRow.contains(event.relatedTarget)) {
                                itemRow.classList.remove('drop-target');
                            }
                        });

                        itemRow.addEventListener('drop', (event) => {
                            const payload = readDragPayload(event);
                            if (!payload || payload.type !== 'item') {
                                return;
                            }

                            event.preventDefault();
                            event.stopPropagation();
                            clearDragIndicators();
                            moveItem(
                                payload.sourceFolderId,
                                payload.sourceItemIndex,
                                folder.id,
                                itemIndex
                            ).catch(() => {
                                showToast('Could not move that title.');
                            });
                        });
                    }
                });
            }

            row.appendChild(itemsList);
            folderList.appendChild(row);
        });
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ STREMIO PAGE DETECTION                                   ║
    ╚════════════════════════════════════════════════════════════╝
    */

    function getCurrentSelection() {
        const url = window.location.hash.trim();
        if (!url || !url.includes('/detail/')) {
            return null;
        }

        const titleCandidates = [
            document.querySelector('img.logo-X3hTV[title]'),
            document.querySelector('img[title][class*="logo"]'),
            document.querySelector('h1')
        ];

        for (const candidate of titleCandidates) {
            if (!candidate) {
                continue;
            }

            const title = getSafeText(
                candidate.getAttribute('title') || candidate.textContent,
                ''
            );

            if (title) {
                return { title, url };
            }
        }

        const documentTitle = document.title
            .replace(/\s*[-|].*$/, '')
            .trim();

        if (documentTitle) {
            return {
                title: documentTitle,
                url
            };
        }

        return null;
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ SIDEBAR ACTIONS                                          ║
    ╚════════════════════════════════════════════════════════════╝
    */

    async function openSettingsPage() {
        const fallbackUrl = storageAvailable() && chrome.runtime
            ? chrome.runtime.getURL('settings.html')
            : '';

        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
            if (fallbackUrl) {
                window.open(fallbackUrl, '_blank', 'noopener');
            }
            return;
        }

        chrome.runtime.sendMessage({ type: 'chimera-open-settings' }, (response) => {
            if (chrome.runtime.lastError || !response || !response.ok) {
                if (fallbackUrl) {
                    window.open(fallbackUrl, '_blank', 'noopener');
                } else {
                    showToast('Could not open settings.');
                }
            }
        });
    }

    async function toggleSidebarPin() {
        await saveState({
            ...appState,
            settings: {
                ...appState.settings,
                sidebarMinimized: !appState.settings.sidebarMinimized
            }
        });

        applySidebarVisibility();
    }

    function createFolderRecord(name, parentId) {
        return {
            id: Date.now() + Math.floor(Math.random() * 1000),
            type: parentId === null ? 'profile' : 'folder',
            parentId,
            name,
            collapsed: false,
            items: [],
            lock: null
        };
    }

    function showNameEntryDialog(title, description, label, placeholder, submitLabel) {
        return new Promise((resolve) => {
            const dialog = createDialogShell(title, description);
            const form = document.createElement('form');
            form.className = 'dialog-form';

            const nameField = document.createElement('label');
            nameField.className = 'dialog-field';
            const nameLabel = document.createElement('span');
            nameLabel.textContent = label;
            const nameInput = document.createElement('input');
            nameInput.className = 'dialog-input';
            nameInput.type = 'text';
            nameInput.autocomplete = 'off';
            nameInput.placeholder = placeholder;

            const actionRow = document.createElement('div');
            actionRow.className = 'dialog-actions';

            const saveButton = document.createElement('button');
            saveButton.className = 'picker-action';
            saveButton.type = 'submit';
            saveButton.textContent = submitLabel;

            const cancelButton = document.createElement('button');
            cancelButton.className = 'picker-cancel dialog-inline-cancel';
            cancelButton.type = 'button';
            cancelButton.textContent = 'Cancel';

            const closeDialog = (value) => {
                dialog.backdrop.remove();
                resolve(value);
            };

            cancelButton.addEventListener('click', () => {
                closeDialog(null);
            });

            form.addEventListener('submit', (event) => {
                event.preventDefault();

                const name = getSafeText(nameInput.value, '');
                if (!name) {
                    dialog.setError(`${label} cannot be empty.`);
                    return;
                }

                closeDialog(name);
            });

            nameField.appendChild(nameLabel);
            nameField.appendChild(nameInput);
            actionRow.appendChild(saveButton);
            actionRow.appendChild(cancelButton);
            form.appendChild(nameField);
            form.appendChild(actionRow);
            dialog.box.appendChild(form);
            document.body.appendChild(dialog.backdrop);
            nameInput.focus();
        });
    }

    function showCreateFolderDialog() {
        return new Promise((resolve) => {
            const profiles = getRootProfiles();
            if (!profiles.length) {
                resolve(null);
                return;
            }

            const dialog = createDialogShell(
                'Create Folder',
                'Choose the profile for the new folder. Turn on sub folder if it belongs inside an existing folder.'
            );
            const form = document.createElement('form');
            form.className = 'dialog-form';

            const nameField = document.createElement('label');
            nameField.className = 'dialog-field';
            const nameLabel = document.createElement('span');
            nameLabel.textContent = 'Folder Name';
            const nameInput = document.createElement('input');
            nameInput.className = 'dialog-input';
            nameInput.type = 'text';
            nameInput.autocomplete = 'off';
            nameInput.placeholder = 'New folder name';

            const profileField = document.createElement('label');
            profileField.className = 'dialog-field';
            const profileLabel = document.createElement('span');
            profileLabel.textContent = 'Profile';
            const profileSelect = document.createElement('select');
            profileSelect.className = 'dialog-select';

            profiles.forEach((profile) => {
                const option = document.createElement('option');
                option.value = String(profile.id);
                option.textContent = profile.name;
                profileSelect.appendChild(option);
            });

            const subFolderField = document.createElement('label');
            subFolderField.className = 'dialog-checkbox-row';
            const subFolderInput = document.createElement('input');
            subFolderInput.type = 'checkbox';
            const subFolderLabel = document.createElement('span');
            subFolderLabel.textContent = 'Create Sub Folder';
            subFolderField.appendChild(subFolderInput);
            subFolderField.appendChild(subFolderLabel);

            const parentField = document.createElement('label');
            parentField.className = 'dialog-field';
            const parentLabel = document.createElement('span');
            parentLabel.textContent = 'Parent Folder';
            const parentSelect = document.createElement('select');
            parentSelect.className = 'dialog-select';

            const helper = document.createElement('div');
            helper.className = 'dialog-helper';

            const syncCreateMode = () => {
                const selectedProfileId = Number(profileSelect.value);
                const directFolders = getChildFolders(selectedProfileId).filter((entry) => entry.parentId === selectedProfileId);

                parentSelect.innerHTML = '';
                directFolders.forEach((folder) => {
                    const option = document.createElement('option');
                    option.value = String(folder.id);
                    option.textContent = folder.name;
                    parentSelect.appendChild(option);
                });

                const isSubFolder = subFolderInput.checked;
                parentField.style.display = isSubFolder ? 'flex' : 'none';
                parentSelect.disabled = !isSubFolder || !directFolders.length;
                saveButton.textContent = isSubFolder ? 'Create Sub Folder' : 'Create';

                helper.textContent = isSubFolder
                    ? directFolders.length
                        ? 'Pick the folder that should hold this sub folder.'
                        : 'Create a folder in this profile first before adding a sub folder.'
                    : 'The new folder will be created directly inside the selected profile.';
            };

            const actionRow = document.createElement('div');
            actionRow.className = 'dialog-actions';

            const saveButton = document.createElement('button');
            saveButton.className = 'picker-action';
            saveButton.type = 'submit';
            saveButton.textContent = 'Create';

            const cancelButton = document.createElement('button');
            cancelButton.className = 'picker-cancel dialog-inline-cancel';
            cancelButton.type = 'button';
            cancelButton.textContent = 'Cancel';

            const closeDialog = (value) => {
                dialog.backdrop.remove();
                resolve(value);
            };

            cancelButton.addEventListener('click', () => {
                closeDialog(null);
            });

            profileSelect.addEventListener('change', syncCreateMode);
            subFolderInput.addEventListener('change', syncCreateMode);

            form.addEventListener('submit', (event) => {
                event.preventDefault();

                const name = getSafeText(nameInput.value, '');
                if (!name) {
                    dialog.setError('Folder name cannot be empty.');
                    return;
                }

                const profileId = Number(profileSelect.value);
                if (!Number.isFinite(profileId)) {
                    dialog.setError('Choose a profile first.');
                    return;
                }

                let parentId = profileId;

                if (subFolderInput.checked) {
                    parentId = Number(parentSelect.value);
                    if (!Number.isFinite(parentId)) {
                        dialog.setError('Choose a parent folder first.');
                        return;
                    }
                }

                closeDialog({
                    name,
                    parentId
                });
            });

            nameField.appendChild(nameLabel);
            nameField.appendChild(nameInput);
            profileField.appendChild(profileLabel);
            profileField.appendChild(profileSelect);
            parentField.appendChild(parentLabel);
            parentField.appendChild(parentSelect);
            actionRow.appendChild(saveButton);
            actionRow.appendChild(cancelButton);
            form.appendChild(nameField);
            form.appendChild(profileField);
            form.appendChild(subFolderField);
            form.appendChild(parentField);
            form.appendChild(helper);
            form.appendChild(actionRow);
            dialog.box.appendChild(form);
            document.body.appendChild(dialog.backdrop);
            syncCreateMode();
            nameInput.focus();
        });
    }

    async function createProfile() {
        const name = await showNameEntryDialog(
            'Create Profile',
            'Profiles sit at the top of the tree and can hold folders or saved titles.',
            'Profile Name',
            'New profile name',
            'Create'
        );

        if (name === null) {
            return;
        }

        const exists = getRootProfiles().some((folder) => {
            return folder.name.toLowerCase() === name.toLowerCase();
        });

        if (exists) {
            showToast('Profile already exists.');
            return;
        }

        const nextFolders = [
            ...appState.folders,
            createFolderRecord(name, null)
        ];

        await persistFolders(nextFolders);
        showToast(`Profile "${name}" created.`);
    }

    async function createFolder() {
        const profiles = getRootProfiles();
        if (!profiles.length) {
            showToast('Create a profile first.');
            return;
        }

        const result = await showCreateFolderDialog();
        if (!result) {
            return;
        }

        const parentFolder = getFolderById(result.parentId);
        if (!parentFolder) {
            showToast('Choose a valid parent section.');
            return;
        }

        if (hasFolderLock(parentFolder)) {
            showToast(`${getFolderDisplayName(parentFolder)} is locked.`);
            return;
        }

        const lockedAncestor = findLockedAncestor(parentFolder.id);
        if (lockedAncestor) {
            showToast(`${getFolderDisplayName(lockedAncestor)} is locked.`);
            return;
        }

        const exists = appState.folders.some((folder) => {
            return (
                (folder.parentId || null) === result.parentId &&
                folder.name.toLowerCase() === result.name.toLowerCase()
            );
        });

        const createdFolderLabel = getChildFolderLabel(parentFolder);

        if (exists) {
            showToast(`${createdFolderLabel} already exists.`);
            return;
        }

        const nextFolders = [
            ...appState.folders,
            createFolderRecord(result.name, result.parentId)
        ];

        await persistFolders(nextFolders);
        showToast(`${createdFolderLabel} "${result.name}" created.`);
    }

    async function addSelectionToFolder(selection, targetFolderId, stateOverride) {
        const latestState = stateOverride || await getStoredState();
        appState = latestState;

        const latestFolder = getFolderById(targetFolderId, latestState.folders);
        if (!latestFolder) {
            showToast('Could not find that section.');
            return { status: 'missing' };
        }

        if (latestFolder.parentId === null) {
            showToast('Choose a folder or sub folder.');
            return { status: 'invalid' };
        }

        if (hasFolderLock(latestFolder)) {
            showPopupNotice(`"${latestFolder.name}" is locked.`, 5000);
            return { status: 'locked' };
        }

        const lockedAncestor = findLockedAncestor(latestFolder.id, latestState.folders);
        if (lockedAncestor) {
            showPopupNotice(`"${lockedAncestor.name}" is locked.`, 5000);
            return { status: 'locked' };
        }

        const exists = latestFolder.items.some((item) => item.url === selection.url);
        if (exists) {
            showToast(`Already in "${latestFolder.name}".`);
            return { status: 'duplicate' };
        }

        const nextFolders = latestState.folders.map((entry) => {
            if (entry.id !== latestFolder.id) {
                return entry;
            }

            return {
                ...entry,
                items: [
                    ...entry.items,
                    {
                        title: selection.title,
                        url: selection.url
                    }
                ]
            };
        });

        await persistFolders(nextFolders, {
            lastAddTargetFolderId: latestFolder.id
        });
        showToast(`Added to "${latestFolder.name}".`);
        return { status: 'added' };
    }

    async function showFolderPicker() {
        if (!getRootProfiles().length) {
            showToast('Create a profile first.');
            return;
        }

        const selection = getCurrentSelection();
        if (!selection) {
            showToast('Open a show or movie first.');
            return;
        }

        const latestState = await getStoredState();
        appState = latestState;

        const profileGroups = getRootProfiles(latestState.folders)
            .map((profile) => ({
                profile,
                entries: collectAddTargetsForProfile(profile.id, latestState.folders, 0)
            }))
            .filter((group) => group.entries.length);

        const quickTargets = latestState.folders.filter((folder) => {
            return (
                folder.parentId !== null &&
                !hasFolderLock(folder) &&
                !findLockedAncestor(folder.id, latestState.folders)
            );
        });

        if (!profileGroups.length) {
            showToast('Create a folder or sub folder first.');
            return;
        }

        if (latestState.settings.bypassShowPopups) {
            const rememberedTarget = getFolderById(latestState.settings.lastAddTargetFolderId, latestState.folders);
            const quickTarget = rememberedTarget && quickTargets.some((folder) => folder.id === rememberedTarget.id)
                ? rememberedTarget
                : quickTargets.length === 1
                    ? quickTargets[0]
                    : null;

            if (quickTarget) {
                const quickResult = await addSelectionToFolder(selection, quickTarget.id, latestState);
                if (quickResult.status === 'added') {
                    return;
                }

                if (quickResult.status !== 'duplicate' || quickTargets.length === 1) {
                    return;
                }
            }
        }

        const picker = document.createElement('div');
        picker.className = 'picker-backdrop';

        const box = document.createElement('div');
        box.className = 'picker-box add-picker-box';

        const heading = document.createElement('h3');
        heading.textContent = 'Select Folder';
        box.appendChild(heading);

        const profileGrid = document.createElement('div');
        profileGrid.className = 'add-picker-grid';

        const emptyNotice = document.createElement('div');
        emptyNotice.className = 'add-picker-empty';
        emptyNotice.textContent = 'All profile boxes were hidden. Close this window and open Add again if you want them back.';

        const updateProfileGridLayout = () => {
            const visibleCards = Array.from(profileGrid.children).filter((element) => element.classList.contains('add-picker-card'));
            const visibleCount = visibleCards.length;
            const cardWidth = visibleCount <= 1
                ? '340px'
                : visibleCount === 2
                    ? '290px'
                    : visibleCount === 3
                        ? '250px'
                        : visibleCount === 4
                            ? '225px'
                            : '210px';
            const numericCardWidth = Number.parseInt(cardWidth, 10) || 260;
            const gapWidth = 18;
            const horizontalPadding = 40;

            profileGrid.style.setProperty('--profile-card-width', cardWidth);

            if (!visibleCount) {
                if (!emptyNotice.isConnected) {
                    profileGrid.appendChild(emptyNotice);
                }
                box.style.width = 'min(420px, calc(100vw - 48px))';
                return;
            }

            if (emptyNotice.isConnected) {
                emptyNotice.remove();
            }

            const targetWidth = (visibleCount * numericCardWidth) + (Math.max(0, visibleCount - 1) * gapWidth) + horizontalPadding;
            box.style.width = `min(${targetWidth}px, calc(100vw - 48px))`;
        };

        profileGroups.forEach(({ profile, entries }) => {
            const profileCard = document.createElement('section');
            profileCard.className = 'add-picker-card';

            const profileHeader = document.createElement('div');
            profileHeader.className = 'add-picker-card-header';

            const profileTitle = document.createElement('h4');
            profileTitle.className = 'add-picker-card-title';
            profileTitle.textContent = `Profile: ${profile.name}`;

            const hideButton = document.createElement('button');
            hideButton.className = 'add-picker-card-close';
            hideButton.type = 'button';
            hideButton.textContent = 'X';
            hideButton.title = `Hide ${profile.name}`;
            hideButton.addEventListener('click', () => {
                profileCard.remove();
                updateProfileGridLayout();
            });

            const profileList = document.createElement('div');
            profileList.className = 'add-picker-card-list';

            entries.forEach(({ folder, depth }) => {
                const button = document.createElement('button');
                button.className = 'picker-action add-picker-action';
                button.type = 'button';

                const label = document.createElement('span');
                label.className = 'add-picker-action-label';
                label.style.paddingLeft = `${12 + (depth * 16)}px`;

                const typeLine = document.createElement('span');
                typeLine.className = 'add-picker-action-type';
                typeLine.textContent = getFolderLabel(folder);

                const nameLine = document.createElement('span');
                nameLine.className = 'add-picker-action-name';

                const selfLocked = hasFolderLock(folder);
                const lockedAncestor = findLockedAncestor(folder.id, latestState.folders);
                nameLine.textContent = `${selfLocked || lockedAncestor ? `${LOCKED_GLYPH} ` : ''}${folder.name}`;

                label.appendChild(typeLine);
                label.appendChild(nameLine);
                button.appendChild(label);

                button.addEventListener('click', async () => {
                    const result = await addSelectionToFolder(selection, folder.id);
                    if (
                        result.status === 'added' ||
                        result.status === 'duplicate' ||
                        result.status === 'missing'
                    ) {
                        picker.remove();
                    }
                });

                profileList.appendChild(button);
            });

            profileHeader.appendChild(profileTitle);
            profileHeader.appendChild(hideButton);
            profileCard.appendChild(profileHeader);
            profileCard.appendChild(profileList);
            profileGrid.appendChild(profileCard);
        });
        updateProfileGridLayout();

        const cancelButton = document.createElement('button');
        cancelButton.className = 'picker-cancel';
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
            picker.remove();
        });

        box.appendChild(profileGrid);
        box.appendChild(cancelButton);
        picker.appendChild(box);
        document.body.appendChild(picker);
    }

    /*
    ╔════════════════════════════════════════════════════════════╗
    ║ EVENTS AND STARTUP                                       ║
    ╚════════════════════════════════════════════════════════════╝
    */

    function bindEvents() {
        sidebar.querySelector('#home-button').addEventListener('click', () => {
            window.location.href = 'https://web.stremio.com/';
        });

        sidebar.querySelector('#add-button').addEventListener('click', () => {
            showFolderPicker().catch(() => {
                showToast('Could not add this item right now.');
            });
        });

        editToggleButton.addEventListener('click', () => {
            isEditMode = !isEditMode;
            applySidebarVisibility();
            renderFolders();
        });

        sidebar.querySelector('#settings-button').addEventListener('click', () => {
            openSettingsPage().catch(() => {
                showToast('Could not open settings.');
            });
        });

        sidebar.querySelector('#github-button').addEventListener('click', () => {
            window.open('https://github.com/ChimeraGaming/Stremio-Addons', '_blank', 'noopener');
        });

        sidebar.querySelector('#discord-button').addEventListener('click', () => {
            window.open('https://discord.com/invite/stremio-community-667359689780101130', '_blank', 'noopener');
        });

        sidebar.querySelector('#close-button').addEventListener('click', () => {
            setPanelClosed(true);
        });

        sidebar.querySelector('#window-close-button').addEventListener('click', () => {
            setPanelClosed(true);
        });

        launcherButton.addEventListener('pointerdown', (event) => {
            beginLauncherDrag(event);
        });

        launcherButton.addEventListener('pointermove', (event) => {
            moveLauncherDrag(event);
        });

        launcherButton.addEventListener('pointerup', () => {
            endLauncherDrag();
        });

        launcherButton.addEventListener('pointercancel', () => {
            endLauncherDrag();
        });

        launcherButton.addEventListener('click', (event) => {
            if (launcherDragState.suppressClick) {
                launcherDragState.suppressClick = false;
                event.preventDefault();
                return;
            }

            setPanelClosed(false);
        });

        sidebar.querySelector('#minimize-button').addEventListener('click', () => {
            toggleSidebarPin().catch(() => {
                showToast('Could not update sidebar state.');
            });
        });

        sidebar.querySelector('#panel-titlebar').addEventListener('pointerdown', (event) => {
            if (event.target.closest('button')) {
                return;
            }

            beginWindowDrag(event);
        });

        sidebar.querySelector('#panel-titlebar').addEventListener('pointermove', (event) => {
            moveWindowDrag(event);
        });

        sidebar.querySelector('#panel-titlebar').addEventListener('pointerup', () => {
            endWindowDrag();
        });

        sidebar.querySelector('#panel-titlebar').addEventListener('pointercancel', () => {
            endWindowDrag();
        });

        sidebar.querySelector('#create-folder').addEventListener('click', () => {
            createFolder().catch(() => {
                showToast('Could not create folder.');
            });
        });

        sidebar.querySelector('#create-profile').addEventListener('click', () => {
            createProfile().catch(() => {
                showToast('Could not create profile.');
            });
        });

        searchInput.addEventListener('input', (event) => {
            searchQuery = getSafeText(event.target.value, '').toLowerCase();
            renderFolders();
        });

        window.addEventListener('resize', () => {
            applyLauncherPosition();

            if (isFolderViewLayout()) {
                clampWindowPosition(windowPosition.left, windowPosition.top);
            }
        });

        if (storageAvailable() && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName !== 'local' || !changes[STORAGE_KEY]) {
                    return;
                }

                const previousLayoutMode = getLayoutMode();
                const previousFolders = appState.folders;
                const previousSettings = appState.settings;
                appState = normalizeState(changes[STORAGE_KEY].newValue);
                syncUnlockedFolderIds(previousFolders, appState.folders, previousSettings, appState.settings);
                syncLegacyFolders();

                if (previousLayoutMode !== getLayoutMode()) {
                    panelClosed = false;
                }

                applySidebarVisibility();
                renderFolders();
            });
        }
    }

    async function init() {
        if (!document.body || document.getElementById('folder-sidebar')) {
            return;
        }

        injectStyles();
        buildSidebar();
        bindEvents();
        await migrateLegacyStateIfNeeded();
        applySidebarVisibility();
        renderFolders();
        startPlaybackWatcher();
        startWatchStatsSync();
    }

    init().catch(() => {
        showToast('Chimera Folders failed to load.');
    });
})();
