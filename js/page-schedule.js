// Lịch trực & phân ca — lưới tuần theo cửa hàng; bấm ô để xếp ca, có thể chỉnh giờ riêng cho ngày đó
(() => {
  const { ic, data: D } = A;
  const ui = { week: A.weekStart(A.TODAY), q: '' };

  const weekDays = () => Array.from({ length: 7 }, (_, i) => A.add(ui.week, i));
  const covShifts = (sid) => Object.values(D.shifts).filter((s) => s.minStaff > 0 && D.appliesTo(s, sid));
  const covOf = (sid, d) => {
    const list = D.employees.filter((e) => e.storeId === sid);
    return covShifts(sid).map((s) => ({ s, n: list.filter((e) => D.shiftOf(e, d) === s.code).length }));
  };
  const markOf = (e, d) => {
    if (d > A.TODAY) return '';
    const a = D.attOf(e, d);
    if (!a || !a.plan) return '';
    if (a.status === 'absent') return '<i class="mk ab" title="Vắng mặt"></i>';
    if (a.status === 'working') return '<i class="mk wk" title="Đang làm"></i>';
    if (a.status === 'missing') return '<i class="mk ms" title="Chưa chấm công"></i>';
    if (a.late) return `<i class="mk lt" title="Đi trễ ${a.late} phút"></i>`;
    if (a.status === 'done') return '<i class="mk ok" title="Đúng giờ"></i>';
    return '';
  };

  function render() {
    const days = weekDays();
    const stores = A.scopeStores();
    const q = ui.q.trim().toLowerCase();
    const emps = A.staffInScope((e) => days.some((d) => D.inSchedule(e, d)) && (!q || e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)));
    let planMin = 0, shiftsN = 0, leaveN = 0, gaps = 0;
    emps.forEach((e) => days.forEach((d) => { const c = D.shiftOf(e, d); if (D.shifts[c]) { planMin += D.planMin(e, d); shiftsN++; } if (c === 'LEAVE') leaveN++; }));
    stores.forEach((sid) => days.forEach((d) => covOf(sid, d).forEach(({ s, n }) => { if (n < s.minStaff) gaps++; })));
    let emptyCells = 0;
    emps.forEach((e) => days.forEach((d) => { if (D.inSchedule(e, d) && D.shiftOf(e, d) == null) emptyCells++; }));
    const emptyWeek = emptyCells > 0;
    const pub = A.state.published[ui.week];
    const isCur = ui.week === A.weekStart(A.TODAY);
    const used = new Set();
    emps.forEach((e) => days.forEach((d) => used.add(D.shiftOf(e, d))));

    const pg = A.paginate('sched', stores.flatMap((sid) => emps.filter((e) => e.storeId === sid)), 20);
    const rows = stores.map((sid) => {
      const list = pg.items.filter((e) => e.storeId === sid);
      if (!list.length) return '';
      return `
        <tr class="grp"><td colspan="9"><div class="gh">${ic('store')} ${D.stores[sid].name} <small>· ${D.branchOf(sid).name} · ${emps.filter((e) => e.storeId === sid).length} nhân viên · mở cửa ${D.stores[sid].hours}</small></div></td></tr>
        ${list.map((e) => {
          let m = 0;
          const cells = days.map((d) => {
            const c = D.shiftOf(e, d);
            m += D.planMin(e, d);
            const sw = A.state.swapped[e.id + '|' + d] ? 'sw' : '';
            return `<td class="cell ${d === A.TODAY ? 'today' : ''} ${d < A.TODAY ? 'past' : ''}" data-e="${e.id}" data-d="${d}">${D.inSchedule(e, d) ? A.shiftChip(c, { mark: markOf(e, d), extra: sw, plan: D.planOf(e, d), date: d }) : ''}</td>`;
          }).join('');
          return `<tr><td>${A.person(e, D.roles[e.role] + (e.type === 'PT' ? ' · bán thời gian' : ''))}</td>${cells}<td class="r"><span class="hrs">${A.hrs(m)}</span> <small class="muted">giờ</small></td></tr>`;
        }).join('')}
        <tr class="cov"><td>Số người / ca</td>${days.map((d) => `<td>${covOf(sid, d).map(({ s, n }) => `<span class="${n < s.minStaff ? 'gap' : ''}" title="${s.name}: ${n}/${s.minStaff} người tối thiểu">${s.code}: ${n}</span>`).join(' · ')}</td>`).join('')}<td></td></tr>`;
    }).join('');

    return `
      ${A.head('Lịch trực & phân ca', 'Xếp ca theo tuần cho từng cửa hàng. Bấm vào một ô để xếp ca hoặc chỉnh giờ riêng cho ngày đó. Ngày đã qua và hôm nay có chấm màu theo kết quả quản lý đã chấm công.',
        `<button class="btn btn-sec" data-act="copy">${ic('copy')} Sao chép tuần trước</button>
         <button class="btn btn-sec" data-act="export">${ic('download')} Xuất Excel</button>
         <button class="btn btn-pri" data-act="publish">${ic('send')} ${pub ? 'Gửi lại lịch' : 'Công bố lịch'}</button>`)}
      <div class="kpis">
        ${A.kpi('Tổng giờ dự kiến', A.hrs(planMin), 'giờ', `Của ${emps.length} nhân viên trong tuần`, 'pri', 'clock')}
        ${A.kpi('Số ca đã xếp', shiftsN, 'ca', 'Trong tuần đang xem', '', 'cal')}
        ${A.kpi('Ca thiếu người', gaps, 'ca', gaps ? 'Chưa đủ số người tối thiểu, cần bổ sung' : 'Mọi ca đều đủ người', gaps ? 'alert' : '', 'alert')}
        ${A.kpi('Nghỉ phép', leaveN, 'ca', 'Ca nghỉ phép đã duyệt', '', 'inbox')}
      </div>
      <div class="card">
        <div class="card-h">
          <div class="datenav"><button data-wk="-1" title="Tuần trước">${ic('chevL')}</button><span>${A.dm(days[0])} – ${A.dmy(days[6])}</span><button data-wk="1" title="Tuần sau">${ic('chev')}</button>${isCur ? '' : '<button class="today" data-wk="0">Tuần này</button>'}</div>
          <span class="bdg ${pub ? 'approved' : 'pending'}">${pub ? 'Đã công bố cho nhân viên' : 'Bản nháp, chưa công bố'}</span>
          <span class="grow"></span>
          <label class="search">${ic('search')}<input id="schQ" placeholder="Tìm nhân viên…" value="${A.esc(ui.q)}"/></label>
        </div>
        <div class="card-h legend">
          ${Object.values(D.shifts).filter((s) => used.has(s.code)).map((s) => { const t = D.timeAt(s.code, ui.week); return `<span><i class="sw" style="--c:${s.color}"></i>${A.esc(s.name)} (${s.code}) ${A.hm(t.start)}–${A.hm(t.end)}</span>`; }).join('')}
          <span class="grow"></span>
          <span><i class="mk ok"></i>Đúng giờ</span><span><i class="mk lt"></i>Đi trễ</span><span><i class="mk ab"></i>Vắng</span><span><i class="mk ms"></i>Chưa chấm</span><span><i class="mk wk"></i>Đang làm</span><span>⇄ Đã đổi ca</span><span>* Giờ chỉnh riêng</span>
          <a href="#/shifts" class="btn btn-sec btn-sm">${ic('cog')} Thiết lập ca</a>
        </div>
        ${emptyWeek ? `<div class="card-h"><div class="warnbox info" style="margin:0;flex:1">${ic('cal')}<span>${days[6] > D.LAST_SAMPLE && days[0] > D.LAST_SAMPLE ? 'Tuần này chưa có lịch.' : 'Tuần này còn ' + emptyCells + ' ô chưa xếp ca.'} Bấm vào từng ô để xếp ca, hoặc dùng <b>Sao chép tuần trước</b> để lấy lịch tuần trước rồi chỉnh lại.</span></div></div>` : ''}
        <div class="scroll-x">
          ${emps.length ? `<table class="t sched"><thead><tr><th>Nhân viên</th>${days.map((d) => `<th class="d ${d === A.TODAY ? 'today' : ''}">${A.DOW[A.dow(d)]}<b>${A.dm(d).slice(0, 2)}</b></th>`).join('')}<th class="r">Tổng giờ</th></tr></thead><tbody>${rows}</tbody></table>` : A.emptyBox('Không có nhân viên phù hợp.')}
        </div>
        ${emps.length ? pg.html : ''}
      </div>`;
  }

  function editCell(e, d) {
    const cur = D.shiftOf(e, d);
    const curPlan = D.planOf(e, d);
    const opts = Object.values(D.shifts).filter((s) => D.appliesTo(s, e.storeId)).map((s) => s.code).concat('OFF');
    let sel = D.shifts[cur] ? cur : null;
    const m = A.modal(`
      <div class="m-h"><h3>Xếp ca · ${A.esc(e.name)}</h3><p>${A.DOW_LONG[A.dow(d)]}, ${A.dmy(d)} · ${D.stores[e.storeId].name} · ${D.roles[e.role]}</p></div>
      <div class="m-b">
        ${cur === 'LEAVE' ? `<div class="warnbox" style="margin:0 0 12px">${ic('alert')} Nhân viên có đơn nghỉ phép đã duyệt cho ngày này. Xếp ca mới sẽ ghi đè lên ngày nghỉ.</div>` : ''}
        <div class="fld"><label>Chọn ca</label><div class="pick">${opts.map((c) => `<button data-c="${c}">${A.shiftChip(c, { extra: c === (sel || cur) ? 'sel' : '', date: d })}</button>`).join('')}</div></div>
        <div id="cusBox"></div>
        <div class="fld" style="margin-top:14px"><label>Ghi chú cho nhân viên</label><input placeholder="VD: hỗ trợ kiểm kho cuối ca"/></div>
        <div class="f-err" id="edErr"></div>
      </div>
      <div class="m-f"><button class="btn btn-sec" data-close>Huỷ</button><button class="btn btn-pri" id="okShift">Lưu</button></div>`);
    const box = m.el.querySelector('#cusBox');
    const drawCus = () => {
      if (!sel || sel === 'OFF') { box.innerHTML = ''; return; }
      const t = D.timeAt(sel, d);
      const useCur = curPlan && curPlan.code === sel && curPlan.custom;
      box.innerHTML = `
        <div class="sep"></div>
        <div class="fld"><label>Giờ làm trong ngày này</label>
          <div class="f-grid"><div class="fld"><span class="hint">Bắt đầu</span><input type="time" id="cStart" value="${A.hm(useCur ? curPlan.start : t.start)}"/></div>
          <div class="fld"><span class="hint">Kết thúc</span><input type="time" id="cEnd" value="${A.hm(useCur ? curPlan.end : t.end)}"/></div></div>
          <span class="hint">Giờ mặc định của ${A.esc(D.shifts[sel].name)}: ${A.hm(t.start)}–${A.hm(t.end)}. Đổi giờ ở đây chỉ áp dụng cho ${A.esc(e.name)} ngày ${A.dm(d)}.</span>
        </div>`;
    };
    drawCus();
    m.el.querySelector('.pick').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-c]'); if (!b) return;
      sel = b.dataset.c;
      m.el.querySelectorAll('.pick .sh').forEach((x) => x.classList.remove('sel'));
      b.querySelector('.sh').classList.add('sel');
      drawCus();
    });
    m.el.querySelector('#okShift').onclick = () => {
      if (!sel) return (m.el.querySelector('#edErr').textContent = 'Vui lòng chọn một ca.');
      let custom = null;
      if (sel !== 'OFF') {
        const t = D.timeAt(sel, d);
        const st = A.toMin(m.el.querySelector('#cStart').value), en = A.toMin(m.el.querySelector('#cEnd').value);
        if (st == null || en == null) return (m.el.querySelector('#edErr').textContent = 'Vui lòng nhập đủ giờ bắt đầu và kết thúc.');
        if (en <= st) return (m.el.querySelector('#edErr').textContent = 'Giờ kết thúc phải sau giờ bắt đầu.');
        if (st !== t.start || en !== t.end) custom = { start: st, end: en };
      }
      D.setShift(e.id, d, sel, custom);
      A.state.published[ui.week] = false;
      m.close(); A.refresh();
      A.toast(`${e.name}: ${sel === 'OFF' ? 'nghỉ' : D.shifts[sel].name.toLowerCase()} ngày ${A.dm(d)}${custom ? ` (${A.hm(custom.start)}–${A.hm(custom.end)})` : ''}`);
    };
  }

  function mount(v) {
    v.querySelectorAll('[data-wk]').forEach((b) => (b.onclick = () => {
      const n = +b.dataset.wk;
      ui.week = n ? A.add(ui.week, 7 * n) : A.weekStart(A.TODAY);
      A.refresh();
    }));
    const q = v.querySelector('#schQ');
    if (q) q.oninput = () => { ui.q = q.value; A.refresh(); A.keepFocus('#schQ'); };
    v.querySelector('tbody')?.addEventListener('click', (ev) => {
      const td = ev.target.closest('td.cell'); if (!td || !td.innerHTML.trim()) return;
      if (td.classList.contains('past')) return A.toast('Ngày đã qua. Hãy điều chỉnh tại mục Chấm công.');
      editCell(D.emp(td.dataset.e), td.dataset.d);
    });
    v.querySelector('[data-act="copy"]').onclick = () => {
      // mỗi ô lấy ca cùng thứ của tuần trước; nếu tuần trước còn trống thì lùi tối đa 4 tuần
      let n = 0, back = 0;
      A.staffInScope().forEach((e) => weekDays().forEach((d) => {
        if (d < A.TODAY || !D.inSchedule(e, d)) return;
        for (let w = 1; w <= 4; w++) {
          const src = A.add(d, -7 * w), c = D.shiftOf(e, src);
          if (c == null) continue;
          D.setShift(e.id, d, c === 'LEAVE' ? 'OFF' : c, c === 'LEAVE' ? null : A.state.custom[e.id + '|' + src]);
          n++; if (w > 1) back++;
          break;
        }
      }));
      A.state.published[ui.week] = false;
      A.refresh();
      A.toast(!n ? 'Chưa có lịch trong 4 tuần trước để sao chép' : `Đã sao chép ${n} ca${back ? ` (${back} ca lấy từ các tuần trước đó vì tuần trước còn trống)` : ' từ tuần trước'}`);
    };
    v.querySelector('[data-act="export"]').onclick = () => A.toast('Bản demo: xuất file lich-truc.xlsx');
    v.querySelector('[data-act="publish"]').onclick = () => {
      A.state.published[ui.week] = true;
      A.refresh();
      A.toast(`Đã gửi lịch tuần ${A.dm(ui.week)} tới ${A.staffInScope((e) => D.inSchedule(e, ui.week)).length} nhân viên qua app`);
    };
  }

  A.pages.schedule = { render, mount };
})();
