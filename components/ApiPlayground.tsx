
import React, { useState } from 'react';
import { ENDPOINTS } from '../constants';

const ApiPlayground: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState(ENDPOINTS[0].path);
  const [inputValue, setInputValue] = useState(ENDPOINTS[0].input);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const activeEndpoint = ENDPOINTS.find(e => e.path === selectedPath)!;

  const handleRun = () => {
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setLoading(false);
      if (selectedPath === '/tts') {
        setResult('{"status": "success", "audio_url": "http://localhost:8000/outputs/voice_923.wav"}');
      } else {
        setResult('{"transcript": "The quick brown fox jumps over the lazy dog."}');
      }
    }, 800);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">API Playground</h1>
        <p className="text-gray-400 text-lg">Test your local inference endpoints in real-time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Endpoint List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2">Endpoints</h3>
          {ENDPOINTS.map((endpoint) => (
            <button
              key={endpoint.path}
              onClick={() => {
                setSelectedPath(endpoint.path);
                setInputValue(endpoint.input);
                setResult(null);
              }}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedPath === endpoint.path 
                  ? 'bg-blue-600/10 border-blue-600/50 text-white' 
                  : 'bg-[#111111] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-blue-400">{endpoint.method}</span>
                <span className="text-[10px] text-gray-500">v1</span>
              </div>
              <div className="font-medium text-sm">{endpoint.path}</div>
              <div className="text-xs opacity-60 mt-2 truncate">{endpoint.description}</div>
            </button>
          ))}
        </div>

        {/* Center: Input Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                <span className="ml-4 text-xs font-mono text-gray-400">Request: {selectedPath}</span>
              </div>
              <button
                onClick={handleRun}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-1.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
              >
                {loading ? 'Running...' : 'Run Prediction'}
              </button>
            </div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
              <div className="p-6 flex flex-col space-y-4 border-r border-white/5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Input Data (JSON)</label>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-transparent font-mono text-sm text-blue-300 outline-none resize-none leading-relaxed"
                  spellCheck={false}
                />
              </div>
              
              <div className="p-6 flex flex-col space-y-4 bg-black/20">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Response Output</label>
                <div className="flex-1 font-mono text-sm leading-relaxed overflow-auto">
                  {loading ? (
                    <div className="animate-pulse flex flex-col space-y-3">
                      <div className="h-4 bg-white/5 rounded w-3/4"></div>
                      <div className="h-4 bg-white/5 rounded w-1/2"></div>
                      <div className="h-4 bg-white/5 rounded w-5/6"></div>
                    </div>
                  ) : result ? (
                    <pre className="text-green-400 whitespace-pre-wrap">{result}</pre>
                  ) : (
                    <span className="text-gray-600 italic">No output yet. Click 'Run' to invoke the endpoint.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 flex items-start space-x-4">
            <div className="mt-1 text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-blue-200">Implementation Tip</div>
              <p className="text-xs text-blue-300/80 leading-relaxed mt-1">
                This endpoint uses the local <span className="font-mono text-blue-200">XTTS-v2</span> model. 
                Ensure your Docker container is running with <span className="font-mono text-blue-200">--device /dev/snd</span> 
                to support direct host playback if enabled in config.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiPlayground;
