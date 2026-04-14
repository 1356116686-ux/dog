let video;
let detector;
let detections = [];

// 音频引擎：使用两个振荡器
let oscPerson, oscDog;
let envPerson, envDog;
let audioStarted = false;

// 🎶 氛围感五声音阶 (C大调)
let scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];

function setup() {
  // 自适应手机/电脑全屏
  createCanvas(windowWidth, windowHeight);

  // 手机后置摄像头请求配置
  let constraints = {
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 640 },
      height: { ideal: 480 }
    },
    audio: false
  };

  // 创建摄像头预览
  video = createCapture(constraints, function(stream) {
    console.log("摄像头已激活");
  });
  video.size(640, 480);
  video.hide();

  // 初始化音频引擎
  initAudio();

  // 加载物体检测模型 (使用稳定版 ml5 0.12.2 语法)
  detector = ml5.objectDetector('cocossd', modelReady);
}

function initAudio() {
  // 人的音色：三角波，温润如风铃
  oscPerson = new p5.Oscillator('triangle');
  envPerson = new p5.Envelope();
  envPerson.setADSR(0.2, 0.3, 0.4, 1.0); // 渐入渐出
  oscPerson.amp(envPerson);
  oscPerson.start();

  // 狗的音色：正弦波，纯净如星鸣
  oscDog = new p5.Oscillator('sine');
  envDog = new p5.Envelope();
  envDog.setADSR(0.1, 0.2, 0.3, 0.8);
  oscDog.amp(envDog);
  oscDog.start();
}

function modelReady() {
  console.log("模型就绪！");
  detector.detect(video, gotDetections);
}

function gotDetections(error, results) {
  if (error) {
    detector.detect(video, gotDetections);
    return;
  }
  detections = results;
  detector.detect(video, gotDetections);
}

function draw() {
  background(0);

  // 计算视频在全屏下的等比例缩放位置
  let vW = width;
  let vH = (vW * 480) / 640;
  let offsetY = (height - vH) / 2;
  image(video, 0, offsetY, vW, vH);

  drawUI();

  let personFound = false;
  let dogFound = false;

  for (let i = 0; i < detections.length; i++) {
    let obj = detections[i];
    if (obj.confidence > 0.5) {
      // 坐标映射：将 640x480 的视频坐标转换为手机全屏坐标
      let x = map(obj.x, 0, 640, 0, width);
      let y = map(obj.y, 0, 480, offsetY, offsetY + vH);
      let w = map(obj.width, 0, 640, 0, width);
      let h = map(obj.height, 0, 480, 0, vH);

      if (obj.label === 'person') {
        personFound = true;
        // 映射 X 轴到五声音阶
        let index = floor(map(obj.x, 0, 640, 0, scale.length));
        oscPerson.freq(scale[index], 0.1);
        drawBox(x, y, w, h, "PLAYER", color(0, 255, 0));
      } 
      else if (obj.label === 'dog') {
        dogFound = true;
        // 狗狗音高增加一个八度，形成协奏
        let index = floor(map(obj.x, 0, 640, 0, scale.length));
        oscDog.freq(scale[index] * 2, 0.1);
        drawBox(x, y, w, h, "DOGGY", color(255, 100, 100));
      }
    }
  }

  // 音频交互触发
  if (audioStarted) {
    if (personFound) envPerson.triggerAttack(); else envPerson.triggerRelease();
    if (dogFound) envDog.triggerAttack(); else envDog.triggerRelease();
  }
}

function drawBox(x, y, w, h, txt, col) {
  stroke(col); strokeWeight(3); noFill();
  rect(x, y, w, h, 5);
  fill(col); noStroke(); textSize(16);
  text(txt, x + 5, y - 10);
}

function drawUI() {
  textAlign(CENTER);
  if (!audioStarted) {
    fill(0, 210); rect(0, 0, width, height);
    fill(255); textSize(20);
    text("点击屏幕开始“和谐交响乐”", width/2, height/2);
    textSize(14);
    text("(请确保已开启摄像头权限)", width/2, height/2 + 40);
  } else {
    fill(255, 150); textSize(12);
    text("正在寻找玩家与狗狗...", width/2, 40);
  }
}

function mousePressed() {
  userStartAudio(); // 激活浏览器音频权限
  audioStarted = true;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}