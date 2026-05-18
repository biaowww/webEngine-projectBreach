// BattleSystem.js — logic tick loop (fixed 100 ms)
//
// 单局时长规则：
//   常规战斗 (0–30s)：双方对拼，先清空对方获胜
//   加时赛   (30–45s)：每秒 +10% 伤害 & +10% 攻速（上限 70%）
//                       每秒 −10% 治疗/护盾/受控（下限 30%）
//   超时平局 (45s)：判平局，双方受到伤害

class BattleSystem {
  constructor(scene) {
    this.scene = scene;
    this.running = false;
    this.ended = false;
    this.TICK_MS = 100;
    this.accumulator = 0;
    this.elapsedMs = 0;

    this.isPaused = false;

    this.BATTLE_LIMIT_MS   = 30000; // 30 s → overtime trigger
    this.OVERTIME_LIMIT_MS = 15000; // 15 s of overtime → draw (total 45 s)
    this.overtimeActive = false;
  }

  // ── Overtime multiplier helpers (computed per-tick) ──────────────
  _overtimeSec() {
    if (!this.overtimeActive) return 0;
    return (this.elapsedMs - this.BATTLE_LIMIT_MS) / 1000;
  }

  // Damage multiplier: 1.0 → 1.7 (in 7 steps of +0.1/s, capped at 1.7)
  _dmgMult() {
    if (!this.overtimeActive) return 1.0;
    return Math.min(1.70, 1.0 + Math.floor(this._overtimeSec()) * 0.10);
  }

  // Attack-speed multiplier (divides cooldown): same progression as damage
  _spdMult() {
    return this._dmgMult();
  }

  // Heal/shield/CC multiplier: 1.0 → 0.3 (−0.1/s, floored at 0.3)
  _healMult() {
    if (!this.overtimeActive) return 1.0;
    return Math.max(0.30, 1.0 - Math.floor(this._overtimeSec()) * 0.10);
  }

  // ── Lifecycle ────────────────────────────────────────────────────
  start()  { this.running = true; this.isPaused = false; }
  stop()   { this.running = false; }

  pause() {
    if (!this.running || this.ended) return;
    this.running  = false;
    this.isPaused = true;
  }

  resume() {
    if (!this.isPaused || this.ended) return;
    this.running  = true;
    this.isPaused = false;
  }

  togglePause() {
    this.isPaused ? this.resume() : this.pause();
  }

  update(delta) {
    if (!this.running) return;
    this.accumulator += delta;
    while (this.accumulator >= this.TICK_MS) {
      this.accumulator -= this.TICK_MS;
      this._tick(this.TICK_MS);
    }
  }

  // ── Main tick ────────────────────────────────────────────────────
  _tick(delta) {
    this.elapsedMs += delta;

    // Overtime trigger
    if (!this.overtimeActive && this.elapsedMs >= this.BATTLE_LIMIT_MS) {
      this.overtimeActive = true;
      this.scene.onOvertimeStart();
    }

    // Draw check (overtime has lasted 15 s → total 45 s)
    if (this.overtimeActive && !this.ended) {
      const overtimeMs = this.elapsedMs - this.BATTLE_LIMIT_MS;
      if (overtimeMs >= this.OVERTIME_LIMIT_MS) {
        this.ended = true;
        this.stop();
        this.scene.time.delayedCall(500, () => this.scene.onBattleEnd('draw'));
        return;
      }
    }

    const all     = this.scene.allPieces;
    const players = all.filter(p => p.alive && !p.onBench && p.team === 'player');
    const enemies = all.filter(p => p.alive && !p.onBench && p.team === 'enemy');

    // Advance cooldowns for all living pieces
    all.forEach(p => { if (p.alive) p.tickCooldowns(delta); });

    // Process each living board piece
    // Note: a piece may have died earlier this same tick
    [...players, ...enemies].forEach(piece => {
      if (!piece.alive) return;

      const opponents = piece.team === 'player'
        ? enemies.filter(e => e.alive)
        : players.filter(p => p.alive);

      if (opponents.length === 0) return;

      const nearest = this._nearest(piece, opponents);
      piece.target = nearest;
      const dist = this._cheb(piece, nearest);

      if (piece.isStunned()) return;

      if (dist <= piece.range) {
        // ── Attack ──
        if (piece.atkCooldown <= 0) {
          this._doAttack(piece, nearest);
        }
      } else {
        // ── Move toward best attack position ──
        if (piece.moveCooldown <= 0) {
          this._moveTowardTarget(piece, nearest, all);
          const spdMult = this.overtimeActive ? this._spdMult() : 1.0;
          piece.moveCooldown = (piece.moveSpeed * 1000) / spdMult;
        }
      }

      // ── Support healer passive (suppressed in overtime) ──
      if (piece.role === 'support' && piece.healAmount > 0 && piece.healCooldown <= 0) {
        const healMult = this._healMult();
        if (healMult > 0.01) { // still has some effect
          const allies = piece.team === 'player'
            ? players.filter(p => p.alive)
            : enemies.filter(e => e.alive);
          const wounded = allies
            .filter(a => a.hp < a.maxHp)
            .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
          if (wounded.length > 0) {
            const healAmt = Math.max(1, Math.floor(piece.healAmount * healMult));
            wounded[0].heal(healAmt);
            piece.statHealDone += healAmt; // track healing output on the healer
            this.scene.showHealEffect(wounded[0], healAmt);
            piece.healCooldown = piece.healInterval;
          }
        }
      }

      // ── Hero W skill (auto, at full mana) ──
      if (piece instanceof Hero && piece.alive) {
        piece.tryWSkill(opponents.filter(e => e.alive));
      }
    });

    // ── Win/lose check ──
    const pAlive = players.filter(p => p.alive).length;
    const eAlive = enemies.filter(e => e.alive).length;

    if (!this.ended && (pAlive === 0 || eAlive === 0)) {
      this.ended = true;
      this.stop();
      const result = eAlive === 0 ? 'win' : 'lose';
      this.scene.time.delayedCall(900, () => this.scene.onBattleEnd(result));
    }
  }

