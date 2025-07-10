(function() {
  // --- CÀI ĐẶT & BIẾN TOÀN CỤC ---
  const CONFIG = {
    sheetId: "1Kgy0J4utlkLnG2LMrjowwcevU7FUsK9V8bquvDHCYLo",
    sheetName: "TichDiem_OngKoi",
    password: "Testmkbmok",
    qrCheckInterval: 5000,
    qrApiUrl: "https://script.google.com/macros/s/AKfycbzgrAJB266q718FuMZG6Cnu5pMFsh6XbnlGD8VTt1pQ4pIfftGcCdyBkoKlxyAvRPxUzw/exec",
    rankingLimit: 10,
    professionalBaseUrl: "https://banhmiongkoi.com/"
  };

  const DOMElements = {
    loginScreen: document.getElementById("loginScreen"),
    mainScreen: document.getElementById("mainScreen"),
    passwordInput: document.getElementById("password"),
    loginButton: document.getElementById("loginButton"),
    loginError: document.getElementById("loginError"),
    dataTableBody: document.querySelector("#dataTable tbody"),
    rankingTableBody: document.querySelector("#rankingTable tbody"),
    rankingTitle: document.getElementById("rankingTitle"),
    searchPhone: document.getElementById("searchPhone"),
    startDate: document.getElementById("startDate"),
    endDate: document.getElementById("endDate"),
    filterButton: document.getElementById("filterButton"),
    resetButton: document.getElementById("resetButton"),
    exportButton: document.getElementById("exportButton"),
    refreshButton: document.getElementById("refreshButton"),
    taoMaQRButton: document.getElementById("taoMaQRButton"),
    copyLinkQRButton: document.getElementById("copyLinkQRButton"),
    qrCanvas: document.getElementById("qrCanvas"),
    qrCodeInfo: document.getElementById("qrCodeInfo"),
    maQRcode: document.getElementById("maQRcode"),
    toastContainer: document.getElementById("toast-container"),
    historyModal: document.getElementById("historyModal"),
    modalTitle: document.getElementById("modalTitle"),
    modalHistoryBody: document.querySelector("#modalHistoryTable tbody"),
    modalCloseBtn: document.querySelector(".modal-close")
  };

  let fullData = [];
  let dataTableInstance = null;
  let qrCheckTimer = null;
  let qrCanvasInstance = null;

  // --- HÀM KHỞI TẠO & SỰ KIỆN ---
  document.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    setupEventListeners();
    qrCanvasInstance = new QRious({ element: DOMElements.qrCanvas, size: 250 });
    if (localStorage.getItem("isLoggedIn") === "true") showMainScreen();
  }

  function setupEventListeners() {
    DOMElements.loginButton.addEventListener("click", checkPassword);
    DOMElements.passwordInput.addEventListener("keypress", (e) => { if (e.key === "Enter") checkPassword(); });
    DOMElements.filterButton.addEventListener("click", applyFilter);
    DOMElements.resetButton.addEventListener("click", resetFilter);
    DOMElements.exportButton.addEventListener("click", exportToExcel);
    DOMElements.refreshButton.addEventListener("click", () => loadData(true));
    DOMElements.taoMaQRButton.addEventListener("click", taoMaQR);
    DOMElements.copyLinkQRButton.addEventListener("click", copyLinkQR);
    DOMElements.modalCloseBtn.addEventListener("click", () => DOMElements.historyModal.style.display = "none");
    window.addEventListener("click", (e) => { if (e.target == DOMElements.historyModal) DOMElements.historyModal.style.display = "none"; });
    DOMElements.dataTableBody.addEventListener("click", handleTableClick);
    DOMElements.rankingTableBody.addEventListener("click", handleTableClick);
  }

  // --- XỬ LÝ ĐĂNG NHẬP ---
  function checkPassword() {
    if (DOMElements.passwordInput.value === CONFIG.password) {
      localStorage.setItem("isLoggedIn", "true");
      showMainScreen();
    } else {
      DOMElements.loginError.innerText = "Sai mật khẩu!";
    }
  }

  function showMainScreen() {
    DOMElements.loginScreen.style.display = "none";
    DOMElements.mainScreen.style.display = "block";
    loadData();
    taoMaQR();
  }
  
  // --- XỬ LÝ DỮ LIỆU ---
  async function loadData(isRefresh = false) {
    toggleButtonLoading(DOMElements.refreshButton, true);
    if(isRefresh) showToast("Đang cập nhật dữ liệu mới nhất...", "info");
    try {
      const res = await fetch(`https://opensheet.elk.sh/${CONFIG.sheetId}/${CONFIG.sheetName}?${new Date().getTime()}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      fullData = data.map(row => ({
        phone: ("0" + (row["SỐ ĐIỆN THOẠI"]?.toString().trim() || "")).slice(-10),
        time: row["THỜI GIAN"]
      })).filter(row => row.phone.length === 10 && /^\d+$/.test(row.phone) && row.time);

      const parseDate = (dateString) => {
          try {
              const [datePart, timePart] = dateString.split(' ');
              const [day, month, year] = datePart.split('/');
              return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart || '00:00:00'}`);
          } catch (e) { return new Date(0); }
      };
      fullData.sort((a, b) => parseDate(b.time) - parseDate(a.time));

      renderUI(fullData);
      if(isRefresh) showToast("Dữ liệu đã được làm mới!", "success");
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
      showToast("Không thể tải dữ liệu. Vui lòng thử lại.", "error");
    } finally {
        toggleButtonLoading(DOMElements.refreshButton, false);
    }
  }

  function renderUI(data) {
    renderDataTable(data);
    renderRanking(data);
  }

  function renderDataTable(data) {
    if (dataTableInstance) dataTableInstance.destroy();
    const fragment = document.createDocumentFragment();
    data.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><span class="clickable-phone" data-phone="${row.phone}">${row.phone}</span></td><td>${row.time}</td>`;
      fragment.appendChild(tr);
    });
    DOMElements.dataTableBody.replaceChildren(fragment);
    dataTableInstance = new simpleDatatables.DataTable("#dataTable");
  }

  function renderRanking(data) {
    DOMElements.rankingTitle.innerText = `🏆 Bảng xếp hạng (Top ${CONFIG.rankingLimit})`;
    const counts = data.reduce((acc, row) => {
      acc[row.phone] = (acc[row.phone] || 0) + 1;
      return acc;
    }, {});
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topRanking = sorted.slice(0, CONFIG.rankingLimit);
    
    const fragment = document.createDocumentFragment();
    topRanking.forEach(([phone, count], index) => {
      const rank = index + 1;
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
      const tr = document.createElement("tr");
      if (rank <= 3) tr.classList.add(`rank-${rank}`);
      tr.innerHTML = `<td>${medal}</td><td><span class="clickable-phone" data-phone="${phone}">${phone}</span></td><td>${count}</td>`;
      fragment.appendChild(tr);
    });
    DOMElements.rankingTableBody.replaceChildren(fragment);
  }

  function applyFilter() {
    const search = DOMElements.searchPhone.value.trim();
    const start = DOMElements.startDate.value;
    const end = DOMElements.endDate.value;
    
    const filtered = fullData.filter(row => {
      const matchPhone = !search || row.phone.includes(search);
      try {
        const rowDate = new Date(row.time.split(" ")[0].split("/").reverse().join("-") + "T" + row.time.split(" ")[1]);
        const startDate = start ? new Date(start) : null;
        const endDate = end ? new Date(end) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);
        const matchDate = (!startDate || rowDate >= startDate) && (!endDate || rowDate <= endDate);
        return matchPhone && matchDate;
      } catch(e) { return matchPhone; }
    });
    renderUI(filtered);
  }

  function resetFilter() {
    DOMElements.searchPhone.value = "";
    DOMElements.startDate.value = "";
    DOMElements.endDate.value = "";
    renderUI(fullData);
  }

  function exportToExcel() {
    const table = document.getElementById("dataTable");
    const tableHTML = table.outerHTML.replace(/ /g, '%20');
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = 'data:application/vnd.ms-excel,' + tableHTML;
    downloadLink.download = 'LichSuTichDiem.xls';
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  // --- XỬ LÝ MÃ QR ---
  async function taoMaQR() {
    if (qrCheckTimer) clearInterval(qrCheckTimer);

    toggleButtonLoading(DOMElements.taoMaQRButton, true, "Đang tạo...");
    try {
        const res = await fetch(CONFIG.qrApiUrl);
        if (!res.ok) throw new Error("Lỗi mạng khi tạo mã.");
        const data = await res.json();
        const originalLink = decodeURIComponent(data.link);
        const maQR = originalLink.split("?tich=")[1] || null;
        if (!maQR) throw new Error("Không thể trích xuất mã từ API.");
        
        const professionalLink = `${CONFIG.professionalBaseUrl}?tich=${maQR}`;

        qrCanvasInstance.value = professionalLink;
        DOMElements.maQRcode.innerText = maQR;
        DOMElements.maQRcode.dataset.fullLink = professionalLink;
        DOMElements.qrCodeInfo.style.display = "block";
        
        qrCheckTimer = setInterval(kiemTraMaQRDaDung, CONFIG.qrCheckInterval);
    } catch(err) {
        showToast(err.message || "Lỗi tạo mã QR!", "error");
    } finally {
        toggleButtonLoading(DOMElements.taoMaQRButton, false, "Tạo mã QR mới");
    }
  }
  
  async function kiemTraMaQRDaDung() {
    const maQR = DOMElements.maQRcode.innerText;
    if (!maQR || maQR.includes("Lỗi") || maQR.includes("N/A")) return;
    
    try {
        const res = await fetch(`${CONFIG.qrApiUrl}?check=1&code=${maQR}&t=${new Date().getTime()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "USED") {
            console.log("✅ Mã QR đã dùng → Tự động tạo mã mới...");
            showToast("Mã QR đã được sử dụng. Đang tạo mã mới...", "info");
            await taoMaQR();
        }
    } catch(err) {
        console.error("Lỗi khi kiểm tra mã QR:", err);
    }
  }

  // --- HÀM TIỆN ÍCH ---
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    DOMElements.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 10);
  }
  
  function toggleButtonLoading(button, isLoading, loadingText = "...") {
      button.disabled = isLoading;
      if (isLoading) {
          button.dataset.originalText = button.innerHTML;
          button.innerHTML = loadingText;
      } else {
          button.innerHTML = button.dataset.originalText || "Làm mới dữ liệu";
      }
  }

  function handleTableClick(event) {
      const target = event.target;
      if (target && target.classList.contains('clickable-phone')) {
          const phone = target.dataset.phone;
          showCustomerHistory(phone);
      }
  }

  function showCustomerHistory(phone) {
      const history = fullData.filter(row => row.phone === phone);
      DOMElements.modalTitle.innerText = `Lịch sử của SĐT: ${phone}`;
      
      const fragment = document.createDocumentFragment();
      history.forEach(row => {
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${row.time}</td>`;
          fragment.appendChild(tr);
      });
      DOMElements.modalHistoryBody.replaceChildren(fragment);
      DOMElements.historyModal.style.display = "block";
  }
  
  function copyLinkQR() {
    const fullLink = DOMElements.maQRcode.dataset.fullLink;
    if (!fullLink) {
      showToast("Chưa có link QR để sao chép.", "error");
      return;
    }
    const textArea = document.createElement("textarea");
    textArea.value = fullLink;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast("Đã sao chép link QR!", "success");
    } catch (err) {
      showToast("Lỗi khi sao chép: " + err, "error");
    }
    document.body.removeChild(textArea);
  }
})();
