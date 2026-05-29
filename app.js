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
      currentSound: 'binaural'
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
  const impulseForm = document.getElementById('impulse-form');
  const impulseInput = document.getElementById('impulse-input');
  const startBtn = document.getElementById('start-interruption-btn');
  
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

  // ==========================================
  // AMBIENT PARTICLES ENGINE
  // ==========================================
  const canvas = document.getElementById('ambient-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let particleAnimationId = null;

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
      // Synthesize a cosmic drone with LFO filter modulation
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const osc3 = audioCtx.createOscillator();
      
      osc1.type = 'sawtooth';
      osc1.frequency.value = 55; // A1
      osc2.type = 'triangle';
      osc2.frequency.value = 110; // A2
      osc3.type = 'sine';
      osc3.frequency.value = 165; // E3 (fifth)

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 150;
      filter.Q.value = 6;

      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.15; // very slow cycle (approx 7 seconds)
      lfoGain.gain.value = 80; // modulation range

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
      // Create white noise buffer
      const bufferSize = audioCtx.sampleRate * 2; // 2 seconds
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      // Filter noise to sound like rain (lowpass/bandpass cascade)
      const lpFilter = audioCtx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.value = 800;

      const bpFilter = audioCtx.createBiquadFilter();
      bpFilter.type = 'bandpass';
      bpFilter.frequency.value = 400;
      bpFilter.Q.value = 1;

      // Slow amplitude modulation to mimic wind/surges
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
      // Warm major pentatonic chime chord sequence
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.5); // C6

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.start(now);
      osc.stop(now + 1.3);
    } else {
      // Dissonant descending chime for cancel
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(220.00, now + 0.3); // A3

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
      
    }, 15000); // 15 seconds
  }

  function stopCarousel() {
    clearInterval(promptCarouselInterval);
  }

  // ==========================================
  // INTERACTIVE GROUNDING CONTROLLERS
  // ==========================================
  
  // 1. Guided Breathing (4-7-8 rhythm)
  let breathInterval = null;
  function startBreathingGuide() {
    const bubble = document.getElementById('breath-bubble');
    let breathCount = 0; // cycles through: 0 = in (4s), 1 = hold (7s), 2 = out (8s)
    let count = 0;

    function breathStep() {
      if (activeTimer.timeLeft <= 0) return;

      if (breathCount === 0) { // Breathe In (4 seconds)
        breathingState.innerText = "Breathe In";
        breathingState.style.color = "var(--accent-cyan)";
        bubble.style.transform = "scale(3.2)";
        bubble.style.transition = "transform 4s cubic-bezier(0.4, 0, 0.2, 1)";
        count++;
        if (count >= 4) {
          breathCount = 1;
          count = 0;
        }
      } else if (breathCount === 1) { // Hold (7 seconds)
        breathingState.innerText = "Hold Breath";
        breathingState.style.color = "var(--accent-magenta)";
        bubble.style.transform = "scale(3.2)";
        count++;
        if (count >= 7) {
          breathCount = 2;
          count = 0;
        }
      } else { // Breathe Out (8 seconds)
        breathingState.innerText = "Breathe Out";
        breathingState.style.color = "var(--secondary-green)";
        bubble.style.transform = "scale(1)";
        bubble.style.transition = "transform 8s cubic-bezier(0.4, 0, 0.2, 1)";
        count++;
        if (count >= 8) {
          breathCount = 0;
          count = 0;
        }
      }
    }
    
    // Run immediate first step, then tick every second
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
    
    // Draw dots representing steps left
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
    }, 20000); // cycle slower than general prompt
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
    // Populate stats/details
    activeTimer.totalDuration = durationSeconds;
    activeTimer.timeLeft = durationSeconds;
    activeTimer.impulse = impulse;
    activeTimer.calmingMode = mode;
    activeTimer.startTime = new Date();
    activeTimer.isComplete = false;

    targetImpulseText.innerText = impulse;
    timerDigits.innerText = activeTimer.timeLeft;
    
    // UI layout change
    triggerInputView.classList.remove('active');
    setTimeout(() => {
      timerView.classList.add('active');
      setProgress(100);
    }, 200);

    // Controls setup
    completeBtn.classList.add('disabled');
    completeBtn.disabled = true;
    abortBtn.classList.remove('disabled');
    abortBtn.disabled = false;
    abortBtn.style.display = 'block';

    // Start Audio
    if (appState.settings.audioEnabled) {
      playAmbientSound();
    }

    // Activate selected Grounding Sub-View
    activateGroundingView(mode);
    
    // Start general prompts carousel
    startCarousel();

    // Set countdown interval
    activeTimer.intervalId = setInterval(tickTimer, 1000);
  }

  function tickTimer() {
    activeTimer.timeLeft--;
    timerDigits.innerText = activeTimer.timeLeft;
    
    // Update SVG progress ring
    const percentage = (activeTimer.timeLeft / activeTimer.totalDuration) * 100;
    setProgress(percentage);

    // Check strict mode cancellation lock
    if (appState.settings.strictMode && (activeTimer.totalDuration - activeTimer.timeLeft >= 15)) {
      abortBtn.classList.add('disabled');
      abortBtn.disabled = true;
      abortBtn.title = "Strict mode enabled. Pause cannot be aborted after 15s.";
    }

    // Complete timer
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
    }
  }

  function finishSession(bypassed) {
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
      status: bypassed ? 'success' : 'aborted'
    };

    appState.history.unshift(session);

    if (bypassed) {
      appState.totalSuccesses++;
      
      // Calculate daily streak logic (simplified)
      // Check last success date and increment streak if yesterday, or maintain if today.
      updateStreak();
    } else {
      // Aborted. Reset streak.
      appState.streak = 0;
      playChime(false);
    }

    saveState();
    updateDashboardUI();

    // Toggle back to dashboard input
    timerView.classList.remove('active');
    setTimeout(() => {
      triggerInputView.classList.add('active');
      impulseInput.value = '';
    }, 200);
  }

  function updateStreak() {
    if (appState.history.length === 0) return;
    
    // Simply increment streak for testing, resetting if last successful log was over 48 hours ago
    const successes = appState.history.filter(h => h.status === 'success');
    if (successes.length <= 1) {
      appState.streak = 1;
      return;
    }

    const lastTime = new Date(successes[0].timestamp);
    const prevTime = new Date(successes[1].timestamp);
    
    const diffHours = (lastTime - prevTime) / (1000 * 60 * 60);

    if (diffHours < 36) { // inside 1.5 days interval
      // Determine if they are on a new calendar day
      if (lastTime.getDate() !== prevTime.getDate()) {
        appState.streak++;
      }
    } else {
      appState.streak = 1; // streak broke, reset to 1
    }
  }

  // ==========================================
  // ANALYTICS & DASHBOARD RENDERING
  // ==========================================
  function updateDashboardUI() {
    // Stats indicators
    streakCounter.innerText = appState.streak;
    totalSuccesses.innerText = appState.totalSuccesses;

    // Rate calculations
    const totalSessions = appState.history.length;
    const successesCount = appState.history.filter(h => h.status === 'success').length;
    const bypassRate = totalSessions > 0 ? Math.round((successesCount / totalSessions) * 100) : 0;
    bypassRateElement.innerText = `${bypassRate}%`;

    // Total time count
    const totalSecs = appState.history.reduce((acc, curr) => acc + curr.elapsed, 0);
    const totalMins = Math.round(totalSecs / 60);
    totalMinsElement.innerText = `${totalMins}m`;

    // History Log visual rendering
    renderHistoryLog();

    // Graph visual rendering
    renderCategoryChart();
  }

  function renderHistoryLog() {
    historyList.innerHTML = '';
    
    if (appState.history.length === 0) {
      historyList.innerHTML = '<li class="history-empty">No impulses logged yet. Start a pause to log your success!</li>';
      return;
    }

    // Limit to latest 10 items in DOM
    const items = appState.history.slice(0, 10);
    items.forEach(session => {
      const li = document.createElement('li');
      li.className = 'history-item';
      
      const date = new Date(session.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

      li.innerHTML = `
        <div class="history-item-details">
          <span class="history-item-action">${escapeHTML(session.impulse)}</span>
          <span class="history-item-meta">${dateStr} at ${timeStr} • ${session.duration}s</span>
        </div>
        <span class="history-status-badge ${session.status === 'success' ? 'success' : 'aborted'}">
          ${session.status === 'success' ? 'Bypassed' : 'Aborted'}
        </span>
      `;
      historyList.appendChild(li);
    });
  }

  // Draw chart categories dynamically inside SVG
  function renderCategoryChart() {
    const barsContainer = document.getElementById('chart-bars');
    barsContainer.innerHTML = '';

    // Classify impulsives
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
      if (session.status !== 'success') return; // only chart successes
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
    const maxVal = Math.max(...entries.map(e => e[1]), 1); // avoid division by zero

    let yOffset = 20;
    entries.forEach(([catName, val]) => {
      // Calculate width (max width 160px from x=75)
      const barWidth = (val / maxVal) * 160;
      
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      
      // Label
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", "10");
      label.setAttribute("y", yOffset + 7);
      label.setAttribute("class", "chart-label");
      label.textContent = catName;
      
      // Bar background
      const barBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      barBg.setAttribute("x", "85");
      barBg.setAttribute("y", yOffset);
      barBg.setAttribute("width", "160");
      barBg.setAttribute("height", "8");
      barBg.setAttribute("rx", "4");
      barBg.setAttribute("fill", "rgba(255, 255, 255, 0.02)");
      
      // Active Bar with gradient filling
      const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bar.setAttribute("x", "85");
      bar.setAttribute("y", yOffset);
      bar.setAttribute("width", barWidth > 0 ? barWidth : 0);
      bar.setAttribute("height", "8");
      bar.setAttribute("rx", "4");
      bar.setAttribute("fill", `url(#bar-grad-${yOffset})`);

      // Create unique linear gradient for each bar to follow design aesthetics
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
      
      // Value number text
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

  // Helper sanitization
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

    // Read configured duration
    const durationRadio = document.querySelector('input[name="duration"]:checked');
    const seconds = parseInt(durationRadio ? durationRadio.value : 90);

    // Read calming mode selection
    const calmingMode = document.getElementById('grounding-select').value;

    startPauseTimer(impulseVal, seconds, calmingMode);
  });

  // Abort / Complete clicks
  abortBtn.addEventListener('click', () => {
    if (appState.settings.strictMode && (activeTimer.totalDuration - activeTimer.timeLeft >= 15)) {
      return; // strict mode locked
    }
    finishSession(false);
  });

  completeBtn.addEventListener('click', () => {
    if (activeTimer.isComplete) {
      finishSession(true);
    }
  });

  // Esc key listener to exit timer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeTimer.intervalId) {
      if (appState.settings.strictMode && (activeTimer.totalDuration - activeTimer.timeLeft >= 15)) {
        return; // locked
      }
      finishSession(false);
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
    initAudio(); // warm up context
  });

  document.getElementById('reset-tutorial-btn').addEventListener('click', (e) => {
    e.preventDefault();
    toggleModal('intro-modal', true);
  });

  // Initialization calls
  loadState();
  toggleParticles(appState.settings.particleBg);
});
