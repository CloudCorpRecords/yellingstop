import React, { useState, useEffect, useRef } from 'react';
import * as ollama from '../services/ollama';
import * as hf from '../services/huggingface';

// Model categories with icons
type ModelCategory = 'llm' | 'tts' | 'stt' | 'embedding' | 'vision';

interface ModelDefinition {
  id: string;
  name: string;
  description: string;
  size: string;
  category: ModelCategory;
  provider: 'ollama' | 'huggingface' | 'local';
  requirements?: {
    minRam: number; // GB
    minVram?: number; // GB
    platform?: ('darwin' | 'win32' | 'linux')[];
  };
  tags?: string[];
}

// Device info
interface DeviceInfo {
  platform: string;
  arch: string;
  totalRam: number;
  freeRam: number;
  hasGpu: boolean;
  gpuVram?: number;
}

// Comprehensive model library
const MODEL_LIBRARY: ModelDefinition[] = [
  // LLM Models (Ollama)
  { id: 'llama3.2:1b', name: 'Llama 3.2 1B', description: 'Fast, lightweight LLM', size: '1.3 GB', category: 'llm', provider: 'ollama', requirements: { minRam: 4 }, tags: ['fast', 'chat'] },
  { id: 'llama3.2:3b', name: 'Llama 3.2 3B', description: 'Balanced performance', size: '2.0 GB', category: 'llm', provider: 'ollama', requirements: { minRam: 8 }, tags: ['balanced'] },
  { id: 'mistral:7b', name: 'Mistral 7B', description: 'Excellent reasoning', size: '4.1 GB', category: 'llm', provider: 'ollama', requirements: { minRam: 8 }, tags: ['reasoning'] },
  { id: 'gemma2:2b', name: 'Gemma 2 2B', description: 'Google Gemma 2B', size: '1.6 GB', category: 'llm', provider: 'ollama', requirements: { minRam: 4 }, tags: ['google'] },
  { id: 'phi3:mini', name: 'Phi-3 Mini', description: 'Microsoft Phi-3', size: '2.3 GB', category: 'llm', provider: 'ollama', requirements: { minRam: 4 }, tags: ['microsoft', 'fast'] },
  { id: 'qwen2.5:1.5b', name: 'Qwen 2.5 1.5B', description: 'Alibaba Qwen', size: '1.0 GB', category: 'llm', provider: 'ollama', requirements: { minRam: 4 }, tags: ['multilingual'] },

  // STT Models (Speech-to-Text)
  { id: 'whisper-tiny', name: 'Whisper Tiny', description: 'Fastest, basic accuracy', size: '77 MB', category: 'stt', provider: 'huggingface', requirements: { minRam: 2 }, tags: ['fast'] },
  { id: 'whisper-base', name: 'Whisper Base', description: 'Good balance', size: '145 MB', category: 'stt', provider: 'huggingface', requirements: { minRam: 2 }, tags: ['balanced'] },
  { id: 'whisper-small', name: 'Whisper Small', description: 'Better accuracy', size: '488 MB', category: 'stt', provider: 'huggingface', requirements: { minRam: 4 }, tags: ['accurate'] },
  { id: 'whisper-medium', name: 'Whisper Medium', description: 'High accuracy', size: '1.5 GB', category: 'stt', provider: 'huggingface', requirements: { minRam: 8 }, tags: ['accurate'] },
  { id: 'whisper-large-v3', name: 'Whisper Large v3', description: 'Best accuracy', size: '3.1 GB', category: 'stt', provider: 'huggingface', requirements: { minRam: 16 }, tags: ['best', 'slow'] },

  // TTS Models (Text-to-Speech)
  { id: 'piper-en-amy', name: 'Piper Amy', description: 'English female voice', size: '75 MB', category: 'tts', provider: 'huggingface', requirements: { minRam: 2 }, tags: ['english', 'female'] },
  { id: 'piper-en-ryan', name: 'Piper Ryan', description: 'English male voice', size: '75 MB', category: 'tts', provider: 'huggingface', requirements: { minRam: 2 }, tags: ['english', 'male'] },
  { id: 'coqui-xtts-v2', name: 'XTTS v2', description: 'Multi-speaker, cloning', size: '1.8 GB', category: 'tts', provider: 'huggingface', requirements: { minRam: 8, minVram: 4 }, tags: ['cloning', 'multilingual'] },
  { id: 'bark', name: 'Suno Bark', description: 'Expressive, emotions', size: '5.0 GB', category: 'tts', provider: 'huggingface', requirements: { minRam: 16, minVram: 8 }, tags: ['expressive'] },
  { id: 'mms-tts-eng', name: 'MMS TTS English', description: 'Meta MMS', size: '290 MB', category: 'tts', provider: 'huggingface', requirements: { minRam: 4 }, tags: ['meta'] },

  // Embedding Models
  { id: 'nomic-embed-text', name: 'Nomic Embed', description: 'Text embeddings', size: '274 MB', category: 'embedding', provider: 'ollama', requirements: { minRam: 2 }, tags: ['rag'] },
  { id: 'mxbai-embed-large', name: 'MxBai Embed', description: 'Large embeddings', size: '670 MB', category: 'embedding', provider: 'ollama', requirements: { minRam: 4 }, tags: ['rag', 'accurate'] },

  // Vision Models
  { id: 'llava:7b', name: 'LLaVA 7B', description: 'Vision + Language', size: '4.7 GB', category: 'vision', provider: 'ollama', requirements: { minRam: 8 }, tags: ['multimodal'] },
  { id: 'moondream', name: 'Moondream', description: 'Lightweight vision', size: '1.8 GB', category: 'vision', provider: 'ollama', requirements: { minRam: 4 }, tags: ['fast', 'vision'] },
];

