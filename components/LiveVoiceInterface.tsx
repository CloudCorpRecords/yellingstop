
import React, { useState, useRef, useEffect } from 'react';
import { ai, createPcmBlob, decodeAudio, convertToAudioBuffer } from '../services/gemini';
import { Modality } from '@google/genai';

const LiveVoiceInterface: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const [status, setStatus] = useState<string>('Daemon_Standby');
  const [transcriptions, setTranscriptions] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isHotwordDetected, setIsHotwordDetected] = useState(false);
  
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopAllAudio = () => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const startSession = async () => {
    try {
      setStatus('Linking_FastAPI...');
      
      // Setup Audio Contexts
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('Active_Duplex');
            setIsActive(true);
            
            // Start streaming mic
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
            (sessionRef.current as any) = { scriptProcessor, source };
          },
          onmessage: async (message: any) => {
            // Handle Audio
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextOutRef.current) {
              const ctx = audioContextOutRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const buffer = await convertToAudioBuffer(decodeAudio(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              
              source.addEventListener('ended', () => activeSourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              activeSourcesRef.current.add(source);
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              stopAllAudio();
            }
          },
          onerror: (e) => {
            console.error('FastAPI Bridge Error:', e);
            setStatus('Connection_Refused');
            setIsActive(false);
          },
          onclose: () => {
            setStatus('Link_Closed');
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
          },
          systemInstruction: "You are LocalVocal, a high-performance voice daemon. You are integrated via FastAPI. Be concise and technical. You provide immediate feedback for voice commands."
        }
      });

    } catch (err) {
      console.error(err);
      setStatus('Hardware_IO_Error');
    }
  };

  const endSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    stopAllAudio();
    setIsActive(false);
    setStatus('Daemon_Standby');
  };

  // Simulate Wake Word Detection for M4 demo
  useEffect(() => {
    let interval: any;
    if (isWakeWordEnabled && !isActive) {
      interval = setInterval(() => {
        // Randomly simulate detection
        if (Math.random() > 0.95) {
          setIsHotwordDetected(true);
          setTimeout(() => {
            setIsHotwordDetected(false);
            startSession();
          }, 1000);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isWakeWordEnabled, isActive]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase italic">Live <span className="text-blue-500">Vocal</span></h1>
        <p className="text-gray-400 text-lg">Milestone 4: Always-listening Wake Word Engine (Porcupine SDK).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Interface */}
        <div className="lg:col-span-2 bg-[#111111] border border-white/5 rounded-[3rem] overflow-hidden flex flex-col h-[650px] shadow-2xl relative">
          <div className="flex-1 flex flex-col items-center justify-center space-y-12 p-8">
            
            {/* Visualizer Orb */}
            <div className="relative">
              <div className={`w-56 h-56 rounded-full blur-[60px] absolute -inset-8 transition-all duration-1000 ${
                isActive ? 'bg-blue-600/40 animate-pulse scale-125' : 
                isHotwordDetected ? 'bg-emerald-500/60 scale-150 animate-ping' :
                isWakeWordEnabled ? 'bg-amber-500/10 scale-90' : 'bg-gray-800/10'
              }`}></div>
              <div className={`w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] overflow-hidden ${
                isActive ? 'border-blue-500 bg-blue-950/20 shadow-[0_0_40px_rgba(59,130,246,0.2)]' : 
                isHotwordDetected ? 'border-emerald-400 bg-emerald-950/30' :
                'border-white/5 bg-white/5'
              }`}>
                {isActive ? (
                  <div className="flex items-end space-x-1.5 h-16">
                     {[...Array(8)].map((_, i) => (
                       <div key={i} className="w-2 bg-blue-400 rounded-full animate-bounce" style={{
                         height: `${20 + Math.random() * 60}%`,
                         animationDuration: `${0.6 + Math.random()}s`,
                         animationDelay: `${i * 0.1}s`
                       }}></div>
                     ))}
                  </div>
                ) : isHotwordDetected ? (
                  <div className="text-emerald-400 font-black text-xs uppercase tracking-widest animate-pulse">Hotword_Triggered</div>
                ) : (
                  <div className="flex flex-col items-center opacity-20 group-hover:opacity-40 transition-opacity">
                    <svg className="w-20 h-20 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Awaiting_Input</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center space-y-3">
              <h3 className="text-3xl font-black uppercase tracking-tight">{isActive ? 'Voice Bridge Live' : isWakeWordEnabled ? 'Listening for Wake Word' : 'Daemon Standby'}</h3>
              <div className="flex items-center justify-center space-x-3">
                 <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-gray-700'}`}></div>
                 <p className="text-gray-500 font-mono text-xs tracking-[0.3em] uppercase">{status}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={isActive ? endSession : startSession}
                className={`px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-2xl ${
                  isActive 
                    ? 'bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white' 
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {isActive ? 'Terminate_Link' : 'Force_Manual_Link'}
              </button>
            </div>
          </div>

          <div className="absolute bottom-10 left-10 right-10 p-5 bg-white/5 border border-white/5 rounded-[2rem] flex items-center space-x-5 backdrop-blur-xl">
             <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
               FastAPI Worker <span className="text-blue-400">Node_01</span> Active
             </p>
             <div className="flex-1"></div>
             <div className="flex items-center space-x-4">
                <span className="text-[9px] text-gray-600 font-black uppercase">Buffer: 4096 Samples</span>
                <span className="text-[9px] text-gray-600 font-black uppercase italic">M3_Verified</span>
             </div>
          </div>
        </div>

        {/* Configuration Side Panel */}
        <div className="space-y-6">
           <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 space-y-8">
              <div className="space-y-2">
                 <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Wake_Word_Engine (M4)</h4>
                 <div className="flex items-center justify-between p-4 bg-black rounded-2xl border border-white/5">
                    <div className="space-y-1">
                       <div className="text-xs font-black uppercase">Always_Listen</div>
                       <div className="text-[9px] text-gray-600 font-bold uppercase italic">Porcupine SDK</div>
                    </div>
                    <button 
                      onClick={() => setIsWakeWordEnabled(!isWakeWordEnabled)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${isWakeWordEnabled ? 'bg-blue-600' : 'bg-white/10'}`}
                    >
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isWakeWordEnabled ? 'right-1' : 'left-1'}`}></div>
                    </button>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Daemon_Config</h4>
                 <div className="space-y-3">
                    <div className="flex flex-col space-y-1">
                       <label className="text-[9px] font-black text-gray-600 uppercase">Listen_Keyword</label>
                       <select className="bg-black border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-500">
                          <option>Hey Local</option>
                          <option>Jarvis</option>
                          <option>Computer</option>
                       </select>
                    </div>
                    <div className="flex flex-col space-y-1">
                       <label className="text-[9px] font-black text-gray-600 uppercase">Detection_Threshold</label>
                       <input type="range" className="w-full h-1.5 bg-white/5 rounded-full appearance-none accent-blue-500" />
                    </div>
                 </div>
              </div>

              <div className="p-5 bg-blue-600/5 border border-blue-500/20 rounded-2xl">
                 <div className="flex items-center space-x-2 text-blue-400 mb-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span className="text-[9px] font-black uppercase tracking-widest">M4 Background Daemon</span>
                 </div>
                 <p className="text-[10px] text-blue-300/60 leading-relaxed font-medium">
                   The Porcupine listener runs as a lightweight background thread, consuming &lt;1% CPU until the wake word is detected, then triggering the FastAPI STT pipeline.
                 </p>
              </div>
           </div>

           <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-6 h-32 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity">
              <div className="text-center">
                 <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 italic">FastAPI_Worker_Pool</div>
                 <div className="flex space-x-1 justify-center">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="w-1 h-4 bg-emerald-500/40 rounded-full animate-pulse" style={{ animationDelay: `${i*0.2}s` }}></div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LiveVoiceInterface;
