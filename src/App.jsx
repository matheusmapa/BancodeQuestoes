import React, { useState, useEffect, useMemo } from 'react';
import { 
  Stethoscope, Scissors, Baby, HeartPulse, Activity, BookOpen, BarChart2, 
  Settings, LogOut, Search, CheckCircle, Clock, Menu, X, Lock, Mail, 
  ChevronRight, ArrowRight, AlertCircle, ArrowLeft, Play, Filter, CheckSquare, 
  Square, Edit2, Check, Image as ImageIcon, RotateCcw, Home, List, Plus, 
  ChevronDown, ChevronUp, FileText, PlayCircle, Eye, PauseCircle, Save, 
  Database, User, Bell, Shield, Target, TrendingUp, Award, Info, XCircle, 
  TrendingDown, HelpCircle, RefreshCw, Repeat, Trash2, AlertTriangle, Zap, CloudUpload, Key, Users, UserPlus, Calendar, PlusCircle, FilePlus, Map, Brain 
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
// ATUALIZADO: Nova ordem e substituição de Geriatria por Preventiva
const areasBase = [
  { id: 'cirurgia', title: 'Cirurgia Geral', icon: Scissors, color: 'bg-emerald-50 text-emerald-600', borderColor: 'hover:border-emerald-200' },
  { id: 'clinica', title: 'Clínica Médica', icon: Stethoscope, color: 'bg-blue-50 text-blue-600', borderColor: 'hover:border-blue-200' },
  { id: 'go', title: 'Ginecologia e Obstetrícia', icon: HeartPulse, color: 'bg-rose-50 text-rose-600', borderColor: 'hover:border-rose-200' },
  { id: 'pediatria', title: 'Pediatria', icon: Baby, color: 'bg-amber-50 text-amber-600', borderColor: 'hover:border-amber-200' },
  { id: 'preventiva', title: 'Preventiva', icon: Shield, color: 'bg-violet-50 text-violet-600', borderColor: 'hover:border-violet-200' },
];

// ATUALIZADO: Temas em Ordem Alfabética e Renomeados
const themesMap = {
    'clinica': [
        'Cardiologia',
        'Dermatologia',
        'Endocrinologia e Metabologia',
        'Gastroenterologia',
        'Hematologia',
        'Hepatologia',
        'Infectologia',
        'Nefrologia',
        'Neurologia',
        'Pneumologia',
        'Psiquiatria',
        'Reumatologia'
    ],
    'cirurgia': [
        'Abdome Agudo',
        'Cirurgia Hepatobiliopancreática',
        'Cirurgia Torácica e de Cabeça e Pescoço',
        'Cirurgia Vascular',
        'Cirurgia do Esôfago e Estômago',
        'Coloproctologia',
        'Hérnias e Parede Abdominal',
        'Pré e Pós-Operatório',
        'Queimaduras',
        'Resposta Metabólica e Cicatrização',
        'Trauma',
        'Urologia'
    ],
    'go': [
        'Ciclo Menstrual e Anticoncepção',
        'Climatério e Menopausa',
        'Doenças Intercorrentes na Gestação',
        'Infecções Congênitas e Gestacionais',
        'Infecções Ginecológicas e ISTs',
        'Mastologia',
        'Obstetrícia Fisiológica e Pré-Natal',
        'Oncologia Pélvica',
        'Parto e Puerpério',
        'Sangramentos da Gestação',
        'Uroginecologia e Distopias',
        'Vitalidade Fetal e Amniograma'
    ],
    'pediatria': [
        'Adolescência e Puberdade',
        'Afecções Respiratórias',
        'Aleitamento Materno e Nutrição',
        'Cardiologia e Reumatologia Pediátrica',
        'Crescimento e Desenvolvimento',
        'Emergências e Acidentes',
        'Gastroenterologia Pediátrica',
        'Imunizações',
        'Infectopediatria e Exantemáticas',
        'Nefrologia Pediátrica',
        'Neonatologia: Patologias',
        'Neonatologia: Sala de Parto'
    ],
    'preventiva': [
        'Atenção Primária e Saúde da Família',
        'Estudos Epidemiológicos',
        'Financiamento e Gestão',
        'História e Princípios do SUS',
        'Indicadores de Saúde e Demografia',
        'Medicina Baseada em Evidências',
        'Medicina Legal',
        'Medidas de Associação e Testes Diagnósticos',
        'Políticas Nacionais de Saúde',
        'Saúde do Trabalhador',
        'Vigilância em Saúde',
        'Ética Médica e Bioética'
    ]
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

// Helper para verificar se uma data string (DD/MM/YYYY) foi ontem
const checkIsYesterday = (lastDateStr) => {
    if (!lastDateStr) return false;
    const parts = lastDateStr.split('/');
    if (parts.length !== 3) return false;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Meses em JS são 0-11
    const year = parseInt(parts[2], 10);
    
    const lastDate = new Date(year, month, day);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return lastDate.getDate() === yesterday.getDate() &&
           lastDate.getMonth() === yesterday.getMonth() &&
           lastDate.getFullYear() === yesterday.getFullYear();
};


// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalLoginError, setGlobalLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.role !== 'admin') {
                    const subDate = userData.subscriptionUntil ? new Date(userData.subscriptionUntil) : null;
                    const now = new Date();
                    if (!subDate || subDate < now) {
                        await signOut(auth);
                        setGlobalLoginError("Sua matrícula venceu, contate um administrador para efetivar novamente.");
                        setCurrentUser(null);
                        setIsLoading(false);
                        return;
                    }
                }
                setGlobalLoginError(''); 
                setCurrentUser({ ...user, ...userData }); 
            } else {
                await signOut(auth);
                setGlobalLoginError("Conta não encontrada. Contate o suporte.");
                setCurrentUser(null);
            }
        } catch (error) {
            console.error("Erro ao buscar perfil:", error);
            setGlobalLoginError("Erro ao verificar conta.");
            setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return <>{currentUser ? <Dashboard user={currentUser} onLogout={() => signOut(auth)} /> : <LoginPage globalError={globalLoginError} />}</>;
}

// --- TELA DE LOGIN ---
function LoginPage({ globalError }) {
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
            <div className="flex items-center gap-3 mb-10">
              <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md border border-white/20">
                <Map size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">MedMaps</h1>
            </div>
            <h2 className="text-4xl font-bold mb-6 leading-tight">Sua aprovação na residência começa aqui.</h2>
            <p className="text-blue-100 text-lg font-light leading-relaxed">Acesso exclusivo ao banco de questões mais barato do mercado!.</p>
          </div>
        </div>
        <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col justify-center bg-white">
          <div className="mb-10"><h2 className="text-3xl font-bold text-slate-900 mb-3">Login</h2><p className="text-slate-500 text-lg">Insira suas credenciais de acesso.</p></div>
          {error && <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex items-center gap-3"><AlertCircle className="text-red-500" size={20} /><p className="text-sm text-red-700 font-medium">{error}</p></div>}
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
          <div className="bg-blue-100 p-3 rounded-full text-blue-600 inline-flex mb-4">
             <Target size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Meta Diária</h3>
          <p className="text-slate-500 text-sm">Quantas questões você quer resolver hoje?</p>
        </div>
        
        <div className="flex justify-center mb-8">
            <div className="relative">
                <input 
                  type="number" 
                  min="1" 
                  max="200"
                  value={goal} 
                  onChange={(e) => setGoal(Number(e.target.value))}
                  className="w-32 px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-3xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
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
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-100 p-3 rounded-full text-orange-600"><Key size={24} /></div>
            <h3 className="text-xl font-bold text-slate-900">Alterar Senha</h3>
        </div>
        
        {error && <p className="text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-lg font-medium">{error}</p>}

        <div className="space-y-4 mb-8">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Senha Atual</label>
                <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="••••••••" />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nova Senha</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Confirmar Nova Senha</label>
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="••••••••" />
            </div>
        </div>

        <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
            <button onClick={handleSubmit} disabled={isLoading} className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-lg shadow-slate-200">
                {isLoading ? 'Salvando...' : 'Alterar Senha'}
            </button>
        </div>
      </div>
    </div>
  );
}

