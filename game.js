let S = null;
let deckManagerState = { heroId: "ignis", mode: "preset", commons: [] };
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let isBatching = false;
let batchedLogHTML = "";

const SETTINGS_KEY = "petAdventureGameSettings_v3";
function loadSettings() {
    try {
        const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        if (raw && typeof raw === "object") return raw;
    } catch (e) {}
    return { sfx: false, vibration: false, vfx: false };
}
function saveSettings(cfg) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg)); }

function playSfx(type) {
    const st = loadSettings();
    if (!st.sfx) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'attack') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start(); osc.stop(ctx.currentTime + 0.15);
        } else if (type === 'heal') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
        } else if (type === 'shield') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start(); osc.stop(ctx.currentTime + 0.15);
        } else if (type === 'crit') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
            osc.start(); osc.stop(ctx.currentTime + 0.25);
        }
    } catch (e) {}
}

function triggerVib(pattern = 40) {
    const st = loadSettings();
    if (!st.vibration) return;
    if (navigator.vibrate) {
        try { navigator.vibrate(pattern); } catch (e) {}
    }
}

function triggerShake() {
    const st = loadSettings();
    if (!st.vfx) return;
    const container = document.querySelector('.container');
    if (container) {
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 300);
    }
}

function formatLogHTML(html, type) {
    if (type === "player-turn" || type === "monster-turn") {
        return `<div class="log-${type}">${html}</div>`;
    }
    return `<div class="log-line log-${type}">${html}</div>`;
}

async function log(html, type = "info", delay = 0) {
    if (isBatching) {
        batchedLogHTML += formatLogHTML(html, type);
        return;
    }
    const box = document.getElementById("log-box");
    box.innerHTML += formatLogHTML(html, type);
    box.scrollTop = box.scrollHeight;
    if (delay > 0) await sleep(delay);
}

function flushLogBatch() {
    if (batchedLogHTML) {
        const box = document.getElementById("log-box");
        box.innerHTML += batchedLogHTML;
        box.scrollTop = box.scrollHeight;
        batchedLogHTML = "";
    }
}

let tooltipEl = null;
let tooltipTimeout = null;

function showTooltip(e, card) {
    hideTooltip();
    tooltipEl = document.createElement("div");
    tooltipEl.className = `tooltip-box ${card.type}`;
    tooltipEl.innerHTML = `<b>${card.name} <span class="rarity-tag rarity-${card.rarity}">${rarityName(card.rarity)}</span></b><p>${card.desc}</p>`;
    document.body.appendChild(tooltipEl);
    let clientX = e.clientX || (e.touches && e.touches[0].clientX);
    let clientY = e.clientY || (e.touches && e.touches[0].clientY);
    tooltipEl.style.left = clientX + 'px';
    tooltipEl.style.top = clientY + 'px';
}
function hideTooltip() {
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    if (tooltipTimeout) { clearTimeout(tooltipTimeout); tooltipTimeout = null; }
}
function handleTouchStart(e, cardId) {
    const card = cardById[String(cardId)];
    tooltipTimeout = setTimeout(() => { showTooltip(e, card); }, 400);
}
function handleTouchEnd() {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    setTimeout(hideTooltip, 100);
}

const DECK_SETTINGS_KEY = "petAdventureDeckSettings_v2";
function loadDeckSettings() {
    try {
        const raw = JSON.parse(localStorage.getItem(DECK_SETTINGS_KEY));
        if (raw && typeof raw === "object") return raw;
    } catch (e) {}
    return {};
}
function saveDeckSettings(settings) { localStorage.setItem(DECK_SETTINGS_KEY, JSON.stringify(settings)); }
function getDeckSettingsForHero(heroId) {
    const all = loadDeckSettings();
    const s = all[heroId];
    if (s && s.mode) return s;
    return { mode: "preset", customDeck: null };
}
function setDeckSettingsForHero(heroId, settings) {
    const all = loadDeckSettings();
    all[heroId] = settings;
    saveDeckSettings(all);
}
function getDeckForHero(heroId) {
    const s = getDeckSettingsForHero(heroId);
    if (s.mode === "custom" && Array.isArray(s.customDeck) && s.customDeck.length === 15) {
        return s.customDeck.map(String);
    }
    return defaultDecks[heroId].map(String);
}

function healModifier() { return S.mod.effect === "weak_heal" ? 0.6 : 1.0; }
function healPlayer(amount) {
    const actual = Math.round(amount * healModifier());
    S.player.hp = Math.min(S.player.maxHp, S.player.hp + actual);
    playSfx('heal');
    return actual;
}
function healMonster(amount) {
    const actual = Math.round(amount * healModifier());
    S.monster.hp = Math.min(S.monster.maxHp, S.monster.hp + actual);
    return actual;
}
function toggleModal(id) {
    const m = document.getElementById(id);
    m.style.display = m.style.display === "flex" ? "none" : "flex";
    if (m.style.display === "none") hideTooltip();
}
function closeModal(id) { document.getElementById(id).style.display = "none"; }
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function rarityName(r) {
    return r === "common" ? "普通" : r === "rare" ? "稀有" : "傳說";
}

function drawCards(n) {
    for (let i = 0; i < n; i++) {
        if (S.drawPile.length === 0) {
            if (S.discardPile.length === 0) {
                log(`📚 抽牌堆與棄牌堆皆空，無法再抽牌！`, "warn");
                return;
            }
            S.drawPile = shuffleArray([...S.discardPile]);
            S.discardPile = [];
            log(`🔄 抽牌堆已空，將棄牌堆 ${S.drawPile.length} 張洗回抽牌堆。`, "info");
        }
        const cardId = S.drawPile.pop();
        const card = cardById[cardId];
        if (card) S.hand.push(card);
    }
}

async function refillHandIfEmpty() {
    if (S.isTutorial) return true;
    if (S.hand.length > 0) return true;
    
    let drawCount = 3;
    if (S.hero.trait === "raccoon") drawCount += 1;
    if (S.mod.effect === "fog_choice") drawCount = Math.max(1, drawCount - 1);
    
    let initialLength = S.hand.length;
    drawCards(drawCount);
    
    if (S.hand.length > initialLength) {
        await log(`📚 手牌耗盡，自動補充 ${S.hand.length - initialLength} 張牌。`, "info");
        return true;
    } else {
        await log(`⚠️ 牌庫已耗盡，無法繼續行動。`, "warn");
        return false;
    }
}

function showPileInfo(type) {
    if (!S || S.isTutorial) return;
    const pile = type === 'draw' ? S.drawPile : S.discardPile;
    const title = type === 'draw' ? '📚 抽牌堆內容' : '🗑️ 棄牌堆內容';
    document.getElementById("pile-modal-title").innerText = title;
    
    const counts = {};
    pile.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

    let html = "";
    Object.keys(counts).forEach(id => {
        const c = cardById[id];
        if (!c) return;
        html += `<div class="compendium-card ${c.type}" style="width: 100%; padding: 8px; margin-bottom: 4px;">
            <b>${c.name} <span class="rarity-tag rarity-${c.rarity}">${rarityName(c.rarity)}</span></b>
            <p style="font-size:11px;">${c.desc}</p>
            <div style="position:absolute; right:8px; top:8px; font-weight:bold; color:#fbbf24;">×${counts[id]}</div>
        </div>`;
    });
    if (!html) html = `<p style="color:#94a3b8; text-align:center; width:100%;">牌堆是空的</p>`;
    document.getElementById("pile-modal-body").innerHTML = html;
    toggleModal('pile-modal');
}

function applyPlayerAttackModifiers(baseValue) {
    let mult = S.player.nextAttackMultiplier;
    if (mult > 1) {
        S.player.nextAttackMultiplier = 1;
    } else {
        mult = 1;
    }

    let attackBonus = 0;
    if (S.player.nextAttacksCount > 0) {
        attackBonus = S.player.nextAttacksBonus;
        S.player.nextAttacksCount--;
        log(`✨ 魔法增幅：本次攻擊傷害 +${attackBonus} 點！（剩餘 ${S.player.nextAttacksCount} 次）`, "crit");
    }

    let turtloBonus = 0;
    if (S.hero.trait === "turtlo" && S.player.shield > 20) {
        turtloBonus = Math.floor(S.player.shield * 0.25);
        log(`🐢 堅甲防禦反震：額外附加 ${turtloBonus} 點護盾衝擊傷害！`, "shield");
    }

    let extraAtk = (S.player.atkBuff || 0) + (S.player.permanentAtkBuff || 0);
    S.player.atkBuff = 0;

    let dmg = (baseValue + extraAtk + turtloBonus) * mult + attackBonus;
    const dmgMult = S.mod.effect === "berserk" ? 1.2 : 1.0;
    return Math.round(Math.round(dmg * dmgMult));
}

async function addShieldToPlayer(amount) {
    let add = S.hero.trait === "turtlo" ? Math.round(amount * 1.1) : amount;
    S.player.shield += add;

    if (S.hero.trait === "hedgehog") {
        if (S.player.hedgehogBuff < 12 && S.player.shield >= 15) {
            const overflow = S.player.shield - 15;
            if (overflow > 0) {
                const atkGain = Math.min(Math.floor(overflow / 2), 12 - S.player.hedgehogBuff);
                if (atkGain > 0) {
                    S.player.permanentAtkBuff += atkGain;
                    S.player.hedgehogBuff += atkGain;
                    S.player.shield = 15;
                    await log(`🦔 <b>【超頻核心】</b>護盾溢出 15 點！轉化為永久攻擊力 +${atkGain}（累積 +${S.player.hedgehogBuff}/12）！`, "crit");
                }
            }
        }
    }

    playSfx('shield');
    return S.player.shield;
}

function clearPlayerAllBuffsAndShields() {
    S.player.shield = 0;
    S.player.atkBuff = 0;
    S.player.nextAttackMultiplier = 1;
    S.player.nextAttacksBonus = 0;
    S.player.nextAttacksCount = 0;
    S.player.regenTurns = 0;
    S.player.reflectActive = false;
    S.player.damageReduction = 0;
    S.player.turtloCounter = false;
}

function clearMonsterAllBuffsAndShields() {
    S.monster.shield = 0;
    S.monster.poison = 0;
    S.monster.weakTurns = 0;
    S.monster.markedTurns = 0;
    S.monster.atkBuffTurns = 0;
    S.delayedBombs = [];
}

async function applyDamageToMonster(dmg, opts = {}) {
    const { ignoreShield = false, cardName = null, canEvade = true, fromPlayer = true } = opts;

    const isElemThunder = S.boss.trait === "elementalist" && S.monster.elemStance === "thunder";
    const evasionChance = isElemThunder ? 0.20 : (S.boss.trait === "evasion" ? 0.27 : 0);

    if (canEvade && evasionChance > 0 && S.monster.sealedTurns <= 0 && Math.random() < evasionChance) {
        const evaderName = isElemThunder ? "元素巫師（迅雷形態）" : "影魔";
        await log(`💨 <b>【閃避成功】</b>${evaderName}身形一閃，完全躲開${cardName ? ` <b>${cardName}</b>` : "攻擊"}！`, "info");
        return { hit: false, actualDmg: 0, finalDmg: 0, markApplied: false };
    }

    if (S.boss.trait === "elementalist" && S.monster.elemStance === "ice" && S.monster.sealedTurns <= 0) {
        dmg = Math.round(dmg * 0.7);
        await log(`🧊 <b>元素巫師【寒冰形態】</b>受到傷害減少 30%！`, "status");
    }

    const baseDmg = dmg;
    let markApplied = false;
    if (fromPlayer && S.monster.markedTurns > 0) {
        dmg = Math.round(dmg * 1.25);
        markApplied = true;
    }

    const shieldBefore = S.monster.shield;
    let actualDmg = 0, shieldLost = 0;

    if (ignoreShield || S.monster.shield <= 0) {
        S.monster.hp -= dmg;
        actualDmg = dmg;
    } else if (S.monster.shield >= dmg) {
        S.monster.shield -= dmg;
        shieldLost = dmg;
    } else {
        const overflow = dmg - S.monster.shield;
        shieldLost = S.monster.shield;
        S.monster.shield = 0;
        S.monster.hp -= overflow;
        actualDmg = overflow;
    }

    playSfx('attack');
    triggerVib(50);
    triggerShake();

    if (markApplied) {
        await log(`🎯🎯 <b>【弱點標記生效】</b>傷害 ×1.25：${baseDmg} → ${dmg}`, "mark");
    }

    if (S.boss.trait === "guardian"
        && shieldBefore > 0 && S.monster.shield === 0
        && !ignoreShield && fromPlayer && S.monster.guardianCd <= 0
        && S.monster.sealedTurns <= 0) {
        S.monster.guardianCd = 2;
        await log(`🏰💥 <b>【鋼鐵反震】</b>護盾被擊破，反擊 12 點真實傷害（無視護盾，冷卻 2 回合）！`, "crit");
        await dealDamageToPlayer(12, "shield_break", { ignoreShield: true });
    }

    if (S.mod.effect === "thorns" && fromPlayer && (actualDmg > 0 || shieldLost > 0)) {
        await log(`🌵 荊棘之地反刺：玩家受到 3 點反傷（無視護盾）`, "warn");
        await dealDamageToPlayer(3, "thorns", { ignoreShield: true });
    }

    if (S.boss.trait === "time_phantom" && !S.monster.timeRewound && S.monster.hp > 0 && S.monster.hp <= S.monster.maxHp * 0.3) {
        if (S.monster.sealedTurns > 0) {
            await log(`🔒🔒 <b>【禁錮封印】封鎖了時空幻影的熵增回溯！</b>`, "seal");
        } else {
            S.monster.timeRewound = true;
            S.monster.hp = Math.round(S.monster.maxHp * 0.5);
            clearPlayerAllBuffsAndShields();
            clearMonsterAllBuffsAndShields();
            await log(`⏳💥 <b>【熵增回溯發動！】</b>時空幻影生命回升至 50%（${S.monster.hp} 點），並強制<b>清空雙方護盾與臨時狀態（保留永久攻擊成長）！</b>`, "crit");
        }
    }

    return { hit: true, actualDmg, finalDmg: dmg, markApplied };
}

