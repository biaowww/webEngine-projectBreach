// WorldMapScene.js — world map entry point
//
// 7 regions displayed; only 位面城 unlocked in this demo.
// Bottom-left: hero selector (4 heroes, only Sydney unlocked).
// Click 位面城 → CityScene.

class WorldMapScene extends Phaser.Scene {
  constructor() { super({ key: 'WorldMapScene' }); }

  create() {
    const CX = 440, CY = 345, W = 880, H = 690;

    // ── Background ─────────────────────────────────────────────────
    this.add.rectangle(CX, CY, W, H, 0x04060e);

    // Faint grid
    for (let i = 0; i < 18; i++)
      this.add.line(0,0, i*52,0, i*52,H, 0x080f1e, 0.5).setLineWidth(1);
    for (let j = 0; j < 14; j++)
      this.add.line(0,0, 0,j*52, W,j*52, 0x080f1e, 0.5).setLineWidth(1);

    // Title
    this.add.text(CX, 22, '空  裂  大  地  图', {
      fontSize: '15px', color: '#334466', letterSpacing: 6
    }).setOrigin(0.5);
    this.add.text(CX, 42, 'KONG LIE  ·  WORLD MAP', {
      fontSize: '9px', color: '#1e2a3a', letterSpacing: 3
    }).setOrigin(0.5);

    // ── Region nodes ───────────────────────────────────────────────
    const REGIONS = [
      { name: '位面城',   x: 390, y: 310, unlocked: true,  story: '时空裂变之起点' },
      { name: '巨龙巢',   x: 640, y: 185, unlocked: false },
      { name: '魔法学院', x: 590, y: 430, unlocked: false },
      { name: '空  岛',   x: 220, y: 165, unlocked: false },
      { name: '漠  北',   x: 710, y: 345, unlocked: false },
      { name: '死  海',   x: 195, y: 475, unlocked: false },
      { name: '国之域',   x: 430, y: 565, unlocked: false }
    ];

    // Decorative connecting lines
    [[0,1],[0,2],[0,3],[1,4],[2,4],[3,5],[0,6],[2,6]].forEach(([a,b]) => {
      const ra = REGIONS[a], rb = REGIONS[b];
      const col = (ra.unlocked || rb.unlocked) ? 0x1a2a3a : 0x0c1018;
      this.add.line(0,0, ra.x,ra.y, rb.x,rb.y, col, 0.7).setLineWidth(1);
    });

    REGIONS.forEach(reg => this._buildRegionNode(reg));

    // ── Hero selector (bottom-left) ────────────────────────────────
    // On mobile the Phaser selector is replaced by a fixed HTML overlay
    // so it stays pinned to screen bottom-left even as the map is panned.
    if (MobileUtil.isMobile()) {
      MobileUtil.showHeroSelector();
      this.events.once('shutdown', () => MobileUtil.hideHeroSelector());
      this.events.once('destroy',  () => MobileUtil.hideHeroSelector());
    } else {
      this._buildHeroSelector();
    }

    // ── Version label ──────────────────────────────────────────────
    this.add.text(W - 10, H - 10, 'Demo · 第1阶段开放', {
      fontSize: '9px', color: '#1a2233'
    }).setOrigin(1,1);

    // ── Mobile: camera zoom + drag-to-pan + pinch-to-zoom ─────────
    // Focus on 位面城 (390, 310) so the only unlocked node is centred.
    MobileUtil.enableCameraDrag(this, { centerX: 390, centerY: 340 });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  _buildRegionNode(reg) {
    const { name, x, y, unlocked, story } = reg;
    const r       = unlocked ? 40 : 30;
    const bgCol   = unlocked ? 0x0c1e36 : 0x080b12;
    const bdrCol  = unlocked ? 0x2e5c99 : 0x141c28;
    const namCol  = unlocked ? '#b8ccee' : '#1e2a3a';

    // Pulse glow for unlocked region
    if (unlocked) {
      const glow = this.add.circle(x, y, r + 12, 0x1144aa, 0.14);
      this.tweens.add({ targets: glow, alpha: 0.32, duration: 1300, yoyo: true, repeat: -1 });
    }

    const circle = this.add.circle(x, y, r, bgCol).setStrokeStyle(2, bdrCol);

    this.add.text(x, y - (story ? 7 : 2), name, {
      fontSize: unlocked ? '12px' : '9px',
      color: namCol,
      fontStyle: unlocked ? 'bold' : 'normal',
      align: 'center'
    }).setOrigin(0.5);

    if (story) {
      this.add.text(x, y + 10, story, {
        fontSize: '7px', color: '#2a3e5a', align: 'center'
      }).setOrigin(0.5);
    }

    if (!unlocked) {
      this.add.text(x, y + 14, '未开放', {
        fontSize: '7px', color: '#1a2030'
      }).setOrigin(0.5);
    }

    if (unlocked) {
      // Clickable
      circle.setInteractive({ cursor: 'pointer' });
      circle.on('pointerover', () => {
        circle.setStrokeStyle(3, 0x5599ee);
        circle.setFillStyle(0x0f2840);
      });
      circle.on('pointerout', () => {
        circle.setStrokeStyle(2, 0x2e5c99);
        circle.setFillStyle(0x0c1e36);
      });
      // Use MobileUtil.onTap so a drag gesture doesn't accidentally trigger navigation
      MobileUtil.onTap(this, circle, () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('CityScene');
        });
      });

