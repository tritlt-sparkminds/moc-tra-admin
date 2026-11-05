// Đơn nghỉ phép & đổi ca — duyệt/từ chối; duyệt xong cập nhật thẳng vào lịch trực
(() => {
  const { ic, data: D } = A;
  const ui = { kind: 'leave', status: 'pending' };
  const ST = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };
  const ago = (ts) => {
    const [d, t] = ts.split(' ');
    const min = Math.round((A.NOW - new Date(...d.split('-').map((x, i) => (i === 1 ? x - 1 : +x)), ...t.split(':').map(Number))) / 6e4);
    if (min < 60) return `${min} phút trước`;
    if (min < 1440) return `${Math.round(min / 60)} giờ trước`;
    return `${Math.round(min / 1440)} ngày trước`;
  };
  const shiftTxt = (c, d) => (D.shifts[c] ? `${D.shifts[c].name} ${A.hm(D.timeAt(c, d).start)}–${A.hm(D.timeAt(c, d).end)}` : c === 'OFF' ? 'Đang nghỉ' : c === 'LEAVE' ? 'Nghỉ phép' : '—');
  const weekMin = (e, date) => { const ws = A.weekStart(date); let m = 0; for (let i = 0; i < 7; i++) m += D.planMin(e, A.add(ws, i)); return m; };

  // cảnh báo: thiếu người sau khi duyệt, vượt giờ, lịch đã thay đổi
  const warnings = (r) => {
    const w = [];
    const e = D.emp(r.empId);
    if (r.kind === 'leave') {
      for (let d = r.from; d <= r.to; d = A.add(d, 1)) {
        const c = D.shiftOf(e, d);
        if (!D.shifts[c] || !D.shifts[c].minStaff) continue;
        const others = D.employees.filter((x) => x !== e && x.storeId === e.storeId && D.shiftOf(x, d) === c).length;
        if (others < D.shifts[c].minStaff) w.push(`${D.shifts[c].name} ${A.dm(d)} tại ${D.stores[e.storeId].name} sẽ thiếu người (còn ${others}/${D.shifts[c].minStaff}).`);
      }
      if (r.type === 'annual' && e.leaveTotal - e.leaveUsed < A.days(r.from, r.to)) w.push('Số ngày xin nghỉ vượt quỹ phép còn lại.');
    } else {
      const t = D.emp(r.targetId);
      if (D.shiftOf(e, r.date) !== r.fromShift || D.shiftOf(t, r.date) !== r.toShift) w.push('Lịch của một trong hai người đã thay đổi kể từ khi tạo đơn.');
      const add = D.codeMin(r.fromShift, r.date) - D.codeMin(r.toShift, r.date), max = A.state.rules.maxWeek;
      if (weekMin(t, r.date) + add > max * 60) w.push(`${t.name} sẽ vượt ${max} giờ/tuần.`);
    }
    return w;
  };

  const card = (r, i) => {
    const e = D.emp(r.empId);
    const isLeave = r.kind === 'leave';
    let what;
    if (isLeave) {
      const n = A.days(r.from, r.to);
      const left = e.leaveTotal - e.leaveUsed;
      const affected = [];
      for (let d = r.from; d <= r.to; d = A.add(d, 1)) { const c = D.shiftOf(e, d); if (D.shifts[c]) affected.push(`${D.shifts[c].name.toLowerCase()} ${A.dm(d)}`); }
      what = `<h4>${D.leaveTypes[r.type]} · ${n} ngày</h4>
        <p>${A.DOW_LONG[A.dow(r.from)]} ${A.dmy(r.from)}${n > 1 ? ` → ${A.DOW_LONG[A.dow(r.to)]} ${A.dmy(r.to)}` : ''}${affected.length && r.status === 'pending' ? ` · ảnh hưởng ${affected.length} ca: ${affected.join(', ')}` : ''}</p>
        ${r.type === 'annual' && e.leaveTotal ? `<div class="bal">${Array.from({ length: e.leaveTotal }, (_, k) => `<i class="${k < e.leaveUsed ? 'u' : r.status === 'pending' && k < e.leaveUsed + n ? 'n' : ''}"></i>`).join('')}&nbsp; Phép năm còn ${left}/${e.leaveTotal} ngày</div>` : ''}`;
    } else {
      const t = D.emp(r.targetId);
      what = `<h4>${r.mode === 'cover' ? 'Nhờ làm thay' : 'Đổi ca'} · ${A.DOW_LONG[A.dow(r.date)]} ${A.dm(r.date)}</h4>
        <div class="swap"><span class="side"><b class="sw-n">${A.esc(e.name.split(' ').slice(-2).join(' '))}</b>${A.shiftChip(r.fromShift, { date: r.date })}</span><span class="arr">${ic('swap')}</span><span class="side"><span><b style="font-weight:500;font-size:12.5px">${A.esc(t.name)}</b><br/><small class="muted">${r.mode === 'cover' ? 'đang nghỉ → nhận ca' : shiftTxt(r.toShift, r.date)}</small></span></span></div>`;
    }
    const w = r.status === 'pending' ? warnings(r) : [];
    return `
      <article class="rq">
        <div>${A.person(e, `${D.roles[e.role]} · ${D.stores[e.storeId].name}`)}<div class="meta" style="text-align:left;margin-top:8px">Gửi ${ago(r.created)} · ${r.id}</div></div>
        <div class="what">${what}<div class="reason">Lý do: ${A.esc(r.reason)}</div>
          ${w.map((x) => `<div class="warnbox">${ic('alert')}${x}</div>`).join('')}
          ${r.note ? `<div class="warnbox err">${ic('close')} Lý do từ chối: ${A.esc(r.note)}</div>` : ''}</div>
        <div>${r.status === 'pending'
          ? `<div class="act"><button class="btn btn-no btn-sm" data-no="${r.id}">${ic('close')} Từ chối</button><button class="btn btn-ok btn-sm" data-ok="${r.id}">${ic('check')} Duyệt</button></div>`
          : `<div class="act"><span class="bdg ${r.status}">${ST[r.status]}</span></div><div class="meta">bởi ${A.esc(r.by || 'Quản lý vùng')}</div>`}</div>
      </article>`;
  };

  function render() {
    const st = A.scopeStores();
    const inScope = D.requests.filter((r) => st.includes(D.emp(r.empId).storeId));
    const pend = (k) => inScope.filter((r) => r.kind === k && r.status === 'pending').length;
    const ofKind = inScope.filter((r) => r.kind === ui.kind);
    const list = ofKind.filter((r) => ui.status === 'all' || r.status === ui.status).sort((a, b) => b.created.localeCompare(a.created));
    const pg = A.paginate('req-' + ui.kind + '-' + ui.status, list, 5);
    const cnt = (s) => ofKind.filter((r) => s === 'all' || r.status === s).length;
    const leaveDaysWeek = inScope.filter((r) => r.kind === 'leave' && r.status === 'approved').reduce((t, r) => t + A.days(r.from, r.to), 0);
    return `
      ${A.head('Nghỉ phép & đổi ca', 'Nhân viên gửi đơn từ app. Duyệt xong, lịch trực được cập nhật và nhân viên nhận thông báo ngay.',
        `<div class="seg"><button class="${ui.kind === 'leave' ? 'on' : ''}" data-k="leave">Nghỉ phép${pend('leave') ? `<i>${pend('leave')}</i>` : ''}</button><button class="${ui.kind === 'swap' ? 'on' : ''}" data-k="swap">Đổi ca${pend('swap') ? `<i>${pend('swap')}</i>` : ''}</button></div>`)}
      <div class="kpis">
        ${A.kpi('Chờ duyệt', pend('leave') + pend('swap'), 'đơn', 'Tổng số đơn đang chờ bạn', pend('leave') + pend('swap') ? 'alert' : '', 'inbox')}
        ${A.kpi('Đơn nghỉ phép', pend('leave'), 'đơn', 'Nghỉ phép chờ duyệt', '', 'cal')}
        ${A.kpi('Đơn đổi ca', pend('swap'), 'đơn', 'Đổi ca / nhờ làm thay chờ duyệt', '', 'swap')}
        ${A.kpi('Ngày nghỉ đã duyệt', leaveDaysWeek, 'ngày', 'Trong tháng này', '', 'check')}
      </div>
      <div class="toolbar"><div class="chips">${['pending', 'approved', 'rejected', 'all'].map((s) => `<button class="chip ${ui.status === s ? 'on' : ''}" data-s="${s}">${s === 'all' ? 'Tất cả' : ST[s]} <b>${cnt(s)}</b></button>`).join('')}</div></div>
      <div class="rq-list">${list.length ? pg.items.map(card).join('') : `<div class="card">${A.emptyBox(ui.status === 'pending' ? 'Không còn đơn nào chờ duyệt.' : 'Chưa có đơn.')}</div>`}</div>${list.length ? pg.html : ''}`;
  }

  function mount(v) {
    v.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => { ui.kind = b.dataset.k; A.refresh(); }));
    v.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { ui.status = b.dataset.s; A.refresh(); }));
    v.querySelectorAll('[data-ok]').forEach((b) => (b.onclick = () => {
      const r = D.requests.find((x) => x.id === b.dataset.ok);
      D.applyRequest(r); r.status = 'approved'; r.by = A.user.name;
      A.refresh(); A.toast(`Đã duyệt đơn của ${D.emp(r.empId).name} — lịch trực đã cập nhật`);
    }));
    v.querySelectorAll('[data-no]').forEach((b) => (b.onclick = () => {
      const r = D.requests.find((x) => x.id === b.dataset.no);
      const m = A.modal(`
        <div class="m-h"><h3>Từ chối đơn</h3><p>${A.esc(D.emp(r.empId).name)} sẽ nhận được lý do qua app.</p></div>
        <div class="m-b"><div class="fld"><label>Lý do từ chối</label><textarea id="rjNote" placeholder="VD: cửa hàng thiếu người trong ngày này"></textarea></div></div>
        <div class="m-f"><button class="btn btn-sec" data-close>Huỷ</button><button class="btn btn-no" id="rjOk">Từ chối đơn</button></div>`);
      m.el.querySelector('#rjOk').onclick = () => {
        const note = m.el.querySelector('#rjNote').value.trim();
        if (!note) return A.toast('Vui lòng nhập lý do');
        r.status = 'rejected'; r.note = note; r.by = A.user.name;
        m.close(); A.refresh(); A.toast('Đã từ chối đơn ' + r.id);
      };
    }));
  }

  A.pages.requests = { render, mount };
})();
