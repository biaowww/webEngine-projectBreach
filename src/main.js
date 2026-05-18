// main.js — Phaser game config and entry point

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 880,
  height: 690,
  parent: 'canvas-wrapper',
  backgroundColor: '#0d0d1a',
  scene: [BattleScene, ResultScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false
  }
});