async function dealDamageToPlayer(rawDmg, source, opts = {}) {
    const { ignoreShield = false } = opts;
    let dmg = rawDmg, shieldAbsorbed = 0;

    if (S.player.regenTurns > 0 && (source === "attack" || source === "roar")) {
        dmg = Math.max(0, dmg - 3);
        await log(`🌿 泉源祝福：減免 3 點傷害！`, "heal");
    }

    if (S.player.damageReduction > 0 && (source === "attack" || source === "roar")) {
        dmg = Math.max(0, dmg - S.player.damageReduction);
        await log(`⛰️ 不動如山：本次傷害減少 ${S.player.damageReduction} 點！`, "shield");
    }

    if (!ignoreShield && S.player.shield > 0) {
        if (S.player.shield >= dmg) {
            shieldAbsorbed = dmg;
            S.player.shield -= dmg;
            dmg = 0;
        } else {
            shieldAbsorbed = S.player.shield;
            dmg -= S.player.shield;
            S.player.shield = 0;
        }
    }
    S.player.hp -= dmg;

    playSfx('attack');
    triggerVib(60);
    triggerShake();

    if (S.hero.trait === "turtlo" && (source === "attack" || source === "roar") && rawDmg > 0) {
        await addShieldToPlayer(3);
        await log(`🛡️ 堅甲龜【堅甲防禦】：受擊獲得 3 點護盾！`, "shield");
    }

    if (S.player.reflectActive && (source === "attack" || source === "roar") && rawDmg > 0) {
        const reflect = Math.round(rawDmg * 0.5);
        await applyDamageToMonster(reflect, { cardName: "反彈護鏡", canEvade: false, fromPlayer: false });
        await log(`🔄 <b>反彈護鏡</b>：反彈魔王攻擊總傷害的 50%（${reflect} 點傷害）！`, "dmg");
    }

    if (S.player.turtloCounter && (source === "attack" || source === "roar") && rawDmg > 0) {
        const reflect = Math.round(rawDmg * 0.5);
        await applyDamageToMonster(reflect, { cardName: "反震裝甲", canEvade: false, fromPlayer: false });
        await log(`🦔 <b>反震裝甲</b>：反彈 ${reflect} 點傷害給魔王！`, "dmg");
    }

    if (S.mod.effect === "thorns" && (source === "attack" || source === "roar")) {
        await log(`🌵 荊棘之地反刺：魔王受到 3 點反傷（無視護盾）`, "warn");
        S.monster.hp -= 3;
    }
    return { shieldAbsorbed, hpLost: dmg };
}

function startRandomGame() {
    document.getElementById("tutorial-prompt").style.display = "none";
    const hero = heroes[Math.floor(Math.random() * heroes.length)];
    const boss = bossTypes[Math.floor(Math.random() * bossTypes.length)];
    const mod = battlefieldModifiers[Math.floor(Math.random() * battlefieldModifiers.length)];
    const deck = getDeckForHero(hero.id);
    initGameWithConfig(hero, boss, mod, false, "normal", deck);
}

function openTutorialStart() { document.getElementById("tutorial-start-modal").style.display = "flex"; }
function beginTutorialBattle() {
    closeModal("tutorial-start-modal");
    const h = heroes.find(x => x.id === "shadow");
    const b = bossTypes.find(x => x.id === "standard");
    const m = battlefieldModifiers.find(x => x.effect === "berserk");
    initGameWithConfig(h, b, m, true, "normal", []);
    document.getElementById("tutorial-prompt").style.display = "block";
    updateTutorialUI();
}
function skipTutorial() {
    closeModal("tutorial-start-modal");
    closeModal("tutorial-end-modal");
    document.getElementById("tutorial-prompt").style.display = "none";
    startRandomGame();
}

function showTutorialEndModal(success) {
    const title = document.getElementById("tutorial-end-title");
    const body = document.getElementById("tutorial-end-body");
    const btn1 = document.getElementById("tutorial-end-btn-1");
    const btn2 = document.getElementById("tutorial-end-btn-2");

    if (success) {
        title.innerText = "🎉 教學完成！";
        body.innerHTML = `<p>你已掌握英雄天賦、魔王技能、牌庫機制與 Combo 核心！</p>
            <div class="effect-item hero-item"><b>下一步：正式對局</b>
            <p>・直接開始 <b>標準對局</b>：隨機英雄 × 隨機魔王 × 該英雄當前牌庫。<br>
            ・打開 <b>牌庫管理</b>：切換英雄使用「預設」或「自選」牌庫。<br>
            ・打開 <b>自選配置</b>：鎖定英雄/魔王/戰場、選擇難度。</p></div>`;
        btn1.innerText = "🚀 開始標準對局";
        btn1.onclick = () => { closeModal("tutorial-end-modal"); startRandomGame(); };
        btn2.innerText = "📚 打開牌庫管理";
        btn2.onclick = () => { closeModal("tutorial-end-modal"); openDeckManager(); };
    } else {
        title.innerText = "❌ 教學未完成";
        body.innerHTML = `<p>別灰心！教學中的魔王雖已削弱，但仍需跟著引導操作。</p>`;
        btn1.innerText = "🔁 重新開始教學";
        btn1.onclick = () => { closeModal("tutorial-end-modal"); beginTutorialBattle(); };
        btn2.innerText = "⏩ 跳過教學，開始標準對局";
        btn2.onclick = () => { closeModal("tutorial-end-modal"); startRandomGame(); };
    }
    document.getElementById("tutorial-prompt").style.display = "none";
    document.getElementById("tutorial-end-modal").style.display = "flex";
}

function initGameWithConfig(hero, boss, mod, isTutorial, difficulty, deck) {
    S = {
        hero, boss, mod, isTutorial, difficulty: difficulty || "normal",
        turn: 1, actionsLeft: 1, gameOver: false, isMonsterActing: false,
        bossRevived: false, copycatUsedThisTurn: false, specialPlayedThisTurn: false,
        specialPlayedTotal: 0,
        tutorialStep: 1,
        player: {
            hp: isTutorial ? 150 : hero.hp, maxHp: isTutorial ? 150 : hero.hp, shield: 0,
            atkBuff: 0, reflectActive: false, regenTurns: 0, suppressNext: false,
            permanentAtkBuff: 0, darkContractsUsed: 0, nextTurnBonus: 0,
            nextAttackMultiplier: 1, nextAttacksBonus: 0, nextAttacksCount: 0,
            turtloCounter: false, damageReduction: 0, hedgehogBuff: 0, steamUsedThisTurn: false
        },
        monster: {
            hp: isTutorial ? 160 : boss.hp, maxHp: isTutorial ? 160 : boss.hp, shield: 0,
            poison: 0, skipTurns: 0, weakTurns: 0, atkBuffTurns: 0,
            guardianCd: 0, markedTurns: 0, sealedTurns: 0,
            elemStance: "fire", timeRewound: false
        },
        deck: [], drawPile: [], discardPile: [], hand: [], delayedBombs: []
    };

    if (!isTutorial) {
        if (difficulty === "easy") S.monster.maxHp = Math.round(S.monster.maxHp * 0.8);
        else if (difficulty === "hard") S.monster.maxHp = Math.round(S.monster.maxHp * 1.2);
        S.monster.hp = S.monster.maxHp;
        S.deck = deck.map(String);
        S.drawPile = shuffleArray([...S.deck]);
    }

    if (mod.effect === "iron_wall") {
        S.player.shield = hero.trait === "turtlo" ? 22 : 20;
        S.monster.shield = 20;
    }
    if (mod.effect === "sacrifice_altar") {
        S.player.maxHp = Math.max(1, S.player.maxHp - 10);
        S.player.hp = Math.min(S.player.hp, S.player.maxHp);
        S.monster.maxHp = Math.max(1, S.monster.maxHp - 15);
        S.monster.hp = Math.min(S.monster.hp, S.monster.maxHp);
    }

    document.getElementById("player-title-hp").innerText = `${hero.name} 生命`;
    document.getElementById("boss-title-hp").innerText = `${boss.name} 生命`;
    document.getElementById("info-hero").innerText = hero.name;
    document.getElementById("info-boss").innerText = boss.name;
    document.getElementById("info-mod").innerText = mod.name;

    const diffLabel = isTutorial ? "教學" : (difficulty === "easy" ? "休閒" : difficulty === "hard" ? "挑戰" : "標準");
    document.getElementById("info-diff").innerText = diffLabel;
    const diffBlock = document.getElementById("info-diff-block");
    diffBlock.classList.remove("easy", "hard");
    if (!isTutorial && difficulty === "easy") diffBlock.classList.add("easy");
    else if (!isTutorial && difficulty === "hard") diffBlock.classList.add("hard");

    document.getElementById("reset-btn").style.display = "none";
    document.getElementById("log-box").innerHTML = "";
    document.getElementById("pile-info").style.display = isTutorial ? "none" : "flex";
    
    batchedLogHTML = "";
    isBatching = false;

    startNewTurn();
    buildCompendiumUI();
    buildHeroUI();
    buildBossUI();
    buildBattlefieldUI();
}

