import Phaser from 'phaser';
import { W, H } from '../config';
import { Player } from '../entities/Player';
import { PlatformSystem } from '../systems/PlatformSystem';
import { InputSystem } from '../systems/InputSystem';
import { Storage } from '../services/Storage';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: PlatformSystem;
  private inputSys!: InputSystem;
  private scoreText!: Phaser.GameObjects.Text;
  private startY = 0;
  private score = 0;
  private dead = false;

  constructor() { super('Game'); }

  create() {
    this.score = 0; this.dead = false;
    this.cameras.main.setScroll(0, 0);
    this.platforms = new PlatformSystem(this);
    this.player = new Player(this, W / 2, H - 120);
    this.startY = this.player.y;
    this.inputSys = new InputSystem(this);
    this.physics.add.collider(
      this.player, this.platforms.group,
      () => this.player.jump(),
      () => this.player.body!.velocity.y > 0
    );
    this.scoreText = this.add.text(16, 24, '0', { fontFamily: 'sans-serif', fontSize: '32px', color: '#fff', fontStyle: 'bold' })
      .setScrollFactor(0).setDepth(100);
  }

  update() {
    if (this.dead) return;
    const cam = this.cameras.main;
    this.player.move(this.inputSys.dir);
    this.player.wrap();
    if (this.player.y < cam.scrollY + H * 0.45) cam.scrollY = this.player.y - H * 0.45;
    this.score = Math.max(this.score, Math.floor(this.startY - this.player.y));
    this.scoreText.setText(String(this.score));
    this.platforms.update(cam.scrollY, this.score);
    if (this.player.y > cam.scrollY + H + 60) this.gameOver();
  }

  private gameOver() {
    this.dead = true;
    if (this.score > Storage.best) Storage.best = this.score;
    this.physics.pause();
    const cx = W / 2, cy = this.cameras.main.scrollY + H / 2;
    const st = (y: number, s: string, size: number, c: string) =>
      this.add.text(cx, y, s, { fontFamily: 'sans-serif', fontSize: `${size}px`, color: c, fontStyle: 'bold' }).setOrigin(0.5).setDepth(100);
    st(cy - 40, 'Конец игры', 48, '#ff4d8d');
    st(cy + 20, `Счёт: ${this.score}  Рекорд: ${Storage.best}`, 26, '#ffffff');
    st(cy + 80, 'Нажми, чтобы повторить', 24, '#7a8cff');
    this.time.delayedCall(400, () => this.input.once('pointerdown', () => this.scene.restart()));
  }
}
