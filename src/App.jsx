import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Stethoscope, Scissors, Baby, HeartPulse, Activity, BookOpen, BarChart2, 
  Settings, LogOut, Search, CheckCircle, Clock, Menu, X, Lock, Mail, 
  ChevronRight, ArrowRight, AlertCircle, ArrowLeft, Play, Filter, CheckSquare, 
  Square, Edit2, Check, Image as ImageIcon, RotateCcw, Home, List, Plus, 
  ChevronDown, ChevronUp, FileText, PlayCircle, Eye, PauseCircle, Save, 
  Database, User, Bell, Shield, Target, TrendingUp, Award, Info, XCircle, 
  TrendingDown, HelpCircle, RefreshCw, Repeat, Trash2, AlertTriangle, Zap, 
  CloudUpload, Key, Users, UserPlus, Calendar, PlusCircle, FilePlus, Map, Brain,
  Flag, Copy, MessageSquarePlus, ChevronLeft, PanelLeftClose, PanelLeftOpen,
  CreditCard, Smartphone, Link as LinkIcon, ExternalLink, Loader2
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp, deleteApp } from "firebase/app";
import { 
  getFirestore, collection, getDocs, doc, setDoc, addDoc, 
  getDoc, onSnapshot, query, where, writeBatch, updateDoc, deleteDoc
} from "firebase/firestore";
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, updateProfile, updatePassword, 
  reauthenticateWithCredential, EmailAuthProvider 
} from "firebase/auth";

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBhwtINeofqm97BzIE_s9DcG-l3v7zsAAY",
  authDomain: "bancodequestoes-5cc34.firebaseapp.com",
  projectId: "bancodequestoes-5cc34",
  storageBucket: "bancodequestoes-5cc34.firebasestorage.app",
  messagingSenderId: "174347052858",
  appId: "1:174347052858:web:d54bbf3b193d30a5f69203",
  measurementId: "G-XNHXB5BCGF"
};

// Inicializa Firebase Principal
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- DADOS ESTÁTICOS DAS ÁREAS ---
const areasBase = [
  { id: 'cirurgia', title: 'Cirurgia Geral', icon: Scissors, color: 'bg-emerald-50 text-emerald-600', borderColor: 'hover:border-emerald-200' },
  { id: 'clinica', title: 'Clínica Médica', icon: Stethoscope, color: 'bg-blue-50 text-blue-600', borderColor: 'hover:border-blue-200' },
  { id: 'go', title: 'Ginecologia e Obstetrícia', icon: HeartPulse, color: 'bg-rose-50 text-rose-600', borderColor: 'hover:border-rose-200' },
  { id: 'pediatria', title: 'Pediatria', icon: Baby, color: 'bg-amber-50 text-amber-600', borderColor: 'hover:border-amber-200' },
  { id: 'preventiva', title: 'Preventiva', icon: Shield, color: 'bg-violet-50 text-violet-600', borderColor: 'hover:border-violet-200' },
];

const themesMap = {
    'clinica': ['Cardiologia', 'Dermatologia', 'Endocrinologia e Metabologia', 'Gastroenterologia', 'Hematologia', 'Hepatologia', 'Infectologia', 'Nefrologia', 'Neurologia', 'Pneumologia', 'Psiquiatria', 'Reumatologia'],
    'cirurgia': ['Abdome Agudo', 'Cirurgia Hepatobiliopancreática', 'Cirurgia Torácica e de Cabeça e Pescoço', 'Cirurgia Vascular', 'Cirurgia do Esôfago e Estômago', 'Coloproctologia', 'Hérnias e Parede Abdominal', 'Pré e Pós-Operatório', 'Queimaduras', 'Resposta Metabólica e Cicatrização', 'Trauma', 'Urologia'],
    'go': ['Ciclo Menstrual e Anticoncepção', 'Climatério e Menopausa', 'Doenças Intercorrentes na Gestação', 'Infecções Congênitas e Gestacionais', 'Infecções Ginecológicas e ISTs', 'Mastologia', 'Obstetrícia Fisiológica e Pré-Natal', 'Oncologia Pélvica', 'Parto e Puerpério', 'Sangramentos da Gestação', 'Uroginecologia e Distopias', 'Vitalidade Fetal e Amniograma'],
    'pediatria': ['Adolescência e Puberdade', 'Afecções Respiratórias', 'Aleitamento Materno e Nutrição', 'Cardiologia e Reumatologia Pediátrica', 'Crescimento e Desenvolvimento', 'Emergências e Acidentes', 'Gastroenterologia Pediátrica', 'Imunizações', 'Infectopediatria e Exantemáticas', 'Nefrologia Pediátrica', 'Neonatologia: Patologias', 'Neonatologia: Sala de Parto'],
    'preventiva': ['Atenção Primária e Saúde da Família', 'Estudos Epidemiológicos', 'Financiamento e Gestão', 'História e Princípios do SUS', 'Indicadores de Saúde e Demografia', 'Medicina Baseada em Evidências', 'Medicina Legal', 'Medidas de Associação e Testes Diagnósticos', 'Políticas Nacionais de Saúde', 'Saúde do Trabalhador', 'Vigilância em Saúde', 'Ética Médica e Bioética']
};

const areaNameMap = {
    'clinica': 'Clínica Médica',
    'cirurgia': 'Cirurgia Geral',
    'go': 'Ginecologia e Obstetrícia',
    'pediatria': 'Pediatria',
    'preventiva': 'Preventiva'
};

// --- HELPERS GLOBAIS ---
const getAvailableQuestionCount = (allQuestions, areaTitle, topic = null, excludedIds = new Set()) => {
  let filtered = allQuestions.filter(q => q.area === areaTitle);
  if (topic) filtered = filtered.filter(q => q.topic === topic);
  return filtered.filter(q => !excludedIds.has(q.id)).length;
};

const getRealQuestionCount = (allQuestions, areaTitle, topic = null) => {
  let filtered = allQuestions.filter(q => q.area === areaTitle);
  if (topic) filtered = filtered.filter(q => q.topic === topic);
  return filtered.length;
};

const getThemesForArea = (areaId, excludedIds = new Set(), allQuestions) => {
  const list = themesMap[areaId] || [];
  const areaName = areaNameMap[areaId];
  return list.map((theme, index) => ({
    id: index + 1,
    name: theme,
    count: getAvailableQuestionCount(allQuestions, areaName, theme, excludedIds),
    total: getRealQuestionCount(allQuestions, areaName, theme)
  }));
};

const calculateDetailedStats = (simulations, allQuestions) => {
  const stats = { totalQuestions: 0, totalCorrect: 0, byArea: {} };
  areasBase.forEach(area => { stats.byArea[area.title] = { total: 0, correct: 0 }; });
  stats.byArea['Geral'] = { total: 0, correct: 0 }; 

  simulations.forEach(sim => {
    if (sim.status === 'finished' && sim.answersData) {
      const questions = sim.questionsData || (sim.questionIds ? sim.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) : []);
      questions.forEach((q, idx) => {
        const userAnswer = sim.answersData[idx];
        if (userAnswer) {
          const isCorrect = userAnswer === q.correctOptionId;
          stats.totalQuestions++;
          if (isCorrect) stats.totalCorrect++;
          const areaKey = q.area || 'Geral';
          if (!stats.byArea[areaKey]) stats.byArea[areaKey] = { total: 0, correct: 0 };
          stats.byArea[areaKey].total++;
          if (isCorrect) stats.byArea[areaKey].correct++;
        }
      });
    }
  });
  return stats;
};

const getCorrectlyAnsweredIds = (simulations, allQuestions) => {
  const ids = new Set();
  simulations.forEach(sim => {
    if (sim.status === 'finished' && sim.answersData) {
      const questions = sim.questionsData || (sim.questionIds ? sim.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) : []);
      questions.forEach((q, idx) => {
        if (sim.answersData[idx] === q.correctOptionId) {
          ids.add(q.id);
        }
      });
    }
  });
  return ids;
};

const calculateTopicPerformance = (simulations, areaTitle, allQuestions) => {
  const topicStats = {};
  simulations.forEach(sim => {
    if (sim.status === 'finished' && sim.answersData) {
      const questions = sim.questionsData || (sim.questionIds ? sim.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) : []);
      questions.forEach((q, idx) => {
        if (q.area === areaTitle) {
           const topic = q.topic;
           const userAnswer = sim.answersData[idx];
           const isCorrect = userAnswer === q.correctOptionId;
           if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0 };
           if (userAnswer) {
             topicStats[topic].total++;
             if (isCorrect) topicStats[topic].correct++;
           }
        }
      });
    }
  });
  const topicsArray = Object.keys(topicStats).map(topic => {
    const { total, correct } = topicStats[topic];
    return { name: topic, total, correct, percentage: total === 0 ? 0 : Math.round((correct / total) * 100) };
  });
  const activeTopics = topicsArray.filter(t => t.total > 0);
  activeTopics.sort((a, b) => a.percentage - b.percentage || b.total - a.total);
  return activeTopics.slice(0, 3); 
};

const checkIsYesterday = (lastDateStr) => {
    if (!lastDateStr) return false;
    const parts = lastDateStr.split('/');
    if (parts.length !== 3) return false;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const lastDate = new Date(year, month, day);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return lastDate.getDate() === yesterday.getDate() && lastDate.getMonth() === yesterday.getMonth() && lastDate.getFullYear() === yesterday.getFullYear();
};

// --- COMPONENTES UI HELPERS ---

function CopyButton({ text, className }) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        const fallbackCopy = (txt) => {
            const textArea = document.createElement("textarea");
            textArea.value = txt;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textArea);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                })
                .catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    };

    return (
        <button 
            onClick={handleCopy} 
            className={`hover:text-blue-600 transition-colors flex items-center gap-1 ${className}`} 
            title="Copiar"
        >
            {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {isCopied && <span className="text-[10px] text-emerald-600 font-bold ml-1">Copiado!</span>}
        </button>
    );
}

