import Matter from 'matter-js';
import { PHYSICS, RING_RADIUS, COLORS } from '../config/constants';
import { computeRingArcs, isAngleInRange, angleDistance } from '../utils/math';
import type { Gap, FailureInfo, CollisionEvent, LevelConfig, BallData } from '../types';

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
  private pendingRotation: number = 0;
  private rotationAccumulator: number = 0;
  private rotationThreshold: number = 0.01;
  private levelRestitution: number = PHYSICS.defaultRestitution;

  constructor(centerX: number, centerY: number) {
    this.centerX = centerX;
    this.centerY = centerY;

    this.engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.0015 },
      positionIterations: 30,
      velocityIterations: 30,
      constraintIterations: 10
    });
    this.world = this.engine.world;
    this.runner = Runner.create();

    this.setupCollisionDetection();
    this.setupAfterUpdate();
  }

  private setupAfterUpdate(): void {
    Events.on(this.engine, 'afterUpdate', () => {
      this.stabilizeBallSpeed();
      this.applyPendingRotation();
    });
  }

  private setupCollisionDetection(): void {
    Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;

      for (const pair of pairs) {
        const { bodyA, bodyB } = pair;

        const ballBody = this.balls.includes(bodyA) ? bodyA : this.balls.includes(bodyB) ? bodyB : null;
        const ringBody = this.ringBodies.includes(bodyA) ? bodyA : this.ringBodies.includes(bodyB) ? bodyB : null;

        if (ballBody && ringBody) {
          const collision = pair.collision;
          let normal = { x: collision.normal.x, y: collision.normal.y };

          if (this.balls.includes(bodyB)) {
            normal = { x: -normal.x, y: -normal.y };
          }

          const supports = collision.supports;
          if (supports && supports.length > 0) {
            const contactPoint = supports[0];
            const dx = ballBody.position.x - contactPoint.x;
            const dy = ballBody.position.y - contactPoint.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.001) {
              normal = { x: dx / dist, y: dy / dist };
            }
          }

          const ballData = this.getBallData(ballBody);
          const collisionEvent: CollisionEvent = {
            ballId: parseInt(ballBody.label),
            speed: ballData.speed,
            position: { x: ballBody.position.x, y: ballBody.position.y },
            normal
          };

          for (const cb of this.collisionCallbacks) {
            cb(collisionEvent);
          }
        }
      }
    });
  }

  private stabilizeBallSpeed(): void {
    for (const ball of this.balls) {
      const vx = ball.velocity.x;
      const vy = ball.velocity.y;
      const currentSpeed = Math.sqrt(vx * vx + vy * vy);

      if (currentSpeed > PHYSICS.maxBallSpeed) {
        const scale = PHYSICS.maxBallSpeed / currentSpeed;
        Body.setVelocity(ball, {
          x: vx * scale,
          y: vy * scale
        });
      } else if (currentSpeed > 0 && currentSpeed < PHYSICS.minBallSpeed) {
        const scale = PHYSICS.minBallSpeed / currentSpeed;
        Body.setVelocity(ball, {
          x: vx * scale,
          y: vy * scale
        });
      }
    }
  }

  private applyPendingRotation(): void {
    if (Math.abs(this.pendingRotation) < this.rotationThreshold) return;

    const rotation = this.pendingRotation;
    this.pendingRotation = 0;

    for (const body of this.ringBodies) {
      const dx = body.position.x - this.centerX;
      const dy = body.position.y - this.centerY;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const newX = this.centerX + dx * cos - dy * sin;
      const newY = this.centerY + dx * sin + dy * cos;

      Body.setPosition(body, { x: newX, y: newY });
      Body.setAngle(body, body.angle + rotation);
    }

    for (const config of this.gapConfigs) {
      config.startAngle += rotation;
    }

    for (let i = 0; i < this.gaps.length; i++) {
      const config = this.gapConfigs[i];
      this.gaps[i] = {
        startAngle: config.startAngle,
        endAngle: config.startAngle + config.angleWidth,
        centerAngle: config.startAngle + config.angleWidth / 2
      };
    }
  }

  setupLevel(levelConfig: LevelConfig, centerX: number, centerY: number): void {
    this.centerX = centerX;
    this.centerY = centerY;
    this.ringRadius = RING_RADIUS[levelConfig.ringRadius];
    this.gapConfigs = levelConfig.gaps.map((g) => ({ ...g }));
    this.levelRestitution = Math.max(levelConfig.restitution, 0.9);
    this.pendingRotation = 0;
    this.rotationAccumulator = 0;

    this.clear();
    this.createRing();
    this.createBalls(levelConfig.ballCount);

    this.engine.gravity.x = 0;
    this.engine.gravity.y = 1;
    this.engine.gravity.scale = 0.0015;
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

    const solidArcs = computeRingArcs(this.gaps);
    const segmentAngle = 3 * Math.PI / 180;

    for (const arc of solidArcs) {
      const arcSpan = arc.end - arc.start;
      const segmentCount = Math.max(2, Math.ceil(arcSpan / segmentAngle));
      const step = arcSpan / segmentCount;

      for (let i = 0; i < segmentCount; i++) {
        const angle = arc.start + step * (i + 0.5);
        const segment = this.createRingSegment(angle, step * 1.05);
        World.add(this.world, segment);
        this.ringBodies.push(segment);
      }
    }
  }

  private createRingSegment(angle: number, widthAngle: number): Matter.Body {
    const midRadius = this.ringRadius - this.ringThickness / 2;
    const width = midRadius * widthAngle;
    const height = this.ringThickness;

    const x = this.centerX + Math.cos(angle) * midRadius;
    const y = this.centerY + Math.sin(angle) * midRadius;

    const segment = Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      isSensor: false,
      restitution: this.levelRestitution,
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      slop: 0,
      label: 'ring',
      collisionFilter: {
        category: 0x0001,
        mask: 0xFFFFFFFF
      }
    });

    Body.setAngle(segment, angle + Math.PI / 2);

    return segment;
  }

  updateGapRotation(deltaTime: number): void {
    let needsUpdate = false;

    for (let i = 0; i < this.gapConfigs.length; i++) {
      const config = this.gapConfigs[i];
      if (config.rotationSpeed) {
        const delta = config.rotationSpeed * deltaTime;
        config.startAngle += delta;
        this.gaps[i] = {
          startAngle: config.startAngle,
          endAngle: config.startAngle + config.angleWidth,
          centerAngle: config.startAngle + config.angleWidth / 2
        };
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.rebuildRing();
    }
  }

  private rebuildRing(): void {
    const bodiesToRemove = [...this.ringBodies];
    this.ringBodies = [];

    for (const body of bodiesToRemove) {
      Composite.remove(this.world, body, true);
    }

    const solidArcs = computeRingArcs(this.gaps);
    const segmentAngle = 3 * Math.PI / 180;

    for (const arc of solidArcs) {
      const arcSpan = arc.end - arc.start;
      const segmentCount = Math.max(2, Math.ceil(arcSpan / segmentAngle));
      const step = arcSpan / segmentCount;

      for (let i = 0; i < segmentCount; i++) {
        const angle = arc.start + step * (i + 0.5);
        const segment = this.createRingSegment(angle, step * 1.05);
        segment.id = Matter.Common.nextId();
        World.add(this.world, segment);
        this.ringBodies.push(segment);
      }
    }

    this.engine.pairs.clear(this.engine.pairs);
  }

  private createBalls(count: number): void {
    for (let i = 0; i < count; i++) {
      const offsetAngle = (i / count) * Math.PI * 2;
      const offsetDistance = count > 1 ? 30 : 0;
      const x = this.centerX + Math.cos(offsetAngle) * offsetDistance;
      const y = this.centerY + Math.sin(offsetAngle) * offsetDistance;

      const color = COLORS.ballColors[i % COLORS.ballColors.length];
      const ball = this.createBall(x, y, color, i);
      this.balls.push(ball);
      this.ballColors.set(i, color);
    }
  }

  private createBall(
    x: number,
    y: number,
    color: string,
    id: number
  ): Matter.Body {
    const ball = Bodies.circle(x, y, this.ballRadius, {
      restitution: this.levelRestitution,
      friction: 0,
      frictionAir: PHYSICS.defaultFrictionAir,
      label: id.toString(),
      slop: 0,
      frictionStatic: 0,
      collisionFilter: {
        group: -1
      }
    });

    (ball as any).isBullet = true;

    World.add(this.world, ball);
    return ball;
  }

  rotateRing(deltaAngle: number): void {
    this.pendingRotation += deltaAngle;
  }

  checkFailure(): FailureInfo | null {
    const innerBoundary = this.ringRadius - this.ringThickness;

    for (const ball of this.balls) {
      const dx = ball.position.x - this.centerX;
      const dy = ball.position.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      if (dist > innerBoundary) {
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

    for (const body of this.ringBodies) {
      Body.translate(body, { x: dx, y: dy });
    }

    for (const ball of this.balls) {
      Body.translate(ball, { x: dx, y: dy });
    }
  }
}
