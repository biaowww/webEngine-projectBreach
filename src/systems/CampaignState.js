// CampaignState.js — global singleton tracking campaign progress across scenes
//
// Shared via window.CampaignState so all Phaser scenes can read/write it
// without ES module imports (the project uses plain script tags).

const CampaignState = {
  currentBattle: 0,    // 0–3: which battle index to play next
  lives: 2,
  mainHero: 'hero_sydney',
  subHero: null,       // 'hero_blue' | null
  roster: ['tank_support', 'adc_a', 'healer_support'],
  currentRelic: null,  // fixed for the whole run
  gold: 0,
  boardLayout: null,   // null = auto-place

  // Last battle stats snapshot — persisted here so CampaignEndScene can show them
  lastBattleStats: null,
  // { result, elapsed, allyAlive, relicName,
  //   playerStats: [{ name, adDmg, apDmg, taken, heal }],
  //   enemyStats:  [{ name, adDmg, apDmg, taken, heal }] }

  reset() {
    this.currentBattle   = 0;
    this.lives           = 2;
    this.mainHero        = 'hero_sydney';
    this.subHero         = null;
    this.roster          = ['tank_support', 'adc_a', 'healer_support'];
    this.currentRelic    = null;
    this.gold            = 0;
    this.boardLayout     = null;
    this.lastBattleStats = null;
  }
};

window.CampaignState = CampaignState;
