import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as Cesium from "cesium";

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NmU0NDk5Ni1mOWNjLTQyNjYtODM3Yy1kYjAxNTc1MTU2ZjQiLCJpZCI6MjM3MjkwLCJpYXQiOjE3MjQ5NDU3OTF9.Yt2b-rHI-_1h1NoHmCzRL44E63E4Wq9d1m7ft3HZc3k";

export default forwardRef(CesiumViewer);
function CesiumViewer({ player, points = [], duration = 60000 }, ref) {
  const cesiumRef = useRef();
  const viewerRef = useRef();
  const entityRef = useRef();
  const positionPropertyRef = useRef();
  const isPlayingRef = useRef(false);
  const lastAnimationFrameIdRef = useRef(null);
  const cameraAnimationFrameIdRef = useRef(null);
  const cameraPositionRef = useRef();
  const targetPositionRef = useRef();
  const startTimeRef = useRef(Cesium.JulianDate.now());

  useImperativeHandle(ref, () => ({
    handlePlay,
  }));

  /**
   * 飞到路线位置
   */
  const flyToRoute = () => {
    if (!viewerRef.current || !points?.length) return;
    const positions = points.map((p) => Cesium.Cartesian3.fromDegrees(...p));
    // 计算路线的边界球
    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
    function flyFromEarthToRoute(onComplete) {
      // 确保整个路线都在视野内
      viewerRef.current.camera.flyToBoundingSphere(boundingSphere, {
        duration: 2.5, // 调整地图以包含路线
        complete: onComplete,
      });
    }
    flyFromEarthToRoute();
  };

  useEffect(() => {
    viewerRef.current = new Cesium.Viewer(cesiumRef.current, {
      shouldAnimate: true,
      timeline: false,
      terrain: Cesium.Terrain.fromWorldTerrain({
        requestVertexNormals: true,
        requestWaterMask: true,
      }),
    });

    viewerRef.current.entities.add({
      polyline: {
        positions: points.map((p) => Cesium.Cartesian3.fromDegrees(...p)),
        width: 4,
        material: Cesium.Color.fromCssColorString("#00ff00"),
        clampToGround: true,
      },
    });

    flyToRoute();

    positionPropertyRef.current = new Cesium.SampledPositionProperty();

    entityRef.current = viewerRef.current.entities.add({
      position: positionPropertyRef.current,
      point: {
        color: Cesium.Color.fromCssColorString("#ff0000"),
        pixelSize: 10,
        outlineColor: Cesium.Color.fromCssColorString("#fff"),
        outlineWidth: 5,
        heightReference: Cesium.HeightReference.NONE, // 高度自己控制
        // heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, // https://cesium.com/downloads/cesiumjs/releases/1.135/Build/Documentation/global.html#HeightReference
      },
      path: {
        material: Cesium.Color.fromCssColorString("#ff0000"),
        leadTime: 0,
        trailTime: 60,
        width: 2,
        resolution: 0.1,
      },
    });

    const { cameraPos, targetPos } = buildCameraTrack(
      points,
      startTimeRef.current,
      duration,
    );
    cameraPositionRef.current = cameraPos;
    targetPositionRef.current = targetPos;

    return () => viewerRef.current.destroy();
  }, [player, points, duration]);

  const handlePlay = () => {
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      cancelAnimationFrame(lastAnimationFrameIdRef.current);
      cancelAnimationFrame(cameraAnimationFrameIdRef.current);
      lastAnimationFrameIdRef.current = null;
      cameraAnimationFrameIdRef.current = null;
      return;
    }
    let last = performance.now();
    let virtualTime = 0; // 虚拟时间（秒），作为 SampledPositionProperty 时间轴

    // 移动点 tick 函数
    function tickEntity(now) {
      const dt = now - last; // 秒
      last = now;
      virtualTime += dt / 1000;

      if (!player) {
        return;
      }

      const state = player.update(dt); // TrackPlayer 用 ms
      if (!state || !state.position) {
        cancelAnimationFrame(lastAnimationFrameIdRef.current);
        cancelAnimationFrame(cameraAnimationFrameIdRef.current);
        lastAnimationFrameIdRef.current = null;
        cameraAnimationFrameIdRef.current = null;
        isPlayingRef.current = false;
        return;
      }

      // 更新实体位置
      const cartesian = Cesium.Cartesian3.fromDegrees(...state.position);
      entityRef.current.position = cartesian;

      // 添加拖尾采样
      const sampleTime = Cesium.JulianDate.addSeconds(
        Cesium.JulianDate.now(),
        virtualTime,
        new Cesium.JulianDate(),
      );
      positionPropertyRef.current.addSample(sampleTime, cartesian);
      if (state.orientation) {
        entityRef.current.orientation = state.orientation;
      }

      lastAnimationFrameIdRef.current = requestAnimationFrame(tickEntity);
    }

    let elapsed = 0;
    let lastTimeCamera = performance.now();
    function tickCamera(now) {
      const dt = (now - lastTimeCamera) / 1000;
      lastTimeCamera = now;
      elapsed += dt;

      const time = Cesium.JulianDate.addSeconds(
        startTimeRef.current,
        elapsed,
        new Cesium.JulianDate(),
      );

      // === 相机直接采样 ===
      const camPos = cameraPositionRef.current.getValue(time);
      const target = targetPositionRef.current.getValue(time);

      console.log({
        time,
        camPos,
        target,
      });

      if (camPos && target) {
        viewerRef.current.camera.setView({
          destination: camPos,
          orientation: {
            direction: Cesium.Cartesian3.normalize(
              Cesium.Cartesian3.subtract(
                target,
                camPos,
                new Cesium.Cartesian3(),
              ),
              new Cesium.Cartesian3(),
            ),
            up: viewerRef.current.camera.up,
          },
        });
      }

      cameraAnimationFrameIdRef.current = requestAnimationFrame(tickCamera);
    }

    isPlayingRef.current = true;
    lastAnimationFrameIdRef.current = requestAnimationFrame(tickEntity);
    cameraAnimationFrameIdRef.current = requestAnimationFrame(tickCamera);
  };

  /**
   * 预计算相机轨迹
   * totalDuration: ms
   */
  function buildCameraTrack(points, startTime, totalDuration) {
    const cameraPos = new Cesium.SampledPositionProperty(); //new Cesium.SampledProperty(Cesium.Cartesian3);
    const targetPos = new Cesium.SampledPositionProperty(); // new Cesium.SampledProperty(Cesium.Cartesian3);

    const count = points.length;
    const step = totalDuration / (1000 * (count - 1));

    const pitch = Cesium.Math.toRadians(-25);
    const headingStep = 100;
    let lastHeadingStartIndex = 0;
    let heading;

    for (let i = 0; i < count; i++) {
      const t = Cesium.JulianDate.addSeconds(
        startTime,
        i * step,
        new Cesium.JulianDate(),
      );
      const curr = Cesium.Cartesian3.fromDegrees(...points[i]);
      if (heading && lastHeadingStartIndex + headingStep > i && i !== 0) {
        // 保持一段距离再计算下一次 heading
      } else {
        lastHeadingStartIndex = i;
        const next =
          i < count - headingStep
            ? Cesium.Cartesian3.fromDegrees(...points[i + headingStep])
            : curr;

        // 1️⃣ 计算前进方向（已经有了）
        const dir = Cesium.Cartesian3.subtract(
          next,
          curr,
          new Cesium.Cartesian3(),
        );
        try {
          console.log({ dir }, i, curr, next);
          Cesium.Cartesian3.normalize(dir, dir);
        } catch (e) {
          console.error("3333", e);
          continue;
        }
        // 2️⃣ heading（沿着路线）
        heading = Math.atan2(dir.x, dir.y);
      }

      // 3️⃣ 相机姿态（注意：这是“目标姿态”）
      const hpr = new Cesium.HeadingPitchRoll(heading, pitch, 0);

      // 4️⃣ 用 heading + pitch 构造旋转矩阵
      const rotation = Cesium.Transforms.headingPitchRollToFixedFrame(
        curr,
        hpr,
      );

      // 5️⃣ 在“目标坐标系”里定义 offset（后方 500m，上方 1000m）
      const offset = new Cesium.Cartesian3(0, -500, 2000);

      // 6️⃣ 得到真正的相机世界坐标
      const camPos = Cesium.Matrix4.multiplyByPoint(
        rotation,
        offset,
        new Cesium.Cartesian3(),
      );

      cameraPos.addSample(t, camPos);
      targetPos.addSample(t, curr);
    }

    cameraPos.setInterpolationOptions({
      interpolationDegree: 2,
      interpolationAlgorithm: Cesium.HermitePolynomialApproximation,
    });

    targetPos.setInterpolationOptions({
      interpolationDegree: 2,
      interpolationAlgorithm: Cesium.HermitePolynomialApproximation,
    });

    return { cameraPos, targetPos };
  }

  return <div ref={cesiumRef} style={{ height: "90vh" }} />;
}
