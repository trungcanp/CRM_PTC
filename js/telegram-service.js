// js/telegram-service.js - Quản lý gửi thông báo & sao lưu dữ liệu bảo mật (Không lộ Token)

/**
 * Lấy cấu hình Token và Chat ID được lưu an toàn trong máy người dùng
 */
function getTelegramConfig() {
  return {
    token: (localStorage.getItem('crm_tg_token') || '').trim(),
    chatId: (localStorage.getItem('crm_tg_chatid') || '').trim()
  };
}

/**
 * Lưu cấu hình bảo mật vào bộ nhớ Safari (Chỉ nhập 1 lần duy nhất)
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

/**
 * Bật/tắt chế độ tự động gửi thông báo khi có biến động hồ sơ
 */
function toggleAutoNotify(el) {
  localStorage.setItem('loan_crm_autotg', el.checked ? 'true' : 'false');
  if (typeof showToast === 'function') {
    showToast(el.checked ? 'Đã BẬT tự động báo Telegram' : 'Đã TẮT tự động báo Telegram');
  }
}

/**
 * Gửi thông báo ngắn về thao tác hồ sơ
 */
async function sendTelegramNotification(actionText, leadName) {
  const auto = localStorage.getItem('loan_crm_autotg') === 'true';
  if (!auto) return;

  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return; // Chưa cấu hình thì bỏ qua, không gây lỗi web

  try {
    const safeAction = typeof escapeHtml === 'function' ? escapeHtml(actionText) : actionText;
    const safeName = typeof escapeHtml === 'function' ? escapeHtml(leadName) : leadName;
    const text = `🔔 <b>CRM_PTC THÔNG BÁO</b>\n• Thao tác: <b>${safeAction}</b>\n• Khách hàng: <b>${safeName}</b>\n• Thời gian: ${new Date().toLocaleString('vi-VN')}`;
    
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
    });
  } catch (e) {
    console.warn('Lỗi kết nối Telegram:', e);
  }
}

/**
 * Sao lưu toàn bộ hồ sơ khách hàng dạng tệp .json gửi vào kênh Telegram
 */
async function backupToTelegram() {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    if (typeof showToast === 'function') showToast('⚠️ Hãy nhập Token và Chat ID ở trên trước!');
    return;
  }

  if (typeof showToast === 'function') showToast('Đang tạo tệp sao lưu gửi lên Telegram...');

  try {
    const currentLeads = typeof leads !== 'undefined' ? leads : [];
    const jsonStr = JSON.stringify(currentLeads, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const fileName = `CRM_PTC_Backup_${Date.now()}.json`;

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', blob, fileName);
    formData.append('caption', `📦 <b>SAO LƯU DỮ LIỆU CRM_PTC</b>\n• Tổng số hồ sơ: ${currentLeads.length}\n• Thời gian: ${new Date().toLocaleString('vi-VN')}`);
    formData.append('parse_mode', 'HTML');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData
    });

    const d = await res.json();
    if (d.ok) {
      if (typeof showToast === 'function') showToast('✓ Đã lưu dữ liệu lên Telegram thành công!');
    } else {
      if (typeof showToast === 'function') showToast('Telegram từ chối: ' + (d.description || 'Sai Token/Chat ID'));
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast('Lỗi mạng khi tải tệp lên Telegram');
  }
}

/**
 * Khôi phục dữ liệu từ bản sao lưu gần nhất trên kênh Telegram
 */
async function restoreFromTelegram() {
  const { token } = getTelegramConfig();

  if (!token) {
    if (typeof showToast === 'function') showToast('⚠️ Vui lòng lưu Token Telegram trước');
    return;
  }

  if (typeof showToast === 'function') showToast('Đang tìm bản sao lưu gần nhất...');

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?allowed_updates=["channel_post","message"]`);
    const d = await res.json();
    
    if (!d.ok || !d.result || d.result.length === 0) {
      if (typeof showToast === 'function') showToast('Không tìm thấy tin nhắn tệp trên Telegram');
      return;
    }

    let targetFileId = null;
    for (let i = d.result.length - 1; i >= 0; i--) {
      const item = d.result[i];
      const msg = item.message || item.channel_post;
      if (msg && msg.document && msg.document.file_name && msg.document.file_name.endsWith('.json')) {
        targetFileId = msg.document.file_id;
        break;
      }
    }

    if (!targetFileId) {
      if (typeof showToast === 'function') showToast('Chưa có tệp backup .json nào trên kênh!');
      return;
    }

    const fileInfoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${targetFileId}`);
    const fileInfo = await fileInfoRes.json();
    if (!fileInfo.ok) {
      if (typeof showToast === 'function') showToast('Không lấy được link tải tệp');
      return;
    }

    const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`;
    const contentRes = await fetch(downloadUrl);
    const parsedData = await contentRes.json();

    if (Array.isArray(parsedData)) {
      leads = parsedData;
      if (typeof saveStorage === 'function') saveStorage();
      if (typeof closeBackupModal === 'function') closeBackupModal();
      if (typeof showToast === 'function') showToast(`✓ Đã nạp lại ${leads.length} hồ sơ từ Telegram!`);
    } else {
      if (typeof showToast === 'function') showToast('Định dạng tệp không tương thích!');
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast('Không thể khôi phục từ Telegram');
  }
}
