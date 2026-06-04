// CampaignEndScene.js — shown after Boss win OR after running out of lives
//
// data: { win: boolean, elapsed: number }
// Uses CampaignState.lastBattleStats for the "查看本局数据" stats overlay.

class CampaignEndScene extends Phaser.Scene {
  constructor() { super({ key: 'CampaignEndScene' }); }

  create(data = {}) {
    const { win = false, elapsed = 0 } = data;
    const CX = 440, CY = 345, W = 880, H = 690;

    this._statsOverlay = null; // created on demand

    this.add.rectangle(CX, CY, W, H, 0x030308);

    // ── Card ──────────────────────────────────────────────────────
    const cardCol   = win ? 0x0a1a2a : 0x180808;
    const borderCol = win ? 0xffd700 : 0xff3344;
    const card = this.add.rectangle(CX, CY - 20, 540, 400, cardCol)
      .setStrokeStyle(3, borderCol).setAlpha(0);
    this.tweens.add({ targets: card, alpha: 1, duration: 400 });

    // ── Title ─────────────────────────────────────────────────────
    const titleStr   = win ? '战  役  完  成' : '战  役  失  败';
    const titleColor = win ? '#ffd700' : '#ff4455';
    const title = this.add.text(CX, CY - 160, titleStr, {
      fontSize: '42px', color: titleColor, fontStyle: 'bold', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, y: CY - 168, duration: 500, delay: 160 });

    // ── Sub text ──────────────────────────────────────────────────
    const fmt = s => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
    const subStr = win
      ? `耗时 ${fmt(elapsed)}  ·  第1阶段全部通关  ·  已解锁无尽模式（敬请期待）`
      : `连续失败  ·  战役结束  ·  但下次你会做得更好`;
    const sub = this.add.text(CX, CY - 102, subStr, {
      fontSize: '12px', color: '#cccccc', align: 'center', wordWrap: { width: 480 }
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, duration: 380, delay: 300 });

    // ── Campaign summary (win only) ───────────────────────────────
    if (win) {
      const items = [
        `主英雄：${PIECE_DATA[CampaignState.mainHero]?.name || CampaignState.mainHero}`,
        `副英雄：${CampaignState.subHero ? (PIECE_DATA[CampaignState.subHero]?.name || CampaignState.subHero) : '未选择'}`,
        `阵容规模：${CampaignState.roster.length + 1 + (CampaignState.subHero ? 1 : 0)} 名奕子（含英雄）`,
        `携带圣物：${CampaignState.currentRelic?.name || '—'}`
      ];
      items.forEach((line, i) => {
        const t = this.add.text(CX, CY - 48 + i * 22, line, {
          fontSize: '11px', color: '#7788aa', align: 'center'
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: t, alpha: 1, duration: 320, delay: 400 + i * 80 });
      });
    }

    // ── Buttons ───────────────────────────────────────────────────
    const btnY = CY + 145;

    if (win) {
      this._btn(CX - 80, btnY, '  ▶  再战一次  ', () => {
        CampaignState.reset();
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('CampaignStartScene');
        });
      });
      this._btn(CX + 80, btnY, '  返回大地图  ', () => {
        CampaignState.reset();
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('WorldMapScene');
        });
      });
    } else {
      this._btn(CX - 90, btnY, '  重新开始  ', () => {
        CampaignState.reset();
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('CampaignStartScene');
        });
      });
      this._btn(CX + 0, btnY, '  返回大地图  ', () => {
        CampaignState.reset();
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('WorldMapScene');
        });
      });
    }

    // ── "查看本局数据" button — always shown ──────────────────────
    const statsBtn = this.add.text(CX, btnY + 44, '  📊  查看本局数据  ', {
      fontSize: '12px', color: '#445566', backgroundColor: '#0a0c14', padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    statsBtn.on('pointerover', () => statsBtn.setStyle({ color: '#7799bb', backgroundColor: '#0d1422' }));
    statsBtn.on('pointerout',  () => statsBtn.setStyle({ color: '#445566', backgroundColor: '#0a0c14' }));
    statsBtn.on('pointerdown', () => this._showStatsOverlay());

    // ── Particles ─────────────────────────────────────────────────
    if (win) this._winBurst(CX, CY);
    else     this._loseFlash(CX, CY);

    // Mobile: zoom + drag-to-pan
    MobileUtil.enableCameraDrag(this, { centerX: 440, centerY: 345 });
  }

  // ── Stats overlay ─────────────────────────────────────────────────
  _showStatsOverlay() {
    if (this._statsOverlay) {
      // Toggle off
      this._statsOverlay.forEach(o => o.destroy());
      this._statsOverlay = null;
      return;
    }

    const stats = CampaignState.lastBattleStats;
    const CX = 440, CY = 345, W = 880, H = 690;
    const objs = [];

    const add = (obj) => { objs.push(obj); return obj; };

    // Semi-transparent overlay
    add(this.add.rectangle(CX, CY, W, H, 0x000000, 0.82).setDepth(80));

    const PW = 720, PH = 500;
    add(this.add.rectangle(CX, CY, PW, PH, 0x080c18).setStrokeStyle(2, 0x2a3a5a).setDepth(81));

    add(this.add.text(CX, CY - PH/2 + 22, '本局战斗数据', {
      fontSize: '16px', color: '#aabbdd', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(82));

    if (!stats) {
      add(this.add.text(CX, CY, '暂无战斗数据', { fontSize: '13px', color: '#445566' }).setOrigin(0.5).setDepth(82));
    } else {
      add(this.add.text(CX, CY - PH/2 + 46, `${stats.battleTitle}  ·  ${stats.result === 'win' ? '胜利' : '失败'}  ·  ${this._fmt(stats.elapsed)}`, {
        fontSize: '11px', color: '#5577aa', align: 'center'
      }).setOrigin(0.5).setDepth(82));

      // Two-column table: player | enemy
      const COL = { L: CX - PW/2 + 20, R: CX + 16 };
      const ROW  = 22;
      const hY   = CY - PH/2 + 72;

      ['我方', '敌方'].forEach((label, col) => {
        const baseX = col === 0 ? COL.L : COL.R;
        add(this.add.text(baseX, hY, label, { fontSize: '11px', color: '#7788aa', fontStyle: 'bold' }).setDepth(82));
        ['名称', 'AD伤', 'AP伤', '承伤', '治疗'].forEach((h, ci) => {
          add(this.add.text(baseX + ci * 66, hY + 16, h, { fontSize: '8px', color: '#334455' }).setDepth(82));
        });

        const rows = col === 0 ? (stats.playerStats || []) : (stats.enemyStats || []);
        rows.forEach((p, ri) => {
          const ry = hY + 32 + ri * ROW;
          const nameC = p.alive ? '#aabbcc' : '#554444';
          [p.name, p.adDmg||'—', p.apDmg||'—', p.taken||'—', p.heal||'—'].forEach((val, ci) => {
            const valC = ci === 0 ? nameC
                       : ci === 1 && val > 0 ? '#ddaa33'
                       : ci === 2 && val > 0 ? '#7788ff'
                       : ci === 3 && val > 0 ? '#cc6655'
                       : ci === 4 && val > 0 ? '#44cc77'
                       : '#334455';
            add(this.add.text(baseX + ci * 66, ry, String(val), { fontSize: '9px', color: valC }).setDepth(82));
          });
        });
      });

      // Vertical divider
      add(this.add.line(0,0, CX, hY+8, CX, hY + 8 + Math.max((stats.playerStats||[]).length,(stats.enemyStats||[]).length)*ROW, 0x1e2a44, 0.8).setLineWidth(1).setDepth(82));
    }

    // Close button
    const close = add(this.add.text(CX, CY + PH/2 - 22, '✕  关闭', {
      fontSize: '12px', color: '#5577aa'
    }).setOrigin(0.5).setDepth(82).setInteractive({ cursor: 'pointer' }));
    close.on('pointerover', () => close.setStyle({ color: '#99aacc' }));
    close.on('pointerout',  () => close.setStyle({ color: '#5577aa' }));
    close.on('pointerdown', () => {
      objs.forEach(o => o.destroy());
      this._statsOverlay = null;
    });

    this._statsOverlay = objs;
  }

  _btn(x, y, label, cb) {
    const b = this.add.text(x, y, label, {
      fontSize: '14px', color: '#ffffff', backgroundColor: '#1a3355', padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    b.on('pointerover', () => b.setStyle({ backgroundColor: '#2a4466' }));
    b.on('pointerout',  () => b.setStyle({ backgroundColor: '#1a3355' }));
    b.on('pointerdown', cb);
  }

  _winBurst(cx, cy) {
    const cols = [0xffd700, 0xff8844, 0x44aaff, 0x88ff44, 0xff44aa, 0xffffff, 0x44ffaa];
    for (let i = 0; i < 36; i++) {
      const dot = this.add.circle(cx, cy, Phaser.Math.Between(3,9), cols[i%cols.length], 1).setDepth(60);
      const angle = Math.random() * Math.PI * 2;
      const spd   = Phaser.Math.Between(80, 250);
      this.tweens.add({
        targets: dot, x: cx + Math.cos(angle)*spd, y: cy + Math.sin(angle)*spd,
        alpha: 0, duration: Phaser.Math.Between(600,1200), delay: Phaser.Math.Between(0,400),
        onComplete: () => dot.destroy()
      });
    }
  }

  _loseFlash(cx, cy) {
    const flash = this.add.rectangle(cx, cy, 880, 690, 0xff0000, 0.06).setDepth(55);
    this.tweens.add({ targets: flash, alpha: 0, duration: 600 });
  }

  _fmt(sec) {
    return `${Math.floor(sec/60)}:${Math.floor(sec%60).toString().padStart(2,'0')}`;
  }
}