  // ── Attack ───────────────────────────────────────────────────────
  _doAttack(attacker, target) {
    // Damage
    let dmg = attacker.atk;
    if (this.overtimeActive) dmg *= this._dmgMult();
    if (attacker.furyMode)   dmg *= 1.5;
    const actualDmg = target.takeDamage(Math.floor(dmg));
    // Track dealt damage on the attacker
    if (attacker.attackType === 'ap') attacker.statDmgAP += actualDmg;
    else                               attacker.statDmgAD += actualDmg;

    // Attack cooldown (faster in overtime / fury)
    let cd = attacker.atkSpeed * 1000;
    if (this.overtimeActive) cd /= this._spdMult();
    if (attacker.furyMode)   cd *= 0.33;
    attacker.atkCooldown = cd;

    // Mana gain for heroes
    if (attacker instanceof Hero) attacker.gainMana(attacker.manaPerAtk);

    this.scene.showAttackEffect(attacker, target);
    this.scene.updateHeroPanel();
  }

  // ── Movement ─────────────────────────────────────────────────────
  _moveTowardTarget(piece, target, all) {
    const best = this._findAttackPosition(piece, target, all);
    if (best) this._stepToward(piece, best, all);
  }

  _findAttackPosition(piece, target, all) {
    const occupied = new Set(
      all.filter(p => p.alive && !p.onBench && p !== piece)
        .map(p => `${p.col},${p.row}`)
    );

    let best = null, bestDist = Infinity;

    for (let c = 0; c < 7; c++) {
      for (let r = 0; r < 8; r++) {
        if (Math.max(Math.abs(c - target.col), Math.abs(r - target.row)) > piece.range) continue;
        if (occupied.has(`${c},${r}`)) continue;
        const d = Math.max(Math.abs(c - piece.col), Math.abs(r - piece.row));
        if (d < bestDist) { bestDist = d; best = { col: c, row: r }; }
      }
    }
    return best;
  }

  _stepToward(piece, dest, all) {
    const dx = Math.sign(dest.col - piece.col);
    const dy = Math.sign(dest.row - piece.row);
    const candidates = [[dx,dy],[dx,0],[0,dy],[-dy,dx],[dy,-dx]];
    for (const [mx, my] of candidates) {
      if (mx === 0 && my === 0) continue;
      const nc = piece.col + mx, nr = piece.row + my;
      if (nc < 0 || nc >= 7 || nr < 0 || nr >= 8) continue;
      const blocked = all.some(p => p.alive && !p.onBench && p !== piece && p.col === nc && p.row === nr);
      if (!blocked) { piece.col = nc; piece.row = nr; return; }
    }
  }

  // ── Utilities ────────────────────────────────────────────────────
  _nearest(piece, targets) {
    return targets.reduce((best, t) =>
      this._cheb(piece, t) < this._cheb(piece, best) ? t : best
    );
  }

  _cheb(a, b) {
    return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
  }
}
