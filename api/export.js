import { list } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).end();

  try {
    let lines = [];
    try {
      const { blobs } = await list({ prefix: 'feedback.jsonl' });
      if (blobs.length > 0) {
        const resp = await fetch(blobs[0].url);
        const text = await resp.text();
        lines = text.trim().split('\n').filter(Boolean);
      }
    } catch (e) {
      // No data yet
    }

    if (lines.length === 0) {
      return res.status(200).json({ message: 'Aucun feedback pour le moment' });
    }

    const format = req.query.format || 'json';

    if (format === 'csv') {
      const header = 'type,track,timecode_seconds,timecode_display,timestamp,room';
      const rows = lines.map(line => {
        const e = JSON.parse(line);
        return [
          e.type,
          '"' + (e.track || 'inconnu').replace(/"/g, '""') + '"',
          e.timecode_seconds,
          e.timecode_display,
          e.timestamp,
          e.room,
        ].join(',');
      });
      const csv = header + '\n' + rows.join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="kikina-feedback.csv"');
      return res.status(200).send(csv);
    }

    // Default: JSON
    const entries = lines.map(l => JSON.parse(l));
    return res.status(200).json(entries);
  } catch (err) {
    console.error('[Kikina Export Error]', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
