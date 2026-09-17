// js/app.js - Bộ điều phối CRM: Tối ưu thu gọn danh sách hồ sơ Lưu Kho (Bấm để xem chi tiết)
let leads = JSON.parse(localStorage.getItem('loan_crm_v22') || '[]');
if (leads.length === 0 && typeof DEFAULT_SAMPLE_LEADS !== 'undefined') {
  leads = DEFAULT_SAMPLE_LEADS;
}

let activeTab = 'active'; // 'active' | 'match' | 'archived'
let currentFilterStatus = 'ALL';
let searchQuery = '';
let currentMatchingLeadId = null;

let editingLeadId = null;
let targetCompleteId = null;
let receiptLeadId = null;
let receiptAppIdx = null;
let contractLeadId = null;
let contractAppIdx = null;
let targetAddAppLeadId = null;

// Quản lý trạng thái mở rộng/thu gọn thẻ hồ sơ lưu kho
let expandedArchiveIds = new Set();

function toggleLeadDetail(id) {
  if (expandedArchiveIds.has(id)) {
    expandedArchiveIds.delete(id);
  } else {
    expandedArchiveIds.add(id);
  }
  render();
}

// =================================================================
// THUẬT TOÁN NHẬN DIỆN NHÀ MẠNG VIỄN THÔNG CHUẨN XÁC 100%
// =================================================================
function detectSimCarrier(phone) {
  if (!phone) return 'Khác';
  let p = phone.replace(/[^0-9]/g, '');
  if (p.startsWith('84')) p = '0' + p.slice(2);
  if (p.length < 3) return 'Khác';

  const prefix = p.substring(0, 3);
  const viettelPrefixes = ['086', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039'];
  const vinaPrefixes = ['088', '091', '094', '081', '082', '083', '084', '085', '087', '055'];
  const mobiPrefixes = ['089', '090', '093', '070', '079', '077', '076', '078'];
  const vnMobilePrefixes = ['092', '056', '058', '052'];
  const gMobilePrefixes = ['099', '059'];

  if (viettelPrefixes.includes(prefix)) return 'Viettel';
  if (vinaPrefixes.includes(prefix)) return 'Vinaphone';
  if (mobiPrefixes.includes(prefix)) return 'Mobifone';
  if (vnMobilePrefixes.includes(prefix)) return 'Vietnamobile';
  if (gMobilePrefixes.includes(prefix)) return 'Gmobile';
  return 'Khác';
}

function updateCarrierBadge(carrier) {
  const badge = document.getElementById('carrierPreviewBadge');
  if (!badge) return;
  if (!carrier || carrier === 'Khác') {
    badge.classList.add('hidden');
    return;
  }
  badge.classList.remove('hidden');
  let colorStyle = 'bg-slate-100 text-slate-700 border-slate-300';
  if (carrier === 'Viettel') colorStyle = 'bg-red-50 text-red-700 border-red-200';
  else if (carrier === 'Vinaphone') colorStyle = 'bg-sky-50 text-sky-700 border-sky-200';
  else if (carrier === 'Mobifone') colorStyle = 'bg-blue-50 text-blue-700 border-blue-200';
  else if (carrier === 'Vietnamobile') colorStyle = 'bg-amber-50 text-amber-700 border-amber-200';

  badge.className = `text-[10px] px-2 py-0.5 rounded-full font-bold transition-all border ${colorStyle}`;
  badge.innerText = `📶 ${carrier}`;
}

function handlePhoneInput(val) {
  const clean = val.replace(/[^0-9]/g, '');
  if (clean.length >= 3) {
    updateCarrierBadge(detectSimCarrier(clean));
  } else {
    updateCarrierBadge('Khác');
  }
}

function showToast(m) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerText = m;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2800);
}

function saveStorage() {
  localStorage.setItem('loan_crm_v22', JSON.stringify(leads));
  render();
}

// =================================================================
// CHUYỂN ĐỔI 3 TAB (ĐANG XỬ LÝ | LỌC GÓI VAY | LƯU KHO)
// =================================================================
function switchTab(tab) {
  activeTab = tab;
  const activeBtn = document.getElementById('tabActiveBtn');
  const matchBtn = document.getElementById('tabMatchBtn');
  const archivedBtn = document.getElementById('tabArchivedBtn');

  const defaultBtnClass = 'py-1.5 rounded-xl text-center flex items-center justify-center gap-1 transition-all text-blue-200 hover:text-white';
  const activeBtnClass = 'py-1.5 rounded-xl text-center flex items-center justify-center gap-1 transition-all bg-white shadow-md font-extrabold';

  if (activeBtn) activeBtn.className = tab === 'active' ? `${activeBtnClass} text-blue-800` : defaultBtnClass;
  if (matchBtn) matchBtn.className = tab === 'match' ? `${activeBtnClass} text-amber-900` : defaultBtnClass;
  if (archivedBtn) archivedBtn.className = tab === 'archived' ? `${activeBtnClass} text-indigo-900` : defaultBtnClass;

  render();
}

function setFilterStatus(st) {
  currentFilterStatus = st;
  const buttons = document.querySelectorAll('#statusFilterBar button');
  buttons.forEach(b => {
    if (b.getAttribute('data-status') === st) {
      b.className = 'px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition bg-blue-600 text-white font-semibold';
    } else {
      b.className = 'px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition bg-slate-100 text-slate-600';
    }
  });
  render();
}

function handleSearchInput(e) {
  searchQuery = e.target.value;
  const clearBtn = document.getElementById('clearSearchBtn');
  if (clearBtn) {
    if (searchQuery) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }
  render();
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  searchQuery = '';
  const clearBtn = document.getElementById('clearSearchBtn');
  if (clearBtn) clearBtn.classList.add('hidden');
  render();
}

// =================================================================
// DANH SÁCH CHỌN ĐƠN VỊ TÀI CHÍNH DẠNG POPUP 1 CHẠM
// =================================================================
const PARTNER_ICONS = {
  'TPBank': '🟣',
  'FE Credit': '🟢',
  'Home Credit': '🔴',
  'HD Saison': '🟡',
  'Mirae Asset (MAFC)': '🏢',
  'MCredit': '🟣',
  'SHB Finance': '🔷',
  'VPBank': '🏦',
  'Cathay Bank (CUB)': '🌳',
  'Tnex': '⚡',
  'Cake by VPBank': '🍰',
  'Viettel Money': '📶',
  'Tinvay': '💳'
};

