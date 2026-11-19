// The Climb (≈ 50 s): the Empire State Building, a code-built Art Deco hero
// model (setbacks, limestone piers, aluminium spandrels, lit windows, the
// mooring mast with its fins, the spire), in its own scene with a dusk sky and a
// code city far below (Central Park a green slab on the northern horizon).
// The scene is drawn through G.altView (main.js render()); it has a mirrored
// root like the world, so the same data-space camera (G.rig) frames it.
//
// Alternate Flap and Peck to climb (left claw, right claw): each right press
// hauls the Mecha up; the same claw twice just clanks; with no input it still
// creeps up (it can't be failed). Sidestep (the stick, A/D) round the window
// cleaners' cradles. Three crew beats, each one quick prompt that always succeeds:
//   1. a gust: Rhoda and Rex grab the Mecha's shoulders and lift it past ("Hold STILL, you big lug!")
//   2. a news chopper's spotlight swings in: Coo, and the whole flock swirls in front of it
//   3. the 80th floor: the Grate Rats cheer from every window and wave a bedsheet banner (a drawn pigeon)
import * as THREE from 'three';
import { Debris, BigFlock, hash, ease, clamp01, GIANT, loafGeometry, loafMaterial } from './finale.js';
import { WORLD, PARK as P } from '../world/layout.js';

const H0 = 200, TOP = 372;            // climb from here to the mooring mast's top deck
const CREEP = 1.1, PULL = 2.0;       // m/s with no input; metres per good grab
const BEATS = [{ at: 0.14, id: 'gust' }, { at: 0.33, id: 'chopper' }, { at: 0.5, id: 'rats' }];   // the rats' row is the 80th floor (≈ 292 m)
export const CRADLES = [{ y: 238, x: 6 }, { y: 266, x: -5 }, { y: 296, x: 4 }];   // only where the face is wide enough to step round
// massing: [y0, y1, half-width x, half-depth z]
const MASS = [[0, 26, 70, 45], [26, 84, 52, 34], [84, 270, 27, 20], [270, 300, 21, 16], [300, 320, 16, 13]];

function faceZ(y) {
  // the south face the Mecha climbs (it hauls itself over each setback)
  if (y < 270) return -20;
  if (y < 300) return -20 + 4 * clamp01((y - 270) / 8);
  if (y < 320) return -16 + 3 * clamp01((y - 300) / 8);
  return -13 + 5.5 * clamp01((y - 320) / 10);
}
function halfW(y) { return y < 270 ? 27 : y < 300 ? 21 : y < 320 ? 16 : 8; }

function facadeTexture(lit) {
  // one bay: 8 m wide × 16 m tall (4 floors). The ESB look: pale limestone piers, and between them
  // vertical strips of aluminium spandrels with paired narrow windows (about a quarter lit at dusk)
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = lit ? '#000' : '#d9cfb8'; g.fillRect(0, 0, 128, 256);
  if (!lit) { g.fillStyle = '#a9b0b5'; for (const x of [14, 70]) g.fillRect(x, 0, 44, 256); }   // the aluminium strips
  for (let f = 0; f < 4; f++) for (let w = 0; w < 4; w++) {
    const x = 17 + (w % 2) * 21 + (w > 1 ? 56 : 0), y = 10 + f * 64;
    const on = hash(f * 4 + w, 3) < 0.26;
    if (lit) { if (on) { g.fillStyle = '#ffd890'; g.fillRect(x, y, 17, 40); } continue; }
    g.fillStyle = on ? '#f4cf86' : '#34404f'; g.fillRect(x, y, 17, 40);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, 17, 3);
  }
  if (!lit) { g.fillStyle = 'rgba(80,70,50,.18)'; for (let y = 0; y < 256; y += 64) g.fillRect(0, y + 56, 128, 3); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
/** A box with its side UVs in metres / (8 × 16) so the facade tiles at true size. */
function facadeBox(w, h, d, y0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    if (ny > 0.5) uv.setXY(i, 0.02, 0.02);
    else uv.setXY(i, uv.getX(i) * (nx > 0.5 ? d : w) / 8, (uv.getY(i) * h + y0) / 16);
  }
  g.translate(0, y0 + h / 2, 0);
  return g;
}

export class Climb {
  constructor(F) { this.F = F; this.G = F.G; }

