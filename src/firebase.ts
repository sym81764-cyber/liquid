import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, query, where, onSnapshot, addDoc, getDoc, updateDoc, deleteDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged, collection, doc, setDoc, query, where, onSnapshot, addDoc, getDoc, updateDoc, deleteDoc, getDocFromServer };
export type { User };

export interface Store {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  theme_color?: string;
  category?: string;
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  storeId: string;
  sales: number;
  revenue: number;
  createdAt: number;
  description?: string;
  whop_link?: string;
  whop_plan_id?: string;
  isAvailable: boolean;
  thumbnail?: string;
}

export interface Sale {
  id: string;
  amount: number;
  productName: string;
  customerEmail: string;
  storeId: string;
  createdAt: number;
}

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  let userMessage = "An unexpected error occurred. Please try again.";
  const errorCode = error?.code || "";
  const errorMessage = error?.message || String(error);

  if (errorCode === 'permission-denied' || errorMessage.includes('insufficient permissions')) {
    userMessage = `Access Denied: You don't have permission to ${operationType} this ${path?.split('/')[0] || 'resource'}.`;
  } else if (errorCode === 'not-found') {
    userMessage = "Resource not found. It may have been deleted.";
  } else if (errorCode === 'unavailable') {
    userMessage = "Service is temporarily unavailable. Check your internet connection.";
  } else if (errorCode === 'resource-exhausted') {
    userMessage = "Daily quota exceeded. Please try again tomorrow.";
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  // Dispatch global event for UI to catch and show toast
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('liquid-toast', { 
      detail: { 
        message: userMessage, 
        type: 'error',
        operation: operationType 
      } 
    }));
  }

  throw new Error(JSON.stringify(errInfo));
}
