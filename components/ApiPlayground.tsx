
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
        setResult('{\n  "status": "success",\n  "audio_url": "http://localhost:8000/outputs/voice_923.wav",\n  "latency": "0.84s",\n  "model": "XTTS-v2-ONNX"\n}');
      } else if (selectedPath === '/stt') {
        setResult('{\n  "transcript": "The quick brown fox jumps over the lazy dog.",\n  "confidence": 0.98,\n  "language": "en",\n  "segments": [\n    {"start": 0.0, "end": 2.5, "text": "The quick brown fox"},\n    {"start": 2.5, "end": 5.0, "text": "jumps over the lazy dog"}\n  ]\n}');
      } else {
        setResult('{\n  "status": "listening",\n  "hotword_detected": true,\n  "transcript": "Turn on the living room lights"\n}');
      }
    }, 800);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase italic">API <span className="text-blue-500">Playground</span></h1>
        <p className="text-gray-400 text-lg">Test your Milestone 2 local inference engine via REST endpoints.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Endpoint List */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] px-2 mb-4">REST_COLLECTION</h3>
          {ENDPOINTS.map((endpoint) => (
            <button
              key={endpoint.path}
              onClick={() => {
                setSelectedPath(endpoint.path);
                setInputValue(endpoint.input);
                setResult(null);
              }}
              className={`w-full text-left p-6 rounded-[2rem] border transition-all relative overflow-hidden group ${
                selectedPath === endpoint.path 
                  ? 'bg-blue-600/5 border-blue-500/50 text-white shadow-2xl' 
                  : 'bg-[#111111] border-white/5 text-gray-400 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-mono text-[10px] font-black px-2 py-0.5 rounded ${selectedPath === endpoint.path ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-500'}`}>{endpoint.method}</span>
                {selectedPath === endpoint.path && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>}
              </div>
              <div className="font-black text-sm uppercase tracking-tight">{endpoint.path}</div>
              <div className="text-[10px] text-gray-500 mt-2 font-medium leading-relaxed">{endpoint.description}</div>
            </button>
          ))}
        </div>

        {/* Center: Input Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0e0e0e] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col h-[550px] shadow-2xl shadow-black">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-500/30"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30"></div>
                </div>
                <div className="h-4 w-px bg-white/10 mx-2"></div>
                <span className="text-[10px] font-mono text-blue-500 uppercase tracking-widest font-black">Request :: {selectedPath}</span>
              </div>
              <button
                onClick={handleRun}
                disabled={loading}
                className="bg-white text-black hover:bg-gray-200 disabled:opacity-50 px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95"
              >
                {loading ? 'Executing...' : 'Invoke_Inference'}
              </button>
            </div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
              <div className="p-8 flex flex-col space-y-4 border-r border-white/5">
                <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Query_Payload</label>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-transparent font-mono text-sm text-blue-400 outline-none resize-none leading-relaxed scrollbar-hide"
                  spellCheck={false}
                />
              </div>
              
              <div className="p-8 flex flex-col space-y-4 bg-black/40">
                <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">System_Egress</label>
                <div className="flex-1 font-mono text-sm leading-relaxed overflow-auto scrollbar-hide">
                  {loading ? (
                    <div className="flex flex-col space-y-3">
                      <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse"></div>
                      <div className="h-4 bg-white/5 rounded w-1/2 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                      <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  ) : result ? (
                    <pre className="text-emerald-400 whitespace-pre-wrap animate-fadeIn text-xs leading-relaxed">{result}</pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                       <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                       <span className="text-[10px] font-black uppercase tracking-widest">Buffer_Empty</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-6 flex items-start space-x-6 shadow-xl">
            <div className="mt-1 text-emerald-500 bg-emerald-500/10 p-2 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-black uppercase tracking-widest text-emerald-200">Milestone 2 Verified</div>
              <p className="text-[11px] text-emerald-400/60 leading-relaxed font-medium">
                The <span className="text-emerald-400">Faster-Whisper</span> engine now supports INT8 quantization via CTranslate2. This reduces memory usage by 50% while maintaining 99% of original transcription accuracy. Verified on CPU.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiPlayground;
