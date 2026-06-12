declare module 'poly-decomp' {
  export function isSimple(points: { x: number; y: number }[]): boolean;
  export function makeCCW(points: { x: number; y: number }[]): void;
  export function convexDecomp(points: { x: number; y: number }[]): { x: number; y: number }[][];
  export function decomp(points: { x: number; y: number }[]): { x: number; y: number }[][];
  export function removeCollinearPoints(points: { x: number; y: number }[], thresholdAngle: number): { x: number; y: number }[];
  export function removeDuplicatePoints(points: { x: number; y: number }[], precision: number): { x: number; y: number }[];
  export function pointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean;
  export function quickDecomp(points: { x: number; y: number }[]): { x: number; y: number }[][];
}
