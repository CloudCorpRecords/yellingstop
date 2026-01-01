
import React, { useState } from 'react';
import { MODELS } from '../constants';

interface RegistryItem {
  id: string;
  name: string;
  type: 'TTS' | 'STT' | 'Hotword';
  path: string;
  size: string;
  health: 'Optimal' | 'Degraded' | 'Offline';
  usage: number; // Percentage
  compatibility: number; // 0-100 system score
}

const LocalRegistry: React.FC = () => {
  const [localAssets, setLocalAssets] = useState<RegistryItem[]>([
    { id: 'xtts-v2-main', name: 'XTTS-v2 Expressive', type: 'TTS', path: '/opt/localvocal/weights/xtts_v2', size: '2.4 GB', health: 'Optimal', usage: 12, compatibility: 98 },
    { id: 'faster-whisper-medium', name: 'Faster-Whisper Medium', type: 'STT', path: '/opt/localvocal/weights/whisper_medium', size: '1.1 GB', health: 'Optimal', usage: 8, compatibility: 94 },
    { id: 'porcupine-hey-local', name: 'Porcupine Wake Word', type: 'Hotword', path: '/opt/localvocal/weights/hey_local.ppn', size: '0.1 GB', health: 'Optimal', usage: 1, compatibility: 100 },
  ]);

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Local <span className="text-blue-500">Registry</span></h1>
          <p className="text-gray-400 text-lg">System-level insights for your containerized weight manifests.</p>
        </div>
        
        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
           <div className="flex items-center space-x-2 px-4 py-2 bg-blue-600/10 rounded-xl border border-blue-500/20">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Hardware_Verified</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* State of the Machine (System Specs) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
           <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
              </div>
              
              <div className="relative z-10 space-y-8">
                 <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Hardware_Blueprint</div>
                 
                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-bold text-gray-400">Processor</span>
                       <span className="text-sm font-mono text-white">Apple M3 Pro (12-Core)</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-bold text-gray-400">Total VRAM</span>
                       <span className="text-sm font-mono text-blue-400">18.0 GB Unified</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-bold text-gray-400">Model Cache Path</span>
                       <span className="text-[10px] font-mono text-gray-600 truncate ml-4">/Users/dev/Library/LocalVocal/cache</span>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                       <span>Registry Health</span>
                       <span className="text-emerald-500">Normal</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 w-[94%] shadow-[0_0_10px_#10b981]"></div>
                    </div>
                 </div>
              </div>
           </div>

           {/* IO Routing Diagram Component */}
           <div className="bg-black border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-2xl overflow-hidden relative group">
              <div className="text-[10px] font-black text-blue-500/60 uppercase tracking-[0.3em]">Signal_Routing</div>
              <div className="flex flex-col space-y-4 relative">
                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 relative z-10">
                    <span className="text-[10px] font-black uppercase text-gray-500">Mic_Input</span>
                    <div className="flex space-x-1">
                       {[...Array(5)].map((_, i) => <div key={i} className="w-1 h-3 bg-blue-500/40 rounded-full animate-pulse" style={{ animationDelay: `${i*0.1}s` }}></div>)}
                    </div>
                 </div>
                 <div className="h-6 w-px bg-blue-500/20 mx-auto"></div>
                 <div className="flex items-center justify-center p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20 relative z-10">
                    <span className="text-[10px] font-black uppercase text-blue-400">Cog_Container_Isolation</span>
                 </div>
                 <div className="h-6 w-px bg-blue-500/20 mx-auto"></div>
                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 relative z-10">
                    <span className="text-[10px] font-black uppercase text-gray-500">System_Audio</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                 </div>
                 
                 {/* Decorative Flow Animation */}
                 <div className="absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-[2px] bg-gradient-to-b from-blue-500/0 via-blue-500 to-blue-500/0 animate-flowLine opacity-20"></div>
              </div>
           </div>
        </div>

        {/* Local Assets Manifest */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
           <div className="bg-[#111111] border border-white/5 rounded-[3rem] p-10 shadow-2xl overflow-hidden relative group">
              <div className="flex items-center justify-between mb-10">
                 <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Weight_Manifest_Registry</div>
                 <div className="flex space-x-2">
                    <button className="text-[10px] font-black text-blue-500 hover:text-white transition-colors uppercase tracking-widest">Rescan_Library</button>
                 </div>
              </div>

              <div className="space-y-4">
                 {localAssets.map((asset) => (
                   <div key={asset.id} className="p-6 bg-white/5 border border-white/5 rounded-[2rem] hover:border-white/10 transition-all flex flex-col md:flex-row items-center gap-6 group">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-2xl transition-transform group-hover:scale-110 ${
                         asset.type === 'TTS' ? 'bg-orange-600' : asset.type === 'STT' ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}>
                         {asset.type === 'TTS' ? '🔊' : asset.type === 'STT' ? '🎙️' : '👂'}
                      </div>
                      
                      <div className="flex-1 space-y-1 w-full text-center md:text-left">
                         <h4 className="text-xl font-black uppercase tracking-tight text-white">{asset.name}</h4>
                         <div className="text-[9px] font-mono text-gray-600 truncate max-w-xs">{asset.path}</div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full md:w-auto">
                         <div className="text-center md:text-left">
                            <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Disk Size</div>
                            <div className="text-xs font-mono text-gray-300">{asset.size}</div>
                         </div>
                         <div className="text-center md:text-left">
                            <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Health</div>
                            <div className={`text-xs font-black uppercase ${asset.health === 'Optimal' ? 'text-emerald-400' : 'text-amber-500'}`}>{asset.health}</div>
                         </div>
                         <div className="text-center md:text-left">
                            <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Sys Fit</div>
                            <div className="text-xs font-mono text-blue-400">{asset.compatibility}%</div>
                         </div>
                         <div className="flex items-center justify-center">
                            <button className="bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all">
                               <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /></svg>
                            </button>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Optimization Advisory */}
           <div className="bg-blue-600/5 border border-blue-500/20 rounded-[3rem] p-12 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                 <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                 <div className="w-24 h-24 rounded-full border-2 border-blue-500/20 flex items-center justify-center shrink-0">
                    <div className="text-center">
                       <div className="text-2xl font-black text-blue-400">92%</div>
                       <div className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Efficiency</div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white italic">Hardware Optimization <span className="text-blue-500">Advisory</span></h3>
                    <p className="text-sm text-blue-300/60 leading-relaxed font-medium">
                       Your unified memory architecture allows for INT8 sharding across both CPU and GPU clusters. We recommend enabling <span className="text-blue-400 font-bold">Dynamic Batching</span> in the Cog container settings to reduce STT tail latency by an additional 15%.
                    </p>
                    <div className="flex space-x-4">
                       <button className="bg-white text-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Apply_Optimizations</button>
                       <button className="text-[10px] font-black text-gray-500 uppercase hover:text-white tracking-widest transition-all">View_Bench_Stats</button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes flowLine { from { top: -20%; } to { top: 120%; } }
        .animate-flowLine { animation: flowLine 3s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default LocalRegistry;