// --- TOAST NOTIFICATIONS ---
function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
            {toasts.map(toast => (
                <div 
                    key={toast.id} 
                    className={`
                        pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-xl border w-80 animate-in slide-in-from-right-full fade-in duration-300
                        ${toast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-800' : 
                          toast.type === 'error' ? 'bg-white border-red-100 text-red-800' : 
                          'bg-white border-blue-100 text-blue-800'}
                    `}
                >
                    <div className={`
                        p-2 rounded-full flex-shrink-0
                        ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                          toast.type === 'error' ? 'bg-red-100 text-red-600' : 
                          'bg-blue-100 text-blue-600'}
                    `}>
                        {toast.type === 'success' ? <Check size={20} /> : 
                         toast.type === 'error' ? <AlertTriangle size={20} /> : 
                         <Info size={20} />}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sm">{toast.title}</h4>
                        <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>
                    </div>
                    <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
}

// --- MODAIS GLOBAIS ---
function ReportModal({ isOpen, onClose, questionId, type, userId, addToast }) {
    const [suggestedInstitution, setSuggestedInstitution] = useState('');
    const [suggestedYear, setSuggestedYear] = useState('');
    const [errorCategory, setErrorCategory] = useState('');
    const [details, setDetails] = useState(''); 
    const [isSending, setIsSending] = useState(false);

    // Validação de estado
    const isValid = type === 'error' 
        ? !!errorCategory // Erro: precisa ter categoria
        : (!!suggestedInstitution.trim() || !!suggestedYear.trim()); // Sugestão: pelo menos um dos campos

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
        "Enunciado incorreto/confuso",
        "Alternativas com erro",
        "Gabarito errado",
        "Área errada",
        "Tema errado",
        "Instituição errada",
        "Ano errado",
        "Questão repetida",
        "Outro"
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
                            <p className="text-sm text-blue-800">
                                Preencha a Banca <strong>E/OU</strong> o Ano desta questão.
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Banca / Prova</label>
                            <input 
                                type="text"
                                value={suggestedInstitution}
                                onChange={e => setSuggestedInstitution(e.target.value)}
                                placeholder="Ex: USP, ENARE, SURCE..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ano</label>
                            <input 
                                type="text"
                                value={suggestedYear}
                                onChange={e => setSuggestedYear(e.target.value)}
                                placeholder="Ex: 2023, 2024, 2023/1..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                    </div>
                ) : (
                    // --- MODO ERRO ---
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
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Detalhes (Opcional)
                            </label>
                            <textarea 
                                value={details} 
                                onChange={e => setDetails(e.target.value)}
                                placeholder="Descreva melhor o erro encontrado..."
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                                rows={3}
                            />
                        </div>
                    </>
                )}

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50">Cancelar</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSending || !isValid} 
                        className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-colors flex items-center justify-center gap-2 
                            ${type === 'error' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
                    >
                        {isSending ? 'Enviando...' : 'Enviar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ExitConfirmationModal({ onClose, onConfirmExit, onSaveAndExit }) {
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200 m-4">
                <div className="text-center mb-6">
                    <div className="bg-orange-100 p-4 rounded-full text-orange-600 inline-flex mb-4">
                        <AlertCircle size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Simulado em Andamento!</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Se você sair agora sem salvar, <strong>seu progresso será perdido</strong>. O que deseja fazer?
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={onSaveAndExit} 
                        className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <Save size={18} /> Salvar e Sair
                    </button>
                    <button 
                        onClick={onConfirmExit} 
                        className="w-full py-3.5 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors"
                    >
                        Sair sem Salvar
                    </button>
                    <button 
                        onClick={onClose} 
                        className="w-full py-3.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                    >
                        Continuar no Simulado
                    </button>
                </div>
            </div>
        </div>
    );
}

function NotificationModal({ title, message, onClose, onConfirm, type = 'info', confirmText = "Entendido", cancelText = "Cancelar", isDangerous = false }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200 m-4">
        <div className="flex flex-col items-center text-center">
          <div className={`p-3 rounded-full mb-4 ${type === 'error' || isDangerous ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
             {type === 'error' || isDangerous ? <AlertTriangle size={32} /> : <Info size={32} />}
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-500 mb-6 text-sm leading-relaxed">{message}</p>
          {onConfirm ? (
             <div className="flex gap-3 w-full">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">{cancelText}</button>
                <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-colors ${isDangerous ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>{confirmText}</button>
             </div>
          ) : (
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors">{confirmText}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalModal({ currentGoal, onSave, onClose }) {
  const [goal, setGoal] = useState(currentGoal);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200 m-4">
        <div className="text-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full text-blue-600 inline-flex mb-4"><Target size={32} /></div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Meta Diária</h3>
          <p className="text-slate-500 text-sm">Quantas questões você quer resolver hoje?</p>
        </div>
        <div className="flex justify-center mb-8">
            <div className="relative">
                <input type="number" min="1" max="200" value={goal} onChange={(e) => setGoal(Number(e.target.value))} className="w-32 px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-3xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" />
                <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-gray-400 font-medium">/dia</span>
            </div>
        </div>
        <div className="flex gap-3 w-full">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
            <button onClick={() => onSave(goal)} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors">Salvar Meta</button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose, onSave, isLoading }) {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
      setError('');
      if (!currentPass) return setError('Digite sua senha atual.');
      if (newPass.length < 6) return setError('A nova senha deve ter no mínimo 6 caracteres.');
      if (newPass !== confirmPass) return setError('As novas senhas não coincidem.');
      onSave(currentPass, newPass);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 m-4">
        <div className="flex items-center gap-3 mb-6"><div className="bg-orange-100 p-3 rounded-full text-orange-600"><Key size={24} /></div><h3 className="text-xl font-bold text-slate-900">Alterar Senha</h3></div>
        {error && <p className="text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-lg font-medium">{error}</p>}
        <div className="space-y-4 mb-8">
            <div><label className="block text-sm font-bold text-slate-700 mb-1">Senha Atual</label><input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="••••••••" /></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-1">Nova Senha</label><input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="Mínimo 6 caracteres" /></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-1">Confirmar Nova Senha</label><input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="••••••••" /></div>
        </div>
        <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancelar</button><button onClick={handleSubmit} disabled={isLoading} className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-lg shadow-slate-200">{isLoading ? 'Salvando...' : 'Alterar Senha'}</button></div>
      </div>
    </div>
  );
}

// --- APP COMPONENT ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalLoginError, setGlobalLoginError] = useState('');
  const [renewalLink, setRenewalLink] = useState('');

  // Fetch renewal link on load
  useEffect(() => {
    const fetchConfig = async () => {
        try {
            const configDoc = await getDoc(doc(db, "config", "general"));
            if (configDoc.exists() && configDoc.data().renewalLink) {
                setRenewalLink(configDoc.data().renewalLink);
            }
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
        }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    let unsubscribeDoc = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeDoc(); // Limpa listener anterior se houver

      if (user) {
        // setIsLoading(true); // Opcional: mostrar loading enquanto busca dados atualizados
        const docRef = doc(db, "users", user.uid);
        
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                
                // Verificação de Assinatura
                if (userData.role !== 'admin') {
                    const subDate = userData.subscriptionUntil ? new Date(userData.subscriptionUntil) : null;
                    const now = new Date();
                    if (!subDate || subDate < now) {
                        signOut(auth);
                        setGlobalLoginError("Sua matrícula venceu, contate um administrador para efetivar novamente.");
                        setCurrentUser(null);
                        setIsLoading(false);
                        return;
                    }
                }
                
                setGlobalLoginError(''); 
                // Atualiza o estado com dados do Auth + Firestore em tempo real
                setCurrentUser({ ...user, ...userData }); 
            } else {
                signOut(auth);
                setGlobalLoginError("Conta não encontrada. Contate o suporte.");
                setCurrentUser(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao buscar perfil:", error);
            setGlobalLoginError("Erro ao verificar conta.");
            setCurrentUser(null);
            setIsLoading(false);
        });
      } else {
        setCurrentUser(null);
        setIsLoading(false);
      }
    });

    return () => {
        unsubscribeAuth();
        unsubscribeDoc();
    };
  }, []);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return <>{currentUser ? <Dashboard user={currentUser} onLogout={() => signOut(auth)} /> : <LoginPage globalError={globalLoginError} renewalLink={renewalLink} />}</>;
}

function LoginPage({ globalError, renewalLink }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (globalError) setError(globalError);
  }, [globalError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        console.error(err);
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            setError("E-mail ou senha incorretos.");
        } else {
            setError("Erro ao fazer login. Tente novamente.");
        }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans text-slate-800">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-700 to-blue-900 p-12 flex-col justify-between text-white relative">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10"><div className="bg-white/10 p-2 rounded-lg backdrop-blur-md border border-white/20"><Map size={32} className="text-white" /></div><h1 className="text-3xl font-bold tracking-tight">MedMaps</h1></div>
            <h2 className="text-4xl font-bold mb-6 leading-tight">Sua aprovação na residência começa aqui.</h2>
            <p className="text-blue-100 text-lg font-light leading-relaxed">Acesso exclusivo ao banco de questões mais barato do mercado!</p>
          </div>
        </div>
        <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col justify-center bg-white">
          <div className="mb-10"><h2 className="text-3xl font-bold text-slate-900 mb-3">Login</h2><p className="text-slate-500 text-lg">Insira suas credenciais de acesso.</p></div>
          
          {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                      <AlertCircle className="text-red-500" size={20} />
                      <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                  {/* Link de renovação se for erro de vencimento */}
                  {renewalLink && (error.includes('venceu') || error.includes('matrícula')) && (
                      <a 
                          href={renewalLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="ml-8 text-sm font-bold text-red-700 hover:text-red-900 underline flex items-center gap-1"
                      >
                          Renovar assinatura agora <ExternalLink size={12} />
                      </a>
                  )}
              </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div><label className="block text-sm font-semibold text-slate-700 mb-2">E-mail</label><div className="relative group"><Mail className="absolute left-4 top-3.5 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-12 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800" /></div></div>
            <div><div className="flex justify-between items-center mb-2"><label className="block text-sm font-semibold text-slate-700">Senha</label></div><div className="relative group"><Lock className="absolute left-4 top-3.5 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" /><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-12 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800" /></div></div>
            <button type="submit" disabled={isLoading} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4">{isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>Entrar</span>}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

// --- DASHBOARD ---
function Dashboard({ user, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [selectedArea, setSelectedArea] = useState(null);
  const [activeExamData, setActiveExamData] = useState(null);
  const [selectedSimulationId, setSelectedSimulationId] = useState(null); 
  const [notification, setNotification] = useState(null);
  const [dailyGoal, setDailyGoal] = useState(user.dailyGoal || 50);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  
  // States para Sidebar, Navegação Segura e Toasts
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [toasts, setToasts] = useState([]);
  
  // Ref para guardar o estado atual do simulado
  const examStateRef = useRef(null);

  const [allQuestions, setAllQuestions] = useState([]);
  const [mySimulations, setMySimulations] = useState([]);
  const [lastExamResults, setLastExamResults] = useState(null);
  const [userStats, setUserStats] = useState({ questionsToday: 0, correctAnswers: 0, totalAnswers: 0, streak: 0 });

  // --- TOAST FUNCTION ---
  const addToast = (title, message, type = 'info') => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, title, message, type }]);
      setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000); // 3 segundos
  };

  const removeToast = (id) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const q = query(collection(db, "questions"));
    const unsubQ = onSnapshot(q, (snapshot) => setAllQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsubQ();
  }, []);

  useEffect(() => {
    if (!user) return;
    const qSims = query(collection(db, `users/${user.uid}/simulations`));
    const unsubSims = onSnapshot(qSims, (snapshot) => {
       const sims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       sims.sort((a,b) => b.id - a.id); 
       setMySimulations(sims);
    });
    
    const docStats = doc(db, "users", user.uid, "stats", "main");
    const unsubStats = onSnapshot(docStats, (docSnap) => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            const today = new Date().toLocaleDateString('pt-BR');
            if (data.lastStudyDate !== today) {
                setUserStats({ ...data, questionsToday: 0 });
            } else {
                setUserStats(data);
            }
        }
    });
    return () => { unsubSims(); unsubStats(); };
  }, [user]);

  const realStats = useMemo(() => calculateDetailedStats(mySimulations, allQuestions), [mySimulations, allQuestions]);
  const excludedIds = useMemo(() => getCorrectlyAnsweredIds(mySimulations, allQuestions), [mySimulations, allQuestions]);
  const accuracy = realStats.totalQuestions > 0 ? Math.round((realStats.totalCorrect / realStats.totalQuestions) * 100) : 0;
  const streak = userStats.streak || 0;

  const dynamicAreas = useMemo(() => {
    return areasBase.map(area => {
      const totalDB = getRealQuestionCount(allQuestions, area.title);
      const uniqueCompleted = allQuestions.filter(q => q.area === area.title && excludedIds.has(q.id)).length;
      const progress = totalDB > 0 ? Math.round((uniqueCompleted / totalDB) * 100) : 0;
      return { ...area, count: `${getAvailableQuestionCount(allQuestions, area.title, null, excludedIds)} Questões`, progress };
    });
  }, [allQuestions, excludedIds]);

  const handleViewSwitch = (newView) => {
      if (currentView === 'question_mode' && newView !== 'question_mode') {
          setPendingNavigation(newView);
          setIsExitModalOpen(true);
      } else {
          setCurrentView(newView);
          if (newView !== 'question_mode') {
             examStateRef.current = null;
          }
      }
  };

  const confirmExitWithoutSaving = () => {
      setIsExitModalOpen(false);
      if (pendingNavigation) {
          setCurrentView(pendingNavigation);
          setPendingNavigation(null);
          examStateRef.current = null;
      }
  };

  const handleSaveAndExitFromModal = async () => {
      setIsExitModalOpen(false);
      if (examStateRef.current && pendingNavigation) {
          const { questions, answers, index, id } = examStateRef.current;
          await handleExamPause(questions, answers, index, id);
          setCurrentView(pendingNavigation);
          setPendingNavigation(null);
          examStateRef.current = null;
      } else {
          confirmExitWithoutSaving();
      }
  };

  const handleUpdateProgress = (questions, answers, index, id) => {
      examStateRef.current = { questions, answers, index, id };
  };

  const handleSaveGoal = async (newGoal) => {
    setDailyGoal(newGoal);
    setIsGoalModalOpen(false);
    if (user && user.uid) {
        try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, { dailyGoal: newGoal }, { merge: true });
        } catch (error) {
            console.error("Erro ao salvar meta:", error);
        }
    }
  };

  const handleLaunchExam = (filters = {}, limit = 5) => {
    // Definição: "Questão Nova" = Não está nos excluídos. "Velha" = Está nos excluídos.
    
    // 1. Filtra TODAS as questões possíveis (Area e Tópicos)
    const validQuestionsPool = allQuestions.filter(q => {
        if (filters.areaId && q.area !== areaNameMap[filters.areaId]) return false;
        if (filters.topics && filters.topics.length > 0 && !filters.topics.includes(q.topic)) return false;
        return true;
    });

    if (validQuestionsPool.length === 0) {
      setNotification({ title: "Sem questões", message: "Não encontramos questões com estes filtros.", type: "info" });
      return;
    }

    let finalSelection = [];

    // --- MODO 1: TÓPICOS ESPECÍFICOS (Balanceado) ---
    if (filters.topics && filters.topics.length > 0) {
        const questionsByTopic = {};
        filters.topics.forEach(t => questionsByTopic[t] = { new: [], old: [] });

        // Distribui as questões nos baldes (Novas vs Velhas)
        validQuestionsPool.forEach(q => {
            if (questionsByTopic[q.topic]) {
                if (excludedIds.has(q.id)) {
                    questionsByTopic[q.topic].old.push(q);
                } else {
                    questionsByTopic[q.topic].new.push(q);
                }
            }
        });

        // Calcula meta por tópico
        const targetPerTopic = Math.ceil(limit / filters.topics.length);
        
        let backupPool = []; // Para compensar se algum tópico falhar totalmente

        Object.keys(questionsByTopic).forEach(topic => {
            const { new: newQs, old: oldQs } = questionsByTopic[topic];
            
            // 1. Tenta pegar da meta só com NOVAS
            const shuffledNew = newQs.sort(() => 0.5 - Math.random());
            const takeNew = shuffledNew.slice(0, targetPerTopic);
            finalSelection.push(...takeNew);
            
            // Sobrou espaço na meta desse tópico?
            const needed = targetPerTopic - takeNew.length;
            
            // 2. Se precisou, completa com VELHAS do mesmo tópico
            if (needed > 0) {
                const shuffledOld = oldQs.sort(() => 0.5 - Math.random());
                const takeOld = shuffledOld.slice(0, needed);
                finalSelection.push(...takeOld);
                
                // O que sobrou de velhas vai pro backup
                backupPool.push(...shuffledOld.slice(needed));
            } else {
                 // Se não precisou de velhas, elas vão pro backup
                 backupPool.push(...oldQs);
            }
            // As novas que sobraram tbm vão pro backup
            backupPool.push(...shuffledNew.slice(targetPerTopic));
        });

        // 3. Compensação Final (Se a soma de todos ainda não bateu o limite global)
        // Ex: Pediu 10, mas um tópico só tinha 1 questão total. Faltou 1.
        if (finalSelection.length < limit && backupPool.length > 0) {
            const missing = limit - finalSelection.length;
            // No backup, priorizamos NOVAS de outros tópicos, depois VELHAS
            // Ordena: Novas (não excluídas) primeiro
            backupPool.sort((a, b) => {
                const aIsOld = excludedIds.has(a.id);
                const bIsOld = excludedIds.has(b.id);
                return aIsOld === bIsOld ? 0.5 - Math.random() : aIsOld ? 1 : -1;
            });
            finalSelection.push(...backupPool.slice(0, missing));
        }

        // Embaralha tudo para não ficar agrupado por tema
        finalSelection = finalSelection.sort(() => 0.5 - Math.random()).slice(0, limit);

    } else {
        // --- MODO 2: GERAL/ALEATÓRIO (Prioriza Novas Globalmente) ---
        const newQs = validQuestionsPool.filter(q => !excludedIds.has(q.id));
        const oldQs = validQuestionsPool.filter(q => excludedIds.has(q.id));
        
        // Pega todas as novas possíveis até o limite
        finalSelection = newQs.sort(() => 0.5 - Math.random()).slice(0, limit);
        
        // Se faltou, completa com velhas
        if (finalSelection.length < limit) {
            const missing = limit - finalSelection.length;
            finalSelection.push(...oldQs.sort(() => 0.5 - Math.random()).slice(0, missing));
        }
        
        finalSelection = finalSelection.sort(() => 0.5 - Math.random());
    }

    setActiveExamData({ questionsData: finalSelection, answersData: {}, currentIndex: 0, id: Date.now() });
    handleViewSwitch('question_mode');
  };

  const handleExamPause = async (questions, answers, currentIndex, originId = null) => {
    const answeredCount = Object.keys(answers).length;
    if(user) {
        const simId = String(originId || Date.now());
        const simData = { 
            id: Number(simId), 
            date: new Date().toLocaleDateString('pt-BR'), 
            title: selectedArea ? `Simulado ${selectedArea.title}` : 'Simulado Misto',
            type: selectedArea ? 'Área Específica' : 'Misto', 
            status: 'open', 
            total: questions.length, 
            correct: 0, 
            progress: answeredCount, 
            areas: selectedArea ? [selectedArea.title] : ['Misto'], 
            questionIds: questions.map(q => q.id), 
            answersData: answers,
            lastIndex: currentIndex
        };
        await setDoc(doc(db, `users/${user.uid}/simulations`, simId), simData);
        // Toast ao invés de Modal de Sucesso
        addToast('Progresso Salvo', 'Você pode continuar depois em "Meus Simulados".', 'success');
        setCurrentView('home'); 
        examStateRef.current = null;
    }
  };

  const handleExamFinish = async (results, questions, answers, originId = null) => {
    const answeredCount = Object.keys(answers).length;
    const simId = String(originId || Date.now());
    setLastExamResults({ id: Number(simId), total: questions.length, correct: results.correct, answered: answeredCount });

    if(user) {
        const simData = { 
            id: Number(simId), 
            date: new Date().toLocaleDateString('pt-BR'), 
            title: selectedArea ? `Simulado ${selectedArea.title}` : 'Simulado Misto',
            type: selectedArea ? 'Área Específica' : 'Misto', 
            status: 'finished', 
            total: questions.length, 
            correct: results.correct, 
            progress: answeredCount, 
            areas: selectedArea ? [selectedArea.title] : ['Misto'], 
            questionIds: questions.map(q => q.id), 
            answersData: answers 
        };
        await setDoc(doc(db, `users/${user.uid}/simulations`, simId), simData);

        const today = new Date().toLocaleDateString('pt-BR');
        const lastDate = userStats.lastStudyDate;
        let newStreak = userStats.streak || 0;
        let newQuestionsToday = userStats.questionsToday || 0;

        if (lastDate !== today) newQuestionsToday = 0;
        newQuestionsToday += answeredCount;

        if (lastDate !== today) {
            if (checkIsYesterday(lastDate)) newStreak += 1;
            else newStreak = 1;
        }

        const newStats = {
            questionsToday: newQuestionsToday,
            totalAnswers: (userStats.totalAnswers || 0) + answeredCount,
            correctAnswers: (userStats.correctAnswers || 0) + results.correct,
            streak: newStreak,
            lastStudyDate: today 
        };
        await setDoc(doc(db, "users", user.uid, "stats", "main"), newStats, { merge: true });
    }
    setCurrentView('simulation_summary');
    examStateRef.current = null;
  };

  const handleDeleteSimulation = async (simId) => {
    if (!user) return;
    try {
        await deleteDoc(doc(db, `users/${user.uid}/simulations`, String(simId)));
        addToast('Excluído', 'Simulado removido com sucesso.', 'success');
    } catch (error) {
        console.error("Erro ao excluir simulado:", error);
        addToast('Erro', 'Não foi possível excluir o simulado.', 'error');
    }
  };

  const handleResumeExam = (simId) => {
    const sim = mySimulations.find(s => s.id === simId);
    if (!sim) return;
    let questions = [];
    if (sim.questionsData) {
        questions = sim.questionsData; 
    } else if (sim.questionIds) {
        questions = sim.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean);
    }
    if (questions.length === 0) {
        addToast('Erro', 'Não foi possível carregar as questões. Tente novamente.', 'error');
        return;
    }
    setActiveExamData({ questionsData: questions, answersData: sim.answersData || {}, currentIndex: sim.lastIndex || 0, id: sim.id });
    handleViewSwitch('question_mode');
  };

  const handleResetQuestions = async () => {
     if(!user) return;
     const q = query(collection(db, `users/${user.uid}/simulations`));
     const snapshot = await getDocs(q);
     const batch = writeBatch(db);
     snapshot.docs.forEach((doc) => batch.delete(doc.ref));
     await batch.commit();
     await setDoc(doc(db, "users", user.uid, "stats", "main"), { totalAnswers: 0, correctAnswers: 0 }, { merge: true });
     addToast('Resetado', 'Histórico de questões resetado.', 'success');
  };

  const handleResetHistory = async () => {
    if(!user) return;
    const q = query(collection(db, `users/${user.uid}/simulations`));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    await setDoc(doc(db, "users", user.uid, "stats", "main"), { questionsToday: 0, correctAnswers: 0, totalAnswers: 0, streak: 0, lastStudyDate: null });
    addToast('Apagado', 'Todo o histórico foi apagado.', 'success');
  };

  const getSimulationForReview = () => {
      const sim = mySimulations.find(s => s.id === selectedSimulationId);
      if(!sim) return null;
      if(!sim.questionsData && sim.questionIds) {
          return { ...sim, questionsData: sim.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) };
      }
      return sim;
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home': return <HomeView user={user} userStats={userStats} dailyGoal={dailyGoal} accuracy={accuracy} streak={streak} dynamicAreas={dynamicAreas} setIsGoalModalOpen={setIsGoalModalOpen} setSelectedArea={setSelectedArea} setCurrentView={handleViewSwitch} realStats={realStats} />;
      case 'my_simulations': return <MySimulationsView simulations={mySimulations} onCreateNew={() => handleViewSwitch('general_exam_setup')} onResume={handleResumeExam} onViewResults={(id) => { setSelectedSimulationId(id); handleViewSwitch('review_mode'); }} onDelete={handleDeleteSimulation} />;
      case 'review_mode': return <ReviewExamView simulation={getSimulationForReview()} onBack={() => handleViewSwitch('my_simulations')} user={user} addToast={addToast} />;
      case 'general_exam_setup': return <GeneralExamSetupView onBack={() => handleViewSwitch('my_simulations')} onLaunchExam={(topics, count, allowRepeats) => handleLaunchExam({ topics: topics }, count, allowRepeats)} areasBase={areasBase} excludedIds={excludedIds} allQuestions={allQuestions} />;
      case 'area_hub': return <AreaHubView area={selectedArea} stats={realStats.byArea[selectedArea.title] || { total: 0, correct: 0 }} worstTopics={calculateTopicPerformance(mySimulations, selectedArea.title, allQuestions)} onBack={() => handleViewSwitch('home')} onStartTraining={() => handleViewSwitch('topic_selection')} />;
      case 'topic_selection': return <TopicSelectionView area={selectedArea} onBack={() => handleViewSwitch('area_hub')} onLaunchExam={(topics, count, allowRepeats) => handleLaunchExam({ areaId: selectedArea.id, topics: topics }, count, allowRepeats)} excludedIds={excludedIds} allQuestions={allQuestions} />;
      case 'question_mode': return <QuestionView area={selectedArea} initialData={activeExamData} user={user} onExit={() => handleViewSwitch('home')} onFinish={handleExamFinish} onPause={handleExamPause} onUpdateProgress={handleUpdateProgress} addToast={addToast} />;
      case 'simulation_summary': return <SimulationSummaryView results={lastExamResults} onHome={() => handleViewSwitch('home')} onNewExam={() => handleViewSwitch('general_exam_setup')} onReview={() => { setSelectedSimulationId(lastExamResults?.id); handleViewSwitch('review_mode'); }} />;
      case 'settings': return <SettingsView user={user} onBack={() => handleViewSwitch('home')} onResetQuestions={handleResetQuestions} onResetHistory={handleResetHistory} addToast={addToast} />;
      case 'performance': return <PerformanceView detailedStats={realStats} simulations={mySimulations} allQuestions={allQuestions} onLaunchExam={(topics, count) => handleLaunchExam({ topics: topics }, count, true)} onBack={() => handleViewSwitch('home')} />;
      case 'add_question': return <AddQuestionView onBack={() => handleViewSwitch('home')} addToast={addToast} />;
      default: return <div>Erro: View não encontrada</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-slate-800 relative">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {isGoalModalOpen && <GoalModal currentGoal={dailyGoal} onSave={handleSaveGoal} onClose={() => setIsGoalModalOpen(false)} />}
      {notification && <NotificationModal title={notification.title} message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      {/* MODAL DE SAÍDA SEGURA */}
      {isExitModalOpen && (
          <ExitConfirmationModal 
              onClose={() => setIsExitModalOpen(false)} 
              onConfirmExit={confirmExitWithoutSaving}
              onSaveAndExit={handleSaveAndExitFromModal}
          />
      )}

      <Sidebar 
          currentView={currentView} 
          setCurrentView={handleViewSwitch} 
          onLogout={onLogout} 
          user={user} 
          collapsed={isSidebarCollapsed}
          toggleCollapsed={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <MobileHeader isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      {isMobileMenuOpen && <MobileMenu currentView={currentView} setCurrentView={handleViewSwitch} onLogout={onLogout} user={user} setIsMobileMenuOpen={setIsMobileMenuOpen} />}
      
      <main className={`flex-1 p-6 pt-24 md:pt-6 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {renderContent()}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTES UI (Sidebar, etc) ---
function Sidebar({ currentView, setCurrentView, onLogout, user, collapsed, toggleCollapsed }) {
    return (
        <aside className={`hidden md:flex flex-col bg-white border-r border-gray-200 h-screen fixed z-20 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
            <div className={`p-6 border-b border-gray-100 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
                {!collapsed && (
                    <h1 className="text-2xl font-bold text-blue-700 flex items-center gap-2 overflow-hidden whitespace-nowrap">
                        <Map className="w-8 h-8" /> MedMaps
                    </h1>
                )}
                {collapsed && <Map className="w-8 h-8 text-blue-700" />}
            </div>

            <nav className="flex-1 p-4 space-y-2">
                <SidebarItem icon={BookOpen} label="Banco de Questões" active={['home', 'area_hub', 'topic_selection'].includes(currentView)} onClick={() => setCurrentView('home')} collapsed={collapsed} />
                <SidebarItem icon={CheckCircle} label="Meus Simulados" active={['my_simulations', 'general_exam_setup', 'review_mode'].includes(currentView)} onClick={() => setCurrentView('my_simulations')} collapsed={collapsed} />
                <SidebarItem icon={BarChart2} label="Desempenho" active={currentView === 'performance'} onClick={() => setCurrentView('performance')} collapsed={collapsed} />
                {user.role === 'admin' && (
                    <>
                        <div className={`mt-4 mb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider ${collapsed ? 'text-center' : ''}`}>
                            {collapsed ? 'ADM' : 'Administração'}
                        </div>
                        <SidebarItem icon={PlusCircle} label="Adicionar Questões" active={currentView === 'add_question'} onClick={() => setCurrentView('add_question')} collapsed={collapsed} />
                        <SidebarItem icon={Brain} label="MedImport AI" onClick={() => window.location.href = '/import.html'} collapsed={collapsed} />
                        <SidebarItem icon={Database} label="MedManager" onClick={() => { if(window) window.location.href = '/manager.html'; }} collapsed={collapsed} />
                    </>
                )}
            </nav>

            <div className="p-4 border-t border-gray-100 space-y-2">
                 <button 
                    onClick={toggleCollapsed}
                    className={`flex items-center gap-3 px-4 py-3 w-full text-left text-gray-500 hover:bg-gray-100 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? "Expandir Menu" : "Recolher Menu"}
                >
                    {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    {!collapsed && <span className="font-medium">Recolher</span>}
                </button>

                <SidebarItem icon={Settings} label="Configurações" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} collapsed={collapsed} />
                <button 
                    onClick={onLogout} 
                    className={`flex items-center gap-3 px-4 py-3 w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors mt-2 ${collapsed ? 'justify-center' : ''}`}
                    title="Sair"
                >
                    <LogOut size={20} /> 
                    {!collapsed && <span className="font-medium">Sair</span>}
                </button>
            </div>
        </aside>
    )
}

function MobileHeader({ isMobileMenuOpen, setIsMobileMenuOpen }) { return (<div className="md:hidden fixed top-0 w-full bg-white z-50 border-b border-gray-200 p-4 flex justify-between items-center shadow-sm"><h1 className="text-xl font-bold text-blue-700 flex items-center gap-2"><Map className="w-6 h-6" />MedMaps</h1><button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-gray-100 rounded-lg">{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button></div>); }
function MobileMenu({ currentView, setCurrentView, onLogout, user, setIsMobileMenuOpen }) { return (<div className="md:hidden fixed inset-0 z-40 bg-white pt-24 px-6 overflow-y-auto animate-in slide-in-from-top-10 duration-200"><nav className="flex flex-col space-y-2"><SidebarItem icon={BookOpen} label="Banco de Questões" active={['home', 'area_hub', 'topic_selection'].includes(currentView)} onClick={() => { setCurrentView('home'); setIsMobileMenuOpen(false); }} /><SidebarItem icon={CheckCircle} label="Meus Simulados" active={['my_simulations', 'general_exam_setup', 'review_mode'].includes(currentView)} onClick={() => { setCurrentView('my_simulations'); setIsMobileMenuOpen(false); }} /><SidebarItem icon={BarChart2} label="Desempenho" active={currentView === 'performance'} onClick={() => { setCurrentView('performance'); setIsMobileMenuOpen(false); }} />{user.role === 'admin' && (<><SidebarItem icon={PlusCircle} label="Adicionar Questões" active={currentView === 'add_question'} onClick={() => { setCurrentView('add_question'); setIsMobileMenuOpen(false); }} /><SidebarItem icon={Brain} label="MedImport AI" onClick={() => window.location.href = '/import.html'} /><SidebarItem icon={Database} label="MedManager" onClick={() => { if(window) window.location.href = '/manager.html'; }} /></>)}<div className="h-px bg-gray-100 my-4"></div><SidebarItem icon={Settings} label="Configurações" active={currentView === 'settings'} onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }} /><button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><LogOut size={20} /> <span className="font-medium">Sair</span></button></nav></div>); }

function SidebarItem({ icon: Icon, label, active = false, onClick, collapsed = false }) { 
    return (
        <button 
            onClick={onClick} 
            className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg transition-all 
                ${active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}
                ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? label : undefined}
        >
            <Icon size={20} className={active ? 'text-blue-700' : 'text-gray-400'} />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
        </button>
    ); 
}
function StatCard({ title, value, target, sub, color, bg, icon, onClick, editable }) { return (<div onClick={onClick} className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:border-blue-300 group' : ''}`}><div><p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">{title}{editable && <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />}</p><div className="flex items-baseline gap-2"><h3 className="text-2xl font-bold text-slate-900">{value}</h3>{target && <span className="text-sm text-gray-400 font-medium">{target}</span>}</div>{sub && <p className={`text-xs font-medium mt-1 ${color}`}>{sub}</p>}</div><div className={`p-3 rounded-xl ${bg} ${color}`}>{icon}</div></div>); }
function AreaCard({ area, onClick }) { return (<div onClick={onClick} className={`group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden hover:border-blue-300`}><div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110`}><area.icon size={100} className={area.color.split(' ')[1]} /></div><div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${area.color}`}><area.icon size={28} /></div><h4 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">{area.title}</h4><p className="text-sm text-slate-500 mb-4">{area.count}</p><div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden"><div className={`h-1.5 rounded-full ${area.color.split(' ')[0].replace('bg-', 'bg-')}`} style={{ width: `${area.progress}%` }} ></div></div><p className="text-xs text-slate-400 mt-2 text-right">{area.progress}% Concluído</p></div>); }

// --- VIEWS DETALHADAS ---
function HomeView({ user, userStats, dailyGoal, accuracy, streak, dynamicAreas, setIsGoalModalOpen, setSelectedArea, setCurrentView, realStats }) {
    return (
        <>
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500"><div><h2 className="text-2xl font-bold text-slate-900">Olá, {user.name}! 👋</h2><p className="text-slate-500">Vamos praticar hoje? Escolha uma área para começar.</p></div></header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <StatCard title="Questões Hoje" value={userStats.questionsToday || 0} target={`/ ${dailyGoal}`} color="text-blue-600" bg="bg-blue-50" icon={<CheckCircle size={24} />} onClick={() => setIsGoalModalOpen(true)} editable={true} />
              <StatCard title="Taxa de Acerto" value={`${accuracy}%`} sub={realStats.totalQuestions > 0 ? `${realStats.totalCorrect}/${realStats.totalQuestions} Acertos` : "Sem dados"} color="text-emerald-600" bg="bg-emerald-50" icon={<BarChart2 size={24} />} />
              <StatCard title="Sequência" value={`${streak} Dia${streak !== 1 ? 's' : ''}`} sub="Continue assim!" color="text-orange-600" bg="bg-orange-50" icon={<Activity size={24} />} />
            </div>
            <section className="animate-in fade-in slide-in-from-bottom-8 duration-700"><div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold text-slate-800">Grandes Áreas</h3></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">{dynamicAreas.map((area) => (<AreaCard key={area.id} area={area} onClick={() => { setSelectedArea(area); setCurrentView('area_hub'); }} />))}</div></section>
        </>
    )
}

function AreaHubView({ area, stats, worstTopics, onBack, onStartTraining }) {
    if (!area) return null;
    const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    return (
      <div className="animate-in fade-in slide-in-from-right-8 duration-500">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 mb-6 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Voltar para o início</button>
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm mb-8 relative overflow-hidden"><div className={`absolute top-0 right-0 p-8 opacity-10 ${area.color.split(' ')[1]}`}><area.icon size={200} /></div><div className="relative z-10"><div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${area.color}`}><area.icon size={32} /></div><h1 className="text-3xl font-bold text-slate-900 mb-2">{area.title}</h1><p className="text-slate-500 text-lg max-w-2xl">Domine os principais conceitos de {area.title} com nosso banco de {area.count} atualizado.</p><div className="flex flex-wrap gap-4 mt-8"><button onClick={onStartTraining} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-blue-200 transform hover:-translate-y-1"><Play size={24} fill="currentColor" /> Iniciar Treinamento</button></div></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><BarChart2 size={20} className="text-emerald-500" /> Seu Desempenho</h3>{stats.total > 0 ? (<div className="text-center py-8"><div className="text-4xl font-bold text-slate-800 mb-2">{percentage}%</div><p className="text-gray-500">de acertos em {stats.total} questões</p><div className="w-full bg-gray-100 rounded-full h-3 mt-4 overflow-hidden"><div className="bg-emerald-500 h-full rounded-full" style={{ width: `${percentage}%` }}></div></div></div>) : (<div className="h-40 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-dashed border-gray-200">Faça questões para ver seu gráfico</div>)}</div><div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingDown size={20} className="text-red-500" /> Seus Piores Temas</h3><ul className="space-y-3">{worstTopics.length > 0 ? (worstTopics.map((theme) => (<li key={theme.name} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100"><div><span className="text-slate-800 font-medium block">{theme.name}</span><span className="text-xs text-red-600 font-semibold">{theme.correct} de {theme.total} acertos</span></div><span className="text-sm font-bold text-red-700">{theme.percentage}%</span></li>))) : (<div className="h-40 bg-gray-50 rounded-xl flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 text-center p-4"><p>Sem dados suficientes.</p><span className="text-xs mt-1">Complete simulados para descobrir seus pontos fracos.</span></div>)}</ul></div></div>
      </div>
    );
}

function GeneralExamSetupView({ onBack, onLaunchExam, areasBase, excludedIds, allQuestions }) {
    const [expandedArea, setExpandedArea] = useState(null);
    const [selectedTopics, setSelectedTopics] = useState([]); 
    const [desiredQuestions, setDesiredQuestions] = useState(10);
    
    const toggleArea = (areaId) => setExpandedArea(expandedArea === areaId ? null : areaId);
    const toggleTopic = (areaId, topicName) => { const id = `${areaId}-${topicName}`; setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]); };
    const allTopicIds = useMemo(() => { const ids = []; areasBase.forEach(area => { const list = themesMap[area.id] || []; list.forEach(theme => ids.push(`${area.id}-${theme}`)); }); return ids; }, []);
    const toggleSelectAll = () => { if (selectedTopics.length === allTopicIds.length) { setSelectedTopics([]); } else { setSelectedTopics(allTopicIds); } };
    
    // Cálculo do Máximo Disponível (Total Global dos temas selecionados)
    const maxAvailable = useMemo(() => { 
        let total = 0; 
        selectedTopics.forEach(item => { 
            const parts = item.split('-'); 
            const areaId = parts[0]; 
            const topicName = parts.slice(1).join('-'); 
            const areaTitle = areaNameMap[areaId]; 
            // Agora conta o TOTAL do banco, pois podemos usar repetidas se faltar inéditas
            const totalInDb = allQuestions.filter(q => q.area === areaTitle && q.topic === topicName).length; 
            total += totalInDb; 
        }); 
        return total; 
    }, [selectedTopics, allQuestions]);
    
    const MAX_QUESTIONS_LIMIT = 100;
    const effectiveMax = Math.min(maxAvailable, MAX_QUESTIONS_LIMIT);

    useEffect(() => { 
        setDesiredQuestions(prev => Math.min(prev, effectiveMax));
    }, [effectiveMax]);

    const handleStart = () => { 
        const topicsList = selectedTopics.map(t => { const parts = t.split('-'); return parts.slice(1).join('-'); }); 
        onLaunchExam(topicsList, desiredQuestions); 
    }
    
    return (
      <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto pb-48">
        <div className="flex items-center justify-between mb-8"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Cancelar</button><div className="text-right"><span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Simulado Personalizado</span></div></div>
        <div className="text-center mb-10"><h1 className="text-3xl font-bold text-slate-900 mb-3">Monte seu Simulado</h1><p className="text-slate-500">Selecione temas de diferentes áreas para praticar de forma mista.</p></div>
        <div className="mb-6 flex justify-end"><button onClick={toggleSelectAll} className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">{selectedTopics.length === allTopicIds.length ? (<><Square size={18} /> Desmarcar Tudo</>) : (<><CheckSquare size={18} /> Selecionar Tudo</>)}</button></div>
        <div className="space-y-4 mb-10">{areasBase.map(area => { const themes = getThemesForArea(area.id, excludedIds, allQuestions); const isExpanded = expandedArea === area.id; const selectedCount = themes.filter(t => selectedTopics.includes(`${area.id}-${t.name}`)).length; const areaTopicIds = themes.map(t => `${area.id}-${t.name}`); const isAreaFullySelected = areaTopicIds.length > 0 && areaTopicIds.every(id => selectedTopics.includes(id)); const handleAreaToggle = (e) => { e.stopPropagation(); if (isAreaFullySelected) { setSelectedTopics(prev => prev.filter(id => !areaTopicIds.includes(id))); } else { setSelectedTopics(prev => { const newSet = new Set([...prev, ...areaTopicIds]); return Array.from(newSet); }); } }; return (<div key={area.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"><div onClick={() => toggleArea(area.id)} className={`p-5 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50 border-b border-gray-100' : ''}`}><div className="flex items-center gap-4"><div className={`p-2 rounded-lg ${area.color} bg-opacity-10`}><area.icon size={24} /></div><div><h3 className="font-bold text-slate-900">{area.title}</h3><p className="text-xs text-gray-500">{selectedCount} temas selecionados</p></div></div><div className="flex items-center gap-3"><button onClick={handleAreaToggle} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors z-10 ${isAreaFullySelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{isAreaFullySelected ? 'Todos' : 'Selecionar'}</button>{isExpanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}</div></div>{isExpanded && (<div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 bg-white animate-in slide-in-from-top-2">{themes.map((theme, i) => { const uniqueId = `${area.id}-${theme.name}`; const isSelected = selectedTopics.includes(uniqueId); return (<div key={i} onClick={() => toggleTopic(area.id, theme.name)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}><div className={isSelected ? 'text-blue-600' : 'text-gray-300'}>{isSelected ? <CheckSquare size={20} /> : <Square size={20} />}</div><div className="flex flex-col"><span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-slate-600'}`}>{theme.name}</span><span className="text-xs text-gray-400">{theme.total} questões</span></div></div>); })}</div>)}</div>); })}</div>
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:pl-64"><div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start"><div><label className="text-xs text-gray-500 block mb-1 font-bold uppercase tracking-wide">Quantidade</label><div className="flex items-center gap-2"><input type="number" min="1" max={effectiveMax} value={desiredQuestions} onChange={(e) => setDesiredQuestions(Math.min(effectiveMax, Math.max(1, parseInt(e.target.value) || 0)))} className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" /><span className="text-xs text-gray-400">de {maxAvailable} {maxAvailable > MAX_QUESTIONS_LIMIT && '(Máx 100)'}</span></div></div></div><button disabled={selectedTopics.length === 0 || maxAvailable === 0} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200" onClick={handleStart}>Começar Agora <ArrowRight size={20} /></button></div></div>
      </div>
    );
}

function TopicSelectionView({ area, onBack, onLaunchExam, excludedIds, allQuestions }) {
    const themes = useMemo(() => { return getThemesForArea(area.id, excludedIds, allQuestions); }, [area, allQuestions, excludedIds]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [desiredQuestions, setDesiredQuestions] = useState(5);
    
    const toggleTopic = (id) => setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    const selectAll = () => selectedTopics.length === themes.length ? setSelectedTopics([]) : setSelectedTopics(themes.map(t => t.id));
    
    const maxAvailable = useMemo(() => { 
        let sum = 0; 
        themes.forEach(t => { 
            // Usa o TOTAL (t.total) ao invés de só inéditas (t.count)
            if(selectedTopics.includes(t.id)) sum += t.total; 
        }); 
        return sum; 
    }, [selectedTopics, themes]);
    
    const MAX_QUESTIONS_LIMIT = 100;
    const effectiveMax = Math.min(maxAvailable, MAX_QUESTIONS_LIMIT);

    useEffect(() => { 
        setDesiredQuestions(prev => Math.min(prev, effectiveMax));
    }, [effectiveMax]);

    const handleStart = () => { 
        const selectedNames = themes.filter(t => selectedTopics.includes(t.id)).map(t => t.name); 
        onLaunchExam(selectedNames, desiredQuestions); 
    };
    
    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto pb-48">
            <div className="flex items-center justify-between mb-8"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Voltar</button><div className="text-right"><span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{area.title}</span></div></div>
            <div className="text-center mb-10"><h1 className="text-3xl font-bold text-slate-900 mb-3">O que vamos estudar hoje?</h1><p className="text-slate-500">Selecione os temas que deseja incluir no seu simulado.</p></div>
             <div className="mb-6 flex justify-end"><button onClick={selectAll} className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">{selectedTopics.length === themes.length ? (<><Square size={18} /> Desmarcar Todos</>) : (<><CheckSquare size={18} /> Selecionar Todos</>)}</button></div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8"><div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100"><div className="divide-y divide-gray-100">{themes.slice(0, Math.ceil(themes.length / 2)).map(theme => <TopicItem key={theme.id} theme={theme} count={theme.total} isSelected={selectedTopics.includes(theme.id)} onToggle={() => toggleTopic(theme.id)} />)}</div><div className="divide-y divide-gray-100">{themes.slice(Math.ceil(themes.length / 2)).map(theme => <TopicItem key={theme.id} theme={theme} count={theme.total} isSelected={selectedTopics.includes(theme.id)} onToggle={() => toggleTopic(theme.id)} />)}</div></div></div>
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:pl-64"><div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start"><div><label className="text-xs text-gray-500 block mb-1 font-bold uppercase tracking-wide">Quantidade</label><div className="flex items-center gap-2"><input type="number" min="1" max={effectiveMax} value={desiredQuestions} onChange={(e) => setDesiredQuestions(Math.min(effectiveMax, Math.max(1, parseInt(e.target.value) || 0)))} className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" /><span className="text-xs text-gray-400">de {maxAvailable} {maxAvailable > MAX_QUESTIONS_LIMIT && '(Máx 100)'}</span></div></div></div><button disabled={selectedTopics.length === 0 || maxAvailable === 0} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200" onClick={handleStart}>Começar Agora <ArrowRight size={20} /></button></div></div>
        </div>
    );
}
function TopicItem({ theme, isSelected, onToggle, count }) { return (<div onClick={onToggle} className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}><div className="flex items-center gap-4"><div className={`transition-colors ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>{isSelected ? <CheckSquare size={24} fill="currentColor" className="text-blue-200" /> : <Square size={24} />}</div><div className="flex flex-col"><span className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{theme.name}</span><span className="text-xs text-gray-400">{count} questões disponíveis</span></div></div></div>); }

function ReviewExamView({ simulation, onBack, allQuestions, user, addToast }) { 
    if (!simulation) return <div>Carregando...</div>;
    const questions = simulation.questionsData || (simulation.questionIds ? simulation.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) : []);
    const userAnswers = simulation.answersData || {};

    const [reportModalConfig, setReportModalConfig] = useState({ isOpen: false, type: 'error', questionId: null });

    const openReportModal = (questionId, type) => {
        setReportModalConfig({ isOpen: true, type, questionId });
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto">
          {reportModalConfig.isOpen && (
              <ReportModal isOpen={true} onClose={() => setReportModalConfig({ ...reportModalConfig, isOpen: false })} questionId={reportModalConfig.questionId} userId={user?.uid} type={reportModalConfig.type} addToast={addToast} />
          )}
          <div className="flex items-center justify-between mb-8"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Voltar para Meus Simulados</button><div className="text-right"><span className="text-sm font-bold text-slate-500 bg-gray-100 px-3 py-1 rounded-full">Revisão: {simulation.title}</span></div></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-900">Resumo do Desempenho</h2><p className="text-slate-500">Data: {simulation.date}</p></div><div className="text-right"><div className="text-3xl font-bold text-blue-600">{simulation.correct}/{simulation.total}</div><div className="text-sm font-medium text-gray-400">Acertos</div></div></div>
          <div className="space-y-6">{questions.map((q, index) => { 
              const userAnswer = userAnswers[index]; 
              const isCorrect = userAnswer === q.correctOptionId; 
              return (
                <div key={q.id} className={`bg-white rounded-2xl border overflow-hidden ${isCorrect ? 'border-emerald-200' : 'border-red-200'}`}>
                    <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <div className="flex items-center gap-2"><h3 className={`font-bold flex items-center gap-2 ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>{isCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />} Questão {index + 1}</h3><span className="text-sm font-medium opacity-70">{q.topic}</span></div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 bg-white/50 px-2 py-1 rounded-lg border border-black/5 font-bold uppercase tracking-wider"><span>ID</span><CopyButton text={q.id} className="text-gray-400 hover:text-blue-600" /></div>
                             <button onClick={() => openReportModal(q.id, 'suggestion')} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors" title="Sugerir Edição"><Edit2 size={16} /></button>
                            <button onClick={() => openReportModal(q.id, 'error')} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Reportar Erro"><AlertTriangle size={16} /></button>
                        </div>
                    </div>
                    <div className="p-6">
                        <p className="text-slate-800 mb-4">{q.text}</p>
                        <div className="space-y-2 mb-4">{q.options.map(opt => { let optClass = "p-3 rounded-lg border border-gray-100 text-gray-600"; if (opt.id === q.correctOptionId) optClass = "p-3 rounded-lg border border-emerald-500 bg-emerald-50 text-emerald-800 font-bold"; else if (opt.id === userAnswer && !isCorrect) optClass = "p-3 rounded-lg border border-red-500 bg-red-50 text-red-800 font-bold"; return (<div key={opt.id} className={optClass}><span className="uppercase mr-2">{opt.id})</span> {opt.text}</div>); })}</div>
                        <div className="bg-gray-50 p-4 rounded-xl text-sm text-slate-600"><span className="font-bold block mb-1">Comentário:</span>{q.explanation}</div>
                    </div>
                </div>
              ); 
          })}</div>
        </div>
    );
}

function MySimulationsView({ simulations, onCreateNew, onResume, onViewResults, onDelete }) {
    const [activeTab, setActiveTab] = useState('finished');
    const [simToDelete, setSimToDelete] = useState(null);
    const openSims = simulations.filter(s => s.status === 'open');
    const finishedSims = simulations.filter(s => s.status === 'finished');
    const confirmDelete = () => { if(simToDelete && onDelete) { onDelete(simToDelete.id); setSimToDelete(null); } };
    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto">
          {simToDelete && (<NotificationModal title="Excluir Simulado?" message="Todo o progresso será perdido." type="error" isDangerous={true} confirmText="Sim, Excluir" cancelText="Cancelar" onClose={() => setSimToDelete(null)} onConfirm={confirmDelete} />)}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4"><div><h1 className="text-3xl font-bold text-slate-900 mb-2">Meus Simulados</h1><p className="text-slate-500">Gerencie seus treinos e acompanhe seu histórico.</p></div><button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all"><Plus size={20} /> Novo Simulado</button></div>
          <div className="flex border-b border-gray-200 mb-6"><button onClick={() => setActiveTab('open')} className={`pb-3 px-6 font-medium text-sm transition-colors relative ${activeTab === 'open' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Em Andamento ({openSims.length}){activeTab === 'open' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}</button><button onClick={() => setActiveTab('finished')} className={`pb-3 px-6 font-medium text-sm transition-colors relative ${activeTab === 'finished' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Concluídos ({finishedSims.length}){activeTab === 'finished' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}</button></div>
          <div className="space-y-4">
            {activeTab === 'open' ? (openSims.length > 0 ? (openSims.map(sim => (<div key={sim.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><Clock size={24} /></div><div><h3 className="font-bold text-slate-900">{sim.title}</h3><div className="flex items-center gap-2 text-sm text-gray-500"><span>{sim.date}</span><span>•</span><span>{sim.type}</span></div></div></div><div className="flex items-center gap-4 md:gap-6"><div className="text-right hidden md:block"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Progresso</p><p className="font-bold text-slate-700">{sim.progress} / {sim.total}</p></div><button onClick={() => onResume(sim.id)} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors">Continuar <ArrowRight size={16} /></button><button onClick={() => setSimToDelete(sim)} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={20} /></button></div></div>))) : <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">Nenhum simulado em aberto</div>) : (finishedSims.length > 0 ? (finishedSims.map(sim => (<div key={sim.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-4 w-full md:w-auto"><div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle size={24} /></div><div><h3 className="font-bold text-slate-900">{sim.title}</h3><div className="flex items-center gap-2 text-sm text-gray-500"><span>{sim.date}</span><span>•</span><span>{sim.type}</span></div></div></div><div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-end"><div className="text-right md:mr-4"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nota</p><p className="font-bold text-emerald-600">{sim.correct} / {sim.total} ({Math.round((sim.correct/sim.total)*100)}%)</p></div><div className="flex gap-2"><button onClick={() => onViewResults(sim.id)} className="bg-white border border-gray-200 hover:bg-gray-50 text-slate-600 px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors"><Eye size={18} /> Detalhes</button><button onClick={() => setSimToDelete(sim)} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"><Trash2 size={20} /></button></div></div></div>))) : <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">Nenhum simulado concluído</div>)}
          </div>
        </div>
    );
}

function SimulationSummaryView({ results, onHome, onNewExam, onReview }) {
  if (!results) return null;
  const totalQuestions = results.total;
  const answeredCount = results.answered;
  const correctCount = results.correct;
  const wrongCount = answeredCount - correctCount;
  const unansweredCount = totalQuestions - answeredCount;
  const percentage = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  let message = "Bom começo!"; let colorClass = "text-blue-600";
  if (percentage >= 80) { message = "Excelente Desempenho!"; colorClass = "text-emerald-600"; } 
  else if (percentage < 50 && answeredCount > 0) { message = "Vamos reforçar os estudos?"; colorClass = "text-orange-600"; }
  else if (answeredCount === 0) { message = "Nenhuma questão respondida."; colorClass = "text-gray-500"; }

  return (
    <div className="max-w-3xl mx-auto pt-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center border border-gray-100">
        <div className="inline-flex p-4 rounded-full bg-gray-50 mb-6"><Activity size={48} className={colorClass} /></div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Simulado Finalizado</h2>
        <p className="text-slate-500 text-lg mb-8">{message}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="p-4 bg-gray-50 rounded-2xl"><div className="text-sm text-gray-500 mb-1 font-bold">Total</div><div className="text-2xl font-bold text-slate-800">{totalQuestions}</div></div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><div className="text-sm text-emerald-600 mb-1 font-bold">Acertos</div><div className="text-2xl font-bold text-emerald-700">{correctCount}</div></div>
            <div className="p-4 bg-red-50 rounded-2xl"><div className="text-sm text-red-600 mb-1 font-bold">Erros</div><div className="text-2xl font-bold text-red-700">{wrongCount}</div></div>
            <div className="p-4 bg-yellow-50 rounded-2xl"><div className="text-sm text-yellow-600 mb-1 font-bold">Nulas</div><div className="text-2xl font-bold text-yellow-700">{unansweredCount}</div></div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 mb-2 overflow-hidden"><div className={`h-4 rounded-full transition-all duration-1000 ${percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${percentage}%` }}></div></div>
        <p className="text-sm text-gray-400 font-medium mb-10 text-right">Aproveitamento (Respondidas): {percentage}%</p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button onClick={onHome} className="px-8 py-3.5 rounded-xl font-bold text-slate-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"><Home size={20} /> Voltar ao Início</button>
            <button onClick={onReview} className="px-8 py-3.5 rounded-xl font-bold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"><List size={20} /> Revisar Questões</button>
            <button onClick={onNewExam} className="px-8 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"><Play size={20} fill="currentColor" /> Novo Simulado</button>
        </div>
      </div>
    </div>
  );
}

function PerformanceView({ detailedStats, simulations, allQuestions, onLaunchExam, onBack }) {
    const [scope, setScope] = useState('Todas'); 
    const [topicSort, setTopicSort] = useState('worst'); 
    const [areaSort, setAreaSort] = useState('default');

    // Estado para o Modal de Treinamento
    const [trainModalOpen, setTrainModalOpen] = useState(false);
    const [trainQuantity, setTrainQuantity] = useState(10);
    const [selectedTrainTopics, setSelectedTrainTopics] = useState([]);

    const { totalQuestions, totalCorrect } = detailedStats;
    const globalPercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // --- 1. DADOS DOS ÚLTIMOS 7 DIAS ---
    const statsLast7Days = useMemo(() => {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        sevenDaysAgo.setHours(0,0,0,0);

        let total = 0;
        let correct = 0;

        simulations.forEach(sim => {
            if (sim.status !== 'finished' || !sim.answersData || !sim.date) return;
            const parts = sim.date.split('/');
            if(parts.length !== 3) return;
            const simDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            
            if (simDate >= sevenDaysAgo) {
                 const questions = sim.questionsData || (sim.questionIds ? sim.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) : []);
                 questions.forEach((q, idx) => {
                     const userAnswer = sim.answersData[idx];
                     if(userAnswer) {
                         total++;
                         if(userAnswer === q.correctOptionId) correct++;
                     }
                 });
            }
        });
        return { total, correct };
    }, [simulations, allQuestions]);

    // --- 2. DADOS DO GRÁFICO DE EVOLUÇÃO (Últimos 10 Simulados) ---
    const evolutionData = useMemo(() => {
        // Pega apenas simulados finalizados
        const finished = simulations.filter(s => s.status === 'finished');
        // Pega os 10 mais recentes (já estão ordenados por ID decrescente no Dashboard, então invertemos para o gráfico ficar cronológico)
        const last10 = finished.slice(0, 10).reverse();
        
        return last10.map(sim => {
            const pct = sim.total > 0 ? Math.round((sim.correct / sim.total) * 100) : 0;
            // Pega só dia/mês para caber no gráfico
            const shortDate = sim.date.split('/').slice(0, 2).join('/'); 
            return { id: sim.id, date: shortDate, percentage: pct, total: sim.total };
        });
    }, [simulations]);

    // --- 3. CÁLCULO BRUTO DE TODOS OS TÓPICOS ---
    const allTopicsRaw = useMemo(() => {
        if (simulations.length === 0 || allQuestions.length === 0) return [];

        const stats = {};
        simulations.forEach(sim => {
            if (sim.status !== 'finished' || !sim.answersData) return;
            const questions = sim.questionsData || (sim.questionIds ? sim.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) : []);
            
            questions.forEach((q, idx) => {
                const userAnswer = sim.answersData[idx];
                if (!userAnswer) return; 

                const isCorrect = userAnswer === q.correctOptionId;
                const key = q.topic;
                
                if (!stats[key]) {
                    stats[key] = { name: key, area: q.area, total: 0, correct: 0 };
                }
                stats[key].total++;
                if (isCorrect) stats[key].correct++;
            });
        });

        return Object.values(stats).map(item => ({
            ...item,
            percentage: Math.round((item.correct / item.total) * 100)
        }));
    }, [simulations, allQuestions]);

    // --- 4. FILTRO E ORDENAÇÃO ---
    const filteredTopics = useMemo(() => {
        let filtered = [...allTopicsRaw]; 

        if (scope !== 'Todas') {
            filtered = filtered.filter(t => t.area === scope);
        }

        filtered.sort((a, b) => {
            if (topicSort === 'best') return b.percentage - a.percentage || b.total - a.total;
            return a.percentage - b.percentage || b.total - a.total; 
        });

        return filtered.slice(0, 5);
    }, [allTopicsRaw, scope, topicSort]);

    const isAnalyzing = allQuestions.length === 0;

    // Ordenação das Áreas
    const sortedAreas = useMemo(() => {
        const areasWithStats = areasBase.map(area => {
            const st = detailedStats.byArea[area.title] || { total: 0, correct: 0 };
            const pct = st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0;
            return { ...area, stats: st, percentage: pct };
        });

        if (areaSort === 'best') return areasWithStats.sort((a, b) => b.percentage - a.percentage);
        if (areaSort === 'worst') return areasWithStats.sort((a, b) => a.percentage - b.percentage);
        return areasWithStats;
    }, [detailedStats, areaSort]);

    const handleOpenTrainModal = () => {
        setSelectedTrainTopics(filteredTopics.map(t => t.name));
        setTrainQuantity(10);
        setTrainModalOpen(true);
    };

    const handleConfirmTrain = () => {
        if (selectedTrainTopics.length === 0) return;
        onLaunchExam(selectedTrainTopics, trainQuantity);
        setTrainModalOpen(false);
    };

    const toggleTrainTopic = (topicName) => {
        setSelectedTrainTopics(prev => 
            prev.includes(topicName) ? prev.filter(t => t !== topicName) : [...prev, topicName]
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto pb-10 relative">
             
             {/* MODAL DE CONFIGURAÇÃO DO TREINO */}
             {trainModalOpen && (
                 <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                     <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 m-4">
                         <div className="flex justify-between items-center mb-6">
                             <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Target className="text-blue-600"/> Configurar Treino</h3>
                             <button onClick={() => setTrainModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                         </div>
                         
                         <div className="mb-6">
                             <label className="block text-sm font-bold text-slate-700 mb-3">Quantidade de Questões</label>
                             <div className="flex flex-wrap gap-2">
                                 {[10, 20, 30, 40, 50].map(qtd => (
                                     <button 
                                        key={qtd}
                                        onClick={() => setTrainQuantity(qtd)}
                                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${trainQuantity === qtd ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                     >
                                         {qtd}
                                     </button>
                                 ))}
                             </div>
                         </div>

                         <div className="mb-8">
                             <label className="block text-sm font-bold text-slate-700 mb-3">Temas Selecionados</label>
                             <div className="bg-gray-50 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 border border-gray-200">
                                 {filteredTopics.map(topic => (
                                     <div key={topic.name} onClick={() => toggleTrainTopic(topic.name)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white cursor-pointer transition-colors">
                                         <div className={selectedTrainTopics.includes(topic.name) ? "text-blue-600" : "text-gray-300"}>
                                             {selectedTrainTopics.includes(topic.name) ? <CheckSquare size={20} /> : <Square size={20} />}
                                         </div>
                                         <span className="text-sm font-medium text-slate-700">{topic.name}</span>
                                     </div>
                                 ))}
                             </div>
                         </div>

                         <button 
                             onClick={handleConfirmTrain}
                             disabled={selectedTrainTopics.length === 0}
                             className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                         >
                             <Play size={20} fill="currentColor" /> Começar Simulado
                         </button>
                     </div>
                 </div>
             )}

             <div className="flex items-center justify-between mb-8"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Voltar</button><h1 className="text-2xl font-bold text-slate-900">Desempenho Detalhado</h1></div>
             
             {/* STATS GERAIS E ÚLTIMOS 7 DIAS */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <h2 className="text-lg font-semibold text-slate-600 mb-2">Aproveitamento Geral</h2>
                    <div className="text-5xl font-bold text-blue-600 mb-2">{globalPercentage}%</div>
                    <p className="text-gray-400">{totalCorrect} acertos de {totalQuestions} questões</p>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-purple-600"><Calendar size={100} /></div>
                    <h2 className="text-lg font-semibold text-slate-600 mb-4 relative z-10">Últimos 7 Dias</h2>
                    <div className="flex justify-around items-center relative z-10">
                        <div>
                            <div className="text-3xl font-bold text-slate-800">{statsLast7Days.total}</div>
                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mt-1">Feitas</p>
                        </div>
                        <div className="w-px h-12 bg-gray-100"></div>
                        <div>
                            <div className="text-3xl font-bold text-emerald-600">{statsLast7Days.correct}</div>
                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mt-1">Acertos</p>
                        </div>
                    </div>
                </div>
             </div>

             {/* GRÁFICO DE EVOLUÇÃO (NOVO) */}
             {evolutionData.length > 1 && (
                 <div className="mb-8 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                     <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                        <TrendingUp size={24} className="text-blue-600" /> 
                        Evolução (Últimos Simulados)
                     </h2>
                     <div className="h-48 flex items-end justify-between gap-2 px-2">
                         {evolutionData.map((data, i) => (
                             <div key={data.id} className="flex flex-col items-center flex-1 group relative">
                                 {/* Tooltip */}
                                 <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs rounded py-1 px-2 pointer-events-none whitespace-nowrap z-10">
                                     {data.percentage}% ({data.total} Questões)
                                 </div>
                                 
                                 {/* Barra */}
                                 <div 
                                     className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 relative ${
                                        data.percentage >= 80 ? 'bg-emerald-400 group-hover:bg-emerald-500' : 
                                        data.percentage >= 50 ? 'bg-blue-400 group-hover:bg-blue-500' : 
                                        'bg-orange-400 group-hover:bg-orange-500'
                                     }`}
                                     style={{ height: `${Math.max(data.percentage, 5)}%` }} // Mínimo 5% para a barra aparecer
                                 ></div>
                                 
                                 {/* Data */}
                                 <span className="text-[10px] text-gray-400 mt-2 font-bold">{data.date}</span>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             {/* RADAR DE DESEMPENHO */}
             <div className="mb-10 bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                    <Activity size={24} className="text-blue-600" /> 
                    Radar de Desempenho
                </h2>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                    <div className="flex bg-gray-100/50 rounded-xl p-1 overflow-x-auto max-w-full no-scrollbar">
                        <button onClick={() => setScope('Todas')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${scope === 'Todas' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Todas</button>
                        {areasBase.map(a => (
                            <button key={a.id} onClick={() => setScope(a.title)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${scope === a.title ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{a.title}</button>
                        ))}
                    </div>

                    <button 
                        onClick={() => setTopicSort(prev => prev === 'worst' ? 'best' : 'worst')} 
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-colors ${topicSort === 'worst' ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}
                    >
                        {topicSort === 'worst' ? 
                            <><TrendingDown size={18}/> Piores temas</> : 
                            <><TrendingUp size={18}/> Melhores temas</>
                        }
                    </button>
                </div>

                <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden mb-6 min-h-[200px]">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-gray-400 gap-3">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                            <span className="font-medium animate-pulse">Carregando dados...</span>
                        </div>
                    ) : filteredTopics.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                            {filteredTopics.map((topic, i) => (
                                <div key={i} className="p-4 flex items-center justify-between hover:bg-white transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-800">{i + 1}. {topic.name}</span>
                                            {scope === 'Todas' && <span className="text-[10px] uppercase font-bold text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded">{topic.area}</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 font-medium">{topic.correct} acertos em {topic.total} questões</div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-lg font-bold ${topic.percentage >= 80 ? 'text-emerald-600' : topic.percentage < 50 ? 'text-red-600' : 'text-blue-600'}`}>{topic.percentage}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[200px] text-gray-400 italic p-4 text-center">
                            <p>Nenhum dado suficiente encontrado para esta seleção.</p>
                            <span className="text-xs mt-2">Resolva mais questões desta área para ver estatísticas.</span>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleOpenTrainModal}
                    disabled={isAnalyzing || filteredTopics.length === 0}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-transform active:scale-95 mx-auto md:mx-0"
                >
                    <PlayCircle size={20} />
                    Treinar estes temas
                </button>
             </div>

             {/* ÁREAS OVERVIEW */}
             <div className="mt-12">
                 <div className="flex items-center justify-between mb-6">
                     <h2 className="text-xl font-bold text-slate-800">Desempenho por Área</h2>
                     <select 
                        value={areaSort} 
                        onChange={(e) => setAreaSort(e.target.value)}
                        className="bg-white border border-gray-200 text-slate-600 text-sm font-bold py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                     >
                         <option value="default">Padrão</option>
                         <option value="best">Melhor Desempenho</option>
                         <option value="worst">Pior Desempenho</option>
                     </select>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {sortedAreas.map(area => (
                         <div key={area.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${area.color} bg-opacity-10`}><area.icon size={20} /></div>
                                <h3 className="font-bold text-slate-800">{area.title}</h3>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-2xl font-bold ${area.percentage >= 80 ? 'text-emerald-600' : area.percentage < 50 ? 'text-red-600' : 'text-slate-700'}`}>{area.percentage}%</span>
                                    <span className="text-xs text-gray-400">{area.stats.correct}/{area.stats.total}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div className={`h-2 rounded-full ${area.color.split(' ')[0].replace('bg-', 'bg-')}`} style={{ width: `${area.percentage}%` }} ></div>
                                </div>
                            </div>
                        </div>
                     ))}
                 </div>
             </div>
        </div>
    )
}

function SettingsView({ user, onBack, onResetQuestions, onResetHistory, addToast }) {
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const openModal = (type) => setModalConfig({ isOpen: true, type });
  const handleConfirm = () => { if (modalConfig.type === 'questions') onResetQuestions(); else if (modalConfig.type === 'history') onResetHistory(); setModalConfig({ ...modalConfig, isOpen: false }); };
  const [name, setName] = useState(user.name || '');
  const [whatsapp, setWhatsapp] = useState(user.whatsapp || ''); 
  const [isSaving, setIsSaving] = useState(false);
  
  // States para Link de Renovação
  const [adminRenewalLink, setAdminRenewalLink] = useState('');
  const [activeRenewalLink, setActiveRenewalLink] = useState('');
  const [isAdminSaving, setIsAdminSaving] = useState(false);

  const subDate = user.subscriptionUntil ? new Date(user.subscriptionUntil) : null;
  const daysLeft = subDate ? Math.ceil((subDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;
  const formattedDate = subDate ? subDate.toLocaleDateString('pt-BR') : 'N/A';
  const isExpired = subDate && new Date() > subDate;

  // Carregar o link de renovação do Firestore
  useEffect(() => {
    const fetchRenewalLink = async () => {
        try {
            const configDoc = await getDoc(doc(db, "config", "general"));
            if (configDoc.exists() && configDoc.data().renewalLink) {
                const link = configDoc.data().renewalLink;
                setActiveRenewalLink(link);
                if (user.role === 'admin') setAdminRenewalLink(link);
            }
        } catch (error) {
            console.error("Erro ao buscar link de renovação:", error);
        }
    };
    fetchRenewalLink();
  }, [user.role]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
        if(auth.currentUser) {
            await updateProfile(auth.currentUser, { displayName: name });
            await setDoc(doc(db, "users", user.uid), { name: name, whatsapp: whatsapp }, { merge: true });
            // Agora usa o addToast ao invés de state local
            addToast('Sucesso', 'Perfil atualizado com sucesso!', 'success');
        }
    } catch (error) { 
        console.error(error); 
        addToast('Erro', 'Erro ao atualizar perfil.', 'error');
    } finally { 
        setIsSaving(false); 
    }
  };

  const handleSavePassword = async (currentPassword, newPassword) => {
      setIsSaving(true);
      try {
          if (auth.currentUser) {
              const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
              await reauthenticateWithCredential(auth.currentUser, credential);
              await updatePassword(auth.currentUser, newPassword);
              addToast('Sucesso', 'Senha alterada com sucesso!', 'success');
              setIsPasswordModalOpen(false); 
          }
      } catch (error) { 
          console.error(error); 
          addToast('Erro', 'Erro ao alterar senha. Verifique a senha atual.', 'error');
      } finally { 
          setIsSaving(false); 
      }
  };

  const handleSaveAdminLink = async () => {
    setIsAdminSaving(true);
    try {
        await setDoc(doc(db, "config", "general"), { renewalLink: adminRenewalLink }, { merge: true });
        setActiveRenewalLink(adminRenewalLink);
        addToast('Sucesso', 'Link de renovação atualizado.', 'success');
    } catch (error) {
        console.error(error);
        addToast('Erro', 'Erro ao atualizar link.', 'error');
    } finally {
        setIsAdminSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-8"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2"/> Voltar</button><h1 className="text-3xl font-bold text-slate-900">Configurações</h1></div>
      {modalConfig.isOpen && (<NotificationModal title={modalConfig.type === 'questions' ? "Resetar Questões?" : "Apagar Tudo?"} message={modalConfig.type === 'questions' ? "Todas as questões voltarão a ser 'novas'. Seu histórico de acertos será apagado, mas sua sequência de dias (streak) será mantida." : "CUIDADO: Isso apagará TODO o seu histórico, incluindo sua sequência de dias (streak)."} isDangerous={true} confirmText={modalConfig.type === 'questions' ? "Sim, Resetar Questões" : "Sim, Apagar Tudo"} type="error" onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} onConfirm={handleConfirm} />)}
      {isPasswordModalOpen && (<ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} onSave={handleSavePassword} isLoading={isSaving} />)}
      
      <div className="space-y-6">
        
        {/* CARTÃO DE ASSINATURA */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-4 opacity-10 ${isExpired ? 'text-red-500' : 'text-emerald-500'}`}><CreditCard size={120} /></div>
            <div className="flex items-center gap-4 mb-6 relative z-10"><div className={`p-3 rounded-full ${isExpired ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}><Calendar size={24} /></div><div><h2 className="text-xl font-bold text-slate-900">Minha Assinatura</h2><p className="text-slate-500 text-sm">Detalhes do seu plano atual</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 mb-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p><div className={`text-lg font-bold flex items-center gap-2 ${isExpired ? 'text-red-600' : 'text-emerald-600'}`}>{isExpired ? <XCircle size={20} /> : <CheckCircle size={20} />}{isExpired ? 'Expirada' : 'Ativa'}</div></div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Vencimento</p><p className="text-lg font-bold text-slate-700">{formattedDate}</p></div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tempo Restante</p><p className={`text-lg font-bold ${daysLeft < 5 ? 'text-orange-600' : 'text-slate-700'}`}>{daysLeft > 0 ? `${daysLeft} dias` : '0 dias'}</p></div>
            </div>
            
            {/* BOTÃO DE RENOVAÇÃO PARA ALUNO */}
            {activeRenewalLink && (
                <div className="relative z-10 text-right">
                    <button 
                        onClick={() => window.open(activeRenewalLink, '_blank')}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-200 transition-colors flex items-center justify-center gap-2 md:inline-flex w-full md:w-auto"
                    >
                        Renovar Assinatura Agora <ExternalLink size={16} />
                    </button>
                </div>
            )}
        </div>

        {/* PAINEL DE ADMINISTRAÇÃO DO SISTEMA */}
        {user.role === 'admin' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                    <div className="bg-slate-800 p-3 rounded-full text-blue-400"><Database size={24} /></div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Administração do Sistema</h2>
                        <p className="text-slate-400 text-sm">Configurações globais da plataforma</p>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                        Link de Renovação de Assinatura
                        <span className="text-xs font-normal text-slate-500">(Este link aparecerá para os alunos)</span>
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="url" 
                            value={adminRenewalLink} 
                            onChange={(e) => setAdminRenewalLink(e.target.value)}
                            placeholder="https://exemplo.com/pagamento"
                            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500" 
                        />
                        <button 
                            onClick={handleSaveAdminLink}
                            disabled={isAdminSaving}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                        >
                            {isAdminSaving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* PERFIL */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6"><div className="bg-blue-100 p-3 rounded-full text-blue-600"><User size={24} /></div><div><h2 className="text-xl font-bold text-slate-900">Meu Perfil</h2><p className="text-slate-500 text-sm">Gerencie suas informações pessoais</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Completo</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {/* BOTÃO PARA COPIAR ID */}
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-bold">SEU ID:</span> 
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">{user.uid}</span>
                        <CopyButton text={user.uid} className="text-blue-500 hover:text-blue-700" />
                    </div>
                </div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">E-mail</label><input type="email" value={user.email} disabled className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Smartphone size={16} className="text-green-600" /> WhatsApp (Opcional)</label><input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /><p className="text-xs text-gray-400 mt-1">Usaremos apenas para comunicações importantes sobre sua conta.</p></div>
            </div>
            <div className="text-right"><button onClick={handleSaveProfile} disabled={isSaving || (name === user.name && whatsapp === user.whatsapp)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Salvar Alterações</button></div>
        </div>

        {/* SEGURANÇA */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"><div className="flex items-center gap-4 mb-6"><div className="bg-orange-100 p-3 rounded-full text-orange-600"><Key size={24} /></div><div><h2 className="text-xl font-bold text-slate-900">Segurança</h2><p className="text-slate-500 text-sm">Gerencie sua senha de acesso</p></div></div><div className="flex flex-col md:flex-row items-center justify-between p-4 bg-white rounded-xl border border-gray-100"><div className="mb-4 md:mb-0"><h4 className="font-semibold text-slate-800">Alterar Senha</h4><p className="text-xs text-gray-500">Recomendamos usar uma senha forte e única.</p></div><button onClick={() => setIsPasswordModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors"><Key size={18} /> Alterar Senha</button></div></div>
        
        {/* ZONA DE PERIGO */}
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 shadow-sm"><div className="flex items-center gap-4 mb-6"><div className="bg-red-100 p-3 rounded-full text-red-600"><AlertTriangle size={24} /></div><div><h2 className="text-xl font-bold text-red-700">Zona de Perigo</h2><p className="text-red-500 text-sm">Ações irreversíveis de gerenciamento de dados</p></div></div><div className="space-y-4"><div className="flex flex-col md:flex-row items-center justify-between p-4 bg-white rounded-xl border border-red-100"><div className="mb-4 md:mb-0"><h4 className="font-semibold text-slate-800">Resetar Questões</h4><p className="text-xs text-gray-500">Apaga o histórico de respostas. As questões voltam a ser novas.</p></div><button onClick={() => openModal('questions')} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors"><RotateCcw size={18} /> Resetar Questões</button></div><div className="flex flex-col md:flex-row items-center justify-between p-4 bg-white rounded-xl border border-red-100"><div className="mb-4 md:mb-0"><h4 className="font-semibold text-slate-800">Resetar Tudo</h4><p className="text-xs text-gray-500">Apaga tudo, inclusive sua sequência (streak).</p></div><button onClick={() => openModal('history')} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"><Trash2 size={18} /> Resetar Tudo</button></div></div></div>
      </div>
    </div>
  );
}

function AddQuestionView({ onBack, addToast }) {
    const [area, setArea] = useState(areasBase[0].id);
    const [topic, setTopic] = useState('');
    const [institution, setInstitution] = useState('');
    const [year, setYear] = useState('');
    const [text, setText] = useState('');
    const [options, setOptions] = useState([{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }, { id: 'e', text: '' }]);
    const [correctOptionId, setCorrectOptionId] = useState('a');
    const [explanation, setExplanation] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const availableThemes = useMemo(() => themesMap[area] || [], [area]);

    useEffect(() => { setTopic(''); }, [area]);
    const handleOptionChange = (id, newText) => { setOptions(prev => prev.map(opt => opt.id === id ? { ...opt, text: newText } : opt)); };
    const handleSave = async (e) => {
        e.preventDefault(); setIsSaving(true);
        const optionA = options.find(o => o.id === 'a').text.trim();
        const optionB = options.find(o => o.id === 'b').text.trim();
        if (!text || !topic || !optionA || !optionB) { 
            addToast('Atenção', 'Preencha a Área, Tópico, Enunciado e as Alternativas A e B.', 'error');
            setIsSaving(false); return; 
        }
        const validOptions = options.filter(opt => opt.text.trim() !== '');
        if (!validOptions.find(o => o.id === correctOptionId)) { 
            addToast('Erro', 'A alternativa correta selecionada está vazia.', 'error');
            setIsSaving(false); return; 
        }
        try {
            const questionData = { area: areaNameMap[area], topic: topic, institution: institution || "", year: year ? parseInt(year) : "", text: text, options: validOptions, correctOptionId: correctOptionId, explanation: explanation || "", createdAt: new Date().toISOString(), hasImage: false, id: null };
            await addDoc(collection(db, "questions"), questionData);
            addToast('Sucesso', 'Questão adicionada com sucesso!', 'success');
            setText(''); setOptions([{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }, { id: 'e', text: '' }]); setExplanation('');
        } catch (error) { 
            addToast('Erro', 'Erro ao salvar no banco de dados.', 'error'); 
        } finally { setIsSaving(false); }
    };
    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto pb-10"><div className="flex items-center justify-between mb-8"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Voltar</button><h1 className="text-2xl font-bold">Nova Questão</h1></div><form onSubmit={handleSave} className="space-y-6"><div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-sm font-bold text-slate-700 mb-2">Área</label><select value={area} onChange={e => setArea(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">{areasBase.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select></div><div><label className="block text-sm font-bold text-slate-700 mb-2">Tema</label><select value={topic} onChange={e => setTopic(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"><option value="">Selecione...</option>{availableThemes.map(t => <option key={t} value={t}>{t}</option>)}</select></div><div><label className="block text-sm font-bold text-slate-700 mb-2">Instituição (Opcional)</label><input type="text" value={institution} onChange={e => setInstitution(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="Ex: USP, UNIFESP..." /></div><div><label className="block text-sm font-bold text-slate-700 mb-2">Ano (Opcional)</label><input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="Ano (opcional)" /></div></div><div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm"><label className="block text-sm font-bold text-slate-700 mb-2">Enunciado</label><textarea value={text} onChange={e => setText(e.target.value)} rows={5} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl resize-y" /></div><div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4"><h3 className="font-bold text-slate-900 border-b border-gray-100 pb-2 mb-4">Alternativas</h3>{options.map((opt) => (<div key={opt.id} className="flex items-start gap-3"><div className="mt-3"><input type="radio" name="correctOption" checked={correctOptionId === opt.id} onChange={() => setCorrectOptionId(opt.id)} className="w-5 h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"/></div><div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Opção {opt.id}</label><textarea value={opt.text} onChange={e => handleOptionChange(opt.id, e.target.value)} rows={2} className={`w-full px-4 py-3 border rounded-xl resize-none ${correctOptionId === opt.id ? 'bg-emerald-50 border-emerald-200 focus:ring-emerald-500' : 'bg-gray-50 border-gray-200 focus:ring-blue-500'}`} placeholder={`Texto da alternativa ${opt.id.toUpperCase()}`} /></div></div>))}</div><div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm"><label className="block text-sm font-bold text-slate-700 mb-2">Comentário</label><textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={4} className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl resize-y" /></div><div className="flex justify-end gap-4"><button type="button" onClick={onBack} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50">Cancelar</button><button type="submit" disabled={isSaving} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar Questão'}</button></div></form></div>
    );
}

// --- QUESTION VIEW ATUALIZADA (COM REPORT E SUGGESTION) ---
function QuestionView({ area, initialData, user, onExit, onFinish, onPause, onUpdateProgress, addToast }) {
  const [questions] = useState(() => initialData ? initialData.questionsData : []); 
  const [userAnswers, setUserAnswers] = useState(() => initialData ? initialData.answersData : {}); 
  const [currentIndex, setCurrentIndex] = useState(() => initialData ? initialData.currentIndex : 0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [status, setStatus] = useState('unanswered'); 
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [suggestionType, setSuggestionType] = useState(null); 

  // Notifica o componente pai sobre mudanças para o "Autosave" da navegação segura
  useEffect(() => {
     if (onUpdateProgress) {
         onUpdateProgress(questions, userAnswers, currentIndex, initialData?.id);
     }
  }, [questions, userAnswers, currentIndex, onUpdateProgress, initialData?.id]);

  useEffect(() => {
    if (userAnswers[currentIndex]) {
      setSelectedOption(userAnswers[currentIndex]);
      const isCorrect = userAnswers[currentIndex] === questions[currentIndex].correctOptionId;
      setStatus(isCorrect ? 'correct' : 'incorrect');
    } else {
      setSelectedOption(null);
      setStatus('unanswered');
    }
  }, [currentIndex, userAnswers, questions]);

  const currentQuestion = questions[currentIndex];
  const handleConfirmAnswer = () => { if (!selectedOption) return; const isCorrect = selectedOption === currentQuestion.correctOptionId; setStatus(isCorrect ? 'correct' : 'incorrect'); setUserAnswers(prev => ({ ...prev, [currentIndex]: selectedOption })); };
  const handleNext = () => { if (currentIndex < questions.length - 1) { setCurrentIndex(prev => prev + 1); window.scrollTo(0,0); } else { let correctCount = 0; questions.forEach((q, idx) => { if (userAnswers[idx] === q.correctOptionId) correctCount++; }); onFinish({ total: questions.length, correct: correctCount }, questions, userAnswers, initialData?.id); } };
  const handlePrevious = () => { if (currentIndex > 0) { setCurrentIndex(prev => prev - 1); window.scrollTo(0,0); } };
  const handleRedo = () => { setSelectedOption(null); setStatus('unanswered'); };
  const handleSaveAndExit = () => { onPause(questions, userAnswers, currentIndex, initialData?.id); };
  
  const MobileNavBar = () => (
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-3 z-50 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:hidden">
          <button onClick={handlePrevious} disabled={currentIndex === 0} className="p-3 text-slate-500 hover:text-blue-600 disabled:opacity-30 rounded-xl bg-gray-50 border border-gray-100"><ArrowLeft size={24} /></button>
          <div className="flex-1 mx-3">{status === 'unanswered' ? (<button onClick={handleConfirmAnswer} disabled={!selectedOption} className="w-full bg-blue-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform">Responder</button>) : (<button onClick={handleRedo} className="w-full text-blue-600 border border-blue-200 bg-blue-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><RotateCcw size={18} /> Refazer</button>)}</div><button onClick={handleNext} className="p-3 text-white bg-slate-900 rounded-xl shadow-lg"><ArrowRight size={24} /></button>
      </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-5xl mx-auto pb-32 md:pb-0 relative">
      <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} questionId={currentQuestion.id} userId={user?.uid} type="error" addToast={addToast} />
      <ReportModal isOpen={suggestionModalOpen} onClose={() => setSuggestionModalOpen(false)} questionId={currentQuestion.id} userId={user?.uid} type="suggestion" category={suggestionType} addToast={addToast} />
      <div className="flex items-center justify-between mb-6 sticky top-14 md:top-0 bg-gray-50 z-30 py-4 border-b md:border-none border-gray-200">
          <div className="flex gap-2"><button onClick={handleSaveAndExit} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-bold text-sm bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100"><PauseCircle size={18} className="mr-2" /> <span className="hidden md:inline">Salvar e Sair</span><span className="md:hidden">Sair</span></button><button onClick={() => { let correctCount = 0; questions.forEach((q, idx) => { if (userAnswers[idx] === q.correctOptionId) correctCount++; }); onFinish({ total: questions.length, correct: correctCount }, questions, userAnswers, initialData?.id); }} className="flex items-center text-gray-500 hover:text-red-600 transition-colors font-medium text-sm bg-white border border-gray-200 px-3 py-2 rounded-lg"><XCircle size={18} className="mr-2" /> <span className="hidden md:inline">Encerrar</span></button></div>
          <div className="flex items-center gap-4"><div className="text-sm font-medium text-gray-500">Questão <span className="text-slate-900 font-bold">{currentIndex + 1}</span> de {questions.length}</div><div className="w-20 md:w-32 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div></div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 relative">
              <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                  <div className="flex flex-wrap gap-2 items-center">
                      {/* Botão Unificado para Sugerir Banca/Ano se faltar algo */}
                      {(!currentQuestion.institution || !currentQuestion.year) && (
                          <button onClick={() => { setSuggestionType('institution'); setSuggestionModalOpen(true); }} className="px-2 py-1 rounded border border-dashed border-blue-300 text-blue-500 bg-blue-50 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1">
                              <Edit2 size={10}/> Sugerir Banca/Ano
                          </button>
                      )}
                      
                      {/* Exibição dos dados existentes */}
                      {currentQuestion.institution && (
                         <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide border border-blue-100">
                            {currentQuestion.institution}
                         </span>
                      )}
                      {currentQuestion.year && (
                         <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded border border-gray-200">
                            {currentQuestion.year}
                         </span>
                      )}

                      <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded border border-gray-200">{currentQuestion.topic}</span>
                  </div>
                  
                  {/* ID e Reportar - USANDO O NOVO COMPONENTE COPYBUTTON */}
                  <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 font-bold uppercase tracking-wider">
                          <span>ID</span>
                          <CopyButton text={currentQuestion.id} />
                      </div>
                      <button onClick={() => setReportModalOpen(true)} className="text-red-500 hover:text-red-700 transition-colors" title="Reportar Erro"><AlertTriangle size={18} /></button>
                  </div>
              </div>
              <p className="text-base md:text-lg text-slate-800 leading-relaxed mb-6 font-medium whitespace-pre-line">{currentQuestion.text}</p>
              
              {/* --- ÁREA DE IMAGENS (NOVO) --- */}
              {(currentQuestion.images?.length > 0 || currentQuestion.imageUrl) && (
                  <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Suporte Híbrido: Exibe array novo OU string antiga */}
                      {(currentQuestion.images || [currentQuestion.imageUrl]).map((img, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                              <img 
                                  src={img} 
                                  alt={`Anexo ${idx + 1}`} 
                                  className="w-full h-64 object-contain hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                                  onClick={() => window.open(img, '_blank')} // Abre em nova aba ao clicar
                              />
                              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  Clique para ampliar
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
          <div className="space-y-3">{currentQuestion.options.map((option) => { let itemClass = "border-gray-200 hover:border-blue-300 hover:bg-blue-50"; let icon = <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-blue-400"></div>; if (selectedOption === option.id) { itemClass = "border-blue-600 bg-blue-50 ring-1 ring-blue-600"; icon = <div className="w-5 h-5 rounded-full border-[5px] border-blue-600 bg-white"></div>; } if (status !== 'unanswered') { if (option.id === currentQuestion.correctOptionId) { itemClass = "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"; icon = <CheckCircle size={20} className="text-emerald-600 fill-emerald-100" />; } else if (selectedOption === option.id && option.id !== currentQuestion.correctOptionId) { itemClass = "border-red-500 bg-red-50 ring-1 ring-red-500"; icon = <XCircle size={20} className="text-red-600 fill-red-100" />; } else { itemClass = "border-gray-100 opacity-50"; } } return (<button key={option.id} disabled={status !== 'unanswered'} onClick={() => setSelectedOption(option.id)} className={`w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all flex items-start gap-4 group ${itemClass}`}><div className="mt-0.5 flex-shrink-0">{icon}</div><span className={`font-medium text-base ${status !== 'unanswered' && option.id === currentQuestion.correctOptionId ? 'text-emerald-800' : 'text-slate-700'}`}><span className="uppercase font-bold mr-2">{option.id})</span>{option.text}</span></button>); })}</div>
          <div className="hidden md:flex justify-between items-center pt-4 mt-4 border-t border-gray-100"><button onClick={handlePrevious} disabled={currentIndex === 0} className="px-4 py-3 text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-500 font-bold flex items-center gap-2 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"><ArrowLeft size={20} /> Anterior</button>{status === 'unanswered' ? (<button onClick={handleConfirmAnswer} disabled={!selectedOption} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all transform active:scale-95 flex-1 mx-4">Responder</button>) : (<button onClick={handleRedo} className="text-gray-500 hover:text-blue-600 font-bold flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors border border-gray-200 mx-4"><RotateCcw size={18} /> Refazer</button>)}<button onClick={handleNext} className="px-4 py-3 text-blue-600 hover:text-blue-800 font-bold flex items-center gap-2 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">{currentIndex === questions.length - 1 ? 'Finalizar' : 'Próxima'} <ArrowRight size={20} /></button></div>
        </div>
        <div className="lg:col-span-1 space-y-6">
           {status !== 'unanswered' && (<div className={`p-6 rounded-2xl border animate-in slide-in-from-right-4 duration-500 ${status === 'correct' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}><div className="flex items-center gap-3 mb-3">{status === 'correct' ? (<div className="p-2 bg-emerald-100 rounded-full"><Check size={24} className="text-emerald-600" /></div>) : (<div className="p-2 bg-red-100 rounded-full"><X size={24} className="text-red-600" /></div>)}<h3 className={`text-xl font-bold ${status === 'correct' ? 'text-emerald-800' : 'text-red-800'}`}>{status === 'correct' ? 'Excelente!' : 'Não foi dessa vez.'}</h3></div><p className={`text-sm mb-4 font-medium ${status === 'correct' ? 'text-emerald-700' : 'text-red-700'}`}>Gabarito: Letra {currentQuestion.correctOptionId.toUpperCase()}</p><div className="bg-white/60 p-4 rounded-xl text-sm text-slate-700 leading-relaxed border border-black/5"><span className="font-bold block mb-1">Comentário do Professor:</span>{currentQuestion.explanation}</div></div>)}
        </div>
      </div>
      <MobileNavBar />
    </div>
  );
}