      // "点击进入" hint
      this.add.text(x, y + r + 12, '▶ 点击进入', {
        fontSize: '8px', color: '#2e5c99'
      }).setOrigin(0.5);
    }
  }

  _buildHeroSelector() {
    const px = 10, py = 515;
    const PW = 176, PH = 162;

    this.add.rectangle(px + PW/2, py + PH/2, PW, PH, 0x070a12)
      .setStrokeStyle(1, 0x1a2438);

    this.add.text(px + 10, py + 8, '英 雄 选 择', {
      fontSize: '11px', color: '#445577', fontStyle: 'bold'
    });
    this.add.text(px + 10, py + 24, 'Demo · 仅 开 放 西 德 尼', {
      fontSize: '7px', color: '#222c3a'
    });

    const HEROES = [
      { name: '西德尼', role: 'FTR', color: 0xcc4422, unlocked: true  },
      { name: '布  鲁', role: 'TANK', color: 0x2244bb, unlocked: false },
      { name: '???',    role: '???',  color: 0x1a1a2a, unlocked: false },
      { name: '???',    role: '???',  color: 0x1a1a2a, unlocked: false }
    ];

    HEROES.forEach((h, i) => {
      const hx = px + 10 + (i % 2) * 82;
      const hy = py + 38 + Math.floor(i / 2) * 60;
      const col = h.unlocked ? h.color : 0x0e1018;
      const bdr = h.unlocked ? 0xffd700 : 0x1a1e28;

      const card = this.add.rectangle(hx + 32, hy + 22, 66, 48, col)
        .setStrokeStyle(1, bdr);

      this.add.text(hx + 32, hy + 14, h.role, {
        fontSize: '9px', color: h.unlocked ? '#ffffff' : '#1e2030',
        fontFamily: 'monospace'
      }).setOrigin(0.5);

      this.add.text(hx + 32, hy + 28, h.name, {
        fontSize: '9px', color: h.unlocked ? '#ccddee' : '#1e2030'
      }).setOrigin(0.5);

      this.add.text(hx + 32, hy + 41, h.unlocked ? '已解锁' : '未解锁', {
        fontSize: '7px', color: h.unlocked ? '#448844' : '#1e2030'
      }).setOrigin(0.5);

      if (h.unlocked) {
        card.setInteractive({ cursor: 'pointer' });
        card.on('pointerover', () => card.setStrokeStyle(2, 0xffee44));
        card.on('pointerout',  () => card.setStrokeStyle(1, 0xffd700));
      }
    });
  }
}
