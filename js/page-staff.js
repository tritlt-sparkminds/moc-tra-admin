// Hồ sơ nhân sự — danh sách, lọc vai trò/trạng thái, drawer hồ sơ chi tiết, thêm/sửa nhân viên
(() => {
  const { ic, data: D } = A;
  const ui = { q: '', role: '', status: 'all' };
  const STATUS = [['all', 'Tất cả'], ['active', 'Đang làm việc'], ['probation', 'Thử việc'], ['paused', 'Tạm nghỉ'], ['left', 'Đã nghỉ việc']];
  const tenure = (start) => {
    const m = Math.max(0, Math.round((A.parse(A.TODAY) - A.parse(start)) / (30.44 * 864e5)));
    return m < 12 ? `${m} tháng` : `${Math.floor(m / 12)} năm${m % 12 ? ` ${m % 12} tháng` : ''}`;
  };
  const monthStat = (e) => {
    const s = { min: 0, shifts: 0, late: 0 };
    for (let d = A.TODAY.slice(0, 8) + '01'; d <= A.TODAY; d = A.add(d, 1)) {
      const a = D.attOf(e, d);
      if (a?.in != null) { s.min += a.min; s.shifts++; }
      if (a?.late && a.status !== 'missing') s.late++;
    }
    return s;
  };

  function render() {
    const q = ui.q.trim().toLowerCase();
    const base = A.staffInScope();
    const list = base.filter((e) => (ui.status === 'all' || e.status === ui.status) && (!ui.role || e.role === ui.role) && (!q || (e.name + e.id + e.phone).toLowerCase().includes(q)));
    const pg = A.paginate('staff', list, 10);
    const n = (s) => base.filter((e) => s === 'all' || e.status === s).length;
    const today = base.map((e) => D.attOf(e, A.TODAY)).filter(Boolean);
    return `
      ${A.head('Hồ sơ nhân sự', 'Thông tin cá nhân, vị trí, hợp đồng và quỹ phép của nhân viên theo từng cửa hàng.',
        `<button class="btn btn-sec" data-act="export">${ic('download')} Xuất danh sách</button><button class="btn btn-pri" data-act="add">${ic('plus')} Thêm nhân viên</button>`)}
      <div class="kpis">
        ${A.kpi('Tổng nhân sự', n('active') + n('probation'), 'người', `${base.filter((e) => e.type === 'FT' && e.status !== 'left').length} toàn thời gian · ${base.filter((e) => e.type === 'PT' && e.status !== 'left').length} bán thời gian`, 'pri', 'users')}
        ${A.kpi('Đang trong ca', today.filter((a) => a.status === 'working').length, 'người', 'Lúc ' + A.hm(A.NOW_MIN) + ' hôm nay', '', 'clock')}
        ${A.kpi('Thử việc', n('probation'), 'người', 'Đang trong thời gian thử việc', '', 'user')}
        ${A.kpi('Tạm nghỉ / Đã nghỉ việc', `${n('paused')} / ${n('left')}`, '', 'Không xếp vào lịch', '', 'logout')}
      </div>
      <div class="toolbar">
        <label class="search">${ic('search')}<input id="stQ" placeholder="Tìm theo tên, mã NV, số điện thoại…" value="${A.esc(ui.q)}"/></label>
        <select class="select" id="stRole"><option value="">Tất cả vị trí</option>${Object.entries(D.roles).map(([k, v]) => `<option value="${k}" ${ui.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <span class="grow"></span>
        <div class="chips">${STATUS.map(([k, l]) => `<button class="chip ${ui.status === k ? 'on' : ''}" data-s="${k}">${l} <b>${n(k)}</b></button>`).join('')}</div>
      </div>
      <div class="card"><div class="scroll-x">
        ${list.length ? `<table class="t"><thead><tr><th>Nhân viên</th><th>Vị trí</th><th>Cửa hàng</th><th>Loại HĐ</th><th>Điện thoại</th><th>Ngày vào làm</th><th class="r">Phép còn</th><th>Hôm nay</th><th>Trạng thái</th></tr></thead><tbody>
        ${pg.items.map((e) => { const a = D.attOf(e, A.TODAY); return `<tr class="click" data-emp="${e.id}">
          <td>${A.person(e, e.id + ' · ' + e.email)}</td><td>${D.roles[e.role]}</td>
          <td>${D.stores[e.storeId].name}<br/><small class="muted">${D.branchOf(e.storeId).name}</small></td>
          <td>${e.type === 'FT' ? 'Toàn thời gian' : 'Bán thời gian'}</td><td class="num">${e.phone}</td>
          <td class="num">${A.dmy(e.start)}<br/><small class="muted">${tenure(e.start)}</small></td>
          <td class="r num">${e.leaveTotal ? `${e.leaveTotal - e.leaveUsed}/${e.leaveTotal}` : '<span class="muted">—</span>'}</td>
          <td>${a ? A.attBadge(a) : '<span class="muted">—</span>'}</td>
          <td><span class="bdg ${e.status}">${D.statusName[e.status]}</span></td></tr>`; }).join('')}
        </tbody></table>${pg.html}` : A.emptyBox('Không tìm thấy nhân viên phù hợp.')}
      </div></div>`;
  }

  // drawer hồ sơ — dùng chung cho các trang khác
  A.openProfile = (e) => {
    const s = monthStat(e);
    const ws = A.weekStart(A.TODAY);
    const week = Array.from({ length: 7 }, (_, i) => A.add(ws, i));
    const reqs = D.requests.filter((r) => r.empId === e.id || r.targetId === e.id);
    const m = A.modal(`
      <div class="pf-head"><div class="pf-mt">${A.mountains()}</div><span class="pf-bl">${A.bloom4('currentColor')}</span>
        <div class="in">${A.av(e, 'lg')}<div><h2>${A.esc(e.name)}</h2><p>${e.id} · ${D.roles[e.role]} · ${D.stores[e.storeId].name} (${D.branchOf(e.storeId).name})</p>
        <div style="margin-top:8px;display:flex;gap:6px"><span class="bdg ${e.status}">${D.statusName[e.status]}</span><span class="bdg plain">${e.type === 'FT' ? 'Toàn thời gian' : 'Bán thời gian'}</span></div></div></div>
      </div>
      <div class="pf-stats">
        <div><b>${A.hrs(s.min)}</b><small>giờ công tháng ${+A.TODAY.slice(5, 7)}</small></div>
        <div><b>${s.shifts}</b><small>ca đã làm</small></div>
        <div><b style="${s.late ? 'color:var(--coral)' : ''}">${s.late}</b><small>lần đi trễ</small></div>
        <div><b>${e.leaveTotal ? e.leaveTotal - e.leaveUsed : '—'}</b><small>ngày phép còn</small></div>
      </div>
      <div class="pf-sec"><h4>Lịch tuần này</h4><div class="week-mini">${week.map((d) => `<div>${A.DOW[A.dow(d)]} ${A.dm(d).slice(0, 2)}${D.inSchedule(e, d) ? A.shiftChip(D.shiftOf(e, d), { short: true, plan: D.planOf(e, d), date: d }) : '<span class="sh none">—</span>'}</div>`).join('')}</div></div>
      <div class="pf-sec"><h4>Thông tin cá nhân</h4><dl class="dl">
        <dt>Điện thoại</dt><dd class="num">${e.phone}</dd><dt>Email</dt><dd>${e.email}</dd>
        <dt>Ngày sinh</dt><dd>${A.dmy(e.dob)} · ${e.gender === 'F' ? 'Nữ' : 'Nam'}</dd><dt>CCCD</dt><dd class="num">${e.cccd.slice(0, 3)} *** *** ${e.cccd.slice(-3)}</dd>
        <dt>Địa chỉ</dt><dd>${e.address}</dd><dt>Tài khoản lương</dt><dd>${e.bank}</dd></dl></div>
      <div class="pf-sec"><h4>Công việc</h4><dl class="dl">
        <dt>Vị trí</dt><dd>${D.roles[e.role]}</dd><dt>Cửa hàng</dt><dd>${D.stores[e.storeId].name} (${D.stores[e.storeId].address})</dd>
        <dt>Ngày vào làm</dt><dd>${A.dmy(e.start)} · ${tenure(e.start)}</dd><dt>Hợp đồng</dt><dd>${e.status === 'probation' ? 'Thử việc 2 tháng' : e.type === 'FT' ? 'HĐLĐ xác định thời hạn 12 tháng' : 'HĐ bán thời gian · ' + (e.salary || 28000).toLocaleString('vi-VN') + 'đ/giờ'}</dd>
        <dt>Quỹ phép năm</dt><dd>${e.leaveTotal ? `Đã dùng ${e.leaveUsed}/${e.leaveTotal} ngày` : 'Không áp dụng'}</dd></dl></div>
      ${reqs.length ? `<div class="pf-sec"><h4>Đơn gần đây</h4>${reqs.map((r) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px"><span>${r.kind === 'leave' ? `${D.leaveTypes[r.type]} · ${A.dm(r.from)}${r.to !== r.from ? '–' + A.dm(r.to) : ''}` : `${r.mode === 'cover' ? 'Nhờ làm thay' : 'Đổi ca'} · ${A.dm(r.date)}`}</span><span class="bdg ${r.status}">${RQ[r.status]}</span></div>`).join('')}</div>` : ''}
      <div class="m-f" style="position:sticky;bottom:0;background:#fff"><button class="btn btn-sec" id="pfSched">${ic('cal')} Xem lịch cửa hàng</button><button class="btn btn-pri" id="pfEdit">${ic('edit')} Chỉnh sửa hồ sơ</button></div>`, { drawer: true, cls: 'drawer-pan' });
    m.el.querySelector('#pfEdit').onclick = () => { m.close(); form(e); };
    m.el.querySelector('#pfSched').onclick = () => { m.close(); if (!A.user.lockScope) A.scope = { type: 'store', id: e.storeId }; location.hash = '#/schedule'; A.dispatch(); };
  };
  const RQ = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };

  function form(e) {
    const isNew = !e;
    const stores = A.scopeStores();
    e = e || { name: '', phone: '', email: '', dob: '2000-01-01', role: 'barista', storeId: stores[0], type: 'FT', status: 'probation', start: A.TODAY };
    const m = A.modal(`
      <div class="m-h"><h3>${isNew ? 'Thêm nhân viên' : 'Chỉnh sửa hồ sơ · ' + e.id}</h3></div>
      <div class="m-b f-grid">
        <div class="fld full"><label>Họ và tên</label><input id="fName" value="${A.esc(e.name)}" placeholder="Nguyễn Văn A"/></div>
        <div class="fld"><label>Điện thoại</label><input id="fPhone" value="${A.esc(e.phone)}" placeholder="090 000 0000"/></div>
        <div class="fld"><label>Ngày sinh</label><input type="date" id="fDob" value="${e.dob}"/></div>
        <div class="fld full"><label>Email</label><input id="fEmail" value="${A.esc(e.email)}" placeholder="ten@moctra.vn"/></div>
        <div class="fld"><label>Vị trí</label><select id="fRole">${Object.entries(D.roles).map(([k, v]) => `<option value="${k}" ${e.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="fld"><label>Cửa hàng</label><select id="fStore">${D.branches.map((b) => `<optgroup label="${b.name}">${b.stores.map((s) => `<option value="${s}" ${e.storeId === s ? 'selected' : ''}>${D.stores[s].name}</option>`).join('')}</optgroup>`).join('')}</select></div>
        <div class="fld"><label>Loại hợp đồng</label><select id="fType"><option value="FT" ${e.type === 'FT' ? 'selected' : ''}>Toàn thời gian</option><option value="PT" ${e.type === 'PT' ? 'selected' : ''}>Bán thời gian</option></select></div>
        <div class="fld"><label>Ngày vào làm</label><input type="date" id="fStart" value="${e.start}"/></div>
        <div class="fld full"><label>Trạng thái</label><select id="fStatus">${Object.entries(D.statusName).map(([k, v]) => `<option value="${k}" ${e.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      </div>
      <div class="m-f"><button class="btn btn-sec" data-close>Huỷ</button><button class="btn btn-pri" id="fOk">${isNew ? 'Thêm nhân viên' : 'Lưu thay đổi'}</button></div>`);
    const val = (id) => m.el.querySelector('#' + id).value.trim();
    m.el.querySelector('#fOk').onclick = () => {
      if (!val('fName') || !val('fPhone')) return A.toast('Vui lòng nhập họ tên và số điện thoại');
      const patch = { name: val('fName'), phone: val('fPhone'), email: val('fEmail'), dob: val('fDob'), role: val('fRole'), storeId: val('fStore'), type: val('fType'), start: val('fStart'), status: val('fStatus') };
      const parts = patch.name.split(' ');
      patch.initials = ((parts.length > 1 ? parts[parts.length - 2][0] : '') + parts[parts.length - 1][0]).toUpperCase();
      if (isNew) {
        const id = 'NV' + String(D.employees.length + 1).padStart(3, '0');
        D.employees.push({ ...patch, id, color: '#CFE3C0', cccd: '079000000000', bank: 'Chưa cập nhật', address: 'Chưa cập nhật', leaveTotal: patch.type === 'FT' ? 12 : 0, leaveUsed: 0, rotate: 0, offDay: 0, gender: 'F' });
        A.toast(`Đã thêm ${patch.name} (${id})`);
      } else { Object.assign(e, patch); A.toast('Đã lưu hồ sơ ' + patch.name); }
      m.close(); A.refresh();
    };
  }

  function mount(v) {
    const q = v.querySelector('#stQ');
    q.oninput = () => { ui.q = q.value; A.refresh(); A.keepFocus('#stQ'); };
    v.querySelector('#stRole').onchange = (ev) => { ui.role = ev.target.value; A.refresh(); };
    v.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { ui.status = b.dataset.s; A.refresh(); }));
    v.querySelectorAll('[data-emp]').forEach((r) => (r.onclick = () => A.openProfile(D.emp(r.dataset.emp))));
    v.querySelector('[data-act="add"]').onclick = () => form();
    v.querySelector('[data-act="export"]').onclick = () => A.toast('Bản demo: xuất file danh-sach-nhan-su.xlsx');
  }

  A.pages.staff = { render, mount };
})();
