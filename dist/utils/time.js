"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowMs = nowMs;
exports.secondsToMs = secondsToMs;
exports.yyyymmddToIso = yyyymmddToIso;
// src/utils/time.ts
function nowMs() {
    return Date.now();
}
function secondsToMs(sec) {
    return sec * 1000;
}
function yyyymmddToIso(date) {
    if (!date || date.length !== 8)
        return undefined;
    const yyyy = date.slice(0, 4);
    const mm = date.slice(4, 6);
    const dd = date.slice(6, 8);
    return `${yyyy}-${mm}-${dd}`;
}
//# sourceMappingURL=time.js.map