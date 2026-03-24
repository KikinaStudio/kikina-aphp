export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const entry = req.body;
    if (!entry || !entry.type) {
      return res.status(400).json({ error: 'Invalid feedback' });
    }

    const line = JSON.stringify({
      type: entry.type,
      timecode_seconds: entry.timecode_seconds || 0,
      timecode_display: entry.timecode_display || '0m00s',
      timestamp: entry.timestamp || new Date().toISOString(),
      room: entry.room || 'salle_de_reveil',
    });

    // Always log (visible in Vercel runtime logs)
    console.log('[Kikina Feedback]', line);

    // Try Blob storage if available
    try {
      const { put, list } = await import('@vercel/blob');
      let existing = '';
      const { blobs } = await list({ prefix: 'feedback.jsonl' });
      if (blobs.length > 0) {
        const resp = await fetch(blobs[0].url);
        existing = await resp.text();
      }
      const updated = existing ? existing.trimEnd() + '\n' + line : line;
      await put('feedback.jsonl', updated, {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/jsonl',
      });
    } catch (blobErr) {
      // Blob not configured — feedback is still logged above
      console.warn('[Kikina] Blob unavailable:', blobErr.message);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[Kikina Feedback Error]', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
