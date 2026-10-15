# 創意方塊 2027 冬令營網站

總覽、三個課程詳情頁與共用報名頁。原生 HTML/CSS/JS，無第三方前端套件。

## 開發與部署

`npm run build` 產生 dist 與 backend/Catalog.gs。`npm test` 驗證後端資格、費用及輸入。`npm run dev` 開啟 http://127.0.0.1:4174 。

GitHub Actions 將 dist 發布到 GitHub Pages；在儲存庫 Settings → Pages 選擇 GitHub Actions。公開站只包含 dist，不含私人報名紀錄。data/camps.json 為前後端共用課程來源，修改後須同時重新發布前端及 Apps Script。

## 目前狀態

網站可瀏覽、篩選與試填。正式收件關閉，尚未設定 Apps Script endpoint。未以任何測試個資或假成功回應冒充完成部署。課程影片與遙控車兩方案實拍待補。

## 後台

請依 backend/部署說明.md 建置。後台提供重新計價、資格驗證、鎖定去重、表格公式跳脫及獨立通知佇列。私人管理表只能由授權教室人員存取；不要公開 Sheet。
