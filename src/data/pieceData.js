// pieceData.js — piece definitions, placement, relics
//
// 数值设计目标（正确阵型下约 18-20 秒决出胜负，加时赛在 30 秒触发）：
//
//   ADC  650 HP / 60 ATK / 0.78s  → ~77 DPS，玻璃炮，被提前消灭则输出断层
//   DEF  1500 HP / 30 ATK / 1.5s  → ~20 DPS，铁壁，靠辅助续血才能撑住
//   SUP  550 HP / 20 ATK / 2.0s   → ~10 DPS + 治疗，维持坦克续航的关键
//   FTR  750 HP / 70 ATK / 1.0s   → ~70 DPS，近战突击，需开路才能发挥
//   TANK 1200 HP / 55 ATK(AP) / 1.3s → ~42 DPS，前排魔法盾
//
//   玩家总DPS ≈ 296  |  敌方总HP ≈ 5300  |  TTK ≈ 18 s ✓
//   敌方总DPS ≈ 291  |  玩家总HP ≈ 5300  |  TTK ≈ 18 s ✓

// ── Relics ────────────────────────────────────────────────────────
const RELICS = [
  { id: 'ring_conquest',   name: '破军之戒', color: 0xcc3344, icon: '◈',
    buffs: ['AD攻击力 +22%', '技能伤害 +15%'],   statKey: 'atkBonus', statVal: 0.22 },
  { id: 'guardian_shield', name: '守护圣盾', color: 0x3366cc, icon: '◆',
    buffs: ['全队血量 +15%', '受伤减免 8%'],     statKey: 'hpBonus',  statVal: 0.15 },
  { id: 'eternal_tear',    name: '永恒之泪', color: 0x33aacc, icon: '◇',
    buffs: ['AP伤害 +20%', '回蓝速度 +40%'],     statKey: 'apBonus',  statVal: 0.20 },
  { id: 'battle_soul',     name: '战斗之魂', color: 0xdd7722, icon: '★',
    buffs: ['全队攻速 +18%', '暴击率 +10%'],     statKey: 'spdBonus', statVal: 0.18 },
  { id: 'oracle_eye',      name: '先知之眼', color: 0xaacc22, icon: '◎',
    buffs: ['大招CD −30%', 'W技能冷却 −25%'],    statKey: 'cdBonus',  statVal: 0.30 }
];

