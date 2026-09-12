import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ToastProvider } from './context/ToastContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import 'virtual:pwa-register'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </ToastProvider>
  </React.StrictMode>,
)
