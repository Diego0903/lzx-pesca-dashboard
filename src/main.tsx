import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './auth/AuthContext'
import { RouterProvider } from './router/Router'
import AppRoot from './AppRoot'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </RouterProvider>
  </StrictMode>,
)
