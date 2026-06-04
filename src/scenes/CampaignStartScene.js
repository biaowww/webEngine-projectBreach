// CampaignStartScene.js — campaign entry screen
// Shows game title, hero info, starts the run when player clicks "开始战役"

class CampaignStartScene extends Phaser.Scene {
  constructor() { super({ key: 'CampaignStartScene' }); }

  create() {
    const CX = 440, CY = 345, W = 880, H = 690;

    // ── Background ────────────────────────────────────────────────
    this.add.rectangle(CX, CY, W, H, 0x080812);

    // Decorative grid lines (faint)
    for (let i = 0; i < 12; i++) {
      this.add.line(0, 0, i * 80, 0, i * 80, H, 0x1a1a30, 0.3).setLineWidth(1);
    }
    for (let j = 0; j < 9; j++) {
      this.add.line(0, 0, 0, j * 80, W, j * 80, 0x1a1a30, 0.3).setLineWidth(1);
    }

    // ── Title block ───────────────────────────────────────────────
    const titleBg = this.add.rectangle(CX, 120, 480, 80, 0x0d0d22)
      .setStrokeStyle(2, 0x334488).setAlpha(0);

    const gameTitle = this.add.text(CX, 100, '空  裂', {
      fontSize: '58px', color: '#ccddff', fontStyle: 'bold',
      stroke: '#000033', strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0);

    const gameSubtitle = this.add.text(CX, 148, 'K O N G  L I E  ·  英雄策略战棋', {
      fontSize: '13px', color: '#5566aa', letterSpacing: 3
    }).setOrigin(0.5).setAlpha(0);

    // ── Stage label ───────────────────────────────────────────────
    const stageLabel = this.add.text(CX, 194, '第 1 阶 段  ·  时 空 裂 变 之 路', {
      fontSize: '14px', color: '#7788bb'
    }).setOrigin(0.5).setAlpha(0);

    // Horizontal divider
    const div1 = this.add.line(0, 0, CX - 180, 216, CX + 180, 216, 0x334488, 0.8)
      .setLineWidth(1).setAlpha(0);

    // ── Hero card — Sydney (fixed main hero) ──────────────────────
    const heroCard = this._buildHeroCard(CX, 310);

    // ── Campaign info strip ───────────────────────────────────────
    const infoY = 450;
    const infoItems = [
      { icon: '⚔', label: '4 场棋局', sub: '3战+Boss' },
      { icon: '♥', label: '2 条命',   sub: '失败可重试' },
      { icon: '★', label: '1 件圣物', sub: '随机加成' },
      { icon: '＋', label: '局间奖励', sub: '3选1奕子' }
    ];
    const infoGroup = infoItems.map((item, i) => {
      const x = CX - 195 + i * 130;
      const bg  = this.add.rectangle(x, infoY, 112, 64, 0x0d1022)
        .setStrokeStyle(1, 0x2a3050).setAlpha(0);
      const ico = this.add.text(x, infoY - 14, item.icon, {
        fontSize: '18px', color: '#99aacc'
      }).setOrigin(0.5).setAlpha(0);
      const lbl = this.add.text(x, infoY + 4, item.label, {
        fontSize: '12px', color: '#ccddee', fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0);
      const sub = this.add.text(x, infoY + 20, item.sub, {
        fontSize: '9px', color: '#445566'
      }).setOrigin(0.5).setAlpha(0);
      return [bg, ico, lbl, sub];
    }).flat();

    // ── Start button ──────────────────────────────────────────────
    const startBtn = this.add.text(CX, 546, '  ▶  开 始 战 役  ', {
      fontSize: '20px', color: '#ffffff',
      backgroundColor: '#1a4488', padding: { x: 24, y: 12 }, fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0).setInteractive({ cursor: 'pointer' });

    startBtn.on('pointerover', () => startBtn.setStyle({ backgroundColor: '#2255aa' }));
    startBtn.on('pointerout',  () => startBtn.setStyle({ backgroundColor: '#1a4488' }));
    startBtn.on('pointerdown', () => this._beginCampaign());

    // Hint text
    const hint = this.add.text(CX, 604, '点击上方按钮开始战役  ·  战斗前可拖拽奕子调整阵型', {
      fontSize: '10px', color: '#334455'
    }).setOrigin(0.5).setAlpha(0);

    // ── Entrance animations ───────────────────────────────────────
    // fadeIn: alpha 0→1, with optional upward slide (y_offset pixels)
    const fadeIn = (targets, delay, y_offset = 0) => {
      const cfg = { targets, alpha: 1, duration: 380, delay, ease: 'Quad.easeOut' };
      // Only animate y when a single object and there is an actual offset
      if (!Array.isArray(targets) && y_offset > 0) {
        cfg.y = targets.y - y_offset;
        targets.y += y_offset; // start displaced, tween back
      }
      this.tweens.add(cfg);
    };

    fadeIn([titleBg, gameTitle], 60, 14);  // array → no y animation
    fadeIn(gameSubtitle, 200);
    fadeIn(stageLabel, 290);
    fadeIn(div1, 340);
    // Hero card elements fade in
    heroCard.forEach((obj, i) => fadeIn(obj, 380 + i * 30));
    // Info strip
    infoGroup.forEach((obj, i) => fadeIn(obj, 560 + i * 18));
    fadeIn(startBtn, 740);
    fadeIn(hint, 860);

    // Mobile: zoom + drag-to-pan so all content (incl. start button) is reachable
    MobileUtil.enableCameraDrag(this, { centerX: 440, centerY: 370 });

    // Subtle pulse on start button
    this.time.delayedCall(800, () => {
      this.tweens.add({
        targets: startBtn, alpha: 0.75,
        duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    });
  }

  _buildHeroCard(cx, cy) {
    const data = PIECE_DATA['hero_sydney'];
    const W = 460, H = 110;
    const cardBg = this.add.rectangle(cx, cy, W, H, 0x0d1022)
      .setStrokeStyle(2, 0x554422).setAlpha(0);

    // Color swatch / portrait
    const portrait = this.add.rectangle(cx - W / 2 + 44, cy, 66, 66, data.color)
      .setStrokeStyle(2, 0xffd700).setAlpha(0);
    const roleLabel = this.add.text(cx - W / 2 + 44, cy, data.roleLabel, {
      fontSize: '13px', color: '#fff', fontStyle: 'bold', fontFamily: 'monospace'
    }).setOrigin(0.5).setAlpha(0);

    // Name
    const nameMain = data.name.split('  ')[0];
    const nameEng  = data.name.split('  ')[1] || '';
    const txt1 = this.add.text(cx - W / 2 + 92, cy - 36, nameMain, {
      fontSize: '18px', color: '#fff', fontStyle: 'bold'
    }).setAlpha(0);
    const txt2 = this.add.text(cx - W / 2 + 92, cy - 14, nameEng, {
      fontSize: '12px', color: '#aabbcc'
    }).setAlpha(0);

    // Badge: 主英雄
    const badge = this.add.text(cx - W / 2 + 92, cy + 6, ' 主 英 雄 ', {
      fontSize: '10px', color: '#ffd700', backgroundColor: '#332200',
      padding: { x: 5, y: 2 }
    }).setAlpha(0);

    // Skills summary
    const skillLine = this.add.text(cx - W / 2 + 92, cy + 30, [
      `W  ${data.skills.w.name}   ·   R  ${data.skills.ultimate.name}`
    ].join(''), {
      fontSize: '10px', color: '#7788aa', fontFamily: 'monospace'
    }).setAlpha(0);

    // Desc (W skill)
    const descLine = this.add.text(cx - W / 2 + 92, cy + 46, data.skills.w.desc, {
      fontSize: '9px', color: '#445566', wordWrap: { width: 330 }
    }).setAlpha(0);

    // Main hero indicator on the right
    const indicator = this.add.text(cx + W / 2 - 8, cy - 40, '▶ 已选择', {
      fontSize: '10px', color: '#ffd700'
    }).setOrigin(1, 0).setAlpha(0);

    return [cardBg, portrait, roleLabel, txt1, txt2, badge, skillLine, descLine, indicator];
  }

  _beginCampaign() {
    // Reset state and pick relic for this run
    CampaignState.reset();
    CampaignState.currentRelic = RELICS[Math.floor(Math.random() * RELICS.length)];

    // Fade out then launch the campaign map (node 0 will be active)
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('CampaignMapScene');
    });
  }
}
