// Khung: sidebar thu gọn được, thanh trên với bộ chọn Chi nhánh – Cửa hàng, điều hướng theo hash
(() => {
  const { $, $$, ic, data: D } = A;
  A.pages = {};
  A.NAV = [
    { group: 'Vận hành ca' },
    { id: 'schedule', label: 'Lịch trực & phân ca', icon: 'cal' },
    { id: 'shifts', label: 'Ca làm việc', icon: 'shift' },
    { id: 'attendance', label: 'Chấm công', icon: 'clock' },
    { group: 'Nhân sự' },
    { id: 'staff', label: 'Hồ sơ nhân sự', icon: 'users' },
    { id: 'requests', label: 'Nghỉ phép & đổi ca', icon: 'inbox' },
    { group: 'Phân tích' },
    { id: 'reports', label: 'Báo cáo & phân tích', icon: 'chart' },
  ];

  // ---------- phạm vi quản lý ----------
  const saved = JSON.parse(localStorage.getItem('mt-admin-scope') || 'null');
  A.scope = saved || { type: 'all' };
  A.scopeStores = () => {
    const s = A.scope;
    if (s.type === 'store') return [s.id];
    if (s.type === 'branch') return D.branches.find((b) => b.id === s.id).stores;
    return D.branches.flatMap((b) => b.stores);
  };
  A.scopeLabel = () => {
    const s = A.scope;
    if (s.type === 'store') return { k: 'Cửa hàng', v: D.stores[s.id].name };
    if (s.type === 'branch') return { k: 'Chi nhánh', v: D.branches.find((b) => b.id === s.id).name.replace('Chi nhánh ', '') };
    return { k: 'Phạm vi', v: `Toàn hệ thống (${A.scopeStores().length} cửa hàng)` };
  };
  A.staffInScope = (pred = () => true) => {
    const st = A.scopeStores();
    return D.employees.filter((e) => st.includes(e.storeId) && pred(e));
  };
  A.pendingCount = () => {
    const st = A.scopeStores();
    return D.requests.filter((r) => r.status === 'pending' && st.includes(D.emp(r.empId).storeId)).length;
  };

  // ---------- thành phần dùng chung ----------
  A.av = (e, cls = '') => `<span class="av ${cls}" style="--av:${e.color}">${e.initials}</span>`;
  A.person = (e, sub) => `<div class="person"><div class="who"><b>${A.esc(e.name)}</b><small>${sub ?? D.roles[e.role] + ' · ' + e.id}</small></div></div>`;
  // chip ca: plan (từ D.planOf) để hiện giờ chỉnh riêng; nếu không có thì lấy giờ mẫu của ca theo ngày
  A.shiftChip = (code, { mark = '', extra = '', plan = null, date = A.TODAY, short = false } = {}) => {
    if (code === 'OFF') return `<span class="sh OFF ${extra}">Nghỉ</span>`;
    if (code === 'LEAVE') return `<span class="sh LEAVE ${extra}"><b>Nghỉ phép</b>${short ? '' : '<small>đã duyệt</small>'}</span>`;
    const s = D.shifts[code];
    if (!s) return `<span class="sh none ${extra}">+</span>`;
    const t = plan || D.timeAt(code, date);
    return `<span class="sh ${extra}" style="--c:${s.color}" title="${A.esc(s.name)} ${A.hm(t.start)}–${A.hm(t.end)}${plan?.custom ? ' (giờ chỉnh riêng)' : ''}">${mark}<b>${A.esc(s.name)}</b>${short ? '' : `<small class="${plan?.custom ? 'cus' : ''}">${A.hm(t.start)}–${A.hm(t.end)}${plan?.custom ? ' *' : ''}</small>`}</span>`;
  };
  A.attBadge = (a) => `<span class="bdg ${a.status}">${D.attName[a.status]}</span>`;
  // tiêu đề trang: mô tả nằm trong tooltip của icon thông tin (rê chuột / focus để xem)
  A.head = (title, desc, actions = '') => `
    <div class="ph"><div class="ph-t"><h1>${title}</h1>${desc ? `<span class="ph-info" tabindex="0" role="button" aria-label="Thông tin về trang ${A.esc(title)}">${ic('info')}<span class="tip" role="tooltip">${desc}</span></span>` : ''}</div><div class="ph-act">${actions}</div></div>`;
  A.kpi = (label, val, unit, sub, cls = '', icon = 'clock') => `
    <div class="kpi ${cls}"><span class="lb">${ic(icon)}${label}</span><b>${val}${unit ? `<small>${unit}</small>` : ''}</b><p>${sub}</p></div>`;
  // ---------- phân trang dùng chung ----------
  // A.paginate(key, items, size) → { items: trang hiện tại, html: chân trang }. Đổi bộ lọc (số dòng thay đổi) → về trang 1.
  A.pg = {};
  A.paginate = (key, items, size = 10) => {
    const st = (A.pg[key] ||= { page: 1, size, sig: items.length });
    if (st.sig !== items.length) { st.page = 1; st.sig = items.length; }
    const total = items.length, pages = Math.max(1, Math.ceil(total / st.size));
    st.page = Math.min(Math.max(1, st.page), pages);
    const from = (st.page - 1) * st.size, slice = items.slice(from, from + st.size);
    const nums = [];
    for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - st.page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
    const sizes = [...new Set([size, 10, 20, 50])].sort((a, b) => a - b);
    const html = `<div class="pager" data-pgkey="${key}">
      <span class="pg-info">${total ? `Hiển thị <b>${from + 1}–${from + slice.length}</b> trên <b>${total}</b>` : 'Không có dữ liệu'}</span>
      <div class="pg-size"><span id="pgl-${key}">Số dòng mỗi trang</span>
        <div class="pg-dd">
          <button type="button" class="pg-dd-btn" data-pgdd aria-haspopup="listbox" aria-expanded="false" aria-labelledby="pgl-${key}">${st.size}${ic('down')}</button>
          <ul class="pg-dd-menu" role="listbox" aria-labelledby="pgl-${key}">${sizes.map((n) => `<li><button type="button" role="option" data-pgsize="${n}" aria-selected="${n === st.size}" class="${n === st.size ? 'on' : ''}">${n} dòng${n === st.size ? ic('check') : ''}</button></li>`).join('')}</ul>
        </div></div>
      <div class="pg-btns">
        <button data-pg="${st.page - 1}" ${st.page === 1 ? 'disabled' : ''} aria-label="Trang trước">${ic('chevL')}</button>
        ${nums.map((n) => (n === '…' ? '<span class="pg-gap">…</span>' : `<button data-pg="${n}" class="${n === st.page ? 'on' : ''}" ${n === st.page ? 'aria-current="page"' : ''}>${n}</button>`)).join('')}
        <button data-pg="${st.page + 1}" ${st.page === pages ? 'disabled' : ''} aria-label="Trang sau">${ic('chev')}</button>
      </div></div>`;
    return { items: slice, html };
  };

  A.emptyBox = (msg) => `<div class="empty">${ic('inbox')}${msg}</div>`;
  A.keepFocus = (sel) => { const n = $(sel); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };

  // ---------- khung ----------
  A.mountShell = () => {
    if (localStorage.getItem('mt-admin-collapsed') === '1') document.body.classList.add('collapsed');
    A.setTheme(localStorage.getItem('mt-admin-theme') || 'std', true);
    document.body.insertAdjacentHTML('afterbegin', `
      <aside class="sb" id="sb">
        <div class="sb-head">
          <span class="sb-logo">${A.bloom4('#fff')}</span><span class="sb-mark">${A.bloom4('currentColor')}</span>
          <span class="sb-word"><b>Mộc Trà</b><small>Quản trị nhân sự</small></span>
          <button class="sb-toggle" id="sbToggle" aria-label="Thu gọn / mở rộng menu" title="Thu gọn / mở rộng menu">${ic('side')}</button>
        </div>
        <div class="sb-body"><nav class="sb-nav" id="sbNav"></nav></div>
        <div class="sb-mt">${A.mountains()}<span class="sb-fl">${A.bloom4('#fff', '#8FBF9F')}</span></div>
        <div class="sb-theme">
          <div class="sb-label">Giao diện</div>
          <div class="theme-sw" id="themeSw" role="group" aria-label="Chọn giao diện"><button data-theme="std">${ic('side')}<span>Tiêu chuẩn</span></button><button data-theme="moc">${A.bloom4('currentColor')}<span>Mộc Trà</span></button></div>
          <button class="theme-ic" id="themeIc" data-tip="Đổi giao diện"></button>
        </div>
        <div class="sb-user"><span class="av" style="--av:#D4EEE1;color:#237652">${A.esc(A.user.initials)}</span><span class="who"><b>${A.esc(A.user.name)}</b><small>${A.esc(A.user.title)}</small></span><button class="icon-btn sb-out" id="sbOut" data-tip="Đăng xuất" aria-label="Đăng xuất" title="Đăng xuất">${ic('logout')}</button></div>
      </aside>
      <div class="sb-scrim" id="sbScrim"></div>
      <div class="main">
        <header class="tb">
          <button class="tb-burger" id="tbBurger" aria-label="Mở menu">${ic('menu')}</button>
          <div class="tb-crumb" id="crumb"></div>
          <div class="tb-right">
            <span class="tb-date">${A.DOW_LONG[A.NOW.getDay()]}, ${A.dmy(A.TODAY)} · ${A.hm(A.NOW_MIN)}</span>
            <button class="tb-bell" id="bell" aria-label="Thông báo" title="Đơn chờ duyệt">${ic('bell')}<i></i></button>
            <div class="scope" id="scope"></div>
          </div>
        </header>
        <section class="view" id="view"></section>
      </div>
      <span class="poc-tag">Bản thử nghiệm · dữ liệu lưu trên trình duyệt · <button id="resetData">Khôi phục dữ liệu mẫu</button></span>`);

    $('#sbToggle').onclick = () => {
      const c = document.body.classList.toggle('collapsed');
      localStorage.setItem('mt-admin-collapsed', c ? '1' : '0');
    };
    const closeNav = () => document.body.classList.remove('nav-open');
    $('#tbBurger').onclick = () => document.body.classList.add('nav-open');
    $('#sbScrim').onclick = closeNav;
    $('#sbNav').addEventListener('click', (e) => e.target.closest('a') && closeNav());
    $('#bell').onclick = () => { location.hash = '#/requests'; };
    $('#themeSw').onclick = (e) => { const b = e.target.closest('[data-theme]'); if (b) A.setTheme(b.dataset.theme); };
    $('#sbOut').onclick = () => {
      const m = A.modal(`<div class="m-h"><h3>Đăng xuất?</h3><p>Bạn sẽ quay lại màn hình đăng nhập. Dữ liệu demo chưa lưu sẽ mất khi tải lại trang.</p></div>
        <div class="m-f"><button class="btn btn-sec" data-close>Huỷ</button><button class="btn btn-pri" id="outOk">${ic('logout')} Đăng xuất</button></div>`);
      m.el.querySelector('#outOk').onclick = A.logout;
    };
    $('#resetData').onclick = () => {
      const m = A.modal(`<div class="m-h"><h3>Khôi phục dữ liệu mẫu?</h3><p>Toàn bộ lịch đã xếp, chấm công, ca làm việc, đơn và hồ sơ bạn đã thay đổi sẽ bị xoá và quay về dữ liệu mẫu ban đầu.</p></div>
        <div class="m-f"><button class="btn btn-sec" data-close>Huỷ</button><button class="btn btn-no" id="rsOk">Khôi phục</button></div>`);
      m.el.querySelector('#rsOk').onclick = A.resetData;
    };
    $('#themeIc').onclick = () => A.setTheme(document.body.dataset.theme === 'moc' ? 'std' : 'moc');
    A.setTheme(document.body.dataset.theme, true);

    $('#scope').addEventListener('click', (e) => {
      const b = e.target.closest('[data-scope]');
      if (A.user.lockScope) return A.toast('Tài khoản này chỉ quản lý ' + A.scopeLabel().v);
      if (b) {
        const [type, id] = b.dataset.scope.split(':');
        A.scope = type === 'all' ? { type } : { type, id };
        localStorage.setItem('mt-admin-scope', JSON.stringify(A.scope));
        $('#scope').classList.remove('open');
        A.refresh();
        A.toast(`Đang xem: ${A.scopeLabel().v}`);
      } else if (e.target.closest('.scope-btn')) $('#scope').classList.toggle('open');
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#scope')) $('#scope').classList.remove('open'); });
    window.addEventListener('hashchange', A.dispatch);
    document.addEventListener('click', (e) => {
      const b = e.target.closest('.pager [data-pg]'); if (!b || b.disabled) return;
      A.pg[b.closest('.pager').dataset.pgkey].page = +b.dataset.pg; A.refresh();
    });
    // danh sách chọn số dòng tự vẽ (không dùng <select> gốc của trình duyệt)
    const closeDd = (except) => $$('.pg-dd.open').forEach((d) => { if (d !== except) { d.classList.remove('open'); d.querySelector('[data-pgdd]').setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('click', (e) => {
      const opt = e.target.closest('.pager [data-pgsize]');
      if (opt) { const st = A.pg[opt.closest('.pager').dataset.pgkey]; st.size = +opt.dataset.pgsize; st.page = 1; A.refresh(); return; }
      const btn = e.target.closest('.pager [data-pgdd]');
      if (btn) {
        const dd = btn.parentElement, open = !dd.classList.contains('open');
        closeDd(dd);
        dd.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
        if (open) { // mở lên trên nếu phía dưới không đủ chỗ
          const r = btn.getBoundingClientRect();
          dd.classList.toggle('up', innerHeight - r.bottom < 170);
          dd.querySelector('.on')?.focus();
        }
        return;
      }
      closeDd();
    });
    document.addEventListener('keydown', (e) => {
      const dd = document.querySelector('.pg-dd.open'); if (!dd) return;
      const items = [...dd.querySelectorAll('[data-pgsize]')], i = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { closeDd(); dd.querySelector('[data-pgdd]').focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(items.length - 1, i + 1)].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(0, i - 1)].focus(); }
    });
  };

  const renderScope = () => {
    const s = A.scope, L = A.scopeLabel();
    const on = (t, id) => (s.type === t && (t === 'all' || s.id === id) ? 'on' : '');
    const cnt = (sid) => D.employees.filter((e) => e.storeId === sid && D.inSchedule(e, A.TODAY)).length;
    $('#scope').innerHTML = `
      <button class="scope-btn ${A.user.lockScope ? 'locked' : ''}" title="${A.user.lockScope ? 'Tài khoản cửa hàng trưởng chỉ quản lý cửa hàng của mình' : 'Chọn chi nhánh – cửa hàng'}">${ic(s.type === 'store' ? 'store' : s.type === 'branch' ? 'pin' : 'layers')}<span class="t"><small>${L.k}:</small><span>${L.v}</span></span>${A.user.lockScope ? ic('lock') : ic('down')}</button>
      <div class="scope-pop" role="menu">
        <button class="${on('all')}" data-scope="all">${ic('layers')} Toàn hệ thống</button><hr/>
        ${D.branches.map((b) => `
          <button class="br ${on('branch', b.id)}" data-scope="branch:${b.id}">${ic('pin')} ${b.name}</button>
          ${b.stores.map((sid) => `<button class="st ${on('store', sid)}" data-scope="store:${sid}">${D.stores[sid].name}<small>${cnt(sid)} nhân viên</small></button>`).join('')}`).join('')}
      </div>`;
  };

  const renderNav = (cur) => {
    const p = A.pendingCount();
    $('#sbNav').innerHTML = A.NAV.map((n) => n.group ? `<div class="sb-label">${n.group}</div>` : `
      <a href="#/${n.id}" class="${n.id === cur ? 'on' : ''}" data-tip="${n.label}">
        ${ic(n.icon)}<span class="txt">${n.label}</span>
        ${n.id === 'requests' && p ? `<span class="bdg-n">${p}</span><span class="dot"></span>` : ''}
      </a>`).join('');
    $('#bell i').style.display = p ? '' : 'none';
  };

  // ---------- giao diện: 'std' tiêu chuẩn · 'moc' theo style Mộc Trà ----------
  A.setTheme = (t, silent) => {
    t = t === 'moc' ? 'moc' : 'std';
    document.body.dataset.theme = t;
    document.body.classList.toggle('theme-moc', t === 'moc');
    localStorage.setItem('mt-admin-theme', t);
    $$('#themeSw [data-theme]').forEach((b) => b.classList.toggle('on', b.dataset.theme === t));
    const ti = $('#themeIc');
    if (ti) { // thu gọn: một icon, bấm để chuyển sang giao diện còn lại
      const next = t === 'moc' ? 'Tiêu chuẩn' : 'Mộc Trà';
      ti.innerHTML = t === 'moc' ? A.bloom4('currentColor') : ic('palette');
      ti.dataset.tip = `Giao diện: ${t === 'moc' ? 'Mộc Trà' : 'Tiêu chuẩn'} · bấm để chuyển sang ${next}`;
      ti.setAttribute('aria-label', `Chuyển sang giao diện ${next}`);
    }
    if (!silent && $('#themeSw')) A.toast(t === 'moc' ? 'Đã chuyển sang giao diện Mộc Trà' : 'Đã chuyển sang giao diện tiêu chuẩn');
  };

  A.route = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'schedule');
  const draw = (keepScroll) => {
    let id = A.route();
    if (!A.pages[id]) id = 'schedule';
    const nav = A.NAV.find((n) => n.id === id);
    renderNav(id); renderScope();
    $('#crumb').innerHTML = `Mộc Trà ${ic('chev')} <b>${nav.label}</b>`;
    document.title = `${nav.label} · Mộc Trà Quản trị`;
    const y = window.scrollY, v = $('#view');
    v.innerHTML = A.pages[id].render();
    A.pages[id].mount?.(v);
    window.scrollTo({ top: keepScroll ? y : 0 });
  };
  // mọi thay đổi dữ liệu đều kết thúc bằng refresh → lưu lại ngay
  A.dispatch = () => { A.persist?.(); draw(false); };
  A.refresh = () => { A.persist?.(); draw(true); };
})();
