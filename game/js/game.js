'use strict';

/* ══════════════════════════════════════════════════
   게임 상태
══════════════════════════════════════════════════ */
const state = {
  phase: 'waiting_click', // 'event_playing' | 'smash' | 'ended'
  eventIndex: 0,
  rage: 0,
};

/* ══════════════════════════════════════════════════
   8개 고정 이벤트 (순서 절대 변경 금지)
══════════════════════════════════════════════════ */
const EVENTS = [
  /* 1. 지하2층 엘베가 잡힘 — 가장 먼 거리 +8 */
  {
    rageAdd: 8,
    play(onDone) {
      selectElev('a');
      setFloorDisplay('a', 'B2');
      setStatus('지하 2층 엘베가 응답했습니다... 가장 먼 곳이잖아요');
      animateFloor('a', -2, 10, 260, () => {
        setStatus('드디어 도착했습니다!');
        onDone();
      });
    }
  },

  /* 2. 도착했지만 만원 — +14 */
  {
    rageAdd: 14,
    play(onDone) {
      selectElev('a');
      setStatus('문이 열립니다...');
      setTimeout(() => {
        openDoor('a');
        setTimeout(() => {
          showBadge('a', 'full', '만원');
          setStatus('빈 자리가 없습니다!!');
          setTimeout(() => {
            closeDoor('a');
            hideBadge('a');
            setTimeout(onDone, 700);
          }, 1700);
        }, 650);
      }, 400);
    }
  },

  /* 3. 재호출 → 고장 — +10 */
  {
    rageAdd: 10,
    play(onDone) {
      selectElev('b');
      setStatus('엘베 B를 재호출 중...');
      setTimeout(() => {
        flickerFloor('b', 5, () => {
          showBadge('b', 'broken', '고장');
          setStatus('고장으로 운행이 취소됐습니다!');
          setTimeout(onDone, 1600);
        });
      }, 600);
    }
  },

  /* 4. 다른 엘베가 방향 바꿔 내려감 — +12 */
  {
    rageAdd: 12,
    play(onDone) {
      selectElev('c');
      setFloorDisplay('c', '1F');
      setStatus('엘베 C가 올라오고 있습니다...');
      animateFloor('c', 1, 6, 320, () => {
        setStatus('어?! 방향을 바꿔 내려가고 있습니다!');
        animateFloor('c', 6, 1, 280, () => {
          setTimeout(onDone, 600);
        });
      });
    }
  },

  /* 5. 문 열리려다 다시 닫힘 — +10 */
  {
    rageAdd: 10,
    play(onDone) {
      selectElev('a');
      setStatus('엘베 A가 다시 응답합니다...');
      setTimeout(() => {
        peekDoor('a');
        setStatus('문이 열리려는데...');
        setTimeout(() => {
          closeDoor('a');
          setStatus('반응할 틈도 없이 이미 닫혔습니다');
          setTimeout(onDone, 1000);
        }, 800);
      }, 600);
    }
  },

  /* 6. 옆 동료 새치기 — +14 */
  {
    rageAdd: 14,
    play(onDone) {
      selectElev('b');
      setStatus('엘베 B 문이 열립니다!');
      setTimeout(() => {
        openDoor('b');
        setTimeout(() => {
          showCoworker('b', () => {
            closeDoor('b');
            setStatus('옆 동료가 먼저 타고 문이 닫혔습니다!!');
            setTimeout(onDone, 1200);
          });
        }, 500);
      }, 400);
    }
  },

  /* 7. 점검중 — +12 */
  {
    rageAdd: 12,
    play(onDone) {
      selectElev('c');
      setFloorDisplay('c', '1F');
      setStatus('엘베 C가 다시 움직입니다...');
      animateFloor('c', 1, 5, 340, () => {
        showBadge('c', 'repair', '점검중');
        setStatus('점검 중으로 갑자기 멈춰버렸습니다');
        setTimeout(onDone, 1800);
      });
    }
  },

  /* 8. 도착 직전 다른 층 호출에 뺏김 → 분노 100 — +20 */
  {
    rageAdd: 20,
    play(onDone) {
      selectElev('a');
      setFloorDisplay('a', '3F');
      setStatus('엘베 A가 다시 올라오고 있어요... 이번엔 꼭!!');
      setTimeout(() => {
        animateFloor('a', 3, 9, 255, () => {
          setStatus('9층... 이번엔 진짜다!!!');
          setTimeout(() => {
            setStatus('다른 층 호출에 뺏겼습니다!!!');
            animateFloor('a', 9, 4, 230, () => {
              setTimeout(onDone, 600);
            });
          }, 950);
        });
      }, 500);
    }
  },
];

