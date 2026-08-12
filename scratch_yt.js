const getYouTubeVideoId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};
console.log(getYouTubeVideoId("https://www.youtube.com/watch?v=mspe9tr04z5"));
console.log(getYouTubeVideoId("https://youtu.be/mspe9tr04z5"));
console.log(getYouTubeVideoId("https://youtube.com/shorts/mspe9tr04z5"));
