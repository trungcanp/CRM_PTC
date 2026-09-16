// js/qr-service.js
function convertDateToIso(dStr) {
  if (!dStr || dStr.length !== 8) return '';
  return `${dStr.substring(4, 8)}-${dStr.substring(2, 4)}-${dStr.substring(0, 2)}`;
}

function isDateString(str) {
  if (!/^\d{8}$/.test(str)) return false;
  const d = parseInt(str.substring(0, 2), 10);
  const m = parseInt(str.substring(2, 4), 10);
  const y = parseInt(str.substring(4, 8), 10);
  return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100;
}

function parseQrText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    if (typeof showToast === 'function') showToast('Dữ liệu quét không hợp lệ!');
    return;
  }
  const parts = rawText.trim().split('|').map(p => p.trim());
  let cccd = '', oldCmnd = '', fullName = '', dobIso = '', gender = 'Nam', address = '';

  if (parts.length >= 5) {
    cccd = parts[0];
    if (/^\d{9}$/.test(parts[1])) {
      oldCmnd = parts[1];
      fullName = parts[2] || '';
      if (isDateString(parts[3])) dobIso = convertDateToIso(parts[3]);
      if (parts[4]) gender = parts[4].toLowerCase().includes('nữ') ? 'Nữ' : 'Nam';
      address = parts[5] || '';
    } else {
      oldCmnd = '';
      fullName = parts[1] === '' ? (parts[2] || '') : parts[1];
      const datePart = parts[1] === '' ? parts[3] : parts[2];
      const genderPart = parts[1] === '' ? parts[4] : parts[3];
      const addrPart = parts[1] === '' ? parts[5] : parts[4];
      if (isDateString(datePart)) dobIso = convertDateToIso(datePart);
      if (genderPart) gender = genderPart.toLowerCase().includes('nữ') ? 'Nữ' : 'Nam';
      address = addrPart || '';
    }
  } else {
    cccd = rawText.trim();
  }

  if (typeof closeScanModal === 'function') closeScanModal();
  if (typeof openCreateModal === 'function') openCreateModal();

  if (document.getElementById('formCccd')) document.getElementById('formCccd').value = cccd;
  if (document.getElementById('formOldCmnd')) document.getElementById('formOldCmnd').value = oldCmnd;
  if (document.getElementById('formName')) document.getElementById('formName').value = fullName;
  if (document.getElementById('formDob') && dobIso) document.getElementById('formDob').value = dobIso;
  if (document.getElementById('formGender')) document.getElementById('formGender').value = gender;
  if (document.getElementById('formPermAddress')) document.getElementById('formPermAddress').value = address;
  if (document.getElementById('formTempAddress') && address) document.getElementById('formTempAddress').value = 'Thường Trú';

  if (typeof showToast === 'function') showToast(`Đã nhận: ${fullName || cccd}`);
}

function checkIncomingQrData() {
  let rawData = '';
  if (window.location.hash.includes('qr=')) {
    const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    rawData = p.get('qr');
  } else if (window.location.search.includes('qr=')) {
    const p = new URLSearchParams(window.location.search);
    rawData = p.get('qr');
  }
  if (rawData) {
    try {
      parseQrText(decodeURIComponent(rawData));
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) { console.error(e); }
  }
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      if (typeof showToast === 'function') showToast('Bộ nhớ tạm đang rỗng!');
      return;
    }
    parseQrText(text.trim());
  } catch (err) {
    if (typeof showToast === 'function') showToast('Vui lòng cấp quyền dán bộ nhớ tạm');
  }
}

window.addEventListener('DOMContentLoaded', checkIncomingQrData);
window.addEventListener('hashchange', checkIncomingQrData);
