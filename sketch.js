// 1. 圖片路徑設定（讀取 data/ 資料夾）
const questionImagePaths = [
  "data/question1.jpg",
  "data/question2.jpg",
  "data/question3.jpg",
  "data/question4.jpg",
  "data/question5.jpg"
];

const perfectResultImagePath = "data/perfect-result.jpg";
const fourthOnlyResultImagePath = "data/fourth-only-result.jpg";

let questionsTable = null;
let questions = [];

let perfectResultImg = null;
let fourthOnlyResultImg = null;

let currentQuestion = 0;
let selectedOption = -1;
let score = 0;

// 紀錄每一題是否選擇第 4 個選項（「根本沒有這種生物」）
let option4Selections = [];

let isAnswered = false;
let gameState = "QUIZ"; // "QUIZ" 或 "RESULT"

// 響應式動態尺寸與裝置判斷變數
let canvasW, canvasH;
let btnWidth, btnHeight, btnX;
let scaleFactor = 1;
let isDesktop = false;

// 安全載入圖片函式：包含防錯 callback
function safeLoadImage(path) {
  return loadImage(
    path,
    () => console.log(`[載入成功] ${path}`),
    () => console.warn(`[尚未發現圖片檔，請確認檔名] ${path}`)
  );
}

function preload() {
  // 載入 CSV 題庫（包含標題列）
  questionsTable = loadTable("questions.csv", "csv", "header");

  perfectResultImg = safeLoadImage(perfectResultImagePath);
  fourthOnlyResultImg = safeLoadImage(fourthOnlyResultImagePath);
}

function selectRandomQuestions() {
  if (!questionsTable || questionsTable.getRowCount() === 0) return;

  let pool = [];
  for (let r = 0; r < questionsTable.getRowCount(); r++) {
    let row = questionsTable.getRow(r);
    let opt1 = row.getString("option1");
    let opt2 = row.getString("option2");
    let opt3 = row.getString("option3");
    let opt4 = row.getString("option4");

    pool.push({
      text: row.getString("text"),
      options: [
        opt1.startsWith("1.") ? opt1 : `1. ${opt1}`,
        opt2.startsWith("2.") ? opt2 : `2. ${opt2}`,
        opt3.startsWith("3.") ? opt3 : `3. ${opt3}`,
        opt4.startsWith("4.") ? opt4 : `4. ${opt4}`
      ],
      correctIndex: parseInt(row.getString("correctIndex")),
      imagePath: row.getString("imagePath"),
      img: null
    });
  }

  // 洗牌隨機排序並抽取最多 5 題
  let shuffled = shuffle(pool);
  let count = min(5, shuffled.length);
  questions = [];

  for (let i = 0; i < count; i++) {
    let q = shuffled[i];
    q.img = safeLoadImage(q.imagePath);
    questions.push(q);
  }
}

function updateDimensions() {
  let maxW = windowWidth - 24;
  let maxH = windowHeight - 24;

  // 判斷是否為電腦/寬螢幕模式 (寬度大於 768px 且寬大於高)
  isDesktop = windowWidth >= 768 && windowWidth > windowHeight;

  if (isDesktop) {
    // 電腦版：展開為 16:9 舒適大卡片
    canvasW = min(maxW, 860);
    canvasH = min(maxH, 560);
    scaleFactor = canvasW / 800;
    
    btnWidth = canvasW * 0.46;
    btnHeight = max(canvasH * 0.09, 48);
    btnX = canvasW * 0.48;
  } else {
    // 手機版：保持直版比例 (約 0.7 比例)
    let targetRatio = 440 / 640;
    if (maxW / maxH > targetRatio) {
      canvasH = min(maxH, 680);
      canvasW = canvasH * targetRatio;
    } else {
      canvasW = min(maxW, 460);
      canvasH = canvasW / targetRatio;
    }

    canvasW = max(canvasW, 300);
    canvasH = max(canvasH, 460);
    scaleFactor = canvasW / 440;

    btnWidth = canvasW * 0.85;
    btnHeight = max(canvasH * 0.075, 42);
    btnX = (canvasW - btnWidth) / 2;
  }
}

function setup() {
  updateDimensions();
  let canvas = createCanvas(canvasW, canvasH);
  
  // 設定 p5.js Canvas 繪製文字時的預設字型
  textFont('Zen Maru Gothic');

  let container = select("#canvas-container");
  if (container) {
    canvas.parent(container);
  }

  resetQuiz();
}

function windowResized() {
  updateDimensions();
  resizeCanvas(canvasW, canvasH);
}

function draw() {
  background("#FFE6D9");

  if (gameState === "QUIZ") {
    drawQuizScreen();
  } else if (gameState === "RESULT") {
    drawResultScreen();
  }
}

