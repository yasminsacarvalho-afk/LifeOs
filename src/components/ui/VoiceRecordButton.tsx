import React, { useState, useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VoiceRecordButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  placeholder?: string;
}

export function VoiceRecordButton({ onTranscript, className, placeholder }: VoiceRecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false; // Parar automaticamente ao terminar de falar
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'pt-BR'; // Focado no português

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          onTranscript(transcript);
          setIsRecording(false);
          toast.success("Áudio convertido em texto!");
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Erro no reconhecimento de voz:", event.error);
          setIsRecording(false);
          if (event.error !== 'no-speech') {
             toast.error(`Erro no microfone: ${event.error}`);
          }
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
  }, [onTranscript]);

  const toggleRecording = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!recognitionRef.current) {
      toast.error("Seu navegador não suporta digitação por voz. Use o Chrome ou Edge.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast.info("Escutando... Pode falar.", { duration: 3000 });
      } catch (err) {
        console.error("Erro ao iniciar gravação:", err);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggleRecording}
      className={cn(
        "p-2.5 rounded-lg transition-all duration-300 flex items-center justify-center shrink-0",
        isRecording 
          ? "bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)] border-transparent" 
          : "bg-[#111113] text-[#A1A1AA] hover:bg-[#1A1A1E] hover:text-white border border-[rgba(255,255,255,0.06)]",
        className
      )}
      title={isRecording ? "Ouvindo... Clique para parar." : (placeholder || "Ditar por voz")}
    >
      <Mic className={cn("size-4", isRecording ? "animate-bounce" : "")} />
    </button>
  );
}
