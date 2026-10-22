function maybeThunderParalysis(prefix) {
    if (S.hero.trait === "thunder" && Math.random() < 0.30) {
        S.monster.skipTurns += 1;
        log(`${prefix}⚡ <b>【雷霆麻痺】</b>閃電鳥電擊麻痺魔王，跳過 1 次行動！`, "crit");
    }
}

const CARD_EFFECTS = {
    "normal": {
        async effect(card, prefix, atk) {
            const dmg = atk(card.value);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) {
                await log(`${prefix}⚔️ <b>${card.name}</b> 對魔王造成 ${r.finalDmg} 點傷害！`, "dmg");
                maybeThunderParalysis(prefix);
            }
        }
    },
    "lifesteal": {
        async effect(card, prefix, atk) {
            const dmg = atk(card.value);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) {
                await log(`${prefix}⚔️ <b>${card.name}</b> 對魔王造成 ${r.finalDmg} 點傷害！`, "dmg");
                const healed = healPlayer(7);
                await log(`${prefix}🩸 吸血生效：回復 ${healed} 點生命。`, "heal");
                maybeThunderParalysis(prefix);
            }
        }
    },
    "crit": {
        async effect(card, prefix, atk) {
            const isCrit = Math.random() < 0.4;
            const base = isCrit ? 25 : 12;
            const dmg = atk(base);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) {
                if (isCrit) playSfx('crit');
                await log(`${prefix}⚡ 暴擊判定：${isCrit ? "成功暴擊！" : "普通命中。"}`, "info");
                await log(`${prefix}⚔️ <b>${card.name}</b> 對魔王造成 ${r.finalDmg} 點傷害！`, "dmg");
                maybeThunderParalysis(prefix);
            }
        }
    },
    "poison": {
        async effect(card, prefix, atk) {
            const dmg = atk(card.value);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) {
                const extra = S.hero.trait === "shadow" ? 1 : 0;
                S.monster.poison = 3 + extra;
                await log(`${prefix}⚔️ <b>${card.name}</b> 對魔王造成 ${r.finalDmg} 點傷害！`, "dmg");
                await log(`${prefix}🗡️ 劇毒命中：魔王中毒 ${S.monster.poison} 回合（每回合無視護盾扣除 6 點生命）！`, "status");
                maybeThunderParalysis(prefix);
            }
        }
    },
    "frost": {
        async effect(card, prefix, atk) {
            const dmg = atk(card.value);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) {
                S.monster.weakTurns = 1;
                await log(`${prefix}⚔️ <b>${card.name}</b> 對魔王造成 ${r.finalDmg} 點傷害！`, "dmg");
                await log(`${prefix}❄️ 寒冰凍結：魔王攻擊傷害減少 40%（持續 1 回合）！`, "status");
                maybeThunderParalysis(prefix);
            }
        }
    },
    "pierce": {
        async effect(card, prefix, atk) {
            const dmg = atk(card.value);
            const r = await applyDamageToMonster(dmg, { ignoreShield: true, cardName: card.name });
            if (r.hit) {
                await log(`${prefix}🔨 <b>${card.name}</b> 無視護盾造成 ${r.finalDmg} 點穿透傷害！`, "dmg");
                maybeThunderParalysis(prefix);
            }
        }
    },
    "shield_break": {
        async effect(card, prefix, atk) {
            if (S.monster.shield > 0) {
                const broken = S.monster.shield;
                S.monster.shield = 0;
                playSfx('shield');
                await log(`${prefix}💢 <b>碎盾擊</b>：打碎魔王 ${broken} 點護盾！`, "crit");
            } else {
                const dmg = atk(card.value);
                const r = await applyDamageToMonster(dmg, { cardName: card.name });
                if (r.hit) await log(`${prefix}💢 <b>碎盾擊</b>：魔王無護盾，造成 ${r.finalDmg} 點傷害。`, "dmg");
            }
            maybeThunderParalysis(prefix);
        }
    },
    "recoil": {
        async effect(card, prefix, atk) {
            const dmg = atk(card.value);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) {
                await log(`${prefix}⚔️ <b>${card.name}</b> 對魔王造成 ${r.finalDmg} 點傷害！`, "dmg");
                maybeThunderParalysis(prefix);
            }
            S.player.hp -= card.selfCost;
            await log(`${prefix}💥 捨身代價：自身承受 ${card.selfCost} 點反噬傷害！`, "dmg");
        }
    },
    "ignis_rage": {
        async effect(card, prefix, atk) {
            S.player.hp -= 8;
            const isLow = S.player.hp < S.player.maxHp * 0.5;
            const dmg = atk(isLow ? 34 : 26);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) await log(`${prefix}🔥 <b>燃血狂怒</b>：扣除 8 點生命，造成 ${r.finalDmg} 點傷害${isLow ? "（低血觸發 +8！）" : ""}！`, "crit");
            maybeThunderParalysis(prefix);
        }
    },
    "ignis_last": {
        async effect(card, prefix, atk) {
            S.player.hp -= 10;
            const dmg = atk(25);
            const r = await applyDamageToMonster(dmg, { ignoreShield: true, cardName: card.name });
            if (r.hit) await log(`${prefix}🌋 <b>絕境焚身</b>：扣除 10 點生命，造成 ${r.finalDmg} 點穿透傷害！`, "crit");
            maybeThunderParalysis(prefix);
        }
    },
    "shadow_poison": {
        async effect(card, prefix, atk) {
            const dmg = atk(6);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) {
                const extra = S.hero.trait === "shadow" ? 1 : 0;
                S.monster.poison = 3 + extra;
                await log(`${prefix}🧪 <b>猛毒蔓延</b>：造成 ${r.finalDmg} 點傷害，魔王中毒 ${S.monster.poison} 回合！`, "crit");
            }
            maybeThunderParalysis(prefix);
        }
    },
    "shadow_burst": {
        async effect(card, prefix, atk) {
            const stacks = S.monster.poison;
            if (stacks > 0) {
                S.monster.poison = 0;
                const dmg = atk(stacks * 6);
                const r = await applyDamageToMonster(dmg, { cardName: card.name });
                if (r.hit) await log(`${prefix}☠️ <b>毒爆</b>：引爆 ${stacks} 層中毒，造成 ${r.finalDmg} 點傷害！`, "crit");
            } else {
                await log(`${prefix}☠️ <b>毒爆</b>：魔王沒有中毒，引爆失敗！`, "warn");
            }
            maybeThunderParalysis(prefix);
        }
    },
    "shadow_dead": {
        async effect(card, prefix, atk) {
            const dmg = atk(4);
            const r = await applyDamageToMonster(dmg, { ignoreShield: true, cardName: card.name });
            if (r.hit) {
                const extra = S.hero.trait === "shadow" ? 1 : 0;
                S.monster.poison = 5 + extra;
                await log(`${prefix}🌫️ <b>致命毒霧</b>：造成 ${r.finalDmg} 點穿透傷害，魔王中毒 ${S.monster.poison} 回合！`, "crit");
            }
            maybeThunderParalysis(prefix);
        }
    },
    "thunder_strike": {
        async effect(card, prefix, atk) {
            const dmg = atk(12);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) {
                await log(`${prefix}⚡ <b>迅雷麻痺</b>：造成 ${r.finalDmg} 點傷害！`, "dmg");
                if (Math.random() < 0.35) {
                    S.monster.skipTurns += 1;
                    await log(`${prefix}⚡ <b>麻痺成功！</b>魔王跳過 1 次行動！`, "crit");
                }
            }
        }
    },
    "thunder_thunder": {
        async effect(card, prefix, atk) {
            const wasParalyzed = S.monster.skipTurns > 0;
            const dmg = atk(wasParalyzed ? 35 : 15);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) await log(`${prefix}🌪️ <b>雷霆萬鈞</b>：造成 ${r.finalDmg} 點傷害${wasParalyzed ? "（麻痺觸發 +20！）" : ""}！`, "crit");
        }
    },
    "raccoon_flash": {
        async effect(card, prefix, atk) {
            const isSpec = S.specialPlayedThisTurn;
            const dmg = atk(isSpec ? 24 : 14);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) await log(`${prefix}✨ <b>閃光彈</b>：造成 ${r.finalDmg} 點傷害${isSpec ? "（特殊卡觸發 +10！）" : ""}！`, "crit");
            maybeThunderParalysis(prefix);
        }
    },
    "hedgehog_needle": {
        async effect(card, prefix, atk) {
            let extra = 0;
            if (S.player.shield > 0) {
                const used = S.player.shield;
                extra = Math.min(30, Math.round(used * 1.0));
                S.player.shield = 0;
                await log(`${prefix}🦔 消耗全部 ${used} 點護盾，刺針威力大增 (+${extra} 傷害)！`, "crit");
            }
            const dmg = atk(16 + extra);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) await log(`${prefix}🎯 <b>刺針射擊</b>：造成 ${r.finalDmg} 點傷害！`, "dmg");
            maybeThunderParalysis(prefix);
        }
    },
    "delayed_bomb": {
        async effect(card, prefix, atk) {
            const dmg = atk(10);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) {
                S.delayedBombs.push({ turns: 2 });
                await log(`${prefix}💣 <b>定時引爆</b>：造成 ${r.finalDmg} 點傷害，並植入【定時炸彈】（2 回合後爆發 28 點穿透傷害）！`, "crit");
            }
            maybeThunderParalysis(prefix);
        }
    },
    "universal_pull": {
        async effect(card, prefix, atk) {
            const count = Math.min(5, S.specialPlayedTotal || 0);
            const dmg = atk(16 + count * 4);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) await log(`${prefix}🌌 <b>萬象天引</b>：本局使用了 ${S.specialPlayedTotal || 0} 張特殊卡，造成 ${r.finalDmg} 點傷害！`, "crit");
            maybeThunderParalysis(prefix);
        }
    },
    "desperate": {
        async effect(card, prefix, atk) {
            const lost = Math.max(0, S.player.maxHp - S.player.hp);
            const dmg = atk(Math.min(40, Math.round(lost * 0.4)));
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) await log(`${prefix}🩹 <b>破釜沉舟</b>：已損失 ${lost} 點生命，造成 ${r.finalDmg} 點傷害！`, "dmg");
            maybeThunderParalysis(prefix);
        }
    },
    "erosion": {
        async effect(card, prefix, atk) {
            let count = 0;
            if (S.monster.poison > 0) count++;
            if (S.monster.weakTurns > 0) count++;
            if (S.monster.markedTurns > 0) count++;
            const dmg = atk(12 + count * 6);
            const r = await applyDamageToMonster(dmg, { cardName: card.name });
            if (r.hit) await log(`${prefix}🌀 <b>魔能侵蝕</b>：魔王有 ${count} 個異常狀態，造成 ${r.finalDmg} 點傷害！`, "dmg");
            maybeThunderParalysis(prefix);
        }
    },
    "finisher": {
        async effect(card, prefix, atk) {
            const isLow = S.monster.hp < S.monster.maxHp * 0.3;
            if (isLow) {
                const dmg = atk(30);
                const r = await applyDamageToMonster(dmg, { ignoreShield: true, cardName: card.name });
                if (r.hit) await log(`${prefix}💀 <b>致命一擊！</b>魔王生命低於 30%，造成 ${r.finalDmg} 點穿透傷害！`, "crit");
            } else {
                const dmg = atk(10);
                const r = await applyDamageToMonster(dmg, { cardName: card.name });
                if (r.hit) await log(`${prefix}💀 <b>致命一擊</b>：魔王生命尚高，僅造成 ${r.finalDmg} 點傷害。`, "dmg");
            }
            maybeThunderParalysis(prefix);
        }
    },
    "detonate": {
        async effect(card, prefix, atk) {
            const base = atk(10);
            const hasDebuff = S.monster.poison > 0 || S.monster.weakTurns > 0;
            const total = base + (hasDebuff ? 22 : 0);
            const r = await applyDamageToMonster(total, { cardName: card.name });
            if (r.hit) {
                if (hasDebuff) {
                    await log(`${prefix}💣 <b>元素引爆成功！</b>追加 22 點引爆傷害，共造成 ${r.finalDmg} 點傷害！`, "crit");
                    S.monster.poison = 0;
                    S.monster.weakTurns = 0;
                } else {
                    await log(`${prefix}💣 <b>元素引爆</b>：魔王無異常狀態，僅造成 ${r.finalDmg} 點傷害。`, "info");
                }
            }
            maybeThunderParalysis(prefix);
        }
    },
    "burst": {
        async effect(card, prefix) {
            const h = healPlayer(card.value);
            await log(`${prefix}💚 <b>${card.name}</b>：回復 ${h} 點生命！`, "heal");
        }
    },
    "shield": {
        async effect(card, prefix) {
            const h = healPlayer(card.value);
            await log(`${prefix}💚 <b>${card.name}</b>：回復 ${h} 點生命！`, "heal");
            await addShieldToPlayer(card.shieldVal);
            await log(`${prefix}🛡️ 額外獲得 12 點護盾！`, "shield");
        }
    },
    "regen": {
        async effect(card, prefix) {
            S.player.regenTurns = 3;
            playSfx('heal');
            await log(`${prefix}🌿 <b>自然泉源</b>：獲得 3 回合【泉源祝福】（每回合回復 6 點生命且傷害 -3）！`, "heal");
        }
    },
    "reverse_heal": {
        async effect(card, prefix) {
            const lost = Math.max(0, S.player.maxHp - S.player.hp);
            const base = Math.min(25, Math.round(lost * 0.4));
            const h = healPlayer(base);
            await log(`${prefix}♻️ <b>逆轉治癒</b>：已損失 ${lost} 點生命，回復 ${h} 點生命！`, "heal");
        }
    },
    "low_hp_shield": {
        async effect(card, prefix) {
            const isLow = S.player.hp < S.player.maxHp / 2;
            const add = await addShieldToPlayer(isLow ? 20 : 12);
            await log(`${prefix}🏰 <b>堅壁清野</b>：獲得護盾（當前護盾 ${add} 點）！`, "shield");
        }
    },
    "ignis_phoenix": {
        async effect(card, prefix) {
            const isLow = S.player.hp < S.player.maxHp * 0.3;
            const h = healPlayer(isLow ? 30 : 15);
            await log(`${prefix}🐦‍🔥 <b>鳳凰之心</b>：${isLow ? "低血觸發！" : ""}回復 ${h} 點生命！`, "heal");
        }
    },
    "turtlo_counter": {
        async effect(card, prefix) {
            await addShieldToPlayer(15);
            S.player.turtloCounter = true;
            await log(`${prefix}🦔 <b>反震裝甲</b>：獲得 15 點護盾，本回合被攻擊時反彈 50% 傷害！`, "shield");
        }
    },
    "turtlo_wall": {
        async effect(card, prefix) {
            await addShieldToPlayer(20);
            S.player.atkBuff += 8;
            await log(`${prefix}🧱 <b>銅牆鐵壁</b>：獲得 20 點護盾，且下次攻擊傷害 +8 點！`, "shield");
        }
    },
    "hedgehog_steam": {
        async effect(card, prefix) {
            await addShieldToPlayer(15);
            if (S.player.shield >= 15 && !S.player.steamUsedThisTurn) {
                S.player.steamUsedThisTurn = true;
                S.actionsLeft += 1;
                await log(`${prefix}💨 <b>蒸氣噴射</b>：獲得 15 點護盾，並觸發超頻獲得 +1 次行動！`, "crit");
            } else {
                await log(`${prefix}💨 <b>蒸氣噴射</b>：獲得 15 點護盾。`, "shield");
            }
        }
    },
    "raccoon_amulet": {
        async effect(card, prefix) {
            const h = healPlayer(14);
            await addShieldToPlayer(10);
            await log(`${prefix}✨ <b>星象護符</b>：回復 ${h} 點生命，並獲得 10 點護盾！`, "heal");
        }
    },
    "sacrifice": {
        async effect(card, prefix) {
            S.player.hp -= card.costHP;
            S.player.turnAtkBonus = (S.player.turnAtkBonus || 0) + card.buffVal;
            await log(`${prefix}⚗️ <b>血之狂熱</b>：扣除 ${card.costHP} 點生命，本回合接下來每張攻擊卡傷害 +${card.buffVal} 點（累積 +${S.player.turnAtkBonus}）！`, "crit");
        }
    },
    "skip": {
        async effect(card, prefix) {
            S.monster.skipTurns += 1;
            S.monster.sealedTurns = 2;
            const sealDesc = {
                standard: "【深淵咆哮】", undying: "【不滅死魂】",
                evasion: "【鬼魅閃避】", vampire: "【嗜血吸取】", guardian: "【鋼鐵反震】",
                elementalist: "【元素輪轉】", time_phantom: "【熵增回溯】"
            };
            await log(`${prefix}🔒🔒 <b>【禁錮咒語】</b>魔王跳過 1 次行動！接下來 2 回合專屬特質 ${sealDesc[S.boss.trait] || '專屬特質'} 失效！`, "seal");
        }
    },
    "reflect": {
        async effect(card, prefix) {
            await addShieldToPlayer(10);
            S.player.reflectActive = true;
            await log(`${prefix}🪞 <b>反彈護鏡</b>：獲得 10 點護盾，下回合被魔王攻擊時反彈 50% 傷害！`, "shield");
        }
    },
    "shield_bash": {
        async effect(card, prefix) {
            if (S.player.shield > 0) {
                const used = S.player.shield;
                const dmg = applyPlayerAttackModifiers(Math.round(used * 1.5));
                const r = await applyDamageToMonster(dmg, { cardName: card.name });
                if (r.hit) {
                    S.player.shield = 0;
                    await log(`${prefix}💢 <b>盾擊破敵</b>：消耗全部 ${used} 點護盾，造成 ${r.finalDmg} 點傷害！`, "crit");
                } else {
                    await log(`${prefix}💢 盾擊被閃避，護盾未被消耗！`, "warn");
                }
            } else {
                await log(`${prefix}💢 盾擊落空（無護盾）！`, "warn");
            }
        }
    },
    "roulette": {
        async effect(card, prefix) {
            const roll = Math.random();
            if (roll < 0.33) {
                const capGain = Math.max(0, Math.min(10, 50 - (S.player.maxHp - S.hero.hp)));
                S.player.maxHp += capGain;
                const h = healPlayer(18);
                await log(`${prefix}🎰 <b>命運之輪：生機庇護！</b>回復 ${h} 點生命，生命上限 +${capGain} 點（現為 ${S.player.maxHp} 點）！`, "heal");
            } else if (roll < 0.66) {
                await addShieldToPlayer(18);
                await log(`${prefix}🎰 <b>命運之輪：絕對防禦！</b>獲得 18 點護盾！`, "shield");
            } else {
                const dmg = applyPlayerAttackModifiers(22);
                const r = await applyDamageToMonster(dmg, { ignoreShield: true, cardName: "烈風風刃" });
                if (r.hit) await log(`${prefix}🎰 <b>命運之輪：烈風風刃！</b>造成 ${r.finalDmg} 點穿透傷害！`, "dmg");
            }
        }
    },
    "steal_shield": {
        async effect(card, prefix) {
            const stolen = Math.min(15, S.monster.shield);
            if (stolen > 0) {
                S.monster.shield -= stolen;
                await addShieldToPlayer(stolen);
                await log(`${prefix}🎭 <b>偷天換日</b>：偷取魔王 ${stolen} 點護盾（魔王剩 ${S.monster.shield} 點護盾）！`, "crit");
            } else {
                const dmg = applyPlayerAttackModifiers(12);
                const r = await applyDamageToMonster(dmg, { ignoreShield: true, cardName: card.name });
                if (r.hit) await log(`${prefix}🎭 <b>偷天換日</b>：魔王無護盾，轉化為 12 點穿透傷害！`, "dmg");
            }
        }
    },
    "mark": {
        async effect(card, prefix) {
            if (S.monster.markedTurns > 0) {
                S.monster.markedTurns = 3;
                await log(`${prefix}🎯 <b>【弱點標記】</b>魔王弱點標記已存在，刷新持續回合數為 3 回合！`, "mark");
            } else {
                S.monster.markedTurns = 3;
                await log(`${prefix}🎯🎯 <b>【弱點標記】</b>魔王被標記 3 回合，期間受到的玩家攻擊傷害 +25%！`, "mark");
            }
        }
    },
    "dark_contract": {
        async effect(card, prefix) {
            if (S.player.darkContractsUsed >= 2) {
                await log(`${prefix}📜 <b>黑暗契約</b>：已達上限（永久 +16 點攻擊），無法再使用！`, "warn");
            } else {
                S.player.hp -= 10;
                S.player.permanentAtkBuff += 8;
                S.player.darkContractsUsed++;
                await log(`${prefix}📜 <b>黑暗契約</b>：扣除 10 點生命，永久 +8 點攻擊（累積 +${S.player.permanentAtkBuff} 點）！`, "crit");
            }
        }
    },
    "time_hourglass": {
        async effect(card, prefix) {
            S.player.nextTurnBonus = 1;
            await log(`${prefix}⏳ <b>時光沙漏</b>：下回合起始行動數 +1！`, "crit");
        }
    },
    "turtlo_stand": {
        async effect(card, prefix) {
            await addShieldToPlayer(15);
            S.player.damageReduction = 5;
            await log(`${prefix}⛰️ <b>不動如山</b>：獲得 15 點護盾，本回合受到傷害減少 5 點！`, "shield");
        }
    },
    "thunder_double": {
        async effect(card, prefix) {
            S.player.nextAttackMultiplier = 2;
            await log(`${prefix}🌩️ <b>電光石火</b>：下次攻擊傷害倍率 ×2！`, "crit");
        }
    },
    "copycat_draw": {
        async effect(card, prefix) {
            drawCards(1);
            await log(`${prefix}📖 <b>快速施法</b>：抽 1 張牌！`, "info");
        }
    },
    "copycat_boost": {
        async effect(card, prefix) {
            S.player.nextAttacksBonus = 10;
            S.player.nextAttacksCount = 2;
            await log(`${prefix}✨ <b>魔法增幅</b>：接下來 2 次攻擊傷害 +10 點！`, "crit");
        }
    },
    "copycat_echo": {
        async effect(card, prefix) {
            const c = commonCards[Math.floor(Math.random() * commonCards.length)];
            S.hand.push(c);
            await log(`${prefix}🔮 <b>無限迴響</b>：隨機獲得 <b>${c.name}</b> 加入手牌！`, "crit");
        }
    },
    "deep_meditation": {
        async effect(card, prefix) {
            drawCards(1);
            S.player.atkBuff += 8;
            await log(`${prefix}🧘 <b>深層沉思</b>：抽 1 張牌，下次攻擊傷害 +8 點！`, "crit");
        }
    },
    "resurrection": {
        async effect(card, prefix) {
            let name = "";
            if (S.discardPile.length > 0) {
                const idx = Math.floor(Math.random() * S.discardPile.length);
                const picked = S.discardPile.splice(idx, 1)[0];
                const c = cardById[picked];
                if (c) { S.hand.push(c); name = c.name; }
            }
            const h = healPlayer(10);
            await log(`${prefix}🕊️ <b>死者甦生</b>：回復 ${h} 點生命${name ? `，並從棄牌堆抓回【${name}】` : ""}！`, "heal");
        }
    },
    "raccoon_search": {
        async effect(card, prefix) {
            const foundIdx = S.drawPile.findIndex(id => {
                const c = cardById[id];
                return c && c.type === "attack";
            });
            if (foundIdx >= 0) {
                const c = cardById[S.drawPile.splice(foundIdx, 1)[0]];
                S.hand.push(c);
                S.player.atkBuff += 5;
                await log(`${prefix}🌌 <b>預言星圖</b>：將【${c.name}】抓回手牌，且下次攻擊傷害 +5 點！`, "crit");
            } else {
                const before = S.hand.length;
                drawCards(1);
                if (S.hand.length > before)
                    await log(`${prefix}🌌 <b>預言星圖</b>：抽牌堆無攻擊卡，改為抽 1 張牌（【${S.hand[S.hand.length - 1].name}】）！`, "info");
                else
                    await log(`${prefix}🌌 <b>預言星圖</b>：抽牌堆無攻擊卡且無法抽牌，效果落空。`, "warn");
            }
        }
    },
    "hedgehog_armor": {
        async effect(card, prefix) {
            await addShieldToPlayer(22);
            S.player.atkBuff += 10;
            await log(`${prefix}⚙️ <b>鋼鐵刺裝</b>：獲得 22 點護盾，且下次攻擊傷害 +10 點！`, "shield");
        }
    }
};

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

    const handler = CARD_EFFECTS[card.subType];
    if (!handler) {
        await log(`⚠️ 未知卡牌效果：${card.subType}`, "warn");
        return;
    }

    if (card.type === "attack") {
        let ignisBonus = 0;
        if (S.hero.trait === "ignis" && Math.random() < 0.40) {
            ignisBonus = 5;
            await log(`${prefix}🔥 <b>【烈焰血脈】</b>追加 5 點傷害！`, "crit");
        }
        const atk = (base) => applyPlayerAttackModifiers(base + ignisBonus);
        await handler.effect(card, prefix, atk);
    } else {
        await handler.effect(card, prefix);
    }
}