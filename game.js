// ============================================================
// game.js — 核心遊戲流程（最後載入）
// ============================================================

// ===== 開局 =====
function startRandomGame() {
    $("tutorial-prompt").style.display = "none";
    const hero = heroes[Math.floor(Math.random() * heroes.length)];
    const boss = bossTypes[Math.floor(Math.random() * bossTypes.length)];
    const mod = battlefieldModifiers[Math.floor(Math.random() * battlefieldModifiers.length)];
    initGameWithConfig(hero, boss, mod, false, "normal", getDeckForHero(hero.id));
}
function openTutorialStart() { $("tutorial-start-modal").style.display = "flex"; }
function beginTutorialBattle() {
    closeModal("tutorial-start-modal");
    initGameWithConfig(
        heroes.find(x => x.id === "shadow"),
        bossTypes.find(x => x.id === "standard"),
        battlefieldModifiers.find(x => x.effect === EFFECT.BERSERK),
        true, "normal", []
    );
    $("tutorial-prompt").style.display = "block";
    updateTutorialUI();
}
function skipTutorial() {
    closeModal("tutorial-start-modal");
    closeModal("tutorial-end-modal");
    $("tutorial-prompt").style.display = "none";
    startRandomGame();
}
function showTutorialEndModal(success) {
    const title = $("tutorial-end-title"), body = $("tutorial-end-body");
    const btn1 = $("tutorial-end-btn-1"), btn2 = $("tutorial-end-btn-2");
    if (success) {
        title.innerText = "🎉 教學完成！";
        body.innerHTML = `<p>你已掌握英雄天賦、魔王技能、牌庫機制與 Combo 核心！</p>
            <div class="effect-item hero-item"><b>下一步：正式對局</b>
            <p>・直接開始 <b>標準對局</b>：隨機英雄 × 隨機魔王 × 該英雄當前牌庫。<br>
            ・打開 <b>牌庫管理</b>：切換英雄使用「預設」或「自選」牌庫。<br>
            ・打開 <b>自選配置</b>：鎖定英雄／魔王／戰場、選擇難度。</p></div>`;
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
    $("tutorial-prompt").style.display = "none";
    $("tutorial-end-modal").style.display = "flex";
}

function initGameWithConfig(hero, boss, mod, isTutorial, difficulty, deck) {
    S = {
        hero, boss, mod, isTutorial, difficulty: difficulty || "normal",
        turn: 1, actionsLeft: 1, gameOver: false, isMonsterActing: false,
        bossRevived: false, copycatUsedThisTurn: false, specialPlayedThisTurn: false,
        specialPlayedTotal: 0, tutorialStep: 1,
        player: {
            hp: isTutorial ? 150 : hero.hp, maxHp: isTutorial ? 150 : hero.hp, shield: 0,
            atkBuff: 0, reflectActive: false, regenTurns: 0, suppressNext: false,
            permanentAtkBuff: 0, darkContractsUsed: 0, nextTurnBonus: 0,
            nextAttackMultiplier: 1, nextAttacksBonus: 0, nextAttacksCount: 0,
            turtloCounter: false, damageReduction: 0, hedgehogBuff: 0, steamUsedThisTurn: false,
            turnAtkBonus: 0
        },
        monster: {
            hp: isTutorial ? 160 : boss.hp, maxHp: isTutorial ? 160 : boss.hp, shield: 0,
            poison: 0, skipTurns: 0, weakTurns: 0, atkBuffTurns: 0,
            guardianCd: 0, markedTurns: 0, sealedTurns: 0,
            elemStance: "fire", timeRewound: false, permanentRage: false
        },
        deck: [], drawPile: [], discardPile: [], hand: [], delayedBombs: []
    };

    if (!isTutorial) {
        if (difficulty === DIFF.EASY) S.monster.maxHp = Math.round(S.monster.maxHp * 0.8);
        else if (difficulty === DIFF.HARD) S.monster.maxHp = Math.round(S.monster.maxHp * 1.2);
        S.monster.hp = S.monster.maxHp;
        S.deck = deck.map(String);
        S.drawPile = shuffleArray([...S.deck]);
    }
    if (mod.effect === EFFECT.IRON_WALL) {
        S.player.shield = hero.trait === "turtlo" ? 22 : 20;
        S.monster.shield = 20;
    }
    if (mod.effect === EFFECT.SACRIFICE) {
        S.player.maxHp = Math.max(1, S.player.maxHp - 10);
        S.player.hp = Math.min(S.player.hp, S.player.maxHp);
        S.monster.maxHp = Math.max(1, S.monster.maxHp - 15);
        S.monster.hp = Math.min(S.monster.hp, S.monster.maxHp);
    }

    $("player-title-hp").innerText = `${hero.name} 生命`;
    $("boss-title-hp").innerText = `${boss.name} 生命`;
    $("info-hero").innerText = hero.name;
    $("info-boss").innerText = boss.name;
    $("info-mod").innerText = mod.name;

    const diffLabel = isTutorial ? "教學" : (difficulty === DIFF.EASY ? "休閒" : difficulty === DIFF.HARD ? "挑戰" : "標準");
    $("info-diff").innerText = diffLabel;
    const diffBlock = $("info-diff-block");
    diffBlock.classList.remove("easy", "hard");
    if (!isTutorial && difficulty === DIFF.EASY) diffBlock.classList.add("easy");
    else if (!isTutorial && difficulty === DIFF.HARD) diffBlock.classList.add("hard");

    $("reset-btn").style.display = "none";
    $("log-box").innerHTML = "";
    $("pile-info").style.display = isTutorial ? "none" : "flex";
    batchedLogHTML = ""; isBatching = false;

    startNewTurn();
    buildCompendiumUI();
    buildHeroUI();
    buildBossUI();
    buildBattlefieldUI();
}

async function startNewTurn() {
    if (S.gameOver) return;
    S.isMonsterActing = false;
    S.actionsLeft = S.mod.effect === EFFECT.DOUBLE_ACTION ? 2 : 1;
    S.player.steamUsedThisTurn = false;
    isBatching = true;
    batchedLogHTML += `<div class="log-player-turn">▶ 第 ${S.turn} 回合：你的行動</div>`;

    if (S.player.nextTurnBonus > 0) {
        S.actionsLeft += S.player.nextTurnBonus;
        await log(`⏳ <b>時光沙漏</b>：本回合額外獲得 +${S.player.nextTurnBonus} 次行動！`, "crit");
        S.player.nextTurnBonus = 0;
    }
    S.copycatUsedThisTurn = false;
    S.specialPlayedThisTurn = false;

    if (S.boss.trait === TRAIT.ELEMENTALIST) {
        const stances = ["fire", "ice", "thunder"];
        const names = { fire: "🔥 烈焰（攻擊+30%）", ice: "🧊 寒冰（受傷-30%）", thunder: "⚡ 迅雷（閃避率20%）" };
        S.monster.elemStance = stances[Math.floor((S.turn - 1) / 2) % 3];
        await log(`🧙‍♂️ <b>元素巫師切換形態：</b>${names[S.monster.elemStance]}！`, "status");
    }
    if (S.monster.guardianCd > 0) S.monster.guardianCd--;
    if (S.monster.sealedTurns > 0) {
        S.monster.sealedTurns--;
        if (S.monster.sealedTurns > 0)
            await log(`🔒🔒 <b>【禁錮封印持續中】</b>魔王專屬特質失效，剩餘 ${S.monster.sealedTurns} 回合！`, "seal");
        else
            await log(`🔒 禁錮封印已解除，魔王專屬特質恢復。`, "status");
    }
    S.player.turtloCounter = false;
    S.player.damageReduction = 0;

    if (S.monster.markedTurns > 0) {
        S.monster.markedTurns--;
        if (S.monster.markedTurns > 0)
            await log(`🎯🎯 <b>【弱點標記持續中】</b>剩餘 ${S.monster.markedTurns} 回合 — 你對魔王的攻擊傷害 +25%！`, "mark");
        else
            await log(`🎯 弱點標記已消失。`, "status");
    }
    if (S.delayedBombs && S.delayedBombs.length > 0) {
        const remaining = [];
        for (let b of S.delayedBombs) {
            b.turns--;
            if (b.turns <= 0) {
                let bombDmg = 28;
                if (S.mod.effect === EFFECT.BERSERK) bombDmg = Math.round(bombDmg * 1.2);
                const r = await applyDamageToMonster(bombDmg, { ignoreShield: true, cardName: "定時炸彈", canEvade: false });
                if (r.hit) await log(`💣💥 <b>【定時炸彈引爆！】</b>造成 ${r.finalDmg} 點穿透傷害！`, "crit");
            } else {
                remaining.push(b);
                await log(`💣 <b>定時炸彈倒數：</b>剩餘 ${b.turns} 回合爆發！`, "info");
            }
        }
        S.delayedBombs = remaining;
    }
    if (S.player.regenTurns > 0) {
        const h = healPlayer(6);
        S.player.regenTurns--;
        await log(`🌿 自然泉源：回復 ${h} 點生命，並維持 3 點減傷護盾！（剩餘 ${S.player.regenTurns} 回合）`, "heal");
    }
    if (S.mod.effect === EFFECT.BERSERK) {
        await log(`🔥 狂暴磁場：雙方各扣除 4 點生命（無視護盾）！`, "warn");
        S.player.hp -= 4;
        S.monster.hp -= 4;
    }
    if (S.turn >= 15) {
        const fDmg = (S.turn - 14) * 3;
        await log(`⏳ <b>【死鬥階段】</b>戰鬥進入膠著！雙方受到 <b>${fDmg}</b> 點疲勞傷害（無視護盾）。`, "fatigue");
        S.player.hp -= fDmg;
        S.monster.hp -= fDmg;
    }
    if (!S.isTutorial) {
        let drawCount = 3;
        if (S.hero.trait === "raccoon") drawCount += 1;
        if (S.mod.effect === EFFECT.FOG) drawCount = Math.max(1, drawCount - 1);
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
        if (!canContinue) S.actionsLeft = 0;
        else { renderCards(); return; }
    }
    S.player.turnAtkBonus = 0;
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
        else if (S.actionsLeft > 0) {
            const ok = await refillHandIfEmpty();
            if (!ok) { S.actionsLeft = 0; await finishPlayerAction(); }
            else renderCards();
        } else await finishPlayerAction();
        return;
    }
    await sleep(600);
    if (!card.freeAction) await finishPlayerAction();
    else if (S.actionsLeft > 0) {
        const ok = await refillHandIfEmpty();
        if (!ok) { S.actionsLeft = 0; await finishPlayerAction(); }
        else renderCards();
    } else await finishPlayerAction();
}

function checkWinLoss() {
    if (S.boss.trait === TRAIT.UNDYING && S.monster.hp <= 0 && !S.bossRevived) {
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
        S.monster.permanentRage = true;
        log(`☠️⚡ <b>【不滅死魂】</b>巴洛克生命歸零，但原地復活！恢復至 ${S.monster.hp} 點生命並進入永久狂暴！`, "crit");
        updateStatus();
        return false;
    }
    const pDead = S.player.hp <= 0, mDead = S.monster.hp <= 0;
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
            endGame(); showTutorialEndModal(true);
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
            endGame(); showTutorialEndModal(false);
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
    $("card-selection").innerHTML = "";
    $("reset-btn").style.display = "block";
    $("tutorial-prompt").style.display = "none";
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
