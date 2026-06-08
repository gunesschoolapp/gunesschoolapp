import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { HashRouter as Router, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Login from '@/pages/Login';
import { LanguageProvider } from '@/lib/LanguageContext';

import Layout from '@/components/Layout';

import Dashboard from '@/pages/Dashboard';
import Students from '@/pages/Students';
import Courses from '@/pages/Courses';
import Schedule from '@/pages/Schedule';

import Teachers from '@/pages/Teachers.jsx';


import Tasks from '@/pages/Tasks';
import Certifications from '@/pages/Certifications.jsx';

import Settings from '@/pages/Settings.jsx';
import FormSubmissions from '@/pages/FormSubmissions';
import EmailHistory from '@/pages/EmailHistory';
import Accounting from '@/pages/Accounting';
import FinancialDashboard from '@/pages/FinancialDashboard';
import TeacherPayroll from '@/pages/TeacherPayroll';
import Expenses from '@/pages/Expenses';
import Finance from '@/pages/Finance';
import Reports from '@/pages/Reports';
import Emails from '@/pages/Emails';
import WebsiteIntegrations from '@/pages/WebsiteIntegrations';
import SalesStaff from '@/pages/SalesStaff';
import EmailAccounts from '@/pages/EmailAccounts';
import PublicLeadForm from '@/pages/PublicLeadForm';
import PublicEnrollmentForm from '@/pages/PublicEnrollmentForm';

import StudentClassroom from '@/pages/StudentClassroom';
import InvoiceManagement from '@/pages/InvoiceManagement';
import StudentProfile from '@/pages/StudentProfile';
import NotificationCenter from '@/pages/NotificationCenter';
import UserProfile from '@/pages/UserProfile';

import Payroll from '@/pages/Payroll';

import TeacherDashboard from '@/pages/TeacherDashboard';
import TeacherLessonTools from '@/pages/TeacherLessonTools';
import StudentSelfPortal from '@/pages/StudentSelfPortal';
import StaffDashboard from '@/pages/StaffDashboard';
import Personnel from '@/pages/Personnel';
import PersonnelManagement from '@/pages/PersonnelManagement';
import Classrooms from '@/pages/Classrooms';
import Classroom from '@/pages/Classroom';
import ResourceLibrary from '@/pages/ResourceLibrary';
import Leads from '@/pages/Leads';
import Packages from '@/pages/Packages';
import TeacherResources from '@/pages/TeacherResources';

// Central role-based home redirect
function RoleHomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/Dashboard" replace />;
  
  // Use matched_role (email-based match) first, then fall back to system role
  const effectiveRole = user.matched_role || user.role;
  
  if (effectiveRole === 'student') return <Navigate to="/StudentSelfPortal" replace />;
  if (effectiveRole === 'teacher') return <Navigate to="/TeacherDashboard" replace />;
  if (['admin', 'team_admin'].includes(effectiveRole)) return <Navigate to="/Dashboard" replace />;
  if (['reception', 'receptionist', 'marketing', 'accounting', 'staff', 'user'].includes(effectiveRole)) return <Navigate to="/StaffDashboard" replace />;
  return <Navigate to="/Dashboard" replace />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Not authenticated — show login page
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/TeacherDashboard" element={<TeacherDashboard />} />
        <Route path="/TeacherLessonTools" element={<TeacherLessonTools />} />
        <Route path="/StudentSelfPortal" element={<StudentSelfPortal />} />
        <Route path="/StaffDashboard" element={<StaffDashboard />} />

        <Route path="/Students" element={<Students />} />
        <Route path="/StudentProfile/:id" element={<StudentProfile />} />
        <Route path="/Invoices" element={<InvoiceManagement />} />
        <Route path="/Courses" element={<Courses />} />
        <Route path="/Schedule" element={<Schedule />} />
        <Route path="/Teachers" element={<Teachers />} />


        <Route path="/Tasks" element={<Tasks />} />
        <Route path="/Certifications" element={<Certifications />} />

        <Route path="/Settings" element={<Settings />} />
        <Route path="/FormSubmissions" element={<FormSubmissions />} />
        <Route path="/EmailHistory" element={<EmailHistory />} />
        <Route path="/Accounting" element={<Accounting />} />
        <Route path="/Finance" element={<Finance />} />
        <Route path="/Reports" element={<Reports />} />
        <Route path="/Emails" element={<Emails />} />
        <Route path="/WebsiteIntegrations" element={<WebsiteIntegrations />} />
        <Route path="/SalesStaff" element={<SalesStaff />} />
        <Route path="/EmailAccounts" element={<EmailAccounts />} />
        <Route path="/InvoiceManagement" element={<InvoiceManagement />} />
        <Route path="/Payroll" element={<Payroll />} />
        <Route path="/Personnel" element={<Personnel />} />
        <Route path="/PersonnelManagement" element={<PersonnelManagement />} />
        <Route path="/Classrooms" element={<Classrooms />} />
        <Route path="/Classroom" element={<Classroom />} />
        <Route path="/NotificationCenter" element={<NotificationCenter />} />
        <Route path="/ResourceLibrary" element={<ResourceLibrary />} />
        <Route path="/Leads" element={<Leads />} />
        <Route path="/Packages" element={<Packages />} />
        <Route path="/Resources" element={<TeacherResources />} />
        <Route path="/Profile" element={<UserProfile />} />
      </Route>


      <Route path="/public/lead-form" element={<PublicLeadForm />} />
      <Route path="/student-classroom" element={<StudentClassroom />} />
      <Route path="/public/enrollment-form" element={<PublicEnrollmentForm />} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let handler;
    try {
      handler = CapApp.addListener('backButton', () => {
        const path = location.pathname;
        const isMainPage = path === '/login' || 
                           path === '/Dashboard' || 
                           path === '/StudentSelfPortal' || 
                           path === '/TeacherDashboard' || 
                           path === '/StaffDashboard' ||
                           path === '/';
        
        if (isMainPage) {
          CapApp.exitApp();
        } else {
          navigate(-1);
        }
      });
    } catch (e) {
      // Gracefully ignore if not running inside Capacitor
      console.log('Capacitor App listener not available in this environment');
    }

    return () => {
      if (handler) {
        handler.then(h => h.remove());
      }
    };
  }, [navigate, location]);

  return null;
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <BackButtonHandler />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App