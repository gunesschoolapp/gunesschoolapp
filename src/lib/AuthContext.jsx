import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, deleteUser } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'local', public_settings: { name: 'Gunes CRM' } });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setIsLoadingAuth(true);
        if (firebaseUser) {
          // Check localStorage first as a quick cache/fallback
          const savedUserStr = localStorage.getItem('gunes_current_user');
          const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
          
          const currentUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            full_name: firebaseUser.displayName || savedUser?.full_name || firebaseUser.email.split('@')[0],
            role: savedUser?.role || 'user',
          };

          await enrichUser(currentUser);
        } else {
          // Logged out
          localStorage.removeItem('gunes_current_user');
          setUser(null);
          setIsAuthenticated(false);
          setAuthError(null);
          setIsLoadingAuth(false);
        }
      } catch (error) {
        console.error('Auth state change handler error:', error);
        setIsLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const enrichUser = async (currentUser) => {
    try {
      const { base44 } = await import('@/api/base44Client');
      const enrichedUser = { ...currentUser };

      // Match user email with Student/Teacher/Staff records
      try {
        const [students, teachers, staff] = await Promise.all([
          base44.entities.Student.filter({ email: currentUser.email }),
          base44.entities.Teacher.filter({ email: currentUser.email }),
          base44.entities.Staff.filter({ email: currentUser.email }),
        ]);

        if (students.length > 0) {
          enrichedUser.matched_role = 'student';
          enrichedUser.student_record = students[0];
          enrichedUser.role = 'student';
        } else if (teachers.length > 0) {
          enrichedUser.matched_role = 'teacher';
          enrichedUser.teacher_record = teachers[0];
          enrichedUser.role = 'teacher';
        } else if (staff.length > 0) {
          enrichedUser.matched_role = staff[0].roles?.[0] || 'staff';
          enrichedUser.staff_record = staff[0];
          enrichedUser.role = staff[0].roles?.[0] || 'staff';
        } else {
          // Check if this is the fallback admin email
          if (currentUser.email === 'admin@gunesenglish.com') {
            enrichedUser.matched_role = 'admin';
            enrichedUser.role = 'admin';
          } else {
            // Automatically create a new student record in Firestore!
            const newStudent = await base44.entities.Student.create({
              email: currentUser.email,
              full_name: currentUser.full_name || currentUser.email.split('@')[0],
              status: 'enrolled',
              enrollment_date: new Date().toISOString().split('T')[0],
              phone: '',
              cefr_level: 'A1'
            });
            enrichedUser.matched_role = 'student';
            enrichedUser.student_record = newStudent;
            enrichedUser.role = 'student';
          }
        }
      } catch (matchError) {
        if (matchError.message === 'user_not_registered') {
          throw matchError;
        }
        console.error('Email matching failed:', matchError);
        enrichedUser.matched_role = currentUser.role || 'user';
      }

      setUser(enrichedUser);
      setIsAuthenticated(true);
      setAuthError(null);
      localStorage.setItem('gunes_current_user', JSON.stringify(enrichedUser));
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User enrichment failed:', error);
      if (error.message === 'user_not_registered') {
        setAuthError({ type: 'user_not_registered', message: 'E-posta adresi Güneş English School sisteminde kayıtlı değil.' });
      } else {
        setAuthError({ type: 'unknown', message: error.message || 'An error occurred' });
      }
      
      // Force sign out from Firebase since they are unauthorized
      await signOut(auth);
      localStorage.removeItem('gunes_current_user');
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoadingAuth(true);
      await signOut(auth);
    } catch (e) {
      console.error("Sign out error", e);
    } finally {
      localStorage.removeItem('gunes_current_user');
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
      setIsLoadingAuth(false);
      window.location.href = '/login';
    }
  };

  const deleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No authenticated user");

    // 1. Delete Firestore records associated with email
    const email = currentUser.email;
    if (email) {
      const { base44 } = await import('@/api/base44Client');
      const deletePromises = [];
      
      const [usersList, userSetupsList, studentsList, teachersList, staffList] = await Promise.all([
        base44.entities.User.filter({ email }),
        base44.entities.UserSetup.filter({ email }),
        base44.entities.Student.filter({ email }),
        base44.entities.Teacher.filter({ email }),
        base44.entities.Staff.filter({ email }),
      ]);

      usersList.forEach(u => deletePromises.push(base44.entities.User.delete(u.id)));
      userSetupsList.forEach(us => deletePromises.push(base44.entities.UserSetup.delete(us.id)));
      studentsList.forEach(s => deletePromises.push(base44.entities.Student.delete(s.id)));
      teachersList.forEach(t => deletePromises.push(base44.entities.Teacher.delete(t.id)));
      staffList.forEach(st => deletePromises.push(base44.entities.Staff.delete(st.id)));

      await Promise.all(deletePromises);
    }

    // 2. Delete Firebase Auth User
    await deleteUser(currentUser);

    // 3. Clear local storage and state
    localStorage.removeItem('gunes_current_user');
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      deleteAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};