// js/loan-rules.js - Bộ quy tắc thẩm định và phân loại gói vay thực tế theo 6 điều kiện

/**
 * Hàm phân tích và đề xuất danh sách gói vay dựa trên 6 điều kiện thực tế
 * @param {Object} lead - Thông tin khách hàng
 * @returns {Array} Danh sách các gói vay được sắp xếp theo độ ưu tiên
 */
function matchLoanPackages(lead) {
  const matched = [];
  const age = Number(lead.age) || (lead.dob ? calcAge(lead.dob) : 25);
  const carrier = lead.simCarrier || (typeof detectSimCarrier === 'function' ? detectSimCarrier(lead.phone) : 'Khác');
  const prevLenders = lead.previousLenders || [];
  const docs = lead.documents || [];
  const bank = (lead.bankName || '').toUpperCase();
  const apps = lead.installedApps || [];

  // =========================================================================
  // ĐIỀU KIỆN 1: ĐỘ TUỔI TỪ 18 ĐẾN DƯỚI 20 TUỔI (18 <= Tuổi < 20)
  // Chỉ làm được TNEX, TinVay (VietCredit), Cake by VPBank, hoặc HD SAISON Sinh Viên
  // =========================================================================
  if (age >= 18 && age < 20) {
    matched.push({
      lender: 'Tnex',
      title: 'Vay Tiêu Dùng Trẻ / Online TNEX',
      badge: 'bg-sky-100 text-sky-800 border-sky-300',
      priority: '⭐ ƯU TIÊN ĐỘ TUỔI 18-19',
      matchRate: '95%',
      maxAmount: '20 - 30 Triệu',
      note: 'Dành riêng cho độ tuổi 18-19, thủ tục 100% online qua ứng dụng ngân hàng số TNEX.'
    });

    matched.push({
      lender: 'Tinvay',
      title: 'Gói Vay Nhanh TinVay (VietCredit)',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      priority: 'Độ tuổi 18-19',
      matchRate: '90%',
      maxAmount: '10 - 25 Triệu',
      note: 'Hỗ trợ khách hàng từ 18 tuổi, cấp hạn mức thẻ tín dụng VietCredit rút tiền mặt.'
    });

    matched.push({
      lender: 'Cake by VPBank',
      title: 'Vay Nhanh + Mở Thẻ Tín Dụng Cake',
      badge: 'bg-pink-100 text-pink-800 border-pink-300',
      priority: 'Độ tuổi 18-19',
      matchRate: '90%',
      maxAmount: '10 - 30 Triệu',
      note: 'Duyệt hạn mức tiêu dùng hoặc cấp thẻ Cake online cho khách từ 18 tuổi.'
    });

    const isStudent = docs.includes('THE_SV');
    matched.push({
      lender: 'HD Saison',
      title: 'Gói Vay Sinh Viên / Cha Mẹ Bảo Lãnh Vay SV',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      priority: isStudent ? '⭐ Có Thẻ SV (Ưu tiên)' : 'Cần Thẻ SV hoặc Cha Mẹ bảo lãnh',
      matchRate: isStudent ? '95%' : '80%',
      maxAmount: '10 - 30 Triệu',
      note: 'Áp dụng cho sinh viên có thẻ SV/biên lai học phí, hoặc phụ huynh đứng tên vay diện sinh viên.'
    });

    return matched; // Độ tuổi 18-19 thì kết thúc và trả về danh sách các đơn vị này
  }

  // =========================================================================
  // ĐIỀU KIỆN 2: KHÁCH HÀNG TỪNG MUA TRẢ GÓP / TỪNG VAY
  // Ưu tiên check gói mới tại cty cũ: Home Credit, FE Credit, HD SAISON, MCredit, Mirae Asset
  // =========================================================================
  const previousList = ['Home Credit', 'FE Credit', 'HD Saison', 'MCredit', 'Mirae Asset (MAFC)'];
  const hasHistory = prevLenders.some(l => previousList.includes(l));

  if (hasHistory) {
    prevLenders.forEach(lender => {
      if (previousList.includes(lender)) {
        matched.push({
          lender: lender,
          title: `Gói Khách Hàng Hiện Hữu / Ưu Đãi Cũ (${lender})`,
          badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          priority: '⭐ ƯU TIÊN SỐ 1 (ĐÃ CÓ LỊCH SỬ GÓP)',
          matchRate: '98%',
          maxAmount: '20 - 70 Triệu',
          note: `Khách từng có lịch sử góp tại ${lender}. Tỷ lệ duyệt lại cực cao, thẩm định nhanh, thủ tục tối giản.`
        });
      }
    });
  }

  // =========================================================================
  // ĐIỀU KIỆN 3: KHÁCH SỬ DỤNG SIM VIETTEL
  // Dễ vay qua ứng dụng Viettel Money
  // =========================================================================
  if (carrier === 'Viettel') {
    matched.push({
      lender: 'Viettel Money',
      title: 'Khoản Vay Tiêu Dùng Thuê Bao Viettel',
      badge: 'bg-red-100 text-red-800 border-red-300',
      priority: 'Thuê bao mạng Viettel',
      matchRate: '92%',
      maxAmount: '10 - 50 Triệu',
      note: 'SIM Viettel chính chủ chấm điểm viễn thông tốt, đăng ký và giải ngân trực tiếp trên app Viettel Money.'
    });
  }

  // =========================================================================
  // ĐIỀU KIỆN 4: KHÁCH CÓ SỬ DỤNG ỨNG DỤNG VÍ / MUA SẮM
  // MoMo, ZaloPay, Viettel Money, Quà Tặng VIP (Thế Giới Di Động)
  // =========================================================================
  if (apps.includes('MOMO') || (lead.note && lead.note.toLowerCase().includes('momo'))) {
    matched.push({
      lender: 'MoMo (FastMoney / TPBank)',
      title: 'Khoản Vay Nhanh FastMoney Trên Ví MoMo',
      badge: 'bg-pink-100 text-pink-800 border-pink-300',
      priority: 'Có dùng Ví MoMo',
      matchRate: '90%',
      maxAmount: '5 - 30 Triệu',
      note: 'Duyệt tức thì trên ứng dụng MoMo dựa vào điểm tin cậy ví điện tử.'
    });
  }

  if (apps.includes('ZALOPAY') || (lead.note && lead.note.toLowerCase().includes('zalopay'))) {
    matched.push({
      lender: 'ZaloPay',
      title: 'Gói Vay Tiêu Dùng Tín Chấp ZaloPay',
      badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      priority: 'Có dùng ZaloPay',
      matchRate: '88%',
      maxAmount: '5 - 20 Triệu',
      note: 'Duyệt online trên ZaloPay liên kết với các ngân hàng & công ty tài chính.'
    });
  }

  if (apps.includes('QUA_TANG_VIP') || (lead.note && lead.note.toLowerCase().includes('quà tặng vip'))) {
    matched.push({
      lender: 'FE / Home / Shinhan (TGDĐ)',
      title: 'Gói Vay Khách Hàng VIP Thế Giới Di Động',
      badge: 'bg-yellow-100 text-yellow-900 border-yellow-300',
      priority: 'Có App Quà Tặng VIP (TGDĐ)',
      matchRate: '92%',
      maxAmount: '15 - 50 Triệu',
      note: 'Cấp hạn mức dựa trên lịch sử tích điểm và mua sắm thiết bị tại Thế Giới Di Động / Điện Máy Xanh.'
    });
  }

  // =========================================================================
  // ĐIỀU KIỆN 5: TÀI KHOẢN NGÂN HÀNG ĐANG SỬ DỤNG
  // TPBank -> TPBank, VPBank -> VPBank, VIB -> VIB
  // =========================================================================
  if (bank.includes('TPB') || bank.includes('TPBANK') || bank.includes('TIEN PHONG')) {
    matched.push({
      lender: 'TPBank',
      title: 'Gói Vay Tín Chấp Khách Hàng TPBank',
      badge: 'bg-purple-100 text-purple-800 border-purple-300',
      priority: 'Có tài khoản TPBank',
      matchRate: '95%',
      maxAmount: '20 - 70 Triệu',
      note: 'Ưu tiên kiểm tra hạn mức cấp sẵn trên app TPBank Mobile hoặc vay tín chấp theo tài khoản thanh toán.'
    });
  }

  if (bank.includes('VPB') || bank.includes('VPBANK') || bank.includes('VIETNAM THINH VUONG')) {
    matched.push({
      lender: 'VPBank',
      title: 'Gói Vay Tiêu Dùng Tài Khoản VPBank NEO',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      priority: 'Có tài khoản VPBank',
      matchRate: '94%',
      maxAmount: '20 - 100 Triệu',
      note: 'Ưu tiên khách hàng có tài khoản VPBank NEO hoặc có biến động số dư qua VPBank.'
    });
  }

  if (bank.includes('VIB') || bank.includes('QUOC TE')) {
    matched.push({
      lender: 'VIB',
      title: 'Khoản Vay & Cấp Thẻ Tín Dụng VIB',
      badge: 'bg-blue-100 text-blue-900 border-blue-300',
      priority: 'Có tài khoản VIB',
      matchRate: '92%',
      maxAmount: '20 - 80 Triệu',
      note: 'Ưu tiên khách hàng có tài khoản thanh toán hoặc giao dịch thường xuyên tại VIB.'
    });
  }

  // =========================================================================
  // ĐIỀU KIỆN 6: CHỨNG TỪ THỰC TẾ (NẾU KHÔNG CÓ CÁC ĐIỀU KIỆN TRÊN)
  // Độ tuổi: 20 - 60 tuổi
  // =========================================================================
  if (age >= 20 && age <= 60) {
    // 6.1. FE Credit: chỉ cần CCCD
    matched.push({
      lender: 'FE Credit',
      title: 'Vay Tiêu Dùng Chỉ Cần CCCD Gắn Chip',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      priority: 'Thủ tục đơn giản (Chỉ cần CCCD)',
      matchRate: '90%',
      maxAmount: '10 - 40 Triệu',
      note: 'Tuổi từ 20-60, chỉ cần CCCD gắn chip, không nợ xấu nhóm 3-5.'
    });

    // 6.2. Home Credit: cần BHYT (cá nhân hoặc gia đình)
    const hasBhyt = docs.includes('BHYT') || docs.includes('BHYT_CTY') || docs.includes('BHYT_GIA_DINH');
    matched.push({
      lender: 'Home Credit',
      title: 'Gói Vay Theo Bảo Hiểm Y Tế (BHYT)',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      priority: hasBhyt ? 'Đạt chuẩn BHYT' : 'Cần bổ sung BHYT',
      matchRate: hasBhyt ? '95%' : '75%',
      maxAmount: '15 - 50 Triệu',
      note: 'Tuổi 20-60. Chấp nhận thẻ BHYT cá nhân, BHYT doanh nghiệp hoặc BHYT hộ gia đình.'
    });

    // 6.3. HD SAISON: Phân cấp theo chứng từ (Từ 21 tuổi)
    if (age >= 21) {
      const hasGplx = docs.includes('GPLX');
      const hasBhytCongTy = docs.includes('BHYT_CTY') || (docs.includes('BHYT') && docs.includes('HDLD'));

      let hdTitle = 'HD Saison: Hạn mức tối đa 12 Triệu (Chỉ Cần CCCD)';
      let hdLimit = 'Tối đa 12 Triệu';
      let hdRate = '92%';
      let hdNote = 'Độ tuổi từ 21, chỉ cần CCCD gắn chip, không cần chứng minh thu nhập.';

      if (hasBhytCongTy && hasGplx) {
        hdTitle = 'HD Saison: Hạn mức 31 - 50 Triệu (CCCD + Bằng Lái + BHYT Công Ty)';
        hdLimit = 'Từ 31 - 50 Triệu';
        hdRate = '96%';
        hdNote = 'Độ tuổi từ 21, đủ bộ: CCCD gắn chip + Bằng lái xe + Thẻ BHYT do công ty đóng.';
      } else if (hasGplx) {
        hdTitle = 'HD Saison: Hạn mức 19 - 25 Triệu (CCCD + Bằng Lái Xe)';
        hdLimit = 'Từ 19 - 25 Triệu';
        hdRate = '95%';
        hdNote = 'Độ tuổi từ 21, có CCCD gắn chip kèm Bằng lái xe (GPLX).';
      }

      matched.push({
        lender: 'HD Saison',
        title: hdTitle,
        badge: 'bg-amber-100 text-amber-900 border-amber-300',
        priority: 'Độ tuổi 21+ theo cấp độ chứng từ',
        matchRate: hdRate,
        maxAmount: hdLimit,
        note: hdNote
      });
    }

    // Gợi ý thêm Mirae Asset & MCredit nếu có Cà vẹt xe hoặc Sao kê lương
    if (docs.includes('CAVET') || docs.includes('SAO_KE') || docs.includes('HDLD')) {
      matched.push({
        lender: 'Mirae Asset (MAFC)',
        title: 'Gói Vay Cà Vẹt Xe Máy / Đi Làm Hưởng Lương',
        badge: 'bg-blue-100 text-blue-900 border-blue-300',
        priority: 'Có Cà vẹt hoặc Sao kê lương',
        matchRate: '95%',
        maxAmount: '20 - 70 Triệu',
        note: 'Ưu tiên khách hàng có đăng ký xe chính chủ hoặc sao kê tài khoản ngân hàng.'
      });
    }
  }

  // Khử trùng lặp tiêu đề gói vay
  const uniqueTitles = [];
  const finalResults = [];
  matched.forEach(item => {
    if (!uniqueTitles.includes(item.title)) {
      uniqueTitles.push(item.title);
      finalResults.push(item);
    }
  });

  return finalResults;
}
