
import React, { useState, useEffect, useRef } from 'react';
import { MODELS as STATIC_MODELS } from '../constants';
import { ai } from '../services/gemini';

interface LocalModel {
  id: string;
  name: string;
  provider: string;
  type: 'TTS' | 'STT' | 'Hotword';
  status: 'pulling' | 'ready' | 'idle';
  progress: number;
  vram: string;
  stars?: number;
  downloads?: string;
  eta?: number; // Estimated seconds remaining
  currentStage?: string;
}

interface TrendingModel {
  repo_id: string;
  name: string;
  description: string;
  size: string;
  type: 'TTS' | 'STT';
  downloads: string;
  stars: number;
  accuracy: string;
}

const ModelControl: React.FC = () => {
  const [localRegistry, setLocalRegistry] = useState<LocalModel[]>(
    STATIC_MODELS.map(m => ({
      id: m.name.toLowerCase().replace(' ', '-'),
      name: m.name,
      provider: m.provider,
      type: m.type,
      status: 'ready',
      progress: 100,
      vram: m.vram || 'Unknown',
      stars: Math.floor(Math.random() * 5000) + 1000,
      downloads: (Math.random() * 50).toFixed(1) + 'k'
    }))
  );
  
  const [filter, setFilter] = useState<'ALL' | 'TTS' | 'STT' | 'Hotword'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TrendingModel[]>([]);
  const [trendingModels, setTrendingModels] = useState<TrendingModel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isScouting, setIsScouting] = useState(true);
  const [logs, setLogs] = useState<string[]>(['FOUNDRY_BOOT :: v1.5.0-cog', 'DAEMON_READY :: LISTENING_FOR_PULL_REQUESTS']);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLogs(prev => [...prev.slice(-15), `[${time}] ${msg}`]);
  };

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    const scoutMarketplace = async () => {
      addLog('SCRAPE_INIT :: HUGGINGFACE_TRENDING_BOARD');
      try {
        const prompt = `Act as an AI Hardware scout in early 2026. 
        Identify the 4 hottest trending open-source voice models (TTS/STT) on Hugging Face right now. 
        Focus on real 2025/2026 releases like Kokoro-82M, Fish-Speech, or Quantized Whisper variants.
        Return a JSON array of objects: {repo_id, name, description, size, type, downloads, stars, accuracy}. 
        Size should be like '1.2 GB'. Accuracy like '98.5%'. Downloads like '12.4k'.
        Only return valid JSON.`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });

        const data = JSON.parse(response.text || '[]');
        setTrendingModels(data);
        addLog(`SCRAPE_COMPLETE :: SYNCHRONIZED_${data.length}_TRENDING_ASSETS`);
      } catch (err) {
        addLog('SCRAPE_ERROR :: FALLBACK_TO_STATIC_CACHE');
      } finally {
        setIsScouting(false);
      }
    };

    scoutMarketplace();
  }, []);

  const findModels = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    addLog(`SEARCH_TRIGGER :: QUERY("${searchQuery}")`);
    
    try {
      const prompt = `Search for specialized Hugging Face models matching: ${searchQuery}. 
      Return a JSON array of 3 objects with properties: {repo_id, name, description, size, type, downloads, stars, accuracy}. 
      Only return valid JSON.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const results = JSON.parse(response.text || '[]');
      setSearchResults(results);
      addLog(`SEARCH_COMPLETE :: FOUND_${results.length}_ASSETS`);
    } catch (err) {
      addLog(`SEARCH_ERROR :: API_LINK_FAIL`);
    } finally {
      setIsSearching(false);
    }
  };

  const pullModel = (repo: any) => {
    const newId = repo.repo_id.replace('/', '-');
    if (localRegistry.some(m => m.id === newId)) {
      addLog(`PULL_ABORT :: ${repo.repo_id}_ALREADY_EXISTS`);
      return;
    }

    const newModel: LocalModel = {
      id: newId,
      name: repo.name,
      provider: repo.repo_id.split('/')[0],
      type: repo.type || 'TTS',
      status: 'pulling',
      progress: 0,
      vram: repo.size || '2.0 GB',
      stars: repo.stars,
      downloads: repo.downloads,
      eta: 45, // Initial estimate
      currentStage: 'INITIALIZING_COG'
    };

    setLocalRegistry(prev => [newModel, ...prev]);
    addLog(`PULL_INIT :: ${repo.repo_id}`);

    let progress = 0;
    let eta = 45;
    const interval = setInterval(() => {
      const increment = Math.random() * 8;
      progress += increment;
      eta = Math.max(0, Math.round(eta - (increment * 0.45))); // Smoothly decrease ETA

      if (progress >= 100) {
        progress = 100;
        eta = 0;
        clearInterval(interval);
        setLocalRegistry(current => 
          current.map(m => m.id === newId ? { ...m, status: 'ready', progress: 100, eta: 0, currentStage: 'READY' } : m)
        );
        addLog(`DEPLOY_SUCCESS :: ${repo.repo_id}_ON_PORT_8000`);
      } else {
        let stage = 'PULLING_ASSETS';
        if (progress < 25) stage = 'BUILDING_COG_IMAGE';
        else if (progress < 50) stage = 'PULLING_MODEL_WEIGHTS';
        else if (progress < 75) stage = 'SHARDING_TENSORS';
        else stage = 'INITIALIZING_LOCAL_API';

        setLocalRegistry(current => 
          current.map(m => m.id === newId ? { ...m, progress: Math.floor(progress), eta, currentStage: stage } : m)
        );
        
        if (progress > 20 && progress < 28) addLog(`BUILD_DOCKER :: CONFIG_COG_${newId}`);
        if (progress > 60 && progress < 68) addLog(`PULL_LAYERS :: ${newId}_BLOBS`);
      }
    }, 600);
  };

  const filteredRegistry = localRegistry.filter(m => filter === 'ALL' || m.type === filter);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Model <span className="text-blue-500">Foundry</span></h1>
          <p className="text-gray-400 text-lg">Auto-scouting 2026 voice intelligence for local deployment.</p>
        </div>
        
        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
           <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-600/10 rounded-xl border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Marketplace_Synced</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Panel: Discovery & Trends */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
           <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
              <div className="relative z-10 space-y-8">
                 <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Trending_Marketplace</div>
                    {isScouting && <div className="text-[9px] font-black text-blue-400 animate-pulse">SCAPING_LIVE_BOARD...</div>}
                 </div>

                 <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                    {isScouting ? (
                      [...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-white/5 border border-white/5 rounded-3xl animate-pulse"></div>
                      ))
                    ) : (
                      trendingModels.map((model, i) => (
                        <div key={i} className="group p-5 bg-white/5 border border-white/5 rounded-[2rem] hover:border-blue-500/40 hover:bg-blue-600/5 transition-all animate-fadeIn">
                           <div className="flex items-start justify-between mb-3">
                              <div className="min-w-0">
                                 <div className="text-[9px] font-black text-blue-400 uppercase tracking-tighter truncate opacity-70">{model.repo_id}</div>
                                 <div className="text-sm font-black text-white uppercase truncate">{model.name}</div>
                              </div>
                              <button 
                                onClick={() => pullModel(model)}
                                className="bg-white text-black p-2 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-xl"
                              >
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                              </button>
                           </div>
                           <div className="flex items-center space-x-3 text-[9px] font-mono text-gray-500 mb-2">
                              <span className="text-emerald-400">Acc: {model.accuracy}</span>
                              <span>↓ {model.downloads}</span>
                              <span className="text-amber-400">★ {model.stars}</span>
                           </div>
                           <p className="text-[10px] text-gray-600 line-clamp-1">{model.description}</p>
                        </div>
                      ))
                    )}
                 </div>

                 <div className="pt-6 border-t border-white/5">
                    <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4 italic">Neural_On_Demand_Scout</div>
                    <div className="relative">
                       <input 
                         type="text" 
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && findModels()}
                         placeholder="Deep search specialized repos..."
                         className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-5 pr-12 focus:outline-none focus:border-blue-500 text-xs font-medium transition-all"
                       />
                       <button onClick={findModels} className="absolute right-3 top-3 w-10 h-10 flex items-center justify-center text-gray-600 hover:text-blue-400">
                          {isSearching ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                       </button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-4 space-y-3">
                         {searchResults.map((repo, i) => (
                           <div key={i} className="p-3 bg-blue-600/5 border border-blue-500/20 rounded-xl flex items-center justify-between group cursor-pointer" onClick={() => pullModel(repo)}>
                              <div className="min-w-0">
                                 <div className="text-[9px] font-bold text-blue-400 truncate">{repo.repo_id}</div>
                                 <div className="text-[10px] font-black text-white truncate">{repo.name}</div>
                              </div>
                              <div className="text-[8px] font-black text-gray-500 group-hover:text-white transition-colors">PULL_ASSET</div>
                           </div>
                         ))}
                      </div>
                    )}
                 </div>
              </div>
           </div>

           <div className="bg-black border border-white/5 rounded-[2.5rem] p-6 flex flex-col h-[200px] shadow-2xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-blue-500/[0.01] pointer-events-none"></div>
              <div className="text-[9px] font-black text-blue-500/50 uppercase tracking-[0.3em] mb-3 flex items-center">
                 <span className="mr-3">Cog_Egress_Telemetry</span>
                 <div className="flex-1 h-[1px] bg-white/5"></div>
              </div>
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

        {/* Right Panel: Local Registry & Hardware */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
           {/* Filtering UI */}
           <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-[2rem] p-4">
              <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] ml-4">Registry_View</div>
              <div className="flex items-center space-x-2 bg-[#111111] p-1 rounded-xl border border-white/10 shadow-inner">
                {(['ALL', 'TTS', 'STT', 'Hotword'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-[0.2em] transition-all uppercase ${
                      filter === t ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRegistry.map((model) => (
                <div 
                  key={model.id}
                  className={`p-8 rounded-[3rem] border transition-all relative group overflow-hidden flex flex-col animate-fadeIn ${
                    model.status === 'pulling' ? 'bg-blue-600/5 border-blue-500/30 ring-2 ring-blue-500/10' : 'bg-[#111111] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-2xl transition-transform group-hover:scale-110 ${
                      model.type === 'TTS' ? 'bg-orange-600 text-white shadow-orange-900/20' : 
                      model.type === 'STT' ? 'bg-blue-600 text-white shadow-blue-900/20' : 'bg-emerald-600 text-white shadow-emerald-900/20'
                    }`}>
                       {model.type === 'TTS' ? '🔊' : model.type === 'STT' ? '🎙️' : '👂'}
                    </div>
                    
                    <div className="text-right">
                       <div className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${
                         model.status === 'ready' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-blue-500/30 text-blue-400 bg-blue-500/5 animate-pulse'
                       }`}>
                          {model.status === 'ready' ? 'Deployment_Active' : 'Building_Foundry'}
                       </div>
                    </div>
                  </div>

                  <div className="space-y-1 flex-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight truncate text-white">{model.name}</h3>
                    <div className="flex items-center space-x-3 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                       <span>{model.provider}</span>
                       <span className="text-amber-500/50">★ {model.stars}</span>
                       <span className="text-blue-500/50">↓ {model.downloads}</span>
                    </div>
                  </div>

                  {model.status === 'pulling' ? (
                    <div className="mt-8 space-y-4">
                       <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                          <span className="text-blue-400">{model.currentStage}</span>
                          <span className="text-gray-500">Est. {model.eta}s</span>
                       </div>
                       
                       <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-blue-500 shadow-[0_0_15px_#3b82f6] transition-all duration-700 ease-out" 
                            style={{ width: `${model.progress}%` }}
                          ></div>
                       </div>
                       
                       <div className="flex justify-center">
                          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.3em]">{model.progress}% Complete</span>
                       </div>
                    </div>
                  ) : (
                    <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                       <div className="space-y-1">
                          <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Shard Footprint</div>
                          <div className="text-xs font-mono text-gray-300">{model.vram}</div>
                       </div>
                       <div className="space-y-1">
                          <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Quantization</div>
                          <div className="text-xs font-mono text-emerald-400">INT8_Dynamic</div>
                       </div>
                    </div>
                  )}

                  {model.status === 'ready' && (
                    <div className="absolute top-4 left-4 flex items-center space-x-1">
                       <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_5px_#3b82f6]"></div>
                       <span className="text-[8px] font-black text-blue-500 uppercase">Live_Node</span>
                    </div>
                  )}
                </div>
              ))}
              {filteredRegistry.length === 0 && (
                <div className="col-span-2 py-20 text-center opacity-20 italic">
                  <div className="text-[10px] font-black uppercase tracking-[0.5em]">No_{filter}_Nodes_Found</div>
                </div>
              )}
           </div>

           <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-12 flex flex-col md:flex-row items-center gap-16 relative overflow-hidden shadow-2xl group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.05),transparent_60%)]"></div>
              
              <div className="flex-shrink-0 relative">
                 <div className="w-40 h-40 rounded-full border-2 border-white/5 flex items-center justify-center bg-black/40">
                    <div className="text-center">
                       <div className="text-4xl font-black font-mono text-blue-400 tracking-tighter">48%</div>
                       <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mt-2">Foundry_Load</div>
                    </div>
                 </div>
                 <div className="absolute inset-0 border border-blue-500/10 rounded-full animate-spin duration-[12s] scale-125"></div>
                 <div className="absolute inset-0 border border-emerald-500/5 rounded-full animate-reverse-spin duration-[20s] scale-150"></div>
              </div>

              <div className="flex-1 space-y-10 w-full relative z-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                       <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                          <span>Local_VRAM_POOL</span>
                          <span className="text-blue-400 font-mono">3.8 GB / 8 GB</span>
                       </div>
                       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-blue-500 w-[48%] shadow-[0_0_20px_#3b82f6] transition-all duration-1000"></div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                          <span>API_INFERENCE_LATENCY</span>
                          <span className="text-emerald-400 font-mono">142ms</span>
                       </div>
                       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-emerald-500 w-[12%] shadow-[0_0_20px_#10b981] transition-all duration-1000"></div>
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-7 bg-white/[0.03] border border-white/5 rounded-[2rem] backdrop-blur-xl">
                    <div className="flex items-center space-x-5">
                       <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981] animate-pulse"></div>
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">Continuous_Foundry_Monitoring_Active</span>
                    </div>
                    <div className="flex items-center space-x-8">
                       <button className="text-[10px] font-black text-gray-600 uppercase hover:text-white tracking-widest transition-all">Flush_Buffer</button>
                       <button className="bg-white text-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Re-Scout_Market</button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes reverse-spin { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-reverse-spin { animation: reverse-spin linear infinite; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ModelControl;
