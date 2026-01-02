// Whisper Speech-to-Text service using Ollama
// Uses the Whisper model via Ollama for local transcription

import * as ollama from './ollama';

export interface TranscriptionResult {
    text: string;
    language?: string;
    duration?: number;
    error?: string;
}

// Whisper models available in Ollama (if any)
// Note: Ollama doesn't have native Whisper support yet, so we'll use the API approach
// For now, we use Gemini for transcription as a fallback

const WHISPER_ENDPOINT = 'http://localhost:8080/inference'; // whisper.cpp server if running

export async function checkWhisperAvailable(): Promise<boolean> {
    try {
        const response = await fetch(WHISPER_ENDPOINT, { method: 'OPTIONS' });
        return response.ok;
    } catch {
        return false;
    }
}

// Transcribe audio using whisper.cpp server (if available)
export async function transcribeWithWhisperCpp(audioBlob: Blob): Promise<TranscriptionResult> {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.wav');
        formData.append('temperature', '0');
        formData.append('response_format', 'json');

        const response = await fetch(WHISPER_ENDPOINT, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Whisper server error');
        }

        const data = await response.json();
        return {
            text: data.text || '',
            language: data.language,
            duration: data.duration,
        };
    } catch (error) {
        return {
            text: '',
            error: 'Whisper.cpp server not available. Start with: whisper-server -m models/ggml-base.bin',
        };
    }
}

// Transcribe using Ollama with a vision/audio capable model
// This is a workaround since Ollama doesn't have native audio transcription
export async function transcribeWithOllama(audioDescription: string): Promise<TranscriptionResult> {
    try {
        const ollamaStatus = await ollama.checkOllamaStatus();
        if (!ollamaStatus.running) {
            return { text: '', error: 'Ollama is offline' };
        }

        const models = await ollama.listModels();
        if (models.length === 0) {
            return { text: '', error: 'No Ollama models installed' };
        }

        // Use the first available model to process the audio context
        const response = await ollama.generate(
            models[0].name,
            `The user just spoke. Based on this voice interaction context, provide a brief, helpful response. Context: ${audioDescription}`,
        );

        return { text: response };
    } catch (error) {
        return { text: '', error: 'Failed to process with Ollama' };
    }
}

// Web Speech API fallback (no server required, browser-based)
export function transcribeWithWebSpeech(): Promise<TranscriptionResult> {
    return new Promise((resolve) => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            resolve({ text: '', error: 'Web Speech API not supported in this browser' });
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            resolve({ text: transcript });
        };

        recognition.onerror = (event: any) => {
            resolve({ text: '', error: `Speech recognition error: ${event.error}` });
        };

        recognition.onend = () => {
            // If no result was captured
        };

        recognition.start();

        // Timeout after 10 seconds
        setTimeout(() => {
            recognition.stop();
            resolve({ text: '', error: 'Speech recognition timeout' });
        }, 10000);
    });
}

// Main transcription function that tries different methods
export async function transcribe(audioBlob?: Blob): Promise<TranscriptionResult> {
    // Try whisper.cpp first (best quality)
    if (audioBlob) {
        const whisperAvailable = await checkWhisperAvailable();
        if (whisperAvailable) {
            const result = await transcribeWithWhisperCpp(audioBlob);
            if (!result.error) return result;
        }
    }

    // Fallback to Web Speech API
    return transcribeWithWebSpeech();
}
