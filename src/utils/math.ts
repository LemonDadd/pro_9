export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

export interface Arc {
  start: number;
  end: number;
}

export function computeRingArcs(gaps: { startAngle: number; endAngle: number }[]): Arc[] {
  const arcs: Arc[] = [];
  const gapArcs: Arc[] = [];

  const toPositive = (a: number): number => {
    let result = a;
    while (result < 0) result += 2 * Math.PI;
    while (result >= 2 * Math.PI) result -= 2 * Math.PI;
    return result;
  };

  for (const gap of gaps) {
    let gapStart = toPositive(gap.startAngle);
    let gapEnd = toPositive(gap.endAngle);

    if (gapEnd < gapStart) {
      gapEnd += 2 * Math.PI;
    }

    if (gapEnd - gapStart >= 2 * Math.PI - 0.001) {
      continue;
    }

    if (gapEnd > 2 * Math.PI) {
      gapArcs.push({ start: gapStart, end: 2 * Math.PI });
      gapArcs.push({ start: 0, end: gapEnd - 2 * Math.PI });
    } else {
      gapArcs.push({ start: gapStart, end: gapEnd });
    }
  }

  gapArcs.sort((a, b) => a.start - b.start);

  let currentAngle = 0;
  for (const gap of gapArcs) {
    if (currentAngle < gap.start - 0.001) {
      arcs.push({ start: currentAngle, end: gap.start });
    }
    currentAngle = Math.max(currentAngle, gap.end);
  }

  if (currentAngle < 2 * Math.PI - 0.001) {
    arcs.push({ start: currentAngle, end: 2 * Math.PI });
  }

  for (let i = arcs.length - 1; i >= 0; i--) {
    if (arcs[i].end - arcs[i].start < 0.001) {
      arcs.splice(i, 1);
    }
  }

  return arcs;
}

export function isAngleInRange(angle: number, start: number, end: number): boolean {
  const normAngle = normalizeAngle(angle);
  const normStart = normalizeAngle(start);
  const normEnd = normalizeAngle(end);

  if (normStart <= normEnd) {
    return normAngle >= normStart && normAngle <= normEnd;
  } else {
    return normAngle >= normStart || normAngle <= normEnd;
  }
}

export function angleDistance(a: number, b: number): number {
  const diff = Math.abs(normalizeAngle(a - b));
  return Math.min(diff, 2 * Math.PI - diff);
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function degToRad(deg: number): number {
  return deg * Math.PI / 180;
}

export function radToDeg(rad: number): number {
  return rad * 180 / Math.PI;
}
