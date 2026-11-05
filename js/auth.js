// Đăng nhập (POC): kiểm tra với tài khoản seed trong js/seed.js, lưu phiên ở trình duyệt.
// "Ghi nhớ đăng nhập" → localStorage; không ghi nhớ → sessionStorage (đóng tab là thoát).
(() => {
  const { $, ic, esc } = A;
  const KEY = 'mt-admin-session';
  const find = (u) => A.seed.accounts.find((a) => a.username.toLowerCase() === String(u || '').trim().toLowerCase());

  A.currentUser = () => {
    const raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
    if (!raw) return null;
    try { return find(JSON.parse(raw).username) || null; } catch { return null; }
  };
  A.logout = () => { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); location.hash = ''; location.reload(); };

  A.boot = () => {
    const u = A.currentUser();
    if (!u) return renderLogin();
    A.user = u;
    if (u.lockScope) A.scope = { ...u.scope };
    A.mountShell();
    A.dispatch();
  };

  function renderLogin() {
    A.setTheme(localStorage.getItem('mt-admin-theme') || 'std', true);
    document.title = 'Đăng nhập · Mộc Trà Quản trị';
    const acc = A.seed.accounts;
    document.body.innerHTML = `
      <div class="lg">
        <aside class="lg-side">
          <div class="lg-brand"><span class="sb-logo">${A.bloom4('#fff')}</span><span class="lg-mark">${A.bloom4('currentColor')}</span><span><b>Mộc Trà</b><small>Cổng quản trị nhân sự &amp; ca làm</small></span></div>
          <div class="lg-copy">
            <h2>Quản lý ca làm, chấm công và nhân sự cho mọi cửa hàng.</h2>
            <ul>
              <li>${ic('cal')} Xếp lịch trực theo tuần, chỉnh giờ ca linh hoạt</li>
              <li>${ic('clock')} Quản lý chấm công cho nhân viên theo từng ca</li>
              <li>${ic('inbox')} Duyệt nghỉ phép và đổi ca ngay trên một màn hình</li>
              <li>${ic('chart')} Biết ca nào đông khách để xếp người hợp lý</li>
            </ul>
          </div>
          <div class="lg-mt">${A.mountains()}</div>
          <div class="lg-cups" aria-hidden="true">
            <span class="lc c1">${A.paperCup('butter')}</span>
            <span class="lc c2">${A.paperCup('mint')}</span>
            <span class="lc c3">${A.paperCup('blush')}</span>
            ${[0, 1, 2, 3].map((i) => `<span class="lg-petal p${i}">${A.bloom4('#fff')}</span>`).join('')}
          </div>
        </aside>
        <main class="lg-main">
          <form class="lg-card" id="lgForm" novalidate>
            <h1>Đăng nhập</h1>
            <p class="lg-sub">Dành cho quản lý vùng và cửa hàng trưởng.</p>
            <div class="fld"><label for="lgUser">Tên đăng nhập</label><input id="lgUser" autocomplete="username" value="${esc(acc[0].username)}"/></div>
            <div class="fld"><label for="lgPass">Mật khẩu</label><div class="lg-pass"><input id="lgPass" type="password" autocomplete="current-password" value="${esc(acc[0].password)}"/><button type="button" class="icon-btn" id="lgEye" aria-label="Hiện mật khẩu" title="Hiện mật khẩu">${ic('eye')}</button></div></div>
            <div class="lg-row"><label class="lg-check"><input type="checkbox" id="lgRemember" checked/> Ghi nhớ đăng nhập</label><button type="button" class="lg-link" id="lgForgot">Quên mật khẩu?</button></div>
            <div class="f-err" id="lgErr" role="alert"></div>
            <button class="btn btn-pri lg-submit" id="lgSubmit" type="submit">Đăng nhập</button>
            <div class="lg-sep"><span>Tài khoản dùng thử</span></div>
            <div class="lg-accs">${acc.map((a, i) => `<button type="button" class="lg-acc ${i === 0 ? 'on' : ''}" data-acc="${i}"><span class="av" style="--av:#D4EEE1;color:#237652">${esc(a.initials)}</span><span class="who"><b>${esc(a.name)}</b><small>${esc(a.title)}</small></span>${ic('check', 'ok')}</button>`).join('')}</div>
            <p class="lg-hint">Tài khoản đã được điền sẵn. Chọn tài khoản khác ở trên rồi bấm <b>Đăng nhập</b>.</p>
          </form>
          <footer class="lg-foot">Bản thử nghiệm · dữ liệu minh hoạ</footer>
        </main>
      </div>`;
    const err = (t) => ($('#lgErr').textContent = t);
    document.querySelectorAll('[data-acc]').forEach((b) => (b.onclick = () => {
      const a = acc[+b.dataset.acc];
      $('#lgUser').value = a.username; $('#lgPass').value = a.password; err('');
      document.querySelectorAll('.lg-acc').forEach((x) => x.classList.toggle('on', x === b));
    }));
    $('#lgEye').onclick = () => {
      const p = $('#lgPass'), show = p.type === 'password';
      p.type = show ? 'text' : 'password';
      $('#lgEye').innerHTML = ic(show ? 'eyeOff' : 'eye');
      $('#lgEye').setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    };
    $('#lgForgot').onclick = () => A.toast('Bản demo: liên hệ quản trị viên hệ thống để cấp lại mật khẩu');
    $('#lgForm').onsubmit = (e) => {
      e.preventDefault();
      const u = $('#lgUser').value.trim(), p = $('#lgPass').value;
      if (!u || !p) return err('Vui lòng nhập tên đăng nhập và mật khẩu.');
      const a = find(u);
      if (!a || a.password !== p) return err('Tên đăng nhập hoặc mật khẩu không đúng.');
      err('');
      const btn = $('#lgSubmit');
      btn.disabled = true; btn.textContent = 'Đang đăng nhập…';
      const store = $('#lgRemember').checked ? localStorage : sessionStorage;
      store.setItem(KEY, JSON.stringify({ username: a.username, at: Date.now() }));
      setTimeout(() => { location.hash = '#/schedule'; location.reload(); }, 450);
    };
  }
})();
