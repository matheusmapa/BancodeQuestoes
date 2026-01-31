import React from 'react'
import ReactDOM from 'react-dom/client'
import MedImport from './MedImport.jsx'
import './index.css' // <--- Importante para carregar o Tailwind

ReactDOM.createRoot(document.getElementById('root-import')).render(
  <React.StrictMode>
    <MedImport />
  </React.StrictMode>,
)
