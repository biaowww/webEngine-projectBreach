// campaignData.js — configuration for each of the 4 campaign battles
//
// Battle scaling (Stage 1):
//   Battle 0: 3v3 (Sydney + 2 initial units) — tutorial pacing, ~12-15s TTK
//   Battle 1: 5v5 (Sydney + Blue + 3 units)  — medium, ~15-18s TTK
//   Battle 2: 6v6 (Sydney + Blue + 4 units)  — ≈ existing demo, ~18s TTK
//   Battle 3: 7v7 Boss (+ full roster)        — hard, boss hero leads enemy team

const CAMPAIGN_BATTLES = [
  // ── Battle 0 — Stage 1, Fight 1 "初遭遇" ──────────────────────────
  {
    id: 0,
    title: '第1阶段 · 第1战',
    subtitle: '初 遭 遇',
    maxPlayerOnBoard: 3,
    enemy: [
      // Front row: 2 weak grunt tanks
      { pieceId: 'shadow_grunt_1', col: 2, row: 3 },
      { pieceId: 'shadow_grunt_2', col: 4, row: 3 },
      // Back row: 1 archer
      { pieceId: 'shadow_adc_1',   col: 3, row: 0 }
    ],
    // Units offered as reward (5 shown, pick 2)
    rewardPool: ['adc_b', 'bench_tank_1', 'support_buffer', 'ftr_a', 'mage_a'],
    isHeroSelectBattle: true,   // triggers sub-hero selection after this battle
    stageProgress: [true, false, false, false]  // for progress indicator
  },

  // ── Battle 1 — Stage 1, Fight 2 "深入阴影" ───────────────────────
  {
    id: 1,
    title: '第1阶段 · 第2战',
    subtitle: '深 入 阴 影',
    maxPlayerOnBoard: 5,
    enemy: [
      // Front row: 2 tanks
      { pieceId: 'shadow_tank_1',  col: 2, row: 3 },
      { pieceId: 'shadow_tank_2',  col: 4, row: 3 },
      // Mid: healer protected in center
      { pieceId: 'shadow_healer',  col: 3, row: 2 },
      // Back: 2 archers at flanks
      { pieceId: 'shadow_adc_1',   col: 1, row: 0 },
      { pieceId: 'shadow_adc_2',   col: 5, row: 0 }
    ],
    rewardPool: ['bench_tank_2', 'adc_b', 'healer_support', 'ftr_a', 'mage_a'],
    stageProgress: [true, true, false, false]
  },

  // ── Battle 2 — Stage 1, Fight 3 "决战" (≈ existing demo) ─────────
  {
    id: 2,
    title: '第1阶段 · 第3战',
    subtitle: '决 战',
    maxPlayerOnBoard: 6,
    enemy: [
      // Front row: 2 tanks
      { pieceId: 'shadow_tank_1',  col: 2, row: 3 },
      { pieceId: 'shadow_tank_2',  col: 4, row: 3 },
      // Mid: healer
      { pieceId: 'shadow_healer',  col: 3, row: 2 },
      // Back: 3 archers
      { pieceId: 'shadow_adc_1',   col: 0, row: 0 },
      { pieceId: 'shadow_adc_2',   col: 3, row: 0 },
      { pieceId: 'shadow_adc_3',   col: 6, row: 0 }
    ],
    rewardPool: ['bench_tank_3', 'bench_tank_1', 'adc_b', 'ftr_a', 'support_buffer'],
    preEventText: '⚡ 收官战前·特殊强化',
    preEventDesc: '进入决战前，你的阵容获得短暂强化……',
    stageProgress: [true, true, true, false]
  },

  // ── Battle 3 — Stage 1 Boss "阴影领主" ───────────────────────────
  {
    id: 3,
    title: '第1阶段 · Boss战',
    subtitle: '阴 影 领 主',
    maxPlayerOnBoard: 7,
    enemy: [
      // Boss hero at center mid
      { pieceId: 'boss_shadow_lord', col: 3, row: 1 },
      // Front row: 2 tanks
      { pieceId: 'shadow_tank_1',    col: 2, row: 3 },
      { pieceId: 'shadow_tank_2',    col: 4, row: 3 },
      // Mid: healer
      { pieceId: 'shadow_healer',    col: 3, row: 2 },
      // Back: 3 archers
      { pieceId: 'shadow_adc_1',     col: 0, row: 0 },
      { pieceId: 'shadow_adc_2',     col: 3, row: 0 },
      { pieceId: 'shadow_adc_3',     col: 6, row: 0 }
    ],
    isBoss: true,
    stageProgress: [true, true, true, true]
  }
];

// ── Sub-hero options (shown after Battle 0) ──────────────────────────
const SUB_HERO_OPTIONS = [
  {
    id: 'hero_blue',
    name: '布鲁  Blue',
    role: 'AP 魔法坦克',
    desc: '前排承伤，满蓝释放魔晶护盾为队友加护盾；大招蓝色洪流造成范围魔法伤害',
    color: 0x2244bb,
    locked: false
  },
  {
    id: 'hero_shadow_sage',
    name: '暗影圣者',
    role: '即将解锁',
    desc: '— 开发中，敬请期待 —',
    color: 0x442266,
    locked: true
  }
];

// Expose globally
window.CAMPAIGN_BATTLES  = CAMPAIGN_BATTLES;
window.SUB_HERO_OPTIONS  = SUB_HERO_OPTIONS;
