# 合成名片影像（OCR 影像層測試集）

全部由 `scripts/gen-ocr-fixtures.mjs --images` 產生，**不含任何真實名片或真實個資**。

- 張數：33（zh-horizontal 11、mixed 11、english 11）
- 畫布：1050×600，白底黑字，三種固定橫式版型
- 字型：Arial Unicode.ttf（產生時的系統字型；字型檔不提交進 repo）
- 種子：20261117
- 每張 `card-NN.png` 附同名 `card-NN.json`（印在卡片上的文字與 ground truth）

重新產生：`npm run gen:ocr-fixtures -- --images`（換字型或版型後，影像層評估結果需重跑並更新 STATUS.md）。