async function startNewTurn() {
    if (S.gameOver) return;
    S.isMonsterActing = false;
    S.actionsLeft = S.mod.effect === "double_action" ? 2 : 1;
    S.player.steamUsedThisTurn = false;

    isBatching = true;

    let turnHTML = `<div class="log-player-turn">▶ 第 ${S.turn} 回合：你的行動</div>`;
    batchedLogHTML += turnHTML;

    if (S.player.nextTurnBonus > 0) {
        S.actionsLeft += S.player.nextTurnBonus;
        await log(`⏳ <b>時光沙漏</b>：本回合額外獲得 +${S.player.nextTurnBonus} 次行動！`, "crit");
        S.player.nextTurnBonus = 0;
    }

    S.copycatUsedThisTurn = false;
    S.specialPlayedThisTurn = false;

    if (S.boss.trait === "elementalist") {
        const stances = ["fire", "ice", "thunder"];
        const stanceNames = { fire: "🔥 烈焰（攻擊+30%）", ice: "🧊 寒冰（受傷-30%）", thunder: "⚡ 迅雷（閃避率20%）" };
        S.monster.elemStance = stances[Math.floor((S.turn - 1) / 2) % 3];
        await log(`🧙‍♂️ <b>元素巫師切換形態：</b>${stanceNames[S.monster.elemStance]}！`, "status");
    }

    if (S.monster.guardianCd > 0) S.monster.guardianCd--;
    if (S.monster.sealedTurns > 0) {
        S.monster.sealedTurns--;
        if (S.monster.sealedTurns > 0) {
            await log(`🔒🔒 <b>【禁錮封印持續中】</b>魔王專屬特質失效，剩餘 ${S.monster.sealedTurns} 回合！`, "seal");
        } else {
            await log(`🔒 禁錮封印已解除，魔王專屬特質恢復。`, "status");
        }
    }

    S.player.turtloCounter = false;
    S.player.damageReduction = 0;

    if (S.monster.markedTurns > 0) {
        S.monster.markedTurns--;
        if (S.monster.markedTurns > 0) {
            await log(`🎯🎯 <b>【弱點標記持續中】</b>剩餘 ${S.monster.markedTurns} 回合 — 你對魔王的攻擊傷害 +25%！`, "mark");
        } else {
            await log(`🎯 弱點標記已消失。`, "status");
        }
    }

    if (S.delayedBombs && S.delayedBombs.length > 0) {
        const remaining = [];
        for (let b of S.delayedBombs) {
            b.turns--;
            if (b.turns <= 0) {
                const finalDmg = applyPlayerAttackModifiers(28);
                const res = await applyDamageToMonster(finalDmg, { ignoreShield: true, cardName: "定時炸彈" });
                if (res.hit) await log(`💣💥 <b>【定時炸彈引爆！】</b>造成 ${res.finalDmg} 點穿透傷害！`, "crit");
            } else {
                remaining.push(b);
                await log(`💣 <b>定時炸彈倒數：</b>剩餘 ${b.turns} 回合爆發！`, "info");
            }
        }
        S.delayedBombs = remaining;
    }

    if (S.player.regenTurns > 0) {
        const healed = healPlayer(6);
        S.player.regenTurns--;
        await log(`🌿 自然泉源：回復 ${healed} 點生命，並維持 3 點減傷護盾！（剩餘 ${S.player.regenTurns} 回合）`, "heal");
    }
    if (S.mod.effect === "berserk") {
        await log(`🔥 狂暴磁場：雙方各扣除 4 點生命（無視護盾）！`, "warn");
        S.player.hp -= 4;
        S.monster.hp -= 4;
    }

    if (S.turn >= 15) {
        const fatigueDmg = (S.turn - 14) * 3;
        await log(`⏳ <b>【死鬥階段】</b>戰鬥進入膠着！雙方受到 <b>${fatigueDmg}</b> 點疲勞傷害（無視護盾）。`, "fatigue");
        S.player.hp -= fatigueDmg;
        S.monster.hp -= fatigueDmg;
    }

    if (!S.isTutorial) {
        let drawCount = 3;
        if (S.hero.trait === "raccoon") drawCount += 1;
        if (S.mod.effect === "fog_choice") drawCount = Math.max(1, drawCount - 1);
        
        if (S.player.suppressNext) {
            drawCount = Math.max(1, drawCount - 2);
            S.player.suppressNext = false;
            await log(`⚠️ <b>【壓制生效】</b>本回合抽牌數減少！`, "warn");
        }
        drawCards(drawCount);
        await log(`📚 抽了 ${drawCount} 張牌（抽牌堆剩 ${S.drawPile.length} 張）。`, "info");
    }

    isBatching = false;
    flushLogBatch();
    updateStatus();

    if (checkWinLoss()) return;
    renderCards();
    if (S.isTutorial) updateTutorialUI();
}

async function finishPlayerAction() {
    if (S.gameOver) return;
    S.actionsLeft--;
    updateStatus();

    if (S.actionsLeft > 0) {
        const canContinue = await refillHandIfEmpty();
        if (!canContinue) {
            S.actionsLeft = 0;
        } else {
            renderCards();
            return;
        }
    }
    
    isBatching = true;
    if (!S.isTutorial && S.hand.length > 0) {
        await log(`🗑️ 回合結束，${S.hand.length} 張手牌已丟棄。`, "info");
        S.hand.forEach(c => S.discardPile.push(c.id));
        S.hand = [];
    }
    isBatching = false;
    flushLogBatch();
    updateStatus();
    await sleep(600);
    monsterTurn();
}

async function playCard(card) {
    if (S.gameOver || S.actionsLeft <= 0 || S.isMonsterActing) return;
    if (!S.isTutorial && !S.hand.includes(card)) return;

    if (S.isTutorial) {
        const step = TUTORIAL_STEPS[S.tutorialStep - 1];
        if (step && !step.acceptable.includes(card.subType)) return;
    }

    if (!S.isTutorial) {
        const idx = S.hand.indexOf(card);
        if (idx >= 0) S.hand.splice(idx, 1);
    }

    isBatching = true;
    await log(`▶ 你打出了【${card.name}】`, "player-turn");
    
    if (card.type === "special") {
        S.specialPlayedThisTurn = true;
        S.specialPlayedTotal = (S.specialPlayedTotal || 0) + 1;
    }

    await executeCardEffect(card, false);

    if (S.hero.trait === "copycat"
        && !S.copycatUsedThisTurn
        && !card.freeAction
        && card.type === "special"
        && card.subType !== "skip"
        && card.subType !== "shield_bash") {
        S.copycatUsedThisTurn = true;
        await log(`🐰 <b>【鏡像戰術】</b>複製了卡牌效果！`, "crit");
        await executeCardEffect(card, true);
    }

    if (!S.isTutorial) S.discardPile.push(card.id);
    
    isBatching = false;
    flushLogBatch();
    updateStatus();

    if (checkWinLoss()) { 
        if (!card.freeAction) await finishPlayerAction();
        else {
            if (S.actionsLeft > 0) {
                const canContinue = await refillHandIfEmpty();
                if (!canContinue) { S.actionsLeft = 0; await finishPlayerAction(); }
                else renderCards();
            } else {
                await finishPlayerAction();
            }
        }
        return; 
    }
    
    await sleep(600);

    if (!card.freeAction) {
        await finishPlayerAction();
    } else {
        if (S.actionsLeft > 0) {
            const canContinue = await refillHandIfEmpty();
            if (!canContinue) {
                S.actionsLeft = 0;
                await finishPlayerAction();
            } else {
                renderCards();
            }
        } else {
            await finishPlayerAction();
        }
    }
}

async function executeCardEffect(card, isCopy = false) {
    if (S.gameOver || S.monster.hp <= 0) return;
    const prefix = isCopy ? "🐰 [複製] " : "";

    if (S.isTutorial && !isCopy) {
        const step = TUTORIAL_STEPS[S.tutorialStep - 1];
        if (step && step.acceptable.includes(card.subType)) {
            S.tutorialStep++;
            updateTutorialUI();
        }
    }

    if (card.type === "attack") await handleAttackCard(card, prefix);
    else if (card.type === "heal") await handleHealCard(card, prefix);
    else if (card.type === "special") await handleSpecialCard(card, prefix);
}

async function handleAttackCard(card, prefix) {
    let finalDmg = 0;

    if (card.subType === "ignis_rage") {
        S.player.hp -= 8;
        const isLow = S.player.hp < S.player.maxHp * 0.5;
        finalDmg = applyPlayerAttackModifiers(isLow ? 30 : 20);
        const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
        if (result.hit) await log(`${prefix}🔥 <b>燃血狂怒</b>：扣除 8 點生命，造成 ${result.finalDmg} 點傷害${isLow ? "（低血觸發 +10！）" : ""}！`, "crit");
        maybeThunderParalysis(prefix);
        return;
    }
    if (card.subType === "ignis_last") {
        S.player.hp -= 10;
        finalDmg = applyPlayerAttackModifiers(25);
        const result = await applyDamageToMonster(finalDmg, { ignoreShield: true, cardName: card.name });
        if (result.hit) await log(`${prefix}🌋 <b>絕境焚身</b>：扣除 10 點生命，造成 ${result.finalDmg} 點穿透傷害！`, "crit");
        maybeThunderParalysis(prefix);
        return;
    }
    if (card.subType === "shadow_poison") {
        finalDmg = applyPlayerAttackModifiers(6);
        const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
        if (result.hit) {
            const extra = S.hero.trait === "shadow" ? 1 : 0;
            S.monster.poison = 3 + extra;
            await log(`${prefix}🧪 <b>猛毒蔓延</b>：造成 ${result.finalDmg} 點傷害，魔王中毒 ${S.monster.poison} 回合！`, "crit");
        }
        maybeThunderParalysis(prefix);
        return;
    }
    if (card.subType === "shadow_burst") {
        const stacks = S.monster.poison;
        if (stacks > 0) {
            S.monster.poison = 0;
            finalDmg = applyPlayerAttackModifiers(stacks * 8);
            const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
            if (result.hit) await log(`${prefix}☠️ <b>毒爆</b>：引爆 ${stacks} 層中毒，造成 ${result.finalDmg} 點傷害！`, "crit");
        } else {
            await log(`${prefix}☠️ <b>毒爆</b>：魔王沒有中毒，引爆失敗！`, "warn");
        }
        maybeThunderParalysis(prefix);
        return;
    }
    if (card.subType === "shadow_dead") {
        finalDmg = applyPlayerAttackModifiers(4);
        const result = await applyDamageToMonster(finalDmg, { ignoreShield: true, cardName: card.name });
        if (result.hit) {
            const extra = S.hero.trait === "shadow" ? 1 : 0;
            S.monster.poison = 5 + extra;
            await log(`${prefix}🌫️ <b>致命毒霧</b>：造成 ${result.finalDmg} 點穿透傷害，魔王中毒 ${S.monster.poison} 回合！`, "crit");
        }
        maybeThunderParalysis(prefix);
        return;
    }
    if (card.subType === "thunder_strike") {
        finalDmg = applyPlayerAttackModifiers(12);
        const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
        if (result.hit) {
            await log(`${prefix}⚡ <b>迅雷麻痺</b>：造成 ${result.finalDmg} 點傷害！`, "dmg");
            if (Math.random() < 0.35) {
                S.monster.skipTurns += 1;
                await log(`${prefix}⚡ <b>麻痺成功！</b>魔王跳過 1 次行動！`, "crit");
            }
        }
        return;
    }
    if (card.subType === "thunder_thunder") {
        const wasParalyzed = S.monster.skipTurns > 0;
        finalDmg = applyPlayerAttackModifiers(wasParalyzed ? 35 : 15);
        const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
        if (result.hit) await log(`${prefix}🌪️ <b>雷霆萬鈞</b>：造成 ${result.finalDmg} 點傷害${wasParalyzed ? "（麻痺觸發 +20！）" : ""}！`, "crit");
        return;
    }
    if (card.subType === "raccoon_flash") {
        const base = S.specialPlayedThisTurn ? 24 : 14;
        finalDmg = applyPlayerAttackModifiers(base);
        const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
        if (result.hit) await log(`${prefix}✨ <b>閃光彈</b>：造成 ${result.finalDmg} 點傷害${S.specialPlayedThisTurn ? "（特殊卡觸發 +10！）" : ""}！`, "crit");
        maybeThunderParalysis(prefix);
        return;
    }
    if (card.subType === "hedgehog_needle") {
        let extraVal = 0;
        if (S.player.shield > 0) {
            const usedShield = S.player.shield;
            extraVal = Math.round(usedShield * 1.5);
            S.player.shield = 0;
            await log(`${prefix}🦔 消耗全部 ${usedShield} 點護盾，刺針威力大增 (+${extraVal} 傷害)！`, "crit");
        }
        finalDmg = applyPlayerAttackModifiers(16 + extraVal);
        const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
        if (result.hit) await log(`${prefix}🎯 <b>刺針射擊</b>：造成 ${result.finalDmg} 點傷害！`, "dmg");
        maybeThunderParalysis(prefix);
        return;
    }
    if (card.subType === "delayed_bomb") {
        finalDmg = applyPlayerAttackModifiers(10);
        const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
        if (result.hit) {
            S.delayedBombs.push({ turns: 2 });
            await log(`${prefix}💣 <b>定時引爆</b>：造成 ${result.finalDmg} 點傷害，並植入【定時炸彈】（2 回合後爆發 28 點穿透傷害）！`, "crit");
        }
        maybeThunderParalysis(prefix);
        return;
    }
    if (card.subType === "universal_pull") {
        const count = Math.min(5, S.specialPlayedTotal || 0);
        finalDmg = applyPlayerAttackModifiers(16 + count * 4);
        const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
        if (result.hit) await log(`${prefix}🌌 <b>萬象天引</b>：本局使用了 ${S.specialPlayedTotal || 0} 張特殊卡，造成 ${result.finalDmg} 點傷害！`, "crit");
        maybeThunderParalysis(prefix);
        return;
    }

    if (card.subType === "desperate") {
        const lost = Math.max(0, S.player.maxHp - S.player.hp);
        finalDmg = applyPlayerAttackModifiers(Math.min(40, Math.round(lost * 0.4)));
        const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
        if (result.hit) await log(`${prefix}🩹 <b>破釜沉舟</b>：已損失 ${lost} 點生命，造成 ${result.finalDmg} 點傷害！`, "dmg");
        maybeThunderParalysis(prefix);
        return;
    }
    if (card.subType === "erosion") {
        let count = 0;
        if (S.monster.poison > 0) count++;
        if (S.monster.weakTurns > 0) count++;
        if (S.monster.markedTurns > 0) count++;
        finalDmg = applyPlayerAttackModifiers(12 + count * 6);
        const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
        if (result.hit) await log(`${prefix}🌀 <b>魔能侵蝕</b>：魔王有 ${count} 個異常狀態，造成 ${result.finalDmg} 點傷害！`, "dmg");
        maybeThunderParalysis(prefix);
        return;
    }
    if (card.subType === "finisher") {
        const isLow = S.monster.hp < S.monster.maxHp * 0.3;
        if (isLow) {
            finalDmg = applyPlayerAttackModifiers(30);
            const result = await applyDamageToMonster(finalDmg, { ignoreShield: true, cardName: card.name });
            if (result.hit) await log(`${prefix}💀 <b>致命一擊！</b>魔王生命低於 30%，造成 ${result.finalDmg} 點穿透傷害！`, "crit");
        } else {
            finalDmg = applyPlayerAttackModifiers(10);
            const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
            if (result.hit) await log(`${prefix}💀 <b>致命一擊</b>：魔王生命尚高，僅造成 ${result.finalDmg} 點傷害。`, "dmg");
        }
        maybeThunderParalysis(prefix);
        return;
    }

    let isCrit = false;
    let baseVal = card.value || 0;
    if (card.subType === "crit") {
        isCrit = Math.random() < 0.4;
        baseVal = isCrit ? 25 : 12;
    }

    if (S.hero.trait === "ignis" && Math.random() < 0.35) {
        baseVal += 5;
        await log(`${prefix}🔥 <b>【烈焰血脈】</b>追加 5 點傷害！`, "crit");
    }

    finalDmg = applyPlayerAttackModifiers(baseVal);

    if (card.subType === "detonate") {
        const hasDebuff = S.monster.poison > 0 || S.monster.weakTurns > 0;
        const total = finalDmg + (hasDebuff ? 22 : 0);
        const result = await applyDamageToMonster(total, { cardName: card.name });
        if (result.hit) {
            if (hasDebuff) {
                await log(`${prefix}💣 <b>元素引爆成功！</b>追加 22 點引爆傷害，共造成 ${result.finalDmg} 點傷害！`, "crit");
                S.monster.poison = 0;
                S.monster.weakTurns = 0;
            } else {
                await log(`${prefix}💣 <b>元素引爆</b>：魔王無異常狀態，僅造成 ${result.finalDmg} 點傷害。`, "info");
            }
        }
        maybeThunderParalysis(prefix);
        return;
    }
    if (card.subType === "pierce") {
        const result = await applyDamageToMonster(finalDmg, { ignoreShield: true, cardName: card.name });
        if (result.hit) await log(`${prefix}🔨 <b>${card.name}</b> 無視護盾造成 ${result.finalDmg} 點穿透傷害！`, "dmg");
        maybeThunderParalysis(prefix);
        return;
    }
    if (card.subType === "shield_break") {
        if (S.monster.shield > 0) {
            const broken = S.monster.shield;
            S.monster.shield = 0;
            playSfx('shield');
            await log(`${prefix}💢 <b>碎盾擊</b>：打碎魔王 ${broken} 點護盾！`, "crit");
        } else {
            const result = await applyDamageToMonster(finalDmg, { cardName: card.name });
            if (result.hit) await log(`${prefix}💢 <b>碎盾擊</b>：魔王無護盾，造成 ${result.finalDmg} 點傷害。`, "dmg");
        }
        maybeThunderParalysis(prefix);
        return;
    }

    const result = await applyDamageToMonster(finalDmg, { cardName: card.name });

    if (result.hit) {
        if (card.subType === "crit") {
            if (isCrit) playSfx('crit');
            await log(`${prefix}⚡ 暴擊判定：${isCrit ? "成功暴擊！" : "普通命中。"}`, "info");
        }
        await log(`${prefix}⚔️ <b>${card.name}</b> 對魔王造成 ${result.finalDmg} 點傷害！`, "dmg");

        if (card.subType === "lifesteal") {
            const healed = healPlayer(7);
            await log(`${prefix}🩸 吸血生效：回復 ${healed} 點生命。`, "heal");
        } else if (card.subType === "poison") {
            const extra = S.hero.trait === "shadow" ? 1 : 0;
            S.monster.poison = 3 + extra;
            await log(`${prefix}🗡️ 劇毒命中：魔王中毒 ${S.monster.poison} 回合（每回合無視護盾扣除 6 點生命）！`, "status");
        } else if (card.subType === "frost") {
            S.monster.weakTurns = 1;
            await log(`${prefix}❄️ 寒冰凍結：魔王攻擊傷害減少 40%（持續 1 回合）！`, "status");
        }
        maybeThunderParalysis(prefix);
    }

    if (card.subType === "recoil") {
        S.player.hp -= card.selfCost;
        await log(`${prefix}💥 捨身代價：自身承受 ${card.selfCost} 點反噬傷害！`, "dmg");
    }
}

