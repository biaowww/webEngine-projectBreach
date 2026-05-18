// Piece.js — base piece class (heroes and supports)

class Piece {
  constructor(scene, data, col, row) {
    this.scene = scene;
    this.id = data.id;
    this.name = data.name;
    this.team = data.team;
    this.role = data.role;
    this.isHero = data.isHero || false;
    this.roleLabel = data.roleLabel || '?';
    this.attackType = data.attackType || 'ad';

    // Stats
    this.hp = data.hp;
    this.maxHp = data.maxHp;
    this.atk = data.atk;
    this.atkSpeed = data.atkSpeed;
    this.range = data.range || 1;
    this.moveSpeed = data.moveSpeed || 0.5;
    this.color = data.color;
    this.healAmount = data.healAmount || 0;
    this.healInterval = data.healInterval || 0;

    // Grid position (logical)
    this.col = col;
    this.row = row;

    // Board / bench state
    this.onBench = false;
    this.benchSlot = null;

    // Combat state
    this.alive = true;
    this.target = null;
    this.atkCooldown = 0;
    this.moveCooldown = 0;
    this.healCooldown = 0;
    this.stunTimer = 0;
    this.damageReduction = 0;
    this.shield = 0;          // absorbs damage before HP
    this.furyMode = false;    // Sydney's R buff
    this.furyTimer = 0;

    // Visual smooth movement
    const wp = scene.gridToWorld(col, row);
    this.visualX = wp.x;
    this.visualY = wp.y;

    // Melee lunge animation offset (tweened by BattleScene)
    this.lungeOffsetX = 0;
    this.lungeOffsetY = 0;

    // Drag state
    this._isDragging = false;
    this._dragOrigin = null;

    // Shield circle (managed by BattleScene)
    this._shieldCircle = null;

    // Battle stats (reset each battle, accumulated during combat)
    this.statDmgAD    = 0; // AD damage dealt
    this.statDmgAP    = 0; // AP damage dealt
    this.statDmgTaken = 0; // HP damage received (after shield / reduction)
    this.statHealDone = 0; // healing output (healers only)

    // Piece body size — stored for drag hit area
    this.sz = this.isHero ? scene.CELL_SIZE * 0.76 : scene.CELL_SIZE * 0.64;

    this.container = null;
    this.bodyRect = null;
    this.hpBarFill = null;
    this.hpBarMaxW = 0;
    this.stunIcon = null;

    this._buildVisual();
  }

