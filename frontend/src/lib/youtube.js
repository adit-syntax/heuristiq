/** Extract an 11-char YouTube video id from any common URL shape. */
export const getYouTubeId = (url) => {
    if (!url) return null;
    const m = String(url).match(
        /youtu\.be\/([\w-]{11})|[?&]v=([\w-]{11})|\/embed\/([\w-]{11})|\/shorts\/([\w-]{11})|\/live\/([\w-]{11})/
    );
    return m ? (m[1] || m[2] || m[3] || m[4] || m[5]) : null;
};
