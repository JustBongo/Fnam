// Simple Web Audio API sound generators

let audioCtx: AudioContext | null = null;
let humOsc: OscillatorNode | null = null;
let humGain: GainNode | null = null;
let fanOsc: AudioBufferSourceNode | null = null;
let fanGain: GainNode | null = null;

let staticBufferSource: AudioBufferSourceNode | null = null;
let staticGain: GainNode | null = null;

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create static buffer
    const bufferSize = audioCtx.sampleRate * 2; // 2 seconds
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // white noise
    }

    // Static setup
    staticGain = audioCtx.createGain();
    staticGain.gain.value = 0;
    staticGain.connect(audioCtx.destination);
    
    // Filter static so it's not piercing
    const bpf = audioCtx.createBiquadFilter();
    bpf.type = 'lowpass';
    bpf.frequency.value = 1000;
    
    const staticNode = audioCtx.createBufferSource();
    staticNode.buffer = buffer;
    staticNode.loop = true;
    staticNode.connect(bpf);
    bpf.connect(staticGain);
    staticNode.start(0);

    // Hum setup
    humOsc = audioCtx.createOscillator();
    humOsc.type = 'sine';
    humOsc.frequency.value = 60; // low hum
    
    humGain = audioCtx.createGain();
    humGain.gain.value = 0;
    
    humOsc.connect(humGain);
    humGain.connect(audioCtx.destination);
    humOsc.start();
    
    // Fan setup (low rumble + subtle white noise)
    fanGain = audioCtx.createGain();
    fanGain.gain.value = 0;
    fanGain.connect(audioCtx.destination);
    
    const fanFilter = audioCtx.createBiquadFilter();
    fanFilter.type = 'lowpass';
    fanFilter.frequency.value = 400;
    fanFilter.connect(fanGain);
    
    fanOsc = audioCtx.createBufferSource();
    fanOsc.buffer = buffer;
    fanOsc.loop = true;
    fanOsc.connect(fanFilter);
    fanOsc.start(0);
  }
  
  if (audioCtx.state === 'suspended') {
      audioCtx.resume();
  }
}

export function setFanVolume(volume: number) {
  if (fanGain) {
    fanGain.gain.setTargetAtTime(volume, audioCtx!.currentTime, 0.5);
  }
}

export function setHumVolume(volume: number) {
  if (humGain) {
    humGain.gain.setTargetAtTime(volume, audioCtx!.currentTime, 0.5);
  }
}

export function setStaticVolume(volume: number) {
  if (staticGain) {
    staticGain.gain.setTargetAtTime(volume, audioCtx!.currentTime, 0.1);
  }
}

export function playAlarm() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(440, audioCtx.currentTime);
  osc.frequency.setValueAtTime(330, audioCtx.currentTime + 0.5);
  osc.frequency.setValueAtTime(440, audioCtx.currentTime + 1.0);
  
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 1.5);
}

let menuMusicActive = false;
let menuNodes: any[] = [];

export function startMenuMusic() {
    if (!audioCtx || menuMusicActive) return;
    menuMusicActive = true;
    
    const master = audioCtx.createGain();
    master.gain.value = 0.5;
    master.connect(audioCtx.destination);
    menuNodes.push(master);

    // Deep creepy drone (E1)
    const drone = audioCtx.createOscillator();
    drone.type = 'sawtooth'; // richer harmonics
    drone.frequency.value = 41.2;
    
    // Filter to muffle it
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150 + Math.random() * 100;
    
    // Slight LFO for trembling effect
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.2;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 5;
    
    lfo.connect(lfoGain);
    lfoGain.connect(drone.frequency);
    
    drone.connect(filter);
    filter.connect(master);
    
    lfo.start();
    drone.start();
    
    menuNodes.push(drone, filter, lfo, lfoGain);
    
    // Replicate FNAC 2 music box vibes, periodic metallic plucks
    const scheduleBell = () => {
       if(!menuMusicActive || !audioCtx) return;
       const bell = audioCtx.createOscillator();
       bell.type = 'sine';
       // Plucked box notes roughly around C# minor or dim
       bell.frequency.value = [554.37, 659.25, 830.61, 415.30][Math.floor(Math.random()*4)];
       
       const bellGain = audioCtx.createGain();
       bellGain.gain.setValueAtTime(0, audioCtx.currentTime);
       bellGain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
       bellGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5);
       
       // Give the bell a "music box" tone by adding a higher harmonic
       const harmonic = audioCtx.createOscillator();
       harmonic.type = 'sine';
       harmonic.frequency.value = bell.frequency.value * 2;
       const harmGain = audioCtx.createGain();
       harmGain.gain.setValueAtTime(0, audioCtx.currentTime);
       harmGain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.05);
       harmGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
       
       bell.connect(bellGain);
       harmonic.connect(harmGain);
       bellGain.connect(master);
       harmGain.connect(master);
       
       bell.start();
       harmonic.start();
       bell.stop(audioCtx.currentTime+3);
       harmonic.stop(audioCtx.currentTime+3);
       
       setTimeout(scheduleBell, Math.random() * 4000 + 2000);
    };
    scheduleBell();

    const scheduleBassDrop = () => {
        if(!menuMusicActive || !audioCtx) return;
        const drop = audioCtx.createOscillator();
        drop.type = 'sine';
        drop.frequency.setValueAtTime(60, audioCtx.currentTime);
        drop.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 3);
        const dropGain = audioCtx.createGain();
        dropGain.gain.setValueAtTime(0, audioCtx.currentTime);
        dropGain.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.5);
        dropGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 6);
        drop.connect(dropGain);
        dropGain.connect(master);
        drop.start();
        drop.stop(audioCtx.currentTime + 6);

        setTimeout(scheduleBassDrop, Math.random() * 15000 + 10000); // every 10-25s
    };
    scheduleBassDrop();
}

