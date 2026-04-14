let video;
let detector;
let detections = [];
let oscPerson, oscDog;
let envPerson, envDog;
let audioStarted = false;
let modelReadyFlag = false;

// 交互 UI 变量
let startBtn, soundModeBtn;
let vW, vH, offsetY;
let scanLineY = 0;

// --- 🎶 新的声音组合搭配 (Soundscapes) ---
// 每个模式包含不同的波形和音阶
let soundModes = [
  {
    name: "Preset 1: 'Ethereal Forest'",
    desc: "Triangle (Person) + Sine (Dog) | C Pentatonic Scale",
    waveP: 'triangle', waveD: 'sine',
    scale: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25], // C Major Pentatonic
    multD: 2 // Dog is one octave higher
  },
  {
    name: "Preset 2: 'Cyberspace Duo'",
    desc: "Square (Person) + Triangle (Dog) | F Mixolydian Scale",
    waveP: 'square', waveD: 'triangle',
    scale: [349.23, 392.00, 440.00, 523.25, 587.33, 698.46], // F Mixolydian
    multD: 1.5 // Dog is a perfect 5th higher
  },
  {
    name: "Preset 3: 'Ancient Harmony'",
    desc: "Sawtooth (Person) + Sawtooth (Dog) | D Minor Scale",
    waveP: 'sawtooth', waveD: 'sawtooth',
    scale: [293.66, 329.63, 349.23, 392.00, 440.00, 523.25], // D Minor
    multD: 1 // Both share the same octave, rich texture
  }
];
let currentModeIndex = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Monospace'); // 保持科技感字体

  // 1. 【大框：项目描述】美化的英文语句
  // 风格参考 image_1.png 的描述块
  drawDescriptionBlock();

  // 2. 【按钮：打开摄像头】点击触发弹窗权限
  startBtn = createButton(' [ INITIALIZE CV ENGINE ] ');
  startBtn.position(width/2 - 120, height * 0.45);
  startBtn.size(240, 50);
  styleRetroButton(startBtn, '#00ff41'); // 赛博绿
  startBtn.mousePressed(startInteraction);

  // 3. 【按钮：切换声音组合】初始隐藏，直到摄像头开启
  soundModeBtn = createButton(' [ CYCLE SOUNDSCAPE ] ');
  soundModeBtn.position(width/2 - 120, height * 0.82);
  soundModeBtn.size(240, 50);
  styleRetroButton(soundModeBtn, '#ff0055'); // 赛博红
  soundModeBtn.mousePressed(cycleSoundMode);
  soundModeBtn.hide();

  // 初始化声音引擎（静默等待）
  initAudio();
}

function startInteraction() {
  startBtn.hide();
  // 一次点击，同时激活声音和视频上下文
  userStartAudio();
  audioStarted = true;

  let constraints = {
    video: { facingMode: { ideal: "environment" } },
    audio: false
  };

  video = createCapture(constraints, function(stream) {
    console.log("Camera engine connected.");
    // 摄像头开启后，显示声音切换按钮
    soundModeBtn.show();
    // 加载模型
    detector = ml5.objectDetector('cocossd', () => { modelReadyFlag = true; });
  });
  video.size(640, 480);
  video.hide();
}

function initAudio() {
  let mode = soundModes[currentModeIndex];

  // 配置玩家振荡器
  oscPerson = new p5.Oscillator(mode.waveP);
  envPerson = new p5.Envelope();
  envPerson.setADSR(0.2, 0.3, 0.4, 1.0);
  oscPerson.amp(envPerson);
  oscPerson.start();

  // 配置狗狗振荡器
  oscDog = new p5.Oscillator(mode.waveD);
  envDog = new p5.Envelope();
  envDog.setADSR(0.1, 0.2, 0.3, 0.8);
  oscDog.amp(envDog);
  oscDog.start();
}

// 点一下切换声音搭配
function cycleSoundMode() {
  currentModeIndex = (currentModeIndex + 1) % soundModes.length;
  let mode = soundModes[currentModeIndex];
  
  // 实时更新波形
  oscPerson.setType(mode.waveP);
  oscDog.setType(mode.waveD);
  
  console.log("Switched to: " + mode.name);
}

