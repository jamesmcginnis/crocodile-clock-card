/**
 * Crocodile Clock Card
 * Home Assistant custom Lovelace card — Beautiful analog clock with seven
 * distinct clock faces, smooth sweep or mechanical tick second hand,
 * and a glassmorphic popup with digital clock + interactive calendar.
 *
 * Repository: https://github.com/jamesmcginnis/crocodile-clock-card
 * Author:     James McGinnis
 */

const CC_VERSION = '1.4.0';

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
  { value: 'classic',  label: 'Classic',  symbol: '🕐' },
  { value: 'minimal',  label: 'Minimal',  symbol: '·' },
  { value: 'roman',    label: 'Roman',    symbol: 'XII' },
  { value: 'modern',   label: 'Modern',   symbol: '3' },
  { value: 'luxury',   label: 'Luxury',   symbol: '✦' },
  { value: 'skeleton', label: 'Skeleton', symbol: '⚙' },
  { value: 'neon',     label: 'Neon',     symbol: '◎' },
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

    this._drawFace(r);
    this._drawHands(r, h, m, s, secondAngle);

    ctx.restore();
  }

  // ── Face ─────────────────────────────────────────────────────────
  _drawFace(r) {
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
      case 'minimal':  this._faceMinimal(r, accent, text);  break;
      case 'roman':    this._faceRoman(r, accent, text);    break;
      case 'modern':   this._faceModern(r, accent, text);   break;
      case 'luxury':   this._faceLuxury(r, accent, text);   break;
      case 'skeleton': this._faceSkeleton(r, accent, text); break;
      case 'neon':     this._faceNeon(r, accent, text);     break;
      default:         this._faceClassic(r, accent, text);  break;
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

  // ── Hands ─────────────────────────────────────────────────────────
  _drawHands(r, h, m, s, secondAngle) {
    const ctx   = this.ctx;
    const cfg   = this._config;
    const face  = cfg.face || 'classic';
    const hCol  = cfg.hour_hand_color   || '#FFFFFF';
    const mCol  = cfg.minute_hand_color || '#FFFFFF';
    const sCol  = cfg.second_hand_color || '#FF3B30';

    const hourAngle = ((h % 12 + m / 60 + s / 3600) / 12) * 2 * Math.PI - Math.PI / 2;
    const minAngle  = ((m + s / 60) / 60) * 2 * Math.PI - Math.PI / 2;

    const isLuxury  = face === 'luxury';
    const isNeon    = face === 'neon';
    const isMinimal = face === 'minimal';

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
      // Tapered hands for classic / roman / modern / skeleton
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
      timezone:          '',
    };
  }

  getCardSize() { return 4; }

  setConfig(config) {
    this._config = { ...CrocodileClockCard.getStubConfig(), ...config };
    this._buildCard();
  }

  set hass(h) {
    this._hass = h;
    // Start clock on first hass assignment (tz now available)
    if (!this._raf && this._config) this._startClock();
  }

  connectedCallback() {
    if (this._config && !this._raf) this._startClock();
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
        .cc-tap-hint {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
          font-size: 10px;
          color: rgba(255,255,255,0.20);
          letter-spacing: 0.06em;
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
    this._startClock();
  }

  // ── Animation loop ────────────────────────────────────────────────
  _easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  // Return current time parts in the configured timezone (or browser local time).
  _haTimeParts() {
    const now = new Date();
    const tz  = (this._config?.timezone || '').trim();
    if (tz) {
      try {
        const fmt = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour:     'numeric',
          minute:   'numeric',
          second:   'numeric',
          hour12:   false,
        });
        const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
        const h  = parseInt(parts.hour,   10) % 24;
        const m  = parseInt(parts.minute, 10);
        const s  = parseInt(parts.second, 10);
        return { h, m, s, ms: now.getMilliseconds() };
      } catch (_) { /* invalid tz — fall through */ }
    }
    return {
      h:  now.getHours(),
      m:  now.getMinutes(),
      s:  now.getSeconds(),
      ms: now.getMilliseconds(),
    };
  }

  _startClock() {
    const tick = () => {
      const { h, m, s, ms } = this._haTimeParts();
      const now = new Date();
      const cfg = this._config;

      let secAngle;
      if (cfg.show_seconds) {
        if (cfg.seconds_style === 'tick') {
          // ── Tick with mechanical spring overshoot ──────────────────
          const rawSec = Math.floor(now.getTime() / 1000);
          if (rawSec !== this._lastSec) {
            this._lastSec      = rawSec;
            this._springFrom   = this._currAngle;
            this._springTarget = (s / 60) * 2 * Math.PI - Math.PI / 2;
            // Wrap-around: always move forward
            if (this._springTarget < this._springFrom - Math.PI) {
              this._springTarget += 2 * Math.PI;
            }
            this._springStart = now.getTime();
          }
          const elapsed      = (now.getTime() - this._springStart) / 1000;
          const DURATION     = 0.32;
          const t            = Math.min(elapsed / DURATION, 1);
          const OVERSHOOT    = 6.5 * Math.PI / 180; // 6.5° overshoot
          const progress     = this._easeOutCubic(t);
          // Spring: peaks mid-animation then settles
          const bounce       = OVERSHOOT * Math.sin(t * Math.PI) * (1 - t * 0.80);
          secAngle           = this._springFrom + (this._springTarget - this._springFrom) * progress + bounce;
          this._currAngle    = secAngle;
        } else {
          // ── Smooth sweep ───────────────────────────────────────────
          secAngle = ((s + ms / 1000) / 60) * 2 * Math.PI - Math.PI / 2;
          this._currAngle = secAngle;
        }
      }

      // Update date label respecting configured timezone
      const dateEl = this.shadowRoot.getElementById('cc-date-el');
      if (dateEl) {
        const tz   = (cfg.timezone || '').trim();
        const opts = { weekday: 'short', month: 'short', day: 'numeric' };
        try {
          dateEl.textContent = new Date().toLocaleDateString('en-GB', tz ? { ...opts, timeZone: tz } : opts);
        } catch (_) {
          dateEl.textContent = new Date().toLocaleDateString('en-GB', opts);
        }
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
    const sColor   = cfg.second_hand_color || '#FF3B30';
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
      const { h: _h, m: _m, s: _s } = self._haTimeParts();
      let   hh  = _h;
      const mm  = String(_m).padStart(2, '0');
      const ss  = String(_s).padStart(2, '0');
      const sp  = cfg.show_seconds ? `:${ss}` : '';
      if (format === '12') {
        const ampm = hh >= 12 ? 'PM' : 'AM';
        hh = hh % 12 || 12;
        timeEl.textContent = `${String(hh).padStart(2, '0')}:${mm}${sp}`;
        ampmEl.textContent = ampm;
      } else {
        timeEl.textContent = `${String(hh).padStart(2, '0')}:${mm}${sp}`;
        ampmEl.textContent = '';
      }
      const _tz   = (cfg.timezone || '').trim();
      const _opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      try {
        fullDateEl.textContent = new Date().toLocaleDateString('en-GB', _tz ? { ..._opts, timeZone: _tz } : _opts);
      } catch (_) {
        fullDateEl.textContent = new Date().toLocaleDateString('en-GB', _opts);
      }
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
      // Shorten display label to hostname if long
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

        <!-- ── Timezone ── -->
        <div>
          <div class="section-title">Timezone</div>
          <div class="card-block">
            <div class="select-row">
              <label>IANA Timezone</label>
              <div class="hint" style="margin-bottom:8px;">
                Enter a timezone name such as <b>Europe/London</b>, <b>America/New_York</b>, or <b>Asia/Tokyo</b>.
                Leave blank to use your browser's local time.
              </div>
              <input type="text" id="cc_timezone"
                placeholder="e.g. Europe/London"
                value="${cfg.timezone || ''}">
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
              <div class="hint" style="margin-bottom:8px;">Opens as a link at the bottom of the popup calendar. Leave blank to disable.</div>
              <input type="text" id="cc_popup_url"
                placeholder="https://example.com"
                value="${cfg.popup_url || ''}">
            </div>
            <div class="select-row" style="margin-top:10px;">
              <label>Link Title</label>
              <div class="hint" style="margin-bottom:8px;">Custom label for the link. Falls back to the URL hostname if left blank.</div>
              <input type="text" id="cc_popup_url_title"
                placeholder="e.g. calshow://"
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

    // Title removed

    // Popup URL
    const urlInputEl = root.getElementById('cc_popup_url');
    if (urlInputEl) urlInputEl.onchange = () => this._set('popup_url', urlInputEl.value);
    const urlTitleEl = root.getElementById('cc_popup_url_title');
    if (urlTitleEl) urlTitleEl.onchange = () => this._set('popup_url_title', urlTitleEl.value);

    // Timezone
    const tzEl = root.getElementById('cc_timezone');
    if (tzEl) tzEl.onchange = () => this._set('timezone', tzEl.value.trim());

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
    description: 'Beautiful analog clock with seven faces, smooth or mechanical tick seconds, and a glassmorphic popup with digital clock and interactive calendar.',
  });
}
