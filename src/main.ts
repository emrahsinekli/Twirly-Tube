import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from './config/tuning';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: PALETTE.skyTop,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  fps: { target: 60 },
  input: { activePointers: 2 },
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene]
});

// e2e testleri ve konsoldan hata ayıklama için
declare global {
  interface Window {
    __GAME__: Phaser.Game;
  }
}
window.__GAME__ = game;
