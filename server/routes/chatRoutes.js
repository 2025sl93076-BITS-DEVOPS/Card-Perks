import { Router } from 'express';
import Groq from 'groq-sdk';
import Card from '../models/Card.js';

const router = Router();

// POST /api/chat
router.post('/', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ message: 'No messages provided' });
  }

  try {
    const cards = await Card.find({}, 'name issuer network fees rewards perks');

    const cardSummary = cards.map(c => {
      const joiningFee = c.fees.joining === 0 ? 'Free' : `₹${c.fees.joining}`;
      const annualFee  = c.fees.annual  === 0 ? 'Free' : `₹${c.fees.annual}`;
      const topPerks   = (c.perks || []).slice(0, 3).join('; ') || 'N/A';
      return `- ${c.name} (${c.issuer}, ${c.network || 'N/A'}): Joining ${joiningFee}, Annual ${annualFee}. Base reward: ${c.rewards.base_rate}. Top perks: ${topPerks}`;
    }).join('\n');

    const systemPrompt = `You are a helpful Indian credit card advisor for the Card Perks website.
Answer user questions using ONLY the card data provided below. Be concise (2-4 sentences max).
If a card is not in the list, say so honestly. Never make up fees, rewards, or perks.

Available cards:
${cardSummary}`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    const reply = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ message: `Chat failed: ${err.message}` });
  }
});

export default router;