  // ── Visual construction ──────────────────────────────────────────
  _buildVisual() {
    const scene = this.scene;
    const sz = this.sz;
    const isPlayer = this.team === 'player';

    this.container = scene.add.container(this.visualX, this.visualY);
    this.container.setDepth(this.row * 2 + (isPlayer ? 1 : 0));
    this.container._pieceRef = this; // back-reference for drag events

    // Drop shadow
    const shadow = scene.add.ellipse(2, sz * 0.40, sz * 0.85, sz * 0.28, 0x000000, 0.28);
    this.container.add(shadow);

    // Body rect
    this.bodyRect = scene.add.rectangle(0, 0, sz, sz, this.color)
      .setStrokeStyle(this.isHero ? 2.5 : 1.5,
        isPlayer ? 0xffd700 : 0xff4488);
    this.container.add(this.bodyRect);

    // Role label
    this.roleText = scene.add.text(0, -4, this.roleLabel, {
      fontSize: this.isHero ? '13px' : '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(this.roleText);

    // Name (below body)
    const shortName = this.name.split('  ')[0];
    const nameT = scene.add.text(0, sz * 0.5 + 3, shortName, {
      fontSize: '8px', color: '#dddddd', fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0);
    this.container.add(nameT);

    // HP bar
    const barW = sz + 4;
    const hpBarY = -sz * 0.5 - 10;
    const hpBg = scene.add.rectangle(0, hpBarY, barW, 5, 0x222222).setOrigin(0.5);
    this.container.add(hpBg);
    this.hpBarFill = scene.add.rectangle(-barW / 2, hpBarY, barW, 5, 0x33cc55).setOrigin(0, 0.5);
    this.hpBarMaxW = barW;
    this.container.add(this.hpBarFill);

    // Stun icon — added last so it's on top
    this.stunIcon = scene.add.text(0, -sz * 0.5 - 22, '✦', {
      fontSize: '10px', color: '#ffee00'
    }).setOrigin(0.5).setVisible(false);
    this.container.add(this.stunIcon);
  }

  // ── Per-frame visual update (60 fps) ────────────────────────────
  updateVisual() {
    if (!this.alive) return;
    if (this._isDragging) return; // position managed by drag event

    // Target world position depends on board vs bench
    let tx, ty;
    if (this.onBench) {
      const p = this.scene.benchSlotToWorld(this.benchSlot);
      tx = p.x; ty = p.y;
    } else {
      const p = this.scene.gridToWorld(this.col, this.row);
      tx = p.x; ty = p.y;
    }

    // Smooth lerp
    const lerp = 0.18;
    this.visualX += (tx - this.visualX) * lerp;
    this.visualY += (ty - this.visualY) * lerp;

    this.container.setPosition(
      this.visualX + this.lungeOffsetX,
      this.visualY + this.lungeOffsetY
    );

    // Scale down when on bench
    const scale = this.onBench ? 0.82 : 1.0;
    this.container.setScale(scale);

    // HP bar
    const hpRatio = Math.max(0, this.hp / this.maxHp);
    this.hpBarFill.displayWidth = this.hpBarMaxW * hpRatio;
    if (hpRatio > 0.5)       this.hpBarFill.setFillStyle(0x33cc55);
    else if (hpRatio > 0.25) this.hpBarFill.setFillStyle(0xddcc22);
    else                     this.hpBarFill.setFillStyle(0xcc3333);

    // Stun indicator
    this.stunIcon.setVisible(this.stunTimer > 0);

    // Fury mode — orange border glow for Sydney
    if (this.furyMode) {
      this.bodyRect.setStrokeStyle(3, 0xff8800);
    } else {
      this.bodyRect.setStrokeStyle(
        this.isHero ? 2.5 : 1.5,
        this.team === 'player' ? 0xffd700 : 0xff4488
      );
    }

    // Depth based on row
    this.container.setDepth(this.row * 2 + (this.team === 'player' ? 1 : 0));
  }

  // ── Logic tick (100 ms) ──────────────────────────────────────────
  tickCooldowns(delta) {
    if (this.atkCooldown  > 0) this.atkCooldown  -= delta;
    if (this.moveCooldown > 0) this.moveCooldown -= delta;
    if (this.healCooldown > 0) this.healCooldown -= delta;
    if (this.stunTimer    > 0) this.stunTimer    -= delta;
    if (this.furyTimer    > 0) {
      this.furyTimer -= delta;
      if (this.furyTimer <= 0) this.furyMode = false;
    }
  }

  // ── Combat ───────────────────────────────────────────────────────
  takeDamage(rawAmount) {
    let amount = rawAmount;

    // Shield absorbs first (effectiveness reduced in overtime)
    if (this.shield > 0) {
      const bs = this.scene.battleSystem;
      const shieldEff = bs?.overtimeActive ? bs._healMult() : 1.0;
      const absorbed = Math.min(this.shield * shieldEff, amount);
      // Deplete shield proportionally
      this.shield = Math.max(0, this.shield - absorbed / shieldEff);
      amount -= absorbed;
      if (amount <= 0) {
        this.scene.showShieldHit(this);
        return 0;
      }
    }

    const actual = Math.max(1, Math.floor(amount * (1 - this.damageReduction)));
    this.hp = Math.max(0, this.hp - actual);
    this.statDmgTaken += actual; // track HP damage received

    // Flash body
    this.scene.tweens.add({
      targets: this.bodyRect,
      alpha: 0.25,
      duration: 75,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    if (this.hp === 0) this._die();
    return actual;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  _die() {
    this.alive = false;
    if (this._shieldCircle) { this._shieldCircle.destroy(); this._shieldCircle = null; }
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 380,
      ease: 'Back.easeIn',
      onComplete: () => this.container.destroy()
    });
  }

  isStunned() { return this.stunTimer > 0; }
}
