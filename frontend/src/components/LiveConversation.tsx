import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { API_URL } from '../services/config';

export const LiveConversation: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Idle');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const visualizerRef = useRef<HTMLDivElement>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const cleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsActive(false);
    setIsRecording(false);
    setStatus('Disconnected');
    audioChunksRef.current = [];
  };

  const connectVoice = async () => {
    try {
      setStatus('Initializing...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      setIsActive(true);
      setStatus('Hold to Speak');
    } catch (e) {
      console.error(e);
      setStatus('Error accessing mic');
      cleanup();
    }
  };

  const startRecording = () => {
    if (!streamRef.current || !isActive) return;

    audioChunksRef.current = [];
    const mimeType = 'audio/webm';
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await sendAudioToBackend(audioBlob, mimeType);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setStatus('Listening...');
      
      if (visualizerRef.current) {
        visualizerRef.current.style.height = '60%';
      }
    } catch (e) {
      console.error("Error starting MediaRecorder", e);
      setStatus('Error recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('Processing...');
      if (visualizerRef.current) {
        visualizerRef.current.style.height = '10%';
      }
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob, mimeType: string) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        const response = await fetch(`${API_URL}/api/bedrock/audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: mimeType
          })
        });

        if (!response.ok) throw new Error('Server error');

        const data = await response.json();
        if (data.audioBase64) {
           setStatus('Speaking...');
           await playAudioResponse(data.audioBase64);
        } else {
           setStatus('Hold to Speak');
        }
      };
    } catch (e) {
      console.error("Backend error", e);
      setStatus('Hold to Speak');
    }
  };

  const playAudioResponse = async (base64Audio: string) => {
    if (!audioContextRef.current) return;

    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
         setStatus('Hold to Speak');
         if (visualizerRef.current) {
           visualizerRef.current.style.height = '10%';
         }
      };

      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
      }
      sourceNodeRef.current = source;

      source.start(0);

      if (visualizerRef.current) {
        visualizerRef.current.style.height = '80%';
      }
    } catch (e) {
      console.error("Error playing audio", e);
      setStatus('Hold to Speak');
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  return (
    <div className="max-w-xl mx-auto py-20 text-center space-y-12">
       <div className="p-12 linear-card border border-white/10 rounded-xl bg-white/[0.01] flex flex-col items-center gap-8">
          <div className="h-16 flex items-center gap-1">
             {[...Array(12)].map((_, i) => (
               <div 
                key={i} 
                className={`w-1 rounded-full bg-white transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-20 h-2'}`}
                ref={i === 5 ? visualizerRef : null}
                style={{ height: isActive ? '10%' : '8px' }}
               />
             ))}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Intelligence Bridge</h2>
            <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-[0.2em]">{status}</p>
          </div>

          {!isActive ? (
            <Button
              onClick={connectVoice}
              variant="primary"
              className="w-full max-w-[200px]"
            >
              Connect Voice
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full">
              <Button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                variant={isRecording ? 'primary' : 'secondary'}
                className="w-full max-w-[200px]"
                style={{
                  backgroundColor: isRecording ? '#E03E3E' : undefined,
                  color: isRecording ? 'white' : undefined,
                  borderColor: isRecording ? '#E03E3E' : undefined
                }}
              >
                {isRecording ? 'Listening...' : 'Hold to Speak'}
              </Button>
              <Button
                onClick={cleanup}
                variant="secondary"
                className="text-xs px-2 py-1 text-[#8A8A8E] border-none hover:bg-transparent hover:text-white"
              >
                Disconnect
              </Button>
            </div>
          )}
       </div>
       
       <p className="text-[#8A8A8E] text-[11px] font-medium leading-relaxed max-w-xs mx-auto">
         Direct voice interface to AI Intelligence. Strategic pattern recognition in real-time.
       </p>
    </div>
  );
};
