
import React from 'react';

const ArchitectureDiagram: React.FC = () => {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">System Architecture</h1>
        <p className="text-gray-400 text-lg">Replicate-inspired containerized model flow.</p>
      </div>

      <div className="bg-[#111111] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[500px]">
        <svg viewBox="0 0 800 500" className="w-full max-w-4xl drop-shadow-2xl">
          {/* User App */}
          <rect x="50" y="200" width="120" height="100" rx="12" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" />
          <text x="110" y="255" textAnchor="middle" fill="#3b82f6" fontWeight="bold" fontSize="14">External Agent</text>
          
          {/* Connection Lines */}
          <path d="M170 250 H240" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />
          <polygon points="245,250 235,245 235,255" fill="#3b82f6" />
          
          {/* Docker Container Boundary */}
          <rect x="250" y="50" width="450" height="400" rx="20" fill="white" fillOpacity="0.02" stroke="#444" strokeWidth="2" strokeDasharray="10,5" />
          <text x="475" y="40" textAnchor="middle" fill="#888" fontSize="12" fontStyle="italic">Local Docker Environment (Isolated)</text>
          
          {/* FastAPI Server */}
          <rect x="280" y="180" width="140" height="140" rx="16" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          <text x="350" y="245" textAnchor="middle" fill="#fff" fontWeight="bold" fontSize="16">FastAPI</text>
          <text x="350" y="265" textAnchor="middle" fill="#94a3b8" fontSize="12">API Engine</text>
          
          {/* Model Hub */}
          <circle cx="580" cy="150" r="45" fill="#f59e0b" fillOpacity="0.1" stroke="#f59e0b" strokeWidth="2" />
          <text x="580" y="155" textAnchor="middle" fill="#f59e0b" fontWeight="bold" fontSize="14">XTTS v2</text>
          
          <circle cx="580" cy="250" r="45" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeWidth="2" />
          <text x="580" y="255" textAnchor="middle" fill="#10b981" fontWeight="bold" fontSize="14">Whisper</text>
          
          <circle cx="580" cy="350" r="45" fill="#ec4899" fillOpacity="0.1" stroke="#ec4899" strokeWidth="2" />
          <text x="580" y="355" textAnchor="middle" fill="#ec4899" fontWeight="bold" fontSize="14">Porcupine</text>
          
          {/* Model connections */}
          <path d="M420 250 H530" stroke="#444" strokeWidth="2" />
          <path d="M535 250 L535 150 H535" stroke="#444" strokeWidth="2" />
          <path d="M535 250 L535 350 H535" stroke="#444" strokeWidth="2" />
          <path d="M535 150 H535" stroke="#444" strokeWidth="2" />
          
          {/* Legend */}
          <rect x="280" y="420" width="15" height="15" rx="4" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" />
          <text x="305" y="432" fill="#888" fontSize="12">HTTP Requests</text>
          
          <rect x="420" y="420" width="15" height="15" rx="4" fill="#444" stroke="#444" />
          <text x="445" y="432" fill="#888" fontSize="12">Model Weights (Local)</text>
        </svg>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <h4 className="font-bold text-sm mb-2 text-blue-400 uppercase tracking-wider">Isolation</h4>
            <p className="text-xs text-gray-400">Docker ensures PyTorch and Audio deps stay locked away from your main OS. No more DLL hell.</p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <h4 className="font-bold text-sm mb-2 text-green-400 uppercase tracking-wider">Zero-latency</h4>
            <p className="text-xs text-gray-400">Models are pre-loaded in VRAM/RAM on startup. First inference is just a memory swap away.</p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <h4 className="font-bold text-sm mb-2 text-orange-400 uppercase tracking-wider">Extensible</h4>
            <p className="text-xs text-gray-400">Swap a YAML file to point to a new HuggingFace ID. The server handles the download automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureDiagram;
