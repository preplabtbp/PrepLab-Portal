import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const isPlaceholderConfig = !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('remixed') || firebaseConfig.projectId === 'remixed-project-id';

// Initialize Firebase only if the configuration block is not placeholder/remixed
let firebaseApp: any = null;
let firebaseAuth: any = null;

if (!isPlaceholderConfig) {
  try {
    firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    firebaseAuth = getAuth(firebaseApp);
  } catch (err) {
    console.error("Firebase Auth failed to initialize, using fallback:", err);
  }
}

export const auth = firebaseAuth;

const provider = new GoogleAuthProvider();
// Request Workspace scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive');

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory/localStorage.
let cachedAccessToken: string | null = isPlaceholderConfig ? "mock-sheets-access-token" : (localStorage.getItem('gapi_access_token') || null);

const mockUser: any = {
  uid: "mock-prep-lab-admin",
  email: "prep.lab.tbp@gmail.com",
  displayName: "Prep & Lab Administrator",
  photoURL: ""
};

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (isPlaceholderConfig) {
    // Autologin in sandbox preview style if configuration is not set
    setTimeout(() => {
      if (onAuthSuccess) {
        onAuthSuccess(mockUser, cachedAccessToken || "mock-sheets-access-token");
      }
    }, 100);
    return () => {};
  }
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const expiry = localStorage.getItem('gapi_access_token_expires');
      const now = Date.now();
      const isValid = expiry && parseInt(expiry, 10) > now;
      
      if (cachedAccessToken && isValid) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        localStorage.removeItem('gapi_access_token');
        localStorage.removeItem('gapi_access_token_expires');
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('gapi_access_token');
      localStorage.removeItem('gapi_access_token_expires');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  if (isPlaceholderConfig) {
    cachedAccessToken = "mock-sheets-access-token";
    return { user: mockUser, accessToken: cachedAccessToken };
  }
  try {
    isSigningIn = true;
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    // Store in localStorage for 55 minutes
    localStorage.setItem('gapi_access_token', cachedAccessToken);
    localStorage.setItem('gapi_access_token_expires', (Date.now() + 55 * 60 * 1000).toString());
    
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  const expiry = localStorage.getItem('gapi_access_token_expires');
  const now = Date.now();
  if (expiry && parseInt(expiry, 10) < now) {
      return null; // Expired
  }
  return cachedAccessToken || localStorage.getItem('gapi_access_token');
};

export const logoutGoogle = async () => {
  if (isPlaceholderConfig) {
    cachedAccessToken = null;
    return;
  }
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('gapi_access_token');
  localStorage.removeItem('gapi_access_token_expires');
};