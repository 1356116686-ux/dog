let video;
let detector;
let detections = [];
let oscPerson, oscDog;
let envPerson, envDog;
let audioStarted = false;
let detectorStarted = false;
let startBtn;
let bgImage; // 背景图

// 🎶 你设定的五声音阶
let scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];

function preload() {
  // 尝试加载蓝天绿地背景图，请确保文件名正确
  // 如果没有图片，可以在此处注释掉，draw里有备选颜色
  bgImage = loadImage('IMG_0744.JPG'); 
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Arial'); // 使用经典的 Arial 字体
  
  // --- UI 美化：复古彩色按钮 ---
  startBtn = createButton(' [ INITIALIZE INTERACTION ] ');
  startBtn.position(width/2 - 120, height/2);
  startBtn.size(240, 65);
  startBtn.style('background-color', '#FFED00'); // 复古黄
  startBtn.style('color', '#0000FF'); // 蓝色字
  startBtn.style('font-weight', 'bold');
  startBtn.style('border', '4px outset #FFED00'); // 凸起边框
  startBtn.style('font-size', '16px');
  startBtn.style('border-radius', '0px'); // Y2K 风格通常是方框
  startBtn.style('cursor', 'pointer');
  
  startBtn.mousePressed(startInteraction);

  initAudio();
}

function startInteraction() {
  startBtn.hide();
  userStartAudio();
  audioStarted = true;

  let constraints = {
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 640 },
      height: { ideal: 480 }
    },
    audio: false
  };

  video = createCapture(constraints, function(stream) {
    console.log("Camera authorized");
    detector = ml5.objectDetector('cocossd', modelReady);
  });
  
  video.size(640, 480);
  video.hide();
}

function initAudio() {
  oscPerson = new p5.Oscillator('triangle');
  envPerson = new p5.Envelope();
  envPerson.setADSR(0.2, 0.3, 0.4, 1.0);
  oscPerson.amp(envPerson);
  oscPerson.start();

  oscDog = new p5.Oscillator('sine');
  envDog = new p5.Envelope();
  envDog.setADSR(0.1, 0.2, 0.3, 0.8);
  oscDog.amp(envDog);
  oscDog.start();
}

function modelReady() {
  detectorStarted = true;
  detector.detect(video, gotDetections);
}

function gotDetections(error, results) {
  if (error) { detector.detect(video, gotDetections); return; }
  detections = results;
  detector.detect(video, gotDetections);
}

function draw() {
  // 1. 绘制背景：有图画图，没图画蓝色
  if (bgImage) {
    image(bgImage, 0, 0, width, height);
  } else {
    background(0, 150, 255); 
  }

  // 2. 绘制顶部 Y2K 标题
  drawY2KHeader();

  if (video && audioStarted) {
    let vW = width * 0.9;
    let vH = (vW * 480) / 640;
    let offsetY = 160; 

    // 摄像头画面的白色复古边框 (无滤镜)
    stroke(255);
    strokeWeight(8);
    noFill();
    rect(width * 0.05 - 4, offsetY - 4, vW + 8, vH + 8); 
    image(video, width * 0.05, offsetY, vW, vH);

    let personFound = false;
    let dogFound = false;

    for (let i = 0; i < detections.length; i++) {
      let obj = detections[i];
      if (obj.confidence > 0.5) {
        let x = map(obj.x, 0, 640, width * 0.05, width * 0.95);
        let y = map(obj.y, 0, 480, offsetY, offsetY + vH);
        let w = map(obj.width, 0, 640, 0, vW);
        let h = map(obj.height, 0, 480, 0, vH);

        if (obj.label === 'person') {
          personFound = true;
          let index = floor(map(obj.x, 0, 640, 0, scale.length));
          oscPerson.freq(scale[index], 0.1);
          drawRetroBox(x, y, w, h, "HUMAN FRIEND", color(0, 0, 255));
        } else if (obj.label === 'dog') {
          dogFound = true;
          let index = floor(map(obj.x, 0, 640, 0, scale.length));
          oscDog.freq(scale[index] * 2, 0.1);
          drawRetroBox(x, y, w, h, "CANINE PARTNER", color(255, 0, 0));
        }
      }
    }

    if (personFound) envPerson.triggerAttack(); else envPerson.triggerRelease();
    if (dogFound) envDog.triggerAttack(); else envDog.triggerRelease();
    
    // 绘制底部状态栏
    drawY2KFooter();

  } else {
    // 未开启时的提示
    fill(255);
    textAlign(CENTER);
    textSize(14);
    text("SYSTEM WAITING FOR USER INITIALIZATION...", width/2, height/2 - 30);
  }
}

// --- 🎨 UI 辅助函数 ---

function drawY2KHeader() {
  push();
  textAlign(CENTER);
  // 标题文字阴影
  fill(0, 0, 150);
  textSize(32);
  textStyle(BOLD);
  text("MOVE WITH DOGS", width/2 + 3, 73); 
  // 主标题
  fill(255, 237, 0);
  text("MOVE WITH DOGS", width/2, 70);
  
  // 副标题
  fill(255);
  textSize(14);
  textStyle(NORMAL);
  text("GENERATIVE AUDIO INTERACTION LAB", width/2, 110);
  pop();
}

function drawRetroBox(x, y, w, h, txt, col) {
  stroke(col); 
  strokeWeight(4); 
  noFill();
  rect(x, y, w, h);
  
  // 标签
  noStroke();
  fill(col);
  rect(x, y - 25, textWidth(txt) + 15, 25);
  fill(255);
  noStroke();
  textSize(12);
  textStyle(BOLD);
  textAlign(LEFT);
  text(txt, x + 5, y - 8);
}

function drawY2KFooter() {
  fill(255, 200);
  noStroke();
  rect(0, height - 40, width, 40);
  fill(0, 0, 255);
  textAlign(CENTER);
  textSize(12);
  text("STATUS: LIVE SENSOR ACTIVE | MODE: DUET", width/2, height - 15);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (startBtn) startBtn.position(width/2 - 120, height/2);
}
