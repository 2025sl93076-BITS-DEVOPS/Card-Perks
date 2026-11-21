import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Routes
// app.use('/api/example', exampleRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Card Perks API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
