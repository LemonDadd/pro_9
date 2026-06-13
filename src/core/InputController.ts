type DragCallback = (start: { x: number; y: number }, end: { x: number; y: number }) => void;
type MoveCallback = (current: { x: number; y: number }, delta: { x: number; y: number }) => void;
type ClickCallback = (position: { x: number; y: number }) => void;

export class InputController {
  private canvas: HTMLCanvasElement;
  private isDragging: boolean = false;
  private dragStart: { x: number; y: number } | null = null;
  private dragCurrent: { x: number; y: number } | null = null;
  private lastDragPosition: { x: number; y: number } | null = null;
  private lastMousePosition: { x: number; y: number } | null = null;
  private dragCallbacks: DragCallback[] = [];
  private dragEndCallbacks: DragCallback[] = [];
  private moveCallbacks: MoveCallback[] = [];
  private clickCallbacks: ClickCallback[] = [];
  private isPaused: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));

    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private getCanvasPosition(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.isPaused) return;
    e.preventDefault();
    const pos = this.getCanvasPosition(e);
    this.startDrag(pos);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isPaused) return;
    const pos = this.getCanvasPosition(e);

    if (this.lastMousePosition) {
      const delta = {
        x: pos.x - this.lastMousePosition.x,
        y: pos.y - this.lastMousePosition.y
      };
      this.moveCallbacks.forEach((cb) => cb(pos, delta));
    }
    this.lastMousePosition = { ...pos };

    if (this.isDragging) {
      this.updateDrag(pos);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (this.isPaused) return;
    e.preventDefault();
    const pos = this.getCanvasPosition(e);
    this.endDrag(pos);
  }

  private handleTouchStart(e: TouchEvent): void {
    if (this.isPaused) return;
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getCanvasPosition(e.touches[0]);
      this.startDrag(pos);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (this.isPaused) return;
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getCanvasPosition(e.touches[0]);

      if (this.lastMousePosition) {
        const delta = {
          x: pos.x - this.lastMousePosition.x,
          y: pos.y - this.lastMousePosition.y
        };
        this.moveCallbacks.forEach((cb) => cb(pos, delta));
      }
      this.lastMousePosition = { ...pos };

      if (this.isDragging) {
        this.updateDrag(pos);
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (this.isPaused) return;
    e.preventDefault();
    if (this.lastDragPosition) {
      this.endDrag(this.lastDragPosition);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.isDragging && this.lastDragPosition) {
        this.endDrag(this.lastDragPosition);
      }
    }
  }

  private startDrag(pos: { x: number; y: number }): void {
    this.isDragging = true;
    this.dragStart = { ...pos };
    this.dragCurrent = { ...pos };
    this.lastDragPosition = { ...pos };
  }

  private updateDrag(pos: { x: number; y: number }): void {
    if (!this.dragStart || !this.dragCurrent) return;

    this.lastDragPosition = { ...pos };

    const start = { ...this.dragCurrent };
    const end = { ...pos };

    this.dragCurrent = { ...pos };

    this.dragCallbacks.forEach((cb) => cb(start, end));
  }

  private endDrag(pos: { x: number; y: number }): void {
    if (!this.isDragging || !this.dragStart) return;

    const start = { ...this.dragStart };
    const end = { ...pos };

    this.dragEndCallbacks.forEach((cb) => cb(start, end));

    if (this.dragStart.x === pos.x && this.dragStart.y === pos.y) {
      this.clickCallbacks.forEach((cb) => cb(pos));
    }

    this.isDragging = false;
    this.dragStart = null;
    this.dragCurrent = null;
    this.lastDragPosition = null;
  }

  onDrag(callback: DragCallback): void {
    this.dragCallbacks.push(callback);
  }

  onDragEnd(callback: DragCallback): void {
    this.dragEndCallbacks.push(callback);
  }

  onClick(callback: ClickCallback): void {
    this.clickCallbacks.push(callback);
  }

  onMove(callback: MoveCallback): void {
    this.moveCallbacks.push(callback);
  }

  pause(): void {
    this.isPaused = true;
    if (this.isDragging && this.lastDragPosition) {
      this.endDrag(this.lastDragPosition);
    }
  }

  resume(): void {
    this.isPaused = false;
  }

  getIsDragging(): boolean {
    return this.isDragging;
  }

  getDragStart(): { x: number; y: number } | null {
    return this.dragStart;
  }

  getDragCurrent(): { x: number; y: number } | null {
    return this.dragCurrent;
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));

    this.dragCallbacks = [];
    this.dragEndCallbacks = [];
    this.moveCallbacks = [];
    this.clickCallbacks = [];
  }
}
