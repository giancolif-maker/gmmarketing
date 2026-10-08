"""Builds s1.html, s2.html, s3.html: the shared SVG defs + engine + toolkit + the Short's own script, at 1080x1920."""
import os
H = os.path.dirname(os.path.abspath(__file__))
defs = open(os.path.join(H, "../lib/defs.svg.html")).read()
for sid in ("s1", "s2", "s3"):
    maps = '<script src="../assets/maps/eu.js"></script>' if sid in ("s1",) else ""
    open(os.path.join(H, f"{sid}.html"), "w").write(f"""<!doctype html>
<html><head><meta charset="UTF-8">
<style>
@font-face {{ font-family: Fraktur; src: url(../assets/fonts/fraktur.ttf); }}
@font-face {{ font-family: Fell; src: url(../assets/fonts/fell.ttf); }}
@font-face {{ font-family: FellSC; src: url(../assets/fonts/fellsc.ttf); }}
@font-face {{ font-family: Elite; src: url(../assets/fonts/elite.ttf); }}
html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #e9dcc0; }}
#stage {{ position: absolute; inset: 0; filter: sepia(.18) saturate(.92) contrast(1.03); }}
#stage svg, #paper {{ position: absolute; inset: 0; width: 1080px; height: 1920px; }}
#paper {{ mix-blend-mode: multiply; pointer-events: none; }}
#fade {{ position: absolute; inset: 0; background: #e6d6b4; opacity: 0; }}
</style></head><body>
<div id="stage"><svg id="svg" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">{defs}
<g id="world" filter="url(#boil)"></g><g id="hud"></g></svg>
<img id="paper" src="build/paper.png"><div id="fade"></div></div>
<script src="../lib/core.js"></script>{maps}<script src="common.js"></script><script src="{sid}.js"></script>
</body></html>""")
print("pages ok")
