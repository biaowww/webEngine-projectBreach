// CityScene.js — zoomed view of 位面城
//
// Two entry points:
//   位面城议会 (unlocked) — campaign "Sydney's Memory" story
//   位面城学校 (locked)   — hero cultivation, demo not open
// Back button → WorldMapScene

class CityScene extends Phaser.Scene {
  constructor() { super({ key: 'CityScene' }); }

  create() {
    const CX = 440, CY = 345, W = 880, H = 690;

    // ── Background ──────────────────────────────────────────────────
    this.add.rectangle(CX, CY, W, H, 0x060810);

    // Faint city grid
    for (let i = 0; i < 12; i++)
      this.add.line(0,0, i*80,0, i*80,H, 0x0c1224, 0.4).setLineWidth(1);
    for (let j = 0; j < 9; j++)
      this.add.line(0,0, 0,j*80, W,j*80, 0x0c1224, 0.4).setLineWidth(1);

    // ── Location header ─────────────────────────────────────────────
    this.add.text(CX, 26, '位  面  城', {
      fontSize: '22px', color: '#3a5c99', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5);
    this.add.text(CX, 54, '— 时 空 裂 变 之 起 点  ·  第 1 阶 段 —', {
      fontSize: '9px', color: '#263647', letterSpacing: 3
    }).setOrigin(0.5);
    this.add.line(0,0, CX-320,72, CX+320,72, 0x1e2a44, 0.8).setLineWidth(1);

    // ── Entry points ────────────────────────────────────────────────
    this._buildEntry({
      x: CX - 175, y: 310,
      title:    '位面城议会',
      subtitle: '西德尼的回忆',
      desc:     '西德尼带领守卫军击败暗影\n开启时空裂变之路',
      flavour:  '「誓死守护这座城市」',
      icon:     '⚔',
      tag:      '战役 · 第1阶段',
      tagColor: '#44aacc',
      unlocked: true,
      action: () => this._startCampaign()
    });

    this._buildEntry({
      x: CX + 175, y: 310,
      title:    '位面城学校',
      subtitle: '英雄培养',
      desc:     '英雄升星 · 配装 · 技能强化\n构建专属英雄成长路线',
      flavour:  '— Demo 暂未开放 —',
      icon:     '📚',
      tag:      '未开放',
      tagColor: '#334455',
      unlocked: false
    });

    // ── Flavour quote ───────────────────────────────────────────────
    this.add.text(CX, 508, '「无论裂变多少次，我都会找到回来的路。」', {
      fontSize: '10px', color: '#1e2e44', fontStyle: 'italic', align: 'center'
    }).setOrigin(0.5);
    this.add.text(CX, 526, '— 西德尼', {
      fontSize: '9px', color: '#1a2738', align: 'center'
    }).setOrigin(0.5);

    // ── Back button ─────────────────────────────────────────────────
    const back = this.add.text(28, 30, '← 大地图', {
      fontSize: '11px', color: '#2a3e5a'
    }).setOrigin(0, 0.5).setInteractive({ cursor: 'pointer' });
    back.on('pointerover', () => back.setStyle({ color: '#5577aa' }));
    back.on('pointerout',  () => back.setStyle({ color: '#2a3e5a' }));
    back.on('pointerdown', () => {
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('WorldMapScene');
      });
    });

    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  _buildEntry({ x, y, title, subtitle, desc, flavour, icon, tag, tagColor, unlocked, action }) {
    const EW = 250, EH = 260;
    const bgCol   = unlocked ? 0x0c1a2e : 0x080910;
    const bdrCol  = unlocked ? 0x2e5599 : 0x161e2a;
    const titleC  = unlocked ? '#c0d4f0' : '#1c2432';
    const subC    = unlocked ? '#4a6c99' : '#141c26';
    const descC   = unlocked ? '#3a5070' : '#0e1318';

    // Card
    const card = this.add.rectangle(x, y, EW, EH, bgCol).setStrokeStyle(2, bdrCol);

    // Animated glow for unlocked
    if (unlocked) {
      const glow = this.add.rectangle(x, y, EW+6, EH+6, 0x1144aa, 0)
        .setStrokeStyle(3, 0x3366cc, 0);
      this.tweens.add({ targets: glow, alpha: 0.28, duration: 1200, yoyo: true, repeat: -1 });
    }

    // Icon
    this.add.text(x, y - EH/2 + 30, icon, { fontSize: '30px' }).setOrigin(0.5);

    // Tag chip
    const tagBg = unlocked ? 0x0e2240 : 0x0c1018;
    this.add.rectangle(x, y - EH/2 + 62, 100, 16, tagBg)
      .setStrokeStyle(1, unlocked ? 0x2a4a77 : 0x141c28);
    this.add.text(x, y - EH/2 + 62, tag, {
      fontSize: '8px', color: tagColor
    }).setOrigin(0.5);

    // Title
    this.add.text(x, y - EH/2 + 88, title, {
      fontSize: '16px', color: titleC, fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(x, y - EH/2 + 110, subtitle, {
      fontSize: '10px', color: subC
    }).setOrigin(0.5);

    // Divider
    this.add.line(0,0, x-100, y-EH/2+124, x+100, y-EH/2+124, unlocked ? 0x1e2e44 : 0x0d111a)
      .setLineWidth(1);

    // Description
    this.add.text(x, y - EH/2 + 148, desc, {
      fontSize: '9px', color: descC, align: 'center', wordWrap: { width: EW - 28 }
    }).setOrigin(0.5);

    // Flavour / locked notice
    this.add.text(x, y + EH/2 - 36, flavour, {
      fontSize: '9px', color: unlocked ? '#2a4a6a' : '#121820',
      fontStyle: 'italic', align: 'center'
    }).setOrigin(0.5);

    // CTA button
    if (unlocked && action) {
      const btn = this.add.text(x, y + EH/2 - 14, '▶  进入战役', {
        fontSize: '12px', color: '#3a6699', fontStyle: 'bold'
      }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
      btn.on('pointerover', () => btn.setStyle({ color: '#66aaee' }));
      btn.on('pointerout',  () => btn.setStyle({ color: '#3a6699' }));
      btn.on('pointerdown', action);

      card.setInteractive({ cursor: 'pointer' });
      card.on('pointerover', () => card.setStrokeStyle(2, 0x5588dd));
      card.on('pointerout',  () => card.setStrokeStyle(2, 0x2e5599));
      card.on('pointerdown', action);
    }
  }

  _startCampaign() {
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('CampaignStartScene');
    });
  }
}
