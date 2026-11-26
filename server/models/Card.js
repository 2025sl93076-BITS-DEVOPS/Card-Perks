import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    merchant: { type: String, required: true },
    rate: { type: String, required: true },
    cap: { type: String, default: null },
  },
  { _id: false }
);

const cardSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    issuer: { type: String, required: true },
    network: { type: String, default: null },
    fees: {
      joining: { type: Number, required: true },
      annual: { type: Number, required: true },
    },
    rewards: {
      base_rate: { type: String, required: true },
      categories: { type: [categorySchema], default: [] },
    },
    eligibility: {
      min_age: { type: Number, default: null },
      min_monthly_income: { type: Number, default: null },
      notes: { type: String, default: null },
    },
    perks: { type: [String], default: [] },
    source: { type: String, default: '' },
    last_verified: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Card', cardSchema);
