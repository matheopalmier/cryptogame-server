import { User } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      body: any;
      params: any;
      query: any;
      headers: {
        authorization?: string;
      };
    }
  }
}

declare module 'express' {
  interface Request {
    user?: any;
    body: any;
    params: any;
    query: any;
    headers: {
      authorization?: string;
    };
  }
  
  export function json(): any;
  export function urlencoded(options: any): any;
  export interface Response {
    status(code: number): Response;
    json(data: any): Response;
    send(body: any): Response;
  }
  
  export type NextFunction = (err?: any) => void;
}

declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn: string | number;
  }
  export function sign(payload: any, secret: string, options?: SignOptions): string;
  export function verify(token: string, secret: string): any;
}

// Modifier Number pour qu'il soit utilisable comme fonction
interface NumberConstructor {
  (value?: any): number;
}

// Déclaration pour process
declare var process: {
  env: {
    [key: string]: string | undefined;
    NODE_ENV: 'development' | 'production' | 'test';
    PORT?: string;
    JWT_SECRET?: string;
    MONGODB_URI?: string;
    [key: string]: string | undefined;
  };
}; 