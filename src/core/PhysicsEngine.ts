import Matter from 'matter-js';
import decomp from 'poly-decomp';
import { PHYSICS, RING_RADIUS, COLORS } from '../config/constants';
import { normalizeAngle, isAngleInRange, angleDistance, distance } from '../utils/math';
import type { Gap, FailureInfo, CollisionEvent, LevelConfig, BallData } from '../types';

Matter.Common.setDecomp(decomp);

const { Engine, World, Bodies, Body, Runner, Events, Composite } = Matter;

export class PhysicsEngine {
  engine: Matter.Engine;
  world: Matter.World;
  runner: Matter.Runner;
  ringBodies: Matter.Body[] = [];
  balls: Matter.Body[] = [];
  private collisionCallbacks: ((event: CollisionEvent) => void)[] = [];
  private ringRadius: number = 0;
  private ringThickness: number = PHYSICS.ringThickness;
  private ballRadius: number = PHYSICS.ballRadius;
  private gaps: Gap[] = [];
  private gapConfigs: { startAngle: number; angleWidth: number; rotationSpeed?: number }[] = [];
  private centerX: number = 0;
  private centerY: number = 0;
  private ballColors: Map<number, string> = new Map();

  constructor(centerX: number, centerY: number) {
    this.centerX = centerX;
    this.centerY = centerY;

    this.engine = Engine.create({
      gravity: { x: 0, y: PHYSICS.gravity, scale: 0.001 }
    });
    this.world = this.engine.world;
    this.runner = Runner.create();

    this.setupCollisionDetection();
  }