// ── Piece Definitions ──────────────────────────────────────────────
const PIECE_DATA = {

  // ── Player Heroes ─────────────────────────────────────────────
  hero_blue: {
    id: 'hero_blue',
    name: '布鲁  Blue',
    isHero: true, isSubHero: false,
    team: 'player',
    role: 'tank',
    attackType: 'ap',
    // 坦克定位：极高HP承伤、极低输出，普攻伤害远低于ADC助战奕子
    hp: 1520, maxHp: 1520,
    atk: 24,  atkSpeed: 1.60, range: 2,
    mana: 0,  maxMana: 90,   manaPerAtk: 22,
    moveSpeed: 0.65,
    color: 0x2244bb,
    roleLabel: 'TANK',
    skills: {
      w: { name: '魔晶护盾',
           desc: '为自身及最近队友施加150护盾，持续3秒',
           cooldown: 9000, effect: 'magic_shield' },
      ultimate: { name: '蓝色洪流',
                  desc: '以蓝为中心，3格内所有敌人受160魔法伤害',
                  effect: 'blue_surge' }
    },
    synergies: ['魔法', '守护']
  },

  hero_sydney: {
    id: 'hero_sydney',
    name: '西德尼  Sydney',
    isHero: true, isSubHero: true,
    team: 'player',
    role: 'atk_tank',
    attackType: 'ad',
    hp: 750, maxHp: 750,
    atk: 70,  atkSpeed: 1.00, range: 1,
    mana: 0,  maxMana: 80,   manaPerAtk: 26,
    moveSpeed: 0.50,
    color: 0xcc4422,
    roleLabel: 'FTR',
    skills: {
      w: { name: '急袭斩',
           desc: '冲向最远敌人造成150伤害，晕眩0.5秒',
           cooldown: 8000, effect: 'rapid_slash' },
      ultimate: { name: '西德之怒',
                  desc: '狂暴4秒：攻速×3，普攻伤害×1.5',
                  effect: 'sydney_fury' }
    },
    synergies: ['刃铠', '战士']
  },

  // ── Player Support Pieces ─────────────────────────────────────
  adc_a: {
    id: 'adc_a', name: '神射甲', isHero: false, team: 'player',
    role: 'adc', attackType: 'ad',
    hp: 650,  maxHp: 650,
    atk: 60,  atkSpeed: 0.78, range: 4,
    moveSpeed: 0.55, color: 0xcc9922, roleLabel: 'ADC',
    synergies: ['远射', '联盟']
  },
  adc_b: {
    id: 'adc_b', name: '神射乙', isHero: false, team: 'player',
    role: 'adc', attackType: 'ad',
    hp: 650,  maxHp: 650,
    atk: 60,  atkSpeed: 0.78, range: 4,
    moveSpeed: 0.55, color: 0xcc9922, roleLabel: 'ADC',
    synergies: ['远射', '铁壁']
  },

  tank_support: {
    id: 'tank_support', name: '护盾卫', isHero: false, team: 'player',
    role: 'tank', attackType: 'ad',
    hp: 1500, maxHp: 1500,
    atk: 30,  atkSpeed: 1.50, range: 1,
    moveSpeed: 0.72, color: 0x335588, roleLabel: 'DEF',
    synergies: ['铁壁', '远射']
  },

  healer_support: {
    id: 'healer_support', name: '圣愈者', isHero: false, team: 'player',
    role: 'support', attackType: 'ap',
    hp: 550,  maxHp: 550,
    atk: 20,  atkSpeed: 2.00, range: 3,
    healAmount: 42, healInterval: 3000,
    moveSpeed: 0.60, color: 0x228855, roleLabel: 'SUP',
    synergies: ['圣光', '联盟']
  },

  // ── Bench Pieces ──────────────────────────────────────────────
  bench_tank_1: {
    id: 'bench_tank_1', name: '卫兵甲', isHero: false, team: 'player',
    role: 'tank', attackType: 'ad',
    hp: 1100, maxHp: 1100, atk: 32, atkSpeed: 1.40, range: 1,
    moveSpeed: 0.68, color: 0x405870, roleLabel: 'DEF', synergies: ['铁壁']
  },
  bench_tank_2: {
    id: 'bench_tank_2', name: '卫兵乙', isHero: false, team: 'player',
    role: 'tank', attackType: 'ad',
    hp: 1100, maxHp: 1100, atk: 32, atkSpeed: 1.40, range: 1,
    moveSpeed: 0.68, color: 0x405870, roleLabel: 'DEF', synergies: ['铁壁']
  },
  bench_tank_3: {
    id: 'bench_tank_3', name: '卫兵丙', isHero: false, team: 'player',
    role: 'tank', attackType: 'ad',
    hp: 1100, maxHp: 1100, atk: 32, atkSpeed: 1.40, range: 1,
    moveSpeed: 0.68, color: 0x405870, roleLabel: 'DEF', synergies: ['铁壁']
  },

  // ── Enemy Shadow Pieces ───────────────────────────────────────
  shadow_adc_1: {
    id: 'shadow_adc_1', name: '暗影射手', isHero: false, team: 'enemy',
    role: 'adc', attackType: 'ad',
    hp: 650,  maxHp: 650,
    atk: 70,  atkSpeed: 0.68, range: 4,
    moveSpeed: 0.55, color: 0x6622aa, roleLabel: 'ADC'
  },
  shadow_adc_2: {
    id: 'shadow_adc_2', name: '暗影射手', isHero: false, team: 'enemy',
    role: 'adc', attackType: 'ad',
    hp: 650,  maxHp: 650,
    atk: 70,  atkSpeed: 0.68, range: 4,
    moveSpeed: 0.55, color: 0x6622aa, roleLabel: 'ADC'
  },
  shadow_adc_3: {
    id: 'shadow_adc_3', name: '暗影射手', isHero: false, team: 'enemy',
    role: 'adc', attackType: 'ad',
    hp: 650,  maxHp: 650,
    atk: 70,  atkSpeed: 0.68, range: 4,
    moveSpeed: 0.55, color: 0x6622aa, roleLabel: 'ADC'
  },
  shadow_tank_1: {
    id: 'shadow_tank_1', name: '暗影卫兵', isHero: false, team: 'enemy',
    role: 'tank', attackType: 'ad',
    hp: 1600, maxHp: 1600,
    atk: 38,  atkSpeed: 1.40, range: 1,
    moveSpeed: 0.72, color: 0x4a1870, roleLabel: 'DEF'
  },
  shadow_tank_2: {
    id: 'shadow_tank_2', name: '暗影卫兵', isHero: false, team: 'enemy',
    role: 'tank', attackType: 'ad',
    hp: 1600, maxHp: 1600,
    atk: 38,  atkSpeed: 1.40, range: 1,
    moveSpeed: 0.72, color: 0x4a1870, roleLabel: 'DEF'
  },
  shadow_healer: {
    id: 'shadow_healer', name: '暗影祭司', isHero: false, team: 'enemy',
    role: 'support', attackType: 'ap',
    hp: 620,  maxHp: 620,
    atk: 18,  atkSpeed: 2.00, range: 3,
    healAmount: 44, healInterval: 3000,
    moveSpeed: 0.60, color: 0x7a1888, roleLabel: 'SUP'
  }
};

