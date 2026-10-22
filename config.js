// ============================================================
// config.js — 牌庫管理 + 自選配置（完整版）
// 依賴：data.js、utils.js
// ============================================================

// ===== 牌庫設定 =====
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

// ===== 牌庫管理器 =====
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

function renderDeckManager() {
    const { heroId, mode, commons } = deckManagerState;
    const hero = heroes.find(h => h.id === heroId);

    // 英雄切換鈕
    $("deck-manager-heroes").innerHTML = heroes.map(h => {
        const s = getDeckSettingsForHero(h.id);
        const isActive = h.id === heroId;
        const modeLabel = s.mode === "preset" ? "預設" : "自選";
        return `<button class="hero-chip ${isActive ? 'active' : ''}" onclick="selectDeckHero('${h.id}')">
            ${h.icon} ${h.name}
            <span class="mode-badge ${s.mode}">${modeLabel}</span>
        </button>`;
    }).join("");

    // 模式切換
    $("deck-manager-mode").innerHTML = `
        <button class="${mode === 'preset' ? 'active' : ''}" onclick="setDeckMode('preset')">📘 使用預設牌庫</button>
        <button class="${mode === 'custom' ? 'active' : ''}" onclick="setDeckMode('custom')">✏️ 使用自選牌庫</button>
    `;

    const fixedCards = heroCards.filter(c => c.heroId === heroId);
    let content = "";

    if (mode === "preset") {
        content += `<div class="deck-section">
            <div class="deck-section-title fixed"><span>📘 ${hero.name} 預設牌庫預覽（15 張）</span></div>
            <div style="color:#cbd5e1; font-size:12px; padding:8px 0;">
                使用系統預設牌庫，切換為「自選」即可編輯通用卡。
            </div>
            <div class="card-grid">
                ${defaultDecks[heroId].map(id => {
                    const c = cardById[String(id)];
                    if (!c) return "";
                    const isFixed = fixedCards.some(fc => String(fc.id) === String(id));
                    return `<div class="deck-card ${c.type} ${isFixed ? 'fixed' : ''}"
                        onmouseenter="showTooltip(event, cardById['${c.id}'])"
                        onmouseleave="hideTooltip()"
                        ontouchstart="handleTouchStart(event, '${c.id}')"
                        ontouchend="handleTouchEnd()">
                        <div class="deck-card-name">${c.name}</div>
                        <div class="deck-card-info">${rarityName(c.rarity)}</div>
                        <div class="deck-card-count">${isFixed ? '專屬' : ''}</div>
                    </div>`;
                }).join("")}
            </div>
        </div>`;
    } else {
        const total = fixedCards.length + commons.length;
        content += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div class="deck-section-title fixed" style="margin:0; flex:1;"><span>✏️ 編輯自選牌庫（${total} / 15）</span></div>
        </div>`;

        // 專屬卡
        content += `<div class="deck-section">
            <div class="deck-section-title fixed"><span>🔒 ${hero.name} 專屬卡（固定 ${fixedCards.length} 張）</span></div>
            <div class="card-grid">
                ${fixedCards.map(c => `
                    <div class="deck-card fixed ${c.type}"
                        onmouseenter="showTooltip(event, cardById['${c.id}'])"
                        onmouseleave="hideTooltip()"
                        ontouchstart="handleTouchStart(event, '${c.id}')"
                        ontouchend="handleTouchEnd()">
                        <div class="deck-card-name">${c.name}</div>
                        <div class="deck-card-info">${rarityName(c.rarity)}</div>
                        <div class="deck-card-count">鎖定</div>
                    </div>
                `).join("")}
            </div>
        </div>`;

        // 通用卡三分類
        const categories = [
            { key: "攻擊", cls: "attack" },
            { key: "回復", cls: "heal" },
            { key: "特殊", cls: "special" }
        ];
        categories.forEach(cat => {
            const cardsInCat = commonCards.filter(c => c.category === cat.key);
            content += `<div class="deck-section">
                <div class="deck-section-title ${cat.cls}"><span>${cat.key}型（${cardsInCat.length} 種）</span></div>
                <div class="card-grid">
                    ${cardsInCat.map(c => {
                        const cid = String(c.id);
                        const count = commons.filter(id => id === cid).length;
                        const limit = rarityLimit[c.rarity];
                        const canAdd = count < limit && total < 15;
                        const isSelected = count > 0;
                        const cls = `deck-card ${c.type}` + (isSelected ? " selected" : "");
                        return `<div class="${cls}"
                            onmouseenter="showTooltip(event, cardById['${cid}'])"
                            onmouseleave="hideTooltip()"
                            ontouchstart="handleTouchStart(event, '${cid}')"
                            ontouchend="handleTouchEnd()">
                            <div class="deck-card-name">${c.name}</div>
                            <div class="deck-card-info">${rarityName(c.rarity)}</div>
                            <div class="deck-card-controls">
                                <button class="ctrl-btn minus" onclick="event.stopPropagation(); removeCommonCard('${cid}')">-</button>
                                <div class="deck-card-count">${count} / ${limit}</div>
                                <button class="ctrl-btn plus" onclick="event.stopPropagation(); addCommonCard('${cid}')" ${canAdd ? '' : 'disabled style="opacity:0.3;cursor:not-allowed;"'}>+</button>
                            </div>
                        </div>`;
                    }).join("")}
                </div>
            </div>`;
        });
    }

    $("deck-manager-content").innerHTML = content;
}

function setDeckMode(mode) {
    if (mode === deckManagerState.mode) return;
    if (mode === "custom") {
        const fixed = heroCards.filter(c => c.heroId === deckManagerState.heroId).map(c => String(c.id));
        const preset = defaultDecks[deckManagerState.heroId].map(String);
        const currentTotal = deckManagerState.commons.length + 3;
        if (currentTotal !== 15) {
            deckManagerState.commons = preset.filter(id => !fixed.includes(id));
        }
    }
    deckManagerState.mode = mode;
    renderDeckManager();
}

function addCommonCard(cardId) {
    const cid = String(cardId);
    const card = cardById[cid];
    if (!card) return;
    const { commons } = deckManagerState;
    const currentCount = commons.filter(id => id === cid).length;
    const total = commons.length + 3;
    if (currentCount < rarityLimit[card.rarity] && total < 15) {
        commons.push(cid);
        renderDeckManager();
    }
}

function removeCommonCard(cardId) {
    const cid = String(cardId);
    const { commons } = deckManagerState;
    const idx = commons.indexOf(cid);
    if (idx >= 0) {
        commons.splice(idx, 1);
        renderDeckManager();
    }
}

function saveDeckManager() {
    const { heroId, mode, commons } = deckManagerState;
    const s = getDeckSettingsForHero(heroId);
    s.mode = mode;

    if (mode === "custom") {
        if (commons.length !== 12) {
            alert(`自選牌庫的通用卡必須剛好 12 張（目前 ${commons.length} 張）`);
            return;
        }
        const fixed = heroCards.filter(c => c.heroId === heroId).map(c => String(c.id));
        s.customDeck = [...fixed, ...commons];
    }
    setDeckSettingsForHero(heroId, s);

    const hero = heroes.find(h => h.id === heroId);
    log(`📚 已保存「${hero.name}」的牌庫設定：${mode === 'preset' ? '預設' : '自選'}。`, "info");
    renderDeckManager();
    onSetupHeroChange();
}

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

function updateLockUI() {
    const cfg = loadLockedConfig();
    ["hero","boss","mod"].forEach(type => {
        const btn = $(`lock-${type}`);
        if (!btn) return;
        if (cfg[type].locked) { btn.innerText = "🔒"; btn.classList.add("locked"); }
        else { btn.innerText = "🔓"; btn.classList.remove("locked"); }
    });
}

function populateSetupOptions() {
    const heroSelect = $("hero-select");
    const bossSelect = $("boss-select");
    const modSelect = $("modifier-select");

    if (heroSelect) {
        const cur = heroSelect.value;
        heroSelect.innerHTML = `<option value="random">🔀 隨機英雄</option>` + heroes.map(h => `<option value="${h.id}">${h.icon} ${h.name}</option>`).join("");
        heroSelect.value = cur;
    }
    if (bossSelect) {
        const cur = bossSelect.value;
        bossSelect.innerHTML = `<option value="random">🔀 隨機魔王</option>` + bossTypes.map(b => `<option value="${b.id}">${b.icon} ${b.name}</option>`).join("");
        bossSelect.value = cur;
    }
    if (modSelect) {
        const cur = modSelect.value;
        modSelect.innerHTML = `<option value="random">🔀 隨機戰場</option>` + battlefieldModifiers.map(m => `<option value="${m.effect}">${m.name}</option>`).join("");
        modSelect.value = cur;
    }
}

function openSetupModal() {
    populateSetupOptions();
    const cfg = loadLockedConfig();
    $("hero-select").value = cfg.hero.value || "random";
    $("boss-select").value = cfg.boss.value || "random";
    $("modifier-select").value = cfg.mod.value || "random";
    $("difficulty-select").value = cfg.difficulty || "normal";

    const st = loadSettings();
    $("sfx-toggle").checked = !!st.sfx;
    $("vib-toggle").checked = !!st.vibration;
    $("vfx-toggle").checked = !!st.vfx;

    updateLockUI();
    onSetupHeroChange();
    $("setup-modal").style.display = "flex";
}

function onSetupHeroChange() {
    const heroId = $("hero-select").value;
    const previewEl = $("deck-preview");
    if (heroId === "random") {
        previewEl.innerHTML = `牌庫：隨機英雄，每局依該英雄設定決定（<b>預設</b> 或 <b>自選</b>）`;
        return;
    }
    const s = getDeckSettingsForHero(heroId);
    const modeLabel = s.mode === "preset" ? "📘 預設牌庫" : "✏️ 自選牌庫";
    const deck = getDeckForHero(heroId);
    previewEl.innerHTML = `當前牌庫：<b>${modeLabel}</b>（${deck.length} 張：3 專屬 + ${deck.length - 3} 通用）`;
}

function startConfiguredGame() {
    const hv = $("hero-select").value;
    const bv = $("boss-select").value;
    const mv = $("modifier-select").value;
    const dv = $("difficulty-select").value;

    saveSettings({
        sfx: $("sfx-toggle").checked,
        vibration: $("vib-toggle").checked,
        vfx: $("vfx-toggle").checked
    });

    const cfg = loadLockedConfig();
    cfg.hero.value = hv;
    cfg.boss.value = bv;
    cfg.mod.value = mv;
    cfg.difficulty = dv;
    saveLockedConfig(cfg);

    const hero = hv === "random" ? heroes[Math.floor(Math.random() * heroes.length)] : heroes.find(x => x.id === hv);
    const boss = bv === "random" ? bossTypes[Math.floor(Math.random() * bossTypes.length)] : bossTypes.find(x => x.id === bv);
    const mod = mv === "random" ? battlefieldModifiers[Math.floor(Math.random() * battlefieldModifiers.length)] : battlefieldModifiers.find(x => x.effect === mv);
    const deck = getDeckForHero(hero.id);

    closeModal("setup-modal");
    initGameWithConfig(hero, boss, mod, false, dv, deck);
}
