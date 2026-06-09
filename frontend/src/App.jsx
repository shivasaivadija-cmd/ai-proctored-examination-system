import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store'
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/AuthPages'
import { InterviewPage } from './pages/InterviewPage'
import { DashboardPage, ReportPage, HistoryPage } from './pages/DashboardAndReport'
import { ResumeInterviewPage } from './pages/ResumeInterviewPage'
import { VerificationPage } from './pages/VerificationPage'
import { AdminOverviewPage, AdminStudentsPage, AdminViolationsPage, AdminSessionsPage } from './pages/AdminPage'
import { useEffect } from 'react'

function PrivateRoute({ children }) {
  const { isAuthenticated, token, validateAuth } = useAuthStore()
  
  useEffect(() => {
    validateAuth()
  }, [])
  
  return (isAuthenticated && token) ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuthenticated, token, validateAuth } = useAuthStore()
  
  useEffect(() => {
    validateAuth()
  }, [])
  
  return (isAuthenticated && token) ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  const { validateAuth } = useAuthStore()

  useEffect(() => {
    validateAuth()
  }, [])

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' },
          success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login"          element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"       element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password"element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/verification" element={<PrivateRoute><VerificationPage /></PrivateRoute>} />
        <Route path="/interview" element={<PrivateRoute><InterviewPage /></PrivateRoute>} />
        <Route path="/resume-interview" element={<PrivateRoute><ResumeInterviewPage /></PrivateRoute>} />
        <Route path="/history"   element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
        <Route path="/report"    element={<PrivateRoute><ReportPage /></PrivateRoute>} />

        <Route path="/admin"            element={<PrivateRoute><AdminOverviewPage /></PrivateRoute>} />
        <Route path="/admin/students"   element={<PrivateRoute><AdminStudentsPage /></PrivateRoute>} />
        <Route path="/admin/violations" element={<PrivateRoute><AdminViolationsPage /></PrivateRoute>} />
        <Route path="/admin/sessions"   element={<PrivateRoute><AdminSessionsPage /></PrivateRoute>} />

        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
