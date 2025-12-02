/* ========== 菜單資料 ========== */
const categories = ["調酒", "純飲", "shot", "咖啡", "飲料", "燒烤", "主餐", "甜點", "其他"];
const menuData = {
    "調酒": [{ name: "莫希托", price: 250 }, { name: "瑪格麗特", price: 260 }],
    "純飲": [{ name: "琴酒", price: 180 }, { name: "威士忌", price: 220 }],
    "shot": [{ name: "龍舌蘭Shot", price: 120 }, { name: "伏特加Shot", price: 110 }],
    "咖啡": [{ name: "美式", price: 90 }, { name: "拿鐵", price: 120 }],
    "飲料": [{ name: "可樂", price: 40 }, { name: "氣泡水", price: 50 }],
    "燒烤": [{ name: "牛串燒", price: 160 }, { name: "豬五花", price: 130 }],
    "主餐": [{ name: "肋眼牛排", price: 680 }, { name: "白酒燉飯", price: 260 }],
    "甜點": [{ name: "起司蛋糕", price: 120 }],
    "其他": [{ name: "服務費", price: 100 }]
};
const tables = [
    "吧檯1", "吧檯2", "吧檯3", "吧檯4", "吧檯5", 
    "圓桌1", "圓桌2", "六人桌", "四人桌1", "四人桌2", "大理石桌1",
    "備用1", "備用2", "備用3", "備用4"
];

/* ========== 全域變數 ========== */
let selectedTable = null;
let cart = []; 
let historyOrders = JSON.parse(localStorage.getItem("orderHistory") || "[]");
let tableTimers = JSON.parse(localStorage.getItem("tableTimers") || "{}");
let tableCarts = JSON.parse(localStorage.getItem("tableCarts") || "{}");
let tableStatuses = JSON.parse(localStorage.getItem("tableStatuses") || "{}");
let tableCustomers = JSON.parse(localStorage.getItem("tableCustomers") || "{}");

let seatTimerInterval = null;

/* DOM 元素 */
const menuGrid = document.getElementById("menuGrid");
const cartList = document.getElementById("cart-list");
const totalText = document.getElementById("total");
const historyBox = document.getElementById("history-box");
const custNameInput = document.getElementById("custName");
const custPhoneInput = document.getElementById("custPhone");
const summaryModal = document.getElementById("summaryModal");

/* ========== 1. 系統與初始化 ========== */
setInterval(updateSystemTime, 1000);

function updateSystemTime() {
    let now = new Date();
    // 強制 24 小時制
    let timeStr = now.toLocaleString('zh-TW', { hour12: false });
    document.getElementById("systemTime").innerText = "🕒 " + timeStr;
}

function hideAll() {
    ["home", "orderPage", "historyPage", "tableSelect"].forEach(id => {
        document.getElementById(id).style.display = "none";
    });
    if(seatTimerInterval) clearInterval(seatTimerInterval);
}

function openPage(pageId) {
    hideAll();
    document.getElementById(pageId).style.display = "block";
    if(pageId === 'historyPage') {
        showHistory();
    }
}

function goHome() {
    hideAll();
    document.getElementById("home").style.display = "grid";
}

/* ========== 2. 座位選擇 ========== */
function openTableSelect() {
    hideAll();
    document.getElementById("tableSelect").style.display = "block";
    let grid = document.getElementById("tableSelectGrid");
    grid.innerHTML = "";
    
    tables.forEach(t => {
        let btn = document.createElement("div");
        btn.className = "tableBtn";
        
        let status = tableStatuses[t]; 
        
        if (status === 'red') {
            btn.classList.add("status-red");
            btn.innerHTML = `<b>${t}</b>`; 
        } else if (status === 'yellow') {
            btn.classList.add("status-yellow");
            btn.innerHTML = `<b>${t}</b>`;
        } else {
            btn.classList.add("status-white");
            btn.innerHTML = `<b>${t}</b><br><span style="font-size:14px; color:#666;">(空桌)</span>`;
        }
        btn.onclick = () => openOrderPage(t);
        grid.appendChild(btn);
    });
}

/* ========== 3. 點餐頁 & 客人資訊 ========== */
function openOrderPage(table) {
    selectedTable = table;
    document.getElementById("seatLabel").innerHTML = "（" + table + "）";
    hideAll();
    document.getElementById("orderPage").style.display = "block";
    
    // 啟動計時
    if (!tableTimers[table]) {
        tableTimers[table] = Date.now();
        localStorage.setItem("tableTimers", JSON.stringify(tableTimers));
    }
    startSeatTimerDisplay();

    // 載入購物車
    cart = tableCarts[table] || [];
    
    // 載入客人資訊
    let info = tableCustomers[table] || {name:"", phone:""};
    custNameInput.value = info.name;
    custPhoneInput.value = info.phone;

    buildCategories();
    renderCart();
}

