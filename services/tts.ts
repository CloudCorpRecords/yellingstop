// Text-to-Speech service using Web Speech API

export interface TTSOptions {
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
}

export interface Voice {
    name: string;
    lang: string;
    default: boolean;
}

class TTSService {
    private synth: SpeechSynthesis | null = null;
    private voices: SpeechSynthesisVoice[] = [];
    private isSpeaking: boolean = false;

    constructor() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            this.loadVoices();

            // Voices may load asynchronously
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.loadVoices();
            }
        }
    }

    private loadVoices() {
        if (this.synth) {
            this.voices = this.synth.getVoices();
        }
    }

    // Get available voices
    getVoices(): Voice[] {
        return this.voices.map(v => ({
            name: v.name,
            lang: v.lang,
            default: v.default,
        }));
    }

    // Get English voices only
    getEnglishVoices(): Voice[] {
        return this.getVoices().filter(v => v.lang.startsWith('en'));
    }

    // Find a good default voice
    getDefaultVoice(): SpeechSynthesisVoice | null {
        // Prefer these voices for quality
        const preferred = ['Samantha', 'Alex', 'Daniel', 'Karen', 'Moira'];

        for (const name of preferred) {
            const voice = this.voices.find(v => v.name.includes(name));
            if (voice) return voice;
        }

        // Fallback to any English voice
        const englishVoice = this.voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) return englishVoice;

        // Last resort: first available voice
        return this.voices[0] || null;
    }

    // Speak text
    speak(text: string, options: TTSOptions = {}): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.synth) {
                reject(new Error('Speech synthesis not available'));
                return;
            }

            // Cancel any ongoing speech
            this.stop();

            const utterance = new SpeechSynthesisUtterance(text);

            // Set voice
            if (options.voice) {
                const voice = this.voices.find(v => v.name === options.voice);
                if (voice) utterance.voice = voice;
            } else {
                const defaultVoice = this.getDefaultVoice();
                if (defaultVoice) utterance.voice = defaultVoice;
            }

            // Set other options
            utterance.rate = options.rate ?? 1.0;
            utterance.pitch = options.pitch ?? 1.0;
            utterance.volume = options.volume ?? 1.0;

            utterance.onstart = () => {
                this.isSpeaking = true;
            };

            utterance.onend = () => {
                this.isSpeaking = false;
                resolve();
            };

            utterance.onerror = (event) => {
                this.isSpeaking = false;
                reject(new Error(`Speech error: ${event.error}`));
            };

            this.synth.speak(utterance);
        });
    }

    // Stop speaking
    stop() {
        if (this.synth) {
            this.synth.cancel();
            this.isSpeaking = false;
        }
    }

    // Pause speaking
    pause() {
        if (this.synth) {
            this.synth.pause();
        }
    }

    // Resume speaking
    resume() {
        if (this.synth) {
            this.synth.resume();
        }
    }

    // Check if currently speaking
    speaking(): boolean {
        return this.isSpeaking;
    }

    // Check if TTS is available
    isAvailable(): boolean {
        return this.synth !== null && this.voices.length > 0;
    }
}

// Export singleton instance
export const ttsService = new TTSService();
