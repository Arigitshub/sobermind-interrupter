/* -------------------------------------------------------------
 * SOBERMIND // INTERRUPT LOGIC & SOUND ENGINE
 * ------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  let appState = {
    streak: 0,
    totalSuccesses: 0,
    history: [],
    settings: {
      strictMode: false,
      particleBg: true,
      audioEnabled: false,
      volume: 0.5,
      currentSound: 'binaural',
      theme: 'nebula'
    }
  };

  // Active Timer State
  let activeTimer = {
    intervalId: null,
    totalDuration: 90,
    timeLeft: 90,
    impulse: '',
    calmingMode: 'breath',
    startTime: null,
    isComplete: false
  };

  // Load from LocalStorage
  function loadState() {
    const saved = localStorage.getItem('sobermind_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        appState = { ...appState, ...parsed };
        
        // Sync toggles/UI with state
        document.getElementById('particle-bg-toggle').checked = appState.settings.particleBg;
        document.getElementById('strict-mode-toggle').checked = appState.settings.strictMode;
        document.getElementById('volume-range').value = appState.settings.volume;
        
        // Theme setting sync
        const themeSelect = document.getElementById('theme-select');
        themeSelect.value = appState.settings.theme || 'nebula';
        document.body.dataset.theme = themeSelect.value;
        
        // Select active sound chip
        document.querySelectorAll('.sound-chip').forEach(chip => {
          chip.classList.toggle('active', chip.dataset.sound === appState.settings.currentSound);
        });

        updateDashboardUI();
      } catch (e) {
        console.error("Failed to load local state:", e);
      }
    } else {
      // First run - show tutorial
      toggleModal('intro-modal', true);
      updateDashboardUI();
    }
  }

  function saveState() {
    localStorage.setItem('sobermind_state', JSON.stringify(appState));
  }

  // ==========================================
  // DOM ELEMENT REFERENCES
  // ==========================================
  const triggerInputView = document.getElementById('trigger-input-view');
  const timerView = document.getElementById('timer-view');
  const reflectionView = document.getElementById('reflection-view');
  const impulseForm = document.getElementById('impulse-form');
  const impulseInput = document.getElementById('impulse-input');
  
  const timerDigits = document.getElementById('timer-digits');
  const breathingState = document.getElementById('breathing-state');
  const targetImpulseText = document.getElementById('target-impulse-text');
  
  const abortBtn = document.getElementById('abort-btn');
  const completeBtn = document.getElementById('complete-btn');
  
  const streakCounter = document.getElementById('streak-counter');
  const totalSuccesses = document.getElementById('total-successes');
  const bypassRateElement = document.getElementById('stat-bypass-rate');
  const totalMinsElement = document.getElementById('stat-total-mins');
  
  const historyList = document.getElementById('history-list');
  const chartBars = document.getElementById('chart-bars');

  const particleToggle = document.getElementById('particle-bg-toggle');
  const strictToggle = document.getElementById('strict-mode-toggle');
  const audioToggle = document.getElementById('ambient-audio-toggle');
  const volumeRange = document.getElementById('volume-range');
  const themeSelect = document.getElementById('theme-select');

  // Breathing technique elements
  const breathingTechSelect = document.getElementById('breathing-tech-select');
  const breathingTechGroup = document.getElementById('breathing-tech-group');
  const groundingSelect = document.getElementById('grounding-select');

  // Reflection Screen Elements
  const reflectionBtns = document.querySelectorAll('.reflection-btn');
  const pivotOptionsGroup = document.getElementById('pivot-options-group');
  const pivotChips = document.querySelectorAll('.pivot-chip');
  const saveReflectionBtn = document.getElementById('save-reflection-btn');

  let selectedOutcome = 'pivot'; // pivot, proceed, slip
  let selectedPivotAction = 'Drink Water';

  // ==========================================
  // AMBIENT PARTICLES ENGINE
  // ==========================================
  const canvas = document.getElementById('ambient-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let particleAnimationId = null;

  // Nebulous drifting gas clouds configurations
  let nebulae = [
    { x: 0.15, y: 0.25, r: 0.45, vx: 0.0001, vy: 0.00015 },
    { x: 0.85, y: 0.65, r: 0.55, vx: -0.00015, vy: -0.0001 },
    { x: 0.50, y: 0.45, r: 0.50, vx: 0.00008, vy: -0.00015 }
  ];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.radius = Math.random() * 2 + 0.5;
      this.baseAlpha = Math.random() * 0.4 + 0.1;
      this.alpha = this.baseAlpha;
      this.speedX = (Math.random() - 0.5) * 0.15;
      this.speedY = (Math.random() - 0.5) * 0.15;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      
      if (this.x < 0) this.x = canvas.width;
      if (this.x > canvas.width) this.x = 0;
      if (this.y < 0) this.y = canvas.height;
      if (this.y > canvas.height) this.y = 0;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 242, 254, ${this.alpha})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0, 242, 254, 0.4)';
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    }
  }

  function initParticles() {
    particles = [];
    const count = Math.min(Math.floor((canvas.width * canvas.height) / 18000), 120);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function animateParticles() {
    if (!appState.settings.particleBg) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Choose dynamic color coordinates matching the active UI theme aura
    const currentTheme = document.body.dataset.theme || 'nebula';
    let colors = [];
    if (currentTheme === 'forest') {
      colors = ['rgba(75, 220, 150, 0.04)', 'rgba(20, 180, 100, 0.03)', 'rgba(140, 240, 50, 0.02)'];
    } else if (currentTheme === 'cyberpunk') {
      colors = ['rgba(255, 120, 50, 0.04)', 'rgba(200, 50, 255, 0.03)', 'rgba(255, 50, 150, 0.03)'];
    } else if (currentTheme === 'void') {
      colors = ['rgba(255, 255, 255, 0.015)', 'rgba(200, 200, 200, 0.01)', 'rgba(150, 150, 150, 0.01)'];
    } else { // default nebula
      colors = ['rgba(0, 242, 254, 0.04)', 'rgba(255, 0, 128, 0.03)', 'rgba(120, 0, 255, 0.03)'];
    }

    // Paint drifting organic nebula clouds in background
    nebulae.forEach((n, idx) => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > 1) n.vx *= -1;
      if (n.y < 0 || n.y > 1) n.vy *= -1;
      
      const px = n.x * canvas.width;
      const py = n.y * canvas.height;
      const rad = n.r * Math.min(canvas.width, canvas.height);
      const color = colors[idx] || colors[0];
      
      const grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
      grad.addColorStop(0, color);
      grad.addColorStop(0.5, color.replace('0.04', '0.015').replace('0.03', '0.01').replace('0.02', '0.005'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Render lines connecting close particles (constellation mesh)
    const maxDistance = 110;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < maxDistance) {
          const alpha = (1 - (dist / maxDistance)) * 0.12;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 242, 254, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => {
      p.update();
      p.draw();
    });
    particleAnimationId = requestAnimationFrame(animateParticles);
  }

  function toggleParticles(enabled) {
    appState.settings.particleBg = enabled;
    saveState();
    if (enabled) {
      initParticles();
      if (!particleAnimationId) animateParticles();
    } else {
      cancelAnimationFrame(particleAnimationId);
      particleAnimationId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ==========================================
  // WEB AUDIO SYNTHESIZER (Calming drone and chime)
  // ==========================================
  let audioCtx = null;
  let synthNodes = []; // oscillators/noise nodes
  let masterGain = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = appState.settings.volume;
      masterGain.connect(audioCtx.destination);
    }
  }

  function playAmbientSound() {
    if (!appState.settings.audioEnabled) return;
    initAudio();
    stopAmbientSound(); // clear any running sound first

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const type = appState.settings.currentSound;

    if (type === 'binaural') {
      // 6Hz Theta waves: 100Hz Left, 106Hz Right
      const merger = audioCtx.createChannelMerger(2);
      
      const oscL = audioCtx.createOscillator();
      const oscR = audioCtx.createOscillator();
      const gainL = audioCtx.createGain();
      const gainR = audioCtx.createGain();
      
      oscL.type = 'sine';
      oscL.frequency.value = 100;
      oscR.type = 'sine';
      oscR.frequency.value = 106;

      gainL.gain.value = 0.5;
      gainR.gain.value = 0.5;

      oscL.connect(gainL).connect(merger, 0, 0);
      oscR.connect(gainR).connect(merger, 0, 1);
      
      const lpf = audioCtx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 120; // warm, soft low end

      merger.connect(lpf).connect(masterGain);

      oscL.start(0);
      oscR.start(0);

      synthNodes = [oscL, oscR, lpf, merger];

    } else if (type === 'drone') {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const osc3 = audioCtx.createOscillator();
      
      osc1.type = 'sawtooth';
      osc1.frequency.value = 55; // A1
      osc2.type = 'triangle';
      osc2.frequency.value = 110; // A2
      osc3.type = 'sine';
      osc3.frequency.value = 165; // E3

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 150;
      filter.Q.value = 6;

      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.15; 
      lfoGain.gain.value = 80; 

      lfo.connect(lfoGain).connect(filter.frequency);

      const gain1 = audioCtx.createGain();
      const gain2 = audioCtx.createGain();
      const gain3 = audioCtx.createGain();
      
      gain1.gain.value = 0.2;
      gain2.gain.value = 0.3;
      gain3.gain.value = 0.3;

      osc1.connect(gain1).connect(filter);
      osc2.connect(gain2).connect(filter);
      osc3.connect(gain3).connect(filter);

      filter.connect(masterGain);

      osc1.start(0);
      osc2.start(0);
      osc3.start(0);
      lfo.start(0);

      synthNodes = [osc1, osc2, osc3, lfo, lfoGain, filter, gain1, gain2, gain3];

    } else if (type === 'rain') {
      const bufferSize = audioCtx.sampleRate * 2; 
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const lpFilter = audioCtx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.value = 800;

      const bpFilter = audioCtx.createBiquadFilter();
      bpFilter.type = 'bandpass';
      bpFilter.frequency.value = 400;
      bpFilter.Q.value = 1;

      const ampMod = audioCtx.createGain();
      ampMod.gain.value = 0.75;
      
      noise.connect(lpFilter).connect(bpFilter).connect(ampMod).connect(masterGain);
      
      noise.start(0);
      synthNodes = [noise, lpFilter, bpFilter, ampMod];
    }
  }

  function stopAmbientSound() {
    synthNodes.forEach(node => {
      try {
        if (node.stop) {
          node.stop();
        }
        node.disconnect();
      } catch (e) {}
    });
    synthNodes = [];
  }

  function playChime(success = true) {
    if (!appState.settings.audioEnabled) return;
    initAudio();
    
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain).connect(masterGain);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); 
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); 
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.5); 

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.start(now);
      osc.stop(now + 1.3);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(329.63, now); 
      osc.frequency.exponentialRampToValueAtTime(220.00, now + 0.3); 

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  }

  // ==========================================
  // PROGRESS RING CIRCLE MATH
  // ==========================================
  const progressRingCircle = document.querySelector('.progress-ring__circle');
  const ringRadius = progressRingCircle.r.baseVal.value;
  const circumference = ringRadius * 2 * Math.PI;

  progressRingCircle.style.strokeDasharray = `${circumference} ${circumference}`;
  progressRingCircle.style.strokeDashoffset = circumference;

  function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    progressRingCircle.style.strokeDashoffset = offset;
  }

  // ==========================================
  // CAROUSEL & TEXT PROMPTS
  // ==========================================
  const reframingQuestions = [
    "What emotion am I attempting to avoid or soothe right now?",
    "How will I feel in 30 minutes if I follow this impulse?",
    "Is this a true need, or just a dopamine craving?",
    "What is the source of the discomfort that preceded this impulse?",
    "What is a more constructive action I could take instead?"
  ];

  const genericPrompts = [
    "Feel the floor beneath your feet. Breathe deeply.",
    "Notice the physical sensation of the urge. Let it peak and subside.",
    "Acknowledge the impulse without judging yourself for having it.",
    "Remember: You do not have to obey every command your brain generates.",
    "The discomfort of waiting is temporary. The reward of self-control is lasting.",
    "Breathe in calm energy, exhale tension."
  ];

  let promptCarouselInterval = null;
  function startCarousel() {
    const carouselPrompt = document.getElementById('carousel-prompt');
    let promptIndex = 0;
    
    carouselPrompt.innerText = genericPrompts[0];
    
    promptCarouselInterval = setInterval(() => {
      promptIndex = (promptIndex + 1) % genericPrompts.length;
      carouselPrompt.classList.add('fade-out');
      
      setTimeout(() => {
        carouselPrompt.innerText = genericPrompts[promptIndex];
        carouselPrompt.classList.remove('fade-out');
      }, 300);
      
    }, 15000); 
  }

  function stopCarousel() {
    clearInterval(promptCarouselInterval);
  }

  // ==========================================
  // INTERACTIVE GROUNDING CONTROLLERS
  // ==========================================
  
  // 1. Dynamic Breathing Guide (4-7-8, Box, Coherent support)
  let breathInterval = null;
  function startBreathingGuide() {
    const bubble = document.getElementById('breath-bubble');
    const pattern = breathingTechSelect.value;
    
    let breathCount = 0; // index of phase
    let count = 0;

    // Pattern definitions: [text, color, target_scale, duration]
    let phases = [];
    if (pattern === '478') {
      phases = [
        { text: "Breathe In", color: "var(--accent-cyan)", scale: 3.0, duration: 4 },
        { text: "Hold Breath", color: "var(--accent-magenta)", scale: 3.0, duration: 7 },
        { text: "Breathe Out", color: "var(--secondary-green)", scale: 1.0, duration: 8 }
      ];
    } else if (pattern === 'box') {
      phases = [
        { text: "Breathe In", color: "var(--accent-cyan)", scale: 3.0, duration: 4 },
        { text: "Hold Breath", color: "var(--accent-magenta)", scale: 3.0, duration: 4 },
        { text: "Breathe Out", color: "var(--secondary-green)", scale: 1.0, duration: 4 },
        { text: "Hold Empty", color: "var(--text-muted)", scale: 1.0, duration: 4 }
      ];
    } else { // coherent
      phases = [
        { text: "Breathe In", color: "var(--accent-cyan)", scale: 3.0, duration: 5 },
        { text: "Breathe Out", color: "var(--secondary-green)", scale: 1.0, duration: 5 }
      ];
    }

    function breathStep() {
      if (activeTimer.timeLeft <= 0) return;

      const currentPhase = phases[breathCount];
      breathingState.innerText = currentPhase.text;
      breathingState.style.color = currentPhase.color;
      bubble.style.transform = `scale(${currentPhase.scale})`;
      bubble.style.transition = `transform ${currentPhase.duration}s linear`;

      count++;
      if (count >= currentPhase.duration) {
        breathCount = (breathCount + 1) % phases.length;
        count = 0;
      }
    }
    
    breathStep();
    breathInterval = setInterval(breathStep, 1000);
  }

  function stopBreathingGuide() {
    clearInterval(breathInterval);
    const bubble = document.getElementById('breath-bubble');
    bubble.style.transform = "scale(1)";
    bubble.style.transition = "none";
  }

  // 2. 5-4-3-2-1 Somatic Sensory check steps
  let sensoryStep = 5;
  const sensoryTitle = document.getElementById('sensory-step-title');
  const sensoryInput = document.getElementById('sensory-step-input');
  const sensoryDots = document.getElementById('sensory-step-dots');

  const sensoryPrompts = {
    5: "Name 5 things you can SEE around you right now:",
    4: "Name 4 things you can physically TOUCH or feel:",
    3: "Name 3 distinct sounds you can HEAR in this space:",
    2: "Name 2 scents you can SMELL (or memory of scents):",
    1: "Name 1 positive thing you can TASTE or say to yourself:"
  };

  function updateSensoryUI() {
    sensoryTitle.innerText = sensoryPrompts[sensoryStep];
    sensoryInput.value = '';
    sensoryInput.placeholder = "Enter response, then press Enter...";
    
    let dots = '';
    for (let i = 5; i >= 1; i--) {
      dots += (i <= sensoryStep) ? '● ' : '○ ';
    }
    sensoryDots.innerText = dots.trim();
  }

  sensoryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (sensoryInput.value.trim().length > 2) {
        if (sensoryStep > 1) {
          sensoryStep--;
          updateSensoryUI();
        } else {
          sensoryInput.disabled = true;
          sensoryTitle.innerText = "Senses Grounded. Excellent work.";
          sensoryInput.value = "All steps completed.";
          sensoryDots.innerText = "● ● ● ● ●";
        }
      }
    }
  });

  function startSensoryGuide() {
    sensoryStep = 5;
    sensoryInput.disabled = false;
    updateSensoryUI();
  }

  // 3. Cognitive Reframing questions
  let reframingInterval = null;
  function startReframingGuide() {
    const questionText = document.getElementById('reframing-question-text');
    const textarea = document.getElementById('reframing-textarea');
    textarea.value = '';
    
    let index = 0;
    questionText.innerText = `"${reframingQuestions[0]}"`;
    
    reframingInterval = setInterval(() => {
      index = (index + 1) % reframingQuestions.length;
      questionText.innerText = `"${reframingQuestions[index]}"`;
    }, 20000); 
  }

  function stopReframingGuide() {
    clearInterval(reframingInterval);
  }

  // 4. Ambient zen quotes generator
  const zenQuotesList = [
    "\"Rule your mind or it will rule you.\" — Horace",
    "\"The present moment is filled with joy and happiness. If you are attentive, you will see it.\" — Thich Nhat Hanh",
    "\"You have power over your mind - not outside events. Realize this, and you will find strength.\" — Marcus Aurelius",
    "\"Between stimulus and response there is a space. In that space is our power to choose our response.\" — Viktor E. Frankl",
    "\"Quiet the mind and the soul will speak.\" — Ma Jaya Sati Bhagavati"
  ];
  let zenInterval = null;
  function startAmbientGuide() {
    const quoteText = document.getElementById('zen-quote');
    let idx = 0;
    quoteText.innerText = zenQuotesList[0];
    
    zenInterval = setInterval(() => {
      idx = (idx + 1) % zenQuotesList.length;
      quoteText.innerText = zenQuotesList[idx];
    }, 20000);
  }

  function stopAmbientGuide() {
    clearInterval(zenInterval);
  }

  // Set grounding mode view visibility
  function activateGroundingView(mode) {
    document.querySelectorAll('.grounding-view').forEach(view => {
      view.classList.remove('active');
    });

    if (mode === 'breath') {
      document.getElementById('breath-prompt-view').classList.add('active');
      startBreathingGuide();
    } else if (mode === 'sensory') {
      document.getElementById('sensory-prompt-view').classList.add('active');
      startSensoryGuide();
    } else if (mode === 'reframing') {
      document.getElementById('reframing-prompt-view').classList.add('active');
      startReframingGuide();
    } else if (mode === 'ambient') {
      document.getElementById('ambient-prompt-view').classList.add('active');
      startAmbientGuide();
    }
  }

  function stopAllGroundingGuides() {
    stopBreathingGuide();
    stopReframingGuide();
    stopAmbientGuide();
  }

  // ==========================================
  // TIMER TICK LOOP CONTROL
  // ==========================================
  function startPauseTimer(impulse, durationSeconds, mode) {
    activeTimer.totalDuration = durationSeconds;
    activeTimer.timeLeft = durationSeconds;
    activeTimer.impulse = impulse;
    activeTimer.calmingMode = mode;
    activeTimer.startTime = new Date();
    activeTimer.isComplete = false;

    targetImpulseText.innerText = impulse;
    timerDigits.innerText = activeTimer.timeLeft;
    
    triggerInputView.classList.remove('active');
    setTimeout(() => {
      timerView.classList.add('active');
      setProgress(100);
    }, 200);

    completeBtn.classList.add('disabled');
    completeBtn.disabled = true;
    abortBtn.classList.remove('disabled');
    abortBtn.disabled = false;
    abortBtn.style.display = 'block';

    if (appState.settings.audioEnabled) {
      playAmbientSound();
    }

    activateGroundingView(mode);
    startCarousel();

    activeTimer.intervalId = setInterval(tickTimer, 1000);
  }

  function tickTimer() {
    activeTimer.timeLeft--;
    timerDigits.innerText = activeTimer.timeLeft;
    
    const percentage = (activeTimer.timeLeft / activeTimer.totalDuration) * 100;
    setProgress(percentage);

    if (appState.settings.strictMode && (activeTimer.totalDuration - activeTimer.timeLeft >= 15)) {
      abortBtn.classList.add('disabled');
      abortBtn.disabled = true;
      abortBtn.title = "Strict mode active. Pause cannot be canceled after 15s.";
    }

    if (activeTimer.timeLeft <= 0) {
      clearInterval(activeTimer.intervalId);
      activeTimer.isComplete = true;
      
      breathingState.innerText = "PAUSE COMPLETE";
      breathingState.style.color = "var(--secondary-green)";
      
      completeBtn.classList.remove('disabled');
      completeBtn.disabled = false;
      
      abortBtn.style.display = 'none';

      stopAllGroundingGuides();
      playChime(true);

      // Auto transition to reflection screen after 1 second
      setTimeout(() => {
        timerView.classList.remove('active');
        setTimeout(() => {
          reflectionView.classList.add('active');
        }, 200);
      }, 1000);
    }
  }

  function finishSession(outcome, pivotAction = null) {
    clearInterval(activeTimer.intervalId);
    stopAllGroundingGuides();
    stopCarousel();
    stopAmbientSound();

    const elapsed = Math.min(
      activeTimer.totalDuration - activeTimer.timeLeft, 
      activeTimer.totalDuration
    );

    // Save session in history log
    const session = {
      impulse: activeTimer.impulse,
      duration: activeTimer.totalDuration,
      elapsed: elapsed,
      timestamp: new Date().toISOString(),
      calmingMode: activeTimer.calmingMode,
      status: outcome, // pivot, proceed, slip, aborted
      pivotAction: pivotAction
    };

    appState.history.unshift(session);

    if (outcome === 'pivot' || outcome === 'proceed') {
      appState.totalSuccesses++;
      updateStreak();
    } else {
      appState.streak = 0;
      playChime(false);
    }

    saveState();
    updateDashboardUI();

    // Reset views
    timerView.classList.remove('active');
    reflectionView.classList.remove('active');
    setTimeout(() => {
      triggerInputView.classList.add('active');
      impulseInput.value = '';
    }, 200);
  }

  function updateStreak() {
    if (appState.history.length === 0) return;
    
    const successes = appState.history.filter(h => h.status === 'pivot' || h.status === 'proceed');
    if (successes.length <= 1) {
      appState.streak = 1;
      return;
    }

    const lastTime = new Date(successes[0].timestamp);
    const prevTime = new Date(successes[1].timestamp);
    
    const diffHours = (lastTime - prevTime) / (1000 * 60 * 60);

    if (diffHours < 36) { 
      if (lastTime.getDate() !== prevTime.getDate()) {
        appState.streak++;
      }
    } else {
      appState.streak = 1; 
    }
  }

  // ==========================================
  // ANALYTICS & DASHBOARD RENDERING
  // ==========================================
  function updateDashboardUI() {
    streakCounter.innerText = appState.streak;
    totalSuccesses.innerText = appState.totalSuccesses;

    const totalSessions = appState.history.length;
    const successesCount = appState.history.filter(h => h.status === 'pivot' || h.status === 'proceed').length;
    const bypassRate = totalSessions > 0 ? Math.round((successesCount / totalSessions) * 100) : 0;
    bypassRateElement.innerText = `${bypassRate}%`;

    const totalSecs = appState.history.reduce((acc, curr) => acc + curr.elapsed, 0);
    const totalMins = Math.round(totalSecs / 60);
    totalMinsElement.innerText = `${totalMins}m`;

    renderHistoryLog();
    renderCategoryChart();
    renderHeatmap();
  }

  function renderHistoryLog() {
    historyList.innerHTML = '';
    
    if (appState.history.length === 0) {
      historyList.innerHTML = '<li class="history-empty">No impulses logged yet. Start a pause to log your success!</li>';
      return;
    }

    const items = appState.history.slice(0, 10);
    items.forEach(session => {
      const li = document.createElement('li');
      li.className = 'history-item';
      
      const date = new Date(session.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

      let badgeText = 'Aborted';
      let badgeClass = 'aborted';
      if (session.status === 'pivot') {
        badgeText = `Pivoted ➔ ${session.pivotAction}`;
        badgeClass = 'success';
      } else if (session.status === 'proceed') {
        badgeText = 'Proceeded';
        badgeClass = 'success';
      } else if (session.status === 'slip') {
        badgeText = 'Slipped';
        badgeClass = 'aborted';
      }

      li.innerHTML = `
        <div class="history-item-details">
          <span class="history-item-action">${escapeHTML(session.impulse)}</span>
          <span class="history-item-meta">${dateStr} at ${timeStr} • ${session.duration}s</span>
        </div>
        <span class="history-status-badge ${badgeClass}" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${badgeText}
        </span>
      `;
      historyList.appendChild(li);
    });
  }

  // Draw chart categories dynamically inside SVG
  function renderCategoryChart() {
    const barsContainer = document.getElementById('chart-bars');
    barsContainer.innerHTML = '';

    const categories = {
      'Social Media': ['instagram', 'reddit', 'tiktok', 'facebook', 'twitter', 'social', 'feed', 'phone'],
      'Shopping': ['buy', 'shop', 'amazon', 'purchase', 'spend', 'store'],
      'Boredom Eating': ['snack', 'eat', 'food', 'sugar', 'fridge', 'chocolate', 'cookie'],
      'Procrastination': ['youtube', 'game', 'play', 'task', 'work', 'reddit', 'news', 'netflix']
    };

    const counts = {
      'Social Media': 0,
      'Shopping': 0,
      'Boredom Eating': 0,
      'Procrastination': 0,
      'Other': 0
    };

    appState.history.forEach(session => {
      if (session.status !== 'pivot' && session.status !== 'proceed') return; 
      const action = session.impulse.toLowerCase();
      let matched = false;

      for (const [catName, keywords] of Object.entries(categories)) {
        if (keywords.some(kw => action.includes(kw))) {
          counts[catName]++;
          matched = true;
          break;
        }
      }

      if (!matched) {
        counts['Other']++;
      }
    });

    const entries = Object.entries(counts);
    const maxVal = Math.max(...entries.map(e => e[1]), 1); 

    let yOffset = 20;
    entries.forEach(([catName, val]) => {
      const barWidth = (val / maxVal) * 160;
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", "10");
      label.setAttribute("y", yOffset + 7);
      label.setAttribute("class", "chart-label");
      label.textContent = catName;
      
      const barBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      barBg.setAttribute("x", "85");
      barBg.setAttribute("y", yOffset);
      barBg.setAttribute("width", "160");
      barBg.setAttribute("height", "8");
      barBg.setAttribute("rx", "4");
      barBg.setAttribute("fill", "rgba(255, 255, 255, 0.02)");
      
      const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bar.setAttribute("x", "85");
      bar.setAttribute("y", yOffset);
      bar.setAttribute("width", barWidth > 0 ? barWidth : 0);
      bar.setAttribute("height", "8");
      bar.setAttribute("rx", "4");
      bar.setAttribute("fill", `url(#bar-grad-${yOffset})`);

      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
      grad.setAttribute("id", `bar-grad-${yOffset}`);
      grad.setAttribute("x1", "0%");
      grad.setAttribute("y1", "0%");
      grad.setAttribute("x2", "100%");
      grad.setAttribute("y2", "0%");
      
      const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop1.setAttribute("offset", "0%");
      stop1.setAttribute("stop-color", yOffset % 40 === 0 ? "var(--accent-magenta)" : "var(--accent-cyan)");
      
      const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop2.setAttribute("offset", "100%");
      stop2.setAttribute("stop-color", yOffset % 40 === 0 ? "var(--accent-orange)" : "var(--secondary-green)");
      
      grad.appendChild(stop1);
      grad.appendChild(stop2);
      defs.appendChild(grad);
      
      const valText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      valText.setAttribute("x", "255");
      valText.setAttribute("y", yOffset + 7);
      valText.setAttribute("class", "chart-val");
      valText.textContent = val;

      group.appendChild(defs);
      group.appendChild(label);
      group.appendChild(barBg);
      group.appendChild(bar);
      group.appendChild(valText);

      barsContainer.appendChild(group);
      yOffset += 24;
    });
  }

  // Generate 30-day Contribution Heatmap Grid
  function renderHeatmap() {
    const grid = document.getElementById('heatmap-grid');
    const heatmapTotal = document.getElementById('heatmap-total');
    grid.innerHTML = '';

    // Calculate dates array: last 30 days
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d);
    }

    let activeDaysCount = 0;

    days.forEach(date => {
      const dateStr = date.toDateString();
      
      // Filter history for successful entries on this date
      const successesOnDay = appState.history.filter(h => {
        if (h.status !== 'pivot' && h.status !== 'proceed') return false;
        const hDate = new Date(h.timestamp);
        return hDate.toDateString() === dateStr;
      }).length;

      // Classify activity level: 0, 1-2, 3-4, 5+
      let level = 0;
      if (successesOnDay > 0) {
        activeDaysCount++;
        if (successesOnDay <= 2) level = 1;
        else if (successesOnDay <= 4) level = 2;
        else level = 3;
      }

      const cell = document.createElement('div');
      cell.className = `heatmap-cell level-${level}`;
      
      const readableDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      cell.title = `${readableDate}: ${successesOnDay} impulse${successesOnDay !== 1 ? 's' : ''} bypassed`;
      
      grid.appendChild(cell);
    });

    heatmapTotal.innerText = `${activeDaysCount}/30 active days`;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // ==========================================
  // EVENT LISTENERS & UI TRIGGERS
  // ==========================================

  // Tag button clicks shortcuts
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      impulseInput.value = btn.dataset.value;
      impulseInput.focus();
    });
  });

  // Dynamic selector breathing group display toggler
  groundingSelect.addEventListener('change', (e) => {
    breathingTechGroup.style.display = (e.target.value === 'breath') ? 'block' : 'none';
  });

  // Theme switcher trigger
  themeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    document.body.dataset.theme = theme;
    appState.settings.theme = theme;
    saveState();
  });

  // Sound chip selector clicks
  document.querySelectorAll('.sound-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.sound-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      appState.settings.currentSound = chip.dataset.sound;
      saveState();
      
      if (appState.settings.audioEnabled) {
        playAmbientSound();
      }
    });
  });

  // Form submission
  impulseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const impulseVal = impulseInput.value.trim();
    if (!impulseVal) return;

    const durationRadio = document.querySelector('input[name="duration"]:checked');
    const seconds = parseInt(durationRadio ? durationRadio.value : 90);
    const calmingMode = groundingSelect.value;

    startPauseTimer(impulseVal, seconds, calmingMode);
  });

  // Abort clicks
  abortBtn.addEventListener('click', () => {
    if (appState.settings.strictMode && (activeTimer.totalDuration - activeTimer.timeLeft >= 15)) {
      return; 
    }
    finishSession('aborted');
  });

  // Reflection mode buttons
  reflectionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      reflectionBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      selectedOutcome = btn.dataset.outcome;
      pivotOptionsGroup.style.display = (selectedOutcome === 'pivot') ? 'block' : 'none';
    });
  });

  // Pivot option chips
  pivotChips.forEach(chip => {
    chip.addEventListener('click', () => {
      pivotChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedPivotAction = chip.dataset.pivot;
    });
  });

  // Save reflection log
  saveReflectionBtn.addEventListener('click', () => {
    finishSession(
      selectedOutcome, 
      selectedOutcome === 'pivot' ? selectedPivotAction : null
    );
  });

  // Esc key listener to exit timer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeTimer.intervalId) {
      if (appState.settings.strictMode && (activeTimer.totalDuration - activeTimer.timeLeft >= 15)) {
        return; 
      }
      finishSession('aborted');
    }
  });

  // Particle toggle change listener
  particleToggle.addEventListener('change', (e) => {
    toggleParticles(e.target.checked);
  });

  // Audio switch listener
  audioToggle.addEventListener('change', (e) => {
    appState.settings.audioEnabled = e.target.checked;
    saveState();
    if (e.target.checked) {
      playAmbientSound();
    } else {
      stopAmbientSound();
    }
  });

  // Volume slider
  volumeRange.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    appState.settings.volume = val;
    saveState();
    if (masterGain) {
      masterGain.gain.setValueAtTime(val, audioCtx.currentTime);
    }
  });

  // Strict mode toggle
  strictToggle.addEventListener('change', (e) => {
    appState.settings.strictMode = e.target.checked;
    saveState();
  });

  // Clear analytics button
  document.getElementById('clear-stats-btn').addEventListener('click', () => {
    if (confirm("Are you sure you want to clear your local logs and reset your stats? This cannot be undone.")) {
      appState.history = [];
      appState.streak = 0;
      appState.totalSuccesses = 0;
      saveState();
      updateDashboardUI();
    }
  });

  // Tutorial Modals control
  function toggleModal(id, visible) {
    const modal = document.getElementById(id);
    modal.classList.toggle('active', visible);
  }

  document.getElementById('close-intro-btn').addEventListener('click', () => {
    toggleModal('intro-modal', false);
    initAudio(); 
  });

  document.getElementById('reset-tutorial-btn').addEventListener('click', (e) => {
    e.preventDefault();
    toggleModal('intro-modal', true);
  });

  // Initialization calls
  loadState();
  toggleParticles(appState.settings.particleBg);
});
