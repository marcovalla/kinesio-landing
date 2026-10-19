// Builds assets/columna.glb (spine model of the "Postura" section) from BodyParts3D OBJ files.
//
// Source: BodyParts3D, © The Database Center for Life Science, CC BY 4.0
// https://dbarchive.biosciencedbc.jp/en/bodyparts3d/ — package partof_BP3D_4.0_obj_99.zip, files kept in _raw/bp3d/
//
// Every vertebra is "straightened": moved into its own frame (origin at the bottom of the vertebral body, +y along the
// spine, +z anterior, +x patient's left) so the page can apply its own curves. Discs and ribs go in the frame of the
// vertebra below / they belong to; the sacrum and the L5-S1 disc in L5's frame (they hang from the root); the skull keeps
// the upright scan orientation, relative to the top of the atlas.
//
//   cd tools && npm install && node columna-bp3d.mjs
import fs from 'fs';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const RAW = new URL('../_raw/bp3d/', import.meta.url).pathname;
const OUT = new URL('../assets/columna.glb', import.meta.url).pathname;
const MM = 75; // millimetres per model unit (the page reads it from the scene extras)

const SPINE = [['L5', 3168], ['L4', 3165], ['L3', 3162], ['L2', 3159], ['L1', 3157],
  ['T12', 3156], ['T11', 3155], ['T10', 3154], ['T9', 3175], ['T8', 3174], ['T7', 3173], ['T6', 3171], ['T5', 3169], ['T4', 3166], ['T3', 3163], ['T2', 3160], ['T1', 3158],
  ['C7', 3172], ['C6', 3170], ['C5', 3167], ['C4', 3164], ['C3', 3161], ['C2', 3177], ['C1', 3176]];
const DISCS = [3203, 3204, 3205, 3206, 3207, 3208, 3209, 3210, 3211, 3212, 3213, 3214, 3215, 3216, 3217, 3218, 3219, 3220, 3221, 3222, 3223, 3224];
// [left, right] rib n for T(n)
const RIBS = [[3228, 3334], [3229, 3336], [3230, 3338], [3231, 3340], [3232, 3342], [3233, 3344], [3234, 3346], [3235, 3347], [3236, 3348], [3225, 3330], [3226, 3331], [3227, 3332]];
// Outer skull bones (eyes, ethmoid, vomer, conchae and palatines are hidden inside and left out)
const SKULL = [3200, 3274, 3380, 3309, 3281, 3386, 3394, 3269, 3375, 3287, 3392, 3272, 3378, 3265, 3371, 3289];
const SACRUM = 3393;

const V = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; },
};
const mean = (pts) => pts.reduce((a, p) => V.add(a, p), [0, 0, 0]).map((s) => s / pts.length);

// BodyParts3D: mm, x = left, y = posterior, z = up  ->  x = left, y = up, z = anterior
function readObj(id) {
  const pos = [], idx = [];
  for (const l of fs.readFileSync(`${RAW}FJ${id}.obj`, 'utf8').split('\n')) {
    if (l.startsWith('v ')) { const [x, y, z] = l.split(/\s+/).slice(1, 4).map(Number); pos.push([x, z, -y]); }
    else if (l.startsWith('f ')) { const f = l.trim().split(/\s+/).slice(1).map((t) => parseInt(t) - 1); for (let i = 1; i + 1 < f.length; i++) idx.push(f[0], f[i], f[i + 1]); }
  }
  return { pos, idx };
}
const merge = (meshes) => {
  const pos = [], idx = [];
  meshes.forEach((m) => { const o = pos.length; pos.push(...m.pos); m.idx.forEach((i) => idx.push(i + o)); });
  return { pos, idx };
};
// Keep `ratio` of the triangles (within `error`, relative to the mesh size), then drop the vertices no longer used
function simplify(m, ratio, error = 0.01) {
  const p = new Float32Array(m.pos.flat()), target = Math.floor((m.idx.length * ratio) / 3) * 3;
  const [ix] = MeshoptSimplifier.simplify(new Uint32Array(m.idx), p, 3, target, error);
  const remap = new Map(), pos = [];
  const idx = Array.from(ix, (i) => { if (!remap.has(i)) { remap.set(i, pos.length); pos.push(m.pos[i]); } return remap.get(i); });
  return { pos, idx };
}

