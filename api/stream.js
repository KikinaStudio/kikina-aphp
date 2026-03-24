import { Readable } from 'stream';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  try {
    const upstream = await fetch('http://46.62.226.166:3000/stream');

    if (!upstream.ok || !upstream.body) {
      return res.status(502).send('Stream unavailable');
    }

    res.setHeader('Content-Type', upstream.headers.get('Content-Type') || 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const readable = Readable.fromWeb(upstream.body);
    readable.pipe(res);

    // Clean up on client disconnect
    req.on('close', () => {
      readable.destroy();
    });
  } catch (err) {
    console.error('[Stream proxy error]', err.message);
    res.status(502).send('Stream error');
  }
}
