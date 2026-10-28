// NeuroJump: весь код в одном файле для простой загрузки. Позже разнесём по папкам.
import Phaser from 'phaser';

const W = 480, H = 854;
const COLORS = { bg: 0x0b1020, player: 0x4cf2c4, platform: 0x7a8cff };
const PHYS = { gravity: 900, jumpV: -560, moveSpeed: 320 };
const PLATFORM = { w: 90, h: 16, minGap: 70, maxGap: 150, count: 14 };

const Storage = {
  get best(): number { return Number(localStorage.getItem('nj_best') || 0); },
  set best(v: number) { localStorage.setItem('nj_best', String(v)); }
};

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.player).fillRoundedRect(0, 0, 40, 40, 12);
    g.fillStyle(0x0b1020).fillCircle(13, 15, 4).fillCircle(27, 15, 4);
    g.generateTexture('player', 40, 40); g.clear();
    g.fillStyle(COLORS.platform).fillRoundedRect(0, 0, PLATFORM.w, PLATFORM.h, 8);
    g.generateTexture('platform', PLATFORM.w, PLATFORM.h); g.destroy();
    this.scene.start('Menu');
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    const t = (y: number, s: string, size: number, c = '#fff') =>
      this.add.text(W / 2, y, s, { fontFamily: 'sans-serif', fontSize: `${size}px`, color: c, fontStyle: 'bold' }).setOrigin(0.5);
    t(H * 0.3, 'NeuroJump', 56, '#4cf2c4');
    t(H * 0.42, `Рекорд: ${Storage.best}`, 28);
    t(H * 0.6, 'Нажми, чтобы начать', 28, '#7a8cff');
    this.input.once('pointerdown', () => this.scene.start('Game'));
  }
}

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this); scene.physics.add.existing(this);
    this.setGravityY(PHYS.gravity).setDepth(10);
    (this.body as Phaser.Physics.Arcade.Body).setSize(30, 40).setOffset(5, 0);
  }
  jump() { this.setVelocityY(PHYS.jumpV); }
  move(dir: number) { this.setVelocityX(dir * PHYS.moveSpeed); }
  wrap() { if (this.x < -20) this.x = W + 20; else if (this.x > W + 20) this.x = -20; }
}

class InputSystem {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private tilt = 0;
  private onTilt = (e: DeviceOrientationEvent) => {
    const g = e.gamma ?? 0; this.tilt = Math.max(-1, Math.min(1, g / 20));
  };
  constructor(private scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard?.createCursorKeys();
    window.addEventListener('deviceorientation', this.onTilt);
    scene.events.once('shutdown', () => window.removeEventListener('deviceorientation', this.onTilt));
  }
  get dir(): number {
    const p = this.scene.input.activePointer;
    if (p.isDown) return p.x < W / 2 ? -1 : 1;
    if (this.cursors?.left.isDown) return -1;
    if (this.cursors?.right.isDown) return 1;
    return Math.abs(this.tilt) > 0.08 ? this.tilt : 0;
  }
}

class PlatformSystem {
  group: Phaser.Physics.Arcade.StaticGroup;
  private topY = 0;
  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.staticGroup();
    let y = H - 40;
    for (let i = 0; i < PLATFORM.count; i++) {
      const x = i === 0 ? W / 2 : Phaser.Math.Between(PLATFORM.w / 2, W - PLATFORM.w / 2);
      this.group.create(x, y, 'platform');
      this.topY = y; y -= this.gap(0);
    }
  }
  private gap(score: number) {
    const k = Math.min(score / 20000, 1);
    return Phaser.Math.Between(PLATFORM.minGap, PLATFORM.minGap + (PLATFORM.maxGap - PLATFORM.minGap) * (0.4 + 0.6 * k));
  }
  update(camY: number, score: number) {
    this.group.getChildren().forEach(o => {
      const p = o as Phaser.Physics.Arcade.Sprite;
      if (p.y > camY + H + 40) {
        this.topY -= this.gap(score);
        p.setPosition(Phaser.Math.Between(PLATFORM.w / 2, W - PLATFORM.w / 2), this.topY);
        (p.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      }
    });
  }
}

class GameScene extends Phaser.Scene {
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

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: COLORS.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, powerPreference: 'high-performance' },
  fps: { target: 60 },
  input: { activePointers: 2 },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scene: [BootScene, MenuScene, GameScene]
});