// ---- Frames ----
const verts = SPINE.map(([name, id]) => ({ name, ...readObj(id) }));
verts.forEach((v) => {
  // Vertebral body: the anterior third of the bone, near the midline (the atlas has none; this picks its anterior arch)
  const zs = v.pos.map((p) => p[2]), z1 = Math.max(...zs), z0 = Math.min(...zs);
  v.bodyPts = v.pos.filter((p) => p[2] > z1 - (z1 - z0) * 0.33 && Math.abs(p[0]) < 18);
  v.c = mean(v.bodyPts);
});
verts.forEach((v, i) => {
  // Spine axis from the neighbours' body centres
  const a = verts[Math.max(0, i - 1)].c, b = verts[Math.min(verts.length - 1, i + 1)].c;
  const up = V.norm(V.sub(b, a)), left = V.norm(V.sub([1, 0, 0], V.mul(up, up[0]))), ant = V.cross(left, up);
  const hs = v.bodyPts.map((p) => V.dot(V.sub(p, v.c), up));
  v.frame = { up, left, ant, origin: V.add(v.c, V.mul(up, Math.min(...hs) * 0.9)) };
});
const toLocal = (v, m) => ({ ...m, pos: m.pos.map((p) => { const d = V.sub(p, v.frame.origin); return [V.dot(d, v.frame.left) / MM, V.dot(d, v.frame.up) / MM, V.dot(d, v.frame.ant) / MM]; }) });

// ---- Document ----
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const doc = new Document(), buf = doc.createBuffer(), scene = doc.createScene();
const stats = [];
function addNode(name, m, extras) {
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(m.pos.flat())).setBuffer(buf))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(m.idx)).setBuffer(buf));
  const node = doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim));
  if (extras) node.setExtras(extras);
  scene.addChild(node);
  stats.push({ name, tris: m.idx.length / 3 });
}

verts.forEach((v, i) => {
  const next = verts[i + 1];
  // len: distance to the next vertebra's origin, along this one's axis once straightened
  addNode(v.name, toLocal(v, simplify(v, 0.5)), { len: next ? +(Math.hypot(...V.sub(next.frame.origin, v.frame.origin)) / MM).toFixed(4) : 0 });
});
addNode('sacro', toLocal(verts[0], simplify(readObj(SACRUM), 0.5)));

// Discs: each goes with the vertebra right below it
const below = (c) => { let k = -1; verts.forEach((v, i) => { if (v.c[1] < c[1]) k = i; }); return k; };
const discFor = new Map();
DISCS.forEach((id) => { const m = simplify(readObj(id), 0.12, 0.05); discFor.set(below(mean(m.pos)), m); });
for (let k = -1; k < verts.length - 2; k++) { // L5-S1 (k = -1) up to C2-C3; there is no disc between atlas and axis
  const m = discFor.get(k);
  // BodyParts3D has no C2-C3 disc: reuse the one below, at the same place in this vertebra's frame
  const local = m ? toLocal(verts[Math.max(0, k)], m) : toLocal(verts[k - 1], discFor.get(k - 1));
  addNode(k < 0 ? 'disco-sacro' : `disco-${verts[k].name}`, local);
}

// Ribs, merged per thoracic vertebra and simplified (they are drawn translucent)
RIBS.forEach((pair, n) => {
  const v = verts.find((q) => q.name === `T${n + 1}`);
  addNode(`costillas-${v.name}`, toLocal(v, simplify(merge(pair.map(readObj)), 0.08)));
});

// Skull, relative to the top of the atlas, upright scan orientation
{
  const c1 = verts[verts.length - 1];
  const top = Math.max(...c1.pos.map((p) => V.dot(V.sub(p, c1.frame.origin), c1.frame.up)));
  const anchor = V.add(c1.frame.origin, V.mul(c1.frame.up, top));
  const skull = simplify(merge(SKULL.map(readObj)), 0.3);
  skull.pos = skull.pos.map((p) => V.mul(V.sub(p, anchor), 1 / MM));
  addNode('craneo', skull, { top: +(top / MM).toFixed(4) });
}

scene.setExtras({ mm: MM });
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
// No normals: the page computes smooth ones on load, which keeps the file small
await doc.transform(weld(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
fs.writeFileSync(OUT, await io.writeBinary(doc));
const tris = stats.reduce((a, s) => a + s.tris, 0);
const groups = {}; stats.forEach((s) => { const g = s.name.split("-")[0].replace(/^[CTL]\d+$/, "vertebras"); groups[g] = (groups[g] || 0) + s.tris; }); console.log(groups);
console.log(`${stats.length} meshes, ${tris} triangles, ${fs.statSync(OUT).size} bytes -> ${OUT}`);
