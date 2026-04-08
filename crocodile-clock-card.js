/**
 * Crocodile Clock Card
 * Home Assistant custom Lovelace card — Beautiful analog clock with twelve
 * distinct clock faces, smooth sweep second hand,
 * glassmorphic popup with digital clock + interactive calendar with HA events,
 * and a visual editor for selecting clock faces and customising all settings.
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

// ── Popup / overlay animation keyframes ───────────────────────────
const CC_KEYFRAMES = `
  @keyframes ccFadeIn  { from{opacity:0}       to{opacity:1} }
  @keyframes ccSlideUp { from{transform:translateY(28px) scale(0.95);opacity:0} to{transform:none;opacity:1} }
  @keyframes ccPulse   { 0%,100%{opacity:1} 50%{opacity:0.55} }
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

// ── Editor CSS ─────────────────────────────────────────────────────
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

  resize(px) {
    this._px = px;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width  = px * dpr;
    this.canvas.height = px * dpr;
    this.canvas.style.width  = px + 'px';
    this.canvas.style.height = px + 'px';
  }

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

  _drawFace(r, h, m, s, secondAngle) {
    const ctx   = this.ctx;
    const cfg   = this._config;
    const face  = cfg.face || 'classic';
    const dial  = cfg.dial_color && cfg.dial_color !== 'transparent' ? cfg.dial_color : null;
    const accent = cfg.accent_color    || '#007AFF';
    const text   = cfg.dial_text_color || '#FFFFFF';

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - 0.5, 0, 2 * Math.PI);
    ctx.clip();
    if (dial) {
      ctx.fillStyle = dial;
      ctx.fillRect(-r, -r, r * 2, r * 2);
    }
    const vig = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();

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

  _faceClassic(r, accent, text) {
    const ctx = this.ctx;
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
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = text;
    for (let i = 1; i <= 12; i++) {
      const a  = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.font = `600 ${r * 0.148}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
      ctx.fillText(String(i), Math.cos(a) * r * 0.665, Math.sin(a) * r * 0.665);
    }
  }

  _faceMinimal(r, accent, text) {
    const ctx = this.ctx;
    for (let i = 0; i < 60; i++) {
      const a         = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const isHour    = i % 5 === 0;
      const isQuarter = i % 15 === 0;
      if (!isHour) {
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

  _faceRoman(r, accent, text) {
    const ctx      = this.ctx;
    const numerals = ['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
    const fSizes   = { XII: 0.100, VIII: 0.083, VII: 0.092, XI: 0.090, IV: 0.100 };
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
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = text;
    [[12, 0], [3, 3], [6, 6], [9, 9]].forEach(([n, i]) => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.font = `800 ${r * 0.185}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
      ctx.fillText(String(n), Math.cos(a) * r * 0.615, Math.sin(a) * r * 0.615);
    });
  }

  _faceLuxury(r, accent, text) {
    const ctx  = this.ctx;
    const gold = '#C9A84C';
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, 2 * Math.PI);
    ctx.strokeStyle = gold; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.905, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(201,168,76,0.22)'; ctx.lineWidth = 0.8; ctx.stroke();
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.865, Math.sin(a) * r * 0.865);
      ctx.lineTo(Math.cos(a) * r * 0.895, Math.sin(a) * r * 0.895);
      ctx.strokeStyle = 'rgba(201,168,76,0.5)'; ctx.lineWidth = 0.7; ctx.stroke();
    }
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
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.roundRect(-hw * 0.2, -outer + hw, hw * 0.4, (outer - inner) * 0.55, hw * 0.2);
      ctx.fill();
      ctx.restore();
    }
  }

  _faceSkeleton(r, accent, text) {
    const ctx = this.ctx;
    [0.64, 0.50].forEach(rf => {
      ctx.beginPath(); ctx.arc(0, 0, r * rf, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.8; ctx.stroke();
    });
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
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.91, Math.sin(a) * r * 0.91, r * 0.010, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    ctx.font = `600 ${r * 0.115}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
    [[12, 0], [3, 3], [6, 6], [9, 9]].forEach(([n, i]) => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.fillText(String(n), Math.cos(a) * r * 0.645, Math.sin(a) * r * 0.645);
    });
  }

  _faceNeon(r, accent, text) {
    const ctx  = this.ctx;
    const neon = accent || '#00D4FF';
    ctx.save();
    ctx.shadowColor = neon; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.895, 0, 2 * Math.PI);
    ctx.strokeStyle = neon; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.restore();
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
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.91, Math.sin(a) * r * 0.91, r * 0.010, 0, 2 * Math.PI);
      ctx.fillStyle = neon + '60'; ctx.fill();
    }
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

  _faceRetro(r, accent, text) {
    const ctx  = this.ctx;
    const warm = '#D4A853';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(212,168,83,0.40)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(212,168,83,0.16)'; ctx.lineWidth = 0.5; ctx.stroke();
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.855, Math.sin(a) * r * 0.855);
      ctx.lineTo(Math.cos(a) * r * 0.875, Math.sin(a) * r * 0.875);
      ctx.strokeStyle = 'rgba(212,168,83,0.35)'; ctx.lineWidth = 0.7; ctx.lineCap = 'butt'; ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a     = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const isQ   = i % 3 === 0;
      const inner = r * (isQ ? 0.760 : 0.820);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * r * 0.875, Math.sin(a) * r * 0.875);
      ctx.strokeStyle = warm; ctx.lineWidth = isQ ? 3.0 : 1.4; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = text;
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.font = `500 ${r * 0.128}px 'Times New Roman', Georgia, serif`;
      ctx.fillText(String(i), Math.cos(a) * r * 0.665, Math.sin(a) * r * 0.665);
    }
  }

  _faceSport(r, accent, text) {
    const ctx = this.ctx;
    for (let i = 0; i < 60; i++) {
      const a      = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const isHour = i % 5 === 0;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.915, Math.sin(a) * r * 0.915,
        isHour ? r * 0.020 : r * 0.009, 0, 2 * Math.PI);
      ctx.fillStyle = isHour ? accent : 'rgba(255,255,255,0.22)';
      ctx.fill();
    }
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
      if (isQ) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.rect(-barW * 0.22, -dist - barH + barW, barW * 0.44, barH * 0.45);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = text;
    [[12, 0], [3, 3], [6, 6], [9, 9]].forEach(([n, i]) => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.font = `900 ${r * 0.158}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
      ctx.fillText(String(n), Math.cos(a) * r * 0.615, Math.sin(a) * r * 0.615);
    });
  }

  _faceArtDeco(r, accent, text) {
    const ctx  = this.ctx;
    const gold = '#B8963E';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.905, 0, 2 * Math.PI);
    ctx.strokeStyle = gold; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.860, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(184,150,62,0.28)'; ctx.lineWidth = 0.6; ctx.stroke();
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.870, Math.sin(a) * r * 0.870);
      ctx.lineTo(Math.cos(a) * r * 0.900, Math.sin(a) * r * 0.900);
      ctx.strokeStyle = 'rgba(184,150,62,0.32)'; ctx.lineWidth = 0.6; ctx.stroke();
    }
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
    ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(184,150,62,0.18)'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [[12, 0], [3, 3], [6, 6], [9, 9]].forEach(([n, i]) => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.font      = `600 ${r * 0.132}px 'Times New Roman', Georgia, serif`;
      ctx.fillStyle = text;
      ctx.fillText(String(n), Math.cos(a) * r * 0.640, Math.sin(a) * r * 0.640);
    });
    ctx.fillStyle = 'rgba(184,150,62,0.40)';
    ctx.font      = `400 ${r * 0.075}px 'Times New Roman', Georgia, serif`;
    [1, 2, 4, 5, 7, 8, 10, 11].forEach(i => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      ctx.fillText('·', Math.cos(a) * r * 0.640, Math.sin(a) * r * 0.640);
    });
  }

  _faceCelestial(r, accent, text) {
    const ctx  = this.ctx;
    const star = accent || '#FFD700';
    [0.885, 0.650, 0.480].forEach((rf, i) => {
      ctx.beginPath(); ctx.arc(0, 0, r * rf, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(255,255,255,${0.04 + i * 0.02})`; ctx.lineWidth = 0.6; ctx.stroke();
    });
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a  = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const cx = Math.cos(a) * r * 0.885;
      const cy = Math.sin(a) * r * 0.885;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.011, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
    }
    for (let i = 0; i < 12; i++) {
      const a    = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const isMaj = i % 3 === 0;
      const dist = r * 0.820;
      const px   = Math.cos(a) * dist;
      const py   = Math.sin(a) * dist;
      ctx.save();
      ctx.translate(px, py);
      ctx.shadowColor = star; ctx.shadowBlur = isMaj ? 7 : 3;
      this._drawStar(ctx, 0, 0,
        r * (isMaj ? 0.050 : 0.028),
        r * (isMaj ? 0.022 : 0.012),
        isMaj ? 5 : 4);
      ctx.fillStyle = isMaj ? star : 'rgba(255,255,255,0.55)';
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = star; ctx.shadowColor = star; ctx.shadowBlur = 14;
    ctx.font = `700 ${r * 0.142}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', monospace`;
    ctx.fillText('12', 0, -r * 0.632);
    ctx.restore();
  }

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
  // 12 chevrons (one per clock-hour position), perspective-foreshortened
  // water-ripple puddle with no synthetic highlight blobs.
  _faceStargate(r, accent, text, h, m, s, secondAngle) {
    const ctx = this.ctx;
    const now = Date.now();
    const T   = now / 1000;
    const PI2 = Math.PI * 2;
    const isOnTheHour = (m === 0 && s < 6);

    if (!this._sg) {
      this._sg = {

        ripples: [], rippleTimer: 0,
        kawoosh: null, ringRotation: 0, lastFrame: now,
        prevMinute: -1, hourFlash: -99999,
        chevGlow: [],
        prevHourChev: -1, prevMinChev: -1, prevSecChev: -1,
        lastFiveSec: -1, allFlash: -99999, prevSecond: -1,
        // Dialling-sequence state
        dialPhase: 'idle',
        dialStart: -99999,
        dialLitCount: 0,
        dialLastLit: -99999,
        lockedChevrons: new Set(),
        dialResetPending: false,
        dialResetAt: -99999,
      };
    }
    const sg = this._sg;

    const dt = Math.min((now - sg.lastFrame) / 1000, 0.05);
    sg.ringRotation += dt * 0.018;
    sg.lastFrame = now;

    const rOuter  = r * 0.99;
    const rPortal = r * 0.745;
    const PERSP   = 0.50;


    // ── 12-chevron hand collision ──────────────────────────────────
    // angleToChev: maps a 0-based CW hand angle (0 = 12 o'clock) to chevron 0-11
    const angleToChev = a => {
      const frac = (((a % PI2) + PI2) % PI2) / PI2;
      return Math.floor(frac * 12) % 12;
    };

    const hourAngle = ((h % 12 + m / 60 + s / 3600) / 12) * PI2;
    const minAngle  = ((m + s / 60) / 60) * PI2;

    const hChev = angleToChev(hourAngle);
    const mChev = angleToChev(minAngle);
    const sChev = (secondAngle !== undefined) ? angleToChev(secondAngle) : -1;

    const triggerChev = idx => {
      if (!sg.chevGlow.find(g => g.idx === idx && now - g.born < 900))
        sg.chevGlow.push({ idx, born: now });
    };

    if (hChev !== sg.prevHourChev) { triggerChev(hChev); sg.prevHourChev = hChev; }
    if (mChev !== sg.prevMinChev)  { triggerChev(mChev); sg.prevMinChev  = mChev; }
    // (second hand chevron collision removed — 5-second bucket handles this below)

    // Every-5-seconds: light the chevron the second hand is now pointing at.
    // fiveBucket changes at s=0,5,10,…; the hand has just crossed into chevron
    // (fiveBucket % 12), but because bucket 0 covers s=0-4 (12→1 o'clock gap)
    // and the chevrons sit *at* the hour markers, we use the bucket directly —
    // chevron 0 = 12 o'clock = s=0, chevron 1 = 1 o'clock = s=5, etc.
    const fiveBucket = Math.floor(s / 5);
    if (fiveBucket !== sg.lastFiveSec) {
      sg.lastFiveSec = fiveBucket;
      // s=0 → chev 0 (12), s=5 → chev 1 (1), … s=55 → chev 11 (11)
      const fiveChev = fiveBucket % 12;
      triggerChev(fiveChev);
    }

    // Full-minute (second hand hits 12): flash ALL chevrons simultaneously
    if (s === 0 && sg.prevSecond !== 0) {
      sg.allFlash = now;
      for (let ci = 0; ci < 12; ci++) triggerChev(ci);
    }
    sg.prevSecond = s;

    sg.chevGlow = sg.chevGlow.filter(g => now - g.born < 1100);

    // ── Dialling-sequence: start at 5 s, light chevrons 1-by-1, stay lit ──
    if (s >= 5 && sg.dialPhase === 'idle') {
      sg.dialPhase    = 'dialling';
      sg.dialStart    = now;
      sg.dialLitCount = 0;
      sg.dialLastLit  = now - 999;
      sg.lockedChevrons.clear();
    }
    if (sg.dialPhase === 'dialling') {
      const CHEV_INTERVAL = 850;
      if (sg.dialLitCount < 12 && (now - sg.dialLastLit) >= CHEV_INTERVAL) {
        const nextIdx = sg.dialLitCount;
        sg.lockedChevrons.add(nextIdx);
        sg.dialLitCount++;
        sg.dialLastLit = now;
        sg.chevGlow.push({ idx: nextIdx, born: now });
      }
      if (sg.dialLitCount >= 12) sg.dialPhase = 'locked';
    }
    if (s === 0 && !sg.dialResetPending && sg.dialPhase !== 'idle') {
      sg.dialResetPending = true;
      sg.dialResetAt = now + 1400;
    }
    if (sg.dialResetPending && now >= sg.dialResetAt) {
      sg.dialResetPending = false;
      sg.dialPhase = 'idle';
      sg.dialLitCount = 0;
      sg.lockedChevrons.clear();
    }

    if (m !== sg.prevMinute) {
      sg.prevMinute = m;
      sg.kawoosh = { p: 0, maxR: rPortal * 2.8 };
      for (let i = 0; i < 6; i++) sg.ripples.push({
        r: 1, op: 0.85 - i * 0.08, born: now + i * 100,
        ox: 0, oy: 0, spd: rPortal * (0.014 - i * 0.0008),
        tilt: (Math.random() - 0.5) * 0.06,
      });
    }
    if (isOnTheHour && now - sg.hourFlash > 14000) {
      sg.hourFlash = now;
      for (let j = 0; j < 3; j++) sg.ripples.push({
        r: rPortal * (0.06 + j * 0.05), op: 0.82 - j * 0.14, born: now + j * 160,
        ox: 0, oy: 0, spd: rPortal * 0.010, tilt: 0,
      });
    }
    for (let i = sg.ripples.length - 1; i >= 0; i--) {
      const rp = sg.ripples[i];
      if (now < rp.born) continue;
      rp.r  += rp.spd;
      rp.op *= 0.971;
      if (rp.op < 0.020 || rp.r > rPortal * 1.06) sg.ripples.splice(i, 1);
    }
    if (sg.kawoosh) {
      sg.kawoosh.p += 0.024;
      if (sg.kawoosh.p >= 1) sg.kawoosh = null;
    }

    // ── DRAW 1: Stone ring ─────────────────────────────────────────
    const stoneGrad = ctx.createRadialGradient(0, 0, rPortal, 0, 0, rOuter);
    stoneGrad.addColorStop(0, '#2a2d30'); stoneGrad.addColorStop(0.18, '#1e2124');
    stoneGrad.addColorStop(0.55, '#2c3035'); stoneGrad.addColorStop(0.82, '#1a1d20');
    stoneGrad.addColorStop(1, '#131517');
    ctx.save();
    ctx.beginPath(); ctx.arc(0,0,rOuter,0,PI2); ctx.arc(0,0,rPortal,0,PI2,true);
    ctx.fillStyle = stoneGrad; ctx.fill('evenodd');
    [0.78,0.82,0.86,0.90,0.935,0.965].forEach(rf => {
      ctx.beginPath(); ctx.arc(0,0,r*rf,0,PI2);
      ctx.strokeStyle = (Math.round(rf*100))%8===0 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.22)';
      ctx.lineWidth=0.6; ctx.stroke();
    });
    ctx.restore();

    // ── DRAW 2: Portal puddle — still dark water ──────────────────
    ctx.save();
    ctx.beginPath(); ctx.arc(0,0,rPortal,0,PI2); ctx.clip();

    // Very dark water base
    ctx.fillStyle = '#000';
    ctx.fillRect(-rPortal,-rPortal,rPortal*2,rPortal*2);

    // Dark deep-water surface — subtle teal-black, slightly lighter centre
    const surfG = ctx.createRadialGradient(0, rPortal * 0.05, 0, 0, 0, rPortal * 0.98);
    surfG.addColorStop(0,    'rgba(10,28,68,1.00)');
    surfG.addColorStop(0.35, 'rgba(5,14,40,1.00)');
    surfG.addColorStop(0.70, 'rgba(2,6,22,1.00)');
    surfG.addColorStop(1,    'rgba(0,1,8,1.00)');
    ctx.fillStyle = surfG;
    ctx.beginPath(); ctx.arc(0,0,rPortal,0,PI2); ctx.fill();

    // Edge darkening vignette
    const edgeG = ctx.createRadialGradient(0,0,rPortal*0.58,0,0,rPortal);
    edgeG.addColorStop(0,'rgba(0,0,0,0)');
    edgeG.addColorStop(0.68,'rgba(0,0,0,0)');
    edgeG.addColorStop(1,'rgba(0,0,0,0.60)');
    ctx.fillStyle=edgeG;
    ctx.beginPath(); ctx.arc(0,0,rPortal,0,PI2); ctx.fill();



    // Ripple ellipses — minute-change and on-the-hour only
    for (const rp of sg.ripples) {
      if (now < rp.born || rp.r <= 0 || rp.r > rPortal * 1.05) continue;
      const rx = rp.r, ry = rx * PERSP;
      ctx.save();
      ctx.translate(rp.ox, rp.oy);
      if (rp.tilt) ctx.rotate(rp.tilt);
      ctx.globalAlpha = rp.op;

      // Dark trough
      ctx.beginPath(); ctx.ellipse(0,0,rx*1.022,ry*1.022,0,0,PI2);
      ctx.strokeStyle = 'rgba(0,4,18,0.72)';
      ctx.lineWidth = rPortal * 0.020 * Math.max(0.14, rp.op); ctx.stroke();

      // Bright silver-white crest
      ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,PI2);
      ctx.strokeStyle = `rgba(205,228,255,${rp.op * 0.90})`;
      ctx.lineWidth = rPortal * 0.012 * Math.max(0.20, rp.op * 0.85); ctx.stroke();

      ctx.globalAlpha = 1; ctx.restore();
    }

    // Kawoosh minute-change burst
    if (sg.kawoosh) {
      const kp = sg.kawoosh.p, kr = Math.min(sg.kawoosh.maxR * kp, rPortal * 1.01);
      const kop = Math.max(0, 1 - kp * 1.30);
      if (kr > 0.5 && kop > 0.01) {
        ctx.save();
        ctx.globalAlpha = kop * 0.38;
        const kg = ctx.createRadialGradient(0,0,0,0,0,kr);
        kg.addColorStop(0,   'rgba(20,110,230,0)');
        kg.addColorStop(0.55,`rgba(55,175,255,1)`);
        kg.addColorStop(0.85,`rgba(130,220,255,1)`);
        kg.addColorStop(1,   'rgba(200,240,255,0)');
        ctx.fillStyle = kg;
        ctx.beginPath(); ctx.arc(0,0,kr,0,PI2); ctx.fill();
        ctx.globalAlpha = 1; ctx.restore();
      }
    }

    ctx.restore(); // end portal clip

    // ── DRAW 3: Event horizon rim ──────────────────────────────────
    ctx.save();
    const rimP = 0.45 + Math.sin(T * 1.25) * 0.08;
    ctx.beginPath(); ctx.arc(0,0,rPortal+r*0.009,0,PI2);
    ctx.strokeStyle=`rgba(48,158,255,${rimP})`; ctx.lineWidth=r*0.019;
    ctx.shadowColor='rgba(0,130,255,0.88)'; ctx.shadowBlur=8; ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,rPortal-r*0.004,0,PI2);
    ctx.strokeStyle=`rgba(172,232,255,${0.28+Math.sin(T*0.80)*0.07})`;
    ctx.lineWidth=r*0.005; ctx.shadowBlur=4; ctx.stroke();
    ctx.restore();

    // ── DRAW 4: 39 rotating glyph slots ───────────────────────────
    ctx.save(); ctx.rotate(sg.ringRotation);
    for (let i=0;i<39;i++) {
      const a=(i/39)*PI2, gx=Math.cos(a)*r*0.862, gy=Math.sin(a)*r*0.862;
      ctx.save(); ctx.translate(gx,gy); ctx.rotate(a+Math.PI/2);
      const sw=r*0.026,sh=r*0.040;
      ctx.beginPath(); ctx.roundRect(-sw/2,-sh/2,sw,sh,sw*0.3);
      ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fill();
      ctx.strokeStyle='rgba(172,198,215,0.30)'; ctx.lineWidth=0.55;
      const seed=(i*137)%7; ctx.beginPath();
      if      (seed<2){ctx.moveTo(-sw*.30,-sh*.25);ctx.lineTo(sw*.30,-sh*.25);ctx.moveTo(0,-sh*.25);ctx.lineTo(0,sh*.25);}
      else if (seed<4){ctx.moveTo(-sw*.35,0);ctx.lineTo(sw*.35,0);ctx.arc(0,0,sw*.28,0,PI2);}
      else if (seed<6){ctx.moveTo(-sw*.30,-sh*.30);ctx.lineTo(sw*.30,sh*.30);ctx.moveTo(sw*.30,-sh*.30);ctx.lineTo(-sw*.30,sh*.30);}
      else            {ctx.moveTo(0,-sh*.35);ctx.lineTo(sw*.30,sh*.10);ctx.lineTo(-sw*.30,sh*.10);ctx.closePath();}
      ctx.stroke(); ctx.restore();
    }
    ctx.restore();

    // ── DRAW 5: Twelve chevrons ────────────────────────────────────
    const hourAge = now - sg.hourFlash;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI2 - Math.PI / 2;
      const cx2 = Math.cos(a) * r * 0.955, cy2 = Math.sin(a) * r * 0.955;
      const lockDelay  = i * 680;
      const isLocked   = isOnTheHour && hourAge > lockDelay && hourAge < lockDelay + 8200;
      const lockFlash  = isOnTheHour && hourAge > lockDelay && hourAge < lockDelay + 360;
      const ge    = sg.chevGlow.find(g => g.idx === i);
      const gAge  = ge ? (now - ge.born) / 1000 : 1;
      const handLit  = !!ge && gAge < 1.0;
      const handFade = handLit ? Math.pow(1 - gAge, 1.5) : 0;
      const dialLocked = sg.lockedChevrons.has(i);
      const dialFlash  = dialLocked && handLit && gAge < 0.38;
      const isRed    = isLocked || lockFlash || handLit || dialLocked;

      ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(a + Math.PI / 2);
      // Slightly smaller chevrons to fit 12 around the ring
      const cW=r*0.072, cH=r*0.108, cW2=cW*0.5;
      ctx.beginPath();
      ctx.moveTo(-cW2,cH*.28); ctx.lineTo(-cW2*.72,-cH*.22);
      ctx.lineTo(-cW2*.38,-cH*.52); ctx.lineTo(cW2*.38,-cH*.52);
      ctx.lineTo(cW2*.72,-cH*.22); ctx.lineTo(cW2,cH*.28); ctx.closePath();
      const bg=ctx.createLinearGradient(-cW2,-cH*.52,cW2,cH*.28);
      bg.addColorStop(0,'#3d4248'); bg.addColorStop(.5,'#2a2f34'); bg.addColorStop(1,'#1e2226');
      ctx.fillStyle=bg; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.11)'; ctx.lineWidth=0.7; ctx.stroke();

      const vW=cW*.70, vH=cH*.72, vW2=vW*.5;
      ctx.beginPath();
      ctx.moveTo(0,-vH*.52); ctx.lineTo(vW2,vH*.28); ctx.lineTo(vW2*.4,vH*.28);
      ctx.lineTo(0,-vH*.10); ctx.lineTo(-vW2*.4,vH*.28); ctx.lineTo(-vW2,vH*.28);
      ctx.closePath();

      if (isRed) {
        const rg=ctx.createLinearGradient(0,-vH*.52,0,vH*.28);
        const anyFlash = lockFlash || dialFlash;
        if (anyFlash) {
          rg.addColorStop(0,'#FFFFFF'); rg.addColorStop(.28,'#FFBBAA'); rg.addColorStop(1,'#FF2200');
        } else {
          const b = (isLocked || dialLocked) ? 1.0 : handFade;
          rg.addColorStop(0,`rgb(255,${Math.round(58+b*30)},${Math.round(b*16)})`);
          rg.addColorStop(.5,'#EE1800'); rg.addColorStop(1,'#BB0D00');
        }
        ctx.fillStyle=rg;
        ctx.shadowColor=(lockFlash||dialFlash)?'rgba(255,225,200,1)':'rgba(255,18,0,0.96)';
        ctx.shadowBlur=(lockFlash||dialFlash)?20:((isLocked||dialLocked)?14:handFade*16);
      } else {
        const ug=ctx.createLinearGradient(0,-vH*.52,0,vH*.28);
        ug.addColorStop(0,'#4a4032'); ug.addColorStop(.5,'#302818'); ug.addColorStop(1,'#1c1508');
        ctx.fillStyle=ug; ctx.shadowBlur=0;
      }
      ctx.fill();
      // Highlight chip
      ctx.beginPath();
      ctx.moveTo(-vW2*.25,-vH*.44); ctx.lineTo(vW2*.14,-vH*.10);
      ctx.lineTo(vW2*.05,-vH*.10); ctx.lineTo(-vW2*.30,-vH*.44); ctx.closePath();
      const chipAlpha = (lockFlash||dialFlash) ? 0.55 : (dialLocked||isLocked) ? 0.40 : handFade*0.48;
      ctx.fillStyle=isRed?`rgba(255,210,190,${chipAlpha})`:'rgba(255,255,210,0.11)';
      ctx.shadowBlur=0; ctx.fill();
      ctx.restore();
    }

    // ── DRAW 6: Outer bezel ────────────────────────────────────────
    ctx.save();
    ctx.beginPath(); ctx.arc(0,0,rOuter-1,0,PI2);
    const bz=ctx.createLinearGradient(-rOuter,-rOuter,rOuter,rOuter);
    bz.addColorStop(0,'rgba(210,220,230,0.20)'); bz.addColorStop(.5,'rgba(200,212,224,0.14)');
    bz.addColorStop(1,'rgba(185,195,208,0.18)');
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

    const isLuxury  = face === 'luxury'   || face === 'art_deco';
    const isNeon    = face === 'neon'     || face === 'celestial' || face === 'stargate';
    const isMinimal = face === 'minimal';

    if (isNeon) {
      this._handNeon(r, hourAngle, r * 0.50, r * 0.036, hCol);
      this._handNeon(r, minAngle,  r * 0.70, r * 0.024, mCol);
    } else if (isLuxury) {
      this._handBaton(r, hourAngle, r * 0.48, r * 0.038, hCol);
      this._handBaton(r, minAngle,  r * 0.67, r * 0.026, mCol);
    } else if (isMinimal) {
      this._handStick(r, hourAngle, r * 0.49, r * 0.024, r * 0.10, hCol);
      this._handStick(r, minAngle,  r * 0.69, r * 0.016, r * 0.08, mCol);
    } else {
      this._handTapered(r, hourAngle, r * 0.50, r * 0.038, r * 0.080, hCol);
      this._handTapered(r, minAngle,  r * 0.70, r * 0.026, r * 0.065, mCol);
    }

    if (cfg.show_seconds && secondAngle !== undefined) {
      this._handSecond(r, secondAngle, sCol, isNeon);
    }

    ctx.beginPath(); ctx.arc(0, 0, r * 0.040, 0, 2 * Math.PI);
    ctx.fillStyle = (cfg.show_seconds && secondAngle !== undefined) ? sCol : hCol;
    ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.018, 0, 2 * Math.PI);
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
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.roundRect(-width * 0.18, -length + width * 0.8, width * 0.36, (length - width) * 0.48, width * 0.18);
    ctx.fill();
    ctx.restore();
  }

  _handNeon(r, angle, length, width, color) {
    const ctx = this.ctx;
    ctx.save(); ctx.rotate(angle);
    ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r * 0.115); ctx.lineTo(0, -length); ctx.stroke();
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
    ctx.strokeStyle = color; ctx.lineWidth = r * 0.009; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r * 0.23); ctx.lineTo(0, -r * 0.79); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(0, r * 0.135, r * 0.026, 0, 2 * Math.PI);
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
      calendar_entity:   'calendar.home',
    };
  }

  getCardSize() { return 4; }

  setConfig(config) {
    this._config = { ...CrocodileClockCard.getStubConfig(), ...config };
    this._buildCard();
  }



  set hass(h) {
    this._hass = h;
    if (!this._raf && this._config) this._startClock();
  }

  connectedCallback() {
    if (this._config && this._hass && !this._raf) this._startClock();
  }

  disconnectedCallback() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this._ro)  { this._ro.disconnect(); this._ro = null; }
  }

  _resolveBg() {
    const cfg = this._config;
    const raw = cfg.card_background || '#1C1C1E';
    if (raw === 'transparent') return 'transparent';
    const op = Math.min(1, Math.max(0, (cfg.card_opacity ?? 88) / 100));
    return _ccHexToRgba(raw, op);
  }

  _buildCard() {
    if (this._raf)  { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this._ro)   { this._ro.disconnect(); this._ro = null; }

    const cfg = this._config;
    const bg  = this._resolveBg();

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

    this._ro = new ResizeObserver(entries => {
      const w  = entries[0]?.contentRect?.width || 280;
      const px = Math.round(Math.min(Math.max(w - 32, 100), 320));
      if (this._drawer) this._drawer.resize(px);
    });
    this._ro.observe(card);
    this._drawer.resize(220);

    // ── Tap → popup ──────────────────────────────────────────────
    card.addEventListener('click', () => { this._openPopup(); });
  }

  // ── Animation loop ─────────────────────────────────────────────
  _getTimeParts() {
    const wallNow = new Date();
    const ms = wallNow.getMilliseconds();
    const timezone = this._config?.timezone
      || Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Single toLocaleString call instead of six — ~5-6x cheaper
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false, timeZone: timezone,
    }).formatToParts(wallNow);
    const p = {};
    parts.forEach(({ type, value }) => { p[type] = parseInt(value, 10); });
    return { h: p.hour === 24 ? 0 : p.hour, m: p.minute, s: p.second, ms };
  }

  _startClock() {
    // Frame-skip state for power saving
    this._lastTickMs = 0;
    const tick = () => {
      const cfg = this._config;
      const now = performance.now();
      const face = cfg.face || 'classic';
      const isAnimated = face === 'stargate';
      const isSmooth   = cfg.show_seconds;

      // Non-animated faces: cap to ~1 fps (redraw only when the second changes)
      // Animated faces (stargate, smooth sweep): run at full rAF
      if (!isAnimated && !isSmooth) {
        const { h, m, s, ms } = this._getTimeParts();
        // Only redraw when the second hand has changed
        if (s === this._lastDrawnSec) {
          this._raf = requestAnimationFrame(tick);
          return;
        }
        this._lastDrawnSec = s;
        const dateEl = this.shadowRoot.getElementById('cc-date-el');
        if (dateEl) {
          const tz = cfg.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
          dateEl.textContent = new Date().toLocaleDateString('en-GB', {
            weekday: 'short', month: 'short', day: 'numeric', timeZone: tz,
          });
        }
        if (this._drawer) this._drawer.draw(h, m, s, this._currAngle);
        this._raf = requestAnimationFrame(tick);
        return;
      }

      const { h, m, s, ms } = this._getTimeParts();

      let secAngle;
      if (cfg.show_seconds) {
        secAngle        = ((s + ms / 1000) / 60) * 2 * Math.PI;
        this._currAngle = secAngle;
      }

      // Update date label once per second only
      if (s !== this._lastDateSec) {
        this._lastDateSec = s;
        const dateEl = this.shadowRoot.getElementById('cc-date-el');
        if (dateEl) {
          const tz = this._config?.timezone
            || Intl.DateTimeFormat().resolvedOptions().timeZone;
          dateEl.textContent = new Date().toLocaleDateString('en-GB', {
            weekday: 'short', month: 'short', day: 'numeric', timeZone: tz,
          });
        }
      }

      if (this._drawer) this._drawer.draw(h, m, s, secAngle);
      this._raf = requestAnimationFrame(tick);
    };

    this._raf = requestAnimationFrame(tick);
  }

  // ── Digital clock + calendar popup ─────────────────────────────
  _openPopup() {
    const cfg    = this._config;
    const accent = cfg.accent_color || '#007AFF';
    const format = cfg.popup_format || '12';
    const self   = this;

    document.getElementById('cc-popup-overlay')?.remove();

    // Timezone-aware "today"
    const tz = cfg.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nowTz   = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
    const todayYear  = nowTz.getFullYear();
    const todayMonth = nowTz.getMonth();
    const todayDay   = nowTz.getDate();

    let viewYear  = todayYear;
    let viewMonth = todayMonth;
    // Track which date is selected (default = today)
    let selYear = todayYear, selMonth = todayMonth, selDay = todayDay;

    const overlay = document.createElement('div');
    overlay.id    = 'cc-popup-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '99999',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      animation: 'ccFadeIn 0.22s ease',
    });

    const styleEl = document.createElement('style');
    styleEl.textContent = CC_KEYFRAMES + `
      .cc-popup { animation: ccSlideUp 0.30s cubic-bezier(0.34,1.3,0.64,1) both; }
      .cc-cal-day {
        width: 36px; height: 36px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 500; cursor: pointer;
        transition: background 0.12s, box-shadow 0.12s;
        position: relative;
      }
      .cc-cal-day.today {
        background: ${accent};
        color: #fff;
        font-weight: 700;
        box-shadow: 0 0 0 3px ${accent}44;
      }
      .cc-cal-day.today::after {
        content: '';
        position: absolute;
        bottom: 3px;
        left: 50%; transform: translateX(-50%);
        width: 4px; height: 4px;
        border-radius: 50%;
        background: rgba(255,255,255,0.7);
      }
      .cc-cal-day.selected:not(.today) {
        background: rgba(255,255,255,0.15);
        color: #fff;
        box-shadow: 0 0 0 1.5px rgba(255,255,255,0.40);
      }
      .cc-cal-day:not(.today):not(.other-month):hover {
        background: rgba(255,255,255,0.10);
      }
      .cc-cal-day.other-month { opacity: 0.25; cursor: default; pointer-events: none; }
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
      .cc-ev-item {
        padding: 10px 12px; border-radius: 10px;
        background: rgba(255,255,255,0.055);
        margin-bottom: 6px;
        border-left: 3px solid ${accent};
      }
      .cc-ev-title { font-size: 14px; font-weight: 600; color: #fff; }
      .cc-ev-time { font-size: 12px; color: rgba(255,255,255,0.42); margin-top: 3px; }
    `;
    overlay.appendChild(styleEl);

    const panel = document.createElement('div');
    panel.className = 'cc-popup';
    Object.assign(panel.style, {
      background: 'rgba(22,22,24,0.97)',
      backdropFilter: 'blur(52px) saturate(200%)',
      WebkitBackdropFilter: 'blur(52px) saturate(200%)',
      border: '1px solid rgba(255,255,255,0.11)',
      borderRadius: '28px',
      padding: '26px 22px 22px',
      width: '100%', maxWidth: '420px',
      maxHeight: '92vh', overflowY: 'auto',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
      color: '#fff', position: 'relative',
    });
    panel.addEventListener('click', e => e.stopPropagation());

    // Close button
    const closeBtn = document.createElement('button');
    Object.assign(closeBtn.style, {
      position: 'absolute', top: '18px', right: '18px',
      background: 'rgba(255,255,255,0.09)',
      border: 'none', borderRadius: '50%',
      width: '30px', height: '30px',
      cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.60)', fontSize: '16px',
      fontFamily: 'inherit',
    });
    closeBtn.textContent = '✕';

    // Digital clock
    const timeEl = document.createElement('div');
    Object.assign(timeEl.style, {
      fontSize: '76px', fontWeight: '200',
      letterSpacing: '-4px', textAlign: 'center',
      lineHeight: '1', marginBottom: '4px',
      fontVariantNumeric: 'tabular-nums',
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
    const updateTime = () => {
      const { h: _h, m: _m, s: _s } = self._getTimeParts();
      const mm = String(_m).padStart(2, '0');
      const ss = String(_s).padStart(2, '0');
      const sp = cfg.show_seconds ? `:${ss}` : '';
      if (format === '12') {
        const ampm = _h >= 12 ? 'PM' : 'AM';
        const hh12 = _h % 12 || 12;
        timeEl.textContent = `${String(hh12).padStart(2, '0')}:${mm}${sp}`;
        ampmEl.textContent = ampm;
      } else {
        timeEl.textContent = `${String(_h).padStart(2, '0')}:${mm}${sp}`;
        ampmEl.textContent = '';
      }
      fullDateEl.textContent = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz,
      });
    };
    timeInterval = setInterval(updateTime, 500);
    updateTime();

    const divider = document.createElement('div');
    Object.assign(divider.style, {
      width: '100%', height: '1px',
      background: 'rgba(255,255,255,0.08)',
      margin: '0 0 20px',
    });

    // ── Calendar ─────────────────────────────────────────────────
    const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

    const calWrap = document.createElement('div');
    calWrap.id    = 'cc-calendar';

    // ── Events section ───────────────────────────────────────────
    const eventsWrap = document.createElement('div');
    Object.assign(eventsWrap.style, { marginTop: '16px', minHeight: '52px' });

    // ── Load events from HA calendar API ────────────────────────
    const loadEvents = async (year, month, day) => {
      const entity = (cfg.calendar_entity || 'calendar.home').trim();
      const start  = new Date(year, month, day, 0, 0, 0);
      const end    = new Date(year, month, day + 1, 0, 0, 0);
      const dateLabel = new Date(year, month, day).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long',
      });

      eventsWrap.innerHTML = `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:rgba(255,255,255,0.38);margin-bottom:10px">${dateLabel}</div>
        <div style="color:rgba(255,255,255,0.28);text-align:center;padding:14px;font-size:13px">Loading…</div>
      `;

      if (!self._hass) {
        eventsWrap.innerHTML = `
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:rgba(255,255,255,0.38);margin-bottom:10px">${dateLabel}</div>
          <div style="color:rgba(255,255,255,0.28);text-align:center;padding:14px;font-size:13px">Home Assistant not connected</div>`;
        return;
      }

      try {
        const events = await self._hass.callApi('GET',
          `calendars/${entity}?start=${start.toISOString()}&end=${end.toISOString()}`);

        if (!events || events.length === 0) {
          eventsWrap.innerHTML = `
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:rgba(255,255,255,0.38);margin-bottom:10px">${dateLabel}</div>
            <div style="color:rgba(255,255,255,0.28);text-align:center;padding:14px;font-size:13px">No events</div>`;
          return;
        }

        const evHTML = events.slice(0, 8).map(ev => {
          const title   = ev.summary || 'Untitled';
          const isAllDay = !!ev.start?.date;
          let timeStr = 'All day';
          if (!isAllDay && ev.start?.dateTime) {
            const s2 = new Date(ev.start.dateTime);
            const e2 = new Date(ev.end?.dateTime || ev.start.dateTime);
            timeStr  = s2.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz })
                     + ' – '
                     + e2.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
          }
          const loc = ev.location ? `<div style="font-size:11px;color:rgba(255,255,255,0.30);margin-top:2px">📍 ${ev.location}</div>` : '';
          return `<div class="cc-ev-item"><div class="cc-ev-title">${title}</div><div class="cc-ev-time">${timeStr}</div>${loc}</div>`;
        }).join('');

        eventsWrap.innerHTML = `
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:rgba(255,255,255,0.38);margin-bottom:10px">${dateLabel}</div>
          ${evHTML}`;
      } catch (err) {
        eventsWrap.innerHTML = `
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:rgba(255,255,255,0.38);margin-bottom:10px">${dateLabel}</div>
          <div style="color:rgba(255,255,255,0.25);text-align:center;padding:14px;font-size:13px">Could not load calendar<br><span style="font-size:11px;opacity:0.6">${entity}</span></div>`;
      }
    };

    // ── Build calendar grid ──────────────────────────────────────
    const buildCalendar = () => {
      calWrap.innerHTML = '';

      // ── Header ────────────────────────────────────────────────
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

      const lbl = document.createElement('div');
      Object.assign(lbl.style, {
        fontSize: '17px', fontWeight: '700', letterSpacing: '-0.3px',
        flex: '1', textAlign: 'center', margin: '0 6px',
      });
      lbl.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

      hdr.appendChild(prevBtn);
      hdr.appendChild(lbl);
      hdr.appendChild(nextBtn);
      calWrap.appendChild(hdr);

      // ── Calendar table — uses <table> so cells are unambiguously aligned ──
      // Monday-first. getDay(): 0=Sun,1=Mon,...,6=Sat
      // startCol: 0=Mon … 6=Sun
      const firstDow     = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
      const startCol     = (firstDow + 6) % 7;                        // 0=Mon
      const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();

      const table = document.createElement('table');
      Object.assign(table.style, {
        width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed',
      });

      // Day-name header row
      const thead = document.createElement('thead');
      const hrow  = document.createElement('tr');
      DAY_LABELS.forEach(label => {
        const th = document.createElement('th');
        Object.assign(th.style, {
          textAlign: 'center', fontSize: '11px', fontWeight: '600',
          color: 'rgba(255,255,255,0.30)', padding: '4px 0',
          letterSpacing: '0.04em', fontFamily: 'inherit',
        });
        th.textContent = label;
        hrow.appendChild(th);
      });
      thead.appendChild(hrow);
      table.appendChild(thead);

      // Body — build rows of 7
      const tbody = document.createElement('tbody');
      let   col   = startCol;  // which column (0-6) the 1st falls in
      let   tr    = document.createElement('tr');

      // Empty cells before day 1
      for (let c = 0; c < startCol; c++) {
        const td = document.createElement('td');
        td.style.padding = '2px';
        tr.appendChild(td);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const isToday    = day === todayDay && viewMonth === todayMonth && viewYear === todayYear;
        const isSelected = day === selDay   && viewMonth === selMonth  && viewYear === selYear;

        const td   = document.createElement('td');
        td.style.padding = '2px';

        const cell = document.createElement('div');
        cell.className = 'cc-cal-day'
          + (isToday                 ? ' today'    : '')
          + (isSelected && !isToday  ? ' selected' : '');
        cell.textContent  = day;
        cell.dataset.day  = day;
        // Click handler directly on the cell — clearest possible
        cell.onclick = e => {
          e.stopPropagation();
          const d = parseInt(cell.dataset.day, 10);
          selYear = viewYear; selMonth = viewMonth; selDay = d;
          // Update highlight
          tbody.querySelectorAll('[data-day]').forEach(el => {
            el.classList.remove('selected');
            if (!el.classList.contains('today') && parseInt(el.dataset.day, 10) === d)
              el.classList.add('selected');
          });
          loadEvents(selYear, selMonth, d);
        };

        td.appendChild(cell);
        tr.appendChild(td);
        col++;

        if (col === 7) {
          tbody.appendChild(tr);
          tr  = document.createElement('tr');
          col = 0;
        }
      }

      // Pad the final row if needed
      if (col > 0) {
        while (col < 7) { const td = document.createElement('td'); td.style.padding = '2px'; tr.appendChild(td); col++; }
        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      calWrap.appendChild(table);
    };

    buildCalendar();
    // Auto-load today's events on open
    loadEvents(todayYear, todayMonth, todayDay);

    // ── Optional URL link ────────────────────────────────────────
    const popupUrl = (cfg.popup_url || '').trim();
    let urlEl = null;
    if (popupUrl) {
      urlEl = document.createElement('a');
      urlEl.href   = popupUrl;
      urlEl.target = '_blank';
      urlEl.rel    = 'noopener noreferrer';
      Object.assign(urlEl.style, {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '7px', marginTop: '20px', padding: '11px 18px',
        borderRadius: '12px',
        background: `${accent}18`, border: `1px solid ${accent}44`,
        color: accent, fontSize: '13px', fontWeight: '600',
        textDecoration: 'none', letterSpacing: '0.01em',
        transition: 'background 0.15s', wordBreak: 'break-all',
      });
      urlEl.addEventListener('mouseover', () => urlEl.style.background = `${accent}28`);
      urlEl.addEventListener('mouseout',  () => urlEl.style.background = `${accent}18`);
      const linkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      linkIcon.setAttribute('viewBox', '0 0 24 24');
      linkIcon.setAttribute('width', '15'); linkIcon.setAttribute('height', '15');
      linkIcon.setAttribute('fill', 'currentColor');
      linkIcon.innerHTML = '<path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>';
      const customTitle  = (cfg.popup_url_title || '').trim();
      let displayUrl     = customTitle;
      if (!displayUrl) {
        displayUrl = popupUrl;
        try { displayUrl = new URL(popupUrl).hostname || popupUrl; } catch (_) {}
      }
      urlEl.appendChild(linkIcon);
      urlEl.appendChild(document.createTextNode(displayUrl));
    }

    // ── Assemble ─────────────────────────────────────────────────
    panel.appendChild(closeBtn);
    panel.appendChild(timeEl);
    panel.appendChild(ampmEl);
    panel.appendChild(fullDateEl);
    panel.appendChild(divider);
    panel.appendChild(calWrap);
    panel.appendChild(eventsWrap);
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

  set hass(h) {
    this._hass = h;
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
                  <div class="toggle-sublabel">Displays today's date under the clock face</div>
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

        <!-- ── Calendar Entity ── -->
        <div>
          <div class="section-title">Calendar</div>
          <div class="card-block">
            <div class="select-row">
              <label>Which calendar to show events from?</label>
              <div class="hint" style="margin-bottom:10px;">When you tap a date in the popup, events from this calendar will appear below. Pick one from your connected calendars.</div>
              ${this._buildCalendarSelect(cfg.calendar_entity || 'calendar.home')}
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
              <div class="hint" style="margin-bottom:8px;">Opens as a link at the bottom of the popup. Use <b>calshow://</b> for the iOS Calendar app.</div>
              <input type="text" id="cc_popup_url"
                placeholder="calshow://"
                value="${cfg.popup_url || ''}">
            </div>
            <div class="select-row" style="margin-top:10px;">
              <label>Link Title</label>
              <div class="hint" style="margin-bottom:8px;">Custom label for the link. Falls back to the URL hostname if blank.</div>
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

  _buildCalendarSelect(current) {
    // Gather all calendar.* entities from hass, sorted alphabetically
    const entities = this._hass
      ? Object.keys(this._hass.states)
          .filter(e => e.startsWith('calendar.'))
          .sort()
      : [];

    // Always include the current value even if hass isn't loaded yet
    if (current && !entities.includes(current)) entities.unshift(current);

    if (entities.length === 0) {
      // Fallback to text input if no calendars found at all
      return `<input type="text" id="cc_calendar_entity"
        placeholder="calendar.home" value="${current}">
        <div class="hint" style="margin-top:6px;">No calendar entities found. Type one manually.</div>`;
    }

    const options = entities.map(e => {
      const friendly = this._hass?.states[e]?.attributes?.friendly_name || e;
      const selected = e === current ? 'selected' : '';
      return `<option value="${e}" ${selected}>${friendly} <span style="opacity:0.5">(${e})</span></option>`;
    }).join('');

    return `
      <div style="position:relative;">
        <select id="cc_calendar_entity" style="
          width:100%;
          background:var(--secondary-background-color,rgba(0,0,0,0.06));
          color:var(--primary-text-color);
          border:1px solid rgba(128,128,128,0.2);
          border-radius:8px;
          padding:9px 36px 9px 12px;
          font-size:13px;
          font-family:inherit;
          appearance:none;
          -webkit-appearance:none;
          cursor:pointer;
        ">
          ${options}
        </select>
        <div style="
          position:absolute; right:12px; top:50%; transform:translateY(-50%);
          pointer-events:none; color:rgba(128,128,128,0.7); font-size:11px;
        ">▼</div>
      </div>`;
  }

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
          ${allowNone ? `<button class="none-btn ${isNone ? 'active' : ''}" data-key="${key}">None</button>` : ''}
          <div class="color-swatch" data-key="${key}" style="${swatchSt}">
            <input type="color" class="cc-color-input" data-key="${key}" value="${hexVal}">
          </div>
        </div>
      </div>`;
  }

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

    // Segmented controls
    root.querySelectorAll('input[name="cc_pfmt"]').forEach(r => r.onchange = () => this._set('popup_format', r.value));

    // Text inputs
    const calEntEl = root.getElementById('cc_calendar_entity');
    if (calEntEl) calEntEl.onchange = () => this._set('calendar_entity', calEntEl.value.trim() || 'calendar.home');

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
            swatch.style.background      = '';
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
    description: 'Beautiful analog clock with twelve faces including an animated Stargate portal, smooth sweep seconds, and a glassmorphic popup with digital clock, interactive calendar and Home Assistant calendar events.',
  });
}