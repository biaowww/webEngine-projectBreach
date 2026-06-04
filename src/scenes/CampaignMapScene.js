// CampaignMapScene.js — roguelite campaign node map
//
// Shows 4 battle nodes in a horizontal path.
// Completed nodes: green ✓. Current node: glowing yellow (clickable).
// Future nodes: gray / locked.
// Sidebar: lives, relic, current roster synergies.
// Abort button: resets state → WorldMapScene.
//
// Receives optional data.fromReward = true when coming from BetweenBattleScene.

class CampaignMapScene extends Phaser.Scene {
  constructor() { super({ key: 'CampaignMapScene' }); }

  create(data = {}) {
    const CX = 440, CY = 345, W = 880, H = 690;

    this.add.rectangle(CX, CY, W, H, 0x060810);

    // Faint grid
    for (let i = 0; i < 12; i++)
      this.add.line(0,0, i*80,0, i*80,H, 0x0a1020, 0.35).setLineWidth(1);
    for (let j = 0; j < 9; j++)
      this.add.line(0,0, 0,j*80, W,j*80, 0x0a1020, 0.35).setLineWidth(1);

    // ── Header ──────────────────────────────────────────────────────
    this.add.text(CX, 24, '战  役  地  图', {
      fontSize: '16px', color: '#3a5577', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5);
    this.add.text(CX, 46, '第 1 阶 段  ·  时 空 裂 变 之 路', {
      fontSize: '9px', color: '#263040', letterSpacing: 3
    }).setOrigin(0.5);
    this.add.line(0,0, CX-340,60, CX+340,60, 0x1a2440, 0.8).setLineWidth(1);

    // ── Node map ─────────────────────────────────────────────────────
    this._buildNodeMap();

    // ── Right sidebar ────────────────────────────────────────────────
    this._buildSidebar();

    // ── Abort button ─────────────────────────────────────────────────
    this._buildAbortBtn();

    // ── Instruction text ─────────────────────────────────────────────
    const current = CampaignState.currentBattle;
    if (current < 4) {
      this.add.text(CX - 80, 610, '↑  点击当前节点进入战斗', {
        fontSize: '10px', color: '#334455'
      }).setOrigin(0.5);
    }

    // Mobile: zoom + drag-to-pan; centre on the active battle node
    const activeX = 160 + CampaignState.currentBattle * 168;
    MobileUtil.enableCameraDrag(this, { centerX: Math.min(activeX + 80, 700), centerY: 320 });

    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  _buildNodeMap() {
    const NODES = CAMPAIGN_BATTLES.map((b, i) => ({
      index: i, title: b.title, subtitle: b.subtitle,
      isBoss: b.isBoss || false,
      x: 160 + i * 168, y: 300
    }));

    const current = CampaignState.currentBattle;

    // Connecting lines
    for (let i = 0; i < NODES.length - 1; i++) {
      const a = NODES[i], b = NODES[i + 1];
      const done = i < current;
      this.add.line(0,0, a.x+44,a.y, b.x-44,b.y, done ? 0x2a5c2a : 0x1a2030, 0.9)
        .setLineWidth(3);
    }

    NODES.forEach(n => this._buildNode(n, current));
  }

  _buildNode(n, current) {
    const { index, title, subtitle, isBoss, x, y } = n;
    const done    = index < current;
    const active  = index === current;
    const locked  = index > current;

    const r       = isBoss ? 46 : 38;
    const bgCol   = done    ? 0x0a1f0a
                  : active  ? 0x1a1800
                  : 0x090c14;
    const bdrCol  = done    ? 0x2a5c2a
                  : active  ? 0xffd700
                  : isBoss  ? 0x441a22
                  : 0x1e2434;
    const labelC  = done    ? '#448844'
                  : active  ? '#ffd700'
                  : '#1e2434';
    const subC    = done    ? '#2a6633'
                  : active  ? '#aa9922'
                  : '#16202a';

    // Pulse for active node
    if (active) {
      const pulse = this.add.circle(x, y, r + 14, 0xffdd00, 0.08);
      this.tweens.add({ targets: pulse, alpha: 0.22, scaleX: 1.15, scaleY: 1.15,
        duration: 900, yoyo: true, repeat: -1 });
    }
    // Boss glow
    if (isBoss && !done) {
      const bossGlow = this.add.circle(x, y, r + 10, 0xcc2222, 0.07);
      this.tweens.add({ targets: bossGlow, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
    }

    const circle = this.add.circle(x, y, r, bgCol).setStrokeStyle(2, bdrCol);

    // Icon / status center
    const centerIcon = done    ? '✓'
                     : isBoss  ? 'BOSS'
                     : String(index + 1);
    const iconSize   = done ? '20px' : isBoss ? '11px' : '18px';
    const iconCol    = done ? '#2a8833' : isBoss ? (active ? '#ff8844' : '#441520') : labelC;
    this.add.text(x, y - 6, centerIcon, {
      fontSize: iconSize, color: iconCol, fontStyle: 'bold', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Title below node
    this.add.text(x, y + r + 12, subtitle || title.split('·')[1]?.trim() || title, {
      fontSize: '9px', color: labelC, align: 'center'
    }).setOrigin(0.5);

    // Battle number above node
    this.add.text(x, y - r - 12, title.split('·')[0]?.trim() || title, {
      fontSize: '8px', color: subC, align: 'center'
    }).setOrigin(0.5);

    // Enemy count hint under subtitle
    const enemyCount = CAMPAIGN_BATTLES[index]?.enemy?.length || 0;
    const maxBoard   = CAMPAIGN_BATTLES[index]?.maxPlayerOnBoard || 0;
    const hintCol    = active ? '#4a5a33' : (done ? '#2a4433' : '#161e28');
    this.add.text(x, y + r + 26, `${maxBoard}v${enemyCount}`, {
      fontSize: '8px', color: hintCol, fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Click handler — only active node can be entered
    if (active) {
      circle.setInteractive({ cursor: 'pointer' });
      circle.on('pointerover', () => {
        circle.setStrokeStyle(3, 0xffee44);
        circle.setFillStyle(0x261e00);
      });
      circle.on('pointerout', () => {
        circle.setStrokeStyle(2, 0xffd700);
        circle.setFillStyle(0x1a1800);
      });
      MobileUtil.onTap(this, circle, () => this._enterBattle(index));

      // "→ 进入" nudge
      const nudge = this.add.text(x, y + r + 40, '▶  进入战斗', {
        fontSize: '9px', color: '#4a6a22'
      }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
      MobileUtil.onTap(this, nudge, () => this._enterBattle(index));
    }
  }

  _enterBattle(index) {
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('BattleScene');
    });
  }

  // ── Right sidebar: status summary ───────────────────────────────────
  _buildSidebar() {
    const SX = 700, SY_start = 80;
    const SW = 170, SH = 480;
    const cx = SX + SW / 2;

    this.add.rectangle(cx, SY_start + SH/2, SW, SH, 0x070b14)
      .setStrokeStyle(1, 0x1a2438);

    let y = SY_start + 14;

    // Lives
    const livesStr = '♥'.repeat(CampaignState.lives) + '♡'.repeat(Math.max(0, 2 - CampaignState.lives));
    this.add.text(cx, y, livesStr, { fontSize: '20px', color: '#cc4455' }).setOrigin(0.5);
    this.add.text(cx, y + 22, '生  命', { fontSize: '8px', color: '#553344' }).setOrigin(0.5);
    y += 42;

    // Divider
    this.add.line(0,0, SX+8,y, SX+SW-8,y, 0x1a2438).setLineWidth(1);
    y += 10;

    // Relic
    const relic = CampaignState.currentRelic;
    if (relic) {
      this.add.text(cx, y, '圣  物', { fontSize: '9px', color: '#8a7733', fontStyle: 'bold' }).setOrigin(0.5);
      y += 16;
      this.add.rectangle(cx, y + 12, 28, 28, relic.color).setStrokeStyle(1, 0x998844);
      this.add.text(cx, y + 12, relic.icon, { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
      this.add.text(cx, y + 32, relic.name, { fontSize: '10px', color: '#ccaa55', fontStyle: 'bold' }).setOrigin(0.5);
      relic.buffs.forEach((b, i) => {
        this.add.text(cx, y + 46 + i * 14, b, { fontSize: '8px', color: '#667788', align: 'center', wordWrap: { width: SW - 16 } }).setOrigin(0.5);
      });
      y += 46 + relic.buffs.length * 14 + 8;
    }

    // Divider
    this.add.line(0,0, SX+8,y, SX+SW-8,y, 0x1a2438).setLineWidth(1);
    y += 10;

    // Active synergies
    this.add.text(cx, y, '当 前 羁 绊', { fontSize: '9px', color: '#4455aa', fontStyle: 'bold' }).setOrigin(0.5);
    y += 16;

    const allIds = [CampaignState.mainHero];
    if (CampaignState.subHero) allIds.push(CampaignState.subHero);
    allIds.push(...CampaignState.roster);
    const synCounts = calcSynergies(allIds);

    let hadSynergy = false;
    Object.entries(synCounts).sort((a,b) => b[1]-a[1]).forEach(([syn, cnt]) => {
      const thresh = getActiveThreshold(syn, cnt);
      const def    = SYNERGY_DATA[syn];
      const col    = thresh ? ('#' + (def?.color || 0x6677aa).toString(16).padStart(6,'0'))
                             : '#2a3040';
      const label  = thresh ? `${syn} ×${cnt}  ✓` : `${syn} ×${cnt}`;
      this.add.text(cx, y, label, { fontSize: '9px', color: col }).setOrigin(0.5);
      if (thresh) {
        this.add.text(cx, y + 12, thresh.bonus, { fontSize: '7px', color: '#33484a', align: 'center', wordWrap: { width: SW - 16 } }).setOrigin(0.5);
        y += 12;
      }
      y += 16;
      hadSynergy = true;
    });
    if (!hadSynergy) {
      this.add.text(cx, y, '暂无激活羁绊', { fontSize: '8px', color: '#1e2a38' }).setOrigin(0.5);
    }
  }

  // ── Abort button ──────────────────────────────────────────────────────
  _buildAbortBtn() {
    const btn = this.add.text(60, 648, '  中止战役  ', {
      fontSize: '11px', color: '#553333',
      backgroundColor: '#100808', padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    btn.on('pointerover', () => btn.setStyle({ color: '#cc4444', backgroundColor: '#1a0a0a' }));
    btn.on('pointerout',  () => btn.setStyle({ color: '#553333', backgroundColor: '#100808' }));
    MobileUtil.onTap(this, btn, () => this._abortCampaign());
  }

  _abortCampaign() {
    // Confirm-style: flash red then abort
    this.cameras.main.flash(300, 120, 20, 20);
    this.time.delayedCall(300, () => {
      CampaignState.reset();
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('WorldMapScene');
      });
    });
  }
}
