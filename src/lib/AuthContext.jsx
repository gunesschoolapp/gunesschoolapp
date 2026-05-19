import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'local', public_settings: { name: 'Gunes CRM' } });

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      // Check localStorage for saved user session
      const savedUser = localStorage.getItem('gunes_current_user');
      if (!savedUser) {
        // No user logged in — show login page
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        return;
      }

      const currentUser = JSON.parse(savedUser);
      await enrichUser(currentUser);
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An error occurred' });
      setIsLoadingAuth(false);
    }
  };

  const enrichUser = async (currentUser) => {
    try {
      const enrichedUser = { ...currentUser };

      // Match user email with Student/Teacher/Staff records
      try {
        const [students, teachers, staff] = await Promise.all([
          base44.entities.Student.filter({ email: currentUser.email }),
          base44.entities.Teacher.filter({ email: currentUser.email }),
          base44.entities.Staff.filter({ email: currentUser.email }),
        ]);

        if (currentUser.role === 'student' && students.length > 0) {
          enrichedUser.matched_role = 'student';
          enrichedUser.student_record = students[0];
        } else if (currentUser.role === 'teacher' && teachers.length > 0) {
          enrichedUser.matched_role = 'teacher';
          enrichedUser.teacher_record = teachers[0];
        } else if (staff.length > 0) {
          enrichedUser.matched_role = staff[0].roles?.[0] || currentUser.role;
          enrichedUser.staff_record = staff[0];
        } else {
          enrichedUser.matched_role = currentUser.role || 'admin';
        }
      } catch (matchError) {
        console.error('Email matching failed:', matchError);
        enrichedUser.matched_role = currentUser.role || 'user';
      }

      setUser(enrichedUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User enrichment failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('gunes_current_user');
    setUser(null);
    setIsAuthenticated(false);
    // Navigate to login
    window.location.href = '/login';
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
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