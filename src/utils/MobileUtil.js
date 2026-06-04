// MobileUtil.js — mobile detection, touch-drag, pinch-zoom helpers
//
// Usage:
//   // In a "map" scene (World / Campaign):
//   MobileUtil.enableCameraDrag(this, { centerX: 390, centerY: 310 });
//
//   // In WorldMapScene to surface the hero selector overlay:
//   MobileUtil.showHeroSelector();
//
//   // In BattleScene:
//   MobileUtil.showBattleBar();   // create()
//   MobileUtil.hideBattleBar();   // shutdown()

const MobileUtil = {

  // ── Detection ──────────────────────────────────────────────────────────

  isMobile() {
    return ('ontouchstart' in window) ||
           !!(window.matchMedia && window.matchMedia('(max-width: 1023px)').matches);
  },

  isPortrait() {
    return !!(window.matchMedia && window.matchMedia('(orientation: portrait)').matches);
  },

  // ── Camera zoom + drag-to-pan + pinch-to-zoom for map scenes ──────────

  /**
   * Enable touch/mouse camera interaction for WorldMapScene and CampaignMapScene.
   *
   * Mobile-portrait: zooms so 1 game-unit ≈ 1 CSS-pixel (making nodes and
   * text comfortably large), sets camera bounds, and enables:
   *   • One-finger drag  → pan the camera
   *   • Two-finger pinch → zoom in / out (pinch)
   *
   * Desktop: minimal zoom (1×); drag still works for mouse users who want it.
   *
   * @param {Phaser.Scene} scene
   * @param {object} [opts]
   *   centerX {number} initial camera focus X (default 440)
   *   centerY {number} initial camera focus Y (default 345)
   *   worldW  {number} world scroll boundary width  (default 880)
   *   worldH  {number} world scroll boundary height (default 690)
   */
  enableCameraDrag(scene, { centerX = 440, centerY = 345, worldW = 880, worldH = 690 } = {}) {
    const cam = scene.cameras.main;

    // ── Initial zoom on mobile portrait ──────────────────────────────
    let minZoom = 1;
    if (this.isMobile() && this.isPortrait()) {
      const dw   = scene.scale.displaySize.width || scene.scale.width;
      const zoom = scene.scale.width / dw;      // e.g. 880/390 ≈ 2.26
      minZoom = Math.max(1, zoom);
      cam.setZoom(minZoom);
    }
    cam.setBounds(0, 0, worldW, worldH);
    cam.centerOn(centerX, centerY);

    // ── Input state ──────────────────────────────────────────────────
    let startX = 0, startY = 0;
    let pinchLastDist = 0;
    scene._mapPanActive = false;
    const DRAG_THRESHOLD = 10; // canvas-pixels before a move becomes a pan

    scene.input.on('pointerdown', (ptr) => {
      startX = ptr.x;
      startY = ptr.y;
      scene._mapPanActive = false;
    });

    scene.input.on('pointermove', (ptr) => {
      // ── Two-finger pinch-to-zoom ────────────────────────────────
      const activePtrs = scene.input.manager.pointers.filter(p => p.active && p.isDown);
      if (activePtrs.length >= 2) {
        scene._mapPanActive = true;    // block tap-through during pinch
        const p0 = activePtrs[0], p1 = activePtrs[1];
        const dist = Phaser.Math.Distance.Between(p0.x, p0.y, p1.x, p1.y);
        if (pinchLastDist > 0 && dist > 0) {
          const newZoom = Phaser.Math.Clamp(
            cam.zoom * (dist / pinchLastDist),
            minZoom,
            5
          );
          cam.setZoom(newZoom);
        }
        pinchLastDist = dist;
        return; // don't also pan while pinching
      }
      pinchLastDist = 0;

      // ── One-finger drag-to-pan ──────────────────────────────────
      if (!ptr.isDown) return;
      if (Math.hypot(ptr.x - startX, ptr.y - startY) > DRAG_THRESHOLD) {
        scene._mapPanActive = true;
      }
      if (scene._mapPanActive) {
        const z = cam.zoom;
        cam.scrollX -= (ptr.x - ptr.prevPosition.x) / z;
        cam.scrollY -= (ptr.y - ptr.prevPosition.y) / z;
      }
    });

    scene.input.on('pointerup', () => {
      pinchLastDist = 0;
      // Keep flag true for one tick so the lift doesn't fire a stray tap
      scene.time.delayedCall(60, () => { scene._mapPanActive = false; });
    });
  },

  // ── Pan-aware tap handler ──────────────────────────────────────────────

  /**
   * Attach a tap handler that fires only when the touch was NOT a drag/pan.
   * Uses an 80 ms delay on mobile so pointermove has time to set _mapPanActive.
   */
  onTap(scene, obj, handler) {
    const delay = this.isMobile() ? 80 : 0;
    obj.on('pointerdown', () => {
      scene.time.delayedCall(delay, () => {
        if (!scene._mapPanActive) handler();
      });
    });
  },

  // ── Battle bar (BattleScene) ───────────────────────────────────────────

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

  _mobilePause() {
    const s = this._battleScene();
    if (s && s.battleStarted) s._togglePause();
  },

  /** Show the mobile battle bar + optional portrait orientation hint. */
  showBattleBar() {
    if (!this.isMobile()) return;
    const bar  = document.getElementById('mobile-battle-bar');
    const hint = document.getElementById('landscape-hint');
    if (bar)  bar.style.display  = 'flex';
    if (hint && this.isPortrait()) hint.style.display = 'block';
    this._refreshBattleBar();
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

    const btnStart = document.getElementById('mb-start');
    if (btnStart) {
      btnStart.textContent = started ? '已开战' : '▶ 开战';
      btnStart.disabled    = started;
      btnStart.classList.toggle('primary', !started);
    }

    const btnPause = document.getElementById('mb-pause');
    if (btnPause) {
      btnPause.disabled    = !started;
      btnPause.textContent = paused ? '▶ 继续' : '⏸ 暂停';
    }
  },

  // ── Campaign sidebar overlay (CampaignMapScene) ───────────────────────

  /**
   * Build and show the fixed HTML campaign sidebar (lives / relic / synergies).
   * Only shown on mobile — desktop uses the in-Phaser sidebar.
   */
  showCampaignSidebar() {
    if (!this.isMobile()) return;
    const el = document.getElementById('mobile-campaign-sidebar');
    if (!el) return;

    // ── Build inner HTML from live game state ──────────────────────
    const lives     = CampaignState.lives;
    const maxLives  = 2;
    const relic     = CampaignState.currentRelic;

    const allIds    = [CampaignState.mainHero];
    if (CampaignState.subHero) allIds.push(CampaignState.subHero);
    allIds.push(...CampaignState.roster);
    const synCounts = calcSynergies(allIds);

    let html = '';

    // Lives
    html += `<div class="mcs-lives">${'♥'.repeat(lives)}${'♡'.repeat(Math.max(0, maxLives - lives))}</div>`;
    html += `<div class="mcs-lives-label">生 命</div>`;
    html += `<hr class="mcs-divider">`;

    // Relic
    if (relic) {
      const rc = '#' + (relic.color || 0x334455).toString(16).padStart(6, '0');
      html += `<div class="mcs-section-title">圣 物</div>`;
      html += `<div class="mcs-relic-row">
                 <div class="mcs-relic-icon" style="background:${rc}">
                   ${relic.icon || '★'}
                 </div>
                 <div class="mcs-relic-name">${relic.name}</div>
               </div>`;
      (relic.buffs || []).forEach(b => {
        html += `<div class="mcs-relic-buff">${b}</div>`;
      });
      html += `<hr class="mcs-divider">`;
    }

    // Synergies
    html += `<div class="mcs-section-title">当前羁绊</div>`;
    let hadSyn = false;
    Object.entries(synCounts).sort((a, b) => b[1] - a[1]).forEach(([syn, cnt]) => {
      const thresh = getActiveThreshold(syn, cnt);
      const def    = SYNERGY_DATA[syn];
      const color  = thresh ? ('#' + (def?.color || 0x6677aa).toString(16).padStart(6, '0')) : '';
      const label  = thresh ? `${syn} ×${cnt} ✓` : `${syn} ×${cnt}`;
      html += `<div class="mcs-syn-row${thresh ? ' active' : ''}"
                    style="${color ? `color:${color}` : ''}">${label}</div>`;
      if (thresh) {
        html += `<div class="mcs-syn-bonus">${thresh.bonus}</div>`;
      }
      hadSyn = true;
    });
    if (!hadSyn) {
      html += `<div class="mcs-syn-row">暂无激活羁绊</div>`;
    }

    el.innerHTML = html;
    el.style.display = 'block';
  },

  hideCampaignSidebar() {
    const el = document.getElementById('mobile-campaign-sidebar');
    if (el) el.style.display = 'none';
  },

  // ── Hero selector overlay (WorldMapScene) ─────────────────────────────

  /** Show the fixed HTML hero selector overlay at screen bottom-left. */
  showHeroSelector() {
    if (!this.isMobile()) return;
    const el = document.getElementById('mobile-hero-sel');
    if (el) el.style.display = 'flex';
  },

  hideHeroSelector() {
    const el = document.getElementById('mobile-hero-sel');
    if (el) el.style.display = 'none';
  },
};
