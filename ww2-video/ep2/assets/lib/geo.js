// Same rotated Mercator projections as tools/bake-map.mjs, so places and arrows line up
// with the baked map views in assets/maps/eu.js. Classic script: defines globalThis.Geo.
(function (g) {
  const W = 1920, H = 1080, rad = Math.PI / 180;
  const VIEWS = {
    europe: { center: [16, 51.5], scale: 1750 }, west: { center: [5, 49.5], scale: 3300 },
    atlantic: { center: [-35, 47], scale: 900 }, med: { center: [16, 37.5], scale: 2000 },
    east: { center: [33, 52], scale: 2000 }, world: { center: [75, 22], scale: 380 },
    pacific: { center: [165, 18], scale: 700 }, south: { center: [42, 46.2], scale: 4200 },
    stalingrad: { center: [43.6, 48.75], scale: 13000 }, africa: { center: [12, 32.5], scale: 2350 },
    ladoga: { center: [31.2, 60.25], scale: 9500 }, usa: { center: [-104, 39], scale: 1900 },
  };
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2));
  const wrap = (d) => ((d + 540) % 360) - 180;
  function project([lon, lat], view = "europe") {
    const v = VIEWS[view];
    return [W / 2 + v.scale * wrap(lon - v.center[0]) * rad, H / 2 - v.scale * (merc(lat) - merc(v.center[1]))];
  }
  const PLACES = {
    Berlin: [13.4, 52.52], Munich: [11.58, 48.14], Paris: [2.35, 48.86], London: [-0.13, 51.5],
    Rome: [12.48, 41.9], Vienna: [16.37, 48.21], Prague: [14.42, 50.08], Warsaw: [21.01, 52.23],
    Moscow: [37.62, 55.75], Leningrad: [30.32, 59.94], Stalingrad: [44.5, 48.7], Kiev: [30.52, 50.45],
    Minsk: [27.56, 53.9], Odessa: [30.72, 46.48], Hamburg: [9.99, 53.55], Amsterdam: [4.9, 52.37],
    Athens: [23.73, 37.98], Budapest: [19.04, 47.5], Oslo: [10.75, 59.91], Riga: [24.1, 56.95],
    // camps (Holocaust map)
    Auschwitz: [19.2, 50.03], Treblinka: [22.05, 52.63], Sobibor: [23.6, 51.45], Belzec: [23.46, 50.37],
    Chelmno: [18.73, 52.15], Majdanek: [22.6, 51.22], Wannsee: [13.17, 52.42],
    // Pacific / Asia
    Tokyo: [139.69, 35.69], "Pearl Harbor": [-157.95, 21.35], Midway: [-177.37, 28.21], Manila: [120.98, 14.6],
    "Hong Kong": [114.17, 22.32], Singapore: [103.82, 1.35], Batavia: [106.85, -6.2], Rangoon: [96.16, 16.84],
    Guadalcanal: [160.0, -9.6], Nanjing: [118.8, 32.06], "Kuala Lumpur": [101.69, 3.14], Washington: [-77.04, 38.9],
    "San Francisco": [-122.42, 37.77],
    // North Africa
    "El Alamein": [28.95, 30.83], Tobruk: [23.96, 32.08], Benghazi: [20.07, 32.12], Tripoli: [13.19, 32.89],
    Tunis: [10.18, 36.8], Algiers: [3.06, 36.75], Casablanca: [-7.59, 33.57], Oran: [-0.64, 35.7], Cairo: [31.24, 30.04],
    Alexandria: [29.92, 31.2], Palermo: [13.36, 38.12], Syracuse: [15.29, 37.08],
    // South Russia
    Rostov: [39.72, 47.24], Maikop: [40.1, 44.6], Grozny: [45.69, 43.32], Baku: [49.87, 40.41], Voronezh: [39.2, 51.66],
    Kursk: [36.19, 51.73], Kharkov: [36.23, 49.99], Kalach: [43.5, 48.69], Serafimovich: [42.73, 49.58], Tehran: [51.39, 35.69],
    Murmansk: [33.08, 68.97], Archangel: [40.52, 64.54], Glasgow: [-4.25, 55.86], Liverpool: [-2.98, 53.41], "New York": [-74.0, 40.7], Halifax: [-63.57, 44.65],
    // Leningrad siege
    Kronstadt: [29.77, 59.99], Shlisselburg: [31.03, 59.94], Osinovets: [31.25, 60.13], Kobona: [32.03, 60.0], Tikhvin: [33.6, 59.64],
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
  const poly = (lonlats, view) => "M" + lonlats.map((p) => project(p, view).map((n) => n.toFixed(1)).join(",")).join(" L") + "Z";
  g.Geo = { W, H, VIEWS, project, PLACES, at, route, smoothPath, poly };
})(globalThis);
