import { Router } from 'express';

const router = Router();

// GET /api/example
router.get('/', (req, res) => {
  res.json({ message: 'Example route works' });
});

export default router;
