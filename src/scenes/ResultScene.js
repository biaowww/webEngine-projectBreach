// ResultScene.js — win/lose result screen

class ResultScene extends Phaser.Scene {
  constructor() { super({ key: 'ResultScene' }); }

  create(data) {
    const { result, elapsed, allyAlive, relicName } = data;
    const win  = result === 'win';
    const draw = result === 'draw';
    const lose = result === 'lose';
    const CX = 440, CY = 345;

    this.add.rectangle(CX, CY, 880, 690, 0x000000, 0.78);

    // Card color per result
    const cardColor  = win ? 0x0d2244  : draw ? 0x1a1a10  : 0x220d0d;
    const cardBorder = win ? 0xffd700  : draw ? 0xaaaa44  : 0xff3344;
    const card = this.add.rectangle(CX, CY, 460, 320, cardColor)
      .setStrokeStyle(3, cardBorder).setAlpha(0);
    this.tweens.add({ targets: card, alpha: 1, duration: 350 });

    // Title
    const titleStr  = win ? '战  斗  胜  利' : draw ? '超  时  平  局' : '战  斗  失  败';
    const titleColor = win ? '#ffd700' : draw ? '#cccc44' : '#ff4455';
    const title = this.add.text(CX, CY - 110, titleStr, {
      fontSize: '38px', color: titleColor,
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, y: CY - 116, duration: 450, delay: 180 });

    // Battle index label
    const battleCfg = CAMPAIGN_BATTLES[CampaignState.currentBattle];
    const battleTitle = battleCfg?.title || '';
    this.add.text(CX, CY - 70, battleTitle, {
      fontSize: '11px', color: '#556677'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.children.getAt(this.children.length - 1), alpha: 1, duration: 300, delay: 260 });

    // Sub info
    const allyTotal = (CampaignState.roster.length + 1 +
      (CampaignState.subHero ? 1 : 0));
    let sub;
    if (win)       sub = `全歼敌方 · 存活 ${allyAlive || '—'}/${allyTotal} · 耗时 ${this._fmt(elapsed || 0)}`;
    else if (draw) sub = `加时赛结束未分胜负 · 双方均受到伤害 · 耗时 ${this._fmt(elapsed || 0)}`;
    else {
      const livesLeft = CampaignState.lives - 1;
      sub = livesLeft > 0
        ? `全军覆没 · 失去一条命 · 剩余 ${livesLeft} 条命 · 耗时 ${this._fmt(elapsed || 0)}`
        : `全军覆没 · 命数耗尽 · 战役结束 · 耗时 ${this._fmt(elapsed || 0)}`;
    }
    const subTxt = this.add.text(CX, CY - 46, sub, {
      fontSize: '12px', color: '#cccccc', align: 'center', wordWrap: { width: 400 }
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: subTxt, alpha: 1, duration: 350, delay: 350 });

    // Relic carried
    if (relicName) {
      this.add.text(CX, CY - 16, `携带圣物：${relicName}`, { fontSize: '11px', color: '#aacc66' })
        .setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: this.children.getAt(this.children.length - 1), alpha: 1, duration: 350, delay: 450 });
    }

    // ── Campaign-aware button routing ─────────────────────────────
    const isLastBattle = CampaignState.currentBattle >= 3;

    if (win) {
      if (isLastBattle) {
        // Boss cleared → campaign end
        this._btn(CX, CY + 108, '战役结算 ▶', () => {
          this.cameras.main.fadeOut(280, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('CampaignEndScene', { win: true, elapsed });
          });
        });
      } else {
        // Normal win → between-battle
        this._btn(CX, CY + 108, '领取奖励 ▶', () => {
          const isHeroSelect = CAMPAIGN_BATTLES[CampaignState.currentBattle]?.isHeroSelectBattle;
          this.cameras.main.fadeOut(280, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('BetweenBattleScene', {
              isHeroSelect: !!isHeroSelect,
              elapsed, allyAlive,
              relicName: CampaignState.currentRelic?.name || relicName
            });
          });
        });
      }
      // Secondary options
      this._btnSmall(CX - 60, CY + 144, '重新开始战役', () => {
        CampaignState.reset();
        this.scene.start('CampaignStartScene');
      });
      this._btnSmall(CX + 60, CY + 144, '返回大地图', () => {
        CampaignState.reset();
        this.scene.start('WorldMapScene');
      });
    } else if (lose) {
      // Consume a life
      CampaignState.lives--;
      if (CampaignState.lives > 0) {
        // Can retry
        this._btn(CX - 85, CY + 108, '重试本局 ▶', () => {
          this.cameras.main.fadeOut(250, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('BattleScene');
          });
        });
        this._btn(CX + 85, CY + 108, '放弃战役', () => {
          CampaignState.reset();
          this.scene.start('WorldMapScene');
        });
      } else {
        // No lives left → campaign over
        this._btn(CX, CY + 108, '战役结束', () => {
          this.cameras.main.fadeOut(280, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('CampaignEndScene', { win: false, elapsed });
          });
        });
      }
    } else {
      // Draw: same as mini-loss (no life deducted), can retry or restart
      this._btn(CX - 85, CY + 108, '重试本局 ▶', () => {
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('BattleScene');
        });
      });
      this._btn(CX + 85, CY + 108, '返回大地图', () => {
        CampaignState.reset();
        this.scene.start('WorldMapScene');
      });
    }

    if (win)       this._burst(CX, CY);
    else if (draw) this._drawFlash(CX, CY);
  }

  _btn(x, y, label, cb) {
    const b = this.add.text(x, y, `  ${label}  `, {
      fontSize: '14px', color: '#ffffff', backgroundColor: '#224466', padding: { x: 10, y: 7 }
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    b.on('pointerover', () => b.setStyle({ backgroundColor: '#335577' }));
    b.on('pointerout',  () => b.setStyle({ backgroundColor: '#224466' }));
    b.on('pointerdown', cb);
  }

  _btnSmall(x, y, label, cb) {
    const b = this.add.text(x, y, label, {
      fontSize: '10px', color: '#445566'
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    b.on('pointerover', () => b.setStyle({ color: '#6677aa' }));
    b.on('pointerout',  () => b.setStyle({ color: '#445566' }));
    b.on('pointerdown', cb);
  }

  _burst(cx, cy) {
    const cols = [0xffd700, 0xff8844, 0x44aaff, 0x88ff44, 0xff44aa, 0xffffff];
    for (let i = 0; i < 24; i++) {
      const dot = this.add.circle(cx, cy,
        Phaser.Math.Between(3, 8), cols[i % cols.length], 1
      ).setDepth(60);
      const angle = Math.random() * Math.PI * 2;
      const spd = Phaser.Math.Between(70, 200);
      this.tweens.add({
        targets: dot,
        x: cx + Math.cos(angle) * spd,
        y: cy + Math.sin(angle) * spd,
        alpha: 0,
        duration: Phaser.Math.Between(500, 950),
        delay: Phaser.Math.Between(0, 250),
        onComplete: () => dot.destroy()
      });
    }
  }

  _drawFlash(cx, cy) {
    // Yellow-grey sparks for draw
    const cols = [0xaaaa44, 0x888844, 0xcccc66, 0x666633];
    for (let i = 0; i < 14; i++) {
      const dot = this.add.circle(cx, cy,
        Phaser.Math.Between(3, 6), cols[i % cols.length], 1
      ).setDepth(60);
      const angle = Math.random() * Math.PI * 2;
      const spd = Phaser.Math.Between(40, 120);
      this.tweens.add({
        targets: dot,
        x: cx + Math.cos(angle) * spd,
        y: cy + Math.sin(angle) * spd,
        alpha: 0,
        duration: Phaser.Math.Between(400, 700),
        onComplete: () => dot.destroy()
      });
    }
  }

  _fmt(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
