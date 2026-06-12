import { COLORS } from '../config/constants';
import { normalizeAngle } from '../utils/math';
import type { BallData, TrailPoint, Particle, ComboText, Gap } from '../types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private width: number = 0;
  private height: number = 0;
  private centerX: number = 0;
  private centerY: number = 0;
  private animationFrame: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);
  }

  clear(): void {
    this.animationFrame++;

    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, Math.max(this.width, this.height) / 1.5
    );
    gradient.addColorStop(0, COLORS.backgroundGradientStart);
    gradient.addColorStop(1, COLORS.backgroundGradientEnd);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawBackgroundDecoration();
  }

  private drawBackgroundDecoration(): void {
    this.ctx.save();
    this.ctx.globalAlpha = 0.1;
    this.ctx.strokeStyle = COLORS.ring;
    this.ctx.lineWidth = 1;

    for (let i = 0; i < 3; i++) {
      const radius = 50 + i * 80 + Math.sin(this.animationFrame * 0.01 + i) * 10;
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawRing(radius: number, thickness: number, gaps: Gap[], pulseIntensity: number): void {
    const outerRadius = radius;
    const innerRadius = radius - thickness;

    this.ctx.save();

    if (pulseIntensity > 0) {
      this.ctx.shadowColor = COLORS.gapWarning;
      this.ctx.shadowBlur = 30 * pulseIntensity;
    } else {
      this.ctx.shadowColor = COLORS.ringGlow;
      this.ctx.shadowBlur = 20;
    }

    this.ctx.strokeStyle = COLORS.ring;
    this.ctx.lineWidth = thickness;
    this.ctx.lineCap = 'round';

    const sortedGaps = [...gaps].sort((a, b) => a.startAngle - b.startAngle);
    let startAngle = -Math.PI;

    sortedGaps.forEach((gap) => {
      const gapStart = normalizeAngle(gap.startAngle);
      const gapEnd = normalizeAngle(gap.endAngle);

      if (startAngle < gapStart) {
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, radius - thickness / 2, startAngle, gapStart);
        this.ctx.stroke();
      }

      this.drawGapEnd(gapStart, radius, thickness, pulseIntensity);
      this.drawGapEnd(gapEnd, radius, thickness, pulseIntensity);

      if (pulseIntensity > 0) {
        this.drawGapWarning(gap, radius, thickness, pulseIntensity);
      }

      startAngle = gapEnd;
    });

    if (startAngle < Math.PI) {
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, radius - thickness / 2, startAngle, Math.PI);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawGapEnd(angle: number, radius: number, thickness: number, pulseIntensity: number): void {
    const x = this.centerX + Math.cos(angle) * (radius - thickness / 2);
    const y = this.centerY + Math.sin(angle) * (radius - thickness / 2);

    this.ctx.save();
    this.ctx.fillStyle = pulseIntensity > 0 ? COLORS.gapWarning : COLORS.ring;
    this.ctx.shadowColor = pulseIntensity > 0 ? COLORS.gapWarning : COLORS.ringGlow;
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.arc(x, y, thickness / 2 + 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawGapWarning(gap: Gap, radius: number, thickness: number, pulseIntensity: number): void {
    const pulse = (Math.sin(this.animationFrame * 0.2) + 1) / 2;
    const alpha = pulseIntensity * (0.3 + pulse * 0.4);

    this.ctx.save();
    this.ctx.fillStyle = COLORS.gapWarning;
    this.ctx.globalAlpha = alpha;

    const outerRadius = radius;
    const innerRadius = radius - thickness;

    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, outerRadius + 5, gap.startAngle, gap.endAngle);
    this.ctx.arc(this.centerX, this.centerY, innerRadius - 5, gap.endAngle, gap.startAngle, true);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  drawBall(ball: BallData, trail: TrailPoint[]): void {
    if (trail.length > 1) {
      this.drawTrail(trail, ball.color);
    }

    this.ctx.save();

    const gradient = this.ctx.createRadialGradient(
      ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 0,
      ball.x, ball.y, ball.radius
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, ball.color);
    gradient.addColorStop(1, this.darkenColor(ball.color, 0.4));

    this.ctx.shadowColor = ball.color;
    this.ctx.shadowBlur = 15;

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.beginPath();
    this.ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.25, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawTrail(trail: TrailPoint[], color: string): void {
    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1];
      const curr = trail[i];
      const alpha = curr.alpha * 0.6;

      this.ctx.strokeStyle = color;
      this.ctx.globalAlpha = alpha;
      this.ctx.lineWidth = 4 * curr.alpha;

      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(curr.x, curr.y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawParticles(particles: Particle[]): void {
    this.ctx.save();

    particles.forEach((particle) => {
      const alpha = particle.life / particle.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.shadowColor = particle.color;
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.restore();
  }

  drawComboText(texts: ComboText[]): void {
    this.ctx.save();
    this.ctx.font = 'bold 24px Orbitron, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    texts.forEach((combo) => {
      this.ctx.globalAlpha = combo.alpha;
      this.ctx.fillStyle = COLORS.accent;
      this.ctx.shadowColor = COLORS.accent;
      this.ctx.shadowBlur = 10;
      this.ctx.fillText(combo.text, combo.x, combo.y);
    });

    this.ctx.restore();
  }

  drawLevelCompleteFlash(intensity: number): void {
    if (intensity <= 0) return;

    this.ctx.save();
    this.ctx.globalAlpha = intensity * 0.5;
    this.ctx.fillStyle = COLORS.success;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  drawSlowMotionOverlay(intensity: number): void {
    if (intensity <= 0) return;

    this.ctx.save();
    this.ctx.globalAlpha = intensity * 0.3;
    this.ctx.fillStyle = COLORS.gapWarning;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  drawCountdown(number: number, scale: number): void {
    this.ctx.save();

    const displayText = number > 0 ? number.toString() : 'GO!';
    const fontSize = 120 * scale;

    this.ctx.font = `bold ${fontSize}px Orbitron, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, fontSize
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, number > 0 ? COLORS.accent : COLORS.success);
    gradient.addColorStop(1, number > 0 ? COLORS.ring : COLORS.success);

    this.ctx.fillStyle = gradient;
    this.ctx.shadowColor = number > 0 ? COLORS.accent : COLORS.success;
    this.ctx.shadowBlur = 30 * scale;
    this.ctx.fillText(displayText, this.centerX, this.centerY);

    this.ctx.restore();
  }

  private darkenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) * (1 - amount));
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) * (1 - amount));
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) * (1 - amount));
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  getCenter(): { x: number; y: number } {
    return { x: this.centerX, y: this.centerY };
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getDPR(): number {
    return this.dpr;
  }
}
