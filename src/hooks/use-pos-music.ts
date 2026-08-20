import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface MusicTrack {
  id: string;
  title: string;
  artist?: string;
  url: string;
  thumbnail?: string;
  addedAt?: string;
  genre?: string;
  tags?: string[];
}

export interface MusicPlaylist {
  id: string;
  title: string;
  cover_url: string;
  description?: string;
  tracks: MusicTrack[];
}

export interface MusicPlayHistory {
  id: string;
  track: MusicTrack;
  playedAt: string;
}

export function usePosMusic() {
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [standaloneTracks, setStandaloneTracks] = useState<MusicTrack[]>([]);
  const [playHistory, setPlayHistory] = useState<MusicPlayHistory[]>([]);

  useEffect(() => {
    const savedPlaylists = localStorage.getItem("lifeos_pos_music_playlists");
    if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists));
    
    const savedTracks = localStorage.getItem("lifeos_pos_music_tracks");
    if (savedTracks) setStandaloneTracks(JSON.parse(savedTracks));
    
    const legacy = localStorage.getItem("lifeos_pos_music");
    if (legacy && !savedPlaylists) {
      setPlaylists(JSON.parse(legacy));
      localStorage.removeItem("lifeos_pos_music");
    }

    const savedHistory = localStorage.getItem("lifeos_pos_music_history");
    if (savedHistory) setPlayHistory(JSON.parse(savedHistory));
  }, []);

  const savePlaylists = (newPlaylists: MusicPlaylist[]) => {
    setPlaylists(newPlaylists);
    localStorage.setItem("lifeos_pos_music_playlists", JSON.stringify(newPlaylists));
  };

  const saveStandaloneTracks = (newTracks: MusicTrack[]) => {
    setStandaloneTracks(newTracks);
    localStorage.setItem("lifeos_pos_music_tracks", JSON.stringify(newTracks));
  };

  const savePlayHistory = (history: MusicPlayHistory[]) => {
    // Manter no máximo 1000 registros para evitar sobrecarga no localStorage
    const trimmedHistory = history.slice(0, 1000);
    setPlayHistory(trimmedHistory);
    localStorage.setItem("lifeos_pos_music_history", JSON.stringify(trimmedHistory));
  };

  const logPlay = (track: MusicTrack) => {
    const newEntry: MusicPlayHistory = {
      id: Date.now().toString(),
      track,
      playedAt: new Date().toISOString()
    };
    savePlayHistory([newEntry, ...playHistory]);
  };

  const addPlaylist = (title: string, cover_url: string = "", description: string = "") => {
    const newPlaylist: MusicPlaylist = {
      id: Date.now().toString(),
      title,
      cover_url,
      description,
      tracks: []
    };
    savePlaylists([newPlaylist, ...playlists]);
    toast.success("Playlist criada!");
  };

  const updatePlaylist = (id: string, updates: Partial<MusicPlaylist>) => {
    savePlaylists(playlists.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePlaylist = (id: string) => {
    savePlaylists(playlists.filter(p => p.id !== id));
    toast.success("Playlist removida!");
  };

  const addTrack = (playlistId: string, track: Omit<MusicTrack, "id" | "addedAt">) => {
    const newTrack: MusicTrack = {
      ...track,
      id: Date.now().toString(),
      addedAt: new Date().toISOString()
    };
    savePlaylists(playlists.map(p => {
      if (p.id === playlistId) {
        return { ...p, tracks: [...p.tracks, newTrack] };
      }
      return p;
    }));
    toast.success("Música adicionada!");
  };

  const removeTrack = (playlistId: string, trackId: string) => {
    savePlaylists(playlists.map(p => {
      if (p.id === playlistId) {
        return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
      }
      return p;
    }));
    toast.success("Música removida!");
  };

  const addStandaloneTrack = (track: Omit<MusicTrack, "id" | "addedAt">) => {
    const newTrack: MusicTrack = {
      ...track,
      id: Date.now().toString(),
      addedAt: new Date().toISOString()
    };
    saveStandaloneTracks([newTrack, ...standaloneTracks]);
    toast.success("Música salva!");
  };

  const removeStandaloneTrack = (trackId: string) => {
    saveStandaloneTracks(standaloneTracks.filter(t => t.id !== trackId));
    toast.success("Música removida!");
  };

  const removeTrackByUrl = (url: string) => {
    saveStandaloneTracks(standaloneTracks.filter(t => t.url !== url));
    savePlaylists(playlists.map(p => ({
      ...p,
      tracks: p.tracks.filter(t => t.url !== url)
    })));
    toast.success("Música removida de todo o acervo!");
  };

  const updateTrackByUrl = (url: string, updates: Partial<MusicTrack>) => {
    saveStandaloneTracks(standaloneTracks.map(t => t.url === url ? { ...t, ...updates } : t));
    savePlaylists(playlists.map(p => ({
      ...p,
      tracks: p.tracks.map(t => t.url === url ? { ...t, ...updates } : t)
    })));
    toast.success("Música atualizada!");
  };

  return {
    playlists,
    standaloneTracks,
    addPlaylist,
    updatePlaylist,
    removePlaylist,
    addTrack,
    removeTrack,
    addStandaloneTrack,
    removeStandaloneTrack,
    removeTrackByUrl,
    updateTrackByUrl,
    playHistory,
    logPlay
  };
}
