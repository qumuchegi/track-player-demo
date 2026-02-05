import { useState } from "react";
import FileUploader from "./components/FileUploader";
import CesiumViewer from "./components/CesiumViewer";
import Timeline from "./components/Timeline";
import { parseTrackFromText } from "./core/kmlGpxParser";
import { TrackPlayer } from "./core/trackPlayer";

export default function App() {
  const [player, setPlayer] = useState(null);

  const handleLoad = (text, name) => {
    const points = parseTrackFromText(text, name);
    console.log({points})
    setPlayer(new TrackPlayer(points));
  };

  return (
    <>
      <FileUploader onLoad={handleLoad} />
      <Timeline player={player} />
      <CesiumViewer player={player} />
    </>
  );
}
