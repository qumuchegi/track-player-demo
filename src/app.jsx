import { useState, useRef, useMemo } from "react";
import FileUploader from "./components/FileUploader";
import CesiumViewer from "./components/CesiumViewer";
import Timeline from "./components/Timeline";
import { parseTrackFromText } from "./core/kmlGpxParser";
import TrackPlayer from "./core/trackPlayer";

export default function App() {
  const [player, setPlayer] = useState(null);
  const [points, setPoints] = useState([]);
  const viewerRef = useRef(null)
  const duration = 60000; // 轨迹播放总时长，毫秒

  const handleLoad = (text, name) => {
    const points = parseTrackFromText(text, name);
    console.log({points})
    setPoints(points);
    setPlayer(new TrackPlayer(points, duration));
  };

  return (
    <>
      <div>
        <FileUploader onLoad={handleLoad} />
        <button onClick={() => viewerRef.current && viewerRef.current.handlePlay()}>播放/暂停</button>
      </div>
      <Timeline player={player} />
      <CesiumViewer ref={viewerRef} player={player} points={useMemo(() => points.map(p => p.p), [points])} duration={duration}/>
    </>
  );
}
