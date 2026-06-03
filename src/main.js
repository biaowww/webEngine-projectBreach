// main.js — Phaser game config and entry point

const game = window.game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 880,
  height: 690,
  parent: 'canvas-wrapper',
  backgroundColor: '#0d0d1a',
  // Scene order: first scene in array is the startup scene
  scene: [
    WorldMapScene,        // entry point — world map
    CityScene,            // 位面城 city view
    CampaignStartScene,   // campaign intro + hero display
    CampaignMapScene,     // roguelite node map (between battles)
    BetweenBattleScene,   // post-battle reward + hero select
    CampaignEndScene,     // campaign win/lose screen
    BattleScene,          // main battle
    ResultScene           // single-battle result popup
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false
  },
  // Keep the game loop running even when the tab loses focus / visibility
  disableVisibilityChange: true,
  // Use setTimeout instead of requestAnimationFrame so the loop runs even
  // in environments where rAF is suppressed (e.g. background tabs, browser
  // extension execution contexts with a 0-dimension iframe)
  fps: {
    forceSetTimeOut: true,
    target: 60
  }
});
