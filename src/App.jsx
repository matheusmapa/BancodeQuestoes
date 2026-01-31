import React, { useState, useEffect, useMemo } from 'react';
import { 
  Stethoscope, Scissors, Baby, HeartPulse, Activity, BookOpen, BarChart2, 
  Settings, LogOut, Search, CheckCircle, Clock, Menu, X, Lock, Mail, 
  ChevronRight, ArrowRight, AlertCircle, ArrowLeft, Play, Filter, CheckSquare, 
  Square, Edit2, Check, Image as ImageIcon, RotateCcw, Home, List, Plus, 
  ChevronDown, ChevronUp, FileText, PlayCircle, Eye, PauseCircle, Save, 
  Database, User, Bell, Shield, Target, TrendingUp, Award, Info, XCircle, 
  TrendingDown, HelpCircle, RefreshCw, Repeat, Trash2, AlertTriangle, Zap, Key, Users, UserPlus, Calendar, PlusCircle, FilePlus, Map 
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
  { id: 'clinica', title: 'Clínica Médica', icon: Stethoscope, color: 'bg-blue-50 text-blue-600', borderColor: 'hover:border-blue-200' },
  { id: 'cirurgia', title: 'Cirurgia Geral', icon: Scissors, color: 'bg-emerald-50 text-emerald-600', borderColor: 'hover:border-emerald-200' },
  { id: 'go', title: 'Ginecologia e Obstetrícia', icon: HeartPulse, color: 'bg-rose-50 text-rose-600', borderColor: 'hover:border-rose-200' },
  { id: 'pediatria', title: 'Pediatria', icon: Baby, color: 'bg-amber-50 text-amber-600', borderColor: 'hover:border-amber-200' },
  { id: 'geriatria', title: 'Geriatria', icon: Activity, color: 'bg-violet-50 text-violet-600', borderColor: 'hover:border-violet-200' },
];

const themesMap = {
    'clinica': ['Cardiologia', 'Pneumologia', 'Nefrologia', 'Gastroenterologia', 'Hepatologia', 'Endocrinologia', 'Hematologia', 'Reumatologia', 'Infectologia', 'Dermatologia', 'Neurologia'],
    'cirurgia': ['Trauma (ATLS)', 'Abdome Agudo', 'Hérnias da Parede Abdominal', 'Aparelho Digestivo', 'Pré e Pós-Operatório', 'Cirurgia Vascular', 'Urologia', 'Cirurgia Pediátrica', 'Cirurgia Torácica', 'Queimaduras'],
    'go': ['Pré-Natal', 'Sangramentos na Gestação', 'Doença Hipertensiva Específica', 'Parto e Puerpério', 'Anticoncepção', 'Climatério', 'Oncologia Ginecológica', 'Infecções Ginecológicas', 'Amenorreias', 'Infertilidade'],
    'pediatria': ['Neonatologia', 'Crescimento e Desenvolvimento', 'Aleitamento Materno', 'Imunizações', 'Doenças Exantemáticas', 'Doenças Respiratórias', 'Gastroenterologia Pediátrica', 'Nefrologia Pediátrica', 'Emergências Pediátricas', 'Adolescência'],
    'geriatria': ['Grandes Síndromes Geriátricas', 'Demências e Cognição', 'Delirium', 'Quedas e Instabilidade', 'Polifarmácia', 'Cuidados Paliativos', 'Imobilidade', 'Incontinência Urinária', 'Psiquiatria Geriátrica', 'Cardiologia no Idoso']
};

