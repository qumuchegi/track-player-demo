import * as Cesium from "cesium";

export default class TrackPlayer {
  /**
   * @param {Array} points - 轨迹点数组，每个点 { p: [lon, lat, alt], orientation?: Cesium.Quaternion }
   * @param {number} duration - 总动画时长（毫秒）
   */
  constructor(points, duration = 10000) {
    if (!points || points.length < 2) {
      throw new Error("轨迹点至少需要 2 个");
    }

    this.points = points.map((p) => ({
      position: p.p,
      orientation: p.orientation || null,
    }));

    this.duration = duration; // 总动画时间 ms
    this.speed = 1; // 倍速
    this.time = 0; // 当前动画时间 ms
    this.loop = true; // 是否循环
  }

  /**
   * 更新动画状态
   * @param {number} dt - 增量时间，毫秒
   * @returns {Object} { position, orientation }
   */
  update(dt) {
    if (!this.points || this.points.length < 2) return null;

    this.time += dt * this.speed;

    // 循环播放
    if (this.loop) {
      this.time %= this.duration;
    } else {
      this.time = Math.min(this.time, this.duration);
    }

    // 均匀分配轨迹点时间
    const segmentCount = this.points.length - 1;
    const segmentDuration = this.duration / segmentCount;

    let segmentIndex = Math.floor(this.time / segmentDuration);
    if (segmentIndex >= segmentCount) segmentIndex = segmentCount - 1;

    const t0 = segmentIndex * segmentDuration;
    const t1 = (segmentIndex + 1) * segmentDuration;

    const localT = (this.time - t0) / (t1 - t0); // 0~1 插值

    const p0 = this.points[segmentIndex].position;
    const p1 = this.points[segmentIndex + 1].position;

    // 线性插值位置
    const position = [
      p0[0] + (p1[0] - p0[0]) * localT,
      p0[1] + (p1[1] - p0[1]) * localT,
      (p0[2] || 0) + ((p1[2] || 0) - (p0[2] || 0)) * localT,
    ];

    // 姿态插值（可选）
    let orientation = null;
    const o0 = this.points[segmentIndex].orientation;
    const o1 = this.points[segmentIndex + 1].orientation;
    if (o0 && o1) {
      orientation = Cesium.Quaternion.slerp(o0, o1, localT, new Cesium.Quaternion());
    } else if (o0) {
      orientation = o0;
    }

    return { position, orientation };
  }

  /**
   * 设置动画总时长
   * @param {number} duration - ms
   */
  setDuration(duration) {
    this.duration = duration;
  }

  /**
   * 设置倍速
   * @param {number} speed
   */
  setSpeed(speed) {
    this.speed = speed;
  }

  /**
   * 重置动画
   */
  reset() {
    this.time = 0;
  }
}