function autoSaveCustomerInfo() {
    let name = custNameInput.value;
    let phone = custPhoneInput.value;
    tableCustomers[selectedTable] = { name, phone };
    localStorage.setItem("tableCustomers", JSON.stringify(tableCustomers));
}

function startSeatTimerDisplay() {
    updateSeatTimerText();
    seatTimerInterval = setInterval(updateSeatTimerText, 1000);
}
function updateSeatTimerText() {
    let startTime = tableTimers[selectedTable];
    if(!startTime) return;
    let diff = Math.floor((Date.now() - startTime) / 1000);
    let h = Math.floor(diff / 3600).toString().padStart(2,'0');
    let m = Math.floor((diff % 3600) / 60).toString().padStart(2,'0');
    let s = (diff % 60).toString().padStart(2,'0');
    document.getElementById("seatTimer").innerText = `⏳ 已入座：${h}:${m}:${s}`;
}

/* ========== 4. 按鈕邏輯 ========== */
function saveAndExit(){
    let hasInfo = custNameInput.value || custPhoneInput.value;
    if(cart.length > 0 || hasInfo) {
        saveCartToStorage();
        setStatus(selectedTable, 'red'); 
    } else {
        if(tableStatuses[selectedTable] === 'red'){
             delete tableStatuses[selectedTable];
             delete tableTimers[selectedTable];
             delete tableCustomers[selectedTable];
             saveAllStorage();
        }
    }
    openTableSelect();
}

function saveOrderManual() {
    if (cart.length === 0) return alert("購物車是空的，無法送單。");
    saveCartToStorage();
    setStatus(selectedTable, 'yellow'); 
    alert(`✔ ${selectedTable} 訂單已確認，進入用餐模式。`);
    openTableSelect();
}

function checkout() {
    if (cart.length === 0) {
        if(!confirm("購物車是空的，確定要直接清桌嗎？")) return;
    } else {
        if(!confirm(`總金額 $${totalText.innerText.replace("總金額：","").replace(" 元","")}，確定結帳？`)) return;
    }
    
    // 紀錄今日訂單
    if(cart.length > 0){
        // ✨ 強制使用 24 小時制紀錄時間
        let time = new Date().toLocaleString('zh-TW', { hour12: false });
        let total = cart.reduce((a, b) => a + b.price, 0);
        let info = tableCustomers[selectedTable] || {name:"", phone:""};

        historyOrders.push({
            seat: selectedTable,
            time: time,
            items: [...cart],
            total: total,
            customerName: info.name,
            customerPhone: info.phone
        });
        localStorage.setItem("orderHistory", JSON.stringify(historyOrders));
    }
    
    // 清除該桌資料
    delete tableCarts[selectedTable];
    delete tableTimers[selectedTable];
    delete tableStatuses[selectedTable];
    delete tableCustomers[selectedTable];

    saveAllStorage();

    alert(`💰 ${selectedTable} 結帳完成！座位變回空桌。`);
    cart = [];
    openTableSelect();
}

/* ========== 5. 日結功能 ========== */

function closeBusiness() {
    let activeTables = Object.values(tableStatuses).filter(s => s === 'yellow').length;
    if(activeTables > 0){
        if(!confirm(`⚠️ 注意：還有 ${activeTables} 桌正在用餐中。\n確定要現在進行日結嗎？`)){
            return;
        }
    }

    if (!confirm("確定要【結束營業】並進行今日結算嗎？")) return;

    let totalRevenue = historyOrders.reduce((acc, curr) => acc + curr.total, 0);
    let totalCount = historyOrders.length;

    document.getElementById("sumCount").innerText = totalCount + " 單";
    document.getElementById("sumTotal").innerText = "$" + totalRevenue;
    summaryModal.style.display = "flex";
}

function closeSummaryModal() {
    summaryModal.style.display = "none";
}

function confirmClearData() {
    localStorage.removeItem("orderHistory");
    historyOrders = [];
    closeSummaryModal();
    showHistory(); 
    alert("✅ 日結完成！今日營收已歸零，準備迎接新的一天。");
}

