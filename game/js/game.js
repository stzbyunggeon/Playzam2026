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
   4개 고정 이벤트 (순서 절대 변경 금지) — 합계 분노 100
══════════════════════════════════════════════════ */
const EVENTS = [
  /* 1. 가장 먼 엘베(A/B2) 잡힘 → 만원 → A 다시 내려감 — +25 */
  {
    rageAdd: 25,
    play(onDone) {
      selectElev('a');
      setFloorDisplay('a', 'B2');
      setStatus('<span style="color:#FF3030">가장 먼 엘베</span>가 응답했습니다...');
      animateFloor('a', -2, 10, 260, () => {
        setStatus('드디어 도착했습니다!');
        showCrowd('a');
        setTimeout(() => {
          openDoor('a');
          setTimeout(() => {
            setStatus('자리가 없습니다!!');
            setTimeout(() => {
              closeDoor('a');
              setTimeout(() => {
                hideCrowd('a');
                setStatus('엘베가 다시 내려갑니다...');
                animateFloor('a', 10, -2, 200, null, true); // 배경 연출, 사운드는 재생
                setTimeout(onDone, 800);
              }, 600);
            }, 1400);
          }, 650);
        }, 400);
      });
    }
  },

  /* 2. B 호출 → 9층에서 1층으로 내려갔다가 올라오던 중 고장 — +25 */
  {
    rageAdd: 25,
    play(onDone) {
      selectElev('b');
      setFloorDisplay('b', '9F');
      setStatus('다른 엘베를 호출합니다...');
      setTimeout(() => {
        setStatus('어? 왜 내려가지...?');
        animateFloor('b', 9, 1, 280, () => {
          setStatus('1층까지 내려갔어?!');
          animateFloor('b', 1, 8, 280, () => {
            setStatus('다시 올라오네! 이번엔 될 것 같아!!');
            setTimeout(() => {
              flickerFloor('b', 6, () => {
                showBadge('b', 'broken', '고장');
                setStatus('고장으로 운행이 취소됐습니다!');
                setTimeout(onDone, 1600);
              });
            }, 300);
          });
        });
      }, 600);
    }
  },

  /* 3. C가 9층까지 왔다가 B2에 있던 A로 배정 바뀜 — +20 */
  {
    rageAdd: 20,
    play(onDone) {
      selectElev('c');
      setFloorDisplay('c', '1F');
      setStatus('다른 엘베가 올라오고 있습니다...');
      animateFloor('c', 1, 9, 300, () => {
        setStatus('9층까지 왔는데...?!');
        setTimeout(() => {
          selectElev('a');
          setFloorDisplay('a', 'B2');
          setStatus('갑자기 <span style="color:#FF3030">B2</span>에 있는 다른 엘베로 바뀌었습니다!!!');
          setTimeout(onDone, 1800);
        }, 800);
      });
    }
  },

  /* 4. 배정된 B2 엘베가 왔지만 또 만원 → 분노 100 — +30 */
  {
    rageAdd: 30,
    play(onDone) {
      selectElev('a');
      setFloorDisplay('a', 'B2');
      setStatus('배정된 B2 엘베가 올라오고 있습니다...');
      animateFloor('a', -2, 10, 260, () => {
        setStatus('이번엔 진짜 탈 수 있겠지...!!');
        showCrowd('a');
        setTimeout(() => {
          openDoor('a');
          setTimeout(() => {
            setStatus('또 <span style="color:#FF3030">만원</span>이야....');
            setTimeout(() => {
              closeDoor('a');
              setTimeout(() => {
                hideCrowd('a');
                setTimeout(onDone, 400);
              }, 600);
            }, 2000);
          }, 650);
        }, 400);
      });
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

function openDoor(id)  { $('frame-' + id).classList.add('door-open'); playDoorOpenSound(); }
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

function showCrowd(id) {
  const el = $('crowd-' + id);
  if (el) el.classList.remove('hidden');
}

function showCrowdEntering(id) {
  const el = $('crowd-' + id);
  if (!el) return;
  el.classList.remove('hidden', 'entering');
  void el.offsetWidth;               // reflow → 애니메이션 재시작
  el.classList.add('entering');
}

function hideCrowd(id) {
  const el = $('crowd-' + id);
  if (el) { el.classList.add('hidden'); el.classList.remove('entering'); }
}

/* ══════════════════════════════════════════════════
   상태 텍스트
══════════════════════════════════════════════════ */
function setStatus(text) {
  $('status-text').innerHTML = text;
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
  // 고장/점검 배지 제거
  ['a', 'b', 'c'].forEach(id => hideBadge(id));
  // 스매쉬 힌트 표시 (엘베 클릭 유도)
  ['a', 'b', 'c'].forEach(id => {
    const hint = document.createElement('div');
    hint.className = 'smash-hint';
    hint.id = 'smash-hint-' + id;
    hint.textContent = '때려!';
    $('elev-' + id).appendChild(hint);
  });
  // 엘베 클릭 활성화 → main.js의 setupSmashClicks()가 처리
}
