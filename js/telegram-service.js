// js/telegram-service.js - Quản lý cấu hình, thông báo & sao lưu dữ liệu an toàn

/**
 * Lấy cấu hình Token và Chat ID được lưu trong máy
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

/**
 * Bật / tắt ẩn hiện mật khẩu Bot Token
 */
function toggleTokenVisibility() {
  const input = document.getElementById('cfgTgToken');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

/**
 * Cập nhật huy hiệu trạng thái kết nối
 */
function updateTgStatusBadge() {
  const badge = document.getElementById('tgConfigStatusBadge');
  if (!badge) return;
  const token = (document.getElementById('cfgTgToken')?.value || localStorage.getItem('crm_tg_token') || '').trim();
  const chatId = (document.getElementById('cfgTgChatId')?.value || localStorage.getItem('crm_tg_chatid') || '').trim();

  if (token && chatId) {
    badge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200';
    badge.innerText = '✓ Đã kết nối';
  } else {
    badge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200';
    badge.innerText = '⚠️ Chưa lưu đủ';
  }
}

/**
 * Tự động kiểm tra trạng thái khi người dùng gõ
 */
function checkTgInputStatus() {
  updateTgStatusBadge();
}

/**
 * Lưu cấu hình và kiểm tra kết nối trực tiếp với Telegram API (Giữ nguyên bản chuẩn 100%)
 */
async function saveCustomTgConfig() {
  const tokenInput = document.getElementById('cfgTgToken');
  const chatIdInput = document.getElementById('cfgTgChatId');
  const btn = document.getElementById('btnSaveTgConfig');
  const btnText = document.getElementById('btnSaveTgText');

  const token = tokenInput ? tokenInput.value.trim() : '';
  const chatId = chatIdInput ? chatIdInput.value.trim() : '';

  if (!token || !chatId) {
    if (btnText) btnText.innerText = '⚠️ Vui lòng nhập đủ Token & Chat ID';
    if (btn) btn.className = 'w-full bg-amber-600 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5';
    setTimeout(() => {
      if (btnText) btnText.innerText = 'Lưu Cấu Hình Kết Nối';
      if (btn) btn.className = 'w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer';
    }, 2500);
    return;
  }

  // 1. Lưu ngay vào bộ nhớ máy
  try {
    localStorage.setItem('crm_tg_token', token);
    localStorage.setItem('crm_tg_chatid', chatId);
  } catch (err) {
    console.warn('Lỗi ghi nhớ localStorage:', err);
  }

  // 2. Hiển thị tiến trình đang kiểm tra kết nối thực tế
  if (btnText) btnText.innerText = '⏳ Đang kiểm tra kết nối Bot...';
  if (btn) btn.className = 'w-full bg-indigo-600 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5';

  // 3. Gọi trực tiếp API Telegram để xác minh tính chính xác của Token
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();

    if (data.ok && data.result) {
      const botUser = data.result.username ? `@${data.result.username}` : 'Bot';
      if (btnText) btnText.innerText = `✓ ĐÃ KẾT NỐI (${botUser})!`;
      if (btn) btn.className = 'w-full bg-emerald-600 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5';
      
      const badge = document.getElementById('tgConfigStatusBadge');
      if (badge) {
        badge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200';
        badge.innerText = `✓ Đã kết nối (${botUser})`;
      }
      if (typeof showToast === 'function') showToast(`✓ Đã lưu & kết nối thành công ${botUser}!`);

      setTimeout(() => {
        if (btnText) btnText.innerText = 'Lưu Cấu Hình Kết Nối';
        if (btn) btn.className = 'w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer';
      }, 3000);
    } else {
      const errDesc = data.description || 'Token không hợp lệ';
      if (btnText) btnText.innerText = `❌ Lỗi: ${errDesc}`;
      if (btn) btn.className = 'w-full bg-rose-600 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5';
      
      const badge = document.getElementById('tgConfigStatusBadge');
      if (badge) {
        badge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200';
        badge.innerText = '❌ Sai Token';
      }
      if (typeof showToast === 'function') showToast(`❌ Telegram từ chối: ${errDesc}`);

      setTimeout(() => {
        if (btnText) btnText.innerText = 'Lưu Cấu Hình Kết Nối';
        if (btn) btn.className = 'w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer';
      }, 3500);
    }
  } catch (netErr) {
    if (btnText) btnText.innerText = '✓ ĐÃ LƯU (Chưa kiểm tra mạng)';
    if (btn) btn.className = 'w-full bg-emerald-600 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5';
    updateTgStatusBadge();
    if (typeof showToast === 'function') showToast('✓ Đã lưu cấu hình vào máy!');

    setTimeout(() => {
      if (btnText) btnText.innerText = 'Lưu Cấu Hình Kết Nối';
      if (btn) btn.className = 'w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer';
    }, 2500);
  }
}

