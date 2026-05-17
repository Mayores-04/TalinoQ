import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  initializeAuth,
  sendPasswordResetEmail,
  signInWithCredential,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';

const projectId = 'talinoq-051726';
const messagingSenderId = '441985791475';
const androidAppId = '1:441985791475:android:6c52ce51a209cacd5fce86';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? `${projectId}.firebasestorage.app`,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? androidAppId,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;

if (isFirebaseConfigured) {
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  firebaseDb = getFirestore(firebaseApp);

  try {
    firebaseAuth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    firebaseAuth = getAuth(firebaseApp);
  }
}

const requireAuth = () => {
  if (!firebaseAuth) {
    throw new Error(
      'Firebase is missing EXPO_PUBLIC_FIREBASE_API_KEY. Copy the API key from google-services.json or Firebase app settings.'
    );
  }

  return firebaseAuth;
};

export type UserProfile = {
  uid: string;
  displayName: string;
  firstName: string;
  email: string;
  photoURL: string | null;
  plan: string;
  track: string;
  levelTitle: string;
  xp: number;
  xpGoal: number;
  studyStreak: number;
  rankLabel: string;
  lastSyncedAt?: string;
};

function getFirstName(name?: string | null, email?: string | null) {
  const cleanedName = name?.trim();

  if (cleanedName) {
    return cleanedName.split(/\s+/)[0];
  }

  const emailName = email?.split('@')[0]?.trim();
  return emailName || 'Scholar';
}

function getDisplayName(user: User) {
  return user.displayName?.trim() || getFirstName(user.displayName, user.email);
}

function getFallbackUserProfile(user: User): UserProfile {
  const displayName = getDisplayName(user);

  return {
    uid: user.uid,
    displayName,
    firstName: getFirstName(displayName, user.email),
    email: user.email ?? 'Guest account',
    photoURL: user.photoURL ?? null,
    plan: user.isAnonymous ? 'Guest Plan' : 'Free Plan',
    track: 'Academic Scholar',
    levelTitle: 'Level 12 Master',
    xp: 8450,
    xpGoal: 10000,
    studyStreak: 12,
    rankLabel: 'Top 5%',
  };
}

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readNullableString(value: unknown, fallback: string | null) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readOptionalString(value: unknown, fallback?: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeUserProfile(user: User, data?: Record<string, unknown>): UserProfile {
  const fallback = getFallbackUserProfile(user);
  const displayName = readString(data?.displayName, fallback.displayName);

  return {
    uid: user.uid,
    displayName,
    firstName: readString(data?.firstName, getFirstName(displayName, fallback.email)),
    email: readString(data?.email, fallback.email),
    photoURL: readNullableString(data?.photoURL, fallback.photoURL),
    plan: readString(data?.plan, fallback.plan),
    track: readString(data?.track, fallback.track),
    levelTitle: readString(data?.levelTitle, fallback.levelTitle),
    xp: readNumber(data?.xp, fallback.xp),
    xpGoal: readNumber(data?.xpGoal, fallback.xpGoal),
    studyStreak: readNumber(data?.studyStreak, fallback.studyStreak),
    rankLabel: readString(data?.rankLabel, fallback.rankLabel),
    lastSyncedAt: readOptionalString(data?.lastSyncedAt),
  };
}

export function subscribeToUserProfile(user: User, onProfile: (profile: UserProfile) => void) {
  const fallback = getFallbackUserProfile(user);
  onProfile(fallback);

  if (!firebaseDb) {
    return () => {};
  }

  const profileRef = doc(firebaseDb, 'users', user.uid);

  getDoc(profileRef)
    .then(async (snapshot) => {
      if (snapshot.exists()) {
        await updateDoc(profileRef, {
          displayName: getDisplayName(user),
          email: user.email ?? fallback.email,
          firstName: getFirstName(getDisplayName(user), user.email),
          photoURL: user.photoURL ?? null,
          updatedAt: serverTimestamp(),
        });
        return;
      }

      await setDoc(profileRef, {
        ...fallback,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    })
    .catch(() => {
      onProfile(fallback);
    });

  return onSnapshot(
    profileRef,
    (snapshot) => {
      onProfile(normalizeUserProfile(user, snapshot.data()));
    },
    () => {
      onProfile(fallback);
    }
  );
}

export async function updateUserProfileDetails(
  user: User,
  updates: Pick<UserProfile, 'displayName' | 'firstName'>
) {
  const auth = requireAuth();
  const displayName = updates.displayName.trim();
  const firstName = updates.firstName.trim() || getFirstName(displayName, user.email);

  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName });
  }

  if (firebaseDb) {
    await setDoc(
      doc(firebaseDb, 'users', user.uid),
      {
        displayName,
        firstName,
        email: user.email ?? null,
        photoURL: user.photoURL ?? null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function markUserProfileSynced(user: User) {
  if (!firebaseDb) {
    return;
  }

  await setDoc(
    doc(firebaseDb, 'users', user.uid),
    {
      lastSyncedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const auth = requireAuth();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const auth = requireAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function resetPassword(email: string) {
  const auth = requireAuth();
  await sendPasswordResetEmail(auth, email.trim());
}

export async function continueAsGuest() {
  const auth = requireAuth();
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export async function loginWithGoogleIdToken(idToken: string) {
  const auth = requireAuth();
  const providerCredential = GoogleAuthProvider.credential(idToken);
  const credential = await signInWithCredential(auth, providerCredential);
  return credential.user;
}

export async function signOutUser() {
  const auth = requireAuth();
  await signOut(auth);
}

export { firebaseApp, firebaseAuth, firebaseDb };
