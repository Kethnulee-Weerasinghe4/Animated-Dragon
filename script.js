"use strict";

// to define the XML namespace required for creating SVG elements dynamically
const SVG_NS = "http://www.w3.org/2000/svg";
// to reference the SVG group where the dragon segments will be rendered
const stage = document.getElementById("screen");

// to ensure the visual environment is immersive by removing margins and hiding scrollbars
document.body.style.backgroundColor = "#000";
document.body.style.margin = "0";
document.body.style.overflow = "hidden";

// to manage the global state, tracking window dimensions, movement targets, and animation timing
const app = {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    target: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    segments: [],
    total: 45,
    time: 0,
    canFlutter: true, 
    isMovingFast: false
};

/*sound*/
let audioCtx, masterGain;

// to initialize the Web Audio API context only after a user gesture to comply with browser autoplay policies
function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
}

// to synthesize a organic sound using white noise and frequency filters whenever the dragon moves quickly
function playWingFlutter() {
    if (!audioCtx || !app.canFlutter) return;
    
    // to prevent overlapping audio triggers by implementing a state-based cooldown
    app.canFlutter = false; 

    const bufferSize = audioCtx.sampleRate * 2.0; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // to generate raw white noise which serves as the base texture for the wing sound
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    
    // to simulate the heavy, low-frequency air displacement of large wings by cutting off high frequencies
    filter.frequency.setValueAtTime(200, audioCtx.currentTime);
    filter.Q.value = 8;

    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0, audioCtx.currentTime);

    const now = audioCtx.currentTime;
    const flapCount = 4; 
    const duration = 1.2; 
    
    // to create a rhythmic pulsing effect by automating the gain and filter frequency over time
    for (let i = 0; i < flapCount; i++) {
        const time = now + (i * (duration / flapCount));
        
        // to smooth the volume spikes for a more natural "whoosh" feel rather than sharp digital clicks
        g.gain.exponentialRampToValueAtTime(0.4, time + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
        
        filter.frequency.exponentialRampToValueAtTime(500, time + 0.1);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.25);
    }

    noise.connect(filter).connect(g).connect(masterGain);
    noise.start();
    noise.stop(now + duration);
    
    // to reset the flutter state after a delay, ensuring the sound matches the visual flap speed
    setTimeout(() => { app.canFlutter = true; }, 1500);
}

/*core engine*/

// to generate a new <use> element that references predefined SVG assets in the HTML defs
function createUseNode(id) {
    const el = document.createElementNS(SVG_NS, "use");
    el.setAttribute("href", `#${id}`);
    el.setAttribute("fill", "white");
    // to place new segments behind previous ones, ensuring the head stays on top visually
    stage.prepend(el);
    return el;
}

// to initialize the dragon's body by creating an array of segment objects with coordinate and node data
function buildCreature() {
    for (let i = 0; i < app.total; i++) {
        app.segments.push({ 
            x: app.viewport.w / 2, 
            y: app.viewport.h / 2, 
            node: null, 
            wobble: Math.random() * 10 
        });
    }
    // to assign specific SVG assets (Head, Fins, or Spine) to each segment based on its index
    for (let i = 1; i < app.total; i++) {
        let part = (i === 1) ? "Head" : (i % 12 === 0) ? "Fins" : "Spine";
        app.segments[i].node = createUseNode(part);
    }
}

// to execute the main animation loop, calculating physics and updating visual attributes every frame
function tick() {
    const head = app.segments[0];
    
    // to add a subtle "breathing" or floating movement so the dragon feels alive even when stationary
    const breathX = Math.cos(app.time * 1.5) * 40;
    const breathY = Math.sin(app.time * 2.1) * 40;
    
    // to calculate the distance between the head and the mouse to determine speed and triggers
    const dx = (app.target.x + breathX) - head.x;
    const dy = (app.target.y + breathY) - head.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // to trigger the sound effect and shiver animation if the dragon is chasing the target at high speed
    app.isMovingFast = dist > 200;
    if (app.isMovingFast) playWingFlutter();

    // to apply easing to the head's movement so it follows the target smoothly instead of instantly
    head.x += dx * 0.08;
    head.y += dy * 0.08;

    // to create a shifting color palette based on the elapsed animation time
    const hue = (app.time * 50) % 360;

    // to update the trailing segments by making each one follow the position and angle of the segment before it
    for (let i = 1; i < app.segments.length; i++) {
        const cur = app.segments[i];
        const prev = app.segments[i - 1];
        const angle = Math.atan2(cur.y - prev.y, cur.x - prev.x);
        
        // to create a "spring" effect where segments have more tension near the head and become looser at the tail
        const tension = (app.total - i) * 0.12;

        cur.x += (prev.x - cur.x + Math.cos(angle) * tension) * 0.25;
        cur.y += (prev.y - cur.y + Math.sin(angle) * tension) * 0.25;

        if (cur.node) {
            // to taper the dragon's body by gradually reducing the scale of segments further from the head
            const scale = (140 - i * 2.5) / 50;
            
            // to apply a vibration effect that increases in intensity when the dragon is moving fast
            const shiverIntensity = app.isMovingFast ? 3 : 0.5;
            const shiver = Math.sin(app.time * 20 + cur.wobble) * shiverIntensity;
            
            // to create a rainbow gradient effect that flows down the length of the body
            const segmentHue = (hue - (i * 2)) % 360;
            const brightness = app.isMovingFast ? "70%" : "40%";
            cur.node.style.fill = `hsl(${segmentHue}, 80%, ${brightness})`;
            
            // to update the actual SVG element position, rotation, and size in the DOM
            cur.node.setAttribute("transform", 
                `translate(${cur.x},${cur.y}) rotate(${angle * 180 / Math.PI + shiver}) scale(${Math.max(0.1, scale)})`
            );
        }
    }

    // to advance the internal clock and request the next frame for a smooth 60fps animation
    app.time += 0.015;
    requestAnimationFrame(tick);
}

/*listners*/

// to update the movement target coordinates whenever the user moves their mouse or finger
window.addEventListener("pointermove", e => {
    app.target.x = e.clientX;
    app.target.y = e.clientY;
    // to resume audio context if the browser suspended it due to inactivity
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
});

// to trigger the audio initialization on the first interaction to satisfy security requirements
window.addEventListener("pointerdown", initAudio);

// to adjust the internal viewport measurements if the user resizes the browser window
window.addEventListener("resize", () => {
    app.viewport.w = window.innerWidth;
    app.viewport.h = window.innerHeight;
});

// to start the application by constructing the dragon and entering the animation loop
buildCreature();
tick();