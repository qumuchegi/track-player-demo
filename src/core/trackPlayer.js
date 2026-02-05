import { lerpPos, safeOrientation } from "./math";

export class TrackPlayer {
  constructor(points) {
    this.points = points;
    this.start = points[0].t;
    this.end = points.at(-1).t;
    this.time = this.start;
    this.speed = 1;
    this.cursor = 0;
    this.lastOrientation = null;
  }

  seek(t) {
    this.time = t;
    this.cursor = 0;
  }

  update(dt) {
    this.time += dt * this.speed;
    if (this.time > this.end) this.time = this.end;

    while (
      this.cursor < this.points.length - 2 &&
      this.time > this.points[this.cursor + 1].t
    ) {
      this.cursor++;
    }

    const p1 = this.points[this.cursor];
    const p2 = this.points[this.cursor + 1];
    const alpha = (this.time - p1.t) / (p2.t - p1.t);

    const pos = lerpPos(p1.p, p2.p, alpha);

    const prev = this.points[Math.max(this.cursor - 1, 0)].p;
    const next = this.points[Math.min(this.cursor + 2, this.points.length - 1)].p;

    this.lastOrientation = safeOrientation(pos, next, this.lastOrientation)
    return {
      position: pos,
      orientation: this.lastOrientation,
      progress: (this.time - this.start) / (this.end - this.start)
    };
  }
}
