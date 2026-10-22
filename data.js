const heroes = [
    { id: "ignis",  name: "火狂小狐", icon: "🦊", hp: 100, trait: "ignis", desc: "【烈焰血脈】打出攻擊型卡牌時，40% 機率額外造成 5 點傷害。" },
    { id: "turtlo", name: "堅甲龜",   icon: "🐢", hp: 100, trait: "turtlo", desc: "【堅甲防禦】受擊獲得 3 點護盾，所有護盾提升 10%；護盾 > 20 點時攻擊額外造成 [當前護盾 × 25%] 反震傷害。" },
    { id: "shadow", name: "影爪貓",   icon: "🐱", hp: 100, trait: "shadow", desc: "【劇毒爪痕】對魔王造成的中毒持續回合數額外增加 1 回合。" },
    { id: "thunder",name: "閃電鳥",   icon: "⚡", hp: 100, trait: "thunder", desc: "【雷霆麻痺】攻擊命中時，30% 機率使魔王跳過 1 次行動。" },
    { id: "copycat",name: "複製兔",   icon: "🐰", hp: 98, trait: "copycat", desc: "【鏡像戰術】每回合首次打出「需消耗行動」的特殊卡時，額外觸發一次效果（禁錮、盾擊除外）。" },
    { id: "raccoon",name: "預言浣熊", icon: "🦝", hp: 95, trait: "raccoon", desc: "【星象預兆】每回合額外抽 1 張牌（抽牌數 +1）。" },
    { id: "hedgehog",name: "機械刺蝟",icon: "🦔", hp: 102, trait: "hedgehog", desc: "【超頻核心】護盾達 15 點時溢出部分轉為永久攻擊力（每 2 點轉 +1 點，上限 +12 點）；達上限後護盾可繼續突破 15 點累積。" }
];

const bossTypes = [
    { id: "standard", name: "深淵霸主", icon: "👹", hp: 120, trait: "standard", traitName: "深淵咆哮（每 3 回合）", desc: "每 3 回合釋放【深淵咆哮】，造成 20 點傷害並施加壓制（下回合抽牌減少 2 張）。" },
    { id: "undying", name: "巴洛克", icon: "☠️", hp: 100, trait: "undying", traitName: "不滅死魂（死亡復活）", desc: "首次被擊殺時原地復活，恢復 35 點生命並進入永久狂暴（攻擊 +8 點，不可疊加）。" },
    { id: "evasion", name: "影魔", icon: "🥷", hp: 112, trait: "evasion", traitName: "鬼魅閃避（27% 機率）", desc: "被動擁有 27% 閃避率，完全躲開玩家的攻擊。" },
    { id: "vampire", name: "德古拉", icon: "🧛", hp: 110, trait: "vampire", traitName: "嗜血吸取（穿透 30%）", desc: "造成穿透傷害時，吸取該傷害 30% 的生命值。" },
    { id: "guardian", name: "鋼鐵要塞", icon: "🏰", hp: 120, trait: "guardian", traitName: "鋼鐵反震（破盾 12 真傷）", desc: "護盾被擊破時對玩家造成 12 點真實傷害（無視護盾，冷卻 2 回合）。" },
    { id: "elementalist", name: "元素巫師", icon: "🧙‍♂️", hp: 115, trait: "elementalist", traitName: "元素輪轉（每 2 回合）", desc: "每 2 回合切換形態：🔥烈焰（攻擊+30%）/ 🧊寒冰（受傷-30%）/ ⚡迅雷（閃避率 20%）。" },
    { id: "time_phantom", name: "時空幻影", icon: "⏳", hp: 120, trait: "time_phantom", traitName: "熵增回溯（殘血觸發）", desc: "生命首次低於 30% 時（若未被一擊擊殺），強制回升至 40%，並清空雙方所有的護盾、臨時 Buff、Debuff 與定時炸彈。" }
];

