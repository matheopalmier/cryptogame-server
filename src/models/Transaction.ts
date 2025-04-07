import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  cryptoId: string;
  cryptoName: string;
  cryptoSymbol: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  timestamp: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    cryptoId: {
      type: String,
      required: true
    },
    cryptoName: {
      type: String,
      required: true
    },
    cryptoSymbol: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['buy', 'sell'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index pour optimiser les recherches
TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ cryptoId: 1 });
TransactionSchema.index({ timestamp: -1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema); 