'use strict';

/* ══════════════════════════════════════════════════
   버튼 긴급도 시스템
══════════════════════════════════════════════════ */
let waitStartTime  = null;
let urgencyTimer   = null;
let beepTimer      = null;

/** 대기 시작: 버튼 강조 + 화살표 표시 */
function startWaiting() {
  waitStartTime = performance.now();

  const btn     = $('call-btn');
  const btnArea = $('btn-area');
  const game    = $('game');

  btn.className = 'pulse-1';
  btnArea.classList.add('ready');
  btnArea.classList.remove('ready-2', 'ready-3', 'ready-4');
  $('urgent-msg').classList.add('hidden');
  game.classList.remove('shake-mild', 'shake-strong');

  urgencyTimer = setInterval(checkUrgency, 400);
}

/** 대기 종료: 모든 강조 해제 */
function stopWaiting() {
  clearInterval(urgencyTimer);
  clearInterval(beepTimer);
  urgencyTimer = null;
  beepTimer    = null;
  waitStartTime = null;

  $('call-btn').className = 'idle';
  const btnArea = $('btn-area');
  btnArea.classList.remove('ready', 'ready-2', 'ready-3', 'ready-4');
  $('urgent-msg').classList.add('hidden');
  $('game').classList.remove('shake-mild', 'shake-strong');
}

/** 경과 시간에 따라 강조 단계 갱신 (400ms마다 호출) */
function checkUrgency() {
  if (!waitStartTime) return;
  const elapsed = (performance.now() - waitStartTime) / 1000;
  const btn     = $('call-btn');
  const btnArea = $('btn-area');
  const game    = $('game');

  // 강조 클래스 리셋
  btn.className = '';
  btnArea.classList.remove('ready-2', 'ready-3', 'ready-4');
  game.classList.remove('shake-mild', 'shake-strong');
  btnArea.classList.add('ready');

  if (elapsed < 2) {
    // 1단계: 은은한 펄스
    btn.classList.add('pulse-1');
    $('urgent-msg').classList.add('hidden');
  } else if (elapsed < 4) {
    // 2단계: 빠른 펄스 + 글로우
    btn.classList.add('pulse-2');
    btnArea.classList.add('ready-2');
    $('urgent-msg').classList.add('hidden');
  } else if (elapsed < 6) {
    // 3단계: 버튼 커짐 + 화면 흔들림 + 문구 등장
    btn.classList.add('pulse-3');
    btnArea.classList.add('ready-3');
    $('urgent-msg').classList.remove('hidden');
    game.classList.add('shake-mild');
  } else {
    // 4단계: 최대 강조 + 비프음
    btn.classList.add('pulse-4');
    btnArea.classList.add('ready-4');
    $('urgent-msg').classList.remove('hidden');
    game.classList.add('shake-strong');
    if (!beepTimer) {
      beepTimer = setInterval(playBeep, 1100);
    }
  }
}

/* ══════════════════════════════════════════════════
   호출 버튼 클릭
══════════════════════════════════════════════════ */
function onCallBtnClick() {
  if (state.phase !== 'waiting_click') return;
  playEvent(state.eventIndex);
}

/* ══════════════════════════════════════════════════
   SMASH 모드 — 엘베 클릭 파괴
══════════════════════════════════════════════════ */
const smashCounts    = { a: 0, b: 0, c: 0 };
const smokeIntervals = {};
let   destroyedCount = 0;
const SMASH_DESTROY  = 5;   // 이 횟수 이상 타격 시 파괴

function setupSmashClicks() {
  ['a', 'b', 'c'].forEach(id => {
    const frame = $('frame-' + id);
    frame.addEventListener('click', () => {
      if (state.phase !== 'smash') return;
      smashElevator(id, frame);
    });
  });
}

function smashElevator(id, frame) {
  if (frame.classList.contains('smashed')) return;  // 이미 파괴됨

  playHitSound();

  // 타격 흔들림
  frame.classList.add('smash-hit');
  setTimeout(() => frame.classList.remove('smash-hit'), 280);

  // 파편 생성
  const rect  = frame.getBoundingClientRect();
  const count = 16 + Math.floor(Math.random() * 8);
  for (let i = 0; i < count; i++) {
    spawnFragment(
      rect.left + Math.random() * rect.width,
      rect.top  + Math.random() * rect.height,
      false
    );
  }

  // 파괴 임계값 체크
  smashCounts[id]++;
  if (smashCounts[id] >= SMASH_DESTROY) {
    destroyElevator(id, frame);
  }
}

