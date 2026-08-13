import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, FastForward, Rewind } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomAudioPlayerProps {
  src: string;
  className?: string;
}

export function CustomAudioPlayer({ src, className }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
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

  const changePlaybackRate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const rates = [1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
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

  const finalUrl = React.useMemo(() => {
    if (!src) return "";
    let url = src;
    if (url.includes('drive.google.com')) {
      if (url.includes('/d/')) {
        const id = url.split('/d/')[1]?.split('/')[0];
        if (id) {
          url = `https://drive.google.com/uc?export=download&id=${id}`;
        }
      }
    }
    return url;
  }, [src]);

  return (
    <div className={cn("bg-[#1A1A1E] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 shadow-lg w-full max-w-md", className)}>
      <audio ref={audioRef} src={finalUrl} preload="metadata" />
      
      {/* Progress Bar */}
      <div className="flex items-center gap-3 text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">
        <span>{formatTime(currentTime)}</span>
        <div className="relative flex-1 h-1.5 bg-black/50 rounded-full group cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleProgressChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            className="absolute left-0 top-0 h-full bg-cyan-500 rounded-full pointer-events-none shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all ease-linear"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          ></div>
        </div>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-1">
        
        {/* Left: Speed & Volume */}
        <div className="flex items-center gap-3">
          <button 
            onClick={changePlaybackRate}
            className="text-xs font-bold text-[#A1A1AA] hover:text-white bg-black/30 hover:bg-black/50 px-2 py-1 rounded-md transition-colors"
          >
            {playbackRate}x
          </button>
          
          <div className="flex items-center gap-2 group relative">
            <button onClick={toggleMute} className="text-[#A1A1AA] hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <div className="w-16 h-1.5 bg-black/50 rounded-full relative opacity-0 group-hover:opacity-100 transition-opacity">
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
                className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full pointer-events-none"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Center: Playback */}
        <div className="flex items-center gap-4">
          <button onClick={skipBackward} className="text-[#71717A] hover:text-white transition-colors" title="Voltar 10s">
            <Rewind className="size-4" />
          </button>
          <button 
            onClick={togglePlayPause}
            className="size-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 ml-1" />}
          </button>
          <button onClick={skipForward} className="text-[#71717A] hover:text-white transition-colors" title="Avançar 10s">
            <FastForward className="size-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
