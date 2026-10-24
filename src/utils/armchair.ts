// @ts-nocheck
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const makeLoader = () => { const l = new GLTFLoader(); try { l.setMeshoptDecoder(MeshoptDecoder) } catch {} return l }

export const ARMCHAIR_URL = '/models/armchair.glb'
const TARGET_SIZE = 1.234            // dimensione massima del modello in scena (altezza della poltrona di default)

/* ─────────────── Testi di default (modificabili da admin) ─────────────── */
export interface ArmchairChapter { k: string; t: string; d: string }
export const DEFAULT_LABEL = { it: 'Il pezzo in vetrina', en: 'The showpiece' }
export const DEFAULT_CHAPTERS: { it: ArmchairChapter[]; en: ArmchairChapter[] } = {
  it: [
    { k: 'Pezzo firma', t: 'Una poltrona che entra in scena', d: 'Linee edoardiane, proporzioni importanti, legno lavorato a mano: un arredo che da solo cambia il carattere di una stanza.' },
    { k: 'Intagli', t: 'Il dettaglio fa la differenza', d: 'Cimasa scolpita, pomelli torniti e profili traforati. È nei dettagli che il vintage di qualità si riconosce.' },
    { k: 'Tappezzeria', t: 'Tessuto con una storia', d: 'Sedile e schienale rivestiti in un ricco motivo decorativo, per un comfort che non rinuncia alla scena.' },
    { k: 'Torniture e ottone', t: 'Costruita per durare', d: 'Gambe tornite, traverse robuste e finiture dorate: struttura solida pensata per attraversare i decenni.' },
  ],
  en: [
    { k: 'Signature piece', t: 'An armchair that steals the scene', d: 'Edwardian lines, generous proportions, hand-worked wood: one piece that changes the character of a whole room.' },
    { k: 'Carvings', t: 'Details make the difference', d: 'Carved crest, turned finials and pierced profiles. Quality vintage is recognised in the details.' },
    { k: 'Upholstery', t: 'Fabric with a story', d: 'Seat and back covered in a rich decorative pattern: comfort that does not give up on drama.' },
    { k: 'Turnings & brass', t: 'Built to last', d: 'Turned legs, sturdy stretchers and gilded finishes: a solid frame made to cross the decades.' },
  ],
}

/** Unisce i testi personalizzati dall'admin con quelli di default (campo vuoto = default). */
export function resolveChapters(settings: any, L: 'it' | 'en'): ArmchairChapter[] {
  const custom = settings?.armchairChapters?.[L] || []
  return DEFAULT_CHAPTERS[L].map((d, i) => {
    const c = custom[i] || {}
    return { k: c.k?.trim() || d.k, t: c.t?.trim() || d.t, d: c.d?.trim() || d.d }
  })
}
export function resolveLabel(settings: any, L: 'it' | 'en'): string {
  return settings?.armchairLabels?.[L]?.trim() || DEFAULT_LABEL[L]
}

/* ─────────────── File 3D caricato dall'admin: IndexedDB (troppo grande per localStorage) ─────────────── */
const DB_NAME = 'e46-assets', STORE = 'files', KEY = 'armchair-model'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
export async function saveLocalModel(file: Blob): Promise<void> {
  const db = await openDB()
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(file, KEY)
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error)
  })
  db.close()
}
export async function getLocalModel(): Promise<Blob | null> {
  try {
    const db = await openDB()
    const blob = await new Promise<Blob | null>((res, rej) => {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
      r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error)
    })
    db.close()
    return blob
  } catch { return null }
}
export async function clearLocalModel(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>(res => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(KEY)
      tx.oncomplete = () => res(); tx.onerror = () => res()
    })
    db.close()
  } catch {}
}

/* ─────────────── Sorgente del modello ─────────────── */
export interface ArmchairSource { url?: string; local?: boolean; rev?: number }
export function armchairSource(settings: any): ArmchairSource {
  return { url: settings?.armchairModelUrl || '', local: !!settings?.armchairLocalName, rev: settings?.armchairRev || 0 }
}
export const sourceKey = (s: ArmchairSource = {}) => `${s.local ? 'local' : 'url'}|${s.url || ''}|${s.rev || 0}`

let cache: { key: string; promise: Promise<THREE.Group>; objectUrl?: string } | null = null

