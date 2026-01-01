
import React from 'react';
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
    status: 'in-progress',
    tasks: ['XTTS-v2 implementation', 'Faster-Whisper optimization', 'ONNX Runtime setup']
  },
  {
    id: 'm3',
    title: 'FastAPI Server',
    duration: '2h',
    status: 'pending',
    tasks: ['Endpoint routing', 'Async audio handling', 'Model caching layer']
  },
  {
    id: 'm4',
    title: 'Voice Interface & Wake Word',
    duration: '1.5h',
    status: 'pending',
    tasks: ['Porcupine SDK integration', 'Background daemon logic', 'Audio session management']
  }
];

export const ENDPOINTS: ApiEndpoint[] = [
  {
    path: '/tts',
    method: 'POST',
    description: 'Convert text to expressive audio.',
    input: '{ "text": "Hello world", "voice": "clarity" }',
    output: 'audio/wav binary'
  },
  {
    path: '/stt',
    method: 'POST',
    description: 'Transcribe audio bytes to text.',
    input: 'audio/wav binary',
    output: '{ "transcript": "user input text" }'
  },
  {
    path: '/listen',
    method: 'POST',
    description: 'Trigger continuous listening mode.',
    input: '{ "timeout": 5000 }',
    output: '{ "transcript": "detected text" }'
  }
];

export const MODELS: ModelConfig[] = [
  { name: 'XTTS-v2', type: 'TTS', provider: 'Coqui AI', benchmarks: 'Zero-shot cloning, <1s latency' },
  { name: 'Faster-Whisper', type: 'STT', provider: 'OpenAI (Fork)', benchmarks: 'WER <5%, edge-optimized' },
  { name: 'Porcupine', type: 'Hotword', provider: 'Picovoice', benchmarks: '99% accuracy offline' }
];