const battlefieldModifiers = [
    { name: "✨ 雙倍協奏", desc: "雙方每回合 2 次行動", effect: "double_action" },
    { name: "🔥 狂暴磁場", desc: "傷害 +20%，每回合雙方扣除 4 點生命（無視護盾）", effect: "berserk" },
    { name: "💧 治療枯竭", desc: "所有回復效果減少 40%", effect: "weak_heal" },
    { name: "🛡️ 鐵壁防線", desc: "雙方開局獲得 20 點護盾", effect: "iron_wall" },
    { name: "🌫️ 迷霧選擇", desc: "每回合僅抽 2 張牌", effect: "fog_choice" },
    { name: "🌵 荊棘之地", desc: "每次受攻擊，攻擊方反傷 3 點（無視護盾）", effect: "thorns" },
    { name: "🪦 獻祭祭壇", desc: "玩家生命上限減少 10 點、魔王生命上限減少 15 點", effect: "sacrifice_altar" }
];

const commonCards = [
    { id: 1, name: "烈焰彈", type: "attack", subType: "normal", category: "攻擊", rarity: "common", value: 18, desc: "造成 18 點傷害。" },
    { id: 2, name: "嗜血突擊", type: "attack", subType: "lifesteal", category: "攻擊", rarity: "common", value: 14, desc: "造成 14 點傷害，並回復 7 點生命。" },
    { id: 3, name: "暴擊雷電", type: "attack", subType: "crit", category: "攻擊", rarity: "common", value: 25, desc: "40% 機率造成 25 點傷害，否則造成 12 點傷害。" },
    { id: 4, name: "劇毒飛刀", type: "attack", subType: "poison", category: "攻擊", rarity: "common", value: 10, desc: "造成 10 點傷害，使魔王中毒 3 回合（每回合無視護盾扣除 6 點生命）。[不可疊加]" },
    { id: 12, name: "冰霜連擊", type: "attack", subType: "frost", category: "攻擊", rarity: "common", value: 12, desc: "造成 12 點傷害，使魔王攻擊傷害減少 40%（持續 1 回合）。[不可疊加]" },
    { id: 13, name: "破甲重擊", type: "attack", subType: "pierce", category: "攻擊", rarity: "common", value: 15, desc: "造成 15 點穿透傷害（無視魔王護盾）。" },
    { id: 26, name: "碎盾擊", type: "attack", subType: "shield_break", category: "攻擊", rarity: "common", value: 8, desc: "打碎魔王全部護盾；若魔王無護盾則造成 8 點傷害。" },
    { id: 27, name: "定時引爆", type: "attack", subType: "delayed_bomb", category: "攻擊", rarity: "rare", value: 10, desc: "造成 10 點傷害，並施加【定時炸彈】（2 回合後爆發造成 28 點穿透傷害）。" },
    
    { id: 5, name: "瞬間回復", type: "heal", subType: "burst", category: "回復", rarity: "common", value: 20, desc: "回復 20 點生命。" },
    { id: 6, name: "聖光護盾", type: "heal", subType: "shield", category: "回復", rarity: "common", value: 10, shieldVal: 12, desc: "回復 10 點生命，並獲得 12 點護盾。" },
    { id: 10, name: "自然泉源", type: "heal", subType: "regen", category: "回復", rarity: "common", value: 0, desc: "獲得 3 回合【泉源祝福】：每回合回復 6 點生命，且期間受到的傷害減少 3 點。[不可疊加]" },

    { id: 7, name: "血之狂熱", type: "special", subType: "sacrifice", category: "特殊", rarity: "rare", costHP: 10, buffVal: 15, desc: "扣除 10 點生命，下次攻擊傷害 +15 點。" },
    { id: 21, name: "堅壁清野", type: "heal", subType: "low_hp_shield", category: "回復", rarity: "rare", value: 12, desc: "獲得 12 點護盾；若自身生命低於 50%，改為獲得 20 點護盾。" },
    { id: 20, name: "逆轉治癒", type: "heal", subType: "reverse_heal", category: "回復", rarity: "rare", desc: "回復「已損失生命值 × 0.4」點生命（上限 25 點）。" },
    { id: 17, name: "破釜沉舟", type: "attack", subType: "desperate", category: "攻擊", rarity: "rare", desc: "造成「已損失生命值 × 0.4」點傷害（上限 40 點）。" },
    { id: 18, name: "魔能侵蝕", type: "attack", subType: "erosion", category: "攻擊", rarity: "rare", value: 12, desc: "造成 12 點傷害；魔王每有 1 個異常狀態，額外 +6 點傷害（上限 +18 點）。" },
    { id: 14, name: "命運之輪", type: "special", subType: "roulette", category: "特殊", rarity: "rare", desc: "隨機三選一：① 回復 18 點生命且生命上限 +10 點（上限 +50）；② 獲得 18 點護盾；③ 造成 22 點穿透傷害。" },
    { id: 9, name: "反彈護鏡", type: "special", subType: "reflect", category: "特殊", rarity: "rare", desc: "獲得 10 點護盾，下回合被魔王攻擊時反彈 50% 傷害給魔王。[不可疊加]" },
    { id: 16, name: "盾擊破敵", type: "special", subType: "shield_bash", category: "特殊", rarity: "rare", desc: "消耗全部護盾，每 1 點護盾造成 1.5 點傷害。[不可複製]" },
    { id: 22, name: "偷天換日", type: "special", subType: "steal_shield", category: "特殊", rarity: "rare", desc: "偷取魔王 50% 護盾；若魔王無護盾，改為造成 12 點穿透傷害。" },
    { id: 23, name: "弱點標記", type: "special", subType: "mark", category: "特殊", rarity: "rare", desc: "標記魔王 3 回合，期間魔王受到的玩家攻擊傷害 +25%。[不可疊加]" },
    { id: 25, name: "時光沙漏", type: "special", subType: "time_hourglass", category: "特殊", rarity: "rare", desc: "下回合起始行動數 +1。[不可疊加]" },
    { id: 28, name: "深層沉思", type: "special", subType: "deep_meditation", category: "特殊", rarity: "rare", freeAction: true, desc: "【不扣行動】抽 1 張牌，下次攻擊傷害 +8 點。" },
    { id: 29, name: "死者甦生", type: "special", subType: "resurrection", category: "特殊", rarity: "rare", freeAction: true, desc: "【不扣行動】隨機將棄牌堆 1 張卡牌抓回手牌，並回復 10 點生命。[不可複製]" },

    { id: 11, name: "捨身一擊", type: "attack", subType: "recoil", category: "攻擊", rarity: "legendary", value: 28, selfCost: 7, desc: "扣除 7 點生命，造成 28 點傷害。" },
    { id: 15, name: "元素引爆", type: "attack", subType: "detonate", category: "攻擊", rarity: "legendary", value: 10, desc: "造成 10 點傷害；若魔王有中毒或冰霜虛弱，額外 +22 點傷害並清除該狀態。" },
    { id: 24, name: "黑暗契約", type: "special", subType: "dark_contract", category: "特殊", rarity: "legendary", desc: "扣除 10 點生命，本局永久 +8 點攻擊（上限 +16 點）。" },
    { id: 19, name: "致命一擊", type: "attack", subType: "finisher", category: "攻擊", rarity: "legendary", value: 10, desc: "造成 10 點傷害；若魔王生命低於 30%，改為造成 30 點穿透傷害。" },
    { id: 30, name: "萬象天引", type: "attack", subType: "universal_pull", category: "攻擊", rarity: "legendary", value: 16, desc: "造成 16 點傷害；本局戰鬥中每使用過 1 張特殊卡，傷害額外 +4 點（上限 +20 點）。" },
    { id: 8, name: "禁錮咒語", type: "special", subType: "skip", category: "特殊", rarity: "legendary", desc: "跳過魔王 1 次行動，並【封印特質】2 回合。[不可複製]" }
];

