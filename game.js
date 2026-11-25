/* Decibel Dino — Fast-paced immortal Chrome Dino evil volume control.
   Runs cleanly inside the exact 800x400 #stage with responsive small-screen scaling. */

(function () {
  'use strict';

  let STAGE_W = 800;
  let STAGE_H = 400;
  let HUD_H = 70;
  let CONTROL_STRIP_H = 64;
  let CEIL_Y = 82;
  let FLOOR_Y = 324;
  let BASE_DINO_X = 136;
  let IS_PORTRAIT_PHONE = false;
  const MIN_VOL = -15;
  const MAX_VOL = 100;
  const BRAKE_DURATION = 1.5;

  // ---- Pixel Art Sprite Matrices (1 = primary ink, 2 = glowing eye, 3 = crimson devil horns) ----
  const DINO_STAND_A = [
    '       3       3  ',
    '       33     33  ',
    '        11111111  ',
    '       1111111111 ',
    '       1121111111 ',
    '       1111111111 ',
    '       1111111111 ',
    '       11111      ',
    '       11111111   ',
    '1     111111      ',
    '1    111111111    ',
    '11  1111111111    ',
    '111111111111  1   ',
    '111111111111      ',
    ' 11111111111      ',
    '  111111111       ',
    '   1111111        ',
    '    111 11        ',
    '    11   11       ',
    '    11    111     ',
    '    111           '
  ];

  const DINO_STAND_B = [
    '       3       3  ',
    '       33     33  ',
    '        11111111  ',
    '       1111111111 ',
    '       1121111111 ',
    '       1111111111 ',
    '       1111111111 ',
    '       11111      ',
    '       11111111   ',
    '1     111111      ',
    '1    111111111    ',
    '11  1111111111    ',
    '111111111111  1   ',
    '111111111111      ',
    ' 11111111111      ',
    '  111111111       ',
    '   1111111        ',
    '    111 11        ',
    '     11  11       ',
    '     111  11      ',
    '          111     '
  ];

  const DINO_DUCK_A = [
    '             3       3  ',
    '             33     33  ',
    '              11111111  ',
    '1            1111111111 ',
    '11  1111111111112111111 ',
    '11111111111111111111111 ',
    ' 1111111111111111111111 ',
    '  11111111111111111     ',
    '   1111111111111111111  ',
    '     11111111111        ',
    '      111   11          ',
    '      11     111        ',
    '      111               '
  ];

  const DINO_DUCK_B = [
    '             3       3  ',
    '             33     33  ',
    '              11111111  ',
    '1            1111111111 ',
    '11  1111111111112111111 ',
    '11111111111111111111111 ',
    ' 1111111111111111111111 ',
    '  11111111111111111     ',
    '   1111111111111111111  ',
    '     11111111111        ',
    '      111   11          ',
    '       111  11          ',
    '            111         '
  ];

  const BIRD_A = [
    '      11          ',
    '     111          ',
    '    11111         ',
    '  11111111        ',
    '111121111111111   ',
    '   111111111111111',
    '     11111111111  ',
    '       111111     ',
    '        111       ',
    '         1        '
  ];

  const BIRD_B = [
    '                  ',
    '                  ',
    '  11111           ',
    '111121111111111   ',
    '   111111111111111',
    '     11111111111  ',
    '      111111      ',
    '     11111        ',
    '    1111          ',
    '    11            '
  ];

  const POTATO_QUIPS = [
    'KEEP IT DOWN, GOOD SIR!',
    'MY MOUSTACHE IS VIBRATING!',
    'CALLING EVIL HR!',
    'QUITE BARBARIC!',
    'MY TEA IS SHAKING!'
  ];

  // ---- DOM References ----
  const stageShell = document.getElementById('stage-shell');
  const stageEl = document.getElementById('stage');
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const CANVAS_DPR = 2;

  const stickyLayer = document.getElementById('sticky-layer');
  const hearingModal = document.getElementById('hearing-modal');
  const modalCloseX = document.getElementById('modal-close-x');
  const modalDismissBtn = document.getElementById('modal-dismiss-btn');
  const modalLowerBtn = document.getElementById('modal-lower-btn');

  const btnJump = document.getElementById('btn-jump');
  const btnDuck = document.getElementById('btn-duck');
  const btnBrake = document.getElementById('btn-brake');
  const brakeFillEl = document.getElementById('brake-fill');
  const stripHintEl = document.getElementById('strip-hint');

  const mobileDeckEl = document.getElementById('mobile-deck');
  const mBtnJump = document.getElementById('m-btn-jump');
  const mBtnDuck = document.getElementById('m-btn-duck');
  const mBtnBrake = document.getElementById('m-btn-brake');
  const mBrakeFillEl = document.getElementById('m-brake-fill');

  const startOverlay = document.getElementById('start-overlay');
  const btnStart = document.getElementById('btn-start');
  const resultOverlay = document.getElementById('result-overlay');
  const resultBadge = document.getElementById('result-badge');
  const resultSpeaker = document.getElementById('result-speaker');
  const resultVol = document.getElementById('result-vol');
  const resultQuip = document.getElementById('result-quip');
  const resultStats = document.getElementById('result-stats');
  const btnRetry = document.getElementById('btn-retry');

  const audio = new window.AudioEngine();
  let state = null;

  function setBrakeFill(pct) {
    const w = `${pct}%`;
    brakeFillEl.style.width = w;
    if (mBrakeFillEl) mBrakeFillEl.style.width = w;
  }

  // ---- Responsive Stage Scaling & Portrait Zoom Mode ----
  function updateStageScale() {
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const portraitPhone = vw <= 720 && vh >= 460 && vh > vw;
    const prevFloor = FLOOR_Y;

    IS_PORTRAIT_PHONE = portraitPhone;
    document.body.classList.toggle('portrait-phone', portraitPhone);

    if (portraitPhone) {
      STAGE_W = 520;
      STAGE_H = 408;
      HUD_H = 74;
      CONTROL_STRIP_H = 0;
      CEIL_Y = 88;
      FLOOR_Y = 374;
      BASE_DINO_X = 82;
    } else {
      STAGE_W = 800;
      STAGE_H = 400;
      HUD_H = 70;
      CONTROL_STRIP_H = 64;
      CEIL_Y = 82;
      FLOOR_Y = 324;
      BASE_DINO_X = 136;
    }

    stageEl.style.width = `${STAGE_W}px`;
    stageEl.style.height = `${STAGE_H}px`;
    canvas.style.width = `${STAGE_W}px`;
    canvas.style.height = `${STAGE_H}px`;
    const targetW = STAGE_W * CANVAS_DPR;
    const targetH = STAGE_H * CANVAS_DPR;
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    // Keep dino cleanly anchored if resized between portrait & desktop
    if (state && state.dino) {
      if (state.dino.grounded) {
        state.dino.y = state.gravityDir === 1 ? FLOOR_Y : CEIL_Y;
      } else {
        state.dino.y += (FLOOR_Y - prevFloor);
      }
      state.dino.x = Math.min(state.dino.x, BASE_DINO_X);
    }

    const deckVisible = mobileDeckEl && window.getComputedStyle(mobileDeckEl).display !== 'none';
    const availH = deckVisible ? Math.max(180, vh - mobileDeckEl.offsetHeight) : vh;
    const fitScale = Math.min(vw / STAGE_W, availH / STAGE_H);
    const scale = (vw > STAGE_W && availH > STAGE_H)
      ? Math.max(1, Math.min(2.2, fitScale * 0.94))
      : fitScale;

    if (Math.abs(scale - 1) > 0.002) {
      stageEl.style.transform = `scale(${scale})`;
      stageShell.style.width = `${Math.floor(STAGE_W * scale)}px`;
      stageShell.style.height = `${Math.floor(STAGE_H * scale)}px`;
    } else {
      stageEl.style.transform = 'none';
      stageShell.style.width = `${STAGE_W}px`;
      stageShell.style.height = `${STAGE_H}px`;
    }
  }

  window.addEventListener('resize', updateStageScale);
  window.addEventListener('orientationchange', updateStageScale);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateStageScale);
  }
  updateStageScale();

  // ---- Helper Math ----
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function rand(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ---- Input State ----
  const input = {
    jumpHeld: false,
    duckHeld: false,
    brakeHeld: false,
    jumpBuffer: 0,
    pointerStartY: null,
    pointerId: null
  };

  // ---- Game State ----
  function createInitialState(mode) {
    return {
      mode: mode || 'start', // 'start' | 'playing' | 'finished'
      elapsed: 0,
      speed: 395,
      scrollX: 0,
      volume: 0,
      visualVolume: 0,
      hudFlash: 0,
      hudFlashColor: '#ff4757',
      hudShake: 0,

      // Stats
      hitsTaken: 0,
      volumeLost: 0,
      volumeRecovered: 0,
      rocketsEaten: 0,

      // Dino
      dino: {
        x: BASE_DINO_X,
        y: FLOOR_Y,
        vy: 0,
        grounded: true,
        ducking: false,
        slamming: false,
        coyote: 0,
        runAnim: 0,
        invuln: 0,
        hurtFace: 0,
        afterimages: []
      },

      // World modifiers & debuffs
      gravityDir: 1, // 1 = floor, -1 = ceiling
      gravityFlipTimer: 0,
      gravityFlipReturnWarned: false,
      nightTimer: 0,
      nightAlpha: 0,

      foamCount: 0,
      foamTimer: 0,
      shushTimer: 0,
      rewindTimer: 0,
      muffleTimer: 0,
      latchedDrone: null, // { timer: 2.8, pulse: 0 }

      // Brake to lock
      brakeProgress: 0,
      braking: false,

      // Screen juice
      screenShake: 0,
      banner: null, // { text, color, timer, maxTimer }

      // Director milestones
      milestones: {
        night1: false,
        tungIntro: false,
        modal1: false,
        rocketIntro: false,
        gravity1: false,
        speaker1: false,
        overtime: false,
        modal2: false,
        gravity2: false
      },
      spawnCooldown: 0.65,
      rocketCooldown: 999,
      boostCooldown: 5.5,
      overtimeStarCooldown: 2.0,
      overtimeSpeakerCooldown: 9.0,
      modalAutoClose: 0,

      // Entities
      obstacles: [],
      pellets: [],
      rockets: [],
      speaker: null, // Giant Speaker Cannon boss-let
      speakerWaves: [],
      stars: [],
      particles: [],
      floatingTexts: [],
      hudChunks: [], // Animated volume chunks flying between HUD and birds
      speedLines: Array.from({ length: 12 }, () => ({
        x: rand(0, STAGE_W),
        y: rand(HUD_H + 14, FLOOR_Y - 14),
        len: rand(26, 68),
        sp: rand(1.15, 1.55)
      })),
      clouds: [
        { x: 140, y: 112, s: 1.0 },
        { x: 420, y: 94, s: 0.85 },
        { x: 670, y: 126, s: 1.1 }
      ],
      groundDots: Array.from({ length: 34 }, (_, i) => ({
        x: i * 26 + rand(0, 18),
        y: rand(3, 11),
        w: rand(2, 6)
      })),
      bgStars: Array.from({ length: 24 }, () => ({
        x: rand(20, STAGE_W - 20),
        y: rand(HUD_H + 14, FLOOR_Y - 70),
        r: Math.random() > 0.7 ? 2 : 1,
        tw: rand(0, Math.PI * 2)
      })),

      // Result
      finishReason: null,
      finishConfetti: []
    };
  }

  state = createInitialState('start');

  // ---- Surface Coordinate Helpers ----
  function surfaceY() {
    return state.gravityDir === 1 ? FLOOR_Y : CEIL_Y;
  }

  function dinoDims() {
    if (state.dino.ducking && state.dino.grounded) {
      return { w: 66, h: 36 };
    }
    return { w: 50, h: 60 };
  }

  function dinoHitbox() {
    const d = state.dino;
    const dim = dinoDims();
    const padX = 6;
    const padY = 5;
    if (state.gravityDir === 1) {
      return {
        x: d.x + padX,
        y: d.y - dim.h + padY,
        w: dim.w - padX * 2,
        h: dim.h - padY * 2
      };
    }
    return {
      x: d.x + padX,
      y: d.y + padY,
      w: dim.w - padX * 2,
      h: dim.h - padY * 2
    };
  }

  function dinoCenterY() {
    const hb = dinoHitbox();
    return hb.y + hb.h * 0.5;
  }

  // ---- UI / Overlay Helpers ----
  function clearDomHazards() {
    stickyLayer.innerHTML = '';
    hearingModal.classList.add('hidden');
    state.modalAutoClose = 0;
  }

  function showHearingModal() {
    hearingModal.classList.remove('hidden');
    if (!IS_PORTRAIT_PHONE) {
      const topPos = state.elapsed > 30 ? 84 : 76;
      const leftPos = clamp(state.elapsed > 30 ? 220 : 255, 24, STAGE_W - 454);
      hearingModal.style.top = `${topPos}px`;
      hearingModal.style.left = `${leftPos}px`;
    }
    state.modalAutoClose = 6.5;
    audio.playPopup();
  }

  function hideHearingModal() {
    hearingModal.classList.add('hidden');
    state.modalAutoClose = 0;
  }

  function spawnStickyNote(penalty) {
    const note = document.createElement('div');
    note.className = 'sticky-note';
    const quip = POTATO_QUIPS[Math.floor(Math.random() * POTATO_QUIPS.length)];
    note.innerHTML = `<span class="sticky-title">SIR SPUD COMPLAINT (-${penalty}%)</span>${quip}`;
    const minX = IS_PORTRAIT_PHONE ? 165 : 260;
    const maxX = Math.max(minX + 20, STAGE_W - 245);
    const left = Math.floor(rand(minX, maxX));
    const top = Math.floor(rand(18, 122));
    const rot = rand(-7, 7).toFixed(1);
    note.style.left = `${left}px`;
    note.style.top = `${top}px`;
    note.style.transform = `rotate(${rot}deg)`;
    stickyLayer.appendChild(note);

    setTimeout(() => {
      note.classList.add('peel');
    }, 1650);
    setTimeout(() => {
      if (note.parentNode) note.parentNode.removeChild(note);
    }, 2050);
  }

  function showBanner(text, color, duration) {
    state.banner = {
      text,
      color: color || '#ff4757',
      timer: duration || 1.75,
      maxTimer: duration || 1.75
    };
  }

  function addFloatingText(x, y, text, color, scale) {
    state.floatingTexts.push({
      x,
      y,
      text,
      color: color || '#ff4757',
      scale: scale || 1,
      vy: -48,
      life: 1.05,
      maxLife: 1.05
    });
  }

  function addBurst(x, y, color, count, speedScale) {
    const n = count || 10;
    const sp = speedScale || 1;
    for (let i = 0; i < n; i++) {
      const ang = rand(0, Math.PI * 2);
      const spd = rand(65, 240) * sp;
      state.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 40,
        size: rand(3, 7),
        color,
        life: rand(0.32, 0.75),
        maxLife: 0.75,
        gravity: 480
      });
    }
  }

  function changeVolume(delta, kind) {
    const prev = state.volume;
    state.volume = clamp(state.volume + delta, MIN_VOL, MAX_VOL);
    const actual = state.volume - prev;

    if (delta < 0) {
      state.volumeLost += Math.abs(delta);
      state.hudFlash = 0.28;
      state.hudFlashColor = '#ff4757';
      state.hudShake = 7;
    } else if (delta > 0 && kind === 'recover') {
      state.volumeRecovered += Math.abs(actual);
      state.hudFlash = 0.22;
      state.hudFlashColor = '#2ed573';
    }
  }

  // ---- Start & Finish Flow ----
  function startRun() {
    audio.init();
    clearDomHazards();
    state = createInitialState('playing');
    input.jumpHeld = false;
    input.duckHeld = false;
    input.brakeHeld = false;
    input.jumpBuffer = 0;
    startOverlay.classList.add('hidden');
    resultOverlay.classList.add('hidden');
    setBrakeFill(0);
    stripHintEl.textContent = '100% TO WIN · BRAKE TO LOCK';
    showBanner('WELCOME TO EVIL CLUB — RUN!', '#d61f3c', 1.6);
  }

  function finishRun(reason) {
    if (state.mode === 'finished') return;
    state.mode = 'finished';
    state.finishReason = reason;
    state.braking = false;
    clearDomHazards();

    const finalVol = reason === '100' ? 100 : Math.round(state.volume);
    state.volume = finalVol;
    state.visualVolume = finalVol;

    if (reason === '100') {
      audio.playVictory100();
      // Spawn Evil Club crimson & ember confetti inside canvas
      const palette = ['#ff2e4c', '#b8142f', '#ff6b2b', '#ffdd59', '#24070d', '#ffffff'];
      for (let i = 0; i < 85; i++) {
        state.finishConfetti.push({
          x: rand(60, STAGE_W - 60),
          y: rand(40, 180),
          vx: rand(-220, 220),
          vy: rand(-280, -40),
          w: rand(5, 10),
          h: rand(4, 7),
          rot: rand(0, Math.PI * 2),
          vrot: rand(-8, 8),
          color: palette[i % palette.length]
        });
      }
    } else {
      audio.playVolumeLocked(finalVol);
    }

    // Populate Result Overlay
    resultVol.classList.remove('sub-mute', 'max-vol');
    if (reason === '100') {
      resultBadge.textContent = 'EVIL CLUB APPROVED · 100%';
      resultSpeaker.textContent = '🔊';
      resultVol.textContent = '100%';
      resultVol.classList.add('max-vol');
      resultQuip.textContent = state.elapsed <= 35
        ? 'Evil Club salutes you. Your neighbours have already called the authorities.'
        : 'Survived overtime torment to reach glorious maximum decibels.';
    } else if (finalVol < 0) {
      resultBadge.textContent = 'SUB-MUTE LOCKED';
      resultSpeaker.textContent = '🕳️';
      resultVol.textContent = `${finalVol}%`;
      resultVol.classList.add('sub-mute');
      resultQuip.textContent = 'Your speakers are actively vacuuming sound from the room. Truly evil.';
    } else if (finalVol === 0) {
      resultBadge.textContent = 'MUTE LOCKED';
      resultSpeaker.textContent = '🔇';
      resultVol.textContent = '0%';
      resultQuip.textContent = 'All that torment just to leave it muted. Respect.';
    } else {
      resultBadge.textContent = 'VOLUME LOCKED (MERCY?)';
      resultSpeaker.textContent = finalVol >= 66 ? '🔊' : finalVol >= 30 ? '🔉' : '🔈';
      resultVol.textContent = `${finalVol}%`;
      resultQuip.textContent = state.rocketsEaten > 0
        ? `Screeched to a halt! (You ate ${state.rocketsEaten} rocket${state.rocketsEaten === 1 ? '' : 's'} for Evil Club.)`
        : `Screeched to a halt at ${finalVol}%. Evil Club expected more suffering.`;
    }

    resultStats.innerHTML = `
      <div class="stat-pill"><b>${state.elapsed.toFixed(1)}s</b><span>Time</span></div>
      <div class="stat-pill"><b>${state.hitsTaken}</b><span>Hits Tanked</span></div>
      <div class="stat-pill"><b>-${Math.round(state.volumeLost)}%</b><span>Vol Lost</span></div>
      <div class="stat-pill"><b>+${Math.round(state.volumeRecovered)}%</b><span>Reclaimed</span></div>
    `;

    resultOverlay.classList.remove('hidden');
  }

  // ---- Input Handlers ----
  function triggerJumpDown() {
    audio.init();
    if (state.mode === 'start') {
      startRun();
      return;
    }
    if (state.mode !== 'playing') return;
    input.jumpHeld = true;
    input.jumpBuffer = 0.095;
    btnJump.classList.add('active');
    if (mBtnJump) mBtnJump.classList.add('active');
  }

  function triggerJumpUp() {
    input.jumpHeld = false;
    btnJump.classList.remove('active');
    if (mBtnJump) mBtnJump.classList.remove('active');
    if (state.mode !== 'playing') return;
    // Variable jump height cut when releasing early while moving away from surface
    const d = state.dino;
    if (!d.grounded && d.vy * state.gravityDir < -180) {
      d.vy *= 0.54;
    }
  }

  function triggerDuckDown() {
    audio.init();
    if (state.mode !== 'playing') return;
    input.duckHeld = true;
    btnDuck.classList.add('active');
    if (mBtnDuck) mBtnDuck.classList.add('active');
    const d = state.dino;
    if (!d.grounded) {
      d.slamming = true;
      d.vy = 960 * state.gravityDir;
    } else {
      d.ducking = true;
    }
  }

  function triggerDuckUp() {
    input.duckHeld = false;
    state.dino.ducking = false;
    btnDuck.classList.remove('active');
    if (mBtnDuck) mBtnDuck.classList.remove('active');
  }

  function triggerBrakeDown() {
    audio.init();
    if (state.mode !== 'playing') return;
    input.brakeHeld = true;
    btnBrake.classList.add('active');
    if (mBtnBrake) mBtnBrake.classList.add('active');
  }

  function triggerBrakeUp() {
    input.brakeHeld = false;
    btnBrake.classList.remove('active');
    if (mBtnBrake) mBtnBrake.classList.remove('active');
  }

  // Keyboard bindings
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'KeyB'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) return;

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      if (state.mode === 'finished') {
        startRun();
        return;
      }
      triggerJumpDown();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      triggerDuckDown();
    } else if (e.code === 'KeyB') {
      triggerBrakeDown();
    } else if (e.code === 'Enter') {
      if (state.mode === 'start' || state.mode === 'finished') {
        startRun();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      triggerJumpUp();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      triggerDuckUp();
    } else if (e.code === 'KeyB') {
      triggerBrakeUp();
    }
  });

  // On-stage touch/mouse control buttons
  function bindHoldButton(el, onDown, onUp) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (el.setPointerCapture) {
        try { el.setPointerCapture(e.pointerId); } catch (_err) {}
      }
      onDown();
    });
    const end = (e) => {
      e.preventDefault();
      onUp();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', onUp);
  }

  bindHoldButton(btnJump, triggerJumpDown, triggerJumpUp);
  bindHoldButton(btnDuck, triggerDuckDown, triggerDuckUp);
  bindHoldButton(btnBrake, triggerBrakeDown, triggerBrakeUp);
  if (mBtnJump) bindHoldButton(mBtnJump, triggerJumpDown, triggerJumpUp);
  if (mBtnDuck) bindHoldButton(mBtnDuck, triggerDuckDown, triggerDuckUp);
  if (mBtnBrake) bindHoldButton(mBtnBrake, triggerBrakeDown, triggerBrakeUp);

  // Direct canvas tap = jump, quick swipe down = duck/slam
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    audio.init();
    if (state.mode === 'start') {
      startRun();
      return;
    }
    if (state.mode !== 'playing') return;
    input.pointerStartY = e.clientY;
    input.pointerId = e.pointerId;
    triggerJumpDown();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (input.pointerId !== e.pointerId || input.pointerStartY === null) return;
    if (e.clientY - input.pointerStartY > 24) {
      triggerJumpUp();
      triggerDuckDown();
    }
  });

  function clearCanvasPointer(e) {
    if (input.pointerId !== e.pointerId) return;
    input.pointerId = null;
    input.pointerStartY = null;
    triggerJumpUp();
    if (input.duckHeld) triggerDuckUp();
  }
  canvas.addEventListener('pointerup', clearCanvasPointer);
  canvas.addEventListener('pointercancel', clearCanvasPointer);

  // Modal & CTA buttons
  btnStart.addEventListener('click', startRun);
  btnRetry.addEventListener('click', startRun);

  function dismissHearingModal(e) {
    e.stopPropagation();
    audio.init();
    hideHearingModal();
    audio.playPopup();
    addFloatingText(STAGE_W * 0.54, HUD_H + 56, 'HR IGNORED!', '#ff2e4c', 1.0);
  }
  modalDismissBtn.addEventListener('click', dismissHearingModal);
  modalCloseX.addEventListener('click', dismissHearingModal);

  modalLowerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    audio.init();
    hideHearingModal();
    changeVolume(-15, 'damage');
    state.hitsTaken += 1;
    audio.playShush();
    addFloatingText(STAGE_W * 0.54, HUD_H + 56, 'GOOD CITIZEN! -15%', '#ff4757', 1.15);
  });

  // ---- Obstacle & Entity Spawners ----
  function spawnCactus() {
    const variantRoll = Math.random();
    let kind = 'small';
    let w = 30;
    let h = 48;
    if (variantRoll > 0.66) {
      kind = 'cluster';
      w = 58;
      h = 52;
    } else if (variantRoll > 0.32) {
      kind = 'tall';
      w = 34;
      h = 66;
    }
    const dir = state.gravityDir;
    const y = dir === 1 ? FLOOR_Y - h : CEIL_Y;
    state.obstacles.push({
      type: 'cactus',
      variant: kind,
      x: STAGE_W + 24,
      y,
      w,
      h,
      dir,
      hit: false
    });
  }

  function spawnBird() {
    const dir = state.gravityDir;
    // Alternate between duckable head-height (76px off floor) and jumpable height
    const highLane = Math.random() > 0.52;
    const offset = highLane ? 78 : 54;
    const h = 30;
    const y = dir === 1 ? FLOOR_Y - offset : CEIL_Y + offset - h;
    state.obstacles.push({
      type: 'bird',
      state: 'incoming', // 'incoming' | 'fleeing' | 'escaping' | 'bonked'
      x: STAGE_W + 30,
      y,
      w: 52,
      h,
      dir,
      flap: 0,
      fleeTimer: 0,
      reclaimGrace: 0,
      stolenAmount: 9,
      vx: 0,
      vy: 0
    });
  }

  function spawnFoamWall() {
    const dir = state.gravityDir;
    const w = 44;
    const h = 62;
    const y = dir === 1 ? FLOOR_Y - h : CEIL_Y;
    state.obstacles.push({
      type: 'foam',
      x: STAGE_W + 24,
      y,
      w,
      h,
      dir,
      hit: false
    });
  }

  function spawnPotato() {
    const dir = state.gravityDir;
    const hasMoustache = Math.random() < 0.45;
    const w = hasMoustache ? 48 : 34;
    const h = hasMoustache ? 36 : 28;
    const low = Math.random() > 0.45;
    const offset = low ? 58 : 104;
    const y = dir === 1 ? FLOOR_Y - offset : CEIL_Y + offset - h;
    const spots = [];
    for (let s = 0; s < 5; s++) {
      spots.push({
        dx: rand(-0.34, 0.34),
        dy: rand(-0.32, 0.32),
        r: rand(1.4, 2.5)
      });
    }
    state.obstacles.push({
      type: 'potato',
      hasMoustache,
      x: STAGE_W + 32,
      y,
      baseY: y,
      w,
      h,
      phase: rand(0, Math.PI * 2),
      rot: rand(-0.22, 0.22),
      rotSpeed: hasMoustache ? 0 : rand(-3.6, 3.6),
      spots,
      hit: false
    });
  }

  function spawnMuteDrone() {
    const dir = state.gravityDir;
    const offset = rand(58, 102);
    const h = 40;
    const y = dir === 1 ? FLOOR_Y - offset : CEIL_Y + offset - h;
    state.obstacles.push({
      type: 'drone',
      x: STAGE_W + 30,
      y,
      baseY: y,
      w: 46,
      h,
      phase: rand(0, Math.PI * 2),
      hit: false
    });
  }

  function spawnRewindTape() {
    const dir = state.gravityDir;
    const w = 48;
    const h = 34;
    const y = dir === 1 ? FLOOR_Y - h - 4 : CEIL_Y + 4;
    state.obstacles.push({
      type: 'rewind',
      x: STAGE_W + 26,
      y,
      baseY: y,
      w,
      h,
      dir,
      spin: 0,
      hit: false
    });
  }

  function spawnTungSahur() {
    const dir = state.gravityDir;
    const w = 42;
    const h = 74;
    const y = dir === 1 ? FLOOR_Y - h : CEIL_Y;
    state.obstacles.push({
      type: 'tung',
      x: STAGE_W + 34,
      y,
      w,
      h,
      dir,
      phase: 0,
      knockCount: 0,
      tungPulse: 0,
      hit: false,
      dodged: false
    });
  }

  function spawnGravityGate() {
    state.obstacles.push({
      type: 'gate',
      x: STAGE_W + 40,
      y: CEIL_Y,
      w: 36,
      h: FLOOR_Y - CEIL_Y,
      triggered: false,
      pulse: 0
    });
  }

  function spawnRocket(targetOffsetY) {
    const targetY = clamp(dinoCenterY() + (targetOffsetY || 0), CEIL_Y + 24, FLOOR_Y - 24);
    state.rockets.push({
      phase: 'tracking', // 'tracking' -> 'locked' -> 'firing'
      timer: 0.56,
      beepTimer: 0.20,
      x: STAGE_W + 24,
      y: targetY,
      w: 58,
      h: 24,
      vx: -840,
      hit: false,
      dodged: false
    });
    audio.playRadarBeep(false);
  }

  function spawnSpeakerCannon() {
    state.speaker = {
      x: STAGE_W + 76,
      targetX: STAGE_W - 76,
      timer: 5.4,
      fireTimer: 0.85,
      nextAttack: 'bass', // alternates 'bass' and 'treble'
      exiting: false
    };
    showBanner('🔊 BASS CLIPPING! JUMP BASS · DUCK TREBLE', '#ff6b35', 2.0);
  }

  function spawnOverdriveStar(amount) {
    const val = amount || 20;
    const dir = state.gravityDir;
    const offset = val >= 20 ? 132 : rand(84, 122);
    const y = dir === 1 ? FLOOR_Y - offset : CEIL_Y + offset;
    state.stars.push({
      x: STAGE_W + 24,
      y,
      r: val >= 20 ? 22 : 18,
      amount: val,
      spin: 0,
      collected: false
    });
  }

  function spawnVolumePellets(originX, originY) {
    const dir = state.gravityDir;
    for (let i = 0; i < 3; i++) {
      state.pellets.push({
        x: originX + rand(10, 28),
        y: originY,
        vx: rand(145, 285),
        vy: rand(-275, -420) * dir,
        r: 10,
        life: 2.6,
        pickupDelay: 0.16,
        bounces: 0
      });
    }
  }

  // ---- Time-Driven Event Director ----
  function getPhaseLabel(t) {
    if (state.gravityFlipTimer > 0) return 'GRAVITY FLIP';
    if (state.speaker) return 'BASS CLIPPING';
    if (t >= 35) return 'OVERTIME';
    if (t >= 29) return 'FINAL TORMENT';
    if (t >= 15) return 'ROCKET LOCK';
    if (t >= 10) return 'NOISE ALERT';
    if (t >= 5) return 'PICKPOCKETS';
    return 'INITIATION';
  }

  function updateDirector(dt) {
    const t = state.elapsed;

    // Fast, dynamic arcade speed: 430 -> 665 px/s!
    const speedMult = IS_PORTRAIT_PHONE ? 0.84 : 1.0;
    state.speed = clamp(430 + t * 7.8, 430, 665) * speedMult;

    // ---- Scripted Set-Piece Milestones ----
    if (!state.milestones.night1 && t >= 7.5) {
      state.milestones.night1 = true;
      state.nightTimer = 3.2;
      showBanner('🩸 BLOOD MOON MODE', '#d61f3c', 1.5);
    }

    if (!state.milestones.tungIntro && t >= 10.5) {
      state.milestones.tungIntro = true;
      showBanner('🪵 TUNG TUNG TUNG SAHUR! STOMP HEAD FOR +10%', '#c96a2b', 1.9);
      spawnTungSahur();
      state.spawnCooldown = Math.max(state.spawnCooldown, 1.05);
    }

    if (!state.milestones.modal1 && t >= 13.0) {
      state.milestones.modal1 = true;
      showHearingModal();
    }

    if (!state.milestones.rocketIntro && t >= 15.0) {
      state.milestones.rocketIntro = true;
      showBanner('🚀 ROCKETS ONLINE!', '#ff3838', 1.7);
      spawnRocket(0);
      state.rocketCooldown = 3.5;
    }

    if (!state.milestones.gravity1 && t >= 21.0) {
      state.milestones.gravity1 = true;
      spawnGravityGate();
      state.spawnCooldown = Math.max(state.spawnCooldown, 1.15);
    }

    if (!state.milestones.speaker1 && t >= 26.3 && state.gravityFlipTimer <= 0) {
      state.milestones.speaker1 = true;
      spawnSpeakerCannon();
    }

    if (!state.milestones.overtime && t >= 28.0) {
      state.milestones.overtime = true;
      showBanner('★ GRAB +20% OVERDRIVE STARS!', '#f5a623', 2.0);
      state.overtimeStarCooldown = 1.0;
      state.overtimeSpeakerCooldown = 10.0;
    }

    if (!state.milestones.modal2 && t >= 38.5 && hearingModal.classList.contains('hidden')) {
      state.milestones.modal2 = true;
      showHearingModal();
    }

    if (!state.milestones.gravity2 && t >= 47.0 && !state.speaker) {
      state.milestones.gravity2 = true;
      spawnGravityGate();
      state.spawnCooldown = Math.max(state.spawnCooldown, 1.15);
    }

    // ---- Early Volume Boost Notes (+8% from 0:06+) so fast play climbs rapidly ----
    if (t >= 6.0 && t < 28.0 && !state.speaker) {
      state.boostCooldown -= dt;
      if (state.boostCooldown <= 0) {
        spawnOverdriveStar(8);
        state.boostCooldown = rand(2.8, 3.8);
      }
    }

    // ---- Rocket Spawner (0:15+) ----
    if (t >= 15.0 && !state.speaker) {
      state.rocketCooldown -= dt;
      if (state.rocketCooldown <= 0) {
        spawnRocket(0);
        // Occasional staggered double-rocket deep in overtime (0:40+)
        if (t >= 40.0 && Math.random() > 0.58) {
          setTimeout(() => {
            if (state.mode === 'playing' && !state.speaker) {
              spawnRocket(state.gravityDir === 1 ? -52 : 52);
            }
          }, 640);
        }
        const baseInterval = t >= 35 ? 3.2 : t >= 29 ? 3.0 : 3.8;
        state.rocketCooldown = rand(baseInterval - 0.4, baseInterval + 0.6);
      }
    }

    // ---- Comeback Stars (0:28+) & Returning Speaker ----
    if (t >= 28.0) {
      state.overtimeStarCooldown -= dt;
      if (state.overtimeStarCooldown <= 0) {
        spawnOverdriveStar(20);
        state.overtimeStarCooldown = rand(2.8, 3.8);
      }

      if (t >= 35.0 && !state.speaker && state.gravityFlipTimer <= 0) {
        state.overtimeSpeakerCooldown -= dt;
        if (state.overtimeSpeakerCooldown <= 0) {
          spawnSpeakerCannon();
          state.overtimeSpeakerCooldown = 14.0;
        }
      }
    }

    // ---- Main Track Obstacle Spawner ----
    // Hold spawning during Speaker Cannon showcase and right before Gravity Flip return
    if (state.speaker) return;
    if (state.gravityFlipTimer > 0 && state.gravityFlipTimer < 0.75) return;

    state.spawnCooldown -= dt;
    if (state.spawnCooldown <= 0) {
      // Scale minimum horizontal spacing directly with high run speed so gaps stay clean
      let rightmost = 0;
      for (const ob of state.obstacles) {
        if (ob.state !== 'fleeing' && ob.x > rightmost) rightmost = ob.x;
      }
      const minGap = clamp(state.speed * 0.56, IS_PORTRAIT_PHONE ? 225 : 275, IS_PORTRAIT_PHONE ? 320 : 390);
      if (STAGE_W - rightmost < minGap && rightmost > 0) {
        state.spawnCooldown = 0.12;
        return;
      }

      // Dynamic unlocked pool (potatoes at 0:08+, Tung Sahur at 0:10.5+)
      const roll = Math.random();
      if (t < 5.0) {
        spawnCactus();
      } else if (t < 8.0) {
        if (roll < 0.55) spawnCactus();
        else spawnBird();
      } else if (t < 11.0) {
        if (roll < 0.35) spawnCactus();
        else if (roll < 0.62) spawnBird();
        else spawnPotato();
      } else if (t < 16.5) {
        if (roll < 0.26) spawnCactus();
        else if (roll < 0.46) spawnBird();
        else if (roll < 0.68) spawnPotato();
        else if (roll < 0.85) spawnTungSahur();
        else spawnFoamWall();
      } else if (t < 19.0) {
        if (roll < 0.22) spawnCactus();
        else if (roll < 0.38) spawnBird();
        else if (roll < 0.58) spawnPotato();
        else if (roll < 0.75) spawnTungSahur();
        else if (roll < 0.88) spawnFoamWall();
        else spawnMuteDrone();
      } else {
        // Full high-speed chaotic pool
        if (roll < 0.19) spawnCactus();
        else if (roll < 0.34) spawnBird();
        else if (roll < 0.53) spawnPotato();
        else if (roll < 0.69) spawnTungSahur();
        else if (roll < 0.80) spawnFoamWall();
        else if (roll < 0.91) spawnMuteDrone();
        else spawnRewindTape();
      }

      // Snappy fast-paced rhythm
      const baseGapSec = clamp(1.12 - t * 0.013, 0.72, 1.12);
      state.spawnCooldown = rand(baseGapSec * 0.82, baseGapSec * 1.15);
    }
  }

  // ---- Main Simulation Step ----
  function update(dt) {
    // Update confetti even on victory screen
    if (state.mode === 'finished') {
      for (const c of state.finishConfetti) {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vy += 420 * dt;
        c.rot += c.vrot * dt;
      }
      audio.update(dt, { running: false, volume: 0, elapsed: state.elapsed });
      return;
    }

    if (state.mode !== 'playing') {
      // Gentle idle animation on start screen
      state.dino.runAnim += dt * 6;
      for (const cl of state.clouds) {
        cl.x -= 18 * dt;
        if (cl.x < -70) cl.x = STAGE_W + 40;
      }
      audio.update(dt, { running: false, volume: 0, elapsed: 0 });
      return;
    }

    state.elapsed += dt;
    state.scrollX += state.speed * dt;

    // ---- Timers & Visual Juice ----
    state.hudFlash = Math.max(0, state.hudFlash - dt);
    state.hudShake = Math.max(0, state.hudShake - dt * 26);
    state.screenShake = Math.max(0, state.screenShake - dt * 32);

    if (state.banner) {
      state.banner.timer -= dt;
      if (state.banner.timer <= 0) state.banner = null;
    }

    if (state.modalAutoClose > 0) {
      state.modalAutoClose -= dt;
      if (state.modalAutoClose <= 0) hideHearingModal();
    }

    if (state.nightTimer > 0) {
      state.nightTimer -= dt;
      state.nightAlpha = Math.min(1, state.nightAlpha + dt * 4);
    } else {
      state.nightAlpha = Math.max(0, state.nightAlpha - dt * 3);
    }

    if (state.foamTimer > 0) {
      state.foamTimer -= dt;
      if (state.foamTimer <= 0) state.foamCount = 0;
    }
    if (state.shushTimer > 0) state.shushTimer = Math.max(0, state.shushTimer - dt);
    if (state.rewindTimer > 0) state.rewindTimer = Math.max(0, state.rewindTimer - dt);
    if (state.muffleTimer > 0) state.muffleTimer = Math.max(0, state.muffleTimer - dt);

    // Gravity flip timer & return
    if (state.gravityFlipTimer > 0) {
      state.gravityFlipTimer -= dt;
      if (state.gravityFlipTimer <= 1.0 && !state.gravityFlipReturnWarned) {
        state.gravityFlipReturnWarned = true;
        showBanner('↓ GRAVITY RETURNING!', '#00d2d3', 0.95);
      }
      if (state.gravityFlipTimer <= 0) {
        state.gravityFlipTimer = 0;
        state.gravityFlipReturnWarned = false;
        state.gravityDir = 1;
        state.dino.grounded = false;
        state.dino.vy = 260;
        audio.playGravityFlip(false);
        // Clear any obstacle immediately under the landing zone for fairness
        state.obstacles = state.obstacles.filter((o) => o.x > state.dino.x + 210 || o.x < state.dino.x - 40);
      }
    }

    // ---- Brake & Lock Progress ----
    state.braking = input.brakeHeld;
    if (state.braking) {
      state.brakeProgress = Math.min(1, state.brakeProgress + dt / BRAKE_DURATION);
      if (Math.random() < 0.75) {
        const d = state.dino;
        state.particles.push({
          x: d.x + 8,
          y: d.y - 3 * state.gravityDir,
          vx: -rand(110, 230),
          vy: rand(-90, -25) * state.gravityDir,
          size: rand(2.5, 5),
          color: Math.random() > 0.4 ? '#ff9f43' : '#ffeaa7',
          life: 0.28,
          maxLife: 0.28,
          gravity: 340 * state.gravityDir
        });
      }
      if (state.brakeProgress >= 1) {
        setBrakeFill(100);
        finishRun('braked');
        return;
      }
    } else {
      state.brakeProgress = Math.max(0, state.brakeProgress - dt * 1.4);
    }
    setBrakeFill(Math.round(state.brakeProgress * 100));

    // ---- Passive Volume Gain & Latched Drone Drain ----
    let passiveRate = 0;
    if (!state.braking) {
      if (state.rewindTimer > 0) {
        passiveRate = -3.0;
      } else if (state.shushTimer > 0) {
        passiveRate = 0;
      } else {
        passiveRate = 5.6;
        if (state.volume >= 95) {
          const tElastic = clamp((state.volume - 95) / 5, 0, 1);
          passiveRate *= lerp(0.78, 0.56, tElastic);
        }
        if (state.foamCount > 0) {
          passiveRate *= 0.68;
        }
      }
    }

    if (passiveRate !== 0) {
      state.volume = clamp(state.volume + passiveRate * dt, MIN_VOL, MAX_VOL);
      if (passiveRate < 0) {
        state.volumeLost += Math.abs(passiveRate * dt);
      }
    }

    if (state.latchedDrone) {
      state.latchedDrone.timer -= dt;
      state.latchedDrone.pulse += dt * 12;
      const drain = 5.5 * dt;
      state.volume = clamp(state.volume - drain, MIN_VOL, MAX_VOL);
      state.volumeLost += drain;
      if (state.latchedDrone.timer <= 0) {
        state.latchedDrone = null;
      }
    }

    // Smooth visual needle
    state.visualVolume = lerp(state.visualVolume, state.volume, Math.min(1, dt * 14));

    // Check 100% Victory!
    if (state.volume >= 100) {
      finishRun('100');
      return;
    }

    // ---- Dino Movement & Physics ----
    const d = state.dino;
    d.invuln = Math.max(0, d.invuln - dt);
    d.hurtFace = Math.max(0, d.hurtFace - dt);
    d.runAnim += dt * (state.speed / 34);

    // Recover horizontal position after rocket knockback
    if (d.x < BASE_DINO_X) {
      d.x = Math.min(BASE_DINO_X, d.x + dt * 36);
    }

    // Coyote time & jump buffer
    if (d.grounded) {
      d.coyote = 0.075;
    } else {
      d.coyote = Math.max(0, d.coyote - dt);
    }
    input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);

    // Execute buffered jump
    if (input.jumpBuffer > 0 && d.coyote > 0) {
      const foamPenalty = state.foamCount > 0 ? (1 - state.foamCount * 0.075) : 1;
      const jumpPower = 755 * foamPenalty;
      d.vy = -jumpPower * state.gravityDir;
      d.grounded = false;
      d.ducking = false;
      d.slamming = false;
      d.coyote = 0;
      input.jumpBuffer = 0;
      audio.playJump(state.foamCount > 0);

      // Jumping shakes off 1 Acoustic Foam wedge!
      if (state.foamCount > 0) {
        state.foamCount -= 1;
        if (state.foamCount === 0) state.foamTimer = 0;
        addBurst(d.x + 26, dinoCenterY(), '#71788c', 6, 0.85);
        addFloatingText(
          d.x + 30,
          dinoCenterY() - 32,
          state.foamCount === 0 ? 'FOAM CLEARED!' : `FOAM ×${state.foamCount}`,
          '#636e72',
          0.95
        );
      }
    }

    // Ducking state on ground
    if (d.grounded) {
      d.ducking = input.duckHeld;
    }

    // Vertical integration
    if (!d.grounded) {
      d.vy += 2380 * state.gravityDir * dt;
      d.y += d.vy * dt;

      const sY = surfaceY();
      const landed = state.gravityDir === 1 ? d.y >= sY : d.y <= sY;
      if (landed) {
        d.y = sY;
        d.vy = 0;
        d.grounded = true;

        if (d.slamming) {
          d.slamming = false;
          audio.playSlam();
          state.screenShake = Math.max(state.screenShake, 7);
          addBurst(d.x + 20, sY, '#b2bec3', 10, 0.85);

          // Smash latched Mute Drone!
          if (state.latchedDrone) {
            state.latchedDrone = null;
            changeVolume(6, 'recover');
            audio.playDroneSmash();
            addBurst(d.x + 18, dinoCenterY(), '#a55eea', 16, 1.25);
            addFloatingText(d.x + 30, dinoCenterY() - 28, 'DRONE SMASHED! +6%', '#2ed573', 1.15);
          }
        }
        d.ducking = input.duckHeld;
      }
    }

    // Purple rewind afterimages
    if (state.rewindTimer > 0 && Math.random() < 0.45) {
      d.afterimages.push({
        x: d.x,
        y: d.y,
        ducking: d.ducking,
        dir: state.gravityDir,
        life: 0.24
      });
    }
    for (let i = d.afterimages.length - 1; i >= 0; i--) {
      d.afterimages[i].x -= state.speed * 0.45 * dt;
      d.afterimages[i].life -= dt;
      if (d.afterimages[i].life <= 0) d.afterimages.splice(i, 1);
    }

    // ---- Update Scenery ----
    for (const cl of state.clouds) {
      cl.x -= state.speed * 0.14 * dt;
      if (cl.x < -80) {
        cl.x = STAGE_W + rand(30, 120);
        cl.y = rand(86, 165);
      }
    }
    for (const gd of state.groundDots) {
      gd.x -= state.speed * dt;
      if (gd.x < -12) gd.x += STAGE_W + 30;
    }
    for (const sl of state.speedLines) {
      sl.x -= state.speed * sl.sp * dt;
      if (sl.x + sl.len < 0) {
        sl.x = STAGE_W + rand(10, 90);
        sl.y = rand(HUD_H + 14, FLOOR_Y - 14);
      }
    }

    // Rising Evil Club crimson embers as volume / chaos intensifies
    const emberChance = state.speaker ? 0.55 : (state.nightAlpha > 0.3 ? 0.35 : (state.volume >= 45 ? ((state.volume - 40) / 140) : 0.04));
    if (Math.random() < emberChance) {
      state.particles.push({
        x: rand(20, STAGE_W - 20),
        y: FLOOR_Y - 2,
        vx: -rand(35, 95),
        vy: -rand(40, 115),
        size: rand(2, 4.5),
        color: Math.random() > 0.35 ? '#ff2e4c' : '#ff7b3b',
        life: rand(0.65, 1.35),
        maxLife: 1.35,
        gravity: -20
      });
    }

    // ---- Director Spawning ----
    updateDirector(dt);

    // ---- Update & Collide Obstacles ----
    const hb = dinoHitbox();

    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const ob = state.obstacles[i];

      if (ob.type === 'bird') {
        ob.flap += dt * 10;
        if (ob.state === 'incoming') {
          ob.x -= state.speed * 1.10 * dt;
          const birdHitBox = { x: ob.x + 4, y: ob.y + 3, w: ob.w - 8, h: ob.h - 6 };
          if (d.invuln <= 0 && aabb(hb, birdHitBox)) {
            // Pickpocket steals 9%!
            changeVolume(-ob.stolenAmount, 'damage');
            state.hitsTaken += 1;
            d.invuln = 0.72;
            d.hurtFace = 0.55;
            audio.playBirdSteal();
            addFloatingText(d.x + 28, dinoCenterY() - 24, `STOLEN -${ob.stolenAmount}%! JUMP TO BONK!`, '#ff4757', 1.0);

            // Visual stolen chunk flying from HUD bar to bird
            state.hudChunks.push({
              x: 155 + (clamp(state.volume, 0, 100) / 100) * Math.max(160, STAGE_W - 320),
              y: 30,
              tx: d.x + (IS_PORTRAIT_PHONE ? 105 : 135),
              ty: state.gravityDir === 1 ? FLOOR_Y - 118 : CEIL_Y + 118,
              t: 0,
              text: `-${ob.stolenAmount}%`,
              color: '#ff4757'
            });

            ob.state = 'fleeing';
            ob.fleeTimer = 2.35;
            ob.reclaimGrace = 0.18;
          }
        } else if (ob.state === 'fleeing') {
          ob.fleeTimer -= dt;
          ob.reclaimGrace = Math.max(0, ob.reclaimGrace - dt);
          const targetX = d.x + (IS_PORTRAIT_PHONE ? 105 : 135) + Math.sin(ob.flap * 0.7) * 18;
          const targetY = state.gravityDir === 1 ? FLOOR_Y - 120 : CEIL_Y + 90;
          ob.x = lerp(ob.x, targetX, Math.min(1, dt * 6.5));
          ob.y = lerp(ob.y, targetY + Math.sin(ob.flap) * 10, Math.min(1, dt * 6.5));

          // Reclaim by jumping into the fleeing bird! (allowed during i-frames)
          const bigBirdBox = { x: ob.x - 8, y: ob.y - 8, w: ob.w + 16, h: ob.h + 16 };
          if (ob.reclaimGrace <= 0 && aabb(hb, bigBirdBox)) {
            ob.state = 'bonked';
            ob.vx = 240;
            ob.vy = -300 * state.gravityDir;
            changeVolume(ob.stolenAmount, 'recover');
            audio.playBirdReclaim();
            addBurst(ob.x + 18, ob.y + 10, '#ffa502', 14, 1.1);
            addFloatingText(ob.x, ob.y - 12, `RECLAIMED +${ob.stolenAmount}%!`, '#2ed573', 1.15);
            state.hudChunks.push({
              x: ob.x,
              y: ob.y,
              tx: Math.min(260, STAGE_W * 0.44),
              ty: 30,
              t: 0,
              text: `+${ob.stolenAmount}%`,
              color: '#2ed573'
            });
          } else if (ob.fleeTimer <= 0) {
            ob.state = 'escaping';
            addFloatingText(ob.x, ob.y - 8, 'MINE! LOL', '#ff6b81', 0.95);
          }
        } else if (ob.state === 'escaping') {
          ob.x += 460 * dt;
          ob.y -= 130 * state.gravityDir * dt;
        } else if (ob.state === 'bonked') {
          ob.x += ob.vx * dt;
          ob.y += ob.vy * dt;
          ob.vy += 900 * state.gravityDir * dt;
        }

        if (ob.x < -80 || ob.x > STAGE_W + 100 || ob.y < -80 || ob.y > STAGE_H + 80) {
          state.obstacles.splice(i, 1);
        }
        continue;
      }

      if (ob.type === 'gate') {
        ob.x -= state.speed * dt;
        ob.pulse += dt * 8;
        if (!ob.triggered && ob.x < d.x + 22) {
          ob.triggered = true;
          state.gravityDir = -1;
          state.gravityFlipTimer = 4.8;
          state.gravityFlipReturnWarned = false;
          d.grounded = false;
          d.vy = -290;
          audio.playGravityFlip(true);
          showBanner('↑↓ CEILING GRAVITY FLIP!', '#00d2d3', 1.5);
          addBurst(d.x + 20, dinoCenterY(), '#00d2d3', 14, 1.1);
          // Clear any overlapping floor obstacle right behind gate for clean flip
          for (let j = state.obstacles.length - 1; j >= 0; j--) {
            const other = state.obstacles[j];
            if (other !== ob && other.x > d.x - 20 && other.x < d.x + 230) {
              state.obstacles.splice(j, 1);
              if (j < i) i--;
            }
          }
        }
        if (ob.x < -50) state.obstacles.splice(i, 1);
        continue;
      }

      // Standard moving obstacles (Tung charges slightly faster!)
      ob.x -= state.speed * (ob.type === 'tung' ? 1.08 : 1.0) * dt;

      if (ob.type === 'tung') {
        ob.phase += dt * 11;
        ob.tungPulse = Math.max(0, ob.tungPulse - dt * 2.4);
        const beat = Math.floor(ob.phase / Math.PI);
        if (beat > ob.knockCount) {
          ob.knockCount = beat;
          ob.tungPulse = 1.0;
          if (ob.x < STAGE_W && ob.x > 0) {
            audio.playTungWood();
          }
        }
      } else if (ob.type === 'potato') {
        ob.phase += dt * 5.2;
        ob.y = ob.baseY + Math.sin(ob.phase) * 11;
        if (ob.hasMoustache) {
          ob.rot = Math.sin(ob.phase * 0.7) * 0.14;
        } else {
          ob.rot += ob.rotSpeed * dt;
        }
        // Subtle blue/golden flying sparkle crumbs like the reference screenshot
        if (Math.random() < 0.24) {
          state.particles.push({
            x: ob.x + ob.w * 0.85,
            y: ob.y + ob.h * 0.5 + rand(-10, 10),
            vx: rand(20, 65),
            vy: rand(-20, 20),
            size: rand(2, 3.8),
            color: Math.random() > 0.4 ? '#9be7ff' : '#ffe899',
            life: 0.38,
            maxLife: 0.38,
            gravity: 0
          });
        }
      } else if (ob.type === 'drone') {
        ob.phase += dt * 6;
        ob.y = ob.baseY + Math.sin(ob.phase) * 14;
      } else if (ob.type === 'rewind') {
        ob.spin += dt * 11;
        ob.y = ob.baseY - Math.abs(Math.sin(ob.spin * 0.6)) * 12 * ob.dir;
      }

      // Clean dodge bonus! Surviving fast hazards actively boosts your volume
      if (!ob.hit && !ob.dodged && ob.x + ob.w < d.x) {
        ob.dodged = true;
        changeVolume(1.5, 'recover');
        audio.playDodgePop();
        addFloatingText(d.x + 18, dinoCenterY() - 26, '+1.5%', '#2ed573', 0.82);
      }

      // Slightly inset obstacle hitbox for fair near-misses
      const obHitBox = { x: ob.x + 3, y: ob.y + 3, w: Math.max(8, ob.w - 6), h: Math.max(8, ob.h - 6) };

      // Collision checks
      if (!ob.hit && aabb(hb, obHitBox)) {
        if (ob.type === 'tung') {
          // Check head-stomp (descending onto Tung's wooden top!)
          const stomping = state.gravityDir === 1
            ? (d.vy > 0 && hb.y + hb.h <= ob.y + 30)
            : (d.vy < 0 && hb.y >= ob.y + ob.h - 30);
          if (stomping) {
            ob.hit = true;
            d.vy = -540 * state.gravityDir;
            d.grounded = false;
            d.slamming = false;
            changeVolume(10, 'recover');
            audio.playTungStomp();
            state.screenShake = Math.max(state.screenShake, 6);
            addBurst(ob.x + ob.w * 0.5, ob.y + 12, '#df9d56', 16, 1.2);
            addFloatingText(ob.x + 20, ob.y - 12, 'TUNG NOISE +10%!', '#2ed573', 1.2);
            state.obstacles.splice(i, 1);
            continue;
          } else if (d.invuln <= 0) {
            ob.hit = true;
            changeVolume(-10, 'damage');
            state.hitsTaken += 1;
            d.invuln = 0.80;
            d.hurtFace = 0.70;
            d.grounded = false;
            d.vy = -420 * state.gravityDir;
            d.x = Math.max(46, d.x - 40);
            state.screenShake = Math.max(state.screenShake, 9);
            audio.playTungWhack();
            addBurst(ob.x + 12, dinoCenterY(), '#df9d56', 14, 1.2);
            addFloatingText(d.x + 30, dinoCenterY() - 28, 'TUNG WHACK! -10%', '#ff6b2b', 1.15);
          }
        } else if (ob.type === 'cactus' && d.invuln <= 0) {
          ob.hit = true;
          changeVolume(-6, 'damage');
          state.hitsTaken += 1;
          d.invuln = 0.75;
          d.hurtFace = 0.55;
          state.screenShake = Math.max(state.screenShake, 4);
          audio.playCactusSqueak();
          spawnVolumePellets(d.x + 24, dinoCenterY());
          addBurst(ob.x + ob.w * 0.5, ob.y + ob.h * 0.5, '#2ed573', 8, 0.9);
          addFloatingText(d.x + 24, dinoCenterY() - 24, 'SPILL -6%! CATCH!', '#ff6b6b', 1.0);
        } else if (ob.type === 'foam' && d.invuln <= 0) {
          ob.hit = true;
          changeVolume(-4, 'damage');
          state.hitsTaken += 1;
          d.invuln = 0.70;
          d.hurtFace = 0.45;
          state.foamCount = 2;
          state.foamTimer = 3.5;
          audio.playFoam();
          addBurst(ob.x + 17, ob.y + 24, '#636e72', 12, 1.0);
          addFloatingText(d.x + 24, dinoCenterY() - 24, 'MUFFLED -4%! JUMP ×2', '#57606f', 1.05);
          state.obstacles.splice(i, 1);
          continue;
        } else if (ob.type === 'potato' && d.invuln <= 0) {
          ob.hit = true;
          const penalty = ob.hasMoustache ? 10 : 6;
          changeVolume(-penalty, 'damage');
          state.hitsTaken += 1;
          d.invuln = 0.75;
          d.hurtFace = 0.55;
          audio.playPotatoHit(ob.hasMoustache);
          addBurst(ob.x + ob.w * 0.5, ob.y + ob.h * 0.5, '#ffd86b', 14, 1.05);
          if (ob.hasMoustache) {
            state.shushTimer = 1.6;
            spawnStickyNote(penalty);
            addFloatingText(d.x + 28, dinoCenterY() - 26, 'SIR SPUD SAYS SHH! -10%', '#e1b12c', 1.05);
          } else {
            addFloatingText(d.x + 28, dinoCenterY() - 26, 'POTATO\'D! -6%', '#f5a623', 1.05);
          }
          state.obstacles.splice(i, 1);
          continue;
        } else if (ob.type === 'drone' && !state.latchedDrone) {
          ob.hit = true;
          state.hitsTaken += 1;
          d.hurtFace = 0.5;
          state.latchedDrone = { timer: 2.2, pulse: 0 };
          audio.playDroneLatch();
          addFloatingText(d.x + 26, dinoCenterY() - 28, 'MUTE LATCHED! JUMP + ↓ SLAM!', '#a55eea', 1.05);
          state.obstacles.splice(i, 1);
          continue;
        } else if (ob.type === 'rewind' && d.invuln <= 0) {
          ob.hit = true;
          changeVolume(-3, 'damage');
          state.hitsTaken += 1;
          d.invuln = 0.72;
          d.hurtFace = 0.5;
          state.rewindTimer = 2.2;
          audio.playRewind();
          addBurst(ob.x + 18, ob.y + 13, '#9c88ff', 12, 1.0);
          addFloatingText(d.x + 24, dinoCenterY() - 24, '⏪ REWIND -3%!', '#8c7ae6', 1.05);
          state.obstacles.splice(i, 1);
          continue;
        }
      }

      if (ob.x + ob.w < -60) {
        state.obstacles.splice(i, 1);
      }
    }

    // ---- Update Bouncing Sonic-Ring Volume Pellets ----
    for (let i = state.pellets.length - 1; i >= 0; i--) {
      const p = state.pellets[i];
      p.life -= dt;
      p.pickupDelay = Math.max(0, p.pickupDelay - dt);
      p.x += (p.vx - state.speed * 0.42) * dt;
      p.vy += 1150 * state.gravityDir * dt;
      p.y += p.vy * dt;

      const sY = surfaceY();
      if (state.gravityDir === 1 && p.y + p.r > sY) {
        p.y = sY - p.r;
        p.vy = -Math.abs(p.vy) * 0.62;
        p.bounces += 1;
      } else if (state.gravityDir === -1 && p.y - p.r < sY) {
        p.y = sY + p.r;
        p.vy = Math.abs(p.vy) * 0.62;
        p.bounces += 1;
      }

      const pBox = { x: p.x - p.r - 4, y: p.y - p.r - 4, w: (p.r + 4) * 2, h: (p.r + 4) * 2 };
      if (p.pickupDelay <= 0 && aabb(hb, pBox)) {
        changeVolume(2, 'recover');
        audio.playPellet();
        addBurst(p.x, p.y, '#ffdd59', 6, 0.7);
        addFloatingText(p.x, p.y - 10, '+2%', '#2ed573', 0.9);
        state.pellets.splice(i, 1);
        continue;
      }

      if (p.life <= 0 || p.x < -30 || p.x > STAGE_W + 40) {
        state.pellets.splice(i, 1);
      }
    }

    // ---- Update Lock-On Rockets ----
    for (let i = state.rockets.length - 1; i >= 0; i--) {
      const r = state.rockets[i];
      if (r.phase === 'tracking') {
        r.timer -= dt;
        r.beepTimer -= dt;
        const desiredY = clamp(dinoCenterY(), CEIL_Y + 18, FLOOR_Y - 18);
        r.y = lerp(r.y, desiredY, Math.min(1, dt * 8));
        if (r.beepTimer <= 0) {
          audio.playRadarBeep(false);
          r.beepTimer = 0.22;
        }
        if (r.timer <= 0) {
          r.phase = 'locked';
          r.timer = 0.28;
          audio.playRadarBeep(true);
        }
      } else if (r.phase === 'locked') {
        r.timer -= dt;
        if (r.timer <= 0) {
          r.phase = 'firing';
          r.x = STAGE_W + 10;
          audio.playRocketLaunch();
        }
      } else if (r.phase === 'firing') {
        r.x += r.vx * dt;
        // Rocket exhaust trail
        if (Math.random() < 0.8) {
          state.particles.push({
            x: r.x + r.w,
            y: r.y + rand(-3, 3),
            vx: rand(60, 140),
            vy: rand(-25, 25),
            size: rand(3, 7),
            color: Math.random() > 0.45 ? '#ffa502' : '#dfe4ea',
            life: 0.24,
            maxLife: 0.24,
            gravity: 0
          });
        }

        const rBox = { x: r.x + 5, y: r.y - r.h * 0.5 + 3, w: r.w - 8, h: r.h - 6 };
        if (!r.hit && d.invuln <= 0 && aabb(hb, rBox)) {
          r.hit = true;
          changeVolume(-12, 'damage');
          state.hitsTaken += 1;
          state.rocketsEaten += 1;
          d.invuln = 0.85;
          d.hurtFace = 0.85;
          d.x = Math.max(42, d.x - 62);
          state.muffleTimer = 1.5;
          state.screenShake = 11;
          audio.playRocketBoom();
          addBurst(r.x + 12, r.y, '#ff4757', 20, 1.45);
          addBurst(r.x + 12, r.y, '#ffa502', 14, 1.15);
          addFloatingText(d.x + 36, dinoCenterY() - 28, 'BLOWOUT -12%!', '#ff3838', 1.2);
          state.rockets.splice(i, 1);
          continue;
        }

        if (!r.hit && !r.dodged && r.x + r.w < d.x) {
          r.dodged = true;
          changeVolume(2.0, 'recover');
          audio.playDodgePop();
          addFloatingText(d.x + 18, dinoCenterY() - 28, 'ROCKET DODGED +2%!', '#2ed573', 0.9);
        }

        if (r.x + r.w < -40) {
          state.rockets.splice(i, 1);
        }
      }
    }

    // ---- Update Giant Speaker Cannon & Sound Waves ----
    if (state.speaker) {
      const sp = state.speaker;
      if (!sp.exiting) {
        sp.x = lerp(sp.x, sp.targetX, Math.min(1, dt * 6));
        sp.timer -= dt;
        sp.fireTimer -= dt;
        if (sp.fireTimer <= 0 && sp.timer > 0.6) {
          if (sp.nextAttack === 'bass') {
            audio.playBassBlast();
            state.speakerWaves.push({
              kind: 'bass',
              x: sp.x - 12,
              y: FLOOR_Y - 56,
              w: 36,
              h: 56,
              vx: -450,
              hit: false
            });
            sp.nextAttack = 'treble';
          } else {
            audio.playRadarBeep(false);
            state.speakerWaves.push({
              kind: 'treble',
              phase: 'telegraph',
              timer: 0.62,
              y: FLOOR_Y - 62, // Standing head height; ducking dino (36px) fits cleanly underneath!
              h: 20,
              hit: false
            });
            sp.nextAttack = 'bass';
          }
          sp.fireTimer = 1.32;
        }
        if (sp.timer <= 0) sp.exiting = true;
      } else {
        sp.x += 260 * dt;
        if (sp.x > STAGE_W + 90) {
          state.speaker = null;
        }
      }
    }

    for (let i = state.speakerWaves.length - 1; i >= 0; i--) {
      const wv = state.speakerWaves[i];
      if (wv.kind === 'bass') {
        wv.x += wv.vx * dt;
        if (!wv.hit && d.invuln <= 0 && aabb(hb, wv)) {
          wv.hit = true;
          changeVolume(-9, 'damage');
          state.hitsTaken += 1;
          d.invuln = 0.72;
          d.hurtFace = 0.55;
          state.screenShake = 7;
          audio.playSlam();
          addBurst(d.x + 20, dinoCenterY(), '#ff6b35', 12, 1.0);
          addFloatingText(d.x + 28, dinoCenterY() - 24, 'BASS BLAST -9%!', '#ff6b35', 1.1);
        }
        if (wv.x + wv.w < -40) state.speakerWaves.splice(i, 1);
      } else {
        wv.timer -= dt;
        if (wv.phase === 'telegraph' && wv.timer <= 0) {
          wv.phase = 'active';
          wv.timer = 0.22;
          audio.playTrebleBeam();
          state.screenShake = Math.max(state.screenShake, 5);
        } else if (wv.phase === 'active') {
          const beamBox = { x: 0, y: wv.y, w: STAGE_W - 60, h: wv.h };
          if (!wv.hit && d.invuln <= 0 && aabb(hb, beamBox)) {
            wv.hit = true;
            changeVolume(-9, 'damage');
            state.hitsTaken += 1;
            d.invuln = 0.72;
            d.hurtFace = 0.55;
            addBurst(d.x + 20, wv.y + 8, '#00d2d3', 12, 1.0);
            addFloatingText(d.x + 28, dinoCenterY() - 24, 'TREBLE ZAP -9%!', '#00a8ff', 1.1);
          }
          if (wv.timer <= 0) state.speakerWaves.splice(i, 1);
        }
      }
    }

    // ---- Update Overtime +20% Overdrive Stars ----
    for (let i = state.stars.length - 1; i >= 0; i--) {
      const st = state.stars[i];
      st.x -= state.speed * 0.9 * dt;
      st.spin += dt * 6;
      const sBox = { x: st.x - st.r, y: st.y - st.r, w: st.r * 2, h: st.r * 2 };
      if (!st.collected && aabb(hb, sBox)) {
        st.collected = true;
        const amt = st.amount || 20;
        changeVolume(amt, 'recover');
        audio.playStarPickup();
        addBurst(st.x, st.y, '#ffdd59', amt >= 20 ? 20 : 12, 1.25);
        addFloatingText(st.x, st.y - 14, amt >= 20 ? `OVERDRIVE +${amt}%!` : `BOOST +${amt}%!`, '#f5a623', amt >= 20 ? 1.25 : 1.1);
        state.stars.splice(i, 1);
        continue;
      }
      if (st.x < -40) state.stars.splice(i, 1);
    }

    // ---- Update Particles, Floating Texts & HUD Chunks ----
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) state.floatingTexts.splice(i, 1);
    }

    for (let i = state.hudChunks.length - 1; i >= 0; i--) {
      const hc = state.hudChunks[i];
      hc.t += dt * 3.2;
      if (hc.t >= 1) state.hudChunks.splice(i, 1);
    }

    // ---- Update Audio Engine ----
    audio.update(dt, {
      running: true,
      volume: state.volume,
      elapsed: state.elapsed,
      muffleTimer: state.muffleTimer,
      foamCount: state.foamCount,
      shushTimer: state.shushTimer,
      rewindTimer: state.rewindTimer,
      braking: state.braking,
      brakeProgress: state.brakeProgress,
      latchedDrone: state.latchedDrone
    });

    // Dynamic bottom strip hint (kept concise so it never clips inside 800px)
    if (state.latchedDrone) {
      stripHintEl.textContent = '⚠ DRONE! JUMP + ↓ TO SLAM!';
    } else if (state.foamCount > 0) {
      stripHintEl.textContent = `FOAM ×${state.foamCount} — JUMP TO SHAKE!`;
    } else if (state.braking) {
      stripHintEl.textContent = `LOCKING ${Math.round(state.volume)}% — DODGE!`;
    } else if (state.volume >= 94) {
      stripHintEl.textContent = 'ALMOST 100%! PUSH!';
    } else {
      stripHintEl.textContent = '100% TO WIN · BRAKE TO LOCK';
    }
  }

  // ---- Pixel Sprite Drawing Helper ----
  function drawPixelMatrix(matrix, x, y, px, color, eyeColor, flipY, accentColor) {
    const rows = matrix.length;
    const cell = Math.ceil(px);
    for (let r = 0; r < rows; r++) {
      const rowStr = matrix[r];
      const drawRow = flipY ? (rows - 1 - r) : r;
      const ry = Math.round(y + drawRow * px);
      for (let c = 0; c < rowStr.length; c++) {
        const ch = rowStr[c];
        if (ch === '1') {
          ctx.fillStyle = color;
          ctx.fillRect(Math.round(x + c * px), ry, cell, cell);
        } else if (ch === '2') {
          ctx.fillStyle = eyeColor;
          ctx.fillRect(Math.round(x + c * px), ry, cell, cell);
        } else if (ch === '3') {
          ctx.fillStyle = accentColor || '#ff2e4c';
          ctx.fillRect(Math.round(x + c * px), ry, cell, cell);
        }
      }
    }
  }

  function drawCactus(ob, ink) {
    ctx.save();
    if (ob.dir === -1) {
      ctx.translate(ob.x + ob.w * 0.5, ob.y + ob.h * 0.5);
      ctx.scale(1, -1);
      ctx.translate(-(ob.x + ob.w * 0.5), -(ob.y + ob.h * 0.5));
    }
    ctx.fillStyle = ink;
    const x = Math.round(ob.x);
    const y = Math.round(ob.y);

    function drawSingle(sx, sy, sw, sh) {
      const stemW = Math.max(8, Math.round(sw * 0.42));
      const stemX = sx + Math.round((sw - stemW) / 2);
      ctx.fillRect(stemX, sy, stemW, sh);
      // Left arm
      ctx.fillRect(sx, sy + Math.round(sh * 0.28), Math.round(sw * 0.34), Math.round(sh * 0.24));
      ctx.fillRect(sx, sy + Math.round(sh * 0.44), Math.round(sw * 0.5), 5);
      // Right arm
      const rightX = sx + sw - Math.round(sw * 0.34);
      ctx.fillRect(rightX, sy + Math.round(sh * 0.16), Math.round(sw * 0.34), Math.round(sh * 0.28));
      ctx.fillRect(stemX + stemW - 2, sy + Math.round(sh * 0.36), Math.round(sw * 0.36), 5);
    }

    if (ob.variant === 'cluster') {
      drawSingle(x, y + 8, 28, ob.h - 8);
      drawSingle(x + 26, y, 32, ob.h);
    } else {
      drawSingle(x, y, ob.w, ob.h);
    }
    ctx.restore();
  }

  function drawStarShape(cx, cy, outerR, innerR, points, rot) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = rot + (i * Math.PI) / points;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // ---- Main Render ----
  function render() {
    // Evil Club palette: dusty crimson-rose day (#faf0f1) <-> Blood Moon obsidian (#140407)
    const na = state.nightAlpha;
    const bgR = Math.round(lerp(250, 20, na));
    const bgG = Math.round(lerp(240, 4, na));
    const bgB = Math.round(lerp(241, 7, na));
    const bgCol = `rgb(${bgR},${bgG},${bgB})`;

    const inkR = Math.round(lerp(51, 255, na));
    const inkG = Math.round(lerp(14, 224, na));
    const inkB = Math.round(lerp(21, 230, na));
    const inkCol = `rgb(${inkR},${inkG},${inkB})`;
    const mutedCol = na > 0.5 ? '#8f3042' : '#c79ba3';

    // Camera shake (rocket impacts + high-volume bass clipping beat thump!)
    let shakeX = 0;
    let shakeY = 0;
    const bassShake = (state.mode === 'playing' && (state.speaker || state.volume >= 76))
      ? audio.beatPulse * (state.speaker ? 4.2 : 2.2)
      : 0;
    const totalShake = state.screenShake + bassShake;
    if (totalShake > 0.2) {
      shakeX = rand(-totalShake, totalShake);
      shakeY = rand(-totalShake * 0.65, totalShake * 0.65);
    }

    ctx.setTransform(CANVAS_DPR, 0, 0, CANVAS_DPR, 0, 0);
    ctx.save();
    ctx.fillStyle = bgCol;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);

    // ---- Playfield Layer (with shake) ----
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, HUD_H, STAGE_W, STAGE_H - HUD_H - CONTROL_STRIP_H);
    ctx.clip();
    ctx.translate(shakeX, shakeY);

    // Subtle rising crimson heat vignette when volume >= 55%
    if (state.volume >= 55) {
      const heat = clamp((state.volume - 55) / 45, 0, 1);
      const heatGrad = ctx.createLinearGradient(0, FLOOR_Y, 0, HUD_H);
      heatGrad.addColorStop(0, `rgba(255, 34, 68, ${0.14 * heat})`);
      heatGrad.addColorStop(1, 'rgba(255, 34, 68, 0)');
      ctx.fillStyle = heatGrad;
      ctx.fillRect(0, HUD_H, STAGE_W, FLOOR_Y - HUD_H);
    }

    // Subtle Rewind / Muffle tint overlays
    if (state.rewindTimer > 0) {
      ctx.fillStyle = 'rgba(140, 122, 230, 0.12)';
      ctx.fillRect(0, HUD_H, STAGE_W, FLOOR_Y - HUD_H + 14);
    } else if (state.muffleTimer > 0) {
      ctx.fillStyle = 'rgba(255, 38, 70, 0.12)';
      ctx.fillRect(0, HUD_H, STAGE_W, FLOOR_Y - HUD_H + 14);
    }

    // Subtle Evil Club parallax jagged horizon ridge & watermark
    ctx.save();
    const ridgeOffset = (state.scrollX * 0.08) % 260;
    ctx.fillStyle = na > 0.5 ? 'rgba(130, 18, 38, 0.22)' : 'rgba(180, 32, 56, 0.07)';
    ctx.beginPath();
    ctx.moveTo(-260, FLOOR_Y);
    for (let rx = -ridgeOffset - 260; rx < STAGE_W + 260; rx += 260) {
      ctx.lineTo(rx + 40, FLOOR_Y - 34);
      ctx.lineTo(rx + 78, FLOOR_Y - 16);
      ctx.lineTo(rx + 122, FLOOR_Y - 64); // Evil lair spire peak
      ctx.lineTo(rx + 146, FLOOR_Y - 24);
      ctx.lineTo(rx + 195, FLOOR_Y - 46);
      ctx.lineTo(rx + 260, FLOOR_Y);
    }
    ctx.lineTo(STAGE_W + 260, FLOOR_Y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = na > 0.5 ? 'rgba(255, 46, 76, 0.11)' : 'rgba(184, 20, 47, 0.065)';
    ctx.font = '900 44px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EVIL CLUB', STAGE_W * 0.5, 224);
    ctx.textAlign = 'left';
    ctx.restore();

    // Blood Moon & Crimson Stars during Night Mode
    if (na > 0.08) {
      ctx.save();
      ctx.globalAlpha = na * 0.9;
      for (const st of state.bgStars) {
        const blink = 0.5 + 0.5 * Math.sin(state.elapsed * 4 + st.tw);
        ctx.fillStyle = st.tw > 3.1 ? '#ff4d6a' : '#ffe3e8';
        ctx.fillRect(st.x, st.y, st.r + blink * 0.8, st.r + blink * 0.8);
      }
      // Glowing Blood Moon
      const moonX = STAGE_W - 105;
      const moonY = HUD_H + 54;
      const moonGrad = ctx.createRadialGradient(moonX, moonY, 12, moonX, moonY, 54);
      moonGrad.addColorStop(0, 'rgba(255, 46, 76, 0.48)');
      moonGrad.addColorStop(1, 'rgba(255, 46, 76, 0)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 54, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff2e4c';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b8102b';
      ctx.beginPath();
      ctx.arc(moonX - 6, moonY - 5, 6, 0, Math.PI * 2);
      ctx.arc(moonX + 7, moonY + 7, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Smoky crimson-tinted clouds
    ctx.fillStyle = na > 0.5 ? 'rgba(255, 92, 118, 0.14)' : '#ebd4d8';
    for (const cl of state.clouds) {
      const s = cl.s;
      ctx.fillRect(cl.x, cl.y, 46 * s, 10 * s);
      ctx.fillRect(cl.x + 10 * s, cl.y - 7 * s, 26 * s, 9 * s);
    }

    // Dynamic speed streaks when sprinting fast!
    if (state.mode === 'playing' && state.speed > 440) {
      const streakAlpha = clamp((state.speed - 430) / 260, 0.08, 0.28);
      ctx.fillStyle = na > 0.5 ? `rgba(255, 92, 118, ${streakAlpha})` : `rgba(184, 20, 47, ${streakAlpha * 0.65})`;
      for (const sl of state.speedLines) {
        ctx.fillRect(sl.x, sl.y, sl.len, 2);
      }
    }

    // Approaching 100% EVIL Hazard Finish Ribbon teaser when >= 94%
    if (state.mode === 'playing' && state.volume >= 94) {
      const progress = clamp((state.volume - 94) / 6, 0, 1);
      const ribbonX = lerp(STAGE_W - 10, state.dino.x + 56, progress);
      ctx.save();
      ctx.globalAlpha = 0.30 + progress * 0.65;
      for (let ry = CEIL_Y; ry < FLOOR_Y; ry += 12) {
        ctx.fillStyle = (Math.floor(ry / 12) % 2 === 0) ? '#e01b39' : '#1c0509';
        ctx.fillRect(ribbonX, ry, 10, 12);
      }
      ctx.fillStyle = '#e01b39';
      ctx.font = '900 12px ui-monospace, monospace';
      ctx.fillText('100% EVIL', ribbonX - 24, CEIL_Y + 14);
      ctx.restore();
    }

    // Ceiling track line (prominent during Gravity Flip)
    if (state.gravityFlipTimer > 0) {
      ctx.strokeStyle = '#00d2d3';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, CEIL_Y);
      ctx.lineTo(STAGE_W, CEIL_Y);
      ctx.stroke();
    } else {
      ctx.strokeStyle = na > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, CEIL_Y);
      ctx.lineTo(STAGE_W, CEIL_Y);
      ctx.stroke();
    }

    // Floor horizon & pebbles
    ctx.strokeStyle = inkCol;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_Y);
    ctx.lineTo(STAGE_W, FLOOR_Y);
    ctx.stroke();

    ctx.fillStyle = mutedCol;
    for (const gd of state.groundDots) {
      ctx.fillRect(Math.round(gd.x), FLOOR_Y + gd.y, gd.w, 2);
    }

    // ---- Draw Obstacles ----
    for (const ob of state.obstacles) {
      if (ob.type === 'cactus') {
        drawCactus(ob, inkCol);
      } else if (ob.type === 'bird') {
        const frame = Math.floor(ob.flap) % 2 === 0 ? BIRD_A : BIRD_B;
        const birdColor = ob.state === 'fleeing' ? '#ff2e4c' : inkCol;
        ctx.save();
        if (ob.state === 'fleeing' || ob.state === 'escaping') {
          // Flip horizontally to face right while taunting/fleeing
          ctx.translate(ob.x + ob.w * 0.5, ob.y + ob.h * 0.5);
          ctx.scale(-1, 1);
          drawPixelMatrix(frame, -ob.w * 0.5, -ob.h * 0.5, 3.0, birdColor, bgCol, false);
        } else {
          drawPixelMatrix(frame, ob.x, ob.y, 3.0, birdColor, bgCol, false);
        }
        ctx.restore();

        // Stolen volume badge dangling from fleeing bird's beak!
        if (ob.state === 'fleeing') {
          ctx.fillStyle = '#e01b39';
          ctx.fillRect(ob.x + 14, ob.y + 24, 52, 22);
          ctx.fillStyle = '#fff';
          ctx.font = '900 14px ui-monospace, monospace';
          ctx.fillText(`-${ob.stolenAmount}%`, ob.x + 20, ob.y + 40);

          ctx.fillStyle = '#ffa502';
          ctx.font = '900 13px ui-monospace, monospace';
          ctx.fillText('BONK!', ob.x + 6, ob.y - 6);
        }
      } else if (ob.type === 'foam') {
        // Acoustic Studio Foam Wedges
        ctx.fillStyle = '#4b5263';
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        ctx.fillStyle = '#2f3542';
        for (let fy = ob.y + 5; fy < ob.y + ob.h - 5; fy += 12) {
          ctx.beginPath();
          ctx.moveTo(ob.x, fy);
          ctx.lineTo(ob.x + 13, fy + 6);
          ctx.lineTo(ob.x, fy + 12);
          ctx.fill();
        }
        ctx.strokeStyle = '#747d8c';
        ctx.lineWidth = 2;
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
        ctx.fillStyle = '#dfe4ea';
        ctx.font = '900 12px ui-monospace, monospace';
        ctx.fillText('FOAM', ob.x + 6, ob.y + ob.h * 0.5 + 4);
      } else if (ob.type === 'potato') {
        // Flying Cute / Moustached Potato (vector gradient + spots + glossy eyes + handlebar moustache!)
        const cx = ob.x + ob.w * 0.5;
        const cy = ob.y + ob.h * 0.5;
        const rx = ob.w * 0.5;
        const ry = ob.h * 0.5;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ob.rot);

        // Warm golden toasted potato gradient
        const grad = ctx.createRadialGradient(-rx * 0.28, -ry * 0.28, rx * 0.12, 0, 0, rx * 1.1);
        grad.addColorStop(0, '#fff3b8');
        grad.addColorStop(0.55, '#f7c152');
        grad.addColorStop(1, '#d17b24');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#75380b';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Potato skin dimples / freckles
        ctx.fillStyle = 'rgba(179, 98, 22, 0.52)';
        for (const sp of ob.spots) {
          ctx.beginPath();
          ctx.arc(sp.dx * ob.w, sp.dy * ob.h, sp.r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Glossy oval eyes + white highlights
        const eyeX = ob.hasMoustache ? 6.5 : 5.0;
        const eyeY = ob.hasMoustache ? -4.0 : -2.5;
        const eyeRx = ob.hasMoustache ? 3.2 : 2.6;
        const eyeRy = ob.hasMoustache ? 4.2 : 3.4;

        for (const side of [-1, 1]) {
          ctx.fillStyle = '#1c0c04';
          ctx.beginPath();
          ctx.ellipse(side * eyeX, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(side * eyeX - 1.0, eyeY - 1.3, 1.15, 0, Math.PI * 2);
          ctx.fill();
        }

        // Handlebar moustache (for ~45% Sir Spuds) + tiny mouth
        if (ob.hasMoustache) {
          ctx.fillStyle = '#6e3512';
          ctx.strokeStyle = '#3d1904';
          ctx.lineWidth = 1.4;
          for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(0, 1.5);
            ctx.bezierCurveTo(side * 5, -2.5, side * 12, 4.5, side * 16.5, 0);
            ctx.bezierCurveTo(side * 18.5, -2.0, side * 16.5, 6.2, side * 11, 6.5);
            ctx.bezierCurveTo(side * 6, 6.8, side * 2.5, 3.8, 0, 4.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          // Tiny mouth dot below moustache
          ctx.fillStyle = '#4f2208';
          ctx.fillRect(-1.8, 7.5, 3.6, 1.8);
        } else {
          // Cute little oval mouth
          ctx.fillStyle = '#4f2208';
          ctx.beginPath();
          ctx.ellipse(0, 3.5, 2.2, 1.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      } else if (ob.type === 'tung') {
        // Tung Tung Tung Sahur: wooden log cylinder guy with huge staring eyes, grin, big feet & swinging bat!
        ctx.save();
        const cx = ob.x + ob.w * 0.5;
        const cy = ob.y + ob.h * 0.5;
        ctx.translate(cx, cy);
        if (ob.dir === -1) ctx.scale(1, -1);

        const stride = Math.sin(ob.phase) * 7;
        const swing = Math.sin(ob.phase * 0.9);
        const bodyW = 28;
        const bodyH = 44;
        const bodyX = -bodyW * 0.5;
        const bodyY = -ob.h * 0.5 + 2;

        // Ground-bang "TUNG!" shockwave ring on bat strike
        if (ob.tungPulse > 0.05) {
          ctx.save();
          ctx.globalAlpha = ob.tungPulse * 0.85;
          ctx.strokeStyle = '#ff6b2b';
          ctx.lineWidth = 2.5;
          const ringR = (1 - ob.tungPulse) * 26 + 8;
          ctx.beginPath();
          ctx.ellipse(-18, ob.h * 0.5 - 2, ringR, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = '900 11px ui-monospace, monospace';
          ctx.fillStyle = '#c2410c';
          ctx.textAlign = 'center';
          ctx.fillText('TUNG!', -18, bodyY - 5);
          ctx.restore();
        }

        // Skinny legs & oversized bare feet
        ctx.strokeStyle = '#8c4a1c';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, bodyY + bodyH - 2);
        ctx.lineTo(-6 - stride * 0.7, ob.h * 0.5 - 3);
        ctx.moveTo(6, bodyY + bodyH - 2);
        ctx.lineTo(6 + stride * 0.7, ob.h * 0.5 - 3);
        ctx.stroke();

        ctx.fillStyle = '#c47b45';
        ctx.strokeStyle = '#4a2208';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(-9 - stride * 0.7, ob.h * 0.5 - 2, 7.5, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(3 + stride * 0.7, ob.h * 0.5 - 2, 7.5, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cylindrical wooden log body
        const woodGrad = ctx.createLinearGradient(bodyX, 0, bodyX + bodyW, 0);
        woodGrad.addColorStop(0, '#e39e5d');
        woodGrad.addColorStop(0.55, '#c47234');
        woodGrad.addColorStop(1, '#8c4416');
        ctx.fillStyle = woodGrad;
        ctx.strokeStyle = '#421d06';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(bodyX, bodyY, bodyW, bodyH, [12, 12, 5, 5]);
        ctx.fill();
        ctx.stroke();

        // Subtle wood-grain vertical lines
        ctx.strokeStyle = 'rgba(70, 28, 6, 0.30)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, bodyY + 26);
        ctx.lineTo(-6, bodyY + bodyH - 4);
        ctx.moveTo(7, bodyY + 28);
        ctx.lineTo(7, bodyY + bodyH - 4);
        ctx.stroke();

        // Huge staring round meme eyes!
        for (const side of [-1, 1]) {
          const ex = side * 6.2;
          const ey = bodyY + 13;
          ctx.fillStyle = '#5c290a';
          ctx.beginPath();
          ctx.arc(ex, ey, 6.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex, ey, 5.0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#291003';
          ctx.beginPath();
          ctx.arc(ex - 0.6, ey + 0.3, 2.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - 1.5, ey - 1.2, 1.0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Nose & wide cheeky grin
        ctx.fillStyle = '#853c11';
        ctx.beginPath();
        ctx.ellipse(0, bodyY + 18, 2.2, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#4a1b06';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, bodyY + 21, 7.2, 0.15, Math.PI - 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Front skinny arm + swinging wooden baseball bat!
        ctx.save();
        ctx.translate(bodyX + 2, bodyY + 27);
        ctx.rotate(-0.45 + swing * 0.65);
        ctx.strokeStyle = '#8c4a1c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-9, 10);
        ctx.stroke();

        // Baseball bat tapering out from hand
        ctx.fillStyle = '#dea059';
        ctx.strokeStyle = '#4a2208';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-9, 10);
        ctx.lineTo(-27, 25);
        ctx.lineTo(-22, 30);
        ctx.lineTo(-7, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      } else if (ob.type === 'drone') {
        // Mute Vacuum Quadcopter Drone
        ctx.fillStyle = '#2f3542';
        ctx.fillRect(ob.x + 5, ob.y + 8, ob.w - 10, ob.h - 10);
        ctx.strokeStyle = '#a55eea';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(ob.x + 5, ob.y + 8, ob.w - 10, ob.h - 10);
        // Spinning rotors
        const rotorW = 14 + Math.sin(state.elapsed * 45) * 5;
        ctx.fillStyle = '#a55eea';
        ctx.fillRect(ob.x + 6 - rotorW * 0.5, ob.y, rotorW, 4);
        ctx.fillRect(ob.x + ob.w - 6 - rotorW * 0.5, ob.y, rotorW, 4);
        ctx.font = '21px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔇', ob.x + ob.w * 0.5, ob.y + 30);
        ctx.textAlign = 'left';
      } else if (ob.type === 'rewind') {
        // Retro Cassette Rewind Tape
        ctx.fillStyle = '#6c5ce7';
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        ctx.strokeStyle = '#2d1e7a';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
        ctx.fillStyle = '#fff';
        ctx.fillRect(ob.x + 5, ob.y + 5, ob.w - 10, 12);
        // Reels
        ctx.fillStyle = '#2d1e7a';
        ctx.beginPath();
        ctx.arc(ob.x + 14, ob.y + 24, 5, 0, Math.PI * 2);
        ctx.arc(ob.x + ob.w - 14, ob.y + 24, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2d1e7a';
        ctx.font = 'bold 12px ui-monospace, monospace';
        ctx.fillText('⏪', ob.x + 15, ob.y + 15);
      } else if (ob.type === 'gate') {
        // Shimmering Gravity Flip Portal
        const grad = ctx.createLinearGradient(ob.x, ob.y, ob.x + ob.w, ob.y + ob.h);
        grad.addColorStop(0, 'rgba(0, 210, 211, 0.72)');
        grad.addColorStop(0.5, 'rgba(255, 46, 76, 0.62)');
        grad.addColorStop(1, 'rgba(0, 210, 211, 0.72)');
        ctx.fillStyle = grad;
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        ctx.strokeStyle = '#00d2d3';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
        ctx.fillStyle = '#fff';
        ctx.font = '900 18px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('↑↓', ob.x + ob.w * 0.5, ob.y + ob.h * 0.5 - 8);
        ctx.font = '900 12px ui-monospace, monospace';
        ctx.fillText('FLIP', ob.x + ob.w * 0.5, ob.y + ob.h * 0.5 + 12);
        ctx.textAlign = 'left';
      }
    }

    // ---- Draw Bouncing Volume Pellets ----
    for (const p of state.pellets) {
      const blink = p.life < 0.55 && Math.floor(p.life * 18) % 2 === 0;
      if (blink) continue;
      ctx.fillStyle = '#ffdd59';
      ctx.strokeStyle = '#d35400';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2d3436';
      ctx.font = '900 13px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('+', p.x, p.y + 4.5);
      ctx.textAlign = 'left';
    }

    // ---- Draw Floating Boost & Overdrive Stars ----
    for (const st of state.stars) {
      const amt = st.amount || 20;
      ctx.save();
      drawStarShape(st.x, st.y, st.r, st.r * 0.50, 5, st.spin);
      ctx.fillStyle = amt >= 20 ? '#ffdd59' : '#ffeaa7';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = amt >= 20 ? '#e67e22' : '#ff6b2b';
      ctx.stroke();
      ctx.fillStyle = '#1e272e';
      ctx.font = '900 12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`+${amt}`, st.x, st.y + 4.5);
      ctx.restore();
    }

    // ---- Draw Lock-On Rockets & Reticles ----
    for (const r of state.rockets) {
      if (r.phase === 'tracking' || r.phase === 'locked') {
        const locked = r.phase === 'locked';
        // Laser sight line across stage
        ctx.save();
        ctx.strokeStyle = locked ? 'rgba(255, 46, 76, 0.90)' : 'rgba(255, 71, 87, 0.50)';
        ctx.lineWidth = locked ? 3 : 2;
        ctx.setLineDash(locked ? [] : [8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, r.y);
        ctx.lineTo(STAGE_W - 38, r.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Right-edge warning reticle box
        const boxX = STAGE_W - 44;
        const boxY = r.y - 21;
        ctx.fillStyle = locked ? '#e01b39' : '#ff526b';
        ctx.fillRect(boxX, boxY, 38, 42);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(boxX, boxY, 38, 42);
        ctx.fillStyle = '#fff';
        ctx.font = '900 24px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', boxX + 19, r.y + 8);
        if (locked) {
          ctx.font = '900 13px ui-monospace, monospace';
          ctx.fillStyle = '#ff2e4c';
          ctx.fillText('LOCK', boxX - 24, r.y + 5);
        }
        ctx.restore();
      } else if (r.phase === 'firing') {
        // Chunky pixel rocket missile
        const rx = Math.round(r.x);
        const ry = Math.round(r.y - r.h * 0.5);
        // Nose cone
        ctx.fillStyle = '#e01b39';
        ctx.beginPath();
        ctx.moveTo(rx, r.y);
        ctx.lineTo(rx + 16, ry);
        ctx.lineTo(rx + 16, ry + r.h);
        ctx.closePath();
        ctx.fill();
        // Body
        ctx.fillStyle = '#f7f1f2';
        ctx.fillRect(rx + 16, ry + 1, r.w - 22, r.h - 2);
        ctx.strokeStyle = '#24090e';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx + 16, ry + 1, r.w - 22, r.h - 2);
        // Stripes & fins
        ctx.fillStyle = '#e01b39';
        ctx.fillRect(rx + 26, ry + 2, 8, r.h - 4);
        ctx.fillRect(rx + r.w - 10, ry - 5, 10, 6);
        ctx.fillRect(rx + r.w - 10, ry + r.h - 1, 10, 6);
        // Thruster flame
        ctx.fillStyle = Math.random() > 0.4 ? '#ff6b2b' : '#ffdd59';
        ctx.fillRect(rx + r.w - 4, ry + 5, rand(12, 22), r.h - 10);
      }
    }

    // ---- Draw Giant Speaker Cannon & Sound Waves ----
    for (const wv of state.speakerWaves) {
      if (wv.kind === 'bass') {
        // Pulsing orange-red Bass Arcs ")))"
        ctx.save();
        ctx.strokeStyle = '#ff5e2b';
        ctx.lineWidth = 5;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(wv.x + 30 - k * 10, wv.y + wv.h * 0.5, 13 + k * 7.5, Math.PI * 0.65, Math.PI * 1.35);
          ctx.stroke();
        }
        ctx.restore();
      } else if (wv.kind === 'treble') {
        if (wv.phase === 'telegraph') {
          ctx.save();
          ctx.strokeStyle = 'rgba(0, 210, 211, 0.84)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([9, 6]);
          ctx.beginPath();
          ctx.moveTo(0, wv.y + wv.h * 0.5);
          ctx.lineTo(STAGE_W - 72, wv.y + wv.h * 0.5);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#00a8ff';
          ctx.font = '900 14px ui-monospace, monospace';
          ctx.fillText('▼ DUCK TREBLE!', STAGE_W * 0.34, wv.y - 8);
          ctx.restore();
        } else {
          ctx.fillStyle = 'rgba(0, 210, 211, 0.90)';
          ctx.fillRect(0, wv.y, STAGE_W - 70, wv.h);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, wv.y + 6, STAGE_W - 70, wv.h - 12);
        }
      }
    }

    if (state.speaker) {
      const sp = state.speaker;
      const pulse = audio.beatPulse * 7;
      const sy = FLOOR_Y - 144;
      ctx.save();
      ctx.fillStyle = '#1f080d';
      ctx.strokeStyle = '#ff2e4c';
      ctx.lineWidth = 3;
      ctx.fillRect(sp.x, sy, 70, 142);
      ctx.strokeRect(sp.x, sy, 70, 142);
      // Tweeter
      ctx.fillStyle = '#00d2d3';
      ctx.beginPath();
      ctx.arc(sp.x + 35, sy + 32, 13 + pulse * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#140407';
      ctx.beginPath();
      ctx.arc(sp.x + 35, sy + 32, 6, 0, Math.PI * 2);
      ctx.fill();
      // Main subwoofer cone
      ctx.fillStyle = '#ff2e4c';
      ctx.beginPath();
      ctx.arc(sp.x + 35, sy + 96, 25 + pulse * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#140407';
      ctx.beginPath();
      ctx.arc(sp.x + 35, sy + 96, 12 + pulse * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ---- Draw Dino Afterimages (Rewind Curse) ----
    const d = state.dino;
    for (const img of d.afterimages) {
      ctx.save();
      ctx.globalAlpha = img.life * 2.1;
      const mat = img.ducking ? DINO_DUCK_A : DINO_STAND_A;
      const px = 2.95;
      const h = mat.length * px;
      const drawY = img.dir === 1 ? img.y - h : img.y;
      drawPixelMatrix(mat, img.x, drawY, px, '#8c7ae6', bgCol, img.dir === -1, '#ff4d6a');
      ctx.restore();
    }

    // ---- Draw Immortal Evil Club Dino (with crimson devil horns + glowing red eye!) ----
    const blinkSkip = d.invuln > 0 && Math.floor(d.invuln * 22) % 2 === 0;
    if (!blinkSkip) {
      const stepFrame = Math.floor(d.runAnim) % 2 === 0;
      const isDuck = d.ducking && d.grounded;
      const mat = isDuck
        ? (stepFrame ? DINO_DUCK_A : DINO_DUCK_B)
        : (stepFrame ? DINO_STAND_A : DINO_STAND_B);
      const px = 3.0;
      const spriteH = mat.length * px;
      const drawY = state.gravityDir === 1 ? d.y - spriteH : d.y;
      const dinoCol = state.braking ? '#ff5e2b' : (d.hurtFace > 0 ? '#e01b39' : inkCol);
      const eyeCol = d.hurtFace > 0 ? '#ffffff' : '#ff2e4c';
      const hornCol = state.braking ? '#ffdd59' : '#ff2e4c';

      drawPixelMatrix(mat, d.x, drawY, px, dinoCol, eyeCol, state.gravityDir === -1, hornCol);

      // Attached Acoustic Foam wedges on dino's back
      if (state.foamCount > 0) {
        ctx.fillStyle = '#57606f';
        for (let k = 0; k < state.foamCount; k++) {
          const fx = d.x + 8 + k * 12;
          const fy = state.gravityDir === 1 ? drawY + 20 + (k % 2) * 6 : drawY + 24 + (k % 2) * 6;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + 12, fy + 5);
          ctx.lineTo(fx + 3, fy + 13);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Latched Mute Vacuum Drone + Suction Beam pulling from Top HUD!
      if (state.latchedDrone) {
        const dx = d.x + 12;
        const dy = state.gravityDir === 1 ? drawY - 22 : drawY + spriteH + 4;
        // Crackling suction beam from HUD Volume bar straight into drone
        ctx.save();
        ctx.strokeStyle = 'rgba(165, 94, 234, 0.82)';
        ctx.lineWidth = 3.5 + Math.sin(state.latchedDrone.pulse) * 1.5;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(dx + 18, dy + 8);
        ctx.lineTo(Math.min(260, STAGE_W * 0.44), HUD_H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Drone body on dino's back
        ctx.fillStyle = '#2f3542';
        ctx.fillRect(dx, dy, 36, 24);
        ctx.strokeStyle = '#a55eea';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(dx, dy, 36, 24);
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔇', dx + 18, dy + 18);
        ctx.fillStyle = '#a55eea';
        ctx.font = '900 13px ui-monospace, monospace';
        ctx.fillText('SLAM ↓!', dx + 18, dy - 7);
        ctx.restore();
      }
    }

    // ---- Draw Particles & Floating Texts ----
    for (const p of state.particles) {
      ctx.save();
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      ctx.restore();
    }

    for (const ft of state.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = clamp(ft.life / ft.maxLife, 0, 1);
      ctx.font = `900 ${Math.round(16 * ft.scale)}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = na > 0.5 ? '#12131f' : '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // ---- Center-Top Phase Alert Banner ----
    if (state.banner) {
      const b = state.banner;
      const alpha = clamp(b.timer * 2.5, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${IS_PORTRAIT_PHONE ? 16 : 18}px ui-monospace, Menlo, monospace`;
      const tw = ctx.measureText(b.text).width + 32;
      const bx = (STAGE_W - tw) * 0.5;
      const by = HUD_H + 14;
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, by, tw, 34);
      ctx.strokeStyle = '#181928';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(bx, by, tw, 34);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(b.text, STAGE_W * 0.5, by + 23);
      ctx.restore();
    }

    // ---- Active Debuff Badges (Top-Left below HUD) ----
    const badges = [];
    if (state.foamCount > 0) badges.push({ label: `FOAM ×${state.foamCount} (JUMP!)`, bg: '#57606f' });
    if (state.shushTimer > 0) badges.push({ label: `SHUSHED ${state.shushTimer.toFixed(1)}s`, bg: '#d4a017' });
    if (state.rewindTimer > 0) badges.push({ label: `⏪ REWIND ${state.rewindTimer.toFixed(1)}s`, bg: '#6c5ce7' });
    if (state.muffleTimer > 0) badges.push({ label: `MUFFLED ${state.muffleTimer.toFixed(1)}s`, bg: '#ff4757' });
    if (state.gravityFlipTimer > 0) badges.push({ label: `↑↓ FLIP ${state.gravityFlipTimer.toFixed(1)}s`, bg: '#00a8a8' });

    if (badges.length > 0) {
      let bx = 12;
      const by = HUD_H + 10;
      ctx.font = '900 13px ui-monospace, monospace';
      for (const bd of badges) {
        const bw = ctx.measureText(bd.label).width + 18;
        ctx.fillStyle = bd.bg;
        ctx.fillRect(bx, by, bw, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(bd.label, bx + 9, by + 17);
        bx += bw + 7;
      }
    }

    ctx.restore(); // End Playfield clip

    // ---- Top HUD Bar ----
    drawHud(na);

    // ---- Flying Stolen/Reclaimed Volume Chunks (above HUD & playfield) ----
    for (const hc of state.hudChunks) {
      const cx = lerp(hc.x, hc.tx, hc.t);
      const cy = lerp(hc.y, hc.ty, hc.t) - Math.sin(hc.t * Math.PI) * 34;
      ctx.save();
      ctx.fillStyle = hc.color;
      ctx.fillRect(cx - 26, cy - 12, 52, 24);
      ctx.fillStyle = '#fff';
      ctx.font = '900 14px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hc.text, cx, cy + 5);
      ctx.restore();
    }

    // ---- Victory Confetti ----
    if (state.mode === 'finished' && state.finishConfetti.length > 0) {
      for (const c of state.finishConfetti) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w * 0.5, -c.h * 0.5, c.w, c.h);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function drawHud(na) {
    const hudBg = na > 0.5 ? '#120407' : '#1a080c';
    ctx.fillStyle = hudBg;
    ctx.fillRect(0, 0, STAGE_W, HUD_H);
    ctx.fillStyle = '#5c1623';
    ctx.fillRect(0, HUD_H - 2, STAGE_W, 2);

    const hShakeX = state.hudShake > 0.2 ? rand(-state.hudShake, state.hudShake) : 0;
    const hShakeY = state.hudShake > 0.2 ? rand(-state.hudShake * 0.4, state.hudShake * 0.4) : 0;

    ctx.save();
    ctx.translate(hShakeX, hShakeY);

    const volInt = Math.round(state.volume);
    const isSubMute = volInt < 0;

    // Speaker icon
    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#ffffff';
    const spk = isSubMute ? '🕳️' : volInt === 0 ? '🔇' : volInt < 35 ? '🔈' : volInt < 70 ? '🔉' : '🔊';
    ctx.fillText(spk, 10, 46);

    // Big bold Volume percentage
    ctx.font = `900 ${IS_PORTRAIT_PHONE ? 36 : 40}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.fillStyle = isSubMute ? '#ff4d6a' : volInt >= 90 ? '#ff6b2b' : '#fff0f2';
    ctx.fillText(`${volInt}%`, 48, 48);

    // Volume Bar Track (adapts cleanly between 800px desktop and 520px portrait phone)
    const barX = IS_PORTRAIT_PHONE ? 148 : 162;
    const rightColW = IS_PORTRAIT_PHONE ? 132 : 154;
    const barY = 14;
    const barW = STAGE_W - barX - rightColW;
    const barH = 32;

    ctx.fillStyle = '#2e0e15';
    ctx.fillRect(barX, barY, barW, barH);

    // Sub-mute warning or Evil Club crimson-lava progress fill
    if (state.visualVolume < 0) {
      const subFrac = clamp(Math.abs(state.visualVolume) / 15, 0, 1);
      ctx.fillStyle = '#9e1129';
      ctx.fillRect(barX, barY, Math.max(10, barW * 0.30 * subFrac), barH);
      ctx.fillStyle = '#ff9aa8';
      ctx.font = `900 ${IS_PORTRAIT_PHONE ? 11 : 13}px ui-monospace, monospace`;
      ctx.fillText(IS_PORTRAIT_PHONE ? 'SUB-MUTE NOISE' : 'SUB-MUTE: ABSORBING NOISE', barX + 10, barY + 21);
    } else {
      const fillW = (clamp(state.visualVolume, 0, 100) / 100) * barW;
      const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      barGrad.addColorStop(0, '#a6142e');
      barGrad.addColorStop(0.5, '#ff2e4c');
      barGrad.addColorStop(0.85, '#ff6b2b');
      barGrad.addColorStop(1, '#ffdd59');
      ctx.fillStyle = state.rewindTimer > 0 ? '#8c7ae6' : barGrad;
      ctx.fillRect(barX, barY, fillW, barH);

      // Elastic tension zone highlight (95%..100%)
      const z95 = barX + barW * 0.95;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(z95, barY, barW * 0.05, barH);
    }

    // Tick marks at 25%, 50%, 75%
    ctx.fillStyle = 'rgba(255, 220, 226, 0.32)';
    for (const mark of [0.25, 0.5, 0.75]) {
      ctx.fillRect(barX + Math.round(barW * mark), barY, 2, barH);
    }

    // HUD hit/reclaim flash outline
    ctx.strokeStyle = state.hudFlash > 0 ? state.hudFlashColor : '#802032';
    ctx.lineWidth = state.hudFlash > 0 ? 3.5 : 2.5;
    ctx.strokeRect(barX, barY, barW, barH);

    // Clear bar labels underneath
    ctx.fillStyle = '#d4909c';
    ctx.font = '800 11px ui-monospace, monospace';
    ctx.fillText('0%', barX, barY + barH + 14);
    ctx.fillStyle = '#ff6b81';
    ctx.fillText(IS_PORTRAIT_PHONE ? '50%' : '50% ROCKETS', barX + barW * 0.5 - (IS_PORTRAIT_PHONE ? 10 : 38), barY + barH + 14);
    ctx.fillStyle = '#d4909c';
    ctx.fillText('100%', barX + barW - 28, barY + barH + 14);

    ctx.restore();

    // Right side: Elapsed Timer + Phase Pill
    const mins = Math.floor(state.elapsed / 60);
    const secs = (state.elapsed % 60).toFixed(1).padStart(4, '0');
    ctx.font = `900 ${IS_PORTRAIT_PHONE ? 24 : 27}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.fillStyle = '#fff0f2';
    ctx.textAlign = 'right';
    ctx.fillText(`${mins}:${secs}`, STAGE_W - 12, 33);

    const phase = getPhaseLabel(state.elapsed);
    ctx.font = `900 ${IS_PORTRAIT_PHONE ? 12 : 13}px ui-monospace, monospace`;
    const pillW = Math.max(IS_PORTRAIT_PHONE ? 104 : 120, ctx.measureText(phase).width + 18);
    const pillX = STAGE_W - 12 - pillW;
    ctx.fillStyle = phase === 'ROCKET LOCK' || phase === 'FINAL TORMENT'
      ? '#c91432'
      : phase === 'GRAVITY FLIP'
        ? '#8f1548'
        : phase === 'BASS CLIPPING'
          ? '#d64515'
          : phase === 'OVERTIME'
            ? '#b86814'
            : '#4a1420';
    ctx.fillRect(pillX, 40, pillW, 22);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(phase, pillX + pillW * 0.5, 55);
    ctx.textAlign = 'left';
  }

  // ---- Animation Loop ----
  let lastTs = performance.now();
  function loop(ts) {
    const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
    lastTs = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
