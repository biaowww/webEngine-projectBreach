// MobileUtil.js — mobile detection and touch-drag helpers for all scenes
//
// Usage in a Phaser scene:
//   MobileUtil.enableCameraDrag(this, { centerX: 390, centerY: 310 });
//   MobileUtil.onTap(this, circle, () => { /* navigate */ });

const MobileUtil = {

  // ── Detection ──────────────────────────────────────────────────────────

  isMobile() {
    return ('ontouchstart' in window) ||
           !!(window.matchMedia && window.matchMedia('(max-width: 1024px)').matches);
  },

  isPortrait() {
    return !!(window.matchMedia && window.matchMedia('(orientation: portrait)').matches);
  },

  isMobilePortrait() {
    return this.isMobile() && this.isPortrait();
  },

  // ── Camera zoom + drag-to-pan for "map / city / info" scenes ──────────────

  /**
   * On mobile-portrait: zoom in so that 1 game-pixel ≈ 1 CSS-pixel
   * (making text/nodes large and finger-tap-friendly), then clamp the camera
   * within the world and let the user drag to explore the rest.
   *
   * On desktop / landscape the call is a no-op for zoom; drag-to-pan is
   * still wired up in case the user mouse-drags on a large monitor.
   *
   * @param {Phaser.Scene} scene  – the scene to augment
   * @param {object}       opts
   *   centerX {number} initial camera focus X in game units (default 440)
   *   centerY {number} initial camera focus Y in game units (default 345)
   *   worldW  {number} world / scroll boundary width  (default 880)
   *   worldH  {number} world / scroll boundary height (default 690)
   */
  enableCameraDrag(scene, { centerX = 440, centerY = 345, worldW = 880, worldH = 690 } = {}) {
    const cam = scene.cameras.main;

    if (this.isMobilePortrait()) {
      // Phaser's Scale.FIT already scales the canvas to fit viewport width.
      // We undo that compression with camera zoom → 1 game-unit ≈ 1 CSS-pixel.
      const displayW = scene.scale.displaySize.width || scene.scale.width;
      const zoom     = scene.scale.width / displayW;   // e.g. 880/390 ≈ 2.26
      cam.setZoom(Math.max(1, zoom));
      cam.setBounds(0, 0, worldW, worldH);
      cam.centerOn(centerX, centerY);
    }

    // ── Drag-to-pan (touch + mouse) ────────────────────────────────────
    let startX = 0, startY = 0;
    scene._mapPanActive = false;
    const THRESHOLD = 10; // canvas-pixels before gesture counts as a pan

    scene.input.on('pointerdown', (ptr) => {
      startX = ptr.x;
      startY = ptr.y;
      scene._mapPanActive = false;
    });

    scene.input.on('pointermove', (ptr) => {
      if (!ptr.isDown) return;
      if (Math.hypot(ptr.x - startX, ptr.y - startY) > THRESHOLD) {
        scene._mapPanActive = true;
      }
      if (scene._mapPanActive) {
        const z = cam.zoom;
        cam.scrollX -= (ptr.x - ptr.prevPosition.x) / z;
        cam.scrollY -= (ptr.y - ptr.prevPosition.y) / z;
      }
    });

    // Keep the flag true for one extra tick so a lift-finger doesn't
    // accidentally fire a tap on whatever the finger was resting on.
    scene.input.on('pointerup', () => {
      scene.time.delayedCall(60, () => { scene._mapPanActive = false; });
    });
  },

  // ── Mobile battle-bar helpers (called from HTML onclick) ─────────────

  _battleScene() {
    return window.game?.scene?.getScene('BattleScene');
  },

  _mobileAbort() {
    const s = this._battleScene();
    if (s) s._abortCampaign();
  },

  _mobileStart() {
    const s = this._battleScene();
    if (s && !s.battleStarted) s._startBattle();
  },

  _mobileW() {
    const s = this._battleScene();
    if (!s || !s.battleStarted) return;
    const enemies = s.allPieces.filter(p => p.alive && !p.onBench && p.team === 'enemy');
    s.allPieces
      .filter(p => p instanceof Hero && p.alive && !p.onBench && p.team === 'player')
      .forEach(hero => hero.tryWSkill(enemies));
  },

  _mobileR() {
    const s = this._battleScene();
    if (!s || !s.battleStarted) return;
    const enemies = s.allPieces.filter(p => p.alive && !p.onBench && p.team === 'enemy');
    const hero = s.allPieces.find(
      p => p instanceof Hero && p.alive && !p.onBench && !p.ultimateUsed && p.team === 'player'
    );
    if (hero) hero.castUltimate(enemies);
  },

  _mobilePause() {
    const s = this._battleScene();
    if (s && s.battleStarted) s._togglePause();
  },

  /** Show the mobile battle bar + optional portrait hint. */
  showBattleBar() {
    if (!this.isMobile()) return;
    const bar  = document.getElementById('mobile-battle-bar');
    const hint = document.getElementById('landscape-hint');
    if (bar)  bar.style.display  = 'flex';
    if (hint && this.isPortrait()) hint.style.display = 'block';
    this._refreshBattleBar();

    // Keep button states fresh every 300 ms
    if (!this._barInterval) {
      this._barInterval = setInterval(() => this._refreshBattleBar(), 300);
    }
  },

  hideBattleBar() {
    const bar  = document.getElementById('mobile-battle-bar');
    const hint = document.getElementById('landscape-hint');
    if (bar)  bar.style.display  = 'none';
    if (hint) hint.style.display = 'none';
    if (this._barInterval) {
      clearInterval(this._barInterval);
      this._barInterval = null;
    }
  },

  _refreshBattleBar() {
    const s = this._battleScene();
    if (!s) return;

    const started = !!s.battleStarted;
    const paused  = s.battleSystem?.isPaused;

    // Start button
    const btnStart = document.getElementById('mb-start');
    if (btnStart) {
      if (started) {
        btnStart.textContent = '已开战';
        btnStart.disabled = true;
        btnStart.classList.remove('primary');
      } else {
        btnStart.textContent = '▶ 开战';
        btnStart.disabled = false;
        btnStart.classList.add('primary');
      }
    }

    // W button — enabled when any hero is alive and has full MP
    const btnW = document.getElementById('mb-w');
    if (btnW) {
      const canW = started && s.allPieces.some(
        p => p instanceof Hero && p.alive && !p.onBench && p.mp >= p.maxMp
      );
      btnW.disabled = !canW;
    }

    // R button — enabled when any hero ult is available
    const btnR = document.getElementById('mb-r');
    if (btnR) {
      const canR = started && s.allPieces.some(
        p => p instanceof Hero && p.alive && !p.onBench && !p.ultimateUsed
      );
      btnR.disabled = !canR;
    }

    // Pause button
    const btnPause = document.getElementById('mb-pause');
    if (btnPause) {
      btnPause.disabled    = !started;
      btnPause.textContent = paused ? '▶ 继续' : '⏸ 暂停';
    }
  },

  // ── Pan-aware tap handler ──────────────────────────────────────────────

  /**
   * Attach a "pointerdown" handler that fires only when the finger was NOT
   * dragging (i.e. it was a genuine tap / click).
   *
   * On desktop the handler runs on the next Phaser tick (imperceptible).
   * On mobile it waits 80 ms so pointermove has time to set _mapPanActive.
   *
   * @param {Phaser.Scene}                    scene
   * @param {Phaser.GameObjects.GameObject}   obj
   * @param {Function}                        handler
   */
  onTap(scene, obj, handler) {
    const delay = this.isMobile() ? 80 : 0;
    obj.on('pointerdown', () => {
      scene.time.delayedCall(delay, () => {
        if (!scene._mapPanActive) handler();
      });
    });
  },
};
