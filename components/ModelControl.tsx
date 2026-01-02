import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as ollama from '../services/ollama';

// Types
type ModelCategory = 'llm' | 'tts' | 'stt' | 'embedding' | 'vision';

interface ModelDef {
  id: string;
  name: string;
  desc: string;
  size: string;
  cat: ModelCategory;
  src: 'ollama' | 'hf';
  ram: number;
  vram?: number;
  tags?: string[];
}

interface DeviceInfo {
  platform: string;
  ram: number;
  hasGpu: boolean;
}

// Model Library - Optimized
const MODELS: ModelDef[] = [
  // LLM
  { id: 'llama3.2:1b', name: 'Llama 3.2 1B', desc: 'Fast & lightweight', size: '1.3 GB', cat: 'llm', src: 'ollama', ram: 4, tags: ['fast'] },
  { id: 'llama3.2:3b', name: 'Llama 3.2 3B', desc: 'Balanced', size: '2.0 GB', cat: 'llm', src: 'ollama', ram: 8, tags: ['balanced'] },
  { id: 'mistral:7b', name: 'Mistral 7B', desc: 'Great reasoning', size: '4.1 GB', cat: 'llm', src: 'ollama', ram: 8, tags: ['smart'] },
  { id: 'gemma2:2b', name: 'Gemma 2B', desc: 'By Google', size: '1.6 GB', cat: 'llm', src: 'ollama', ram: 4, tags: ['google'] },
  { id: 'phi3:mini', name: 'Phi-3 Mini', desc: 'By Microsoft', size: '2.3 GB', cat: 'llm', src: 'ollama', ram: 4, tags: ['ms'] },
  { id: 'qwen2.5:1.5b', name: 'Qwen 2.5', desc: 'Multilingual', size: '1.0 GB', cat: 'llm', src: 'ollama', ram: 4, tags: ['multi'] },
  { id: 'deepseek-coder:1.3b', name: 'DeepSeek Coder', desc: 'Code generation', size: '800 MB', cat: 'llm', src: 'ollama', ram: 4, tags: ['code'] },
  // STT
  { id: 'whisper-tiny', name: 'Whisper Tiny', desc: 'Ultra fast', size: '77 MB', cat: 'stt', src: 'hf', ram: 2, tags: ['fast'] },
  { id: 'whisper-base', name: 'Whisper Base', desc: 'Good balance', size: '145 MB', cat: 'stt', src: 'hf', ram: 2, tags: ['balanced'] },
  { id: 'whisper-small', name: 'Whisper Small', desc: 'Better accuracy', size: '488 MB', cat: 'stt', src: 'hf', ram: 4, tags: ['accurate'] },
  { id: 'whisper-medium', name: 'Whisper Medium', desc: 'High accuracy', size: '1.5 GB', cat: 'stt', src: 'hf', ram: 8 },
  { id: 'whisper-large-v3', name: 'Whisper Large', desc: 'Best quality', size: '3.1 GB', cat: 'stt', src: 'hf', ram: 16, tags: ['best'] },
  // TTS
  { id: 'piper-amy', name: 'Piper Amy', desc: 'Female EN', size: '75 MB', cat: 'tts', src: 'hf', ram: 2, tags: ['female'] },
  { id: 'piper-ryan', name: 'Piper Ryan', desc: 'Male EN', size: '75 MB', cat: 'tts', src: 'hf', ram: 2, tags: ['male'] },
  { id: 'xtts-v2', name: 'XTTS v2', desc: 'Voice cloning', size: '1.8 GB', cat: 'tts', src: 'hf', ram: 8, vram: 4, tags: ['clone'] },
  { id: 'bark', name: 'Bark', desc: 'Expressive TTS', size: '5 GB', cat: 'tts', src: 'hf', ram: 16, vram: 8, tags: ['expr'] },
  { id: 'mms-tts', name: 'MMS TTS', desc: 'By Meta', size: '290 MB', cat: 'tts', src: 'hf', ram: 4, tags: ['meta'] },
  // Embedding
  { id: 'nomic-embed-text', name: 'Nomic Embed', desc: 'For RAG', size: '274 MB', cat: 'embedding', src: 'ollama', ram: 2, tags: ['rag'] },
  { id: 'mxbai-embed-large', name: 'MxBai Large', desc: 'High quality', size: '670 MB', cat: 'embedding', src: 'ollama', ram: 4 },
  // Vision
  { id: 'llava:7b', name: 'LLaVA 7B', desc: 'Vision+LLM', size: '4.7 GB', cat: 'vision', src: 'ollama', ram: 8, tags: ['multi'] },
  { id: 'moondream', name: 'Moondream', desc: 'Lightweight', size: '1.8 GB', cat: 'vision', src: 'ollama', ram: 4, tags: ['fast'] },
];