function maybeThunderParalysis(prefix) {
    if (S.hero.trait === "thunder" && Math.random() < 0.25) {
        S.monster.skipTurns += 1;
        log(`${prefix}⚡ <b>【雷霆麻痺】</b>閃電鳥電擊麻痺魔王，跳過 1 次行動！`, "crit");
    }
}

async function handleHealCard(card, prefix) {
    if (card.subType === "regen") {
        S.player.regenTurns = 3;
        playSfx('heal');
        await log(`${prefix}🌿 <b>自然泉源</b>：獲得 3 回合【泉源祝福】（每回合回復 6 點生命且傷害 -3）！`, "heal");
    }
    else if (card.subType === "reverse_heal") {
        const lost = Math.max(0, S.player.maxHp - S.player.hp);
        const base = Math.min(25, Math.round(lost * 0.4));
        const healed = healPlayer(base);
        await log(`${prefix}♻️ <b>逆轉治癒</b>：已損失 ${lost} 點生命，回復 ${healed} 點生命！`, "heal");
    }
    else if (card.subType === "low_hp_shield") {
        const isLow = S.player.hp < S.player.maxHp / 2;
        const add = await addShieldToPlayer(isLow ? 20 : 12);
        await log(`${prefix}🏰 <b>堅壁清野</b>：獲得護盾（當前護盾 ${add} 點）！`, "shield");
    }
    else if (card.subType === "ignis_phoenix") {
        const isLow = S.player.hp < S.player.maxHp * 0.3;
        const healed = healPlayer(isLow ? 30 : 15);
        await log(`${prefix}🐦‍🔥 <b>鳳凰之心</b>：${isLow ? "低血觸發！" : ""}回復 ${healed} 點生命！`, "heal");
    }
    else if (card.subType === "turtlo_counter") {
        await addShieldToPlayer(15);
        S.player.turtloCounter = true;
        await log(`${prefix}🦔 <b>反震裝甲</b>：獲得 15 點護盾，本回合被攻擊時反彈 50% 傷害！`, "shield");
    }
    else if (card.subType === "turtlo_wall") {
        await addShieldToPlayer(20);
        S.player.atkBuff += 8;
        await log(`${prefix}🧱 <b>銅牆鐵壁</b>：獲得 20 點護盾，且下次攻擊傷害 +8 點！`, "shield");
    }
    else if (card.subType === "hedgehog_steam") {
        await addShieldToPlayer(15);
        if (S.player.shield >= 15 && !S.player.steamUsedThisTurn) {
            S.player.steamUsedThisTurn = true;
            S.actionsLeft += 1;
            await log(`${prefix}💨 <b>蒸氣噴射</b>：獲得 15 點護盾，並觸發超頻獲得 +1 次行動！`, "crit");
        } else {
            await log(`${prefix}💨 <b>蒸氣噴射</b>：獲得 15 點護盾。`, "shield");
        }
    }
    else if (card.subType === "raccoon_amulet") {
        const healed = healPlayer(14);
        await addShieldToPlayer(10);
        await log(`${prefix}✨ <b>星象護符</b>：回復 ${healed} 點生命，並獲得 10 點護盾！`, "heal");
    }
    else {
        const healed = healPlayer(card.value);
        await log(`${prefix}💚 <b>${card.name}</b>：回復 ${healed} 點生命！`, "heal");
        if (card.subType === "shield") {
            await addShieldToPlayer(card.shieldVal);
            await log(`${prefix}🛡️ 額外獲得 12 點護盾！`, "shield");
        }
    }
}

async function handleSpecialCard(card, prefix) {
    const st = S;

    if (card.subType === "sacrifice") {
        st.player.hp -= card.costHP;
        st.player.atkBuff += card.buffVal;
        await log(`${prefix}⚗️ <b>血之狂熱</b>：扣除 ${card.costHP} 點生命，下次攻擊傷害 +${card.buffVal} 點！`, "crit");
    }
    else if (card.subType === "skip") {
        st.monster.skipTurns += 1;
        st.monster.sealedTurns = 2;
        const sealDesc = {
            standard: "【深淵咆哮】", undying: "【不滅死魂】",
            evasion: "【鬼魅閃避】", vampire: "【嗜血吸取】", guardian: "【鋼鐵反震】",
            elementalist: "【元素輪轉】", time_phantom: "【熵增回溯】"
        };
        await log(`${prefix}🔒🔒 <b>【禁錮咒語】</b>魔王跳過 1 次行動！接下來 2 回合專屬特質 ${sealDesc[st.boss.trait] || '專屬特質'} 失效！`, "seal");
    }
    else if (card.subType === "reflect") {
        await addShieldToPlayer(10);
        st.player.reflectActive = true;
        await log(`${prefix}🪞 <b>反彈護鏡</b>：獲得 10 點護盾，下回合被魔王攻擊時反彈 50% 傷害！`, "shield");
    }
    else if (card.subType === "shield_bash") {
        if (st.player.shield > 0) {
            const used = st.player.shield;
            const bashDmg = applyPlayerAttackModifiers(Math.round(used * 1.5));
            const result = await applyDamageToMonster(bashDmg, { cardName: card.name });
            if (result.hit) {
                st.player.shield = 0;
                await log(`${prefix}💢 <b>盾擊破敵</b>：消耗全部 ${used} 點護盾，造成 ${result.finalDmg} 點傷害！`, "crit");
            } else {
                await log(`${prefix}💢 盾擊被閃避，護盾未被消耗！`, "warn");
            }
        } else {
            await log(`${prefix}💢 盾擊落空（無護盾）！`, "warn");
        }
    }
    else if (card.subType === "roulette") {
        const roll = Math.random();
        if (roll < 0.33) {
            const capGain = Math.max(0, Math.min(10, 50 - (st.player.maxHp - st.hero.hp)));
            st.player.maxHp += capGain;
            const healed = healPlayer(18);
            await log(`${prefix}🎰 <b>命運之輪：生機庇護！</b>回復 ${healed} 點生命，生命上限 +${capGain} 點（現為 ${st.player.maxHp} 點）！`, "heal");
        } else if (roll < 0.66) {
            await addShieldToPlayer(18);
            await log(`${prefix}🎰 <b>命運之輪：絕對防禦！</b>獲得 18 點護盾！`, "shield");
        } else {
            const finalDmg = applyPlayerAttackModifiers(22);
            const result = await applyDamageToMonster(finalDmg, { ignoreShield: true, cardName: "烈風風刃" });
            if (result.hit) await log(`${prefix}🎰 <b>命運之輪：烈風風刃！</b>造成 ${result.finalDmg} 點穿透傷害！`, "dmg");
        }
    }
    else if (card.subType === "steal_shield") {
        const stolen = Math.floor(st.monster.shield * 0.5);
        if (stolen > 0) {
            st.monster.shield -= stolen;
            await addShieldToPlayer(stolen);
            await log(`${prefix}🎭 <b>偷天換日</b>：偷取魔王 ${stolen} 點護盾（魔王剩 ${st.monster.shield} 點護盾）！`, "crit");
        } else {
            await addShieldToPlayer(5);
            await log(`${prefix}🎭 <b>偷天換日</b>：魔王無護盾，改為獲得 5 點護盾！`, "shield");
        }
    }
    else if (card.subType === "mark") {
        if (st.monster.markedTurns > 0) {
            st.monster.markedTurns = 3;
            await log(`${prefix}🎯 <b>【弱點標記】</b>魔王弱點標記已存在，刷新持續回合數為 3 回合！`, "mark");
        } else {
            st.monster.markedTurns = 3;
            await log(`${prefix}🎯🎯 <b>【弱點標記】</b>魔王被標記 3 回合，期間受到的玩家攻擊傷害 +25%！`, "mark");
        }
    }
    else if (card.subType === "dark_contract") {
        if (st.player.darkContractsUsed >= 2) {
            await log(`${prefix}📜 <b>黑暗契約</b>：已達上限（永久 +12 點攻擊），無法再使用！`, "warn");
        } else {
            st.player.hp -= 12;
            st.player.permanentAtkBuff += 6;
            st.player.darkContractsUsed++;
            await log(`${prefix}📜 <b>黑暗契約</b>：扣除 12 點生命，永久 +6 點攻擊（累積 +${st.player.permanentAtkBuff} 點）！`, "crit");
        }
    }
    else if (card.subType === "time_hourglass") {
        st.player.nextTurnBonus = 1;
        await log(`${prefix}⏳ <b>時光沙漏</b>：下回合起始行動數 +1！`, "crit");
    }
    else if (card.subType === "turtlo_stand") {
        await addShieldToPlayer(15);
        st.player.damageReduction = 5;
        await log(`${prefix}⛰️ <b>不動如山</b>：獲得 15 點護盾，本回合受到傷害減少 5 點！`, "shield");
    }
    else if (card.subType === "thunder_double") {
        st.player.nextAttackMultiplier = 2;
        await log(`${prefix}🌩️ <b>電光石火</b>：下次攻擊傷害倍率 ×2！`, "crit");
    }
    else if (card.subType === "copycat_draw") {
        drawCards(1);
        await log(`${prefix}📖 <b>快速施法</b>：抽 1 張牌！`, "info");
    }
    else if (card.subType === "copycat_boost") {
        st.player.nextAttacksBonus = 10;
        st.player.nextAttacksCount = 2;
        await log(`${prefix}✨ <b>魔法增幅</b>：接下來 2 次攻擊傷害 +10 點！`, "crit");
    }
    else if (card.subType === "copycat_echo") {
        const randomCommon = commonCards[Math.floor(Math.random() * commonCards.length)];
        st.hand.push(randomCommon);
        await log(`${prefix}🔮 <b>無限迴響</b>：隨機獲得 <b>${randomCommon.name}</b> 加入手牌！`, "crit");
    }
    else if (card.subType === "deep_meditation") {
        drawCards(1);
        st.player.atkBuff += 8;
        await log(`${prefix}🧘 <b>深層沉思</b>：抽 1 張牌，下次攻擊傷害 +8 點！`, "crit");
    }
    else if (card.subType === "resurrection") {
        let retName = "";
        if (st.discardPile.length > 0) {
            const randIdx = Math.floor(Math.random() * st.discardPile.length);
            const picked = st.discardPile.splice(randIdx, 1)[0];
            const c = cardById[picked];
            if (c) { st.hand.push(c); retName = c.name; }
        }
        const healed = healPlayer(10);
        await log(`${prefix}🕊️ <b>死者甦生</b>：回復 ${healed} 點生命${retName ? `，並從棄牌堆抓回【${retName}】` : ""}！`, "heal");
    }
    else if (card.subType === "raccoon_search") {
        let foundName = "";
        let foundIdx = st.drawPile.findIndex(id => {
            const c = cardById[id];
            return c && c.type === "attack";
        });
        if (foundIdx >= 0) {
            const picked = st.drawPile.splice(foundIdx, 1)[0];
            const c = cardById[picked];
            if (c) {
                st.hand.push(c);
                foundName = c.name;
                st.player.atkBuff += 5;
            }
        }
        await log(`${prefix}🌌 <b>預言星圖</b>：${foundName ? `將【${foundName}】抓回手牌，且下次攻擊傷害 +5 點` : "抽牌堆中沒有攻擊卡"}！`, "crit");
    }
    else if (card.subType === "hedgehog_armor") {
        await addShieldToPlayer(22);
        st.player.atkBuff += 10;
        await log(`${prefix}⚙️ <b>鋼鐵刺裝</b>：獲得 22 點護盾，且下次攻擊傷害 +10 點！`, "shield");
    }
}

