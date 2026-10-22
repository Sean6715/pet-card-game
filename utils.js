// ============================================================
// utils.js — 全域狀態、常數、工具函式
// 必須最先載入（提供 S、$、log、sleep 等）
// ============================================================

// ===== 全域狀態 =====
let S = null;
let isBatching = false;
let batchedLogHTML = "";
let deckManagerState = { heroId: "ignis", mode: "preset", commons: [] };
let tooltipEl = null;
let tooltipTimeout = null;

// ===== DOM 與非同步工具 =====
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ===== 魔法字串常數 =====
const EFFECT = {
    BERSERK: "berserk", DOUBLE_ACTION: "double_action", WEAK_HEAL: "weak_heal",
    IRON_WALL: "iron_wall", FOG: "fog_choice", THORNS: "thorns", SACRIFICE: "sacrifice_altar"
};
const TRAIT = {
    STANDARD: "standard", UNDYING: "undying", EVASION: "evasion", VAMPIRE: "vampire",
    GUARDIAN: "guardian", ELEMENTALIST: "elementalist", TIME_PHANTOM: "time_phantom"
};
const DIFF = { EASY: "easy", NORMAL: "normal", HARD: "hard" };

// ===== Storage 讀取 =====
function readStorage(key, fallback) {
    try {
        const v = JSON.parse(localStorage.getItem(key));
        return (v && typeof v === "object") ? v : fallback;
    } catch { return fallback; }
}

// ===== 設定 =====
const SETTINGS_KEY = "petAdventureGameSettings_v3";
const DEFAULT_SETTINGS = { sfx: false, vibration: false, vfx: false };
function loadSettings() { return { ...DEFAULT_SETTINGS, ...readStorage(SETTINGS_KEY, {}) }; }
function saveSettings(cfg) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg)); }

// ===== 音效 / 震動 / 特效 =====
function playSfx(type) {
    const st = loadSettings();
    if (!st.sfx) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        const presets = {
            attack: { type: 'sawtooth', f0: 160, f1: 40, dur: 0.15, vol: 0.25 },
            heal:   { type: 'sine',     f0: 300, f1: 600, dur: 0.2, vol: 0.2 },
            shield: { type: 'triangle', f0: 220, f1: 380, dur: 0.15, vol: 0.25 },
            crit:   { type: 'square',   f0: 400, f1: 850, dur: 0.25, vol: 0.3 }
        };
        const p = presets[type];
        if (!p) return;
        osc.type = p.type;
        osc.frequency.setValueAtTime(p.f0, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(p.f1, ctx.currentTime + p.dur);
        gain.gain.setValueAtTime(p.vol, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + p.dur);
        osc.start(); osc.stop(ctx.currentTime + p.dur);
    } catch (e) {}
}

function triggerVib(pattern = 40) {
    if (!loadSettings().vibration) return;
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
}

function triggerShake() {
    if (!loadSettings().vfx) return;
    const c = document.querySelector('.container');
    if (c) { c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 300); }
}

// ===== 日誌 =====
function formatLogHTML(html, type) {
    if (type === "player-turn" || type === "monster-turn")
        return `<div class="log-${type}">${html}</div>`;
    return `<div class="log-line log-${type}">${html}</div>`;
}
async function log(html, type = "info") {
    if (isBatching) { batchedLogHTML += formatLogHTML(html, type); return; }
    const box = $("log-box");
    box.innerHTML += formatLogHTML(html, type);
    box.scrollTop = box.scrollHeight;
}
function flushLogBatch() {
    if (!batchedLogHTML) return;
    const box = $("log-box");
    box.innerHTML += batchedLogHTML;
    box.scrollTop = box.scrollHeight;
    batchedLogHTML = "";
}

// ===== 通用 =====
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
function toggleModal(id) {
    const m = $(id);
    m.style.display = m.style.display === "flex" ? "none" : "flex";
    if (m.style.display === "none") hideTooltip();
}
function closeModal(id) { $(id).style.display = "none"; }