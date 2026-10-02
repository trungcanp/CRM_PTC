// js/app.js - Bộ điều phối CRM độc lập ĐẦY ĐỦ (API V2 - Khắc phục lỗi Syntax)

const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzi_ck6A2akcCHlWC7q_lqm2qSVBNkl0Qq-_3k-wefR62kAxdMSPGm7-V1IuEK-s2Q7/exec';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cleanJsonString(str) {
  if (!str) return '';
  return String(str).replace(/^\uFEFF/, '').trim();
}

function smartFormatMoney(el) {
  let val = parseInt(String(el.value).replace(/[^0-9]/g, ''), 10);
  if (!val) {
    el.value = '';
    return;
  }
  if (val < 100000) {
    val = val * 1000;
  }
  el.value = new Intl.NumberFormat('vi-VN').format(val);
}

let leads = [];
try {
  const localData = localStorage.getItem('loan_crm_v22');
  leads = localData ? JSON.parse(localData) : [];
} catch (e) {
  leads = [];
}

if ((!Array.isArray(leads) || leads.length === 0) && typeof DEFAULT_SAMPLE_LEADS !== 'undefined') {
  leads = DEFAULT_SAMPLE_LEADS;
}

let activeTab = 'active'; 
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

let expandedArchiveIds = new Set();

function toggleLeadDetail(id) {
  if (expandedArchiveIds.has(id)) {
    expandedArchiveIds.delete(id);
  } else {
    expandedArchiveIds.add(id);
  }
  render();
}

function showToast(m) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerText = m;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2800);
}

async function loadLeadsFromCloud() {
  try {
    const res = await fetch(GOOGLE_SHEET_API_URL);
    const json = await res.json();
    if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
      leads = json.data;
      localStorage.setItem('loan_crm_v22', JSON.stringify(leads));
      if (typeof showToast === 'function') showToast(`✓ Đã đồng bộ ${leads.length} hồ sơ từ Google Sheets!`);
      render();
    }
  } catch (err) {
    console.warn('Dùng dữ liệu cục bộ do mạng/Cloud bận:', err);
  }
}

function saveStorage() {
  try {
    localStorage.setItem('loan_crm_v22', JSON.stringify(leads));
  } catch (e) {}
  render();

  try {
    fetch(GOOGLE_SHEET_API_URL, {
      method: 'POST',
      redirect: 'follow', 
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action: 'SYNC_ALL', leads: leads })
    })
    .then(response => response.json())
    .then(data => {
      if (data.ok) {
        console.log('✓ Đã đồng bộ Sheets thành công! Đã đẩy:', data.count, 'hồ sơ.');
      } else {
        console.error('❌ Lỗi từ Google Sheets:', data.error);
      }
    })
    .catch(err => {
      console.warn('Lỗi gọi API đồng bộ:', err);
    });
  } catch (e) {}
}

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