async function monsterTurn() {
    if (S.gameOver) return;
    S.isMonsterActing = true;

    isBatching = true;
    if (S.isTutorial && S.turn === 1) {
        await log(`◀ 【${S.boss.name}】觀察你的行動（教學模式跳過）`, "monster-turn");
        isBatching = false; flushLogBatch();
        S.turn++;
        updateStatus();
        await sleep(600);
        startNewTurn();
        return;
    }

    await log(`◀ 【${S.boss.name}】反擊回合`, "monster-turn");
    
    // 中毒結算移至魔王回合開始，更能直觀感受到毒傷阻止魔王行動
    if (S.monster.poison > 0) {
        S.monster.hp -= 6;
        S.monster.poison--;
        await log(`☠️ 魔王受到劇毒侵蝕，扣除 6 點生命！（剩餘 ${S.monster.poison} 回合）`, "status");
    }
    
    isBatching = false;
    flushLogBatch();
    updateStatus();
    if (checkWinLoss()) return;
    await sleep(600);

    const actions = S.mod.effect === "double_action" ? 2 : 1;
    let hasRoared = false;

    isBatching = true;
    for (let i = 0; i < actions; i++) {
        if (S.gameOver) break;
        if (S.monster.skipTurns > 0) {
            await log(`🔒 <b>魔王被束縛，跳過本次行動！</b>（剩餘 ${S.monster.skipTurns - 1} 次）`, "status");
            S.monster.skipTurns--;
            continue;
        }
        if (S.boss.trait === "standard" && S.turn % 3 === 0 && !hasRoared) {
            if (S.monster.sealedTurns > 0) {
                await log(`🔒🔒 <b>禁錮封印：深淵咆哮被封印，無法釋放！</b>`, "seal");
                await executeMonsterAiDecision();
            } else {
                hasRoared = true;
                await executeRoar();
            }
        } else {
            await executeMonsterAiDecision();
        }
        if (i < actions - 1) await log(`---`, "info");
    }
    isBatching = false;
    flushLogBatch();
    updateStatus();

    if (checkWinLoss()) return;
    
    S.player.reflectActive = false;
    await sleep(600);
    S.turn++;
    startNewTurn();
}

async function executeMonsterAiDecision() {
    if (S.boss.trait === "guardian" && S.monster.shield === 0 && S.monster.sealedTurns <= 0) {
        await actionGuard();
        return;
    }

    let estDmg = 20 + (S.monster.atkBuffTurns > 0 ? 8 : 0);
    if (S.player.hp <= estDmg && S.player.shield === 0) {
        await actionAttack();
        return;
    }

    if (S.boss.trait === "standard" && (S.turn + 1) % 3 === 0 && S.monster.sealedTurns <= 0) {
        if (S.monster.shield === 0 && Math.random() < 0.6) { await actionGuard(); return; }
        if (S.monster.atkBuffTurns <= 0 && Math.random() < 0.6) { await actionBuff(); return; }
    }

    if (S.monster.hp < S.monster.maxHp * 0.3) {
        if (S.boss.trait !== "undying" || S.bossRevived) {
            if (S.monster.sealedTurns <= 0 && Math.random() < 0.75) {
                await actionHeal();
                return;
            }
        }
    }

    if (S.boss.trait === "vampire" && S.monster.hp < S.monster.maxHp * 0.7 && S.monster.sealedTurns <= 0) {
        await actionAttack();
        return;
    }

    if (S.monster.atkBuffTurns <= 0 && S.monster.sealedTurns <= 0 && Math.random() < 0.4) {
        await actionBuff();
        return;
    }

    await actionAttack();
}

async function actionGuard() {
    S.monster.shield += 15;
    await log(`🛡️ 魔王張開「暗黑護盾」，獲得 15 點護盾！`, "shield");
}

async function actionHeal() {
    const healed = healMonster(20);
    await log(`🪄 魔王施展「自我修復」，回復 ${healed} 點生命！`, "heal");
}

async function actionBuff() {
    S.monster.atkBuffTurns = 2;
    await log(`🔥 <b>魔王發動「暗影狂暴」！接下來 2 次攻擊傷害 +8 點！</b>`, "crit");
}

async function actionAttack() {
    let rawDmg = Math.floor(Math.random() * 11) + 12;
    let isBreakArmor = false;
    
    if (S.boss.trait === "elementalist" && S.monster.elemStance === "fire" && S.monster.sealedTurns <= 0) {
        rawDmg = Math.round(rawDmg * 1.3);
    }

    if (S.monster.atkBuffTurns > 0) {
        rawDmg += 8;
        S.monster.atkBuffTurns--;
        if (Math.random() < 0.3) isBreakArmor = true;
        await log(`💥 魔王帶有【暗影狂暴】加成，本次攻擊傷害 +8 點！`, "warn");
    }
    if (S.mod.effect === "berserk") rawDmg = Math.round(rawDmg * 1.2);
    if (S.difficulty === "easy") rawDmg = Math.round(rawDmg * 0.8);
    if (S.difficulty === "hard") rawDmg = Math.round(rawDmg * 1.2);
    if (S.monster.weakTurns > 0) {
        rawDmg = Math.round(rawDmg * 0.6);
        S.monster.weakTurns--;
        await log(`❄️ 魔王受【冰霜虛弱】影響，攻擊傷害減少 40%！`, "status");
    }
    if (isBreakArmor && S.player.shield > 0) {
        const destroyed = Math.floor(S.player.shield * 0.5);
        S.player.shield -= destroyed;
        await log(`🗡️💥 <b>魔王施展【破甲打擊】！</b>強行毀壞你 ${destroyed} 點護盾！`, "crit");
    }

    const result = await dealDamageToPlayer(rawDmg, "attack");
    const detail = result.shieldAbsorbed > 0
        ? `（護盾吸收 ${result.shieldAbsorbed} 點，實際扣血 ${result.hpLost} 點）`
        : `（實際扣血 ${result.hpLost} 點）`;
    await log(`⚠️ 魔王發動猛擊，造成 ${rawDmg} 點傷害${detail}。`, "dmg");

    if (S.boss.trait === "vampire" && result.hpLost > 0) {
        if (S.monster.sealedTurns > 0) {
            await log(`🔒🔒 <b>禁錮封印：吸血鬼無法吸血！</b>`, "seal");
        } else {
            const vampHeal = Math.round(result.hpLost * 0.3 * healModifier());
            S.monster.hp = Math.min(S.monster.maxHp, S.monster.hp + vampHeal);
            await log(`🧛 <b>【嗜血吸取】</b>德古拉汲取 ${vampHeal} 點生命！`, "heal");
        }
    }
}

async function executeRoar() {
    let roarDmg = S.isTutorial ? 10 : 20;
    if (S.mod.effect === "berserk") roarDmg = Math.round(roarDmg * 1.2);
    if (S.difficulty === "easy" && !S.isTutorial) roarDmg = Math.round(roarDmg * 0.8);
    if (S.difficulty === "hard" && !S.isTutorial) roarDmg = Math.round(roarDmg * 1.2);
    if (S.monster.weakTurns > 0) {
        roarDmg = Math.round(roarDmg * 0.6);
        S.monster.weakTurns--;
        await log(`❄️ 魔王受【冰霜虛弱】影響，深淵咆哮傷害減少 40%！`, "status");
    }

    const result = await dealDamageToPlayer(roarDmg, "roar");
    if (!S.isTutorial) S.player.suppressNext = true;

    const detail = result.shieldAbsorbed > 0
        ? `（護盾吸收 ${result.shieldAbsorbed} 點，實際扣血 ${result.hpLost} 點）`
        : `（實際扣血 ${result.hpLost} 點）`;
    await log(`📢💥 <b>【深淵咆哮】</b>造成 ${roarDmg} 點傷害${detail}${S.isTutorial ? "" : "，並施加【壓制】"}！`, "crit");
}

