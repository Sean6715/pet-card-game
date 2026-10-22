// ============================================================
// ui.js — 所有 UI 渲染（完整版）
// 依賴：data.js、utils.js、rules.js（previewDamage）
// ============================================================

// ===== Tooltip =====
function showTooltip(e, card) {
    hideTooltip();
    tooltipEl = document.createElement("div");
    tooltipEl.className = `tooltip-box ${card.type}`;
    tooltipEl.innerHTML = `<b>${card.name} <span class="rarity-tag rarity-${card.rarity}">${rarityName(card.rarity)}</span></b><p>${card.desc}</p>`;
    document.body.appendChild(tooltipEl);
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top = y + 'px';
}
function hideTooltip() {
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    if (tooltipTimeout) { clearTimeout(tooltipTimeout); tooltipTimeout = null; }
}
function handleTouchStart(e, cardId) {
    const card = cardById[String(cardId)];
    tooltipTimeout = setTimeout(() => showTooltip(e, card), 400);
}
function handleTouchEnd() {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    setTimeout(hideTooltip, 100);
}

// ===== 牌堆彈窗 =====
function showPileInfo(type) {
    if (!S || S.isTutorial) return;
    const pile = type === 'draw' ? S.drawPile : S.discardPile;
    $("pile-modal-title").innerText = type === 'draw' ? '📚 抽牌堆內容' : '🗑️ 棄牌堆內容';
    const counts = {};
    pile.forEach(id => counts[id] = (counts[id] || 0) + 1);
    let html = "";
    Object.keys(counts).forEach(id => {
        const c = cardById[id];
        if (!c) return;
        html += `<div class="compendium-card ${c.type}" style="width:100%;padding:8px;margin-bottom:4px;">
            <b>${c.name} <span class="rarity-tag rarity-${c.rarity}">${rarityName(c.rarity)}</span></b>
            <p style="font-size:11px;">${c.desc}</p>
            <div style="position:absolute;right:8px;top:8px;font-weight:bold;color:#fbbf24;">×${counts[id]}</div>
        </div>`;
    });
    if (!html) html = `<p style="color:#94a3b8;text-align:center;width:100%;">牌堆是空的</p>`;
    $("pile-modal-body").innerHTML = html;
    toggleModal('pile-modal');
}

