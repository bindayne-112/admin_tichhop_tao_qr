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
    const phone = row.phone;
    counts[phone] = (counts[phone] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
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
  const blob = new Blob(["﻿" + table], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "TichDiem.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Tạo mã QR
const qrCanvas = new QRious({ element: document.getElementById("qrCanvas"), size: 250 });

function taoMaQR() {
  const code = "KM" + Math.floor(1000 + Math.random() * 9000);
  const link = `https://banhmi.web.app?tich=${code}`;
  qrCanvas.value = link;
  document.getElementById("codeDisplay").innerText = `Link QR: ${link}`;
}