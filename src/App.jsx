import React, { useEffect, useRef, useState } from "react";

const TILE = 32;              // tamaño base del mundo en pixels
const WORLD_W = 36;           // ancho en tiles
const WORLD_H = 24;           // alto en tiles
const VIEW_W = 800;           // viewport (canvas) ancho
const VIEW_H = 600;           // viewport (canvas) alto
const PLAYER_SPEED = 2.8;     // velocidad
const PLAYER_R = 10;          // radio colisión
const INTERACT_DIST = 36;     // distancia para interactuar

function makeMap() {
  const m = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(0));
  for (let y = 0; y < WORLD_H; y++) { m[y][0] = 1; m[y][WORLD_W - 1] = 1; }
  for (let x = 0; x < WORLD_W; x++) { m[0][x] = 1; m[WORLD_H - 1][x] = 1; }

  for (let x = 10; x < 26; x++) { m[7][x] = 1; m[16][x] = 1; }
  for (let y = 7; y < 17; y++) { m[y][10] = 1; m[y][25] = 1; }
  m[7][18] = 0; m[16][18] = 0; m[11][10] = 0; m[11][25] = 0;

  for (let x = 4; x < 32; x++) m[5][x] = 1;
  for (let y = 2; y < 5; y++) { m[y][12] = 1; m[y][22] = 1; }
  m[5][8] = 0; m[5][18] = 0; m[5][28] = 0;

  for (let x = 4; x < 32; x++) m[18][x] = 1;
  for (let y = 19; y < 22; y++) { m[y][16] = 1; }
  m[18][10] = 0; m[18][22] = 0;

  for (let y = 2; y < 22; y++) { m[y][4] = 1; m[y][31] = 1; }
  m[12][4] = 0; m[12][31] = 0;

  return m;
}

const MAP = makeMap();

// === Obras de arte ===
// Puedes reemplazar src y thumb con tus propios archivos en public/media/
const ARTWORKS = [
  { id: "obra-1", title: "Sala Norte A — Abstracción", author: "Colectivo A", year: "2024", description: "Obras geométricas frías.", type: 'image', src: '/media/abstraccion.jpg', thumb: '/media/abstraccion_thumb.jpg', x: TILE * 8,  y: TILE * 4 },
  { id: "obra-2", title: "Sala Norte B — Figuraciones", author: "Artista B", year: "2023", description: "Retratos y figuras.", type: 'video', src: '/media/figuraciones.mp4', thumb: '/media/figuraciones_thumb.jpg', loop: true, x: TILE * 18, y: TILE * 4 },
  { id: "obra-3", title: "Sala Norte C — Textiles (sonoro)", author: "Artista C", year: "2022", description: "Tejidos y patrones.", type: 'audio', src: '/media/textiles_audio.mp3', thumb: '/media/textiles_thumb.jpg', x: TILE * 28, y: TILE * 4 },
  { id: "obra-4", title: "Patio — Instalación", author: "Artista D", year: "2025", description: "Intervención site-specific.", type: 'image', src: '/media/instalacion.jpg', thumb: '/media/instalacion_thumb.jpg', x: TILE * 18, y: TILE * 12 },
  { id: "obra-5", title: "Sala Sur — Proyección", author: "Artista E", year: "2025", description: "Proyección monocanal.", type: 'video', src: '/media/proyeccion.mp4', thumb: '/media/proyeccion_thumb.jpg', loop: true, x: TILE * 10, y: TILE * 20 },
  { id: "obra-6", title: "Sala Sur — Archivo vivo", author: "Artista F", year: "2021", description: "Documento interactivo.", type: 'html', src: '<div style="padding:8px">Documento <b>interactivo</b></div>', x: TILE * 24, y: TILE * 20 },
];

