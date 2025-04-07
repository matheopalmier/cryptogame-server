import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User, { IUser } from '../models/User';

// Générer un token JWT
const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'defaultsecret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  } as jwt.SignOptions);
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (userExists) {
      res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
      return;
    }

    // Créer un nouvel utilisateur
    const user = await User.create({
      username,
      email,
      password,
      balance: Number(process.env.INITIAL_BALANCE) || 10000,
      portfolio: []
    });

    if (user) {
      const userId = user._id as mongoose.Types.ObjectId;
      // Retourner les données utilisateur avec un token
      res.status(201).json({
        success: true,
        data: {
          _id: userId,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          balance: user.balance,
          portfolio: user.portfolio,
          token: generateToken(userId.toString())
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid user data'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email }) as IUser | null;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Vérifier si le mot de passe correspond
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    const userId = user._id as mongoose.Types.ObjectId;
    // Retourner les données utilisateur avec un token
    res.status(200).json({
      success: true,
      data: {
        _id: userId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        balance: user.balance,
        portfolio: user.portfolio,
        token: generateToken(userId.toString())
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id) as IUser | null;

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const userId = user._id as mongoose.Types.ObjectId;
    res.status(200).json({
      success: true,
      data: {
        _id: userId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        balance: user.balance,
        portfolio: user.portfolio,
        createdAt: user.createdAt,
        rank: user.rank || null,
        profitPercentage: user.profitPercentage || 0,
        totalValue: user.totalValue || user.balance
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
}; 