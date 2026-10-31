// Flat vector garment illustrations, tinted with the product color.
// They let the store look complete before real photography is added
// (set a product's `image` field to a URL to use a photo instead).

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

const SHAPES = {
  tee: `<path d="M62 42 L88 32 Q100 44 112 32 L138 42 L166 72 L148 92 L136 82 L136 196 L64 196 L64 82 L52 92 L34 72 Z"/>
        <path class="s" d="M88 32 Q100 50 112 32 Q100 40 88 32Z"/>`,
  hoodie: `<path d="M66 50 Q74 22 100 20 Q126 22 134 50 L164 66 L176 168 L156 172 L146 98 L142 200 L58 200 L54 98 L44 172 L24 168 L36 66 Z"/>
        <path class="s" d="M80 50 Q100 70 120 50 Q118 30 100 28 Q82 30 80 50Z"/>
        <path class="s" d="M74 150 L126 150 L132 182 L68 182 Z"/>
        <path class="l" d="M94 66 L92 102 M106 66 L108 102"/>`,
  crew: `<path d="M64 44 L86 36 Q100 48 114 36 L136 44 L164 64 L178 166 L158 170 L146 96 L144 198 L56 198 L54 96 L42 170 L22 166 L36 64 Z"/>
        <path class="s" d="M86 36 Q100 54 114 36 Q100 44 86 36Z"/><path class="s" d="M56 186 L144 186 L144 198 L56 198Z"/>`,
  jacket: `<path d="M64 40 L88 30 L100 50 L112 30 L136 40 L166 62 L178 176 L158 180 L148 100 L148 204 L52 204 L52 100 L42 180 L22 176 L34 62 Z"/>
        <path class="s" d="M88 30 L100 50 L92 74 L76 42Z M112 30 L100 50 L108 74 L124 42Z"/>
        <path class="l" d="M100 50 L100 204"/>
        <rect class="s" x="62" y="112" width="26" height="24" rx="2"/><rect class="s" x="112" y="112" width="26" height="24" rx="2"/>
        <rect class="s" x="62" y="156" width="26" height="26" rx="2"/><rect class="s" x="112" y="156" width="26" height="26" rx="2"/>`,
  puffer: `<path d="M70 34 Q100 24 130 34 L132 50 L162 64 L176 150 L156 154 L146 104 L146 168 L54 168 L54 104 L44 154 L24 150 L38 64 L68 50 Z"/>
        <path class="l" d="M54 82 L146 82 M54 110 L146 110 M54 138 L146 138 M38 92 L58 92 M142 92 L162 92 M34 120 L54 120 M146 120 L168 120 M100 40 L100 168"/>`,
  pants: `<path d="M62 30 L138 30 L146 214 L110 214 L100 92 L90 214 L54 214 Z"/>
        <path class="s" d="M62 30 L138 30 L139 44 L61 44Z"/><path class="l" d="M100 44 L100 92 M78 44 Q76 66 62 70 M122 44 Q124 66 138 70"/>`,
  cargo: `<path d="M60 30 L140 30 L150 210 L110 210 L100 94 L90 210 L50 210 Z"/>
        <path class="s" d="M60 30 L140 30 L141 44 L59 44Z"/>
        <rect class="s" x="52" y="118" width="30" height="34" rx="3"/><rect class="s" x="118" y="118" width="30" height="34" rx="3"/>
        <path class="l" d="M100 44 L100 94 M50 200 L90 200 M110 200 L150 200"/>`,
  dress: `<path d="M80 24 L86 24 L90 60 L110 60 L114 24 L120 24 L124 66 Q128 90 122 104 L158 214 L42 214 L78 104 Q72 90 76 66 Z"/>
        <path class="s" d="M78 104 Q100 112 122 104 L124 112 Q100 120 76 112Z"/>`,
  polodress: `<path d="M70 38 L88 30 L100 46 L112 30 L130 38 L154 60 L140 78 L130 70 L128 110 L146 214 L54 214 L72 110 L70 70 L60 78 L46 60 Z"/>
        <path class="s" d="M88 30 L100 46 L112 30 L106 54 L94 54Z"/>`,
  cap: `<path d="M44 132 Q46 70 100 66 Q154 70 156 132 Z"/>
        <path class="s" d="M44 132 Q100 118 156 132 L184 146 Q120 156 44 140Z"/>
        <circle class="s" cx="100" cy="68" r="5"/><path class="l" d="M100 70 L100 128 M74 76 Q66 100 66 130 M126 76 Q134 100 134 130"/>`,
  tote: `<path class="l" style="stroke-width:7" d="M76 92 Q76 42 100 42 Q124 42 124 92"/>
        <path d="M48 90 L152 90 L160 212 L40 212 Z"/><path class="s" d="M48 90 L152 90 L152 102 L48 102Z"/>`,
  beanie: `<path d="M52 140 Q50 66 100 60 Q150 66 148 140 Z"/><rect class="s" x="46" y="128" width="108" height="42" rx="8"/>
        <path class="l" d="M64 134 L64 164 M80 134 L80 164 M96 134 L96 164 M112 134 L112 164 M128 134 L128 164 M144 134 L144 164"/>`,
};

function shapeFor(product) {
  const s = product.slug || '';
  if (s.includes('cap')) return 'cap';
  if (s.includes('tote')) return 'tote';
  if (s.includes('beanie')) return 'beanie';
  if (s.includes('crew')) return 'crew';
  if (s.includes('puffer')) return 'puffer';
  if (s.includes('cargo')) return 'cargo';
  if (s.includes('polo')) return 'polodress';
  return { tees: 'tee', hoodies: 'hoodie', outerwear: 'jacket', bottoms: 'pants', dresses: 'dress', accessories: 'tote' }[product.category] || 'tee';
}

function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
}

export function garmentSVG(product, colorHex) {
  const hex = colorHex || product.colors?.[0]?.hex || '#cccccc';
  const line = isDark(hex) ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.16)';
  const shade = isDark(hex) ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';
  return `<svg viewBox="0 0 200 240" role="img" aria-label="${esc(product.name)}" class="garment">
    <style>.s{fill:${shade}}.l{fill:none;stroke:${line};stroke-width:2;stroke-linecap:round}</style>
    <ellipse cx="100" cy="226" rx="62" ry="6" fill="rgba(0,0,0,.07)"/>
    <g fill="${hex}" stroke="${isDark(hex) ? 'none' : 'rgba(0,0,0,.14)'}" stroke-width="1.2" stroke-linejoin="round">${SHAPES[shapeFor(product)]}</g>
  </svg>`;
}

export function productVisual(product, colorHex) {
  if (product.image) return `<img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy">`;
  return garmentSVG(product, colorHex);
}
