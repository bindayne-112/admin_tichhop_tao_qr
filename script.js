const sheetId    = "1Kgy0J4utlkLnG2LMrjowwcevU7FUsK9V8bquvDHCYLo";
const sheetName  = "TichDiem_OngKoi";
const password   = "Testmkbmok";
// URL Web App Google Apps Script (thay bằng của bạn nếu khác)
const APP_URL    = "https://script.google.com/macros/s/AKfycbzgrAJB266q718FuMZG6Cnu5pMFsh6XbnlGD8VTt1pQ4pIfftGcCdyBkoKlxyAvRPxUzw/exec";

let fullData    = [];
let currentLink = "";

/**
 * Hàm tạo URL qua allorigins để phá CORS
 */
function proxyUrl(url) {
  return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
}

// Giữ trạng thái đăng nhập qua localStorage
if (localStorage.getItem("isLoggedIn") === "true") {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("mainScreen").style.display  = "block";
    loadData();
  });
}

// Xác thực mật khẩu
function checkPassword() {
  const input = document.getElementById("password").value;
  if (input === password) {
    localStorage.setItem("isLoggedIn", "true");
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("mainScreen").style.display  = "block";
    loadData();
  } else {
    document.getElementById("loginError").innerText = "Sai mật khẩu!";
  }
}

// Tải dữ liệu tích điểm từ Google Sheet
function loadData() {
  fetch(`https://opensheet.elk.sh/${sheetId}/${sheetName}`)
    .then(res => res.json())
    .then(data => {
      fullData = data.map(row => {
        let phone = row["SỐ ĐIỆN THOẠI"];
        if (phone && phone.length === 9 && !isNaN(phone)) {
          phone = "0" + phone;
        }
        return { phone, time: row["THỜI GIAN"] };
      }).filter(r => r.phone && r.phone.length === 10 && !isNaN(r.phone));

      renderDataTable(fullData);
      renderRanking(fullData);
    })
    .catch(err => {
      console.error("Lỗi khi tải dữ liệu:", err);
      alert("❌ Không thể tải dữ liệu từ Google Sheet. Vui lòng kiểm tra kết nối.");
    });
}

// Hiển thị bảng danh sách tích điểm
function renderDataTable(data) {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";
  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.phone}</td><td>${row.time}</td>`;
    tbody.appendChild(tr);
  });
  new simpleDatatables.DataTable("#dataTable");
}

// Hiển thị bảng xếp hạng khách
function renderRanking(data) {
  const counts = {};
  data.forEach(r => counts[r.phone] = (counts[r.phone]||0) + 1);
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const tbody  = document.querySelector("#rankingTable tbody");
  tbody.innerHTML = "";
  sorted.forEach(([phone,count],i) => {
    const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${medal}</td><td>${phone}</td><td>${count}</td>`;
    tbody.appendChild(tr);
  });
}

// Lọc theo số điện thoại và khoảng thời gian
function applyFilter() {
  const search = document.getElementById("searchPhone").value;
  const start  = document.getElementById("startDate").value;
  const end    = document.getElementById("endDate").value;
  const filtered = fullData.filter(r => {
    const okPhone = !search || r.phone.includes(search);
    const t       = new Date(r.time);
    const okDate  = (!start || t >= new Date(start)) && (!end || t <= new Date(end));
    return okPhone && okDate;
  });
  renderDataTable(filtered);
  renderRanking(filtered);
}

// Reset bộ lọc
function resetFilter() {
  renderDataTable(fullData);
  renderRanking(fullData);
  document.getElementById("searchPhone").value = "";
  document.getElementById("startDate").value   = "";
  document.getElementById("endDate").value     = "";
}

// Xuất bảng thành file Excel
function exportToExcel() {
  const blob = new Blob(["\ufeff"+document.getElementById("dataTable").outerHTML],
                        { type:"application/vnd.ms-excel" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "TichDiem.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Khởi tạo canvas QRious
document.addEventListener("DOMContentLoaded", () => {
  const c = document.getElementById("qrCanvas");
  if (c) window.qrCanvas = new QRious({ element: c, size: 250 });
});

// 1) Tạo mã QR liên tục (tại quán)
function taoMaQR() {
  fetch(proxyUrl(APP_URL))
    .then(res => res.json())
    .then(data => {
      const link = decodeURIComponent(data.link);
      currentLink = link;
      if (window.qrCanvas) qrCanvas.value = link;
      const code = link.split("?tich=")[1];
      const span = document.getElementById("maQRcode");
      span.innerText        = code;
      span.dataset.fullLink = link;
    })
    .catch(err => {
      const span = document.getElementById("maQRcode");
      span.innerText = "❌ Lỗi kết nối khi tạo mã QR!";
      console.error("Lỗi tạo mã QR:", err);
    });
}

// 2) Tạo hàng loạt QR ngẫu nhiên để in sẵn (mang về nhà)
function taoQRInSan() {
  const soLuong = prompt("Nhập số lượng mã QR muốn tạo để in (ví dụ: 50):", "50");
  if (!soLuong || isNaN(soLuong)) {
    return alert("❌ Vui lòng nhập số hợp lệ!");
  }
  fetch(proxyUrl(`${APP_URL}?action=taoQRInSan&soluong=${soLuong}`))
    .then(res => res.text())
    .then(msg => alert(msg))
    .catch(err => alert("❌ Lỗi khi tạo mã in sẵn: " + err));
}

// 3) Kiểm tra mã QR đã dùng, nếu USED thì tự động tạo mới
function kiemTraMaQRDaDung() {
  const code = document.getElementById("maQRcode").innerText;
  if (!code || code.includes("Lỗi")) return;
  fetch(proxyUrl(`${APP_URL}?check=1&code=${code}`))
    .then(res => res.json())
    .then(d => {
      if (d.status === "USED") {
        console.log("🔄 Mã QR đã dùng, sinh lại...");
        taoMaQR();
      }
    })
    .catch(err => console.error("Lỗi khi kiểm tra mã QR:", err));
}
setInterval(kiemTraMaQRDaDung, 5000);

// 4) Sao chép link QR (fullLink) vào clipboard
function copyLinkQR() {
  if (!currentLink) {
    return alert("❌ Chưa có link QR để sao chép.");
  }
  navigator.clipboard.writeText(currentLink)
    .then(() => alert("✅ Đã sao chép link QR thành công!"))
    .catch(err => alert("❌ Lỗi khi sao chép: " + err));
}
