// js/initial-data.js
const ALL_PARTNERS = [
  'TPBank', 'FE Credit', 'Home Credit', 'HD Saison', 
  'Mirae Asset (MAFC)', 'MCredit', 'SHB Finance', 'VPBank', 
  'Cathay Bank (CUB)', 'Tnex', 'Cake by VPBank', 'Viettel Money', 'Tinvay'
];

const DOC_MAP = { 
  'CAVET': 'Cà vẹt xe', 
  'GPLX': 'Bằng lái xe', 
  'BHYT': 'BHYT', 
  'SAO_KE': 'Sao kê lương', 
  'HDLD': 'HĐLĐ' 
};

const DEFAULT_SAMPLE_LEADS = [
  {
    id: 1, name: 'Võ Thị Mai', phone: '0901086126', email: 'vothimai1969tpct@gmail.com', simCarrier: 'Viettel', dob: '1969-08-18', age: 57,
    cccd: '089169000138', oldCmnd: '', gender: 'Nữ', permAddress: '140, Trần Quang Diệu, Khu Vực 4, An Thới, Bình Thủy, Cần Thơ', tempAddress: 'Thường Trú',
    job: 'Kinh doanh vựa ve chai', workAddress: 'Thường Trú', workTime: '60 tháng', income: 27500000, amount: 50000000, bankName: 'TPBank', bankAccount: '36368333666',
    previousLenders: ['Home Credit', 'HD Saison'],
    ref1Rel: 'Em ruột', ref1Name: 'Võ Ngọc Mai', ref1Phone: '0395271667', ref2Rel: 'Bạn', ref2Name: 'Nguyễn Thị Tha', ref2Phone: '0902645072',
    cicStatus: 'SACH', documents: ['CAVET', 'SAO_KE'], isCompleted: false, applications: [{ lender: 'FE Credit', result: 'Đang thẩm định', rejectReason: '', contract: null }]
  },
  {
    id: 2, name: 'Võ Ngọc Mai', phone: '0395271667', email: 'vothimai1969tpct@gmail.com', simCarrier: 'Viettel', dob: '1982-12-28', age: 43,
    cccd: '091182014255', oldCmnd: '', gender: 'Nữ', permAddress: 'Khu Phố 4, Dương Đông, Phú Quốc, Kiên Giang', tempAddress: '140, Trần Quang Diệu, An Thới, Bình Thủy, Cần Thơ',
    job: 'Kinh doanh phế liệu tại nhà', workAddress: '140, Trần Quang Diệu', workTime: '60 tháng', income: 27500000, amount: 50000000, bankName: 'TPBank', bankAccount: '36369333666',
    previousLenders: ['FE Credit'],
    ref1Rel: 'Chị ruột', ref1Name: 'Võ Thị Mai', ref1Phone: '0901086126', ref2Rel: 'Bạn', ref2Name: 'Nguyễn Thị Tha', ref2Phone: '0902645072',
    cicStatus: 'SACH', documents: ['CAVET', 'BHYT'], isCompleted: false, applications: [{ lender: 'Home Credit', result: 'Đang thẩm định', rejectReason: '', contract: null }]
  },
  {
    id: 3, name: 'Trần Lê Thành Khang', phone: '0979448210', email: 'thaonguyenthanh32@gmail.com', simCarrier: 'Viettel', dob: '1980-05-01', age: 46,
    cccd: '092080001743', oldCmnd: '', gender: 'Nam', permAddress: '03, KV 1, Hưng Phú, Cái Răng, Cần Thơ', tempAddress: 'Thường Trú',
    job: 'Cty Phúc Vạn Lợi', workAddress: '38, đường B5, KDC Hưng Phú, Cái Răng, CT', workTime: '60 tháng', income: 27500000, amount: 40000000, bankName: 'MB', bankAccount: '0979448210',
    previousLenders: ['MCredit'],
    ref1Rel: 'Vợ', ref1Name: 'Lư Thị Thanh Vi', ref1Phone: '0838911698', ref2Rel: 'Cháu', ref2Name: 'Nguyễn Thanh Thư', ref2Phone: '0329173994',
    cicStatus: 'SACH', documents: ['SAO_KE', 'HDLD'], isCompleted: false, applications: [{ lender: 'MCredit', result: 'Duyệt', rejectReason: '', contract: { code: 'MC-8812', approvedAmount: 40000000, tenor: 12, monthlyPay: 3800000, disburseDate: '2026-08-22' } }]
  }
];
