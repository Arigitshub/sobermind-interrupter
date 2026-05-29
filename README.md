# SoberMind // Autopilot Interrupter

SoberMind is a premium, single-page mindfulness and impulse-control web application designed to interrupt automatic behaviors (such as phone checking, emotional snacking, or impulsive shopping) using a visual countdown timer, somatic breathing exercises, and cognitive reframing prompts.

---

## ✨ Features

1. **Autopilot Pause Timer (90-Second Rule)**
   - A customizable timer (60s to 3m) built around the psychological 90-second emotional curve.
   - SVG countdown loop synced with breath pacing.

2. **Calming Grounding Modes**
   - **Guided Breathing**: Interactive breathing circle visually expanding and shrinking in a 4-7-8 rhythm.
   - **Somatic Sensory Check**: Stepper form utilizing the 5-4-3-2-1 grounding method.
   - **Reframing Prompts**: Self-reflection prompts to intercept avoidance mechanisms.
   - **Zen Space**: Silent ambient visualization with calming philosophical thoughts.

3. **Ambient Sound Synthesizer (Web Audio API)**
   - Built-in, local soundscapes (no audio files required!):
     - **Binaural Theta**: Frequencies designed to foster calm focus.
     - **Synthetic Rain**: Multi-layered noise sweeps mimicking rain showers.
     - **Dark Drone**: Stacked oscillators modulated with low frequency waves for depth.

4. **Visual Analytics Dashboard**
   - Live daily success streak.
   - Core statistics: Bypass success rate, total duration paused.
   - SVG Bar Chart indicating logs sorted by impulse category.
   - Scrollable session log of previous attempts.

5. **Strict Mode Enforcement**
   - Prevents the user from canceling the pause after the first 15 seconds have passed, interrupting automatic behaviors.

---

## 🛠️ Technology Stack
* **Structure:** Semantic HTML5
* **Design & Aesthetics:** Custom CSS3 with glassmorphism, responsive grid flex layouts, variables, keyframe animations, and radial glows.
* **Logic & Audio Engine:** Vanilla ECMAScript (JS) using HTML5 Canvas particles and the standard Web Audio API.

---

## 📂 Project Structure
* [index.html](file:///D:/sobermind-interrupter/index.html) - Structural semantic elements & modals.
* [style.css](file:///D:/sobermind-interrupter/style.css) - Visual design, typography (Outfit & Inter), glassmorphism properties, and animations.
* [app.js](file:///D:/sobermind-interrupter/app.js) - Sound synthesis, particle generation, countdown states, storage syncing, and event listeners.

---

## 🚀 Running the Project

### Option A: Local Serving (Recommended)
You can serve the project using Vite:
1. Open your terminal in the directory: `D:\sobermind-interrupter`
2. Install dev dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Click on the local address (usually `http://localhost:5173`) in your terminal to open it in your browser.

### Option B: Zero-Install Launch
Since the project uses vanilla technologies and local synthetic audio generation, you can open the [index.html](file:///D:/sobermind-interrupter/index.html) file directly in any modern web browser to run the application immediately.