function drawQuizScreen() {
  let q = questions[currentQuestion];

  // 1. 題號標頭
  fill(100);
  textSize(max(14 * scaleFactor, 12));
  textAlign(CENTER, TOP);
  textStyle(NORMAL);
  text(`第 ${currentQuestion + 1} / ${questions.length} 題`, width / 2, height * 0.03);

  // 2. 題目文字
  textSize(max(22 * scaleFactor, 18));
  textStyle(BOLD);
  fill(40);
  text(q.text, width / 2, height * 0.07);

  // 3. 題目圖片區域 (依據 Desktop / Mobile 改變位置)
  let imgX, imgY, imgSize;
  if (isDesktop) {
    imgSize = min(width * 0.38, height * 0.62);
    imgX = width * 0.25 - imgSize / 2;
    imgY = height * 0.16;
  } else {
    imgSize = min(width * 0.52, height * 0.32);
    imgX = width / 2 - imgSize / 2;
    imgY = height * 0.125;
  }

  stroke(255);
  strokeWeight(3 * scaleFactor);
  fill(245);
  rect(imgX, imgY, imgSize, imgSize, 16 * scaleFactor);
  noStroke();

  if (q.img && q.img.width > 0) {
    image(q.img, imgX, imgY, imgSize, imgSize);
  } else {
    fill(120);
    textSize(13 * scaleFactor);
    textAlign(CENTER, CENTER);
    text("圖片載入中...\n(請確認 data/ 檔名)", imgX + imgSize / 2, imgY + imgSize / 2);
  }

  // 4. 四個選項按鈕 (電腦版放在右側，手機版放在下方)
  let startY, gap;
  if (isDesktop) {
    startY = imgY;
    gap = btnHeight + height * 0.025;
  } else {
    startY = imgY + imgSize + height * 0.035;
    gap = btnHeight + height * 0.015;
  }

  for (let i = 0; i < 4; i++) {
    let y = startY + i * gap;

    let btnColor = color(255);
    let textColor = color(40);

    if (isAnswered) {
      if (i === q.correctIndex) {
        btnColor = color("#00BB00"); // 綠色
        textColor = color(255);
      } else if (i === selectedOption) {
        btnColor = color("#FF5809"); // 紅色
        textColor = color(255);
      } else {
        btnColor = color(245);
        textColor = color(150);
      }
    } else {
      if (isMouseOver(btnX, y, btnWidth, btnHeight)) {
        btnColor = color(252, 235, 230);
      }
    }

    stroke(225);
    strokeWeight(1.5);
    fill(btnColor);
    rect(btnX, y, btnWidth, btnHeight, 12 * scaleFactor);

    noStroke();
    fill(textColor);
    textSize(max(15 * scaleFactor, 14));
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    text(q.options[i], btnX + 16 * scaleFactor, y + btnHeight / 2);
  }

  // 5. 下一步按鈕
  if (isAnswered) {
    let nextY = startY + 4 * gap + height * 0.01;
    let isLastQuestion = currentQuestion === questions.length - 1;
    let nextBtnText = isLastQuestion ? "察看結果" : "下一題";

    let nextBtnBg = color("#FF7A59");
    if (isMouseOver(btnX, nextY, btnWidth, btnHeight)) {
      nextBtnBg = color("#E86343");
    }

    fill(nextBtnBg);
    stroke(255);
    strokeWeight(2);
    rect(btnX, nextY, btnWidth, btnHeight, 24 * scaleFactor);

    fill(255);
    noStroke();
    textSize(max(17 * scaleFactor, 15));
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    text(nextBtnText, btnX + btnWidth / 2, nextY + btnHeight / 2);
  }
}

