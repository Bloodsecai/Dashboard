'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProfileContextType {
  profilePicture: string | null;
  isLoading: boolean;
  isSaving: boolean;
  updateProfilePictureUrl: (url: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  profilePicture: null,
  isLoading: true,
  isSaving: false,
  updateProfilePictureUrl: async () => {},
  refreshProfile: async () => {},
});

// Validate URL format
const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user?.uid) {
      setProfilePicture(null);
      setIsLoading(false);
      return;
    }

    try {
      // First check Firebase Auth photoURL
      if (user.photoURL) {
        setProfilePicture(user.photoURL);
      }

      // Then check Firestore for potentially newer profile picture
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.profilePicture) {
          setProfilePicture(data.profilePicture);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, user?.photoURL]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfilePictureUrl = async (url: string) => {
    // Check if user is authenticated
    if (!user?.uid) {
      toast.error('Please login to update your profile picture');
      return;
    }

    // Validate URL format
    if (url && !isValidImageUrl(url)) {
      toast.error('Please enter a valid image URL (http:// or https://)');
      return;
    }

    setIsSaving(true);

    try {
      // Update Firebase Auth profile
      await updateProfile(user, { photoURL: url || null });

      // Check if user document exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        await updateDoc(userDocRef, {
          profilePicture: url || null,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(userDocRef, {
          profilePicture: url || null,
          email: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Update local state
      setProfilePicture(url || null);

      toast.success('Profile picture updated!');
    } catch (error: any) {
      console.error('Error updating profile picture:', error);
      toast.error(`Failed to update: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <ProfileContext.Provider
      value={{
        profilePicture,
        isLoading,
        isSaving,
        updateProfilePictureUrl,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