function checkWinLoss() {
    if (S.boss.trait === "undying" && S.monster.hp <= 0 && !S.bossRevived) {
        if (S.monster.sealedTurns > 0) {
            S.monster.hp = 0;
            updateStatus();
            log(`🔒🔒 <b>【禁錮封印】封鎖巴洛克的不滅死魂！</b>`, "seal");
            log(`☠️💀 <b>巴洛克無法復活，永久死亡！</b>`, "crit");
            endGame();
            if (S.isTutorial) showTutorialEndModal(true);
            else log(`🎉 <b>太強了！你成功擊敗【${S.boss.name}】，完美獲得勝利！</b>`, "crit");
            return true;
        }
        S.bossRevived = true;
        S.monster.hp = Math.min(35, S.monster.maxHp);
        S.monster.atkBuffTurns = 99;
        log(`☠️⚡ <b>【不滅死魂】</b>巴洛克生命歸零，但原地復活！恢復至 ${S.monster.hp} 點生命並進入永久狂暴！`, "crit");
        updateStatus();
        return false;
    }

    const pDead = S.player.hp <= 0;
    const mDead = S.monster.hp <= 0;

    if (pDead && mDead) {
        S.player.hp = 0; S.monster.hp = 0;
        updateStatus();
        log(`🤝 <b>同歸於盡！</b>你與魔王同時倒下，平局！`, "crit");
        endGame();
        if (S.isTutorial) showTutorialEndModal(false);
        return true;
    }
    if (mDead) {
        S.monster.hp = 0;
        updateStatus();
        if (S.isTutorial) {
            log(`🎉🎓 <b>恭喜完成實戰教學！</b>`, "crit");
            endGame();
            showTutorialEndModal(true);
        } else {
            log(`🎉 <b>太強了！你成功擊敗【${S.boss.name}】，完美獲得勝利！</b>`, "crit");
            endGame();
        }
        return true;
    }
    if (pDead) {
        S.player.hp = 0;
        updateStatus();
        if (S.isTutorial) {
            log(`❌ <b>教學失敗：你的生命值歸零。</b>`, "dmg");
            endGame();
            showTutorialEndModal(false);
        } else {
            log(`❌ <b>冒險失敗：你的生命值歸零。</b>`, "dmg");
            endGame();
        }
        return true;
    }
    return false;
}

function endGame() {
    S.gameOver = true;
    document.getElementById("card-selection").innerHTML = "";
    document.getElementById("reset-btn").style.display = "block";
    document.getElementById("tutorial-prompt").style.display = "none";
}

function updateStatus() {
    if (!S) return;
    document.getElementById("player-hp").innerText = `${Math.max(0, S.player.hp)} / ${S.player.maxHp}`;
    document.getElementById("monster-hp").innerText = `${Math.max(0, S.monster.hp)} / ${S.monster.maxHp}`;
    document.getElementById("turn-count").innerText = S.turn;
    document.getElementById("action-points").innerText = `剩餘行動：${S.actionsLeft}`;

    const pTags = [
        S.player.shield > 0 && `<span class="status-icon shield">🛡️ ${S.player.shield}</span>`,
        S.player.atkBuff > 0 && `<span class="status-icon atk">⚔️ +${S.player.atkBuff}</span>`,
        S.player.permanentAtkBuff > 0 && `<span class="status-icon permatk">📜 +${S.player.permanentAtkBuff}</span>`,
        S.player.reflectActive && `<span class="status-icon reflect">🪞 反彈</span>`,
        S.player.regenTurns > 0 && `<span class="status-icon regen">🌿 ${S.player.regenTurns}T (-3傷)</span>`,
        S.player.suppressNext && `<span class="status-icon warn">⚠️ 壓制</span>`,
        S.player.nextTurnBonus > 0 && `<span class="status-icon warn">⏳ +${S.player.nextTurnBonus}</span>`,
        S.player.nextAttackMultiplier > 1 && `<span class="status-icon warn">×${S.player.nextAttackMultiplier}</span>`,
        S.player.nextAttacksCount > 0 && `<span class="status-icon atk">✨ +${S.player.nextAttacksBonus} (${S.player.nextAttacksCount})</span>`,
        S.player.turtloCounter && `<span class="status-icon shield">🦔 反震</span>`,
        S.player.damageReduction > 0 && `<span class="status-icon shield">⛰️ -${S.player.damageReduction}</span>`,
        S.hero.trait === "copycat" && S.copycatUsedThisTurn && `<span class="status-icon warn">🐰 已複製</span>`
    ];
    document.getElementById("player-buff").innerHTML = pTags.filter(Boolean).join(" ") || "正常";

    const mTags = [
        S.monster.shield > 0 && `<span class="status-icon shield">🛡️ ${S.monster.shield}</span>`,
        S.monster.poison > 0 && `<span class="status-icon poison">☠️ ${S.monster.poison}T</span>`,
        S.monster.skipTurns > 0 && `<span class="status-icon lock">🔒 ${S.monster.skipTurns}</span>`,
        S.monster.sealedTurns > 0 && `<span class="status-icon sealed">🔒🔒 封印 ${S.monster.sealedTurns}T</span>`,
        S.monster.weakTurns > 0 && `<span class="status-icon frost">❄️ ${S.monster.weakTurns}T</span>`,
        S.monster.atkBuffTurns > 0 && `<span class="status-icon rage">🔥 ${S.monster.atkBuffTurns}次</span>`,
        S.monster.markedTurns > 0 && `<span class="status-icon mark">🎯 ${S.monster.markedTurns}T +25%</span>`,
        S.monster.guardianCd > 0 && `<span class="status-icon warn">🏰 冷卻 ${S.monster.guardianCd}</span>`,
        S.boss.trait === "elementalist" && `<span class="status-icon rage">🧙‍♂️ ${S.monster.elemStance}</span>`,
        S.boss.trait === "time_phantom" && S.monster.timeRewound && `<span class="status-icon warn">⏳ 已回溯</span>`
    ];

    if (S.delayedBombs && S.delayedBombs.length > 0) {
        S.delayedBombs.forEach(b => {
            mTags.push(`<span class="status-icon poison">💣 炸彈 ${b.turns}T</span>`);
        });
    }

    document.getElementById("monster-buff").innerHTML = mTags.filter(Boolean).join(" ") || "正常";

    if (S.turn >= 15) {
        document.getElementById("monster-buff").innerHTML += ` <span class="status-icon fatigue">⏳ 死鬥</span>`;
    }

    if (!S.isTutorial) {
        document.getElementById("pile-draw-count").innerText = S.drawPile.length;
        document.getElementById("pile-discard-count").innerText = S.discardPile.length;
    }
}

function renderCards() {
    if (S.gameOver) return;
    const container = document.getElementById("card-selection");
    container.innerHTML = "";

    let cards = [];
    let highlightSubTypes = [];

    if (S.isTutorial) {
        const step = TUTORIAL_STEPS[S.tutorialStep - 1];
        if (step) {
            const seen = new Set();
            cards = step.cards.map(st => {
                const c = cardPool.find(c => c.subType === st && !seen.has(c.id));
                if (c) seen.add(c.id);
                return c;
            }).filter(Boolean);
            highlightSubTypes = step.highlight;
        }
    } else {
        cards = [...S.hand];
    }

    const markActive = S.monster.markedTurns > 0;

    cards.forEach(card => {
        const div = document.createElement("div");
        div.className = `card ${card.type}`;
        const isTutorialHighlight = S.isTutorial && highlightSubTypes.includes(card.subType);
        
        if (isTutorialHighlight) div.classList.add("highlight");
        if (S.isTutorial && !isTutorialHighlight) div.classList.add("disabled");

        const isAttack = card.type === "attack";
        const showMark = markActive && isAttack;
        const markIcon = showMark ? `<div class="card-mark">🎯 +25%</div>` : "";
        
        const freeIcon = card.freeAction ? `<div class="card-free-badge">不扣行動</div>` : "";

        const valueText = cardValueText(card);
        const valueClass = markActive && isAttack ? "card-value marked" : "card-value";
        const rarityLabel = rarityName(card.rarity);

        div.innerHTML = `
            ${freeIcon}
            ${markIcon}
            <div class="card-type-badge">${card.type === "attack" ? "攻擊" : card.type === "heal" ? "回復" : "特殊"}</div>
            <h3>${card.name}</h3>
            <div class="${valueClass}">${valueText}</div>
            <p>${getCardDesc(card)}</p>
            <div class="card-rarity-badge rarity-${card.rarity}">${rarityLabel}</div>
        `;
        if (!(S.isTutorial && !isTutorialHighlight)) {
            div.onclick = () => playCard(card);
        }
        container.appendChild(div);
    });
}

function showInfoModal(type) {
    if (!S) return;
    const titleEl = document.getElementById("info-modal-title");
    const bodyEl = document.getElementById("info-modal-body");
    let html = "";

    if (type === 'hero') {
        titleEl.innerText = `${S.hero.icon} 當前英雄：${S.hero.name}`;
        html = `<div class="effect-item hero-item">
            <div class="hero-name-big" style="color:#38bdf8;">${S.hero.icon} ${S.hero.name}</div>
            <div class="talent-tag">英雄天賦</div>
            <p style="margin-bottom:10px;">${S.hero.desc}</p>
            <div class="trait-tag" style="background:#f59e0b; color:#0f172a;">當前狀態</div>
            <p>生命：${S.player.hp} / ${S.player.maxHp}<br>護盾：${S.player.shield}</p>
        </div>`;
    } else if (type === 'mod') {
        titleEl.innerText = `⚡ 當前戰場：${S.mod.name}`;
        html = `<div class="effect-item">
            <div class="hero-name-big" style="color:#8b5cf6;">${S.mod.name}</div>
            <p>${S.mod.desc}</p>
        </div>`;
    } else if (type === 'diff') {
        titleEl.innerText = `🟡 當前難度：${S.difficulty === 'easy' ? '休閒' : S.difficulty === 'hard' ? '挑戰' : '標準'}`;
        let desc = "";
        if (S.difficulty === 'easy') desc = "魔王生命與傷害 ×0.8，適合新手體驗。";
        else if (S.difficulty === 'hard') desc = "魔王生命與傷害 ×1.2，挑戰極限！";
        else desc = "正常的遊戲體驗。";
        html = `<div class="effect-item">
            <div class="hero-name-big" style="color:#38bdf8;">${S.difficulty === 'easy' ? '🟢 休閒' : S.difficulty === 'hard' ? '🔴 挑戰' : '🟡 標準'}</div>
            <p>${desc}</p>
        </div>`;
    } else if (type === 'boss') {
        updateCurrentBossUI();
        toggleModal('current-boss-modal');
        return;
    }

    bodyEl.innerHTML = html;
    toggleModal('info-modal');
}

