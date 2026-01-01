
import React, { useState, useRef, useEffect } from 'react';
import { ai, createPcmBlob, decodeAudio, convertToAudioBuffer } from '../services/gemini';
import { Modality } from '@google/genai';

const LiveVoiceInterface: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<string>('Ready to Connect');
  const [transcriptions, setTranscriptions] = useState<{role: 'user' | 'model', text: string}[]>([]);
  
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
      setStatus('Connecting...');
      
      // Setup Audio Contexts
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('Active');
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

            // Handle Transcriptions
            if (message.serverContent?.inputAudioTranscription) {
               // Update UI with partials if needed
            }
          },
          onerror: (e) => {
            console.error('Live API Error:', e);
            setStatus('Connection Error');
            setIsActive(false);
          },
          onclose: () => {
            setStatus('Disconnected');
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          systemInstruction: "You are the voice of LocalVocal. Be brief, technical, and helpful. You are running as a real-time voice interface demo."
        }
      });

    } catch (err) {
      console.error(err);
      setStatus('Mic Permission Denied');
    }
  };

  const endSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    stopAllAudio();
    setIsActive(false);
    setStatus('Disconnected');
    // Session automatically closes on cleanup or we can call session.close() if exposed
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Live Vocal</h1>
        <p className="text-gray-400 text-lg">Real-time Audio-to-Audio demo powered by Gemini Live API.</p>
      </div>

      <div className="bg-[#111111] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[600px] shadow-2xl relative">
        <div className="flex-1 flex flex-col items-center justify-center space-y-12">
          
          {/* Visualizer Orb */}
          <div className="relative">
            <div className={`w-48 h-48 rounded-full blur-3xl absolute -inset-4 transition-all duration-700 ${
              isActive ? 'bg-blue-600/40 animate-pulse scale-110' : 'bg-gray-800/20'
            }`}></div>
            <div className={`w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-inner overflow-hidden ${
              isActive ? 'border-blue-500 bg-blue-950/20' : 'border-white/5 bg-white/5'
            }`}>
              {isActive ? (
                <div className="flex items-center space-x-1">
                   {[...Array(5)].map((_, i) => (
                     <div key={i} className="w-2 bg-blue-400 rounded-full animate-bounce" style={{
                       height: `${20 + Math.random() * 40}px`,
                       animationDuration: `${0.5 + Math.random()}s`
                     }}></div>
                   ))}
                </div>
              ) : (
                <svg className="w-16 h-16 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold">{isActive ? 'Session Active' : 'Start Voice Interface'}</h3>
            <p className="text-gray-500 font-mono text-sm tracking-widest uppercase">{status}</p>
          </div>

          <button
            onClick={isActive ? endSession : startSession}
            className={`px-10 py-4 rounded-full font-bold transition-all transform active:scale-95 shadow-xl ${
              isActive 
                ? 'bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white' 
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/40 hover:shadow-blue-500/40'
            }`}
          >
            {isActive ? 'Disconnect Session' : 'Establish Live Connection'}
          </button>
        </div>

        <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center space-x-4">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           <p className="text-xs text-gray-400 leading-none">
             Connected to <span className="text-blue-400 font-mono">gemini-2.5-flash-native-audio</span>
           </p>
           <div className="flex-1"></div>
           <p className="text-[10px] text-gray-600 font-mono uppercase">Full Duplex Audio Enabled</p>
        </div>
      </div>
    </div>
  );
};

export default LiveVoiceInterface;
