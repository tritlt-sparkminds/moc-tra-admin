// Ca làm việc — tạo ca, chỉnh giờ bắt đầu/kết thúc (có ngày áp dụng), quy tắc chấm công, giờ chỉnh riêng
(() => {
  const { ic, data: D } = A;
  const G0 = 6 * 60, G1 = 24 * 60; // trục khung giờ 06:00 → 24:00
  const gp = (m) => ((Math.min(Math.max(m, G0), G1) - G0) / (G1 - G0)) * 100;
  const dur = (t) => t.end - t.start - (t.end - t.start > 360 ? t.brk : 0);
  const storeTxt = (s) => (s.stores === 'all' ? 'Tất cả cửa hàng' : s.stores.map((id) => D.stores[id].name).join(', '));
  const usageWeek = (code) => {
    const ws = A.weekStart(A.TODAY); let n = 0;
    A.staffInScope().forEach((e) => { for (let i = 0; i < 7; i++) if (D.shiftOf(e, A.add(ws, i)) === code) n++; });
    return n;
  };
  const usedEver = (code) => Object.values(A.state.overrides).includes(code);
  const parseOpen = (h) => h.split('–').map((x) => A.toMin(x.trim()));
  const gAxis = () => `<div class="g-ax">${[6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map((h) => `<span style="left:${gp(h * 60)}%">${String(h).padStart(2, '0')}:00</span>`).join('')}</div>`;

  function render() {
    const list = Object.values(D.shifts);
    const stores = A.scopeStores();
    const open = stores.length === 1 ? parseOpen(D.stores[stores[0]].hours) : null;
    const visible = list.filter((s) => stores.some((sid) => D.appliesTo(s, sid)));
    const cus = Object.entries(A.state.custom).filter(([k]) => k.split('|')[1] >= A.TODAY).map(([k, v]) => ({ e: D.emp(k.split('|')[0]), d: k.split('|')[1], v, code: A.state.overrides[k] }))
      .filter((x) => stores.includes(x.e.storeId)).sort((a, b) => a.d.localeCompare(b.d));
    const R = A.state.rules;
    const pgS = A.paginate('shifts', visible, 10), pgC = A.paginate('shift-cus', cus, 10);
    return `
      ${A.head('Ca làm việc', 'Tạo và quản lý các ca làm. Khi đổi giờ một ca, chọn ngày bắt đầu áp dụng. Dữ liệu chấm công trước ngày đó vẫn giữ giờ cũ.',
        `<button class="btn btn-pri" data-act="new">${ic('plus')} Tạo ca mới</button>`)}
      <div class="kpis">
        ${A.kpi('Ca đang áp dụng', visible.length, 'ca', `${visible.filter((s) => s.builtin).length} ca mặc định · ${visible.filter((s) => !s.builtin).length} ca tự tạo`, 'pri', 'shift')}
        ${A.kpi('Lượt xếp tuần này', visible.reduce((t, s) => t + usageWeek(s.code), 0), 'lượt', 'Tổng số ca đã xếp cho nhân viên', '', 'cal')}
        ${A.kpi('Giờ chỉnh riêng', cus.length, 'ca', 'Từ hôm nay trở đi', '', 'edit')}
        ${A.kpi('Cho phép trễ', R.grace, 'phút', 'Vào ca muộn hơn số phút này tính là đi trễ', '', 'clock')}
      </div>

      <div class="card">
        <div class="card-h"><h3>Khung giờ trong ngày</h3><span class="sub">${open ? `Vùng xanh nhạt là giờ mở cửa của ${D.stores[stores[0]].name} (${D.stores[stores[0]].hours})` : 'Chọn một cửa hàng ở góc trên để xem kèm giờ mở cửa'}</span></div>
        <div class="gantt">${gAxis()}
          ${visible.map((s) => { const t = D.timeAt(s.code); return `<div class="g-row"><span class="nm"><i class="dotc" style="--c:${s.color}"></i>${A.esc(s.name)}</span><div class="g-track">${open ? `<span class="g-open" style="left:${gp(open[0])}%;width:${gp(open[1]) - gp(open[0])}%"></span>` : ''}<span class="g-bar" style="--c:${s.color};left:${gp(t.start)}%;width:${gp(t.end) - gp(t.start)}%">${A.hm(t.start)}–${A.hm(t.end)}</span></div></div>`; }).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h3>Danh sách ca</h3><span class="sub">${visible.length} ca</span></div>
        <div class="scroll-x"><table class="t"><thead><tr><th>Tên ca</th><th>Ký hiệu</th><th>Bắt đầu</th><th>Kết thúc</th><th class="r">Nghỉ giữa ca</th><th class="r">Giờ công</th><th class="r">Tối thiểu / cửa hàng</th><th>Áp dụng cho</th><th class="r">Lượt xếp tuần này</th><th>Lịch sử giờ</th><th></th></tr></thead><tbody>
          ${pgS.items.map((s) => {
            const t = D.timeAt(s.code), next = s.versions.find((v) => v.from > A.TODAY);
            return `<tr>
              <td><span style="display:flex;align-items:center;gap:8px"><i class="dotc" style="--c:${s.color}"></i><b style="font-weight:500">${A.esc(s.name)}</b>${s.builtin ? ' <span class="bdg plain">Mặc định</span>' : ''}</span></td>
              <td><span class="code" style="--c:${s.color}">${A.esc(s.code)}</span></td>
              <td class="num">${A.hm(t.start)}</td><td class="num">${A.hm(t.end)}</td>
              <td class="r num">${t.brk && t.end - t.start > 360 ? t.brk + ' phút' : '—'}</td>
              <td class="r num"><b class="hrs">${A.hrs(dur(t))}</b> giờ</td>
              <td class="r num">${s.minStaff ? s.minStaff + ' người' : '<span class="muted">Không bắt buộc</span>'}</td>
              <td style="white-space:normal;max-width:220px">${storeTxt(s)}</td>
              <td class="r num">${usageWeek(s.code)}</td>
              <td class="hist">${next ? `<span class="bdg upcoming">Từ ${A.dm(next.from)}: ${A.hm(next.start)}–${A.hm(next.end)}</span>` : s.versions.length > 1 ? `Đổi giờ ${s.versions.length - 1} lần · gần nhất ${A.dm(s.versions[s.versions.length - 1].from)}` : 'Chưa thay đổi'}</td>
              <td class="r"><button class="icon-btn" data-edit="${s.code}" title="Sửa ca">${ic('edit')}</button><button class="icon-btn del" data-del="${s.code}" title="${s.builtin ? 'Ca mặc định không xoá được' : 'Xoá ca'}" ${s.builtin ? 'disabled' : ''}>${ic('trash')}</button></td>
            </tr>`; }).join('')}
        </tbody></table></div>
        ${pgS.html}
      </div>

      <div class="card">
        <div class="card-h"><h3>Quy tắc chấm công</h3><span class="sub">Áp dụng cho mọi ca</span></div>
        <div class="rule"><div class="rt"><b>Số phút cho phép trễ</b><small>Quản lý chấm giờ vào muộn hơn giờ bắt đầu ca quá số phút này thì nhân viên bị tính là đi trễ</small></div><input type="number" min="0" max="60" data-rule="grace" value="${R.grace}"/> phút</div>
        <div class="rule"><div class="rt"><b>Giới hạn giờ làm / tuần</b><small>Hệ thống cảnh báo khi duyệt đổi ca khiến nhân viên vượt giới hạn này</small></div><input type="number" min="20" max="72" data-rule="maxWeek" value="${R.maxWeek}"/> giờ</div>
      </div>

      <div class="card">
        <div class="card-h"><h3>Ca có giờ chỉnh riêng</h3><span class="sub">Chỉnh trong ô lịch ở mục Lịch trực & phân ca</span></div>
        ${cus.length ? `<div class="scroll-x"><table class="t"><thead><tr><th>Nhân viên</th><th>Ngày</th><th>Ca</th><th>Giờ mặc định</th><th>Giờ chỉnh riêng</th><th></th></tr></thead><tbody>
          ${pgC.items.map((x) => { const t = D.timeAt(x.code, x.d); return `<tr><td>${A.person(x.e, D.stores[x.e.storeId].name)}</td><td>${A.DOW[A.dow(x.d)]}, ${A.dmy(x.d)}</td><td>${A.esc(D.shifts[x.code]?.name || '')}</td><td class="num muted">${A.hm(t.start)}–${A.hm(t.end)}</td><td class="num"><b style="color:var(--pri-d);font-weight:600">${A.hm(x.v.start)}–${A.hm(x.v.end)}</b></td><td class="r"><button class="btn btn-sec btn-sm" data-reset="${x.e.id}|${x.d}">Về giờ mặc định</button></td></tr>`; }).join('')}
        </tbody></table></div>${pgC.html}` : A.emptyBox('Chưa có ca nào được chỉnh giờ riêng.')}
      </div>`;
  }

  function form(sh) {
    const isNew = !sh;
    const t = sh ? D.timeAt(sh.code) : { start: 600, end: 900, brk: 0 };
    const st = { color: sh?.color || D.SHIFT_COLORS[(Object.keys(D.shifts).length) % D.SHIFT_COLORS.length], stores: sh ? (sh.stores === 'all' ? 'all' : [...sh.stores]) : 'all' };
    const m = A.modal(`
      <div class="m-h"><h3>${isNew ? 'Tạo ca làm việc mới' : 'Sửa ca · ' + A.esc(sh.name)}</h3><p>${isNew ? 'Ca mới sẽ xuất hiện trong ô chọn ca ở Lịch trực.' : 'Đổi giờ sẽ áp dụng từ ngày bạn chọn. Các ca đã chỉnh giờ riêng giữ nguyên.'}</p></div>
      <div class="m-b f-grid">
        <div class="fld"><label>Tên ca</label><input id="sName" value="${A.esc(sh?.name || '')}" placeholder="VD: Ca gãy cuối tuần"/></div>
        <div class="fld"><label>Ký hiệu</label><input id="sCode" value="${A.esc(sh?.code || '')}" maxlength="3" placeholder="VD: G" ${isNew ? '' : 'disabled'}/><span class="hint">1–3 ký tự, hiện trên dòng số người / ca</span></div>
        <div class="fld"><label>Giờ bắt đầu</label><input type="time" id="sStart" value="${A.hm(t.start)}"/></div>
        <div class="fld"><label>Giờ kết thúc</label><input type="time" id="sEnd" value="${A.hm(t.end)}"/></div>
        <div class="fld"><label>Nghỉ giữa ca</label><input type="number" id="sBrk" min="0" max="120" step="5" value="${t.brk}"/><span class="hint">Phút, chỉ trừ khi ca dài hơn 6 giờ</span></div>
        <div class="fld"><label>Số người tối thiểu / cửa hàng</label><input type="number" id="sMin" min="0" max="10" value="${sh?.minStaff ?? 0}"/><span class="hint">0 nghĩa là không kiểm tra thiếu người</span></div>
        <div class="fld full"><label>Màu hiển thị</label><div class="swatches" id="sColor">${D.SHIFT_COLORS.map((c) => `<button type="button" style="--c:${c}" data-c="${c}" class="${c === st.color ? 'on' : ''}" aria-label="Màu ${c}"></button>`).join('')}</div></div>
        <div class="fld full"><label>Áp dụng cho</label>
          <div class="radio"><label><input type="radio" name="sSc" value="all" ${st.stores === 'all' ? 'checked' : ''}/> Tất cả cửa hàng</label><label><input type="radio" name="sSc" value="some" ${st.stores !== 'all' ? 'checked' : ''}/> Chọn cửa hàng</label></div>
          <div class="checks" id="sStores" style="${st.stores === 'all' ? 'display:none' : ''}">${D.branches.flatMap((b) => b.stores).map((sid) => `<label><input type="checkbox" value="${sid}" ${st.stores !== 'all' && st.stores.includes(sid) ? 'checked' : ''}/> ${D.stores[sid].name}</label>`).join('')}</div>
        </div>
        ${isNew ? '' : `<div class="fld full"><label>Áp dụng giờ mới từ ngày</label><input type="date" id="sFrom" value="${A.TODAY}" min="${A.TODAY}"/><span class="hint">Chấm công trước ngày này vẫn tính theo giờ cũ (${A.hm(t.start)}–${A.hm(t.end)})</span></div>`}
        <div class="fld full"><label>Xem trước</label><div class="prev">${gAxis().replace('margin-left:150px', '')}<div class="g-track" id="pvTrack"></div><div class="meta"><span id="pvTxt"></span><span id="pvHrs"></span></div></div></div>
        <div class="f-err full" id="sErr"></div>
      </div>
      <div class="m-f"><button class="btn btn-sec" data-close>Huỷ</button><button class="btn btn-pri" id="sOk">${isNew ? 'Tạo ca' : 'Lưu thay đổi'}</button></div>`, { cls: 'wide' });
    const $m = (s) => m.el.querySelector(s);
    $m('.prev .g-ax').style.marginLeft = '0';
    const read = () => ({ start: A.toMin($m('#sStart').value), end: A.toMin($m('#sEnd').value), brk: +$m('#sBrk').value || 0 });
    const preview = () => {
      const v = read();
      const ok = v.start != null && v.end != null && v.end > v.start;
      $m('#pvTrack').innerHTML = ok ? `<span class="g-bar" style="--c:${st.color};left:${gp(v.start)}%;width:${gp(v.end) - gp(v.start)}%">${A.esc($m('#sName').value || 'Ca mới')}</span>` : '';
      $m('#pvTxt').textContent = ok ? `${A.hm(v.start)} – ${A.hm(v.end)}` : 'Giờ chưa hợp lệ';
      $m('#pvHrs').textContent = ok ? `Giờ công: ${A.hrs(dur(v))} giờ` : '';
    };
    preview();
    m.el.querySelectorAll('input').forEach((i) => i.addEventListener('input', preview));
    $m('#sColor').onclick = (ev) => { const b = ev.target.closest('[data-c]'); if (!b) return; st.color = b.dataset.c; $m('#sColor').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); preview(); };
    m.el.querySelectorAll('[name="sSc"]').forEach((r) => (r.onchange = () => { $m('#sStores').style.display = r.value === 'all' && r.checked ? 'none' : ''; }));
    $m('#sOk').onclick = () => {
      const err = (x) => ($m('#sErr').textContent = x);
      const name = $m('#sName').value.trim(), code = $m('#sCode').value.trim().toUpperCase(), v = read();
      if (!name) return err('Vui lòng nhập tên ca.');
      if (isNew && !/^[A-ZĐ0-9]{1,3}$/.test(code)) return err('Ký hiệu gồm 1–3 chữ cái hoặc số, không dấu cách.');
      if (isNew && (D.shifts[code] || ['OFF', 'LEAVE'].includes(code))) return err(`Ký hiệu "${code}" đã được dùng.`);
      if (v.start == null || v.end == null) return err('Vui lòng nhập đủ giờ bắt đầu và kết thúc.');
      if (v.end <= v.start) return err('Giờ kết thúc phải sau giờ bắt đầu (chưa hỗ trợ ca qua đêm).');
      if (v.end - v.start > 12 * 60) return err('Một ca không được dài quá 12 giờ.');
      const some = m.el.querySelector('[name="sSc"]:checked').value === 'some';
      const stores = some ? [...m.el.querySelectorAll('#sStores input:checked')].map((x) => x.value) : 'all';
      if (some && !stores.length) return err('Chọn ít nhất một cửa hàng.');
      const minStaff = Math.max(0, +$m('#sMin').value || 0);
      if (isNew) {
        D.shifts[code] = { code, name, color: st.color, minStaff, stores, builtin: false, versions: [{ from: '2000-01-01', ...v }] };
        A.toast(`Đã tạo ${name} (${A.hm(v.start)}–${A.hm(v.end)})`);
      } else {
        Object.assign(sh, { name, color: st.color, minStaff, stores });
        const cur = D.timeAt(sh.code);
        if (cur.start !== v.start || cur.end !== v.end || cur.brk !== v.brk) {
          const from = $m('#sFrom').value || A.TODAY;
          sh.versions = sh.versions.filter((x) => x.from < from).concat({ from, ...v }).sort((a, b) => a.from.localeCompare(b.from));
          A.toast(`${name}: ${A.hm(v.start)}–${A.hm(v.end)} áp dụng từ ${A.dmy(from)}`);
        } else A.toast('Đã lưu ' + name);
      }
      m.close(); A.refresh();
    };
  }

  function mount(v) {
    v.querySelector('[data-act="new"]').onclick = () => form();
    v.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => form(D.shifts[b.dataset.edit])));
    v.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => {
      const s = D.shifts[b.dataset.del];
      if (usedEver(s.code)) return A.toast(`${s.name} đang được xếp trong lịch, hãy gỡ khỏi lịch trước khi xoá`);
      const m = A.modal(`<div class="m-h"><h3>Xoá ${A.esc(s.name)}?</h3><p>Ca này chưa được xếp cho ai. Sau khi xoá sẽ không chọn được trong lịch nữa.</p></div>
        <div class="m-f"><button class="btn btn-sec" data-close>Huỷ</button><button class="btn btn-no" id="dOk">${ic('trash')} Xoá ca</button></div>`);
      m.el.querySelector('#dOk').onclick = () => { delete D.shifts[s.code]; m.close(); A.refresh(); A.toast('Đã xoá ' + s.name); };
    }));
    v.querySelectorAll('[data-rule]').forEach((i) => (i.onchange = () => {
      const n = Math.round(+i.value);
      if (!(n >= +i.min && n <= +i.max)) { i.value = A.state.rules[i.dataset.rule]; return A.toast(`Giá trị phải từ ${i.min} đến ${i.max}`); }
      A.state.rules[i.dataset.rule] = n; A.refresh(); A.toast('Đã cập nhật quy tắc chấm công');
    }));
    v.querySelectorAll('[data-reset]').forEach((b) => (b.onclick = () => { delete A.state.custom[b.dataset.reset]; A.refresh(); A.toast('Đã đưa về giờ mặc định'); }));
  }

  A.pages.shifts = { render, mount };
})();
