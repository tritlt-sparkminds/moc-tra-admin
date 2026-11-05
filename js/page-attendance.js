// Chấm công — quản lý chấm giờ vào/ra hoặc đánh dấu vắng cho nhân viên theo ca; tổng hợp tháng (tổng giờ, số lần trễ)
(() => {
  const { ic, data: D } = A;
  const ui = { tab: 'day', date: A.TODAY, month: A.TODAY.slice(0, 7), filter: 'all', q: '' };
  const TL0 = 6 * 60, TL1 = 23 * 60; // trục timeline 06:00 → 23:00
  const pct = (m) => ((Math.min(Math.max(m, TL0), TL1) - TL0) / (TL1 - TL0)) * 100;

  const timeline = (a, isToday) => {
    if (!a.plan) return '<span class="muted">—</span>';
    const [s, e] = a.plan;
    let act = '';
    if (a.in != null) {
      const end = a.out ?? A.NOW_MIN;
      const lt = a.late ? (Math.min(a.late, end - a.in) / Math.max(1, end - a.in)) * 100 : 0;
      act = `<span class="act ${a.late ? 'lt' : ''} ${a.status === 'working' ? 'live' : ''}" style="left:${pct(a.in)}%;width:${pct(end) - pct(a.in)}%;--lt:${lt}%"></span>`;
    }
    return `<div class="tl" title="Ca ${A.hm(s)}–${A.hm(e)}"><span class="plan" style="left:${pct(s)}%;width:${pct(e) - pct(s)}%"></span>${act}${isToday ? `<span class="now" style="left:${pct(A.NOW_MIN)}%"></span>` : ''}</div>`;
  };

  const FILTERS = [['all', 'Tất cả'], ['working', 'Đang làm'], ['late', 'Đi trễ'], ['missing', 'Chưa chấm công'], ['absent', 'Vắng mặt'], ['done', 'Đã về'], ['upcoming', 'Sắp tới'], ['leave', 'Nghỉ phép']];
  const match = (a, f) => (f === 'all' ? a.status !== 'off' : f === 'late' ? a.late > 0 : a.status === f);
  const me = () => A.user?.name || 'Quản lý';

  function dayView() {
    const isToday = ui.date === A.TODAY;
    const q = ui.q.trim().toLowerCase();
    const all = A.staffInScope((e) => D.inSchedule(e, ui.date)).map((e) => ({ e, a: D.attOf(e, ui.date) })).filter((x) => x.a);
    const work = all.filter((x) => x.a.plan);
    const sum = (f) => all.filter((x) => match(x.a, f)).length;
    const totalMin = work.reduce((t, x) => t + x.a.min, 0);
    const lateMin = work.reduce((t, x) => t + x.a.late, 0);
    const list = all.filter((x) => match(x.a, ui.filter) && (!q || x.e.name.toLowerCase().includes(q)));
    const stores = A.scopeStores();
    const multi = stores.length > 1;

    const flat = stores.flatMap((sid) => list.filter((x) => x.e.storeId === sid).sort((p, r) => (p.a.plan?.[0] ?? 9999) - (r.a.plan?.[0] ?? 9999)));
    const pg = A.paginate('att-day', flat, 20);
    const rows = stores.map((sid) => {
      const g = pg.items.filter((x) => x.e.storeId === sid);
      if (!g.length) return '';
      return `${multi ? `<tr class="grp"><td colspan="9"><div class="gh">${ic('store')} ${D.stores[sid].name} <small>· ${list.filter((x) => x.e.storeId === sid).length} nhân viên</small></div></td></tr>` : ''}
        ${g.map(({ e, a }) => `
          <tr>
            <td>${A.person(e)}</td>
            <td>${a.plan ? `<b style="font-weight:500">${A.esc(D.shifts[a.shift].name)}</b><br/><small class="muted num">${A.hm(a.plan[0])} – ${A.hm(a.plan[1])}${D.planOf(e, ui.date)?.custom ? ' (chỉnh riêng)' : ''}</small>` : A.shiftChip(a.shift)}</td>
            <td class="num">${a.in != null ? `<span class="${a.late ? 'late' : ''}">${A.hm(a.in)}</span>` : '<span class="muted">—</span>'}${a.manual ? ` <span class="bdg plain upcoming" title="${A.esc((a.by ? 'Chấm bởi ' + a.by : '') + (a.note ? ' · ' + a.note : ''))}">chấm tay</span>` : ''}</td>
            <td class="num">${a.out != null ? `<span class="${a.early ? 'early' : ''}">${A.hm(a.out)}</span>` : '<span class="muted">—</span>'}</td>
            <td class="num">${a.late ? `<span class="late">${a.late} phút</span>` : a.plan && a.in != null ? '<span class="muted">Đúng giờ</span>' : '<span class="muted">—</span>'}${a.early ? `<br/><small class="early">về sớm ${a.early} phút</small>` : ''}</td>
            <td>${timeline(a, isToday)}</td>
            <td class="r num"><b style="font-weight:500">${a.min ? A.hrs(a.min) + ' giờ' : '—'}</b></td>
            <td>${A.attBadge(a)}</td>
            <td class="r">${actions(e, a)}</td>
          </tr>`).join('')}`;
    }).join('');

    return `
      <div class="kpis">
        ${A.kpi('Tổng giờ công', A.hrs(totalMin), 'giờ', isToday ? `Tính đến ${A.hm(A.NOW_MIN)} hôm nay` : 'Tổng giờ công trong ngày', 'pri', 'clock')}
        ${A.kpi(isToday ? 'Đang làm việc' : 'Đã hoàn thành ca', isToday ? sum('working') : sum('done'), `/ ${work.length} người`, isToday ? 'Nhân viên đang trong ca' : 'Trên tổng số người có lịch', '', 'users')}
        ${A.kpi('Chưa chấm công', sum('missing'), 'ca', sum('missing') ? 'Ca đã bắt đầu, quản lý chưa chấm' : 'Đã chấm đủ các ca đã bắt đầu', sum('missing') ? 'alert' : '', 'edit')}
        ${A.kpi('Đi trễ', sum('late'), 'lượt', `Tổng ${lateMin} phút trễ`, sum('late') ? 'alert' : '', 'alert')}
        ${A.kpi('Vắng mặt', sum('absent'), 'người', 'Quản lý đã đánh dấu vắng', sum('absent') ? 'alert' : '', 'user')}
      </div>
      <div class="card">
        <div class="card-h">
          <div class="datenav"><button data-day="-1" aria-label="Ngày trước">${ic('chevL')}</button><span>${A.DOW_LONG[A.dow(ui.date)]}, ${A.dmy(ui.date)}</span><button data-day="1" aria-label="Ngày sau">${ic('chev')}</button>${isToday ? '' : '<button class="today" data-day="0">Hôm nay</button>'}</div>
          <span class="grow"></span>
          ${sum('missing') ? `<button class="btn btn-sec" data-act="bulk" title="Ghi giờ vào bằng giờ bắt đầu ca cho các ca chưa chấm">${ic('check')} Chấm đúng giờ ${sum('missing')} ca chưa chấm</button>` : ''}
          <label class="search">${ic('search')}<input id="attQ" placeholder="Tìm nhân viên…" value="${A.esc(ui.q)}"/></label>
        </div>
        <div class="card-h"><div class="chips">${FILTERS.map(([k, l]) => `<button class="chip ${ui.filter === k ? 'on' : ''}" data-f="${k}">${l} <b>${sum(k)}</b></button>`).join('')}</div></div>
        <div class="scroll-x">
          ${list.length ? `<table class="t"><thead><tr><th>Nhân viên</th><th>Ca</th><th>Giờ vào</th><th>Giờ ra</th><th>Đi trễ</th><th><div class="tl-ax"><span>06:00</span><span>14:00</span><span>23:00</span></div></th><th class="r">Giờ công</th><th>Trạng thái</th><th></th></tr></thead><tbody>${rows}</tbody></table>${pg.html}` : A.emptyBox('Không có ca nào khớp bộ lọc.')}
        </div>
      </div>`;
  }

  function monthView() {
    const [y, mo] = ui.month.split('-').map(Number);
    const first = `${ui.month}-01`, lastDay = A.iso(new Date(y, mo, 0));
    const until = lastDay < A.TODAY ? lastDay : A.TODAY;
    const q = ui.q.trim().toLowerCase();
    const emps = A.staffInScope((e) => e.start <= lastDay && e.status !== 'left' && (!q || e.name.toLowerCase().includes(q)));
    const stat = emps.map((e) => {
      const s = { e, plan: 0, worked: 0, min: 0, planMin: 0, late: 0, lateMin: 0, absent: 0, leave: 0, early: 0 };
      if (first <= until) for (let d = first; d <= until; d = A.add(d, 1)) {
        const a = D.attOf(e, d); if (!a) continue;
        if (a.status === 'leave') { s.leave++; continue; }
        if (!a.plan) continue;
        s.plan++; s.planMin += D.planMin(e, d);
        if (a.in != null) { s.worked++; s.min += a.min; }
        if (a.status === 'absent') s.absent++;
        if (a.late && a.status !== 'missing') { s.late++; s.lateMin += a.late; }
        if (a.early) s.early++;
      }
      s.rate = s.plan ? Math.round(((s.worked - s.late * 0.5) / s.plan) * 100) : 100;
      return s;
    }).sort((p, r) => r.min - p.min);
    const T = stat.reduce((t, s) => ({ min: t.min + s.min, plan: t.plan + s.plan, worked: t.worked + s.worked, late: t.late + s.late, lateMin: t.lateMin + s.lateMin, absent: t.absent + s.absent, leave: t.leave + s.leave }), { min: 0, plan: 0, worked: 0, late: 0, lateMin: 0, absent: 0, leave: 0 });
    const pgM = A.paginate('att-month', stat, 20);
    const top = [...stat].sort((p, r) => r.late - p.late)[0];
    const isCur = ui.month === A.TODAY.slice(0, 7);

    return `
      <div class="kpis">
        ${A.kpi('Tổng giờ công', A.hrs(T.min), 'giờ', `${emps.length} nhân viên · tính đến ${A.dm(until)}`, 'pri', 'clock')}
        ${A.kpi('Ca đã làm', T.worked, `/ ${T.plan} ca`, 'Số ca đã làm trên số ca đã xếp', '', 'cal')}
        ${A.kpi('Đi trễ', T.late, 'lượt', `${T.lateMin} phút${top?.late ? ` · nhiều nhất: ${top.e.name} (${top.late} lần)` : ''}`, T.late ? 'alert' : '', 'alert')}
        ${A.kpi('Vắng mặt / Nghỉ phép', `${T.absent} / ${T.leave}`, '', 'Ca vắng không phép / ngày nghỉ phép', '', 'user')}
      </div>
      <div class="card">
        <div class="card-h">
          <div class="datenav"><button data-mo="-1" aria-label="Tháng trước">${ic('chevL')}</button><span>Tháng ${mo}/${y}</span><button data-mo="1" aria-label="Tháng sau">${ic('chev')}</button>${isCur ? '' : '<button class="today" data-mo="0">Tháng này</button>'}</div>
          <span class="grow"></span>
          <label class="search">${ic('search')}<input id="attQ" placeholder="Tìm nhân viên…" value="${A.esc(ui.q)}"/></label>
          <button class="btn btn-sec" data-act="export">${ic('download')} Xuất bảng công</button>
        </div>
        <div class="scroll-x">
          ${stat.length ? `<table class="t"><thead><tr><th>Nhân viên</th><th>Cửa hàng</th><th class="r">Ca làm</th><th class="r">Tổng giờ</th><th class="r">Giờ theo lịch</th><th class="r">Đi trễ</th><th class="r">Về sớm</th><th class="r">Vắng</th><th class="r">Nghỉ phép</th><th>Chuyên cần</th></tr></thead>
          <tbody>${pgM.items.map((s) => `<tr class="click" data-emp="${s.e.id}">
            <td>${A.person(s.e)}</td><td>${D.stores[s.e.storeId].name}</td>
            <td class="r num">${s.worked}/${s.plan}</td>
            <td class="r"><span class="hrs">${A.hrs(s.min)}</span></td>
            <td class="r num muted">${A.hrs(s.planMin)}</td>
            <td class="r num">${s.late ? `<span class="late">${s.late} lần</span><br/><small class="muted">${s.lateMin} phút</small>` : '<span class="muted">0</span>'}</td>
            <td class="r num">${s.early || '<span class="muted">0</span>'}</td>
            <td class="r num">${s.absent ? `<span class="late">${s.absent}</span>` : '<span class="muted">0</span>'}</td>
            <td class="r num">${s.leave || '<span class="muted">0</span>'}</td>
            <td><span class="bdg ${s.rate >= 90 ? 'active' : s.rate >= 75 ? 'pending' : 'absent'}">${Math.max(0, s.rate)}%</span></td></tr>`).join('')}</tbody>
          <tfoot><tr><td>Tổng</td><td></td><td class="r num">${T.worked}/${T.plan}</td><td class="r"><span class="hrs">${A.hrs(T.min)}</span></td><td></td><td class="r num">${T.late} lần</td><td></td><td class="r num">${T.absent}</td><td class="r num">${T.leave}</td><td></td></tr></tfoot></table>${pgM.html}` : A.emptyBox('Chưa có dữ liệu chấm công tháng này.')}
        </div>
      </div>`;
  }

  function render() {
    return `
      ${A.head('Chấm công', `Quản lý cửa hàng chấm công cho nhân viên theo từng ca: ghi giờ vào, giờ ra hoặc đánh dấu vắng mặt. Nhân viên không tự chấm. Giờ vào muộn hơn giờ bắt đầu ca quá ${A.state.rules.grace} phút được tính là đi trễ (đổi trong mục Ca làm việc).`,
        `<div class="seg"><button class="${ui.tab === 'day' ? 'on' : ''}" data-tab="day">Theo ngày</button><button class="${ui.tab === 'month' ? 'on' : ''}" data-tab="month">Tổng hợp tháng</button></div>`)}
      ${ui.tab === 'day' ? dayView() : monthView()}`;
  }

  // nút thao tác của quản lý trên từng ca
  function actions(e, a) {
    if (!a.plan || a.status === 'upcoming') return '';
    if (a.status === 'missing') return `<button class="btn btn-pri btn-sm" data-punch="in" data-e="${e.id}">Chấm vào</button> <button class="btn btn-sec btn-sm" data-punch="absent" data-e="${e.id}">Vắng</button>`;
    if (a.status === 'working') return `<button class="btn btn-sec btn-sm" data-punch="out" data-e="${e.id}">Chấm ra</button> <button class="icon-btn" data-punch="edit" data-e="${e.id}" title="Sửa chấm công">${ic('edit')}</button>`;
    return `<button class="icon-btn" data-punch="edit" data-e="${e.id}" title="Sửa chấm công">${ic('edit')}</button>`;
  }

  function punch(e, mode) {
    const a = D.attOf(e, ui.date), k = e.id + '|' + ui.date;
    const isToday = ui.date === A.TODAY;
    const recorded = mode === 'edit' && (a.in != null || a.status === 'absent'); // chỉ bắt ghi chú khi sửa dữ liệu đã chấm
    const vIn = a.in ?? (mode === 'in' ? (isToday ? A.NOW_MIN : a.plan[0]) : null);
    const vOut = a.out ?? (mode === 'out' ? (isToday ? A.NOW_MIN : a.plan[1]) : null);
    let absent = mode === 'absent' || a.status === 'absent';
    const title = { in: 'Chấm giờ vào', out: 'Chấm giờ ra', absent: 'Đánh dấu vắng mặt', edit: 'Sửa chấm công' }[mode];
    const m = A.modal(`
      <div class="m-h"><h3>${title} · ${A.esc(e.name)}</h3><p>${A.esc(D.shifts[a.shift].name)} ${A.hm(a.plan[0])}–${A.hm(a.plan[1])} · ${A.DOW_LONG[A.dow(ui.date)]}, ${A.dmy(ui.date)} · ${D.stores[e.storeId].name}</p></div>
      <div class="m-b f-grid">
        <div class="fld full"><label>Tình trạng</label><div class="radio"><label><input type="radio" name="pSt" value="present" ${absent ? '' : 'checked'}/> Có mặt</label><label><input type="radio" name="pSt" value="absent" ${absent ? 'checked' : ''}/> Vắng mặt</label></div></div>
        <div class="fld pT"><label>Giờ vào</label><input type="time" id="pIn" value="${vIn != null ? A.hm(vIn) : ''}"/></div>
        <div class="fld pT"><label>Giờ ra</label><input type="time" id="pOut" value="${vOut != null ? A.hm(vOut) : ''}"/><span class="hint">Để trống nếu nhân viên vẫn đang trong ca</span></div>
        <div class="fld full"><label>Ghi chú${recorded ? ' (bắt buộc khi sửa)' : ''}</label><textarea id="pNote" placeholder="${recorded ? 'VD: nhập nhầm giờ, ca trưởng xác nhận lại' : 'Không bắt buộc'}">${A.esc(a.note || '')}</textarea></div>
        <div class="warnbox info full" style="margin:0">${ic('user')} Người chấm: ${me()} · Ghi nhận lúc ${A.hm(A.NOW_MIN)} ${A.dm(A.TODAY)}</div>
        <div class="f-err full" id="pErr"></div>
      </div>
      <div class="m-f"><button class="btn btn-sec" data-close>Huỷ</button><button class="btn btn-pri" id="pOk">Lưu chấm công</button></div>`);
    const $m = (x) => m.el.querySelector(x);
    const sync = () => { absent = m.el.querySelector('[name="pSt"]:checked').value === 'absent'; m.el.querySelectorAll('.pT').forEach((x) => (x.style.display = absent ? 'none' : '')); };
    m.el.querySelectorAll('[name="pSt"]').forEach((r) => (r.onchange = sync)); sync();
    $m('#pOk').onclick = () => {
      const err = (x) => ($m('#pErr').textContent = x);
      const note = $m('#pNote').value.trim();
      if (recorded && !note) return err('Vui lòng ghi chú lý do khi sửa dữ liệu đã chấm.');
      if (absent) {
        A.state.att[k] = { in: null, out: null, absent: true, note, by: me() };
      } else {
        const i = A.toMin($m('#pIn').value), o = A.toMin($m('#pOut').value);
        if (i == null) return err('Vui lòng nhập giờ vào.');
        if (o != null && o <= i) return err('Giờ ra phải sau giờ vào.');
        if (isToday && (i > A.NOW_MIN || (o != null && o > A.NOW_MIN))) return err(`Giờ chấm không được sau thời điểm hiện tại (${A.hm(A.NOW_MIN)}).`);
        A.state.att[k] = { in: i, out: o, absent: false, note, by: me() };
      }
      m.close(); A.refresh();
      A.toast(absent ? `Đã đánh dấu ${e.name} vắng mặt` : `Đã lưu chấm công cho ${e.name}`);
    };
  }

  function mount(v) {
    v.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { ui.tab = b.dataset.tab; A.refresh(); }));
    v.querySelectorAll('[data-day]').forEach((b) => (b.onclick = () => { const n = +b.dataset.day; ui.date = n ? A.add(ui.date, n) : A.TODAY; A.refresh(); }));
    v.querySelectorAll('[data-mo]').forEach((b) => (b.onclick = () => {
      const n = +b.dataset.mo; if (!n) ui.month = A.TODAY.slice(0, 7);
      else { const [y, m] = ui.month.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); ui.month = A.iso(d).slice(0, 7); }
      A.refresh();
    }));
    v.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { ui.filter = b.dataset.f; A.refresh(); }));
    v.querySelectorAll('[data-punch]').forEach((b) => (b.onclick = () => punch(D.emp(b.dataset.e), b.dataset.punch)));
    v.querySelector('[data-act="bulk"]')?.addEventListener('click', () => {
      const list = A.staffInScope((e) => D.inSchedule(e, ui.date)).filter((e) => D.attOf(e, ui.date)?.status === 'missing');
      list.forEach((e) => { const a = D.attOf(e, ui.date); A.state.att[e.id + '|' + ui.date] = { in: a.plan[0], out: ui.date < A.TODAY || a.plan[1] <= A.NOW_MIN ? a.plan[1] : null, absent: false, note: 'Chấm đúng giờ theo ca', by: me() }; });
      A.refresh(); A.toast(`Đã chấm đúng giờ cho ${list.length} ca`);
    });
    v.querySelectorAll('[data-emp]').forEach((r) => (r.onclick = () => A.openProfile(D.emp(r.dataset.emp))));
    v.querySelector('[data-act="export"]')?.addEventListener('click', () => A.toast(`Bản demo: xuất file bang-cong-${ui.month}.xlsx`));
    const q = v.querySelector('#attQ');
    if (q) q.oninput = () => { ui.q = q.value; A.refresh(); A.keepFocus('#attQ'); };
  }

  A.pages.attendance = { render, mount };
})();
