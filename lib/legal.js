// EduTeach — nội dung pháp lý chính thức (Privacy Policy + Terms of Service).
// Dùng chung cho màn hình trong app (TermsScreen) và trang web tĩnh (docs/*.html).

export const COMPANY = {
  name: 'EduTeach',
  website: 'https://github.com/vanhoa282/EduTeach',
  email: 'eduteach@gmail.com',
  updatedAt: '11/10/2026',
};

export const PRIVACY_POLICY = [
  {
    title: '1. Giới thiệu',
    content:
      'EduTeach ("chúng tôi") là nền tảng kết nối học sinh và gia sư để học trực tuyến 1 kèm 1. Chính sách này giải thích chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu cá nhân của bạn như thế nào khi bạn sử dụng ứng dụng EduTeach.',
  },
  {
    title: '2. Dữ liệu chúng tôi thu thập',
    content:
      '• Thông tin tài khoản: họ tên, số điện thoại, mật khẩu (đã băm), ảnh đại diện, vai trò (học sinh/gia sư/admin).\n• Thông tin học tập: lịch rảnh của gia sư, khóa học đã đăng ký, lịch buổi học, kết quả, đánh giá, khiếu nại.\n• Thông tin thanh toán: mã đơn hàng, ảnh chứng từ chuyển khoản, số dư ví (nội bộ).\n• Dữ liệu phòng học: khi bạn vào phòng học trực tuyến, camera và micro được bật theo sự đồng ý của bạn. Video/âm thanh truyền trực tiếp P2P giữa 2 thiết bị, chúng tôi KHÔNG ghi hình hay lưu trữ nội dung buổi học.\n• Dữ liệu kỹ thuật: mã thiết bị, phiên bản app, mã thông báo push (để gửi thông báo).',
  },
  {
    title: '3. Mục đích sử dụng',
    content:
      '• Cung cấp và vận hành dịch vụ: đặt lịch, thanh toán, phòng học, đánh giá.\n• Xác minh danh tính và chống gian lận (kiểm tra chứng từ thanh toán).\n• Gửi thông báo: xác nhận đơn, nhắc buổi học sắp tới, cập nhật khiếu nại.\n• Hỗ trợ khách hàng và xử lý tranh chấp.\n• Cải thiện chất lượng dịch vụ (thống kê ẩn danh).',
  },
  {
    title: '4. Chia sẻ dữ liệu',
    content:
      '• Dữ liệu được lưu trên Supabase (nhà cung cấp hạ tầng của chúng tôi) theo hợp đồng bảo mật.\n• Chúng tôi KHÔNG bán dữ liệu cá nhân.\n• Chỉ chia sẻ khi: có yêu cầu pháp lý hợp lệ từ cơ quan nhà nước; cần bảo vệ quyền, tài sản của chúng tôi hoặc người dùng khác.',
  },
  {
    title: '5. Lưu trữ và bảo mật',
    content:
      '• Dữ liệu được lưu tối thiểu trong thời gian tài khoản còn hoạt động cộng thời gian lưu trữ theo quy định pháp luật Việt Nam.\n• Mật khẩu được băm (bcrypt), không lưu dạng văn bản.\n• Truy cập cơ sở dữ liệu được giới hạn bằng phân quyền (RLS) và các hàm phía máy chủ.\n• Không hệ thống nào an toàn tuyệt đối; nếu xảy ra sự cố lộ dữ liệu, chúng tôi sẽ thông báo cho bạn trong thời gian sớm nhất.',
  },
  {
    title: '6. Quyền của bạn',
    content:
      'Bạn có quyền: xem và chỉnh sửa thông tin cá nhân ngay trong app; yêu cầu xuất dữ liệu; yêu cầu xóa tài khoản (liên hệ ' + COMPANY.email + '). Yêu cầu sẽ được xử lý trong 30 ngày, trừ dữ liệu phải lưu theo quy định pháp luật.',
  },
  {
    title: '7. Trẻ em',
    content:
      'Dịch vụ dành cho người dùng từ đủ tuổi theo quy định. Học sinh dưới 16 tuổi cần có sự đồng ý và giám sát của phụ huynh khi sử dụng ứng dụng.',
  },
  {
    title: '8. Liên hệ',
    content:
      'Mọi thắc mắc về quyền riêng tư, vui lòng liên hệ: ' + COMPANY.email,
  },
];

