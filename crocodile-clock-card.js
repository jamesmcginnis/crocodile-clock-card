/**
 * Crocodile Clock Card
 * Home Assistant custom Lovelace card — Beautiful analog clock with twelve
 * distinct clock faces, smooth sweep or mechanical tick second hand,
 * and a glassmorphic popup with digital clock + interactive calendar.
 *
 * Repository: https://github.com/jamesmcginnis/crocodile-clock-card
 * Author:     James McGinnis
 */

// ── Canvas roundRect polyfill ─────────────────────────────────────
(function () {
  const proto = CanvasRenderingContext2D.prototype;
  if (!proto.roundRect) {
    proto.roundRect = function (x, y, w, h, r) {
      r = Math.min(Math.abs(r || 0), Math.abs(w / 2), Math.abs(h / 2));
      this.beginPath();
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.arcTo(x + w, y, x + w, y + r, r);
      this.lineTo(x + w, y + h - r);
      this.arcTo(x + w, y + h, x + w - r, y + h, r);
      this.lineTo(x + r, y + h);
      this.arcTo(x, y + h, x, y + h - r, r);
      this.lineTo(x, y + r);
      this.arcTo(x, y, x + r, y, r);
      this.closePath();
      return this;
    };
  }
}());

// ── Popup animation keyframes ──────────────────────────────────────
const CC_KEYFRAMES = `
  @keyframes ccFadeIn  { from{opacity:0}       to{opacity:1} }
  @keyframes ccSlideUp { from{transform:translateY(28px) scale(0.95);opacity:0} to{transform:none;opacity:1} }
`;

// ── Clock face catalogue ───────────────────────────────────────────
const CC_FACES = [
  { value: 'classic',   label: 'Classic',   symbol: '🕐' },
  { value: 'minimal',   label: 'Minimal',   symbol: '·' },
  { value: 'roman',     label: 'Roman',     symbol: 'XII' },
  { value: 'modern',    label: 'Modern',    symbol: '3' },
  { value: 'luxury',    label: 'Luxury',    symbol: '✦' },
  { value: 'skeleton',  label: 'Skeleton',  symbol: '⚙' },
  { value: 'neon',      label: 'Neon',      symbol: '◎' },
  { value: 'retro',     label: 'Retro',     symbol: 'IX' },
  { value: 'sport',     label: 'Sport',     symbol: '▮' },
  { value: 'art_deco',  label: 'Art Deco',  symbol: '❖' },
  { value: 'celestial', label: 'Celestial', symbol: '✧' },
  { value: 'stargate',  label: 'Stargate',  symbol: '⬡' },
];

