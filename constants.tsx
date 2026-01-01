
import { Milestone, ApiEndpoint, ModelConfig } from './types';

export const MILESTONES: Milestone[] = [
  {
    id: 'm1',
    title: 'Setup & Environment',
    duration: '1.5h',
    status: 'completed',
    tasks: ['Repo initialization', 'Docker multi-stage build config', 'Base Python 3.12 environment']
  },
  {
    id: 'm2',
    title: 'Model Integration',
    duration: '2h',
    status: 'completed',
    tasks: ['XTTS-v2 implementation', 'Faster-Whisper optimization', 'ONNX Runtime setup']
  },
  {
    id: 'm3',
    title: 'FastAPI Server',
    duration: '2h',
    status: 'completed',
    tasks: ['Endpoint routing', 'Async audio handling', 'Model caching layer']
  },
  {
    id: 'm4',
    title: 'Voice Interface & Wake Word',
    duration: '1.5h',
    status: 'completed',
    tasks: ['Porcupine SDK integration', 'Background daemon logic', 'Audio session management']
  }
];

export const ENDPOINTS: ApiEndpoint[] = [
  {
    path: '/tts',
    method: 'POST',
    description: 'Convert text to expressive audio using XTTS-v2.',
    input: '{ "text": "Hello world", "speaker_wav": "base64_sample", "language": "en" }',
    output: 'audio/wav binary'
  },
  {
    path: '/stt',
    method: 'POST',
    description: 'Transcribe audio bytes to text via Faster-Whisper.',
    input: '{ "audio": "base64_wav", "task": "transcribe", "beam_size": 5 }',
    output: '{ "text": "Transcribed result", "segments": [...] }'
  },
  {
    path: '/listen',
    method: 'POST',
    description: 'Trigger continuous listening mode.',
    input: '{ "timeout": 5000, "hotword": "Hey Local" }',
    output: '{ "transcript": "detected text" }'
  }
];

export const MODELS: ModelConfig[] = [
  { 
    name: 'XTTS-v2', 
    type: 'TTS', 
    provider: 'Coqui AI', 
    benchmarks: 'Zero-shot cloning, <1s latency',
    vram: '2.4 GB',
    quantization: 'FP16'
  },
  { 
    name: 'Faster-Whisper', 
    type: 'STT', 
    provider: 'SYSTRAN (OpenAI Fork)', 
    benchmarks: 'WER <5%, 4x faster than original',
    vram: '1.1 GB',
    quantization: 'INT8'
  },
  { 
    name: 'Porcupine', 
    type: 'Hotword', 
    provider: 'Picovoice', 
    benchmarks: '99% accuracy offline',
    vram: '0.1 GB',
    quantization: 'N/A'
  }
];
