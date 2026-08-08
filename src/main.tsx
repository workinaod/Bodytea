import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Prompt-style updates: never auto-reload mid-session.
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(
      new CustomEvent('naod:sw-update', { detail: () => void updateSW(true) }),
    )
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
