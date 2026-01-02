// Audio capture and playback service using Web Audio API

export interface AudioCaptureState {
    isRecording: boolean;
    isPlaying: boolean;
    audioLevel: number;
    error?: string;
}

export type AudioCallback = (audioData: Float32Array) => void;
export type LevelCallback = (level: number) => void;

class AudioService {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private analyser: AnalyserNode | null = null;
    private processor: ScriptProcessorNode | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;

    private isRecording: boolean = false;
    private audioCallback: AudioCallback | null = null;
    private levelCallback: LevelCallback | null = null;
    private animationFrameId: number | null = null;

    // Initialize audio context (must be called after user interaction)
    async initialize(): Promise<boolean> {
        try {
            this.audioContext = new AudioContext({ sampleRate: 16000 });
            return true;
        } catch (error) {
            console.error('Failed to initialize AudioContext:', error);
            return false;
        }
    }

    // Request microphone permission and start capturing
    async startRecording(
        onAudio?: AudioCallback,
        onLevel?: LevelCallback
    ): Promise<boolean> {
        try {
            if (!this.audioContext) {
                await this.initialize();
            }

            if (!this.audioContext) {
                throw new Error('AudioContext not initialized');
            }

            // Resume context if suspended (browser autoplay policy)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
            });

            // Create audio nodes
            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;

            // Script processor for raw audio access (deprecated but still works)
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            // Connect nodes
            this.sourceNode.connect(this.analyser);
            this.sourceNode.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            // Store callbacks
            this.audioCallback = onAudio || null;
            this.levelCallback = onLevel || null;

            // Handle audio processing
            this.processor.onaudioprocess = (e) => {
                if (this.isRecording && this.audioCallback) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    this.audioCallback(new Float32Array(inputData));
                }
            };

            // Start level monitoring
            if (this.levelCallback) {
                this.startLevelMonitoring();
            }

            this.isRecording = true;
            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            return false;
        }
    }

    // Stop recording
    stopRecording(): void {
        this.isRecording = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }

        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
    }

    // Monitor audio levels for visualization
    private startLevelMonitoring(): void {
        if (!this.analyser || !this.levelCallback) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const updateLevel = () => {
            if (!this.isRecording || !this.analyser) return;

            this.analyser.getByteFrequencyData(dataArray);

            // Calculate average level
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const normalizedLevel = average / 255;

            if (this.levelCallback) {
                this.levelCallback(normalizedLevel);
            }

            this.animationFrameId = requestAnimationFrame(updateLevel);
        };

        updateLevel();
    }

    // Play audio buffer
    async playAudio(audioData: ArrayBuffer): Promise<void> {
        if (!this.audioContext) {
            await this.initialize();
        }

        if (!this.audioContext) return;

        try {
            const audioBuffer = await this.audioContext.decodeAudioData(audioData);
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            source.start();
        } catch (error) {
            console.error('Failed to play audio:', error);
        }
    }

    // Convert Float32Array to WAV blob
    float32ToWav(samples: Float32Array, sampleRate: number = 16000): Blob {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        // WAV header
        const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, samples.length * 2, true);

        // Audio data
        let offset = 44;
        for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    // Get current state
    getState(): AudioCaptureState {
        return {
            isRecording: this.isRecording,
            isPlaying: false,
            audioLevel: 0,
        };
    }

    // Cleanup
    dispose(): void {
        this.stopRecording();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// Export singleton instance
export const audioService = new AudioService();
