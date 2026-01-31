import React from 'react';

export default function MedImport() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
      <div className="max-w-2xl text-center space-y-6">
        <div className="bg-blue-600 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
           {/* Ícone de Raio/Cérebro simulado */}
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">MedImport <span className="text-blue-400">AI</span></h1>
        <p className="text-xl text-slate-400">
          Cole seu texto ou PDF aqui e deixe a Inteligência Artificial criar as questões para você.
        </p>
        
        {/* Espaço para o futuro formulário */}
        <div className="p-8 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/50 mt-8">
            <p className="text-slate-500">Área de Importação (Em construção...)</p>
        </div>
      </div>
    </div>
  );
}
