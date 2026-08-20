export const getYouTubeThumbnail = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
};

export const getYouTubeVideoId = (url: string) => {
  if (!url) return null;
  if (url.includes('/shorts/')) {
    return url.split('/shorts/')[1].split(/[?#]/)[0];
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const getMediaThumbnail = (url: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1616469829581-73993eb86b02?q=80&w=400&auto=format&fit=crop';
  
  const ytId = getYouTubeVideoId(url);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
  }
  
  if (url.includes('spotify.com')) {
    return 'https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_CMYK_Green.png';
  }
  
  if (url.includes('deezer.com')) {
    return 'https://cdns-images.dzcdn.net/images/cover/9fa640f37cc2212bb6fa8ad772cbcd98/264x264.jpg'; // Generic music cover
  }

  return 'https://images.unsplash.com/photo-1616469829581-73993eb86b02?q=80&w=400&auto=format&fit=crop';
};

export const parseTimeToSeconds = (timeStr: string | number) => {
  if (!timeStr) return 0;
  const str = String(timeStr);
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parseInt(str) || 0;
};

export const getSafeEmbedUrl = (url: string, timeExtra?: string | number) => {
  if (!url) return '';

  // Spotify Support
  const spotifyMatch = url.match(/open\.spotify\.com\/(track|playlist|album|episode|show)\/([a-zA-Z0-9]+)/);
  if (spotifyMatch) {
    return `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}?utm_source=generator`;
  }

  // Deezer Support
  const deezerMatch = url.match(/deezer\.com\/(?:\w{2}\/)?(track|playlist|album)\/(\d+)/);
  if (deezerMatch) {
    return `https://widget.deezer.com/widget/dark/${deezerMatch[1]}/${deezerMatch[2]}`;
  }

  // YouTube / YouTube Music Support
  const ytId = getYouTubeVideoId(url);
  if (ytId) {
    let startParam = '';
    if (timeExtra) {
      startParam = `&start=${parseTimeToSeconds(timeExtra)}`;
    } else if (url.includes('&t=')) {
      startParam = `&start=${parseInt(url.split('&t=')[1])}`;
    } else if (url.includes('?t=')) {
      startParam = `&start=${parseInt(url.split('?t=')[1])}`;
    }
    return `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1${startParam}`;
  }
  return url.replace('watch?v=', 'embed/').replace('/view', '/preview');
};

export interface YouTubeVideoMetadata {
  id: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  duration: string;
  categoryId: string;
  description: string;
  tags: string[];
  thumbnail: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

export interface YouTubeChannelMetadata {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  publishedAt: string;
  thumbnail: string;
  viewCount: string;
  subscriberCount: string;
  videoCount: string;
}

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

export const extractVideoMetadata = async (url: string): Promise<YouTubeVideoMetadata | null> => {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube Video URL");
  if (!YOUTUBE_API_KEY) throw new Error("VITE_YOUTUBE_API_KEY is not configured.");

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`);
    const data = await res.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error("Video not found or private");
    }

    const item = data.items[0];
    const { snippet, contentDetails, statistics } = item;

    return {
      id: videoId,
      title: snippet.title,
      channelTitle: snippet.channelTitle,
      channelId: snippet.channelId,
      publishedAt: snippet.publishedAt,
      duration: contentDetails.duration, // format is ISO 8601 like PT15M33S
      categoryId: snippet.categoryId,
      description: snippet.description,
      tags: snippet.tags || [],
      thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      viewCount: statistics.viewCount || '0',
      likeCount: statistics.likeCount || '0',
      commentCount: statistics.commentCount || '0'
    };
  } catch (error: any) {
    console.error("Error extracting video metadata:", error);
    throw error;
  }
};

export const getYouTubeChannelId = async (url: string): Promise<string | null> => {
  if (url.includes('/channel/')) {
    return url.split('/channel/')[1].split('/')[0].split('?')[0];
  }
  
  let handle = '';
  if (url.includes('/@')) {
    handle = '@' + url.split('/@')[1].split('/')[0].split('?')[0];
  } else if (url.includes('/c/')) {
    handle = url.split('/c/')[1].split('/')[0].split('?')[0];
  } else if (url.includes('/user/')) {
    handle = url.split('/user/')[1].split('/')[0].split('?')[0];
  }

  if (handle && YOUTUBE_API_KEY) {
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&key=${YOUTUBE_API_KEY}`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        return data.items[0].id.channelId;
      }
    } catch(e) {
      console.error("Failed to fetch channel ID by handle", e);
    }
  }

  return null;
};

export const extractChannelMetadata = async (url: string): Promise<YouTubeChannelMetadata | null> => {
  if (!YOUTUBE_API_KEY) throw new Error("VITE_YOUTUBE_API_KEY is not configured.");
  const channelId = await getYouTubeChannelId(url);
  if (!channelId) throw new Error("Invalid YouTube Channel URL or Channel not found");

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      throw new Error("Channel not found");
    }

    const item = data.items[0];
    const { snippet, statistics } = item;

    return {
      id: channelId,
      title: snippet.title,
      description: snippet.description,
      customUrl: snippet.customUrl,
      publishedAt: snippet.publishedAt,
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      viewCount: statistics.viewCount || '0',
      subscriberCount: statistics.subscriberCount || '0',
      videoCount: statistics.videoCount || '0'
    };
  } catch (error: any) {
    console.error("Error extracting channel metadata:", error);
    throw error;
  }
};
