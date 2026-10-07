// Same Mercator projections as tools/bake-map.mjs, so places and arrows line up
// with the baked map views in assets/maps/eu.js. Classic script: defines globalThis.Geo.
(function (g) {
  const W = 1920, H = 1080, rad = Math.PI / 180;
  const VIEWS = {
    europe: { center: [16, 51.5], scale: 1750 }, west: { center: [5, 49.5], scale: 3300 },
    uk: { center: [-3.2, 54.3], scale: 4300 }, med: { center: [16, 37.5], scale: 2000 },
    east: { center: [33, 52], scale: 2000 },
  };
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2));
  function project([lon, lat], view = "europe") {
    const v = VIEWS[view];
    return [W / 2 + v.scale * (lon - v.center[0]) * rad, H / 2 - v.scale * (merc(lat) - merc(v.center[1]))];
  }
  const PLACES = {
    Berlin: [13.4, 52.52], Munich: [11.58, 48.14], Paris: [2.35, 48.86], London: [-0.13, 51.5],
    Rome: [12.48, 41.9], Vienna: [16.37, 48.21], Prague: [14.42, 50.08], Warsaw: [21.01, 52.23],
    Moscow: [37.62, 55.75], Leningrad: [30.32, 59.94], Stalingrad: [44.5, 48.7], Kiev: [30.52, 50.45],
    Dunkirk: [2.38, 51.03], Sedan: [4.94, 49.7], Ardennes: [5.6, 50.2], Rhineland: [7.1, 50.4],
    Sudetenland: [14.0, 50.6], Helsinki: [24.94, 60.17], Athens: [23.73, 37.98], Tirana: [19.82, 41.33],
    Coventry: [-1.51, 52.41], Liverpool: [-2.98, 53.41], Glasgow: [-4.25, 55.86], Belfast: [-5.93, 54.6],
    Birmingham: [-1.9, 52.48], Plymouth: [-4.14, 50.38], Bristol: [-2.59, 51.45], Hull: [-0.34, 53.74],
    Cairo: [31.24, 30.04], Tobruk: [23.96, 32.08], Benghazi: [20.07, 32.12], Brest: [23.7, 52.1],
    Riga: [24.1, 56.95], Minsk: [27.56, 53.9], Odessa: [30.72, 46.48], BugRiver: [23.6, 51.5],
  };
  const at = (name, view = "europe") => project(PLACES[name], view);
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
  const route = (lonlats, view = "europe") => smoothPath(lonlats.map((p) => project(p, view)));
  g.Geo = { W, H, VIEWS, project, PLACES, at, route, smoothPath };
})(globalThis);
