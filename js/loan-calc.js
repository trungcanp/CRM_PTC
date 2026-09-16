// js/loan-calc.js
function formatVND(num) {
  return num ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num) : '0 đ';
}

function parseNumeric(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseInt(String(val).replace(/[^0-9]/g, ''), 10) || 0;
}

function calcAge(dob) {
  if (!dob) return 25;
  const b = new Date(dob), t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a >= 0 ? a : 25;
}

function addMonthsSafely(baseDate, monthsToAdd) {
  const d = new Date(baseDate);
  const targetDay = d.getDate();
  d.setMonth(d.getMonth() + monthsToAdd);
  if (d.getDate() !== targetDay) {
    d.setDate(0); // Lùi về ngày cuối tháng hợp lệ
  }
  return d;
}

function calcPayDates(disburseDateStr, tenorMonths) {
  if (!disburseDateStr) return { first: '---', last: '---' };
  const disburse = new Date(disburseDateStr);
  if (isNaN(disburse.getTime())) return { first: '---', last: '---' };

  const tenor = Number(tenorMonths) || 12;
  const first = addMonthsSafely(disburse, 1);
  const last = addMonthsSafely(disburse, tenor);

  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return { first: fmt(first), last: fmt(last) };
}
