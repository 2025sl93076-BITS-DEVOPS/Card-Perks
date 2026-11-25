import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import connectDB from './config/db.js';
import cardRoutes from './routes/cardRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/cards', cardRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Card Perks API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