const CATS: Record<ModelCategory, { label: string; icon: string; bg: string }> = {
  llm: { label: 'LLM', icon: '💬', bg: 'bg-blue-500' },
  tts: { label: 'TTS', icon: '🔊', bg: 'bg-emerald-500' },
  stt: { label: 'STT', icon: '🎤', bg: 'bg-amber-500' },
  embedding: { label: 'Embed', icon: '📊', bg: 'bg-purple-500' },
  vision: { label: 'Vision', icon: '👁️', bg: 'bg-pink-500' },
};

const ModelControl: React.FC = () => {
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [ollamaOn, setOllamaOn] = useState(false);
  const [ollamaVer, setOllamaVer] = useState('');
  const [pulling, setPulling] = useState<Record<string, number>>({});
  const [cat, setCat] = useState<ModelCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const log = useCallback((m: string) => {
    const t = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLogs(p => [...p.slice(-15), `[${t}] ${m}`]);
  }, []);

  // Detect device
  useEffect(() => {
    const p = navigator.platform.toLowerCase();
    const ram = (navigator as any).deviceMemory || 8;
    const gl = document.createElement('canvas').getContext('webgl');
    setDevice({
      platform: p.includes('mac') ? 'macOS' : p.includes('win') ? 'Windows' : 'Linux',
      ram,
      hasGpu: !!gl,
    });
    log(`DEVICE :: ${p.includes('mac') ? 'macOS' : 'other'} ${ram}GB`);
  }, [log]);

  // Check Ollama
  useEffect(() => {
    const check = async () => {
      const s = await ollama.checkOllamaStatus();
      setOllamaOn(s.running);
      if (s.running) {
        setOllamaVer(s.version || '');
        const models = await ollama.listModels();
        setInstalled(new Set(models.map(m => m.name)));
        log(`OLLAMA :: v${s.version} ${models.length} models`);
      }
    };
    check();
    const i = setInterval(check, 8000);
    return () => clearInterval(i);
  }, [log]);

  // Scroll logs
  useEffect(() => {
    logRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const compatible = useCallback((m: ModelDef) => {
    if (!device) return true;
    if (m.ram > device.ram) return false;
    if (m.vram && !device.hasGpu) return false;
    return true;
  }, [device]);

  const filtered = useMemo(() => {
    return MODELS.filter(m => {
      if (cat !== 'all' && m.cat !== cat) return false;
      if (search) {
        const q = search.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q);
      }
      return true;
    });
  }, [cat, search]);

  const pull = async (m: ModelDef) => {
    if (m.src === 'ollama') {
      if (installed.has(m.id)) return;
      log(`PULL :: ${m.id}`);
      setPulling(p => ({ ...p, [m.id]: 0 }));

      const ok = await ollama.pullModel(m.id, (_, c, t) => {
        const pct = t > 0 ? Math.round((c / t) * 100) : 0;
        setPulling(p => ({ ...p, [m.id]: pct }));
      });

      setPulling(p => { const n = { ...p }; delete n[m.id]; return n; });
      if (ok) {
        setInstalled(p => new Set([...p, m.id]));
        log(`DONE :: ${m.id}`);
      }
    } else {
      log(`HF :: opening ${m.id}`);
      window.open(`https://huggingface.co/openai/${m.id.replace('whisper-', 'whisper-')}`, '_blank');
    }
  };

  const remove = async (id: string) => {
    log(`DEL :: ${id}`);
    if (await ollama.deleteModel(id)) {
      setInstalled(p => { const n = new Set(p); n.delete(id); return n; });
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Model <span className="text-blue-500">Foundry</span></h1>
          <p className="text-gray-500 text-sm mt-1">Pull LLM, TTS, STT models</p>
        </div>
        <div className="flex items-center gap-3">
          {device && (
            <div className="text-[10px] font-mono text-gray-600 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
              {device.platform} • {device.ram}GB {device.hasGpu && '• GPU'}
            </div>
          )}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${ollamaOn ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
            <div className={`w-2 h-2 rounded-full ${ollamaOn ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-[10px] font-bold ${ollamaOn ? 'text-emerald-400' : 'text-red-400'}`}>
              {ollamaOn ? `Ollama v${ollamaVer}` : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCat('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${cat === 'all' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>All</button>
        {(Object.entries(CATS) as [ModelCategory, typeof CATS.llm][]).map(([k, v]) => (
          <button key={k} onClick={() => setCat(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${cat === k ? `${v.bg} text-white` : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
            <span>{v.icon}</span><span>{v.label}</span>
          </button>
        ))}
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs w-40 outline-none focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Models Grid */}
        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(m => {
              const isIn = installed.has(m.id);
              const pct = pulling[m.id];
              const ok = compatible(m);
              const c = CATS[m.cat];

              return (
                <div key={m.id} className={`bg-[#0d0d0d] border rounded-xl p-4 transition-all ${isIn ? 'border-emerald-500/30' : 'border-white/5'} ${!ok ? 'opacity-40' : 'hover:border-white/20'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${c.bg}/20 flex items-center justify-center text-sm`}>{c.icon}</div>
                      <div>
                        <div className="font-bold text-sm text-white leading-tight">{m.name}</div>
                        <div className="text-[9px] text-gray-600 uppercase">{m.src}</div>
                      </div>
                    </div>
                    {isIn && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </div>

                  <p className="text-xs text-gray-500 mb-2">{m.desc}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    <span className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] font-mono text-gray-500">{m.size}</span>
                    <span className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] font-mono text-gray-500">{m.ram}GB+</span>
                    {m.tags?.slice(0, 2).map(t => <span key={t} className="px-1.5 py-0.5 bg-blue-500/10 rounded text-[9px] text-blue-400">{t}</span>)}
                  </div>

                  {pct !== undefined ? (
                    <div className="h-1.5 bg-black rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  ) : isIn ? (
                    <button onClick={() => remove(m.id)} className="w-full py-1.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20">Remove</button>
                  ) : (
                    <button onClick={() => pull(m)} disabled={!ok || (m.src === 'ollama' && !ollamaOn)} className="w-full py-1.5 rounded-lg text-[10px] font-bold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed">
                      {m.src === 'ollama' ? 'Pull' : 'Get'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Installed */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Installed ({installed.size})</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {installed.size === 0 ? (
                <div className="text-gray-700 text-xs text-center py-3">No models</div>
              ) : (
                [...installed].map(id => {
                  const m = MODELS.find(x => x.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between py-1.5 px-2 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{m ? CATS[m.cat].icon : '📦'}</span>
                        <span className="text-xs font-mono text-gray-300">{id}</span>
                      </div>
                      <button onClick={() => remove(id)} className="text-red-400 hover:text-red-300 text-xs px-1">×</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Logs */}
          <div className="bg-black border border-white/5 rounded-xl p-4">
            <div className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-wider mb-3">System Log</div>
            <div className="space-y-0.5 max-h-40 overflow-y-auto font-mono text-[9px]">
              {logs.map((l, i) => (
                <div key={i} className={i === logs.length - 1 ? 'text-emerald-400' : 'text-gray-600'}>{l}</div>
              ))}
              <div ref={logRef} />
            </div>
          </div>

          {/* Quick Start */}
          {!ollamaOn && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="text-[10px] font-bold text-amber-400 uppercase mb-2">Start Ollama</div>
              <code className="text-xs text-amber-300 bg-black/30 px-2 py-1 rounded block">ollama serve</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelControl;
