export interface ArtistDisplayInfo {
  name: string;
  region: string;
}

export function extractArtistInfo(artist: unknown): ArtistDisplayInfo {
  if (typeof artist !== "object" || artist === null) {
    return { name: "", region: "" };
  }
  const a = artist as { title?: unknown; region?: unknown };
  const name = typeof a.title === "string" ? a.title : "";
  let region = "";
  if (typeof a.region === "object" && a.region !== null && "name" in a.region) {
    const r = (a.region as { name?: unknown }).name;
    if (typeof r === "string") region = r;
  }
  return { name, region };
}