function drawResultScreen() {
  let allOption4 = option4Selections.every(value => value === true);
  let allCorrect = score === questions.length;

  let resultText = "";
  let resultImg = null;
  let showImage = false;

  if (allOption4) {
    resultText = "你只是怕了。";
    resultImg = fourthOnlyResultImg;
    showImage = true;
  } else if (allCorrect) {
    resultText = "全對！你好棒！";
    resultImg = perfectResultImg;
    showImage = true;
  } else {
    resultText = "sadge.再接再勵。";
    showImage = false;
  }

  if (isDesktop) {
    // 電腦版結算畫面 (左右佈局)
    let imgSize = min(width * 0.38, height * 0.65);
    let imgX = width * 0.25 - imgSize / 2;
    let imgY = height * 0.18;

    if (showImage) {
      stroke(255);
      strokeWeight(4);
      fill(240);
      rect(imgX, imgY, imgSize, imgSize, 18 * scaleFactor);
      noStroke();

      if (resultImg && resultImg.width > 0) {
        image(resultImg, imgX, imgY, imgSize, imgSize);
      } else {
        fill(120);
        textSize(14 * scaleFactor);
        textAlign(CENTER, CENTER);
        text("圖片載入中...", imgX + imgSize / 2, imgY + imgSize / 2);
      }
    }

    let rightX = showImage ? (width * 0.48) : (width * 0.1);
    let rightW = showImage ? (width * 0.46) : (width * 0.8);

    textAlign(CENTER, TOP);
    fill(100);
    textSize(max(16 * scaleFactor, 14));
    textStyle(NORMAL);
    text(`測驗完成！ 得分: ${score} / ${questions.length}`, rightX + rightW / 2, height * 0.2);

    textSize(max(32 * scaleFactor, 24));
    textStyle(BOLD);
    fill("#D84A26");
    text(resultText, rightX + rightW / 2, height * 0.32);

    let restartY = height * 0.55;
    let restartBtnBg = color("#FF7A59");
    if (isMouseOver(rightX, restartY, rightW, btnHeight * 1.2)) {
      restartBtnBg = color("#E86343");
    }

    fill(restartBtnBg);
    stroke(255);
    strokeWeight(2);
    rect(rightX, restartY, rightW, btnHeight * 1.2, 26 * scaleFactor);

    fill(255);
    noStroke();
    textSize(max(18 * scaleFactor, 16));
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    text("重新測驗", rightX + rightW / 2, restartY + (btnHeight * 1.2) / 2);

  } else {
    // 手機版結算畫面 (上下佈局)
    textAlign(CENTER, TOP);
    fill(100);
    textSize(max(15 * scaleFactor, 13));
    textStyle(NORMAL);
    text(`測驗完成！ 得分: ${score} / ${questions.length}`, width / 2, height * 0.06);

    textSize(max(26 * scaleFactor, 22));
    textStyle(BOLD);
    fill("#D84A26");
    text(resultText, width / 2, height * 0.12);

    let restartY = height * 0.38;

    if (showImage) {
      let imgY = height * 0.22;
      let imgSize = min(width * 0.58, height * 0.38);

      stroke(255);
      strokeWeight(4);
      fill(240);
      rect(width / 2 - imgSize / 2, imgY, imgSize, imgSize, 18 * scaleFactor);
      noStroke();

      if (resultImg && resultImg.width > 0) {
        image(resultImg, width / 2 - imgSize / 2, imgY, imgSize, imgSize);
      } else {
        fill(120);
        textSize(13 * scaleFactor);
        textAlign(CENTER, CENTER);
        text("圖片載入中...", width / 2, imgY + imgSize / 2);
      }

      restartY = imgY + imgSize + height * 0.05;
    }

    let restartBtnBg = color("#FF7A59");
    if (isMouseOver(btnX, restartY, btnWidth, btnHeight * 1.1)) {
      restartBtnBg = color("#E86343");
    }

    fill(restartBtnBg);
    stroke(255);
    strokeWeight(2);
    rect(btnX, restartY, btnWidth, btnHeight * 1.1, 26 * scaleFactor);

    fill(255);
    noStroke();
    textSize(max(18 * scaleFactor, 16));
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    text("重新測驗", width / 2, restartY + (btnHeight * 1.1) / 2);
  }
}

function handleInput() {
  if (gameState === "QUIZ") {
    let imgY = isDesktop ? (height * 0.16) : (height * 0.125);
    let imgSize = isDesktop ? min(width * 0.38, height * 0.62) : min(width * 0.52, height * 0.32);
    let startY = isDesktop ? imgY : (imgY + imgSize + height * 0.035);
    let gap = isDesktop ? (btnHeight + height * 0.025) : (btnHeight + height * 0.015);

    if (!isAnswered) {
      for (let i = 0; i < 4; i++) {
        let y = startY + i * gap;

        if (isMouseOver(btnX, y, btnWidth, btnHeight)) {
          selectedOption = i;
          isAnswered = true;
          option4Selections[currentQuestion] = (i === 3);

          if (i === questions[currentQuestion].correctIndex) {
            score++;
          }
          break;
        }
      }
    } else {
      let nextY = startY + 4 * gap + height * 0.01;

      if (isMouseOver(btnX, nextY, btnWidth, btnHeight)) {
        if (currentQuestion < questions.length - 1) {
          currentQuestion++;
          selectedOption = -1;
          isAnswered = false;
        } else {
          gameState = "RESULT";
        }
      }
    }
  } else if (gameState === "RESULT") {
    let allOption4 = option4Selections.every(value => value === true);
    let allCorrect = score === questions.length;
    let showImage = allOption4 || allCorrect;

    if (isDesktop) {
      let rightX = showImage ? (width * 0.48) : (width * 0.1);
      let rightW = showImage ? (width * 0.46) : (width * 0.8);
      let restartY = height * 0.55;

      if (isMouseOver(rightX, restartY, rightW, btnHeight * 1.2)) {
        resetQuiz();
      }
    } else {
      let imgY = height * 0.22;
      let imgSize = min(width * 0.58, height * 0.38);
      let restartY = showImage ? (imgY + imgSize + height * 0.05) : (height * 0.38);

      if (isMouseOver(btnX, restartY, btnWidth, btnHeight * 1.1)) {
        resetQuiz();
      }
    }
  }
}

function mousePressed() {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
    return;
  }
  handleInput();
}

// 支援手機觸控，並防止捲動畫面
function touchStarted() {
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    handleInput();
    return false; // 防止手機點擊時頁面上下滑動
  }
}

function resetQuiz() {
  selectRandomQuestions();
  currentQuestion = 0;
  selectedOption = -1;
  score = 0;
  option4Selections = new Array(questions.length).fill(false);
  isAnswered = false;
  gameState = "QUIZ";
}

function isMouseOver(x, y, w, h) {
  return (
    mouseX >= x &&
    mouseX <= x + w &&
    mouseY >= y &&
    mouseY <= y + h
  );
}