export function stopMenuMusic() {
    menuMusicActive = false;
    menuNodes.forEach(n => {
       if(n.stop) { try{n.stop()}catch(e){} }
       if(n.disconnect) { try{n.disconnect()}catch(e){} }
    });
    menuNodes = [];
}

export function playPhoneRing() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'square';
  osc2.type = 'square';
  osc.frequency.setValueAtTime(440, audioCtx.currentTime);
  osc2.frequency.setValueAtTime(480, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime + 1.5);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.55);
  
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(audioCtx.currentTime);
  osc2.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 2);
  osc2.stop(audioCtx.currentTime + 2);
}

export function playTapeClick() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(100, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.1);
}

let tapeHissGain: GainNode | null = null;
let tapeHissSource: AudioBufferSourceNode | null = null;

export function startTapeHiss() {
  if (!audioCtx || tapeHissSource) return;
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.03; 
  }
  
  tapeHissSource = audioCtx.createBufferSource();
  tapeHissSource.buffer = buffer;
  tapeHissSource.loop = true;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1500;
  filter.Q.value = 0.5;
  
  tapeHissGain = audioCtx.createGain();
  tapeHissGain.gain.value = 1;
  
  tapeHissSource.connect(filter);
  filter.connect(tapeHissGain);
  tapeHissGain.connect(audioCtx.destination);
  
  tapeHissSource.start();
}

export function stopTapeHiss() {
  if (tapeHissSource) {
    try { tapeHissSource.stop(); } catch(e) {}
    tapeHissSource.disconnect();
    tapeHissSource = null;
  }
  if (tapeHissGain) {
    tapeHissGain.disconnect();
    tapeHissGain = null;
  }
}