/* ========== 6. 今日訂單列表 (含刪除單筆) ========== */
function showHistory() {
    historyBox.innerHTML = "";
    let orders = [...historyOrders].reverse();

    if(orders.length === 0) {
        historyBox.innerHTML = "<div style='padding:20px;color:#888;'>今日尚無訂單</div>";
        return;
    }

    orders.forEach((o, index) => {
        let seq = historyOrders.length - index;
        let custInfo = (o.customerName || o.customerPhone) 
            ? `<span style="color:#007bff; font-weight:bold;">${o.customerName||""}</span> ${o.customerPhone||""}` 
            : "<span style='color:#ccc'>-</span>";

        let itemsDetail = o.items.map(i => 
            `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dotted #eee;">
                <span>${i.name}</span> <span>$${i.price}</span>
             </div>`
        ).join("");

        // 分割出時間部分 (例如 "2023/10/25 23:30:10" -> "23:30:10")
        let timeOnly = o.time.split(" ")[1] || o.time;

        let rowId = `detail-${index}`;
        
        // 注意：index 是反轉後的索引，刪除時要換算回原始索引
        historyBox.innerHTML += `
            <div class="history-row" onclick="toggleDetail('${rowId}')">
                <span class="seq">#${seq}</span>
                <span class="seat">${o.seat}</span>
                <span class="cust">${custInfo}</span>
                <span class="time">${timeOnly}</span>
                <span class="amt">$${o.total}</span>
            </div>
            
            <div id="${rowId}" class="history-detail" style="display:none;">
                <div style="background:#f9f9f9; padding:15px; border-radius:0 0 8px 8px; border:1px solid #eee; border-top:none;">
                    <b>📅 完整時間：</b>${o.time}<br>
                    <b>🧾 內容：</b><br>
                    ${itemsDetail}
                    <div style="text-align:right; margin-top:10px; font-size:18px; font-weight:bold; color:#d33;">
                        總計：$${o.total}
                    </div>
                    
                    <div style="text-align:right; margin-top:15px; border-top:1px solid #ddd; padding-top:10px;">
                        <button onclick="deleteSingleOrder(${index})" class="delete-single-btn">🗑 刪除此筆訂單</button>
                    </div>
                </div>
            </div>
        `;
    });
}

// ✨ 刪除單筆訂單功能
function deleteSingleOrder(displayIndex) {
    if(!confirm("⚠️ 確定要刪除這筆訂單嗎？\n刪除後金額將從今日營收中扣除，無法復原。")) return;

    // 因為顯示的是反轉後的陣列，所以要換算回原始陣列的索引
    // 原始: [A, B, C] length=3
    // 顯示: [C, B, A] (C是index 0)
    // 要刪除 C (原始 index 2) => 3 - 1 - 0 = 2
    let realIndex = historyOrders.length - 1 - displayIndex;

    historyOrders.splice(realIndex, 1);
    localStorage.setItem("orderHistory", JSON.stringify(historyOrders));
    
    showHistory(); // 重新渲染列表
}

window.toggleDetail = function(id) {
    let el = document.getElementById(id);
    if(el.style.display === "none") {
        el.style.display = "block";
    } else {
        el.style.display = "none";
    }
}

/* ========== 輔助 ========== */
function saveAllStorage() {
    localStorage.setItem("tableCarts", JSON.stringify(tableCarts));
    localStorage.setItem("tableTimers", JSON.stringify(tableTimers));
    localStorage.setItem("tableStatuses", JSON.stringify(tableStatuses));
    localStorage.setItem("tableCustomers", JSON.stringify(tableCustomers));
}

function setStatus(table, status) {
    tableStatuses[table] = status;
    localStorage.setItem("tableStatuses", JSON.stringify(tableStatuses));
}
function saveCartToStorage() {
    tableCarts[selectedTable] = cart;
    localStorage.setItem("tableCarts", JSON.stringify(tableCarts));
}

function buildCategories() {
    menuGrid.innerHTML = "";
    categories.forEach(c => {
        let box = document.createElement("div");
        box.className = "categoryBtn";
        box.innerText = c;
        if (menuData[c]) box.onclick = () => openItems(c);
        else box.style.opacity = "0.5";
        menuGrid.appendChild(box);
    });
}
function openItems(category) {
    let html = `<button class="back-to-cat" onclick="buildCategories()">⬅ 返回 ${category} 分類</button>`;
    menuData[category].forEach(item => {
        html += `
            <div class="item">
                <span>${item.name} <b>$${item.price}</b></span>
                <button onclick='addToCart("${item.name}", ${item.price})'>加入</button>
            </div>`;
    });
    menuGrid.innerHTML = html;
}
function addToCart(name, price) {
    cart.push({ name, price });
    renderCart();
    saveCartToStorage(); 
}
function renderCart() {
    cartList.innerHTML = "";
    let sum = 0;
    cart.forEach((c, i) => {
        sum += c.price;
        cartList.innerHTML += `
            <div style="margin-bottom:5px; border-bottom:1px dashed #ccc; padding:5px;">
                ${c.name} - $${c.price} 
                <button class="del-btn" onclick="removeItem(${i})">刪除</button>
            </div>`;
    });
    totalText.innerText = "總金額：" + sum + " 元";
}
function removeItem(index) {
    cart.splice(index, 1);
    renderCart();
    saveCartToStorage();
}

window.onload = function() { goHome(); showHistory(); };