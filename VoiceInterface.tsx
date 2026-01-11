
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

interface VoiceInterfaceProps {
  onClose: () => void;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onClose }) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let active = true;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // In a real implementation, we would follow the Live API setup guide here
    // but for brevity in this UI prototype, we'll simulate the connection states
    const timer = setTimeout(() => {
      if (active) setIsConnecting(false);
    }, 1500);

    return () => {
      active = false;
      clearTimeout(timer);
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="absolute top-6 right-6">
        <button onClick={onClose} className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all">
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="relative">
          {/* Animated Waveform Visualizer */}
          <div className="flex items-center gap-1 h-32">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className={`w-3 bg-blue-500 rounded-full animate-bounce`}
                style={{ 
                  height: `${20 + Math.random() * 80}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.6s'
                }}
              ></div>
            ))}
          </div>
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <p className="text-xl font-medium text-blue-400 animate-pulse">Initializing Neural Link...</p>
            </div>
          )}
        </div>

        <div className="max-w-xl space-y-4">
          <h2 className="text-4xl font-bold">Nexus Voice Mode</h2>
          <p className="text-xl text-gray-400">I'm listening. Ask me anything about your project, your life, or just chat.</p>
          <div className="min-h-[3rem] p-4 bg-white/5 rounded-2xl border border-white/5 italic text-gray-500">
            {transcript || "Listening for your voice..."}
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm pb-12">
        <div className="flex justify-center gap-8">
          <button className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
            <i className="fas fa-pause"></i>
          </button>
          <button onClick={onClose} className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all shadow-[0_0_30px_rgba(239,68,68,0.5)]">
            <i className="fas fa-phone-slash text-2xl"></i>
          </button>
          <button className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
            <i className="fas fa-microphone-slash"></i>
          </button>
        </div>
      </div>
    </div>
  );
};
