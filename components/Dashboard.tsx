
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MODELS } from '../constants';

const data = [
  { name: '0s', cpu: 20, ram: 3.2 },
  { name: '1s', cpu: 45, ram: 4.5 },
  { name: '2s', cpu: 85, ram: 5.8 },
  { name: '3s', cpu: 70, ram: 5.6 },
  { name: '4s', cpu: 40, ram: 4.2 },
  { name: '5s', cpu: 30, ram: 3.8 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Project Overview</h1>
        <p className="text-gray-400 text-lg">Self-hosted, Replicate-style voice interface engine.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
          <div className="text-gray-400 text-sm font-medium mb-1">Target Latency</div>
          <div className="text-3xl font-bold font-mono tracking-tighter">&lt; 1.0s</div>
          <div className="mt-4 flex items-center text-xs text-green-500">
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            22% faster than v0.9
          </div>
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
          <div className="text-gray-400 text-sm font-medium mb-1">Model Footprint</div>
          <div className="text-3xl font-bold font-mono tracking-tighter">4.2 GB</div>
          <div className="mt-4 flex items-center text-xs text-blue-400">
            Compressed ONNX Runtime
          </div>
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
          <div className="text-gray-400 text-sm font-medium mb-1">Privacy Score</div>
          <div className="text-3xl font-bold font-mono tracking-tighter">100%</div>
          <div className="mt-4 flex items-center text-xs text-green-500">
            No External Requests
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-semibold text-lg">Inference Performance (STT)</h3>
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div> CPU %</div>
              <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div> RAM GB</div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" />
                <Area type="monotone" dataKey="ram" stroke="#a855f7" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
          <h3 className="font-semibold text-lg mb-6">Active Model Registry</h3>
          <div className="space-y-4">
            {MODELS.map((model, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    model.type === 'TTS' ? 'bg-orange-500/20 text-orange-500' : 
                    model.type === 'STT' ? 'bg-blue-500/20 text-blue-500' : 'bg-green-500/20 text-green-500'
                  }`}>
                    {model.type === 'TTS' ? '🔊' : model.type === 'STT' ? '🎙️' : '👂'}
                  </div>
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-gray-500">{model.provider}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-gray-400">{model.benchmarks}</div>
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