function ensureAddAppModalExists() {
  if (document.getElementById('addAppModal')) return;
  const modalDiv = document.createElement('div');
  modalDiv.id = 'addAppModal';
  modalDiv.className = 'fixed inset-0 bg-slate-900/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm hidden';
  modalDiv.innerHTML = `
    <div class="bg-slate-50 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-4 max-h-[90vh] overflow-y-auto space-y-3 shadow-2xl animate-in fade-in">
      <div class="flex justify-between items-center border-b border-slate-200 pb-2 bg-slate-50 sticky top-0 z-10">
        <div>
          <h3 class="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <span>🚀</span> Chọn Đơn Vị Nộp Hồ Sơ
          </h3>
          <p id="addAppTargetName" class="text-[10px] text-slate-500 mt-0.5">Khách hàng: ---</p>
        </div>
        <button type="button" onclick="closeAddAppModal()" class="w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold shadow-sm">✕</button>
      </div>
      <div id="addAppPartnersList" class="pb-2"></div>
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

  const renderBtn = (lenderName) => {
    const isApplied = appliedLenders.includes(lenderName);
    if (isApplied) {
      return `<button type="button" disabled class="p-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 text-left flex items-center justify-between opacity-60 cursor-not-allowed">
                <div class="truncate font-semibold text-[10px]">🏢 ${lenderName}</div>
                <span class="text-[9px] font-bold bg-slate-200 text-slate-600 px-1 py-0.5 rounded">Đã nộp</span>
              </button>`;
    }
    return `<button type="button" onclick="selectPartnerLender('${escapeHtml(lenderName)}')" class="p-2 rounded-xl border border-indigo-100 hover:border-indigo-500 bg-white hover:bg-indigo-50 text-slate-800 text-left flex items-center justify-between shadow-sm active:scale-95 transition">
              <div class="truncate font-bold text-[10px]">🏢 ${lenderName}</div>
              <span class="text-[9px] text-indigo-600 font-black">+ Chọn</span>
            </button>`;
  };

  const html = `
    <div class="space-y-4">
      <div class="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 space-y-2">
        <h4 class="font-black text-blue-900 text-[11px] uppercase flex items-center gap-1"><span>📱</span> 1. Vay Qua Đối Tác (Zalo/MoMo...)</h4>
        <div class="space-y-2.5 pl-1">
          <div><div class="text-[10px] font-bold text-slate-600 mb-1">▪️ Qua Zalo:</div><div class="grid grid-cols-2 gap-1.5">${['TiN VAY (VietCredit)', 'MCredit', 'Tnex (MSB)', 'TPBank'].map(renderBtn).join('')}</div></div>
          <div><div class="text-[10px] font-bold text-slate-600 mb-1">▪️️ Qua MoMo:</div><div class="grid grid-cols-2 gap-1.5">${['Home Credit', 'FE Credit', 'VPBank', 'SHB Finance', 'VAY NHANH (MBV)'].map(renderBtn).join('')}</div></div>
          <div><div class="text-[10px] font-bold text-slate-600 mb-1">▪ Qua ZaloPay:</div><div class="grid grid-cols-2 gap-1.5">${['Tnex (ZaloPay)', 'Cake by VPBank'].map(renderBtn).join('')}</div></div>
          <div><div class="text-[10px] font-bold text-slate-600 mb-1">▪️ Qua Viettel Money:</div><div class="grid grid-cols-2 gap-1.5">${['Cake (Viettel)', 'FE Credit (Viettel)', 'TiN VAY (Viettel)', 'MCredit (Viettel)', 'FAST MONEY (EVN)'].map(renderBtn).join('')}</div></div>
          <div><div class="text-[10px] font-bold text-slate-600 mb-1">▪️ Qua Quà Tặng VIP:</div><div class="grid grid-cols-2 gap-1.5">${['Cake (VIP)', 'EVO', 'Thẻ VietCredit', 'Thẻ MWG (VPBank)'].map(renderBtn).join('')}</div></div>
        </div>
      </div>
      <div class="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 space-y-2">
        <h4 class="font-black text-emerald-900 text-[11px] uppercase flex items-center gap-1"><span>👔</span> 2. Vay Trực Tiếp Qua Sale</h4>
        <div class="grid grid-cols-2 gap-1.5">
          ${['TiN VAY (Sale)', 'MCredit (Sale)', 'Home Credit (Sale)', 'FE Credit (Sale)', 'HD Saison', 'VPBank (Sale)', 'Tnex (Sale)', 'Cake (Sale)', 'TPBank (Sale)', 'CUB (Cathay Bank)', 'SHB Finance (Sale)', 'Mirae Asset'].map(renderBtn).join('')}
        </div>
      </div>
      <div class="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 space-y-2">
        <h4 class="font-black text-amber-900 text-[11px] uppercase flex items-center gap-1"><span>💳</span> 3. Thẻ Tín Dụng</h4>
        <div class="grid grid-cols-2 gap-1.5">
          ${['Thẻ VPBank', 'Thẻ OCB', 'Thẻ VIB', 'Thẻ VietCredit (App)', 'Thẻ TPBank', 'Thẻ LeoBank', 'Thẻ HDBank'].map(renderBtn).join('')}
        </div>
      </div>
      <div class="bg-purple-50/70 p-2.5 rounded-xl border border-purple-200 space-y-2">
        <h4 class="font-black text-purple-900 text-[11px] uppercase flex items-center gap-1"><span>🛍️</span> 4. Ví Trả Sau</h4>
        <div class="grid grid-cols-2 gap-1.5">
          ${['Ví Trả Sau MoMo', 'TK Trả Sau ZaloPay', 'Paynow (Viettel)', 'SPayLater (Shopee)', 'Kredivo'].map(renderBtn).join('')}
        </div>
      </div>
    </div>
  `;
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

function openLoanMatchModal(leadId) {
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;
  currentMatchingLeadId = leadId;

  const age = lead.age ? lead.age : (typeof calcAge === 'function' ? calcAge(lead.dob) : 25);
  const carrier = lead.simCarrier ? lead.simCarrier : detectSimCarrier(lead.phone);
  const cicText = lead.cicStatus === 'SACH' ? '✅ Chuẩn nhóm 1 (Sạch)' : '⚠️ Có nợ chú ý/nợ xấu';

  const nameEl = document.getElementById('matchTargetLeadName');
  if (nameEl) nameEl.innerText = `Khách hàng: ${lead.name} (${age} tuổi) • SĐT: ${lead.phone}`;

  const sumEl = document.getElementById('matchLeadSummary');
  if (sumEl) {
    const formattedIncome = typeof formatVND === 'function' ? formatVND(lead.income) : (lead.income ? lead.income : 0);
    const formattedAmount = typeof formatVND === 'function' ? formatVND(lead.amount) : (lead.amount ? lead.amount : 0);
    const prevList = (lead.previousLenders && lead.previousLenders.length > 0) ? lead.previousLenders.join(', ') : 'Chưa từng (Khách mới)';
    const bankNameSafe = lead.bankName ? lead.bankName : 'Chưa rõ';
    
    sumEl.innerHTML = `
      <div><b>Thu nhập:</b> <span class="text-blue-700 font-bold">${formattedIncome}</span></div>
      <div><b>Cần vay:</b> <span class="text-emerald-700 font-bold">${formattedAmount}</span></div>
      <div><b>Mạng SIM:</b> 📶 ${carrier}</div>
      <div><b>CIC:</b> ${cicText}</div>
      <div><b>Ngân hàng:</b> ${bankNameSafe}</div>
      <div class="col-span-2 text-slate-600 truncate"><b>Đã/đang góp tại:</b> ${prevList}</div>
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
        const isAlreadyApplied = (lead.applications || []).some(a => a.lender === pkg.lender);
        const btnText = isAlreadyApplied ? '✓ Đã Nộp' : '+ Nộp Gói Này';
        const btnClass = isAlreadyApplied ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 hover:bg-blue-700 text-white shadow active:scale-95';
        const appliedStatusText = isAlreadyApplied ? '✓ Đã có trong danh sách nộp' : 'Chưa nộp đơn vị này';
        
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
              <span class="text-[10px] text-slate-500">${appliedStatusText}</span>
              <button type="button" onclick="applyMatchedPackage(${lead.id}, '${pkg.lender}')" class="${btnClass} font-extrabold text-[11px] px-3 py-1.5 rounded-xl transition">
                ${btnText}
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

function saveLeadForm(e) {
  e.preventDefault();
  const dob = document.getElementById('formDob').value;
  const docs = Array.from(document.querySelectorAll('.lead-doc-chk:checked')).map(el => el.value);
  const prevLenders = Array.from(document.querySelectorAll('.lead-prev-lender-chk:checked')).map(el => el.value);
  const apps = Array.from(document.querySelectorAll('.lead-app-chk:checked')).map(el => el.value);
  
  let initialLender = 'TPBank';
  const initEl = document.getElementById('formInitialLender');
  if (initEl) initialLender = initEl.value;
  
  const name = document.getElementById('formName').value;
  const phone = document.getElementById('formPhone').value;
  const autoCarrier = detectSimCarrier(phone);

  const parseNum = typeof parseNumeric === 'function' ? parseNumeric : (v) => parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
  
  let amountVal = 30000000;
  const amtEl = document.getElementById('formAmount');
  if (amtEl && parseNum(amtEl.value) > 0) amountVal = parseNum(amtEl.value);

  const d = {
    name: name,
    phone: phone,
    email: document.getElementById('formEmail') ? document.getElementById('formEmail').value : '',
    simCarrier: autoCarrier,
    dob: dob,
    age: typeof calcAge === 'function' ? calcAge(dob) : 25,
    cccd: document.getElementById('formCccd') ? document.getElementById('formCccd').value : '',
    oldCmnd: document.getElementById('formOldCmnd') ? document.getElementById('formOldCmnd').value : '',
    gender: document.getElementById('formGender') ? document.getElementById('formGender').value : 'Nam',
    permAddress: document.getElementById('formPermAddress') ? document.getElementById('formPermAddress').value : '',
    tempAddress: document.getElementById('formTempAddress') ? document.getElementById('formTempAddress').value : '',
    job: document.getElementById('formJob') ? document.getElementById('formJob').value : '',
    workAddress: document.getElementById('formWorkAddress') ? document.getElementById('formWorkAddress').value : '',
    workTime: document.getElementById('formWorkTime') ? document.getElementById('formWorkTime').value : '',
    income: document.getElementById('formIncome') ? parseNum(document.getElementById('formIncome').value) : 0,
    amount: amountVal,
    bankName: document.getElementById('formBankName') ? document.getElementById('formBankName').value : '',
    bankAccount: document.getElementById('formBankAccount') ? document.getElementById('formBankAccount').value : '',
    previousLenders: prevLenders,
    installedApps: apps,
    ref1Rel: document.getElementById('formRef1Rel') ? document.getElementById('formRef1Rel').value : '',
    ref1Name: document.getElementById('formRef1Name') ? document.getElementById('formRef1Name').value : '',
    ref1Phone: document.getElementById('formRef1Phone') ? document.getElementById('formRef1Phone').value : '',
    ref2Rel: document.getElementById('formRef2Rel') ? document.getElementById('formRef2Rel').value : '',
    ref2Name: document.getElementById('formRef2Name') ? document.getElementById('formRef2Name').value : '',
    ref2Phone: document.getElementById('formRef2Phone') ? document.getElementById('formRef2Phone').value : '',
    cicStatus: document.getElementById('formCicStatus') ? document.getElementById('formCicStatus').value : 'SACH',
    documents: docs,
    note: document.getElementById('formNote') ? document.getElementById('formNote').value : ''
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

function render() {
  const container = document.getElementById('leadsContainer');
  if (!container) return;

  const fmtVND = typeof formatVND === 'function' ? formatVND : (v) => { const num = v ? v : 0; return num.toLocaleString('vi-VN') + ' đ'; };

  const activeCount = leads.filter(l => !l.isCompleted).length;
  const archivedCount = leads.filter(l => l.isCompleted).length;
  if (document.getElementById('activeCountBadge')) document.getElementById('activeCountBadge').innerText = activeCount;
  if (document.getElementById('archivedCountBadge')) document.getElementById('archivedCountBadge').innerText = archivedCount;

  if (document.getElementById('statCic')) document.getElementById('statCic').innerText = leads.filter(l => l.cicStatus === 'SACH').length;
  if (document.getElementById('statApproved')) document.getElementById('statApproved').innerText = leads.filter(l => (l.applications || []).some(a => a.result === 'Duyệt')).length;
  if (document.getElementById('statDisbursed')) document.getElementById('statDisbursed').innerText = leads.filter(l => (l.applications || []).some(a => (a.contract && a.contract.code))).length;

  const filtered = leads.filter(l => {
    if (activeTab === 'active' && l.isCompleted) return false;
    if (activeTab === 'archived' && !l.isCompleted) return false;
    if (activeTab === 'match' && l.isCompleted) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const safeName = l.name ? l.name.toLowerCase() : '';
      const safePhone = l.phone ? l.phone : '';
      const safeCccd = l.cccd ? l.cccd : '';
      const m1 = safeName.includes(q) || safePhone.includes(q) || safeCccd.includes(q);
      const m2 = (l.applications || []).some(a => {
        const safeLender = a.lender ? a.lender.toLowerCase() : '';
        const safeCode = (a.contract && a.contract.code) ? a.contract.code.toLowerCase() : '';
        return safeLender.includes(q) || safeCode.includes(q);
      });
      const m3 = (l.previousLenders || []).some(pl => pl.toLowerCase().includes(q));
      if (!m1 && !m2 && !m3) return false;
    }

    if (currentFilterStatus !== 'ALL') {
      const st = currentFilterStatus;
      const m = (l.applications || []).some(a => st === 'Duyệt' ? a.result === 'Duyệt' : st === 'Từ chối' ? a.result === 'Từ chối' : (a.result === 'Đang thẩm định' || a.result === 'Bổ sung hồ sơ'));
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
    const actualCarrier = lead.simCarrier ? lead.simCarrier : detectSimCarrier(lead.phone);
    const carrierColor = actualCarrier === 'Vinaphone' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                         actualCarrier === 'Mobifone' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                         actualCarrier === 'Vietnamobile' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                         actualCarrier === 'Viettel' ? 'bg-red-50 text-red-700 border-red-200' :
                         'bg-slate-100 text-slate-700 border-slate-200';

    const safeName = escapeHtml(lead.name);
    const ageText = lead.age ? lead.age : 25;
    const phoneText = lead.phone ? lead.phone : '---';
    const cccdText = lead.cccd ? lead.cccd : 'Chưa có';

    if (activeTab === 'archived') {
      const isExpanded = expandedArchiveIds.has(lead.id);
      const approvedApp = (lead.applications || []).find(a => a.result === 'Duyệt' && a.contract);
      const isDisbursed = lead.completeReason === 'Đã giải ngân thành công' || !!approvedApp;

      let docsHtml = '';
      const docMap = typeof DOC_MAP !== 'undefined' ? DOC_MAP : {};
      (lead.documents || []).forEach(d => {
        const dLabel = docMap[d] ? docMap[d] : d;
        docsHtml += `<span class="inline-block bg-white text-slate-700 text-[10px] px-1.5 py-0.5 rounded border border-slate-200 ml-1">✓ ${dLabel}</span>`;
      });
      if (!docsHtml) docsHtml = '<span class="text-slate-400 italic text-[10px]"> Chưa có</span>';

      let appsHtml = '';
      (lead.applications || []).forEach((app, aIdx) => {
        const appLender = app.lender ? app.lender : '---';
        const appResult = app.result ? app.result : '---';
        const statusColor = appResult === 'Duyệt' ? 'bg-emerald-100 text-emerald-800' : appResult === 'Từ chối' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700';
        const receiptBtn = app.contract ? `<button type="button" onclick="openReceipt(${lead.id}, ${aIdx})" class="text-[10px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded active:scale-95 transition">🧾 Phiếu</button>` : '';

        appsHtml += `
          <div class="bg-white rounded-lg p-2 border border-slate-200 text-xs flex justify-between items-center">
            <span class="font-bold text-slate-800 truncate">🏛️ ${appLender}</span>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded ${statusColor}">${appResult}</span>
              ${receiptBtn}
            </div>
          </div>
        `;
      });

      const expandBtnText = isExpanded ? '▲ Thu gọn' : '▼ Chi tiết';
      const expandBtnClass = isExpanded ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700';
      const iconStatus = isDisbursed ? '🎉' : '📁';
      const compReason = lead.completeReason ? lead.completeReason : 'Hoàn tất';
      const safeCompReason = escapeHtml(compReason);
      const disburseColor = isDisbursed ? 'text-emerald-700' : 'text-indigo-950';
      
      let approvedAmountBadge = '';
      if (approvedApp && approvedApp.contract) {
        approvedAmountBadge = `<span class="text-emerald-800 font-black text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded">(${approvedApp.lender}: ${fmtVND(approvedApp.contract.approvedAmount)})</span>`;
      }
      const completedDateText = lead.completedDate ? lead.completedDate : '';

      let expandedHtml = '';
      if (isExpanded) {
        const amountVND = fmtVND(lead.amount);
        const cicText = lead.cicStatus === 'SACH' ? 'Nhóm 1 (Sạch)' : 'Nợ chú ý/xấu';
        const jobText = escapeHtml(lead.job) ? escapeHtml(lead.job) : 'Tự do';
        const incomeVND = fmtVND(lead.income);
        const workTimeText = escapeHtml(lead.workTime) ? escapeHtml(lead.workTime) : 'Chưa rõ TG';
        const workAddressHtml = lead.workAddress ? `<div class="text-[10px] text-slate-600">🏢 <b>Nơi làm:</b> ${escapeHtml(lead.workAddress)} (${workTimeText})</div>` : '';
        const permAddressText = escapeHtml(lead.permAddress) ? escapeHtml(lead.permAddress) : '---';
        const refNameText = escapeHtml(lead.ref1Name) ? escapeHtml(lead.ref1Name) : '---';
        const refPhoneText = lead.ref1Phone ? lead.ref1Phone : '---';
        const noteHtml = lead.note ? `<div class="text-[10px] text-slate-600 bg-amber-50 p-1.5 rounded border border-amber-200">📝 <b>Ghi chú:</b> ${escapeHtml(lead.note)}</div>` : '';

        expandedHtml = `
          <div class="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
            <div class="bg-slate-50 rounded-xl p-2.5 text-xs space-y-1.5 border border-slate-100">
              <div class="flex justify-between"><span>Khoản vay:</span> <span class="font-bold text-blue-700">${amountVND}</span></div>
              <div class="flex justify-between"><span>CIC:</span> <span class="font-bold">${cicText}</span></div>
              <div class="text-[11px]"><b>Nghề nghiệp:</b> ${jobText} • Thu nhập: ${incomeVND}</div>
              ${workAddressHtml}
              <div class="text-[10px] text-slate-500">🏠 <b>Thường trú:</b> ${permAddressText}</div>
              <div class="text-[10px] text-slate-500">👥 <b>Tham chiếu:</b> ${refNameText} (${refPhoneText})</div>
              <div><b>Chứng từ:</b> ${docsHtml}</div>
              ${noteHtml}
            </div>
            <div class="bg-slate-100/60 rounded-xl p-2 space-y-1.5 border border-slate-200">
              <span class="font-bold text-xs text-slate-800 block">🏛️ Tiến độ hồ sơ đã lưu:</span>
              <div class="space-y-1">${appsHtml}</div>
            </div>
            <div class="flex justify-between items-center pt-1 text-xs">
              <div class="flex gap-1.5">
                <a href="tel:${phoneText}" class="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">📞 Gọi</a>
                <a href="https://zalo.me/${phoneText}" target="_blank" class="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold">💬 Zalo</a>
              </div>
              <div class="flex gap-1">
                <button type="button" onclick="openEditModal(${lead.id})" class="text-slate-700 px-2 py-1 font-semibold hover:bg-slate-100 rounded">Sửa</button>
                <button type="button" onclick="deleteLead(${lead.id})" class="text-rose-600 px-2 py-1 font-semibold hover:bg-rose-50 rounded">Xóa</button>
              </div>
            </div>
          </div>
        `;
      }

      html += `
        <div class="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm space-y-2 transition-all">
          <div class="flex justify-between items-center">
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-slate-900 text-sm">${safeName}</span>
                <span class="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">${ageText} tuổi</span>
                <span class="text-[10px] ${carrierColor} px-1.5 py-0.5 rounded border font-semibold">📶 ${actualCarrier}</span>
              </div>
              <div class="text-xs text-slate-500 font-mono mt-0.5">${phoneText} • CCCD: ${cccdText}</div>
            </div>
            <div class="flex items-center gap-1">
              <button type="button" onclick="toggleLeadDetail(${lead.id})" class="text-[10px] ${expandBtnClass} hover:bg-slate-200 font-extrabold px-2.5 py-1 rounded-full transition active:scale-95 flex items-center gap-0.5">
                <span>${expandBtnText}</span>
              </button>
              <button type="button" onclick="toggleCompleteModal(${lead.id})" title="Mở lại hồ sơ đang xử lý" class="bg-slate-800 hover:bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-full font-bold shadow-sm transition active:scale-95">
                ↺ Mở lại
              </button>
            </div>
          </div>
          <div class="bg-indigo-50/60 border border-indigo-100 rounded-xl p-2 flex justify-between items-center text-[11px]">
            <div class="truncate flex items-center gap-1">
              <span class="font-bold ${disburseColor}">
                ${iconStatus} ${safeCompReason}
              </span>
              ${approvedAmountBadge}
            </div>
            <span class="text-[10px] text-slate-500 shrink-0 ml-1 font-medium">${completedDateText}</span>
          </div>
          ${expandedHtml}
        </div>
      `;
      return;
    }

    // Logic tab "active" & "match"
    let docsHtml = '';
    const docMap = typeof DOC_MAP !== 'undefined' ? DOC_MAP : {};
    (lead.documents || []).forEach(d => {
      const dLabel = docMap[d] ? docMap[d] : d;
      docsHtml += `<span class="inline-block bg-white text-slate-700 text-[10px] px-1.5 py-0.5 rounded border border-slate-200 ml-1">✓ ${dLabel}</span>`;
    });
    if (!docsHtml) docsHtml = '<span class="text-slate-400 italic text-[10px]"> Chưa có</span>';

    let prevLendersHtml = '';
    (lead.previousLenders || []).forEach(pl => {
      prevLendersHtml += `<span class="inline-block bg-emerald-50 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded border border-emerald-200 font-semibold ml-1">🏛️ ${pl}</span>`;
    });
    if (!prevLendersHtml) prevLendersHtml = '<span class="text-slate-400 italic text-[10px]"> Chưa có (Khách mới)</span>';

    let appsHtml = '';
    (lead.applications || []).forEach((app, aIdx) => {
      const appLender = app.lender ? app.lender : '---';
      const appResult = app.result ? app.result : '---';
      let extraHtml = '';

      if (appResult === 'Từ chối') {
        const rejectText = escapeHtml(app.rejectReason ? app.rejectReason : '');
        extraHtml = `
          <div class="text-rose-700 bg-rose-50 p-1.5 rounded text-[10px] space-y-1 border border-rose-200 mt-1">
            <div class="font-bold">⛔ Đã kết thúc tại ${appLender}</div>
            <input type="text" value="${rejectText}" oninput="updateRejectReason(${lead.id}, ${aIdx}, this.value)" placeholder="Nhập lý do từ chối..." class="w-full bg-white border border-rose-200 rounded px-1.5 py-0.5 text-[10px]">
          </div>
        `;
      } else if (appResult === 'Duyệt') {
        let contractDetails = '';
        const contractBtnText = app.contract ? 'Sửa HĐ' : '+ Nhập HĐ';
        if (app.contract) {
          const codeText = escapeHtml(app.contract.code ? app.contract.code : '');
          const approvedVND = fmtVND(app.contract.approvedAmount);
          const tenorText = app.contract.tenor ? app.contract.tenor : 12;
          const monthlyVND = fmtVND(app.contract.monthlyPay);
          
          contractDetails = `
            <div class="grid grid-cols-2 gap-1 text-slate-700 pt-1 border-t border-emerald-200">
              <div>Số HĐ: <b class="font-mono text-emerald-800">${codeText}</b></div>
              <div>Duyệt: <b class="text-emerald-800">${approvedVND}</b></div>
              <div class="col-span-2 flex justify-between items-center pt-1">
                <span>Kỳ: ${tenorText} tháng • Góp: ${monthlyVND}/tháng</span>
                <button type="button" onclick="openReceipt(${lead.id}, ${aIdx})" class="bg-teal-600 text-white px-2.5 py-1 rounded-lg font-bold shadow hover:bg-teal-700 active:scale-95 transition">🧾 Xuất Phiếu</button>
              </div>
            </div>
          `;
        }
        extraHtml = `
          <div class="bg-emerald-50 border border-emerald-300 p-2 rounded text-[10px] space-y-1 mt-1">
            <div class="flex justify-between items-center font-bold text-emerald-900">
              <span>🎉 Đã duyệt khoản vay</span>
              <button type="button" onclick="openContractModal(${lead.id}, ${aIdx})" class="bg-emerald-700 text-white px-2 py-0.5 rounded shadow hover:bg-emerald-800 active:scale-95 transition">${contractBtnText}</button>
            </div>
            ${contractDetails}
          </div>
        `;
      }

      appsHtml += `
        <div class="bg-white rounded-lg p-2 border border-indigo-200/70 text-xs space-y-1.5 shadow-sm">
          <div class="grid grid-cols-12 gap-1 items-center">
            <div class="col-span-5 font-bold text-slate-800 truncate">🏢 ${appLender}</div>
            <div class="col-span-7 flex justify-end gap-1">
              <select onchange="handleAppChange(${lead.id}, ${aIdx}, this.value)" class="font-bold text-[11px] rounded-lg px-2 py-1 border bg-slate-50">
                <option value="Đang thẩm định" ${appResult === 'Đang thẩm định' ? 'selected' : ''}>⏳ Đang xử lý</option>
                <option value="Bổ sung hồ sơ" ${appResult === 'Bổ sung hồ sơ' ? 'selected' : ''}>📄 Bổ sung</option>
                <option value="Duyệt" ${appResult === 'Duyệt' ? 'selected' : ''}>✅ Duyệt</option>
                <option value="Từ chối" ${appResult === 'Từ chối' ? 'selected' : ''}>⛔ Từ chối</option>
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
      const emptyMatchText = '<span class="text-slate-500 text-[10px]">Chưa tìm thấy gói hoàn toàn khớp</span>';
      
      matchSummaryHtml = `
        <div class="bg-amber-50/70 border border-amber-300 rounded-xl p-2 space-y-1">
          <div class="flex justify-between items-center text-[10px] font-black text-amber-950">
            <span>🎯 ${matchedPkgs.length} GÓI VAY ĐẠT CHUẨN:</span>
            <button type="button" onclick="openLoanMatchModal(${lead.id})" class="text-blue-700 underline font-extrabold">Xem tất cả ➔</button>
          </div>
          <div class="flex flex-wrap gap-1">${pkgPills ? pkgPills : emptyMatchText}</div>
        </div>
      `;
    }

    const borderClass = activeTab === 'match' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200';
    const amountVND = fmtVND(lead.amount);
    const cicText = lead.cicStatus === 'SACH' ? 'Nhóm 1 (Sạch)' : 'Nợ chú ý/xấu';
    const jobText = escapeHtml(lead.job) ? escapeHtml(lead.job) : 'Tự do';
    const incomeVND = fmtVND(lead.income);
    const workTimeText = escapeHtml(lead.workTime) ? escapeHtml(lead.workTime) : 'Chưa rõ TG';
    const workAddressHtml = lead.workAddress ? `<div class="text-[10px] text-slate-600">🏢 <b>Đ/c làm việc:</b> ${escapeHtml(lead.workAddress)} (${workTimeText})</div>` : '';
    const noteHtml = lead.note ? `<div class="text-[10px] text-slate-600 bg-amber-50 p-1.5 rounded border border-amber-200">📝 <b>Ghi chú:</b> ${escapeHtml(lead.note)}</div>` : '';

    html += `
      <div class="bg-white rounded-2xl p-3.5 border ${borderClass} shadow-sm space-y-3">
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-slate-900 text-sm">${safeName}</span>
              <span class="text-[11px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-bold">${ageText} tuổi</span>
              <span class="text-[10px] ${carrierColor} px-1.5 py-0.5 rounded border font-semibold">📶 ${actualCarrier}</span>
            </div>
            <div class="text-xs text-slate-500 font-mono mt-0.5">${phoneText} • CCCD: ${cccdText}</div>
          </div>
          <div class="flex gap-1">
            <button type="button" onclick="openLoanMatchModal(${lead.id})" class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] px-2.5 py-1 rounded-full font-extrabold shadow-sm active:scale-95 transition">
              🎯 Lọc
            </button>
            <button type="button" onclick="toggleCompleteModal(${lead.id})" class="bg-slate-800 hover:bg-slate-900 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-sm transition active:scale-95">
              ✓ Xong
            </button>
          </div>
        </div>

        ${matchSummaryHtml}

        <div class="bg-slate-50 rounded-xl p-2.5 text-xs space-y-1.5 border border-slate-100">
          <div class="flex justify-between"><span>Cần vay:</span> <span class="font-bold text-blue-700">${amountVND}</span></div>
          <div class="flex justify-between"><span>CIC:</span> <span class="font-bold">${cicText}</span></div>
          <div class="text-[11px]"><b>Nghề nghiệp:</b> ${jobText} • Thu nhập: ${incomeVND}</div>
          ${workAddressHtml}
          <div class="text-[10px] text-slate-600 bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-100"><b>🔍 Đang/Từng vay ở Cty:</b> ${prevLendersHtml}</div>
          <div><b>Chứng từ:</b> ${docsHtml}</div>
          ${noteHtml}
        </div>

        <div class="bg-indigo-50/50 rounded-xl p-2.5 border border-indigo-100 space-y-2">
          <div class="flex justify-between items-center">
            <span class="font-bold text-xs text-indigo-950">🏛️ Tiến độ hồ sơ:</span>
            <button type="button" onclick="addAppPrompt(${lead.id})" class="text-[11px] bg-indigo-600 text-white font-bold px-2.5 py-1 rounded-lg shadow active:scale-95 transition flex items-center gap-1">
              <span>+ Nộp Cty</span>
            </button>
          </div>
          <div class="space-y-1.5">${appsHtml}</div>
        </div>

        <div class="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
          <div class="flex gap-1.5">
            <a href="tel:${phoneText}" class="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">📞 Gọi</a>
            <a href="https://zalo.me/${phoneText}" target="_blank" class="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold">💬 Zalo</a>
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
  const t = document.getElementById('leadModalTitle');
  if (t) t.innerText = 'Thêm Khách Hàng Mới';
  const f = document.getElementById('leadForm');
  if (f) f.reset();
  const dob = document.getElementById('formDob');
  if (dob) dob.value = '1998-05-15';
  
  updateCarrierBadge('Khác');
  renderDocCheckboxes();
  renderPrevLendersCheckboxes();
  const m = document.getElementById('leadModal');
  if (m) m.classList.remove('hidden');
}

function openEditModal(id) {
  const l = leads.find(x => x.id === id);
  if (!l) return;
  editingLeadId = id;
  const t = document.getElementById('leadModalTitle');
  if (t) t.innerText = 'Cập Nhật Hồ Sơ';
  
  if (document.getElementById('formName')) document.getElementById('formName').value = l.name ? l.name : '';
  if (document.getElementById('formPhone')) document.getElementById('formPhone').value = l.phone ? l.phone : '';
  if (document.getElementById('formEmail')) document.getElementById('formEmail').value = l.email ? l.email : '';
  if (document.getElementById('formDob')) document.getElementById('formDob').value = l.dob ? l.dob : '1998-05-15';
  if (document.getElementById('formCccd')) document.getElementById('formCccd').value = l.cccd ? l.cccd : '';
  if (document.getElementById('formOldCmnd')) document.getElementById('formOldCmnd').value = l.oldCmnd ? l.oldCmnd : '';
  if (document.getElementById('formGender')) document.getElementById('formGender').value = l.gender ? l.gender : 'Nam';
  if (document.getElementById('formPermAddress')) document.getElementById('formPermAddress').value = l.permAddress ? l.permAddress : '';
  if (document.getElementById('formTempAddress')) document.getElementById('formTempAddress').value = l.tempAddress ? l.tempAddress : '';
  if (document.getElementById('formJob')) document.getElementById('formJob').value = l.job ? l.job : '';
  if (document.getElementById('formWorkAddress')) document.getElementById('formWorkAddress').value = l.workAddress ? l.workAddress : '';
  if (document.getElementById('formWorkTime')) document.getElementById('formWorkTime').value = l.workTime ? l.workTime : '';
  if (document.getElementById('formIncome')) document.getElementById('formIncome').value = l.income ? l.income : '';
  if (document.getElementById('formAmount')) document.getElementById('formAmount').value = l.amount ? l.amount : '';
  if (document.getElementById('formBankName')) document.getElementById('formBankName').value = l.bankName ? l.bankName : '';
  if (document.getElementById('formBankAccount')) document.getElementById('formBankAccount').value = l.bankAccount ? l.bankAccount : '';
  if (document.getElementById('formRef1Rel')) document.getElementById('formRef1Rel').value = l.ref1Rel ? l.ref1Rel : '';
  if (document.getElementById('formRef1Name')) document.getElementById('formRef1Name').value = l.ref1Name ? l.ref1Name : '';
  if (document.getElementById('formRef1Phone')) document.getElementById('formRef1Phone').value = l.ref1Phone ? l.ref1Phone : '';
  if (document.getElementById('formRef2Rel')) document.getElementById('formRef2Rel').value = l.ref2Rel ? l.ref2Rel : '';
  if (document.getElementById('formRef2Name')) document.getElementById('formRef2Name').value = l.ref2Name ? l.ref2Name : '';
  if (document.getElementById('formRef2Phone')) document.getElementById('formRef2Phone').value = l.ref2Phone ? l.ref2Phone : '';
  if (document.getElementById('formCicStatus')) document.getElementById('formCicStatus').value = l.cicStatus ? l.cicStatus : 'SACH';
  if (document.getElementById('formNote')) document.getElementById('formNote').value = l.note ? l.note : '';
  
  const sim = l.simCarrier ? l.simCarrier : detectSimCarrier(l.phone);
  updateCarrierBadge(sim);
  
  renderDocCheckboxes(l.documents ? l.documents : []);
  renderPrevLendersCheckboxes(l.previousLenders ? l.previousLenders : []);
  
  const userApps = l.installedApps ? l.installedApps : [];
  document.querySelectorAll('.lead-app-chk').forEach(el => {
    el.checked = userApps.includes(el.value);
  });

  const m = document.getElementById('leadModal');
  if (m) m.classList.remove('hidden');
}

function closeLeadModal() { 
  const m = document.getElementById('leadModal');
  if (m) m.classList.add('hidden'); 
}

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

function toggleContractFields() {
  const typeEl = document.getElementById('contractType');
  if (!typeEl) return;
  const type = typeEl.value;
  if (type === 'THE_TD' || type === 'VI_TRA_SAU') {
    const loanF = document.getElementById('loanFields');
    if (loanF) loanF.classList.add('hidden');
    const cardF = document.getElementById('cardFields');
    if (cardF) cardF.classList.remove('hidden');
    const amt = document.getElementById('lblAmount');
    if (amt) amt.innerText = 'Hạn mức thẻ / Ví khả dụng';
    const lblD = document.getElementById('lblDate');
    if (lblD) lblD.innerText = 'Ngày kích hoạt thẻ/ví';
  } else {
    const loanF = document.getElementById('loanFields');
    if (loanF) loanF.classList.remove('hidden');
    const cardF = document.getElementById('cardFields');
    if (cardF) cardF.classList.add('hidden');
    const amt = document.getElementById('lblAmount');
    if (amt) amt.innerText = 'Số tiền duyệt';
    const lblD = document.getElementById('lblDate');
    if (lblD) lblD.innerText = 'Ngày giải ngân (Bắt đầu tính lãi)';
  }
}

function openContractModal(leadId, aIdx) {
  contractLeadId = leadId;
  contractAppIdx = aIdx;
  const l = leads.find(x => x.id === leadId);
  const app = l.applications[aIdx];
  const c = app.contract;
  
  const defaultAmount = c ? c.approvedAmount : (l.amount ? l.amount : 30000000);
  const defaultMonthly = c ? (c.monthlyPay ? c.monthlyPay : 0) : Math.round((l.amount ? l.amount : 30000000) * 1.15 / 12);

  if (document.getElementById('contractType')) document.getElementById('contractType').value = c ? (c.type ? c.type : 'VAY') : 'VAY';
  if (document.getElementById('contractPlatform')) document.getElementById('contractPlatform').value = c ? (c.platform ? c.platform : 'TRUC_TIEP') : 'TRUC_TIEP';
  
  if (document.getElementById('contractCode')) document.getElementById('contractCode').value = c ? c.code : ('HĐ-' + Date.now().toString().slice(-5));
  if (document.getElementById('contractAmount')) document.getElementById('contractAmount').value = new Intl.NumberFormat('vi-VN').format(defaultAmount);
  
  if (document.getElementById('contractTenor')) document.getElementById('contractTenor').value = c ? (c.tenor ? c.tenor : 12) : 12;
  if (document.getElementById('contractMonthly')) document.getElementById('contractMonthly').value = new Intl.NumberFormat('vi-VN').format(defaultMonthly);
  
  if (document.getElementById('contractStatementDate')) document.getElementById('contractStatementDate').value = c ? (c.statementDate ? c.statementDate : '') : '';
  if (document.getElementById('contractPaymentDueDate')) document.getElementById('contractPaymentDueDate').value = c ? (c.paymentDueDate ? c.paymentDueDate : '') : '';
  
  if (document.getElementById('contractDate')) document.getElementById('contractDate').value = c ? c.disburseDate : new Date().toISOString().substring(0, 10);
  
  toggleContractFields();
  const m = document.getElementById('contractModal');
  if (m) m.classList.remove('hidden');
}

function closeContractModal() { 
  const m = document.getElementById('contractModal');
  if (m) m.classList.add('hidden'); 
}

function saveContractForm(e) {
  e.preventDefault();
  const l = leads.find(x => x.id === contractLeadId);
  if (!l) return;

  const parseNumSmart = (v) => {
    let n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
    if (!n) n = 0;
    if (n > 0 && n < 100000) n = n * 1000;
    return n;
  };

  l.applications[contractAppIdx].contract = {
    type: document.getElementById('contractType') ? document.getElementById('contractType').value : 'VAY',
    platform: document.getElementById('contractPlatform') ? document.getElementById('contractPlatform').value : 'TRUC_TIEP',
    code: document.getElementById('contractCode') ? document.getElementById('contractCode').value : '',
    approvedAmount: parseNumSmart(document.getElementById('contractAmount') ? document.getElementById('contractAmount').value : 0),
    tenor: Number(document.getElementById('contractTenor') ? document.getElementById('contractTenor').value : 12),
    monthlyPay: parseNumSmart(document.getElementById('contractMonthly') ? document.getElementById('contractMonthly').value : 0),
    statementDate: document.getElementById('contractStatementDate') ? document.getElementById('contractStatementDate').value : '',
    paymentDueDate: document.getElementById('contractPaymentDueDate') ? document.getElementById('contractPaymentDueDate').value : '',
    disburseDate: document.getElementById('contractDate') ? document.getElementById('contractDate').value : new Date().toISOString().substring(0, 10)
  };
  
  showToast('Đã lưu hợp đồng');
  closeContractModal();
  saveStorage();
  if (typeof sendTelegramNotification === 'function') sendTelegramNotification('Duyệt & Lưu Hợp Đồng', l.name);
  
  setTimeout(() => {
    openReceipt(contractLeadId, contractAppIdx);
  }, 200);
}

function openReceipt(leadId, aIdx) {
  const l = leads.find(x => x.id === leadId);
  if (!l || !l.applications || !l.applications[aIdx]) return;
  const app = l.applications[aIdx];
  receiptLeadId = leadId;
  receiptAppIdx = aIdx;

  const fmtVND = typeof formatVND === 'function' ? formatVND : (v) => { const num = v ? v : 0; return num.toLocaleString('vi-VN') + ' đ'; };
  const c = app.contract ? app.contract : {};
  
  if (document.getElementById('receiptLenderTitle')) document.getElementById('receiptLenderTitle').innerText = app.lender;
  if (document.getElementById('receiptName')) document.getElementById('receiptName').innerText = l.name;
  if (document.getElementById('receiptPhone')) document.getElementById('receiptPhone').innerText = l.phone;
  if (document.getElementById('receiptCode')) document.getElementById('receiptCode').innerText = c.code ? c.code : '---';

  const platforms = {
    TRUC_TIEP: 'TRỰC TIẾP APP/SALE', ZALO: 'ZALO', MOMO: 'VÍ MOMO', ZALOPAY: 'VÍ ZALOPAY',
    VIETTEL_MONEY: 'VIETTEL MONEY', QUA_TANG_VIP: 'APP QUÀ TẶNG VIP', KHAC: 'ỨNG DỤNG KHÁC'
  };
  if (document.getElementById('receiptPlatformBadge')) document.getElementById('receiptPlatformBadge').innerText = platforms[c.platform] ? platforms[c.platform] : 'TRỰC TIẾP';

  let typeGuideText = '';
  let platformGuideText = '';

  switch (c.platform) {
    case 'ZALO': platformGuideText = 'Mở ứng dụng Zalo > Mục Khám phá > Chọn Mini App tương ứng (VD: VietCredit, Tnex) hoặc tìm trong phần Dịch vụ Tài Chính.'; break;
    case 'MOMO': platformGuideText = 'Mở ứng dụng MoMo > Vào mục "Thanh toán khoản vay" hoặc "Ví trả sau" > Nhập mã số hoặc CCCD để thanh toán.'; break;
    case 'ZALOPAY': platformGuideText = 'Mở ứng dụng ZaloPay > Tài khoản trả sau / Thanh toán khoản vay.'; break;
    case 'VIETTEL_MONEY': platformGuideText = 'Mở ứng dụng Viettel Money > Mục Tài chính, Bảo hiểm > Thanh toán khoản vay.'; break;
    case 'QUA_TANG_VIP': platformGuideText = 'Mở app Quà Tặng VIP > Mục Tiện ích / Trả góp để kiểm tra dư nợ và thanh toán.'; break;
    default: platformGuideText = 'Thanh toán qua ứng dụng chính thức của nhà cung cấp hoặc chuyển khoản trực tiếp vào số tài khoản Hợp đồng/Thẻ.'; break;
  }

  if (c.type === 'THE_TD' || c.type === 'VI_TRA_SAU') {
    if (document.getElementById('receiptTypeBadge')) document.getElementById('receiptTypeBadge').innerText = c.type === 'THE_TD' ? 'THẺ TÍN DỤNG' : 'VÍ TRẢ SAU';
    if (document.getElementById('viewLoanInfo')) document.getElementById('viewLoanInfo').classList.add('hidden');
    if (document.getElementById('viewCardInfo')) document.getElementById('viewCardInfo').classList.remove('hidden');
    
    if (document.getElementById('receiptLimit')) document.getElementById('receiptLimit').innerText = fmtVND(c.approvedAmount);
    if (document.getElementById('receiptStatementDate')) document.getElementById('receiptStatementDate').innerText = c.statementDate ? `Ngày ${c.statementDate} hàng tháng` : 'Chưa rõ';
    if (document.getElementById('receiptDueDate')) document.getElementById('receiptDueDate').innerText = c.paymentDueDate ? `Ngày ${c.paymentDueDate} hàng tháng` : 'Chưa rõ';

    if (c.type === 'THE_TD') {
      typeGuideText = '⚠️ <b>RỦI RO THANH TOÁN THẺ TÍN DỤNG:</b>\n1. Để được <b>MIỄN LÃI hoàn toàn</b>, bạn bắt buộc phải thanh toán TOÀN BỘ "Tổng dư nợ kỳ trước" vào trước hoặc đúng Ngày Hạn Thanh Toán.\n2. Nếu bạn chỉ thanh toán số tiền <b>TỐI THIỂU</b> (thường 5% dư nợ), bạn sẽ không bị nợ xấu, NHƯNG toàn bộ giao dịch trong kỳ sẽ bị tính <b>lãi suất dư nợ (khoảng 3-4%/tháng)</b>.\n3. Nếu đóng trễ hạn thanh toán dù chỉ 1 ngày, bạn sẽ bị phạt phí trễ hạn (tối thiểu 4-5% số tiền chậm trả) và có nguy cơ bị ghi nhận NỢ XẤU CIC.';
    } else {
      typeGuideText = '⚠️ <b>LƯU Ý VÍ TRẢ SAU:</b> Vui lòng thanh toán toàn bộ dư nợ đã tiêu dùng trước hạn để tránh bị phạt phí trễ hạn khá cao và bị khóa ví. Hầu hết ví trả sau không hỗ trợ thanh toán tối thiểu kéo dài như thẻ tín dụng.';
    }

  } else {
    if (document.getElementById('receiptTypeBadge')) document.getElementById('receiptTypeBadge').innerText = 'VAY TRẢ GÓP';
    if (document.getElementById('viewLoanInfo')) document.getElementById('viewLoanInfo').classList.remove('hidden');
    if (document.getElementById('viewCardInfo')) document.getElementById('viewCardInfo').classList.add('hidden');
    
    if (document.getElementById('receiptMonthlyPay')) document.getElementById('receiptMonthlyPay').innerText = fmtVND(c.monthlyPay);
    if (document.getElementById('receiptLoanAmount')) document.getElementById('receiptLoanAmount').innerText = fmtVND(c.approvedAmount);
    if (document.getElementById('receiptTenor')) document.getElementById('receiptTenor').innerText = c.tenor ? c.tenor : 12;
    
    const dates = (typeof calcPayDates === 'function') ? calcPayDates(c.disburseDate, c.tenor) : { first: '---', last: '---' };
    if (document.getElementById('receiptFirstDate')) document.getElementById('receiptFirstDate').innerText = dates.first;
    if (document.getElementById('receiptLastDate')) document.getElementById('receiptLastDate').innerText = dates.last;
    
    typeGuideText = '💡 <b>LƯU Ý:</b> Bạn vui lòng thanh toán khoản vay hàng tháng TRƯỚC HẠN 1-2 NGÀY để phòng ngừa rủi ro kẹt mạng đường truyền, ngân hàng treo lệnh dẫn đến trễ hạn phát sinh phí phạt/nợ xấu oan uổng.';
  }

  if (document.getElementById('receiptGuideText')) document.getElementById('receiptGuideText').innerHTML = `<b>🔗 Kênh Thanh Toán:</b> ${platformGuideText}<br><br>${typeGuideText}`;
  const m = document.getElementById('receiptModal');
  if (m) m.classList.remove('hidden');
}

function closeReceiptModal() { 
  const m = document.getElementById('receiptModal');
  if (m) m.classList.add('hidden'); 
}

function copyPaymentMsg() {
  const l = leads.find(x => x.id === receiptLeadId);
  const app = l.applications[receiptAppIdx];
  const c = app.contract ? app.contract : {};
  const fmtVND = typeof formatVND === 'function' ? formatVND : (v) => { const num = v ? v : 0; return num.toLocaleString('vi-VN') + ' đ'; };

  const typeName = c.type === 'THE_TD' ? 'Thẻ Tín Dụng' : c.type === 'VI_TRA_SAU' ? 'Ví Trả Sau' : 'Vay Trả Góp';
  const codeText = c.code ? c.code : '---';

  let msg = `📢 THÔNG BÁO TÌNH TRẠNG SẢN PHẨM TÀI CHÍNH\n---------------------------------------\nKính gửi: ${l.name} (${l.phone})\nSản phẩm: ${app.lender} (${typeName})\nMã số HĐ/Thẻ: ${codeText}\n\n`;

  if (c.type === 'THE_TD' || c.type === 'VI_TRA_SAU') {
    const stDateText = c.statementDate ? c.statementDate : '--';
    const ddText = c.paymentDueDate ? c.paymentDueDate : '--';
    msg += `💳 Hạn mức cấp: ${fmtVND(c.approvedAmount)}\n📄 Ngày chốt sao kê: Ngày ${stDateText} hàng tháng\n⏰ Hạn thanh toán: Ngày ${ddText} hàng tháng\n\n⚠️ LƯU Ý QUAN TRỌNG: Hãy thanh toán TOÀN BỘ Tổng dư nợ đúng hạn để được miễn lãi 100%. Nếu chỉ thanh toán TỐI THIỂU, bạn sẽ bị tính lãi suất dư nợ. Đóng trễ sẽ bị phạt và nợ xấu.`;
  } else {
    const tText = c.tenor ? c.tenor : 12;
    const dates = (typeof calcPayDates === 'function') ? calcPayDates(c.disburseDate, c.tenor) : { first: '---', last: '---' };
    msg += `💰 Tiền góp định kỳ: ${fmtVND(c.monthlyPay)}/tháng\n(Kỳ hạn: ${tText} tháng)\n📅 Ngày đóng kỳ 1: ${dates.first}\n🏁 Ngày đóng kỳ cuối: ${dates.last}\n\n💡 LƯU Ý: Vui lòng đóng trước hạn 1-2 ngày để tránh kẹt mạng dẫn đến nợ xấu.`;
  }
  
  navigator.clipboard.writeText(msg).then(() => showToast('Đã copy kịch bản gửi Zalo!')).catch(() => showToast('Lỗi copy'));
}

function toggleCompleteModal(leadId) {
  const l = leads.find(x => x.id === leadId);
  if (!l) return;
  if (l.isCompleted) {
    l.isCompleted = false;
    showToast('Đã mở lại hồ sơ đang xử lý');
    saveStorage();
  } else {
    targetCompleteId = leadId;
    const m = document.getElementById('completeModal');
    if (m) m.classList.remove('hidden');
  }
}

function closeCompleteModal() { 
  const m = document.getElementById('completeModal');
  if (m) m.classList.add('hidden'); 
}

function saveCompleteLead() {
  const l = leads.find(x => x.id === targetCompleteId);
  if (!l) return;

  const reason = document.getElementById('completeReason') ? document.getElementById('completeReason').value : 'Hoàn tất';
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
  const modal = document.getElementById('backupModal');
  if (!modal) return;
  try {
    const auto = localStorage.getItem('loan_crm_autotg') === 'true';
    const chk = document.getElementById('autoNotifyTg');
    if (chk) chk.checked = auto;
    const cfg = typeof getTelegramConfig === 'function' ? getTelegramConfig() : { token: '', chatId: '' };
    const tokInput = document.getElementById('cfgTgToken');
    const chatInput = document.getElementById('cfgTgChatId');
    if (tokInput) tokInput.value = cfg.token ? cfg.token : '';
    if (chatInput) chatInput.value = cfg.chatId ? cfg.chatId : '';
    
    if (typeof updateTgStatusBadge === 'function') {
      updateTgStatusBadge();
    }
  } catch (e) {
    console.warn('Lỗi chuẩn bị modal backup:', e);
  }
  
  modal.classList.remove('hidden');
}

function closeBackupModal() { 
  const modal = document.getElementById('backupModal');
  if (modal) modal.classList.add('hidden'); 
}

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

async function importJsonFromClipboard() {
  try {
    let text = '';
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        text = await navigator.clipboard.readText();
      } catch (clipErr) {
        console.warn('Clipboard read error:', clipErr);
      }
    }
    if (!text) {
      text = prompt('Dán chuỗi mã JSON khách hàng vào ô bên dưới:');
    }
    if (!text || !text.trim()) {
      showToast('Chưa có nội dung sao chép!');
      return;
    }

    const cleanRaw = cleanJsonString(text);
    const parsed = JSON.parse(cleanRaw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      leads = parsed;
      saveStorage();
      closeBackupModal();
      alert(`✅ NẠP THÀNH CÔNG!\n\nĐã nhập đầy đủ ${leads.length} khách hàng vào hệ thống.`);
      showToast(`✓ Đã nạp thành công ${leads.length} hồ sơ!`);
    } else {
      alert('❌ Dữ liệu sao chép không phải là danh sách khách hàng JSON hợp lệ!');
    }
  } catch (err) {
    console.error('Lỗi dán JSON:', err);
    alert('❌ Không thể phân tích mã JSON. Hãy kiểm tra lại bạn đã sao chép trọn vẹn tệp hay chưa nhé!');
  }
}

function restoreFromFile(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (evt) => {
    try {
      const raw = cleanJsonString(evt.target.result);
      const p = JSON.parse(raw);
      if (Array.isArray(p)) { 
        leads = p; 
        saveStorage();
        closeBackupModal(); 
        alert(`✅ NẠP THÀNH CÔNG!\n\nĐã khôi phục ${leads.length} hồ sơ từ tệp của bạn.`);
        showToast('Khôi phục từ tệp thành công!'); 
      } else {
        alert('❌ Tệp không đúng định dạng danh sách mảng JSON [...]');
      }
    } catch (err) { 
      console.error('Lỗi đọc tệp JSON:', err);
      alert('❌ Tệp bạn chọn không chứa mã JSON hợp lệ hoặc bị lỗi cú pháp!');
      showToast('Tệp không hợp lệ'); 
    } finally {
      e.target.value = '';
    }
  };
  r.readAsText(f, 'UTF-8');
}

// Khởi chạy render ngay khi nạp script
render();
loadLeadsFromCloud();
