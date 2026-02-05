import { useEffect, useRef } from "react";
import * as Cesium from "cesium";

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NmU0NDk5Ni1mOWNjLTQyNjYtODM3Yy1kYjAxNTc1MTU2ZjQiLCJpZCI6MjM3MjkwLCJpYXQiOjE3MjQ5NDU3OTF9.Yt2b-rHI-_1h1NoHmCzRL44E63E4Wq9d1m7ft3HZc3k";

export default function CesiumViewer({ player }) {
  const ref = useRef();

  useEffect(() => {
    const viewer = new Cesium.Viewer(ref.current, {
      shouldAnimate: true,
      timeline: false,
      terrain: Cesium.Terrain.fromWorldTerrain({
        requestVertexNormals: true,
        requestWaterMask: true,
      }),
    });

    const entity = viewer.entities.add({
      point: {
        color: Cesium.Color.fromCssColorString("#ff0000"),
        pixelSize: 10,
        outlineColor: Cesium.Color.fromCssColorString("#fff"),
        outlineWidth: 5,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, // https://cesium.com/downloads/cesiumjs/releases/1.135/Build/Documentation/global.html#HeightReference
      },
      path: {
        leadTime: 0,
        trailTime: 60,
        width: 2,
      },
    });

    let last = performance.now();

    function tick(now) {
      const dt = now - last;
      last = now;

      if (player) {
        const state = player.update(dt);
        entity.position = Cesium.Cartesian3.fromDegrees(...state.position);
        entity.orientation = state.orientation;
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    return () => viewer.destroy();
  }, [player]);

  return <div ref={ref} style={{ height: "100vh" }} />;
}