function cardValueText(card) {
    if (!S) return card.value ? `${card.value} 點` : "效果";
    const mod = S.mod.effect;
    const dmgMult = mod === "berserk" ? 1.2 : 1.0;
    const markMult = S.monster.markedTurns > 0 ? 1.25 : 1.0;
    const healMult = mod === "weak_heal" ? 0.6 : 1.0;
    const extraAtk = (S.player.atkBuff || 0) + (S.player.permanentAtkBuff || 0);
    const turtloBonus = (S.hero.trait === "turtlo" && S.player.shield > 20) ? Math.floor(S.player.shield * 0.25) : 0;
    const mult = S.player.nextAttackMultiplier || 1;
    
    const D = (n) => {
        let base = (n + extraAtk + turtloBonus) * mult;
        return Math.round(Math.round(base * dmgMult) * markMult);
    };
    const H = (n) => Math.round(n * healMult);

    if (card.type === "attack") {
        if (card.subType === "crit") return `${D(12)} / ${D(25)} 點傷害`;
        if (card.subType === "detonate") {
            const hasDebuff = S.monster.poison > 0 || S.monster.weakTurns > 0;
            return hasDebuff ? `${D(32)} 點傷害(引爆)` : `${D(10)} 點傷害`;
        }
        if (card.subType === "desperate") {
            const lost = Math.max(0, S.player.maxHp - S.player.hp);
            return `${Math.round(Math.min(40, Math.round(lost * 0.4) + extraAtk + turtloBonus) * dmgMult * markMult)} 點傷害`;
        }
        if (card.subType === "erosion") {
            let c = 0;
            if (S.monster.poison > 0) c++;
            if (S.monster.weakTurns > 0) c++;
            if (S.monster.markedTurns > 0) c++;
            return `${D(12 + c * 6)} 點傷害`;
        }
        if (card.subType === "finisher") {
            return S.monster.hp < S.monster.maxHp * 0.3 ? `${D(30)} 點穿透` : `${D(10)} 點傷害`;
        }
        if (card.subType === "pierce") return `${D(card.value)} 點穿透`;
        if (card.subType === "shadow_burst") return `${S.monster.poison * 8} 點傷害`;
        if (card.subType === "shadow_dead") return `${D(4)} 點穿透+中毒`;
        if (card.subType === "shadow_poison") return `${D(6)} 點傷害+中毒`;
        if (card.subType === "thunder_strike") return `${D(12)} 點傷害`;
        if (card.subType === "ignis_rage") {
            const isLow = S.player.hp < S.player.maxHp * 0.5;
            return isLow ? `扣8血/${D(30)}點傷害` : `扣8血/${D(20)}點傷害`;
        }
        if (card.subType === "ignis_last") return `扣10血/${D(25)}點穿透`;
        if (card.subType === "thunder_thunder") {
            const p = S.monster.skipTurns > 0;
            return p ? `${D(35)} 點傷害(麻痺)` : `${D(15)} 點傷害`;
        }
        if (card.subType === "raccoon_flash") return S.specialPlayedThisTurn ? `${D(24)} 點傷害` : `${D(14)} 點傷害`;
        if (card.subType === "hedgehog_needle") return `${D(16 + Math.round(S.player.shield * 1.5))} 點傷害`;
        if (card.subType === "delayed_bomb") return `${D(10)} 點傷害+炸彈`;
        if (card.subType === "universal_pull") {
            const count = Math.min(5, S.specialPlayedTotal || 0);
            return `${D(16 + count * 4)} 點傷害`;
        }
        if (card.subType === "shield_break") return `碎盾 / ${D(8)} 點傷害`;
        if (card.subType === "recoil") return `扣7血/${D(28)}點傷害`;
        if (card.subType === "lifesteal") return `${D(14)} 點傷害+回血`;
        if (card.subType === "poison") return `${D(10)} 點傷害+中毒`;
        if (card.subType === "frost") return `${D(12)} 點傷害+虛弱`;
        if (card.subType === "normal") return `${D(18)} 點傷害`;
        return `${D(card.value || 0)} 點傷害`;
    }
    if (card.type === "heal") {
        if (card.subType === "regen") return `每回合回 ${H(6)} 血/-3傷`;
        if (card.subType === "shield") return `回${H(card.value)}血/12點護盾`;
        if (card.subType === "reverse_heal") {
            const lost = Math.max(0, S.player.maxHp - S.player.hp);
            return `回 ${Math.min(25, Math.round(lost * 0.4 * healMult))} 點血`;
        }
        if (card.subType === "low_hp_shield") return `獲得護盾`;
        if (card.subType === "ignis_phoenix") {
            const isLow = S.player.hp < S.player.maxHp * 0.3;
            return isLow ? `回 ${H(30)} 點血` : `回 ${H(15)} 點血`;
        }
        if (card.subType === "turtlo_counter") return `15 點護盾`;
        if (card.subType === "turtlo_wall") return `20點護盾/+8攻擊`;
        if (card.subType === "hedgehog_steam") return `15點護盾+行動`;
        if (card.subType === "raccoon_amulet") return `回${H(14)}血/10點護盾`;
        return `回 ${H(card.value || 0)} 點血`;
    }
    if (card.subType === "sacrifice") return `扣${card.costHP}血/+${card.buffVal}點攻擊`;
    if (card.subType === "shield_bash") return `×1.5 點傷害`;
    if (card.subType === "reflect") return `10點護盾+反彈`;
    if (card.subType === "skip") return `跳過行動+封印`;
    if (card.subType === "steal_shield") {
        return S.monster.shield > 0 ? `偷 ${Math.floor(S.monster.shield * 0.5)} 點護盾` : `+5 點護盾`;
    }
    if (card.subType === "mark") return `易傷 +25%`;
    if (card.subType === "dark_contract") return `扣12血/+6點攻擊`;
    if (card.subType === "time_hourglass") return `+1 次行動`;
    if (card.subType === "turtlo_stand") return `15點護盾+減傷`;
    if (card.subType === "thunder_double") return `攻擊 ×2`;
    if (card.subType === "copycat_draw") return `抽 1 張牌`;
    if (card.subType === "copycat_boost") return `2次 +10 點攻擊`;
    if (card.subType === "copycat_echo") return `獲得通用卡`;
    if (card.subType === "deep_meditation") return `抽1張/+8攻擊`;
    if (card.subType === "resurrection") return `抓1張/回${H(10)}血`;
    if (card.subType === "raccoon_search") return `抓攻擊卡/+5攻擊`;
    if (card.subType === "hedgehog_armor") return `22點護盾/+10攻擊`;
    return "戰術";
}

function getCardDesc(card) {
    const mod = S ? S.mod.effect : null;
    const hero = S ? S.hero.trait : null;
    const dmgMult = mod === "berserk" ? 1.2 : 1.0;
    const markMult = (S && S.monster.markedTurns > 0) ? 1.25 : 1.0;
    const markTag = (S && S.monster.markedTurns > 0) ? "（🎯 +25%）" : "";
    const D = (n) => Math.round(Math.round(n * dmgMult) * markMult);
    const dmgTag = mod === "berserk" ? "（🔥 +20%）" : "";
    const healMult = mod === "weak_heal" ? 0.6 : 1.0;
    const H = (n) => Math.round(n * healMult);
    const healTag = mod === "weak_heal" ? "（💧 -40%）" : "";

    switch (card.subType) {
        case "normal": return `造成 ${D(card.value)} 點傷害${dmgTag}${markTag}。`;
        case "lifesteal": return `造成 ${D(card.value)} 點傷害${dmgTag}${markTag}，並回復 ${H(7)} 點生命${healTag}。`;
        case "crit": return `40% 機率造成 ${D(25)} 點傷害，否則造成 ${D(12)} 點傷害${dmgTag}${markTag}。`;
        case "poison": {
            const turns = hero === "shadow" ? 4 : 3;
            const tag = hero === "shadow" ? "（影爪貓 +1 回合）" : "";
            return `造成 ${D(card.value)} 點傷害${markTag}，使魔王中毒 ${turns} 回合（每回合無視護盾扣除 6 點生命）${tag}。[不可疊加]`;
        }
        case "recoil": return `扣除 ${card.selfCost} 點生命，造成 ${D(card.value)} 點傷害${dmgTag}${markTag}。`;
        case "frost": return `造成 ${D(card.value)} 點傷害${markTag}，使魔王攻擊傷害減少 40%（持續 1 回合）。[不可疊加]`;
        case "pierce": return `造成 ${D(card.value)} 點穿透傷害${dmgTag}${markTag}（無視魔王護盾）。`;
        case "detonate": {
            if (!S) return "造成 10 點傷害；魔王有異常時額外 +22 點傷害。";
            const has = S.monster.poison > 0 || S.monster.weakTurns > 0;
            if (has) return `造成 ${D(32)} 點傷害${markTag}（引爆 +22 點，並清除異常狀態）。`;
            return `造成 ${D(10)} 點傷害${markTag}（魔王無異常，不觸發引爆）。`;
        }
        case "desperate": {
            const lost = S ? Math.max(0, S.player.maxHp - S.player.hp) : 0;
            const dmg = Math.round(Math.min(40, Math.round(lost * 0.4)) * dmgMult * markMult);
            return `造成 ${dmg} 點傷害${markTag}（已損失 ${lost} 點生命 × 0.4，上限 40 點）。`;
        }
        case "erosion": {
            if (!S) return "造成 12 點傷害，每異常 +6 點傷害（上限 +18 點）。";
            let c = 0;
            if (S.monster.poison > 0) c++;
            if (S.monster.weakTurns > 0) c++;
            if (S.monster.markedTurns > 0) c++;
            return `造成 ${D(12 + c * 6)} 點傷害${markTag}（魔王有 ${c} 個異常狀態）。`;
        }
        case "finisher": {
            if (!S) return "造成 10 點傷害；魔王生命 < 30% 時改為 30 點穿透傷害。";
            const isLow = S.monster.hp < S.monster.maxHp * 0.3;
            if (isLow) return `造成 ${D(30)} 點穿透傷害${markTag}（斬殺觸發）。`;
            return `造成 ${D(10)} 點傷害${markTag}（魔王生命 < 30% 時變 30 點穿透）。`;
        }
        case "burst": return `回復 ${H(card.value)} 點生命${healTag}。`;
        case "shield": return `回復 ${H(card.value)} 點生命${healTag}，並獲得 12 點護盾。`;
        case "regen": return `獲得 3 回合【泉源祝福】：每回合回復 ${H(6)} 點生命${healTag}，且期間受到的傷害 -3 點。[不可疊加]`;
        case "reverse_heal": {
            const lost = S ? Math.max(0, S.player.maxHp - S.player.hp) : 0;
            return `回復 ${Math.min(25, Math.round(lost * 0.4 * healMult))} 點生命${healTag}（已損失 ${lost} 點生命 × 0.4，上限 25 點）。`;
        }
        case "low_hp_shield": {
            if (!S) return `獲得 12 點護盾；生命 < 50% 時改為 20 點護盾。`;
            const isLow = S.player.hp < S.player.maxHp / 2;
            return `獲得 ${isLow ? 20 : 12} 點護盾${isLow ? "（低血觸發 20 點）" : "（生命 < 50% 時 20 點）"}。`;
        }
        case "sacrifice": return `扣除 ${card.costHP} 點生命，下次攻擊傷害 +${card.buffVal} 點。`;
        case "skip": return `跳過魔王 1 次行動，並【封印特質】2 回合。[不可複製]`;
        case "reflect": return `獲得 10 點護盾，下回合被魔王攻擊時反彈 50% 傷害給魔王。[不可疊加]`;
        case "roulette": return `隨機三選一：回復 ${H(18)} 點生命且生命上限 +10 點（上限 +50） / 獲得 18 點護盾 / 造成 ${D(22)} 點穿透傷害${markTag}。`;
        case "shield_bash": return `消耗全部護盾，每 1 點護盾造成 1.5 點傷害${markTag}。[不可複製]`;
        case "steal_shield": return `偷取魔王 50% 護盾；若魔王無護盾則獲得 5 點護盾。`;
        case "mark": return `標記魔王 3 回合，期間受到的玩家攻擊傷害 +25%。[不可疊加]`;
        case "dark_contract": return `扣除 12 點生命，永久 +6 點攻擊（上限 +12 點）。`;
        case "time_hourglass": return `下回合起始行動數 +1。[不可疊加]`;
        case "shield_break": {
            if (!S) return "打碎魔王全部護盾；若無護盾則造成 8 點傷害。";
            return S.monster.shield > 0 ? `打碎魔王 ${S.monster.shield} 點護盾。` : `魔王無護盾，造成 ${D(8)} 點傷害${markTag}。`;
        }
        case "ignis_rage": {
            if (!S) return "扣除 8 點生命，造成 20 點傷害；生命 < 50% 時 30 點傷害。";
            const isLow = S.player.hp < S.player.maxHp * 0.5;
            return `扣除 8 點生命，造成 ${D(isLow ? 30 : 20)} 點傷害${markTag}${isLow ? "（低血觸發 +10！）" : ""}。`;
        }
        case "ignis_phoenix": {
            if (!S) return "回復 15 點生命；生命 < 30% 時改為 30 點生命。";
            const isLow = S.player.hp < S.player.maxHp * 0.3;
            return `回復 ${H(isLow ? 30 : 15)} 點生命${healTag}${isLow ? "（低血觸發）" : ""}。`;
        }
        case "ignis_last": return `扣除 10 點生命，造成 ${D(25)} 點穿透傷害${markTag}。`;
        case "turtlo_counter": return `獲得 15 點護盾，本回合被攻擊時反彈 50% 傷害給魔王。[不可疊加]`;
        case "turtlo_wall": return `獲得 20 點護盾，且下次攻擊傷害 +8 點。`;
        case "turtlo_stand": return `獲得 15 點護盾，本回合受到的所有傷害減少 5 點。[不可疊加]`;
        case "shadow_poison": {
            const turns = hero === "shadow" ? 4 : 3;
            return `造成 ${D(6)} 點傷害${markTag}，使魔王中毒 ${turns} 回合（每回合無視護盾扣除 6 點生命）。[不可疊加]`;
        }
        case "shadow_burst": {
            if (!S) return "每層中毒造成 8 點傷害並清除。";
            return S.monster.poison > 0 ? `引爆 ${S.monster.poison} 層中毒，造成 ${S.monster.poison * 8} 點傷害${markTag}。` : `魔王無中毒，引爆失敗。`;
        }
        case "shadow_dead": {
            const turns = hero === "shadow" ? 6 : 5;
            return `造成 ${D(4)} 點穿透傷害${markTag}，使魔王中毒 ${turns} 回合（每回合無視護盾扣除 6 點生命）。[不可疊加]`;
        }
        case "thunder_strike": return `造成 ${D(12)} 點傷害${markTag}，35% 機率使魔王跳過 1 次行動。`;
        case "thunder_double": return `【不扣行動】下次攻擊傷害 ×2。[不可疊加]`;
        case "thunder_thunder": {
            if (!S) return "造成 15 點傷害；魔王麻痺時 35 點傷害。";
            const p = S.monster.skipTurns > 0;
            return p ? `造成 ${D(35)} 點傷害${markTag}（麻痺觸發 +20！）。` : `造成 ${D(15)} 點傷害${markTag}（麻痺時 +20 點）。`;
        }
        case "copycat_draw": return `【不扣行動】抽 1 張牌。`;
        case "copycat_boost": return `【不扣行動】接下來 2 次攻擊傷害 +10 點。[不可疊加]`;
        case "copycat_echo": return `【不扣行動】隨機獲得 1 張通用卡加入手牌。`;
        case "deep_meditation": return `【不扣行動】抽 1 張牌，下次攻擊傷害 +8 點。`;
        case "resurrection": return `【不扣行動】隨機將棄牌堆 1 張卡牌抓回手牌，並回復 ${H(10)} 點生命。[不可複製]`;
        case "delayed_bomb": return `造成 ${D(10)} 點傷害，並施加【定時炸彈】（2 回合後爆發 28 點穿透傷害）。`;
        case "universal_pull": {
            const count = Math.min(5, S ? (S.specialPlayedTotal || 0) : 0);
            return `造成 ${D(16 + count * 4)} 點傷害（本局已使用 ${S ? (S.specialPlayedTotal || 0) : 0} 張特殊卡，每張 +4，最高 +20）。`;
        }
        case "raccoon_search": return `【不扣行動】檢索 1 張攻擊卡加入手牌，且下次攻擊傷害 +5 點。`;
        case "raccoon_flash": {
            const isSpec = S ? S.specialPlayedThisTurn : false;
            return `造成 ${D(isSpec ? 24 : 14)} 點傷害${isSpec ? "（本回合已打出特殊卡，觸發 +10！）" : "（若本回合打出過特殊卡，額外 +10 點）"}。`;
        }
        case "raccoon_amulet": return `回復 ${H(14)} 點生命，並獲得 10 點護盾。`;
        case "hedgehog_steam": return `【不扣行動】獲得 15 點護盾；若當前護盾值 ≥ 15 點，額外獲得 1 次行動。[每回合限一次]`;
        case "hedgehog_needle": {
            const shieldVal = S ? S.player.shield : 0;
            const extraDmg = Math.round(shieldVal * 1.5);
            return `造成 ${D(16 + extraDmg)} 點傷害（消耗全部 ${shieldVal} 點護盾，每 1 點護盾 +1.5 點傷害）。`;
        }
        case "hedgehog_armor": return `【不扣行動】獲得 22 點護盾，且本回合下次攻擊傷害 +10 點。[不可疊加]`;
        default: return card.desc;
    }
}