const areaNameMap = {
    'clinica': 'Clínica Médica',
    'cirurgia': 'Cirurgia Geral',
    'go': 'Ginecologia e Obstetrícia',
    'pediatria': 'Pediatria',
    'geriatria': 'Geriatria'
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
      // Compatibilidade: Se tiver questionsData usa, senão remonta pelos IDs
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
            <p className="text-blue-100 text-lg font-light leading-relaxed">Acesso exclusivo à plataforma de questões mais barata.</p>
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
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
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{dynamicAreas.map((area) => (<AreaCard key={area.id} area={area} onClick={() => { setSelectedArea(area); setCurrentView('area_hub'); }} />))}</div>
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
            setSelectedTopics([]); 
        } else {
            setSelectedTopics(allTopicIds); 
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
      <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto pb-40 md:pb-24">
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
                    <><CheckSquare size={18} /> Selecionar Tudo (Todas as Áreas)</>
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
        
        {/* FOOTER FIXO MOBILE-FRIENDLY */}
        <div className="sticky bottom-0 md:bottom-6 z-30 bg-white/95 backdrop-blur-md border-t md:border border-gray-200 p-4 md:rounded-2xl shadow-2xl md:mx-auto max-w-4xl -mx-6 md:mx-0">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Controles (Linha no Mobile) */}
                <div className="flex items-center justify-between w-full md:w-auto gap-6">
                    {/* Quantidade */}
                    <div>
                        <label className="text-xs text-gray-500 block mb-1 font-bold uppercase tracking-wide">Qtd.</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                min="1" 
                                max={maxAvailable} 
                                value={desiredQuestions} 
                                onChange={(e) => setDesiredQuestions(Math.min(maxAvailable, Math.max(1, parseInt(e.target.value) || 0)))} 
                                className="w-16 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            />
                            <span className="text-xs text-gray-400 font-medium">/ {maxAvailable}</span>
                        </div>
                    </div>

                    {/* Repetir */}
                    <div className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setAllowRepeats(!allowRepeats)}>
                         <div className={`w-10 h-6 rounded-full relative transition-colors ${allowRepeats ? 'bg-blue-600' : 'bg-gray-200'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${allowRepeats ? 'left-5' : 'left-1'}`}></div>
                         </div>
                         <div className="text-sm">
                            <span className="block font-bold text-slate-700 leading-tight">Repetir</span>
                            <span className="text-[10px] text-gray-400">Respondidas</span>
                         </div>
                    </div>
                </div>

                {/* Botão de Ação (Full width no Mobile) */}
                <button 
                    disabled={selectedTopics.length === 0 || maxAvailable === 0} 
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200" 
                    onClick={handleStart}
                >
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

    useEffect(() => {
        setDesiredQuestions(maxAvailable);
    }, [maxAvailable]);

    const handleStart = () => {
        const selectedNames = themes.filter(t => selectedTopics.includes(t.id)).map(t => t.name);
        onLaunchExam(selectedNames, desiredQuestions, allowRepeats);
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto pb-40 md:pb-24">
            <div className="flex items-center justify-between mb-8"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Voltar</button><div className="text-right"><span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{area.title}</span></div></div>
            <div className="text-center mb-10"><h1 className="text-3xl font-bold text-slate-900 mb-3">O que vamos estudar hoje?</h1><p className="text-slate-500">Selecione os temas que deseja incluir no seu simulado.</p></div>
            
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
            
            {/* FOOTER FIXO MOBILE-FRIENDLY (REUTILIZADO LÓGICA) */}
            <div className="sticky bottom-0 md:bottom-6 z-30 bg-white/95 backdrop-blur-md border-t md:border border-gray-200 p-4 md:rounded-2xl shadow-2xl md:mx-auto max-w-4xl -mx-6 md:mx-0">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    
                    <div className="flex items-center justify-between w-full md:w-auto gap-6">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1 font-bold uppercase tracking-wide">Qtd.</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    min="1" 
                                    max={maxAvailable} 
                                    value={desiredQuestions} 
                                    onChange={(e) => setDesiredQuestions(Math.min(maxAvailable, Math.max(1, parseInt(e.target.value) || 0)))} 
                                    className="w-16 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                                <span className="text-xs text-gray-400 font-medium">/ {maxAvailable}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setAllowRepeats(!allowRepeats)}>
                             <div className={`w-10 h-6 rounded-full relative transition-colors ${allowRepeats ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${allowRepeats ? 'left-5' : 'left-1'}`}></div>
                             </div>
                             <div className="text-sm">
                                <span className="block font-bold text-slate-700 leading-tight">Repetir</span>
                                <span className="text-[10px] text-gray-400">Respondidas</span>
                             </div>
                        </div>
                    </div>

                    <button 
                        disabled={selectedTopics.length === 0 || maxAvailable === 0} 
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200" 
                        onClick={handleStart}
                    >
                        Começar Agora <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function TopicItem({ theme, count, isSelected, onToggle }) {
    return (
        <div 
            onClick={onToggle} 
            className={`p-5 cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
        >
            <div>
                <span className={`text-base font-semibold block mb-1 ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>{theme.name}</span>
                <span className="text-sm text-gray-500">{count} questões disponíveis</span>
            </div>
            <div className={isSelected ? 'text-blue-600' : 'text-gray-300'}>
                {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
            </div>
        </div>
    );
}

// ... VIEW DE QUESTÃO (QuestionView) ...
function QuestionView({ area, initialData, onExit, onFinish, onPause }) {
  const [examData, setExamData] = useState(initialData);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState({ correct: 0, wrong: 0 });

  useEffect(() => {
     if(initialData && initialData.answersData) {
         // Calcula resultados iniciais se for retomada
         let c = 0, w = 0;
         initialData.questionsData.forEach((q, idx) => {
             const ans = initialData.answersData[idx];
             if(ans) {
                 if(ans === q.correctOptionId) c++;
                 else w++;
             }
         });
         setResults({ correct: c, wrong: w });
     }
  }, [initialData]);

  const currentQuestion = examData.questionsData[examData.currentIndex];
  const totalQuestions = examData.questionsData.length;
  const progress = ((examData.currentIndex + 1) / totalQuestions) * 100;
  
  // Verifica se a questão atual já foi respondida (no caso de retomada)
  const previousAnswer = examData.answersData[examData.currentIndex];

  useEffect(() => {
      // Se já tiver resposta salva, mostra ela e o gabarito
      if (previousAnswer) {
          setSelectedOption(previousAnswer);
          setShowAnswer(true);
      } else {
          setSelectedOption(null);
          setShowAnswer(false);
      }
  }, [examData.currentIndex, previousAnswer]);

  const handleConfirm = () => {
    if (!selectedOption) return;
    
    // Salva a resposta no estado local
    const newAnswers = { ...examData.answersData, [examData.currentIndex]: selectedOption };
    setExamData(prev => ({ ...prev, answersData: newAnswers }));

    const isCorrect = selectedOption === currentQuestion.correctOptionId;
    setResults(prev => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      wrong: !isCorrect ? prev.wrong + 1 : prev.wrong
    }));
    setShowAnswer(true);
  };

  const handleNext = () => {
    if (examData.currentIndex + 1 < totalQuestions) {
      setExamData(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    } else {
      onFinish(results, examData.questionsData, examData.answersData, examData.id);
    }
  };

  const handlePrevious = () => {
      if (examData.currentIndex > 0) {
          setExamData(prev => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
      }
  };

  const handleSaveAndExit = () => {
      onPause(examData.questionsData, examData.answersData, examData.currentIndex, examData.id);
  };

  return (
    <div className="max-w-4xl mx-auto pb-40 md:pb-10 animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={handleSaveAndExit} className="text-gray-500 hover:text-blue-600 font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
            <PauseCircle size={20} /> <span className="hidden md:inline">Salvar e Sair</span>
        </button>
        <div className="flex flex-col items-center">
             <span className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Questão {examData.currentIndex + 1} de {totalQuestions}</span>
             <div className="w-32 md:w-64 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
        </div>
        <div className="flex items-center gap-3 text-sm font-bold bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
             <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={16} /> {results.correct}</span>
             <span className="text-gray-300">|</span>
             <span className="text-red-500 flex items-center gap-1"><XCircle size={16} /> {results.wrong}</span>
        </div>
      </div>

      {/* Card da Questão */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 md:p-10 border-b border-gray-100">
            {/* Metadados da Questão */}
            <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-md">{currentQuestion.area}</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-md">{currentQuestion.topic}</span>
                {currentQuestion.institution && <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-md">{currentQuestion.institution}</span>}
                {currentQuestion.year && <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-md">{currentQuestion.year}</span>}
            </div>

            {/* Texto da Questão */}
            <h2 className="text-lg md:text-xl font-medium text-slate-800 leading-relaxed whitespace-pre-line">{currentQuestion.text}</h2>
            {currentQuestion.hasImage && <div className="mt-6 rounded-xl overflow-hidden border border-gray-200"><img src={currentQuestion.imageUrl} alt="Imagem da questão" className="w-full h-auto object-cover" /></div>}
        </div>

        {/* Opções */}
        <div className="p-6 md:p-10 bg-gray-50/50 space-y-3">
           {currentQuestion.options.map((option) => {
             let statusClass = "border-gray-200 hover:border-blue-300 hover:bg-blue-50";
             if (showAnswer) {
                if (option.id === currentQuestion.correctOptionId) statusClass = "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500";
                else if (option.id === selectedOption && option.id !== currentQuestion.correctOptionId) statusClass = "border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500";
                else statusClass = "border-gray-200 opacity-60";
             } else if (selectedOption === option.id) {
                statusClass = "border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-600 shadow-md";
             }

             return (
               <button
                 key={option.id}
                 onClick={() => !showAnswer && setSelectedOption(option.id)}
                 disabled={showAnswer}
                 className={`w-full p-5 text-left rounded-xl border-2 transition-all duration-200 flex items-start gap-4 group ${statusClass}`}
               >
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${showAnswer && option.id === currentQuestion.correctOptionId ? 'bg-emerald-200 text-emerald-800' : (selectedOption === option.id ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-200 group-hover:text-blue-700')}`}>
                    {option.id.toUpperCase()}
                 </div>
                 <span className="font-medium text-base mt-1">{option.text}</span>
                 {showAnswer && option.id === currentQuestion.correctOptionId && <CheckCircle className="ml-auto text-emerald-600 flex-shrink-0" />}
                 {showAnswer && option.id === selectedOption && option.id !== currentQuestion.correctOptionId && <XCircle className="ml-auto text-red-500 flex-shrink-0" />}
               </button>
             );
           })}
        </div>

        {/* Explicação (Gabarito) */}
        {showAnswer && (
           <div className="bg-emerald-50 p-6 md:p-10 border-t border-emerald-100 animate-in slide-in-from-bottom-4">
              <h3 className="text-emerald-800 font-bold mb-3 flex items-center gap-2"><BookOpen size={20} /> Comentário do Professor</h3>
              <p className="text-emerald-900 leading-relaxed text-sm md:text-base">{currentQuestion.explanation || "Sem comentário disponível para esta questão."}</p>
           </div>
        )}
      </div>
      
      {/* FOOTER DE NAVEGAÇÃO MOBILE */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 md:hidden z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex gap-3 max-w-md mx-auto">
                <button 
                    onClick={handlePrevious} 
                    disabled={examData.currentIndex === 0} 
                    className="p-3 rounded-xl border border-gray-200 text-gray-600 disabled:opacity-30"
                >
                    <ArrowLeft size={24} />
                </button>
                
                {!showAnswer ? (
                    <button 
                        onClick={handleConfirm} 
                        disabled={!selectedOption} 
                        className="flex-1 bg-blue-600 text-white font-bold rounded-xl py-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all"
                    >
                        Responder
                    </button>
                ) : (
                    <button 
                        onClick={handleNext} 
                        className="flex-1 bg-slate-900 text-white font-bold rounded-xl py-3 shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {examData.currentIndex + 1 === totalQuestions ? 'Finalizar' : 'Próxima'} <ArrowRight size={20} />
                    </button>
                )}
            </div>
      </div>

      {/* FOOTER DE NAVEGAÇÃO DESKTOP */}
      <div className="hidden md:flex justify-between items-center mt-8">
         <button onClick={handlePrevious} disabled={examData.currentIndex === 0} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors flex items-center gap-2"><ArrowLeft size={20} /> Anterior</button>
         
         {!showAnswer ? (
             <button onClick={handleConfirm} disabled={!selectedOption} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-bold text-lg shadow-xl shadow-blue-200 disabled:opacity-50 disabled:shadow-none transition-all transform hover:-translate-y-1">Responder</button>
         ) : (
             <button onClick={handleNext} className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-3 rounded-xl font-bold text-lg shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-2">
                {examData.currentIndex + 1 === totalQuestions ? 'Finalizar' : 'Próxima Questão'} <ArrowRight size={20} />
             </button>
         )}
      </div>
    </div>
  );
}

// ... OUTRAS VIEWS (SimulationSummaryView, MySimulationsView, ReviewExamView, SettingsView, PerformanceView, StudentsView, StatCard, AreaCard, SidebarItem) ...
// Você pode manter as outras views como estavam. O erro estava apenas no import.
// Para garantir, incluirei abaixo as views que faltam para o código ficar completo se você copiar e colar tudo.

function SimulationSummaryView({ results, onHome, onNewExam, onReview }) {
  if (!results) return null;
  const percentage = Math.round((results.correct / results.total) * 100);
  
  // Mensagem motivacional
  let message = "Continue praticando!";
  let color = "text-blue-600";
  if (percentage >= 90) { message = "Excelente! Você destruiu!"; color = "text-emerald-600"; }
  else if (percentage >= 70) { message = "Muito bom! Rumo à aprovação!"; color = "text-blue-600"; }
  else if (percentage >= 50) { message = "Bom começo, vamos melhorar!"; color = "text-orange-500"; }
  else { message = "Não desanime, o erro faz parte do aprendizado."; color = "text-red-500"; }

  return (
    <div className="max-w-2xl mx-auto text-center pt-10 animate-in zoom-in-95 duration-500">
      <div className="mb-8 relative inline-block">
         <div className="w-48 h-48 rounded-full border-8 border-gray-100 flex items-center justify-center mx-auto bg-white shadow-sm">
            <span className={`text-5xl font-black ${color}`}>{percentage}%</span>
         </div>
         {percentage >= 70 && <div className="absolute -right-4 -top-4 bg-yellow-400 p-3 rounded-full shadow-lg animate-bounce"><Award className="text-white" size={32} /></div>}
      </div>
      
      <h2 className={`text-3xl font-bold mb-2 ${color}`}>{message}</h2>
      <p className="text-gray-500 mb-10">Você acertou <strong className="text-slate-800">{results.correct}</strong> de <strong className="text-slate-800">{results.total}</strong> questões.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={onReview} className="py-4 px-6 rounded-xl border-2 border-gray-200 font-bold text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-all">Revisar Prova</button>
        <button onClick={onNewExam} className="py-4 px-6 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Novo Simulado</button>
        <button onClick={onHome} className="py-4 px-6 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all">Voltar ao Início</button>
      </div>
    </div>
  );
}

function MySimulationsView({ simulations, onCreateNew, onResume, onViewResults, onDelete }) {
    const [simToDelete, setSimToDelete] = useState(null);

    return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto pb-24">
      {/* Modal de Confirmação de Exclusão */}
      {simToDelete && (
          <NotificationModal 
            title="Excluir Simulado?"
            message="Tem certeza que deseja excluir este simulado? Todo o seu progresso nele será perdido permanentemente."
            type="error"
            isDangerous={true}
            confirmText="Sim, excluir"
            onClose={() => setSimToDelete(null)}
            onConfirm={() => onDelete(simToDelete)}
          />
      )}

      <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-bold text-slate-900">Meus Simulados</h1><p className="text-slate-500">Histórico e provas em andamento</p></div>
          <button onClick={onCreateNew} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-200 transition-all flex items-center gap-2"><Plus size={20} /> <span className="hidden md:inline">Criar Novo</span></button>
      </div>

      <div className="space-y-4">
        {simulations.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="bg-gray-50 p-4 rounded-full inline-block mb-4"><BookOpen size={40} className="text-gray-300" /></div>
                <h3 className="text-lg font-bold text-gray-400">Nenhum simulado encontrado</h3>
                <p className="text-gray-400 text-sm">Crie seu primeiro simulado personalizado agora!</p>
            </div>
        ) : (
            simulations.map(sim => (
                <div key={sim.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-center justify-between gap-6 group">
                   <div className="flex items-center gap-6 w-full md:w-auto">
                      <div className={`p-4 rounded-2xl ${sim.status === 'finished' ? (sim.correct/sim.total >= 0.7 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600') : 'bg-orange-100 text-orange-600'}`}>
                         {sim.status === 'finished' ? <CheckCircle size={24} /> : <Clock size={24} />}
                      </div>
                      <div>
                          <h3 className="font-bold text-lg text-slate-900">{sim.title || "Simulado Personalizado"}</h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1"><Calendar size={14} /> {sim.date}</span>
                              <span>•</span>
                              <span>{sim.total} Questões</span>
                              {sim.status === 'finished' && (
                                  <><span>•</span><span className={sim.correct/sim.total >= 0.7 ? "text-emerald-600 font-bold" : "text-blue-600 font-bold"}>{Math.round((sim.correct/sim.total)*100)}% Acerto</span></>
                              )}
                          </div>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-3 w-full md:w-auto">
                       {sim.status === 'finished' ? (
                           <button onClick={() => onViewResults(sim.id)} className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors">Ver Resultado</button>
                       ) : (
                           <button onClick={() => onResume(sim.id)} className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-colors">Continuar</button>
                       )}
                       <button onClick={() => setSimToDelete(sim.id)} className="p-3 rounded-xl border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={20} /></button>
                   </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}

function ReviewExamView({ simulation, onBack }) {
    if (!simulation) return <div>Erro ao carregar simulado.</div>;

    const questions = simulation.questionsData || [];
    const answers = simulation.answersData || {};

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto pb-24">
            <div className="flex items-center justify-between mb-8">
                <button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Voltar</button>
                <h1 className="text-xl font-bold text-slate-900">Revisão: {simulation.title}</h1>
            </div>

            <div className="space-y-6">
                {questions.map((q, idx) => {
                    const userAnswer = answers[idx];
                    const isCorrect = userAnswer === q.correctOptionId;
                    const isUnanswered = !userAnswer;

                    return (
                        <div key={idx} className={`bg-white p-6 rounded-2xl border-l-4 shadow-sm ${isUnanswered ? 'border-l-gray-300' : (isCorrect ? 'border-l-emerald-500' : 'border-l-red-500')}`}>
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-sm font-bold text-gray-400 uppercase">Questão {idx + 1}</span>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isUnanswered ? 'bg-gray-100 text-gray-500' : (isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}`}>
                                    {isUnanswered ? 'Não respondida' : (isCorrect ? 'Correta' : 'Incorreta')}
                                </div>
                            </div>
                            
                            <p className="text-slate-800 font-medium mb-4">{q.text}</p>
                            
                            <div className="space-y-2 mb-4">
                                {q.options.map(opt => {
                                    let style = "bg-gray-50 text-gray-500 border-gray-100";
                                    if(opt.id === q.correctOptionId) style = "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold";
                                    else if(opt.id === userAnswer) style = "bg-red-100 text-red-800 border-red-200 font-bold";

                                    return (
                                        <div key={opt.id} className={`p-3 rounded-lg border text-sm flex gap-3 ${style}`}>
                                            <span className="uppercase">{opt.id})</span> {opt.text}
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800">
                                <span className="font-bold block mb-1">Comentário:</span>
                                {q.explanation || "Sem comentário disponível."}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SettingsView({ user, onBack, onResetQuestions, onResetHistory }) {
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [notification, setNotification] = useState(null);
    const [confirmResetQuestions, setConfirmResetQuestions] = useState(false);
    const [confirmResetHistory, setConfirmResetHistory] = useState(false);

    const handleChangePassword = async (currentPass, newPass) => {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPass);
        try {
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPass);
            setIsPasswordModalOpen(false);
            setNotification({ title: 'Sucesso', message: 'Senha alterada com sucesso!', type: 'success' });
        } catch (error) {
            console.error(error);
            setNotification({ title: 'Erro', message: 'Senha atual incorreta.', type: 'error' });
        }
    };

    const handleResetQ = async () => {
        await onResetQuestions();
        setNotification({ title: 'Pronto', message: 'Seu histórico de questões foi zerado. Você pode refazer todas agora.', type: 'success' });
    };

    const handleResetH = async () => {
        await onResetHistory();
        setNotification({ title: 'Pronto', message: 'Sua conta foi resetada completamente (streak, metas e questões).', type: 'success' });
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto pb-24">
            {isPasswordModalOpen && <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} onSave={handleChangePassword} />}
            {notification && <NotificationModal title={notification.title} message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            {confirmResetQuestions && <NotificationModal title="Zerar Questões?" message="Isso apagará seu histórico de acertos/erros para que você possa refazer as questões, mas MANTERÁ seu Streak e Meta Diária." type="info" isDangerous={true} confirmText="Sim, zerar questões" onClose={() => setConfirmResetQuestions(false)} onConfirm={handleResetQ} />}
            {confirmResetHistory && <NotificationModal title="Resetar Conta Inteira?" message="CUIDADO: Isso apagará TUDO (Streak, Metas, Histórico). É como começar uma conta nova do zero." type="error" isDangerous={true} confirmText="Sim, apagar tudo" onClose={() => setConfirmResetHistory(false)} onConfirm={handleResetH} />}

            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack}><ArrowLeft className="text-gray-500" /></button>
                <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                        <p className="text-gray-500">{user.email}</p>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded mt-1 inline-block uppercase font-bold tracking-wider">{user.role === 'admin' ? 'Administrador' : 'Estudante'}</span>
                    </div>
                </div>
                
                <div className="p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Segurança</h3>
                        <button onClick={() => setIsPasswordModalOpen(true)} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-50 p-2 rounded-lg text-orange-500"><Key size={20} /></div>
                                <span className="font-medium text-slate-700">Alterar Senha</span>
                            </div>
                            <ChevronRight size={20} className="text-gray-300 group-hover:text-gray-500" />
                        </button>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Zona de Perigo</h3>
                        <div className="space-y-3">
                            <button onClick={() => setConfirmResetQuestions(true)} className="w-full flex items-center justify-between p-4 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-lg text-red-500 border border-red-100"><RefreshCw size={20} /></div>
                                    <div className="text-left">
                                        <span className="font-bold text-red-700 block">Zerar Histórico de Questões</span>
                                        <span className="text-xs text-red-500">Permite refazer questões respondidas (mantém streak)</span>
                                    </div>
                                </div>
                            </button>
                            
                            <button onClick={() => setConfirmResetHistory(true)} className="w-full flex items-center justify-between p-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-lg text-red-600 border border-red-200"><Trash2 size={20} /></div>
                                    <div className="text-left">
                                        <span className="font-bold text-red-800 block">Resetar Conta (Começar do Zero)</span>
                                        <span className="text-xs text-red-600">Apaga tudo: streak, metas e histórico.</span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
             <div className="text-center mt-8 text-xs text-gray-400">
                MedMaps v1.0.2 • Feito com ❤️ para estudantes de medicina.
            </div>
        </div>
    );
}

function PerformanceView({ detailedStats, onBack }) {
    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto pb-24">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack}><ArrowLeft className="text-gray-500" /></button>
                <h1 className="text-2xl font-bold text-slate-900">Seu Desempenho Detalhado</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-500 uppercase text-xs mb-2">Total de Questões</h3>
                    <div className="text-4xl font-black text-blue-600">{detailedStats.totalQuestions}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                     <h3 className="font-bold text-gray-500 uppercase text-xs mb-2">Taxa de Acerto Geral</h3>
                     <div className="text-4xl font-black text-emerald-600">
                        {detailedStats.totalQuestions > 0 ? Math.round((detailedStats.totalCorrect / detailedStats.totalQuestions) * 100) : 0}%
                     </div>
                </div>
            </div>

            <h3 className="font-bold text-slate-900 mb-4 text-lg">Por Grande Área</h3>
            <div className="space-y-4">
                {Object.entries(detailedStats.byArea).filter(([key]) => key !== 'Geral').map(([areaName, stats]) => {
                     const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                     return (
                         <div key={areaName} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                             <div className="flex justify-between items-center mb-2">
                                 <span className="font-bold text-slate-700">{areaName}</span>
                                 <span className={`font-bold ${percentage >= 70 ? 'text-emerald-600' : (percentage >= 50 ? 'text-blue-600' : 'text-red-500')}`}>{percentage}%</span>
                             </div>
                             <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                 <div className={`h-full rounded-full ${percentage >= 70 ? 'bg-emerald-500' : (percentage >= 50 ? 'bg-blue-500' : 'bg-red-500')}`} style={{ width: `${percentage}%` }}></div>
                             </div>
                             <div className="text-xs text-gray-400 mt-2 text-right">{stats.correct}/{stats.total} acertos</div>
                         </div>
                     )
                })}
            </div>
        </div>
    );
}

function StudentsView({ onBack }) {
    const [students, setStudents] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    // Carrega lista de alunos
    useEffect(() => {
        const q = query(collection(db, "users")); 
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(list);
        });
        return () => unsub();
    }, []);

    const handleCreateStudent = async (data) => {
        setIsLoading(true);
        // NOTA: Em um app real, criar usuário no Auth requer Cloud Functions ou Secondary App.
        // Aqui estamos simulando criando apenas no Firestore para demonstração visual ou assumindo que o Auth seria criado externamente.
        // Como o Firebase Client SDK não permite criar outro usuário sem deslogar o atual, 
        // a criação real de Auth aqui falharia ou deslogaria o admin.
        // Para este MVP, vamos criar apenas o registro no Firestore e simular sucesso, 
        // mas avisando que o Auth real precisaria ser feito via painel ou função admin.
        
        try {
            // Cria documento no Firestore (simulando que o Auth UID seria gerado depois)
            const fakeUid = `user_${Date.now()}`;
            await setDoc(doc(db, "users", fakeUid), {
                ...data,
                subscriptionUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // 1 ano de acesso
                createdAt: new Date().toISOString()
            });
            setIsCreateModalOpen(false);
            setNotification({ title: 'Atenção', message: 'Registro criado no banco de dados. Para login funcionar, crie o usuário também no Firebase Authentication manualmente.', type: 'info' });
        } catch (error) {
            console.error(error);
            setNotification({ title: 'Erro', message: 'Erro ao criar aluno.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto pb-24">
            {isCreateModalOpen && <CreateStudentModal onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateStudent} isLoading={isLoading} />}
            {notification && <NotificationModal title={notification.title} message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}

            <div className="flex items-center justify-between mb-8">
                <button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Voltar</button>
                <div className="flex items-center gap-2">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Users size={24} /></div>
                    <h1 className="text-2xl font-bold text-slate-900">Gerenciar Alunos</h1>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"><Plus size={18} /> Novo Aluno</button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nome</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Função</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Acesso Até</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {students.map(student => (
                            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-medium text-slate-700">{student.name}</td>
                                <td className="p-4 text-gray-500 hidden md:table-cell">{student.email}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${student.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {student.role || 'Student'}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-500 text-sm hidden md:table-cell">
                                    {student.subscriptionUntil ? new Date(student.subscriptionUntil).toLocaleDateString() : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Helpers Visuais (StatCard, AreaCard, SidebarItem)
function StatCard({ title, value, sub, target, color, bg, icon, onClick, editable }) {
  return (
    <div onClick={onClick} className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all ${editable ? 'cursor-pointer group' : ''}`}>
      <div>
        <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
            {title} {editable && <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
        </h3>
        <div className={`text-3xl font-black ${color} flex items-end gap-1`}>
            {value}
            {target && <span className="text-lg text-gray-300 font-medium mb-1">{target}</span>}
        </div>
        <p className="text-xs text-gray-400 font-medium mt-1">{sub}</p>
      </div>
      <div className={`p-4 rounded-xl ${bg} ${color}`}>{icon}</div>
    </div>
  );
}

function AreaCard({ area, onClick }) {
  return (
    <div onClick={onClick} className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 p-4 opacity-5 transform group-hover:scale-110 transition-transform duration-500 ${area.color.split(' ')[1]}`}><area.icon size={100} /></div>
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${area.color} group-hover:scale-110 transition-transform duration-300`}><area.icon size={28} /></div>
      <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">{area.title}</h3>
      <p className="text-gray-400 text-sm font-medium mb-4">{area.count}</p>
      
      {/* Barra de Progresso Real */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${area.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${area.progress}%` }}></div>
      </div>
      <div className="flex justify-between mt-2">
         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Progresso</span>
         <span className={`text-[10px] font-bold ${area.progress >= 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{area.progress}%</span>
      </div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl transition-all font-medium ${active ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-slate-900'}`}>
      <Icon size={20} className={active ? 'text-blue-600' : 'text-gray-400'} />
      <span>{label}</span>
    </button>
  );
}
