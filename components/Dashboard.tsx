
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MODELS } from '../constants';

const data = [
  { name: '0s', cpu: 20, ram: 3.2, network: 5 },
  { name: '1s', cpu: 45, ram: 4.5, network: 12 },
  { name: '2s', cpu: 85, ram: 5.8, network: 45 },
  { name: '3s', cpu: 70, ram: 5.6, network: 38 },
  { name: '4s', cpu: 40, ram: 4.2, network: 15 },
  { name: '5s', cpu: 30, ram: 3.8, network: 8 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase italic">System <span className="text-blue-500">Status</span></h1>
        <p className="text-gray-400 text-lg">Milestones 3 & 4: FastAPI Server & Wake Word Engine is LIVE.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic">FastAPI Latency</div>
          <div className="text-3xl font-black font-mono tracking-tighter text-blue-400">142ms</div>
          <div className="mt-4 flex items-center text-[10px] font-bold text-green-500 uppercase">
            Active Workers: 4
          </div>
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic">VRAM Utilization</div>
          <div className="text-3xl font-black font-mono tracking-tighter text-purple-400">3.8 GB</div>
          <div className="mt-4 flex items-center text-[10px] font-bold text-gray-500 uppercase">
            Quantized FP16/INT8
          </div>
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic">Wake Word Engine</div>
          <div className="text-3xl font-black font-mono tracking-tighter text-emerald-400">Online</div>
          <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-500 uppercase">
            Listen: "Hey Local"
          </div>
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic">Network Exposure</div>
          <div className="text-3xl font-black font-mono tracking-tighter text-amber-500">Local Only</div>
          <div className="mt-4 flex items-center text-[10px] font-bold text-gray-500 uppercase">
            localhost:8000
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-xl uppercase tracking-tight">FastAPI Telemetry</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Real-time Worker Load</p>
            </div>
            <div className="flex items-center space-x-6 text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2 shadow-[0_0_8px_#3b82f6]"></div> CPU Load</div>
              <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-purple-500 mr-2 shadow-[0_0_8px_#a855f7]"></div> Memory</div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                <XAxis dataKey="name" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', fontSize: '10px', textTransform: 'uppercase' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" />
                <Area type="monotone" dataKey="ram" stroke="#a855f7" strokeWidth={3} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-xl uppercase tracking-tight">Active Model Hub</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Pre-cached in Shared RAM</p>
            </div>
          </div>
          <div className="space-y-4 max-h-[280px] overflow-y-auto scrollbar-hide">
            {MODELS.map((model, idx) => (
              <div key={idx} className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group">
                <div className="flex items-center space-x-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    model.type === 'TTS' ? 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]' : 
                    model.type === 'STT' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 
                    'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.3)]'
                  }`}>
                    {model.type === 'TTS' ? '🔊' : model.type === 'STT' ? '🎙️' : '👂'}
                  </div>
                  <div>
                    <div className="font-black uppercase tracking-tight text-gray-100">{model.name}</div>
                    <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{model.provider}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-blue-400 font-black">{model.benchmarks}</div>
                  <div className="text-[8px] font-mono text-gray-700 mt-1 uppercase">Ready_State: Preloaded</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
