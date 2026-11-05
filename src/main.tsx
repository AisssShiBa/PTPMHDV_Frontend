import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '@/app/App'
import '@/styles/index.css'

async function prepareApp() {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { worker } = await import('@/mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass'
    })
  }
}

prepareApp().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
