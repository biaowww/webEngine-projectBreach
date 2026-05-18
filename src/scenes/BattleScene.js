// BattleScene.js — main game scene with drag-drop, relic, overtime, skill animations

class BattleScene extends Phaser.Scene {
  constructor() { super({ key: 'BattleScene' }); }

  // ── Constants ────────────────────────────────────────────────────
  get CELL_SIZE() { return 60; }
  get COLS()      { return 7; }
  get ROWS()      { return 8; }
  get BOARD_X()   { return 190; }
  get BOARD_Y()   { return 22; }
  get BENCH_SLOT_SZ()  { return 52; }
  get BENCH_SLOT_GAP() { return 5; }

  // ── Lifecycle ────────────────────────────────────────────────────
  create() {
    this.allPieces     = [];
    this.battleSystem  = new BattleSystem(this);
    this.battleStarted = false;
    this.heroRefs      = {};
    this.elapsedSec    = 0;
    this._dragHighlight = null;
    this._overtimeActive = false;
    this._lastOvertimeSec = -1;
    this._statsTimer = 0;
    this._statsTeam  = 'player'; // which team's data the stats panel shows
    this._statsRows  = [];       // text-object rows for stats table

    // Pick random relic for this run
    this.relic = RELICS[Math.floor(Math.random() * RELICS.length)];

    // Space bar to pause / resume
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this._drawBackground();
    this._drawBoard();
    this._spawnPieces();
    this._applyRelicBuffs();
    this._buildLeftPanel();
    this._buildRightPanel();
    this._buildBench();
    this._buildDragHighlight();
    this._enableDragDrop();
  }

  update(time, delta) {
    this.battleSystem.update(delta);

    // Visual update for all pieces (60 fps)
    this.allPieces.forEach(p => { if (p.alive) p.updateVisual(); });

    // Update shield circles
    this.allPieces.forEach(p => {
      if (!p.alive) return;
      if (p._shieldCircle) {
        if (p.shield > 0) {
          p._shieldCircle.setPosition(p.visualX, p.visualY);
        } else {
          p._shieldCircle.destroy();
          p._shieldCircle = null;
        }
      }
    });

    this.updateHeroPanel();

    // Space bar toggle pause
    if (this.battleStarted && Phaser.Input.Keyboard.JustDown(this._spaceKey)) {
      this._togglePause();
    }

    if (this.battleStarted && !this.battleSystem.ended) {
      if (!this.battleSystem.isPaused) this.elapsedSec += delta / 1000;
      if (this.timerText) this.timerText.setText(this._fmtTime(this.elapsedSec));

      if (!this._overtimeActive) {
        // Countdown bar for normal battle (30 s)
        if (this.overtimeBar) {
          const ratio = Math.max(0, 1 - this.battleSystem.elapsedMs / this.battleSystem.BATTLE_LIMIT_MS);
          this.overtimeBar.displayWidth = 120 * ratio;
        }
      } else {
        // During overtime: show escalating bonus level in status text
        const sec = Math.floor(this.battleSystem._overtimeSec());
        if (sec !== this._lastOvertimeSec) {
          this._lastOvertimeSec = sec;
          const bonusPct  = Math.min(70, sec * 10);
          const healPct   = Math.max(30, 100 - bonusPct);
          this.statusText.setText(
            `⚡ +${bonusPct}%伤害/攻速  治疗&护盾×${healPct}%`
          );
        }
      }

      // Stats panel: refresh every 600 ms during battle
      this._statsTimer += delta;
      if (this._statsTimer >= 600) {
        this._statsTimer = 0;
        this._updateStatsPanel();
      }
    }
  }

  // ── Grid / bench helpers ─────────────────────────────────────────
  gridToWorld(col, row) {
    return {
      x: this.BOARD_X + col * this.CELL_SIZE + this.CELL_SIZE / 2,
      y: this.BOARD_Y + row * this.CELL_SIZE + this.CELL_SIZE / 2
    };
  }

  benchSlotToWorld(index) {
    const sz = this.BENCH_SLOT_SZ, gap = this.BENCH_SLOT_GAP;
    return {
      x: this.BOARD_X + index * (sz + gap) + sz / 2,
      y: this.BOARD_Y + this.ROWS * this.CELL_SIZE + 18 + sz / 2
    };
  }

  // ── Background / Board ───────────────────────────────────────────
  _drawBackground() {
    this.add.rectangle(440, 345, 880, 690, 0x0d0d1a);
  }

