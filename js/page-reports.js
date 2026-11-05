// Báo cáo & phân tích — lượng khách theo ca / khung giờ, năng suất (đơn trên giờ công), hiệu suất cửa hàng & nhân viên
(() => {
  const { ic, data: D } = A;
  const ui = { period: '7d' };
  const PERIODS = [['7d', '7 ngày qua'], ['30d', '30 ngày qua'], ['month', 'Tháng này']];
  const CODES = ['S', 'C', 'T'];
  // thang màu tuần tự một sắc độ (mint), nhạt → đậm, cho bản đồ nhiệt
  const RAMP = ['#E2F3EA', '#B9E3CB', '#86CCA6', '#55B183', '#349466', '#22764F', '#16583A'];
  const nf = (n) => Math.round(n).toLocaleString('vi-VN');
  const n1 = (n) => n.toLocaleString('vi-VN', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const money = (n) => (n >= 1e9 ? n1(n / 1e9) + ' tỷ' : n1(n / 1e6) + ' triệu');

  const range = () => {
    const end = A.add(A.TODAY, -1); // dữ liệu đến hết hôm qua
    let start;
    if (ui.period === '7d') start = A.add(end, -6);
    else if (ui.period === '30d') start = A.add(end, -29);
    else start = A.TODAY.slice(0, 8) + '01';
    if (start > end) start = end;
    const len = A.days(start, end);
    return { start, end, len, pStart: A.add(start, -len), pEnd: A.add(start, -1) };
  };
  const eachDay = (a, b, fn) => { for (let d = a; d <= b; d = A.add(d, 1)) fn(d); };
  const inShift = (code, date, h) => { const t = D.timeAt(code, date); return h * 60 >= t.start && h * 60 < t.end; };

  function compute(start, end, stores) {
    const R = { orders: 0, revenue: 0, workMin: 0, daily: [], heat: {}, heatN: {}, shift: {}, store: {}, staff: {} };
    CODES.forEach((c) => (R.shift[c] = { orders: 0, staffMin: 0, slots: 0 }));
    stores.forEach((sid) => (R.store[sid] = { orders: 0, revenue: 0, workMin: 0, shifts: 0, late: 0, absent: 0, gaps: 0, sh: Object.fromEntries(CODES.map((c) => [c, { orders: 0, staffMin: 0 }])) }));
    eachDay(start, end, (d) => {
      let day = 0;
      const dow = A.dow(d);
      stores.forEach((sid) => {
        const S = R.store[sid], tk = D.ticket(sid);
        const emps = D.employees.filter((e) => e.storeId === sid && D.inSchedule(e, d));
        D.HOURS.forEach((h) => {
          const o = D.ordersAt(sid, d, h);
          day += o; S.orders += o; S.revenue += o * tk;
          const k = dow + '|' + h; R.heat[k] = (R.heat[k] || 0) + o; R.heatN[k] = (R.heatN[k] || 0) + 1;
          CODES.forEach((c) => { if (inShift(c, d, h)) { R.shift[c].orders += o; S.sh[c].orders += o; } });
        });
        CODES.forEach((c) => {
          const on = emps.filter((e) => D.shiftOf(e, d) === c);
          const m = on.reduce((t, e) => t + D.planMin(e, d), 0);
          R.shift[c].staffMin += m; S.sh[c].staffMin += m; R.shift[c].slots++;
          const min = D.shifts[c].minStaff;
          if (min && on.length < min) S.gaps++;
        });
        emps.forEach((e) => {
          const a = D.attOf(e, d); if (!a || !a.plan) return;
          const st = (R.staff[e.id] ||= { e, plan: 0, worked: 0, min: 0, late: 0, lateMin: 0, absent: 0 });
          st.plan++;
          if (a.in != null) { st.worked++; st.min += a.min; S.workMin += a.min; S.shifts++; }
          if (a.late) { st.late++; st.lateMin += a.late; S.late++; }
          if (a.status === 'absent') { st.absent++; S.absent++; }
        });
      });
      R.daily.push({ d, v: day });
    });
    Object.values(R.store).forEach((S) => { R.orders += S.orders; R.revenue += S.revenue; R.workMin += S.workMin; });
    return R;
  }

  const delta = (cur, prev, unit = '%') => {
    if (!prev) return '<span class="muted">Chưa có kỳ trước</span>';
    const p = ((cur - prev) / prev) * 100;
    const up = p >= 0;
    return `<span class="dlt ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${n1(Math.abs(p))}${unit}</span> so với kỳ trước`;
  };

  function render() {
    const stores = A.scopeStores();
    const r = range();
    const R = compute(r.start, r.end, stores), P = compute(r.pStart, r.pEnd, stores);
    const prod = R.workMin ? R.orders / (R.workMin / 60) : 0, pProd = P.workMin ? P.orders / (P.workMin / 60) : 0;

    // theo ca
    const sh = CODES.map((c) => { const x = R.shift[c]; return { c, s: D.shifts[c], avg: x.slots ? x.orders / x.slots : 0, prod: x.staffMin ? x.orders / (x.staffMin / 60) : 0, orders: x.orders }; });
    const maxAvg = Math.max(...sh.map((x) => x.avg)) || 1, maxProd = Math.max(...sh.map((x) => x.prod)) || 1;
    const busy = [...sh].sort((a, b) => b.avg - a.avg)[0], quiet = [...sh].sort((a, b) => a.avg - b.avg)[0];
    const hard = [...sh].sort((a, b) => b.prod - a.prod)[0];

    // bản đồ nhiệt: đơn trung bình mỗi cửa hàng theo thứ × giờ
    const dows = [1, 2, 3, 4, 5, 6, 0];
    const hv = (dw, h) => (R.heatN[dw + '|' + h] ? R.heat[dw + '|' + h] / R.heatN[dw + '|' + h] : 0);
    const all = dows.flatMap((dw) => D.HOURS.map((h) => hv(dw, h)));
    const hMax = Math.max(...all) || 1, hMin = Math.min(...all);
    const step = (v) => Math.min(RAMP.length - 1, Math.floor(((v - hMin) / (hMax - hMin || 1)) * RAMP.length));
    let peak = { v: -1 }, low = { v: 1e9 };
    dows.forEach((dw) => D.HOURS.forEach((h) => { const v = hv(dw, h); if (v > peak.v) peak = { v, dw, h }; if (v < low.v) low = { v, dw, h }; }));

    // cửa hàng
    const overall = {};
    CODES.forEach((c) => { const x = R.shift[c]; overall[c] = x.staffMin ? x.orders / (x.staffMin / 60) : 0; });
    const storeRows = stores.map((sid) => {
      const S = R.store[sid];
      const p = S.workMin ? S.orders / (S.workMin / 60) : 0;
      const per = CODES.map((c) => ({ c, v: S.sh[c].staffMin ? S.sh[c].orders / (S.sh[c].staffMin / 60) : Infinity }));
      const hi = per.filter((x) => x.v > overall[x.c] * 1.3).sort((a, b) => b.v - a.v)[0];
      const lo = per.filter((x) => x.v < overall[x.c] * 0.7).sort((a, b) => a.v - b.v)[0];
      const tip = hi ? { k: 'warn', t: `Cân nhắc thêm người ${D.shifts[hi.c].name.toLowerCase()}` } : lo ? { k: 'info', t: `Có thể giảm người ${D.shifts[lo.c].name.toLowerCase()}` } : { k: 'ok', t: 'Nhân sự cân đối' };
      return { sid, S, p, tip, lateRate: S.shifts ? (S.late / S.shifts) * 100 : 0 };
    }).sort((a, b) => b.S.orders - a.S.orders);
    const maxP = Math.max(...storeRows.map((x) => x.p)) || 1;
    const staff = Object.values(R.staff).map((s) => ({ ...s, rate: s.plan ? Math.max(0, Math.round(((s.worked - s.late * 0.5) / s.plan) * 100)) : 100 }))
      .sort((a, b) => a.rate - b.rate || b.late - a.late);
    const pgSt = A.paginate('rp-store', storeRows, 10), pgSf = A.paginate('rp-staff', staff, 10);

    // nhận định
    const insights = [
      `<b>${busy.s.name}</b> đông khách nhất, trung bình <b>${nf(busy.avg)} đơn</b> mỗi ca ở mỗi cửa hàng. ${quiet.s.name} vắng nhất với ${nf(quiet.avg)} đơn.`,
      `Khung giờ đông nhất là <b>${A.DOW_LONG[peak.dw]} ${String(peak.h).padStart(2, '0')}:00–${String(peak.h + 1).padStart(2, '0')}:00</b> (${n1(peak.v)} đơn/cửa hàng). Vắng nhất là ${A.DOW_LONG[low.dw]} ${String(low.h).padStart(2, '0')}:00 (${n1(low.v)} đơn).`,
      `Mỗi nhân viên ${hard.s.name.toLowerCase()} phục vụ <b>${n1(hard.prod)} đơn/giờ</b>, cao nhất trong các ca. Nên ưu tiên xếp thêm người vào ca này.`,
    ];
    const needMore = storeRows.filter((x) => x.tip.k === 'warn');
    if (needMore.length) insights.push(`${needMore.map((x) => '<b>' + D.stores[x.sid].name + '</b>').join(', ')}: ${needMore.map((x) => x.tip.t.toLowerCase()).join('; ')}.`);

    return `
      ${A.head('Báo cáo & phân tích', 'Phân tích lượng khách theo ca và khung giờ, năng suất nhân viên (số đơn trên mỗi giờ công) và hiệu suất từng cửa hàng. Số đơn lấy từ hệ thống bán hàng, giờ công lấy từ dữ liệu quản lý đã chấm. Dữ liệu tính đến hết ngày hôm qua.',
        `<div class="seg">${PERIODS.map(([k, l]) => `<button class="${ui.period === k ? 'on' : ''}" data-p="${k}">${l}</button>`).join('')}</div>
         <button class="btn btn-sec" data-act="export">${ic('download')} Xuất báo cáo</button>`)}
      <div class="rp-range muted">${A.dmy(r.start)} – ${A.dmy(r.end)} · ${r.len} ngày · ${stores.length} cửa hàng</div>

      <div class="card insight"><div class="card-h"><h3>${ic('leaf')} Nhận định nhanh</h3></div><ul>${insights.map((x) => `<li>${x}</li>`).join('')}</ul></div>

      <div class="kpis">
        ${A.kpi('Tổng số đơn', nf(R.orders), 'đơn', delta(R.orders, P.orders), 'pri', 'inbox')}
        ${A.kpi('Doanh thu ước tính', money(R.revenue), 'đồng', delta(R.revenue, P.revenue), '', 'wallet')}
        ${A.kpi('Giờ công thực tế', nf(R.workMin / 60), 'giờ', delta(R.workMin, P.workMin), '', 'clock')}
        ${A.kpi('Năng suất', n1(prod), 'đơn / giờ công', delta(prod, pProd), '', 'chart')}
      </div>

      <div class="rp-grid">
        <div class="card"><div class="card-h"><h3>Lượng khách theo ca</h3><span class="sub">Đơn trung bình mỗi ca, mỗi cửa hàng</span></div>
          <div class="hbars">${sh.map((x) => `<div class="hb" data-vt="<b>${A.esc(x.s.name)}</b> ${A.hm(D.timeAt(x.c).start)}–${A.hm(D.timeAt(x.c).end)}<br/>${nf(x.avg)} đơn / ca / cửa hàng<br/>Tổng ${nf(x.orders)} đơn">
            <span class="hb-l">${A.esc(x.s.name)}<small>${A.hm(D.timeAt(x.c).start)}–${A.hm(D.timeAt(x.c).end)}</small></span>
            <span class="hb-t"><i style="--c:${x.s.color};width:${(x.avg / maxAvg) * 100}%"></i></span>
            <span class="hb-v">${nf(x.avg)}${x === busy ? ' <span class="tag-b">Đông nhất</span>' : x === quiet ? ' <span class="tag-q">Vắng nhất</span>' : ''}</span></div>`).join('')}</div>
        </div>
        <div class="card"><div class="card-h"><h3>Năng suất theo ca</h3><span class="sub">Số đơn mỗi nhân viên phục vụ trong 1 giờ</span></div>
          <div class="hbars">${sh.map((x) => `<div class="hb" data-vt="<b>${A.esc(x.s.name)}</b><br/>${n1(x.prod)} đơn / giờ công<br/>${nf(R.shift[x.c].staffMin / 60)} giờ công đã xếp">
            <span class="hb-l">${A.esc(x.s.name)}<small>${nf(R.shift[x.c].staffMin / 60)} giờ công</small></span>
            <span class="hb-t"><i style="--c:${x.s.color};width:${(x.prod / maxProd) * 100}%"></i></span>
            <span class="hb-v">${n1(x.prod)}${x === hard ? ' <span class="tag-b">Quá tải</span>' : ''}</span></div>`).join('')}</div>
          <p class="rp-note">${ic('info')} Năng suất cao nghĩa là ít người phải phục vụ nhiều khách, dễ quá tải. Năng suất thấp có thể là đang dư người.</p>
        </div>
      </div>

      <div class="card"><div class="card-h"><h3>Khung giờ đông khách</h3><span class="sub">Đơn trung bình mỗi cửa hàng theo thứ và giờ</span><span class="grow"></span>
          <span class="hm-leg"><span>Ít</span>${RAMP.map((c) => `<i style="background:${c}"></i>`).join('')}<span>Nhiều</span></span></div>
        <div class="scroll-x"><div class="heat">
          <span></span>${D.HOURS.map((h) => `<span class="hx">${String(h).padStart(2, '0')}h</span>`).join('')}
          ${dows.map((dw) => `<span class="hy">${A.DOW_LONG[dw]}</span>${D.HOURS.map((h) => { const v = hv(dw, h), st = step(v); return `<span class="hc" style="background:${RAMP[st]}" data-vt="<b>${A.DOW_LONG[dw]}, ${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00</b><br/>${n1(v)} đơn / cửa hàng<br/>${CODES.filter((c) => inShift(c, r.end, h)).map((c) => D.shifts[c].name).join(', ') || 'Ngoài ca chính'}"></span>`; }).join('')}`).join('')}
          <span></span>${D.HOURS.map((h) => { const c = CODES.find((x) => inShift(x, r.end, h)); return `<span class="hs" style="--c:${c ? D.shifts[c].color : 'transparent'}" title="${c ? D.shifts[c].name : ''}"></span>`; }).join('')}
        </div></div>
        <div class="legend card-h" style="border:0;padding-top:0">${CODES.map((c) => `<span><i class="sw" style="--c:${D.shifts[c].color}"></i>${D.shifts[c].name}</span>`).join('')}<span class="muted">Dải màu dưới bản đồ cho biết giờ đó thuộc ca nào</span></div>
      </div>

      <div class="card"><div class="card-h"><h3>Số đơn theo ngày</h3><span class="sub">Tổng ${stores.length} cửa hàng · trung bình ${nf(R.orders / r.len)} đơn/ngày</span></div>
        <div class="line" id="rpLine" data-series='${JSON.stringify(R.daily)}'></div>
      </div>

      <div class="card"><div class="card-h"><h3>Hiệu suất theo cửa hàng</h3><span class="sub">Gợi ý dựa trên năng suất từng ca so với trung bình toàn hệ thống</span></div>
        <div class="scroll-x"><table class="t"><thead><tr><th>Cửa hàng</th><th class="r">Số đơn</th><th class="r">Doanh thu</th><th class="r">Giờ công</th><th>Năng suất (đơn / giờ công)</th><th class="r">Ca thiếu người</th><th class="r">Tỉ lệ đi trễ</th><th>Gợi ý</th></tr></thead><tbody>
          ${pgSt.items.map((x) => `<tr><td><b style="font-weight:500">${D.stores[x.sid].name}</b><br/><small class="muted">${D.branchOf(x.sid).name}</small></td>
            <td class="r num">${nf(x.S.orders)}</td><td class="r num">${money(x.S.revenue)}</td><td class="r num">${nf(x.S.workMin / 60)}</td>
            <td><span class="ib"><i style="width:${(x.p / maxP) * 100}%"></i></span><span class="num">${n1(x.p)}</span></td>
            <td class="r num">${x.S.gaps ? `<span class="late">${x.S.gaps}</span>` : '0'}</td>
            <td class="r num">${n1(x.lateRate)}%</td>
            <td><span class="bdg ${x.tip.k === 'warn' ? 'pending' : x.tip.k === 'info' ? 'upcoming' : 'active'}">${x.tip.t}</span></td></tr>`).join('')}
        </tbody></table></div>
        ${pgSt.html}
      </div>

      <div class="card"><div class="card-h"><h3>Chuyên cần nhân viên</h3><span class="sub">Sắp xếp từ chuyên cần thấp nhất trong kỳ (tính từ dữ liệu chấm công)</span></div>
        <div class="scroll-x"><table class="t"><thead><tr><th>Nhân viên</th><th>Cửa hàng</th><th class="r">Ca đã làm</th><th class="r">Giờ công</th><th class="r">Đi trễ</th><th class="r">Vắng</th><th>Chuyên cần</th></tr></thead><tbody>
          ${pgSf.items.map((s) => `<tr class="click" data-emp="${s.e.id}"><td>${A.person(s.e)}</td><td>${D.stores[s.e.storeId].name}</td><td class="r num">${s.worked}/${s.plan}</td><td class="r num">${A.hrs(s.min)}</td>
            <td class="r num">${s.late ? `<span class="late">${s.late} lần</span><br/><small class="muted">${s.lateMin} phút</small>` : '0'}</td><td class="r num">${s.absent ? `<span class="late">${s.absent}</span>` : '0'}</td>
            <td><span class="bdg ${s.rate >= 90 ? 'active' : s.rate >= 75 ? 'pending' : 'absent'}">${s.rate}%</span></td></tr>`).join('')}
        </tbody></table></div>
        ${pgSf.html}
      </div>`;
  }

  // biểu đồ đường: 1 chuỗi, nét 2px, lưới mờ, crosshair + tooltip khi rê chuột
  function drawLine(el) {
    const data = JSON.parse(el.dataset.series);
    const W = el.clientWidth || 800, H = 240, L = 48, Rr = 30, T = 16, B = 30;
    const max = Math.max(...data.map((x) => x.v)) * 1.1 || 1;
    const nice = Math.pow(10, Math.floor(Math.log10(max))) / 2;
    const top = Math.ceil(max / nice) * nice;
    const x = (i) => L + (data.length === 1 ? (W - L - Rr) / 2 : (i * (W - L - Rr)) / (data.length - 1));
    const y = (v) => T + (1 - v / top) * (H - T - B);
    const ticks = [0, .25, .5, .75, 1].map((f) => f * top);
    const pts = data.map((p, i) => `${x(i)},${y(p.v)}`).join(' ');
    const every = Math.ceil(data.length / 10);
    el.innerHTML = `<svg width="${W}" height="${H}" role="img" aria-label="Số đơn theo ngày">
      ${ticks.map((t) => `<line x1="${L}" x2="${W - Rr}" y1="${y(t)}" y2="${y(t)}" class="gl"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end" class="ax">${nf(t)}</text>`).join('')}
      ${data.map((p, i) => (i % every === 0 || i === data.length - 1 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="ax">${A.dm(p.d)}</text>` : '')).join('')}
      <polygon points="${x(0)},${y(0)} ${pts} ${x(data.length - 1)},${y(0)}" class="ar"/>
      <polyline points="${pts}" class="ln"/>
      <line class="xh" y1="${T}" y2="${H - B}" style="display:none"/><circle class="dot" r="5" style="display:none"/>
      <rect x="${L}" y="${T}" width="${W - L - Rr}" height="${H - T - B}" fill="transparent" class="hit"/>
    </svg>`;
    const svg = el.querySelector('svg'), xh = svg.querySelector('.xh'), dot = svg.querySelector('.dot');
    svg.querySelector('.hit').addEventListener('mousemove', (ev) => {
      const bx = svg.getBoundingClientRect().left;
      const i = Math.max(0, Math.min(data.length - 1, Math.round(((ev.clientX - bx - L) / (W - L - Rr)) * (data.length - 1))));
      const p = data[i];
      xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.style.display = '';
      dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(p.v)); dot.style.display = '';
      showTip(`<b>${A.DOW_LONG[A.dow(p.d)]}, ${A.dmy(p.d)}</b><br/>${nf(p.v)} đơn`, ev);
    });
    svg.querySelector('.hit').addEventListener('mouseleave', () => { xh.style.display = dot.style.display = 'none'; hideTip(); });
  }

  // tooltip dùng chung cho mọi phần tử có data-vt
  let tipEl;
  const showTip = (html, ev) => {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'vz-tip'; document.body.appendChild(tipEl); }
    tipEl.innerHTML = html; tipEl.style.display = 'block';
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let lx = ev.clientX + 14, ly = ev.clientY - h - 12;
    if (lx + w > innerWidth - 8) lx = ev.clientX - w - 14;
    if (ly < 8) ly = ev.clientY + 16;
    tipEl.style.left = lx + 'px'; tipEl.style.top = ly + 'px';
  };
  const hideTip = () => { if (tipEl) tipEl.style.display = 'none'; };

  function mount(v) {
    v.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { ui.period = b.dataset.p; A.refresh(); }));
    v.querySelector('[data-act="export"]').onclick = () => A.toast('Bản demo: xuất file bao-cao-hieu-suat.xlsx');
    v.querySelectorAll('[data-emp]').forEach((r) => (r.onclick = () => A.openProfile(D.emp(r.dataset.emp))));
    v.addEventListener('mousemove', (ev) => { const t = ev.target.closest('[data-vt]'); if (t) showTip(t.dataset.vt, ev); else if (!ev.target.closest('#rpLine')) hideTip(); });
    v.addEventListener('mouseleave', hideTip);
    const line = v.querySelector('#rpLine');
    if (line) requestAnimationFrame(() => drawLine(line));
  }
  window.addEventListener('resize', () => { const l = document.querySelector('#rpLine'); if (l) drawLine(l); });
  window.addEventListener('hashchange', hideTip);

  A.pages.reports = { render, mount };
})();
