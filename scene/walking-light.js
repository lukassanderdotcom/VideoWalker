// Walking light: a three.js scene drawn inside a MapLibre map (custom layer).
//
// The visitor is a point light walking through 3D buildings. Light and shadows
// are computed on the true 3D model; only the final image is sheared: every
// vertex is pushed away from the walking light in proportion to its height and
// then flattened onto the ground, so the street level stays exactly on the map
// while the facades facing the light open up to the viewer.
//
// Used by index.html (GPS drives the light) and editor.html (the mouse does).
// Settings come from the "scene" section of videos.json, the fixed lights from
// the video locations. See README → "Walking light".

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

export const DEFAULTS = {
  buildings: 'scene/buildings.geojson',
  bridge: 'scene/bridge.geojson',
  regionMask: 'scene/region_mask.png',
  walkMask: 'scene/walk_mask.png',
  deckHeight: 4.9,
  shear: { mode: 'perspective', cameraHeight: 115, lean: 0.29, strength: 1.02 },
  walker: { height: 2.4, intensity: 30903, color: '#fff1dc' },
  locationLights: { enabled: true, color: '#8a3cff', intensity: 7943, height: 3, reach: 200 },
  falloff: 1.85,
  exposure: 0.9,
  ambient: 0,
  shadows: true,
  // Soft edge: between these region-mask values the scene grows from a flat map
  // (no darkness, flat buildings, no lights, the pin shows) to the full scene
  edge: { start: 0.05, full: 0.6 },
};

// config.scene merged over the defaults (one level deep for the grouped settings)
export function sceneSettings(config) {
  const own = config?.scene || {};
  const merged = { ...DEFAULTS, ...own };
  for (const key of ['shear', 'walker', 'locationLights', 'edge']) {
    merged[key] = { ...DEFAULTS[key], ...(own[key] || {}) };
  }
  return merged;
}

// The scene needs a "scene" section and the drawn overlay (its corners place the ground)
export function hasScene(config) {
  const o = config?.overlay;
  return !!(config?.scene && o?.image && o.topLeft && o.bottomRight);
}

const isNumber = value => typeof value === 'number' && Number.isFinite(value);
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / Math.max(b - a, 1e-6)));
  return t * t * (3 - 2 * t);
};

/**
 * Adds the scene to a MapLibre map. Resolves when everything is loaded.
 * options.resolve(path) → URL (or Promise of one) for project files; default: the path itself.
 * options.beforeId: MapLibre layer to draw the scene under.
 * options.initialPresence: 0 = start as a flat map until setWalker is called (app), 1 = full scene (editor).
 */