export const TERMS_OF_SERVICE = [
  {
    title: '1. Chấp nhận điều khoản',
    content:
      'Bằng việc tạo tài khoản và sử dụng EduTeach, bạn đồng ý với các điều khoản này. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.',
  },
  {
    title: '2. Tài khoản',
    content:
      '• Bạn chịu trách nhiệm bảo mật mật khẩu của mình.\n• Cung cấp thông tin chính xác; cập nhật khi thay đổi.\n• Mỗi người chỉ dùng một tài khoản; không mua bán, cho mượn tài khoản.',
  },
  {
    title: '3. Đặt lịch và thanh toán',
    content:
      '• Học sinh chọn lịch từ lịch rảnh của gia sư; hệ thống giữ chỗ 30 phút khi tạo đơn.\n• Thanh toán 100% giá trị khóa học khi đặt lịch.\n• Đơn được kích hoạt sau khi Admin xác nhận chứng từ chuyển khoản.\n• Học sinh được huỷ buổi trước giờ học ít nhất 24 giờ; huỷ muộn hơn cần liên hệ Admin.',
  },
  {
    title: '4. Phòng học trực tuyến',
    content:
      '• Buổi học kéo dài 2 giờ; vào phòng từ 15 phút trước giờ học.\n• Hai bên giữ thái độ lịch sự; cấm ghi hình buổi học khi chưa được đồng ý.\n• Đường truyền P2P phụ thuộc mạng của hai bên; chúng tôi không chịu trách nhiệm với gián đoạn do mạng của người dùng.',
  },
  {
    title: '5. Phí và thanh toán gia sư',
    content:
      '• Hoa hồng nền tảng mặc định 10% học phí mỗi buổi (có thể thay đổi và được thông báo trước).\n• Gia sư nhận tiền ngay vào ví khả dụng sau khi học sinh xác nhận buổi học.',
  },
  {
    title: '6. Khiếu nại và hoàn tiền',
    content:
      '• Tranh chấp buổi học được Admin xử lý trong 24 giờ làm việc.\n• Hoàn tiền (nếu có) được tính theo số buổi chưa học và kết luận xử lý khiếu nại.\n• Thời gian hoàn tiền: 3–7 ngày làm việc.',
  },
  {
    title: '7. Quy tắc ứng xử',
    content:
      '• Cấm lừa đảo, quấy rối, ngôn từ xúc phạm, phân biệt đối xử.\n• Cấm trao đổi, học tập nội dung vi phạm pháp luật.\n• Cấm lách hệ thống để giao dịch ngoài nền tảng nhằm trốn phí.',
  },
  {
    title: '8. Xử lý vi phạm',
    content:
      'Tùy mức độ vi phạm: cảnh cáo, tạm khóa tài khoản, khóa vĩnh viễn, tịch thu số dư gian lận và/hoặc báo cơ quan chức năng.',
  },
  {
    title: '9. Giới hạn trách nhiệm',
    content:
      'EduTeach là nền tảng kết nối, không phải chủ thể cung cấp dịch vụ dạy học. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm với thiệt hại gián tiếp phát sinh từ việc sử dụng dịch vụ.',
  },
  {
    title: '10. Thay đổi điều khoản',
    content:
      'Chúng tôi có thể cập nhật điều khoản; thay đổi quan trọng sẽ được thông báo trong app trước khi có hiệu lực.',
  },
  {
    title: '11. Liên hệ',
    content: 'Mọi thắc mắc xin liên hệ: ' + COMPANY.email,
  },
];
