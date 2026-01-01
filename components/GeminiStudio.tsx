
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ai, createPcmBlob, decodeAudio, convertToAudioBuffer } from '../services/gemini';
import { Modality } from '@google/genai';

const GeminiStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string, links?: any[], latency?: number}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean>(false);
  
  // Advanced Telemetry & Voice State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'reasoning' | 'responding'>('idle');
  const [liveLinks, setLiveLinks] = useState<any[]>([]);
  const [systemTrace, setSystemTrace] = useState<string[]>(['CORE_INIT_SUCCESS']);
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
  }, []);

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
    // Cast options to any to avoid TypeScript error on fractionalSecondDigits
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2 } as any);
    setSystemTrace(prev => [...prev.slice(-15), `[${timestamp}] ${msg}`]);
  };

  const stopLiveAudio = () => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setModelVolume(0);
  };

  const startLiveMode = async () => {
    if (!hasKey) {
      alert("System Authentication Required.");
      return;
    }

    try {
      setVoiceState('listening');
      addTrace('ESTABLISHING_WSS_LINK');
      setIsLiveMode(true);
      setLiveLinks([]);
      
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let currentInputTranscription = '';
      let currentOutputTranscription = '';

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            addTrace('WSS_READY :: DUPLEX_AUDIO_ACTIVE');
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setUserVolume(rms * 10);

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
                setLiveLinks(prev => [...prev, ...links]);
                addTrace(`GROUNDING_SOURCE_DETECTED :: ${links.length} URLs`);
              }
            }

            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              if (!turnStartTime.current) turnStartTime.current = performance.now();
              currentInputTranscription += message.serverContent.inputTranscription.text;
              setVoiceState('reasoning');
              addTrace(`STT_TRANSCRIPTION_STREAM :: ${message.serverContent.inputTranscription.text}`);
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
              addTrace('TURN_COMPLETE :: STATE_IDLE');
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextOutRef.current) {
              if (voiceState !== 'responding') {
                setVoiceState('responding');
                addTrace('TTS_STREAM_INGRESS');
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

              setModelVolume(0.8);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              activeSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              stopLiveAudio();
              setVoiceState('listening');
              addTrace('SYSTEM_INTERRUPT :: USER_OVERRIDE');
            }
          },
          onerror: (e) => {
            console.error(e);
            addTrace('CORE_WSS_ERROR');
            stopLiveMode();
          },
          onclose: () => {
            addTrace('LINK_TERMINATED');
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
          systemInstruction: "You are the Gemini Studio Intelligence Engine. You outperform traditional Whisper/LLM flows by providing native multi-modal audio processing. You have real-time web search. Responses must be extremely concise (max 2 sentences) to maintain sub-second interaction feel. Never say 'I am searching', just deliver grounded info."
        }
      });
    } catch (err) {
      console.error(err);
      setIsLiveMode(false);
      setVoiceState('idle');
      addTrace('PERMISSION_DENIED');
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
    addTrace('SESSION_CLEANUP_SUCCESS');
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    const start = performance.now();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    addTrace('MANUAL_QUERY_INGESTED');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: { tools: [{ googleSearch: {} }] }
      });

      const latency = Math.round(performance.now() - start);
      const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean);
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text || 'No response.',
        links,
        latency
      }]);
      addTrace(`LLM_INFERENCE_COMPLETE :: ${latency}ms`);
    } catch (err) {
      addTrace('INFERENCE_FAILURE');
      setMessages(prev => [...prev, { role: 'model', text: 'System offline or API error.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-[#ededed]">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-black tracking-tight flex items-center">
            GEMINI <span className="text-blue-500 ml-2">STUDIO</span>
          </h1>
          <div className="flex items-center space-x-3 mt-1">
             <div className={`w-1.5 h-1.5 rounded-full ${isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
             <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-500">
               {isLiveMode ? 'Engine_Linked :: Native_Audio' : 'Engine_Offline'}
             </p>
          </div>
        </div>
        <div className="flex bg-[#111111] border border-white/10 p-1 rounded-xl shadow-2xl">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`px-5 py-2 rounded-lg text-xs font-black tracking-widest transition-all ${activeTab === 'chat' ? 'bg-white text-black' : 'text-gray-500 hover:text-gray-300'}`}
          >
            CONSOLE
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-5 py-2 rounded-lg text-xs font-black tracking-widest transition-all ${activeTab === 'settings' ? 'bg-white text-black' : 'text-gray-500 hover:text-gray-300'}`}
          >
            SYSTEM
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[740px]">
        {/* Left Console Panel: System Trace & Visualizer */}
        <div className="col-span-12 lg:col-span-3 flex flex-col space-y-4">
           {/* Kinetic Visualizer */}
           <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 h-1/2 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-50"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                 <div className="relative mb-6">
                    {/* Concentric Signal Rings */}
                    <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
                      voiceState === 'listening' ? 'bg-blue-500/10 border border-blue-500/20' : 
                      voiceState === 'responding' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5'
                    }`} style={{ transform: `scale(${1.5 + (voiceState === 'listening' ? userVolume * 2 : modelVolume * 1.5)})` }}></div>
                    
                    <div className={`w-24 h-24 rounded-full border-2 transition-all duration-500 flex items-center justify-center ${
                      voiceState === 'responding' ? 'border-emerald-400 bg-emerald-400/5 shadow-[0_0_30px_rgba(52,211,153,0.3)]' : 
                      voiceState === 'listening' ? 'border-blue-400 bg-blue-400/5 shadow-[0_0_30px_rgba(96,165,250,0.3)]' : 'border-white/10'
                    }`}>
                       <div className="flex items-end space-x-1.5 h-8">
                          {[1,2,3,4,5].map(i => (
                            <div 
                              key={i} 
                              className={`w-1 rounded-full transition-all duration-150 ${
                                voiceState === 'listening' ? 'bg-blue-400' : 
                                voiceState === 'responding' ? 'bg-emerald-400' : 'bg-gray-700'
                              }`} 
                              style={{ height: `${20 + (voiceState === 'listening' ? userVolume * (15 + i) : voiceState === 'responding' ? modelVolume * 30 : 0)}%` }}
                            ></div>
                          ))}
                       </div>
                    </div>
                 </div>
                 <div className="text-[10px] font-black tracking-[0.4em] text-gray-500 uppercase text-center">
                    {voiceState === 'reasoning' ? (
                      <span className="text-amber-400 animate-pulse">Reasoning...</span>
                    ) : (
                      voiceState === 'idle' ? 'Ready' : voiceState
                    )}
                 </div>
              </div>
           </div>

           {/* System Trace Ticker */}
           <div className="bg-[#0c0c0c] border border-white/5 rounded-3xl p-5 flex-1 flex flex-col overflow-hidden shadow-inner">
              <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 flex items-center">
                 <span className="mr-2">Live_Trace</span>
                 <div className="flex-1 h-px bg-white/5"></div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[9px] text-gray-500 scrollbar-hide">
                 {systemTrace.map((trace, i) => (
                   <div key={i} className={`flex items-start space-x-2 ${i === systemTrace.length - 1 ? 'text-blue-400' : ''}`}>
                      <span className="opacity-50">&gt;</span>
                      <span className="break-all">{trace}</span>
                   </div>
                 ))}
                 <div ref={traceEndRef}></div>
              </div>
           </div>
        </div>

        {/* Center Panel: Intelligence & Chat */}
        <div className={`col-span-12 lg:col-span-${liveLinks.length > 0 ? '6' : '9'} bg-[#111111] border border-white/10 rounded-[2.5rem] flex flex-col overflow-hidden transition-all duration-700 shadow-2xl relative`}>
          {activeTab === 'chat' ? (
            <>
              {/* Telemetry Strip */}
              {isLiveMode && (
                <div className="h-10 border-b border-white/5 bg-black/40 px-6 flex items-center justify-between animate-fadeIn">
                   <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                         <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Latency:</span>
                         <span className="text-[10px] font-mono text-emerald-400">{processingTime}ms</span>
                      </div>
                      <div className="flex items-center space-x-2">
                         <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Modality:</span>
                         <span className="text-[10px] font-mono text-blue-400">Audio_Native</span>
                      </div>
                   </div>
                   <div className="text-[9px] text-gray-600 font-bold uppercase animate-pulse">Engine_Active</div>
                </div>
              )}

              <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto space-y-6 scrollbar-hide">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-10">
                    <svg className="w-24 h-24 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="text-2xl font-black tracking-tighter uppercase">Studio Console</h3>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                    <div className={`max-w-[85%] p-5 rounded-[2rem] relative group ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none shadow-xl' 
                        : 'bg-[#1a1a1a] border border-white/10 text-gray-200 rounded-bl-none'
                    }`}>
                      <div className="prose prose-invert prose-sm leading-relaxed font-medium">
                         {msg.text}
                      </div>
                      
                      {msg.latency && (
                        <div className="absolute -bottom-5 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                           <span className="text-[8px] font-mono text-gray-600 uppercase">Process_Time: {msg.latency}ms</span>
                        </div>
                      )}

                      {msg.links && msg.links.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
                           <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Knowledge_Sources</div>
                          {msg.links.map((link, li) => (
                            <a key={li} href={link.uri} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-[11px] text-blue-400 hover:text-white transition-colors truncate">
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              <span className="underline decoration-blue-500/30 underline-offset-2">{link.title || link.uri}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Interaction UI */}
              <div className="p-6 bg-black/40 border-t border-white/5 backdrop-blur-3xl">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={isLiveMode ? stopLiveMode : startLiveMode}
                    className={`w-16 h-16 flex items-center justify-center rounded-[1.5rem] transition-all relative ${
                      isLiveMode 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/30 ring-4 ring-red-500/10' 
                        : 'bg-white text-black hover:scale-105 active:scale-95 shadow-xl shadow-white/5'
                    }`}
                  >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isLiveMode ? "M6 18L18 6M6 6l12 12" : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"} />
                    </svg>
                  </button>

                  <div className="flex-1 relative flex items-center group">
                    <input 
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      disabled={isLiveMode}
                      placeholder={isLiveMode ? "VOICE_MODE_ENGAGED" : "INITIATE_CLOUD_INFERENCE..."}
                      className="w-full bg-[#161616] border border-white/5 rounded-2xl py-5 pl-8 pr-32 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-gray-700 disabled:opacity-50 text-sm font-mono"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={loading || !input.trim() || isLiveMode}
                      className="absolute right-3 bg-blue-600 text-white px-7 py-2.5 rounded-xl text-xs font-black tracking-widest hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg"
                    >
                      {loading ? 'BUSY' : 'EXEC'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* System Config View */
            <div className="p-12 space-y-12 max-w-2xl mx-auto w-full animate-fadeIn overflow-y-auto scrollbar-hide">
              <div className="space-y-4">
                <h3 className="text-3xl font-black tracking-tight text-white uppercase">Engine Registry</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Studio v1.0 leverages native-audio multimodal models. This enables end-to-end inference without discrete STT/TTS latency bottlenecks.
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] flex items-center justify-between group hover:border-white/20 transition-all">
                  <div className="space-y-1">
                    <div className="text-lg font-black uppercase tracking-tighter">Auth Link</div>
                    <div className="text-[10px] font-mono text-emerald-400">ACTIVE_IDENTITY_BRIDGED</div>
                  </div>
                  <button 
                    // @ts-ignore
                    onClick={() => window.aistudio?.openSelectKey?.()}
                    className="bg-white text-black px-10 py-4 rounded-2xl font-black text-xs tracking-widest hover:scale-105 active:scale-95 transition-all"
                  >
                    SYNC_KEYS
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-[#161616] border border-white/5 rounded-[2.5rem]">
                     <div className="text-[9px] uppercase tracking-[0.3em] text-gray-600 font-black mb-2">Primary_Engine</div>
                     <div className="text-xs font-mono text-blue-400">Gemini 2.5 Flash Native</div>
                  </div>
                  <div className="p-6 bg-[#161616] border border-white/5 rounded-[2.5rem]">
                     <div className="text-[9px] uppercase tracking-[0.3em] text-gray-600 font-black mb-2">Grounding_API</div>
                     <div className="text-xs font-mono text-emerald-400">Google Search v4</div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-[2.5rem]">
                <div className="flex items-start space-x-5">
                  <div className="mt-1 text-blue-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-black uppercase tracking-widest text-blue-200">Whisper Flow vs Native</div>
                    <p className="text-xs text-blue-300/60 leading-relaxed font-medium">
                      Traditional flows pipe Whisper STT -> LLM -> TTS. Studio uses a **Native Multi-Modal engine**, processing audio features directly. This results in significantly lower latency and better emotional inflection.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Research Panel: Live Grounding */}
        {liveLinks.length > 0 && (
          <div className="lg:col-span-3 bg-[#111111] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-slideInRight">
            <div className="p-6 border-b border-white/5 bg-black/40 flex items-center justify-between">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Research_Vault</h3>
               <div className="w-6 h-6 rounded-full bg-blue-500 text-black flex items-center justify-center text-[10px] font-black">{liveLinks.length}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
               {liveLinks.map((link, idx) => (
                 <a 
                   key={idx} 
                   href={link.uri} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="block p-4 bg-[#161616] border border-white/5 rounded-2xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all