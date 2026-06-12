import { GAME, COLORS } from '../config/constants';
import { randomRange } from '../utils/math';
import type { Particle, ComboText } from '../types';

export class ParticleSystem {
  private particles: Particle[] = [];
  private comboTexts: ComboText[] = [];

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (deltaTime / 16);
      p.y += p.vy * (deltaTime / 16);
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.comboTexts.length - 1; i >= 0; i--) {
      const t = this.comboTexts[i];
      t.y -= 1 * (deltaTime / 16);
      t.life -= deltaTime;
      t.alpha = Math.min(1, t.life / 500);

      if (t.life <= 0) {
        this.comboTexts.splice(i, 1);
      }
    }
  }

  spawnCollisionParticles(x: number, y: number, normalX: number, normalY: number, color: string): void {
    const count = GAME.particleCount;

    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(normalY, normalX) + randomRange(-Math.PI / 3, Math.PI / 3);
      const speed = randomRange(2, 6);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(300, 600),
        maxLife: 600,
        color,
        size: randomRange(2, 5)
      });
    }
  }

  spawnExplosionParticles(x: number, y: number, vx: number, vy: number, color: string): void {
    const count = GAME.particleCount * 2;
    const baseAngle = Math.atan2(vy, vx);

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + randomRange(-Math.PI / 2, Math.PI / 2);
      const speed = randomRange(3, 10);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(500, 1000),
        maxLife: 1000,
        color: i % 3 === 0 ? COLORS.gapWarning : color,
        size: randomRange(3, 7)
      });
    }
  }

  spawnLevelCompleteParticles(centerX: number, centerY: number): void {
    const count = 50;
    const colors = [COLORS.success, COLORS.ring, COLORS.accent, '#ffff00'];

    for (let i = 0; i < count; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(2, 8);

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(800, 1500),
        maxLife: 1500,
        color: colors[i % colors.length],
        size: randomRange(3, 8)
      });
    }
  }

  spawnComboText(text: string, x: number, y: number): void {
    this.comboTexts.push({
      text,
      x,
      y,
      alpha: 1,
      life: 1000
    });
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getComboTexts(): ComboText[] {
    return this.comboTexts;
  }

  clear(): void {
    this.particles = [];
    this.comboTexts = [];
  }
}
