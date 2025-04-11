function submitData() {
  const phone = document.getElementById('phone').value;
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('tich'); // Lấy mã QR từ URL

  if (!phone.trim()) {
    alert('Vui lòng nhập số điện thoại!');
    return;
  }

  // Gửi dữ liệu số điện thoại và mã QR về Google Sheets hoặc backend
  fetch("https://script.google.com/macros/s/AKfycbzVi0cF3B9fVWRCnsImD_clPLBZF0Yky-BlgSoSXTus7P2sBwupl-iQGqZlqFxAySKnww/exec", {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "phone=" + encodeURIComponent(phone) + "&code=" + encodeURIComponent(code)  // Thêm mã QR vào gửi đi
  })
  .then(() => {
    document.getElementById('result').innerText = "✅ Tích điểm thành công!";
  })
  .catch(() => {
    document.getElementById('result').innerText = "❌ Không thể kết nối. Thử lại sau.";
  });
}
