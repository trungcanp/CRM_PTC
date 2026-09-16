// js/telegram-service.js
function getTelegramConfig() {
  return {
    token: localStorage.getItem('crm_tg_token') || '8539026331:AAHGpTRXegeT_ZZn28uDwXjXHArpwM7E1ME',
    chatId: localStorage.getItem('crm_tg_chatid') || '-1004351522635'
  };
}

function saveCustomTgConfig() {
  const t = document.getElementById('cfgTgToken').value.trim();
  const c = document.getElementById('cfgTgChatId').value.trim();
  if (t) localStorage.setItem('crm_tg_token', t);
  if (c) localStorage.setItem('crm_tg_chatid', c);
  showToast('Đã lưu cấu hình kết nối Telegram');
}

function toggleAutoNotify(el) {
  localStorage.setItem('loan_crm_autotg', el.checked ? 'true' : 'false');
  showToast(el.checked ? 'Đã BẬT tự động báo Telegram' : 'Đã TẮT tự động báo Telegram');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendTelegramNotification(actionText, leadName) {
  const auto = localStorage.getItem('loan_crm_autotg') === 'true';
  if (!auto) return;
  const { token, chatId } = getTelegramConfig();
  try {
    const text = `🔔 <b>CRM_PTC THÔNG BÁO</b>\n• Thao tác: <b>${escapeHtml(actionText)}</b>\n• Khách hàng: <b>${escapeHtml(leadName)}</b>\n• Thời gian: ${new Date().toLocaleString('vi-VN')}`;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
  } catch (e) { console.warn(e); }
}

async function backupToTelegram() {
  showToast('Đang tạo tệp gửi lên Telegram...');
  const { token, chatId } = getTelegramConfig();
  try {
    const jsonStr = JSON.stringify(leads, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', blob, `CRM_PTC_Backup_${Date.now()}.json`);
    formData.append('caption', `📦 <b>SAO LƯU CRM_PTC</b> (${leads.length} hồ sơ)\n• Ngày: ${new Date().toLocaleString('vi-VN')}`);
    formData.append('parse_mode', 'HTML');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: formData });
    const d = await res.json();
    if (d.ok) showToast('Đã lưu file lên Telegram thành công!');
    else showToast('Telegram từ chối: ' + (d.description || ''));
  } catch (err) {
    showToast('Lỗi mạng khi tải tệp lên Telegram');
  }
}

async function restoreFromTelegram() {
  showToast('Đang tìm bản sao lưu gần nhất...');
  const { token } = getTelegramConfig();
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?allowed_updates=["channel_post","message"]`);
    const d = await res.json();
    if (!d.ok || !d.result || d.result.length === 0) {
      showToast('Không tìm thấy tin nhắn trên Telegram');
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
      showToast('Chưa có tệp backup .json nào trên kênh!');
      return;
    }

    const fileInfoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${targetFileId}`);
    const fileInfo = await fileInfoRes.json();
    if (!fileInfo.ok) {
      showToast('Không lấy được link tệp');
      return;
    }

    const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`;
    const contentRes = await fetch(downloadUrl);
    const parsedData = await contentRes.json();

    if (Array.isArray(parsedData)) {
      leads = parsedData;
      saveStorage();
      closeBackupModal();
      showToast(`Đã nạp ${leads.length} hồ sơ từ Telegram!`);
    } else {
      showToast('Định dạng tệp không hợp lệ');
    }
  } catch (err) {
    showToast('Không thể khôi phục từ Telegram');
  }
}
