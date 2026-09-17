// js/telegram-service.js - Quản lý cấu hình, thông báo & sao lưu dữ liệu bảo mật
/
￼ Lấy cấu hình Token và Chat ID được lưu trong máy
*/
function getTelegramConfig() {
let token = '';
let chatId = '';
try {
token = (localStorage.getItem('crm_tg_token') || '').trim();
chatId = (localStorage.getItem('crm_tg_chatid') || '').trim();
} catch (e) {
console.warn('Lỗi đọc localStorage:', e);
}
return { token, chatId };
}
/
￼ Bật / tắt ẩn hiện mật khẩu Bot Token
*/
function toggleTokenVisibility() {
const input = document.getElementById('cfgTgToken');
if (!input) return;
input.type = input.type === 'password' ? 'text' : 'password';
}
/
￼ Cập nhật trạng thái hiển thị của cấu hình Telegram
*/
function updateTgStatusBadge() {
const badge = document.getElementById('tgConfigStatusBadge');
if (!badge) return;
const { token, chatId } = getTelegramConfig();
if (token && chatId) {
badge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200';
badge.innerText = '✓ Đã kết nối';
} else {
badge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200';
badge.innerText = '⚠️ Chưa lưu đủ';
}
}
/
￼ Lưu cấu hình bảo mật vào bộ nhớ Safari với phản hồi Alert chính thức của iOS
*/
function saveCustomTgConfig() {
const tokenInput = document.getElementById('cfgTgToken');
const chatIdInput = document.getElementById('cfgTgChatId');
const btn = document.getElementById('btnSaveTgConfig');
const btnText = document.getElementById('btnSaveTgText');
const token = tokenInput ? tokenInput.value.trim() : '';
const chatId = chatIdInput ? chatIdInput.value.trim() : '';
if (!token && !chatId) {
alert('⚠️ Vui lòng nhập Bot Token và Chat ID trước khi bấm Lưu!');
return;
}
try {
if (token) localStorage.setItem('crm_tg_token', token);
if (chatId) localStorage.setItem('crm_tg_chatid', chatId);
// Đổi màu nút xanh lá cây ngay lập tức
if (btn) {
btn.className = 'w-full bg-emerald-600 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5';
if (btnText) btnText.innerText = 'ĐÃ LƯU VÀO MÁY THÀNH CÔNG!';
setTimeout(() => {
btn.className = 'w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5';
if (btnText) btnText.innerText = 'Lưu Cấu Hình Kết Nối';
}, 2500);
}
updateTgStatusBadge();
// BẬT HỘP THOẠI NỔI CỦA IPHONE ĐỂ BẠN THẤY PHẢN HỒI RÕ RÀNG 100%
alert('✅ ĐÃ LƯU THÀNH CÔNG!\n\nBot Token và Chat ID đã được lưu vĩnh viễn trên iPhone của bạn. Từ giờ bạn chỉ cần bấm [Gửi Lên Kênh] để sao lưu.');
if (typeof showToast === 'function') showToast('✓ Đã ghi nhớ cấu hình Telegram trên iPhone!');
} catch (err) {
console.error('Lỗi ghi nhớ Safari:', err);
alert('Không thể lưu vào bộ nhớ. Nếu bạn đang dùng "Tab Ẩn Danh" (Private Browsing) trên Safari, hãy chuyển sang Tab thường để iPhone cho phép lưu trữ vĩnh viễn nhé!');
}
}
/
￼ Bật/tắt tự động gửi thông báo khi có biến động
*/
function toggleAutoNotify(el) {
try {
localStorage.setItem('loan_crm_autotg', el.checked ? 'true' : 'false');
if (typeof showToast === 'function') {
showToast(el.checked ? 'Đã BẬT tự động báo Telegram' : 'Đã TẮT tự động báo Telegram');
}
} catch (e) {}
}
/
￼ Gửi thông báo ngắn về thao tác hồ sơ
*/
async function sendTelegramNotification(actionText, leadName) {
let auto = false;
try {
auto = localStorage.getItem('loan_crm_autotg') === 'true';
} catch (e) {}
if (!auto) return;
const { token, chatId } = getTelegramConfig();
if (!token || !chatId) return;
try {
const safeAction = typeof escapeHtml === 'function' ? escapeHtml(actionText) : actionText;
const safeName = typeof escapeHtml === 'function' ? escapeHtml(leadName) : leadName;
const text = ⁠🔔 <b>CRM_PTC THÔNG BÁO</b>\n• Thao tác: <b>${safeAction}</b>\n• Khách hàng: <b>${safeName}</b>\n• Thời gian: ${new Date().toLocaleString('vi-VN')}⁠;
await fetch(⁠https://api.telegram.org/bot${token}/sendMessage⁠, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
});
} catch (e) {
console.warn('Lỗi kết nối Telegram:', e);
}
}
/
￼ Nén chuỗi Base64
*/
async function compressText(text) {
if (typeof CompressionStream === 'undefined') return text;
try {
const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
const response = new Response(stream);
const buffer = await response.arrayBuffer();
const bytes = new Uint8Array(buffer);
let binary = '';
for (let i = 0; i < bytes.byteLength; i++) {
binary += String.fromCharCode(bytes[i]);
}
return btoa(binary);
} catch (e) {
return text;
}
}
/
￼ Giải nén chuỗi Base64
*/
async function decompressText(base64) {
if (typeof DecompressionStream === 'undefined') return base64;
try {
const binary = atob(base64);
const bytes = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) {
bytes[i] = binary.charCodeAt(i);
}
const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
const response = new Response(stream);
return await response.text();
} catch (e) {
return base64;
}
}
/
￼ Sao lưu hồ sơ lên Telegram (Gửi file + Tin nhắn ghim dữ liệu)
*/
async function backupToTelegram() {
const { token, chatId } = getTelegramConfig();
if (!token || !chatId) {
alert('⚠️ Hãy nhập Bot Token và Chat ID rồi bấm [Lưu Cấu Hình] ở trên trước!');
return;
}
if (typeof showToast === 'function') showToast('Đang tạo bản sao lưu gửi lên Telegram...');
try {
const currentLeads = typeof leads !== 'undefined' ? leads : [];
const minifiedJson = JSON.stringify(currentLeads);
// 1. Gửi tệp file .json đính kèm
try {
const blob = new Blob([JSON.stringify(currentLeads, null, 2)], { type: 'application/json' });
const fileName = ⁠CRM_PTC_Backup_${Date.now()}.json⁠;
const formData = new FormData();
formData.append('chat_id', chatId);
formData.append('document', blob, fileName);
formData.append('caption', ⁠📦 <b>TỆP LƯU TRỮ CRM_PTC</b>\n• Tổng số hồ sơ: ${currentLeads.length}\n• Thời gian: ${new Date().toLocaleString('vi-VN')}⁠);
formData.append('parse_mode', 'HTML');
await fetch(⁠https://api.telegram.org/bot${token}/sendDocument⁠, {
method: 'POST',
body: formData
});
} catch (docErr) {
console.warn('Gửi file đính kèm thất bại, tiếp tục bản khôi phục:', docErr);
}
// 2. Chuẩn bị gói dữ liệu nạp nhanh (Chống CORS)
let payload = '';
let isCompressed = false;
if (minifiedJson.length < 3500) {
payload = minifiedJson;
} else {
payload = await compressText(minifiedJson);
isCompressed = true;
}
const backupMsg = ⁠🔄 <b>BẢN SAO LƯU CRM_PTC</b> (${currentLeads.length} hồ sơ)\n⁠ +
⁠⏱ ${new Date().toLocaleString('vi-VN')}\n⁠ +
⁠---DATA_START---\n⁠ +
(isCompressed ? ⁠[GZIP_B64]${payload}⁠ : payload) +
⁠\n---DATA_END---⁠;
const msgRes = await fetch(⁠https://api.telegram.org/bot${token}/sendMessage⁠, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
chat_id: chatId,
text: backupMsg,
parse_mode: 'HTML'
})
});
const msgData = await msgRes.json();
if (msgData.ok && msgData.result) {
// 3. Tự động Ghim tin nhắn này
try {
await fetch(⁠https://api.telegram.org/bot${token}/pinChatMessage⁠, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
chat_id: chatId,
message_id: msgData.result.message_id,
disable_notification: true
})
});
} catch (pinErr) {
console.warn('Bot chưa có quyền ghim:', pinErr);
}
alert('✅ SAO LƯU THÀNH CÔNG!\n\nToàn bộ hồ sơ đã được gửi và ghim an toàn trên kênh Telegram của bạn.');
if (typeof showToast === 'function') showToast('✓ Đã sao lưu & ghim bản mới nhất lên Telegram!');
} else {
alert('Telegram từ chối: ' + (msgData.description || 'Sai Bot Token hoặc Chat ID'));
}
} catch (err) {
console.error('Lỗi sao lưu:', err);
alert('Lỗi kết nối mạng khi gửi lên Telegram!');
}
}
/
￼ Khôi phục dữ liệu từ tin nhắn GHIM
*/
async function restoreFromTelegram() {
const { token, chatId } = getTelegramConfig();
if (!token || !chatId) {
alert('⚠️ Vui lòng nhập Token và Chat ID rồi bấm [Lưu Cấu Hình] trước!');
return;
}
if (typeof showToast === 'function') showToast('Đang tìm bản sao lưu từ Telegram...');
try {
let rawPayload = '';
// Đọc tin nhắn GHIM trên đầu kênh
const chatRes = await fetch(⁠https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}⁠);
const chatData = await chatRes.json();
if (!chatData.ok || !chatData.result) {
alert('Telegram từ chối: ' + (chatData.description || 'Sai Chat ID hoặc Token'));
return;
}
const pinned = chatData.result.pinned_message;
if (pinned && pinned.text && pinned.text.includes('---DATA_START---')) {
const startIdx = pinned.text.indexOf('---DATA_START---') + '---DATA_START---'.length;
const endIdx = pinned.text.indexOf('---DATA_END---');
if (endIdx > startIdx) {
rawPayload = pinned.text.substring(startIdx, endIdx).trim();
}
}
if (!rawPayload) {
alert('Chưa tìm thấy bản sao lưu hợp lệ trên kênh. Vui lòng bấm [🚀 Gửi Lên Kênh] một lần trước để tạo bản lưu!');
return;
}
let jsonStr = rawPayload;
if (rawPayload.startsWith('[GZIP_B64]')) {
jsonStr = await decompressText(rawPayload.replace('[GZIP_B64]', ''));
}
const parsedData = JSON.parse(jsonStr);
if (Array.isArray(parsedData)) {
leads = parsedData;
if (typeof saveStorage === 'function') saveStorage();
if (typeof closeBackupModal === 'function') closeBackupModal();
alert(⁠✅ NẠP DỮ LIỆU THÀNH CÔNG!\n\nĐã khôi phục đầy đủ ${leads.length} hồ sơ từ Telegram.⁠);
if (typeof showToast === 'function') showToast(⁠✓ Đã nạp lại ${leads.length} hồ sơ từ Telegram!⁠);
} else {
alert('Dữ liệu không đúng định dạng!');
}
} catch (err) {
console.error('Lỗi khôi phục:', err);
alert('Không thể khôi phục từ Telegram: Lỗi giải mã dữ liệu!');
}
}