  private setupCollisionDetection(): void {
    Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;

      pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        const ballBody = this.balls.includes(bodyA) ? bodyA : this.balls.includes(bodyB) ? bodyB : null;
        const ringBody = this.ringBodies.includes(bodyA) ? bodyA : this.ringBodies.includes(bodyB) ? bodyB : null;

        if (ballBody && ringBody) {
          const ballData = this.getBallData(ballBody);
          const collisionNormal = {
            x: ballBody.position.x - this.centerX,
            y: ballBody.position.y - this.centerY
          };
          const len = Math.sqrt(collisionNormal.x ** 2 + collisionNormal.y ** 2);
          collisionNormal.x /= len;
          collisionNormal.y /= len;

          const collisionEvent: CollisionEvent = {
            ballId: parseInt(ballBody.label),
            speed: ballData.speed,
            position: { ...ballBody.position },
            normal: collisionNormal
          };

          this.collisionCallbacks.forEach((cb) => cb(collisionEvent));
        }
      });
    });
  }

  setupLevel(levelConfig: LevelConfig, centerX: number, centerY: number): void {
    this.centerX = centerX;
    this.centerY = centerY;
    this.ringRadius = RING_RADIUS[levelConfig.ringRadius];
    this.gapConfigs = levelConfig.gaps.map((g) => ({ ...g }));

    this.clear();
    this.createRing();
    this.createBalls(levelConfig.ballCount, levelConfig.restitution, levelConfig.friction, levelConfig.frictionAir);

    this.engine.gravity.x = 0;
    this.engine.gravity.y = PHYSICS.gravity;
  }

  private clear(): void {
    Composite.clear(this.world, false);
    this.ringBodies = [];
    this.balls = [];
    this.ballColors.clear();
    this.gaps = [];
  }

  private createRing(): void {
    this.gaps = this.gapConfigs.map((config) => ({
      startAngle: config.startAngle,
      endAngle: config.startAngle + config.angleWidth,
      centerAngle: config.startAngle + config.angleWidth / 2
    }));

    const segments = this.createRingSegments();
    segments.forEach((segment) => {
      World.add(this.world, segment);
      this.ringBodies.push(segment);
    });
  }

  private createRingSegments(): Matter.Body[] {
    const segments: Matter.Body[] = [];
    const outerRadius = this.ringRadius;
    const innerRadius = this.ringRadius - this.ringThickness;
    const totalAngle = 2 * Math.PI;

    const ringArcs: { start: number; end: number }[] = [];
    let currentAngle = -Math.PI;

    const sortedGaps = [...this.gaps].sort((a, b) => a.startAngle - b.startAngle);

    sortedGaps.forEach((gap) => {
      const gapStart = normalizeAngle(gap.startAngle);
      const gapEnd = normalizeAngle(gap.endAngle);

      if (currentAngle < gapStart) {
        ringArcs.push({ start: currentAngle, end: gapStart });
      }
      currentAngle = gapEnd;
    });

    if (currentAngle < Math.PI) {
      ringArcs.push({ start: currentAngle, end: Math.PI });
    }

    ringArcs.forEach((arc) => {
      const segment = this.createArcSegment(arc.start, arc.end, innerRadius, outerRadius);
      segments.push(segment);
    });

    return segments;
  }

  private createArcSegment(startAngle: number, endAngle: number, innerRadius: number, outerRadius: number): Matter.Body {
    const vertices: Matter.Vector[] = [];
    const steps = Math.ceil((endAngle - startAngle) * 30);

    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / steps);
      vertices.push({
        x: this.centerX + outerRadius * Math.cos(angle),
        y: this.centerY + outerRadius * Math.sin(angle)
      });
    }

    for (let i = steps; i >= 0; i--) {
      const angle = startAngle + (endAngle - startAngle) * (i / steps);
      vertices.push({
        x: this.centerX + innerRadius * Math.cos(angle),
        y: this.centerY + innerRadius * Math.sin(angle)
      });
    }

    return Bodies.fromVertices(this.centerX, this.centerY, [vertices], {
      isStatic: true,
      restitution: PHYSICS.defaultRestitution,
      friction: PHYSICS.defaultFriction,
      frictionAir: 0,
      label: 'ring'
    });
  }

  updateGapRotation(deltaTime: number): void {
    let needsUpdate = false;

    this.gapConfigs.forEach((config, index) => {
      if (config.rotationSpeed) {
        config.startAngle = normalizeAngle(config.startAngle + config.rotationSpeed * deltaTime);
        this.gaps[index] = {
          startAngle: config.startAngle,
          endAngle: config.startAngle + config.angleWidth,
          centerAngle: config.startAngle + config.angleWidth / 2
        };
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      this.rebuildRing();
    }
  }

  private rebuildRing(): void {
    this.ringBodies.forEach((body) => {
      World.remove(this.world, body);
    });
    this.ringBodies = [];

    const segments = this.createRingSegments();
    segments.forEach((segment) => {
      World.add(this.world, segment);
      this.ringBodies.push(segment);
    });
  }

  private createBalls(count: number, restitution: number, friction: number, frictionAir: number): void {
    for (let i = 0; i < count; i++) {
      const offsetAngle = (i / count) * Math.PI * 2;
      const offsetDistance = count > 1 ? 30 : 0;
      const x = this.centerX + Math.cos(offsetAngle) * offsetDistance;
      const y = this.centerY + Math.sin(offsetAngle) * offsetDistance;

      const color = COLORS.ballColors[i % COLORS.ballColors.length];
      const ball = this.createBall(x, y, color, restitution, friction, frictionAir, i);
      this.balls.push(ball);
      this.ballColors.set(i, color);

      Body.setVelocity(ball, { x: 0, y: 0 });
    }
  }

  private createBall(
    x: number,
    y: number,
    color: string,
    restitution: number,
    friction: number,
    frictionAir: number,
    id: number
  ): Matter.Body {
    const ball = Bodies.circle(x, y, this.ballRadius, {
      restitution,
      friction,
      frictionAir,
      label: id.toString(),
      collisionFilter: {
        group: -1
      }
    });

    World.add(this.world, ball);
    return ball;
  }

  rotateRing(deltaAngle: number): void {
    this.gapConfigs.forEach((config, index) => {
      config.startAngle = normalizeAngle(config.startAngle + deltaAngle);
      this.gaps[index] = {
        startAngle: config.startAngle,
        endAngle: config.startAngle + config.angleWidth,
        centerAngle: config.startAngle + config.angleWidth / 2
      };
    });

    this.rebuildRing();
  }

  checkFailure(): FailureInfo | null {
    for (const ball of this.balls) {
      const dx = ball.position.x - this.centerX;
      const dy = ball.position.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      if (dist > this.ringRadius + this.ballRadius) {
        for (const gap of this.gaps) {
          if (isAngleInRange(angle, gap.startAngle, gap.endAngle)) {
            return {
              ballId: parseInt(ball.label),
              reason: 'gap_escape',
              position: { ...ball.position },
              velocity: { ...ball.velocity }
            };
          }
        }
      }
    }

    return null;
  }

  checkBallNearGap(): number {
    let maxPulse = 0;

    for (const ball of this.balls) {
      const dx = ball.position.x - this.centerX;
      const dy = ball.position.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const innerRadius = this.ringRadius - this.ringThickness;

      if (dist > innerRadius * 0.7) {
        for (const gap of this.gaps) {
          const distToGap = angleDistance(angle, gap.centerAngle);
          if (distToGap < 15 * Math.PI / 180) {
            const pulse = 1 - distToGap / (15 * Math.PI / 180);
            maxPulse = Math.max(maxPulse, pulse);
          }
        }
      }
    }

    return maxPulse;
  }

  getBallData(body: Matter.Body): BallData {
    const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
    return {
      id: parseInt(body.label),
      x: body.position.x,
      y: body.position.y,
      radius: this.ballRadius,
      color: this.ballColors.get(parseInt(body.label)) || '#ffffff',
      velocity: { ...body.velocity },
      speed
    };
  }

  getAllBallData(): BallData[] {
    return this.balls.map((ball) => this.getBallData(ball));
  }

  getGaps(): Gap[] {
    return [...this.gaps];
  }

  getRingRadius(): number {
    return this.ringRadius;
  }

  getRingThickness(): number {
    return this.ringThickness;
  }

  getCenter(): { x: number; y: number } {
    return { x: this.centerX, y: this.centerY };
  }

  onCollision(callback: (event: CollisionEvent) => void): void {
    this.collisionCallbacks.push(callback);
  }

  start(): void {
    Runner.run(this.runner, this.engine);
  }

  stop(): void {
    Runner.stop(this.runner);
  }

  setSpeed(speed: number): void {
    this.engine.timing.timeScale = speed;
  }

  update(deltaTime: number): void {
    Engine.update(this.engine, deltaTime);
  }

  resize(centerX: number, centerY: number): void {
    const dx = centerX - this.centerX;
    const dy = centerY - this.centerY;

    this.centerX = centerX;
    this.centerY = centerY;

    this.ringBodies.forEach((body) => {
      Body.translate(body, { x: dx, y: dy });
    });
  }
}
