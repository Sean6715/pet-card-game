// ============================================================
// config.js — 牌庫管理 + 自選配置
// ============================================================

// ===== 牌庫 =====
const DECK_SETTINGS_KEY = "petAdventureDeckSettings_v2";
function loadDeckSettings() { return readStorage(DECK_SETTINGS_KEY, {}); }
function saveDeckSettings(s) { localStorage.setItem(DECK_SETTINGS_KEY, JSON.stringify(s)); }
function getDeckSettingsForHero(heroId) {
    const s = loadDeckSettings()[heroId];
    return (s && s.mode) ? s : { mode: "preset", customDeck: null };
}
function setDeckSettingsForHero(heroId, settings) {
    const all = loadDeckSettings();
    all[heroId] = settings;
    saveDeckSettings(all);
}
function getDeckForHero(heroId) {
    const s = getDeckSettingsForHero(heroId);
    if (s.mode === "custom" && Array.isArray(s.customDeck) && s.customDeck.length === 15)
        return s.customDeck.map(String);
    return defaultDecks[heroId].map(String);
}

function openDeckManager() {
    selectDeckHero(heroes[0].id);
    $("deck-manager-modal").style.display = "flex";
}
function selectDeckHero(heroId) {
    const s = getDeckSettingsForHero(heroId);
    const fixed = heroCards.filter(c => c.heroId === heroId).map(c => String(c.id));
    const commons = (s.mode === "custom" && s.customDeck && s.customDeck.length === 15)
        ? s.customDeck.map(String).filter(id => !fixed.includes(id))
        : defaultDecks[heroId].map(String).filter(id => !fixed.includes(id));
    deckManagerState = { heroId, mode: s.mode || "preset", commons: [...commons] };
    renderDeckManager();
}
// renderDeckManager / setDeckMode / addCommonCard / removeCommonCard / saveDeckManager
// 全部同原版，只把 document.getElementById → $()

// ===== 自選配置 =====
const LOCK_KEY = "petAdventureLockedConfig_v2";
const DEFAULT_LOCKED = {
    hero: { locked: false, value: "random" },
    boss: { locked: false, value: "random" },
    mod:  { locked: false, value: "random" },
    difficulty: "normal"
};
function loadLockedConfig() { return readStorage(LOCK_KEY, DEFAULT_LOCKED); }
function saveLockedConfig(cfg) { localStorage.setItem(LOCK_KEY, JSON.stringify(cfg)); }
function toggleLock(type) {
    const cfg = loadLockedConfig();
    cfg[type].locked = !cfg[type].locked;
    saveLockedConfig(cfg);
    updateLockUI();
}
// updateLockUI / populateSetupOptions / openSetupModal / onSetupHeroChange / startConfiguredGame
// 全部同原版，只把 document.getElementById → $()