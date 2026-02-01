import React from 'react'
import ReactDOM from 'react-dom/client'
import MedManager from './MedManager.jsx'
import './index.css' // Importa o Tailwind e estilos globais

ReactDOM.createRoot(document.getElementById('root-manager')).render(
  <React.StrictMode>
    <MedManager />
  </React.StrictMode>,
)
