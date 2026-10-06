// Same Mercator projection as tools/bake-map.mjs, so places and routes line up
// with assets/maps/med.json. Classic script: defines globalThis.Geo (browser + node).
(function (g) {
  const W = 1920, H = 1080, CENTER = [13.5, 38.6], K = 2050;
  const rad = Math.PI / 180;
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2));
  function project([lon, lat]) {
    return [W / 2 + K * (lon - CENTER[0]) * rad, H / 2 - K * (merc(lat) - merc(CENTER[1]))];
  }
  const PLACES = {
    Rome: [12.48, 41.9], Carthage: [10.32, 36.85], NewCarthage: [-0.98, 37.6],
    Saguntum: [-0.27, 39.68], Massilia: [5.37, 43.3], Syracuse: [15.29, 37.07],
    Cannae: [16.13, 41.3], Zama: [9.2, 36.0], RhoneCrossing: [4.6, 44.0],
    AlpsPass: [6.9, 45.1], Ticinus: [9.0, 45.2], Placentia: [9.7, 45.05],
    Ebro: [0.8, 40.7], Pyrenees: [1.5, 42.5], Sardinia: [9.0, 40.0], Corsica: [9.1, 42.15],
    Sicily: [14.2, 37.5],
  };
  const at = (name) => project(PLACES[name]);
  // Smooth SVG path through projected points (Catmull-Rom → cubic Bézier).
  function smoothPath(pts) {
    if (pts.length < 2) return "";
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1.map((n) => n.toFixed(1))} ${c2.map((n) => n.toFixed(1))} ${p2.map((n) => n.toFixed(1))}`;
    }
    return d;
  }
  const route = (lonlats) => smoothPath(lonlats.map(project));
  const poly = (lonlats) => "M" + lonlats.map((p) => project(p).map((n) => n.toFixed(1)).join(",")).join("L") + "Z";
  g.Geo = { W, H, project, PLACES, at, route, poly, smoothPath };
})(globalThis);
