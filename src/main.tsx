import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom'
import Login from './routes/Login.tsx'

const routes = [
  { path: '/', element: <App /> },
  { path: '/channels/:channelId', element: <App /> },
  { path: '/login', element: <Login /> },
]
const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:'
const router = isFileProtocol ? createHashRouter(routes) : createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
