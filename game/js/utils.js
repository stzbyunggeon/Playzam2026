'use strict';

/* ── DOM 단축 ── */
function $(id) { return document.getElementById(id); }

/* ── 층 번호 → 표시 문자열 ── */
function floorText(f) {
  if (f === -2) return 'B2';
  if (f === -1) return 'B1';
  return f + 'F';
}

/**
 * 층 표시를 fromFloor → toFloor 순서로 숫자를 바꿔가며 애니메이션
 * onDone: 마지막 층 도달 후 intervalMs 대기 후 호출
 */
function animateFloor(elevId, fromFloor, toFloor, intervalMs, onDone) {
  const dir = fromFloor < toFloor ? 1 : -1;
  let cur = fromFloor;
  const el = $('disp-' + elevId + '-text');

  function step() {
    cur += dir;
    el.textContent = floorText(cur);
    // CSS 플리커 애니메이션 재시작
    el.classList.remove('updating');
    void el.offsetWidth;
    el.classList.add('updating');

    if (cur === toFloor) {
      if (onDone) setTimeout(onDone, intervalMs);
    } else {
      setTimeout(step, intervalMs);
    }
  }
  setTimeout(step, intervalMs);
}

/**
 * 층 표시를 지정 횟수만큼 깜빡여 "이동 시도" 연출
 */
function flickerFloor(elevId, flickers, onDone) {
  const el = $('disp-' + elevId + '-text');
  let i = 0;
  const iv = setInterval(() => {
    el.style.opacity = (i % 2 === 0) ? '0.08' : '1';
    if (++i >= flickers * 2) {
      clearInterval(iv);
      el.style.opacity = '1';
      if (onDone) onDone();
    }
  }, 140);
}

/* ── Web Audio API ── */
let _audioCtx = null;
function audioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

/** 단순 비프음 */
function playBeep() {
  try {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

/** 엘베 타격음 (노이즈 버스트) */
function playHitSound() {
  try {
    const ctx = audioCtx();
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 0.22);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8) * 0.9;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 1;
    src.connect(g);
    g.connect(ctx.destination);
    src.start();
  } catch (e) {}
}
