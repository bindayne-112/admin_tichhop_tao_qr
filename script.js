const sheetId = "1Kgy0J4utlkLnG2LMrjowwcevU7FUsK9V8bquvDHCYLo";
const sheetName = "TichDiem_OngKoi";
const password = "Testmkbmok";
let fullData = [];

if (localStorage.getItem("isLoggedIn") === "true") {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("mainScreen").style.display = "block";
    loadData();
  });
}

function checkPassword() {
  const input = document.getElementById("password").value;
  if (input === password) {
    localStorage.setItem("isLoggedIn", "true");
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("mainScreen").style.display = "block";
    loadData();
  } else {
    document.getElementById("loginError").innerText = "Sai mật khẩu!";
  }
}

function loadData() {
  fetch(`https://opensheet.elk.sh/${sheetId}/${sheetName}`)
    .then(res => res.json())
    .then(data => {
      fullData = data.map(row => {
        let phone = row["SỐ ĐIỆN THOẠI"];
        if (phone && phone.length === 9 && !isNaN(phone)) {
          phone = "0" + phone;
        }
        return {
          phone,
          time: row["THỜI GIAN"]
        };
      }).filter(row => row.phone && row.phone.length === 10 && !isNaN(row.phone));

      renderDataTable(fullData);
      renderRanking(fullData);
    })
    .catch(err => {
      console.error("Lỗi khi tải dữ liệu:", err);
      alert("❌ Không thể tải dữ liệu từ Google Sheet. Vui lòng kiểm tra kết nối.");
    });
}

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

function renderRanking(data) {
  const counts = {};
  data.forEach(row => {
    counts[row.phone] = (counts[row.phone] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const tbody = document.querySelector("#rankingTable tbody");
  tbody.innerHTML = "";

  sorted.forEach(([phone, count], index) => {
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${medal}</td><td>${phone}</td><td>${count}</td>`;
    tbody.appendChild(tr);
  });
}

function applyFilter() {
  const search = document.getElementById("searchPhone").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const filtered = fullData.filter(row => {
    const matchPhone = search === "" || row.phone.includes(search);
    const matchDate = (!start || new Date(row.time) >= new Date(start)) &&
                      (!end || new Date(row.time) <= new Date(end));
    return matchPhone && matchDate;
  });
  renderDataTable(filtered);
  renderRanking(filtered);
}

function resetFilter() {
  renderDataTable(fullData);
  renderRanking(fullData);
  document.getElementById("searchPhone").value = "";
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
}

function exportToExcel() {
  const table = document.getElementById("dataTable").outerHTML;
  const blob = new Blob(["\ufeff" + table], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "TichDiem.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ✅ Khởi tạo QR Canvas
document.addEventListener("DOMContentLoaded", () => {
  const canvasEl = document.getElementById("qrCanvas");
  if (canvasEl) {
    window.qrCanvas = new QRious({ element: canvasEl, size: 250 });
  }
});

// ✅ Tạo mã QR mới (dùng proxy ổn định)
function taoMaQR() {
  const url = "https://script.google.com/macros/s/AKfycbzgrAJB266q718FuMZG6Cnu5pMFsh6XbnlGD8VTt1pQ4pIfftGcCdyBkoKlxyAvRPxUzw/exec";
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

  fetch(proxy)
    .then(res => res.ok ? res.json() : Promise.reject("Lỗi proxy"))
    .then(({ contents }) => {
      const data = JSON.parse(contents);
      const link = decodeURIComponent(data.link || "");
      if (!link) throw new Error("Không có link trả về");
      if (window.qrCanvas) qrCanvas.value = link;
      document.getElementById("codeDisplay").innerText = `Link QR: ${link}`;
    })
    .catch(err => {
      console.error("Lỗi tạo mã QR:", err);
      document.getElementById("codeDisplay").innerText = "❌ Lỗi khi tạo mã QR!";
    });
}

// ✅ Tự động kiểm tra mã QR đã dùng → tạo mã mới
function kiemTraMaQRDaDung() {
  const codeText = document.getElementById("codeDisplay").innerText;
  const match = codeText.match(/\?tich=([\w-]+)/);
  if (!match) return;

  const maQR = match[1];
  const checkUrl = `https://script.google.com/macros/s/AKfycbzgrAJB266q718FuMZG6Cnu5pMFsh6XbnlGD8VTt1pQ4pIfftGcCdyBkoKlxyAvRPxUzw/exec?check=1&code=${maQR}`;
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(checkUrl)}`;

  fetch(proxy)
    .then(res => res.ok ? res.json() : Promise.reject("Lỗi proxy kiểm tra"))
    .then(({ contents }) => {
      const data = JSON.parse(contents);
      if (data.status === "USED") {
        console.log("✅ Mã QR đã dùng → tạo mã mới...");
        taoMaQR();
      }
    })
    .catch(err => {
      console.error("Lỗi kiểm tra mã QR:", err);
    });
}

// ✅ Tự động kiểm tra mỗi 5 giây
setInterval(kiemTraMaQRDaDung, 5000);
