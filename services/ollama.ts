// Ollama API service for model management and inference

const OLLAMA_BASE_URL = 'http://localhost:11434';

export interface OllamaModel {
    name: string;
    size: number;
    digest: string;
    modified_at: string;
    details?: {
        format: string;
        family: string;
        parameter_size: string;
        quantization_level: string;
    };
}

export interface OllamaStatus {
    running: boolean;
    version?: string;
    models?: OllamaModel[];
}

// Check if Ollama is running
export async function checkOllamaStatus(): Promise<OllamaStatus> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/version`);
        if (!response.ok) throw new Error('Ollama not responding');
        const data = await response.json();
        return { running: true, version: data.version };
    } catch (error) {
        return { running: false };
    }
}

// List all installed models
export async function listModels(): Promise<OllamaModel[]> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (!response.ok) throw new Error('Failed to fetch models');
        const data = await response.json();
        return data.models || [];
    } catch (error) {
        console.error('Error listing models:', error);
        return [];
    }
}

// Pull a model from Ollama registry
export async function pullModel(
    modelName: string,
    onProgress?: (status: string, completed: number, total: number) => void
): Promise<boolean> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName, stream: true }),
        });

        if (!response.ok) throw new Error('Failed to pull model');

        const reader = response.body?.getReader();
        if (!reader) return false;

        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (onProgress && data.total) {
                        onProgress(data.status || 'Downloading...', data.completed || 0, data.total);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }

        return true;
    } catch (error) {
        console.error('Error pulling model:', error);
        return false;
    }
}

// Delete a model
export async function deleteModel(modelName: string): Promise<boolean> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName }),
        });
        return response.ok;
    } catch (error) {
        console.error('Error deleting model:', error);
        return false;
    }
}

// Generate text from a model
export async function generate(
    model: string,
    prompt: string,
    onToken?: (token: string) => void
): Promise<string> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: true }),
        });

        if (!response.ok) throw new Error('Failed to generate');

        const reader = response.body?.getReader();
        if (!reader) return '';

        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.response) {
                        fullResponse += data.response;
                        if (onToken) onToken(data.response);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }

        return fullResponse;
    } catch (error) {
        console.error('Error generating:', error);
        return '';
    }
}

// Format file size bytes to human readable
export function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
