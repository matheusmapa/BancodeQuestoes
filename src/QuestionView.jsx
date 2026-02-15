import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ArrowRight, PauseCircle, XCircle, CheckCircle, 
  RotateCcw, AlertTriangle, Edit2, Check, Copy, X
} from 'lucide-react';
import ReportModal from './components/ReportModal';

export default function QuestionView({ area, initialData, user, onExit, onFinish, onPause, onUpdateProgress, addToast }) {
  // Inicializa os estados com base no initialData
  const [questions] = useState(() => initialData ? initialData.questionsData : []); 
  const [userAnswers, setUserAnswers] = useState(() => initialData ? initialData.answersData : {}); 
  const [currentIndex, setCurrentIndex] = useState(() => initialData ? initialData.currentIndex : 0);
  
  const [selectedOption, setSelectedOption] = useState(null);
  const [status, setStatus] = useState('unanswered'); 
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [suggestionType, setSuggestionType] = useState(null); 

  // Notifica o componente pai sobre mudanças para o "Autosave"
  useEffect(() => {
     if (onUpdateProgress) {
         onUpdateProgress(questions, userAnswers, currentIndex, initialData?.id);
     }
  }, [questions, userAnswers, currentIndex, onUpdateProgress, initialData?.id]);

  // Atualiza a seleção visual ao trocar de questão
  useEffect(() => {
    // Verifica se questions[currentIndex] existe antes de acessar
    if (questions && questions[currentIndex]) {
        if (userAnswers[currentIndex]) {
          setSelectedOption(userAnswers[currentIndex]);
          const isCorrect = userAnswers[currentIndex] === questions[currentIndex].correctOptionId;
          setStatus(isCorrect ? 'correct' : 'incorrect');
        } else {
          setSelectedOption(null);
          setStatus('unanswered');
        }
    }
  }, [currentIndex, userAnswers, questions]);

  const currentQuestion = questions[currentIndex];

  // --- PROTEÇÃO CONTRA O ERRO "UNDEFINED" ---
  // Se os dados ainda não chegaram ou o índice for inválido, mostra loading
  if (!currentQuestion) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 pb-20">
              <div className="text-center animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-400 font-medium">Carregando questão...</p>
              </div>
          </div>
      );
  }

  // --- HANDLERS ---
  const handleConfirmAnswer = () => { 
      if (!selectedOption) return; 
      const isCorrect = selectedOption === currentQuestion.correctOptionId; 
      setStatus(isCorrect ? 'correct' : 'incorrect'); 
      setUserAnswers(prev => ({ ...prev, [currentIndex]: selectedOption })); 
  };

  const handleNext = () => { 
      if (currentIndex < questions.length - 1) { 
          setCurrentIndex(prev => prev + 1); 
          window.scrollTo(0,0); 
      } else { 
          // Finalizar
          let correctCount = 0; 
          questions.forEach((q, idx) => { 
              if (userAnswers[idx] === q.correctOptionId) correctCount++; 
          }); 
          onFinish({ total: questions.length, correct: correctCount }, questions, userAnswers, initialData?.id); 
      } 
  };

  const handlePrevious = () => { 
      if (currentIndex > 0) { 
          setCurrentIndex(prev => prev - 1); 
          window.scrollTo(0,0); 
      } 
  };

  const handleRedo = () => { 
      setSelectedOption(null); 
      setStatus('unanswered'); 
  };

  const handleSaveAndExit = () => { 
      onPause(questions, userAnswers, currentIndex, initialData?.id); 
  };
  
  // NavBar Mobile
  const MobileNavBar = () => (
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-3 z-50 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:hidden">
          <button onClick={handlePrevious} disabled={currentIndex === 0} className="p-3 text-slate-500 hover:text-blue-600 disabled:opacity-30 rounded-xl bg-gray-50 border border-gray-100"><ArrowLeft size={24} /></button>
          <div className="flex-1 mx-3">
              {status === 'unanswered' ? (
                  <button onClick={handleConfirmAnswer} disabled={!selectedOption} className="w-full bg-blue-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform">Responder</button>
              ) : (
                  <button onClick={handleRedo} className="w-full text-blue-600 border border-blue-200 bg-blue-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><RotateCcw size={18} /> Refazer</button>
              )}
          </div>
          <button onClick={handleNext} className="p-3 text-white bg-slate-900 rounded-xl shadow-lg"><ArrowRight size={24} /></button>
      </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-5xl mx-auto pb-32 md:pb-0 relative">
      {/* Modais */}
      <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} questionId={currentQuestion.id} userId={user?.uid} type="error" addToast={addToast} />
      <ReportModal isOpen={suggestionModalOpen} onClose={() => setSuggestionModalOpen(false)} questionId={currentQuestion.id} userId={user?.uid} type="suggestion" category={suggestionType} addToast={addToast} />
      
      {/* Header Fixo */}
      <div className="flex items-center justify-between mb-6 sticky top-14 md:top-0 bg-gray-50 z-30 py-4 border-b md:border-none border-gray-200">
          <div className="flex gap-2">
              <button onClick={handleSaveAndExit} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-bold text-sm bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100">
                  <PauseCircle size={18} className="mr-2" /> <span className="hidden md:inline">Salvar e Sair</span><span className="md:hidden">Sair</span>
              </button>
              <button onClick={() => { let correctCount = 0; questions.forEach((q, idx) => { if (userAnswers[idx] === q.correctOptionId) correctCount++; }); onFinish({ total: questions.length, correct: correctCount }, questions, userAnswers, initialData?.id); }} className="flex items-center text-gray-500 hover:text-red-600 transition-colors font-medium text-sm bg-white border border-gray-200 px-3 py-2 rounded-lg">
                  <XCircle size={18} className="mr-2" /> <span className="hidden md:inline">Encerrar</span>
              </button>
          </div>
          <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-gray-500">Questão <span className="text-slate-900 font-bold">{currentIndex + 1}</span> de {questions.length}</div>
              <div className="w-20 md:w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
              </div>
          </div>
      </div>
      
      {/* Área Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna da Questão */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 relative">
              
              {/* Topo do Card: Metadados e Ações */}
              <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                  <div className="flex flex-wrap gap-2 items-center">
                      {(!currentQuestion.institution || !currentQuestion.year) && (
                          <button onClick={() => { setSuggestionType('institution'); setSuggestionModalOpen(true); }} className="px-2 py-1 rounded border border-dashed border-blue-300 text-blue-500 bg-blue-50 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1">
                              <Edit2 size={10}/> Sugerir Banca/Ano
                          </button>
                      )}
                      {currentQuestion.institution && (<span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide border border-blue-100">{currentQuestion.institution}</span>)}
                      {currentQuestion.year && (<span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded border border-gray-200">{currentQuestion.year}</span>)}
                      <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded border border-gray-200">{currentQuestion.topic}</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 font-bold uppercase tracking-wider">
                          <span>ID</span>
                          <CopyButton text={currentQuestion.id} />
                      </div>
                      <button onClick={() => setReportModalOpen(true)} className="text-red-500 hover:text-red-700 transition-colors" title="Reportar Erro"><AlertTriangle size={18} /></button>
                  </div>
              </div>

              {/* Texto do Enunciado */}
              <p className="text-base md:text-lg text-slate-800 leading-relaxed mb-6 font-medium whitespace-pre-line">{currentQuestion.text}</p>
              
              {/* Imagens */}
              {(currentQuestion.images?.length > 0 || currentQuestion.imageUrl) && (
                  <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(currentQuestion.images || [currentQuestion.imageUrl]).map((img, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                              <img src={img} alt={`Anexo ${idx + 1}`} className="w-full h-64 object-contain hover:scale-105 transition-transform duration-300 cursor-zoom-in" onClick={() => window.open(img, '_blank')} />
                              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Clique para ampliar</div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* Alternativas */}
          <div className="space-y-3">
              {currentQuestion.options.map((option) => { 
                  let itemClass = "border-gray-200 hover:border-blue-300 hover:bg-blue-50"; 
                  let icon = <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-blue-400"></div>; 
                  
                  if (selectedOption === option.id) { 
                      itemClass = "border-blue-600 bg-blue-50 ring-1 ring-blue-600"; 
                      icon = <div className="w-5 h-5 rounded-full border-[5px] border-blue-600 bg-white"></div>; 
                  } 
                  
                  if (status !== 'unanswered') { 
                      if (option.id === currentQuestion.correctOptionId) { 
                          itemClass = "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"; 
                          icon = <CheckCircle size={20} className="text-emerald-600 fill-emerald-100" />; 
                      } else if (selectedOption === option.id && option.id !== currentQuestion.correctOptionId) { 
                          itemClass = "border-red-500 bg-red-50 ring-1 ring-red-500"; 
                          icon = <XCircle size={20} className="text-red-600 fill-red-100" />; 
                      } else { 
                          itemClass = "border-gray-100 opacity-50"; 
                      } 
                  } 
                  
                  return (
                      <button key={option.id} disabled={status !== 'unanswered'} onClick={() => setSelectedOption(option.id)} className={`w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all flex items-start gap-4 group ${itemClass}`}>
                          <div className="mt-0.5 flex-shrink-0">{icon}</div>
                          <span className={`font-medium text-base ${status !== 'unanswered' && option.id === currentQuestion.correctOptionId ? 'text-emerald-800' : 'text-slate-700'}`}>
                              <span className="uppercase font-bold mr-2">{option.id})</span>{option.text}
                          </span>
                      </button>
                  ); 
              })}
          </div>
          
          {/* Navegação Desktop */}
          <div className="hidden md:flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
              <button onClick={handlePrevious} disabled={currentIndex === 0} className="px-4 py-3 text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-500 font-bold flex items-center gap-2 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"><ArrowLeft size={20} /> Anterior</button>
              
              {status === 'unanswered' ? (
                  <button onClick={handleConfirmAnswer} disabled={!selectedOption} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all transform active:scale-95 flex-1 mx-4">Responder</button>
              ) : (
                  <button onClick={handleRedo} className="text-gray-500 hover:text-blue-600 font-bold flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors border border-gray-200 mx-4"><RotateCcw size={18} /> Refazer</button>
              )}
              
              <button onClick={handleNext} className="px-4 py-3 text-blue-600 hover:text-blue-800 font-bold flex items-center gap-2 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">{currentIndex === questions.length - 1 ? 'Finalizar' : 'Próxima'} <ArrowRight size={20} /></button>
          </div>
        </div>
        
        {/* Coluna de Feedback (Comentário) */}
        <div className="lg:col-span-1 space-y-6">
           {status !== 'unanswered' && (
               <div className={`p-6 rounded-2xl border animate-in slide-in-from-right-4 duration-500 ${status === 'correct' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                   <div className="flex items-center gap-3 mb-3">
                       {status === 'correct' ? (<div className="p-2 bg-emerald-100 rounded-full"><Check size={24} className="text-emerald-600" /></div>) : (<div className="p-2 bg-red-100 rounded-full"><X size={24} className="text-red-600" /></div>)}
                       <h3 className={`text-xl font-bold ${status === 'correct' ? 'text-emerald-800' : 'text-red-800'}`}>{status === 'correct' ? 'Excelente!' : 'Não foi dessa vez.'}</h3>
                   </div>
                   <p className={`text-sm mb-4 font-medium ${status === 'correct' ? 'text-emerald-700' : 'text-red-700'}`}>Gabarito: Letra {currentQuestion.correctOptionId.toUpperCase()}</p>
                   <div className="bg-white/60 p-4 rounded-xl text-sm text-slate-700 leading-relaxed border border-black/5">
                       <span className="font-bold block mb-1">Comentário do Professor:</span>{currentQuestion.explanation}
                   </div>
               </div>
           )}
        </div>

      </div>
      <MobileNavBar />
    </div>
  );
}

// Botão Auxiliar de Copiar
export function CopyButton({ text, className }) {
    const [isCopied, setIsCopied] = useState(false);
    const handleCopy = (e) => {
        e.stopPropagation();
        const fallbackCopy = (txt) => { const textArea = document.createElement("textarea"); textArea.value = txt; textArea.style.position = "fixed"; textArea.style.left = "-9999px"; document.body.appendChild(textArea); textArea.focus(); textArea.select(); try { document.execCommand('copy'); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); } catch (err) { console.error('Fallback failed', err); } document.body.removeChild(textArea); };
        if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }).catch(() => fallbackCopy(text)); } else { fallbackCopy(text); }
    };
    return (
        <button onClick={handleCopy} className={`hover:text-blue-600 transition-colors flex items-center gap-1 ${className}`} title="Copiar">
            {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {isCopied && <span className="text-[10px] text-emerald-600 font-bold ml-1">Copiado!</span>}
        </button>
    );
}
