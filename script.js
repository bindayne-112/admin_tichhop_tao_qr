const sheetId    = "1Kgy0J4utlkLnG2LMrjowwcevU7FUsK9V8bquvDHCYLo";
const sheetName  = "TichDiem_OngKoi";
const password   = "Testmkbmok";
// URL Web App Google Apps Script
const APP_URL    = "https://script.google.com/macros/s/AKfycbzgrAJB266q718FuMZG6Cnu5pMFsh6XbnlGD8VTt1pQ4pIfftGcCdyBkoKlxyAvRPxUzw/exec";

let fullData    = [];
let currentLink = "";

/**
 * Hàm proxy qua corsproxy.io để phá CORS
 * Ví dụ: corsproxy.io/?<ENCODED_URL>
 */
function proxyUrl(url) {
  return "https://corsproxy.io/?" + encodeURIComponent(url);
}

// Giữ trạng thái đăng nhập
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

// Tải dữ liệu từ Google Sheet
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
      alert("❌ Không thể tải dữ liệu từ Google Sheet.");
    });
}

// Hiển thị bảng tích điểm
function renderDataTable(data) {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";
  data.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.phone}</td><td>${r.time}</td>`;
    tbody.appendChild(tr);
  });
  new simpleDatatables.DataTable("#dataTable");
}

// Hiển thị bảng xếp hạng
function renderRanking(data) {
  const cnt = {};
  data.forEach(r => cnt[r.phone] = (cnt[r.phone]||0) + 1);
  const sorted = Object.entries(cnt).sort((a,b)=>b[1]-a[1]);
  const tbody  = document.querySelector("#rankingTable tbody");
  tbody.innerHTML = "";
  sorted.forEach(([phone,count], i) => {
    const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${medal}</td><td>${phone}</td><td>${count}</td>`;
    tbody.appendChild(tr);
  });
}

// Hàm lọc
function applyFilter() {
  const s = document.getElementById("searchPhone").value;
  const st= document.getElementById("startDate").value;
  const en= document.getElementById("endDate").value;
  const filtered = fullData.filter(r => {
    const okP = !s || r.phone.includes(s);
    const t   = new Date(r.time);
    const okD = (!st || t>=new Date(st)) && (!en || t<=new Date(en));
    return okP && okD;
  });
  renderDataTable(filtered);
  renderRanking(filtered);
}

// Reset lọc
function resetFilter() {
  renderDataTable(fullData);
  renderRanking(fullData);
  document.getElementById("searchPhone").value = "";
  document.getElementById("startDate").value   = "";
  document.getElementById("endDate").value     = "";
}

// Xuất Excel
function exportToExcel() {
  const blob = new Blob(["\ufeff"+document.getElementById("dataTable").outerHTML],
                        {type:"application/vnd.ms-excel"});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url; a.download="TichDiem.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Khởi tạo QRious
document.addEventListener("DOMContentLoaded", () => {
  const c = document.getElementById("qrCanvas");
  if (c) window.qrCanvas = new QRious({ element: c, size: 250 });
});

// 1) Sinh mã QR liên tục
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
      console.error(err);
    });
}

// 2) Sinh hàng loạt QR in sẵn
function taoQRInSan() {
  const n = prompt("Nhập số lượng QR cần tạo (vd:50):","50");
  if (!n||isNaN(n)) return alert("❌ Số không hợp lệ!");
  fetch(proxyUrl(`${APP_URL}?action=taoQRInSan&soluong=${n}`))
    .then(res => res.text())
    .then(msg => alert(msg))
    .catch(err => alert("❌ Lỗi tạo QR in sẵn: "+err));
}

// 3) Kiểm tra QR đã dùng
function kiemTraMaQRDaDung() {
  const code = document.getElementById("maQRcode").innerText;
  if (!code || code.includes("❌")) return;
  fetch(proxyUrl(`${APP_URL}?check=1&code=${code}`))
    .then(res => res.json())
    .then(d => {
      if (d.status === "USED") taoMaQR();
    })
    .catch(err => console.error(err));
}
setInterval(kiemTraMaQRDaDung, 5000);

// 4) Sao chép link
function copyLinkQR() {
  if (!currentLink) return alert("❌ Chưa có link!");
  navigator.clipboard.writeText(currentLink)
    .then(()=>alert("✅ Đã sao chép link!"))
    .catch(e=>alert("❌ Copy lỗi: "+e));
}
