// BetweenBattleScene.js — post-battle reward screen
//
// Flow:
//   1. Top bar: progress + lives + last battle summary
//   2. If isHeroSelectBattle: sub-hero selection (must pick before proceeding)
//   3. 5-pick-2 unit reward cards (showing synergy impact for each choice)
//   4. Current roster strip
//   5. "进入战役地图" → CampaignMapScene (which routes to next BattleScene)

class BetweenBattleScene extends Phaser.Scene {
  constructor() { super({ key: 'BetweenBattleScene' }); }

  create(data = {}) {
    const { isHeroSelect = false, elapsed = 0, allyAlive = 0, relicName = '' } = data;
    const CX = 440, CY = 345, W = 880, H = 690;

    this._selectedUnits  = [];      // up to 2 pieceIds
    this._selectedHero   = null;
    this._heroConfirmed  = !isHeroSelect;
    this._proceedBtn     = null;

    // ── Background ────────────────────────────────────────────────
    this.add.rectangle(CX, CY, W, H, 0x080810);

    // ── Top bar ───────────────────────────────────────────────────
    this._buildTopBar(CX, W, elapsed, allyAlive, relicName);

    let contentY = 80;

    // ── Hero select (only after Battle 0) ─────────────────────────
    if (isHeroSelect) contentY = this._buildHeroSelect(CX, contentY);

    // ── Unit reward 5-pick-2 ──────────────────────────────────────
    contentY = this._buildUnitReward(CX, contentY, isHeroSelect);

    // ── Roster strip ──────────────────────────────────────────────
    contentY = this._buildRosterStrip(CX, contentY);

    // ── Proceed button ────────────────────────────────────────────
    this._buildProceedBtn(CX, contentY, isHeroSelect);
  }

  // ── Top bar ──────────────────────────────────────────────────────
  _buildTopBar(cx, W, elapsed, allyAlive, relicName) {
    this.add.rectangle(cx, 32, W, 62, 0x0a0a18).setStrokeStyle(1, 0x1e1e3a);

    const battle = CampaignState.currentBattle;
    const dots   = ['第1战', '第2战', '第3战', 'Boss'];
    dots.forEach((label, i) => {
      const x    = cx - 195 + i * 130;
      const done = i <= battle;
      const cur  = i === battle;
      this.add.circle(x, 20, cur ? 8 : 6, cur ? 0xffd700 : (done ? 0x44aa66 : 0x223344));
      if (i < dots.length - 1) {
        this.add.line(0,0, x+10,20, x+120,20, done ? 0x44aa66 : 0x223344, 0.8).setLineWidth(2);
      }
      this.add.text(x, 34, label, {
        fontSize: '8px', color: cur ? '#ffd700' : (done ? '#44aa66' : '#334455')
      }).setOrigin(0.5);
    });

    const fmt = s => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
    this.add.text(W - 18, 12, '♥'.repeat(CampaignState.lives) + '♡'.repeat(Math.max(0,2-CampaignState.lives)), {
      fontSize: '18px', color: '#ff6677'
    }).setOrigin(1,0);
    this.add.text(18, 12, `✓  胜利 · ${fmt(elapsed)} · 存活 ${allyAlive} 人`, {
      fontSize: '10px', color: '#44cc77'
    });
    if (relicName) this.add.text(18, 28, `圣物: ${relicName}`, { fontSize: '8px', color: '#998855' });
  }