const CATEGORY_INFO: Record<ModelCategory, { label: string; icon: string; color: string }> = {
  llm: { label: 'Language Models', icon: '💬', color: 'blue' },
  tts: { label: 'Text-to-Speech', icon: '🔊', color: 'emerald' },
  stt: { label: 'Speech-to-Text', icon: '🎤', color: 'amber' },
  embedding: { label: 'Embeddings', icon: '📊', color: 'purple' },
  vision: { label: 'Vision', icon: '👁️', color: 'pink' },
};

const ModelControl: React.FC = () => {
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<{ running: boolean; version?: string }>({ running: false });
  const [isLoading, setIsLoading] = useState(true);
  const [pullProgress, setPullProgress] = useState<{ [key: string]: { status: string; percent: number } }>({});
  const [logs, setLogs] = useState<string[]>(['SYSTEM_INIT :: DETECTING_HARDWARE']);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [activeCategory, setActiveCategory] = useState<ModelCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLogs(prev => [...prev.slice(-20), `[${time}] ${msg}`]);
  };

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Detect device capabilities
  useEffect(() => {
    const detectDevice = () => {
      // Get platform info from navigator
      const platform = navigator.platform.toLowerCase().includes('mac') ? 'darwin' :
        navigator.platform.toLowerCase().includes('win') ? 'win32' : 'linux';

      // Estimate RAM (navigator.deviceMemory is approximate)
      const totalRam = (navigator as any).deviceMemory || 8;

      // Check for GPU (WebGL)
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const hasGpu = !!gl;

      let gpuInfo = '';
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuInfo = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }

      const info: DeviceInfo = {
        platform,
        arch: navigator.platform.includes('arm') || navigator.platform.includes('ARM') ? 'arm64' : 'x64',
        totalRam: totalRam * 1, // GB
        freeRam: totalRam * 0.5, // Estimate
        hasGpu,
        gpuVram: hasGpu ? 4 : 0, // Estimate
      };

      setDeviceInfo(info);
      addLog(`DEVICE_DETECTED :: ${platform}_${info.arch}_${totalRam}GB_RAM`);
      addLog(`GPU_STATUS :: ${hasGpu ? gpuInfo.substring(0, 40) : 'NO_GPU'}`);
    };

    detectDevice();
  }, []);

  // Check Ollama status and load models
  useEffect(() => {
    const init = async () => {
      const status = await ollama.checkOllamaStatus();
      setOllamaStatus(status);

      if (status.running) {
        addLog(`OLLAMA_ONLINE :: v${status.version}`);
        await refreshModels();
      } else {
        addLog('OLLAMA_OFFLINE :: RUN_ollama_serve');
      }
      setIsLoading(false);
    };

    init();

    const interval = setInterval(async () => {
      const status = await ollama.checkOllamaStatus();
      if (status.running !== ollamaStatus.running) {
        setOllamaStatus(status);
        if (status.running) {
          addLog(`OLLAMA_ONLINE :: v${status.version}`);
          await refreshModels();
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const refreshModels = async () => {
    const models = await ollama.listModels();
    setLocalModels(models.map(m => m.name));
    addLog(`MODELS_SYNCED :: ${models.length}_INSTALLED`);
  };

  const checkCompatibility = (model: ModelDefinition): { compatible: boolean; reason?: string } => {
    if (!deviceInfo) return { compatible: true };

    const req = model.requirements;
    if (!req) return { compatible: true };

    if (req.minRam && deviceInfo.totalRam < req.minRam) {
      return { compatible: false, reason: `Needs ${req.minRam}GB+ RAM` };
    }

    if (req.minVram && (!deviceInfo.hasGpu || (deviceInfo.gpuVram || 0) < req.minVram)) {
      return { compatible: false, reason: `Needs ${req.minVram}GB+ VRAM` };
    }

    if (req.platform && !req.platform.includes(deviceInfo.platform as any)) {
      return { compatible: false, reason: `Not available for ${deviceInfo.platform}` };
    }

    return { compatible: true };
  };

  const pullModel = async (modelId: string, provider: 'ollama' | 'huggingface') => {
    if (provider === 'ollama') {
      if (localModels.includes(modelId)) {
        addLog(`SKIP :: ${modelId}_ALREADY_INSTALLED`);
        return;
      }

      addLog(`PULL_START :: ${modelId}`);
      setPullProgress(prev => ({ ...prev, [modelId]: { status: 'Initializing...', percent: 0 } }));

      const success = await ollama.pullModel(modelId, (status, completed, total) => {
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        setPullProgress(prev => ({ ...prev, [modelId]: { status: status.substring(0, 20), percent } }));
      });

      if (success) {
        addLog(`PULL_COMPLETE :: ${modelId}`);
        await refreshModels();
      } else {
        addLog(`PULL_FAILED :: ${modelId}`);
      }

      setPullProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[modelId];
        return newProgress;
      });
    } else {
      // HuggingFace download - show instructions
      addLog(`HF_DOWNLOAD :: ${modelId}`);
      window.open(`https://huggingface.co/${modelId.replace('whisper-', 'openai/whisper-')}`, '_blank');
    }
  };

  const deleteModel = async (modelId: string) => {
    addLog(`DELETE :: ${modelId}`);
    const success = await ollama.deleteModel(modelId);
    if (success) {
      addLog(`DELETED :: ${modelId}`);
      await refreshModels();
    }
  };

  // Filter models
  const filteredModels = MODEL_LIBRARY.filter(m => {
    if (activeCategory !== 'all' && m.category !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.tags?.some(t => t.includes(q));
    }
    return true;
  });

  const getCategoryColor = (cat: ModelCategory) => CATEGORY_INFO[cat].color;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Model <span className="text-blue-500">Foundry</span></h1>
          <p className="text-gray-400">Download and manage AI models for LLM, TTS, STT, and more.</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Device Info */}
          {deviceInfo && (
            <div className="flex items-center space-x-3 bg-black/40 px-4 py-2 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono text-gray-500">{deviceInfo.platform.toUpperCase()}</span>
              <span className="text-[10px] font-mono text-blue-400">{deviceInfo.totalRam}GB RAM</span>
              {deviceInfo.hasGpu && <span className="text-[10px] font-mono text-emerald-400">GPU</span>}
            </div>
          )}

          {/* Ollama Status */}
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border ${ollamaStatus.running
            ? 'border-emerald-500/20 bg-emerald-600/10'
            : 'border-red-500/20 bg-red-600/10'
            }`}>
            <div className={`w-2 h-2 rounded-full ${ollamaStatus.running ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${ollamaStatus.running ? 'text-emerald-400' : 'text-red-400'}`}>
              {ollamaStatus.running ? `Ollama v${ollamaStatus.version}` : 'Ollama Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeCategory === 'all' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
        >
          All Models
        </button>
        {(Object.keys(CATEGORY_INFO) as ModelCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${activeCategory === cat ? `bg-${CATEGORY_INFO[cat].color}-500 text-white` : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            <span>{CATEGORY_INFO[cat].icon}</span>
            <span>{CATEGORY_INFO[cat].label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500"
        />
        <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Model Grid */}
        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModels.map(model => {
              const isInstalled = localModels.includes(model.id);
              const isPulling = pullProgress[model.id];
              const compat = checkCompatibility(model);
              const catInfo = CATEGORY_INFO[model.category];

              return (
                <div
                  key={model.id}
                  className={`bg-[#111] border rounded-2xl p-5 transition-all hover:border-white/20 ${!compat.compatible ? 'opacity-50' : ''} ${isInstalled ? 'border-emerald-500/30' : 'border-white/5'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl bg-${catInfo.color}-500/20 flex items-center justify-center text-lg`}>
                        {catInfo.icon}
                      </div>
                      <div>
                        <div className="font-bold text-white">{model.name}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">{model.provider}</div>
                      </div>
                    </div>
                    {isInstalled && (
                      <div className="flex items-center space-x-1 text-emerald-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-[9px] font-bold uppercase">Installed</span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-400 mb-3">{model.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-gray-400">{model.size}</span>
                    {model.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-500/10 rounded text-[10px] text-blue-400">{tag}</span>
                    ))}
                  </div>

                  {!compat.compatible && (
                    <div className="text-[10px] text-amber-400 mb-3 flex items-center space-x-1">
                      <span>⚠️</span>
                      <span>{compat.reason}</span>
                    </div>
                  )}

                  {isPulling ? (
                    <div className="space-y-2">
                      <div className="h-2 bg-black rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${isPulling.percent}%` }}></div>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">{isPulling.status} {isPulling.percent}%</div>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      {isInstalled ? (
                        <button
                          onClick={() => deleteModel(model.id)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => pullModel(model.id, model.provider)}
                          disabled={!compat.compatible || (model.provider === 'ollama' && !ollamaStatus.running)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {model.provider === 'ollama' ? 'Pull' : 'Download'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Installed & Logs */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Installed Models */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Installed</span>
              <span className="text-[10px] font-mono text-blue-400">{localModels.length} models</span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {localModels.length === 0 ? (
                <div className="text-gray-600 text-sm text-center py-4">No models installed</div>
              ) : (
                localModels.map(name => {
                  const modelDef = MODEL_LIBRARY.find(m => m.id === name);
                  return (
                    <div key={name} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center space-x-2">
                        <span>{modelDef ? CATEGORY_INFO[modelDef.category].icon : '📦'}</span>
                        <span className="text-sm font-mono">{name}</span>
                      </div>
                      <button onClick={() => deleteModel(name)} className="text-red-400 hover:text-red-300 text-xs">×</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* System Logs */}
          <div className="bg-black border border-white/5 rounded-2xl p-6">
            <div className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-4">System_Log</div>
            <div className="space-y-1 max-h-60 overflow-y-auto font-mono text-[10px]">
              {logs.map((log, i) => (
                <div key={i} className={`text-gray-600 ${i === logs.length - 1 ? 'text-emerald-400' : ''}`}>
                  {log}
                </div>
              ))}
              <div ref={logEndRef}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelControl;