function draw() {
  background(10); // 深色科技感背景

  if (video && audioStarted) {
    // 1. 绘制摄像头画面
    vW = width;
    vH = (vW * 480) / 640;
    offsetY = height * 0.15; // 画面稍微往下移
    image(video, 0, offsetY, vW, vH);

    // 2. 绘制复古 UI 装饰：扫描线和状态 HUD
    drawRetroHUD();

    if (modelReadyFlag) {
      detector.detect(video, gotDetections);
      
      let personFound = false;
      let dogFound = false;
      let mode = soundModes[currentModeIndex];

      for (let i = 0; i < detections.length; i++) {
        let obj = detections[i];
        if (obj.confidence > 0.5) {
          // 坐标映射
          let x = map(obj.x, 0, 640, 0, width);
          let y = map(obj.y, 0, 480, offsetY, offsetY + vH);
          let w = map(obj.width, 0, 640, 0, width);
          let h = map(obj.height, 0, 480, 0, vH);

          if (obj.label === 'person') {
            personFound = true;
            let index = floor(map(obj.x, 0, 640, 0, mode.scale.length));
            oscPerson.freq(mode.scale[index], 0.1);
            drawBox(x, y, w, h, "PLAYER", color(0, 255, 65)); // 赛博绿
          } else if (obj.label === 'dog') {
            dogFound = true;
            let index = floor(map(obj.x, 0, 640, 0, mode.scale.length));
            oscDog.freq(mode.scale[index] * mode.multD, 0.1);
            drawBox(x, y, w, h, "SUBJECT_CANINE", color(255, 0, 85)); // 赛博红
          }
        }
      }

      // 触发声音
      if (personFound) envPerson.triggerAttack(); else envPerson.triggerRelease();
      if (dogFound) envDog.triggerAttack(); else envDog.triggerRelease();
    }

  } else if (!audioStarted) {
    // 只有在描述块和开始按钮显示时
    drawDescriptionBlock();
  }
}

// --- 🎨 UI 美化函数群 ---

// 按钮通用样式 (复古、带框)
function styleRetroButton(btn, col) {
  btn.style('background-color', 'transparent');
  btn.style('color', col);
  btn.style('border', '2px solid ' + col);
  btn.style('font-family', 'Monospace');
  btn.style('letter-spacing', '2px');
  btn.style('font-size', '14px');
  btn.style('cursor', 'pointer');
}

// 风格参考 image_1.png 的描述块，文字参考 image_2.png 的清晰布局
function drawDescriptionBlock() {
  fill(0, 255, 65, 30); noStroke();
  rect(15, height * 0.05, width - 30, height * 0.3); // 描述大框
  
  fill(0, 255, 65); textSize(14); textAlign(LEFT);
  text("> PROJECT_LOG //", 25, height * 0.08);
  
  fill(200); textSize(12);
  let descText = "EXPERIMENT: 'INTERSPECIES_HARMONICS'\n" +
                 "An interactive CV engine translating movement\n" +
                 "between SUBJECT_CANINE and PLAYER into a\n" +
                 "live generative soundscape.\n" +
                 "\n" +
                 "Compose unique duets through your physical\n" +
                 "interaction with your canine partner.";
  text(descText, 25, height * 0.12, width - 50, height * 0.25);
}

// 摄像头开启后的复古 HUD 和声音组合提示
function drawRetroHUD() {
  // 扫描线
  stroke(0, 255, 65, 50); strokeWeight(1);
  line(0, offsetY + scanLineY, width, offsetY + scanLineY);
  scanLineY = (scanLineY + 1.5) % vH;

  // 顶部 HUD 文字 (image_3.png 风格)
  noStroke(); fill(200); textAlign(LEFT); textSize(12);
  text("> MODE: [ " + (currentModeIndex + 1) + " / " + soundModes.length + " ]", 15, offsetY - 25);
  textAlign(RIGHT);
  text("GEN: AUDIO_PATH_ENABLED", width - 15, offsetY - 25);

  // 底部描述（提示声音组合的内容）
  let mode = soundModes[currentModeIndex];
  textAlign(CENTER);
  fill(100); textSize(10);
  text(mode.name + " | " + mode.desc, width/2, height * 0.95);
}

function drawBox(x, y, w, h, txt, col) {
  stroke(col); strokeWeight(2); noFill();
  // 只画四个角的科技感框
  let cs = min(w, h) * 0.1;
  line(x, y, x + cs, y); line(x, y, x, y + cs);
  line(x + w, y, x + w - cs, y); line(x + w, y, x + w, y + cs);
  line(x, y + h, x + cs, y + h); line(x, y + h, x, y + h - cs);
  line(x + w, y + h, x + w - cs, y + h); line(x + w, y + h, x + w, y + h - cs);

  noStroke(); fill(col); textSize(12); textAlign(LEFT);
  rect(x + 5, y + 5, textWidth(txt) + 10, 20, 3); // 文字背景
  fill(0); text(txt, x + 10, y + 20);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  startBtn.position(width/2 - 120, height * 0.45);
  soundModeBtn.position(width/2 - 120, height * 0.82);
}
