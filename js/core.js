// Mộc Trà Admin · tiện ích chung: DOM, ngày giờ, icon, hình vẽ, modal, toast
window.A = window.A || {};
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  Object.assign(A, { $, $$, esc });

  // số ngẫu nhiên cố định theo khoá — dữ liệu mẫu ổn định giữa các lần tải
  A.rnd = (key) => { let h = 2166136261; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; };

  // ---------- ngày giờ ----------
  // POC cố định "bây giờ" để trạng thái ca hôm nay luôn có đủ: đã về / đang làm / chưa chấm công
  A.NOW = new Date(2026, 10, 5, 14, 20);
  A.NOW_MIN = A.NOW.getHours() * 60 + A.NOW.getMinutes();
  const pad = (n) => String(n).padStart(2, '0');
  A.iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  A.parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  A.add = (s, n) => { const d = A.parse(s); d.setDate(d.getDate() + n); return A.iso(d); };
  A.TODAY = A.iso(A.NOW);
  A.weekStart = (s) => { const d = A.parse(s); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return A.iso(d); };
  A.dow = (s) => A.parse(s).getDay();
  A.DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  A.DOW_LONG = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  A.dm = (s) => { const d = A.parse(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
  A.dmy = (s) => { const d = A.parse(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  A.hm = (m) => (m == null ? '—' : `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`);
  A.toMin = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  A.hrs = (min) => (Math.round(min / 6) / 10).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  A.days = (a, b) => Math.round((A.parse(b) - A.parse(a)) / 864e5) + 1;

  // ---------- icon (nét 1.6 như Customer Web) ----------
  const P = {
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h3M13 14h3M8 17h3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5"/><path d="M15.5 5.2a3.3 3.3 0 0 1 0 6.6M17.5 14.3c2 .7 3.5 2.6 4 5.2"/>',
    inbox: '<path d="M4 13.5 6.3 5.6A2 2 0 0 1 8.2 4.2h7.6a2 2 0 0 1 1.9 1.4L20 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 13.5h4.5l1 2h5l1-2H20"/>',
    chev: '<path d="m9 6 6 6-6 6"/>', chevL: '<path d="m15 6-6 6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>',
    store: '<path d="M4 9.5 5.5 4.5h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 11.5V20h13v-8.5M10 20v-5h4v5"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/><path d="m3.5 16.5 8.5 4.5 8.5-4.5"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    side: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9.5 4.5v15M15.5 10l-2 2 2 2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    send: '<path d="M4 12 20 4l-5 16-3.5-6.5z"/><path d="M11.5 13.5 20 4"/>',
    swap: '<path d="M7 7h12l-3.5-3.5M17 17H5l3.5 3.5"/>',
    alert: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    phone: '<path d="M6.5 4h3l1.5 4-2 1.2a10 10 0 0 0 5.8 5.8L16 13l4 1.5v3A2 2 0 0 1 18 19.5 15.5 15.5 0 0 1 4.5 6 2 2 0 0 1 6.5 4z"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19 13 11"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5"/>',
    shift: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M7 9h5M10 12.5h7M7 16h4"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.6 0-.9.7-1.5 1.7-1.5h2A4 4 0 0 0 20.5 11 8 8 0 0 0 12 3.5z"/><circle cx="7.8" cy="11" r="1"/><circle cx="10" cy="7.3" r="1"/><circle cx="14.5" cy="7.3" r="1"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    chart: '<path d="M4 20h16"/><rect x="5.5" y="11" width="3" height="6.5" rx="1"/><rect x="10.5" y="6.5" width="3" height="11" rx="1"/><rect x="15.5" y="9" width="3" height="8.5" rx="1"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16" height="11" rx="2"/><circle cx="16" cy="13.5" r="1.2"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M4 4l16 16M10 6c.6-.1 1.3-.2 2-.2 6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3 3.7M6.5 7.4A16 16 0 0 0 2.5 12S6 18.2 12 18.2c1.6 0 3-.4 4.2-1"/><path d="M9.9 10a3 3 0 0 0 4.1 4.1"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/>',
  };
  A.ic = (k, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || ''}</svg>`;

  // ---------- hình vẽ thương hiệu (dùng cho giao diện Mộc Trà) ----------
  A.bloom4 = (color = 'currentColor', core = null) => {
    const petals = [0, 90, 180, 270].map((r) => `<path d="M0 -2 C-11 -6 -12 -21 0 -23 C12 -21 11 -6 0 -2Z" transform="rotate(${r})"/>`).join('');
    return `<svg viewBox="-25 -25 50 50" aria-hidden="true"><g fill="${color}">${petals}</g>${core ? `<circle r="3.4" fill="${core}"/>` : ''}</svg>`;
  };
  let seq = 0;
  function ridge(base, amp, seed, n = 9) {
    let r = seed; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    const step = 1200 / n;
    const pts = Array.from({ length: n + 1 }, (_, i) => [i * step, base - amp * (0.35 + rnd() * 0.65)]);
    let d = `M0 300 L0 ${pts[0][1]}`;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const px = x1 + step * (0.35 + rnd() * 0.3), py = Math.min(y1, y2) - amp * (0.25 + rnd() * 0.5);
      d += ` C${x1 + step * 0.15} ${y1} ${px - step * 0.18} ${py} ${px} ${py} S${x2 - step * 0.12} ${y2} ${x2} ${y2}`;
    }
    return d + ' L1200 300 Z';
  }
  A.mountains = () => {
    const id = 'mt' + ++seq;
    const layers = [[150, 90, 7, '#D3E8DC', .7], [196, 80, 19, '#A7CDBA', .6], [236, 60, 31, '#76AA93', .5], [272, 36, 43, '#5E957D', .35]];
    return `<svg viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset=".15" stop-color="#F2F8F4" stop-opacity="0"/><stop offset=".85" stop-color="#F2F8F4" stop-opacity=".95"/></linearGradient>
      <filter id="${id}b" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>
      ${layers.map(([b, a, sd, c, o]) => { const d = ridge(b, a, sd); return `<path d="${d}" fill="${c}" opacity="${o}" filter="url(#${id}b)"/><path d="${d}" fill="url(#${id}f)" transform="translate(0 ${a * .5})"/>`; }).join('')}
    </svg>`;
  };

  // ly giấy thương hiệu: thân màu pastel in hoạ tiết hoa 4 cánh, đai chữ, nắp phẳng
  const CUP_TONES = {
    mint: { body: '#BFDCC8', deep: '#9CC6AB', print: '#FFFFFF', ink: '#2C4A3B' },
    butter: { body: '#F4E1A6', deep: '#E9C977', print: '#FFFFFF', ink: '#6B4E12' },
    blush: { body: '#F5CFCB', deep: '#EAAEA9', print: '#FFFFFF', ink: '#6E2F2B' },
    peach: { body: '#F8D6BF', deep: '#F0B994', print: '#FFFFFF', ink: '#6F3A1A' },
    cream: { body: '#F4EEE2', deep: '#E4D8C2', print: '#BFDCC8', ink: '#2C4A3B' },
    sage: { body: '#2F5443', deep: '#24443A', print: '#BFDCC8', ink: '#F4EEE2' },
  };
  A.paperCup = function paperCup(tone = 'mint', { shadow = true, label = true } = {}) {
    const t = CUP_TONES[tone] || CUP_TONES.mint;
    const id = 'pc' + ++seq;
    const flowers = [];
    for (let y = 0; y < 6; y++) for (let x = 0; x < 5; x++) {
      const cx = 34 + x * 34 + (y % 2) * 17, cy = 92 + y * 32;
      flowers.push(`<g transform="translate(${cx} ${cy}) scale(.34) rotate(${(x + y) % 2 ? 0 : 45})">${[0, 90, 180, 270].map((r) => `<path d="M0 -2 C-11 -6 -12 -21 0 -23 C12 -21 11 -6 0 -2Z" transform="rotate(${r})"/>`).join('')}</g>`);
    }
    return `<svg viewBox="0 0 200 290" class="paper-cup" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".10"/><stop offset=".22" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
        <clipPath id="${id}c"><path d="M36 70 H164 L150 274 Q149 282 141 282 H59 Q51 282 50 274 Z"/></clipPath>
      </defs>
      ${shadow ? '<ellipse cx="100" cy="284" rx="62" ry="5" fill="#000" opacity=".10"/>' : ''}
      <g clip-path="url(#${id}c)">
        <rect x="30" y="66" width="140" height="220" fill="${t.body}"/>
        <g fill="${t.print}" opacity=".55">${flowers.join('')}</g>
        ${label ? `<rect x="30" y="150" width="140" height="44" fill="${t.ink}" opacity=".92"/>
        <text x="100" y="170" text-anchor="middle" font-family="Be Vietnam Pro, sans-serif" font-size="11" letter-spacing="4.5" fill="${t.body}" font-weight="500">MỘC TRÀ</text>
        <text x="100" y="185" text-anchor="middle" font-family="Cormorant Garamond, serif" font-style="italic" font-size="10" fill="${t.body}" opacity=".85">lá &amp; hoa</text>` : ''}
        <rect x="30" y="66" width="140" height="220" fill="url(#${id}s)"/>
      </g>
      <path d="M30 62 Q30 54 38 54 H162 Q170 54 170 62 V72 H30 Z" fill="#FFFFFF"/>
      <path d="M30 72 H170" stroke="#000" stroke-opacity=".06"/>
      <path d="M44 54 Q50 40 100 39 Q150 40 156 54 Z" fill="#FFFFFF" opacity=".85"/>
      <rect x="112" y="8" width="8" height="40" rx="4" fill="${t.ink}" transform="rotate(12 116 28)"/>
    </svg>`;
  }

  // ---------- toast ----------
  let tt;
  A.toast = (msg) => {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.innerHTML = A.ic('check') + msg;
    el.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2600);
  };

  // ---------- modal / drawer ----------
  A.modal = (html, { drawer = false, cls = '' } = {}) => {
    const w = document.createElement('div');
    w.className = `modal ${drawer ? 'drawer' : ''}`;
    w.innerHTML = `<div class="modal-bd" data-close></div><div class="modal-pan ${cls}" role="dialog" aria-modal="true"><button class="m-x" data-close aria-label="Đóng">${A.ic('close')}</button>${html}</div>`;
    document.body.appendChild(w);
    requestAnimationFrame(() => w.classList.add('open'));
    const close = () => { if (!w.isConnected) return; w.classList.remove('open'); setTimeout(() => w.remove(), 450); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    w.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    return { el: w, close };
  };
})();