  _drawBoard() {
    const BX = this.BOARD_X, BY = this.BOARD_Y, C = this.CELL_SIZE;

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const isEnemy = r < 4;
        const shade = (c + r) % 2 === 0;
        const col = isEnemy
          ? (shade ? 0x1e1030 : 0x180c28)
          : (shade ? 0x121828 : 0x0e1422);
        this.add.rectangle(BX + c * C + C / 2, BY + r * C + C / 2, C - 1, C - 1, col);
      }
    }

    this.add.rectangle(
      BX + (this.COLS * C) / 2, BY + (this.ROWS * C) / 2,
      this.COLS * C, this.ROWS * C, 0, 0
    ).setStrokeStyle(2, 0x334466);

    const midY = BY + 4 * C;
    this.add.line(0, 0, BX, midY, BX + this.COLS * C, midY, 0x5544aa, 0.9)
      .setLineWidth(2);

    this.add.text(BX + 4, BY + 4,   '— 敌方区域 —', { fontSize: '9px',  color: '#aa6677' });
    this.add.text(BX + 4, midY + 4, '— 己方区域 —', { fontSize: '9px',  color: '#6677aa' });
  }

  // ── Piece spawning ───────────────────────────────────────────────
  _spawnPieces() {
    const make = (id, col, row, onBench = false, slot = null) => {
      const data = JSON.parse(JSON.stringify(PIECE_DATA[id]));
      const piece = data.isHero
        ? new Hero(this, data, col, row)
        : new Piece(this, data, col, row);
      if (onBench) {
        piece.onBench = true;
        piece.benchSlot = slot;
        piece.col = 0; piece.row = 0; // unused while on bench
        const wp = this.benchSlotToWorld(slot);
        piece.visualX = wp.x;
        piece.visualY = wp.y;
        piece.container.setPosition(wp.x, wp.y);
      }
      this.allPieces.push(piece);
      return piece;
    };

    INITIAL_PLACEMENT.player.forEach(p => make(p.pieceId, p.col, p.row));
    INITIAL_PLACEMENT.enemy.forEach(p => make(p.pieceId, p.col, p.row));
    INITIAL_PLACEMENT.bench.forEach((id, i) => make(id, 0, 0, true, i));
  }

  // ── Relic buffs ──────────────────────────────────────────────────
  _applyRelicBuffs() {
    if (!this.relic) return;
    this.allPieces.filter(p => p.team === 'player').forEach(p => {
      switch (this.relic.statKey) {
        case 'hpBonus':
          p.hp = p.maxHp = Math.floor(p.maxHp * (1 + this.relic.statVal)); break;
        case 'atkBonus':
          if (p.attackType === 'ad') p.atk = Math.floor(p.atk * (1 + this.relic.statVal)); break;
        case 'apBonus':
          if (p.attackType === 'ap') p.atk = Math.floor(p.atk * (1 + this.relic.statVal)); break;
        case 'spdBonus':
          p.atkSpeed = Math.max(0.4, p.atkSpeed * (1 - this.relic.statVal)); break;
      }
    });
  }

  // ── Left Panel ───────────────────────────────────────────────────
  _buildLeftPanel() {
    this.add.rectangle(92, 345, 178, 665, 0x080814).setStrokeStyle(1, 0x2a2a4a);
    this.add.text(10, 14, '英  雄', { fontSize: '12px', color: '#ccaa44', fontStyle: 'bold' });

    const heroes = this.allPieces.filter(p => p instanceof Hero);
    heroes.forEach((hero, i) => this._buildHeroSlot(hero, 6, 36 + i * 180));

    // Synergy section
    const syY = 36 + heroes.length * 180 + 8;
    this.add.text(8, syY, '羁  绊', { fontSize: '10px', color: '#6655aa', fontStyle: 'bold' });
    [['铁壁 ×3', 0x4488cc], ['远射 ×2', 0xccaa22], ['圣光 ×1', 0x44cc88]].forEach(([lbl, col], i) => {
      const r = this.add.rectangle(14, syY + 18 + i * 18, 8, 8, col);
      this.add.text(24, syY + 14 + i * 18, lbl, { fontSize: '9px', color: '#aabbcc' });
    });
  }

  _buildHeroSlot(hero, px, py) {
    // Portrait
    const portrait = this.add.rectangle(px + 32, py + 30, 54, 54, hero.color)
      .setStrokeStyle(2, 0xffd700);
    this.add.text(px + 32, py + 30, hero.roleLabel, {
      fontSize: '13px', color: '#fff', fontStyle: 'bold', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Name + type
    const shortName = hero.name.split('  ')[0];
    const engName   = hero.name.split('  ')[1] || '';
    this.add.text(px + 66, py + 12, shortName, { fontSize: '11px', color: '#fff', fontStyle: 'bold' });
    this.add.text(px + 66, py + 26, engName,    { fontSize: '9px',  color: '#aabbcc' });

    // HP bar
    const BW = 96;
    this.add.text(px + 66, py + 40, 'HP', { fontSize: '9px', color: '#88ee88' });
    this.add.rectangle(px + 66 + BW / 2, py + 52, BW, 7, 0x222222).setOrigin(0.5);
    const hpFill = this.add.rectangle(px + 66, py + 52, BW, 7, 0x44cc55).setOrigin(0, 0.5);

    // MP bar (heroes only)
    this.add.text(px + 66, py + 62, 'MP', { fontSize: '9px', color: '#8888ff' });
    this.add.rectangle(px + 66 + BW / 2, py + 74, BW, 5, 0x111133).setOrigin(0.5);
    const mpFill = this.add.rectangle(px + 66, py + 74, BW, 5, 0x3366ff).setOrigin(0, 0.5);

    // W skill
    const wName = hero.skills.w?.name || '—';
    this.add.text(px + 4, py + 87, `W  ${wName}`, { fontSize: '10px', color: '#ccccff', fontFamily: 'monospace' });
    this.add.text(px + 4, py + 100, hero.skills.w?.desc || '', {
      fontSize: '8px', color: '#7788aa', wordWrap: { width: 168 }
    });

    // ── Ultimate button (3 states) ──
    const ultName = hero.skills.ultimate?.name || '大招';
    const ultBtn = this.add.text(px + 4, py + 132,
      `  R  ${ultName}  `, {
        fontSize: '11px',
        color: '#555566',               // locked: grey
        backgroundColor: '#151520',
        padding: { x: 5, y: 4 },
        fontFamily: 'monospace'
      }
    ).setInteractive({ cursor: 'default' });

    this.add.text(px + 4, py + 153, hero.skills.ultimate?.desc || '', {
      fontSize: '8px', color: '#665544', wordWrap: { width: 168 }
    });

    // Divider
    this.add.line(0, 0, px, py + 170, px + 174, py + 170, 0x2a2a4a);

    // ── Death overlay (hidden until hero dies) ──────────────────────
    // Dark veil over portrait
    const deathOverlay = this.add.rectangle(px + 32, py + 30, 54, 54, 0x000000, 0);
    // 阵亡 label
    const deathLabel = this.add.text(px + 32, py + 30, '阵  亡', {
      fontSize: '13px', color: '#ff3333', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setVisible(false);

    // Click handler — blocked when: pre-battle / dead / on bench / already used
    ultBtn.on('pointerdown', () => {
      if (!this.battleStarted || !hero.alive || hero.ultimateUsed || hero.onBench) return;
      const enemies = this.allPieces.filter(p => p.alive && !p.onBench && p.team === 'enemy');
      hero.castUltimate(enemies);
    });

    this.heroRefs[hero.id] = {
      hero, hpFill, mpFill, ultBtn, ultName, BW,
      portrait, deathOverlay, deathLabel,
      _deadShown: false
    };
  }

  // ── Right Panel ──────────────────────────────────────────────────
  _buildRightPanel() {
    const RX = 622, BW = 880;
    const CX = (RX + BW) / 2;

    this.add.rectangle(CX, 345, BW - RX, 665, 0x080814).setStrokeStyle(1, 0x2a2a4a);

    // Stage
    this.add.text(CX, 20, '第2阶段 · 第1战', { fontSize: '11px', color: '#7788aa', align: 'center' }).setOrigin(0.5, 0);

    // Timer
    this.add.text(CX, 40, '战斗时长', { fontSize: '9px', color: '#556677', align: 'center' }).setOrigin(0.5, 0);
    this.timerText = this.add.text(CX, 52, '0:00', {
      fontSize: '18px', color: '#99bbdd', fontFamily: 'monospace', align: 'center'
    }).setOrigin(0.5, 0);

    // Overtime countdown bar
    this.add.text(CX, 82, '加时倒计', { fontSize: '8px', color: '#885544', align: 'center' }).setOrigin(0.5, 0);
    this.add.rectangle(CX, 95, 122, 9, 0x221111).setOrigin(0.5);
    this.overtimeBar = this.add.rectangle(RX + 8, 95, 120, 7, 0xdd6633).setOrigin(0, 0.5);

    // Alive counts
    this.add.text(CX, 110, '敌方剩余', { fontSize: '9px', color: '#aa6677', align: 'center' }).setOrigin(0.5, 0);
    this.enemyCountText = this.add.text(CX, 122, '6', {
      fontSize: '20px', color: '#ff8899', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5, 0);

    this.add.text(CX, 152, '己方剩余', { fontSize: '9px', color: '#6677aa', align: 'center' }).setOrigin(0.5, 0);
    this.allyCountText = this.add.text(CX, 164, '6', {
      fontSize: '20px', color: '#88aaff', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5, 0);

    // Divider
    this.add.line(0, 0, RX + 8, 195, BW - 8, 195, 0x2a2a4a);

    // Start button
    this.startBtn = this.add.text(CX, 210,
      '  ▶  开始战斗  ', {
        fontSize: '15px', color: '#ffffff',
        backgroundColor: '#1a4488', padding: { x: 10, y: 8 }, fontStyle: 'bold'
      }
    ).setOrigin(0.5, 0).setInteractive({ cursor: 'pointer' });
    this.startBtn.on('pointerover', () => this.startBtn.setStyle({ backgroundColor: '#2255aa' }));
    this.startBtn.on('pointerout',  () => this.startBtn.setStyle({ backgroundColor: '#1a4488' }));
    this.startBtn.on('pointerdown', () => this._startBattle());

    // Pre-battle hint
    this.preBattleHint = this.add.text(CX, 252,
      '战斗前可拖拽奕子调整阵型', {
        fontSize: '9px', color: '#445566', align: 'center', wordWrap: { width: 220 }
      }
    ).setOrigin(0.5, 0);

    this.statusText = this.add.text(CX, 274, '', {
      fontSize: '10px', color: '#aacc88', align: 'center', wordWrap: { width: 230 }
    }).setOrigin(0.5, 0);

    // ── Relic panel ──
    this._buildRelicPanel(RX, BW, CX);

    // ── Stats panel ──
    this._buildStatsPanel(RX, BW, CX);
  }

  _buildRelicPanel(RX, BW, CX) {
    const ry = 304;
    this.add.line(0, 0, RX + 8, ry, BW - 8, ry, 0x2a2a4a);
    this.add.text(CX, ry + 6, '圣  物', { fontSize: '10px', color: '#aa9944', fontStyle: 'bold', align: 'center' }).setOrigin(0.5, 0);

    // Relic icon gem
    const rc = this.relic.color;
    const rx2 = RX + 18;
    this.add.rectangle(rx2 + 16, ry + 30, 28, 28, rc).setStrokeStyle(2, 0xffffff * 0.5);
    this.add.text(rx2 + 16, ry + 30, this.relic.icon, {
      fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(rx2 + 36, ry + 19, this.relic.name, {
      fontSize: '11px', color: '#eedd88', fontStyle: 'bold'
    });
    this.relic.buffs.forEach((b, i) => {
      this.add.text(rx2 + 36, ry + 33 + i * 13, b, { fontSize: '8px', color: '#99aabb' });
    });
  }

  // ── Stats Panel ──────────────────────────────────────────────────
  _buildStatsPanel(RX, BW, CX) {
    const PY   = 378;  // panel top y
    const ROW  = 19;   // row height
    const COLS = { name: RX+8, ad: RX+98, ap: RX+138, taken: RX+178, heal: RX+216 };

    this.add.line(0, 0, RX+8, PY, BW-8, PY, 0x2a2a4a);
    this.add.text(CX, PY+5, '战 斗 数 据', {
      fontSize: '10px', color: '#7788aa', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5, 0);

    // Toggle tabs
    const tabStyle = (active) => ({
      fontSize: '10px',
      color:           active ? '#aaddff' : '#445566',
      backgroundColor: active ? '#1a3355' : '#0d0d1a',
      padding: { x: 5, y: 2 }
    });
    this._tabPlayer = this.add.text(RX+8,  PY+20, ' 我方 ', tabStyle(true))
      .setInteractive({ cursor: 'pointer' });
    this._tabEnemy  = this.add.text(RX+60, PY+20, ' 敌方 ', tabStyle(false))
      .setInteractive({ cursor: 'pointer' });

    this._tabPlayer.on('pointerdown', () => {
      this._statsTeam = 'player';
      this._tabPlayer.setStyle(tabStyle(true));
      this._tabEnemy.setStyle(tabStyle(false));
      this._updateStatsPanel();
    });
    this._tabEnemy.on('pointerdown', () => {
      this._statsTeam = 'enemy';
      this._tabPlayer.setStyle(tabStyle(false));
      this._tabEnemy.setStyle(tabStyle(true));
      this._updateStatsPanel();
    });

    // Column headers
    const hY = PY + 40;
    const hStyle = { fontSize: '8px', color: '#445566' };
    this.add.text(COLS.name,  hY, '名称',  hStyle);
    this.add.text(COLS.ad,    hY, 'AD伤',  hStyle);
    this.add.text(COLS.ap,    hY, 'AP伤',  hStyle);
    this.add.text(COLS.taken, hY, '承伤',  hStyle);
    this.add.text(COLS.heal,  hY, '治疗',  hStyle);
    this.add.line(0, 0, RX+8, hY+11, BW-8, hY+11, 0x1e2030);

    // Data rows (max 6 pieces per side)
    this._statsRows = [];
    for (let i = 0; i < 6; i++) {
      const ry = hY + 14 + i * ROW;
      this._statsRows.push({
        name:  this.add.text(COLS.name,  ry, '—', { fontSize: '9px', color: '#556677' }),
        ad:    this.add.text(COLS.ad,    ry, '—', { fontSize: '9px', color: '#665500' }),
        ap:    this.add.text(COLS.ap,    ry, '—', { fontSize: '9px', color: '#223388' }),
        taken: this.add.text(COLS.taken, ry, '—', { fontSize: '9px', color: '#553322' }),
        heal:  this.add.text(COLS.heal,  ry, '—', { fontSize: '9px', color: '#224433' })
      });
    }
  }

  _updateStatsPanel() {
    if (!this._statsRows.length) return;

    const pieces = this.allPieces
      .filter(p => p.team === this._statsTeam && !p.onBench)
      .sort((a, b) => {
        const tA = (a.statDmgAD || 0) + (a.statDmgAP || 0);
        const tB = (b.statDmgAD || 0) + (b.statDmgAP || 0);
        return tB - tA; // highest total damage first
      });

    this._statsRows.forEach((row, i) => {
      if (i >= pieces.length) {
        row.name.setText('—').setStyle({ color: '#333344' });
        row.ad.setText('—').setStyle({ color: '#333333' });
        row.ap.setText('—').setStyle({ color: '#333333' });
        row.taken.setText('—').setStyle({ color: '#333333' });
        row.heal.setText('—').setStyle({ color: '#333333' });
        return;
      }
      const p = pieces[i];
      const alive = p.alive;
      const shortName = p.name.split('  ')[0];

      const adDmg    = Math.floor(p.statDmgAD    || 0);
      const apDmg    = Math.floor(p.statDmgAP    || 0);
      const taken    = Math.floor(p.statDmgTaken || 0);
      const heal     = Math.floor(p.statHealDone || 0);

      row.name.setText(shortName).setStyle({ color: alive ? '#aabbcc' : '#554444' });
      row.ad.setText(adDmg > 0 ? String(adDmg) : '—')
        .setStyle({ color: adDmg > 0 ? '#ddaa33' : '#443322' });
      row.ap.setText(apDmg > 0 ? String(apDmg) : '—')
        .setStyle({ color: apDmg > 0 ? '#5577ff' : '#222244' });
      row.taken.setText(taken > 0 ? String(taken) : '—')
        .setStyle({ color: taken > 0 ? '#cc6655' : '#442222' });
      row.heal.setText(heal > 0 ? String(heal) : '—')
        .setStyle({ color: heal > 0 ? '#44cc77' : '#223322' });
    });
  }

  // ── Bench (slot backgrounds only; pieces draw themselves) ────────
  _buildBench() {
    const sz = this.BENCH_SLOT_SZ, gap = this.BENCH_SLOT_GAP;
    const benchY = this.BOARD_Y + this.ROWS * this.CELL_SIZE + 18;

    this.add.text(this.BOARD_X, benchY - 14, '板  凳  席', { fontSize: '9px', color: '#556677' });

    for (let i = 0; i < 5; i++) {
      const x = this.BOARD_X + i * (sz + gap) + sz / 2;
      const y = benchY + sz / 2;
      this.add.rectangle(x, y, sz, sz, 0x0c0c1a).setStrokeStyle(1, 0x2a3040);
      // Slot index label
      this.add.text(x, y + sz / 2 - 6, String(i + 1), {
        fontSize: '7px', color: '#333344'
      }).setOrigin(0.5);
    }

    // Gold placeholder
    this.add.text(
      this.BOARD_X + 5 * (sz + gap) + 14,
      benchY + 10, '💰  0', { fontSize: '12px', color: '#ffdd66' }
    );
  }

  // ── Drag highlight cell ──────────────────────────────────────────
  _buildDragHighlight() {
    this._dragHighlight = this.add.rectangle(
      0, 0,
      this.CELL_SIZE - 2, this.CELL_SIZE - 2,
      0xffffff, 0.18
    ).setStrokeStyle(2, 0xffffff, 0.7).setVisible(false).setDepth(80);
  }

  // ── Drag & Drop ──────────────────────────────────────────────────
  _enableDragDrop() {
    // Make all player pieces interactive + draggable
    this.allPieces.filter(p => p.team === 'player').forEach(piece => {
      const s = piece.sz;
      piece.container.setInteractive(
        new Phaser.Geom.Rectangle(-s / 2, -s / 2, s, s),
        Phaser.Geom.Rectangle.Contains
      );
      this.input.setDraggable(piece.container);
    });

    this.input.on('dragstart', (pointer, container) => {
      if (this.battleStarted) return;
      const piece = container._pieceRef;
      if (!piece || piece.team !== 'player') return;
      piece._isDragging = true;
      piece._dragOrigin = {
        onBench: piece.onBench, benchSlot: piece.benchSlot,
        col: piece.col, row: piece.row
      };
      container.setDepth(200).setAlpha(0.85);
    });

    this.input.on('drag', (pointer, container, x, y) => {
      if (this.battleStarted) return;
      const piece = container._pieceRef;
      if (!piece || !piece._isDragging) return;
      container.setPosition(x, y);
      piece.visualX = x; piece.visualY = y;

      // Highlight target cell
      const cell = this._ptrToCell(pointer.x, pointer.y);
      if (cell && cell.row >= 4) {
        const wp = this.gridToWorld(cell.col, cell.row);
        this._dragHighlight.setPosition(wp.x, wp.y).setVisible(true);
      } else {
        this._dragHighlight.setVisible(false);
      }
    });

    this.input.on('dragend', (pointer, container) => {
      if (this.battleStarted) return;
      const piece = container._pieceRef;
      if (!piece || !piece._isDragging) return;

      piece._isDragging = false;
      container.setAlpha(1);
      this._dragHighlight.setVisible(false);

      const orig = piece._dragOrigin;
      const cell = this._ptrToCell(pointer.x, pointer.y);
      const benchIdx = this._ptrToBench(pointer.x, pointer.y);

      if (cell && cell.row >= 4) {
        // Dropped on player zone
        const occupant = this._pieceAt(cell.col, cell.row, piece);
        if (occupant) {
          this._swapPieces(piece, occupant);
        } else {
          // Check board count limit (cannot exceed enemy piece count)
          if (piece.onBench && !this._canAddToBoard()) {
            const max = this._boardLimit();
            this.statusText.setText(`最多出战 ${max} 个奕子（与敌方相同）`);
            this.time.delayedCall(2200, () => { if (!this.battleStarted) this.statusText.setText(''); });
            this._toBench(piece, orig.benchSlot); // return to bench
          } else {
            this._toBoard(piece, cell.col, cell.row);
          }
        }
      } else if (benchIdx !== null) {
        const occupant = this.allPieces.find(
          p => p.onBench && p.benchSlot === benchIdx && p !== piece
        );
        if (occupant) this._swapPieces(piece, occupant);
        else this._toBench(piece, benchIdx);
      } else {
        // Return to origin
        if (orig.onBench) this._toBench(piece, orig.benchSlot);
        else this._toBoard(piece, orig.col, orig.row);
      }

      container.setDepth(piece.row * 2 + 1);
      this._refreshUltBtnStates(); // update R button for any hero position change
    });
  }

  // Board count limit helpers
  _boardLimit() {
    return this.allPieces.filter(p => p.team === 'enemy' && !p.onBench).length;
  }
  _canAddToBoard() {
    const onBoard = this.allPieces.filter(p => p.team === 'player' && !p.onBench).length;
    return onBoard < this._boardLimit();
  }

  // Refresh pre-battle R button labels to reflect hero bench/board state
  _refreshUltBtnStates() {
    if (this.battleStarted) return;
    Object.values(this.heroRefs).forEach(({ hero, ultBtn, ultName }) => {
      if (hero.onBench) {
        ultBtn.setText('  R  （板凳席）  ')
          .setStyle({ color: '#333344', backgroundColor: '#0a0a0d' }).setAlpha(0.6);
      } else {
        ultBtn.setText(`  R  ${ultName}  `)
          .setStyle({ color: '#555566', backgroundColor: '#151520' }).setAlpha(1);
      }
    });
  }

  // Drag helpers
  _ptrToCell(sx, sy) {
    const C = this.CELL_SIZE;
    const col = Math.floor((sx - this.BOARD_X) / C);
    const row = Math.floor((sy - this.BOARD_Y) / C);
    if (col >= 0 && col < 7 && row >= 0 && row < 8) return { col, row };
    return null;
  }

  _ptrToBench(sx, sy) {
    const sz = this.BENCH_SLOT_SZ, gap = this.BENCH_SLOT_GAP;
    const benchY = this.BOARD_Y + this.ROWS * this.CELL_SIZE + 18;
    if (sy < benchY || sy > benchY + sz) return null;
    for (let i = 0; i < 5; i++) {
      const slotX = this.BOARD_X + i * (sz + gap);
      if (sx >= slotX && sx < slotX + sz) return i;
    }
    return null;
  }

  _pieceAt(col, row, exclude) {
    return this.allPieces.find(
      p => p.alive && !p.onBench && p !== exclude && p.col === col && p.row === row
    ) || null;
  }

  _toBoard(piece, col, row) {
    piece.onBench = false; piece.benchSlot = null;
    piece.col = col; piece.row = row;
  }

  _toBench(piece, slot) {
    piece.onBench = true; piece.benchSlot = slot;
  }

  _swapPieces(a, b) {
    const aOnBench = a.onBench, aBench = a.benchSlot, aCol = a.col, aRow = a.row;
    if (b.onBench) { a.onBench = true; a.benchSlot = b.benchSlot; }
    else { a.onBench = false; a.benchSlot = null; a.col = b.col; a.row = b.row; }
    if (aOnBench)  { b.onBench = true; b.benchSlot = aBench; }
    else { b.onBench = false; b.benchSlot = null; b.col = aCol; b.row = aRow; }
  }

  // ── Battle start ─────────────────────────────────────────────────
  _startBattle() {
    if (this.battleStarted) return;
    this.battleStarted = true;

    // Repurpose start button as pause toggle
    this.startBtn.setText('  ⏸  暂  停  ')
      .setStyle({ backgroundColor: '#1a2a44', color: '#99bbee' })
      .setInteractive({ cursor: 'pointer' });
    this.startBtn.off('pointerdown');           // remove old "start" listener
    this.startBtn.on('pointerdown', () => this._togglePause());
    this.startBtn.on('pointerover', () => {
      if (!this.battleSystem.isPaused)
        this.startBtn.setStyle({ backgroundColor: '#253a58' });
    });
    this.startBtn.on('pointerout', () => {
      if (!this.battleSystem.isPaused)
        this.startBtn.setStyle({ backgroundColor: '#1a2a44', color: '#99bbee' });
    });

    if (this.preBattleHint) this.preBattleHint.setVisible(false);
    this.statusText.setText('战斗已开始');

    // Disable drag
    this.allPieces.forEach(p => {
      if (p.team === 'player' && p.container.input) {
        this.input.setDraggable(p.container, false);
        p.container.disableInteractive();
      }
    });

    // Activate R buttons — only for heroes currently ON the board
    Object.values(this.heroRefs).forEach(ref => {
      const { hero, ultBtn, ultName } = ref;
      if (hero.onBench) {
        // Hero is on bench: show locked bench state
        this.tweens.killTweensOf(ultBtn);
        ultBtn.setText('  R  （板凳席）  ')
          .setStyle({ color: '#333333', backgroundColor: '#0a0a0a' })
          .setAlpha(0.55).disableInteractive();
      } else if (!hero.ultimateUsed) {
        // Hero is on board: activate R button with pulse
        ultBtn.setText(`  R  ${ultName}  `)
          .setStyle({ color: '#ffee22', backgroundColor: '#554400' })
          .setAlpha(1).setInteractive({ cursor: 'pointer' });
        this.tweens.add({
          targets: ultBtn, alpha: 0.65,
          duration: 550, yoyo: true, repeat: -1
        });
      }
    });

    this.battleSystem.start();
  }

  // ── Hero panel update ────────────────────────────────────────────
  updateHeroPanel() {
    let eAlive = 0, pAlive = 0;
    this.allPieces.forEach(p => {
      if (!p.alive || p.onBench) return;
      if (p.team === 'enemy')  eAlive++;
      else                     pAlive++;
    });
    if (this.enemyCountText) this.enemyCountText.setText(String(eAlive));
    if (this.allyCountText)  this.allyCountText.setText(String(pAlive));

    Object.values(this.heroRefs).forEach(ref => {
      const { hero, hpFill, mpFill, BW, ultBtn, portrait, deathOverlay, deathLabel } = ref;

      // ── Hero death: apply once via _deadShown flag ──────────────
      if (!hero.alive) {
        if (!ref._deadShown) {
          ref._deadShown = true;

          // Darken portrait
          portrait.setFillStyle(0x1a0808).setStrokeStyle(2, 0x551111);

          // Show death overlay + label
          deathOverlay.setAlpha(0.62);
          deathLabel.setVisible(true);

          // Drain bars
          hpFill.displayWidth = 0;
          mpFill.displayWidth = 0;

          // R button → 英雄阵亡 state (overrides both "ready" and "已释放")
          this.tweens.killTweensOf(ultBtn);
          ultBtn.setText('  ✗  英雄阵亡  ')
            .setStyle({ color: '#552222', backgroundColor: '#0d0808' })
            .setAlpha(1).disableInteractive();
        }
        return; // skip normal bar updates
      }

      // ── Normal HP / mana bar update ─────────────────────────────
      const hpR = Math.max(0, hero.hp / hero.maxHp);
      hpFill.displayWidth = BW * hpR;
      if (hpR > 0.5)       hpFill.setFillStyle(0x44cc55);
      else if (hpR > 0.25) hpFill.setFillStyle(0xddcc22);
      else                 hpFill.setFillStyle(0xcc3333);

      const mpR = hero.mana / hero.maxMana;
      mpFill.displayWidth = BW * mpR;
    });
  }

  // Called when hero casts ultimate
  onUltimateCast(hero) {
    const ref = this.heroRefs[hero.id];
    if (!ref) return;
    this.tweens.killTweensOf(ref.ultBtn);
    ref.ultBtn.setText('  ✓  已释放  ')
      .setStyle({ color: '#333344', backgroundColor: '#111118' })
      .setAlpha(1).disableInteractive();
  }

  // ── Pause / Resume ───────────────────────────────────────────────
  _togglePause() {
    if (this.battleSystem.ended) return;

    this.battleSystem.togglePause();
    const paused = this.battleSystem.isPaused;

    // Update button
    this.startBtn.setText(paused ? '  ▶  继  续  ' : '  ⏸  暂  停  ')
      .setStyle({
        color:           paused ? '#ffee66' : '#99bbee',
        backgroundColor: paused ? '#443300' : '#1a2a44'
      });

    // Pause overlay on the board
    if (paused) {
      const bx = this.BOARD_X + (this.COLS * this.CELL_SIZE) / 2;
      const by = this.BOARD_Y + (this.ROWS * this.CELL_SIZE) / 2;

      this._pauseOverlay = this.add.rectangle(
        bx, by,
        this.COLS * this.CELL_SIZE, this.ROWS * this.CELL_SIZE,
        0x000000, 0.38
      ).setDepth(70);

      this._pauseLabel = this.add.text(bx, by, '⏸  已暂停', {
        fontSize: '22px', color: '#aaccff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(71);

      this._pauseHint = this.add.text(bx, by + 36, '点击「继续」或按空格恢复', {
        fontSize: '11px', color: '#778899'
      }).setOrigin(0.5).setDepth(71);
    } else {
      if (this._pauseOverlay) { this._pauseOverlay.destroy(); this._pauseOverlay = null; }
      if (this._pauseLabel)   { this._pauseLabel.destroy();   this._pauseLabel   = null; }
      if (this._pauseHint)    { this._pauseHint.destroy();    this._pauseHint    = null; }
    }
  }

  // ── Overtime callback ────────────────────────────────────────────
  onOvertimeStart() {
    this._overtimeActive = true;
    if (this.overtimeBar) {
      this.overtimeBar.displayWidth = 0;
      this.overtimeBar.setFillStyle(0xff3333);
    }

    // Flash board border red
    const flashRect = this.add.rectangle(
      this.BOARD_X + (this.COLS * this.CELL_SIZE) / 2,
      this.BOARD_Y + (this.ROWS * this.CELL_SIZE) / 2,
      this.COLS * this.CELL_SIZE, this.ROWS * this.CELL_SIZE,
      0, 0
    ).setStrokeStyle(4, 0xff3333).setDepth(60);

    this.tweens.add({
      targets: flashRect, alpha: 0.3, yoyo: true, repeat: 3, duration: 300,
      onComplete: () => flashRect.setStrokeStyle(3, 0xff3333).setAlpha(1)
    });

    // Big "加时！" popup
    const ot = this.add.text(
      this.BOARD_X + (this.COLS * this.CELL_SIZE) / 2,
      this.BOARD_Y + this.ROWS * this.CELL_SIZE / 2,
      '⚡ 加 时 ⚡', {
        fontSize: '32px', color: '#ff4422', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 4
      }
    ).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: ot, scaleX: 1.3, scaleY: 1.3,
      duration: 300, yoyo: true,
      onComplete: () => {
        this.tweens.add({ targets: ot, alpha: 0, duration: 600, delay: 600, onComplete: () => ot.destroy() });
      }
    });

    this._lastOvertimeSec = -1;
    this.statusText.setText('⚡ 加时赛开始！每秒递增伤害/攻速，奶盾渐受压制');
  }

  // ── Attack effects ───────────────────────────────────────────────
  showAttackEffect(attacker, target) {
    if (!target.alive && target.hp > 0) return; // skip stale refs
    const from = { x: attacker.visualX, y: attacker.visualY };
    const to   = { x: target.visualX,  y: target.visualY };
    const isRanged = attacker.range >= 2;
    const isAP = attacker.attackType === 'ap';

    // Projectile color: AP=blue, AD-player=orange, AD-enemy=red
    const projCol = isAP ? 0x6633ff
                  : attacker.team === 'player' ? 0xffaa22 : 0xff4466;

    if (isRanged) {
      // Projectile dot
      const dot = this.add.circle(from.x, from.y, isAP ? 5 : 4, projCol, 1)
        .setDepth(22);
      if (isAP) {
        // AP orb — add faint glow ring
        const glow = this.add.circle(from.x, from.y, 9, projCol, 0.3).setDepth(21);
        this.tweens.add({
          targets: glow, x: to.x, y: to.y, duration: 210, ease: 'Quad.easeIn',
          onComplete: () => glow.destroy()
        });
      }
      this.tweens.add({
        targets: dot, x: to.x, y: to.y, duration: 200, ease: 'Quad.easeIn',
        onComplete: () => dot.destroy()
      });
    } else {
      // Melee lunge: animate lunge offset on attacker piece
      const dx = (to.x - from.x) * 0.38;
      const dy = (to.y - from.y) * 0.38;
      this.tweens.add({
        targets: attacker,
        lungeOffsetX: dx, lungeOffsetY: dy,
        duration: 65, yoyo: true, ease: 'Sine.easeInOut'
      });

      // Slash flash at target
      const slash = this.add.rectangle(to.x, to.y,
        this.CELL_SIZE * 0.6, this.CELL_SIZE * 0.6, projCol, 0.4)
        .setDepth(22).setAngle(45);
      this.tweens.add({
        targets: slash, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 160,
        onComplete: () => slash.destroy()
      });
    }

    // Damage number float
    const dmgTxt = this.add.text(
      to.x + Phaser.Math.Between(-8, 8), to.y - 8,
      `-${attacker.atk}`, {
        fontSize: '13px',
        color: isAP ? '#8877ff' : (attacker.team === 'player' ? '#ffcc44' : '#ff5566'),
        fontStyle: 'bold', stroke: '#000', strokeThickness: 2
      }
    ).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: dmgTxt, y: to.y - 44, alpha: 0, duration: 700,
      ease: 'Quad.easeOut', onComplete: () => dmgTxt.destroy()
    });
  }

  showHealEffect(target, amount) {
    const pos = { x: target.visualX, y: target.visualY };
    const t = this.add.text(pos.x, pos.y - 10, `+${amount}`, {
      fontSize: '12px', color: '#44ffaa', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: pos.y - 42, alpha: 0, duration: 720, onComplete: () => t.destroy() });
  }

  showSkillEffect(piece, name, color = 0xffffff, big = false) {
    const pos = { x: piece.visualX, y: piece.visualY };
    const ring = this.add.circle(pos.x, pos.y, big ? 18 : 10, color, 0.55).setDepth(25);
    this.tweens.add({
      targets: ring, scaleX: big ? 6 : 3.5, scaleY: big ? 6 : 3.5, alpha: 0,
      duration: big ? 650 : 420, onComplete: () => ring.destroy()
    });
    const nt = this.add.text(pos.x, pos.y - 28, name, {
      fontSize: big ? '16px' : '13px',
      color: '#' + color.toString(16).padStart(6, '0'),
      fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(35);
    this.tweens.add({
      targets: nt, y: pos.y - (big ? 72 : 56), alpha: 0, duration: big ? 1100 : 880,
      onComplete: () => nt.destroy()
    });
  }

  showShieldEffect(piece) {
    if (piece._shieldCircle) piece._shieldCircle.destroy();
    piece._shieldCircle = this.add.circle(
      piece.visualX, piece.visualY,
      this.CELL_SIZE * 0.43, 0x44aaff, 0.25
    ).setStrokeStyle(2, 0x88ccff, 0.9).setDepth(9);
  }

  showShieldHit(piece) {
    if (!piece._shieldCircle) return;
    this.tweens.add({
      targets: piece._shieldCircle, alpha: 0.9, duration: 80, yoyo: true
    });
    const t = this.add.text(piece.visualX, piece.visualY - 10, '护盾', {
      fontSize: '11px', color: '#88ccff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: piece.visualY - 36, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }

  showDashEffect(hero, toPos) {
    // Dash trail
    const trail = this.add.line(0, 0,
      hero.visualX, hero.visualY, toPos.x, toPos.y, 0xff8800, 0.6
    ).setLineWidth(3).setDepth(20);
    this.tweens.add({ targets: trail, alpha: 0, duration: 350, onComplete: () => trail.destroy() });
  }

  // ── Blue ultimate animation ──────────────────────────────────────
  showBlueSurge(hero) {
    const pos = { x: hero.visualX, y: hero.visualY };

    // Large expanding ring (3 cells = 180px radius)
    for (let i = 0; i < 2; i++) {
      const ring = this.add.circle(pos.x, pos.y, 14 + i * 6, 0x4466ff, 0.5 - i * 0.15)
        .setDepth(24 - i);
      this.tweens.add({
        targets: ring, scaleX: 13, scaleY: 13, alpha: 0, duration: 680 + i * 100,
        onComplete: () => ring.destroy()
      });
    }

    // Ripple dots around impact zone
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const r = this.CELL_SIZE * 2.2;
      const dot = this.add.circle(
        pos.x + Math.cos(angle) * r, pos.y + Math.sin(angle) * r,
        7, 0x88aaff, 0.85
      ).setDepth(26);
      this.tweens.add({
        targets: dot, scaleX: 0, scaleY: 0, alpha: 0,
        duration: 500, delay: 160, onComplete: () => dot.destroy()
      });
    }

    // Screen flash
    const flash = this.add.rectangle(440, 345, 880, 690, 0x2233ff, 0.12).setDepth(55);
    this.tweens.add({ targets: flash, alpha: 0, duration: 450, onComplete: () => flash.destroy() });

    this.showSkillEffect(hero, '蓝色洪流', 0x5588ff, true);
  }

  // ── Sydney ultimate animation ────────────────────────────────────
  showSydneyFury(hero) {
    const pos = { x: hero.visualX, y: hero.visualY };

    // Burst of orange sparks
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const spark = this.add.rectangle(
        pos.x, pos.y, 3, 14, 0xff8800, 1
      ).setAngle(angle * 57.3).setDepth(26);
      this.tweens.add({
        targets: spark,
        x: pos.x + Math.cos(angle) * 55,
        y: pos.y + Math.sin(angle) * 55,
        alpha: 0, duration: 400,
        delay: i * 20,
        onComplete: () => spark.destroy()
      });
    }

    // Fury aura: persistent orange ring around Sydney (while furyMode active)
    const aura = this.add.circle(pos.x, pos.y, this.CELL_SIZE * 0.45, 0xff6600, 0)
      .setStrokeStyle(3, 0xff8800).setDepth(8);

    // Pulse aura while fury lasts
    const pulseTimer = this.time.addEvent({
      delay: 80, loop: true,
      callback: () => {
        if (!hero.furyMode) {
          pulseTimer.remove();
          this.tweens.add({ targets: aura, alpha: 0, duration: 300, onComplete: () => aura.destroy() });
          return;
        }
        aura.setPosition(hero.visualX, hero.visualY);
        aura.setAlpha(0.3 + 0.25 * Math.sin(Date.now() * 0.012));
      }
    });

    const flashOrange = this.add.rectangle(440, 345, 880, 690, 0xff6600, 0.10).setDepth(55);
    this.tweens.add({ targets: flashOrange, alpha: 0, duration: 400, onComplete: () => flashOrange.destroy() });

    this.showSkillEffect(hero, '西德之怒', 0xff8800, true);
  }

  // ── Battle end ───────────────────────────────────────────────────
  onBattleEnd(result) {
    this.scene.start('ResultScene', {
      result,
      elapsed: this.elapsedSec,
      allyAlive: this.allPieces.filter(p => p.alive && !p.onBench && p.team === 'player').length,
      relicName: this.relic?.name
    });
  }

  _fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
