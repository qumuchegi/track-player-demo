export default function Timeline({ player }) {
  if (!player) return null;

  return (
    <input
      type="range"
      min={player.start}
      max={player.end}
      value={player.time}
      onChange={e => player.seek(Number(e.target.value))}
      style={{ width: "100%" }}
    />
  );
}
