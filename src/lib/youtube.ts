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

export const parseTimeToSeconds = (timeStr: string) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parseInt(timeStr) || 0;
};

export const getSafeEmbedUrl = (url: string, timeExtra?: string) => {
  if (!url) return '';
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