const heroCards = [
    { id: "ignis_1", heroId: "ignis", name: "燃血狂怒", type: "attack", subType: "ignis_rage", category: "攻擊", rarity: "rare", desc: "扣除 8 點生命，造成 20 點傷害；自身生命低於 50% 時改為造成 30 點傷害。" },
    { id: "ignis_2", heroId: "ignis", name: "鳳凰之心", type: "heal", subType: "ignis_phoenix", category: "回復", rarity: "rare", desc: "回復 15 點生命；自身生命低於 30% 時改為回復 30 點生命。" },
    { id: "ignis_3", heroId: "ignis", name: "絕境焚身", type: "attack", subType: "ignis_last", category: "攻擊", rarity: "legendary", desc: "扣除 10 點生命，造成 25 點穿透傷害。" },

    { id: "turtlo_1", heroId: "turtlo", name: "反震裝甲", type: "heal", subType: "turtlo_counter", category: "回復", rarity: "rare", desc: "獲得 15 點護盾，本回合被攻擊時反彈 50% 傷害給魔王。[不可疊加]" },
    { id: "turtlo_2", heroId: "turtlo", name: "銅牆鐵壁", type: "heal", subType: "turtlo_wall", category: "回復", rarity: "rare", desc: "獲得 20 點護盾，且下次攻擊傷害 +8 點。" },
    { id: "turtlo_3", heroId: "turtlo", name: "不動如山", type: "special", subType: "turtlo_stand", category: "特殊", rarity: "legendary", desc: "獲得 15 點護盾，本回合受到的所有傷害減少 5 點。[不可疊加]" },

    { id: "shadow_1", heroId: "shadow", name: "猛毒蔓延", type: "attack", subType: "shadow_poison", category: "攻擊", rarity: "rare", value: 6, desc: "造成 6 點傷害，使魔王中毒 3 回合（每回合無視護盾扣除 6 點生命）。[不可疊加]" },
    { id: "shadow_2", heroId: "shadow", name: "毒爆", type: "attack", subType: "shadow_burst", category: "攻擊", rarity: "rare", desc: "引爆魔王的中毒：每層中毒造成 6 點傷害並清除該中毒狀態。" },
    { id: "shadow_3", heroId: "shadow", name: "致命毒霧", type: "attack", subType: "shadow_dead", category: "攻擊", rarity: "legendary", value: 4, desc: "造成 4 點穿透傷害，使魔王中毒 5 回合（每回合無視護盾扣除 6 點生命）。[不可疊加]" },

    { id: "thunder_1", heroId: "thunder", name: "迅雷麻痺", type: "attack", subType: "thunder_strike", category: "攻擊", rarity: "rare", value: 12, desc: "造成 12 點傷害，35% 機率使魔王跳過 1 次行動。" },
    { id: "thunder_2", heroId: "thunder", name: "電光石火", type: "special", subType: "thunder_double", category: "特殊", rarity: "rare", freeAction: true, desc: "【不扣行動】下次攻擊傷害 ×2。[不可疊加]" },
    { id: "thunder_3", heroId: "thunder", name: "雷霆萬鈞", type: "attack", subType: "thunder_thunder", category: "攻擊", rarity: "legendary", value: 15, desc: "造成 15 點傷害；若魔王處於麻痺狀態則改為造成 35 點傷害。" },

    { id: "copycat_1", heroId: "copycat", name: "快速施法", type: "special", subType: "copycat_draw", category: "特殊", rarity: "rare", freeAction: true, desc: "【不扣行動】抽 1 張牌。" },
    { id: "copycat_2", heroId: "copycat", name: "魔法增幅", type: "special", subType: "copycat_boost", category: "特殊", rarity: "rare", freeAction: true, desc: "【不扣行動】接下來 2 次攻擊傷害 +10 點。[不可疊加]" },
    { id: "copycat_3", heroId: "copycat", name: "無限迴響", type: "special", subType: "copycat_echo", category: "特殊", rarity: "legendary", freeAction: true, desc: "【不扣行動】隨機獲得 1 張通用卡加入手牌。" },

    { id: "raccoon_1", heroId: "raccoon", name: "預言星圖", type: "special", subType: "raccoon_search", category: "特殊", rarity: "rare", freeAction: true, desc: "【不扣行動】檢索 1 張攻擊卡加入手牌，且下次攻擊傷害 +5 點。" },
    { id: "raccoon_2", heroId: "raccoon", name: "閃光彈", type: "attack", subType: "raccoon_flash", category: "攻擊", rarity: "rare", value: 14, desc: "造成 14 點傷害；若本回合打出過「特殊卡」，改為造成 24 點傷害。" },
    { id: "raccoon_3", heroId: "raccoon", name: "星象護符", type: "heal", subType: "raccoon_amulet", category: "回復", rarity: "legendary", desc: "回復 14 點生命，並獲得 10 點護盾。" },

    { id: "hedgehog_1", heroId: "hedgehog", name: "蒸氣噴射", type: "heal", subType: "hedgehog_steam", category: "回復", rarity: "rare", freeAction: true, desc: "【不扣行動】獲得 15 點護盾；若當前護盾值 ≥ 15 點，額外獲得 1 次行動。[每回合限一次]" },
    { id: "hedgehog_2", heroId: "hedgehog", name: "刺針射擊", type: "attack", subType: "hedgehog_needle", category: "攻擊", rarity: "rare", value: 16, desc: "造成 16 點傷害；消耗全部護盾，每 1 點護盾額外 +1 點傷害（額外傷害上限 +30 點）。" },
    { id: "hedgehog_3", heroId: "hedgehog", name: "鋼鐵刺裝", type: "special", subType: "hedgehog_armor", category: "特殊", rarity: "legendary", freeAction: true, desc: "【不扣行動】獲得 22 點護盾，且本回合下次攻擊傷害 +10 點。[不可疊加]" }
];

