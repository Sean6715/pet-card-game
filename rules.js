function healModifier() { return S.mod.effect === EFFECT.WEAK_HEAL ? 0.6 : 1.0; }
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
        const card = cardById[S.drawPile.pop()];
        if (card) S.hand.push(card);
    }
}
async function refillHandIfEmpty() {
    if (S.isTutorial) return true;
    if (S.hand.length > 0) return true;
    let drawCount = 3;
    if (S.hero.trait === "raccoon") drawCount += 1;
    if (S.mod.effect === EFFECT.FOG) drawCount = Math.max(1, drawCount - 1);
    const before = S.hand.length;
    drawCards(drawCount);
    if (S.hand.length > before) {
        await log(`📚 手牌耗盡，自動補充 ${S.hand.length - before} 張牌。`, "info");
        return true;
    }
    await log(`⚠️ 牌庫已耗盡，無法繼續行動。`, "warn");
    return false;
}

function computeAttackDamage(base, { consume = true } = {}) {
    let mult = 1;
    if (S.player.nextAttackMultiplier > 1) {
        mult = S.player.nextAttackMultiplier;
        if (consume) S.player.nextAttackMultiplier = 1;
    }
    let attackBonus = 0;
    if (S.player.nextAttacksCount > 0) {
        attackBonus = S.player.nextAttacksBonus;
        if (consume) S.player.nextAttacksCount--;
    }
    let turtloBonus = 0;
    if (S.hero.trait === "turtlo" && S.player.shield > 20)
        turtloBonus = Math.floor(S.player.shield * 0.25);

    const extraAtk = (S.player.atkBuff || 0) + (S.player.permanentAtkBuff || 0) + (S.player.turnAtkBonus || 0);
    if (consume) S.player.atkBuff = 0;

    let dmg = (base + extraAtk + turtloBonus) * mult + attackBonus;
    const dmgMult = S.mod.effect === EFFECT.BERSERK ? 1.2 : 1.0;
    return Math.round(Math.round(dmg * dmgMult));
}

function applyPlayerAttackModifiers(base) {
    const hadMagicBoost = S.player.nextAttacksCount > 0;
    const magicBonus = S.player.nextAttacksBonus;
    const hadTurtlo = S.hero.trait === "turtlo" && S.player.shield > 20;
    const turtloVal = hadTurtlo ? Math.floor(S.player.shield * 0.25) : 0;
    const dmg = computeAttackDamage(base, { consume: true });
    if (hadMagicBoost)
        log(`✨ 魔法增幅：本次攻擊傷害 +${magicBonus} 點！（剩餘 ${S.player.nextAttacksCount} 次）`, "crit");
    if (hadTurtlo)
        log(`🐢 堅甲防禦反震：額外附加 ${turtloVal} 點護盾衝擊傷害！`, "shield");
    return dmg;
}

function previewDamage(base) {
    const dmg = computeAttackDamage(base, { consume: false });
    return S.monster.markedTurns > 0 ? Math.round(dmg * 1.25) : dmg;
}

async function addShieldToPlayer(amount) {
    const add = S.hero.trait === "turtlo" ? Math.round(amount * 1.1) : amount;
    S.player.shield += add;
    if (S.hero.trait === "hedgehog" && S.player.hedgehogBuff < 12 && S.player.shield >= 15) {
        const overflow = S.player.shield - 15;
        if (overflow > 0) {
            const gain = Math.min(Math.floor(overflow / 2), 12 - S.player.hedgehogBuff);
            if (gain > 0) {
                S.player.permanentAtkBuff += gain;
                S.player.hedgehogBuff += gain;
                S.player.shield = 15;
                await log(`🦔 <b>【超頻核心】</b>護盾溢出 15 點！轉化為永久攻擊力 +${gain}（累積 +${S.player.hedgehogBuff}/12）！`, "crit");
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
    S.player.turnAtkBonus = 0;
}
function clearMonsterAllBuffsAndShields() {
    S.monster.shield = 0;
    S.monster.poison = 0;
    S.monster.weakTurns = 0;
    S.monster.markedTurns = 0;
    S.monster.atkBuffTurns = 0;
    S.delayedBombs = [];
}

async function checkTimePhantom() {
    if (S.boss.trait === TRAIT.TIME_PHANTOM && !S.monster.timeRewound
        && S.monster.hp > 0 && S.monster.hp <= S.monster.maxHp * 0.3) {
        if (S.monster.sealedTurns > 0) {
            await log(`🔒🔒 <b>【禁錮封印】封鎖了時空幻影的熵增回溯！</b>`, "seal");
        } else {
            S.monster.timeRewound = true;
            S.monster.hp = Math.round(S.monster.maxHp * 0.4);
            clearPlayerAllBuffsAndShields();
            clearMonsterAllBuffsAndShields();
            await log(`⏳💥 <b>【熵增回溯發動！】</b>時空幻影生命回升至 40%（${S.monster.hp} 點），並強制<b>清空雙方護盾與臨時狀態（保留永久攻擊成長）！</b>`, "crit");
        }
    }
}

async function applyDamageToMonster(dmg, opts = {}) {
    const { ignoreShield = false, cardName = null, canEvade = true, fromPlayer = true } = opts;

    const isElemThunder = S.boss.trait === TRAIT.ELEMENTALIST && S.monster.elemStance === "thunder";
    const evasionChance = isElemThunder ? 0.20 : (S.boss.trait === TRAIT.EVASION ? 0.27 : 0);

    if (canEvade && evasionChance > 0 && S.monster.sealedTurns <= 0 && Math.random() < evasionChance) {
        const name = isElemThunder ? "元素巫師（迅雷形態）" : "影魔";
        await log(`💨 <b>【閃避成功】</b>${name}身形一閃，完全躲開${cardName ? ` <b>${cardName}</b>` : "攻擊"}！`, "info");
        return { hit: false, actualDmg: 0, finalDmg: 0, markApplied: false };
    }

    if (S.boss.trait === TRAIT.ELEMENTALIST && S.monster.elemStance === "ice" && S.monster.sealedTurns <= 0) {
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

    if (markApplied)
        await log(`🎯🎯 <b>【弱點標記生效】</b>傷害 ×1.25：${baseDmg} → ${dmg}`, "mark");

    if (S.boss.trait === TRAIT.GUARDIAN
        && shieldBefore > 0 && S.monster.shield === 0
        && !ignoreShield && fromPlayer && S.monster.guardianCd <= 0
        && S.monster.sealedTurns <= 0) {
        S.monster.guardianCd = 2;
        await log(`🏰💥 <b>【鋼鐵反震】</b>護盾被擊破，反擊 12 點真實傷害（無視護盾，冷卻 2 回合）！`, "crit");
        await dealDamageToPlayer(12, "shield_break", { ignoreShield: true });
    }

    if (S.mod.effect === EFFECT.THORNS && fromPlayer && (actualDmg > 0 || shieldLost > 0)) {
        await log(`🌵 荊棘之地反刺：玩家受到 3 點反傷（無視護盾）`, "warn");
        await dealDamageToPlayer(3, "thorns", { ignoreShield: true });
    }

    await checkTimePhantom();
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
    if (S.mod.effect === EFFECT.THORNS && (source === "attack" || source === "roar")) {
        await log(`🌵 荊棘之地反刺：魔王受到 3 點反傷（無視護盾）`, "warn");
        S.monster.hp -= 3;
    }
    return { shieldAbsorbed, hpLost: dmg };
}