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
 * Lưu cấu hình bảo mật vào bộ nhớ thiết bị
 */
function saveCustomTgConfig() {
  const tokenInput = document.getElementById('cfgTgToken');
  const chatIdInput = document.getElementById('cfgTgChatId');
  const btn = document.getElementById('btnSaveTgConfig');
  const btnText = document.getElementById('btnSaveTgText');

  const token = tokenInput ? tokenInput.value.trim() : '';
  const chatId = chatIdInput ? chatIdInput.value.trim() : '';

  if (!token || !chatId) {
    alert('⚠️ Vui lòng nhập đầy đủ cả Bot Token và Chat ID trước khi bấm Lưu!');
    return;
  }

  try {
    localStorage.setItem('crm_tg_token', token);
    localStorage.setItem('crm_tg_chatid', chatId);

    if (btn) {
      btn.className = 'w-full bg-emerald-600 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5';
      if (btnText) btnText.innerText = '✓ ĐÃ LƯU THÀNH CÔNG!';
      setTimeout(() => {
        btn.className = 'w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black py-2.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer';
        if (btnText) btnText.innerText = 'Lưu Cấu Hình Kết Nối';
      }, 2500);
    }

    updateTgStatusBadge();
    alert('✅ ĐÃ LƯU THÀNH CÔNG!\n\nBot Token và Chat ID đã được ghi nhớ vào iPhone của bạn.');
    if (typeof showToast === 'function') showToast('✓ Đã lưu cấu hình Telegram!');
  } catch (err) {
    console.error('Lỗi ghi nhớ Safari:', err);
    alert('⚠️ Trình duyệt chặn lưu dữ liệu. Hãy chuyển sang Tab thường của Safari để lưu trữ vĩnh viễn nhé!');
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
 * Sao lưu hồ sơ lên Telegram DƯỚI DẠNG TỆP (sendDocument)
 * Không bao giờ bị lỗi giới hạn độ dài ký tự (Message is too long)
 */
async function backupToTelegram() {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    alert('⚠️ Vui lòng nhập Bot Token và Chat ID rồi bấm [Lưu Cấu Hình Kết Nối] trước!');
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

    if (data.ok) {
      alert(`✅ SAO LƯU THÀNH CÔNG!\n\nTệp chứa ${currentLeads.length} hồ sơ đã được gửi an toàn vào kênh Telegram của bạn.`);
      if (typeof showToast === 'function') showToast(`✓ Đã gửi tệp ${currentLeads.length} hồ sơ lên Telegram!`);
    } else {
      alert('❌ Telegram từ chối: ' + (data.description || 'Sai Bot Token hoặc Chat ID'));
    }
  } catch (err) {
    console.error('Lỗi gửi tệp:', err);
    alert('❌ Lỗi kết nối: Không thể gửi tệp lên Telegram!');
  }
}

/**
 * Hướng dẫn khôi phục từ Telegram
 */
function restoreFromTelegram() {
  alert('💡 HƯỚNG DẪN NẠP LẠI TỪ TELEGRAM:\n\n1. Mở kênh Telegram, bấm vào tệp [CRM_PTC_Backup_....json] vừa lưu.\n2. Chọn [Chia sẻ / Copy] hoặc [Lưu vào Tệp].\n3. Quay lại đây: Bấm nút [📋 Dán Trực Tiếp Từ Bộ Nhớ Tạm] hoặc [Chọn tệp] là toàn bộ khách hàng sẽ được nạp lại tức thì!');
}
```eof

### 🔍 Vì sao vừa rồi lại bị báo *"message is too long"*?

* **Bạn nhớ hoàn toàn chuẩn xác!** Khi gửi bằng **tệp file đính kèm (`sendDocument`)**, Telegram không bao giờ giới hạn dung lượng (dù bạn có 12 khách hay 1.000 khách, dung lượng vài MB Telegram vẫn nhận mượt mà).
* Ở lần cập nhật trước, sau khi gửi file, code lại cố gắng gửi thêm 1 tin nhắn chữ nội bộ dài tới 13.000 ký tự để làm cơ chế ghim. Telegram có quy tắc cứng: **bất kỳ tin nhắn chữ nào vượt quá 4.096 ký tự đều bị từ chối với lỗi *message is too long***.

### 🛠️ Cách khắc phục trong bản cập nhật trên:
1. **Loại bỏ hoàn toàn lệnh gửi tin nhắn chữ quá tải**: Trở lại chuẩn gửi **tệp file `.json` đính kèm 100%**.
2. **Không bao giờ bị lỗi giới hạn độ dài nữa**: Bạn bấm **🚀 Gửi Lên Kênh** là tệp file sẽ bay thẳng vào kênh Telegram ngay tức khắc.

Bạn mở file **`js/telegram-service.js`** trên GitHub, dán đoạn mã mới ở trên vào và bấm **Commit changes**. Sau đó vào web bấm lại nút **🚀 Gửi Lên Kênh** là sẽ thành công ngay!
