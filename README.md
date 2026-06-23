# iPad 集中控管中樞 (iPad Control Hub)

本專案是一個基於 **Node.js (Express + Socket.io + WebRTC)** 開發的輕量化 iPad 網頁端集中控管系統。主控端（PC/Mac）可透過瀏覽器實時監看所有連線 iPad 的螢幕畫面、對其進行遠端點擊操作、推播文件或網址，並可將主控端的畫面實時廣播給所有 iPad 設備。

---

## 🌟 核心功能

*   **實時螢幕監看 (Screen Monitoring)**：透過 WebRTC 實時視訊串流，在主控端畫面上建立「畫面牆」監看所有 iPad 的狀態。
*   **遠端輔助操作 (Remote Control)**：主控端點擊監看畫面時，系統會自動換算百分比座標並發送至對應的 iPad，在 iPad 網頁端模擬觸控點擊。
*   **文件與網址推播 (Document & Link Push)**：
    *   支援上傳 PDF、圖片、影片等檔案一鍵推播。
    *   內建**反向代理 (Reverse Proxy) 機制**，能自動繞過 `X-Frame-Options` 與 `Content-Security-Policy` 的安全阻擋，流暢載入各類外部網站（如學校官網或 Apple 官網）。
*   **主控畫面廣播 (Screen Broadcast)**：主控端可一鍵將自己的電腦螢幕（或特定視窗）透過 WebRTC P2P 高清、低延遲地廣播至所有連線的 iPad。

---

## 🛠️ 安裝與啟動步驟

### 1. 系統需求
*   [Node.js](https://nodejs.org/) (建議 v18.0.0 以上版本，本專案已在 v22 測試通過)

### 2. 下載並安裝依賴
```bash
git clone git@github.com:jahaumeps/ipad-control-hub.git
cd ipad-control-hub
npm install
```

### 3. 啟動伺服器
```bash
npm start
```
伺服器啟動後將監聽 `3000` 連接埠。

---

## 📱 實務使用指南

### 1. 主控端後台 (PC / Mac)
*   **存取網址**：`http://localhost:3000/admin.html`
*   **操作**：在此頁面中可以看見連線設備列表、拖曳上傳文件、輸入推播 URL，以及點擊右上角「廣播主控畫面」。

### 2. iPad 用戶端 (被控端)
*   **存取網址**：`http://[主控端電腦的區域網路IP]:3000/client.html`
*   **連線設定**：
    1. 輸入 iPad 的辨識名稱。
    2. 點擊「連線至控制中樞」。
    3. 點擊「啟動螢幕畫面共享」，並在 iOS 系統彈出的選單中選擇「開始直播」啟用螢幕監看。

> 💡 **重要提示 (iOS 安全機制限制)**：
> 由於 iOS Safari 的安全防護，螢幕共享（`getDisplayMedia`）必須由使用者「手動點擊按鈕」觸發，無法經由後端遠端強制啟動。

---

## 🔒 鎖定 iPad 畫面（Kiosk 模式）實務建議

為了防止被控端（如學生或參訪者）在使用過程中滑出瀏覽器或關閉網頁，建議配合以下方式進行實體鎖定：

### 推薦：啟用 iOS 內建「引導式存取」（Guided Access）
這是最簡單且安全的安全鎖定方式：
1. 前往 iPad 的 **「設定」 > 「輔助使用」 > 啟用「引導式存取」**。
2. 使用 Safari 開啟用戶端網頁（`client.html`）並連線完畢。
3. **連續按三下 iPad 的電源鍵（或 Home 鍵）**，設定密碼後即可啟動。
4. 鎖定後，iPad 的 Home 鍵與上滑手勢將完全失效，設備會被強制固定在瀏覽器畫面中，直到管理員手動輸入密碼解除。

---

## 📁 專案結構說明

```
ipad-control-hub/
├── public/
│   ├── admin.html       # 主控端管理面板
│   ├── client.html      # iPad 用戶端頁面
│   └── css/
│       └── style.css    # 全域玻璃擬態 (Glassmorphism) 設計樣式表
├── uploads/             # 暫存推播上傳文件夾
├── server.js            # Node.js Express 伺服器 & Socket.io 信令轉發處理
├── package.json         # 專案依賴設定
└── README.md            # 本說明文件
```