export function playJumpscareSound() {
  if (!audioCtx) return;
  
  const startTime = audioCtx.currentTime;
  const duration = 2.0;

  const masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  masterGain.gain.setValueAtTime(3.0, startTime);
  masterGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

  // White noise for harsh texture
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.8; 
  }
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;

  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 400; // Let more low end in for roar

  // Laugh oscillators
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const osc3 = audioCtx.createOscillator();
  
  osc1.type = 'sawtooth';
  osc2.type = 'square';
  osc3.type = 'sawtooth';

  // Base frequency for high pitched laugh
  const baseFreq = 1200; // Scarier higher pitch at first
  osc1.frequency.setValueAtTime(baseFreq, startTime);
  osc2.frequency.setValueAtTime(baseFreq * 1.5, startTime);
  osc3.frequency.setValueAtTime(baseFreq * 0.5, startTime);

  osc1.frequency.exponentialRampToValueAtTime(50, startTime + duration);
  osc2.frequency.exponentialRampToValueAtTime(75, startTime + duration);
  osc3.frequency.exponentialRampToValueAtTime(25, startTime + duration);

  // LFO for the "ha-ha-ha" rhythm
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sawtooth'; // harsher modulation
  lfo.frequency.setValueAtTime(30, startTime); // very fast shakes
  lfo.frequency.exponentialRampToValueAtTime(2, startTime + duration); // slows down
  
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0; // The LFO will modulate this
  
  // Modulate the laugh oscillators' volume
  lfo.connect(lfoGain.gain);
  
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(lfoGain);
  osc1.connect(lfoGain);
  osc2.connect(lfoGain);
  osc3.connect(lfoGain);

  // Add distortion
  const distortion = audioCtx.createWaveShaper();
  const curve = new Float32Array(44100);
  for ( let i = 0; i < 44100; ++i ) {
      const x = i * 2 / 44100 - 1;
      curve[i] = ( 15 + 400 ) * x * 20 * (Math.PI / 180) / ( Math.PI + 400 * Math.abs(x) ); // More distortion
  }
  distortion.curve = curve;
  distortion.oversample = '4x';
  
  lfoGain.connect(distortion);
  distortion.connect(masterGain);

  // Pitch modulation for crazy vibrato
  const fmOsc = audioCtx.createOscillator();
  fmOsc.type = 'sine';
  fmOsc.frequency.setValueAtTime(50, startTime);
  const fmGain = audioCtx.createGain();
  fmGain.gain.setValueAtTime(1000, startTime);
  
  fmOsc.connect(fmGain);
  fmGain.connect(osc1.frequency);
  fmGain.connect(osc2.frequency);
  fmGain.connect(osc3.frequency);

  // Blood splatter sounds
  for (let s = 0; s < 5; s++) {
      const splatterTime = startTime + Math.random() * 0.8;
      const splatterDur = 0.15 + Math.random() * 0.1;
      
      const splatterNoise = audioCtx.createBufferSource();
      const bSize2 = audioCtx.sampleRate * splatterDur;
      const b2 = audioCtx.createBuffer(1, bSize2, audioCtx.sampleRate);
      const d2 = b2.getChannelData(0);
      for (let i = 0; i < bSize2; i++) {
         d2[i] = (Math.random() * 2 - 1) * 0.9;
      }
      splatterNoise.buffer = b2;

      const splatterFilter = audioCtx.createBiquadFilter();
      splatterFilter.type = 'lowpass';
      splatterFilter.frequency.setValueAtTime(300 + Math.random() * 200, splatterTime);
      splatterFilter.frequency.exponentialRampToValueAtTime(100, splatterTime + splatterDur);
      
      const splatterGain = audioCtx.createGain();
      splatterGain.gain.setValueAtTime(0, splatterTime);
      splatterGain.gain.linearRampToValueAtTime(2.0, splatterTime + 0.02);
      splatterGain.gain.exponentialRampToValueAtTime(0.01, splatterTime + splatterDur);

      splatterNoise.connect(splatterFilter);
      splatterFilter.connect(splatterGain);
      splatterGain.connect(masterGain);

      splatterNoise.start(splatterTime);
  }

  osc1.start(startTime);
  osc2.start(startTime);
  osc3.start(startTime);
  lfo.start(startTime);
  fmOsc.start(startTime);
  noiseSource.start(startTime);

  osc1.stop(startTime + duration);
  osc2.stop(startTime + duration);
  osc3.stop(startTime + duration);
  lfo.stop(startTime + duration);
  fmOsc.stop(startTime + duration);
  noiseSource.stop(startTime + duration);
}

export function playVictoryMusic() {
  if (!audioCtx) return;
  
  const startTime = audioCtx.currentTime;
  
  // High celebratory beeps (Arpeggio)
  const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51]; 
  notes.forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    
    osc.type = i % 2 === 0 ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(freq, startTime + (i * 0.15));
    
    gain.gain.setValueAtTime(0, startTime + (i * 0.15));
    gain.gain.linearRampToValueAtTime(0.15, startTime + (i * 0.15) + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + (i * 0.15) + 0.4);
    
    osc.connect(gain);
    gain.connect(audioCtx!.destination);
    
    osc.start(startTime + (i * 0.15));
    osc.stop(startTime + (i * 0.15) + 0.5);
  });

  // Low celebratory "dong"
  const lowOsc = audioCtx.createOscillator();
  const lowGain = audioCtx.createGain();
  lowOsc.type = 'sine';
  lowOsc.frequency.setValueAtTime(130.81, startTime); // C3
  lowGain.gain.setValueAtTime(0.3, startTime);
  lowGain.gain.exponentialRampToValueAtTime(0.001, startTime + 2);
  lowOsc.connect(lowGain);
  lowGain.connect(audioCtx.destination);
  lowOsc.start(startTime);
  lowOsc.stop(startTime + 2);

  // Synthesized "Yay!" noise (filtered white noise pulse)
  for (let j = 0; j < 3; j++) {
      const wait = 1.0 + (j * 0.3);
      const spray = audioCtx.createBufferSource();
      const sprayGain = audioCtx.createGain();
      const sprayFilter = audioCtx.createBiquadFilter();
      
      const bSize = audioCtx.sampleRate * 0.5;
      const b = audioCtx.createBuffer(1, bSize, audioCtx.sampleRate);
      const d = b.getChannelData(0);
      for (let k = 0; k < bSize; k++) d[k] = Math.random() * 2 - 1;
      
      spray.buffer = b;
      sprayFilter.type = 'bandpass';
      sprayFilter.frequency.value = 2000 + (j * 500);
      sprayFilter.Q.value = 1;
      
      sprayGain.gain.setValueAtTime(0, startTime + wait);
      sprayGain.gain.linearRampToValueAtTime(0.1, startTime + wait + 0.05);
      sprayGain.gain.exponentialRampToValueAtTime(0.001, startTime + wait + 0.4);
      
      spray.connect(sprayFilter);
      sprayFilter.connect(sprayGain);
      sprayGain.connect(audioCtx.destination);
      spray.start(startTime + wait);
      spray.stop(startTime + wait + 0.5);
  }
}
