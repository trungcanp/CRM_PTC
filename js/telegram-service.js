// js/telegram-service.js - Quản lý gửi thông báo & sao lưu dữ liệu bảo mật (Chống lỗi CORS Safari)
/
￼ Lấy cấu hình Token và Chat ID được lưu an toàn trong máy người dùng
*/
function getTelegramConfig() {
return {
token: (localStorage.getItem('crm_tg_token') || '').trim(),
chatId: (localStorage.getItem('crm_tg_chatid') || '').trim()
};
}
/
￼ Lưu cấu hình bảo mật vào bộ nhớ Safari
*/
function saveCustomTgConfig() {
const tokenInput = document.getElementById('cfgTgToken');
const chatIdInput = document.getElementById('cfgTgChatId');
const token = tokenInput ? tokenInput.value.trim() : '';
const chatId = chatIdInput ? chatIdInput.value.trim() : '';
if (!token || !chatId) {
if (typeof showToast === 'function') showToast('⚠️ Vui lòng nhập đầy đủ Token và Chat ID');
return;
}
localStorage.setItem('crm_tg_token', token);
localStorage.setItem('crm_tg_chatid', chatId);
if (typeof showToast === 'function') showToast('✓ Đã lưu cấu hình kết nối Telegram!');
}
/
￼ Bật/tắt chế độ tự động gửi thông báo khi có biến động hồ sơ
*/
function toggleAutoNotify(el) {
localStorage.setItem('loan_crm_autotg', el.checked ? 'true' : 'false');
if (typeof showToast === 'function') {
showToast(el.checked ? 'Đã BẬT tự động báo Telegram' : 'Đã TẮT tự động báo Telegram');
}
}
/
￼ Gửi thông báo ngắn về thao tác hồ sơ
*/
async function sendTelegramNotification(actionText, leadName) {
const auto = localStorage.getItem('loan_crm_autotg') === 'true';
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
￼ Nén chuỗi sang Base64 nếu dữ liệu lớn (Dành cho Safari iOS 16.4+)
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
￼ Sao lưu toàn bộ hồ sơ khách hàng:
1. Gửi tệp .json để lưu trữ trên kênh Telegram
1. Gửi tin nhắn dữ liệu trực tiếp và GHIM lên đầu kênh để nạp lại mượt mà (chống lỗi CORS)
*/
async function backupToTelegram() {
const { token, chatId } = getTelegramConfig();
if (!token || !chatId) {
if (typeof showToast === 'function') showToast('⚠️ Hãy nhập Token và Chat ID ở trên trước!');
return;
}
if (typeof showToast === 'function') showToast('Đang tạo bản sao lưu gửi lên Telegram...');
try {
const currentLeads = typeof leads !== 'undefined' ? leads : [];
const minifiedJson = JSON.stringify(currentLeads);
// 1. Gửi tệp file .json đính kèm để lưu trữ lâu dài
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
console.warn('Gửi file đính kèm thất bại, tiếp tục với bản khôi phục:', docErr);
}
// 2. Chuẩn bị gói dữ liệu khôi phục nhanh (vượt rào CORS)
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
// 3. Tự động ghim tin nhắn này lên đầu kênh
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
console.warn('Bot chưa có quyền ghim tin:', pinErr);
}
if (typeof showToast === 'function') showToast('✓ Đã sao lưu & ghim bản mới nhất lên Telegram!');
} else {
if (typeof showToast === 'function') showToast('Telegram từ chối: ' + (msgData.description || 'Sai cấu hình'));
}
} catch (err) {
console.error('Lỗi sao lưu:', err);
if (typeof showToast === 'function') showToast('Lỗi kết nối khi sao lưu lên Telegram');
}
}
/
￼ Khôi phục dữ liệu từ tin nhắn GHIM gần nhất trên kênh (Không bị lỗi CORS)
*/
async function restoreFromTelegram() {
const { token, chatId } = getTelegramConfig();
if (!token || !chatId) {
if (typeof showToast === 'function') showToast('⚠️ Vui lòng lưu Token và Chat ID trước');
return;
}
if (typeof showToast === 'function') showToast('Đang tìm bản sao lưu từ Telegram...');
try {
let rawPayload = '';
// 1. Đọc tin nhắn GHIM trên đầu kênh qua lệnh getChat
const chatRes = await fetch(⁠https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}⁠);
const chatData = await chatRes.json();
if (!chatData.ok || !chatData.result) {
if (typeof showToast === 'function') showToast('Telegram từ chối: ' + (chatData.description || 'Sai Chat ID'));
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
// 2. Dự phòng: tìm trong danh sách cập nhật gần nhất nếu tin ghim bị tháo
if (!rawPayload) {
const res = await fetch(⁠https://api.telegram.org/bot${token}/getUpdates?allowed_updates=["channel_post","message"]⁠);
const d = await res.json();
if (d.ok && d.result && d.result.length > 0) {
for (let i = d.result.length - 1; i >= 0; i--) {
const msg = d.result[i].message || d.result[i].channel_post;
if (msg && msg.text && msg.text.includes('---DATA_START---')) {
const startIdx = msg.text.indexOf('---DATA_START---') + '---DATA_START---'.length;
const endIdx = msg.text.indexOf('---DATA_END---');
if (endIdx > startIdx) {
rawPayload = msg.text.substring(startIdx, endIdx).trim();
break;
}
}
}
}
}
if (!rawPayload) {
if (typeof showToast === 'function') {
showToast('Chưa có bản sao lưu hợp lệ. Vui lòng bấm [🚀 Gửi File Lên Bot] lại 1 lần!');
}
return;
}
// 3. Xử lý giải mã dữ liệu
let jsonStr = rawPayload;
if (rawPayload.startsWith('[GZIP_B64]')) {
jsonStr = await decompressText(rawPayload.replace('[GZIP_B64]', ''));
}
const parsedData = JSON.parse(jsonStr);
if (Array.isArray(parsedData)) {
leads = parsedData;
if (typeof saveStorage === 'function') saveStorage();
if (typeof closeBackupModal === 'function') closeBackupModal();
if (typeof showToast === 'function') showToast(⁠✓ Đã nạp lại ${leads.length} hồ sơ từ Telegram!⁠);
} else {
if (typeof showToast === 'function') showToast('Dữ liệu không đúng định dạng!');
}
} catch (err) {
console.error('Lỗi khôi phục:', err);
if (typeof showToast === 'function') showToast('Không thể khôi phục từ Telegram');
}
}
