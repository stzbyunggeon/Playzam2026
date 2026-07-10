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
 * withSound: true 이면 onDone이 null이어도 이동음 재생 (기본값: !!onDone)
 */
function animateFloor(elevId, fromFloor, toFloor, intervalMs, onDone, withSound) {
  const playSound = withSound !== undefined ? withSound : !!onDone;
  if (playSound) startElevSound();
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
      if (playSound) stopElevSound();
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
    g.gain.value = 0.5;
    src.connect(g);
    g.connect(ctx.destination);
    src.start();
  } catch (e) {}
}

/** 엘베 호출 버튼 - 띵! (맑은 벨) */
function playCallSound() {
  try {
    const ctx = audioCtx();
    const t   = ctx.currentTime;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 1318; // E6
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.38, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    osc.start(t);
    osc.stop(t + 0.7);
  } catch (e) {}
}

/** 엘베 문 열림 - 동딩~! (두 음 차임) */
function playDoorOpenSound() {
  try {
    const ctx = audioCtx();
    [[784, 0], [1047, 0.27]].forEach(([freq, delay]) => {
      const t    = ctx.currentTime + delay;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.30, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch (e) {}
}

/** 엘베 이동 중 - 우우웅 (저음 허밍 + 노이즈 롤) */
let _moveOscNodes = null;
let _moveGainNode = null;

function startElevSound() {
  try {
    stopElevSound();
    const ctx = audioCtx();
    const t   = ctx.currentTime;

    // 저음 오실레이터 (기계 허밍)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 88;

    // 저음 노이즈 (롤링 질감)
    const sr     = ctx.sampleRate;
    const bufLen = Math.floor(sr * 0.5);
    const nbuf   = ctx.createBuffer(1, bufLen, sr);
    const nd     = nbuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;
    const nsrc = ctx.createBufferSource();
    nsrc.buffer = nbuf;
    nsrc.loop   = true;

    // LPF로 노이즈 저음만 통과
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 160;
    lpf.Q.value = 1.2;

    // 마스터 게인 (페이드 인)
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.11, t + 0.35);

    osc.connect(master);
    nsrc.connect(lpf);
    lpf.connect(master);
    master.connect(ctx.destination);

    osc.start(t);
    nsrc.start(t);

    _moveOscNodes = [osc, nsrc];
    _moveGainNode = master;
  } catch (e) {}
}

function stopElevSound() {
  try {
    if (_moveGainNode) {
      const ctx   = audioCtx();
      const g     = _moveGainNode;
      const nodes = _moveOscNodes;
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 320);
      _moveOscNodes = null;
      _moveGainNode = null;
    }
  } catch (e) {}
}

/** 엘베 파괴 - 쾅! (임팩트 노이즈 + 저주파 붐) */
function playDestroySound() {
  try {
    const ctx = audioCtx();
    const t   = ctx.currentTime;
    const sr  = ctx.sampleRate;

    // 임팩트 노이즈
    const len = Math.floor(sr * 0.55);
    const buf = ctx.createBuffer(1, len, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 0.9);
    }
    const nsrc = ctx.createBufferSource();
    nsrc.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.value = 0.65;
    nsrc.connect(ng);
    ng.connect(ctx.destination);
    nsrc.start(t);

    // 저주파 붐 (피치 하강)
    const osc = ctx.createOscillator();
    osc.type  = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(18, t + 0.5);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.45, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  } catch (e) {}
}
