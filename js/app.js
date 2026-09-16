// js/app.js - Đã liên kết tự động: Giải ngân thành công -> Hợp đồng -> Xuất phiếu
let leads = JSON.parse(localStorage.getItem('loan_crm_v22') || '[]');
if (leads.length === 0 && typeof DEFAULT_SAMPLE_LEADS !== 'undefined') {
leads = DEFAULT_SAMPLE_LEADS;
}
let activeTab = 'active';
let currentFilterStatus = 'ALL';
let searchQuery = '';
let html5QrScanner = null;
let currentZoom = 1;
let editingLeadId = null;
let targetCompleteId = null;
let receiptLeadId = null;
let receiptAppIdx = null;
let contractLeadId = null;
let contractAppIdx = null;
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
function renderDocCheckboxes(selectedDocs = []) {
const c = document.getElementById('formDocsContainer');
if (!c) return;
c.innerHTML = '';
for (const [k, lbl] of Object.entries(DOC_MAP)) {
const checked = selectedDocs.includes(k) ? 'checked' : '';
c.innerHTML += ⁠<label class="flex items-center gap-1"><input type="checkbox" value="${k}" ${checked} class="lead-doc-chk"> ${lbl}</label>⁠;
}
}
function renderPrevLendersCheckboxes(selectedLenders = []) {
const c = document.getElementById('formPrevLendersContainer');
if (!c) return;
c.innerHTML = '';
ALL_PARTNERS.forEach(lender => {
const checked = selectedLenders.includes(lender) ? 'checked' : '';
c.innerHTML += ⁠<label class="flex items-center gap-1"><input type="checkbox" value="${lender}" ${checked} class="lead-prev-lender-chk"> ${lender}</label>⁠;
});
}
function switchTab(tab) {
activeTab = tab;
document.getElementById('tabActiveBtn').className = tab === 'active' ? 'flex-1 py-1.5 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all bg-white text-blue-800 shadow-md' : 'flex-1 py-1.5 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all text-blue-200 hover:text-white';
document.getElementById('tabActiveBtn').querySelector('span:last-child').className = tab === 'active' ? 'bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-extrabold' : 'bg-blue-800/80 text-blue-200 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold';
document.getElementById('tabArchivedBtn').className = tab === 'archived' ? 'flex-1 py-1.5 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all bg-white text-indigo-900 shadow-md' : 'flex-1 py-1.5 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all text-blue-200 hover:text-white';
document.getElementById('tabArchivedBtn').querySelector('span:last-child').className = tab === 'archived' ? 'bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-extrabold' : 'bg-blue-800/80 text-blue-200 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold';
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
if (searchQuery) clearBtn.classList.remove('hidden');
else clearBtn.classList.add('hidden');
render();
}
function clearSearch() {
document.getElementById('searchInput').value = '';
searchQuery = '';
document.getElementById('clearSearchBtn').classList.add('hidden');
render();
}
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
if (document.getElementById('statFiltered')) document.getElementById('statFiltered').innerText = ⁠${filtered.length}/${leads.length}⁠;
if (filtered.length === 0) {
container.innerHTML = ⁠<div class="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 mt-4 space-y-2"> <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">🔎</div> <p class="font-bold text-slate-800 text-sm">Không tìm thấy hồ sơ phù hợp</p> </div>⁠;
return;
}
let html = '';
filtered.forEach(lead => {
let docsHtml = '';
(lead.documents || []).forEach(d => {
docsHtml += ⁠<span class="inline-block bg-white text-slate-700 text-[10px] px-1.5 py-0.5 rounded border border-slate-200 ml-1">✓ ${DOC_MAP[d] || d}</span>⁠;
});
if (!docsHtml) docsHtml = '<span class="text-slate-400 italic text-[10px]"> Chưa có</span>';
let prevLendersHtml = '';
(lead.previousLenders || []).forEach(pl => {
prevLendersHtml += ⁠<span class="inline-block bg-emerald-50 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded border border-emerald-200 font-semibold ml-1">🏛️ ${pl}</span>⁠;
});
if (!prevLendersHtml) prevLendersHtml = '<span class="text-slate-400 italic text-[10px]"> Chưa có (Khách mới)</span>';
let appsHtml = '';
(lead.applications || []).forEach((app, aIdx) => {
let extraHtml = '';
if (app.result === 'Từ chối') {
extraHtml = ⁠<div class="text-rose-700 bg-rose-50 p-1.5 rounded text-[10px] space-y-1 border border-rose-200 mt-1"> <div class="font-bold">⛔ Đã kết thúc tại ${app.lender}</div> <input type="text" value="${escapeHtml(app.rejectReason || '')}" oninput="updateRejectReason(${lead.id}, ${aIdx}, this.value)" placeholder="Nhập lý do từ chối..." class="w-full bg-white border border-rose-200 rounded px-1.5 py-0.5 text-[10px]"> </div>⁠;
} else if (app.result === 'Duyệt') {
let contractDetails = '';
if (app.contract) {
contractDetails = ⁠<div class="grid grid-cols-2 gap-1 text-slate-700 pt-1 border-t border-emerald-200"> <div>Số HĐ: <b class="font-mono text-emerald-800">${escapeHtml(app.contract.code)}</b></div> <div>Duyệt: <b class="text-emerald-800">${formatVND(app.contract.approvedAmount)}</b></div> <div class="col-span-2 flex justify-between items-center pt-1"> <span>Kỳ: ${app.contract.tenor} tháng • Góp: ${formatVND(app.contract.monthlyPay)}/tháng</span> <button type="button" onclick="openReceipt(${lead.id}, ${aIdx})" class="bg-teal-600 text-white px-2.5 py-1 rounded-lg font-bold shadow hover:bg-teal-700 active:scale-95 transition">🧾 Xuất Phiếu</button> </div> </div>⁠;
}
extraHtml = ⁠<div class="bg-emerald-50 border border-emerald-300 p-2 rounded text-[10px] space-y-1 mt-1"> <div class="flex justify-between items-center font-bold text-emerald-900"> <span>🎉 Đã duyệt khoản vay</span> <button type="button" onclick="openContractModal(${lead.id}, ${aIdx})" class="bg-emerald-700 text-white px-2 py-0.5 rounded shadow hover:bg-emerald-800 active:scale-95 transition">${app.contract ? 'Sửa HĐ' : '+ Nhập HĐ'}</button> </div> ${contractDetails} </div>⁠;
}
appsHtml += ⁠<div class="bg-white rounded-lg p-2 border border-indigo-200/70 text-xs space-y-1.5 shadow-sm"> <div class="grid grid-cols-12 gap-1 items-center"> <div class="col-span-5 font-bold text-slate-800 truncate">🏢 ${app.lender}</div> <div class="col-span-7 flex justify-end gap-1"> <select onchange="handleAppChange(${lead.id}, ${aIdx}, this.value)" class="font-bold text-[11px] rounded-lg px-2 py-1 border bg-slate-50"> <option value="Đang thẩm định" ${app.result === 'Đang thẩm định' ? 'selected' : ''}>⏳ Đang thẩm định</option> <option value="Bổ sung hồ sơ" ${app.result === 'Bổ sung hồ sơ' ? 'selected' : ''}>📄 Bổ sung hồ sơ</option> <option value="Duyệt" ${app.result === 'Duyệt' ? 'selected' : ''}>✅ Duyệt</option> <option value="Từ chối" ${app.result === 'Từ chối' ? 'selected' : ''}>⛔ Từ chối</option> </select> <button type="button" onclick="removeApp(${lead.id}, ${aIdx})" class="text-slate-400 hover:text-rose-600 px-1 font-bold">✕</button> </div> </div> ${extraHtml} </div>⁠;
});
html += `
<div class="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm space-y-3">
<div class="flex justify-between items-start">
<div>
<div class="flex items-center gap-1.5 flex-wrap">
<span class="font-bold text-slate-900 text-sm">￼
￼{lead.age} tuổi</span>
<span class="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border">📶 ￼
￼
￼{lead.phone} • CCCD: ${lead.cccd || 'Chưa có'}</div>
</div>
<button type="button" onclick="toggleCompleteModal(${lead.id})" class="${lead.isCompleted ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'} text-[10px] px-2.5 py-1 rounded-full font-bold shadow-sm transition active:scale-95">
${lead.isCompleted ? '↺ Mở lại' : '✓ Hoàn thành'}
</button>
</div>
${lead.isCompleted ? ⁠<div class="bg-indigo-50 border border-indigo-200 p-2 rounded-xl text-[11px] text-indigo-950 space-y-0.5"> <div class="font-bold">✅ Đã lưu kho CRM (${lead.completedDate || 'Gần đây'})</div> <div class="text-slate-700 text-[10px]">Lý do: <b>${escapeHtml(lead.completeReason || 'Hoàn tất')}</b></div> </div>⁠ : ''}
<div class="bg-slate-50 rounded-xl p-2.5 text-xs space-y-1.5 border border-slate-100">
<div class="flex justify-between"><span>Cần vay:</span> <span class="font-bold text-blue-700">￼
￼{lead.cicStatus === 'SACH' ? 'Nhóm 1 (Sạch)' : 'Nợ chú ý/xấu'}</span></div>
<div class="text-[11px]"><b>Nghề nghiệp:</b> ${escapeHtml(lead.job) || 'Tự do'} • Thu nhập: ${formatVND(lead.income)}</div>
${lead.workAddress ? ⁠<div class="text-[10px] text-slate-600">🏢 <b>Đ/c làm việc:</b> ${escapeHtml(lead.workAddress)} (${escapeHtml(lead.workTime) || 'Chưa rõ TG'})</div>⁠ : ''}
${lead.email ? ⁠<div class="text-[10px] text-slate-600">📧 <b>Email:</b> ${escapeHtml(lead.email)}</div>⁠ : ''}
<div class="text-[10px] text-slate-600 bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-100"><b>🔍 Đang/Từng vay ở Cty:</b> ${prevLendersHtml}</div>
<div class="text-[10px] text-slate-500">🏠 Thường trú: ${escapeHtml(lead.permAddress) || '---'}</div>
<div class="text-[10px] text-slate-500">👥 Tham chiếu: ￼{lead.ref1Phone || '---'})</div>
<div><b>Chứng từ:</b> ${docsHtml}</div>
</div>
<div class="bg-indigo-50/50 rounded-xl p-2.5 border border-indigo-100 space-y-2">
<div class="flex justify-between items-center">
<span class="font-bold text-xs text-indigo-950">🏛️ Tiến độ nộp đa công ty:</span>
<button type="button" onclick="addAppPrompt(${lead.id})" class="text-[11px] bg-indigo-600 text-white font-bold px-2 py-1 rounded-lg shadow">+ Nộp Cty</button>
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
function openBackupModal() {
const auto = localStorage.getItem('loan_crm_autotg') === 'true';
const chk = document.getElementById('autoNotifyTg');
if (chk) chk.checked = auto;
const cfg = getTelegramConfig();
if (document.getElementById('cfgTgToken')) document.getElementById('cfgTgToken').value = cfg.token;
if (document.getElementById('cfgTgChatId')) document.getElementById('cfgTgChatId').value = cfg.chatId;
document.getElementById('backupModal').classList.remove('hidden');
}
function closeBackupModal() { document.getElementById('backupModal').classList.add('hidden'); }
function openCreateModal() {
editingLeadId = null;
document.getElementById('leadModalTitle').innerText = 'Thêm Khách Hàng Mới';
document.getElementById('leadForm').reset();
document.getElementById('formDob').value = '1998-05-15';
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
document.getElementById('formSimCarrier').value = l.simCarrier || 'Viettel';
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
renderDocCheckboxes(l.documents || []);
renderPrevLendersCheckboxes(l.previousLenders || []);
document.getElementById('leadModal').classList.remove('hidden');
}
function closeLeadModal() { document.getElementById('leadModal').classList.add('hidden'); }
function saveLeadForm(e) {
e.preventDefault();
const dob = document.getElementById('formDob').value;
const docs = Array.from(document.querySelectorAll('.lead-doc-chk:checked')).map(el => el.value);
const prevLenders = Array.from(document.querySelectorAll('.lead-prev-lender-chk:checked')).map(el => el.value);
const initialLender = document.getElementById('formInitialLender').value || 'TPBank';
const name = document.getElementById('formName').value;
const d = {
name: name,
phone: document.getElementById('formPhone').value,
email: document.getElementById('formEmail').value,
simCarrier: document.getElementById('formSimCarrier').value,
dob: dob,
age: calcAge(dob),
cccd: document.getElementById('formCccd').value,
oldCmnd: document.getElementById('formOldCmnd').value,
gender: document.getElementById('formGender').value,
permAddress: document.getElementById('formPermAddress').value,
tempAddress: document.getElementById('formTempAddress').value,
job: document.getElementById('formJob').value,
workAddress: document.getElementById('formWorkAddress').value,
workTime: document.getElementById('formWorkTime').value,
income: parseNumeric(document.getElementById('formIncome').value),
amount: parseNumeric(document.getElementById('formAmount').value) || 30000000,
bankName: document.getElementById('formBankName').value,
bankAccount: document.getElementById('formBankAccount').value,
previousLenders: prevLenders,
ref1Rel: document.getElementById('formRef1Rel').value,
ref1Name: document.getElementById('formRef1Name').value,
ref1Phone: document.getElementById('formRef1Phone').value,
ref2Rel: document.getElementById('formRef2Rel').value,
ref2Name: document.getElementById('formRef2Name').value,
ref2Phone: document.getElementById('formRef2Phone').value,
cicStatus: document.getElementById('formCicStatus').value,
documents: docs,
note: document.getElementById('formNote').value
};
if (editingLeadId) {
const idx = leads.findIndex(x => x.id === editingLeadId);
if (idx > -1) leads[idx] = { ...leads[idx], ...d };
showToast('Đã cập nhật hồ sơ');
if (typeof sendTelegramNotification === 'function') sendTelegramNotification('Cập nhật hồ sơ', name);
} else {
leads.unshift({ id: Date.now(), isCompleted: false, ...d, applications: [{ lender: initialLender, result: 'Đang thẩm định', rejectReason: '', contract: null }] });
showToast('Đã thêm hồ sơ mới');
if (typeof sendTelegramNotification === 'function') sendTelegramNotification('Thêm khách hàng mới', name);
}
closeLeadModal();
saveStorage();
}
function deleteLead(id) {
if (confirm('Xóa hồ sơ này?')) {
leads = leads.filter(x => x.id !== id);
showToast('Đã xóa hồ sơ');
saveStorage();
}
}
function addAppPrompt(leadId) {
const lender = prompt("Chọn Công ty Tài chính / Ngân hàng:\n" + ALL_PARTNERS.join(', '), "TPBank");
if (!lender) return;
const l = leads.find(x => x.id === leadId);
if (!l) return;
if (!l.applications) l.applications = [];
l.applications.push({ lender, result: 'Đang thẩm định', rejectReason: '', contract: null });
showToast(⁠Đã thêm ${lender}⁠);
saveStorage();
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
if (typeof sendTelegramNotification === 'function') sendTelegramNotification(⁠Đổi kết quả sang [${val}]⁠, l.name);
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
'TPBank': { bg: 'bg-purple-700', emoji: '🟣', guide: 'Thanh toán qua app TPBank Mobile hoặc ví điện tử MoMo/Viettel Money chọn mục "Thanh toán khoản vay > TPBank" nhập số HĐ.' },
'FE Credit': { bg: 'bg-emerald-700', emoji: '🟢', guide: 'Thanh toán qua ví MoMo, ZaloPay, Viettel Money hoặc chuyển khoản qua STK định danh của FE Credit.' },
'Home Credit': { bg: 'bg-red-600', emoji: '🔴', guide: 'Đóng tiền qua app Home Credit, MoMo, Viettel Post hoặc hệ thống cửa hàng TGDĐ/FPT Shop.' },
'HD Saison': { bg: 'bg-amber-600', emoji: '🟡', guide: 'Thanh toán qua HD SAISON App, VNPay, Bưu điện VNPost hoặc các điểm giao dịch liên kết.' },
'Mirae Asset (MAFC)': { bg: 'bg-blue-900', emoji: '🏢', guide: 'Chuyển khoản qua tài khoản định danh của Mirae Asset hoặc qua ứng dụng My Finance / MoMo.' },
'MCredit': { bg: 'bg-purple-700', emoji: '🟣', guide: 'Thanh toán qua app MCredit, Viettel Money hoặc qua các điểm thu hộ Viettel Post trên toàn quốc.' },
'SHB Finance': { bg: 'bg-cyan-700', emoji: '🔷', guide: 'Đóng qua SHB Finance App, VNPay hoặc chuyển khoản trực tiếp STK ngân hàng thụ hưởng.' },
'VPBank': { bg: 'bg-green-700', emoji: '🏦', guide: 'Thanh toán qua VPBank NEO, MoMo, hoặc nộp tiền mặt tại các chi nhánh VPBank.' },
'Cathay Bank (CUB)': { bg: 'bg-emerald-800', emoji: '🌳', guide: 'Chuyển khoản theo số tài khoản hợp đồng định danh cấp bởi Cathay Bank (CUB).' },
'Tnex': { bg: 'bg-sky-600', emoji: '⚡', guide: 'Thanh toán trực tiếp tự động qua ứng dụng ngân hàng số TNEX.' },
'Cake by VPBank': { bg: 'bg-pink-600', emoji: '🍰', guide: 'Thanh toán nhanh chóng và tiện lợi trực tiếp trên ứng dụng Cake by VPBank.' },
'Viettel Money': { bg: 'bg-rose-700', emoji: '📶', guide: 'Thanh toán qua ứng dụng Viettel Money (mục Tài chính / Vay tiêu dùng).' },
'Tinvay': { bg: 'bg-indigo-700', emoji: '💳', guide: 'Thanh toán qua app Tinvay hoặc các cổng thanh toán điện tử hỗ trợ.' }
};
function openReceipt(leadId, aIdx) {
const l = leads.find(x => x.id === leadId);
if (!l || !l.applications || !l.applications[aIdx]) return;
const app = l.applications[aIdx];
receiptLeadId = leadId;
receiptAppIdx = aIdx;
const c = app.contract || {};
const dates = calcPayDates(c.disburseDate, c.tenor);
const theme = LENDER_THEMES[app.lender] || { bg: 'bg-slate-800', emoji: '💳', guide: 'Thanh toán qua ví điện tử hoặc điểm thu hộ liên kết.' };
document.getElementById('receiptHeader').className = ⁠p-4 text-white ${theme.bg} flex justify-between items-center⁠;
document.getElementById('receiptLogoEmoji').innerText = theme.emoji;
document.getElementById('receiptLenderTitle').innerText = app.lender;
document.getElementById('receiptName').innerText = l.name;
document.getElementById('receiptPhone').innerText = l.phone;
document.getElementById('receiptMonthlyPay').innerText = formatVND(c.monthlyPay);
document.getElementById('receiptTenor').innerText = ⁠${c.tenor || 12} tháng⁠;
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
const dates = calcPayDates(c.disburseDate, c.tenor);
const theme = LENDER_THEMES[app.lender] || { guide: 'Thanh toán qua ví điện tử hoặc điểm thu hộ.' };
const msg = ⁠📢 THÔNG BÁO LỊCH THANH TOÁN KHOẢN VAY\n---------------------------------------\nKính gửi: ${l.name} (${l.phone})\nĐơn vị: ${app.lender}\nSố HĐ: ${c.code || '---'}\nTiền góp: ${formatVND(c.monthlyPay)}/tháng (Kỳ hạn: ${c.tenor || 12} tháng)\n📅 Ngày đóng đầu tiên: ${dates.first}\n🏁 Ngày đóng cuối (Tất toán): ${dates.last}\n\n🏦 HƯỚNG DẪN ĐÓNG TIỀN:\n${theme.guide}⁠;
navigator.clipboard.writeText(msg).then(() => showToast('Đã copy tin nhắn gửi Zalo!')).catch(() => showToast('Lỗi copy'));
}
function toggleCompleteModal(leadId) {
const l = leads.find(x => x.id === leadId);
if (l.isCompleted) {
l.isCompleted = false;
showToast('Đã mở lại hồ sơ');
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
l.completedDate = ⁠${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}⁠;
showToast('Đã lưu kho CRM');
if (typeof sendTelegramNotification === 'function') sendTelegramNotification(⁠Lưu kho [${l.completeReason}]⁠, l.name);
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
function downloadBackupFile() {
const blob = new Blob([JSON.stringify(leads, null, 2)], { type: 'application/json' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = ⁠CRM_PTC_Backup_${Date.now()}.json⁠;
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
if (Array.isArray(p)) { leads = p; showToast('Khôi phục từ file thành công!'); closeBackupModal(); saveStorage(); }
} catch (err) { showToast('File không hợp lệ'); }
};
r.readAsText(f);
}
render();