  async build() {
    const G = this.G, F = this.F;
    const scene = this.scene = new THREE.Scene();
    scene.name = 'finale: the Empire State Building';
    scene.fog = new THREE.Fog(0xe8b98a, 900, 6200);   // Fixes-2: pushed out so the park and the far skyline read
    const root = this.root = new THREE.Group(); root.scale.x = -1; root.name = 'esb (mirrored root)';
    scene.add(root);
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.5, 6000);
    // light: a low golden sun from the south-west, a cool sky fill
    const hemi = new THREE.HemisphereLight(0xbcd2f0, 0x5a4a3c, 1.25); root.add(hemi);
    const sun = new THREE.DirectionalLight(0xffc98a, 3.0); sun.position.set(-600, 500, -700); root.add(sun, sun.target);
    // the shout's hero shot: a warm low sunset key from the west on the setbacks, and floodlights on the crown
    const key = this.key = new THREE.DirectionalLight(0xffa860, 0); key.position.set(-900, 260, -150); root.add(key, key.target);
    const flood = this.flood = new THREE.PointLight(0xffd890, 0, 160, 1.2); flood.position.set(0, 330, -40); root.add(flood);
    // the sky: a gradient dome
    const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP; void main(){ float h = vP.y; vec3 top = vec3(0.24, 0.42, 0.72), mid = vec3(0.98, 0.72, 0.48), low = vec3(0.93, 0.62, 0.45);
        float sun = pow(max(0.0, dot(vP, normalize(vec3(0.6, 0.12, -0.7)))), 24.0);
        vec3 c = h > 0.05 ? mix(mid, top, smoothstep(0.05, 0.5, h)) : mix(low, mid, smoothstep(-0.2, 0.05, h));
        gl_FragColor = vec4(c + vec3(1.0, 0.8, 0.5) * sun * 0.8, 1.0); }`,
    }));
    sky.renderOrder = -10; root.add(sky);
    this.sky = sky;
    // ---- the building
    const facade = new THREE.MeshStandardMaterial({ map: facadeTexture(false), emissiveMap: facadeTexture(true), emissive: new THREE.Color(0xffc870), emissiveIntensity: 0.9, roughness: 0.72, metalness: 0.08 });
    const roof = new THREE.MeshStandardMaterial({ color: 0x8c8172, roughness: 0.9 });
    const stone = new THREE.MeshStandardMaterial({ color: 0xd6c9ab, roughness: 0.75 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xc9ced3, roughness: 0.3, metalness: 0.85 });
    const glowM = new THREE.MeshBasicMaterial({ color: 0xffe7a8 });
    const red = new THREE.MeshBasicMaterial({ color: 0xff3a2a });
    this.mats = { facade, stone, metal };
    const esb = this.esb = new THREE.Group(); root.add(esb);
    const boxes = [], piers = [], trims = [];
    for (const [y0, y1, hx, hz] of MASS) {
      boxes.push(facadeBox(hx * 2, y1 - y0, hz * 2, y0));
      // a stepped stone crown at each setback
      trims.push(new THREE.BoxGeometry(hx * 2 + 1.2, 1.2, hz * 2 + 1.2).translate(0, y1 - 0.6, 0));
      trims.push(new THREE.BoxGeometry(hx * 2 - 2, 2.4, hz * 2 - 2).translate(0, y1 + 1.2, 0));
      // limestone piers proud of the facade, running the whole height (the famous verticals)
      if (y1 - y0 > 25) {
        for (let x = -hx + 4; x <= hx - 4; x += 8) for (const sz of [-1, 1]) piers.push(new THREE.BoxGeometry(1.3, y1 - y0, 0.9).translate(x, (y0 + y1) / 2, sz * (hz + 0.35)));
        for (let z = -hz + 4; z <= hz - 4; z += 8) for (const sx of [-1, 1]) piers.push(new THREE.BoxGeometry(0.9, y1 - y0, 1.3).translate(sx * (hx + 0.35), (y0 + y1) / 2, z));
      }
    }
    // the shaft's chamfered corner notches (the deco "wings")
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) boxes.push(facadeBox(6, 186, 6, 84).translate(sx * 27.5, 0, sz * 20.5));
    const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
    const merged = mergeGeometries(boxes.map((g) => g.toNonIndexed()), false);
    // top/bottom faces got uv (0.02, 0.02): pier stone; fine as roofs from this far
    esb.add(new THREE.Mesh(merged, facade));
    esb.add(new THREE.Mesh(mergeGeometries(piers.map((g) => g.toNonIndexed()), false), stone));
    esb.add(new THREE.Mesh(mergeGeometries(trims.map((g) => g.toNonIndexed()), false), roof));
    // the 86th-floor observation deck: a parapet ring
    // the mooring mast: an octagonal shaft with four fins, a glowing crown, then the spire
    const mast = [];
    mast.push(new THREE.CylinderGeometry(7.5, 9.5, 30, 8).translate(0, 320 + 15, 0));
    mast.push(new THREE.CylinderGeometry(6.0, 7.5, 18, 8).translate(0, 350 + 9, 0));
    for (let k = 0; k < 4; k++) {
      const fin = new THREE.BoxGeometry(2.2, 38, 5).translate(0, 339, 9.5);
      fin.rotateY(k * Math.PI / 2 + Math.PI / 4); mast.push(fin);
    }
    mast.push(new THREE.CylinderGeometry(9, 9, 1.2, 8).translate(0, TOP - 4.6, 0));      // the top deck the Mecha stands on
    esb.add(new THREE.Mesh(mergeGeometries(mast.map((g) => (g.index ? g.toNonIndexed() : g)), false), metal));
    const crown = this.crown = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.6, 3, 8, 1, true), glowM); crown.position.y = 366; esb.add(crown);
    for (const [y, hx, hz] of [[300, 21.6, 16.6], [320, 16.6, 13.6]]) { const band = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, 1.4, hz * 2), glowM); band.position.y = y + 0.2; esb.add(band); }
    // Fixes-3 (R9): the spire in a duller metal of its own (under the shout's flood light it was a blown-out white stripe)
    const spireM = metal.clone(); spireM.color = new THREE.Color(0x6f747c); spireM.roughness = 0.65; spireM.metalness = 0.5;
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.4, 62, 8).translate(0, TOP - 4 + 31, 0), spireM); esb.add(spire);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), red); beacon.position.y = TOP + 58; esb.add(beacon);
    this.beacon = beacon;
    // ---- window-washer cradles
    const cradleG = this.cradleG = new THREE.Group(); esb.add(cradleG);
    for (const c of CRADLES) {
      const g = new THREE.Group(); g.position.set(c.x, c.y, faceZ(c.y) - 1.4);
      const plat = new THREE.Mesh(new THREE.BoxGeometry(9, 1.0, 2.0), new THREE.MeshStandardMaterial({ color: 0x2f6fc0, roughness: 0.6 })); g.add(plat);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(9, 0.2, 0.2).translate(0, 1.2, -0.9), metal); g.add(rail);
      for (const sx of [-1, 1]) { const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 40).translate(0, 20, 0), metal); rope.position.x = sx * 4.2; g.add(rope); }
      for (const sx of [-1.5, 1.8]) { const who = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.0, 4, 8), new THREE.MeshStandardMaterial({ color: 0xe0a83a })); who.position.set(sx, 1.2, 0); g.add(who); }
      cradleG.add(g); c.g = g;
    }
    // ---- the city below (Fixes-2, P1: it was a grey void of identical noise cubes). Now Manhattan's grid: avenues and
    // streets of asphalt, every block on a paved sidewalk, buildings in the world's own generated facades (brick,
    // limestone, deco, glass) with varied tints and heights (taller in Midtown), roofs, the rivers, the far skyline
    // ring all round, and Central Park to the north drawn from the game's own top-down park (see #park()).
    this.windows = [];
    this.#city(root);
    // ---- the crew beats' cast
    const hawk = await G.registry.baked('hawk-fly');
    this.hawks = [];
    for (let k = 0; k < 2; k++) {
      const g = new THREE.Group(); const inner = new THREE.Group(); inner.scale.set(-4, 4, 4); g.add(inner);
      if (hawk) inner.add(new THREE.Mesh(hawk.geometry, hawk.makeMaterial()));
      g.visible = false; root.add(g); this.hawks.push(g);
    }
    this.chopper = this.#chopper(metal);
    root.add(this.chopper);
    const rat = await G.registry.baked('rat-lod');
    this.ratMesh = new THREE.InstancedMesh(rat ? rat.geometry : new THREE.BoxGeometry(0.2, 0.2, 0.4), rat ? rat.makeMaterial() : stone, 30);
    const ratCM = new THREE.Group(); ratCM.scale.x = -1; ratCM.add(this.ratMesh); root.add(ratCM);
    this.ratMesh.count = 0; this.ratMesh.frustumCulled = false;
    this.banner = this.#banner(); this.banner.visible = false; root.add(this.banner);
    // the big flock and the bread, in this scene too
    this.flock = new BigFlock(G, 70, 9); root.add(this.flock.mesh);
    this.bread = new Debris(loafGeometry().scale(1.1, 1.1, 1.1), loafMaterial(), 900, { ground: () => 0, gravity: 4, life: 14, spin: 5 });   // Fixes-3 (R9): loaves, not yellow cubes
    root.add(this.bread.mesh);
    const slice = await G.registry.baked('pizza-slice');
    this.slice = new THREE.Group(); const si = new THREE.Group(); si.scale.set(-14, 14, 14); this.slice.add(si);
    if (slice) si.add(new THREE.Mesh(slice.geometry, slice.makeMaterial()));
    this.slice.visible = false; root.add(this.slice);
    // the view hook main.js's render() calls while the climb is on screen
    const cam = this.camera;
    this.view = {
      render: (renderer, renderCam) => {
        cam.position.copy(renderCam.position); cam.quaternion.copy(renderCam.quaternion);
        if (cam.fov !== renderCam.fov || cam.aspect !== renderCam.aspect) { cam.fov = renderCam.fov; cam.aspect = renderCam.aspect; cam.updateProjectionMatrix(); }
        cam.updateMatrixWorld();
        renderer.render(scene, cam);
      },
    };
    try { G.renderer.compile(scene, this.camera); } catch { /* compiled on first draw instead */ }
  }

  /** Fixes-2 (P1): Manhattan round the ESB. Data space (+x east, +z north), the ESB at the origin on Fifth Avenue. */
  #city(root) {
    const G = this.G, M = G.M || {}, T = G.worldTex || {};
    const AVE = 262, ST = 80, AVE_W = 30, ST_W = 18;           // avenue / street spacing and widths (m)
    const X0 = -1240, X1 = 1060, Z0 = -1500, Z1 = 1240;         // the grid between the rivers, up to the park's south edge
    const PARK = { x0: -800, x1: 0, z0: 1300, z1: 5400 };      // Fifth Avenue to Central Park West, 59th Street northwards
    const tile = (t, m) => { if (!t) return null; const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(1 / m, 1 / m); c.needsUpdate = true; return c; };
    // the facade materials: the world's textures and window masks, a tint per building (vertex colours), lit windows
    // at a sunset glow (the same hash-per-pane trick as the park's city ring)
    const glow = { value: 0.3 };
    const facadeMat = (name, seed, lit) => {
      const m = new THREE.MeshStandardMaterial({ map: tile(T[name], 14), emissiveMap: tile(T[name + 'Mask'], 14), emissive: new THREE.Color(0xffd08a), vertexColors: true, roughness: 0.85, color: T[name] ? 0xffffff : 0xc9b9a0 });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uGlow = glow;
        sh.fragmentShader = 'uniform float uGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `
          #ifdef USE_EMISSIVEMAP
            vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
            vec2 wcell = floor( vEmissiveMapUv * 4.0 );
            float wh = fract( sin( dot( wcell, vec2( 12.9898, 78.233 ) ) + ${seed.toFixed(1)} ) * 43758.5453 );
            // (the pane hash isn't mip-mapped: far off it sparkles like noise, so the lights fade out with distance)
            totalEmissiveRadiance *= emissiveColor.r * step( wh, ${lit.toFixed(2)} ) * uGlow * ( 0.7 + 0.6 * fract( wh * 7.13 ) ) * ( 1.0 - smoothstep( 180.0, 520.0, length( vViewPosition ) ) );
          #endif`);
      };
      m.customProgramCacheKey = () => 'esb-facade-' + seed;
      return m;
    };
    const KINDS = [['brick', 1, 0.3], ['limestone', 2, 0.3], ['deco', 4, 0.32], ['glass', 3, 0.38]].map(([n, sd, lit]) => ({ mat: facadeMat(n, sd, lit), pos: [], uv: [], col: [] }));
    const TINTS = { brick: [0xffffff, 0xe9c2a8, 0xc8907a, 0xf2d6c0], limestone: [0xffffff, 0xf0e2c8, 0xd9d2c6, 0xe8d9b8], deco: [0xffffff, 0xeedcc0, 0xd8c8b0], glass: [0xffffff, 0xcfe0ec, 0xb9c8d2, 0xe0e8ea] };
    const NAMES = ['brick', 'limestone', 'deco', 'glass'];
    const roof = { pos: [], uv: [] }, walk = { pos: [], uv: [] };
    const col = new THREE.Color();
    // one quad: corners a b c d (counter-clockwise seen from outside), uv in metres
    const quad = (L, a, b, c, d, ua, ub, uc, ud, rgb) => {
      // walls are listed bottom-left → bottom-right → top-right → top-left as seen from outside: wind them outward in data
      // space (the mirrored root flips the culling to match); roofs and sidewalks (no colour) are listed facing up already
      const order = rgb ? [[a, ua], [c, uc], [b, ub], [a, ua], [d, ud], [c, uc]] : [[a, ua], [b, ub], [c, uc], [a, ua], [c, uc], [d, ud]];
      for (const [p, u] of order) { L.pos.push(p[0], p[1], p[2]); L.uv.push(u[0], u[1]); if (rgb) L.col.push(rgb.r, rgb.g, rgb.b); }
    };
    const building = (x0, x1, z0, z1, y0, h, kind, rgb) => {
      const L = KINDS[kind], y1 = y0 + h, w = x1 - x0, d = z1 - z0;
      quad(L, [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, y0], [w, y0], [w, y1], [0, y1], rgb);   // south face
      quad(L, [x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, y0], [w, y0], [w, y1], [0, y1], rgb);   // north
      quad(L, [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [0, y0], [d, y0], [d, y1], [0, y1], rgb);   // east
      quad(L, [x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [0, y0], [d, y0], [d, y1], [0, y1], rgb);   // west
      quad(roof, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [x0, z1], [x1, z1], [x1, z0], [x0, z0]);
    };
    let n = 0;
    for (let ax = X0; ax < X1; ax += AVE) for (let sz = Z0; sz < Z1; sz += ST) {
      const bx0 = ax + AVE_W / 2, bx1 = ax + AVE - AVE_W / 2, bz0 = sz + ST_W / 2, bz1 = sz + ST - ST_W / 2;
      const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
      if (Math.abs(cx) < 140 && Math.abs(cz) < 70) {   // the ESB's own block: only its sidewalk
        quad(walk, [bx0, 0.25, bz1], [bx1, 0.25, bz1], [bx1, 0.25, bz0], [bx0, 0.25, bz0], [bx0, bz1], [bx1, bz1], [bx1, bz0], [bx0, bz0]);
        continue;
      }
      if (bx1 > PARK.x0 && bx0 < PARK.x1 && bz1 > PARK.z0) continue;
      quad(walk, [bx0, 0.25, bz1], [bx1, 0.25, bz1], [bx1, 0.25, bz0], [bx0, 0.25, bz0], [bx0, bz1], [bx1, bz1], [bx1, bz0], [bx0, bz0]);
      // the block: 2–4 buildings side by side (a few gaps: plazas, low infill)
      const i = Math.round(ax / AVE), j = Math.round(sz / ST);
      const parts = 2 + Math.floor(hash(i * 13 + j, 1) * 3);
      const r = Math.hypot(cx, cz), mid = r < 750 ? 1 : r < 1400 ? 0.6 : 0.35;
      let x = bx0 + 2;
      for (let k = 0; k < parts; k++) {
        const wk = (bx1 - bx0 - 4) / parts;
        const xa = x, xb = x + wk - 2; x += wk;
        if (hash(i * 31 + j * 7 + k, 2) < 0.06) continue;
        const tall = hash(i * 17 + j * 3 + k, 3);
        let h = 18 + tall * tall * 150 * mid + hash(i + k, j) * 20;
        if (tall > 0.965 && r < 1600) h = 190 + hash(i, j + k) * 110;   // a few towers
        const kind = h > 150 ? (hash(i, k + j) < 0.6 ? 3 : 2) : Math.floor(hash(i * 3 + k, j * 5) * 3.6) % 4;
        const tints = TINTS[NAMES[kind]];
        col.set(tints[Math.floor(hash(i * 7 + k, j * 11) * tints.length) % tints.length]);
        const inset = 1 + hash(k, i + j) * 4;
        building(xa, xb, bz0 + inset, bz1 - inset, 0.25, h, kind, col);
        if (h > 110 && hash(i + 3 * k, j + 2) < 0.7) building(xa + 6, xb - 6, bz0 + inset + 5, bz1 - inset - 5, 0.25 + h, 12 + hash(k, i) * 30, kind, col);   // a setback crown
        if (r < 650) this.windows.push({ x: (xa + xb) / 2, z: (bz0 + bz1) / 2, h, w: xb - xa, d: bz1 - bz0 });
        n++;
      }
    }
    const geo = (L, colours) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(L.pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(L.uv, 2));
      if (colours) g.setAttribute('color', new THREE.Float32BufferAttribute(L.col, 3));
      g.computeVertexNormals();
      return g;
    };
    const city = new THREE.Group(); city.name = 'esb-city';
    for (const L of KINDS) if (L.pos.length) city.add(new THREE.Mesh(geo(L, true), L.mat));
    city.add(new THREE.Mesh(geo(roof), M.roof || new THREE.MeshStandardMaterial({ color: 0x5e5a56 })));
    city.add(new THREE.Mesh(geo(walk), M.pavers || new THREE.MeshStandardMaterial({ color: 0x928d86 })));
    root.add(city);
    this.cityCount = n;
    // the streets: asphalt, metre UVs so the world's noise tile shows at its true scale
    const gG = new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2);
    { const uv = gG.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 9000, uv.getY(k) * 9000); }
    root.add(new THREE.Mesh(gG, M.tar || new THREE.MeshStandardMaterial({ color: 0x47423f, roughness: 1 })));
    // the rivers either side
    const water = new THREE.MeshStandardMaterial({ color: 0x41708c, roughness: 0.25, metalness: 0.25 });
    for (const [x, w] of [[-1550, 560], [1330, 520]]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(w, 12000).rotateX(-Math.PI / 2), water); r.position.set(x, 0.3, 0); root.add(r); }
    // Central Park: a plane (its texture is the game's own top-down park, made on first use) with a low stone wall
    this.parkRect = PARK;
    const parkGeo = new THREE.PlaneGeometry(PARK.x1 - PARK.x0, PARK.z1 - PARK.z0).rotateX(-Math.PI / 2);
    this.parkMat = new THREE.MeshStandardMaterial({ color: 0x6f9a4a, roughness: 1 });
    const park = new THREE.Mesh(parkGeo, this.parkMat);
    park.position.set((PARK.x0 + PARK.x1) / 2, 0.6, (PARK.z0 + PARK.z1) / 2); root.add(park);
    const wall = M.stone || new THREE.MeshStandardMaterial({ color: 0xb3aa9c });
    for (const [x, z, w, d] of [[(PARK.x0 + PARK.x1) / 2, PARK.z0, PARK.x1 - PARK.x0, 2], [PARK.x0, (PARK.z0 + PARK.z1) / 2, 2, PARK.z1 - PARK.z0], [PARK.x1, (PARK.z0 + PARK.z1) / 2, 2, PARK.z1 - PARK.z0]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, d), wall); m.position.set(x, 0.7, z); root.add(m);
    }
    // a ring of park-edge towers along Central Park South and the two avenues (the park's famous frame)
    // the far skyline ring (the park's own skyline band), out past the rivers, hazed by the fog
    if (T.skylineDay) {
      // the band's tile has the Empire State Building in it (u ≈ 0.45): from ON the ESB that would be a twin on every
      // horizon, so every repeat borrows a spire-free stretch there instead (as farlayer.js does), hazed to the sky's colour
      const R = 4200, TILES = 18, H = (2 * Math.PI * R) / TILES / 4 * 0.8;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 120, 1, true).translate(0, H / 2 - 20, 0), new THREE.ShaderMaterial({
        side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
        uniforms: { tSky: { value: T.skylineDay }, uHaze: { value: new THREE.Color(0xeab58c) } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform sampler2D tSky; uniform vec3 uHaze; varying vec2 vUv;
          void main(){ float u = fract(vUv.x * ${TILES.toFixed(1)}); if (u > 0.405 && u < 0.49) u -= 0.255;   // (farlayer.js's spire-free stretch)
            vec4 c = texture2D(tSky, vec2(u, vUv.y));
            gl_FragColor = vec4(mix(c.rgb, uHaze, 0.45), c.a);
            #include <colorspace_fragment>
          }`,
      }));
      ring.renderOrder = -5; root.add(ring);
      this.skyRing = ring;
    }
  }

  /** Fixes-2 (P1): the park plane wears the game's real top-down park (G.mapImage, rendered at load), cropped to it. */
  #parkTexture() {
    const G = this.G;
    if (this.parkTexDone || !G.mapImage) return;
    this.parkTexDone = true;
    const img = G.mapImage, W = WORLD.xMax - WORLD.xMin, Hh = WORLD.zMax - WORLD.zMin;
    const sx = ((P.xMin - WORLD.xMin) / W) * img.width, sw = ((P.xMax - P.xMin) / W) * img.width;
    const sy = ((WORLD.zMax - P.zMax) / Hh) * img.height, sh = ((P.zMax - P.zMin) / Hh) * img.height;
    const c = document.createElement('canvas'); c.width = 256; c.height = 1024;
    const g = c.getContext('2d');
    g.drawImage(img, sx, sy, sw, sh, 0, 0, 256, 1024);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#d8e0c4'; g.fillRect(0, 0, 256, 1024);   // a touch of haze-green
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4;
    this.parkMat.map = t; this.parkMat.color.set(0xffffff); this.parkMat.needsUpdate = true;
  }

  #chopper(metal) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 3.2, 6, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2b4f8a, roughness: 0.4, metalness: 0.3 }));
    g.add(body);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9fd2ff, roughness: 0.1, metalness: 0.5 }));
    glass.position.z = 2.0; g.add(glass);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 6, 8).rotateX(Math.PI / 2), metal); tail.position.set(0, 0.4, -5); g.add(tail);
    const rotor = this.rotor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.12, 0.5), metal); rotor.position.y = 2.0; g.add(rotor);
    const rotor2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 12), metal); rotor.add(rotor2);
    for (const sx of [-1, 1]) { const skid = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 5), metal); skid.position.set(sx * 1.3, -2.0, 0); g.add(skid); }
    // the spotlight: an additive cone
    const beam = this.beam = new THREE.Mesh(new THREE.ConeGeometry(9, 60, 20, 1, true).translate(0, -30, 0).rotateX(-Math.PI / 2 - 0.0), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(0, -1.4, 2.2); g.add(beam);
    g.visible = false;
    return g;
  }

  #banner() {
    // a bedsheet with a drawn pigeon on it (no text), hung from a row of windows
    const c = document.createElement('canvas'); c.width = 256; c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 256, 160);
    g.strokeStyle = '#3a3a44'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
    g.fillStyle = '#8a95a7'; g.beginPath(); g.ellipse(120, 92, 54, 36, -0.15, 0, Math.PI * 2); g.fill(); g.stroke();      // body
    g.beginPath(); g.arc(178, 58, 24, 0, Math.PI * 2); g.fill(); g.stroke();                                             // head
    g.fillStyle = '#2bb5a8'; g.beginPath(); g.ellipse(160, 80, 14, 9, -0.6, 0, Math.PI * 2); g.fill();                     // neck sheen
    g.fillStyle = '#f08a24'; g.beginPath(); g.moveTo(200, 56); g.lineTo(226, 62); g.lineTo(200, 66); g.closePath(); g.fill(); g.stroke();   // beak
    g.fillStyle = '#222'; g.beginPath(); g.arc(184, 52, 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c4302b'; g.beginPath(); g.moveTo(110, 126); g.lineTo(104, 148); g.moveTo(132, 126); g.lineTo(136, 148); g.stroke();
    g.strokeStyle = '#3a3a44'; g.beginPath(); g.moveTo(70, 90); g.lineTo(30, 70); g.lineTo(66, 104); g.stroke();             // tail
    for (let k = 0; k < 5; k++) { g.fillStyle = '#c4302b'; g.beginPath(); g.arc(20 + k * 54, 14, 5, 0, Math.PI * 2); g.fill(); }   // hearts-ish dots
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const grp = new THREE.Group(); const inner = new THREE.Group(); inner.scale.x = -1; grp.add(inner);
    const geo = new THREE.PlaneGeometry(16, 10, 8, 4);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.95 }));
    m.rotation.y = Math.PI;   // faces south (out of the building)
    inner.add(m);
    this.bannerGeo = geo;
    return grp;
  }

  /** Move the Mecha (and the camera hook) into this scene. */
  enterScene() {
    const F = this.F, G = this.G;
    this.#parkTexture();   // Fixes-2
    if (F.mecha.root.parent !== this.root) this.root.add(F.mecha.root);
    F.setScale(GIANT);
    if (F.gusMesh) F.gusMesh.visible = true;
    // Fixes-3 (R9): the park's detail cull (gfx/detail-cull.js) takes small, far meshes off layer 0, and it only walks the
    // park: brought in here, Gus on the Mecha's head stayed culled (never drawn on the ESB: "Gus not visible")
    F.mecha.root.traverse((o) => o.layers.enable(0));
    G.altView = this.view;
    F.inAlt = true;
  }

  start() {
    const F = this.F, G = this.G;
    this.enterScene();
    F.black(false);
    this.h = H0; this.x = 0; this.t = 0; this.last = null; this.pull = 0; this.reach = { L: 0, R: 0 }; this.idle = 0;
    this.beat = null; this.beatsDone = 0; this.bump = 0; this.ev = {};
    this.hawks.forEach((h) => { h.visible = false; }); this.chopper.visible = false; this.banner.visible = false; this.ratMesh.count = 0;
    this.chop = null;
    this.flock.toward = null;
    this.#placeMecha(0);
    this.$meter = F.$.meter;
    this.$meter.className = 'meter on';
    F.caption('The Empire State Building. Up we go.', 3);
    G.audio.play('mecha-step-boom', { vol: 0.8, rate: 0.8 });
  }

  #placeMecha(t) {
    const m = this.F.mecha;
    const z = faceZ(this.h) - 3.2;
    m.root.position.set(this.x, this.h - 9.5, z);
    m.root.rotation.set(0, 0, 0);    // facing the building (north)
    m.pose('climb', t, { reachL: this.reach.L, reachR: this.reach.R, flap: this.beat?.id === 'gust' ? 1 : 0 });
  }

  update(dt) {
    const F = this.F, G = this.G, inp = G.input, m = F.mecha;
    const t = (this.t += dt);
    const frac = clamp01((this.h - H0) / (TOP - H0));
    // ---- the crew beats (climbing pauses while one plays)
    if (!this.beat && this.beatsDone < BEATS.length && frac >= BEATS[this.beatsDone].at) this.#beatStart(BEATS[this.beatsDone].id);
    if (this.beat) { if (this.#beatUpdate(dt)) { this.beat = null; this.beatsDone++; } }
    else {
      // ---- the claws: alternate Flap (left) and Peck (right)
      const L = inp.pressed('flap'), R = inp.pressed('peck');
      const grab = L ? 'L' : R ? 'R' : null;
      if (grab) {
        this.idle = 0;
        if (grab !== this.last) { this.pull += PULL; this.reach[grab] = 1; this.last = grab; G.audio.play('mecha-servo', { vol: 0.5, rate: grab === 'L' ? 1.1 : 1.25 }); G.shake(0.12, 0.15); }
        else { this.pull += 0.25; G.audio.play('hubcap-clang', { vol: 0.35, rate: 1.6 }); }
      } else this.idle += dt;
      let v = CREEP;
      const take = Math.min(this.pull, dt * 9);
      this.pull -= take;
      // the cradles: sidestep them, or bump and wait a moment
      if (this.bump > 0) { this.bump -= dt; v = 0; }
      let dy = v * dt + (this.bump > 0 ? 0 : take);
      for (const c of CRADLES) {
        if (!c.passed && this.h + dy > c.y - 9 && this.h < c.y - 9 + 0.5) {
          // a bump only costs a moment: the cleaners shuffle their cradle aside and you go on up
          if (Math.abs(this.x - c.x) < 8.5) { c.passed = true; if (this.bump <= 0) { this.bump = 0.7; dy = 0; this.pull = 0; G.bubbles.add('"Excuse me!"', { at: { x: c.x, y: c.y + 3, z: c.g.position.z }, ttl: 1.2 }); G.audio.play('knock-clatter', { vol: 0.5 }); } }
          else c.passed = true;
        }
        if (this.h > c.y + 2) c.passed = true;
      }
      this.h = Math.min(TOP, this.h + dy);
      // sidestep
      const sx = inp.move().x;
      const hw = halfW(this.h) - 7;
      this.x = Math.max(-hw, Math.min(hw, this.x - sx * dt * 9));     // stick right → screen right (the camera looks north)
      this.x = Math.max(-hw, Math.min(hw, this.x));
      // prompts
      const cr = CRADLES.find((c) => !c.passed && c.y - 9 - this.h < 26 && c.y - 9 > this.h - 1 && Math.abs(this.x - c.x) < 8.5);
      if (cr) F.prompt('move', 'Sidestep the window cleaners!');
      else if (this.h < TOP) F.prompt(this.last === 'L' ? 'peck' : this.last === 'R' ? 'flap' : ['flap', 'peck'], this.last ? 'Climb!' : 'Alternate to climb (left claw, right claw)', { pulse: this.idle > 1.2 || !this.last });
    }
    this.reach.L = Math.max(0, this.reach.L - dt * 2.6); this.reach.R = Math.max(0, this.reach.R - dt * 2.6);
    this.#placeMecha(t);
    m.ventGlow(t, 1.5);
    // the meter: how high
    const f2 = clamp01((this.h - H0) / (TOP - H0));
    this.$meter.querySelector('i').style.height = `calc(${(f2 * 100).toFixed(1)}% - 4px)`;
    const fl = Math.min(102, Math.round(this.h / 3.65));
    this.$meter.querySelector('b').style.bottom = (f2 * 100).toFixed(1) + '%';
    this.$meter.querySelector('b').textContent = `Floor ${fl}`;
    // the flock, the beacon, the bread
    this.flock.center.set(this.x, this.h + 6, faceZ(this.h) - 16); this.flock.radius = 22; this.flock.height = 14;
    this.flock.update(dt);
    this.beacon.material.color.setHSL(0.01, 1, 0.35 + 0.25 * (Math.sin(t * 4) > 0 ? 1 : 0));
    this.bread.update(dt, 0.6);
    // the camera (unless a beat holds it)
    if (!this.beat) this.#chase(t);
    if (this.h >= TOP && !this.beat) { this.$meter.className = 'meter'; F.prompt(null); return true; }
    return false;
  }

  #chase(t) {
    const F = this.F, z = faceZ(this.h);
    const k = ease(clamp01(t / 3));
    const side = 22 * Math.sin(t * 0.12 + 0.6);
    F.cam([this.x + side, this.h + 4 + 10 * (1 - k), z - 40 - 10 * (1 - k)], [this.x * 0.7, this.h + 3, z], 62);
  }

  // ---------------------------------------------------------------- the three crew beats
  #beatStart(id) {
    const F = this.F, G = this.G;
    this.beat = { id, t: 0, done: false, ok: false };
    this.pull = 0;
    if (id === 'gust') { F.caption('A gust! Rhoda and Rex dive in.', 3); G.audio.play('whoosh', { vol: 1, rate: 0.5 }); G.audio.play('hawk-screech', { vol: 0.9 }); }
    if (id === 'chopper') { F.caption('A news chopper. Spotlight!', 3); this.chopLoop = G.audio.loop('chopper-loop', { vol: 0.8 }); this.chopper.visible = true; }
    if (id === 'rats') { F.caption('The 80th floor: the Grate Rats!', 3); G.audio.play('rat-squeak', { vol: 1 }); G.audio.play('crowd-cheer', { vol: 0.8 }); }
  }

  #beatUpdate(dt) {
    const F = this.F, G = this.G, B = this.beat, inp = G.input;
    const t = (B.t += dt), z = faceZ(this.h);
    const key = B.id === 'gust' ? 'flap' : B.id === 'chopper' ? 'coo' : 'peck';
    const text = B.id === 'gust' ? 'Hold on!' : B.id === 'chopper' ? 'Coo! Call the flock' : 'Wave back!';
    if (!B.ok) {
      F.prompt(key, text);
      // always succeeds: the press, any claw, or a moment's wait
      if (t > 0.6 && (inp.pressed(key) || inp.pressed('flap') || inp.pressed('peck') || inp.pressed('coo') || t > 3.6)) { B.ok = true; B.okT = t; F.prompt(null); }
    }
    const u = B.ok ? t - B.okT : 0;
    if (B.id === 'gust') {
      // the wind shoves; the hawks come in from the sky and take a shoulder each
      const m = F.mecha;
      for (const [i, h] of this.hawks.entries()) {
        h.visible = true;
        const sh = F.wpos(m.J[i ? 'wingR' : 'wingL']);
        const k = ease(clamp01(t / 1.2));
        h.position.set(sh.x + (i ? -1 : 1) * 30 * (1 - k), sh.y + 2 + 25 * (1 - k), sh.z - 10 * (1 - k));
        h.rotation.set(-0.4, Math.PI + (i ? 0.3 : -0.3), 0);
      }
      if (B.ok) {
        if (!B.said) { B.said = true; G.bubbles.add('Rhoda: "Hold STILL, you big lug!"', { at: { x: this.x, y: this.h + 18, z }, ttl: 2.4 }); G.audio.voice('rhoda-call', { vol: 0.9 }); }
        this.h += dt * 7 * Math.sin(clamp01(u / 2) * Math.PI) * 1.4;
        this.x += (0 - this.x) * dt;
      } else this.x += Math.sin(t * 5) * dt * 3;
      F.cam([this.x + 20, this.h + 14, z - 26], [this.x, this.h + 6, z], 58);
      if (B.ok && u > 2.3) { for (const h of this.hawks) h.visible = false; return true; }
      return false;
    }
    if (B.id === 'chopper') {
      const C = this.chopper;
      const k = ease(clamp01(t / 1.6));
      const hx = this.x + 50 - 12 * k, hy = this.h + 8, hz = z - 70 + 30 * k;
      C.position.set(hx + (B.ok ? u * u * 6 : 0), hy + Math.sin(t * 2) * 0.6 + (B.ok ? u * 4 : 0), hz - (B.ok ? u * 10 : 0));
      C.rotation.set(0, Math.atan2(this.x - C.position.x, z - C.position.z), 0);
      C.rotation.z = Math.sin(t * 1.3) * 0.08 + (B.ok ? Math.sin(u * 9) * 0.3 * clamp01(1 - u / 2.5) : 0);
      this.rotor.rotation.y += dt * 40;
      this.beam.material.opacity = B.ok ? Math.max(0, 0.22 - u * 0.1) : 0.22;
      if (B.ok) {
        if (!B.said) { B.said = true; G.audio.play('flock-swarm', { vol: 1 }); G.audio.play('coo-gather', { vol: 1 }); G.bubbles.add('"Coo!"', { at: { x: this.x, y: this.h + 18, z }, ttl: 1.6 }); }
        this.flock.toward = { point: new THREE.Vector3(hx - 10, hy, hz + 6), k: Math.sin(clamp01(u / 3) * Math.PI) * 0.9 };
      }
      F.cam([this.x - 26, this.h + 8, z - 40], [(this.x + hx) / 2, this.h + 6, (z + hz) / 2], 62);
      if (B.ok && u > 3.0) { C.visible = false; this.chopLoop?.stop(); this.chopLoop = null; this.flock.toward = null; return true; }
      return false;
    }
    if (B.id === 'rats') {
      // a row of windows a little above the Mecha, every one with a cheering rat; the banner below them
      const wy = 80 * 3.65 + 1.2;   // the 80th floor
      const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(3.4, 3.4, 3.4), p = new THREE.Vector3();
      let n = 0;
      for (let x = -18; x <= 18 && n < 30; x += 3) {
        const hop = Math.abs(Math.sin(t * 8 + x)) * 0.5;
        mm.compose(p.set(-x, wy + hop, faceZ(wy) - 0.2), q.setFromEuler(e.set(-0.5, Math.PI, 0)), s);
        this.ratMesh.setMatrixAt(n++, mm);
      }
      this.ratMesh.count = n; this.ratMesh.instanceMatrix.needsUpdate = true;
      this.banner.visible = true;
      this.banner.position.set(this.x + 10, wy - 6, faceZ(wy) - 0.4);
      const pa = this.bannerGeo.attributes.position;
      for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 0.5 + t * 5) * 0.3 * (0.5 - pa.getY(i) / 10));
      pa.needsUpdate = true;
      if (B.ok && !B.said) { B.said = true; G.audio.play('crowd-cheer', { vol: 1 }); G.audio.play('rat-squeak', { vol: 1, rate: 1.2 }); G.bubbles.add('Subway Sue: "THAT\'S OUR PIGEON!"', { at: { x: this.x, y: wy + 4, z }, ttl: 2.2 }); }
      F.cam([this.x - 14, wy + 2, z - 24], [this.x + 4, wy - 2, z], 60);
      if (B.ok && u > 2.4) { this.ratMesh.count = 0; this.banner.visible = false; return true; }
      return false;
    }
    return true;
  }

  /** Up on the mast's top deck (the shout starts here). */
  atTop() {
    const m = this.F.mecha;
    this.h = TOP; this.x = 0;
    // Fixes-3 (R9): on the deck's south edge, facing south (the camera, the city), so the spire rises BEHIND it (it ran
    // up through the Mecha)
    m.root.position.set(0, TOP - 4.0, -3.6);
    m.root.rotation.set(0, Math.PI, 0);     // (the Mecha faces +z in its own frame)
    m.pose('stand', 0);
    this.cradleG.visible = false;
  }
  heroLight(on) {
    this.key.intensity = on ? 2.4 : 0;          // Fixes-2: softer (the closer hero shot showed the Mecha washed out)
    this.flood.intensity = on ? 3800 : 0;
    if (this.crown) this.crown.material.color.set(on ? 0xfff0b8 : 0xffe7a8);
  }
  /** Bread from the windows (and one slice), for the shout. */
  rain(t, dt) {
    const n = Math.floor(t * 70);
    if (n !== this.rainN && t < 14) {
      for (let k = this.rainN ?? n - 1; k < n; k++) {
        const w = this.windows[Math.floor(hash(k, 1) * this.windows.length)];
        if (w) this.bread.spawn(w.x + (hash(k, 2) - 0.5) * w.w, w.h * (0.4 + hash(k, 3) * 0.6), w.z - w.d / 2 - 1, (hash(k, 4) - 0.5) * 3, 1 + hash(k, 5) * 2, -2 - hash(k, 6) * 3, 1.8 + hash(k, 7) * 1.8, k);
        // and from the ESB's own windows
        this.bread.spawn((hash(k, 8) - 0.5) * 48, 180 + hash(k, 9) * 160, -22, (hash(k, 10) - 0.5) * 2, 0.5, -1.5 - hash(k, 11) * 2, 1.3 + hash(k, 16) * 0.9, k + 99999);
        // and all round the camera, so it rains past the lens
        // (Fixes-2: smaller, and never right in front of the lens, where they read as orange crates)
        const cp = this.G.dataCam.position, ang = hash(k, 12) * Math.PI * 2, rr = 14 + hash(k, 14) * 40;
        this.bread.spawn(cp.x + Math.sin(ang) * rr, cp.y + 20 + hash(k, 13) * 25, cp.z + Math.cos(ang) * rr, 0, -2, 0, 0.7 + hash(k, 15) * 0.7, k + 199999);
      }
      this.rainN = n;
    }
    this.bread.update(dt, 0.6);
  }

  end() { this.chopLoop?.stop(); this.chopLoop = null; this.F.prompt(null); this.$meter && (this.$meter.className = 'meter'); }
  cleanup() {
    const F = this.F;
    this.end();
    this.G.altView = null; F.inAlt = false;
    this.bread.clear(); this.flock.toward = null; this.slice.visible = false;
    for (const c of CRADLES) c.passed = false;
    this.cradleG.visible = true;
  }
  debug() { return { h: +(this.h ?? 0).toFixed(1), x: +(this.x ?? 0).toFixed(1), beat: this.beat?.id || null, beatsDone: this.beatsDone, floor: Math.round((this.h || 0) / 3.65) }; }
}
