import React, { useState, useEffect, useRef } from 'react';
import * as ollama from '../services/ollama';

interface LocalModel {
  id: string;
  name: string;
  size: string;
  status: 'pulling' | 'ready' | 'idle';
  progress: number;
  digest: string;
  modified: string;
  details?: {
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

// Popular Ollama models for voice/AI work
const SUGGESTED_MODELS = [
  { name: 'llama3.2:1b', description: 'Fast, lightweight LLM', size: '1.3 GB' },
  { name: 'llama3.2:3b', description: 'Balanced performance', size: '2.0 GB' },
  { name: 'mistral:7b', description: 'Excellent reasoning', size: '4.1 GB' },
  { name: 'gemma2:2b', description: 'Google Gemma 2B', size: '1.6 GB' },
];

const ModelControl: React.FC = () => {
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<{ running: boolean; version?: string }>({ running: false });
  const [isLoading, setIsLoading] = useState(true);
  const [pullProgress, setPullProgress] = useState<{ [key: string]: { status: string; percent: number } }>({});
  const [logs, setLogs] = useState<string[]>(['OLLAMA_INIT :: CHECKING_STATUS']);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLogs(prev => [...prev.slice(-15), `[${time}] ${msg}`]);
  };

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Check Ollama status and load models
  useEffect(() => {
    const init = async () => {
      const status = await ollama.checkOllamaStatus();
      setOllamaStatus(status);

      if (status.running) {
        addLog(`OLLAMA_ONLINE :: v${status.version}`);
        await refreshModels();
      } else {
        addLog('OLLAMA_OFFLINE :: START_OLLAMA_SERVICE');
      }
      setIsLoading(false);
    };

    init();

    // Poll for status every 5 seconds
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
    setLocalModels(models.map(m => ({
      id: m.name,
      name: m.name,
      size: ollama.formatSize(m.size),
      status: 'ready' as const,
      progress: 100,
      digest: m.digest.substring(0, 12),
      modified: new Date(m.modified_at).toLocaleDateString(),
      details: m.details,
    })));
    addLog(`MODELS_LOADED :: ${models.length}_FOUND`);
  };

  const pullModel = async (modelName: string) => {
    if (localModels.some(m => m.name === modelName)) {
      addLog(`PULL_SKIP :: ${modelName}_EXISTS`);
      return;
    }

    addLog(`PULL_START :: ${modelName}`);
    setPullProgress(prev => ({ ...prev, [modelName]: { status: 'Starting...', percent: 0 } }));

    const success = await ollama.pullModel(modelName, (status, completed, total) => {
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      setPullProgress(prev => ({ ...prev, [modelName]: { status, percent } }));
    });

    if (success) {
      addLog(`PULL_COMPLETE :: ${modelName}`);
      await refreshModels();
    } else {
      addLog(`PULL_FAILED :: ${modelName}`);
    }

    setPullProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[modelName];
      return newProgress;
    });
  };

  const deleteModel = async (modelName: string) => {
    addLog(`DELETE_START :: ${modelName}`);
    const success = await ollama.deleteModel(modelName);
    if (success) {
      addLog(`DELETE_SUCCESS :: ${modelName}`);
      await refreshModels();
    } else {
      addLog(`DELETE_FAILED :: ${modelName}`);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Model <span className="text-blue-500">Foundry</span></h1>
          <p className="text-gray-400 text-lg">Local AI model management powered by Ollama.</p>
        </div>

        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border ${ollamaStatus.running
              ? 'border-emerald-500/20 bg-emerald-600/10'
              : 'border-red-500/20 bg-red-600/10'
            }`}>
            <div className={`w-2 h-2 rounded-full ${ollamaStatus.running ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${ollamaStatus.running ? 'text-emerald-400' : 'text-red-400'
              }`}>
              {ollamaStatus.running ? `Ollama_v${ollamaStatus.version}` : 'Ollama_Offline'}
            </span>
          </div>
        </div>
      </div>

      {!ollamaStatus.running && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-400 font-bold">Ollama is not running</p>
          <p className="text-gray-500 text-sm mt-2">Start Ollama with: <code className="bg-black/50 px-2 py-1 rounded">ollama serve</code></p>
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        {/* Left Panel: Available Models & Logs */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Available_Models</div>

            <div className="space-y-4">
              {SUGGESTED_MODELS.map((model) => {
                const isPulling = pullProgress[model.name];
                const isInstalled = localModels.some(m => m.name === model.name);

                return (
                  <div key={model.name} className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-black text-white">{model.name}</div>
                        <div className="text-[10px] text-gray-500">{model.description}</div>
                      </div>
                      {isInstalled ? (
                        <span className="text-[9px] font-black text-emerald-400 uppercase">Installed</span>
                      ) : isPulling ? (
                        <span className="text-[9px] font-black text-blue-400 uppercase">{isPulling.percent}%</span>
                      ) : (
                        <button
                          onClick={() => pullModel(model.name)}
                          disabled={!ollamaStatus.running}
                          className="bg-white text-black p-2 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      )}
                    </div>
                    {isPulling && (
                      <div className="mt-2">
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all" style={{ width: `${isPulling.percent}%` }}></div>
                        </div>
                        <div className="text-[9px] text-gray-600 mt-1">{isPulling.status}</div>
                      </div>
                    )}
                    <div className="text-[9px] text-gray-600 mt-1">{model.size}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telemetry Logs */}
          <div className="bg-black border border-white/5 rounded-[2.5rem] p-6 flex flex-col h-[200px] shadow-2xl overflow-hidden">
            <div className="text-[9px] font-black text-blue-500/50 uppercase tracking-[0.3em] mb-3">System_Telemetry</div>
            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[9px] text-gray-600 scrollbar-hide">
              {logs.map((log, i) => (
                <div key={i} className={`flex items-start space-x-2 ${i === logs.length - 1 ? 'text-blue-400 font-bold' : ''}`}>
                  <span className="opacity-30">&gt;</span>
                  <span className="break-all">{log}</span>
                </div>
              ))}
              <div ref={logEndRef}></div>
            </div>
          </div>
        </div>

        {/* Right Panel: Installed Models */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-[2rem] p-4">
            <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] ml-4">Installed_Models</div>
            <button
              onClick={refreshModels}
              disabled={!ollamaStatus.running}
              className="text-[10px] font-black text-gray-500 uppercase hover:text-white transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-gray-500">Loading...</div>
          ) : localModels.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-lg">No models installed</p>
              <p className="text-sm mt-2">Pull a model from the left panel to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {localModels.map((model) => (
                <div
                  key={model.id}
                  className="p-8 rounded-[3rem] border bg-[#111111] border-white/5 hover:border-white/10 transition-all relative group overflow-hidden flex flex-col animate-fadeIn"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-2xl bg-blue-600 text-white">
                      🤖
                    </div>

                    <button
                      onClick={() => deleteModel(model.name)}
                      className="text-[9px] font-black text-red-400 uppercase hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="space-y-1 flex-1">
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">{model.name}</h3>
                    <div className="flex items-center space-x-3 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                      <span>{model.size}</span>
                      <span className="text-blue-500/50">{model.digest}</span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                    <div className="space-y-1">
                      <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Family</div>
                      <div className="text-xs font-mono text-gray-300">{model.details?.family || 'Unknown'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Quantization</div>
                      <div className="text-xs font-mono text-emerald-400">{model.details?.quantization_level || 'Default'}</div>
                    </div>
                  </div>

                  <div className="absolute top-4 left-4 flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_#10b981] animate-pulse"></div>
                    <span className="text-[8px] font-black text-emerald-500 uppercase">Ready</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ModelControl;
