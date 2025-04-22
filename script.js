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

  // ✅ Gắn phân trang sau khi bảng đã có dữ liệu
  if (window.rankingDataTable) {
    window.rankingDataTable.destroy(); // Huỷ nếu bảng đã tồn tại
  }
  window.rankingDataTable = new simpleDatatables.DataTable("#rankingTable", {
    perPage: 10,
    perPageSelect: false,
    searchable: false,
    paging: true,
    labels: {
      placeholder: "Tìm kiếm...",
      perPage: "{select} dòng/trang",
      noRows: "Không có dữ liệu",
      info: "Trang {page} / {pages}"
    }
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

// ✅ Tạo mã QR từ Apps Script và hiển thị
document.addEventListener("DOMContentLoaded", () => {
  const canvasEl = document.getElementById("qrCanvas");
  if (canvasEl) {
    window.qrCanvas = new QRious({ element: canvasEl, size: 250 });
  }
});

function taoMaQR() {
  fetch("https://script.google.com/macros/s/AKfycbzgrAJB266q718FuMZG6Cnu5pMFsh6XbnlGD8VTt1pQ4pIfftGcCdyBkoKlxyAvRPxUzw/exec")
    .then(res => res.json())
    .then(data => {
      const link = decodeURIComponent(data.link);
      if (!link) throw new Error("Không có link trả về");
      if (window.qrCanvas) qrCanvas.value = link;

      const maQR = link.split("?tich=")[1];
      document.getElementById("maQRcode").innerText = maQR;
      document.getElementById("maQRcode").dataset.fullLink = link;
    })
    .catch(err => {
      document.getElementById("maQRcode").innerText = "❌ Lỗi kết nối khi tạo mã QR!";
      console.error("Lỗi tạo mã QR:", err);
    });
}

function kiemTraMaQRDaDung() {
  const maQR = document.getElementById("maQRcode").innerText;
  if (!maQR || maQR.includes("Lỗi")) return;

  fetch(`https://script.google.com/macros/s/AKfycbzgrAJB266q718FuMZG6Cnu5pMFsh6XbnlGD8VTt1pQ4pIfftGcCdyBkoKlxyAvRPxUzw/exec?check=1&code=${maQR}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === "USED") {
        console.log("✅ Mã QR đã dùng → tạo mã mới...");
        taoMaQR();
      }
    })
    .catch(err => {
      console.error("Lỗi khi kiểm tra mã QR:", err);
    });
}

setInterval(kiemTraMaQRDaDung, 5000);

function copyLinkQR() {
  const maSpan = document.getElementById("maQRcode");
  const fullLink = maSpan.dataset.fullLink;
  if (!fullLink) {
    alert("❌ Chưa có link QR để sao chép.");
    return;
  }
  navigator.clipboard.writeText(fullLink)
    .then(() => alert("✅ Đã sao chép link QR thành công!"))
    .catch(err => alert("❌ Lỗi khi sao chép: " + err));
}
