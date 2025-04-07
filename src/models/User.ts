import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IPortfolioItem {
  cryptoId: string;
  amount: number;
  averageBuyPrice: number;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  balance: number;
  portfolio: IPortfolioItem[];
  rank?: number;
  profitPercentage?: number;
  totalValue?: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const PortfolioItemSchema = new Schema<IPortfolioItem>({
  cryptoId: { type: String, required: true },
  amount: { type: Number, required: true },
  averageBuyPrice: { type: Number, required: true }
});

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    avatar: {
      type: String
    },
    balance: {
      type: Number,
      default: Number(process.env.INITIAL_BALANCE) || 10000
    },
    portfolio: {
      type: [PortfolioItemSchema],
      default: []
    },
    rank: {
      type: Number
    },
    profitPercentage: {
      type: Number,
      default: 0
    },
    totalValue: {
      type: Number,
      default: Number(process.env.INITIAL_BALANCE) || 10000
    }
  },
  {
    timestamps: true
  }
);

// Middleware pré-sauvegarde pour hacher le mot de passe
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error: any) {
    return next(error);
  }
});

// Méthode pour comparer les mots de passe
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export default mongoose.model<IUser>('User', UserSchema); 