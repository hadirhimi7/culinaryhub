import './App.css'
import { Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdminPage } from './pages/AdminPage'
import { ContentPage } from './pages/ContentPage'
import { Error403Page } from './pages/Error403Page'
import { Error404Page } from './pages/Error404Page'
import { Error500Page } from './pages/Error500Page'
import { MainLayout } from './layouts/MainLayout'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute, RoleProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <MainLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <RoleProtectedRoute allowedRoles={['admin']}>
                <AdminPage />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/content"
            element={
              <ProtectedRoute>
                <ContentPage />
              </ProtectedRoute>
            }
          />

          <Route path="/403" element={<Error403Page />} />
          <Route path="/500" element={<Error500Page />} />
          <Route path="*" element={<Error404Page />} />
        </Routes>
      </MainLayout>
    </AuthProvider>
  )
}

export default App
