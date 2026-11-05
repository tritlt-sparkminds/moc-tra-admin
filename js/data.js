// Dữ liệu mẫu cho POC — sau này lấy từ API (Store/HR service). Cửa hàng trùng với Customer Web.
(() => {
  const D = (A.data = {});

  D.branches = [
    { id: 'b1', name: 'Chi nhánh Quận 1', stores: ['s1', 's6'] },
    { id: 'b2', name: 'Chi nhánh Quận 3 – Tân Bình', stores: ['s5', 's4'] },
    { id: 'b3', name: 'Chi nhánh Thủ Đức – Quận 7', stores: ['s2', 's3'] },
  ];
  D.stores = {
    s1: { id: 's1', name: 'Nguyễn Huệ', address: '86 Nguyễn Huệ, Quận 1', hours: '07:00 – 22:30' },
    s6: { id: 's6', name: 'Hai Bà Trưng', address: '115 Hai Bà Trưng, Quận 1', hours: '07:00 – 22:00' },
    s5: { id: 's5', name: 'Lê Văn Sỹ', address: '210 Lê Văn Sỹ, Quận 3', hours: '07:00 – 21:00' },
    s4: { id: 's4', name: 'Bàu Cát', address: '18 Bàu Cát 2, Tân Bình', hours: '07:00 – 22:00' },
    s2: { id: 's2', name: 'Thảo Điền', address: '12 Quốc Hương, TP. Thủ Đức', hours: '07:30 – 22:00' },
    s3: { id: 's3', name: 'Phú Mỹ Hưng', address: '45 Nguyễn Lương Bằng, Quận 7', hours: '08:00 – 22:00' },
  };
  D.branchOf = (storeId) => D.branches.find((b) => b.stores.includes(storeId));

  // ca làm việc — giờ có lịch sử theo "áp dụng từ ngày" để đổi giờ không làm sai dữ liệu công đã qua
  // versions: [{ from, start, end, brk }] (phút trong ngày) · minStaff: số người tối thiểu / cửa hàng · stores: 'all' | [id]
  const v0 = (start, end, brk = 0) => [{ from: '2000-01-01', start, end, brk }];
  D.shifts = {
    S: { code: 'S', name: 'Ca sáng', color: '#F79009', minStaff: 1, stores: 'all', builtin: true, versions: v0(420, 720) },
    C: { code: 'C', name: 'Ca chiều', color: '#2E90FA', minStaff: 1, stores: 'all', builtin: true, versions: v0(720, 1020) },
    T: { code: 'T', name: 'Ca tối', color: '#6941C6', minStaff: 1, stores: 'all', builtin: true, versions: v0(1020, 1350) },
    H: { code: 'H', name: 'Hành chính', color: '#12B76A', minStaff: 0, stores: 'all', builtin: true, versions: v0(480, 1020, 60) },
    CD: { code: 'CD', name: 'Ca cao điểm trưa', color: '#EE46BC', minStaff: 0, stores: ['s1', 's6'], builtin: false, versions: v0(630, 840) },
  };
  D.SHIFT_COLORS = ['#F79009', '#2E90FA', '#7A5AF8', '#12B76A', '#EE46BC', '#F04438', '#0BA5EC', '#667085', '#DD2590', '#6172F3'];
  D.timeAt = (code, date = A.TODAY) => {
    const vs = D.shifts[code]?.versions; if (!vs) return null;
    return [...vs].reverse().find((v) => v.from <= date) || vs[0];
  };
  D.appliesTo = (sh, storeId) => sh.stores === 'all' || sh.stores.includes(storeId);
  // ca thực tế của nhân viên trong ngày (có tính giờ chỉnh riêng)
  D.planOf = (e, date) => {
    const code = D.shiftOf(e, date);
    const sh = D.shifts[code]; if (!sh) return null;
    const t = D.timeAt(code, date), cus = A.state.custom[e.id + '|' + date];
    const start = cus ? cus.start : t.start, end = cus ? cus.end : t.end;
    return { code, name: sh.name, color: sh.color, start, end, brk: end - start > 360 ? t.brk : 0, custom: !!cus };
  };
  D.planMin = (e, date) => { const p = D.planOf(e, date); return p ? p.end - p.start - p.brk : 0; };
  D.codeMin = (code, date) => { const t = D.timeAt(code, date); return t ? t.end - t.start - t.brk : 0; };

  D.roles = { mgr: 'Cửa hàng trưởng', lead: 'Ca trưởng', barista: 'Pha chế', cashier: 'Thu ngân', server: 'Phục vụ' };
  D.statusName = { active: 'Đang làm việc', probation: 'Thử việc', paused: 'Tạm nghỉ', left: 'Đã nghỉ việc' };
  const AV = ['#BFDCC8', '#F4E1A6', '#F8D6BF', '#F5CFCB', '#D6E4F0', '#E4D8C2', '#CFE3C0'];

  // [mã, họ tên, vai trò, cửa hàng, FT/PT, trạng thái, ngày vào làm, giới tính]
  const rows = [
    ['NV001', 'Trần Thị Thu Hà', 'mgr', 's1', 'FT', 'active', '2023-03-01', 'F'],
    ['NV002', 'Lê Minh Khoa', 'lead', 's1', 'FT', 'active', '2023-06-12', 'M'],
    ['NV003', 'Nguyễn Ngọc Anh', 'barista', 's1', 'FT', 'active', '2024-01-08', 'F'],
    ['NV004', 'Phạm Gia Huy', 'barista', 's1', 'FT', 'active', '2024-05-20', 'M'],
    ['NV005', 'Võ Thanh Trúc', 'cashier', 's1', 'FT', 'active', '2024-09-02', 'F'],
    ['NV006', 'Đặng Bảo Long', 'server', 's1', 'PT', 'probation', '2026-10-15', 'M'],
    ['NV007', 'Huỳnh Mỹ Linh', 'mgr', 's6', 'FT', 'active', '2023-08-01', 'F'],
    ['NV008', 'Bùi Quốc Bảo', 'lead', 's6', 'FT', 'active', '2024-02-19', 'M'],
    ['NV009', 'Ngô Thảo Vy', 'barista', 's6', 'FT', 'active', '2024-07-01', 'F'],
    ['NV010', 'Trịnh Đức Tài', 'barista', 's6', 'FT', 'active', '2025-03-10', 'M'],
    ['NV011', 'Mai Khánh Ngân', 'cashier', 's6', 'PT', 'active', '2025-11-03', 'F'],
    ['NV012', 'Lý Hoàng Phúc', 'mgr', 's5', 'FT', 'active', '2023-05-15', 'M'],
    ['NV013', 'Đỗ Phương Thảo', 'lead', 's5', 'FT', 'active', '2024-04-01', 'F'],
    ['NV014', 'Tạ Minh Nhật', 'barista', 's5', 'FT', 'active', '2025-01-06', 'M'],
    ['NV015', 'Châu Bích Ngọc', 'cashier', 's5', 'FT', 'paused', '2024-10-01', 'F'],
    ['NV016', 'Phan Anh Tuấn', 'barista', 's5', 'PT', 'active', '2025-06-16', 'M'],
    ['NV017', 'Hồ Thị Yến', 'mgr', 's4', 'FT', 'active', '2023-11-20', 'F'],
    ['NV018', 'Dương Văn Hậu', 'lead', 's4', 'FT', 'active', '2024-08-05', 'M'],
    ['NV019', 'Kiều Thanh Hương', 'barista', 's4', 'FT', 'active', '2025-02-17', 'F'],
    ['NV020', 'La Quang Vinh', 'cashier', 's4', 'FT', 'active', '2025-05-12', 'M'],
    ['NV021', 'Vương Gia Hân', 'server', 's4', 'PT', 'active', '2025-09-08', 'F'],
    ['NV022', 'Nguyễn Hữu Thắng', 'mgr', 's2', 'FT', 'active', '2024-01-15', 'M'],
    ['NV023', 'Trần Bảo Ngọc', 'lead', 's2', 'FT', 'active', '2024-06-03', 'F'],
    ['NV024', 'Lâm Tuấn Kiệt', 'barista', 's2', 'FT', 'active', '2025-04-21', 'M'],
    ['NV025', 'Phùng Diệu Linh', 'cashier', 's2', 'FT', 'active', '2025-08-11', 'F'],
    ['NV026', 'Cao Nhật Minh', 'barista', 's2', 'FT', 'left', '2024-12-02', 'M'],
    ['NV027', 'Đinh Hoài An', 'mgr', 's3', 'FT', 'active', '2024-03-04', 'F'],
    ['NV028', 'Tôn Thất Khang', 'lead', 's3', 'FT', 'active', '2024-11-11', 'M'],
    ['NV029', 'Ứng Mỹ Duyên', 'barista', 's3', 'FT', 'probation', '2026-09-28', 'F'],
    ['NV030', 'Quách Gia Bảo', 'cashier', 's3', 'PT', 'active', '2026-02-09', 'M'],
  ];
  D.employees = rows.map(([id, name, role, storeId, type, status, start, g], i) => {
    const r = (k) => A.rnd(id + k);
    const parts = name.split(' ');
    return {
      id, name, role, storeId, type, status, start, gender: g,
      initials: (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase(),
      color: AV[i % AV.length],
      phone: `09${Math.floor(r('p') * 10)} ${String(Math.floor(r('q') * 900 + 100))} ${String(Math.floor(r('s') * 9000 + 1000))}`,
      email: `${parts[parts.length - 1].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()}.${id.slice(2)}@moctra.vn`,
      dob: `${1994 + Math.floor(r('y') * 10)}-${String(1 + Math.floor(r('m') * 12)).padStart(2, '0')}-${String(1 + Math.floor(r('d') * 28)).padStart(2, '0')}`,
      cccd: '079' + String(Math.floor(r('c') * 1e9)).padStart(9, '0'),
      bank: 'Vietcombank · ****' + String(Math.floor(r('b') * 9000 + 1000)),
      address: ['Quận Bình Thạnh', 'Quận 3', 'Quận 10', 'Quận Phú Nhuận', 'TP. Thủ Đức', 'Quận 7', 'Quận Gò Vấp'][Math.floor(r('a') * 7)] + ', TP. HCM',
      leaveTotal: type === 'FT' ? 12 : 0,
      leaveUsed: type === 'FT' ? Math.floor(r('l') * 7) + 1 : 0,
      rotate: Math.floor(r('rot') * 3),
      offDay: Math.floor(r('off') * 7),
      salary: type === 'FT' ? null : 28000,
    };
  });
  D.emp = (id) => D.employees.find((e) => e.id === id);

  // ---------- lịch ----------
  // overrides: lịch do quản lý xếp tay, đơn đã duyệt; nếu không có → lịch mẫu xoay ca theo tuần
  A.state = { overrides: {}, custom: {}, swapped: {}, att: {}, rules: { grace: 5, maxWeek: 48 }, published: { [A.weekStart(A.TODAY)]: true } };
  const wk = (date) => Math.round((A.parse(A.weekStart(date)) - new Date(2026, 0, 5)) / 6048e5);

  D.inSchedule = (e, date) => (e.status === 'active' || e.status === 'probation') && date >= e.start;
  // lịch mẫu chỉ có đến hết tháng hiện tại; các tháng sau để trống cho quản lý tự xếp
  D.LAST_SAMPLE = A.iso(new Date(A.NOW.getFullYear(), A.NOW.getMonth() + 1, 0));
  D.baseShift = (e, date) => {
    if (date > D.LAST_SAMPLE) return null;
    const d = A.dow(date);
    if (e.role === 'mgr') return d === 0 ? 'OFF' : 'H';
    if (e.type === 'PT') {
      // bán thời gian lấp khung ca còn trống của toàn thời gian; không trống thì thỉnh thoảng tăng cường ca tối
      const ft = D.employees.filter((x) => x.storeId === e.storeId && x.type === 'FT' && x.role !== 'mgr' && D.inSchedule(x, date)).map((x) => D.shiftOf(x, date));
      const pts = D.employees.filter((x) => x.storeId === e.storeId && x.type === 'PT' && D.inSchedule(x, date));
      const gaps = ['S', 'C', 'T'].filter((c) => !ft.includes(c));
      const g = gaps[pts.indexOf(e)];
      if (g) return g;
      return A.rnd(e.id + date) < (d === 0 || d === 6 ? 0.7 : 0.3) ? (e.rotate === 0 ? 'C' : 'T') : 'OFF';
    }
    if (d === e.offDay) return 'OFF';
    const idx = D.employees.filter((x) => x.storeId === e.storeId && x.role !== 'mgr' && x.type === 'FT').indexOf(e);
    return ['S', 'C', 'T'][(idx + wk(date)) % 3];
  };
  D.shiftOf = (e, date) => {
    if (!D.inSchedule(e, date)) return null;
    const k = e.id + '|' + date;
    return k in A.state.overrides ? A.state.overrides[k] : D.baseShift(e, date);
  };
  D.setShift = (empId, date, code, custom) => {
    const k = empId + '|' + date;
    A.state.overrides[k] = code;
    if (custom) A.state.custom[k] = custom; else delete A.state.custom[k];
  };

  // ---------- chấm công ----------
  // trả về: { shift, plan:[start,end], in, out, late, early, min, status }
  // status: off · leave · upcoming · missing (quá giờ chưa chấm vào) · working · done · absent
  // Quản lý cửa hàng chấm công cho nhân viên (giờ vào, giờ ra hoặc đánh dấu vắng) — nhân viên không tự chấm.
  // A.state.att[k] = { in, out, absent, note, by }: bản ghi quản lý nhập tay; nếu không có → dữ liệu mẫu đã chấm.
  // status: off · leave · upcoming · missing (ca đã bắt đầu nhưng chưa chấm) · working (đã chấm vào) · done · absent
  D.attOf = (e, date) => {
    const code = D.shiftOf(e, date);
    if (!code) return null;
    if (code === 'OFF') return { shift: code, status: 'off' };
    if (code === 'LEAVE') return { shift: code, status: 'leave' };
    const s = D.planOf(e, date), k = e.id + '|' + date, R = A.state.rules;
    const base = { shift: code, plan: [s.start, s.end], in: null, out: null, late: 0, early: 0, min: 0 };
    const now = date === A.TODAY ? A.NOW_MIN : date < A.TODAY ? 24 * 60 + 1 : -1;
    if (now < s.start) return { ...base, status: 'upcoming' };
    let inM = null, outM = null, absent = false;
    const rec = A.state.att[k];
    if (rec) ({ in: inM, out: outM, absent } = { absent: false, ...rec });
    else {
      const r = A.rnd(k + 'abs');
      if (r < 0.03) absent = date < A.TODAY;              // ngày cũ: quản lý đã đánh dấu vắng
      else if (r < 0.05 && date === A.TODAY) inM = null;  // hôm nay: quản lý chưa chấm
      else {
        const lt = A.rnd(k + 'lt') < 0.17;
        inM = s.start + (lt ? 6 + Math.floor(A.rnd(k + 'lm') * 26) : -Math.floor(A.rnd(k + 'em') * 12));
        outM = A.rnd(k + 'ee') < 0.05 ? s.end - 20 - Math.floor(A.rnd(k + 'eo') * 30) : s.end + Math.floor(A.rnd(k + 'om') * 14) - 2;
        if (inM > now) inM = outM = null;                  // giờ vào mẫu chưa tới → chưa chấm
        else if (outM > now) outM = null;                  // chưa tới giờ ra → đang làm
      }
    }
    const meta = { manual: !!rec, note: rec?.note, by: rec?.by };
    if (absent) return { ...base, ...meta, status: 'absent' };
    if (inM == null) return { ...base, ...meta, status: 'missing' };
    const working = outM == null;
    const endM = working ? Math.min(now, s.end + 30) : outM;
    let min = Math.max(0, Math.min(endM, s.end + 30) - Math.max(inM, s.start - 15));
    if (s.brk && min > 360) min -= s.brk;
    return {
      ...base, ...meta, in: inM, out: outM, min,
      late: inM > s.start + R.grace ? inM - s.start : 0,
      early: !working && outM < s.end - 10 ? s.end - outM : 0,
      status: working ? 'working' : 'done',
    };
  };
  D.attName = { off: 'Nghỉ', leave: 'Nghỉ phép', upcoming: 'Sắp tới', missing: 'Chưa chấm công', working: 'Đang làm', done: 'Đã về', absent: 'Vắng mặt' };

  // ---------- lượng khách (mẫu) ----------
  // Sau này lấy từ POS / Order service: số đơn theo cửa hàng · ngày · khung giờ (07:00–22:59).
  D.HOURS = Array.from({ length: 16 }, (_, i) => 7 + i);
  const PROFILE = { 7: 9, 8: 15, 9: 12, 10: 10, 11: 20, 12: 29, 13: 25, 14: 14, 15: 13, 16: 17, 17: 21, 18: 30, 19: 35, 20: 28, 21: 17, 22: 8 };
  const STORE_MUL = { s1: 1.3, s6: 1.0, s5: 0.8, s4: 0.9, s2: 1.15, s3: 1.0 };
  const DOW_MUL = [1.35, 0.9, 0.88, 0.92, 0.95, 1.12, 1.4]; // CN → T7
  D.ticket = (sid) => 54000 + Math.round(A.rnd(sid + 'tk') * 10) * 1000; // giá trị đơn trung bình
  D.ordersAt = (sid, date, h) => {
    if (date > A.TODAY || (date === A.TODAY && h * 60 >= A.NOW_MIN)) return 0;
    const noise = 0.75 + A.rnd(sid + date + h) * 0.5;
    return Math.round(PROFILE[h] * STORE_MUL[sid] * DOW_MUL[A.dow(date)] * noise);
  };

  // ---------- đơn từ ----------
  D.leaveTypes = { annual: 'Nghỉ phép năm', sick: 'Nghỉ ốm', personal: 'Việc riêng (không lương)' };
  D.requests = [
    { id: 'L01', kind: 'leave', empId: 'NV009', type: 'annual', from: '2026-11-06', to: '2026-11-07', reason: 'Về quê dự đám cưới em gái ở Cần Thơ.', status: 'pending', created: '2026-11-03 21:14' },
    { id: 'L02', kind: 'leave', empId: 'NV014', type: 'sick', from: '2026-11-05', to: '2026-11-05', reason: 'Sốt cao từ tối qua, đã đi khám — có giấy xác nhận của phòng khám.', status: 'pending', created: '2026-11-05 06:42' },
    { id: 'L03', kind: 'leave', empId: 'NV021', type: 'personal', from: '2026-11-12', to: '2026-11-12', reason: 'Thi cuối kỳ môn Kế toán.', status: 'pending', created: '2026-11-04 10:05' },
    { id: 'L04', kind: 'leave', empId: 'NV024', type: 'annual', from: '2026-11-10', to: '2026-11-11', reason: 'Đưa mẹ đi khám định kỳ.', status: 'pending', created: '2026-11-05 08:30' },
    { id: 'L05', kind: 'leave', empId: 'NV003', type: 'annual', from: '2026-11-03', to: '2026-11-04', reason: 'Nghỉ phép năm theo kế hoạch.', status: 'approved', created: '2026-10-25 09:00', by: 'Trần Thị Thu Hà' },
    { id: 'L06', kind: 'leave', empId: 'NV019', type: 'annual', from: '2026-11-09', to: '2026-11-11', reason: 'Du lịch Đà Lạt cùng gia đình.', status: 'rejected', created: '2026-10-30 15:20', by: 'Hồ Thị Yến', note: 'Tuần ra mắt menu mùa đông, cửa hàng cần đủ người. Hẹn em tuần sau nhé.' },
    { id: 'W01', kind: 'swap', mode: 'swap', empId: 'NV004', targetId: 'NV005', date: '2026-11-06', reason: 'Chiều thứ Sáu em có lịch học thêm, nhờ Trúc đổi ca giúp.', status: 'pending', created: '2026-11-04 19:47' },
    { id: 'W02', kind: 'swap', mode: 'cover', empId: 'NV018', targetId: 'NV020', date: '2026-11-07', reason: 'Có việc gia đình đột xuất, Vinh đã đồng ý làm thay.', status: 'pending', created: '2026-11-05 07:58' },
    { id: 'W03', kind: 'swap', mode: 'swap', empId: 'NV023', targetId: 'NV024', date: '2026-11-08', reason: 'Đổi ca để đi đám cưới bạn buổi tối.', status: 'pending', created: '2026-11-05 11:12' },
    { id: 'W04', kind: 'swap', mode: 'swap', empId: 'NV028', targetId: 'NV030', date: '2026-11-03', reason: 'Đổi ca sáng/chiều để đi gia hạn hộ chiếu.', status: 'approved', created: '2026-11-01 20:10', by: 'Đinh Hoài An' },
  ];

  // chốt ca lúc tạo đơn đổi ca (để hiển thị dù lịch thay đổi sau đó)
  D.requests.filter((r) => r.kind === 'swap').forEach((r) => {
    r.fromShift = D.shiftOf(D.emp(r.empId), r.date);
    r.toShift = D.shiftOf(D.emp(r.targetId), r.date);
  });

  D.applyRequest = (r) => {
    if (r.kind === 'leave') {
      for (let d = r.from; d <= r.to; d = A.add(d, 1)) {
        const e = D.emp(r.empId);
        if (D.shiftOf(e, d) && D.shiftOf(e, d) !== 'OFF') D.setShift(r.empId, d, 'LEAVE');
      }
      if (r.type === 'annual') D.emp(r.empId).leaveUsed += A.days(r.from, r.to);
    } else {
      D.setShift(r.empId, r.date, r.mode === 'cover' ? 'OFF' : r.toShift);
      D.setShift(r.targetId, r.date, r.fromShift);
      A.state.swapped[r.empId + '|' + r.date] = A.state.swapped[r.targetId + '|' + r.date] = r.id;
    }
  };
  D.requests.filter((r) => r.status === 'approved').forEach(D.applyRequest);

  // ví dụ giờ chỉnh riêng: ca trưởng vào sớm 30 phút để nhận hàng
  [['NV002', '2026-11-06', -30, 0], ['NV023', '2026-11-07', 0, 60]].forEach(([id, d, ds, de]) => {
    const c = D.shiftOf(D.emp(id), d), t = D.timeAt(c, d);
    if (t) D.setShift(id, d, c, { start: t.start + ds, end: t.end + de });
  });

  // chỉnh tay vài ca để có dữ liệu "điều chỉnh công"
  A.state.att['NV013|2026-11-04'] = { in: 422, out: 728, note: 'Bổ sung giờ ra theo xác nhận của ca trưởng', by: 'Lý Hoàng Phúc' };
})();

// ---------- lưu dữ liệu demo vào trình duyệt (F5 không mất) ----------
// Lưu toàn bộ phần thay đổi được: lịch đã xếp, giờ chỉnh riêng, chấm công, quy tắc, ca làm việc, đơn, hồ sơ nhân viên.
(() => {
  const D = A.data, KEY = 'mt-admin-data-v1';
  A.persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), state: A.state, shifts: D.shifts, requests: D.requests, employees: D.employees }));
    } catch (e) { console.warn('Không lưu được dữ liệu demo', e); }
  };
  A.resetData = () => { localStorage.removeItem(KEY); location.reload(); };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.state && s.shifts && s.requests && s.employees) {
      A.state = { ...A.state, ...s.state, rules: { ...A.state.rules, ...s.state.rules } };
      D.shifts = s.shifts; D.requests = s.requests; D.employees = s.employees;
    }
  } catch (e) { console.warn('Dữ liệu demo đã lưu bị lỗi, dùng dữ liệu mẫu', e); }
})();
