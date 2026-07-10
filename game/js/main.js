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
  playHitSound();

  // 타격 흔들림 애니메이션
  frame.classList.add('smash-hit');
  setTimeout(() => frame.classList.remove('smash-hit'), 280);

  // 파편 파티클 생성
  const rect = frame.getBoundingClientRect();
  for (let i = 0; i < 10; i++) {
    spawnFragment(
      rect.left + Math.random() * rect.width,
      rect.top  + Math.random() * rect.height
    );
  }
}

function spawnFragment(x, y) {
  const colors = ['#B8BDC4', '#8A8D91', '#4a9eff', '#FFB020', '#FF6040'];
  const frag = document.createElement('div');
  frag.className = 'fragment';
  frag.style.cssText = [
    'left:'       + x + 'px',
    'top:'        + y + 'px',
    'background:' + colors[Math.floor(Math.random() * colors.length)],
  ].join(';');

  const angle = Math.random() * Math.PI * 2;
  const dist  = 60 + Math.random() * 90;
  frag.style.setProperty('--fx', (Math.cos(angle) * dist).toFixed(1) + 'px');
  frag.style.setProperty('--fy', (Math.sin(angle) * dist).toFixed(1) + 'px');
  frag.style.setProperty('--fr', (Math.random() * 720 - 360).toFixed(0) + 'deg');

  document.body.appendChild(frag);
  setTimeout(() => frag.remove(), 750);
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
