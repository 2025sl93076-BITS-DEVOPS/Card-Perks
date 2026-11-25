import { Router } from 'express';
import Card from '../models/Card.js';

const router = Router();

// GET /api/cards
router.get('/', async (req, res) => {
  try {
    const cards = await Card.find({}, '_id name issuer network fees rewards.base_rate');
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/cards/:id
router.get('/:id', async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
