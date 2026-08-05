import React, { useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CameraScannerProps {
  onScan: (file: File) => void;
  isProcessing?: boolean;
  label?: string;
}

export function CameraScanner({ onScan, isProcessing, label = "Escanear" }: CameraScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor, selecione ou tire uma foto válida.");
        return;
      }
      onScan(file);
    }
  };

  return (
    <div className="relative inline-block">
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef}
        onChange={handleCapture}
        className="hidden" 
        id="camera-upload"
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="flex items-center gap-2 bg-[#1A1A1E] hover:bg-rose-500 hover:text-white text-[#A1A1AA] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all border border-[rgba(255,255,255,0.05)] disabled:opacity-50"
      >
        {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        {isProcessing ? "Processando..." : label}
      </button>
    </div>
  );
}
