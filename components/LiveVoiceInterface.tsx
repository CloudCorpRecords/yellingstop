import React, { useState, useRef, useEffect } from 'react';
import { audioService } from '../services/audio';
import * as ollama from '../services/ollama';
import * as whisper from '../services/whisper';

const LiveVoiceInterface: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<string>('Ready');
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [recordedChunks, setRecordedChunks] = useState<Float32Array[]>([]);
  const [response, setResponse] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check Ollama status on mount
  useEffect(() => {
    const checkOllama = async () => {
      const status = await ollama.checkOllamaStatus();
      setOllamaOnline(status.running);
    };
    checkOllama();
    const interval = setInterval(checkOllama, 5000);
    return () => clearInterval(interval);
  }, []);

  const startRecording = async () => {
    setStatus('Requesting microphone...');
    setRecordedChunks([]);
    setTranscription('');
    setResponse('');

    // Start Web Speech API for live transcription
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim = transcript;
          }
        }
        setTranscription(prev => (final || interim) ? (prev + final).trim() + (interim ? ` ${interim}` : '') : prev);
      };

      recognitionRef.current.start();
      setIsListening(true);
    }

    const success = await audioService.startRecording(
      (audioData) => {
        setRecordedChunks(prev => [...prev, audioData]);
      },
      (level) => {
        setAudioLevel(level);
      }
    );

    if (success) {
      setIsRecording(true);
      setStatus('Listening...');
    } else {
      setStatus('Microphone access denied');
    }
  };

  const stopRecording = async () => {
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }

    audioService.stopRecording();
    setIsRecording(false);
    setAudioLevel(0);
    setStatus('Processing...');
    setIsProcessing(true);

    // Use the transcription we captured from Web Speech API
    const capturedText = transcription.trim();

    if (capturedText && ollamaOnline) {
      setStatus('Thinking...');
      const models = await ollama.listModels();
      if (models.length > 0) {
        const modelToUse = models[0].name;
        setResponse('');
        await ollama.generate(
          modelToUse,
          `The user said: "${capturedText}". Respond helpfully and concisely.`,
          (token) => setResponse(prev => prev + token)
        );
      } else {
        setResponse('No Ollama models installed. Pull a model in the Model Engine tab.');
      }
    } else if (capturedText) {
      setResponse('Ollama is offline. Start it with: ollama serve');
    } else {
      setResponse('No speech detected. Try speaking into your microphone.');
    }

    setStatus('Ready');
    setIsProcessing(false);
  };

  // Generate bar heights based on audio level
  const getBarHeight = (index: number, total: number) => {
    if (!isRecording) return 10;
    const wave = Math.sin((index / total) * Math.PI);
    return 10 + (audioLevel * wave * 60);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase italic">Live <span className="text-blue-500">Vocal</span></h1>
        <p className="text-gray-400 text-lg">Real-time voice capture and AI response.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Interface */}
        <div className="lg:col-span-2 bg-[#111111] border border-white/5 rounded-[3rem] overflow-hidden flex flex-col h-[650px] shadow-2xl relative">
          <div className="flex-1 flex flex-col items-center justify-center space-y-12 p-8">

            {/* Visualizer Orb */}
            <div className="relative">
              <div className={`w-56 h-56 rounded-full blur-[60px] absolute -inset-8 transition-all duration-300 ${isRecording ? 'bg-blue-600/40 scale-125' :
                isProcessing ? 'bg-amber-500/40 animate-pulse' :
                  'bg-gray-800/10'
                }`}></div>
              <div className={`w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] overflow-hidden ${isRecording ? 'border-blue-500 bg-blue-950/20 shadow-[0_0_40px_rgba(59,130,246,0.2)]' :
                isProcessing ? 'border-amber-500 bg-amber-950/20' :
                  'border-white/5 bg-white/5'
                }`}>
                {isRecording ? (
                  <div className="flex items-end space-x-1.5 h-20">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 bg-blue-400 rounded-full transition-all duration-75"
                        style={{ height: `${getBarHeight(i, 12)}%` }}
                      ></div>
                    ))}
                  </div>
                ) : isProcessing ? (
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <div className="flex flex-col items-center opacity-40">
                    <svg className="w-20 h-20 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Click to Start</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center space-y-3">
              <h3 className="text-3xl font-black uppercase tracking-tight">
                {isRecording ? 'Listening...' : isProcessing ? 'Processing...' : 'Ready'}
              </h3>
              <div className="flex items-center justify-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]' : 'bg-gray-700'}`}></div>
                <p className="text-gray-500 font-mono text-xs tracking-[0.3em] uppercase">{status}</p>
              </div>
            </div>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-2xl disabled:opacity-50 ${isRecording
                ? 'bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white'
                : 'bg-white text-black hover:bg-gray-200'
                }`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>

          {/* Response Area */}
          {(transcription || response) && (
            <div className="absolute bottom-10 left-10 right-10 p-5 bg-white/5 border border-white/5 rounded-[2rem] backdrop-blur-xl max-h-48 overflow-y-auto">
              {transcription && (
                <div className="mb-3">
                  <span className="text-[9px] font-black text-gray-500 uppercase">You said:</span>
                  <p className="text-sm text-gray-400">{transcription}</p>
                </div>
              )}
              {response && (
                <div>
                  <span className="text-[9px] font-black text-blue-400 uppercase">AI Response:</span>
                  <p className="text-sm text-white">{response}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Side Panel */}
        <div className="space-y-6">
          <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">System_Status</h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-black rounded-2xl border border-white/5">
                <div className="space-y-1">
                  <div className="text-xs font-black uppercase">Ollama</div>
                  <div className="text-[9px] text-gray-600 font-bold uppercase">LLM Backend</div>
                </div>
                <div className={`flex items-center space-x-2 ${ollamaOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${ollamaOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className="text-[9px] font-black uppercase">{ollamaOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-black rounded-2xl border border-white/5">
                <div className="space-y-1">
                  <div className="text-xs font-black uppercase">Whisper</div>
                  <div className="text-[9px] text-gray-600 font-bold uppercase">Speech-to-Text</div>
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                  <span className="text-[9px] font-black uppercase">Phase 3</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-black rounded-2xl border border-white/5">
                <div className="space-y-1">
                  <div className="text-xs font-black uppercase">TTS</div>
                  <div className="text-[9px] text-gray-600 font-bold uppercase">Text-to-Speech</div>
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                  <span className="text-[9px] font-black uppercase">Phase 4</span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-blue-600/5 border border-blue-500/20 rounded-2xl">
              <div className="flex items-center space-x-2 text-blue-400 mb-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="text-[9px] font-black uppercase tracking-widest">Real Audio Capture</span>
              </div>
              <p className="text-[10px] text-blue-300/60 leading-relaxed font-medium">
                This component now uses real microphone input. The visualizer shows your actual audio levels!
              </p>
            </div>
          </div>

          <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-6">
            <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-4">Audio_Level</div>
            <div className="h-4 bg-black rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-75"
                style={{ width: `${audioLevel * 100}%` }}
              ></div>
            </div>
            <div className="text-[9px] text-gray-600 mt-2 text-right font-mono">
              {(audioLevel * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveVoiceInterface;