// ── Helper: hex colour to rgba ─────────────────────────────────────
function _ccHexToRgba(hex, alpha) {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const [, h] = m;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Editor CSS (matching meerkat-map-card aesthetic) ───────────────
const CC_EDITOR_CSS = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :host { display:block; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  .container { display:flex; flex-direction:column; gap:16px; padding:4px 0 8px; }
  .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#888; margin-bottom:4px; }
  .hint { font-size:11px; color:#888; line-height:1.5; }
  .card-block { background:var(--card-background-color); border:1px solid rgba(128,128,128,0.18); border-radius:12px; overflow:hidden; }
  .select-row { padding:12px 16px; display:flex; flex-direction:column; gap:6px; }
  .select-row > label { font-size:13px; font-weight:600; color:var(--primary-text-color); }
  input[type="text"] {
    width:100%; background:var(--secondary-background-color,rgba(0,0,0,0.06));
    color:var(--primary-text-color); border:1px solid rgba(128,128,128,0.2);
    border-radius:8px; padding:9px 12px; font-size:13px; font-family:inherit;
  }
  .segmented { display:flex; background:rgba(118,118,128,0.18); border-radius:9px; padding:2px; gap:2px; }
  .segmented input[type="radio"] { display:none; }
  .segmented label {
    flex:1; text-align:center; padding:8px 4px; font-size:13px; font-weight:500;
    border-radius:7px; cursor:pointer; color:var(--primary-text-color);
    transition:all 0.2s; white-space:nowrap;
  }
  .segmented input[type="radio"]:checked + label { background:#007AFF; color:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.3); }
  .toggle-item {
    display:flex; align-items:center; justify-content:space-between;
    padding:11px 16px; border-bottom:1px solid rgba(128,128,128,0.1); min-height:52px;
  }
  .toggle-item:last-child { border-bottom:none; }
  .toggle-label { font-size:14px; font-weight:500; }
  .toggle-sublabel { font-size:11px; color:#888; margin-top:2px; }
  .toggle-icon { font-size:16px; margin-right:10px; flex-shrink:0; }
  .toggle-left { display:flex; align-items:center; flex:1; min-width:0; }
  .toggle-switch { position:relative; width:51px; height:31px; flex-shrink:0; }
  .toggle-switch input { opacity:0; width:0; height:0; position:absolute; }
  .toggle-track { position:absolute; inset:0; border-radius:31px; background:rgba(120,120,128,0.32); cursor:pointer; transition:background 0.25s; }
  .toggle-track::after { content:''; position:absolute; width:27px; height:27px; border-radius:50%; background:#fff; top:2px; left:2px; box-shadow:0 2px 6px rgba(0,0,0,0.3); transition:transform 0.25s; }
  .toggle-switch input:checked + .toggle-track { background:#34C759; }
  .toggle-switch input:checked + .toggle-track::after { transform:translateX(20px); }
  .face-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; padding:12px; }
  .face-option { cursor:pointer; }
  .face-option input[type="radio"] { display:none; }
  .face-preview {
    display:flex; flex-direction:column; align-items:center; gap:4px;
    padding:10px 6px; border-radius:10px; border:2px solid transparent;
    transition:all 0.2s; background:rgba(128,128,128,0.08);
  }
  .face-option.selected .face-preview { border-color:#007AFF; background:rgba(0,122,255,0.12); }
  .face-symbol { font-size:18px; font-weight:700; height:24px; display:flex; align-items:center; font-family:-apple-system,BlinkMacSystemFont,serif; }
  .face-label { font-size:10px; font-weight:600; text-align:center; color:var(--primary-text-color); }
  /* Colour rows */
  .color-row {
    display:flex; align-items:center; padding:10px 16px;
    border-bottom:1px solid rgba(128,128,128,0.1); min-height:52px;
  }
  .color-row:last-child { border-bottom:none; }
  .color-row-icon { font-size:16px; margin-right:10px; flex-shrink:0; }
  .color-row-label { font-size:14px; font-weight:500; flex:1; }
  .color-controls { display:flex; align-items:center; gap:8px; flex-shrink:0; }
  .color-swatch {
    width:32px; height:32px; border-radius:8px;
    border:2px solid rgba(128,128,128,0.3); cursor:pointer;
    position:relative; overflow:hidden; flex-shrink:0;
    transition:border-color 0.15s;
  }
  .color-swatch:hover { border-color:rgba(128,128,128,0.6); }
  .cc-color-input {
    position:absolute; inset:0; opacity:0; cursor:pointer;
    width:100%; height:100%; border:none; padding:0;
  }
  .none-btn {
    font-size:10px; padding:4px 8px; border-radius:6px;
    border:1px solid rgba(128,128,128,0.3); background:transparent;
    color:rgba(128,128,128,0.8); cursor:pointer; font-family:inherit;
    font-weight:600; white-space:nowrap; transition:all 0.15s;
  }
  .none-btn.active { background:rgba(0,122,255,0.15); color:#007AFF; border-color:rgba(0,122,255,0.4); }
  /* Opacity slider */
  .opacity-row { padding:10px 16px 14px; }
  .opacity-row label { font-size:13px; font-weight:600; color:var(--primary-text-color); display:flex; justify-content:space-between; margin-bottom:8px; }
  input[type="range"] { width:100%; accent-color:#007AFF; cursor:pointer; }
`;

// ═══════════════════════════════════════════════════════════════════
//  CLOCK DRAWING ENGINE
// ═══════════════════════════════════════════════════════════════════

class CrocodileClockDrawer {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this._config = {};
    this._px     = 220;
  }

  setConfig(config) { this._config = config; }

  /** Resize canvas to px × px with DPR scaling */
  resize(px) {
    this._px = px;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width  = px * dpr;
    this.canvas.height = px * dpr;
    this.canvas.style.width  = px + 'px';
    this.canvas.style.height = px + 'px';
  }

  /** Main draw. secondAngle is pre-computed by the animation loop (radians). */
  draw(h, m, s, secondAngle) {
    const dpr = window.devicePixelRatio || 1;
    const px  = this._px;
    const r   = px / 2;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, px * dpr, px * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(r, r);

    this._drawFace(r, h, m, s, secondAngle);
    this._drawHands(r, h, m, s, secondAngle);

    ctx.restore();
  }

  // ── Face ─────────────────────────────────────────────────────────
  _drawFace(r, h, m, s, secondAngle) {
    const ctx   = this.ctx;
    const cfg   = this._config;
    const face  = cfg.face || 'classic';
    const dial  = cfg.dial_color && cfg.dial_color !== 'transparent' ? cfg.dial_color : null;
    const accent = cfg.accent_color    || '#007AFF';
    const text   = cfg.dial_text_color || '#FFFFFF';

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - 0.5, 0, 2 * Math.PI);
    ctx.clip();
    if (dial) {
      ctx.fillStyle = dial;
      ctx.fillRect(-r, -r, r * 2, r * 2);
    }
    // Subtle vignette
    const vig = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();

    // Bezel ring
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    switch (face) {
      case 'minimal':   this._faceMinimal(r, accent, text);   break;
      case 'roman':     this._faceRoman(r, accent, text);     break;
      case 'modern':    this._faceModern(r, accent, text);    break;
      case 'luxury':    this._faceLuxury(r, accent, text);    break;
      case 'skeleton':  this._faceSkeleton(r, accent, text);  break;
      case 'neon':      this._faceNeon(r, accent, text);      break;
      case 'retro':     this._faceRetro(r, accent, text);     break;
      case 'sport':     this._faceSport(r, accent, text);     break;
      case 'art_deco':  this._faceArtDeco(r, accent, text);   break;
      case 'celestial': this._faceCelestial(r, accent, text); break;
      case 'stargate':  this._faceStargate(r, accent, text, h, m, s, secondAngle); break;
      default:          this._faceClassic(r, accent, text);   break;
    }
  }

  // ── Classic ───────────────────────────────────────────────────────
  _faceClassic(r, accent, text) {
    const ctx = this.ctx;
    // Tick marks — minute and hour
    for (let i = 0; i < 60; i++) {
      const a        = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const isHour   = i % 5 === 0;
      const isQuarter = i % 15 === 0;
      const inner    = isHour ? (isQuarter ? r * 0.76 : r * 0.80) : r * 0.89;
      const outer    = r * 0.92;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.strokeStyle = isHour ? text : 'rgba(255,255,255,0.3)';
      ctx.lineWidth   = isQuarter ? 3.2 : isHour ? 2 : 0.8;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }
    // Arabic numerals
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = text;
    for (let i = 1; i <= 12; i++) {
      const a  = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.font = `600 ${r * 0.148}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
      ctx.fillText(String(i), Math.cos(a) * r * 0.665, Math.sin(a) * r * 0.665);
    }
  }

  // ── Minimal ───────────────────────────────────────────────────────
  _faceMinimal(r, accent, text) {
    const ctx = this.ctx;
    // Just dots — large at quarters, small at hours, tiny at minutes
    for (let i = 0; i < 60; i++) {
      const a         = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const isHour    = i % 5 === 0;
      const isQuarter = i % 15 === 0;
      if (!isHour) {
        // Minute dot
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.91, Math.sin(a) * r * 0.91, r * 0.012, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();
      } else {
        const dotR = isQuarter ? r * 0.052 : r * 0.030;
        const dist = r * 0.83;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, dotR, 0, 2 * Math.PI);
        ctx.fillStyle = isQuarter ? text : 'rgba(255,255,255,0.55)';
        ctx.fill();
      }
    }
  }

  // ── Roman ─────────────────────────────────────────────────────────
  _faceRoman(r, accent, text) {
    const ctx      = this.ctx;
    const numerals = ['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
    const fSizes   = { XII: 0.100, VIII: 0.083, VII: 0.092, XI: 0.090, IV: 0.100 };
    // Subtle minute dashes
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88);
      ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
      ctx.strokeStyle = 'rgba(255,255,255,0.20)'; ctx.lineWidth = 0.7; ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.83, Math.sin(a) * r * 0.83);
      ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = text;
    for (let i = 0; i < 12; i++) {
      const a   = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const num = numerals[i];
      ctx.font  = `500 ${r * (fSizes[num] || 0.104)}px 'Times New Roman', Georgia, serif`;
      ctx.fillText(num, Math.cos(a) * r * 0.685, Math.sin(a) * r * 0.685);
    }
  }

  // ── Modern ────────────────────────────────────────────────────────
  _faceModern(r, accent, text) {
    const ctx = this.ctx;
    for (let i = 0; i < 60; i++) {
      const a        = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const isHour   = i % 5 === 0;
      const isQuarter = i % 15 === 0;
      const inner    = r * (isQuarter ? 0.74 : isHour ? 0.80 : 0.87);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
      ctx.strokeStyle = isHour ? accent : 'rgba(255,255,255,0.13)';
      ctx.lineWidth   = isQuarter ? 3 : isHour ? 2 : 0.7;
      ctx.lineCap     = 'round'; ctx.stroke();
    }
    // Bold quarter numerals only
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = text;
    [[12, 0], [3, 3], [6, 6], [9, 9]].forEach(([n, i]) => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.font = `800 ${r * 0.185}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
      ctx.fillText(String(n), Math.cos(a) * r * 0.615, Math.sin(a) * r * 0.615);
    });
  }

  // ── Luxury ────────────────────────────────────────────────────────
  _faceLuxury(r, accent, text) {
    const ctx  = this.ctx;
    const gold = '#C9A84C';
    // Double bezel
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, 2 * Math.PI);
    ctx.strokeStyle = gold; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.905, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(201,168,76,0.22)'; ctx.lineWidth = 0.8; ctx.stroke();
    // Minute tracers
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.865, Math.sin(a) * r * 0.865);
      ctx.lineTo(Math.cos(a) * r * 0.895, Math.sin(a) * r * 0.895);
      ctx.strokeStyle = 'rgba(201,168,76,0.5)'; ctx.lineWidth = 0.7; ctx.stroke();
    }
    // Baton hour indices
    for (let i = 0; i < 12; i++) {
      const a      = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const isMaj  = i % 3 === 0;
      const inner  = r * (isMaj ? 0.725 : 0.795);
      const outer  = r * 0.87;
      const hw     = r * (isMaj ? 0.032 : 0.018);
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = gold;
      ctx.roundRect(-hw / 2, -outer, hw, outer - inner, hw / 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.roundRect(-hw * 0.2, -outer + hw, hw * 0.4, (outer - inner) * 0.55, hw * 0.2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────
  _faceSkeleton(r, accent, text) {
    const ctx = this.ctx;
    // Structural inner rings
    [0.64, 0.50].forEach(rf => {
      ctx.beginPath(); ctx.arc(0, 0, r * rf, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.8; ctx.stroke();
    });
    // Diamond hour markers
    for (let i = 0; i < 12; i++) {
      const a      = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const isMaj  = i % 3 === 0;
      const sz     = r * (isMaj ? 0.052 : 0.030);
      const dist   = r * 0.875;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -dist - sz * 1.8);
      ctx.lineTo(sz, -dist);
      ctx.lineTo(0, -dist + sz * 1.8);
      ctx.lineTo(-sz, -dist);
      ctx.closePath();
      ctx.fillStyle = isMaj ? accent : 'rgba(255,255,255,0.5)';
      ctx.fill();
      ctx.restore();
    }
    // Minute dots
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.91, Math.sin(a) * r * 0.91, r * 0.010, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
    }
    // Quarter numerals
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    ctx.font = `600 ${r * 0.115}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
    [[12, 0], [3, 3], [6, 6], [9, 9]].forEach(([n, i]) => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.fillText(String(n), Math.cos(a) * r * 0.645, Math.sin(a) * r * 0.645);
    });
  }

  // ── Neon ──────────────────────────────────────────────────────────
  _faceNeon(r, accent, text) {
    const ctx  = this.ctx;
    const neon = accent || '#00D4FF';

    // Glowing outer ring
    ctx.save();
    ctx.shadowColor = neon; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.895, 0, 2 * Math.PI);
    ctx.strokeStyle = neon; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.restore();

    // Neon hour bars
    for (let i = 0; i < 12; i++) {
      const a      = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const isMaj  = i % 3 === 0;
      ctx.save();
      ctx.shadowColor = neon; ctx.shadowBlur = isMaj ? 14 : 7;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * (isMaj ? 0.76 : 0.84), Math.sin(a) * r * (isMaj ? 0.76 : 0.84));
      ctx.lineTo(Math.cos(a) * r * 0.87, Math.sin(a) * r * 0.87);
      ctx.strokeStyle = neon;
      ctx.lineWidth   = isMaj ? 3 : 1.2;
      ctx.lineCap     = 'round'; ctx.stroke();
      ctx.restore();
    }
    // Minute dots
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.91, Math.sin(a) * r * 0.91, r * 0.010, 0, 2 * Math.PI);
      ctx.fillStyle = neon + '60'; ctx.fill();
    }
    // Glowing numerals at quarters
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = neon; ctx.shadowColor = neon; ctx.shadowBlur = 12;
    ctx.font = `700 ${r * 0.145}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', monospace`;
    [[12, 0], [3, 3], [6, 6], [9, 9]].forEach(([n, i]) => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.fillText(String(n), Math.cos(a) * r * 0.63, Math.sin(a) * r * 0.63);
    });
    ctx.restore();
  }

  // ── Retro ─────────────────────────────────────────────────────────
  _faceRetro(r, accent, text) {
    const ctx  = this.ctx;
    const warm = '#D4A853';

    // Decorative double inner ring
    ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(212,168,83,0.40)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(212,168,83,0.16)'; ctx.lineWidth = 0.5; ctx.stroke();

    // Minute ticks
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.855, Math.sin(a) * r * 0.855);
      ctx.lineTo(Math.cos(a) * r * 0.875, Math.sin(a) * r * 0.875);
      ctx.strokeStyle = 'rgba(212,168,83,0.35)'; ctx.lineWidth = 0.7; ctx.lineCap = 'butt'; ctx.stroke();
    }
    // Hour ticks — warm gold batons
    for (let i = 0; i < 12; i++) {
      const a     = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const isQ   = i % 3 === 0;
      const inner = r * (isQ ? 0.760 : 0.820);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * r * 0.875, Math.sin(a) * r * 0.875);
      ctx.strokeStyle = warm; ctx.lineWidth = isQ ? 3.0 : 1.4; ctx.lineCap = 'round'; ctx.stroke();
    }
    // Serif all-12 numerals
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = text;
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.font = `500 ${r * 0.128}px 'Times New Roman', Georgia, serif`;
      ctx.fillText(String(i), Math.cos(a) * r * 0.665, Math.sin(a) * r * 0.665);
    }
  }

  // ── Sport ─────────────────────────────────────────────────────────
  _faceSport(r, accent, text) {
    const ctx = this.ctx;

    // Outer tachymeter-style ring of dots
    for (let i = 0; i < 60; i++) {
      const a      = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const isHour = i % 5 === 0;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.915, Math.sin(a) * r * 0.915,
        isHour ? r * 0.020 : r * 0.009, 0, 2 * Math.PI);
      ctx.fillStyle = isHour ? accent : 'rgba(255,255,255,0.22)';
      ctx.fill();
    }
    // Bold rectangular hour markers
    for (let i = 0; i < 12; i++) {
      const a    = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const isQ  = i % 3 === 0;
      const barH = r * (isQ ? 0.135 : 0.085);
      const barW = r * (isQ ? 0.038 : 0.022);
      const dist = r * 0.795;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = isQ ? accent : text;
      ctx.beginPath();
      ctx.rect(-barW / 2, -dist - barH, barW, barH);
      ctx.fill();
      // Highlight stripe on quarter markers
      if (isQ) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.rect(-barW * 0.22, -dist - barH + barW, barW * 0.44, barH * 0.45);
        ctx.fill();
      }
      ctx.restore();
    }
    // Bold quarter numerals
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = text;
    [[12, 0], [3, 3], [6, 6], [9, 9]].forEach(([n, i]) => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.font = `900 ${r * 0.158}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
      ctx.fillText(String(n), Math.cos(a) * r * 0.615, Math.sin(a) * r * 0.615);
    });
  }

  // ── Art Deco ──────────────────────────────────────────────────────
  _faceArtDeco(r, accent, text) {
    const ctx  = this.ctx;
    const gold = '#B8963E';

    // Decorative outer ring
    ctx.beginPath(); ctx.arc(0, 0, r * 0.905, 0, 2 * Math.PI);
    ctx.strokeStyle = gold; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.860, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(184,150,62,0.28)'; ctx.lineWidth = 0.6; ctx.stroke();

    // Minute dashes
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.870, Math.sin(a) * r * 0.870);
      ctx.lineTo(Math.cos(a) * r * 0.900, Math.sin(a) * r * 0.900);
      ctx.strokeStyle = 'rgba(184,150,62,0.32)'; ctx.lineWidth = 0.6; ctx.stroke();
    }
    // Stepped triangular hour markers
    for (let i = 0; i < 12; i++) {
      const a    = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const isMaj = i % 3 === 0;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      const dist = r * 0.830;
      const h    = r * (isMaj ? 0.115 : 0.068);
      const w    = r * (isMaj ? 0.038 : 0.022);
      ctx.beginPath();
      ctx.moveTo(0,       -dist);
      ctx.lineTo( w,      -dist + h);
      ctx.lineTo( w * 0.4,-dist + h * 0.68);
      ctx.lineTo(0,       -dist + h * 0.85);
      ctx.lineTo(-w * 0.4,-dist + h * 0.68);
      ctx.lineTo(-w,      -dist + h);
      ctx.closePath();
      ctx.fillStyle = isMaj ? gold : 'rgba(184,150,62,0.55)';
      ctx.fill();
      ctx.restore();
    }
    // Geometric inner ring
    ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(184,150,62,0.18)'; ctx.lineWidth = 3.5; ctx.stroke();

    // Quarter numerals — serif, elegant
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [[12, 0], [3, 3], [6, 6], [9, 9]].forEach(([n, i]) => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.font      = `600 ${r * 0.132}px 'Times New Roman', Georgia, serif`;
      ctx.fillStyle = text;
      ctx.fillText(String(n), Math.cos(a) * r * 0.640, Math.sin(a) * r * 0.640);
    });
    // Art deco corner accents at non-quarter hours
    ctx.fillStyle = 'rgba(184,150,62,0.40)';
    ctx.font      = `400 ${r * 0.075}px 'Times New Roman', Georgia, serif`;
    [1, 2, 4, 5, 7, 8, 10, 11].forEach(i => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.fillText('·', Math.cos(a) * r * 0.640, Math.sin(a) * r * 0.640);
    });
  }

  // ── Celestial ─────────────────────────────────────────────────────
  _faceCelestial(r, accent, text) {
    const ctx  = this.ctx;
    const star = accent || '#FFD700';

    // Orbit rings
    [0.885, 0.650, 0.480].forEach((rf, i) => {
      ctx.beginPath(); ctx.arc(0, 0, r * rf, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(255,255,255,${0.04 + i * 0.02})`; ctx.lineWidth = 0.6; ctx.stroke();
    });
    // Star-field minute markers
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a  = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const cx = Math.cos(a) * r * 0.885;
      const cy = Math.sin(a) * r * 0.885;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.011, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
    }
    // Star-shaped hour markers
    for (let i = 0; i < 12; i++) {
      const a    = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const isMaj = i % 3 === 0;
      const dist = r * 0.820;
      const px   = Math.cos(a) * dist;
      const py   = Math.sin(a) * dist;
      ctx.save();
      ctx.translate(px, py);
      ctx.shadowColor = star; ctx.shadowBlur = isMaj ? 12 : 6;
      this._drawStar(ctx, 0, 0,
        r * (isMaj ? 0.050 : 0.028),
        r * (isMaj ? 0.022 : 0.012),
        isMaj ? 5 : 4);
      ctx.fillStyle = isMaj ? star : 'rgba(255,255,255,0.55)';
      ctx.fill();
      ctx.restore();
    }
    // Glowing 12 numeral
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = star; ctx.shadowColor = star; ctx.shadowBlur = 14;
    ctx.font = `700 ${r * 0.142}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', monospace`;
    ctx.fillText('12', 0, -r * 0.632);
    ctx.restore();
  }

  /** Helper: draw a star polygon path (does not fill — caller fills) */
  _drawStar(ctx, cx, cy, outerR, innerR, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 === 0 ? outerR : innerR;
      const a  = (i / (points * 2)) * 2 * Math.PI - Math.PI / 2;
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      else         ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  // ── Stargate ──────────────────────────────────────────────────────
  // ── Stargate ──────────────────────────────────────────────────────
  // Fluid ripple-tank simulation with per-pixel normal-map shading.
  // Key tuning notes vs previous version:
  //  • DAMP = 0.920  → waves die in ~0.8 s; NO resonance/strobe
  //  • Drop amplitude = 18–25 (not 900!) → gentle splash, not explosion
  //  • Single wave equation step per frame (3 sub-steps caused overshoot)
  //  • Colour mapping uses smooth tanh-like curve, never saturates
  //  • Chevrons glow red when ANY hand tip crosses their angular position
  _faceStargate(r, accent, text, h, m, s, secondAngle) {
    const ctx = this.ctx;
    const now = Date.now();
    const T   = now / 1000;
    const isOnTheHour = (m === 0 && s < 8);

    // ── Persistent state ─────────────────────────────────────────
    const SIM_W = 96;
    const SIM_N = SIM_W * SIM_W;
    // DAMP < 0.95 is critical — waves must decay within a second
    // so individual drops are visible as distinct ripples not a blur
    const DAMP  = 0.920;

    if (!this._sg) {
      const buf1 = new Float32Array(SIM_N);
      const buf2 = new Float32Array(SIM_N);
      // Circle mask
      const mask = new Uint8Array(SIM_N);
      const rad  = SIM_W / 2 - 1.5;
      const cx0  = SIM_W / 2 - 0.5;
      for (let y = 0; y < SIM_W; y++)
        for (let x = 0; x < SIM_W; x++) {
          const dx = x - cx0, dy = y - cx0;
          mask[y * SIM_W + x] = (dx*dx + dy*dy < rad*rad) ? 1 : 0;
        }
      const oc  = document.createElement('canvas');
      oc.width  = SIM_W; oc.height = SIM_W;
      const oc2 = oc.getContext('2d');
      this._sg = {
        buf1, buf2, mask,
        offCanvas: oc, offCtx: oc2,
        imgData:   oc2.createImageData(SIM_W, SIM_W),
        ringRotation: 0,
        lastFrame: now,
        prevMinute: -1,
        lastDrop:   0,
        hourFlash:  -99999,
        // chevron glow: array of { idx, born } — how long ago each was triggered
        chevGlow:   [],
        prevHourChev:   -1,
        prevMinChev:    -1,
        prevSecChev:    -1,
      };
    }
    const sg = this._sg;

    // ── Delta time ───────────────────────────────────────────────
    const dt = Math.min((now - sg.lastFrame) / 1000, 0.05);
    sg.ringRotation += dt * 0.018;
    sg.lastFrame = now;

    // ── Compute hand angles for chevron collision ─────────────────
    const hourAngle = ((h % 12 + m / 60 + s / 3600) / 12) * 2 * Math.PI;
    const minAngle  = ((m + s / 60) / 60) * 2 * Math.PI;
    // secondAngle is already 0→2π (passed in from animation loop)
    // Normalise all to 0→1 fraction of full circle
    const hourFrac  = hourAngle / (2 * Math.PI);
    const minFrac   = minAngle  / (2 * Math.PI);
    const secFrac   = secondAngle !== undefined
      ? secondAngle / (2 * Math.PI) : -1;

    // Which of the 9 chevrons (0=12-o'clock, going clockwise) is each
    // hand currently pointing at?  Chevron i spans ±(0.5/9) around i/9.
    const fracToChev = frac => {
      // Rotate by -0.5/9 so chevron 0 is centred on 12 (frac=0)
      const f = ((frac + 1) % 1);
      return Math.floor(f * 9 + 0.5) % 9;
    };
    const hChev = fracToChev(hourFrac);
    const mChev = fracToChev(minFrac);
    const sChev = secFrac >= 0 ? fracToChev(secFrac) : -1;

    // Fire chevron glow on transition
    const triggerChev = idx => {
      // Only add if not already glowing recently
      if (!sg.chevGlow.find(g => g.idx === idx && now - g.born < 800))
        sg.chevGlow.push({ idx, born: now });
    };
    if (hChev !== sg.prevHourChev) { triggerChev(hChev); sg.prevHourChev = hChev; }
    if (mChev !== sg.prevMinChev)  { triggerChev(mChev); sg.prevMinChev  = mChev; }
    if (sChev >= 0 && sChev !== sg.prevSecChev) { triggerChev(sChev); sg.prevSecChev = sChev; }
    // Expire old glows
    sg.chevGlow = sg.chevGlow.filter(g => now - g.born < 1000);

    // ── Disturbance sources ───────────────────────────────────────
    // Ambient drip: small amplitude, moderate radius, random position
    if (now - sg.lastDrop > 1400 + Math.random() * 1800) {
      sg.lastDrop = now;
      const ang = Math.random() * Math.PI * 2;
      const rad2 = Math.random() * 0.48;
      const dxd  = Math.round(SIM_W/2 + Math.cos(ang) * rad2 * (SIM_W/2 - 2));
      const dyd  = Math.round(SIM_W/2 + Math.sin(ang) * rad2 * (SIM_W/2 - 2));
      // Amplitude 18-28: enough to see clearly, not enough to dominate
      const amp  = 18 + Math.random() * 10;
      const drad = 1 + Math.floor(Math.random() * 2);
      for (let dy2 = -drad; dy2 <= drad; dy2++)
        for (let dx2 = -drad; dx2 <= drad; dx2++) {
          if (dx2*dx2 + dy2*dy2 > drad*drad) continue;
          const px = dxd+dx2, py = dyd+dy2;
          if (px>=0&&px<SIM_W&&py>=0&&py<SIM_W) sg.buf1[py*SIM_W+px] += amp;
        }
    }

    // Minute change → moderate central splash (NOT huge)
    if (m !== sg.prevMinute) {
      sg.prevMinute = m;
      // Central drop radius 4, amplitude 60 — visible but not blinding
      const amp = 60, drad = 4;
      for (let dy2 = -drad; dy2 <= drad; dy2++)
        for (let dx2 = -drad; dx2 <= drad; dx2++) {
          if (dx2*dx2+dy2*dy2 > drad*drad) continue;
          const px = Math.round(SIM_W/2+dx2), py = Math.round(SIM_W/2+dy2);
          if (px>=0&&px<SIM_W&&py>=0&&py<SIM_W) sg.buf1[py*SIM_W+px] += amp;
        }
    }

    // Hour → ring disturbance
    if (isOnTheHour && now - sg.hourFlash > 12000) {
      sg.hourFlash = now;
      const pts = 32, ringR = SIM_W * 0.28;
      for (let i = 0; i < pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const px = Math.round(SIM_W/2 + Math.cos(a)*ringR);
        const py = Math.round(SIM_W/2 + Math.sin(a)*ringR);
        if (px>=0&&px<SIM_W&&py>=0&&py<SIM_W) sg.buf1[py*SIM_W+px] += 45;
      }
    }

    // ── Wave equation step ────────────────────────────────────────
    // Single pass — multiple passes caused the resonance/strobe
    const b1 = sg.buf1, b2 = sg.buf2, mask = sg.mask;
    for (let y = 1; y < SIM_W-1; y++) {
      for (let x = 1; x < SIM_W-1; x++) {
        const i = y*SIM_W + x;
        if (!mask[i]) { b2[i]=0; continue; }
        const next = DAMP * (b1[i-1] + b1[i+1] + b1[i-SIM_W] + b1[i+SIM_W]) * 0.5 - b2[i];
        b2[i] = b1[i];
        b1[i] = (next >  80) ?  80 : (next < -80) ? -80 : next; // gentle clamp
      }
    }
    // Swap buffers
    sg.buf1 = b2; sg.buf2 = b1;

    // ── Pixel render ─────────────────────────────────────────────
    // Map height + surface normal → colour.
    // The Stargate puddle palette:
    //   Deep rest = near-black cobalt (#010810)
    //   Wave crests = bright silver-cyan-white
    //   Wave faces = iridescent mid-blue (normal-map reflection)
    // We use a smooth mapping: colour ∝ tanh(h / scale)
    // so it NEVER saturates to 100% white across the whole surface —
    // only the very tip of each crest goes bright.
    const pix  = sg.imgData.data;
    const half = SIM_W / 2 - 0.5;
    const CUR  = sg.buf1;  // after swap, buf1 is now the latest frame
    for (let y = 0; y < SIM_W; y++) {
      for (let x = 0; x < SIM_W; x++) {
        const i  = y*SIM_W + x;
        const pi = i*4;
        if (!mask[i]) { pix[pi]=0;pix[pi+1]=0;pix[pi+2]=0;pix[pi+3]=0; continue; }

        const ht = CUR[i];

        // Surface normal from finite differences (for lighting)
        const hL = mask[i-1]     ? CUR[i-1]     : ht;
        const hR = mask[i+1]     ? CUR[i+1]     : ht;
        const hU = mask[i-SIM_W] ? CUR[i-SIM_W] : ht;
        const hD = mask[i+SIM_W] ? CUR[i+SIM_W] : ht;
        const nx = (hL - hR);  // surface slope x
        const ny = (hU - hD);  // surface slope y
        // Light from upper-left
        const lx = -0.5, ly = -0.4, lz = 1.0;
        const nlen = Math.sqrt(nx*nx + ny*ny + 1.0);
        const diffuse = Math.max(0, (nx*lx + ny*ly + lz) / nlen);
        const spec    = Math.pow(diffuse, 12);  // sharp specular highlight

        // Height contribution — smooth, never blows out
        const SCALE = 22.0;  // tuned to amplitude 18–60
        const hNorm = Math.tanh(ht / SCALE);  // -1 → +1, smooth
        const crest = Math.max(0, hNorm);     // 0→1 for positive crests
        const trough= Math.max(0, -hNorm);    // 0→1 for negative troughs

        // Vignette: fade to black at portal edge
        const dx = x - half, dy2 = y - half;
        const dist = Math.sqrt(dx*dx + dy2*dy2) / half;
        const vig  = Math.pow(Math.max(0, 1 - dist), 0.4);

        // Base dark cobalt background (resting surface)
        let R = 2,  G = 8,  B = 22;
        // Add crest brightness — silver-white-cyan
        R += crest * 200 + spec * 220;
        G += crest * 220 + spec * 235;
        B += crest * 255 + spec * 255;
        // Troughs go slightly darker blue (below rest level)
        B += trough * 30;
        // Diffuse mid-tone — adds the cyan iridescence on wave faces
        R += diffuse * 15;
        G += diffuse * 55;
        B += diffuse * 120;

        // Apply vignette
        R *= vig; G *= vig; B *= vig;

        pix[pi]   = R > 255 ? 255 : R < 0 ? 0 : R;
        pix[pi+1] = G > 255 ? 255 : G < 0 ? 0 : G;
        pix[pi+2] = B > 255 ? 255 : B < 0 ? 0 : B;
        pix[pi+3] = 255;
      }
    }
    sg.offCtx.putImageData(sg.imgData, 0, 0);

    // ═══════════════════════════════════════════════════════════════
    // DRAW — Stone ring
    // ═══════════════════════════════════════════════════════════════
    const rOuter  = r * 0.99;
    const rPortal = r * 0.74;

    const stoneGrad = ctx.createRadialGradient(0, 0, rPortal, 0, 0, rOuter);
    stoneGrad.addColorStop(0,    '#2a2d30');
    stoneGrad.addColorStop(0.18, '#1e2124');
    stoneGrad.addColorStop(0.55, '#2c3035');
    stoneGrad.addColorStop(0.82, '#1a1d20');
    stoneGrad.addColorStop(1,    '#131517');
    ctx.save();
    ctx.beginPath();
    ctx.arc(0,0,rOuter,0,Math.PI*2);
    ctx.arc(0,0,rPortal,0,Math.PI*2,true);
    ctx.fillStyle = stoneGrad;
    ctx.fill('evenodd');
    [0.78,0.82,0.86,0.90,0.935,0.965].forEach(rf => {
      ctx.beginPath(); ctx.arc(0,0,r*rf,0,Math.PI*2);
      ctx.strokeStyle = rf % 0.08 < 0.01 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 0.6; ctx.stroke();
    });
    ctx.restore();

    // ═══════════════════════════════════════════════════════════════
    // DRAW — 39 rotating glyph slots
    // ═══════════════════════════════════════════════════════════════
    const glyphR = r * 0.86;
    ctx.save();
    ctx.rotate(sg.ringRotation);
    for (let i = 0; i < 39; i++) {
      const a  = (i / 39) * Math.PI * 2;
      const gx = Math.cos(a) * glyphR, gy = Math.sin(a) * glyphR;
      ctx.save();
      ctx.translate(gx, gy); ctx.rotate(a + Math.PI/2);
      const slotW = r*0.028, slotH = r*0.042;
      ctx.beginPath();
      ctx.roundRect(-slotW/2,-slotH/2,slotW,slotH,slotW*0.3);
      ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fill();
      ctx.strokeStyle='rgba(180,200,210,0.28)'; ctx.lineWidth=0.6;
      const seed=(i*137)%7;
      ctx.beginPath();
      if      (seed<2) { ctx.moveTo(-slotW*.3,-slotH*.25);ctx.lineTo(slotW*.3,-slotH*.25);ctx.moveTo(0,-slotH*.25);ctx.lineTo(0,slotH*.25); }
      else if (seed<4) { ctx.moveTo(-slotW*.35,0);ctx.lineTo(slotW*.35,0);ctx.arc(0,0,slotW*.28,0,Math.PI*2); }
      else if (seed<6) { ctx.moveTo(-slotW*.3,-slotH*.3);ctx.lineTo(slotW*.3,slotH*.3);ctx.moveTo(slotW*.3,-slotH*.3);ctx.lineTo(-slotW*.3,slotH*.3); }
      else             { ctx.moveTo(0,-slotH*.35);ctx.lineTo(slotW*.3,slotH*.1);ctx.lineTo(-slotW*.3,slotH*.1);ctx.closePath(); }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // ═══════════════════════════════════════════════════════════════
    // DRAW — Nine Chevrons with hand-triggered red glow
    // ═══════════════════════════════════════════════════════════════
    const hourAge  = now - sg.hourFlash;
    for (let i = 0; i < 9; i++) {
      const a   = (i / 9) * Math.PI*2 - Math.PI/2;
      const cx2 = Math.cos(a) * r*0.955;
      const cy2 = Math.sin(a) * r*0.955;

      // Gate-dialling lock on the hour (sequential)
      const lockDelay = i * 900;
      const isLocked  = isOnTheHour && hourAge > lockDelay && hourAge < lockDelay + 8500;
      const lockFlash = isOnTheHour && hourAge > lockDelay && hourAge < lockDelay + 350;

      // Hand-passing glow
      const handGlow  = sg.chevGlow.find(g => g.idx === i);
      const handAge   = handGlow ? (now - handGlow.born) / 1000 : 1; // 0→1 over 1 s
      const handLit   = handGlow && handAge < 1.0;
      // Glow fades: bright at 0, gone at 1
      const handFade  = handLit ? Math.pow(1 - handAge, 1.5) : 0;

      const litByHour = isLocked || lockFlash;
      const isRed     = litByHour || handLit;

      ctx.save();
      ctx.translate(cx2, cy2); ctx.rotate(a + Math.PI/2);
      const cW=r*0.088, cH=r*0.130, cW2=cW*0.5;

      // Housing block
      ctx.beginPath();
      ctx.moveTo(-cW2,cH*.28); ctx.lineTo(-cW2*.72,-cH*.22);
      ctx.lineTo(-cW2*.38,-cH*.52); ctx.lineTo(cW2*.38,-cH*.52);
      ctx.lineTo(cW2*.72,-cH*.22); ctx.lineTo(cW2,cH*.28); ctx.closePath();
      const bg=ctx.createLinearGradient(-cW2,-cH*.52,cW2,cH*.28);
      bg.addColorStop(0,'#3a3f45'); bg.addColorStop(.5,'#282c30'); bg.addColorStop(1,'#1c1f22');
      ctx.fillStyle=bg; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.lineWidth=0.7; ctx.stroke();

      // Crystal V-shape
      const vW=cW*.70, vH=cH*.72, vW2=vW*.5;
      ctx.beginPath();
      ctx.moveTo(0,-vH*.52); ctx.lineTo(vW2,vH*.28); ctx.lineTo(vW2*.4,vH*.28);
      ctx.lineTo(0,-vH*.10); ctx.lineTo(-vW2*.4,vH*.28); ctx.lineTo(-vW2,vH*.28);
      ctx.closePath();

      if (isRed) {
        const rg=ctx.createLinearGradient(0,-vH*.52,0,vH*.28);
        if (lockFlash) {
          rg.addColorStop(0,'#FFFFFF'); rg.addColorStop(.3,'#FFAAAA'); rg.addColorStop(1,'#FF2200');
        } else {
          // Mix between lock-red and hand-glow-red
          const bright = litByHour ? 1 : handFade;
          rg.addColorStop(0, `rgba(255,${Math.round(80+bright*26)},${Math.round(bright*20)},1)`);
          rg.addColorStop(.5,'#FF2000');
          rg.addColorStop(1,'#CC1100');
        }
        ctx.fillStyle=rg;
        const glowStr = lockFlash ? 28 : (litByHour ? 20 : handFade * 22);
        ctx.shadowColor='rgba(255,30,0,0.95)'; ctx.shadowBlur=glowStr;
      } else {
        const ug=ctx.createLinearGradient(0,-vH*.52,0,vH*.28);
        ug.addColorStop(0,'#4a4030'); ug.addColorStop(.5,'#2e2818'); ug.addColorStop(1,'#1a1408');
        ctx.fillStyle=ug; ctx.shadowBlur=0;
      }
      ctx.fill();

      // Specular highlight
      ctx.beginPath();
      ctx.moveTo(-vW2*.25,-vH*.45); ctx.lineTo(vW2*.15,-vH*.10);
      ctx.lineTo(vW2*.05,-vH*.10);  ctx.lineTo(-vW2*.32,-vH*.45);
      ctx.closePath();
      ctx.fillStyle = isRed ? `rgba(255,200,180,${lockFlash?0.55:handFade*0.45})` : 'rgba(255,255,200,0.12)';
      ctx.shadowBlur=0; ctx.fill();
      ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════
    // DRAW — Blit fluid simulation into portal opening
    // ═══════════════════════════════════════════════════════════════
    const pd = rPortal * 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(0,0,rPortal,0,Math.PI*2); ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sg.offCanvas, -rPortal, -rPortal, pd, pd);

    // Subtle centre glow (small, doesn't wash out the ripples)
    const cp = Math.sin(T * 1.1) * 0.5 + 0.5;
    const cg = ctx.createRadialGradient(0,0,0,0,0,rPortal*0.22);
    cg.addColorStop(0,   `rgba(200,240,255,${0.35 + cp*0.15})`);
    cg.addColorStop(0.4, `rgba(80,160,255,0.10)`);
    cg.addColorStop(1,   'rgba(0,20,80,0)');
    ctx.fillStyle=cg; ctx.fillRect(-rPortal,-rPortal,pd,pd);
    ctx.restore();

    // ═══════════════════════════════════════════════════════════════
    // DRAW — Event horizon rim glow
    // ═══════════════════════════════════════════════════════════════
    ctx.save();
    ctx.beginPath(); ctx.arc(0,0,rPortal+r*0.010,0,Math.PI*2);
    ctx.strokeStyle=`rgba(60,160,255,${0.50+Math.sin(T*1.4)*0.10})`;
    ctx.lineWidth=r*0.018; ctx.shadowColor='rgba(0,140,255,0.85)'; ctx.shadowBlur=14;
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,rPortal-r*0.005,0,Math.PI*2);
    ctx.strokeStyle=`rgba(180,230,255,${0.35+Math.sin(T*0.9)*0.08})`;
    ctx.lineWidth=r*0.006; ctx.shadowBlur=6; ctx.stroke();

    // Outer bezel
    ctx.beginPath(); ctx.arc(0,0,rOuter-1,0,Math.PI*2);
    const bz=ctx.createLinearGradient(-rOuter,-rOuter,rOuter,rOuter);
    bz.addColorStop(0,'rgba(200,210,220,0.20)'); bz.addColorStop(.5,'rgba(200,210,220,0.16)');
    bz.addColorStop(1,'rgba(180,190,200,0.18)');
    ctx.strokeStyle=bz; ctx.lineWidth=1.5; ctx.shadowBlur=0; ctx.stroke();
    ctx.restore();
  }
  // ── Hands ─────────────────────────────────────────────────────────
  _drawHands(r, h, m, s, secondAngle) {
    const ctx   = this.ctx;
    const cfg   = this._config;
    const face  = cfg.face || 'classic';
    const hCol  = cfg.hour_hand_color   || '#FFFFFF';
    const mCol  = cfg.minute_hand_color || '#FFFFFF';
    const sCol  = cfg.second_hand_color || '#FF3B30';

    const hourAngle = ((h % 12 + m / 60 + s / 3600) / 12) * 2 * Math.PI;
    const minAngle  = ((m + s / 60) / 60) * 2 * Math.PI;

    const isLuxury   = face === 'luxury'   || face === 'art_deco';
    const isNeon     = face === 'neon'     || face === 'celestial' || face === 'stargate';
    const isMinimal  = face === 'minimal';

    if (isNeon) {
      this._handNeon(r, hourAngle, r * 0.50, r * 0.060, hCol);
      this._handNeon(r, minAngle,  r * 0.70, r * 0.042, mCol);
    } else if (isLuxury) {
      this._handBaton(r, hourAngle, r * 0.48, r * 0.038, hCol);
      this._handBaton(r, minAngle,  r * 0.67, r * 0.026, mCol);
    } else if (isMinimal) {
      this._handStick(r, hourAngle, r * 0.49, r * 0.024, r * 0.10, hCol);
      this._handStick(r, minAngle,  r * 0.69, r * 0.016, r * 0.08, mCol);
    } else {
      // Tapered hands for classic / roman / modern / skeleton / retro / sport
      this._handTapered(r, hourAngle, r * 0.50, r * 0.052, r * 0.095, hCol);
      this._handTapered(r, minAngle,  r * 0.70, r * 0.035, r * 0.080, mCol);
    }

    // Second hand
    if (cfg.show_seconds && secondAngle !== undefined) {
      this._handSecond(r, secondAngle, sCol, isNeon);
    }

    // Centre cap
    ctx.beginPath(); ctx.arc(0, 0, r * 0.054, 0, 2 * Math.PI);
    ctx.fillStyle = (cfg.show_seconds && secondAngle !== undefined) ? sCol : hCol;
    ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.024, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fill();
  }

  _handTapered(r, angle, length, width, tailLen, color) {
    const ctx = this.ctx;
    ctx.save(); ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.moveTo(-width * 0.55, tailLen);
    ctx.quadraticCurveTo(-width, 0, -width * 0.12, -length * 0.62);
    ctx.lineTo(0, -length);
    ctx.lineTo(width * 0.12, -length * 0.62);
    ctx.quadraticCurveTo(width, 0, width * 0.55, tailLen);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }

  _handStick(r, angle, length, width, tailLen, color) {
    const ctx = this.ctx;
    ctx.save(); ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.roundRect(-width / 2, -length, width, length + tailLen, width / 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }

  _handBaton(r, angle, length, width, color) {
    const ctx = this.ctx;
    ctx.save(); ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    const tailLen = r * 0.115;
    ctx.fillStyle = color;
    ctx.roundRect(-width / 2, -length, width, length + tailLen, width / 2);
    ctx.fill();
    // Highlight stripe
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.roundRect(-width * 0.18, -length + width * 0.8, width * 0.36, (length - width) * 0.48, width * 0.18);
    ctx.fill();
    ctx.restore();
  }

  _handNeon(r, angle, length, width, color) {
    const ctx = this.ctx;
    ctx.save(); ctx.rotate(angle);
    // Glow layer
    ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r * 0.115); ctx.lineTo(0, -length); ctx.stroke();
    // Bright core
    ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = width * 0.38;
    ctx.beginPath(); ctx.moveTo(0, r * 0.10); ctx.lineTo(0, -length); ctx.stroke();
    ctx.restore();
  }

  _handSecond(r, angle, color, glowMode) {
    const ctx = this.ctx;
    ctx.save(); ctx.rotate(angle);
    if (glowMode) {
      ctx.shadowColor = color; ctx.shadowBlur = 10;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
    }
    // Main shaft
    ctx.strokeStyle = color; ctx.lineWidth = r * 0.017; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r * 0.23); ctx.lineTo(0, -r * 0.79); ctx.stroke();
    // Lollipop counterweight
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(0, r * 0.135, r * 0.038, 0, 2 * Math.PI);
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN CARD CLASS
// ═══════════════════════════════════════════════════════════════════

class CrocodileClockCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._raf          = null;
    this._lastSec      = -1;
    this._springFrom   = 0;
    this._springTarget = 0;
    this._springStart  = 0;
    this._currAngle    = 0;
    this._ro           = null;
  }

  static getConfigElement() {
    return document.createElement('crocodile-clock-card-editor');
  }

  static getStubConfig() {
    return {
      face:              'classic',
      show_seconds:      true,
      seconds_style:     'smooth',
      popup_format:      '12',
      card_background:   '#1C1C1E',
      card_opacity:      88,
      dial_color:        '#1C1C1E',
      dial_text_color:   '#FFFFFF',
      hour_hand_color:   '#FFFFFF',
      minute_hand_color: '#FFFFFF',
      second_hand_color: '#FF3B30',
      accent_color:      '#007AFF',
      show_date:         false,
      popup_url:         '',
    };
  }

  getCardSize() { return 4; }

  setConfig(config) {
    this._config = { ...CrocodileClockCard.getStubConfig(), ...config };
    this._buildCard();
  }

  set hass(h) {
    this._hass = h;
    // Start clock on first hass assignment (timezone info now available)
    if (!this._raf && this._config) this._startClock();
  }

  connectedCallback() {
    if (this._config && this._hass && !this._raf) this._startClock();
  }

  disconnectedCallback() {
    if (this._raf)  { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this._ro)   { this._ro.disconnect(); this._ro = null; }
  }

  // ── Resolve background CSS value ──────────────────────────────────
  _resolveBg() {
    const cfg = this._config;
    const raw = cfg.card_background || '#1C1C1E';
    if (raw === 'transparent') return 'transparent';
    const op = Math.min(1, Math.max(0, (cfg.card_opacity ?? 88) / 100));
    return _ccHexToRgba(raw, op);
  }

  // ── Build the card DOM ────────────────────────────────────────────
  _buildCard() {
    if (this._raf)  { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this._ro)   { this._ro.disconnect(); this._ro = null; }

    const cfg   = this._config;
    const bg    = this._resolveBg();

    this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :host { display:block; }
        ha-card {
          background: ${bg};
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          transition: transform 0.18s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.18s ease;
        }
        ha-card:active { transform: scale(0.960); }
        .cc-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 16px 16px;
          gap: 10px;
        }
        canvas { display:block; border-radius:50%; }
        .cc-date {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.50);
          letter-spacing: 0.04em;
        }
      </style>
      <ha-card>
        <div class="cc-wrap">
          <canvas id="cc-canvas"></canvas>
          ${cfg.show_date ? `<div class="cc-date" id="cc-date-el"></div>` : ''}
        </div>
      </ha-card>
    `;

    const card   = this.shadowRoot.querySelector('ha-card');
    const canvas = this.shadowRoot.getElementById('cc-canvas');

    this._drawer = new CrocodileClockDrawer(canvas);
    this._drawer.setConfig(cfg);

    // Responsive canvas sizing
    this._ro = new ResizeObserver(entries => {
      const w  = entries[0]?.contentRect?.width || 280;
      const px = Math.round(Math.min(Math.max(w - 32, 100), 320));
      if (this._drawer) this._drawer.resize(px);
    });
    this._ro.observe(card);
    this._drawer.resize(220);

    card.addEventListener('click', () => this._openPopup());
    // Wait for hass so timezone info is available before starting the clock.
  }

  // ── Animation loop ────────────────────────────────────────────────
  _easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /**
   * Return timezone-correct h/m/s.
   * Mirrors analogclock.js exactly: toLocaleString each part with sv-SE + timezone,
   * then reconstruct a local Date so getHours/getMinutes/getSeconds are reliable.
   * Uses card-configured timezone → browser timezone (same default as analogclock.js).
   */
  _getTimeParts() {
    let now = new Date();
    const ms = now.getMilliseconds();

    const timezone = this._config?.timezone
      || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const opts = part => ({ [part]: 'numeric', timeZone: timezone });
    const year   = now.toLocaleString('sv-SE', opts('year'));
    const month  = now.toLocaleString('sv-SE', opts('month'));
    const day    = now.toLocaleString('sv-SE', opts('day'));
    const hour   = now.toLocaleString('sv-SE', opts('hour'));
    const minute = now.toLocaleString('sv-SE', opts('minute'));
    const second = now.toLocaleString('sv-SE', opts('second'));

    // Reconstruct a local Date from timezone-adjusted components — same
    // technique as analogclock.js — so getHours/getMinutes are unambiguous.
    now = new Date(year, month - 1, day, hour, minute, second);

    return { h: now.getHours(), m: now.getMinutes(), s: now.getSeconds(), ms };
  }

  _startClock() {
    const tick = () => {
      const cfg              = this._config;
      const { h, m, s, ms } = this._getTimeParts();

      let secAngle;
      if (cfg.show_seconds) {
        if (cfg.seconds_style === 'tick') {
          // ── Tick with mechanical spring overshoot ──────────────────
          const now    = Date.now();
          const rawSec = Math.floor(now / 1000);
          if (rawSec !== this._lastSec) {
            this._lastSec      = rawSec;
            this._springFrom   = this._currAngle;
            this._springTarget = (s / 60) * 2 * Math.PI;
            // Wrap-around: always move forward
            if (this._springTarget < this._springFrom - Math.PI) {
              this._springTarget += 2 * Math.PI;
            }
            this._springStart = now;
          }
          const elapsed   = (Date.now() - this._springStart) / 1000;
          const DURATION  = 0.32;
          const t         = Math.min(elapsed / DURATION, 1);
          const OVERSHOOT = 6.5 * Math.PI / 180; // 6.5° overshoot
          const progress  = this._easeOutCubic(t);
          const bounce    = OVERSHOOT * Math.sin(t * Math.PI) * (1 - t * 0.80);
          secAngle        = this._springFrom + (this._springTarget - this._springFrom) * progress + bounce;
          this._currAngle = secAngle;
        } else {
          // ── Smooth sweep ───────────────────────────────────────────
          secAngle        = ((s + ms / 1000) / 60) * 2 * Math.PI;
          this._currAngle = secAngle;
        }
      }

      // Update date label using timezone-aware formatting
      const dateEl = this.shadowRoot.getElementById('cc-date-el');
      if (dateEl) {
        const tz = this._config?.timezone
          || Intl.DateTimeFormat().resolvedOptions().timeZone;
        dateEl.textContent = new Date().toLocaleDateString('en-GB', {
          weekday: 'short', month: 'short', day: 'numeric', timeZone: tz,
        });
      }

      if (this._drawer) this._drawer.draw(h, m, s, secAngle);
      this._raf = requestAnimationFrame(tick);
    };

    this._raf = requestAnimationFrame(tick);
  }

  // ── Popup ─────────────────────────────────────────────────────────
  _openPopup() {
    const cfg      = this._config;
    const accent   = cfg.accent_color    || '#007AFF';
    const format   = cfg.popup_format    || '12';

    document.getElementById('cc-popup-overlay')?.remove();

    const today     = new Date();
    let   viewYear  = today.getFullYear();
    let   viewMonth = today.getMonth();

    const overlay = document.createElement('div');
    overlay.id    = 'cc-popup-overlay';
    Object.assign(overlay.style, {
      position:         'fixed',
      inset:            '0',
      zIndex:           '99999',
      display:          'flex',
      alignItems:       'center',
      justifyContent:   'center',
      padding:          '20px',
      background:       'rgba(0,0,0,0.65)',
      backdropFilter:   'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      animation:        'ccFadeIn 0.22s ease',
    });

    const styleEl = document.createElement('style');
    styleEl.textContent = CC_KEYFRAMES + `
      .cc-popup { animation: ccSlideUp 0.30s cubic-bezier(0.34,1.3,0.64,1) both; }
      .cc-cal-day {
        width:36px; height:36px; border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        font-size:14px; font-weight:500; cursor:default;
        transition: background 0.12s;
      }
      .cc-cal-day.today {
        background: ${accent};
        color: #fff;
        font-weight: 700;
        box-shadow: 0 0 0 4px ${accent}33;
      }
      .cc-cal-day.other-month { opacity:0.28; }
      .cc-cal-nav {
        background: rgba(255,255,255,0.08);
        border: none; border-radius: 50%;
        width: 36px; height: 36px;
        cursor: pointer; display: flex;
        align-items: center; justify-content: center;
        color: #fff; transition: background 0.15s; flex-shrink: 0;
      }
      .cc-cal-nav:hover { background: rgba(255,255,255,0.16); }
      .cc-today-btn {
        background: ${accent}1A;
        border: 1px solid ${accent}55;
        border-radius: 8px; padding: 5px 14px;
        cursor: pointer; color: ${accent};
        font-size: 12px; font-weight: 600; font-family: inherit;
        transition: background 0.15s;
      }
      .cc-today-btn:hover { background: ${accent}2F; }
    `;
    overlay.appendChild(styleEl);

    // ── Panel ──
    const panel = document.createElement('div');
    panel.className = 'cc-popup';
    Object.assign(panel.style, {
      background:       'rgba(22,22,24,0.97)',
      backdropFilter:   'blur(52px) saturate(200%)',
      WebkitBackdropFilter: 'blur(52px) saturate(200%)',
      border:           '1px solid rgba(255,255,255,0.11)',
      borderRadius:     '28px',
      padding:          '26px 22px 22px',
      width:            '100%',
      maxWidth:         '420px',
      maxHeight:        '92vh',
      overflowY:        'auto',
      fontFamily:       "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
      color:            '#fff',
      position:         'relative',
    });
    panel.addEventListener('click', e => e.stopPropagation());

    // Close button
    const closeBtn = document.createElement('button');
    Object.assign(closeBtn.style, {
      position:       'absolute', top: '18px', right: '18px',
      background:     'rgba(255,255,255,0.09)',
      border:         'none', borderRadius: '50%',
      width:          '30px', height: '30px',
      cursor:         'pointer', display: 'flex',
      alignItems:     'center', justifyContent: 'center',
      color:          'rgba(255,255,255,0.60)', fontSize: '16px',
      fontFamily:     'inherit',
    });
    closeBtn.textContent = '✕';

    // ── Digital clock ──
    const timeEl = document.createElement('div');
    Object.assign(timeEl.style, {
      fontSize:          '76px',
      fontWeight:        '200',
      letterSpacing:     '-4px',
      textAlign:         'center',
      lineHeight:        '1',
      marginBottom:      '4px',
      fontVariantNumeric:'tabular-nums',
    });

    const ampmEl = document.createElement('div');
    Object.assign(ampmEl.style, {
      fontSize: '20px', fontWeight: '500',
      color: 'rgba(255,255,255,0.40)',
      textAlign: 'center', letterSpacing: '0.07em',
      minHeight: '26px', marginBottom: '6px',
    });

    const fullDateEl = document.createElement('div');
    Object.assign(fullDateEl.style, {
      fontSize: '14px', fontWeight: '400',
      color: 'rgba(255,255,255,0.45)',
      textAlign: 'center', marginBottom: '22px',
    });

    let timeInterval;
    const self = this;
    const updateTime = () => {
      const { h: _h, m: _m, s: _s } = self._getTimeParts();
      const mm  = String(_m).padStart(2, '0');
      const ss  = String(_s).padStart(2, '0');
      const sp  = cfg.show_seconds ? `:${ss}` : '';
      if (format === '12') {
        const ampm = _h >= 12 ? 'PM' : 'AM';
        const hh12 = _h % 12 || 12;
        timeEl.textContent = `${String(hh12).padStart(2, '0')}:${mm}${sp}`;
        ampmEl.textContent = ampm;
      } else {
        timeEl.textContent = `${String(_h).padStart(2, '0')}:${mm}${sp}`;
        ampmEl.textContent = '';
      }
      const tz = cfg.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      fullDateEl.textContent = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz,
      });
    };
    timeInterval = setInterval(updateTime, 500);
    updateTime();

    // ── Divider ──
    const divider = document.createElement('div');
    Object.assign(divider.style, {
      width: '100%', height: '1px',
      background: 'rgba(255,255,255,0.08)',
      margin: '0 0 20px',
    });

    // ── Calendar ──
    const MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

    const calWrap = document.createElement('div');
    calWrap.id    = 'cc-calendar';

    const buildCalendar = () => {
      calWrap.innerHTML = '';

      // Header
      const hdr = document.createElement('div');
      Object.assign(hdr.style, {
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: '14px',
      });

      const prevBtn = document.createElement('button');
      prevBtn.className = 'cc-cal-nav';
      prevBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/></svg>`;
      prevBtn.onclick   = () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } buildCalendar(); };

      const nextBtn = document.createElement('button');
      nextBtn.className = 'cc-cal-nav';
      nextBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>`;
      nextBtn.onclick   = () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } buildCalendar(); };

      const todayBtn = document.createElement('button');
      todayBtn.className  = 'cc-today-btn';
      todayBtn.textContent = 'Today';
      todayBtn.onclick     = () => { viewYear = today.getFullYear(); viewMonth = today.getMonth(); buildCalendar(); };

      const lbl = document.createElement('div');
      Object.assign(lbl.style, {
        fontSize: '17px', fontWeight: '700', letterSpacing: '-0.3px',
        flex: '1', textAlign: 'center', margin: '0 6px',
      });
      lbl.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

      hdr.appendChild(prevBtn);
      hdr.appendChild(lbl);
      hdr.appendChild(todayBtn);
      hdr.appendChild(nextBtn);
      calWrap.appendChild(hdr);

      // Day-name header row
      const dnRow = document.createElement('div');
      Object.assign(dnRow.style, {
        display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: '4px',
      });
      DAY_LABELS.forEach(d => {
        const el = document.createElement('div');
        Object.assign(el.style, {
          textAlign: 'center', fontSize: '11px', fontWeight: '600',
          color: 'rgba(255,255,255,0.30)', padding: '4px 0', letterSpacing: '0.04em',
        });
        el.textContent = d;
        dnRow.appendChild(el);
      });
      calWrap.appendChild(dnRow);

      // Day grid (Monday-first)
      const grid = document.createElement('div');
      Object.assign(grid.style, {
        display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px',
      });

      const firstDay       = new Date(viewYear, viewMonth, 1);
      const startOffset    = (firstDay.getDay() + 6) % 7; // Mon=0
      const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();
      const prevMonthDays  = new Date(viewYear, viewMonth, 0).getDate();

      // Prev month trailing
      for (let i = startOffset - 1; i >= 0; i--) {
        const d = document.createElement('div');
        d.className = 'cc-cal-day other-month';
        d.style.cssText = 'display:flex;align-items:center;justify-content:center;';
        d.textContent = prevMonthDays - i;
        grid.appendChild(d);
      }
      // Current month
      for (let i = 1; i <= daysInMonth; i++) {
        const isToday = i === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
        const d = document.createElement('div');
        d.className = 'cc-cal-day' + (isToday ? ' today' : '');
        d.style.cssText = 'display:flex;align-items:center;justify-content:center;';
        d.textContent = i;
        grid.appendChild(d);
      }
      // Next month leading
      const total     = startOffset + daysInMonth;
      const remaining = (7 - (total % 7)) % 7;
      for (let i = 1; i <= remaining; i++) {
        const d = document.createElement('div');
        d.className = 'cc-cal-day other-month';
        d.style.cssText = 'display:flex;align-items:center;justify-content:center;';
        d.textContent = i;
        grid.appendChild(d);
      }

      calWrap.appendChild(grid);
    };

    buildCalendar();

    // ── Optional URL link ──
    const popupUrl = (cfg.popup_url || '').trim();
    let urlEl = null;
    if (popupUrl) {
      urlEl = document.createElement('a');
      urlEl.href   = popupUrl;
      urlEl.target = '_blank';
      urlEl.rel    = 'noopener noreferrer';
      Object.assign(urlEl.style, {
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '7px',
        marginTop:      '20px',
        padding:        '11px 18px',
        borderRadius:   '12px',
        background:     `${accent}18`,
        border:         `1px solid ${accent}44`,
        color:          accent,
        fontSize:       '13px',
        fontWeight:     '600',
        textDecoration: 'none',
        letterSpacing:  '0.01em',
        transition:     'background 0.15s',
        wordBreak:      'break-all',
      });
      urlEl.addEventListener('mouseover', () => urlEl.style.background = `${accent}28`);
      urlEl.addEventListener('mouseout',  () => urlEl.style.background = `${accent}18`);
      // Icon + label
      const linkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      linkIcon.setAttribute('viewBox', '0 0 24 24');
      linkIcon.setAttribute('width', '15');
      linkIcon.setAttribute('height', '15');
      linkIcon.setAttribute('fill', 'currentColor');
      linkIcon.innerHTML = '<path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>';
      const customTitle = (cfg.popup_url_title || '').trim();
      let displayUrl = customTitle;
      if (!displayUrl) {
        displayUrl = popupUrl;
        try { displayUrl = new URL(popupUrl).hostname || popupUrl; } catch (_) {}
      }
      urlEl.appendChild(linkIcon);
      urlEl.appendChild(document.createTextNode(displayUrl));
    }

    // ── Assemble ──
    panel.appendChild(closeBtn);
    panel.appendChild(timeEl);
    panel.appendChild(ampmEl);
    panel.appendChild(fullDateEl);
    panel.appendChild(divider);
    panel.appendChild(calWrap);
    if (urlEl) panel.appendChild(urlEl);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const close = () => { clearInterval(timeInterval); overlay.remove(); };
    closeBtn.onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    const onKey = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  EDITOR CLASS
// ═══════════════════════════════════════════════════════════════════

class CrocodileClockCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  setConfig(config) {
    this._config = { ...CrocodileClockCard.getStubConfig(), ...config };
    if (this.shadowRoot.children.length) this._buildEditor();
  }

  set hass(_h) {
    if (!this.shadowRoot.children.length) this._buildEditor();
  }

  connectedCallback() { this._buildEditor(); }

  _buildEditor() {
    const cfg = this._config;
    if (!cfg) return;

    const faceGrid = CC_FACES.map(f => `
      <label class="face-option ${cfg.face === f.value ? 'selected' : ''}">
        <input type="radio" name="cc_face" value="${f.value}" ${cfg.face === f.value ? 'checked' : ''}>
        <div class="face-preview">
          <span class="face-symbol">${f.symbol}</span>
          <span class="face-label">${f.label}</span>
        </div>
      </label>
    `).join('');

    this.shadowRoot.innerHTML = `
      <style>${CC_EDITOR_CSS}</style>
      <div class="container">

        <!-- ── Clock Face ── -->
        <div>
          <div class="section-title">Clock Face</div>
          <div class="card-block">
            <div class="face-grid">${faceGrid}</div>
          </div>
        </div>

        <!-- ── Second Hand ── -->
        <div>
          <div class="section-title">Second Hand</div>
          <div class="card-block">
            <div class="toggle-item">
              <div class="toggle-left">
                <span class="toggle-icon">⏱️</span>
                <div>
                  <div class="toggle-label">Show Seconds Hand</div>
                </div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="cc_show_seconds" ${cfg.show_seconds ? 'checked' : ''}>
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="select-row" style="border-top:1px solid var(--divider-color,rgba(0,0,0,0.06));">
              <label>Movement Style</label>
              <div class="hint" style="margin-bottom:8px;">
                <b>Smooth</b> — Continuous sweep like a high-end luxury watch. &nbsp;
                <b>Tick</b> — Each second jumps forward with a mechanical overshoot that snaps back, giving a genuine clockwork feel.
              </div>
              <div class="segmented">
                <input type="radio" name="cc_secs" id="cc_ss_s" value="smooth"
                  ${(cfg.seconds_style || 'smooth') === 'smooth' ? 'checked' : ''}>
                <label for="cc_ss_s">🔄 Smooth</label>
                <input type="radio" name="cc_secs" id="cc_ss_t" value="tick"
                  ${cfg.seconds_style === 'tick' ? 'checked' : ''}>
                <label for="cc_ss_t">⚙️ Tick</label>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Popup Clock Format ── -->
        <div>
          <div class="section-title">Popup Clock Format</div>
          <div class="card-block" style="padding:12px;">
            <div class="segmented">
              <input type="radio" name="cc_pfmt" id="cc_pf12" value="12"
                ${(cfg.popup_format || '12') === '12' ? 'checked' : ''}>
              <label for="cc_pf12">🕐 12-hour AM/PM</label>
              <input type="radio" name="cc_pfmt" id="cc_pf24" value="24"
                ${cfg.popup_format === '24' ? 'checked' : ''}>
              <label for="cc_pf24">🕛 24-hour</label>
            </div>
          </div>
        </div>

        <!-- ── Display Options ── -->
        <div>
          <div class="section-title">Display Options</div>
          <div class="card-block">
            <div class="toggle-item">
              <div class="toggle-left">
                <span class="toggle-icon">📅</span>
                <div>
                  <div class="toggle-label">Show Date Below Clock</div>
                  <div class="toggle-sublabel">Displays today's date under the clock face on the card</div>
                </div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="cc_show_date" ${cfg.show_date ? 'checked' : ''}>
                <span class="toggle-track"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- ── Colours ── -->
        <div>
          <div class="section-title">Colours</div>
          <div class="card-block">
            ${this._colorRow('card_background',   '🪟', 'Card Background',   cfg.card_background,   true)}
            ${this._colorRow('dial_color',         '⬛', 'Clock Dial',         cfg.dial_color,         true)}
            ${this._colorRow('dial_text_color',    '🔤', 'Dial Text & Marks',  cfg.dial_text_color,    false)}
            ${this._colorRow('hour_hand_color',    '⬜', 'Hour Hand',          cfg.hour_hand_color,    false)}
            ${this._colorRow('minute_hand_color',  '⬜', 'Minute Hand',        cfg.minute_hand_color,  false)}
            ${this._colorRow('second_hand_color',  '🔴', 'Second Hand',        cfg.second_hand_color,  false)}
            ${this._colorRow('accent_color',       '✨', 'Accent / Highlight', cfg.accent_color,       false)}
          </div>
        </div>

        <!-- ── Background Opacity ── -->
        <div id="cc-opacity-wrap"
          style="${cfg.card_background === 'transparent' ? 'display:none' : ''}">
          <div class="section-title">Background Opacity</div>
          <div class="card-block">
            <div class="opacity-row">
              <label>
                Opacity
                <span id="cc-op-lbl">${cfg.card_opacity ?? 88}%</span>
              </label>
              <input type="range" id="cc_card_opacity"
                min="10" max="100" step="5" value="${cfg.card_opacity ?? 88}">
            </div>
          </div>
        </div>

        <!-- ── Popup URL ── -->
        <div>
          <div class="section-title">
            Popup Link
            <span style="font-weight:400;text-transform:none;letter-spacing:0;opacity:0.6;"> — optional</span>
          </div>
          <div class="card-block">
            <div class="select-row">
              <label>URL</label>
              <div class="hint" style="margin-bottom:8px;">Opens as a link at the bottom of the popup calendar. Leave blank to disable. Use <b>calshow://</b> to open the iOS Calendar app.</div>
              <input type="text" id="cc_popup_url"
                placeholder="calshow://"
                value="${cfg.popup_url || ''}">
            </div>
            <div class="select-row" style="margin-top:10px;">
              <label>Link Title</label>
              <div class="hint" style="margin-bottom:8px;">Custom label for the link. Falls back to the URL hostname if left blank.</div>
              <input type="text" id="cc_popup_url_title"
                placeholder="e.g. Open Calendar App"
                value="${cfg.popup_url_title || ''}">
            </div>
          </div>
        </div>

      </div>
    `;

    this._wire();
  }

  // Colour row HTML
  _colorRow(key, emoji, label, value, allowNone) {
    const isNone   = !value || value === 'transparent';
    const hexVal   = isNone ? '#808080' : value;
    const swatchSt = isNone
      ? 'background-image:linear-gradient(45deg,#aaa 25%,#fff 25%,#fff 50%,#aaa 50%,#aaa 75%,#fff 75%);background-size:8px 8px;'
      : `background:${value};`;

    return `
      <div class="color-row">
        <span class="color-row-icon">${emoji}</span>
        <span class="color-row-label">${label}</span>
        <div class="color-controls">
          ${allowNone
            ? `<button class="none-btn ${isNone ? 'active' : ''}" data-key="${key}">None</button>`
            : ''}
          <div class="color-swatch" data-key="${key}" style="${swatchSt}">
            <input type="color" class="cc-color-input" data-key="${key}" value="${hexVal}">
          </div>
        </div>
      </div>`;
  }

  // Wire up all listeners
  _wire() {
    const root = this.shadowRoot;

    // Face radio buttons
    root.querySelectorAll('input[name="cc_face"]').forEach(r => {
      r.onchange = () => {
        root.querySelectorAll('.face-option').forEach(o => o.classList.remove('selected'));
        r.closest('.face-option').classList.add('selected');
        this._set('face', r.value);
      };
    });

    // Boolean toggles
    [
      ['cc_show_seconds', 'show_seconds'],
      ['cc_show_date',    'show_date'],
    ].forEach(([id, key]) => {
      const el = root.getElementById(id);
      if (el) el.onchange = () => this._set(key, el.checked);
    });

    // Seconds style + popup format
    root.querySelectorAll('input[name="cc_secs"]').forEach(r => r.onchange = () => this._set('seconds_style', r.value));
    root.querySelectorAll('input[name="cc_pfmt"]').forEach(r => r.onchange = () => this._set('popup_format', r.value));

    // Popup URL
    const urlInputEl = root.getElementById('cc_popup_url');
    if (urlInputEl) urlInputEl.onchange = () => this._set('popup_url', urlInputEl.value);
    const urlTitleEl = root.getElementById('cc_popup_url_title');
    if (urlTitleEl) urlTitleEl.onchange = () => this._set('popup_url_title', urlTitleEl.value);

    // Opacity slider
    const opEl  = root.getElementById('cc_card_opacity');
    const opLbl = root.getElementById('cc-op-lbl');
    if (opEl) {
      opEl.oninput = () => {
        const v = parseInt(opEl.value, 10);
        if (opLbl) opLbl.textContent = v + '%';
        this._set('card_opacity', v);
      };
    }

    // Colour pickers
    root.querySelectorAll('.cc-color-input').forEach(inp => {
      inp.onchange = () => {
        const key    = inp.dataset.key;
        const color  = inp.value;
        const swatch = root.querySelector(`.color-swatch[data-key="${key}"]`);
        if (swatch) {
          swatch.style.background      = color;
          swatch.style.backgroundImage = 'none';
          swatch.style.backgroundSize  = '';
        }
        const nb = root.querySelector(`.none-btn[data-key="${key}"]`);
        if (nb) nb.classList.remove('active');
        if (key === 'card_background') this._setOpacityVisible(true);
        this._set(key, color);
      };
    });

    // None buttons
    root.querySelectorAll('.none-btn').forEach(btn => {
      btn.onclick = () => {
        const key    = btn.dataset.key;
        const active = btn.classList.contains('active');
        const swatch = root.querySelector(`.color-swatch[data-key="${key}"]`);
        const inp    = root.querySelector(`.cc-color-input[data-key="${key}"]`);
        if (active) {
          btn.classList.remove('active');
          const c = inp?.value || '#808080';
          if (swatch) { swatch.style.background = c; swatch.style.backgroundImage = 'none'; swatch.style.backgroundSize = ''; }
          if (key === 'card_background') this._setOpacityVisible(true);
          this._set(key, c);
        } else {
          btn.classList.add('active');
          if (swatch) {
            swatch.style.background    = '';
            swatch.style.backgroundImage = 'linear-gradient(45deg,#aaa 25%,#fff 25%,#fff 50%,#aaa 50%,#aaa 75%,#fff 75%)';
            swatch.style.backgroundSize  = '8px 8px';
          }
          if (key === 'card_background') this._setOpacityVisible(false);
          this._set(key, 'transparent');
        }
      };
    });
  }

  _setOpacityVisible(visible) {
    const wrap = this.shadowRoot.getElementById('cc-opacity-wrap');
    if (wrap) wrap.style.display = visible ? '' : 'none';
  }

  _set(key, value) {
    this._config = { ...this._config, [key]: value };
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config }, bubbles: true, composed: true,
    }));
  }
}

// ── Registration ──────────────────────────────────────────────────
if (!customElements.get('crocodile-clock-card')) {
  customElements.define('crocodile-clock-card', CrocodileClockCard);
}
if (!customElements.get('crocodile-clock-card-editor')) {
  customElements.define('crocodile-clock-card-editor', CrocodileClockCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'crocodile-clock-card')) {
  window.customCards.push({
    type:        'crocodile-clock-card',
    name:        'Crocodile Clock Card',
    preview:     false,
    description: 'Beautiful analog clock with twelve faces including the animated Stargate portal, smooth or mechanical tick seconds, and a glassmorphic popup with digital clock and interactive calendar.',
  });
}
