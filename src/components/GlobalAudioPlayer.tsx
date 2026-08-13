import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, X, Music, FastForward, Rewind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function GlobalAudioPlayer() {
  const [audioData, setAudioData] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const handleGlobalAudio = (e: any) => {
      setAudioData(e.detail);
      setIsPlaying(true);
      toast.success("Áudio minimizado. A reprodução continuará em segundo plano.");
    };

    window.addEventListener('global-audio', handleGlobalAudio as EventListener);
    return () => {
      window.removeEventListener('global-audio', handleGlobalAudio as EventListener);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioDataEvent = () => {
      setDuration(audio.duration);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);

    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', setAudioDataEvent);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', onEnded);

    if (isPlaying && audioData) {
      audio.play().catch(err => console.error("Playback prevented:", err));
    }

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioDataEvent);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioData]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(e => console.error(e));
    } else {
      audio.pause();
    }
  }, [isPlaying]);
  const finalUrl = React.useMemo(() => {
    if (!audioData?.url) return "";
    let url = audioData.url;
    if (url.includes('drive.google.com')) {
      if (url.includes('/d/')) {
        const id = url.split('/d/')[1]?.split('/')[0];
        if (id) {
          url = `https://drive.google.com/uc?export=download&id=${id}`;
        }
      }
    }
    return url;
  }, [audioData]);


  if (!audioData) return null;

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const vol = Number(e.target.value);
    audio.volume = vol;
    setVolume(vol);
    if (vol > 0 && isMuted) {
      setIsMuted(false);
      audio.muted = false;
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.currentTime + 10, duration);
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(audio.currentTime - 10, 0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };


  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999999] w-full max-w-2xl px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-[#111113]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-3 flex items-center gap-4">
        
        {/* Hidden Audio Element */}
        <audio ref={audioRef} src={finalUrl} />

        {/* Cover Art / Icon */}
        <div className="size-14 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
          <Music className="size-6 text-cyan-400" />
        </div>

        {/* Info & Progress */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-white truncate pr-4">{audioData.title || "Áudio Reproduzindo"}</h4>
            <span className="text-[10px] font-bold text-[#A1A1AA] font-mono shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <div className="relative w-full h-1.5 bg-black/50 rounded-full group cursor-pointer flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleProgressChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="absolute left-0 h-1.5 bg-cyan-500 rounded-full pointer-events-none group-hover:bg-cyan-400 transition-colors"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 size-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-sm transition-opacity" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 shrink-0 px-2">
          <button onClick={skipBackward} className="text-[#A1A1AA] hover:text-white transition-colors" title="Voltar 10s">
            <Rewind className="size-4" />
          </button>
          
          <button 
            onClick={togglePlayPause}
            className="size-10 rounded-full bg-white hover:bg-gray-200 text-black flex items-center justify-center transition-transform hover:scale-105 shadow-md"
          >
            {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 ml-1" />}
          </button>

          <button onClick={skipForward} className="text-[#A1A1AA] hover:text-white transition-colors" title="Avançar 10s">
            <FastForward className="size-4" />
          </button>
        </div>

        {/* Volume & Close */}
        <div className="flex items-center gap-3 shrink-0 border-l border-white/10 pl-4">
          <div className="flex items-center gap-2 group relative w-20">
            <button onClick={toggleMute} className="text-[#A1A1AA] hover:text-white transition-colors shrink-0">
              {isMuted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <div className="flex-1 h-1 bg-black/50 rounded-full relative">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute left-0 top-0 h-full bg-white/70 rounded-full pointer-events-none"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <button 
            onClick={() => setAudioData(null)} 
            className="p-1.5 text-[#A1A1AA] hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-1"
            title="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
