export default function FileUploader({ onLoad }) {
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    onLoad(text, file.name);
  };

  return <input type="file" accept=".kml,.gpx" onChange={handleFile} />;
}
