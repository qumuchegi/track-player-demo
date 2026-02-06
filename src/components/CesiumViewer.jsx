import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as Cesium from "cesium";

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NmU0NDk5Ni1mOWNjLTQyNjYtODM3Yy1kYjAxNTc1MTU2ZjQiLCJpZCI6MjM3MjkwLCJpYXQiOjE3MjQ5NDU3OTF9.Yt2b-rHI-_1h1NoHmCzRL44E63E4Wq9d1m7ft3HZc3k";

const DRONE = {
  back: 500,
  up: 2000,
  pitch: -40,

  trendWindow: 0.6,
  dirSmooth: 0.2,
  maxYawSpeed: 2.0, // deg / frame
};

export default forwardRef(CesiumViewer);

function CesiumViewer({ player, points = [] }, ref) {
  const domRef = useRef();
  const viewerRef = useRef();
  const entityRef = useRef();
  const posPropRef = useRef();

  const playingRef = useRef(false);
  const rafEntityRef = useRef();
  const rafCameraRef = useRef();

  const smoothDirRef = useRef(null);
  const headingRef = useRef(null);

  useImperativeHandle(ref, () => ({ handlePlay }));

  useEffect(() => {
    viewerRef.current = new Cesium.Viewer(domRef.current, {
      shouldAnimate: true,
      animation: false,
      timeline: false,
      terrain: Cesium.Terrain.fromWorldTerrain(),
    });

    viewerRef.current.entities.add({
      polyline: {
        positions: points.map(p => Cesium.Cartesian3.fromDegrees(...p)),
        clampToGround: true,
        width: 4,
        material: Cesium.Color.LIME,
      },
    });

    posPropRef.current = new Cesium.SampledPositionProperty();

    entityRef.current = viewerRef.current.entities.add({
      position: posPropRef.current,
      point: { pixelSize: 10, color: Cesium.Color.RED },
    });

    return () => viewerRef.current?.destroy();
  }, [points]);

  function handlePlay() {
    if (playingRef.current) return stop();
    playingRef.current = true;

    let last = performance.now();
    let vt = 0;

    function tickEntity(now) {
      const dt = now - last;
      last = now;
      vt += dt / 1000;

      const state = player?.update(dt);
      if (!state?.position) return stop();

      const pos = Cesium.Cartesian3.fromDegrees(...state.position);
      const t = Cesium.JulianDate.addSeconds(
        Cesium.JulianDate.now(),
        vt,
        new Cesium.JulianDate()
      );
      posPropRef.current.addSample(t, pos);

      rafEntityRef.current = requestAnimationFrame(tickEntity);
    }

    function tickCamera() {
      const viewer = viewerRef.current;
      const entity = entityRef.current;
      if (!viewer || !entity) return;

      const now = Cesium.JulianDate.now();
      const curr = entity.position.getValue(now);
      if (!curr) return requestAnimationFrame(tickCamera);

      const trend = computeTrendDirection(posPropRef.current, now, DRONE.trendWindow);
      if (!trend) return requestAnimationFrame(tickCamera);

      if (!smoothDirRef.current) {
        smoothDirRef.current = trend;
      } else {
        Cesium.Cartesian3.lerp(
          smoothDirRef.current,
          trend,
          DRONE.dirSmooth,
          smoothDirRef.current
        );
        Cesium.Cartesian3.normalize(smoothDirRef.current, smoothDirRef.current);
      }

      const enu = Cesium.Transforms.eastNorthUpToFixedFrame(curr);
      const inv = Cesium.Matrix4.inverse(enu, new Cesium.Matrix4());
      const local = Cesium.Matrix4.multiplyByPointAsVector(
        inv,
        smoothDirRef.current,
        new Cesium.Cartesian3()
      );

      const targetHeading = Math.atan2(local.x, local.y);

      if (headingRef.current == null) {
        headingRef.current = targetHeading;
      } else {
        const max = Cesium.Math.toRadians(DRONE.maxYawSpeed);
        const d = Cesium.Math.negativePiToPi(targetHeading - headingRef.current);
        headingRef.current += Cesium.Math.clamp(d, -max, max);
      }

      const range = Math.sqrt(DRONE.back ** 2 + DRONE.up ** 2);

      viewer.camera.lookAt(
        curr,
        new Cesium.HeadingPitchRange(
          headingRef.current,
          Cesium.Math.toRadians(DRONE.pitch),
          range
        )
      );

      // 🔑 关键：恢复世界坐标系
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

      rafCameraRef.current = requestAnimationFrame(tickCamera);
    }

    rafEntityRef.current = requestAnimationFrame(tickEntity);
    rafCameraRef.current = requestAnimationFrame(tickCamera);
  }

  function stop() {
    playingRef.current = false;
    cancelAnimationFrame(rafEntityRef.current);
    cancelAnimationFrame(rafCameraRef.current);
  }

  return <div ref={domRef} style={{ height: "90vh" }} />;
}

function computeTrendDirection(prop, time, w) {
  const os = [-w, -w / 2, 0, w / 2, w];
  const ps = os
    .map(o =>
      prop.getValue(Cesium.JulianDate.addSeconds(time, o, new Cesium.JulianDate()))
    )
    .filter(Boolean);

  if (ps.length < 2) return null;

  const dir = Cesium.Cartesian3.subtract(
    ps[ps.length - 1],
    ps[0],
    new Cesium.Cartesian3()
  );
  return Cesium.Cartesian3.normalize(dir, dir);
}
