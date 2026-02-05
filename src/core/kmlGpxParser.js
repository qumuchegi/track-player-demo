import { XMLParser } from "fast-xml-parser";

export function parseTrackFromText(text, filename) {
  if (filename.endsWith(".kml")) return parseKml(text);
  if (filename.endsWith(".gpx")) return parseGpx(text);
  throw new Error("Unsupported format");
}

const parser = new XMLParser({ ignoreAttributes: false });

function parseKml(text) {
  const xml = parser.parse(text);
  const tracks = [];

  const placemarks = xml.kml.Document.Placemark;
  const pms = Array.isArray(placemarks) ? placemarks : [placemarks];

  for (const pm of pms) {
    const track = pm["gx:Track"];
    if (!track) continue;

    const times = [].concat(track.when);
    const coords = [].concat(track["gx:coord"]);

    const points = coords.map((c, i) => {
      const [lon, lat, alt] = c.split(" ").map(Number);
      return {
        t: new Date(times[i]).getTime(),
        p: [lon, lat, alt || 0]
      };
    });

    tracks.push(points);
  }

  return tracks[0];
}

function parseGpx(text) {
  const xml = parser.parse(text);
  const pts = xml.gpx.trk.trkseg.trkpt;
  const arr = Array.isArray(pts) ? pts : [pts];
  console.log({arr})
  return arr.map(p => ({
    t: new Date(p.time).getTime(),
    p: [Number(p["@_lon"]), Number(p["@_lat"]), Number(p.ele || 0)]
  }));
}
