// Seed data cho POC — tài khoản dùng thử của Cổng quản trị (chỉ dùng cho bản demo, không phải tài khoản thật).
// Màn hình đăng nhập điền sẵn tài khoản đầu tiên; bấm "Đăng nhập" là vào.
window.A = window.A || {};
A.seed = {
  accounts: [
    {
      username: 'admin',
      password: 'moctra@2026',
      name: 'Quản lý vùng',
      title: 'Quản lý vùng · Toàn hệ thống',
      email: 'admin@moctra.vn',
      initials: 'QL',
      scope: { type: 'all' },
      lockScope: false,
    },
    {
      username: 'nguyenhue',
      password: 'moctra@2026',
      name: 'Trần Thị Thu Hà',
      title: 'Cửa hàng trưởng · Nguyễn Huệ',
      email: 'ha.001@moctra.vn',
      initials: 'TH',
      scope: { type: 'store', id: 's1' },
      lockScope: true, // chỉ xem & quản lý cửa hàng của mình
    },
  ],
};