const cardPool = [...commonCards, ...heroCards];
const cardById = {};
cardPool.forEach(c => cardById[String(c.id)] = c);

const defaultDecks = {
    ignis:  ["ignis_1","ignis_2","ignis_3", 1,7,11,17,24,30,2,5,13,23,14,25],
    turtlo: ["turtlo_1","turtlo_2","turtlo_3", 6,21,9,16,22,26,5,10,13,23,14,25],
    shadow: ["shadow_1","shadow_2","shadow_3", 4,15,27,18,1,12,5,10,13,23,14,25],
    thunder:["thunder_1","thunder_2","thunder_3", 3,12,8,23,13,1,5,6,16,25,22,14],
    copycat:["copycat_1","copycat_2","copycat_3", 28,29,7,24,23,14,9,22,15,1,5,25],
    raccoon:["raccoon_1","raccoon_2","raccoon_3", 27,30,23,1,3,13,5,6,14,25,12,7], 
    hedgehog:["hedgehog_1","hedgehog_2","hedgehog_3", 6,21,16,22,9,26,5,10,1,13,23,14]
};

const rarityLimit = { common: 2, rare: 1, legendary: 1 };

const TUTORIAL_STEPS = [
    { intro: `歡迎來到萌寵冒險！你的英雄是 <b>影爪貓</b>。<br>【劇毒爪痕】能讓魔王的中毒回合數 +1。請點擊打出高亮的 <b>【劇毒飛刀】</b>，讓魔王中毒 4 回合！`,
      cards: ["poison", "normal", "crit"], acceptable: ["poison"], highlight: ["poison"] },
    { intro: `中毒每回合會無視護盾扣除 6 點生命！<br>接下來試試高風險高回報的卡：請打出 <b>【捨身一擊】</b>（扣除 7 點生命，造成 28 × 狂暴磁場 1.2 = 34 點傷害）！`,
      cards: ["recoil", "pierce", "frost"], acceptable: ["recoil"], highlight: ["recoil"] },
    { intro: `⚠️ 第 3 回合！深淵霸主將釋放 <b>【深淵咆哮】</b>（造成 20 點傷害並使你下回合抽牌數 -2）。<br>請打出 <b>【禁錮咒語】</b>，跳過魔王 1 次行動，並封印他的咆哮特質 2 回合！`,
      cards: ["skip", "burst", "shield"], acceptable: ["skip"], highlight: ["skip"] },
    { intro: `禁錮封印成功！接下來，你可以點擊上方「魔王」區塊的 <b>ⓘ</b> 隨時查看他的詳細資訊。<br>請打出 <b>【弱點標記】</b>，讓魔王受到的傷害增加 25%（持續 3 回合）！`,
      cards: ["mark", "normal", "crit"], acceptable: ["mark"], highlight: ["mark"] },
    { intro: `弱點標記生效！請再次打出 <b>【捨身一擊】</b>，這次傷害會因為弱點標記，從 34 點變成 <b>43 點</b>！`,
      cards: ["recoil", "pierce", "frost"], acceptable: ["recoil"], highlight: ["recoil"] },
    { intro: `魔王生命低於 30% 了！使用 <b>【致命一擊】</b> 觸發斬殺，造成 30 × 1.2 × 1.25 = <b>45 點穿透傷害</b>（無視護盾）！`,
      cards: ["finisher", "desperate", "normal"], acceptable: ["finisher"], highlight: ["finisher"] }
];
