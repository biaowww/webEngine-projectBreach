// synergyData.js — synergy definitions and helper functions
//
// Each synergy has one or two activation thresholds.
// Counts come from the synergy tags on PIECE_DATA entries.

const SYNERGY_DATA = {
  '铁壁': {
    name: '铁壁', color: 0x4488cc,
    desc: '防御型奕子减伤',
    thresholds: [
      { count: 2, bonus: '坦克减伤 +15%' },
      { count: 4, bonus: '坦克减伤 +35%，反击伤害' }
    ]
  },
  '远射': {
    name: '远射', color: 0xccaa22,
    desc: '远程攻速与暴击',
    thresholds: [
      { count: 2, bonus: 'ADC攻速 +18%' },
      { count: 4, bonus: 'ADC攻速 +35%，暴击+20%' }
    ]
  },
  '圣光': {
    name: '圣光', color: 0x44cc88,
    desc: '治疗效果增强',
    thresholds: [
      { count: 1, bonus: '治疗量 +30%' },
      { count: 3, bonus: '治疗量 +70%，回蓝+25%' }
    ]
  },
  '联盟': {
    name: '联盟', color: 0x88aacc,
    desc: '多样性阵容奖励',
    thresholds: [
      { count: 2, bonus: '全队HP +10%' },
      { count: 4, bonus: '全队HP +22%，攻击+12%' }
    ]
  },
  '战士': {
    name: '战士', color: 0xcc6622,
    desc: '近战战士强化',
    thresholds: [
      { count: 2, bonus: '近战攻击 +15%' },
      { count: 3, bonus: '近战攻击 +28%，护甲穿透' }
    ]
  },
  '刃铠': {
    name: '刃铠', color: 0xaa7733,
    desc: 'FTR英雄特化',
    thresholds: [
      { count: 1, bonus: 'FTR英雄暴击 +25%' },
      { count: 2, bonus: 'FTR英雄暴击 +50%，减伤12%' }
    ]
  },
  '魔法': {
    name: '魔法', color: 0x8844dd,
    desc: 'AP伤害强化',
    thresholds: [
      { count: 2, bonus: 'AP伤害 +22%' },
      { count: 3, bonus: 'AP伤害 +42%，护盾+20%' }
    ]
  },
  '守护': {
    name: '守护', color: 0x4466cc,
    desc: '护盾效果增强',
    thresholds: [
      { count: 2, bonus: '护盾值 +30%' },
      { count: 3, bonus: '护盾+55%，受伤减12%' }
    ]
  }
};

// Count synergy tags for a list of piece IDs
function calcSynergies(pieceIds) {
  const counts = {};
  pieceIds.forEach(id => {
    const data = window.PIECE_DATA[id];
    if (!data?.synergies) return;
    data.synergies.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
  });
  return counts;
}

// Get the highest active threshold for a synergy at a given count
function getActiveThreshold(synergyName, count) {
  const def = SYNERGY_DATA[synergyName];
  if (!def) return null;
  let best = null;
  for (const t of def.thresholds) { if (count >= t.count) best = t; }
  return best;
}

// Get the next (not-yet-reached) threshold
function getNextThreshold(synergyName, count) {
  const def = SYNERGY_DATA[synergyName];
  if (!def) return null;
  for (const t of def.thresholds) { if (count < t.count) return t; }
  return null;
}

window.SYNERGY_DATA    = SYNERGY_DATA;
window.calcSynergies   = calcSynergies;
window.getActiveThreshold = getActiveThreshold;
window.getNextThreshold   = getNextThreshold;