/* ══════════════════════════════════════════════════
   엘리베이터 DOM 헬퍼
══════════════════════════════════════════════════ */
function setFloorDisplay(elevId, text) {
  const el = $('disp-' + elevId + '-text');
  el.textContent = text;
}

function selectElev(id) {
  ['a', 'b', 'c'].forEach(e => {
    const unit = $('elev-' + e);
    unit.classList.toggle('selected', e === id);
    unit.classList.toggle('dimmed',   e !== id);
  });
}

function clearElevHighlights() {
  ['a', 'b', 'c'].forEach(e => {
    $('elev-' + e).classList.remove('selected', 'dimmed');
  });
}

function openDoor(id)  { $('frame-' + id).classList.add('door-open'); }
function closeDoor(id) { $('frame-' + id).classList.remove('door-open', 'door-peek'); }
function peekDoor(id)  { $('frame-' + id).classList.add('door-peek'); }

function showBadge(id, type, text) {
  const b = $('badge-' + id);
  b.textContent = text;
  b.className = 'door-badge type-' + type + ' shown';
}

function hideBadge(id) {
  const b = $('badge-' + id);
  b.textContent = '';
  b.className = 'door-badge hidden';
}

function showCoworker(id, onDone) {
  const el = $('coworker-' + id);
  el.classList.remove('hidden', 'enter');
  void el.offsetWidth;
  el.classList.add('enter');
  setTimeout(() => {
    el.classList.add('hidden');
    if (onDone) onDone();
  }, 600);
}

/* ══════════════════════════════════════════════════
   상태 텍스트
══════════════════════════════════════════════════ */
function setStatus(text) {
  $('status-text').textContent = text;
}

/* ══════════════════════════════════════════════════
   분노 게이지 업데이트 (카운트업 애니메이션)
══════════════════════════════════════════════════ */
function addRage(amount, onDone) {
  const from = state.rage;
  state.rage  = Math.min(100, state.rage + amount);
  animateRageBar(from, state.rage, onDone);
}

function animateRageBar(from, to, onDone) {
  const bar     = $('rage-bar');
  const valEl   = $('rage-value');
  const duration = 700;
  const startT  = performance.now();

  function tick(now) {
    const t    = Math.min(1, (now - startT) / duration);
    const ease = 1 - Math.pow(1 - t, 3);          // ease-out cubic
    const cur  = Math.round(from + (to - from) * ease);

    // 숫자 업데이트 (첫 번째 텍스트 노드만 교체)
    valEl.childNodes[0].nodeValue = cur;

    // 바 너비
    bar.style.width = cur + '%';

    // 색상 단계
    bar.classList.remove('lv1', 'lv2', 'lv3', 'lv4');
    if      (cur >= 90) bar.classList.add('lv4');
    else if (cur >= 60) bar.classList.add('lv3');
    else if (cur >= 30) bar.classList.add('lv2');
    else                bar.classList.add('lv1');

    // 90 이상: 게이지 바 흔들림
    if (cur >= 90) $('rage-track').classList.add('shake');

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      if (onDone) onDone();
    }
  }
  requestAnimationFrame(tick);
}

/* ══════════════════════════════════════════════════
   이벤트 실행
══════════════════════════════════════════════════ */
function playEvent(index) {
  state.phase = 'event_playing';
  stopWaiting();   // main.js에서 정의

  EVENTS[index].play(() => {
    // 이벤트 애니메이션 완료 → 분노 추가
    addRage(EVENTS[index].rageAdd, () => {
      setTimeout(() => {
        clearElevHighlights();

        if (state.rage >= 100) {
          enterSmashMode();
        } else {
          state.eventIndex++;
          setStatus('엘레베이터를 부르세요');
          state.phase = 'waiting_click';
          startWaiting();  // main.js에서 정의
        }
      }, 500);
    });
  });
}

/* ══════════════════════════════════════════════════
   SMASH 모드 진입
══════════════════════════════════════════════════ */
function enterSmashMode() {
  state.phase = 'smash';
  $('game').classList.add('smash-mode');
  const btn = $('call-btn');
  btn.textContent  = '부수기';
  btn.className    = 'smash';
  // 화살표 숨김
  $('btn-area').classList.remove('ready', 'ready-2', 'ready-3', 'ready-4');
  setStatus('분노가 한계를 넘었다!! 직접 부숴버리자!!');
  // 엘베 클릭 활성화 → main.js의 setupSmashClicks()가 처리
}
