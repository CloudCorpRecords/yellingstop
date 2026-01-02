// Hugging Face API service for model discovery and download

const HF_API_BASE = 'https://huggingface.co/api';

export interface HFModel {
    id: string;
    modelId: string;
    author: string;
    sha: string;
    lastModified: string;
    private: boolean;
    downloads: number;
    likes: number;
    tags: string[];
    pipeline_tag?: string;
    library_name?: string;
}

export interface HFModelDetails {
    id: string;
    author: string;
    sha: string;
    downloads: number;
    likes: number;
    tags: string[];
    pipeline_tag?: string;
    library_name?: string;
    siblings: { rfilename: string; size?: number }[];
    cardData?: {
        language?: string[];
        license?: string;
    };
}

export interface SearchFilters {
    task?: 'automatic-speech-recognition' | 'text-to-speech' | 'audio-classification';
    library?: 'transformers' | 'onnx' | 'ctranslate2';
    sort?: 'downloads' | 'likes' | 'lastModified';
    limit?: number;
}

// Search models on Hugging Face
export async function searchModels(
    query: string,
    filters: SearchFilters = {}
): Promise<HFModel[]> {
    try {
        const params = new URLSearchParams();
        if (query) params.append('search', query);
        if (filters.task) params.append('pipeline_tag', filters.task);
        if (filters.library) params.append('library', filters.library);
        params.append('sort', filters.sort || 'downloads');
        params.append('direction', '-1');
        params.append('limit', String(filters.limit || 20));

        const response = await fetch(`${HF_API_BASE}/models?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to search models');

        return await response.json();
    } catch (error) {
        console.error('HF search error:', error);
        return [];
    }
}

// Get model details
export async function getModelDetails(modelId: string): Promise<HFModelDetails | null> {
    try {
        const response = await fetch(`${HF_API_BASE}/models/${modelId}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('HF model details error:', error);
        return null;
    }
}

// Get trending voice models
export async function getTrendingVoiceModels(): Promise<HFModel[]> {
    try {
        // Get STT models
        const sttModels = await searchModels('whisper', {
            task: 'automatic-speech-recognition',
            sort: 'downloads',
            limit: 10,
        });

        // Get TTS models
        const ttsModels = await searchModels('tts', {
            task: 'text-to-speech',
            sort: 'downloads',
            limit: 10,
        });

        // Combine and sort by downloads
        const combined = [...sttModels, ...ttsModels];
        combined.sort((a, b) => b.downloads - a.downloads);

        return combined.slice(0, 15);
    } catch (error) {
        console.error('Error fetching trending models:', error);
        return [];
    }
}

// Format download count
export function formatDownloads(count: number): string {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return String(count);
}

// Get download URL for a file
export function getFileDownloadUrl(modelId: string, filename: string): string {
    return `https://huggingface.co/${modelId}/resolve/main/${filename}`;
}

// Download a file from Hugging Face (returns blob URL)
export async function downloadFile(
    modelId: string,
    filename: string,
    onProgress?: (progress: number) => void
): Promise<Blob | null> {
    try {
        const url = getFileDownloadUrl(modelId, filename);
        const response = await fetch(url);

        if (!response.ok) throw new Error('Download failed');

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        const reader = response.body?.getReader();
        if (!reader) return null;

        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            received += value.length;

            if (onProgress && total > 0) {
                onProgress(received / total);
            }
        }

        // Concatenate chunks into a single Uint8Array
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        const blob = new Blob([result]);
        return blob;
    } catch (error) {
        console.error('Download error:', error);
        return null;
    }
}

// Get popular Whisper models
export async function getWhisperModels(): Promise<HFModel[]> {
    return searchModels('whisper', {
        task: 'automatic-speech-recognition',
        sort: 'downloads',
        limit: 20,
    });
}

// Get popular TTS models
export async function getTTSModels(): Promise<HFModel[]> {
    return searchModels('', {
        task: 'text-to-speech',
        sort: 'downloads',
        limit: 20,
    });
}

// Curated list of recommended models
export const RECOMMENDED_MODELS = {
    whisper: [
        { id: 'openai/whisper-large-v3', name: 'Whisper Large v3', size: '3.1 GB' },
        { id: 'openai/whisper-medium', name: 'Whisper Medium', size: '1.5 GB' },
        { id: 'openai/whisper-small', name: 'Whisper Small', size: '488 MB' },
        { id: 'openai/whisper-base', name: 'Whisper Base', size: '145 MB' },
        { id: 'openai/whisper-tiny', name: 'Whisper Tiny', size: '77 MB' },
    ],
    tts: [
        { id: 'coqui/XTTS-v2', name: 'XTTS v2', size: '1.8 GB' },
        { id: 'suno/bark', name: 'Bark', size: '5.0 GB' },
        { id: 'facebook/mms-tts-eng', name: 'MMS TTS English', size: '290 MB' },
    ],
    faster_whisper: [
        { id: 'Systran/faster-whisper-large-v3', name: 'Faster Whisper Large v3', size: '1.6 GB' },
        { id: 'Systran/faster-whisper-medium', name: 'Faster Whisper Medium', size: '780 MB' },
        { id: 'Systran/faster-whisper-small', name: 'Faster Whisper Small', size: '250 MB' },
        { id: 'Systran/faster-whisper-base', name: 'Faster Whisper Base', size: '75 MB' },
        { id: 'Systran/faster-whisper-tiny', name: 'Faster Whisper Tiny', size: '40 MB' },
    ],
};
