import * as Cesium from "cesium";

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpPos(p1, p2, t) {
  return [lerp(p1[0], p2[0], t), lerp(p1[1], p2[1], t), lerp(p1[2], p2[2], t)];
}

export function safeOrientation(curr, next, lastOrientation) {
  if (!curr || !next) return lastOrientation;

  const p1 = Cesium.Cartesian3.fromDegrees(...curr);
  const p2 = Cesium.Cartesian3.fromDegrees(...next);

  const diff = Cesium.Cartesian3.subtract(p2, p1, new Cesium.Cartesian3());

  // 🚨 核心防炸：方向长度为 0
  if (Cesium.Cartesian3.magnitude(diff) < 1e-6) {
    return lastOrientation;
  }

  const direction = Cesium.Cartesian3.normalize(diff, new Cesium.Cartesian3());

  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(p1);
  const inv = Cesium.Matrix4.inverse(transform, new Cesium.Matrix4());

  const localDir = Cesium.Matrix4.multiplyByPointAsVector(
    inv,
    direction,
    new Cesium.Cartesian3(),
  );

  const heading = Math.atan2(localDir.x, localDir.y);
  const pitch = Math.atan2(
    localDir.z,
    Math.sqrt(localDir.x ** 2 + localDir.y ** 2),
  );

  // 🚨 再保险一次
  if (!Number.isFinite(heading) || !Number.isFinite(pitch)) {
    return lastOrientation;
  }

  const hpr = new Cesium.HeadingPitchRoll(heading, pitch, 0);

  try {
    return Cesium.Transforms.headingPitchRollQuaternion(p1, hpr);
  } catch (e) {
    console.log("Error computing orientation:", e, p1, hpr);
    return lastOrientation;
  }
}