function updateTutorialUI() {
    if (!S || !S.isTutorial) return;
    const textEl = document.getElementById("tutorial-prompt");
    const step = TUTORIAL_STEPS[S.tutorialStep - 1];
    if (step) {
        textEl.innerHTML = `<span style="font-size:12px; opacity:0.8;">🎓 Step ${S.tutorialStep}/${TUTORIAL_STEPS.length}</span><br>${step.intro}`;
        textEl.style.display = "block";
    } else {
        textEl.innerHTML = `🎉 教學完成，繼續戰鬥吧！`;
    }
}

function buildHeroUI() {
    document.getElementById("hero-body").innerHTML = heroes.map(h => {
        const hc = heroCards.filter(c => c.heroId === h.id);
        return `<div class="effect-item hero-item">
            <div class="hero-name-big">${h.icon} ${h.name}</div>
            <div class="talent-tag">初始生命 ${h.hp} · 英雄天賦</div>
            <p style="margin-bottom:12px;">${h.desc}</p>
            <div class="trait-tag" style="background:#f59e0b; color:#0f172a;">專屬卡（${hc.length} 張）</div>
            ${hc.map(c => `<div class="card-in-compendium ${c.type}">
                <b>${c.name} <span class="rarity-tag rarity-${c.rarity}">${rarityName(c.rarity)}</span> ${c.freeAction ? '<span style="color:#10b981;font-size:10px;">[不扣行動]</span>' : ''}</b>
                <p>${c.desc}</p>
            </div>`).join("")}
        </div>`;
    }).join("");
}

function buildBossUI() {
    document.getElementById("boss-body").innerHTML = bossTypes.map(b => {
        return `<div class="effect-item boss-item">
            <div class="boss-name-big">${b.icon} ${b.name}</div>
            <div class="trait-tag">專屬特質：${b.traitName}</div>
            <p style="margin-bottom:8px;"><b style="color:#94a3b8;">基礎生命：</b>${b.hp} 點</p>
            <p>${b.desc}</p>
        </div>`;
    }).join("");
}

function buildBattlefieldUI() {
    document.getElementById("battlefield-body").innerHTML = battlefieldModifiers.map(m =>
        `<div class="effect-item"><b>${m.name}</b><p>${m.desc}</p></div>`
    ).join("");
}

function buildCompendiumUI() {
    const body = document.getElementById("compendium-body");
    const groups = [
        { cat: "攻擊", cls: "atk" },
        { cat: "回復", cls: "heal" },
        { cat: "特殊", cls: "special" }
    ];
    let html = "";
    groups.forEach(g => {
        const cardsInCat = commonCards.filter(c => c.category === g.cat);
        html += `<div class="compendium-section">
            <h3 class="${g.cls}">${g.cat}型（通用卡）</h3>
            <div class="compendium-grid">
                ${cardsInCat.map(c => `<div class="compendium-card ${c.type}">
                    <b>${c.name} <span class="rarity-tag rarity-${c.rarity}">${rarityName(c.rarity)}</span></b>
                    <p>${c.desc}</p>
                </div>`).join("")}
            </div>
        </div>`;
    });
    heroes.forEach(h => {
        const hc = heroCards.filter(c => c.heroId === h.id);
        html += `<div class="compendium-section">
            <h3 class="special">${h.icon} ${h.name} 專屬卡</h3>
            <div class="compendium-grid">
                ${hc.map(c => `<div class="compendium-card ${c.type}">
                    <b>${c.name} <span class="rarity-tag rarity-${c.rarity}">${rarityName(c.rarity)}</span> ${c.freeAction ? '<span style="color:#10b981;font-size:10px;">[不扣行動]</span>' : ''}</b>
                    <p>${c.desc}</p>
                </div>`).join("")}
            </div>
        </div>`;
    });
    body.innerHTML = html;
}

function updateCurrentBossUI() {
    const body = document.getElementById("current-boss-body");
    if (!S) { body.innerHTML = "<p>戰鬥尚未開始。</p>"; return; }
    const b = S.boss;
    let traitDetail = "";
    if (b.trait === "standard") traitDetail = "<p>每 3 回合釋放【深淵咆哮】，造成 20 點傷害並施加壓制（下回合抽牌減少）。</p>";
    else if (b.trait === "undying") traitDetail = "<p>首次被擊殺時原地復活，恢復 35 點生命並進入永久狂暴（攻擊 +8 點）。</p>";
    else if (b.trait === "evasion") traitDetail = "<p>被動擁有 27% 閃避率，完全躲開玩家的攻擊。</p>";
    else if (b.trait === "vampire") traitDetail = "<p>造成穿透傷害時，吸取該傷害 30% 的生命值。</p>";
    else if (b.trait === "guardian") traitDetail = "<p>護盾被擊破時對玩家造成 12 點真實傷害（冷卻 2 回合）。</p>";
    else if (b.trait === "elementalist") traitDetail = `<p>每 2 回合切換形態：🔥烈焰（攻擊+30%）/ 🧊寒冰（受傷-30%）/ ⚡迅雷（閃避率20%）。<br><b>當前形態：${S.monster.elemStance}</b></p>`;
    else if (b.trait === "time_phantom") traitDetail = "<p>生命首次低於 30% 時觸發【熵增回溯】：生命回升至 50%，並清空雙方所有的護盾、臨時 Buff、Debuff 與定時炸彈！</p>";

    body.innerHTML = `
        <div class="effect-item current-item">
            <div class="boss-name-big" style="color:#fbbf24;">${b.icon} ${b.name}</div>
            <div class="trait-tag">專屬特質：${b.traitName}</div>
            <p style="margin-top:8px;"><b style="color:#94a3b8;">當前生命：</b>${S.monster.hp} / ${S.monster.maxHp} 點</p>
            <p style="margin-top:6px;">${b.desc}</p>
        </div>
        <div class="effect-item boss-item"><b>🔮 特質機制詳解</b>${traitDetail}</div>
        <div class="effect-item boss-item"><b>⚔️ 常規 AI 招式</b><p>包含普通猛擊（12~22傷）、暗影狂暴（+8傷且破盾）、暗黑護盾（+15盾）、自我修復（回20血）。</p></div>
    `;
}

function openDeckManager() {
    const heroId = heroes[0].id;
    selectDeckHero(heroId);
    document.getElementById("deck-manager-modal").style.display = "flex";
}

function selectDeckHero(heroId) {
    const s = getDeckSettingsForHero(heroId);
    const fixed = heroCards.filter(c => c.heroId === heroId).map(c => String(c.id));
    let commons;
    if (s.mode === "custom" && Array.isArray(s.customDeck) && s.customDeck.length === 15) {
        commons = s.customDeck.map(String).filter(id => !fixed.includes(id));
    } else {
        commons = defaultDecks[heroId].map(String).filter(id => !fixed.includes(id));
    }
    deckManagerState = { heroId, mode: s.mode || "preset", commons: [...commons] };
    renderDeckManager();
}

function renderDeckManager() {
    const { heroId, mode, commons } = deckManagerState;
    const hero = heroes.find(h => h.id === heroId);

    const chipsHTML = heroes.map(h => {
        const s = getDeckSettingsForHero(h.id);
        const isActive = h.id === heroId;
        const modeLabel = s.mode === "preset" ? "預設" : "自選";
        return `<button class="hero-chip ${isActive ? 'active' : ''}" onclick="selectDeckHero('${h.id}')">
            ${h.icon} ${h.name}
            <span class="mode-badge ${s.mode}">${modeLabel}</span>
        </button>`;
    }).join("");
    document.getElementById("deck-manager-heroes").innerHTML = chipsHTML;

    document.getElementById("deck-manager-mode").innerHTML = `
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

    document.getElementById("deck-manager-content").innerHTML = content;
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

const LOCK_KEY = "petAdventureLockedConfig_v2";
function loadLockedConfig() {
    try {
        const raw = JSON.parse(localStorage.getItem(LOCK_KEY));
        if (raw && typeof raw === "object") {
            return {
                hero: { locked: !!(raw.hero && raw.hero.locked), value: (raw.hero && raw.hero.value) || "random" },
                boss: { locked: !!(raw.boss && raw.boss.locked), value: (raw.boss && raw.boss.value) || "random" },
                mod: { locked: !!(raw.mod && raw.mod.locked), value: (raw.mod && raw.mod.value) || "random" },
                difficulty: raw.difficulty || "normal"
            };
        }
    } catch (e) {}
    return {
        hero: { locked: false, value: "random" },
        boss: { locked: false, value: "random" },
        mod: { locked: false, value: "random" },
        difficulty: "normal"
    };
}
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
        const btn = document.getElementById(`lock-${type}`);
        if (!btn) return;
        if (cfg[type].locked) { btn.innerText = "🔒"; btn.classList.add("locked"); }
        else { btn.innerText = "🔓"; btn.classList.remove("locked"); }
    });
}

function populateSetupOptions() {
    const heroSelect = document.getElementById("hero-select");
    const bossSelect = document.getElementById("boss-select");
    const modSelect = document.getElementById("modifier-select");
    
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
    document.getElementById("hero-select").value = cfg.hero.value || "random";
    document.getElementById("boss-select").value = cfg.boss.value || "random";
    document.getElementById("modifier-select").value = cfg.mod.value || "random";
    document.getElementById("difficulty-select").value = cfg.difficulty || "normal";
    
    const st = loadSettings();
    document.getElementById("sfx-toggle").checked = !!st.sfx;
    document.getElementById("vib-toggle").checked = !!st.vibration;
    document.getElementById("vfx-toggle").checked = !!st.vfx;

    updateLockUI();
    onSetupHeroChange();
    document.getElementById("setup-modal").style.display = "flex";
}

function onSetupHeroChange() {
    const heroId = document.getElementById("hero-select").value;
    const previewEl = document.getElementById("deck-preview");
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
    const hv = document.getElementById("hero-select").value;
    const bv = document.getElementById("boss-select").value;
    const mv = document.getElementById("modifier-select").value;
    const dv = document.getElementById("difficulty-select").value;

    const st = {
        sfx: document.getElementById("sfx-toggle").checked,
        vibration: document.getElementById("vib-toggle").checked,
        vfx: document.getElementById("vfx-toggle").checked
    };
    saveSettings(st);

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

window.onload = () => {
    populateSetupOptions();
    if (!localStorage.getItem("hasVisitedPetAdventureStep")) {
        localStorage.setItem("hasVisitedPetAdventureStep", "true");
        openTutorialStart();
    } else {
        startRandomGame();
    }
};
