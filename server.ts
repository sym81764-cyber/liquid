import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import cors from 'cors';
import crypto from 'crypto';
import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// In AI Studio, we can often rely on default credentials or the service account if provided.
// For now, we'll try to initialize with the default app.
try {
  if (getApps().length === 0) {
    initializeApp();
  }
} catch (error) {
  console.error('Firebase Admin Init Error:', error);
}

const db = getFirestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  
  // Whop Webhook Handler
  // Note: Whop sends webhooks as JSON.
  app.post('/api/webhook/whop', bodyParser.json(), async (req, res) => {
    const signature = req.headers['x-whop-signature'];
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

    // Verify webhook signature for security if secret is configured
    if (webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = hmac.update(JSON.stringify(req.body)).digest('hex');
      
      if (signature !== digest) {
        console.warn('Invalid Whop Webhook Signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;
    
    console.log('Received Whop Webhook:', event.action);

    try {
      // Logic for native integration:
      // When a payment is successful, we update our Firestore database automatically.
      if (event.action === 'payment.succeeded') {
        const data = event.data;
        const planId = data.plan_id;
        const amount = data.amount / 100; // Whop shares in cents
        const email = data.email || 'customer@example.com';

        // Find the product with this whop_plan_id
        const productsRef = db.collection('products');
        const snapshot = await productsRef.where('whop_plan_id', '==', planId).get();

        if (!snapshot.empty) {
          const productDoc = snapshot.docs[0];
          const productData = productDoc.data();

          // Update product sales and revenue
          await productDoc.ref.update({
            sales: (productData.sales || 0) + 1,
            revenue: (productData.revenue || 0) + amount
          });

          // Create a sale record
          await db.collection('sales').add({
            productId: productDoc.id,
            productName: productData.name,
            storeId: productData.storeId,
            amount: amount,
            customerEmail: email,
            createdAt: Date.now(),
            source: 'whop_native'
          });

          console.log(`Updated sales for product: ${productData.name}`);
        } else {
          console.warn(`No product found for Whop Plan ID: ${planId}`);
        }
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error('Webhook Error:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Whop Webhook URL: http://.../api/webhook/whop`);
  });
}

startServer();
