import Matter from 'matter-js';
import decomp from 'poly-decomp';
import { PHYSICS, RING_RADIUS, COLORS } from '../config/constants';
import { normalizeAngle, isAngleInRange, angleDistance } from '../utils/math';
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
  private constantBallSpeed: number = PHYSICS.constantBallSpeed;
  private ballInitialAngles: Map<number, number> = new Map();

  constructor(centerX: number, centerY: number) {
    this.centerX = centerX;
    this.centerY = centerY;

    this.engine = Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
      positionIterations: 40,
      velocityIterations: 40,
      constraintIterations: 10
    });
    this.world = this.engine.world;
    this.runner = Runner.create();

    this.setupCollisionDetection();
    this.setupAfterUpdate();
  }

  private setupAfterUpdate(): void {
    Events.on(this.engine, 'afterUpdate', () => {
      this.maintainConstantSpeed();
      this.preventBallPenetration();
    });
  }

  private setupCollisionDetection(): void {
    Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;

      pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        const ballBody = this.balls.includes(bodyA) ? bodyA : this.balls.includes(bodyB) ? bodyB : null;
        const ringBody = this.ringBodies.includes(bodyA) ? bodyA : this.ringBodies.includes(bodyB) ? bodyB : null;

        if (ballBody && ringBody) {
          const collisionNormal = {
            x: ballBody.position.x - this.centerX,
            y: ballBody.position.y - this.centerY
          };
          const len = Math.sqrt(collisionNormal.x ** 2 + collisionNormal.y ** 2);
          collisionNormal.x /= len;
          collisionNormal.y /= len;

          this.reflectBallVelocity(ballBody, collisionNormal);
          this.enforceBallInsideRing(ballBody);

          const ballData = this.getBallData(ballBody);
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

  private reflectBallVelocity(ball: Matter.Body, normal: { x: number; y: number }): void {
    const vx = ball.velocity.x;
    const vy = ball.velocity.y;
    const dot = vx * normal.x + vy * normal.y;

    let reflectedVx = vx - 2 * dot * normal.x;
    let reflectedVy = vy - 2 * dot * normal.y;

    const speed = Math.sqrt(reflectedVx * reflectedVx + reflectedVy * reflectedVy);
    if (speed > 0.001) {
      reflectedVx = (reflectedVx / speed) * this.constantBallSpeed;
      reflectedVy = (reflectedVy / speed) * this.constantBallSpeed;
    } else {
      const tangentX = -normal.y;
      const tangentY = normal.x;
      reflectedVx = tangentX * this.constantBallSpeed;
      reflectedVy = tangentY * this.constantBallSpeed;
    }

    Body.setVelocity(ball, { x: reflectedVx, y: reflectedVy });
  }

  private enforceBallInsideRing(ball: Matter.Body): void {
    const dx = ball.position.x - this.centerX;
    const dy = ball.position.y - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.ringRadius - this.ringThickness - this.ballRadius - 1;

    if (dist > maxDist) {
      const angle = Math.atan2(dy, dx);
      Body.setPosition(ball, {
        x: this.centerX + Math.cos(angle) * maxDist,
        y: this.centerY + Math.sin(angle) * maxDist
      });
    }
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
    this.engine.gravity.y = 0;
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

    const toPositive = (a: number): number => {
      while (a < 0) a += 2 * Math.PI;
      while (a >= 2 * Math.PI) a -= 2 * Math.PI;
      return a;
    };

    const gapRanges: { start: number; end: number }[] = [];

    for (const gap of this.gaps) {
      let gapStart = toPositive(gap.startAngle);
      let gapEnd = toPositive(gap.endAngle);

      if (gapEnd < gapStart) {
        gapEnd += 2 * Math.PI;
      }

      if (gapEnd - gapStart >= 2 * Math.PI - 0.01) {
        continue;
      }

      gapRanges.push({ start: gapStart, end: gapEnd });

      if (gapEnd > 2 * Math.PI) {
        gapRanges.push({ start: 0, end: gapEnd - 2 * Math.PI });
        gapRanges[gapRanges.length - 2].end = 2 * Math.PI;
      }
    }

    gapRanges.sort((a, b) => a.start - b.start);

    const ringArcs: { start: number; end: number }[] = [];
    let currentAngle = 0;

    for (const gap of gapRanges) {
      if (currentAngle < gap.start) {
        ringArcs.push({ start: currentAngle, end: gap.start });
      }
      currentAngle = Math.max(currentAngle, gap.end);
    }

    if (currentAngle < 2 * Math.PI) {
      ringArcs.push({ start: currentAngle, end: 2 * Math.PI });
    }

    for (let i = ringArcs.length - 1; i >= 0; i--) {
      const arc = ringArcs[i];
      if (arc.end - arc.start < 0.001) {
        ringArcs.splice(i, 1);
      }
    }

    ringArcs.forEach((arc) => {
      const segment = this.createArcSegment(
        arc.start - Math.PI,
        arc.end - Math.PI,
        innerRadius,
        outerRadius
      );
      segments.push(segment);
    });

    return segments;
  }

  private createArcSegment(startAngle: number, endAngle: number, innerRadius: number, outerRadius: number): Matter.Body {
    const vertices: Matter.Vector[] = [];
    let angleSpan = endAngle - startAngle;

    if (angleSpan < 0) angleSpan += 2 * Math.PI;
    while (angleSpan >= 2 * Math.PI) angleSpan -= 2 * Math.PI;

    const steps = Math.max(80, Math.ceil(angleSpan * 180 / Math.PI * 2));

    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + angleSpan * (i / steps);
      vertices.push({
        x: this.centerX + outerRadius * Math.cos(angle),
        y: this.centerY + outerRadius * Math.sin(angle)
      });
    }

    for (let i = steps; i >= 0; i--) {
      const angle = startAngle + angleSpan * (i / steps);
      vertices.push({
        x: this.centerX + innerRadius * Math.cos(angle),
        y: this.centerY + innerRadius * Math.sin(angle)
      });
    }

    return Bodies.fromVertices(this.centerX, this.centerY, [vertices], {
      isStatic: true,
      isSensor: false,
      restitution: 1,
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      slop: 0,
      label: 'ring',
      collisionFilter: {
        category: 0x0001,
        mask: 0xFFFFFFFF
      }
    }, true);
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
    const bodiesToRemove = [...this.ringBodies];
    this.ringBodies = [];

    bodiesToRemove.forEach((body) => {
      Composite.remove(this.world, body, true);
    });

    const segments = this.createRingSegments();
    segments.forEach((segment) => {
      segment.id = Matter.Common.nextId();
      World.add(this.world, segment);
      this.ringBodies.push(segment);
    });

    this.engine.pairs.clear(this.engine.pairs);
  }

  private createBalls(count: number, restitution: number, friction: number, frictionAir: number): void {
    for (let i = 0; i < count; i++) {
      const offsetAngle = (i / count) * Math.PI * 2;
      const offsetDistance = count > 1 ? 30 : 0;
      const x = this.centerX + Math.cos(offsetAngle) * offsetDistance;
      const y = this.centerY + Math.sin(offsetAngle) * offsetDistance;

      const color = COLORS.ballColors[i % COLORS.ballColors.length];
      const ball = this.createBall(x, y, color, 1, 0, 0, i);
      this.balls.push(ball);
      this.ballColors.set(i, color);

      const initAngle = offsetAngle + Math.PI / 2 + (i % 2 === 0 ? 0 : Math.PI);
      this.ballInitialAngles.set(i, initAngle);
      Body.setVelocity(ball, {
        x: Math.cos(initAngle) * this.constantBallSpeed,
        y: Math.sin(initAngle) * this.constantBallSpeed
      });
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
      restitution: 1,
      friction: 0,
      frictionAir: 0,
      label: id.toString(),
      slop: 0,
      frictionStatic: 0,
      collisionFilter: {
        group: -1
      },
      inertia: Infinity
    });

    (ball as any).isBullet = true;

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

  private maintainConstantSpeed(): void {
    for (const ball of this.balls) {
      const vx = ball.velocity.x;
      const vy = ball.velocity.y;
      const currentSpeed = Math.sqrt(vx * vx + vy * vy);

      if (currentSpeed > 0.001) {
        const scale = this.constantBallSpeed / currentSpeed;
        Body.setVelocity(ball, {
          x: vx * scale,
          y: vy * scale
        });
      } else {
        const id = parseInt(ball.label);
        const angle = this.ballInitialAngles.get(id) || Math.random() * Math.PI * 2;
        Body.setVelocity(ball, {
          x: Math.cos(angle) * this.constantBallSpeed,
          y: Math.sin(angle) * this.constantBallSpeed
        });
      }
    }
  }

  private preventBallPenetration(): void {
    const minDist = this.ballRadius + 2;
    const maxDist = this.ringRadius - this.ringThickness - this.ballRadius - 1;

    for (const ball of this.balls) {
      const dx = ball.position.x - this.centerX;
      const dy = ball.position.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      if (dist > maxDist) {
        let inGap = false;
        for (const gap of this.gaps) {
          if (isAngleInRange(angle, gap.startAngle, gap.endAngle)) {
            inGap = true;
            break;
          }
        }

        if (!inGap) {
          Body.setPosition(ball, {
            x: this.centerX + Math.cos(angle) * maxDist,
            y: this.centerY + Math.sin(angle) * maxDist
          });

          const normalX = dx / dist;
          const normalY = dy / dist;
          const dot = ball.velocity.x * normalX + ball.velocity.y * normalY;

          if (dot > 0) {
            let reflectedVx = ball.velocity.x - 2 * dot * normalX;
            let reflectedVy = ball.velocity.y - 2 * dot * normalY;
            const s = Math.sqrt(reflectedVx * reflectedVx + reflectedVy * reflectedVy);
            if (s > 0.001) {
              reflectedVx = (reflectedVx / s) * this.constantBallSpeed;
              reflectedVy = (reflectedVy / s) * this.constantBallSpeed;
            }
            Body.setVelocity(ball, { x: reflectedVx, y: reflectedVy });
          }
        }
      }

      if (dist < minDist) {
        Body.setPosition(ball, {
          x: this.centerX + Math.cos(angle) * minDist,
          y: this.centerY + Math.sin(angle) * minDist
        });
      }
    }
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