function ensureAddAppModalExists() {
  if (document.getElementById('addAppModal')) return;
  const modalDiv = document.createElement('div');
  modalDiv.id = 'addAppModal';
  modalDiv.className = 'fixed inset-0 bg-slate-900/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm hidden';
  modalDiv.innerHTML = `
    <div class="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-4 max-h-[88vh] overflow-y-auto space-y-3 shadow-2xl animate-in fade-in">
      <div class="flex justify-between items-center border-b pb-2">
        <div>
          <h3 class="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <span>🏛️</span> Chọn Đơn Vị Nộp Hồ Sơ
          </h3>
          <p id="addAppTargetName" class="text-[10px] text-slate-500 mt-0.5">Khách hàng: ---</p>
        </div>
        <button type="button" onclick="closeAddAppModal()" class="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">✕</button>
      </div>

      <p class="text-[11px] text-slate-600 bg-blue-50/70 border border-blue-100 p-2 rounded-xl">
        👉 <b>Chạm 1 chạm</b> vào ngân hàng hoặc công ty tài chính bạn muốn nộp:
      </p>

      <div id="addAppPartnersList" class="grid grid-cols-2 gap-2 text-xs">
        <!-- Danh sách nút nạp qua JS -->
      </div>

      <div class="pt-1">
        <button type="button" onclick="closeAddAppModal()" class="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition">
          Hủy & Đóng
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modalDiv);
}

function addAppPrompt(leadId) {
  ensureAddAppModalExists();
  const l = leads.find(x => x.id === leadId);
  if (!l) return;
  targetAddAppLeadId = leadId;

  document.getElementById('addAppTargetName').innerText = `Khách hàng: ${l.name} (${l.phone})`;
  const container = document.getElementById('addAppPartnersList');
  const appliedLenders = (l.applications || []).map(a => a.lender);

  const partners = typeof ALL_PARTNERS !== 'undefined' ? ALL_PARTNERS : [
    'TPBank', 'FE Credit', 'Home Credit', 'HD Saison', 
    'Mirae Asset (MAFC)', 'MCredit', 'SHB Finance', 'VPBank', 
    'Cathay Bank (CUB)', 'Tnex', 'Cake by VPBank', 'Viettel Money', 'Tinvay'
  ];

  let html = '';
  partners.forEach(lender => {
    const isApplied = appliedLenders.includes(lender);
    const icon = PARTNER_ICONS[lender] || '🏛️';

    if (isApplied) {
      html += `
        <button type="button" disabled class="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-left flex items-center justify-between opacity-70 cursor-not-allowed">
          <div class="truncate font-semibold">${icon} ${lender}</div>
          <span class="text-[9px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Đã có</span>
        </button>
      `;
    } else {
      html += `
        <button type="button" onclick="selectPartnerLender('${escapeHtml(lender)}')" class="p-2.5 rounded-xl border-2 border-indigo-100 hover:border-indigo-500 bg-white hover:bg-indigo-50 text-slate-800 text-left flex items-center justify-between shadow-sm active:scale-95 transition">
          <div class="truncate font-bold text-[11px]">${icon} ${lender}</div>
          <span class="text-[10px] text-indigo-600 font-extrabold">+ Nộp</span>
        </button>
      `;
    }
  });

  container.innerHTML = html;
  document.getElementById('addAppModal').classList.remove('hidden');
}

function selectPartnerLender(lender) {
  if (!targetAddAppLeadId) return;
  const l = leads.find(x => x.id === targetAddAppLeadId);
  if (!l) return;
  if (!l.applications) l.applications = [];

  const exists = l.applications.some(a => a.lender === lender);
  if (exists) {
    showToast(`Hồ sơ đã có nộp tại ${lender}`);
    return;
  }

  l.applications.push({ lender, result: 'Đang thẩm định', rejectReason: '', contract: null });
  showToast(`✓ Đã thêm ${lender} vào tiến độ!`);
  closeAddAppModal();
  saveStorage();
  if (typeof sendTelegramNotification === 'function') sendTelegramNotification(`Thêm nộp đơn vị ${lender}`, l.name);
}

function closeAddAppModal() {
  const modal = document.getElementById('addAppModal');
  if (modal) modal.classList.add('hidden');
  targetAddAppLeadId = null;
}

// =================================================================
// MODAL LỌC VÀ ĐỀ XUẤT GÓI VAY TỰ ĐỘNG
// =================================================================
function openLoanMatchModal(leadId) {
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;
  currentMatchingLeadId = leadId;

  const age = lead.age || (typeof calcAge === 'function' ? calcAge(lead.dob) : 25);
  const carrier = lead.simCarrier || detectSimCarrier(lead.phone);
  const cicText = lead.cicStatus === 'SACH' ? '✅ Chuẩn nhóm 1 (Sạch)' : '⚠️ Có nợ chú ý/nợ xấu';

  const nameEl = document.getElementById('matchTargetLeadName');
  if (nameEl) nameEl.innerText = `Khách hàng: ${lead.name} (${age} tuổi) • SĐT: ${lead.phone}`;

  const sumEl = document.getElementById('matchLeadSummary');
  if (sumEl) {
    sumEl.innerHTML = `
      <div><b>Thu nhập:</b> <span class="text-blue-700 font-bold">${formatVND(lead.income)}</span></div>
      <div><b>Cần vay:</b> <span class="text-emerald-700 font-bold">${formatVND(lead.amount)}</span></div>
      <div><b>Mạng SIM:</b> 📶 ${carrier}</div>
      <div><b>CIC:</b> ${cicText}</div>
      <div><b>Ngân hàng:</b> ${lead.bankName || 'Chưa rõ'}</div>
      <div class="col-span-2 text-slate-600 truncate"><b>Đã/đang góp tại:</b> ${(lead.previousLenders || []).join(', ') || 'Chưa từng (Khách mới)'}</div>
    `;
  }

  const matchedList = typeof matchLoanPackages === 'function' ? matchLoanPackages(lead) : [];
  const badgeEl = document.getElementById('matchStatsBadge');
  if (badgeEl) badgeEl.innerText = `${matchedList.length} gói đạt chuẩn`;

  const container = document.getElementById('matchedPackagesContainer');
  if (container) {
    if (matchedList.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center bg-white rounded-2xl border border-dashed text-slate-500 text-xs space-y-1">
          <div class="text-xl">⚠️</div>
          <p class="font-bold text-slate-700">Chưa có gói vay hoàn toàn khớp</p>
          <p class="text-[10px]">Hãy kiểm tra lại độ tuổi hoặc bổ sung thêm chứng từ (BHYT, Bằng lái xe, Cà vẹt).</p>
        </div>
      `;
    } else {
      let html = '';
      matchedList.forEach(pkg => {
        const isAlreadyApplied = lead.applications?.some(a => a.lender === pkg.lender);
        html += `
          <div class="bg-white border-2 border-emerald-500/50 rounded-2xl p-3 shadow-sm space-y-2 relative overflow-hidden">
            <div class="flex justify-between items-start">
              <div>
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${pkg.badge}">🏛️ ${pkg.lender}</span>
                <h4 class="font-bold text-xs text-slate-900 mt-1">${pkg.title}</h4>
                <span class="text-[10px] text-indigo-700 font-semibold block">${pkg.priority}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">Khả thi ${pkg.matchRate}</span>
                <div class="text-[10px] font-bold text-slate-700 mt-1">${pkg.maxAmount}</div>
              </div>
            </div>
            <p class="text-[10px] text-slate-600 leading-tight bg-slate-50 p-2 rounded-xl border border-slate-100">💡 <b>Điều kiện:</b> ${pkg.note}</p>
            <div class="pt-1 flex justify-between items-center border-t border-slate-100">
              <span class="text-[10px] text-slate-500">${isAlreadyApplied ? '✓ Đã có trong danh sách nộp' : 'Chưa nộp đơn vị này'}</span>
              <button 
                type="button" 
                onclick="applyMatchedPackage(${lead.id}, '${pkg.lender}')" 
                class="${isAlreadyApplied ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 hover:bg-blue-700 text-white shadow active:scale-95'} font-extrabold text-[11px] px-3 py-1.5 rounded-xl transition">
                ${isAlreadyApplied ? '✓ Đã Nộp' : '+ Nộp Gói Này'}
              </button>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    }
  }

  const modalEl = document.getElementById('loanMatchModal');
  if (modalEl) modalEl.classList.remove('hidden');
}

function closeLoanMatchModal() {
  const modalEl = document.getElementById('loanMatchModal');
  if (modalEl) modalEl.classList.add('hidden');
}

function applyMatchedPackage(leadId, lender) {
  const l = leads.find(x => x.id === leadId);
  if (!l) return;
  if (!l.applications) l.applications = [];

  const exists = l.applications.some(a => a.lender === lender);
  if (exists) {
    showToast(`Hồ sơ đã có nộp tại ${lender}`);
    return;
  }

  l.applications.push({ lender, result: 'Đang thẩm định', rejectReason: '', contract: null });
  showToast(`Đã thêm ${lender} vào tiến độ nộp!`);
  saveStorage();
  openLoanMatchModal(leadId);
}

// =================================================================
// LƯU FORM HỒ SƠ KHÁCH HÀNG
// =================================================================
function saveLeadForm(e) {
  e.preventDefault();
  const dob = document.getElementById('formDob').value;
  const docs = Array.from(document.querySelectorAll('.lead-doc-chk:checked')).map(el => el.value);
  const prevLenders = Array.from(document.querySelectorAll('.lead-prev-lender-chk:checked')).map(el => el.value);
  const apps = Array.from(document.querySelectorAll('.lead-app-chk:checked')).map(el => el.value);
  const initialLender = document.getElementById('formInitialLender')?.value || 'TPBank';
  const name = document.getElementById('formName').value;
  const phone = document.getElementById('formPhone').value;
  const autoCarrier = detectSimCarrier(phone);

  const d = {
    name: name,
    phone: phone,
    email: document.getElementById('formEmail')?.value || '',
    simCarrier: autoCarrier,
    dob: dob,
    age: typeof calcAge === 'function' ? calcAge(dob) : 25,
    cccd: document.getElementById('formCccd')?.value || '',
    oldCmnd: document.getElementById('formOldCmnd')?.value || '',
    gender: document.getElementById('formGender')?.value || 'Nam',
    permAddress: document.getElementById('formPermAddress')?.value || '',
    tempAddress: document.getElementById('formTempAddress')?.value || '',
    job: document.getElementById('formJob')?.value || '',
    workAddress: document.getElementById('formWorkAddress')?.value || '',
    workTime: document.getElementById('formWorkTime')?.value || '',
    income: parseNumeric(document.getElementById('formIncome')?.value),
    amount: parseNumeric(document.getElementById('formAmount')?.value) || 30000000,
    bankName: document.getElementById('formBankName')?.value || '',
    bankAccount: document.getElementById('formBankAccount')?.value || '',
    previousLenders: prevLenders,
    installedApps: apps,
    ref1Rel: document.getElementById('formRef1Rel')?.value || '',
    ref1Name: document.getElementById('formRef1Name')?.value || '',
    ref1Phone: document.getElementById('formRef1Phone')?.value || '',
    ref2Rel: document.getElementById('formRef2Rel')?.value || '',
    ref2Name: document.getElementById('formRef2Name')?.value || '',
    ref2Phone: document.getElementById('formRef2Phone')?.value || '',
    cicStatus: document.getElementById('formCicStatus')?.value || 'SACH',
    documents: docs,
    note: document.getElementById('formNote')?.value || ''
  };

  let savedLeadId = null;

  if (editingLeadId) {
    const idx = leads.findIndex(x => x.id === editingLeadId);
    if (idx > -1) leads[idx] = { ...leads[idx], ...d };
    savedLeadId = editingLeadId;
    showToast('Đã cập nhật hồ sơ');
    if (typeof sendTelegramNotification === 'function') sendTelegramNotification('Cập nhật hồ sơ', name);
  } else {
    savedLeadId = Date.now();
    leads.unshift({ 
      id: savedLeadId, 
      isCompleted: false, 
      ...d, 
      applications: [{ lender: initialLender, result: 'Đang thẩm định', rejectReason: '', contract: null }] 
    });
    showToast('Đã thêm khách hàng mới');
    if (typeof sendTelegramNotification === 'function') sendTelegramNotification('Thêm khách hàng mới', name);
  }

  closeLeadModal();
  saveStorage();

  setTimeout(() => {
    openLoanMatchModal(savedLeadId);
  }, 250);
}

// =================================================================
// RENDER DANH SÁCH THẺ KHÁCH HÀNG (TỐI ƯU THU GỌN KHO CRM)
// =================================================================
function render() {
  const container = document.getElementById('leadsContainer');
  if (!container) return;

  const activeCount = leads.filter(l => !l.isCompleted).length;
  const archivedCount = leads.filter(l => l.isCompleted).length;
  if (document.getElementById('activeCountBadge')) document.getElementById('activeCountBadge').innerText = activeCount;
  if (document.getElementById('archivedCountBadge')) document.getElementById('archivedCountBadge').innerText = archivedCount;

  if (document.getElementById('statCic')) document.getElementById('statCic').innerText = leads.filter(l => l.cicStatus === 'SACH').length;
  if (document.getElementById('statApproved')) document.getElementById('statApproved').innerText = leads.filter(l => l.applications?.some(a => a.result === 'Duyệt')).length;
  if (document.getElementById('statDisbursed')) document.getElementById('statDisbursed').innerText = leads.filter(l => l.applications?.some(a => a.contract?.code)).length;

  const filtered = leads.filter(l => {
    if (activeTab === 'active' && l.isCompleted) return false;
    if (activeTab === 'archived' && !l.isCompleted) return false;
    if (activeTab === 'match' && l.isCompleted) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const m1 = l.name.toLowerCase().includes(q) || l.phone.includes(q) || (l.cccd && l.cccd.includes(q));
      const m2 = l.applications?.some(a => a.lender.toLowerCase().includes(q) || (a.contract?.code && a.contract.code.toLowerCase().includes(q)));
      const m3 = l.previousLenders?.some(pl => pl.toLowerCase().includes(q));
      if (!m1 && !m2 && !m3) return false;
    }

    if (currentFilterStatus !== 'ALL') {
      const st = currentFilterStatus;
      const m = l.applications?.some(a => st === 'Duyệt' ? a.result === 'Duyệt' : st === 'Từ chối' ? a.result === 'Từ chối' : (a.result === 'Đang thẩm định' || a.result === 'Bổ sung hồ sơ'));
      if (!m) return false;
    }
    return true;
  });

  if (document.getElementById('statFiltered')) document.getElementById('statFiltered').innerText = `${filtered.length}/${leads.length}`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 mt-4 space-y-2">
        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">🔎</div>
        <p class="font-bold text-slate-800 text-sm">Không tìm thấy hồ sơ phù hợp</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(lead => {
    const actualCarrier = lead.simCarrier || detectSimCarrier(lead.phone);
    const carrierColor = actualCarrier === 'Vinaphone' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                         actualCarrier === 'Mobifone' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                         actualCarrier === 'Vietnamobile' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                         actualCarrier === 'Viettel' ? 'bg-red-50 text-red-700 border-red-200' :
                         'bg-slate-100 text-slate-700 border-slate-200';

    // =============================================================
    // CHẾ ĐỘ THU GỌN KHI Ở TAB "📁 LƯU KHO"
    // =============================================================
    if (activeTab === 'archived') {
      const isExpanded = expandedArchiveIds.has(lead.id);
      
      // Tìm xem có đơn vị nào đã duyệt và giải ngân không
      const approvedApp = (lead.applications || []).find(a => a.result === 'Duyệt' && a.contract);
      const isDisbursed = lead.completeReason === 'Đã giải ngân thành công' || !!approvedApp;

      let docsHtml = '';
      const docMap = typeof DOC_MAP !== 'undefined' ? DOC_MAP : {};
      (lead.documents || []).forEach(d => {
        docsHtml += `<span class="inline-block bg-white text-slate-700 text-[10px] px-1.5 py-0.5 rounded border border-slate-200 ml-1">✓ ${docMap[d] || d}</span>`;
      });
      if (!docsHtml) docsHtml = '<span class="text-slate-400 italic text-[10px]"> Chưa có</span>';

      let appsHtml = '';
      (lead.applications || []).forEach((app, aIdx) => {
        appsHtml += `
          <div class="bg-white rounded-lg p-2 border border-slate-200 text-xs flex justify-between items-center">
            <span class="font-bold text-slate-800 truncate">🏛️ ${app.lender}</span>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded ${app.result === 'Duyệt' ? 'bg-emerald-100 text-emerald-800' : app.result === 'Từ chối' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}">${app.result}</span>
              ${app.contract ? `<button type="button" onclick="openReceipt(${lead.id}, ${aIdx})" class="text-[10px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded active:scale-95 transition">🧾 Phiếu</button>` : ''}
            </div>
          </div>
        `;
      });

      html += `
        <div class="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm space-y-2 transition-all">
          <!-- Thanh tóm tắt ngắn gọn -->
          <div class="flex justify-between items-center">
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-slate-900 text-sm">${escapeHtml(lead.name)}</span>
                <span class="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">${lead.age} tuổi</span>
                <span class="text-[10px] ${carrierColor} px-1.5 py-0.5 rounded border font-semibold">📶 ${actualCarrier}</span>
              </div>
              <div class="text-xs text-slate-500 font-mono mt-0.5">${lead.phone} • CCCD: ${lead.cccd || '---'}</div>
            </div>
            <div class="flex items-center gap-1">
              <button 
                type="button" 
                onclick="toggleLeadDetail(${lead.id})" 
                class="text-[10px] ${isExpanded ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'} hover:bg-slate-200 font-extrabold px-2.5 py-1 rounded-full transition active:scale-95 flex items-center gap-0.5">
                <span>${isExpanded ? '▲ Thu gọn' : '▼ Chi tiết'}</span>
              </button>
              <button 
                type="button" 
                onclick="toggleCompleteModal(${lead.id})" 
                title="Mở lại hồ sơ đang xử lý"
                class="bg-slate-800 hover:bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-full font-bold shadow-sm transition active:scale-95">
                ↺ Mở lại
              </button>
            </div>
          </div>

          <!-- Huy hiệu trạng thái lưu kho ngắn gọn 1 dòng -->
          <div class="bg-indigo-50/60 border border-indigo-100 rounded-xl p-2 flex justify-between items-center text-[11px]">
            <div class="truncate flex items-center gap-1">
              <span class="font-bold ${isDisbursed ? 'text-emerald-700' : 'text-indigo-950'}">
                ${isDisbursed ? '🎉' : '📁'} ${escapeHtml(lead.completeReason || 'Hoàn tất')}
              </span>
              ${approvedApp?.contract ? `<span class="text-emerald-800 font-black text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded">(${approvedApp.lender}: ${formatVND(approvedApp.contract.approvedAmount)})</span>` : ''}
            </div>
            <span class="text-[10px] text-slate-500 shrink-0 ml-1 font-medium">${lead.completedDate || ''}</span>
          </div>

          <!-- Khối chi tiết chỉ hiển thị khi bấm "Xem chi tiết" -->
          ${isExpanded ? `
            <div class="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
              <div class="bg-slate-50 rounded-xl p-2.5 text-xs space-y-1.5 border border-slate-100">
                <div class="flex justify-between"><span>Khoản vay:</span> <span class="font-bold text-blue-700">${formatVND(lead.amount)}</span></div>
                <div class="flex justify-between"><span>CIC:</span> <span class="font-bold">${lead.cicStatus === 'SACH' ? 'Nhóm 1 (Sạch)' : 'Nợ chú ý/xấu'}</span></div>
                <div class="text-[11px]"><b>Nghề nghiệp:</b> ${escapeHtml(lead.job) || 'Tự do'} • Thu nhập: ${formatVND(lead.income)}</div>
                ${lead.workAddress ? `<div class="text-[10px] text-slate-600">🏢 <b>Nơi làm:</b> ${escapeHtml(lead.workAddress)} (${escapeHtml(lead.workTime) || 'Chưa rõ TG'})</div>` : ''}
                <div class="text-[10px] text-slate-500">🏠 <b>Thường trú:</b> ${escapeHtml(lead.permAddress) || '---'}</div>
                <div class="text-[10px] text-slate-500">👥 <b>Tham chiếu:</b> ${escapeHtml(lead.ref1Name) || '---'} (${lead.ref1Phone || '---'})</div>
                <div><b>Chứng từ:</b> ${docsHtml}</div>
                ${lead.note ? `<div class="text-[10px] text-slate-600 bg-amber-50 p-1.5 rounded border border-amber-200">📝 <b>Ghi chú:</b> ${escapeHtml(lead.note)}</div>` : ''}
              </div>

              <!-- Lịch sử nộp các đơn vị -->
              <div class="bg-slate-100/60 rounded-xl p-2 space-y-1.5 border border-slate-200">
                <span class="font-bold text-xs text-slate-800 block">🏛️ Tiến độ hồ sơ đã lưu:</span>
                <div class="space-y-1">${appsHtml}</div>
              </div>

              <!-- Nút liên hệ & sửa/xóa -->
              <div class="flex justify-between items-center pt-1 text-xs">
                <div class="flex gap-1.5">
                  <a href="tel:${lead.phone}" class="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">📞 Gọi</a>
                  <a href="https://zalo.me/${lead.phone}" target="_blank" class="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold">💬 Zalo</a>
                </div>
                <div class="flex gap-1">
                  <button type="button" onclick="openEditModal(${lead.id})" class="text-slate-700 px-2 py-1 font-semibold hover:bg-slate-100 rounded">Sửa</button>
                  <button type="button" onclick="deleteLead(${lead.id})" class="text-rose-600 px-2 py-1 font-semibold hover:bg-rose-50 rounded">Xóa</button>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      `;
      return;
    }

    // =============================================================
    // CHẾ ĐỘ BÌNH THƯỜNG (CHO TAB "⚡ ĐANG XỬ LÝ" & "🎯 LỌC GÓI VAY")
    // =============================================================
    let docsHtml = '';
    const docMap = typeof DOC_MAP !== 'undefined' ? DOC_MAP : {};
    (lead.documents || []).forEach(d => {
      docsHtml += `<span class="inline-block bg-white text-slate-700 text-[10px] px-1.5 py-0.5 rounded border border-slate-200 ml-1">✓ ${docMap[d] || d}</span>`;
    });
    if (!docsHtml) docsHtml = '<span class="text-slate-400 italic text-[10px]"> Chưa có</span>';

    let prevLendersHtml = '';
    (lead.previousLenders || []).forEach(pl => {
      prevLendersHtml += `<span class="inline-block bg-emerald-50 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded border border-emerald-200 font-semibold ml-1">🏛️ ${pl}</span>`;
    });
    if (!prevLendersHtml) prevLendersHtml = '<span class="text-slate-400 italic text-[10px]"> Chưa có (Khách mới)</span>';

    let appsHtml = '';
    (lead.applications || []).forEach((app, aIdx) => {
      let extraHtml = '';
      if (app.result === 'Từ chối') {
        extraHtml = `
          <div class="text-rose-700 bg-rose-50 p-1.5 rounded text-[10px] space-y-1 border border-rose-200 mt-1">
            <div class="font-bold">⛔ Đã kết thúc tại ${app.lender}</div>
            <input type="text" value="${escapeHtml(app.rejectReason || '')}" oninput="updateRejectReason(${lead.id}, ${aIdx}, this.value)" placeholder="Nhập lý do từ chối..." class="w-full bg-white border border-rose-200 rounded px-1.5 py-0.5 text-[10px]">
          </div>
        `;
      } else if (app.result === 'Duyệt') {
        let contractDetails = '';
        if (app.contract) {
          contractDetails = `
            <div class="grid grid-cols-2 gap-1 text-slate-700 pt-1 border-t border-emerald-200">
              <div>Số HĐ: <b class="font-mono text-emerald-800">${escapeHtml(app.contract.code)}</b></div>
              <div>Duyệt: <b class="text-emerald-800">${formatVND(app.contract.approvedAmount)}</b></div>
              <div class="col-span-2 flex justify-between items-center pt-1">
                <span>Kỳ: ${app.contract.tenor} tháng • Góp: ${formatVND(app.contract.monthlyPay)}/tháng</span>
                <button type="button" onclick="openReceipt(${lead.id}, ${aIdx})" class="bg-teal-600 text-white px-2.5 py-1 rounded-lg font-bold shadow hover:bg-teal-700 active:scale-95 transition">🧾 Xuất Phiếu</button>
              </div>
            </div>
          `;
        }
        extraHtml = `
          <div class="bg-emerald-50 border border-emerald-300 p-2 rounded text-[10px] space-y-1 mt-1">
            <div class="flex justify-between items-center font-bold text-emerald-900">
              <span>🎉 Đã duyệt khoản vay</span>
              <button type="button" onclick="openContractModal(${lead.id}, ${aIdx})" class="bg-emerald-700 text-white px-2 py-0.5 rounded shadow hover:bg-emerald-800 active:scale-95 transition">${app.contract ? 'Sửa HĐ' : '+ Nhập HĐ'}</button>
            </div>
            ${contractDetails}
          </div>
        `;
      }

      appsHtml += `
        <div class="bg-white rounded-lg p-2 border border-indigo-200/70 text-xs space-y-1.5 shadow-sm">
          <div class="grid grid-cols-12 gap-1 items-center">
            <div class="col-span-5 font-bold text-slate-800 truncate">🏢 ${app.lender}</div>
            <div class="col-span-7 flex justify-end gap-1">
              <select onchange="handleAppChange(${lead.id}, ${aIdx}, this.value)" class="font-bold text-[11px] rounded-lg px-2 py-1 border bg-slate-50">
                <option value="Đang thẩm định" ${app.result === 'Đang thẩm định' ? 'selected' : ''}>⏳ Đang thẩm định</option>
                <option value="Bổ sung hồ sơ" ${app.result === 'Bổ sung hồ sơ' ? 'selected' : ''}>📄 Bổ sung hồ sơ</option>
                <option value="Duyệt" ${app.result === 'Duyệt' ? 'selected' : ''}>✅ Duyệt</option>
                <option value="Từ chối" ${app.result === 'Từ chối' ? 'selected' : ''}>⛔ Từ chối</option>
              </select>
              <button type="button" onclick="removeApp(${lead.id}, ${aIdx})" class="text-slate-400 hover:text-rose-600 px-1 font-bold">✕</button>
            </div>
          </div>
          ${extraHtml}
        </div>
      `;
    });

    let matchSummaryHtml = '';
    if (activeTab === 'match') {
      const matchedPkgs = typeof matchLoanPackages === 'function' ? matchLoanPackages(lead) : [];
      let pkgPills = '';
      matchedPkgs.slice(0, 3).forEach(p => {
        pkgPills += `<span class="inline-block bg-amber-50 text-amber-900 border border-amber-200 rounded px-1.5 py-0.5 text-[10px] font-bold">⭐ ${p.lender} (${p.matchRate})</span>`;
      });
      matchSummaryHtml = `
        <div class="bg-amber-50/70 border border-amber-300 rounded-xl p-2 space-y-1">
          <div class="flex justify-between items-center text-[10px] font-black text-amber-950">
            <span>🎯 ${matchedPkgs.length} GÓI VAY ĐẠT CHUẨN:</span>
            <button type="button" onclick="openLoanMatchModal(${lead.id})" class="text-blue-700 underline font-extrabold">Xem tất cả ➔</button>
          </div>
          <div class="flex flex-wrap gap-1">${pkgPills || '<span class="text-slate-500 text-[10px]">Chưa tìm thấy gói hoàn toàn khớp</span>'}</div>
        </div>
      `;
    }

    html += `
      <div class="bg-white rounded-2xl p-3.5 border ${activeTab === 'match' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'} shadow-sm space-y-3">
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-slate-900 text-sm">${escapeHtml(lead.name)}</span>
              <span class="text-[11px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-bold">${lead.age} tuổi</span>
              <span class="text-[10px] ${carrierColor} px-1.5 py-0.5 rounded border font-semibold">📶 ${actualCarrier}</span>
            </div>
            <div class="text-xs text-slate-500 font-mono mt-0.5">${lead.phone} • CCCD: ${lead.cccd || 'Chưa có'}</div>
          </div>
          <div class="flex gap-1">
            <button type="button" onclick="openLoanMatchModal(${lead.id})" class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] px-2.5 py-1 rounded-full font-extrabold shadow-sm active:scale-95 transition">
              🎯 Lọc Gói
            </button>
            <button type="button" onclick="toggleCompleteModal(${lead.id})" class="bg-slate-800 hover:bg-slate-900 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-sm transition active:scale-95">
              ✓ Xong
            </button>
          </div>
        </div>

        ${matchSummaryHtml}

        <div class="bg-slate-50 rounded-xl p-2.5 text-xs space-y-1.5 border border-slate-100">
          <div class="flex justify-between"><span>Cần vay:</span> <span class="font-bold text-blue-700">${formatVND(lead.amount)}</span></div>
          <div class="flex justify-between"><span>CIC:</span> <span class="font-bold">${lead.cicStatus === 'SACH' ? 'Nhóm 1 (Sạch)' : 'Nợ chú ý/xấu'}</span></div>
          <div class="text-[11px]"><b>Nghề nghiệp:</b> ${escapeHtml(lead.job) || 'Tự do'} • Thu nhập: ${formatVND(lead.income)}</div>
          ${lead.workAddress ? `<div class="text-[10px] text-slate-600">🏢 <b>Đ/c làm việc:</b> ${escapeHtml(lead.workAddress)} (${escapeHtml(lead.workTime) || 'Chưa rõ TG'})</div>` : ''}
          <div class="text-[10px] text-slate-600 bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-100"><b>🔍 Đang/Từng vay ở Cty:</b> ${prevLendersHtml}</div>
          <div><b>Chứng từ:</b> ${docsHtml}</div>
        </div>

        <!-- TIẾN ĐỘ NỘP ĐA CÔNG TY KÈM NÚT NỘP DẠNG LIST CHỌN NHANH -->
        <div class="bg-indigo-50/50 rounded-xl p-2.5 border border-indigo-100 space-y-2">
          <div class="flex justify-between items-center">
            <span class="font-bold text-xs text-indigo-950">🏛️ Tiến độ nộp đa công ty:</span>
            <button type="button" onclick="addAppPrompt(${lead.id})" class="text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-lg shadow active:scale-95 transition flex items-center gap-1">
              <span>+</span>
              <span>Nộp Cty</span>
            </button>
          </div>
          <div class="space-y-1.5">${appsHtml}</div>
        </div>

        <div class="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
          <div class="flex gap-1.5">
            <a href="tel:${lead.phone}" class="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">📞 Gọi</a>
            <a href="https://zalo.me/${lead.phone}" target="_blank" class="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold">💬 Zalo</a>
          </div>
          <div class="flex gap-1">
            <button type="button" onclick="openEditModal(${lead.id})" class="text-slate-700 px-2 py-1 font-semibold hover:bg-slate-100 rounded">Sửa</button>
            <button type="button" onclick="deleteLead(${lead.id})" class="text-rose-600 px-2 py-1 font-semibold hover:bg-rose-50 rounded">Xóa</button>
          </div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// =================================================================
// CÁC HÀM KHỞI ĐỘNG VÀ XỬ LÝ FORM
// =================================================================
function renderDocCheckboxes(selectedDocs = []) {
  const c = document.getElementById('formDocsContainer');
  if (!c) return;
  c.innerHTML = '';
  const docMap = typeof DOC_MAP !== 'undefined' ? DOC_MAP : {};
  for (const [k, lbl] of Object.entries(docMap)) {
    const checked = selectedDocs.includes(k) ? 'checked' : '';
    c.innerHTML += `<label class="flex items-center gap-1"><input type="checkbox" value="${k}" ${checked} class="lead-doc-chk"> ${lbl}</label>`;
  }
}

function renderPrevLendersCheckboxes(selectedLenders = []) {
  const c = document.getElementById('formPrevLendersContainer');
  if (!c) return;
  c.innerHTML = '';
  const partners = typeof ALL_PARTNERS !== 'undefined' ? ALL_PARTNERS : [];
  partners.forEach(lender => {
    const checked = selectedLenders.includes(lender) ? 'checked' : '';
    c.innerHTML += `<label class="flex items-center gap-1"><input type="checkbox" value="${lender}" ${checked} class="lead-prev-lender-chk"> ${lender}</label>`;
  });
}

function openCreateModal() {
  editingLeadId = null;
  document.getElementById('leadModalTitle').innerText = 'Thêm Khách Hàng Mới';
  document.getElementById('leadForm').reset();
  document.getElementById('formDob').value = '1998-05-15';
  updateCarrierBadge('Khác');
  renderDocCheckboxes();
  renderPrevLendersCheckboxes();
  document.getElementById('leadModal').classList.remove('hidden');
}

function openEditModal(id) {
  const l = leads.find(x => x.id === id);
  if (!l) return;
  editingLeadId = id;
  document.getElementById('leadModalTitle').innerText = 'Cập Nhật Hồ Sơ';
  document.getElementById('formName').value = l.name || '';
  document.getElementById('formPhone').value = l.phone || '';
  document.getElementById('formEmail').value = l.email || '';
  document.getElementById('formDob').value = l.dob || '1998-05-15';
  document.getElementById('formCccd').value = l.cccd || '';
  document.getElementById('formOldCmnd').value = l.oldCmnd || '';
  document.getElementById('formGender').value = l.gender || 'Nam';
  document.getElementById('formPermAddress').value = l.permAddress || '';
  document.getElementById('formTempAddress').value = l.tempAddress || '';
  document.getElementById('formJob').value = l.job || '';
  document.getElementById('formWorkAddress').value = l.workAddress || '';
  document.getElementById('formWorkTime').value = l.workTime || '';
  document.getElementById('formIncome').value = l.income || '';
  document.getElementById('formAmount').value = l.amount || '';
  document.getElementById('formBankName').value = l.bankName || '';
  document.getElementById('formBankAccount').value = l.bankAccount || '';
  document.getElementById('formRef1Rel').value = l.ref1Rel || '';
  document.getElementById('formRef1Name').value = l.ref1Name || '';
  document.getElementById('formRef1Phone').value = l.ref1Phone || '';
  document.getElementById('formRef2Rel').value = l.ref2Rel || '';
  document.getElementById('formRef2Name').value = l.ref2Name || '';
  document.getElementById('formRef2Phone').value = l.ref2Phone || '';
  document.getElementById('formCicStatus').value = l.cicStatus || 'SACH';
  document.getElementById('formNote').value = l.note || '';
  updateCarrierBadge(l.simCarrier || detectSimCarrier(l.phone));
  renderDocCheckboxes(l.documents || []);
  renderPrevLendersCheckboxes(l.previousLenders || []);
  
  const userApps = l.installedApps || [];
  document.querySelectorAll('.lead-app-chk').forEach(el => {
    el.checked = userApps.includes(el.value);
  });

  document.getElementById('leadModal').classList.remove('hidden');
}

function closeLeadModal() { document.getElementById('leadModal').classList.add('hidden'); }

function deleteLead(id) {
  if (confirm('Xóa hồ sơ này?')) {
    leads = leads.filter(x => x.id !== id);
    showToast('Đã xóa hồ sơ');
    saveStorage();
  }
}

function removeApp(leadId, aIdx) {
  const l = leads.find(x => x.id === leadId);
  if (!l) return;
  l.applications.splice(aIdx, 1);
  showToast('Đã xóa cty');
  saveStorage();
}

function handleAppChange(leadId, aIdx, val) {
  const l = leads.find(x => x.id === leadId);
  if (!l) return;
  l.applications[aIdx].result = val;
  if (val === 'Duyệt') {
    openContractModal(leadId, aIdx);
  } else {
    saveStorage();
    if (typeof sendTelegramNotification === 'function') sendTelegramNotification(`Đổi kết quả sang [${val}]`, l.name);
  }
}

function updateRejectReason(leadId, aIdx, val) {
  const l = leads.find(x => x.id === leadId);
  if (!l) return;
  l.applications[aIdx].rejectReason = val;
  saveStorage();
}

function openContractModal(leadId, aIdx) {
  contractLeadId = leadId;
  contractAppIdx = aIdx;
  const l = leads.find(x => x.id === leadId);
  const app = l.applications[aIdx];
  const c = app.contract;

  document.getElementById('contractCode').value = c ? c.code : ('HĐ-' + Date.now().toString().slice(-5));
  document.getElementById('contractAmount').value = c ? c.approvedAmount : (l.amount || 30000000);
  document.getElementById('contractTenor').value = c ? c.tenor : 12;
  document.getElementById('contractMonthly').value = c ? c.monthlyPay : Math.round((l.amount || 30000000) * 1.15 / 12);
  document.getElementById('contractDate').value = c ? c.disburseDate : new Date().toISOString().substring(0, 10);
  document.getElementById('contractModal').classList.remove('hidden');
}

function closeContractModal() { document.getElementById('contractModal').classList.add('hidden'); }

function saveContractForm(e) {
  e.preventDefault();
  const l = leads.find(x => x.id === contractLeadId);
  if (!l) return;
  l.applications[contractAppIdx].contract = {
    code: document.getElementById('contractCode').value,
    approvedAmount: parseNumeric(document.getElementById('contractAmount').value),
    tenor: Number(document.getElementById('contractTenor').value),
    monthlyPay: parseNumeric(document.getElementById('contractMonthly').value),
    disburseDate: document.getElementById('contractDate').value || new Date().toISOString().substring(0, 10)
  };
  showToast('Đã lưu hợp đồng');
  closeContractModal();
  saveStorage();
  if (typeof sendTelegramNotification === 'function') sendTelegramNotification('Duyệt & Lưu Hợp Đồng', l.name);
  
  setTimeout(() => {
    openReceipt(contractLeadId, contractAppIdx);
  }, 200);
}

const LENDER_THEMES = {
  'TPBank': { bg: 'bg-purple-700', emoji: '🟣', guide: 'Thanh toán qua app TPBank Mobile hoặc ví MoMo/Viettel Money chọn "Thanh toán khoản vay > TPBank".' },
  'FE Credit': { bg: 'bg-emerald-700', emoji: '🟢', guide: 'Thanh toán qua ví MoMo, ZaloPay, Viettel Money hoặc STK định danh FE Credit.' },
  'Home Credit': { bg: 'bg-red-600', emoji: '🔴', guide: 'Đóng tiền qua app Home Credit, MoMo, Viettel Post hoặc cửa hàng TGDĐ/FPT Shop.' },
  'HD Saison': { bg: 'bg-amber-600', emoji: '🟡', guide: 'Thanh toán qua HD SAISON App, VNPay, Bưu điện VNPost hoặc điểm thu hộ liên kết.' },
  'Mirae Asset (MAFC)': { bg: 'bg-blue-900', emoji: '🏢', guide: 'Chuyển khoản qua STK định danh Mirae Asset hoặc qua My Finance / MoMo.' },
  'MCredit': { bg: 'bg-purple-700', emoji: '🟣', guide: 'Thanh toán qua app MCredit, Viettel Money hoặc các điểm thu hộ Viettel Post.' },
  'SHB Finance': { bg: 'bg-cyan-700', emoji: '🔷', guide: 'Đóng qua SHB Finance App, VNPay hoặc chuyển khoản trực tiếp STK ngân hàng.' },
  'VPBank': { bg: 'bg-green-700', emoji: '🏦', guide: 'Thanh toán qua VPBank NEO, MoMo, hoặc nộp tiền mặt tại chi nhánh VPBank.' },
  'Cathay Bank (CUB)': { bg: 'bg-emerald-800', emoji: '🌳', guide: 'Chuyển khoản theo STK hợp đồng định danh cấp bởi Cathay Bank (CUB).' },
  'Tnex': { bg: 'bg-sky-600', emoji: '⚡', guide: 'Thanh toán trực tiếp tự động qua app ngân hàng số TNEX.' },
  'Cake by VPBank': { bg: 'bg-pink-600', emoji: '🍰', guide: 'Thanh toán trực tiếp trên app Cake by VPBank.' },
  'Viettel Money': { bg: 'bg-rose-700', emoji: '📶', guide: 'Thanh toán qua app Viettel Money (mục Vay tiêu dùng).' },
  'Tinvay': { bg: 'bg-indigo-700', emoji: '💳', guide: 'Thanh toán qua app Tinvay hoặc các cổng thanh toán hỗ trợ.' }
};

function openReceipt(leadId, aIdx) {
  const l = leads.find(x => x.id === leadId);
  if (!l || !l.applications || !l.applications[aIdx]) return;
  const app = l.applications[aIdx];
  receiptLeadId = leadId;
  receiptAppIdx = aIdx;

  const c = app.contract || {};
  const dates = typeof calcPayDates === 'function' ? calcPayDates(c.disburseDate, c.tenor) : { first: '---', last: '---' };
  const theme = LENDER_THEMES[app.lender] || { bg: 'bg-slate-800', emoji: '💳', guide: 'Thanh toán qua ví điện tử hoặc điểm thu hộ liên kết.' };

  document.getElementById('receiptHeader').className = `p-4 text-white ${theme.bg} flex justify-between items-center`;
  document.getElementById('receiptLogoEmoji').innerText = theme.emoji;
  document.getElementById('receiptLenderTitle').innerText = app.lender;
  document.getElementById('receiptName').innerText = l.name;
  document.getElementById('receiptPhone').innerText = l.phone;
  document.getElementById('receiptMonthlyPay').innerText = formatVND(c.monthlyPay);
  document.getElementById('receiptTenor').innerText = `${c.tenor || 12} tháng`;
  document.getElementById('receiptCode').innerText = c.code || '---';
  document.getElementById('receiptFirstDate').innerText = dates.first;
  document.getElementById('receiptLastDate').innerText = dates.last;
  document.getElementById('receiptGuideText').innerText = theme.guide;

  document.getElementById('receiptModal').classList.remove('hidden');
}

function closeReceiptModal() { document.getElementById('receiptModal').classList.add('hidden'); }

function copyPaymentMsg() {
  const l = leads.find(x => x.id === receiptLeadId);
  const app = l.applications[receiptAppIdx];
  const c = app.contract || {};
  const dates = typeof calcPayDates === 'function' ? calcPayDates(c.disburseDate, c.tenor) : { first: '---', last: '---' };
  const theme = LENDER_THEMES[app.lender] || { guide: 'Thanh toán qua ví điện tử hoặc điểm thu hộ.' };

  const msg = `📢 THÔNG BÁO LỊCH THANH TOÁN KHOẢN VAY\n---------------------------------------\nKính gửi: ${l.name} (${l.phone})\nĐơn vị: ${app.lender}\nSố HĐ: ${c.code || '---'}\nTiền góp: ${formatVND(c.monthlyPay)}/tháng (Kỳ hạn: ${c.tenor || 12} tháng)\n📅 Ngày đóng đầu tiên: ${dates.first}\n🏁 Ngày đóng cuối (Tất toán): ${dates.last}\n\n🏦 HƯỚNG DẪN ĐÓNG TIỀN:\n${theme.guide}`;
  
  navigator.clipboard.writeText(msg).then(() => showToast('Đã copy tin nhắn gửi Zalo!')).catch(() => showToast('Lỗi copy'));
}

function toggleCompleteModal(leadId) {
  const l = leads.find(x => x.id === leadId);
  if (l.isCompleted) {
    l.isCompleted = false;
    showToast('Đã mở lại hồ sơ đang xử lý');
    saveStorage();
  } else {
    targetCompleteId = leadId;
    document.getElementById('completeModal').classList.remove('hidden');
  }
}

function closeCompleteModal() { document.getElementById('completeModal').classList.add('hidden'); }

function saveCompleteLead() {
  const l = leads.find(x => x.id === targetCompleteId);
  if (!l) return;

  const reason = document.getElementById('completeReason').value;
  l.isCompleted = true;
  l.completeReason = reason;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  l.completedDate = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;
  showToast('Đã lưu kho CRM');
  if (typeof sendTelegramNotification === 'function') sendTelegramNotification(`Lưu kho [${l.completeReason}]`, l.name);

  closeCompleteModal();
  saveStorage();

  if (reason === 'Đã giải ngân thành công') {
    if (!l.applications || l.applications.length === 0) {
      l.applications = [{ lender: 'TPBank', result: 'Duyệt', rejectReason: '', contract: null }];
    }

    let appIdx = l.applications.findIndex(a => a.result === 'Duyệt');
    if (appIdx === -1) {
      appIdx = 0;
      l.applications[0].result = 'Duyệt';
    }

    const app = l.applications[appIdx];
    if (app.contract && app.contract.code) {
      setTimeout(() => { openReceipt(l.id, appIdx); }, 300);
    } else {
      setTimeout(() => { openContractModal(l.id, appIdx); }, 300);
    }
  }
}

function openBackupModal() {
  const auto = localStorage.getItem('loan_crm_autotg') === 'true';
  const chk = document.getElementById('autoNotifyTg');
  if (chk) chk.checked = auto;
  const cfg = typeof getTelegramConfig === 'function' ? getTelegramConfig() : { token: '', chatId: '' };
  if (document.getElementById('cfgTgToken')) document.getElementById('cfgTgToken').value = cfg.token;
  if (document.getElementById('cfgTgChatId')) document.getElementById('cfgTgChatId').value = cfg.chatId;
  document.getElementById('backupModal').classList.remove('hidden');
}

function closeBackupModal() { document.getElementById('backupModal').classList.add('hidden'); }

function downloadBackupFile() {
  const blob = new Blob([JSON.stringify(leads, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `CRM_PTC_Backup_${Date.now()}.json`;
  a.click();
  showToast('Đã tải file máy!');
}

function copyBackupText() {
  navigator.clipboard.writeText(JSON.stringify(leads)).then(() => showToast('Đã copy mã! Dán vào Zalo.')).catch(() => showToast('Lỗi copy'));
}

function restoreFromFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (evt) => {
    try {
      const p = JSON.parse(evt.target.result);
      if (Array.isArray(p)) { 
        leads = p; 
        showToast('Khôi phục từ file thành công!'); 
        closeBackupModal(); 
        saveStorage(); 
      }
    } catch (err) { 
      showToast('File không hợp lệ'); 
    }
  };
  r.readAsText(f);
}

render();
