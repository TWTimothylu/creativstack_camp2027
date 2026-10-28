# 舊網址轉址專案

2026-10-28 起，營隊內容統一在教室儲存庫 courses_introduction 的 camps/2027-winter 維護。
新網址：https://twtimothylu.github.io/courses_introduction/camps/2027-winter/

本儲存庫保留歷史；Pages 只發布 scripts/build-redirects.mjs 產生的 redirect-site，保留舊連結的 query 與 hash。不要在此更新營隊內容或重新發布原 dist。

---

# 創意方塊 2027 冬令營網站

總覽、三個課程詳情頁與共用報名頁。原生 HTML/CSS/JS，無第三方前端套件。

## 開發與部署

`npm run build` 產生 dist 與 backend/Catalog.gs。`npm test` 驗證後端資格、費用及輸入。`npm run dev` 開啟 http://127.0.0.1:4174 。

GitHub Actions 將 dist 發布到 GitHub Pages；在儲存庫 Settings → Pages 選擇 GitHub Actions。公開站只包含 dist，不含私人報名紀錄。data/camps.json 為前後端共用課程來源，修改後須同時重新發布前端及 Apps Script。

## 目前狀態

網站已連接 Apps Script，正式收件開啟。2026-10-16 完成獨立測試表寫入、重複請求與衝突防護、5,900 元計價、匿名跨站 POST 與兩種通知實際收信驗收。收件後仍須 LINE 確認名額與繳費。課程影片與遙控車兩方案實拍待補。

## 後台

請依 backend/部署說明.md 建置。後台提供重新計價、資格驗證、鎖定去重、表格公式跳脫及獨立通知佇列。私人管理表只能由授權教室人員存取；不要公開 Sheet。