function getArtworkById(id){ return ARTWORKS.find(a => a.id === id); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function resolveCollision(x, y) {
  let nx = x, ny = y;
  const samples = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
  ];
  for (const s of samples) {
    const tx = Math.floor((x + s.dx * PLAYER_R) / TILE);
    const ty = Math.floor((y + s.dy * PLAYER_R) / TILE);
    if (tx >= 0 && ty >= 0 && tx < WORLD_W && ty < WORLD_H && MAP[ty][tx] === 1) {
      if (s.dx === 1) nx = Math.min(nx, tx * TILE - PLAYER_R - 0.01);
      if (s.dx === -1) nx = Math.max(nx, (tx + 1) * TILE + PLAYER_R + 0.01);
      if (s.dy === 1) ny = Math.min(ny, ty * TILE - PLAYER_R - 0.01);
      if (s.dy === -1) ny = Math.max(ny, (ty + 1) * TILE + PLAYER_R + 0.01);
    }
  }
  return { x: nx, y: ny };
}

export default function TopDownGalleryApp() {
  const canvasRef = useRef(null);
  const [keys, setKeys] = useState({});
  const [player, setPlayer] = useState({ x: TILE * 6, y: TILE * 6, facing: 0 });
  const [openArtwork, setOpenArtwork] = useState(null);
  const [hint, setHint] = useState("");

  // Refs para reproducir media dentro del canvas
const videoRef = useRef(null);
const audioRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      const k = e.key.toLowerCase();
      setKeys((prev) => ({ ...prev, [k]: true }));
      if (k === "e" && !openArtwork) {
        const nearest = findNearestArtwork(player);
        if (nearest && nearest.d <= INTERACT_DIST) {
          location.hash = `#/obra/${nearest.art.id}`;
        }
      } else if (k === "escape") {
        location.hash = '';
      }
    };
    const onUp = (e) => {
      const k = e.key.toLowerCase();
      setKeys((prev) => ({ ...prev, [k]: false }));
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [player, openArtwork]);

  // Deep-links: abrir/cerrar obra desde la URL hash (#/obra/:id)
  useEffect(() => {
    const openFromHash = () => {
      const m = location.hash.match(/^#\/obra\/([^/]+)$/);
      if (m) {
        const art = getArtworkById(decodeURIComponent(m[1]));
        if (art) { setOpenArtwork(art); return; }
      }
      setOpenArtwork(null);
    };
    window.addEventListener('hashchange', openFromHash);
    openFromHash();
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

// Crear / limpiar media (video/audio) cuando cambia la obra abierta
useEffect(() => {
  const cleanup = () => {
    if (videoRef.current) { try { videoRef.current.pause(); } catch {} videoRef.current = null; }
    if (audioRef.current) { try { audioRef.current.pause(); } catch {} audioRef.current = null; }
  };

  cleanup();

  if (openArtwork) {
    if (openArtwork.type === 'video') {
      const v = document.createElement('video');
      v.src = openArtwork.src;
      v.loop = !!openArtwork.loop;
      v.playsInline = true;
      v.autoplay = true;
      v.crossOrigin = "anonymous";
      videoRef.current = v;
      v.oncanplay = () => { try { v.play(); } catch {} };
    } else if (openArtwork.type === 'audio') {
      const a = document.createElement('audio');
      a.src = openArtwork.src;
      a.loop = !!openArtwork.loop;
      a.autoplay = true;
      audioRef.current = a;
      a.oncanplay = () => { try { a.play(); } catch {} };
    }
  }

  return cleanup;
}, [openArtwork]);

  // === bucle de render ===
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = VIEW_W; c.height = VIEW_H;

    let raf; let last = performance.now();

    function loop(t) {
      const dt = Math.min(33, t - last) / 16.67;
      last = t;

      let vx = 0, vy = 0;
      const up = keys["arrowup"] || keys["w"]; if (up) vy -= 1;
      const down = keys["arrowdown"] || keys["s"]; if (down) vy += 1;
      const left = keys["arrowleft"] || keys["a"]; if (left) vx -= 1;
      const right = keys["arrowright"] || keys["d"]; if (right) vx += 1;
      const len = Math.hypot(vx, vy) || 1;
      vx = (vx / len) * PLAYER_SPEED * dt;
      vy = (vy / len) * PLAYER_SPEED * dt;

      let nx = player.x + vx;
      let ny = player.y + vy;
      const solved = resolveCollision(nx, ny);
      nx = solved.x; ny = solved.y;

      const facing = Math.atan2(vy, vx) || player.facing;
      setPlayer({ x: nx, y: ny, facing });

      const camX = clamp(nx - VIEW_W / 2, 0, WORLD_W * TILE - VIEW_W);
      const camY = clamp(ny - VIEW_H / 2, 0, WORLD_H * TILE - VIEW_H);

      ctx.fillStyle = "#0e0f12"; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      for (let ty = 0; ty < WORLD_H; ty++) {
        for (let tx = 0; tx < WORLD_W; tx++) {
          const x = tx * TILE - camX; const y = ty * TILE - camY;
          const even = ((tx + ty) % 2) === 0;
          ctx.fillStyle = even ? "#171a21" : "#15171d";
          ctx.fillRect(x, y, TILE, TILE);
        }
      }

      for (let ty = 0; ty < WORLD_H; ty++) {
        for (let tx = 0; tx < WORLD_W; tx++) {
          if (MAP[ty][tx] === 1) {
            const x = tx * TILE - camX; const y = ty * TILE - camY;
            ctx.fillStyle = "#2a2f3a"; ctx.fillRect(x, y, TILE, TILE);
            ctx.strokeStyle = "#11141a"; ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
          }
        }
      }

      ARTWORKS.forEach((art) => {
        const ax = art.x - camX; const ay = art.y - camY;
        ctx.fillStyle = "#3c2f23"; ctx.fillRect(ax - 18, ay - 14, 36, 28);
        ctx.fillStyle = "#cbbba4"; ctx.fillRect(ax - 14, ay - 10, 28, 20);
        if (art.thumb) {
          drawThumb(ctx, art.thumb, ax - 12, ay - 8, 24, 16);
        } else {
          ctx.fillStyle = "#999"; ctx.fillRect(ax - 12, ay - 8, 24, 16);
        }
      });

      const px = nx - camX; const py = ny - camY;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.ellipse(px, py + 8, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e9e6df";
      ctx.beginPath(); ctx.arc(px, py, PLAYER_R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(px + Math.cos(facing) * 6, py + Math.sin(facing) * 6, 2, 0, Math.PI * 2); ctx.fill();

      const nearest = findNearestArtwork({ x: nx, y: ny });
      if (nearest && nearest.d <= INTERACT_DIST) {
        setHint("Presiona E para ver info");
        const ax = nearest.art.x - camX; const ay = nearest.art.y - camY;
        ctx.strokeStyle = "#d8c27a"; ctx.lineWidth = 2; ctx.strokeRect(ax - 18, ay - 14, 36, 28);
      } else {
        setHint("");
      }

      // === Panel dentro del canvas ===
if (openArtwork) {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const PW = Math.min(Math.floor(VIEW_W * 0.72), 640);
  const PH = Math.min(Math.floor(VIEW_H * 0.72), 400);
  const PX = Math.floor((VIEW_W - PW) / 2);
  const PY = Math.floor((VIEW_H - PH) / 2);

  ctx.fillStyle = "#0f1116";
  ctx.fillRect(PX, PY, PW, PH);
  ctx.strokeStyle = "#d8c27a";
  ctx.strokeRect(PX + 0.5, PY + 0.5, PW - 1, PH - 1);

  const pad = 14;
  const MX = PX + pad;
  const MY = PY + pad;
  const MW = PW - pad * 2;
  const MH = Math.floor((PH - pad * 3) * 0.6);

  ctx.fillStyle = "#e9e6df";
  ctx.font = "16px sans-serif";
  ctx.fillText(openArtwork.title, PX + pad, PY + PH - 70);
  ctx.font = "12px sans-serif";
  ctx.fillText(`${openArtwork.author} · ${openArtwork.year}`, PX + pad, PY + PH - 50);
  ctx.fillText("Esc para cerrar", PX + PW - 120, PY + PH - 20);

  if (openArtwork.type === 'image') {
    const img = loadImage(openArtwork.src);
    if (img && img.complete) {
      const ar = img.naturalWidth / img.naturalHeight;
      let w = MW, h = MW / ar;
      if (h > MH) { h = MH; w = MH * ar; }
      const ox = MX + (MW - w) / 2, oy = MY + (MH - h) / 2;
      ctx.drawImage(img, ox, oy, w, h);
    }
  } else if (openArtwork.type === 'video' && videoRef.current) {
    const v = videoRef.current;
    if (v.readyState >= 2) {
      const ar = v.videoWidth / v.videoHeight;
      let w = MW, h = MW / ar;
      if (h > MH) { h = MH; w = MH * ar; }
      const ox = MX + (MW - w) / 2, oy = MY + (MH - h) / 2;
      ctx.drawImage(v, ox, oy, w, h);
    }
  } else if (openArtwork.type === 'audio') {
    ctx.fillText("Reproduciendo audio…", MX + 12, MY + 22);
  }
}

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [keys, player]);

return (
  <div className="min-h-screen w-full flex items-center justify-center bg-black text-white">
    <div className="relative select-none">
      <canvas ref={canvasRef} style={{ width: VIEW_W, height: VIEW_H, imageRendering: "pixelated", borderRadius: 12, boxShadow: "0 0 64px rgba(0,0,0,0.6)" }} />

      <div className="absolute left-3 bottom-3 text-sm opacity-80 bg-black/50 px-3 py-2 rounded-md">
        <div>Flechas/WASD para moverte · E para interactuar · Esc para cerrar</div>
        {hint && <div className="mt-1 text-yellow-200">{hint}</div>}
      </div>
    </div>
  </div>
);
}

function MobilePad() { return null; }

const _thumbCache = new Map();
function drawThumb(ctx, url, x, y, w, h) {
  let img = _thumbCache.get(url);
  if (!img) {
    img = new Image(); img.src = url; _thumbCache.set(url, img);
  }
  if (img.complete && img.naturalWidth > 0) {
    const ar = img.width / img.height || 1;
    let dw = w, dh = w / ar;
    if (dh > h) { dh = h; dw = h * ar; }
    const ox = x + (w - dw) / 2; const oy = y + (h - dh) / 2;
    try { ctx.drawImage(img, ox, oy, dw, dh); } catch {}
  } else {
    ctx.fillStyle = "#666"; ctx.fillRect(x, y, w, h);
  }
}

// Cache de imágenes grandes
const _imgCache = new Map();
function loadImage(url) {
  if (!url) return null;
  let img = _imgCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    _imgCache.set(url, img);
  }
  return img;
}

function findNearestArtwork(pos) {
  let best = null; let bestD = 1e9; let artBest = null;
  for (const art of ARTWORKS) {
    const d = dist(pos, { x: art.x, y: art.y });
    if (d < bestD) { bestD = d; best = { x: art.x, y: art.y }; artBest = art; }
  }
  if (!best) return null;
  return { d: bestD, art: artBest };
}

function MediaViewer({ art }) {
  if (!art) return null;
  if (art.type === 'image') {
    return (
      <div className="w-full aspect-video bg-zinc-800 rounded-md overflow-hidden flex items-center justify-center">
        {art.src ? <img src={art.src} alt={art.title} className="w-full h-full object-contain" /> : <div className="opacity-50 p-4">Sin imagen</div>}
      </div>
    );
  }
  if (art.type === 'video') {
    return (
      <div className="w-full aspect-video bg-black rounded-md overflow-hidden">
        <video src={art.src} controls playsInline loop={!!art.loop} className="w-full h-full" />
      </div>
    );
  }
  if (art.type === 'audio') {
    return (
      <div className="w-full bg-zinc-800 rounded-md p-4 flex flex-col gap-3">
        <div className="text-sm opacity-80">Pieza sonora</div>
        <audio src={art.src} controls preload="metadata" />
      </div>
    );
  }
  if (art.type === 'html') {
    return (
      <div
        className="w-full bg-zinc-800 rounded-md p-3 overflow-auto"
        dangerouslySetInnerHTML={{ __html: art.src }}
      />
    );
  }

  // fallback si el tipo no es soportado
  return (
    <div className="w-full bg-zinc-800 rounded-md p-4">
      Formato no soportado
    </div>
  );
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = (text || "").split(/\s+/);
  let line = "", lines = 0;
  for (let n = 0; n < words.length; n++) {
    const test = line ? line + " " + words[n] : words[n];
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, y); y += lineHeight; lines++;
      line = words[n];
      if (lines >= maxLines - 1) { ctx.fillText(line + "…", x, y); return; }
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}