import { detectPitch, type PitchReading } from './pitchDetection';

type PitchCallback = (reading: PitchReading | null, timestamp: number) => void;

class MicrophonePitch {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrame: number | null = null;

  async start(callback: PitchCallback): Promise<void> {
    await this.stop();
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not supported by this browser.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false
      }
    });
    this.context = new AudioContext();
    await this.context.resume();
    this.source = this.context.createMediaStreamSource(this.stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0;
    this.source.connect(this.analyser);

    const samples = new Float32Array(this.analyser.fftSize);
    let lastAnalysis = 0;
    const analyse = (timestamp: number) => {
      if (!this.analyser || !this.context) return;
      if (timestamp - lastAnalysis >= 32) {
        this.analyser.getFloatTimeDomainData(samples);
        callback(detectPitch(samples, this.context.sampleRate), timestamp);
        lastAnalysis = timestamp;
      }
      this.animationFrame = requestAnimationFrame(analyse);
    };
    this.animationFrame = requestAnimationFrame(analyse);
  }

  async stop(): Promise<void> {
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.source = null;
    this.analyser = null;
    this.stream = null;
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') await context.close();
  }
}

export const microphonePitch = new MicrophonePitch();
