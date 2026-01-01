
export enum View {
  DASHBOARD = 'DASHBOARD',
  LOCAL_REGISTRY = 'LOCAL_REGISTRY',
  API_PLAYGROUND = 'API_PLAYGROUND',
  LIVE_DEMO = 'LIVE_DEMO',
  ARCHITECTURE = 'ARCHITECTURE',
  GEMINI_STUDIO = 'GEMINI_STUDIO',
  MODEL_CONTROL = 'MODEL_CONTROL'
}

export interface Milestone {
  id: string;
  title: string;
  duration: string;
  tasks: string[];
  status: 'pending' | 'in-progress' | 'completed';
}

export interface ApiEndpoint {
  path: string;
  method: 'POST' | 'GET';
  description: string;
  input: string;
  output: string;
}

export interface ModelConfig {
  name: string;
  type: 'TTS' | 'STT' | 'Hotword';
  provider: string;
  benchmarks: string;
  vram?: string;
  quantization?: string;
}