function normalize(scene: THREE.Object3D): THREE.Group {
  scene.traverse((o: any) => {
    if (!o.isMesh) return
    o.frustumCulled = false
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    mats.forEach((m: any) => {
      if (!m) return
      ;['map', 'normalMap'].forEach(k => { if (m[k]) { m[k].anisotropy = 8; m[k].needsUpdate = true } })
    })
  })
  // Qualsiasi modello viene portato alla stessa scala, centrato, con la base appoggiata a terra
  const box = new THREE.Box3().setFromObject(scene)
  const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3())
  const max = Math.max(size.x, size.y, size.z) || 1
  scene.position.set(-c.x, -box.min.y, -c.z)
  const wrap = new THREE.Group()
  wrap.add(scene)
  wrap.scale.setScalar(TARGET_SIZE / max)
  return wrap
}

function loadUrl(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    makeLoader().load(url, gltf => resolve(normalize(gltf.scene)), undefined, reject)
  })
}

/**
 * Carica (una sola volta per sorgente) la poltrona. Chiamato dal preloader, così quando la sezione
 * 3D monta il modello è già scaricato e parsato.
 */
export function loadArmchair(src: ArmchairSource = {}): Promise<THREE.Group> {
  const key = sourceKey(src)
  if (cache && cache.key === key) return cache.promise
  if (cache?.objectUrl) URL.revokeObjectURL(cache.objectUrl)
  const entry: typeof cache = { key, promise: null as any }
  entry.promise = (async () => {
    let url = src.url || ARMCHAIR_URL
    if (src.local) {
      const blob = await getLocalModel()
      if (blob) { entry.objectUrl = URL.createObjectURL(blob); url = entry.objectUrl }
    }
    try { return await loadUrl(url) }
    catch (e) {
      // Se il file personalizzato è rotto torniamo al modello di default, mai una sezione vuota
      if (url !== ARMCHAIR_URL) return await loadUrl(ARMCHAIR_URL)
      throw e
    }
  })()
  entry.promise.catch(() => { if (cache === entry) cache = null })
  cache = entry
  return entry.promise
}

/** Risolve quando la sezione 3D ha compilato gli shader e disegnato il primo frame (o ha rinunciato). */
export function waitArmchairReady(timeout = 45000): Promise<void> {
  return new Promise(resolve => {
    if ((window as any).__e46ArmchairReady) return resolve()
    const t = setTimeout(done, timeout)
    function done() { clearTimeout(t); window.removeEventListener('armchair-ready', done); resolve() }
    window.addEventListener('armchair-ready', done)
  })
}
export function signalArmchairReady() {
  ;(window as any).__e46ArmchairReady = true
  window.dispatchEvent(new CustomEvent('armchair-ready'))
}

/**
 * Prova a leggere un .glb PRIMA di salvarlo (usato dall'admin): evita di sostituire il modello con un file
 * che poi non si aprirebbe. Restituisce un messaggio chiaro in italiano in caso di problema.
 */
export async function validateGlb(file: Blob): Promise<{ ok: true; size: [number, number, number]; meshes: number } | { ok: false; error: string }> {
  try {
    const buf = await file.arrayBuffer()
    const gltf: any = await new Promise((res, rej) => makeLoader().parse(buf, '', res, rej))
    let meshes = 0
    gltf.scene.traverse((o: any) => { if (o.isMesh) meshes++ })
    if (!meshes) return { ok: false, error: 'Il file non contiene nessuna geometria 3D visibile.' }
    const box = new THREE.Box3().setFromObject(gltf.scene)
    const sz = box.getSize(new THREE.Vector3())
    if (!isFinite(sz.x + sz.y + sz.z) || sz.x + sz.y + sz.z === 0) return { ok: false, error: 'Il modello ha dimensioni nulle o non valide.' }
    // libera la memoria della prova
    gltf.scene.traverse((o: any) => { o.geometry?.dispose?.(); const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach((x: any) => { if (!x) return; Object.values(x).forEach((v: any) => v?.isTexture && v.dispose()); x.dispose?.() }) })
    return { ok: true, size: [sz.x, sz.y, sz.z], meshes }
  } catch (e: any) {
    const msg = String(e?.message || e || '')
    if (/draco/i.test(msg)) return { ok: false, error: 'Il modello usa la compressione Draco, non supportata. Riesportalo senza Draco (oppure con Meshopt) e riprova.' }
    if (/KTX2|basis/i.test(msg)) return { ok: false, error: 'Il modello usa texture KTX2/Basis, non supportate. Riesportalo con texture PNG/JPG.' }
    return { ok: false, error: 'Impossibile leggere il modello: ' + (msg.slice(0, 120) || 'file danneggiato o non valido') + '.' }
  }
}