export async function createWalkingLight(map, config, { resolve = path => path, beforeId, initialPresence = 0 } = {}) {
  let settings = sceneSettings(config);
  let overlay = config.overlay;

  // ---------- local metric frame: x east, y north, z up (metres) ----------
  const centerLng = (overlay.topLeft.longitude + overlay.bottomRight.longitude) / 2;
  const centerLat = (overlay.topLeft.latitude + overlay.bottomRight.latitude) / 2;
  const origin = maplibregl.MercatorCoordinate.fromLngLat([centerLng, centerLat], 0);
  const S = origin.meterInMercatorCoordinateUnits();
  const toLocal = (lng, lat) => {
    const m = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
    return new THREE.Vector2((m.x - origin.x) / S, -(m.y - origin.y) / S);
  };
  const corners = () => ({
    tl: toLocal(overlay.topLeft.longitude, overlay.topLeft.latitude),
    br: toLocal(overlay.bottomRight.longitude, overlay.bottomRight.latitude),
  });
  let { tl, br } = corners();

  // ---------- shear ----------
  const shear = {
    uLight: { value: new THREE.Vector3() },
    uH: { value: 115 }, uK: { value: 0.3 }, uS: { value: 1 }, uMode: { value: 0 },
  };
  function patchShear(material) {
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, shear);
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', `
          uniform vec3 uLight; uniform float uH; uniform float uK; uniform float uS; uniform float uMode;
          void main() {`)
        .replace('#include <project_vertex>', `
          vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );   // world metres (view = identity)
          {
            vec3 w = mvPosition.xyz;
            float h = max(w.z, 0.0);
            vec2 d = w.xy - uLight.xy;
            vec2 off;
            if (uMode < 0.5) {
              off = d * (h / max(uH - h, 1.0));          // virtual camera at height uH above the light
            } else {
              float len = length(d);
              off = len > 1e-3 ? d / len * h * uK : vec2(0.0);   // uniform lean
            }
            vec4 clip = projectionMatrix * vec4(w.xy + off * uS, 0.0, 1.0);
            clip.z = (0.5 - h * 0.002) * clip.w;        // higher = closer to the viewer
            gl_Position = clip;
          }`);
    };
    material.customProgramCacheKey = () => 'shear';
    return material;
  }
  // keep MapLibre's canvas opaque when blending transparent pixels
  function mapBlending(m) {
    m.blending = THREE.CustomBlending;
    m.blendSrc = THREE.SrcAlphaFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
    m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    return m;
  }

  // ---------- scene ----------
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const ambient = new THREE.AmbientLight(0xffffff, 0);
  scene.add(ambient);
  const walker = new THREE.PointLight(0xffffff, 0, 0, 2);
  walker.castShadow = true;
  walker.shadow.mapSize.set(1024, 1024);
  walker.shadow.camera.near = 0.2;
  walker.shadow.camera.far = 600;
  walker.shadow.bias = -0.002;
  walker.shadow.normalBias = 0.05;
  scene.add(walker);

  // Building materials fade with presence (transparent only while fading, see setPresence)
  const wallMat = mapBlending(patchShear(new THREE.MeshLambertMaterial({ color: 0x4a4a4a, side: THREE.DoubleSide })));
  const roofMat = mapBlending(patchShear(new THREE.MeshLambertMaterial({ color: 0x383838, side: THREE.DoubleSide })));
  const deckMat = mapBlending(patchShear(new THREE.MeshLambertMaterial({ color: 0x8a86a0, side: THREE.DoubleSide })));
  const solidMats = [wallMat, roofMat, deckMat];

  const loadImage = async path => {
    const url = await resolve(path);
    if (!url) throw new Error(`${path} not found`);
    return new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => rej(new Error(`${path} could not be loaded`));
      img.src = url;
    });
  };
  const loadJson = async path => {
    const url = await resolve(path);
    if (!url) throw new Error(`${path} not found`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  };
  const pixels = img => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
  };

  const [buildings, bridge, groundImg, regionImg, walkImg] = await Promise.all([
    loadJson(settings.buildings),
    settings.bridge ? loadJson(settings.bridge).catch(() => null) : null,
    loadImage(overlay.image), loadImage(settings.regionMask), loadImage(settings.walkMask),
  ]);

  function shapePoints(ring) {
    const pts = ring.map(([lng, lat]) => toLocal(lng, lat));
    if (pts.length > 1 && pts[0].equals(pts[pts.length - 1])) pts.pop();
    return pts;
  }
  function extrude(ring, zMin, zMax, materials) {
    const pts = shapePoints(ring);
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: zMax - zMin, bevelEnabled: false });
    geo.translate(0, 0, zMin);
    const mesh = new THREE.Mesh(geo, materials);   // group 0 = roof/floor, group 1 = walls
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, pts };
  }
  const polygons = f => f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  const buildingMeshes = [];
  for (const f of buildings.features || []) {
    for (const poly of polygons(f)) {
      buildingMeshes.push(extrude(poly[0], f.properties?.min_height || 0, f.properties?.height || 20, [roofMat, wallMat]).mesh);
    }
  }

  // Bridge deck: a thin slab; on it the floor is the deck height
  let deck = null;
  if (bridge) {
    const feature = bridge.type === 'FeatureCollection' ? bridge.features[0] : bridge;
    deck = extrude(feature.geometry.coordinates[0], 0, 1, [deckMat, deckMat]);
  }
  const pointInPolygon = (p, pts) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  };
  const onDeck = p => !!deck && pointInPolygon(p, deck.pts);
  const floorAt = p => (onDeck(p) ? settings.deckHeight : 0);

  // Ground: the drawn overlay, lit by the lights, faded out by the region mask
  const groundTex = new THREE.Texture(groundImg);
  groundTex.colorSpace = THREE.SRGBColorSpace;
  groundTex.anisotropy = 8;
  groundTex.needsUpdate = true;
  const maskTex = new THREE.Texture(regionImg);
  maskTex.needsUpdate = true;
  const groundMat = mapBlending(patchShear(new THREE.MeshLambertMaterial({
    map: groundTex, alphaMap: maskTex, transparent: true, depthWrite: false,
  })));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), groundMat);
  ground.receiveShadow = true;
  ground.frustumCulled = false;
  ground.renderOrder = -1;
  scene.add(ground);
  function placeGround() {
    ({ tl, br } = corners());
    ground.scale.set(br.x - tl.x, tl.y - br.y, 1);
    ground.position.set((tl.x + br.x) / 2, (tl.y + br.y) / 2, 0);
  }
  placeGround();

  // Marker dot under the walking light
  const dot = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6e0, depthTest: false, depthWrite: false, transparent: true, toneMapped: false }));
  dot.renderOrder = 10;
  dot.frustumCulled = false;
  scene.add(dot);

  // Masks sampled on the CPU: where the light may walk, and where the scene is shown
  const walk = pixels(walkImg);
  const region = pixels(regionImg);
  const sample = (mask, p) => {
    const u = Math.floor((p.x - tl.x) / (br.x - tl.x) * mask.w);
    const v = Math.floor((tl.y - p.y) / (tl.y - br.y) * mask.h);
    if (u < 0 || v < 0 || u >= mask.w || v >= mask.h) return 0;
    return mask.data[(v * mask.w + u) * 4 + 1] / 255;   // green channel
  };
  const isWalkable = p => sample(walk, p) > 0.5 || onDeck(p);
  function snapToWalkable(p, radius = 12) {
    if (isWalkable(p)) return p;
    const step = (br.x - tl.x) / walk.w;
    const rings = Math.ceil(radius / step);
    for (let r = 1; r <= rings; r++) {
      let best = null, bd = Infinity;
      for (let a = 0; a < 32; a++) {
        const angle = a / 32 * Math.PI * 2;
        const q = new THREE.Vector2(p.x + Math.cos(angle) * r * step, p.y + Math.sin(angle) * r * step);
        if (isWalkable(q)) { const d = q.distanceToSquared(p); if (d < bd) { bd = d; best = q; } }
      }
      if (best) return best;
    }
    return null;
  }

  // ---------- video location lights ----------
  const locationLights = [];
  function syncLocationLights() {
    const ll = settings.locationLights;
    const locations = (config.locations || []).filter(l => isNumber(l.latitude) && isNumber(l.longitude));
    while (locationLights.length < locations.length) {
      const l = new THREE.PointLight(0xffffff, 1, 0, 2);
      l.shadow.mapSize.set(512, 512);
      l.shadow.camera.near = 0.2; l.shadow.camera.far = 400;
      l.shadow.bias = -0.002; l.shadow.normalBias = 0.05;
      l.shadow.autoUpdate = false;   // static: shadow map only re-rendered when something changes
      scene.add(l);
      locationLights.push(l);
    }
    while (locationLights.length > locations.length) {
      const l = locationLights.pop();
      scene.remove(l);
      l.dispose();
    }
    const color = new THREE.Color(ll.color);
    locations.forEach((loc, i) => {
      const l = locationLights[i];
      const p = toLocal(loc.longitude, loc.latitude);
      l.userData = {
        floor: floorAt(p),
        height: isNumber(loc.lightHeight) ? loc.lightHeight : ll.height,
        intensity: isNumber(loc.lightIntensity) ? loc.lightIntensity : ll.intensity,
      };
      l.position.set(p.x, p.y, 0);
      l.color.copy(color);
      l.decay = settings.falloff;
      l.distance = ll.reach;
      l.visible = ll.enabled !== false;
      l.castShadow = settings.shadows !== false;
    });
  }

  // ---------- presence: how far the visitor is inside the soft edge ----------
  // 0 = flat map (no darkness, flat buildings, no lights), 1 = full scene
  let presence = initialPresence;
  let presenceTarget = initialPresence;
  let appliedPresence = -1;
  function applyPresence() {
    const p = presence;
    const changed = Math.abs(p - appliedPresence) > 1e-4;
    appliedPresence = p;
    const height = Math.max(p, 0.001);
    for (const mesh of buildingMeshes) mesh.scale.z = height;
    if (deck) { deck.mesh.scale.z = 0.8 * height; deck.mesh.position.z = (settings.deckHeight - 0.8) * p; }
    const fading = p < 0.995;   // transparent only while fading: opaque buildings sort correctly
    for (const m of solidMats) {
      if (m.transparent !== fading) { m.transparent = fading; m.needsUpdate = true; }
      m.opacity = p;
    }
    groundMat.opacity = p;
    dot.material.opacity = p;
    for (const l of locationLights) {
      l.position.z = l.userData.floor * p + l.userData.height;
      l.intensity = l.userData.intensity * p;
      if (changed) l.shadow.needsUpdate = true;   // the buildings grew or shrank
    }
  }

  // ---------- walking light motion ----------
  const target = new THREE.Vector3();
  const pos = new THREE.Vector3();
  let walkerOn = false;
  let placed = false;

  function applySettings() {
    const sh = settings.shear;
    shear.uMode.value = sh.mode === 'uniform' ? 1 : 0;
    shear.uH.value = sh.cameraHeight; shear.uK.value = sh.lean; shear.uS.value = sh.strength;
    walker.color.set(settings.walker.color);
    walker.decay = settings.falloff;
    walker.castShadow = settings.shadows !== false;
    ambient.intensity = settings.ambient;
    target.z = onDeck(new THREE.Vector2(target.x, target.y)) ? settings.deckHeight : 0;
    syncLocationLights();
    appliedPresence = -1;   // re-apply heights and intensities, re-render the static shadows
    applyPresence();
  }
  applySettings();

  // ---------- MapLibre custom layer ----------
  let renderer = null;
  const worldToMerc = new THREE.Matrix4().makeTranslation(origin.x, origin.y, 0).scale(new THREE.Vector3(S, -S, S));
  let last = performance.now();
  const layerId = 'walking-light';
  const layer = {
    id: layerId, type: 'custom', renderingMode: '3d',
    onAdd(m, gl) {
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    },
    render(gl, args) {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const kxy = 1 - Math.exp(-dt * 6), kz = 1 - Math.exp(-dt * 3), kp = 1 - Math.exp(-dt * 2);
      pos.x += (target.x - pos.x) * kxy; pos.y += (target.y - pos.y) * kxy; pos.z += (target.z - pos.z) * kz;
      presence += (presenceTarget - presence) * kp;
      if (Math.abs(presenceTarget - presence) < 0.002) presence = presenceTarget;
      const moving = pos.distanceTo(target) > 0.02 || presence !== presenceTarget;
      if (moving) map.triggerRepaint();
      applyPresence();
      if (presence < 0.002) return;   // flat map: the plain drawing shows, nothing to draw

      walker.position.set(pos.x, pos.y, pos.z * presence + settings.walker.height);
      walker.intensity = walkerOn ? settings.walker.intensity * presence : 0;
      dot.visible = walkerOn;
      dot.position.set(pos.x, pos.y, 0);
      shear.uLight.value.copy(walker.position);
      renderer.toneMappingExposure = settings.exposure;

      const matrix = args.defaultProjectionData?.mainMatrix ?? args.modelViewProjectionMatrix ?? args;
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(worldToMerc);
      renderer.resetState();
      renderer.setViewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.clearDepth();
      renderer.render(scene, camera);
    },
  };
  map.addLayer(layer, beforeId && map.getLayer(beforeId) ? beforeId : undefined);

  return {
    /**
     * Move the walking light to the visitor's position. snap keeps it on the walkable area (within ~12 m).
     * Returns { coverage, presence, pinOpacity, inside, onBridge }: coverage is the region mask at the
     * position (0–1), presence how much of the scene shows there, pinOpacity the matching position marker.
     */
    setWalker(lng, lat, { snap = true, jump = false } = {}) {
      const raw = toLocal(lng, lat);
      const coverage = sample(region, raw);
      presenceTarget = smoothstep(settings.edge.start, settings.edge.full, coverage);
      const result = onBridge => ({ coverage, presence: presenceTarget, pinOpacity: 1 - presenceTarget, inside: coverage > 0.5, onBridge });
      let p = raw;
      if (snap) {
        const snapped = snapToWalkable(raw);
        if (snapped) {
          p = snapped;
        } else if (placed && walkerOn && presenceTarget > 0.02) {
          map.triggerRepaint();
          return result(false);   // deep inside a building: the light stays where it was
        }
      }
      target.set(p.x, p.y, floorAt(p));
      if (jump || !placed || presence < 0.02) pos.copy(target);   // while invisible there is nothing to glide
      placed = true;
      walkerOn = true;
      map.triggerRepaint();
      return result(onDeck(p));
    },
    /** No visitor: show the whole scene without the walking light (editor preview), or the flat map (0). */
    showWithoutWalker(value = 1) {
      walkerOn = false;
      presenceTarget = value;
      map.triggerRepaint();
    },
    /** Inside the modelled area (where the region mask is mostly white)? */
    contains(lng, lat) { return sample(region, toLocal(lng, lat)) > 0.5; },
    /** Re-read settings and video locations from the (edited) config. Asset paths need a new scene. */
    update(newConfig) {
      config = newConfig;
      settings = sceneSettings(config);
      if (config.overlay?.topLeft && config.overlay?.bottomRight) { overlay = config.overlay; placeGround(); }
      applySettings();
      map.triggerRepaint();
    },
    get settings() { return settings; },
    /** Current (eased) presence, 0 = flat map, 1 = full scene */
    get presence() { return presence; },
    remove() {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      scene.traverse(o => { o.geometry?.dispose(); });
      groundTex.dispose(); maskTex.dispose();
      locationLights.forEach(l => l.dispose()); walker.dispose();
    },
  };
}
