import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Edit2 } from 'lucide-react';
import { collection, addDoc } from "firebase/firestore";
import { db } from '../firebase'; // Importando o banco que configuramos no passo 1

export default function ReportModal({ isOpen, onClose, questionId, type, userId, addToast }) {
    const [suggestedInstitution, setSuggestedInstitution] = useState('');
    const [suggestedYear, setSuggestedYear] = useState('');
    const [errorCategory, setErrorCategory] = useState('');
    const [details, setDetails] = useState(''); 
    const [isSending, setIsSending] = useState(false);

    const isValid = type === 'error' 
        ? !!errorCategory 
        : (!!suggestedInstitution.trim() || !!suggestedYear.trim());

    useEffect(() => {
        if(isOpen) {
            setSuggestedInstitution('');
            setSuggestedYear('');
            setErrorCategory('');
            setDetails('');
            setIsSending(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const errorOptions = [
        "Enunciado incorreto/confuso", "Alternativas com erro", "Gabarito errado",
        "Área errada", "Tema errado", "Instituição errada",
        "Ano errado", "Questão repetida", "Outro"
    ];

    const handleSubmit = async () => {
        if (!isValid) return;
        setIsSending(true);
        try {
            const reportData = {
                questionId,
                userId: userId || 'anonymous',
                type,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            if (type === 'suggestion') {
                reportData.category = 'suggestion_update';
                reportData.suggestedInstitution = suggestedInstitution;
                reportData.suggestedYear = suggestedYear;
                reportData.details = `Sugestão: Banca [${suggestedInstitution}] | Ano [${suggestedYear}]`;
            } else {
                reportData.category = errorCategory;
                reportData.details = details;
            }
            
            await addDoc(collection(db, "reports"), reportData);
            addToast('Recebido!', 'Sua colaboração foi enviada para análise.', 'success');
            onClose();
        } catch (error) {
            console.error(error);
            addToast('Erro', 'Não foi possível enviar o reporte.', 'error');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 m-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        {type === 'error' ? <><AlertTriangle size={20} className="text-red-500"/> Reportar Erro</> : <><Edit2 size={20} className="text-blue-500"/> Sugerir Edição</>}
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                </div>

                {type === 'suggestion' ? (
                    <div className="space-y-4 mb-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <p className="text-sm text-blue-800">Preencha a Banca <strong>E/OU</strong> o Ano desta questão.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Banca / Prova</label>
                            <input type="text" value={suggestedInstitution} onChange={e => setSuggestedInstitution(e.target.value)} placeholder="Ex: USP, ENARE..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ano</label>
                            <input type="text" value={suggestedYear} onChange={e => setSuggestedYear(e.target.value)} placeholder="Ex: 2024" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3 mb-4">
                            <p className="text-sm text-gray-500">Qual o problema com esta questão?</p>
                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                                {errorOptions.map(opt => (
                                    <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${errorCategory === opt ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                                        <input type="radio" name="reportCategory" value={opt} checked={errorCategory === opt} onChange={e => setErrorCategory(e.target.value)} className="text-red-600 focus:ring-red-500" />
                                        <span className="text-sm font-medium">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="mb-6">
                            <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Descreva melhor o erro encontrado..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" rows={3} />
                        </div>
                    </>
                )}

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50">Cancelar</button>
                    <button onClick={handleSubmit} disabled={isSending || !isValid} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-colors flex items-center justify-center gap-2 ${type === 'error' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                        {isSending ? 'Enviando...' : 'Enviar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