  // ── Sub-hero selection ────────────────────────────────────────────
  _buildHeroSelect(cx, startY) {
    const y = startY + 10;

    this.add.text(cx, y, '— 副 英 雄 选 择 —', {
      fontSize: '12px', color: '#ccaa44', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(cx, y+16, '第1战胜利后可选择一名副英雄', { fontSize: '8px', color: '#556677' }).setOrigin(0.5);

    const options = SUB_HERO_OPTIONS;
    const cW = 190, cH = 98;
    const total = options.length * (cW + 18) - 18;
    const sx    = cx - total/2 + cW/2;
    this._heroCards = [];

    options.forEach((hero, i) => {
      const hx = sx + i * (cW + 18);
      const hy = y + 65;

      const bg = this.add.rectangle(hx, hy, cW, cH, 0x0d1022)
        .setStrokeStyle(2, hero.locked ? 0x1a1a2a : 0x334466);
      this.add.rectangle(hx-cW/2+28, hy-16, 36, 36, hero.color).setStrokeStyle(1, 0x556688);
      this.add.text(hx-cW/2+28, hy-16, hero.locked ? '?' : hero.id.split('_')[1]?.toUpperCase() || '?', {
        fontSize: '11px', color: hero.locked ? '#443355' : '#fff', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.add.text(hx-cW/2+52, hy-28, hero.name.split('  ')[0], {
        fontSize: '11px', color: hero.locked ? '#334455' : '#ccddee', fontStyle: 'bold'
      });
      this.add.text(hx-cW/2+52, hy-14, hero.role, { fontSize: '8px', color: hero.locked ? '#223344' : '#7788aa' });
      this.add.text(hx-cW/2+8, hy+6, hero.desc, {
        fontSize: '7px', color: hero.locked ? '#1e2030' : '#445566', wordWrap: { width: cW-14 }
      });
      if (hero.locked) this.add.text(hx, hy+30, '🔒 即将解锁', { fontSize: '9px', color: '#443355' }).setOrigin(0.5);

      this._heroCards.push({ heroId: hero.id, cardBg: bg });
      if (!hero.locked) {
        bg.setInteractive({ cursor: 'pointer' });
        bg.on('pointerover', () => { if (this._selectedHero !== hero.id) bg.setStrokeStyle(2, 0x5566aa); });
        bg.on('pointerout',  () => { if (this._selectedHero !== hero.id) bg.setStrokeStyle(2, 0x334466); });
        bg.on('pointerdown', () => this._selectHero(hero.id, bg));
      }
    });

    this._heroPrompt = this.add.text(cx, y+124, '↑ 请选择副英雄后继续', { fontSize: '8px', color: '#886644' }).setOrigin(0.5);
    return y + 148;
  }

  _selectHero(heroId, bg) {
    this._heroCards.forEach(({ heroId: hid, cardBg }) => {
      cardBg.setStrokeStyle(2, hid === heroId ? 0xffd700 : 0x334466);
    });
    this._selectedHero   = heroId;
    this._heroConfirmed  = true;
    CampaignState.subHero = heroId;
    if (this._heroPrompt) this._heroPrompt.setText('✓ 副英雄已选择').setStyle({ color: '#44cc77' });
    this._refreshProceedBtn();
  }

  // ── Unit reward 5-pick-2 ─────────────────────────────────────────
  _buildUnitReward(cx, startY, hasHeroSelect) {
    const y = startY + 12;
    this.add.line(0,0, cx-300,y, cx+300,y, 0x1e1e38, 0.8).setLineWidth(1);
    this.add.text(cx, y+12, '— 选 择 2 名 奕 子 加 入 阵 容  ( 5 选 2 ) —', {
      fontSize: '11px', color: '#aabbcc', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Current team synergies (before reward)
    const currentIds = [CampaignState.mainHero];
    if (CampaignState.subHero) currentIds.push(CampaignState.subHero);
    currentIds.push(...CampaignState.roster);
    const baseSyn = calcSynergies(currentIds);

    const battle  = CAMPAIGN_BATTLES[CampaignState.currentBattle];
    const pool    = (battle?.rewardPool || []).slice(0, 5);
    const cW      = 136, cH = hasHeroSelect ? 118 : 134;
    const gap     = 10;
    const totalW  = pool.length * (cW + gap) - gap;
    const sx      = cx - totalW/2 + cW/2;

    this._unitCards = [];

    pool.forEach((pieceId, i) => {
      const data = PIECE_DATA[pieceId];
      if (!data) return;

      const cardX = sx + i * (cW + gap);
      const cardY = y + 46 + cH/2;

      const cardBg = this.add.rectangle(cardX, cardY, cW, cH, 0x0c1020)
        .setStrokeStyle(2, 0x2a3050);

      // Swatch
      const sw = this.add.rectangle(cardX - cW/2 + 22, cardY - cH/2 + 18, 28, 28, data.color)
        .setStrokeStyle(1, 0x445566);
      this.add.text(cardX - cW/2 + 22, cardY - cH/2 + 18, data.roleLabel, {
        fontSize: '8px', color: '#fff', fontFamily: 'monospace'
      }).setOrigin(0.5);

      // Name + role
      this.add.text(cardX - cW/2 + 38, cardY - cH/2 + 8, data.name, {
        fontSize: '10px', color: '#ccddee', fontStyle: 'bold'
      });
      this.add.text(cardX - cW/2 + 38, cardY - cH/2 + 22, data.roleLabel + ' · ' + (data.attackType?.toUpperCase() || '—'), {
        fontSize: '7px', color: '#445566'
      });

      // Stats
      const sy = cardY - cH/2 + 38;
      [
        [`HP ${data.hp}`,              '#44cc55'],
        [`ATK ${data.atk}`,            '#ddaa33'],
        [`SPD ${data.atkSpeed?.toFixed(1)}s`, '#7788ff']
      ].forEach(([lbl, col], j) => {
        this.add.text(cardX - cW/2 + 6 + j * 44, sy, lbl, { fontSize: '7px', color: col });
      });

      // ── Synergy impact preview ─────────────────────────────────
      const synLineY = sy + 14;
      if (data.synergies?.length) {
        data.synergies.forEach((syn, si) => {
          const baseCount = baseSyn[syn] || 0;
          const newCount  = baseCount + 1;
          const wasActive = getActiveThreshold(syn, baseCount);
          const nowActive = getActiveThreshold(syn, newCount);
          const next      = getNextThreshold(syn, newCount);
          const def       = SYNERGY_DATA[syn];
          const col       = def ? ('#' + (def.color||0x6677aa).toString(16).padStart(6,'0')) : '#445566';

          let label;
          if (!wasActive && nowActive) {
            label = `✦ ${syn}(${newCount}) 激活!`;  // newly activated
          } else if (nowActive) {
            label = `${syn} ${baseCount}→${newCount} ✓`;
          } else {
            const need = next ? next.count : '?';
            label = `${syn} ${newCount}/${need}`;
          }
          this.add.text(cardX - cW/2 + 6, synLineY + si * 12, label, {
            fontSize: '7px',
            color: (!wasActive && nowActive) ? '#ffdd44' : col
          });
        });
      }

      // Already owned badge
      const owned = CampaignState.roster.includes(pieceId) ||
                    CampaignState.mainHero === pieceId ||
                    CampaignState.subHero  === pieceId;
      if (owned) {
        this.add.rectangle(cardX, cardY + cH/2 - 8, cW, 14, 0x0d0d18);
        this.add.text(cardX, cardY + cH/2 - 8, '已拥有', { fontSize: '7px', color: '#445566' }).setOrigin(0.5);
      }

      cardBg.setInteractive({ cursor: 'pointer' });
      cardBg.on('pointerover', () => {
        if (!this._selectedUnits.includes(pieceId)) cardBg.setStrokeStyle(2, 0x5566aa);
      });
      cardBg.on('pointerout', () => {
        if (!this._selectedUnits.includes(pieceId)) cardBg.setStrokeStyle(2, 0x2a3050);
      });
      cardBg.on('pointerdown', () => this._toggleUnit(pieceId));

      this._unitCards.push({ pieceId, cardBg });
    });

    this._unitPrompt = this.add.text(cx, y + 46 + cH + 4, '↑ 请选择 2 名奕子（已选 0/2）', {
      fontSize: '8px', color: '#886644'
    }).setOrigin(0.5);

    return y + 46 + cH + 20;
  }

  _toggleUnit(pieceId) {
    const idx = this._selectedUnits.indexOf(pieceId);
    if (idx >= 0) {
      // Deselect
      this._selectedUnits.splice(idx, 1);
      const card = this._unitCards.find(c => c.pieceId === pieceId);
      if (card) card.cardBg.setStrokeStyle(2, 0x2a3050);
    } else {
      if (this._selectedUnits.length >= 2) {
        // Deselect oldest
        const oldest = this._selectedUnits.shift();
        const oldCard = this._unitCards.find(c => c.pieceId === oldest);
        if (oldCard) oldCard.cardBg.setStrokeStyle(2, 0x2a3050);
      }
      this._selectedUnits.push(pieceId);
      const card = this._unitCards.find(c => c.pieceId === pieceId);
      if (card) card.cardBg.setStrokeStyle(2, 0xffd700);
    }
    const sel = this._selectedUnits.length;
    if (this._unitPrompt) {
      if (sel >= 2) {
        const names = this._selectedUnits.map(id => PIECE_DATA[id]?.name || id).join('、');
        this._unitPrompt.setText(`✓ 已选择：${names}`).setStyle({ color: '#44cc77' });
      } else {
        this._unitPrompt.setText(`↑ 请选择 2 名奕子（已选 ${sel}/2）`).setStyle({ color: '#886644' });
      }
    }
    this._refreshProceedBtn();
  }

  // ── Roster strip ──────────────────────────────────────────────────
  _buildRosterStrip(cx, startY) {
    const y = startY + 6;
    this.add.line(0,0, cx-300,y, cx+300,y, 0x1e1e38, 0.8).setLineWidth(1);
    this.add.text(cx, y+10, '当 前 阵 容', { fontSize: '9px', color: '#445566' }).setOrigin(0.5);

    const all = [CampaignState.mainHero];
    if (CampaignState.subHero) all.push(CampaignState.subHero);
    all.push(...CampaignState.roster);

    const sz = 34, gap = 5;
    const totalW = all.length * (sz + gap) - gap;
    const sx     = cx - totalW/2 + sz/2;

    all.forEach((id, i) => {
      const d = PIECE_DATA[id];
      if (!d) return;
      const ix = sx + i * (sz + gap);
      const iy = y + 34;
      this.add.rectangle(ix, iy, sz, sz, d.color).setStrokeStyle(1, d.isHero ? 0xffd700 : 0x334455);
      this.add.text(ix, iy, d.roleLabel, { fontSize: '7px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);
      this.add.text(ix, iy + sz/2 + 4, d.name.split('  ')[0], { fontSize: '6px', color: '#445566' }).setOrigin(0.5);
    });

    // Also show active synergies here
    const synCounts = calcSynergies(all);
    const activeSyns = Object.entries(synCounts)
      .filter(([s,c]) => getActiveThreshold(s,c))
      .map(([s,c]) => {
        const def = SYNERGY_DATA[s];
        return { s, c, color: def?.color || 0x6677aa };
      });

    if (activeSyns.length > 0) {
      let synX = cx - (activeSyns.length * 72)/2 + 36;
      this.add.text(cx, y + 62, '激活中：', { fontSize: '8px', color: '#2a3a44' }).setOrigin(0.5);
      activeSyns.forEach(({ s, c, color }) => {
        const col = '#' + color.toString(16).padStart(6,'0');
        this.add.text(synX, y + 76, `${s}×${c}`, { fontSize: '8px', color: col }).setOrigin(0.5);
        synX += 72;
      });
      return y + sz + 48;
    }
    return y + sz + 22;
  }

  // ── Proceed button ────────────────────────────────────────────────
  _buildProceedBtn(cx, startY, isHeroSelect) {
    const y = Math.max(startY + 10, 614);
    const ready = this._heroConfirmed && this._selectedUnits.length >= 2;

    this._proceedBtn = this.add.text(cx, y, '  ▶  进 入 战 役 地 图  ', {
      fontSize: '16px',
      color: ready ? '#ffffff' : '#334455',
      backgroundColor: ready ? '#1a4488' : '#0a0a14',
      padding: { x: 20, y: 10 }, fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ cursor: ready ? 'pointer' : 'default' });

    this._proceedBtn.on('pointerover', () => {
      if (this._heroConfirmed && this._selectedUnits.length >= 2)
        this._proceedBtn.setStyle({ backgroundColor: '#2255aa' });
    });
    this._proceedBtn.on('pointerout', () => {
      if (this._heroConfirmed && this._selectedUnits.length >= 2)
        this._proceedBtn.setStyle({ backgroundColor: '#1a4488' });
    });
    this._proceedBtn.on('pointerdown', () => this._proceed());

    this._blockedHint = this.add.text(cx, y+32, '', { fontSize: '8px', color: '#664422' }).setOrigin(0.5);
  }

  _refreshProceedBtn() {
    if (!this._proceedBtn) return;
    const ready = this._heroConfirmed && this._selectedUnits.length >= 2;
    this._proceedBtn.setStyle({
      color: ready ? '#ffffff' : '#334455',
      backgroundColor: ready ? '#1a4488' : '#0a0a14'
    }).setInteractive({ cursor: ready ? 'pointer' : 'default' });
    if (this._blockedHint) this._blockedHint.setText('');
  }

  _proceed() {
    if (!this._heroConfirmed) {
      if (this._blockedHint) this._blockedHint.setText('请先选择副英雄');
      return;
    }
    if (this._selectedUnits.length < 2) {
      if (this._blockedHint) this._blockedHint.setText('请选满 2 名奕子');
      return;
    }

    // Commit selections
    this._selectedUnits.forEach(id => {
      if (!CampaignState.roster.includes(id)) CampaignState.roster.push(id);
    });
    if (this._selectedHero) CampaignState.subHero = this._selectedHero;

    // Advance battle index
    CampaignState.currentBattle++;
    CampaignState.boardLayout = null;

    // Go to campaign map (not directly to BattleScene)
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('CampaignMapScene', { fromReward: true });
    });
  }
}