// ── Initial Placement ──────────────────────────────────────────────
// Board: 7 cols (0–6) × 8 rows (0–7)
// Enemy zone: rows 0–3  (row 3 = front, row 0 = back corner)
// Player zone: rows 4–7 (row 4 = front, row 7 = back corner)
//
// 双方统一阵型规则：
//   前排 = DEF / TANK 承伤
//   中排 = FTR 突击/辅助跟随
//   最末排两角 = ADC 远程输出（最大化生存距离）
const INITIAL_PLACEMENT = {
  player: [
    // 前排 — 坦克（row 4）
    { pieceId: 'hero_blue',      col: 2, row: 4 },
    { pieceId: 'tank_support',   col: 4, row: 4 },
    // 中排 — 突击战士（row 5）
    { pieceId: 'hero_sydney',    col: 3, row: 5 },
    // 中排 — 辅助（row 6）
    { pieceId: 'healer_support', col: 3, row: 6 },
    // 最末排两角 — ADC（row 7）
    { pieceId: 'adc_a',          col: 0, row: 7 },
    { pieceId: 'adc_b',          col: 6, row: 7 }
  ],
  enemy: [
    // 前排 — 坦克（row 3，最靠近玩家）
    { pieceId: 'shadow_tank_1',  col: 2, row: 3 },
    { pieceId: 'shadow_tank_2',  col: 4, row: 3 },
    // 中排 — 辅助（row 2，保护在坦克身后）
    { pieceId: 'shadow_healer',  col: 3, row: 2 },
    // 最末排两角 + 中央 — ADC（row 0，最远离玩家）
    { pieceId: 'shadow_adc_1',   col: 0, row: 0 },
    { pieceId: 'shadow_adc_2',   col: 3, row: 0 },
    { pieceId: 'shadow_adc_3',   col: 6, row: 0 }
  ],
  bench: ['bench_tank_1', 'bench_tank_2', 'bench_tank_3']
};