function CreateStudentModal({ onClose, onSave, isLoading }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        setError('');
        if(!name || !email || !password) return setError("Preencha todos os campos");
        if(password.length < 6) return setError("A senha deve ter no mínimo 6 caracteres");
        
        onSave({ name, email, password, role });
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 m-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600"><UserPlus size={24} /></div>
                    <h3 className="text-xl font-bold text-slate-900">Novo Aluno</h3>
                </div>

                {error && <p className="text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-lg font-medium">{error}</p>}

                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="Nome do aluno" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="email@exemplo.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="Senha provisória" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Função</label>
                        <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800">
                            <option value="student">Aluno</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
                    <button onClick={handleSubmit} disabled={isLoading} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-200">
                        {isLoading ? 'Criando...' : 'Criar Aluno'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function AddQuestionView({ onBack }) {
    const [area, setArea] = useState(areasBase[0].id);
    const [topic, setTopic] = useState('');
    const [institution, setInstitution] = useState('');
    const [year, setYear] = useState(''); // Começa zerado
    const [text, setText] = useState('');
    const [options, setOptions] = useState([
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' },
        { id: 'e', text: '' }
    ]);
    const [correctOptionId, setCorrectOptionId] = useState('a');
    const [explanation, setExplanation] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const availableThemes = useMemo(() => themesMap[area] || [], [area]);

    // Reseta o tópico ao mudar a área para evitar dados inconsistentes
    useEffect(() => {
        setTopic('');
    }, [area]);

    const handleOptionChange = (id, newText) => {
        setOptions(prev => prev.map(opt => opt.id === id ? { ...opt, text: newText } : opt));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        // Validação básica: Enunciado, Área, Tópico e Opções A e B
        const optionA = options.find(o => o.id === 'a').text.trim();
        const optionB = options.find(o => o.id === 'b').text.trim();

        if (!text || !topic || !optionA || !optionB) {
            setMessage({ type: 'error', text: 'Preencha a Área, Tópico, Enunciado e as Alternativas A e B.' });
            setIsSaving(false);
            return;
        }

        // Filtra opções vazias (C, D, E opcionais)
        const validOptions = options.filter(opt => opt.text.trim() !== '');

        // Verifica se a correta marcada é uma das opções válidas
        if (!validOptions.find(o => o.id === correctOptionId)) {
             setMessage({ type: 'error', text: 'A alternativa correta selecionada está vazia.' });
             setIsSaving(false);
             return;
        }

        try {
            const questionData = {
                area: areaNameMap[area], 
                topic: topic,
                institution: institution || "", // Envia string vazia se não preenchido
                year: year ? parseInt(year) : "", // Envia string vazia se não preenchido
                text: text,
                options: validOptions, // Salva apenas as não vazias
                correctOptionId: correctOptionId,
                explanation: explanation || "", // Envia string vazia se não preenchido
                createdAt: new Date().toISOString(),
                hasImage: false,
                id: null // Será gerado pelo Firebase
            };

            await addDoc(collection(db, "questions"), questionData);

            setMessage({ type: 'success', text: 'Questão adicionada com sucesso!' });
            
            // Limpa campos principais para nova inserção (mantém Área e Instituição para agilizar)
            setText('');
            setOptions([
                { id: 'a', text: '' },
                { id: 'b', text: '' },
                { id: 'c', text: '' },
                { id: 'd', text: '' },
                { id: 'e', text: '' }
            ]);
            setExplanation('');
            
        } catch (error) {
            console.error("Erro ao salvar questão:", error);
            setMessage({ type: 'error', text: 'Erro ao salvar no banco de dados.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto pb-10">
            <div className="flex items-center justify-between mb-8">
                <button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium">
                    <ArrowLeft size={20} className="mr-2" /> Voltar
                </button>
                <div className="flex items-center gap-2">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FilePlus size={24} /></div>
                    <h1 className="text-2xl font-bold text-slate-900">Nova Questão</h1>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Metadados */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Área (Obrigatório)</label>
                        <select value={area} onChange={e => setArea(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800">
                            {areasBase.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tema (Obrigatório)</label>
                        <select value={topic} onChange={e => setTopic(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800">
                            <option value="">Selecione um tema...</option>
                            {availableThemes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Instituição (Opcional)</label>
                        <input type="text" value={institution} onChange={e => setInstitution(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="Ex: USP, UNIFESP..." />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Ano (Opcional)</label>
                        <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="Ano (opcional)" />
                    </div>
                </div>

                {/* Enunciado */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Enunciado da Questão (Obrigatório)</label>
                    <textarea value={text} onChange={e => setText(e.target.value)} rows={5} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 resize-y" placeholder="Digite o texto da questão aqui..." />
                </div>

                {/* Alternativas */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-900 border-b border-gray-100 pb-2 mb-4">Alternativas</h3>
                    <p className="text-xs text-gray-500 mb-4">Preencha pelo menos A e B. Deixe em branco as que não quiser usar.</p>
                    {options.map((opt) => (
                        <div key={opt.id} className="flex items-start gap-3">
                            <div className="mt-3">
                                <input 
                                    type="radio" 
                                    name="correctOption" 
                                    checked={correctOptionId === opt.id} 
                                    onChange={() => setCorrectOptionId(opt.id)}
                                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    title="Marcar como correta"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Opção {opt.id}</label>
                                <textarea 
                                    value={opt.text} 
                                    onChange={e => handleOptionChange(opt.id, e.target.value)} 
                                    rows={2} 
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 outline-none resize-none transition-colors ${correctOptionId === opt.id ? 'bg-emerald-50 border-emerald-200 focus:ring-emerald-500' : 'bg-gray-50 border-gray-200 focus:ring-blue-500'}`}
                                    placeholder={`Texto da alternativa ${opt.id.toUpperCase()}`} 
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Comentário */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Comentário / Explicação (Opcional)</label>
                    <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={4} className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 resize-y" placeholder="Explique por que a alternativa correta é a correta..." />
                </div>

                {message && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span className="font-medium">{message.text}</span>
                    </div>
                )}

                <div className="flex justify-end gap-4">
                    <button type="button" onClick={onBack} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2">
                        {isSaving ? 'Salvando...' : <><Save size={20} /> Salvar Questão</>}
                    </button>
                </div>
            </form>
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

  // META DIÁRIA: Inicializa com o valor do banco se existir, ou 50 por padrão
  const [dailyGoal, setDailyGoal] = useState(user.dailyGoal || 50);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  
  // Data State
  const [allQuestions, setAllQuestions] = useState([]);
  const [mySimulations, setMySimulations] = useState([]);
  const [lastExamResults, setLastExamResults] = useState(null);
  const [userStats, setUserStats] = useState({ questionsToday: 0, correctAnswers: 0, totalAnswers: 0, streak: 0 });

  // Load Data
  useEffect(() => {
    // Carrega questões da coleção "questions"
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
            // Verifica se a data do banco é de hoje para mostrar o contador certo
            const today = new Date().toLocaleDateString('pt-BR');
            
            if (data.lastStudyDate !== today) {
                // Se a data no banco for antiga, visualmente resetamos "questões hoje" para 0
                // Isso não apaga do banco ainda (apaga quando ele salvar algo novo), mas corrige a interface
                setUserStats({ ...data, questionsToday: 0 });
            } else {
                setUserStats(data);
            }
        }
    });
    return () => { unsubSims(); unsubStats(); };
  }, [user]);

  // Derived Stats
  const realStats = useMemo(() => calculateDetailedStats(mySimulations, allQuestions), [mySimulations, allQuestions]);
  const excludedIds = useMemo(() => getCorrectlyAnsweredIds(mySimulations, allQuestions), [mySimulations, allQuestions]);
  const accuracy = realStats.totalQuestions > 0 ? Math.round((realStats.totalCorrect / realStats.totalQuestions) * 100) : 0;
  const streak = userStats.streak || 0;

  const dynamicAreas = useMemo(() => {
    return areasBase.map(area => {
      const totalDB = getRealQuestionCount(allQuestions, area.title);
      // CORREÇÃO: Calcula progresso baseado em questões ÚNICAS completadas, e não no total de acertos
      const uniqueCompleted = allQuestions.filter(q => q.area === area.title && excludedIds.has(q.id)).length;
      const progress = totalDB > 0 ? Math.round((uniqueCompleted / totalDB) * 100) : 0;
      return { ...area, count: `${getAvailableQuestionCount(allQuestions, area.title, null, excludedIds)} Questões`, progress };
    });
  }, [allQuestions, excludedIds]);

  // FUNÇÃO PARA SALVAR META NO BANCO
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

  // Actions
  const handleLaunchExam = (filters = {}, limit = 5, allowRepeats = false) => {
    const currentExcludedIds = allowRepeats ? new Set() : excludedIds;
    let availableQuestions = allQuestions.filter(q => {
      if (filters.areaId && q.area !== areaNameMap[filters.areaId]) return false;
      if (filters.topics && filters.topics.length > 0 && !filters.topics.includes(q.topic)) return false;
      if (currentExcludedIds.has(q.id)) return false;
      return true;
    });

    if (availableQuestions.length === 0) {
      setNotification({ title: "Ops!", message: "Não há questões disponíveis com esses filtros. Tente habilitar 'Incluir respondidas'.", type: "info" });
      return;
    }

    const count = limit || 5;
    const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random()).slice(0, count);

    setActiveExamData({ questionsData: shuffled, answersData: {}, currentIndex: 0, id: Date.now() });
    setCurrentView('question_mode');
  };

  // --- NOVA FUNÇÃO: SALVAR E SAIR (PAUSAR) ---
  const handleExamPause = async (questions, answers, currentIndex, originId = null) => {
    const answeredCount = Object.keys(answers).length;
    if(user) {
        const simId = String(originId || Date.now());
        const simData = { 
            id: Number(simId), 
            date: new Date().toLocaleDateString('pt-BR'), 
            title: selectedArea ? `Simulado ${selectedArea.title}` : 'Simulado Misto',
            type: selectedArea ? 'Área Específica' : 'Misto', 
            status: 'open', // Status 'open' para simulados pausados
            total: questions.length, 
            correct: 0, // Calculado ao finalizar
            progress: answeredCount, 
            areas: selectedArea ? [selectedArea.title] : ['Misto'], 
            questionIds: questions.map(q => q.id), // SALVA APENAS IDs
            answersData: answers,
            lastIndex: currentIndex // Salva onde parou
        };
        
        await setDoc(doc(db, `users/${user.uid}/simulations`, simId), simData);
        setNotification({ title: "Salvo!", message: "Seu progresso foi salvo. Você pode continuar depois em 'Meus Simulados'.", type: "success" });
        setCurrentView('home');
    }
  };

  const handleExamFinish = async (results, questions, answers, originId = null) => {
    const answeredCount = Object.keys(answers).length;
    
    // GERA O ID PRIMEIRO PARA USAR NO ESTADO E NO BANCO
    const simId = String(originId || Date.now());

    // CORREÇÃO: Adicionamos o 'id' aqui para o botão de revisar saber qual abrir
    setLastExamResults({ 
        id: Number(simId), 
        total: questions.length, 
        correct: results.correct, 
        answered: answeredCount 
    });

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
            questionIds: questions.map(q => q.id), // SALVA APENAS IDs
            answersData: answers 
        };
        
        await setDoc(doc(db, `users/${user.uid}/simulations`, simId), simData);

        // --- LÓGICA DE DATAS (STREAK E DIÁRIO) ---
        const today = new Date().toLocaleDateString('pt-BR');
        const lastDate = userStats.lastStudyDate; // Data salva no banco (ex: "30/01/2026")
        
        let newStreak = userStats.streak || 0;
        let newQuestionsToday = userStats.questionsToday || 0;

        // 1. Resetar "Questões Hoje" se for um dia novo
        if (lastDate !== today) {
            newQuestionsToday = 0; // Começa do zero pois é um dia novo
        }
        newQuestionsToday += answeredCount; // Soma as de agora

        // 2. Lógica do Streak
        if (lastDate !== today) {
            // Só mexemos no streak se a data mudou (para não somar 2x no mesmo dia)
            if (checkIsYesterday(lastDate)) {
                // Se a última vez foi ontem -> Aumenta a sequência
                newStreak += 1;
            } else {
                // Se foi antes de ontem (quebrou a sequência) ou é a primeira vez -> Reinicia para 1
                newStreak = 1;
            }
        }
        // Se lastDate === today, não fazemos nada no streak (mantém o valor que já estava hoje)

        const newStats = {
            questionsToday: newQuestionsToday,
            totalAnswers: (userStats.totalAnswers || 0) + answeredCount,
            correctAnswers: (userStats.correctAnswers || 0) + results.correct,
            streak: newStreak,
            lastStudyDate: today // Atualiza para hoje
        };
        
        await setDoc(doc(db, "users", user.uid, "stats", "main"), newStats, { merge: true });
    }
    setCurrentView('simulation_summary');
  };

  const handleDeleteSimulation = async (simId) => {
    if (!user) return;
    try {
        await deleteDoc(doc(db, `users/${user.uid}/simulations`, String(simId)));
        setNotification({ title: "Excluído", message: "Simulado excluído com sucesso.", type: "success" });
    } catch (error) {
        console.error("Erro ao excluir simulado:", error);
        setNotification({ title: "Erro", message: "Não foi possível excluir o simulado.", type: "error" });
    }
  };

  const handleResumeExam = (simId) => {
    const sim = mySimulations.find(s => s.id === simId);
    if (!sim) return;

    // REIDRATAÇÃO: Transforma IDs salvos em Objetos de Questão completos
    let questions = [];
    if (sim.questionsData) {
        questions = sim.questionsData; // Suporte legado
    } else if (sim.questionIds) {
        questions = sim.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean);
    }

    if (questions.length === 0) {
        setNotification({ title: "Erro", message: "Não foi possível carregar as questões deste simulado. Elas podem ter sido excluídas do banco.", type: "error" });
        return;
    }

    setActiveExamData({
        questionsData: questions,
        answersData: sim.answersData || {},
        currentIndex: sim.lastIndex || 0,
        id: sim.id
    });
    setCurrentView('question_mode');
  };

  // NOVA LÓGICA: Resetar apenas o histórico de questões (mantendo streak e meta diária)
  const handleResetQuestions = async () => {
     if(!user) return;
     
     // 1. Apaga todos os simulados (histórico de respostas)
     const q = query(collection(db, `users/${user.uid}/simulations`));
     const snapshot = await getDocs(q);
     const batch = writeBatch(db);
     snapshot.docs.forEach((doc) => batch.delete(doc.ref));
     await batch.commit();

     // 2. Zera apenas os contadores globais de acertos/total, mas MANTÉM o streak e o dia de hoje
     await setDoc(doc(db, "users", user.uid, "stats", "main"), { 
         totalAnswers: 0, 
         correctAnswers: 0 
         // Não alteramos 'streak', 'questionsToday' ou 'lastStudyDate' aqui
     }, { merge: true });
  };

  // LÓGICA NUCLEAR: Reseta ABSOLUTAMENTE TUDO (incluindo streak)
  const handleResetHistory = async () => {
    if(!user) return;
    
    // 1. Apaga simulados
    const q = query(collection(db, `users/${user.uid}/simulations`));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    
    // 2. Zera o documento de estatísticas inteiro
    await setDoc(doc(db, "users", user.uid, "stats", "main"), { 
        questionsToday: 0, 
        correctAnswers: 0, 
        totalAnswers: 0, 
        streak: 0,
        lastStudyDate: null
    });
  };

  // PREPARA DADOS PARA REVISÃO (COM REIDRATAÇÃO)
  const getSimulationForReview = () => {
      const sim = mySimulations.find(s => s.id === selectedSimulationId);
      if(!sim) return null;
      
      // Reidrata se necessário
      if(!sim.questionsData && sim.questionIds) {
          return {
              ...sim,
              questionsData: sim.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean)
          };
      }
      return sim;
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div><h2 className="text-2xl font-bold text-slate-900">Olá, {user.name}! 👋</h2><p className="text-slate-500">Vamos praticar hoje? Escolha uma área para começar.</p></div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <StatCard title="Questões Hoje" value={userStats.questionsToday || 0} target={`/ ${dailyGoal}`} color="text-blue-600" bg="bg-blue-50" icon={<CheckCircle size={24} />} onClick={() => setIsGoalModalOpen(true)} editable={true} />
              <StatCard title="Taxa de Acerto" value={`${accuracy}%`} sub={realStats.totalQuestions > 0 ? `${realStats.totalCorrect}/${realStats.totalQuestions} Acertos` : "Sem dados"} color="text-emerald-600" bg="bg-emerald-50" icon={<BarChart2 size={24} />} />
              <StatCard title="Sequência" value={`${streak} Dia${streak !== 1 ? 's' : ''}`} sub="Continue assim!" color="text-orange-600" bg="bg-orange-50" icon={<Activity size={24} />} />
            </div>
            <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold text-slate-800">Grandes Áreas</h3></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">{dynamicAreas.map((area) => (<AreaCard key={area.id} area={area} onClick={() => { setSelectedArea(area); setCurrentView('area_hub'); }} />))}</div>
            </section>
          </>
        );

      case 'my_simulations': return <MySimulationsView simulations={mySimulations} onCreateNew={() => setCurrentView('general_exam_setup')} onResume={handleResumeExam} onViewResults={(id) => { setSelectedSimulationId(id); setCurrentView('review_mode'); }} onDelete={handleDeleteSimulation} />;
      case 'review_mode': return <ReviewExamView simulation={getSimulationForReview()} onBack={() => setCurrentView('my_simulations')} />;
      case 'general_exam_setup': return <GeneralExamSetupView onBack={() => setCurrentView('my_simulations')} onLaunchExam={(topics, count, allowRepeats) => handleLaunchExam({ topics: topics }, count, allowRepeats)} areasBase={areasBase} excludedIds={excludedIds} allQuestions={allQuestions} />;
      case 'area_hub': return <AreaHubView area={selectedArea} stats={realStats.byArea[selectedArea.title] || { total: 0, correct: 0 }} worstTopics={calculateTopicPerformance(mySimulations, selectedArea.title, allQuestions)} onBack={() => setCurrentView('home')} onStartTraining={() => setCurrentView('topic_selection')} />;
      case 'topic_selection': return <TopicSelectionView area={selectedArea} onBack={() => setCurrentView('area_hub')} onLaunchExam={(topics, count, allowRepeats) => handleLaunchExam({ areaId: selectedArea.id, topics: topics }, count, allowRepeats)} excludedIds={excludedIds} allQuestions={allQuestions} />;
      case 'question_mode': return <QuestionView area={selectedArea} initialData={activeExamData} onExit={() => setCurrentView('home')} onFinish={handleExamFinish} onPause={handleExamPause} />;
      case 'simulation_summary': return <SimulationSummaryView results={lastExamResults} onHome={() => setCurrentView('home')} onNewExam={() => setCurrentView('general_exam_setup')} onReview={() => { setSelectedSimulationId(lastExamResults?.id); setCurrentView('review_mode'); }} />;
      case 'settings': return <SettingsView user={user} onBack={() => setCurrentView('home')} onResetQuestions={handleResetQuestions} onResetHistory={handleResetHistory} />;
      case 'performance': return <PerformanceView detailedStats={realStats} onBack={() => setCurrentView('home')} />;
      case 'students_list': return <StudentsView onBack={() => setCurrentView('home')} />;
      case 'add_question': return <AddQuestionView onBack={() => setCurrentView('home')} />;
      default: return <div>Erro: View não encontrada</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-slate-800 relative">
      {isGoalModalOpen && <GoalModal currentGoal={dailyGoal} onSave={handleSaveGoal} onClose={() => setIsGoalModalOpen(false)} />}
      {notification && <NotificationModal title={notification.title} message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed z-20">
        <div className="p-6 border-b border-gray-100"><h1 className="text-2xl font-bold text-blue-700 flex items-center gap-2"><Map className="w-8 h-8" />MedMaps</h1></div>
        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem icon={BookOpen} label="Banco de Questões" active={currentView === 'home' || currentView === 'area_hub'} onClick={() => setCurrentView('home')} />
          <SidebarItem icon={CheckCircle} label="Meus Simulados" active={currentView === 'my_simulations' || currentView === 'general_exam_setup' || currentView === 'review_mode'} onClick={() => setCurrentView('my_simulations')} />
          <SidebarItem icon={BarChart2} label="Desempenho" active={currentView === 'performance'} onClick={() => setCurrentView('performance')} />
          
          {/* ÁREAS SOMENTE ADMIN */}
          {user.role === 'admin' && (
            <>
                <div className="mt-4 mb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Administração</div>
                <SidebarItem 
                icon={Users} 
                label="Gerenciar Alunos" 
                active={currentView === 'students_list'} 
                onClick={() => setCurrentView('students_list')} 
                />
                <SidebarItem 
                icon={PlusCircle} 
                label="Adicionar Questões" 
                active={currentView === 'add_question'} 
                onClick={() => setCurrentView('add_question')} 
                />
                <SidebarItem 
                icon={Brain} 
                label="MedImport AI" 
                onClick={() => window.location.href = '/import.html'} 
                />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-gray-100"><SidebarItem icon={Settings} label="Configurações" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} /><button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors mt-2"><LogOut size={20} /> <span className="font-medium">Sair</span></button></div>
      </aside>
      
      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-white z-50 border-b border-gray-200 p-4 flex justify-between items-center shadow-sm">
          <h1 className="text-xl font-bold text-blue-700 flex items-center gap-2"><Map className="w-6 h-6" />MedMaps</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
      </div>

      {/* MOBILE MENU DRAWER (ADICIONADO) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-24 px-6 overflow-y-auto animate-in slide-in-from-top-10 duration-200">
            <nav className="flex flex-col space-y-2">
                <SidebarItem icon={BookOpen} label="Banco de Questões" active={currentView === 'home' || currentView === 'area_hub'} onClick={() => { setCurrentView('home'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={CheckCircle} label="Meus Simulados" active={currentView === 'my_simulations' || currentView === 'general_exam_setup' || currentView === 'review_mode'} onClick={() => { setCurrentView('my_simulations'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={BarChart2} label="Desempenho" active={currentView === 'performance'} onClick={() => { setCurrentView('performance'); setIsMobileMenuOpen(false); }} />
                
                {user.role === 'admin' && (
                    <>
                        <div className="mt-4 mb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Administração</div>
                        <SidebarItem icon={Users} label="Gerenciar Alunos" active={currentView === 'students_list'} onClick={() => { setCurrentView('students_list'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem icon={PlusCircle} label="Adicionar Questões" active={currentView === 'add_question'} onClick={() => { setCurrentView('add_question'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem icon={Brain} label="MedImport AI" onClick={() => window.location.href = '/import.html'} />
                    </>
                )}

                <div className="h-px bg-gray-100 my-4"></div>
                <SidebarItem icon={Settings} label="Configurações" active={currentView === 'settings'} onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }} />
                <button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                    <LogOut size={20} /> <span className="font-medium">Sair</span>
                </button>
            </nav>
        </div>
      )}

      <main className="flex-1 md:ml-64 p-6 pt-24 md:pt-6">{renderContent()}</main>
    </div>
  );
}

// ... SUB-VIEWS ...
function StudentsView({ onBack }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false); 
  const [studentToDelete, setStudentToDelete] = useState(null);
  
  // Estado para edição de data e role
  const [editingDateId, setEditingDateId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editingRoleId, setEditingRoleId] = useState(null);

  const fetchStudents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const studentsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsList);
    } catch (error) {
      console.error("Erro ao buscar alunos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleCreateStudent = async (studentData) => {
      if (isCreating) return; 
      setIsCreating(true);

      const appName = `SecondaryApp-${Date.now()}`;
      let secondaryApp;

      try {
          secondaryApp = initializeApp(firebaseConfig, appName);
          const secondaryAuth = getAuth(secondaryApp);

          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, studentData.email, studentData.password);
          const newUser = userCredential.user;

          await updateProfile(newUser, { displayName: studentData.name });

          const createdAt = new Date();
          const subscriptionUntil = new Date(createdAt);
          subscriptionUntil.setDate(subscriptionUntil.getDate() + 30);
          // Ajusta para final do dia no fuso local
          subscriptionUntil.setHours(23, 59, 59, 999);

          await setDoc(doc(db, "users", newUser.uid), {
              name: studentData.name,
              email: studentData.email,
              role: studentData.role,
              dailyGoal: 50,
              createdAt: createdAt.toISOString(),
              subscriptionUntil: subscriptionUntil.toISOString() 
          });

          await setDoc(doc(db, "users", newUser.uid, "stats", "main"), {
              correctAnswers: 0,
              totalAnswers: 0,
              questionsToday: 0,
              streak: 0,
              lastStudyDate: null
          });

          alert("Aluno criado com sucesso!"); 
          setIsCreateModalOpen(false);
          fetchStudents(); 
          
      } catch (error) {
          console.error("Erro ao criar aluno:", error);
          if (error.code === 'auth/email-already-in-use') {
              alert("Erro: Este e-mail já tem um login ativo no Firebase. Como os dados foram excluídos anteriormente, o login ficou 'zumbi'. Use outro e-mail ou exclua o usuário manualmente no painel 'Authentication' do Firebase.");
          } else {
              alert("Erro ao criar aluno: " + error.message);
          }
      } finally {
          if (secondaryApp) {
              try {
                  await deleteApp(secondaryApp); 
              } catch (e) {
                  console.error("Erro ao limpar app secundário", e);
              }
          }
          setIsCreating(false); 
      }
  };

  const confirmDeleteStudent = async () => {
      if (!studentToDelete) return;
      try {
          const userId = studentToDelete.id;
          await deleteDoc(doc(db, "users", userId));
          
          // Limpa subcoleções
          const simsQuery = query(collection(db, `users/${userId}/simulations`));
          const simsSnapshot = await getDocs(simsQuery);
          const batch = writeBatch(db);
          simsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
          const statsDoc = doc(db, `users/${userId}/stats`, 'main');
          batch.delete(statsDoc);
          
          await batch.commit();
          
          alert("Dados do aluno excluídos com sucesso. O acesso à plataforma foi revogado.");
          setStudents(prev => prev.filter(s => s.id !== userId));
      } catch (error) {
          console.error("Erro ao excluir:", error);
          alert("Erro ao excluir dados do aluno.");
      } finally {
          setStudentToDelete(null);
      }
  };

  // Funções de Edição de Assinatura
  const startEditingDate = (student) => {
    setEditingDateId(student.id);
    setEditingRoleId(null); // Fecha edição de role
    if(student.subscriptionUntil) {
        // CORREÇÃO DE VISUALIZAÇÃO: Converte UTC para Data Local para preencher o input type="date"
        const d = new Date(student.subscriptionUntil);
        // Ajusta o fuso horário para pegar o ano-mês-dia local correto
        const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        setEditDate(localIso);
    } else {
        // Se não tiver data, pega hoje local
        const d = new Date();
        const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        setEditDate(localIso);
    }
  };

  const handleAdd30Days = () => {
      // Pega a data que está no input (string YYYY-MM-DD)
      if (!editDate) return;
      
      // Cria data baseada na string (isso cria UTC 00:00, mas ok para somar dias)
      const parts = editDate.split('-');
      const baseDate = new Date(parts[0], parts[1]-1, parts[2]); // Construtor local
      
      baseDate.setDate(baseDate.getDate() + 30);
      
      // Converte de volta para string YYYY-MM-DD para o input
      const year = baseDate.getFullYear();
      const month = String(baseDate.getMonth() + 1).padStart(2, '0');
      const day = String(baseDate.getDate()).padStart(2, '0');
      setEditDate(`${year}-${month}-${day}`);
  };

  const handleSaveDate = async (studentId) => {
      try {
           if(!editDate) return;
           
           // CORREÇÃO DE SALVAMENTO: Cria data local com hora 23:59:59
           const parts = editDate.split('-');
           const year = parseInt(parts[0]);
           const month = parseInt(parts[1]) - 1;
           const day = parseInt(parts[2]);
           
           const newDate = new Date(year, month, day, 23, 59, 59, 999);
           const newDateIso = newDate.toISOString();
           
           await setDoc(doc(db, "users", studentId), { subscriptionUntil: newDateIso }, { merge: true });
           
           setStudents(prev => prev.map(s => s.id === studentId ? {...s, subscriptionUntil: newDateIso} : s));
           setEditingDateId(null);
      } catch (error) {
          console.error("Erro ao atualizar data", error);
          alert("Erro ao atualizar data de vencimento.");
      }
  };

  // Funções de Edição de Função (Role)
  const handleSaveRole = async (studentId, newRole) => {
      try {
           await setDoc(doc(db, "users", studentId), { role: newRole }, { merge: true });
           
           setStudents(prev => prev.map(s => s.id === studentId ? {...s, role: newRole} : s));
           setEditingRoleId(null);
      } catch (error) {
          console.error("Erro ao atualizar função", error);
          alert("Erro ao atualizar função.");
      }
  };

  const getStatus = (isoString) => {
      if(!isoString) return 'Encerrada';
      return new Date(isoString) > new Date() ? 'Ativa' : 'Encerrada';
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-6xl mx-auto">
      {isCreateModalOpen && <CreateStudentModal onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateStudent} isLoading={isCreating} />}
      
      {studentToDelete && (
          <NotificationModal 
            title="Excluir Aluno?" 
            message={`Tem certeza que deseja excluir os dados de ${studentToDelete.name}? Atenção: O login (email/senha) continuará existindo no sistema de autenticação do Firebase, mas o aluno perderá todo o acesso e histórico.`}
            isDangerous={true}
            confirmText="Sim, Excluir Dados"
            cancelText="Cancelar"
            type="error"
            onClose={() => setStudentToDelete(null)}
            onConfirm={confirmDeleteStudent}
          />
      )}
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium">
            <ArrowLeft size={20} className="mr-2" /> Voltar
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Gerenciar Alunos</h1>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all">
            <Plus size={20} /> Adicionar Aluno
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando alunos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-semibold text-gray-600">Nome</th>
                  <th className="p-4 font-semibold text-gray-600">Email</th>
                  <th className="p-4 font-semibold text-gray-600">Função</th>
                  <th className="p-4 font-semibold text-gray-600">Matrícula</th>
                  <th className="p-4 font-semibold text-gray-600">Vencimento</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student) => {
                  const status = getStatus(student.subscriptionUntil);
                  const isEditingDate = editingDateId === student.id;
                  const isEditingRole = editingRoleId === student.id;

                  return (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{student.name || 'Sem nome'}</td>
                    <td className="p-4 text-gray-600">{student.email}</td>
                    <td className="p-4">
                      {isEditingRole ? (
                          <select 
                            value={student.role} 
                            onChange={(e) => handleSaveRole(student.id, e.target.value)}
                            onBlur={() => setEditingRoleId(null)}
                            autoFocus
                            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                          >
                              <option value="student">ALUNO</option>
                              <option value="admin">ADMIN</option>
                          </select>
                      ) : (
                          <span 
                            onClick={() => { setEditingRoleId(student.id); setEditingDateId(null); }}
                            className={`px-2 py-1 rounded-full text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${student.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}
                            title="Clique para alterar"
                          >
                            {student.role === 'admin' ? 'ADMIN' : 'ALUNO'}
                          </span>
                      )}
                    </td>
                    <td className="p-4">
                        {student.role === 'admin' ? (
                            <span className="text-gray-400 font-bold ml-4">-</span>
                        ) : (
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${status === 'Ativa' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {status.toUpperCase()}
                            </span>
                        )}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                        {isEditingDate ? (
                            <div className="flex items-center gap-2">
                                <input 
                                    type="date" 
                                    value={editDate} 
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <button onClick={handleAdd30Days} className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-xs font-bold whitespace-nowrap" title="Adicionar 30 dias">+30</button>
                                <button onClick={() => handleSaveDate(student.id)} className="p-1 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200"><Check size={16}/></button>
                                <button onClick={() => setEditingDateId(null)} className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"><X size={16}/></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => startEditingDate(student)}>
                                <span className={!student.subscriptionUntil ? 'text-gray-400 italic' : ''}>
                                    {student.subscriptionUntil ? new Date(student.subscriptionUntil).toLocaleDateString('pt-BR') : 'Sem data'}
                                </span>
                                <Edit2 size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </td>
                    <td className="p-4 text-right">
                        {student.role !== 'admin' && (
                            <button 
                                onClick={() => setStudentToDelete(student)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir Aluno"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
            {students.length === 0 && (
              <div className="p-8 text-center text-gray-500">Nenhum aluno encontrado.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView({ user, onBack, onResetQuestions, onResetHistory }) {
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  const openModal = (type) => setModalConfig({ isOpen: true, type });
  const handleConfirm = () => {
    if (modalConfig.type === 'questions') onResetQuestions();
    else if (modalConfig.type === 'history') onResetHistory();
  };

  // Estados para edição de perfil
  const [name, setName] = useState(user.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text: '' }

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMsg(null);
    try {
        if(auth.currentUser) {
            // Atualiza Auth Profile
            await updateProfile(auth.currentUser, { displayName: name });
            // Atualiza Firestore
            await setDoc(doc(db, "users", user.uid), { name: name }, { merge: true });
            setMsg({ type: 'success', text: 'Nome atualizado com sucesso!' });
            // CORREÇÃO: Não recarrega mais a página
        }
    } catch (error) {
        console.error(error);
        setMsg({ type: 'error', text: 'Erro ao atualizar perfil.' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSavePassword = async (currentPassword, newPassword) => {
      setIsSaving(true);
      setMsg(null);
      try {
          if (auth.currentUser) {
              // Re-autenticação "fake" (valida a senha atual antes de trocar)
              const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
              await reauthenticateWithCredential(auth.currentUser, credential);
              
              // Se passou daqui, a senha atual está certa. Agora troca.
              await updatePassword(auth.currentUser, newPassword);
              
              setMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
              setIsPasswordModalOpen(false); // Fecha o modal
          }
      } catch (error) {
          console.error(error);
          if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
               setMsg({ type: 'error', text: 'A senha atual está incorreta.' });
          } else if (error.code === 'auth/too-many-requests') {
               setMsg({ type: 'error', text: 'Muitas tentativas. Tente novamente mais tarde.' });
          } else {
              setMsg({ type: 'error', text: 'Erro ao alterar senha. Tente novamente.' });
          }
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-8"><h1 className="text-3xl font-bold text-slate-900">Configurações</h1></div>
      
      {modalConfig.isOpen && (<NotificationModal title={modalConfig.type === 'questions' ? "Resetar Questões?" : "Apagar Tudo?"} message={modalConfig.type === 'questions' ? "Todas as questões voltarão a ser 'novas'. Seu histórico de acertos será apagado, mas sua sequência de dias (streak) será mantida." : "CUIDADO: Isso apagará TODO o seu histórico, incluindo sua sequência de dias (streak)."} isDangerous={true} confirmText={modalConfig.type === 'questions' ? "Sim, Resetar Questões" : "Sim, Apagar Tudo"} type="error" onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} onConfirm={handleConfirm} />)}
      
      {isPasswordModalOpen && (
          <ChangePasswordModal 
            onClose={() => setIsPasswordModalOpen(false)} 
            onSave={handleSavePassword}
            isLoading={isSaving}
          />
      )}

      {msg && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {msg.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span className="font-medium">{msg.text}</span>
          </div>
      )}

      <div className="space-y-6">
        {/* DADOS PESSOAIS */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6"><div className="bg-blue-100 p-3 rounded-full text-blue-600"><User size={24} /></div><div><h2 className="text-xl font-bold text-slate-900">Meu Perfil</h2><p className="text-slate-500 text-sm">Gerencie suas informações pessoais</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Nome Completo</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">E-mail</label><input type="email" value={user.email} disabled className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed" /></div>
            </div>
            <div className="text-right">
                <button onClick={handleSaveProfile} disabled={isSaving || name === user.name} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Salvar Alterações</button>
            </div>
        </div>

        {/* SEGURANÇA */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6"><div className="bg-orange-100 p-3 rounded-full text-orange-600"><Key size={24} /></div><div><h2 className="text-xl font-bold text-slate-900">Segurança</h2><p className="text-slate-500 text-sm">Gerencie sua senha de acesso</p></div></div>
            <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                <div className="mb-4 md:mb-0">
                    <h4 className="font-semibold text-slate-800">Alterar Senha</h4>
                    <p className="text-xs text-gray-500">Recomendamos usar uma senha forte e única.</p>
                </div>
                <button onClick={() => setIsPasswordModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors">
                    <Key size={18} /> Alterar Senha
                </button>
            </div>
        </div>

        {/* ZONA DE PERIGO */}
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 shadow-sm"><div className="flex items-center gap-4 mb-6"><div className="bg-red-100 p-3 rounded-full text-red-600"><AlertTriangle size={24} /></div><div><h2 className="text-xl font-bold text-red-700">Zona de Perigo</h2><p className="text-red-500 text-sm">Ações irreversíveis de gerenciamento de dados</p></div></div><div className="space-y-4">
            
            {/* OPÇÃO 1: RESETAR QUESTÕES (Mantém Streak) */}
            <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-white rounded-xl border border-red-100"><div className="mb-4 md:mb-0"><h4 className="font-semibold text-slate-800">Resetar Questões</h4><p className="text-xs text-gray-500">Apaga o histórico de respostas. As questões voltam a ser novas.</p></div><button onClick={() => openModal('questions')} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors"><RotateCcw size={18} /> Resetar Questões</button></div>
            
            {/* OPÇÃO 2: RESETAR TUDO (Zera Streak) */}
            <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-white rounded-xl border border-red-100"><div className="mb-4 md:mb-0"><h4 className="font-semibold text-slate-800">Resetar Tudo</h4><p className="text-xs text-gray-500">Apaga tudo, inclusive sua sequência (streak).</p></div><button onClick={() => openModal('history')} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"><Trash2 size={18} /> Resetar Tudo</button></div>
            
        </div></div>
      </div>
    </div>
  );
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
    const [allowRepeats, setAllowRepeats] = useState(false);
  
    const toggleArea = (areaId) => setExpandedArea(expandedArea === areaId ? null : areaId);
    const toggleTopic = (areaId, topicName) => {
        const id = `${areaId}-${topicName}`;
        setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };
    
    // Obtém todos os IDs de tópicos possíveis para o botão "Selecionar Tudo"
    const allTopicIds = useMemo(() => {
        const ids = [];
        areasBase.forEach(area => {
            const list = themesMap[area.id] || [];
            list.forEach(theme => ids.push(`${area.id}-${theme}`));
        });
        return ids;
    }, []);

    const toggleSelectAll = () => {
        if (selectedTopics.length === allTopicIds.length) {
            setSelectedTopics([]); // Desmarcar tudo
        } else {
            setSelectedTopics(allTopicIds); // Marcar tudo
        }
    };

    const maxAvailable = useMemo(() => {
        let total = 0;
        selectedTopics.forEach(item => {
            const parts = item.split('-');
            const areaId = parts[0];
            const topicName = parts.slice(1).join('-'); 

            const areaTitle = areaNameMap[areaId];
            const totalInDb = allQuestions.filter(q => q.area === areaTitle && q.topic === topicName).length;
            const availableInDb = allQuestions.filter(q => q.area === areaTitle && q.topic === topicName && !excludedIds.has(q.id)).length;
            total += allowRepeats ? totalInDb : availableInDb;
        });
        return total;
    }, [selectedTopics, allowRepeats, allQuestions, excludedIds]);

    // MODIFICAÇÃO: Define sempre para o máximo possível ao mudar os tópicos
    useEffect(() => {
        setDesiredQuestions(maxAvailable);
    }, [maxAvailable]);

    const handleStart = () => {
        const topicsList = selectedTopics.map(t => {
            const parts = t.split('-');
            return parts.slice(1).join('-'); 
        });
        onLaunchExam(topicsList, desiredQuestions, allowRepeats);
    }
  
    return (
      <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto pb-48">
        <div className="flex items-center justify-between mb-8"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Cancelar</button><div className="text-right"><span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Simulado Personalizado</span></div></div>
        <div className="text-center mb-10"><h1 className="text-3xl font-bold text-slate-900 mb-3">Monte seu Simulado</h1><p className="text-slate-500">Selecione temas de diferentes áreas para praticar de forma mista.</p></div>
        
        {/* BOTÃO SELECIONAR TUDO */}
        <div className="mb-6 flex justify-end">
            <button 
                onClick={toggleSelectAll} 
                className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
                {selectedTopics.length === allTopicIds.length ? (
                    <><Square size={18} /> Desmarcar Tudo</>
                ) : (
                    <><CheckSquare size={18} /> Selecionar Tudo</>
                )}
            </button>
        </div>

        <div className="space-y-4 mb-10">
          {areasBase.map(area => {
            const themes = getThemesForArea(area.id, excludedIds, allQuestions); 
            const isExpanded = expandedArea === area.id;
            const selectedCount = themes.filter(t => selectedTopics.includes(`${area.id}-${t.name}`)).length;
            
            const areaTopicIds = themes.map(t => `${area.id}-${t.name}`);
            const isAreaFullySelected = areaTopicIds.length > 0 && areaTopicIds.every(id => selectedTopics.includes(id));

            const handleAreaToggle = (e) => {
                e.stopPropagation(); 
                if (isAreaFullySelected) {
                    setSelectedTopics(prev => prev.filter(id => !areaTopicIds.includes(id)));
                } else {
                    setSelectedTopics(prev => {
                        const newSet = new Set([...prev, ...areaTopicIds]);
                        return Array.from(newSet);
                    });
                }
            };

            return (
              <div key={area.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div onClick={() => toggleArea(area.id)} className={`p-5 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50 border-b border-gray-100' : ''}`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${area.color} bg-opacity-10`}><area.icon size={24} /></div>
                        <div><h3 className="font-bold text-slate-900">{area.title}</h3><p className="text-xs text-gray-500">{selectedCount} temas selecionados</p></div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleAreaToggle}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors z-10 ${isAreaFullySelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {isAreaFullySelected ? 'Todos' : 'Selecionar'}
                        </button>
                        {isExpanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                    </div>
                </div>
                {isExpanded && (<div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 bg-white animate-in slide-in-from-top-2">{themes.map((theme, i) => { const uniqueId = `${area.id}-${theme.name}`; const isSelected = selectedTopics.includes(uniqueId); const count = allowRepeats ? theme.total : theme.count; return (<div key={i} onClick={() => toggleTopic(area.id, theme.name)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}><div className={isSelected ? 'text-blue-600' : 'text-gray-300'}>{isSelected ? <CheckSquare size={20} /> : <Square size={20} />}</div><div className="flex flex-col"><span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-slate-600'}`}>{theme.name}</span><span className="text-xs text-gray-400">{count} disponíveis</span></div></div>); })}</div>)}
              </div>
            );
          })}
        </div>
        
        {/* CORREÇÃO DE Z-INDEX E POSITIONING PARA NÃO SOBREPOR A LISTA */}
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:pl-64">
             <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1 font-bold uppercase tracking-wide">Quantidade</label>
                        <div className="flex items-center gap-2">
                            <input type="number" min="1" max={maxAvailable} value={desiredQuestions} onChange={(e) => setDesiredQuestions(Math.min(maxAvailable, Math.max(1, parseInt(e.target.value) || 0)))} className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <span className="text-xs text-gray-400">de {maxAvailable}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setAllowRepeats(!allowRepeats)}>
                        <div className={`w-12 h-7 rounded-full relative transition-colors ${allowRepeats ? 'bg-blue-600' : 'bg-gray-200'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm ${allowRepeats ? 'left-6' : 'left-1'}`}></div>
                        </div>
                        <div className="text-sm">
                            <span className="block font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">Incluir respondidas</span>
                        </div>
                    </div>
                </div>
                <button disabled={selectedTopics.length === 0 || maxAvailable === 0} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200" onClick={handleStart}>
                    Começar Agora <ArrowRight size={20} />
                </button>
             </div>
        </div>
      </div>
    );
}

function TopicSelectionView({ area, onBack, onLaunchExam, excludedIds, allQuestions }) {
    const themes = useMemo(() => {
        return getThemesForArea(area.id, excludedIds, allQuestions);
    }, [area, allQuestions, excludedIds]);

    const [selectedTopics, setSelectedTopics] = useState([]);
    const [desiredQuestions, setDesiredQuestions] = useState(5);
    const [allowRepeats, setAllowRepeats] = useState(false);

    const toggleTopic = (id) => setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    const selectAll = () => selectedTopics.length === themes.length ? setSelectedTopics([]) : setSelectedTopics(themes.map(t => t.id));

    const maxAvailable = useMemo(() => {
        let sum = 0;
        themes.forEach(t => {
            if(selectedTopics.includes(t.id)) sum += allowRepeats ? t.total : t.count;
        });
        return sum;
    }, [selectedTopics, themes, allowRepeats]);

    // MODIFICAÇÃO: Define sempre para o máximo possível ao mudar os tópicos
    useEffect(() => {
        setDesiredQuestions(maxAvailable);
    }, [maxAvailable]);

    const handleStart = () => {
        const selectedNames = themes.filter(t => selectedTopics.includes(t.id)).map(t => t.name);
        onLaunchExam(selectedNames, desiredQuestions, allowRepeats);
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto pb-48">
            <div className="flex items-center justify-between mb-8"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Voltar</button><div className="text-right"><span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{area.title}</span></div></div>
            <div className="text-center mb-10"><h1 className="text-3xl font-bold text-slate-900 mb-3">O que vamos estudar hoje?</h1><p className="text-slate-500">Selecione os temas que deseja incluir no seu simulado.</p></div>
            
            {/* BOTÃO SELECIONAR TUDO */}
             <div className="mb-6 flex justify-end">
                <button 
                    onClick={selectAll} 
                    className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                    {selectedTopics.length === themes.length ? (
                        <><Square size={18} /> Desmarcar Todos</>
                    ) : (
                        <><CheckSquare size={18} /> Selecionar Todos</>
                    )}
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
               <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                   <div className="divide-y divide-gray-100">{themes.slice(0, Math.ceil(themes.length / 2)).map(theme => <TopicItem key={theme.id} theme={theme} count={allowRepeats ? theme.total : theme.count} isSelected={selectedTopics.includes(theme.id)} onToggle={() => toggleTopic(theme.id)} />)}</div>
                   <div className="divide-y divide-gray-100">{themes.slice(Math.ceil(themes.length / 2)).map(theme => <TopicItem key={theme.id} theme={theme} count={allowRepeats ? theme.total : theme.count} isSelected={selectedTopics.includes(theme.id)} onToggle={() => toggleTopic(theme.id)} />)}</div>
               </div>
            </div>
            
            {/* CORREÇÃO DE Z-INDEX E POSITIONING PARA NÃO SOBREPOR A LISTA */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:pl-64">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1 font-bold uppercase tracking-wide">Quantidade</label>
                            <div className="flex items-center gap-2">
                                <input type="number" min="1" max={maxAvailable} value={desiredQuestions} onChange={(e) => setDesiredQuestions(Math.min(maxAvailable, Math.max(1, parseInt(e.target.value) || 0)))} className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <span className="text-xs text-gray-400">de {maxAvailable}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setAllowRepeats(!allowRepeats)}>
                            <div className={`w-12 h-7 rounded-full relative transition-colors ${allowRepeats ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm ${allowRepeats ? 'left-6' : 'left-1'}`}></div>
                            </div>
                            <div className="text-sm">
                                <span className="block font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">Incluir respondidas</span>
                            </div>
                        </div>
                    </div>
                    <button disabled={selectedTopics.length === 0 || maxAvailable === 0} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200" onClick={handleStart}>
                        Começar Agora <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function ReviewExamView({ simulation, onBack }) {
  if (!simulation) return <div>Simulado não encontrado.</div>;
  const questions = simulation.questionsData || [];
  const userAnswers = simulation.answersData || {};
  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Voltar para Meus Simulados</button><div className="text-right"><span className="text-sm font-bold text-slate-500 bg-gray-100 px-3 py-1 rounded-full">Revisão: {simulation.title}</span></div></div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-900">Resumo do Desempenho</h2><p className="text-slate-500">Data: {simulation.date}</p></div><div className="text-right"><div className="text-3xl font-bold text-blue-600">{simulation.correct}/{simulation.total}</div><div className="text-sm font-medium text-gray-400">Acertos</div></div></div>
      <div className="space-y-6">{questions.map((q, index) => { const userAnswer = userAnswers[index]; const isCorrect = userAnswer === q.correctOptionId; return (<div key={q.id} className={`bg-white rounded-2xl border overflow-hidden ${isCorrect ? 'border-emerald-200' : 'border-red-200'}`}><div className={`p-4 flex items-center justify-between ${isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}><h3 className={`font-bold flex items-center gap-2 ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>{isCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />} Questão {index + 1}</h3><span className="text-sm font-medium opacity-70">{q.topic}</span></div><div className="p-6"><p className="text-slate-800 mb-4">{q.text}</p><div className="space-y-2 mb-4">{q.options.map(opt => { let optClass = "p-3 rounded-lg border border-gray-100 text-gray-600"; if (opt.id === q.correctOptionId) optClass = "p-3 rounded-lg border border-emerald-500 bg-emerald-50 text-emerald-800 font-bold"; else if (opt.id === userAnswer && !isCorrect) optClass = "p-3 rounded-lg border border-red-500 bg-red-50 text-red-800 font-bold"; return (<div key={opt.id} className={optClass}><span className="uppercase mr-2">{opt.id})</span> {opt.text}</div>); })}</div><div className="bg-gray-50 p-4 rounded-xl text-sm text-slate-600"><span className="font-bold block mb-1">Comentário:</span>{q.explanation}</div></div></div>); })}</div>
    </div>
  );
}

function MySimulationsView({ simulations, onCreateNew, onResume, onViewResults, onDelete }) {
  const [activeTab, setActiveTab] = useState('finished');
  const [simToDelete, setSimToDelete] = useState(null);

  const openSims = simulations.filter(s => s.status === 'open');
  const finishedSims = simulations.filter(s => s.status === 'finished');

  const confirmDelete = () => {
      if(simToDelete && onDelete) {
          onDelete(simToDelete.id);
          setSimToDelete(null);
      }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto">
      {simToDelete && (
          <NotificationModal 
            title="Excluir Simulado?" 
            message="Ao excluir, todo o progresso de desempenho deste simulado será perdido e as questões voltarão a contar como 'não feitas' nas estatísticas globais." 
            type="error"
            isDangerous={true}
            confirmText="Sim, Excluir"
            cancelText="Cancelar"
            onClose={() => setSimToDelete(null)}
            onConfirm={confirmDelete}
          />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4"><div><h1 className="text-3xl font-bold text-slate-900 mb-2">Meus Simulados</h1><p className="text-slate-500">Gerencie seus treinos e acompanhe seu histórico.</p></div><button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all"><Plus size={20} /> Novo Simulado</button></div>
      <div className="flex border-b border-gray-200 mb-6"><button onClick={() => setActiveTab('open')} className={`pb-3 px-6 font-medium text-sm transition-colors relative ${activeTab === 'open' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Em Andamento ({openSims.length}){activeTab === 'open' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}</button><button onClick={() => setActiveTab('finished')} className={`pb-3 px-6 font-medium text-sm transition-colors relative ${activeTab === 'finished' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Concluídos ({finishedSims.length}){activeTab === 'finished' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}</button></div>
      
      <div className="space-y-4">
        {activeTab === 'open' ? (
            openSims.length > 0 ? (
                openSims.map(sim => (
                    <div key={sim.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><Clock size={24} /></div>
                            <div><h3 className="font-bold text-slate-900">{sim.title}</h3><div className="flex items-center gap-2 text-sm text-gray-500"><span>{sim.date}</span><span>•</span><span>{sim.type}</span></div></div>
                        </div>
                        <div className="flex items-center gap-4 md:gap-6">
                            <div className="text-right hidden md:block"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Progresso</p><p className="font-bold text-slate-700">{sim.progress} / {sim.total}</p></div>
                            <button onClick={() => onResume(sim.id)} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors">Continuar <ArrowRight size={16} /></button>
                            <button onClick={() => setSimToDelete(sim)} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={20} /></button>
                        </div>
                    </div>
                ))
            ) : <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200"><FileText size={48} className="mx-auto text-gray-300 mb-4" /><h3 className="text-lg font-bold text-gray-600">Nenhum simulado em aberto</h3></div>
        ) : (
            finishedSims.length > 0 ? (
                finishedSims.map(sim => (
                    <div key={sim.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle size={24} /></div>
                            <div><h3 className="font-bold text-slate-900">{sim.title}</h3><div className="flex items-center gap-2 text-sm text-gray-500"><span>{sim.date}</span><span>•</span><span>{sim.type}</span></div></div>
                        </div>
                        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-right md:mr-4"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nota</p><p className="font-bold text-emerald-600">{sim.correct} / {sim.total} ({Math.round((sim.correct/sim.total)*100)}%)</p></div>
                            <div className="flex gap-2">
                                <button onClick={() => onViewResults(sim.id)} className="bg-white border border-gray-200 hover:bg-gray-50 text-slate-600 px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors"><Eye size={18} /> Ver Detalhes</button>
                                <button onClick={() => setSimToDelete(sim)} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200" title="Excluir"><Trash2 size={20} /></button>
                            </div>
                        </div>
                    </div>
                ))
            ) : <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200"><CheckCircle size={48} className="mx-auto text-gray-300 mb-4" /><h3 className="text-lg font-bold text-gray-600">Nenhum simulado concluído</h3></div>
        )}
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

  // Percentage based on ANSWERED only
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
            <div className="p-4 bg-gray-50 rounded-2xl">
                <div className="text-sm text-gray-500 mb-1 font-bold">Total</div>
                <div className="text-2xl font-bold text-slate-800">{totalQuestions}</div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl">
                <div className="text-sm text-emerald-600 mb-1 font-bold">Acertos</div>
                <div className="text-2xl font-bold text-emerald-700">{correctCount}</div>
            </div>
            <div className="p-4 bg-red-50 rounded-2xl">
                <div className="text-sm text-red-600 mb-1 font-bold">Erros</div>
                <div className="text-2xl font-bold text-red-700">{wrongCount}</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-2xl">
                <div className="text-sm text-yellow-600 mb-1 font-bold">Nulas</div>
                <div className="text-2xl font-bold text-yellow-700">{unansweredCount}</div>
            </div>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-4 mb-2 overflow-hidden">
            <div className={`h-4 rounded-full transition-all duration-1000 ${percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${percentage}%` }}></div>
        </div>
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

function QuestionView({ area, initialData, onExit, onFinish, onPause }) {
  const [questions] = useState(() => initialData ? initialData.questionsData : []); 
  const [userAnswers, setUserAnswers] = useState(() => initialData ? initialData.answersData : {}); 
  const [currentIndex, setCurrentIndex] = useState(() => initialData ? initialData.currentIndex : 0);
  
  const [selectedOption, setSelectedOption] = useState(null);
  const [status, setStatus] = useState('unanswered'); 

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
      let correctCount = 0;
      questions.forEach((q, idx) => { if (userAnswers[idx] === q.correctOptionId) correctCount++; });
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

  // --- NOVA BARRA DE NAVEGAÇÃO MOBILE (FIXA) ---
  const MobileNavBar = () => (
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-3 z-50 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:hidden">
          <button 
              onClick={handlePrevious} 
              disabled={currentIndex === 0}
              className="p-3 text-slate-500 hover:text-blue-600 disabled:opacity-30 rounded-xl bg-gray-50 border border-gray-100"
          >
              <ArrowLeft size={24} />
          </button>
          
          <div className="flex-1 mx-3">
            {status === 'unanswered' ? (
                <button 
                    onClick={handleConfirmAnswer} 
                    disabled={!selectedOption} 
                    className="w-full bg-blue-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                >
                    Responder
                </button>
            ) : (
                <button 
                    onClick={handleRedo} 
                    className="w-full text-blue-600 border border-blue-200 bg-blue-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                    <RotateCcw size={18} /> Refazer
                </button>
            )}
          </div>

          <button 
              onClick={handleNext} 
              className="p-3 text-white bg-slate-900 rounded-xl shadow-lg"
          >
              <ArrowRight size={24} />
          </button>
      </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-5xl mx-auto pb-32 md:pb-0">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">{currentQuestion.institution}</span>
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{currentQuestion.year}</span>
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{currentQuestion.topic}</span>
              </div>
              <p className="text-base md:text-lg text-slate-800 leading-relaxed mb-6 font-medium">{currentQuestion.text}</p>
          </div>
          
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
          
          {/* BARRA DE NAVEGAÇÃO DESKTOP (Escondida no Mobile) */}
          <div className="hidden md:flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                <button 
                    onClick={handlePrevious} 
                    disabled={currentIndex === 0}
                    className="px-4 py-3 text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-500 font-bold flex items-center gap-2 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"
                >
                    <ArrowLeft size={20} /> Anterior
                </button>

                {status === 'unanswered' ? (
                    <button 
                        onClick={handleConfirmAnswer} 
                        disabled={!selectedOption} 
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all transform active:scale-95 flex-1 mx-4"
                    >
                        Responder
                    </button>
                ) : (
                    <button 
                        onClick={handleRedo} 
                        className="text-gray-500 hover:text-blue-600 font-bold flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors border border-gray-200 mx-4"
                    >
                        <RotateCcw size={18} /> Refazer
                    </button>
                )}

                <button 
                    onClick={handleNext} 
                    className="px-4 py-3 text-blue-600 hover:text-blue-800 font-bold flex items-center gap-2 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                >
                    {currentIndex === questions.length - 1 ? 'Finalizar' : 'Próxima'} <ArrowRight size={20} />
                </button>
          </div>

        </div>
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
      
      {/* BARRA FIXA MOBILE */}
      <MobileNavBar />
    </div>
  );
}

function TopicItem({ theme, isSelected, onToggle, count }) {
  return (
    <div onClick={onToggle} className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
      <div className="flex items-center gap-4"><div className={`transition-colors ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>{isSelected ? <CheckSquare size={24} fill="currentColor" className="text-blue-200" /> : <Square size={24} />}</div><div className="flex flex-col"><span className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{theme.name}</span><span className="text-xs text-gray-400">{count} questões disponíveis</span></div></div>
    </div>
  );
}

function AreaCard({ area, onClick }) {
  return (
    <div onClick={onClick} className={`group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden hover:border-blue-300`}>
      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110`}><area.icon size={100} className={area.color.split(' ')[1]} /></div>
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${area.color}`}><area.icon size={28} /></div>
      <h4 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">{area.title}</h4>
      <p className="text-sm text-slate-500 mb-4">{area.count}</p>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden"><div className={`h-1.5 rounded-full ${area.color.split(' ')[0].replace('bg-', 'bg-')}`} style={{ width: `${area.progress}%` }} ></div></div>
      <p className="text-xs text-slate-400 mt-2 text-right">{area.progress}% Concluído</p>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active = false, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg transition-all ${active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}><Icon size={20} className={active ? 'text-blue-700' : 'text-gray-400'} /><span>{label}</span></button>
  );
}

function StatCard({ title, value, target, sub, color, bg, icon, onClick, editable }) {
  return (
    <div onClick={onClick} className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:border-blue-300 group' : ''}`}>
      <div><p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">{title}{editable && <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />}</p><div className="flex items-baseline gap-2"><h3 className="text-2xl font-bold text-slate-900">{value}</h3>{target && <span className="text-sm text-gray-400 font-medium">{target}</span>}</div>{sub && <p className={`text-xs font-medium mt-1 ${color}`}>{sub}</p>}</div><div className={`p-3 rounded-xl ${bg} ${color}`}>{icon}</div>
    </div>
  );
}

function PerformanceView({ detailedStats, onBack }) {
    const { totalQuestions, totalCorrect, byArea } = detailedStats;
    const globalPercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto">
             <div className="flex items-center justify-between mb-8"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Voltar</button><h1 className="text-2xl font-bold text-slate-900">Desempenho Detalhado</h1></div>
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 text-center">
                <h2 className="text-lg font-semibold text-slate-600 mb-2">Aproveitamento Geral</h2>
                <div className="text-5xl font-bold text-blue-600 mb-2">{globalPercentage}%</div>
                <p className="text-gray-400">{totalCorrect} acertos de {totalQuestions} questões</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {areasBase.map(area => {
                    const stats = byArea[area.title];
                    const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                    return (
                        <div key={area.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${area.color} bg-opacity-10`}><area.icon size={20} /></div>
                                <h3 className="font-bold text-slate-800">{area.title}</h3>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl font-bold text-slate-700">{percentage}%</span>
                                <span className="text-xs text-gray-400">{stats.correct}/{stats.total}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full ${area.color.split(' ')[0].replace('bg-', 'bg-')}`} style={{ width: `${percentage}%` }} ></div></div>
                        </div>
                    )
                })}
             </div>
        </div>
    )
}