/**
 * Bật/tắt tự động gửi thông báo khi có biến động
 */
function toggleAutoNotify(el) {
  try {
    localStorage.setItem('loan_crm_autotg', el.checked ? 'true' : 'false');
    if (typeof showToast === 'function') {
      showToast(el.checked ? 'Đã BẬT tự động báo Telegram' : 'Đã TẮT tự động báo Telegram');
    }
  } catch (e) {}
}

/**
 * Gửi thông báo ngắn về thao tác hồ sơ
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
 * Sao lưu hồ sơ lên Telegram DƯỚI DẠNG TỆP FILE (sendDocument)
 * Tự động ghi nhớ mã tệp (file_id) và Ghim (Pin) lên đầu kênh
 */
async function backupToTelegram() {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    if (typeof showToast === 'function') showToast('⚠️ Vui lòng nhập Bot Token và Chat ID trước!');
    return;
  }

  if (typeof showToast === 'function') showToast('Đang gửi tệp sao lưu lên Telegram...');

  try {
    const currentLeads = typeof leads !== 'undefined' ? leads : [];
    const jsonStr = JSON.stringify(currentLeads, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const fileName = `CRM_PTC_Backup_${Date.now()}.json`;

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', blob, fileName);
    formData.append('caption', `📦 <b>TỆP SAO LƯU CRM_PTC</b>\n• Tổng số hồ sơ: ${currentLeads.length} khách hàng\n• Thời gian: ${new Date().toLocaleString('vi-VN')}`);
    formData.append('parse_mode', 'HTML');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (data.ok && data.result) {
      // 1. Lưu trực tiếp mã file_id vừa tạo vào máy để nạp tức thì
      if (data.result.document && data.result.document.file_id) {
        try {
          localStorage.setItem('crm_tg_last_file_id', data.result.document.file_id);
        } catch (e) {}
      }

      // 2. Ghim tệp lên đầu kênh Telegram
      if (data.result.message_id) {
        fetch(`https://api.telegram.org/bot${token}/pinChatMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: data.result.message_id,
            disable_notification: true
          })
        }).catch(() => {});
      }

      if (typeof showToast === 'function') showToast(`✓ Đã gửi tệp ${currentLeads.length} hồ sơ lên Telegram thành công!`);
    } else {
      if (typeof showToast === 'function') showToast(`❌ Telegram từ chối: ${data.description || 'Lỗi gửi tệp'}`);
    }
  } catch (err) {
    console.error('Lỗi gửi tệp:', err);
    if (typeof showToast === 'function') showToast('❌ Lỗi kết nối mạng: Không thể gửi tệp lên Telegram!');
  }
}

/**
 * Khôi phục hồ sơ từ Telegram (Tìm tệp ghim trên đầu kênh hoặc mã tệp đã gửi)
 */
async function restoreFromTelegram() {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    if (typeof showToast === 'function') showToast('⚠️ Vui lòng lưu cấu hình Bot Token và Chat ID trước!');
    return;
  }

  if (typeof showToast === 'function') showToast('Đang tìm bản sao lưu từ Telegram...');

  try {
    let targetFileId = null;

    // 1. Tìm tệp đang được GHIM trên đầu kênh
    try {
      const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`);
      const chatData = await chatRes.json();
      if (chatData.ok && chatData.result && chatData.result.pinned_message) {
        const pinDoc = chatData.result.pinned_message.document;
        if (pinDoc && pinDoc.file_id) {
          targetFileId = pinDoc.file_id;
        }
      }
    } catch (chatErr) {
      console.warn('Lỗi đọc getChat:', chatErr);
    }

    // 2. Dự phòng: Đọc mã tệp đã lưu trong máy từ lần gửi gần nhất
    if (!targetFileId) {
      try {
        targetFileId = localStorage.getItem('crm_tg_last_file_id');
      } catch (e) {}
    }

    // 3. Dự phòng: Quét qua getUpdates
    if (!targetFileId) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?allowed_updates=["channel_post","message"]`);
        const d = await res.json();
        if (d.ok && Array.isArray(d.result)) {
          for (let i = d.result.length - 1; i >= 0; i--) {
            const item = d.result[i];
            const msg = item.message || item.channel_post;
            if (msg && msg.document && msg.document.file_id) {
              targetFileId = msg.document.file_id;
              break;
            }
          }
        }
      } catch (updErr) {
        console.warn('Lỗi getUpdates:', updErr);
      }
    }

    if (!targetFileId) {
      if (typeof showToast === 'function') showToast('💡 Hãy bấm [Gửi Lên Kênh] một lần để tạo bản sao lưu!');
      return;
    }

    // Lấy thông tin tệp và link tải trực tiếp từ Telegram
    const fileInfoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${targetFileId}`);
    const fileInfo = await fileInfoRes.json();
    if (!fileInfo.ok || !fileInfo.result || !fileInfo.result.file_path) {
      if (typeof showToast === 'function') showToast('❌ Không lấy được đường dẫn tệp từ Telegram');
      return;
    }

    const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`;
    const contentRes = await fetch(downloadUrl);
    const parsedData = await contentRes.json();

    if (Array.isArray(parsedData) && parsedData.length > 0) {
      leads = parsedData;
      if (typeof saveStorage === 'function') saveStorage();
      if (typeof closeBackupModal === 'function') closeBackupModal();
      if (typeof showToast === 'function') showToast(`✓ Đã nạp thành công ${leads.length} hồ sơ từ Telegram!`);
    } else {
      if (typeof showToast === 'function') showToast('❌ Định dạng tệp không hợp lệ');
    }
  } catch (err) {
    console.error('Lỗi khôi phục:', err);
    if (typeof showToast === 'function') showToast('❌ Lỗi kết nối mạng khi tải bản sao lưu');
  }
}
```eof

---

### Các bước thực hiện:
1. Mở GitHub $\rightarrow$ vào thư mục **`js/`** $\rightarrow$ chọn file **`telegram-service.js`** $\rightarrow$ bấm biểu tượng ✏️.
2. Xóa toàn bộ nội dung cũ và dán toàn bộ đoạn mã trên vào $\rightarrow$ bấm **Commit changes**.
3. Không chỉnh sửa bất kỳ tệp nào khác.
4. Mở lại web CRM trên iPhone:
   * Bấm **Lưu Cấu Hình Kết Nối**: nút sẽ kiểm tra và báo `✓ ĐÃ KẾT NỐI (@tên_bot)!` kèm huy hiệu xanh chuẩn xác.
   * Bấm **🚀 Gửi Lên Kênh** một lần (để bot gửi và ghim tệp lên đỉnh kênh).
   * Bấm **🔄 Nạp Bản Mới Nhất**: bot sẽ đọc ngay tệp ghim trên kênh và nạp dữ liệu thành công!
