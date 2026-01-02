
import React, { useState, useRef, useEffect } from 'react';
import { ai, createPcmBlob, decodeAudio, convertToAudioBuffer } from '../services/gemini';
import { Modality } from '@google/genai';
import * as ollama from '../services/ollama';

const GeminiStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'console' | 'registry'>('console');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, links?: any[], latency?: number, isDeep?: boolean, isLocal?: boolean }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [isDeepResearch, setIsDeepResearch] = useState(false);

  // Local Model State
  const [useLocalModel, setUseLocalModel] = useState(false);
  const [localModels, setLocalModels] = useState<ollama.OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [runningModels, setRunningModels] = useState<ollama.RunningModel[]>([]);
  const [showModelPanel, setShowModelPanel] = useState(false);
  const [modelLoading, setModelLoading] = useState<string | null>(null);

  // Advanced Telemetry & Voice State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'reasoning' | 'responding' | 'searching'>('idle');
  const [liveLinks, setLiveLinks] = useState<any[]>([]);
  const [systemTrace, setSystemTrace] = useState<string[]>(['BOOT_SEQUENCE_COMPLETE']);
  const [userVolume, setUserVolume] = useState(0);
  const [modelVolume, setModelVolume] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const traceEndRef = useRef<HTMLDivElement>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const turnStartTime = useRef<number>(0);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio?.hasSelectedApiKey) {
        // @ts-ignore
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        setHasKey(!!process.env.API_KEY);
      }
    };
    checkKey();

    // Check Ollama status and load local models
    const checkOllama = async () => {
      const status = await ollama.checkOllamaStatus();
      setOllamaOnline(status.running);
      if (status.running) {
        const models = await ollama.listModels();
        setLocalModels(models);
        if (models.length > 0 && !selectedModel) {
          setSelectedModel(models[0].name);
        }
        // Get running models
        const running = await ollama.getRunningModels();
        setRunningModels(running);
      }
    };
    checkOllama();

    // Poll Ollama status
    const interval = setInterval(checkOllama, 3000);
    return () => clearInterval(interval);
  }, []);

  // Load model into memory
  const handleLoadModel = async (modelName: string) => {
    setModelLoading(modelName);
    addTrace(`LOAD_MODEL :: ${modelName}`);
    await ollama.loadModel(modelName);
    const running = await ollama.getRunningModels();
    setRunningModels(running);
    setModelLoading(null);
    addTrace(`MODEL_LOADED :: ${modelName}`);
  };

  // Unload model from memory
  const handleUnloadModel = async (modelName: string) => {
    setModelLoading(modelName);
    addTrace(`UNLOAD_MODEL :: ${modelName}`);
    await ollama.unloadModel(modelName);
    const running = await ollama.getRunningModels();
    setRunningModels(running);
    setModelLoading(null);
    addTrace(`MODEL_UNLOADED :: ${modelName}`);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, voiceState, liveLinks]);

  useEffect(() => {
    if (traceEndRef.current) {
      traceEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [systemTrace]);

  const addTrace = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
      // @ts-ignore
      fractionalSecondDigits: 2
    } as any);
    setSystemTrace(prev => [...prev.slice(-25), `[${timestamp}] ${msg}`]);
  };

  const stopLiveAudio = () => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setModelVolume(0);
  };

  const startLiveMode = async () => {
    if (!hasKey) {
      alert("Neural Bridge Authentication Required.");
      return;
    }

    try {
      setVoiceState('listening');
      addTrace('UP_LINK :: ESTABLISHING_DUPLEX_WSS');
      setIsLiveMode(true);
      setLiveLinks([]);

      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let currentInputTranscription = '';
      let currentOutputTranscription = '';

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            addTrace('LINK_READY :: MULTIMODAL_AUDIO_INGRESS_OPEN');
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setUserVolume(rms * 12);

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (message: any) => {
            // Live Search Grounding
            const grounding = message.serverContent?.groundingMetadata?.groundingChunks;
            if (grounding) {
              const links = grounding.map((c: any) => c.web).filter(Boolean);
              if (links.length > 0) {
                setVoiceState('searching');
                setLiveLinks(prev => {
                  const newLinks = links.filter((l: any) => !prev.some(p => p.uri === l.uri));
                  return [...prev, ...newLinks];
                });
                addTrace(`WEB_QUERY_ACTIVE :: RESOLVED_${links.length}_SOURCES`);
              }
            }

            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              if (!turnStartTime.current) turnStartTime.current = performance.now();
              currentInputTranscription += message.serverContent.inputTranscription.text;
              setVoiceState('reasoning');
            }

            if (message.serverContent?.turnComplete) {
              const latency = turnStartTime.current ? Math.round(performance.now() - turnStartTime.current) : 0;
              setProcessingTime(latency);

              if (currentInputTranscription || currentOutputTranscription) {
                setMessages(prev => [
                  ...prev,
                  ...(currentInputTranscription ? [{ role: 'user' as const, text: currentInputTranscription }] : []),
                  ...(currentOutputTranscription ? [{ role: 'model' as const, text: currentOutputTranscription, latency }] : [])
                ]);
                currentInputTranscription = '';
                currentOutputTranscription = '';
              }
              turnStartTime.current = 0;
              setVoiceState('listening');
              addTrace('TURN_COMPLETE :: STATE_SYNCHRONIZED');
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextOutRef.current) {
              if (voiceState !== 'responding') {
                setVoiceState('responding');
                addTrace('IO_EGRESS :: BITSTREAM_START');
              }
              const ctx = audioContextOutRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

              const buffer = await convertToAudioBuffer(decodeAudio(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);

              source.addEventListener('ended', () => {
                activeSourcesRef.current.delete(source);
                if (activeSourcesRef.current.size === 0) setModelVolume(0);
              });

              setModelVolume(1.0);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              activeSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              stopLiveAudio();
              setVoiceState('listening');
              addTrace('INTERRUPT :: BARGE_IN_DETECTED');
            }
          },
          onerror: (e) => {
            console.error(e);
            addTrace('LINK_CRITICAL_FAILURE');
            stopLiveMode();
          },
          onclose: () => {
            addTrace('LINK_TERMINATED_GRACEFULLY');
            stopLiveMode();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ googleSearch: {} }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
          },
          systemInstruction: "You are the Gemini Studio Intelligence Engine. You are designed to replace WhisperFlow. You use native multimodal audio processing to interact. You have direct access to Google Search for grounding. Keep responses very brief (max 15 words). Always search the web for recent info. You are the definitive voice for research."
        }
      });
    } catch (err) {
      console.error(err);
      setIsLiveMode(false);
      setVoiceState('idle');
      addTrace('PERMISSION_DENIED :: HARDWARE_LINK_FAILED');
    }
  };

  const stopLiveMode = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    stopLiveAudio();
    setIsLiveMode(false);
    setVoiceState('idle');
    setUserVolume(0);
    setModelVolume(0);
    setProcessingTime(0);
    addTrace('ENGINE_OFFLINE :: RESOURCES_RELEASED');
  };

  const handleSendText = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    const start = performance.now();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Local Model Mode
    if (useLocalModel && selectedModel && ollamaOnline) {
      addTrace(`LOCAL_INFERENCE :: ${selectedModel}`);
      try {
        let responseText = '';
        await ollama.generate(
          selectedModel,
          userMsg,
          (token) => {
            responseText += token;
            // Update message in real-time for streaming effect
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'model' && last?.isLocal) {
                return [...prev.slice(0, -1), { ...last, text: responseText }];
              }
              return [...prev, { role: 'model', text: responseText, isLocal: true }];
            });
          }
        );
        const latency = Math.round(performance.now() - start);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'model' && last?.isLocal) {
            return [...prev.slice(0, -1), { ...last, latency }];
          }
          return prev;
        });
        addTrace(`LOCAL_COMPLETE :: ${latency}ms`);
      } catch (err) {
        addTrace('LOCAL_FAILURE :: OLLAMA_ERROR');
        setMessages(prev => [...prev, { role: 'model', text: 'Local model error. Check Ollama.', isLocal: true }]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Cloud Mode (Gemini)
    addTrace(`RESEARCH_MODE :: ${isDeepResearch ? 'DEEP_PRO_INFERENCE' : 'FAST_FLASH_INFERENCE'}`);

    try {
      const response = await ai.models.generateContent({
        model: isDeepResearch ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: isDeepResearch
            ? "You are a professional research agent. Use Google Search extensively to provide high-fidelity, verified, and detailed answers with citations."
            : "You are a fast intelligence engine. Provide grounded answers using Google Search. Be concise."
        }
      });

      const latency = Math.round(performance.now() - start);
      const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean);

      setMessages(prev => [...prev, {
        role: 'model',
        text: response.text || 'Inference error.',
        links,
        latency,
        isDeep: isDeepResearch
      }]);
      addTrace(`INFERENCE_RESOLVED :: ${latency}ms`);
    } catch (err) {
      addTrace('INFERENCE_FAILURE :: API_LIMIT_OR_LINK_ERR');
      setMessages(prev => [...prev, { role: 'model', text: 'System offline. Check API connectivity.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-[#f0f0f0]">
      {/* HUD HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-black/40 p-5 rounded-[2rem] border border-white/5 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center space-x-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-[0_0_30px_rgba(37,99,235,0.2)] ${isLiveMode ? 'bg-blue-600 rotate-12' : 'bg-white/5'}`}>
            <svg className={`w-7 h-7 ${isLiveMode ? 'text-white' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Gemini <span className="text-blue-500">Studio</span></h1>
            <div className="flex items-center space-x-3 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-gray-500 leading-none">
                {isLiveMode ? 'Native_Intelligence_Flow' : 'Engine_Standby'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          {/* Local Model Toggle */}
          <div
            className={`flex items-center bg-black/40 px-4 py-2 rounded-xl border cursor-pointer transition-all ${useLocalModel ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10'}`}
            onClick={() => setUseLocalModel(!useLocalModel)}
          >
            <div className={`w-3 h-3 rounded-full mr-3 transition-all ${useLocalModel ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-gray-700'}`}></div>
            <span className={`text-[10px] font-black tracking-widest uppercase transition-colors ${useLocalModel ? 'text-emerald-400' : 'text-gray-600'}`}>
              Local_Mode
            </span>
          </div>

          {/* Model Selector - Only show when local mode is on */}
          {useLocalModel && (
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="appearance-none bg-black/60 border border-white/10 rounded-xl px-4 py-2 pr-8 text-xs font-mono text-white outline-none focus:border-blue-500 min-w-[150px]"
              >
                {localModels.length === 0 ? (
                  <option value="">No models installed</option>
                ) : (
                  localModels.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))
                )}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}

          {/* Running Models Button */}
          <div className="relative">
            <button
              onClick={() => setShowModelPanel(!showModelPanel)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all ${runningModels.length > 0 ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/10 bg-black/40'}`}
            >
              <div className={`w-2 h-2 rounded-full ${runningModels.length > 0 ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'}`}></div>
              <span className={`text-[9px] font-black uppercase ${runningModels.length > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                {runningModels.length} Running
              </span>
              <svg className={`w-3 h-3 ${runningModels.length > 0 ? 'text-blue-400' : 'text-gray-600'} transition-transform ${showModelPanel ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Running Models Panel */}
            {showModelPanel && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Model Management</span>
                  <span className={`text-[9px] font-mono ${ollamaOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                    {ollamaOnline ? 'Ollama Online' : 'Offline'}
                  </span>
                </div>

                {/* Running Models */}
                {runningModels.length > 0 && (
                  <div className="p-3 border-b border-white/5">
                    <div className="text-[9px] font-bold text-emerald-400 uppercase mb-2">In Memory</div>
                    {runningModels.map(m => (
                      <div key={m.name} className="flex items-center justify-between py-2 px-2 bg-emerald-500/5 rounded-lg mb-1">
                        <div className="flex-1">
                          <div className="text-xs font-mono text-white">{m.name}</div>
                          <div className="text-[9px] text-gray-500">
                            RAM: {ollama.formatSize(m.size)} | VRAM: {ollama.formatSize(m.size_vram)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnloadModel(m.name)}
                          disabled={modelLoading === m.name}
                          className="px-2 py-1 text-[9px] font-bold bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {modelLoading === m.name ? '...' : 'Unload'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Available Models */}
                <div className="p-3 max-h-60 overflow-y-auto">
                  <div className="text-[9px] font-bold text-gray-500 uppercase mb-2">Installed ({localModels.length})</div>
                  {localModels.map(m => {
                    const isRunning = runningModels.some(r => r.name === m.name);
                    return (
                      <div key={m.name} className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {isRunning && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                            <span className="text-xs font-mono text-gray-300">{m.name}</span>
                          </div>
                          <div className="text-[9px] text-gray-600">
                            {ollama.formatSize(m.size)} • {m.details?.parameter_size || 'unknown'} • {m.details?.quantization_level || ''}
                          </div>
                        </div>
                        {!isRunning && (
                          <button
                            onClick={() => handleLoadModel(m.name)}
                            disabled={modelLoading === m.name}
                            className="px-2 py-1 text-[9px] font-bold bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50"
                          >
                            {modelLoading === m.name ? '...' : 'Load'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Memory Usage Footer */}
                <div className="p-3 bg-black/50 border-t border-white/5">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-gray-500">Total VRAM Used</span>
                    <span className="font-mono text-blue-400">
                      {ollama.formatSize(runningModels.reduce((a, m) => a + m.size_vram, 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Deep Research - Only show in cloud mode */}
          {!useLocalModel && (
            <div className="flex items-center bg-black/40 px-4 py-2 rounded-xl border border-white/10 group cursor-pointer" onClick={() => setIsDeepResearch(!isDeepResearch)}>
              <div className={`w-3 h-3 rounded-full mr-3 transition-all ${isDeepResearch ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-gray-700'}`}></div>
              <span className={`text-[10px] font-black tracking-widest uppercase transition-colors ${isDeepResearch ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'}`}>Deep_Research</span>
            </div>
          )}

          <div className="flex bg-[#111111] p-1 rounded-xl border border-white/10 shadow-inner">
            <button
              onClick={() => setActiveTab('console')}
              className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-[0.2em] transition-all ${activeTab === 'console' ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
            >
              CONSOLE
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-[0.2em] transition-all ${activeTab === 'registry' ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
            >
              SYSTEM
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[760px]">
        {/* LEFT PANEL: KINETIC UI & TELEMETRY */}
        <div className="col-span-12 lg:col-span-3 flex flex-col space-y-4">
          {/* High-Fidelity Visualizer */}
          <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 h-[45%] flex flex-col items-center justify-center relative overflow-hidden group shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)] opacity-50"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="relative mb-10">
                <div className={`absolute -inset-10 rounded-full transition-all duration-700 opacity-20 blur-2xl ${voiceState === 'listening' ? 'bg-blue-500' :
                  voiceState === 'responding' ? 'bg-emerald-500' :
                    voiceState === 'searching' ? 'bg-amber-500 animate-ping' : 'bg-white/5'
                  }`} style={{ transform: `scale(${1 + (voiceState === 'listening' ? userVolume : modelVolume) * 0.5})` }}></div>

                <div className={`w-32 h-32 rounded-full border-4 transition-all duration-500 flex items-center justify-center ${voiceState === 'responding' ? 'border-emerald-400 shadow-[0_0_60px_rgba(52,211,153,0.3)]' :
                  voiceState === 'listening' ? 'border-blue-400 shadow-[0_0_60px_rgba(96,165,250,0.3)]' :
                    voiceState === 'searching' ? 'border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.3)]' : 'border-white/5'
                  }`}>
                  <div className="flex items-end space-x-2 h-14">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-100 ${voiceState === 'listening' ? 'bg-blue-400' :
                          voiceState === 'responding' ? 'bg-emerald-400' :
                            voiceState === 'searching' ? 'bg-amber-400' : 'bg-gray-800'
                          }`}
                        style={{ height: `${20 + (voiceState === 'listening' ? userVolume * (15 + i) : voiceState === 'responding' ? modelVolume * 40 : voiceState === 'searching' ? 50 + Math.random() * 30 : 0)}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-[11px] font-black tracking-[0.6em] text-gray-500 uppercase text-center ml-2 flex items-center">
                {voiceState === 'reasoning' ? (
                  <span className="text-amber-400 animate-pulse">Neural_Reasoning...</span>
                ) : voiceState === 'searching' ? (
                  <span className="text-blue-400 animate-pulse">Web_Crawl_Grounding...</span>
                ) : (
                  voiceState === 'idle' ? 'Ready_Node' : voiceState
                )}
              </div>
            </div>
          </div>

          {/* Diagnostics Terminal */}
          <div className="bg-black border border-white/5 rounded-[2.5rem] p-6 flex-1 flex flex-col overflow-hidden shadow-2xl relative">
            <div className="text-[10px] font-black text-blue-500/60 uppercase tracking-[0.3em] mb-4 flex items-center justify-between">
              <span>Live_Trace</span>
              <div className="flex-1 h-[1px] bg-white/5 mx-4"></div>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[9.5px] text-gray-600 scrollbar-hide">
              {systemTrace.map((trace, i) => (
                <div key={i} className={`flex items-start space-x-3 ${i === systemTrace.length - 1 ? 'text-blue-400 font-bold bg-blue-500/5 px-2 py-1 rounded' : 'opacity-70'}`}>
                  <span className="opacity-30">&gt;</span>
                  <span className="break-all">{trace}</span>
                </div>
              ))}
              <div ref={traceEndRef}></div>
            </div>
          </div>
        </div>

        {/* CENTER PANEL: INTELLIGENCE REPOSITORY */}
        <div className={`col-span-12 lg:col-span-${liveLinks.length > 0 ? '6' : '9'} bg-[#0a0a0a] border border-white/10 rounded-[3rem] flex flex-col overflow-hidden transition-all duration-700 shadow-2xl relative`}>
          {activeTab === 'console' ? (
            <>
              {/* Telemetry Dashboard */}
              {isLiveMode && (
                <div className="h-14 border-b border-white/5 bg-black/80 px-10 flex items-center justify-between animate-fadeIn backdrop-blur-3xl z-20">
                  <div className="flex items-center space-x-12">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Inference_Latency</span>
                      <span className="text-sm font-mono text-emerald-400 tabular-nums">{processingTime}ms</span>
                    </div>
                    <div className={`flex flex-col transition-opacity ${voiceState === 'searching' ? 'opacity-100' : 'opacity-40'}`}>
                      <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Search_Status</span>
                      <span className="text-sm font-mono text-blue-400 uppercase tracking-tighter">Grounding_Active</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Signal_Stability</span>
                    <div className="flex space-x-0.5">
                      {[...Array(4)].map((_, i) => <div key={i} className="w-1 h-3 bg-blue-500 rounded-sm"></div>)}
                    </div>
                  </div>
                </div>
              )}

              <div ref={scrollRef} className="flex-1 p-10 overflow-y-auto space-y-10 scrollbar-hide">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-10 space-y-10 group">
                    <div className="w-40 h-40 border-2 border-white/5 rounded-full flex items-center justify-center group-hover:border-blue-500/20 transition-all duration-1000">
                      <svg className="w-20 h-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-4xl font-black tracking-tighter uppercase opacity-50 italic">Knowledge Hub</h3>
                      <p className="text-[10px] uppercase tracking-[0.3em] font-mono">Synthesizing World Evidence via Google Search</p>
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                    <div className={`max-w-[85%] p-7 rounded-[2.5rem] relative group transition-all ${msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-2xl shadow-blue-900/20'
                      : 'bg-[#121212] border border-white/5 text-gray-100 rounded-bl-none shadow-inner'
                      }`}>
                      {msg.role === 'model' && (
                        <div className="absolute -top-3 -left-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 ${msg.isDeep ? 'bg-blue-600 text-white shadow-lg' : 'bg-black text-blue-500'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={msg.isDeep ? "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0010 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" : "M13 10V3L4 14h7v7l9-11h-7z"} />
                            </svg>
                          </div>
                        </div>
                      )}

                      <div className="prose prose-invert prose-sm leading-relaxed font-medium">
                        {msg.text}
                      </div>

                      {msg.latency && (
                        <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex space-x-3">
                            <span className="text-[9px] font-mono text-gray-500 uppercase">Latency: {msg.latency}ms</span>
                            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Engine: {msg.isDeep ? '3_PRO' : '3_FLASH'}</span>
                          </div>
                          <span className="text-[9px] font-mono text-blue-500 uppercase">Search_Grounding_Verified</span>
                        </div>
                      )}

                      {msg.links && msg.links.length > 0 && (
                        <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-1 gap-2">
                          <div className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Source Intelligence (Grounding)</div>
                          {msg.links.map((link, li) => (
                            <a key={li} href={link.uri} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-blue-500/30 transition-all group/link">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-blue-400 group-hover/link:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold text-gray-300 truncate underline decoration-transparent group-hover/link:decoration-blue-500 decoration-1 underline-offset-4">{link.title || link.uri}</div>
                                <div className="text-[8px] font-mono text-gray-600 truncate opacity-50">{link.uri}</div>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Research Input Dock */}
              <div className="p-10 bg-black/40 border-t border-white/5 backdrop-blur-3xl">
                <div className="flex items-center space-x-8">
                  <button
                    onClick={isLiveMode ? stopLiveMode : startLiveMode}
                    className={`w-24 h-24 flex items-center justify-center rounded-[2.5rem] transition-all relative group shadow-2xl ${isLiveMode
                      ? 'bg-red-500/10 text-red-500 border border-red-500/40 ring-[12px] ring-red-500/5'
                      : 'bg-white text-black hover:scale-105 active:scale-95 shadow-white/5'
                      }`}
                  >
                    <div className="absolute -inset-4 rounded-full bg-current opacity-0 group-hover:opacity-10 blur-xl transition-opacity"></div>
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isLiveMode ? "M6 18L18 6M6 6l12 12" : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"} />
                    </svg>
                  </button>

                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                      disabled={isLiveMode}
                      placeholder={isLiveMode ? "NATIVE_VOICE_STREAM_ACTIVE" : isDeepResearch ? "DEEP RESEARCH QUERY..." : "FAST GROUNDED SEARCH..."}
                      className={`w-full bg-[#121212] border-2 rounded-[2rem] py-7 pl-12 pr-44 focus:outline-none transition-all placeholder-gray-700 disabled:opacity-20 text-base font-mono tracking-tight shadow-inner ${isDeepResearch ? 'border-blue-500/50 ring-4 ring-blue-500/5' : 'border-white/5'}`}
                    />
                    <div className="absolute right-4 flex items-center space-x-2">
                      <button
                        onClick={handleSendText}
                        disabled={loading || !input.trim() || isLiveMode}
                        className="bg-blue-600 text-white px-10 py-4 rounded-2xl text-xs font-black tracking-[0.2em] hover:bg-blue-500 disabled:opacity-50 transition-all shadow-xl shadow-blue-600/30 uppercase"
                      >
                        {loading ? 'Thinking' : 'Search'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* System Configuration */
            <div className="p-20 space-y-20 max-w-3xl mx-auto w-full animate-fadeIn overflow-y-auto scrollbar-hide">
              <div className="space-y-8">
                <h3 className="text-5xl font-black tracking-tighter text-white uppercase italic">Registry <span className="text-blue-500">Node</span></h3>
                <p className="text-gray-500 text-base leading-relaxed font-medium">
                  Studio Node v1.5 implements a unified Intelligence Interface. By combining Native Multimodal Flash models for sub-second voice interaction and Deep-Research Pro models for complex grounding, we eliminate the need for discrete Whisper, LLM, and TTS pipelines.
                </p>
              </div>

              <div className="space-y-10">
                <div className="p-12 bg-white/5 border border-white/5 rounded-[3.5rem] flex items-center justify-between group hover:border-white/20 transition-all shadow-inner relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>
                  <div className="space-y-3 relative z-10">
                    <div className="text-2xl font-black uppercase tracking-tight">Identity Bridge</div>
                    <div className="text-xs font-mono text-emerald-400 uppercase tracking-[0.3em] flex items-center">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                      ENCRYPTED_WSS_ACTIVE
                    </div>
                  </div>
                  <button
                    // @ts-ignore
                    onClick={() => window.aistudio?.openSelectKey?.()}
                    className="bg-white text-black px-14 py-6 rounded-[2rem] font-black text-xs tracking-[0.4em] hover:scale-105 active:scale-95 transition-all shadow-2xl relative z-10"
                  >
                    REAUTH_NODE
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="p-10 bg-[#0f0f0f] border border-white/5 rounded-[3rem] shadow-inner">
                    <div className="text-[11px] uppercase tracking-[0.5em] text-gray-600 font-black mb-4">Signal_Core</div>
                    <div className="text-sm font-mono text-blue-400">Gemini 2.5 Flash Native</div>
                  </div>
                  <div className="p-10 bg-[#0f0f0f] border border-white/5 rounded-[3rem] shadow-inner">
                    <div className="text-[11px] uppercase tracking-[0.5em] text-gray-600 font-black mb-4">Search_Graph</div>
                    <div className="text-sm font-mono text-emerald-400">Google Grounding v5</div>
                  </div>
                </div>
              </div>

              <div className="p-12 bg-blue-600/5 border border-blue-500/20 rounded-[3.5rem] relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                  <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5zM2 12l10 5 10-5-10-5-10 5z" /></svg>
                </div>
                <div className="flex items-start space-x-8 relative z-10">
                  <div className="mt-2 text-blue-500">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div className="space-y-6">
                    <div className="text-2xl font-black uppercase tracking-[0.3em] text-blue-200">The Grounded Advantage</div>
                    <p className="text-sm text-blue-300/60 leading-relaxed font-medium">
                      Traditional "Whisperflow" chains are blind to the live web. Studio Node integrates Google Search natively into the inference cycle. This allows Gemini to perform real-time verification and deep synthesis while you talk, ensuring that responses are not just hallucinations, but grounded evidence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: LIVE KNOWLEDGE VAULT */}
        {liveLinks.length > 0 && (
          <div className="lg:col-span-3 bg-black/60 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-slideInRight backdrop-blur-xl">
            <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-500">Research_Vault</h3>
              <div className="px-4 py-1.5 rounded-full bg-blue-500 text-black text-[11px] font-black shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse">{liveLinks.length}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {liveLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-5 bg-[#141414] border border-white/10 rounded-[2rem] hover:border-blue-500/50 hover:bg-blue-500/10 transition-all group animate-fadeIn shadow-lg"
                  style={{ animationDelay: `${idx * 0.15}s` }}
                >
                  <div className="flex items-start space-x-5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-black text-gray-100 truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight leading-tight">{link.title || 'Knowledge Piece'}</div>
                      <div className="text-[9px] font-mono text-gray-600 truncate mt-1.5 uppercase tracking-tighter opacity-50">{link.uri}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            <div className="p-7 bg-blue-600/5 text-center border-t border-white/5">
              <div className="flex items-center justify-center space-x-3 mb-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
                <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.4em]">Integrated_Grounding_V5</p>
              </div>
              <p className="text-[8px] text-gray-600 font-bold uppercase">Real-time Evidence Stream Active</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideInRight { animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        ::selection { background: rgba(59, 130, 246, 0.5); color: white; }
      `}</style>
    </div>
  );
};

export default GeminiStudio;
