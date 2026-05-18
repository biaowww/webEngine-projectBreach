// Hero.js — extends Piece with mana, W auto-skill, and manual ultimate

class Hero extends Piece {
  constructor(scene, data, col, row) {
    super(scene, data, col, row);

    this.mana = 0;
    this.maxMana = data.maxMana || 100;
    this.manaPerAtk = data.manaPerAtk || 20;
    this.skills = data.skills || {};
    this.isSubHero = data.isSubHero || false;

    this.wCooldown = 0;
    this.ultimateUsed = false;
    this.furyMode = false;    // inherited but reaffirmed
    this.furyTimer = 0;

    this._buildManaBar();
  }

  // ── Mana bar (inserted before stunIcon) ─────────────────────────
  _buildManaBar() {
    const CELL = this.scene.CELL_SIZE;
    const sz = CELL * 0.76;
    const barW = sz + 4;
    const mpY = -sz * 0.5 - 16; // just above HP bar

    // Remove stunIcon so mana bars go below it
    this.container.remove(this.stunIcon);

    const mpBg = this.scene.add.rectangle(0, mpY, barW, 4, 0x111133).setOrigin(0.5);
    this.container.add(mpBg);
    this.manaBarFill = this.scene.add.rectangle(-barW / 2, mpY, barW, 4, 0x3366ff).setOrigin(0, 0.5);
    this.manaBarMaxW = barW;
    this.container.add(this.manaBarFill);

    // Re-add stunIcon on top
    this.container.add(this.stunIcon);

    // Mana-full glow (behind everything)
    this.manaGlow = this.scene.add.rectangle(0, 0, sz + 8, sz + 8, 0x4488ff, 0)
      .setStrokeStyle(2, 0x66aaff);
    this.container.add(this.manaGlow);
    this.container.sendToBack(this.manaGlow);
  }

  // ── Mana helpers ─────────────────────────────────────────────────
  gainMana(amount) {
    this.mana = Math.min(this.maxMana, this.mana + amount);
  }

  isManafull() { return this.mana >= this.maxMana; }

  // ── W Skill (auto-cast at full mana) ────────────────────────────
  tryWSkill(enemies) {
    if (!this.alive) return false;
    if (!this.isManafull() || this.wCooldown > 0) return false;
    const skill = this.skills.w;
    if (!skill) return false;

    switch (skill.effect) {

      case 'magic_shield': {
        // Blue: apply 150-point shield to self + nearest ally
        const allies = this.scene.allPieces.filter(
          p => p.alive && !p.onBench && p.team === 'player' && p !== this
        );
        const nearest = allies.length > 0
          ? allies.reduce((a, b) => this._cheb(a) < this._cheb(b) ? a : b)
          : null;

        [this, nearest].filter(Boolean).forEach(t => {
          t.shield = (t.shield || 0) + 150;
          this.scene.showShieldEffect(t);
        });
        break;
      }

      case 'rapid_slash': {
        // Sydney: teleport to cell adjacent to farthest enemy, deal 150 + stun 0.5s
        if (enemies.length === 0) break;
        const farthest = enemies.reduce((a, b) => this._cheb(a) > this._cheb(b) ? a : b);
        const adjCell = this._adjacentTo(farthest, this.scene.allPieces);
        if (adjCell) { this.col = adjCell.col; this.row = adjCell.row; }
        const rsDmg = farthest.takeDamage(150);
        this.statDmgAD += rsDmg; // Sydney is AD
        const bs = this.scene.battleSystem;
        farthest.stunTimer = 500 * (bs?.overtimeActive ? bs._healMult() : 1.0);
        this.scene.showDashEffect(this, this.scene.gridToWorld(farthest.col, farthest.row));
        break;
      }

    }

    this.mana = 0;
    this.wCooldown = skill.cooldown || 8000;
    this.scene.showSkillEffect(this, skill.name, 0xffffff);
    return true;
  }

  // ── Ultimate (player-triggered) ───────────────────────────────────
  castUltimate(enemies) {
    if (!this.alive || this.ultimateUsed) return false;
    const skill = this.skills.ultimate;
    if (!skill) return false;

    switch (skill.effect) {

      case 'blue_surge': {
        // Blue: AOE magic damage 160 in 3 squares
        enemies.forEach(e => {
          if (this._cheb(e) <= 3) {
            const bsDmg = e.takeDamage(160);
            this.statDmgAP += bsDmg; // Blue is AP
          }
        });
        this.scene.showBlueSurge(this);
        break;
      }

      case 'sydney_fury': {
        // Sydney: fury mode 4 seconds (×3 atk speed, ×1.5 damage)
        this.furyMode = true;
        this.furyTimer = 4000;
        this.scene.showSydneyFury(this);
        break;
      }

    }

    this.ultimateUsed = true;
    this.scene.onUltimateCast(this);
    return true;
  }

  // ── Helpers ──────────────────────────────────────────────────────
  _cheb(other) {
    return Math.max(Math.abs(this.col - other.col), Math.abs(this.row - other.row));
  }

  // Find the closest empty cell adjacent to `target`
  _adjacentTo(target, all) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
    const cells = dirs
      .map(([dc, dr]) => ({ col: target.col + dc, row: target.row + dr }))
      .filter(c => c.col >= 0 && c.col < 7 && c.row >= 0 && c.row < 8)
      .filter(c => !all.some(p => p.alive && !p.onBench && p !== this && p.col === c.col && p.row === c.row))
      .sort((a, b) => {
        const da = Math.max(Math.abs(a.col - this.col), Math.abs(a.row - this.row));
        const db = Math.max(Math.abs(b.col - this.col), Math.abs(b.row - this.row));
        return da - db;
      });
    return cells[0] || null;
  }

  // ── Cooldown tick override ────────────────────────────────────────
  tickCooldowns(delta) {
    super.tickCooldowns(delta);
    if (this.wCooldown > 0) this.wCooldown -= delta;
  }

  // ── Visual override (mana bar + glow) ────────────────────────────
  updateVisual() {
    super.updateVisual();
    if (!this.manaBarFill) return;

    const mpRatio = this.mana / this.maxMana;
    this.manaBarFill.displayWidth = this.manaBarMaxW * mpRatio;

    // Pulse glow when mana full and W available
    if (mpRatio >= 1 && this.wCooldown <= 0) {
      this.manaGlow.setAlpha(0.35 + 0.25 * Math.sin(Date.now() * 0.007));
    } else {
      this.manaGlow.setAlpha(0);
    }
  }
}
