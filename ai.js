function estimateAttackDamage(base) {
    let dmg = base;
    if (S.monster.atkBuffTurns > 0) dmg += 8;
    if (S.monster.permanentRage) dmg += 8;
    if (S.boss.trait === TRAIT.ELEMENTALIST && S.monster.elemStance === "fire" && S.monster.sealedTurns <= 0)
        dmg = Math.round(dmg * 1.3);
    if (S.mod.effect === EFFECT.BERSERK) dmg = Math.round(dmg * 1.2);
    if (S.difficulty === DIFF.EASY) dmg = Math.round(dmg * 0.8);
    if (S.difficulty === DIFF.HARD) dmg = Math.round(dmg * 1.2);
    if (S.monster.weakTurns > 0) dmg = Math.round(dmg * 0.6);
    return dmg;
}

async function executeMonsterAiDecision() {
    const maxDmg = estimateAttackDamage(22);
    const minDmg = estimateAttackDamage(12);
    const playerEffHp = S.player.hp + S.player.shield;

    if (playerEffHp <= maxDmg) { await actionAttack(); return; }
    if (S.player.shield === 0 && S.player.hp <= minDmg) { await actionAttack(); return; }
    if (S.monster.hp < S.monster.maxHp * 0.25) {
        if ((S.boss.trait !== TRAIT.UNDYING || S.bossRevived) && S.monster.sealedTurns <= 0) {
            await actionHeal(); return;
        }
    }
    if (S.boss.trait === TRAIT.GUARDIAN && S.monster.shield === 0 && S.monster.sealedTurns <= 0) {
        await actionGuard(); return;
    }
    if (S.boss.trait === TRAIT.VAMPIRE && S.monster.hp < S.monster.maxHp * 0.7 && S.monster.sealedTurns <= 0) {
        if (S.player.shield === 0 || S.player.shield < S.monster.hp * 0.2) {
            await actionAttack(); return;
        }
    }
    if (S.boss.trait === TRAIT.STANDARD && (S.turn + 1) % 3 === 0 && S.monster.sealedTurns <= 0) {
        if (S.monster.shield === 0) { await actionGuard(); return; }
        if (S.monster.atkBuffTurns <= 0 && !S.monster.permanentRage) { await actionBuff(); return; }
    }
    if (S.monster.atkBuffTurns > 0 || S.monster.permanentRage) { await actionAttack(); return; }
    if (S.monster.hp > S.monster.maxHp * 0.5 && S.player.hp > S.player.maxHp * 0.5) {
        if (Math.random() < 0.5) { await actionBuff(); return; }
    }
    await actionAttack();
}

async function actionGuard() {
    S.monster.shield += 15;
    await log(`🛡️ 魔王張開「暗黑護盾」，獲得 15 點護盾！`, "shield");
}
async function actionHeal() {
    const h = healMonster(20);
    await log(`🪄 魔王施展「自我修復」，回復 ${h} 點生命！`, "heal");
}
async function actionBuff() {
    S.monster.atkBuffTurns = 2;
    await log(`🔥 <b>魔王發動「暗影狂暴」！接下來 2 次攻擊傷害 +8 點！</b>`, "crit");
}
async function actionAttack() {
    let rawDmg = Math.floor(Math.random() * 11) + 12;
    let isBreakArmor = false;

    if (S.boss.trait === TRAIT.ELEMENTALIST && S.monster.elemStance === "fire" && S.monster.sealedTurns <= 0)
        rawDmg = Math.round(rawDmg * 1.3);
    if (S.monster.atkBuffTurns > 0) {
        rawDmg += 8;
        S.monster.atkBuffTurns--;
        if (Math.random() < 0.3) isBreakArmor = true;
        await log(`💥 魔王帶有【暗影狂暴】加成，本次攻擊傷害 +8 點！`, "warn");
    }
    if (S.monster.permanentRage) rawDmg += 8;
    if (S.mod.effect === EFFECT.BERSERK) rawDmg = Math.round(rawDmg * 1.2);
    if (S.difficulty === DIFF.EASY) rawDmg = Math.round(rawDmg * 0.8);
    if (S.difficulty === DIFF.HARD) rawDmg = Math.round(rawDmg * 1.2);
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

    const r = await dealDamageToPlayer(rawDmg, "attack");
    const detail = r.shieldAbsorbed > 0 ? `（護盾吸收 ${r.shieldAbsorbed} 點，實際扣血 ${r.hpLost} 點）` : `（實際扣血 ${r.hpLost} 點）`;
    await log(`⚠️ 魔王發動猛擊，造成 ${rawDmg} 點傷害${detail}。`, "dmg");

    if (S.boss.trait === TRAIT.VAMPIRE && r.hpLost > 0) {
        if (S.monster.sealedTurns > 0) {
            await log(`🔒🔒 <b>禁錮封印：吸血鬼無法吸血！</b>`, "seal");
        } else {
            const vampHeal = Math.round(r.hpLost * 0.3 * healModifier());
            S.monster.hp = Math.min(S.monster.maxHp, S.monster.hp + vampHeal);
            await log(`🧛 <b>【嗜血吸取】</b>德古拉汲取 ${vampHeal} 點生命！`, "heal");
        }
    }
}

async function executeRoar() {
    let dmg = S.isTutorial ? 10 : 20;
    if (S.mod.effect === EFFECT.BERSERK) dmg = Math.round(dmg * 1.2);
    if (S.difficulty === DIFF.EASY && !S.isTutorial) dmg = Math.round(dmg * 0.8);
    if (S.difficulty === DIFF.HARD && !S.isTutorial) dmg = Math.round(dmg * 1.2);
    if (S.monster.weakTurns > 0) {
        dmg = Math.round(dmg * 0.6);
        S.monster.weakTurns--;
        await log(`❄️ 魔王受【冰霜虛弱】影響，深淵咆哮傷害減少 40%！`, "status");
    }
    const r = await dealDamageToPlayer(dmg, "roar");
    if (!S.isTutorial) S.player.suppressNext = true;
    const detail = r.shieldAbsorbed > 0 ? `（護盾吸收 ${r.shieldAbsorbed} 點，實際扣血 ${r.hpLost} 點）` : `（實際扣血 ${r.hpLost} 點）`;
    await log(`📢💥 <b>【深淵咆哮】</b>造成 ${dmg} 點傷害${detail}${S.isTutorial ? "" : "，並施加【壓制】"}！`, "crit");
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

    if (S.monster.poison > 0) {
        S.monster.hp -= 6;
        S.monster.poison--;
        await log(`☠️ 魔王受到劇毒侵蝕，扣除 6 點生命！（剩餘 ${S.monster.poison} 回合）`, "status");
        await checkTimePhantom();
    }

    isBatching = false;
    flushLogBatch();
    updateStatus();
    if (checkWinLoss()) return;
    await sleep(600);

    const actions = S.mod.effect === EFFECT.DOUBLE_ACTION ? 2 : 1;
    let hasRoared = false;
    isBatching = true;

    for (let i = 0; i < actions; i++) {
        if (S.gameOver) break;
        if (S.monster.skipTurns > 0) {
            await log(`🔒 <b>魔王被束縛，跳過本次行動！</b>（剩餘 ${S.monster.skipTurns - 1} 次）`, "status");
            S.monster.skipTurns--;
            continue;
        }
        if (S.boss.trait === TRAIT.STANDARD && S.turn % 3 === 0 && !hasRoared) {
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