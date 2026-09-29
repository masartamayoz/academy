import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Cloudinary Signed Upload Signature Endpoint
  // Receives public_id from client and generates secure signature without exposing secret
  app.post('/api/cloudinary/sign', (req, res) => {
    try {
      const { public_id } = req.body;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      const apiKey = process.env.CLOUDINARY_API_KEY || '133245976525348';
      const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'dv5xhvkr3';

      if (!apiSecret) {
        console.error('CLOUDINARY_API_SECRET is missing from server environment');
        return res.status(500).json({ error: 'CLOUDINARY_API_SECRET is not configured on the server' });
      }

      if (!public_id || typeof public_id !== 'string') {
        return res.status(400).json({ error: 'public_id is required and must be a string' });
      }

      const timestamp = Math.round(new Date().getTime() / 1000);

      // Cloudinary signature parameters sorted alphabetically:
      // invalidate=true, overwrite=true, public_id, timestamp
      const strToSign = `invalidate=true&overwrite=true&public_id=${public_id}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(strToSign).digest('hex');

      return res.json({
        signature,
        timestamp,
        apiKey,
        cloudName,
        publicId: public_id,
        overwrite: true,
        invalidate: true,
        resourceType: 'image'
      });
    } catch (err: any) {
      console.error('Error generating Cloudinary signature:', err);
      return res.status(500).json({ error: err?.message || 'Internal server error' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Masar Tamayoz Backend',
      timestamp: new Date().toISOString()
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