function destroyElevator(id, frame) {
  frame.classList.add('smashed');

  // 폭발 파편 (대량)
  const rect = frame.getBoundingClientRect();
  for (let i = 0; i < 32; i++) {
    setTimeout(() => {
      spawnFragment(
        rect.left + Math.random() * rect.width,
        rect.top  + Math.random() * rect.height,
        true
      );
    }, Math.random() * 320);
  }

  // 연기 방출
  const cx = rect.left + rect.width  * 0.5;
  const cy = rect.top  + rect.height * 0.42;
  smokeIntervals[id] = setInterval(() => {
    spawnSmoke(
      cx + (Math.random() - 0.5) * rect.width  * 0.55,
      cy + (Math.random() - 0.5) * rect.height * 0.28
    );
  }, 250);

  destroyedCount++;
  if (destroyedCount >= 3) {
    setTimeout(triggerGameOver, 2200);
  }
}

function spawnFragment(x, y, big) {
  const colors = ['#C0C4C8', '#9A9DA1', '#D4D7DA', '#FFB020', '#FF5030', '#FF2020', '#FFC040'];
  const frag   = document.createElement('div');
  frag.className = 'fragment';

  const w   = big ? (12 + Math.random() * 22) : (5 + Math.random() * 12);
  const h   = w * (0.22 + Math.random() * 0.88);
  const dur = 0.50 + Math.random() * 0.45;

  frag.style.left         = x + 'px';
  frag.style.top          = y + 'px';
  frag.style.width        = w.toFixed(0) + 'px';
  frag.style.height       = h.toFixed(0) + 'px';
  frag.style.borderRadius = (Math.random() < 0.35 ? '50%' : '2px');
  frag.style.background   = colors[Math.floor(Math.random() * colors.length)];
  frag.style.animationDuration = dur + 's';

  const angle = Math.random() * Math.PI * 2;
  const dist  = big ? (110 + Math.random() * 200) : (70 + Math.random() * 130);
  frag.style.setProperty('--fx', (Math.cos(angle) * dist).toFixed(1) + 'px');
  frag.style.setProperty('--fy', (Math.sin(angle) * dist).toFixed(1) + 'px');
  frag.style.setProperty('--fr', (Math.random() * 900 - 450).toFixed(0) + 'deg');

  document.body.appendChild(frag);
  setTimeout(() => frag.remove(), (dur + 0.1) * 1000);
}

function spawnSmoke(x, y) {
  const el   = document.createElement('div');
  el.className = 'smoke-particle';
  const size = 16 + Math.random() * 22;
  el.style.left   = x + 'px';
  el.style.top    = y + 'px';
  el.style.width  = size + 'px';
  el.style.height = size + 'px';
  el.style.setProperty('--sx', (Math.random() * 44 - 22).toFixed(1) + 'px');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

function triggerGameOver() {
  state.phase = 'ended';
  // 연기 정지
  Object.keys(smokeIntervals).forEach(id => {
    clearInterval(smokeIntervals[id]);
    delete smokeIntervals[id];
  });

  const overlay    = $('end-screen');
  const restartBtn = $('restart-btn');
  const title      = $('end-title');

  title.textContent          = '계단으로 가자...';
  restartBtn.style.opacity       = '0';
  restartBtn.style.pointerEvents = 'none';

  overlay.classList.remove('hidden');
  void overlay.offsetWidth;        // reflow → transition 활성화
  overlay.classList.add('fade-in');

  // 재시작 버튼 3.8초 후 등장
  setTimeout(() => {
    restartBtn.style.transition    = 'opacity 0.7s ease';
    restartBtn.style.opacity       = '1';
    restartBtn.style.pointerEvents = '';
  }, 3800);
}

/* ══════════════════════════════════════════════════
   초기화
══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // 버튼 이벤트
  $('call-btn').addEventListener('click', onCallBtnClick);
  $('restart-btn').addEventListener('click', () => location.reload());

  // SMASH 클릭 등록 (smash 모드일 때만 동작)
  setupSmashClicks();

  // 게임 시작
  state.phase      = 'waiting_click';
  state.eventIndex = 0;
  state.rage       = 0;

  $('call-btn').className = 'idle';
  setStatus('엘레베이터를 부르세요');

  // 짧은 딜레이 후 대기 시작 (화면 로드 후 자연스럽게)
  setTimeout(startWaiting, 600);
});