// ===== 狀態面板 =====
function updateStatus() {
    if (!S) return;
    $("player-hp").innerText = `${Math.max(0, S.player.hp)} / ${S.player.maxHp}`;
    $("monster-hp").innerText = `${Math.max(0, S.monster.hp)} / ${S.monster.maxHp}`;
    $("turn-count").innerText = S.turn;
    $("action-points").innerText = `剩餘行動：${S.actionsLeft}`;

    const pTags = [
        S.player.shield > 0 && `<span class="status-icon shield">🛡️ ${S.player.shield}</span>`,
        S.player.atkBuff > 0 && `<span class="status-icon atk">⚔️ +${S.player.atkBuff}</span>`,
        S.player.turnAtkBonus > 0 && `<span class="status-icon atk">⚔️ 本回合 +${S.player.turnAtkBonus}</span>`,
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
    $("player-buff").innerHTML = pTags.filter(Boolean).join(" ") || "正常";

    const mTags = [
        S.monster.shield > 0 && `<span class="status-icon shield">🛡️ ${S.monster.shield}</span>`,
        S.monster.poison > 0 && `<span class="status-icon poison">☠️ ${S.monster.poison}T</span>`,
        S.monster.skipTurns > 0 && `<span class="status-icon lock">🔒 ${S.monster.skipTurns}</span>`,
        S.monster.sealedTurns > 0 && `<span class="status-icon sealed">🔒🔒 封印 ${S.monster.sealedTurns}T</span>`,
        S.monster.weakTurns > 0 && `<span class="status-icon frost">❄️ ${S.monster.weakTurns}T</span>`,
        S.monster.atkBuffTurns > 0 && `<span class="status-icon rage">🔥 ${S.monster.atkBuffTurns}次</span>`,
        S.monster.permanentRage && `<span class="status-icon rage">🔥 永久狂暴</span>`,
        S.monster.markedTurns > 0 && `<span class="status-icon mark">🎯 ${S.monster.markedTurns}T +25%</span>`,
        S.monster.guardianCd > 0 && `<span class="status-icon warn">🏰 冷卻 ${S.monster.guardianCd}</span>`,
        S.boss.trait === "elementalist" && `<span class="status-icon rage">🧙‍♂️ ${S.monster.elemStance}</span>`,
        S.boss.trait === "time_phantom" && S.monster.timeRewound && `<span class="status-icon warn">⏳ 已回溯</span>`
    ];

    if (S.delayedBombs && S.delayedBombs.length > 0) {
        S.delayedBombs.forEach(b => mTags.push(`<span class="status-icon poison">💣 炸彈 ${b.turns}T</span>`));
    }
    $("monster-buff").innerHTML = mTags.filter(Boolean).join(" ") || "正常";

    if (S.turn >= 15) {
        $("monster-buff").innerHTML += ` <span class="status-icon fatigue">⏳ 死鬥</span>`;
    }
    if (!S.isTutorial) {
        $("pile-draw-count").innerText = S.drawPile.length;
        $("pile-discard-count").innerText = S.discardPile.length;
    }
}

// ===== 卡牌渲染 =====
function renderCards() {
    if (S.gameOver) return;
    const container = $("card-selection");
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
        const markIcon = (markActive && isAttack) ? `<div class="card-mark">🎯 +25%</div>` : "";
        const freeIcon = card.freeAction ? `<div class="card-free-badge">不扣行動</div>` : "";

        const valueText = cardValueText(card);
        const valueClass = (markActive && isAttack) ? "card-value marked" : "card-value";
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

// ===== 資訊彈窗 =====
function showInfoModal(type) {
    if (!S) return;
    const titleEl = $("info-modal-title");
    const bodyEl = $("info-modal-body");
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

// ===== 卡面大數值 =====
function cardValueText(card) {
    if (!S) return card.value ? `${card.value} 點` : "效果";
    const healMult = S.mod.effect === "weak_heal" ? 0.6 : 1.0;
    const D = (n) => previewDamage(n);
    const H = (n) => Math.round(n * healMult);

    if (card.type === "attack") {
        if (card.subType === "crit") return `${D(12)} / ${D(25)} 點傷害`;
        if (card.subType === "detonate") {
            const hasDebuff = S.monster.poison > 0 || S.monster.weakTurns > 0;
            return hasDebuff ? `${D(32)} 點傷害(引爆)` : `${D(10)} 點傷害`;
        }
        if (card.subType === "desperate") {
            const lost = Math.max(0, S.player.maxHp - S.player.hp);
            const base = Math.min(40, Math.round(lost * 0.4));
            return `${D(base)} 點傷害`;
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
        if (card.subType === "shadow_burst") return `${S.monster.poison * 6} 點傷害`;
        if (card.subType === "shadow_dead") return `${D(4)} 點穿透+中毒`;
        if (card.subType === "shadow_poison") return `${D(6)} 點傷害+中毒`;
        if (card.subType === "thunder_strike") return `${D(12)} 點傷害`;
        if (card.subType === "ignis_rage") {
            const isLow = S.player.hp < S.player.maxHp * 0.5;
            return isLow ? `扣8血/${D(34)}點傷害` : `扣8血/${D(26)}點傷害`;
        }
        if (card.subType === "ignis_last") return `扣10血/${D(25)}點穿透`;
        if (card.subType === "thunder_thunder") {
            const p = S.monster.skipTurns > 0;
            return p ? `${D(35)} 點傷害(麻痺)` : `${D(15)} 點傷害`;
        }
        if (card.subType === "raccoon_flash") return S.specialPlayedThisTurn ? `${D(24)} 點傷害` : `${D(14)} 點傷害`;
        if (card.subType === "hedgehog_needle") {
            return `${D(16 + Math.min(30, Math.round(S.player.shield * 1.0)))} 點傷害`;
        }
        if (card.subType === "delayed_bomb") return `${D(10)} 點傷害+炸彈`;
        if (card.subType === "universal_pull") {
            const count = Math.min(5, S.specialPlayedTotal || 0);
            return `${D(16 + count * 4)} 點傷害`;
        }
        if (card.subType === "shield_break") {
            return S.monster.shield > 0 ? `碎 ${S.monster.shield} 點護盾` : `${D(8)} 點傷害`;
        }
        if (card.subType === "recoil") return `扣${card.selfCost}血/${D(card.value)}點傷害`;
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
        if (card.subType === "low_hp_shield") {
            const isLow = S.player.hp < S.player.maxHp / 2;
            return `獲得 ${isLow ? 20 : 12} 點護盾`;
        }
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
    // 特殊卡
    if (card.subType === "sacrifice") return `扣${card.costHP}血/本回合攻擊+${card.buffVal}`;
    if (card.subType === "shield_bash") return `消耗全部護盾 ×1.5 傷`;
    if (card.subType === "reflect") return `10點護盾+反彈`;
    if (card.subType === "skip") return `跳過行動+封印`;
    if (card.subType === "steal_shield") {
        return S.monster.shield > 0 ? `偷 ${Math.min(15, S.monster.shield)} 點護盾` : `12 點穿透`;
    }
    if (card.subType === "mark") return `易傷 +25%`;
    if (card.subType === "dark_contract") return `扣10血/+8點攻擊`;
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
    if (card.subType === "roulette") return `隨機三選一`;
    return "戰術";
}

// ===== 卡面小描述 =====
function getCardDesc(card) {
    const mod = S ? S.mod.effect : null;
    const hero = S ? S.hero.trait : null;
    const healMult = mod === "weak_heal" ? 0.6 : 1.0;
    const healTag = mod === "weak_heal" ? "（💧 -40%）" : "";
    const dmgTag = mod === "berserk" ? "（🔥 +20%）" : "";
    const markTag = (S && S.monster.markedTurns > 0) ? "（🎯 +25%）" : "";
    const D = (n) => previewDamage(n);
    const H = (n) => Math.round(n * healMult);

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
            const base = Math.min(40, Math.round(lost * 0.4));
            return `造成 ${D(base)} 點傷害${markTag}（已損失 ${lost} 點生命 × 0.4，上限 40 點）。`;
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
        case "regen": return `獲得 3 回合【泉源祝福】：每回合回復 ${H(6)} 點生命${healTag}，且期間受到的傷害減少 3 點。[不可疊加]`;
        case "reverse_heal": {
            const lost = S ? Math.max(0, S.player.maxHp - S.player.hp) : 0;
            return `回復 ${Math.min(25, Math.round(lost * 0.4 * healMult))} 點生命${healTag}（已損失 ${lost} 點生命 × 0.4，上限 25 點）。`;
        }
        case "low_hp_shield": {
            if (!S) return `獲得 12 點護盾；生命 < 50% 時改為 20 點護盾。`;
            const isLow = S.player.hp < S.player.maxHp / 2;
            return `獲得 ${isLow ? 20 : 12} 點護盾${isLow ? "（低血觸發 20 點）" : "（生命 < 50% 時 20 點）"}。`;
        }
        case "sacrifice": return `【不扣行動】扣除 ${card.costHP} 點生命，本回合接下來每張攻擊卡傷害 +${card.buffVal} 點（可疊加，回合結束失效）。`;
        case "skip": return `跳過魔王 1 次行動，並【封印特質】2 回合。[不可複製]`;
        case "reflect": return `獲得 10 點護盾，下回合被魔王攻擊時反彈 50% 傷害給魔王。[不可疊加]`;
        case "roulette": return `隨機三選一：回復 ${H(18)} 點生命且生命上限 +10 點（上限 +50）／獲得 18 點護盾／造成 ${D(22)} 點穿透傷害${markTag}。`;
        case "shield_bash": return `消耗全部護盾，每 1 點護盾造成 1.5 點傷害${markTag}。[不可複製]`;
        case "steal_shield": return `偷取魔王全部護盾（上限 15 點）；若魔王無護盾，改為造成 12 點穿透傷害。`;
        case "mark": return `標記魔王 3 回合，期間受到的玩家攻擊傷害 +25%。[不可疊加]`;
        case "dark_contract": return `扣除 10 點生命，本局永久 +8 點攻擊（上限 +16 點）。`;
        case "time_hourglass": return `下回合起始行動數 +1。[不可疊加]`;
        case "shield_break": {
            if (!S) return "打碎魔王全部護盾；若無護盾則造成 8 點傷害。";
            return S.monster.shield > 0 ? `打碎魔王 ${S.monster.shield} 點護盾。` : `魔王無護盾，造成 ${D(8)} 點傷害${markTag}。`;
        }
        case "ignis_rage": {
            if (!S) return "扣除 8 點生命，造成 26 點傷害；生命 < 50% 時 34 點傷害。";
            const isLow = S.player.hp < S.player.maxHp * 0.5;
            return `扣除 8 點生命，造成 ${D(isLow ? 34 : 26)} 點傷害${markTag}${isLow ? "（低血觸發 +8！）" : ""}。`;
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
            if (!S) return "每層中毒造成 6 點傷害並清除。";
            return S.monster.poison > 0 ? `引爆 ${S.monster.poison} 層中毒，造成 ${S.monster.poison * 6} 點傷害${markTag}。` : `魔王無中毒，引爆失敗。`;
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
        case "raccoon_search": return `【不扣行動】檢索 1 張攻擊卡加入手牌，且下次攻擊傷害 +5 點；若無攻擊卡則改抽 1 張牌。`;
        case "raccoon_flash": {
            const isSpec = S ? S.specialPlayedThisTurn : false;
            return `造成 ${D(isSpec ? 24 : 14)} 點傷害${isSpec ? "（本回合已打出特殊卡，觸發 +10！）" : "（若本回合打出過特殊卡，額外 +10 點）"}。`;
        }
        case "raccoon_amulet": return `回復 ${H(14)} 點生命，並獲得 10 點護盾。`;
        case "hedgehog_steam": return `【不扣行動】獲得 15 點護盾；若當前護盾值 ≥ 15 點，額外獲得 1 次行動。[每回合限一次]`;
        case "hedgehog_needle": {
            const shieldVal = S ? S.player.shield : 0;
            const extraDmg = Math.min(30, Math.round(shieldVal * 1.0));
            return `造成 ${D(16 + extraDmg)} 點傷害（消耗全部 ${shieldVal} 點護盾，每 1 點護盾 +1 點傷害，上限 +30）。`;
        }
        case "hedgehog_armor": return `【不扣行動】獲得 22 點護盾，且本回合下次攻擊傷害 +10 點。[不可疊加]`;
        default: return card.desc;
    }
}

// ===== 教學 UI =====
function updateTutorialUI() {
    if (!S || !S.isTutorial) return;
    const textEl = $("tutorial-prompt");
    const step = TUTORIAL_STEPS[S.tutorialStep - 1];
    if (step) {
        textEl.innerHTML = `<span style="font-size:12px; opacity:0.8;">🎓 Step ${S.tutorialStep}/${TUTORIAL_STEPS.length}</span><br>${step.intro}`;
        textEl.style.display = "block";
    } else {
        textEl.innerHTML = `🎉 教學完成，繼續戰鬥吧！`;
    }
}

// ===== 圖鑑 =====
function buildHeroUI() {
    $("hero-body").innerHTML = heroes.map(h => {
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
    $("boss-body").innerHTML = bossTypes.map(b => {
        return `<div class="effect-item boss-item">
            <div class="boss-name-big">${b.icon} ${b.name}</div>
            <div class="trait-tag">專屬特質：${b.traitName}</div>
            <p style="margin-bottom:8px;"><b style="color:#94a3b8;">基礎生命：</b>${b.hp} 點</p>
            <p>${b.desc}</p>
        </div>`;
    }).join("");
}

function buildBattlefieldUI() {
    $("battlefield-body").innerHTML = battlefieldModifiers.map(m =>
        `<div class="effect-item"><b>${m.name}</b><p>${m.desc}</p></div>`
    ).join("");
}

function buildCompendiumUI() {
    const body = $("compendium-body");
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
    const body = $("current-boss-body");
    if (!S) { body.innerHTML = "<p>戰鬥尚未開始。</p>"; return; }
    const b = S.boss;
    let traitDetail = "";
    if (b.trait === "standard") traitDetail = "<p>每 3 回合釋放【深淵咆哮】，造成 20 點傷害並施加壓制（下回合抽牌減少）。</p>";
    else if (b.trait === "undying") traitDetail = "<p>首次被擊殺時原地復活，恢復 35 點生命並進入永久狂暴（攻擊 +8 點）。</p>";
    else if (b.trait === "evasion") traitDetail = "<p>被動擁有 27% 閃避率，完全躲開玩家的攻擊。</p>";
    else if (b.trait === "vampire") traitDetail = "<p>造成傷害時，吸取該傷害 30% 的生命值。</p>";
    else if (b.trait === "guardian") traitDetail = "<p>護盾被擊破時對玩家造成 12 點真實傷害（冷卻 2 回合）。</p>";
    else if (b.trait === "elementalist") traitDetail = `<p>每 2 回合切換形態：🔥烈焰（攻擊+30%）／🧊寒冰（受傷-30%）／⚡迅雷（閃避率20%）。<br><b>當前形態：${S.monster.elemStance}</b></p>`;
    else if (b.trait === "time_phantom") traitDetail = "<p>生命首次低於 30% 時觸發【熵增回溯】：生命回升至 40%，並清空雙方所有的護盾、臨時 Buff、Debuff 與定時炸彈！</p>";

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
