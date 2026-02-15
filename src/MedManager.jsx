import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Edit3, Trash2, Save, X, CheckCircle, 
  AlertCircle, Database, List, ArrowLeft, LogOut, Loader2, 
  CheckSquare, BookOpen, AlertTriangle, Copy, Hash,
  MessageSquare, ThumbsUp, ThumbsDown, User, Calendar, Building, Phone,
  Users, TrendingUp, Target, Zap, PlusCircle, Lock, RefreshCw, ChevronDown,
  Shield, Award, UserPlus, ExternalLink, HelpCircle, ImageIcon, ScanLine, Bug
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp, deleteApp } from "firebase/app"; 
import { 
  getFirestore, collection, doc, getDoc, updateDoc, deleteDoc, 
  onSnapshot, query, orderBy, where, writeBatch, setDoc, 
  limit, startAfter, getDocs, startAt, endAt
} from "firebase/firestore";
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, updateProfile 
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- CONSTANTES ---
const ITEMS_PER_PAGE = 20;

const areasBase = [
  'Clínica Médica', 'Cirurgia Geral', 'Ginecologia e Obstetrícia', 'Pediatria', 'Preventiva'
];

const themesMap = {
    'Clínica Médica': ['Cardiologia', 'Dermatologia', 'Endocrinologia e Metabologia', 'Gastroenterologia', 'Hematologia', 'Hepatologia', 'Infectologia', 'Nefrologia', 'Neurologia', 'Pneumologia', 'Psiquiatria', 'Reumatologia'],
    'Cirurgia Geral': ['Abdome Agudo', 'Cirurgia Hepatobiliopancreática', 'Cirurgia Torácica e de Cabeça e Pescoço', 'Cirurgia Vascular', 'Cirurgia do Esôfago e Estômago', 'Coloproctologia', 'Hérnias e Parede Abdominal', 'Pré e Pós-Operatório', 'Queimaduras', 'Resposta Metabólica e Cicatrização', 'Trauma', 'Urologia'],
    'Ginecologia e Obstetrícia': ['Ciclo Menstrual e Anticoncepção', 'Climatério e Menopausa', 'Doenças Intercorrentes na Gestação', 'Infecções Congênitas e Gestacionais', 'Infecções Ginecológicas e ISTs', 'Mastologia', 'Obstetrícia Fisiológica e Pré-Natal', 'Oncologia Pélvica', 'Parto e Puerpério', 'Sangramentos da Gestação', 'Uroginecologia e Distopias', 'Vitalidade Fetal e Amniograma'],
    'Pediatria': ['Adolescência e Puberdade', 'Afecções Respiratórias', 'Aleitamento Materno e Nutrição', 'Cardiologia e Reumatologia Pediátrica', 'Crescimento e Desenvolvimento', 'Emergências e Acidentes', 'Gastroenterologia Pediátrica', 'Imunizações', 'Infectopediatria e Exantemáticas', 'Nefrologia Pediátrica', 'Neonatologia: Patologias', 'Neonatologia: Sala de Parto'],
    'Preventiva': ['Atenção Primária e Saúde da Família', 'Estudos Epidemiológicos', 'Financiamento e Gestão', 'História e Princípios do SUS', 'Indicadores de Saúde e Demografia', 'Medicina Baseada em Evidências', 'Medicina Legal', 'Medidas de Associação e Testes Diagnósticos', 'Políticas Nacionais de Saúde', 'Saúde do Trabalhador', 'Vigilância em Saúde', 'Ética Médica e Bioética']
};

// --- COMPONENTE DE NOTIFICAÇÃO ---
function NotificationToast({ notification, onClose }) {
  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => {
    if (!notification || isHovered) return;
    const timer = setTimeout(() => onClose(), 6000); 
    return () => clearTimeout(timer);
  }, [notification, isHovered, onClose]);

  if (!notification) return null;

  return (
    <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed top-24 right-4 z-[100] p-4 rounded-xl shadow-xl flex items-start gap-3 animate-in slide-in-from-right-10 duration-300 max-w-md border bg-white border-gray-200 text-slate-800"
    >
        <div className={`mt-0.5 p-1 rounded-full ${notification.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
        </div>
        <div className="flex-1">
            <p className="font-bold text-sm mb-1">{notification.type === 'error' ? 'Atenção' : 'Sucesso'}</p>
            <p className="text-sm opacity-90 leading-tight break-words">{notification.text}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400"><X size={18}/></button>
    </div>
  );
}

export default function MedManager() {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // Data State
  const [questions, setQuestions] = useState([]);
  const [extraReportedQuestions, setExtraReportedQuestions] = useState([]); 
  const [lastQuestionDoc, setLastQuestionDoc] = useState(null); 
  const [hasMoreQuestions, setHasMoreQuestions] = useState(true);
  
  const [students, setStudents] = useState([]); 
  const [lastStudentDoc, setLastStudentDoc] = useState(null);
  const [hasMoreStudents, setHasMoreStudents] = useState(true);

  // Reports
  const [reports, setReports] = useState([]); 
  const [userProfiles, setUserProfiles] = useState({}); 

  // Loading States
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false); 
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  
  // View State
  const [activeView, setActiveView] = useState('questions'); 
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- SISTEMA DE AUDITORIA & FILTROS (NOVA LÓGICA) ---
  const [auditMode, setAuditMode] = useState(false);
  const [activeAuditFilter, setActiveAuditFilter] = useState('all_problems'); 
  // 'all_problems', 'missing_meta', 'inconsistent_topic', 'has_image'

  const [selectedArea, setSelectedArea] = useState('Todas');
  const [selectedTopic, setSelectedTopic] = useState('Todos');

  // Students Filters
  const [studentStatusFilter, setStudentStatusFilter] = useState('all'); 
  const [studentRoleFilter, setStudentRoleFilter] = useState('all'); 
  
  // Edit/Action States
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [associatedReport, setAssociatedReport] = useState(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [viewingUserStats, setViewingUserStats] = useState(null); 
  
  // UI State
  const [notification, setNotification] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); 
  const [rejectReportModal, setRejectReportModal] = useState(null);
  
  // Login Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const showNotification = (type, text) => setNotification({ type, text });

  // --- AUTH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (u) {
            const userDoc = await getDoc(doc(db, "users", u.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                setUser(u);
                loadQuestions(true);
            } else {
                await signOut(auth);
                showNotification('error', 'Acesso negado: Apenas administradores.');
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- REALTIME REPORTS & PRIORITY FETCH ---
  useEffect(() => {
    if (!user) return;
    const qReports = query(collection(db, "reports"), where("status", "==", "pending"));
    const unsubReports = onSnapshot(qReports, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setReports(list);
    });
    return () => unsubReports();
  }, [user]);

  const reportsCountByQuestion = useMemo(() => {
      const counts = {}; reports.forEach(r => { counts[r.questionId] = (counts[r.questionId] || 0) + 1; }); return counts;
  }, [reports]);

  // Busca automática das questões reportadas
  useEffect(() => {
    const fetchMissing = async () => {
        if (reports.length === 0) return;
        
        const reportedIds = Object.keys(reportsCountByQuestion);
        const missingIds = reportedIds.filter(id => 
            !questions.find(q => q.id === id) && 
            !extraReportedQuestions.find(q => q.id === id)
        );

        if (missingIds.length === 0) return;

        const newDocs = [];
        const idsToFetch = missingIds.slice(0, 20); 

        await Promise.all(idsToFetch.map(async (id) => {
            try {
                const snap = await getDoc(doc(db, "questions", id));
                if (snap.exists()) {
                    newDocs.push({ id: snap.id, ...snap.data() });
                }
            } catch (e) { console.error("Erro fetch reported q", id, e); }
        }));

        if (newDocs.length > 0) {
            setExtraReportedQuestions(prev => [...prev, ...newDocs]);
        }
    };
    
    const timer = setTimeout(fetchMissing, 1000);
    return () => clearTimeout(timer);
  }, [reportsCountByQuestion, questions, extraReportedQuestions, reports]);


  // --- NOVA FUNÇÃO DE CARREGAMENTO (SIMPLIFICADA) ---
  const loadQuestions = async (reset = false) => {
      if (loadingQuestions) return;
      // Se não for reset e não tiver mais, para.
      if (!reset && !hasMoreQuestions) return;

      setLoadingQuestions(true);

      try {
          // ESTRATÉGIA:
          // 1. Se tiver termo de busca, busca exata ou prefixo.
          // 2. Se for "Audit Mode", faz uma query SEM FILTROS COMPLEXOS (só createdAt desc) 
          //    mas com limite maior para pegarmos amostra e filtrar no cliente.
          // 3. Se for modo normal, usa os filtros de area/topico se selecionados.

          let q = collection(db, "questions");
          let constraints = [];
          const isAudit = auditMode;

          if (isAudit) {
              // No modo auditoria, queremos ver TUDO recentemente para achar erros.
              // Não filtramos no server para garantir que nada seja escondido por falta de indice.
              constraints.push(orderBy("createdAt", "desc"));
              // Aumenta o limite para o filtro cliente ser mais efetivo
              constraints.push(limit(50)); 
          } else {
              // Modo Padrão
              constraints.push(orderBy("createdAt", "desc"));
              
              if (selectedArea !== 'Todas') constraints.push(where("area", "==", selectedArea));
              if (selectedTopic !== 'Todos') constraints.push(where("topic", "==", selectedTopic));
              
              constraints.push(limit(ITEMS_PER_PAGE));
          }

          // Paginação
          if (!reset && lastQuestionDoc) {
              constraints.push(startAfter(lastQuestionDoc));
          }
          
          const finalQuery = query(q, ...constraints);
          const snapshot = await getDocs(finalQuery);
          
          const newQuestions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          
          if (reset) {
              setQuestions(newQuestions);
          } else {
              setQuestions(prev => [...prev, ...newQuestions]);
          }

          setLastQuestionDoc(snapshot.docs[snapshot.docs.length - 1]);
          
          // Lógica de "Tem mais?"
          if (isAudit) {
             // No modo audit, como pegamos blocos grandes, assumimos que tem mais se veio o bloco cheio
             setHasMoreQuestions(snapshot.docs.length === 50);
          } else {
             setHasMoreQuestions(snapshot.docs.length === ITEMS_PER_PAGE);
          }

      } catch (error) {
          console.error("Erro ao carregar questões:", error);
          showNotification('error', 'Erro ao buscar dados: ' + error.message);
      } finally {
          setLoadingQuestions(false);
      }
  };

  // --- BUSCA ESPECÍFICA (ID ou TEXTO) ---
  const handleServerSearch = async () => {
      const term = searchTerm.trim();
      if (!term) {
          loadQuestions(true);
          return;
      }
      setIsSearchingServer(true);
      setAuditMode(false); // Sai do modo auditoria se pesquisar
      
      let foundDocs = [];

      try {
          // 1. ID exato
          try {
            const docRef = doc(db, "questions", term);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                foundDocs.push({ id: docSnap.id, ...docSnap.data() });
            }
          } catch(e) { }

          // 2. Prefixo de Texto
          if (foundDocs.length === 0) {
              const qText = query(
                  collection(db, "questions"),
                  orderBy("text"),
                  startAt(term),
                  endAt(term + '\uf8ff'),
                  limit(10)
              );
              const textSnap = await getDocs(qText);
              textSnap.forEach(d => {
                  if (!foundDocs.some(f => f.id === d.id)) {
                      foundDocs.push({ id: d.id, ...d.data() });
                  }
              });
          }

          if (foundDocs.length > 0) {
              setQuestions(foundDocs); 
              setHasMoreQuestions(false); 
              showNotification('success', `Encontrado(s) ${foundDocs.length} resultado(s)!`);
          } else {
              showNotification('error', 'Nada encontrado. Dica: Cole o início EXATO do enunciado ou o ID.');
          }
      } catch (error) {
          console.error("Erro na busca:", error);
          showNotification('error', 'Erro ao buscar no servidor.');
      } finally {
          setIsSearchingServer(false);
      }
  };

  const handleKeyDownSearch = (e) => {
      if (e.key === 'Enter') {
          handleServerSearch();
      }
  };

  // --- CARREGAR ALUNOS ---
  const loadStudents = async (reset = false) => {
      if (loadingStudents) return;
      if (!reset && !hasMoreStudents) return;

      setLoadingStudents(true);
      try {
          let q = collection(db, "users");
          let constraints = [orderBy("name")]; 

          if (studentRoleFilter !== 'all') {
              constraints.push(where("role", "==", studentRoleFilter));
          }

          if (!reset && lastStudentDoc) {
              constraints.push(startAfter(lastStudentDoc));
          }

          constraints.push(limit(ITEMS_PER_PAGE));

          const finalQuery = query(q, ...constraints);
          const snapshot = await getDocs(finalQuery);

          const newStudents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

          if (reset) {
              setStudents(newStudents);
          } else {
              setStudents(prev => [...prev, ...newStudents]);
          }

          setLastStudentDoc(snapshot.docs[snapshot.docs.length - 1]);
          setHasMoreStudents(snapshot.docs.length === ITEMS_PER_PAGE);

      } catch (error) {
          console.error(error);
          showNotification('error', 'Erro ao carregar alunos.');
      } finally {
          setLoadingStudents(false);
      }
  };

  useEffect(() => {
      if (activeView === 'students' && students.length === 0) {
          loadStudents(true);
      }
  }, [activeView]);

  // Recarrega se mudar filtros no modo normal
  useEffect(() => {
      if(user && !searchTerm && !auditMode) {
          loadQuestions(true);
      }
  }, [selectedArea, selectedTopic]); 

  // Recarrega se ativar modo auditoria
  useEffect(() => {
      if(user && auditMode) {
          loadQuestions(true);
      }
  }, [auditMode]);

  useEffect(() => {
      if(user && activeView === 'students') {
          loadStudents(true);
      }
  }, [studentRoleFilter]);

  // --- HELPER DATA ---
  useEffect(() => {
      const fetchReporters = async () => {
        if (reports.length === 0) return;
        const uids = new Set(reports.map(r => r.userId).filter(uid => uid));
        const newProfiles = { ...userProfiles };
        const toFetch = [];
        uids.forEach(uid => { if (!newProfiles[uid]) toFetch.push(uid); });

        if (toFetch.length === 0) return;

        await Promise.all(toFetch.map(async (uid) => {
            try {
                const snap = await getDoc(doc(db, "users", uid));
                if (snap.exists()) { newProfiles[uid] = snap.data(); } 
                else { newProfiles[uid] = { name: 'Desconhecido', whatsapp: '' }; }
            } catch (e) { console.error("Erro user", uid, e); }
        }));
        setUserProfiles(newProfiles);
      };
      fetchReporters();
  }, [reports]);

  // --- FUNÇÃO DE VERIFICAÇÃO DE CONSISTÊNCIA ---
  const getInconsistency = (q) => {
      if (!q.area || q.area === 'Todas') return 'Área Indefinida';
      if (!q.topic || q.topic === 'Todos') return 'Tópico Indefinido';
      
      const allowedTopics = themesMap[q.area];
      if (!allowedTopics) return 'Área Desconhecida';
      
      // Normalização básica para comparar (remove espaços extras)
      const topicClean = q.topic.trim();
      if (!allowedTopics.includes(topicClean)) {
          return `Tópico '${q.topic}' não pertence a '${q.area}'`;
      }
      return null;
  };

  // --- FILTRAGEM LOCAL ROBUSTA ---
  const filteredQuestions = useMemo(() => {
      const allQuestionsMap = new Map();
      questions.forEach(q => allQuestionsMap.set(q.id, q));
      extraReportedQuestions.forEach(q => allQuestionsMap.set(q.id, q));
      const allQuestions = Array.from(allQuestionsMap.values());

      let result = allQuestions.filter(q => {
          // 1. Busca textual sempre vence
          const term = searchTerm.toLowerCase().trim();
          if (term) {
             return (q.text || '').toLowerCase().includes(term) || 
                    (q.institution || '').toLowerCase().includes(term) || 
                    q.id === term;
          }

          // 2. Se for AUDITORIA, aplica filtros de "Problemas"
          if (auditMode) {
              const inconsistency = getInconsistency(q);
              const missingMeta = !q.institution || !q.year || q.institution === '' || q.year === '';
              const hasImage = !!q.image;
              
              if (activeAuditFilter === 'missing_meta') return missingMeta;
              if (activeAuditFilter === 'inconsistent_topic') return !!inconsistency;
              if (activeAuditFilter === 'has_image') return hasImage;
              
              // 'all_problems': Retorna qualquer um que tenha B.O.
              if (activeAuditFilter === 'all_problems') {
                  return missingMeta || !!inconsistency || hasImage; // Imagem não é erro, mas entra no "pente fino"
              }
              return true; // Se não tiver filtro ativo, mostra tudo do modo audit
          }

          // 3. Modo Normal
          const qInst = (q.institution || '').trim();
          const qYear = String(q.year || '').trim();
          const matchesArea = selectedArea === 'Todas' || q.area === selectedArea;
          const matchesTopic = selectedTopic === 'Todos' || q.topic === selectedTopic;
          return matchesArea && matchesTopic;
      });

      // Ordenação
      result.sort((a, b) => {
          const countA = reportsCountByQuestion[a.id] || 0;
          const countB = reportsCountByQuestion[b.id] || 0;
          if (countA > 0 || countB > 0) {
              if (countA !== countB) return countB - countA; 
          }
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
      });

      return result;
  }, [questions, extraReportedQuestions, reportsCountByQuestion, searchTerm, selectedArea, selectedTopic, auditMode, activeAuditFilter]);

  // --- ACTIONS ---
  const handleLogout = async () => {
      try {
          await signOut(auth);
          setUser(null);
          setQuestions([]); setReports([]); setStudents([]); setExtraReportedQuestions([]);
          setActiveView('questions');
      } catch (error) { console.error(error); }
  };

  const handleGoToReports = (questionId) => {
      // Sai da auditoria e foca na questão
      setAuditMode(false);
      setSearchTerm(questionId); // Truque: Pesquisa pelo ID para garantir que ela apareça
      setActiveView('questions'); // Fica na view questions para ver o card destacado, ou reports se preferir
      // Mas o user pediu "ver tudo que retornou", então melhor ir para reports direto
      // ... Na verdade, o original ia para view 'reports'. Mantendo:
      setActiveView('reports');
  };

  const handleClearAllFilters = () => { 
      setSearchTerm(''); 
      setSelectedArea('Todas'); 
      setSelectedTopic('Todos'); 
      setAuditMode(false);
      loadQuestions(true); 
  };

  // --- MANIPULAÇÃO DE DADOS ---
  const handleSave = async (shouldResolveReport = false) => {
      setIsSaving(true);
      try {
          const batch = writeBatch(db);
          const { id, ...data } = editingQuestion;
          batch.update(doc(db, "questions", id), data);
          if (shouldResolveReport && associatedReport) {
              batch.update(doc(db, "reports", associatedReport.id), { status: 'resolved', resolvedBy: user.email, resolvedAt: new Date().toISOString() });
          }
          await batch.commit();
          
          setQuestions(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
          setExtraReportedQuestions(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
          
          showNotification('success', shouldResolveReport ? 'Salvo e resolvido!' : 'Atualizado!');
          setEditingQuestion(null);
          setAssociatedReport(null);
      } catch (error) { console.error(error); showNotification('error', error.message); } finally { setIsSaving(false); }
  };

  // ... (Funções de deletar, criar user, etc mantidas iguais) ...
  // Para economizar linhas e focar na mudança principal, assumo que você tem o resto das funções
  // Vou recolocar as principais para garantir que não quebre nada.

  const handleCreateUser = async (e) => {
      e.preventDefault();
      setIsSaving(true);
      const formData = new FormData(e.target);
      const userData = Object.fromEntries(formData);
      const appName = `SecondaryApp-${Date.now()}`;
      let secondaryApp;
      try {
          secondaryApp = initializeApp(firebaseConfig, appName);
          const secondaryAuth = getAuth(secondaryApp);
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, userData.password);
          const newUser = userCredential.user;
          await updateProfile(newUser, { displayName: userData.name });
          const newUserId = newUser.uid; 
          const newUserObj = { id: newUserId, name: userData.name, email: userData.email, role: userData.role || 'student', createdAt: new Date().toISOString(), subscriptionUntil: userData.subscriptionUntil || null, whatsapp: userData.whatsapp || '', dailyGoal: 50, stats: { correctAnswers: 0, totalAnswers: 0, streak: 0 } };
          await setDoc(doc(db, "users", newUserId), newUserObj);
          await setDoc(doc(db, "users", newUserId, "stats", "main"), { correctAnswers: 0, totalAnswers: 0, questionsToday: 0, streak: 0, lastStudyDate: null });
          setStudents(prev => [newUserObj, ...prev]);
          showNotification('success', 'Aluno criado!');
          setIsCreatingUser(false);
      } catch (error) { showNotification('error', error.message); } finally { if (secondaryApp) deleteApp(secondaryApp); setIsSaving(false); }
  };

  const handleInlineUserUpdate = async (id, field, value) => {
      try { await updateDoc(doc(db, "users", id), { [field]: value }); setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s)); showNotification('success', 'Atualizado!'); } catch (error) { showNotification('error', error.message); }
  };

  const handleDeleteQuestion = async () => {
      if (!deleteModal || deleteModal.email) return; 
      try {
          await deleteDoc(doc(db, "questions", deleteModal.id));
          setQuestions(prev => prev.filter(q => q.id !== deleteModal.id));
          setExtraReportedQuestions(prev => prev.filter(q => q.id !== deleteModal.id));
          showNotification('success', 'Questão excluída.');
          setDeleteModal(null);
      } catch (error) { showNotification('error', error.message); }
  };
  
  const handleDeleteUser = async () => {
      if (!deleteModal || !deleteModal.email) return;
      try {
          await deleteDoc(doc(db, "users", deleteModal.id));
          setStudents(prev => prev.filter(s => s.id !== deleteModal.id));
          showNotification('success', 'Aluno excluído.');
          setDeleteModal(null);
      } catch (error) { showNotification('error', error.message); }
  };

  const handleRejectReport = async () => {
      if (!rejectReportModal) return;
      try {
          await deleteDoc(doc(db, "reports", rejectReportModal.id));
          showNotification('success', 'Reporte excluído.');
          setRejectReportModal(null);
      } catch (error) { showNotification('error', error.message); }
  };

  const handleOpenFromReport = async (report) => {
      let question = questions.find(q => q.id === report.questionId) || extraReportedQuestions.find(q => q.id === report.questionId);
      if (!question) {
          try {
              const qSnap = await getDoc(doc(db, "questions", report.questionId));
              if (qSnap.exists()) { question = { id: qSnap.id, ...qSnap.data() }; }
          } catch (e) { console.error(e); }
      }
      if (question) {
          let qToEdit = { ...question };
          if (report.category === "metadata_suggestion" || report.category === "suggestion_update") {
              if (report.suggestedInstitution) qToEdit.institution = report.suggestedInstitution;
              if (report.suggestedYear) qToEdit.year = report.suggestedYear;
          }
          setEditingQuestion(qToEdit);
          setAssociatedReport(report);
      } else { showNotification('error', 'Questão não encontrada.'); }
  };
  
  const fetchUserStats = async (student) => {
      setViewingUserStats({ ...student, loading: true });
      try {
          const statsSnap = await getDoc(doc(db, "users", student.id, "stats", "main"));
          if (statsSnap.exists()) { setViewingUserStats({ ...student, stats: statsSnap.data(), loading: false }); } 
          else { setViewingUserStats({ ...student, stats: null, loading: false }); }
      } catch (e) { setViewingUserStats({ ...student, stats: null, loading: false }); }
  };

  const copyToClipboard = async (text) => { try { await navigator.clipboard.writeText(text); showNotification('success', 'Copiado!'); } catch (err) {} };

  // --- RENDER HELPERS ---
  const formatReportCategory = (c) => ({'metadata_suggestion':'Sugestão Metadados','suggestion_update':'Sugestão Atualização','Enunciado incorreto/confuso':'Enunciado Errado'}[c] || c || 'Geral');
  const getUserDetails = (uid) => { const p = userProfiles[uid]; return { name: p?.name || '...', whatsapp: p?.whatsapp || '' }; };
  const checkSubscriptionStatus = (d, role) => { if (role === 'admin') return { status: 'Admin', color: 'indigo', label: 'Admin' }; if (!d) return { status: 'Expirado', color: 'red', label: 'Expirado' }; return new Date(d) > new Date() ? { status: 'Ativo', color: 'emerald', label: 'Ativo' } : { status: 'Expirado', color: 'red', label: 'Expirado' }; };

  const pendingReportsCount = reports.length;
  const availableTopics = selectedArea === 'Todas' ? [] : (themesMap[selectedArea] || []);

  if (isLoadingAuth) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="text-white animate-spin" size={48} /></div>;
  if (!user) return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
              <h1 className="text-2xl font-bold text-slate-800 mb-6">MedManager Admin</h1>
              <form onSubmit={(e) => { e.preventDefault(); signInWithEmailAndPassword(auth, email, password).catch(err => showNotification('error', err.message)); }} className="space-y-4">
                  <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-xl" required/>
                  <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-xl" required/>
                  <button className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl">Entrar</button>
              </form>
          </div>
          <NotificationToast notification={notification} onClose={() => setNotification(null)} />
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 flex">
      <NotificationToast notification={notification} onClose={() => setNotification(null)} />
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-10 flex flex-col shadow-sm">
          <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-xl mb-1"><Database /> MedManager</div>
              <p className="text-xs text-gray-400">Gestão 5.0 (Auditoria)</p>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-2">
              <button onClick={() => { setActiveView('questions'); setAuditMode(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeView === 'questions' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}><List size={18} /> Questões</button>
              <button onClick={() => setActiveView('reports')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeView === 'reports' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:bg-gray-50'}`}><MessageSquare size={18} /> Reportes {pendingReportsCount > 0 && <span className="bg-red-600 text-white text-xs px-2 rounded-full">{pendingReportsCount}</span>}</button>
              <button onClick={() => setActiveView('students')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeView === 'students' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}><Users size={18} /> Alunos</button>

              {activeView === 'questions' && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-4">Modo de Visualização</label>
                      
                      {/* BOTÃO MODO AUDITORIA */}
                      <button 
                        onClick={() => { setAuditMode(!auditMode); setSearchTerm(''); }}
                        className={`w-full p-3 rounded-xl border-2 flex items-center gap-2 font-bold transition-all mb-4 ${auditMode ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >
                          <ScanLine size={18}/>
                          {auditMode ? 'Auditoria ATIVA' : 'Ativar Auditoria'}
                      </button>

                      {auditMode ? (
                          <div className="space-y-2 animate-in slide-in-from-left-2">
                              <p className="text-[10px] text-amber-600 font-bold mb-2">FILTRAR PROBLEMAS (Local)</p>
                              <button onClick={() => setActiveAuditFilter('all_problems')} className={`w-full text-left text-xs p-2 rounded ${activeAuditFilter === 'all_problems' ? 'bg-amber-200 text-amber-900 font-bold' : 'text-slate-600 hover:bg-amber-100'}`}>🚨 Tudo que tem erro</button>
                              <button onClick={() => setActiveAuditFilter('missing_meta')} className={`w-full text-left text-xs p-2 rounded ${activeAuditFilter === 'missing_meta' ? 'bg-amber-200 text-amber-900 font-bold' : 'text-slate-600 hover:bg-amber-100'}`}>⚠️ Sem Banca/Ano</button>
                              <button onClick={() => setActiveAuditFilter('inconsistent_topic')} className={`w-full text-left text-xs p-2 rounded ${activeAuditFilter === 'inconsistent_topic' ? 'bg-amber-200 text-amber-900 font-bold' : 'text-slate-600 hover:bg-amber-100'}`}>🔄 Tópico Inconsistente</button>
                              <button onClick={() => setActiveAuditFilter('has_image')} className={`w-full text-left text-xs p-2 rounded ${activeAuditFilter === 'has_image' ? 'bg-amber-200 text-amber-900 font-bold' : 'text-slate-600 hover:bg-amber-100'}`}>🖼️ Com Imagem</button>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              <p className="text-[10px] text-gray-400 font-bold">FILTROS PADRÃO</p>
                              <select value={selectedArea} onChange={e => { setSelectedArea(e.target.value); setSelectedTopic('Todos'); }} className="w-full p-2 bg-gray-50 border rounded-lg text-xs"><option value="Todas">Todas as Áreas</option>{areasBase.map(a => <option key={a} value={a}>{a}</option>)}</select>
                              <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} disabled={selectedArea === 'Todas'} className="w-full p-2 bg-gray-50 border rounded-lg text-xs disabled:opacity-50"><option value="Todos">Todos os Tópicos</option>{availableTopics.map(t => <option key={t} value={t}>{t}</option>)}</select>
                          </div>
                      )}
                  </div>
              )}
          </div>
          <div className="p-4 border-t border-gray-100">
              <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-600 text-sm font-bold w-full p-2 rounded-lg hover:bg-red-50"><LogOut size={16} /> Sair</button>
          </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-64 flex-1 p-8 overflow-y-auto">
          {/* TOP BAR */}
          <div className="flex items-center justify-between mb-8 gap-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  {activeView === 'questions' && (auditMode ? <span className="text-amber-600 flex items-center gap-2"><Bug/> Auditoria de Questões</span> : <span className="flex items-center gap-2"><List className="text-blue-600"/> Banco de Questões</span>)}
                  {activeView === 'reports' && <><MessageSquare className="text-red-600"/> Reportes</>}
                  {activeView === 'students' && <><Users className="text-purple-600"/> Alunos</>}
              </h2>
              
              <div className="relative flex-1 max-w-md">
                  <Search onClick={handleServerSearch} className="absolute left-4 top-3.5 text-gray-400 cursor-pointer hover:text-blue-600 z-10" size={20} />
                  <input 
                    type="text" 
                    placeholder="Busca GLOBAL por ID ou Texto (Desativa filtros)" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    onKeyDown={handleKeyDownSearch}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" 
                  />
              </div>

              {activeView === 'questions' && (
                  <button onClick={handleClearAllFilters} className="bg-white border border-gray-300 text-gray-600 font-bold py-3 px-4 rounded-xl shadow-sm hover:bg-gray-50 flex items-center gap-2">
                      <RefreshCw size={18}/> Limpar
                  </button>
              )}
              
              {activeView === 'students' && (
                  <button onClick={() => setIsCreatingUser(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2">
                      <UserPlus size={20} /> Novo Aluno
                  </button>
              )}
          </div>

          {/* VIEW: QUESTIONS LIST */}
          {activeView === 'questions' && (
              <div className="space-y-4 pb-10">
                  {auditMode && (
                      <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-900 p-4 rounded-r shadow-sm mb-6">
                          <p className="font-bold flex items-center gap-2"><ScanLine size={20}/> Modo Auditoria Ativo</p>
                          <p className="text-sm mt-1">
                              Estamos baixando lotes de 50 questões recentes e aplicando um "pente fino" <strong>localmente</strong>.
                              Isso mostra erros que o filtro do servidor esconde.
                              {activeAuditFilter !== 'all_problems' && <span className="block mt-1 font-bold">Filtro Atual: {activeAuditFilter}</span>}
                          </p>
                      </div>
                  )}

                  {loadingQuestions && questions.length === 0 ? (
                      <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>
                  ) : (
                      <>
                        {filteredQuestions.length === 0 ? (
                             <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                                 <Database size={48} className="mx-auto text-gray-300 mb-4"/>
                                 <p className="text-gray-500 font-bold">Nenhuma questão encontrada.</p>
                                 <p className="text-gray-400 text-sm">Tente limpar os filtros ou carregar mais.</p>
                                 <button onClick={() => loadQuestions(false)} className="mt-4 text-blue-600 font-bold hover:underline">Tentar buscar mais antigas</button>
                             </div>
                        ) : (
                            filteredQuestions.map(q => {
                                const reportCount = reportsCountByQuestion[q.id] || 0;
                                const inconsistency = getInconsistency(q);
                                const missingMeta = !q.institution || !q.year;
                                
                                return (
                                    <div key={q.id} className={`bg-white rounded-xl border p-5 flex flex-col md:flex-row gap-4 items-start shadow-sm hover:shadow-md transition-all ${inconsistency || missingMeta ? 'border-l-4 border-l-red-500' : 'border-gray-200'}`}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-y-2 gap-x-3 mb-3">
                                                <span onClick={() => copyToClipboard(q.id)} className="bg-slate-100 text-slate-500 text-xs font-mono px-2 py-1 rounded cursor-pointer hover:bg-slate-200 flex items-center gap-1 border border-slate-200" title="Copiar ID"><Hash size={10}/> {q.id.slice(0, 8)}...</span>
                                                
                                                {/* BADGES DE ERRO (AUDITORIA) */}
                                                {missingMeta && <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><AlertTriangle size={10}/> DADOS FALTANDO</span>}
                                                {inconsistency && <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><RefreshCw size={10}/> {inconsistency}</span>}
                                                
                                                <div className="flex items-center gap-2">
                                                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border ${!q.institution ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 text-blue-700 border-blue-100'}`}><Building size={10}/> {q.institution || '??'}</span>
                                                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border ${!q.year ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-100 text-gray-600 border-gray-200'}`}><Calendar size={10}/> {q.year || '??'}</span>
                                                </div>
                                                
                                                <div className="flex items-center flex-wrap gap-1">
                                                    <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{q.area}</span>
                                                    <span className="text-xs font-medium text-gray-400">/</span>
                                                    <span className="text-xs font-medium text-slate-500">{q.topic}</span>
                                                </div>

                                                {q.image && <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100 flex items-center gap-1"><ImageIcon size={10}/> Imagem</span>}
                                            </div>
                                            <p className="text-slate-800 text-sm line-clamp-2 mb-3">{q.text}</p>
                                        </div>
                                        <div className="flex items-center gap-2 self-start md:self-center">
                                            {reportCount > 0 && <button onClick={() => handleGoToReports(q.id)} className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 font-bold text-xs flex flex-col items-center leading-none gap-1"><AlertCircle size={14}/> {reportCount}</button>}
                                            <button onClick={() => setEditingQuestion(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={18}/></button>
                                            <button onClick={() => setDeleteModal(q)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        
                        {hasMoreQuestions && (
                            <button 
                                onClick={() => loadQuestions(false)} 
                                disabled={loadingQuestions}
                                className="w-full py-4 mt-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                {loadingQuestions ? <Loader2 className="animate-spin" size={20}/> : <ChevronDown size={20}/>}
                                Carregar Mais (Scanner)
                            </button>
                        )}
                      </>
                  )}
              </div>
          )}

          {/* VIEW: REPORTS (SEM MUDANÇAS DRÁSTICAS, APENAS VISUAL) */}
          {activeView === 'reports' && (
              <div className="space-y-4">
                  {reports.map(report => (
                      <div key={report.id} className="bg-white rounded-xl border p-6 relative">
                          <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><User size={20} /></div>
                                  <div><p className="text-sm font-bold text-slate-800">{getUserDetails(report.userId).name}</p><p className="text-xs text-gray-400">ID: {report.userId}</p></div>
                              </div>
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{formatReportCategory(report.category)}</span>
                          </div>
                          <p className="text-slate-700 text-sm bg-gray-50 p-3 rounded-lg border mb-4">{report.details || report.text}</p>
                          <div className="flex justify-end gap-3">
                              <button onClick={() => setRejectReportModal(report)} className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg font-bold text-sm">Recusar</button>
                              <button onClick={() => handleOpenFromReport(report)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">Ver Questão</button>
                          </div>
                      </div>
                  ))}
                  {reports.length === 0 && <div className="text-center py-20 text-gray-400">Nenhum reporte pendente.</div>}
              </div>
          )}

          {/* VIEW: STUDENTS TABLE (MANTIDA) */}
          {activeView === 'students' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden pb-4">
                  <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b">
                          <tr><th className="px-6 py-4">Aluno</th><th className="px-6 py-4">Função</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ações</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {students.map(s => (
                              <tr key={s.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-slate-900">{s.name}</div>
                                      <div className="text-xs text-gray-500">{s.email}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <select value={s.role} onChange={(e) => handleInlineUserUpdate(s.id, 'role', e.target.value)} className="bg-transparent font-bold outline-none cursor-pointer"><option value="student">Aluno</option><option value="admin">Admin</option></select>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className={`text-xs font-bold ${checkSubscriptionStatus(s.subscriptionUntil, s.role).color === 'emerald' ? 'text-emerald-600' : 'text-red-500'}`}>{checkSubscriptionStatus(s.subscriptionUntil, s.role).label}</div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button onClick={() => fetchUserStats(s)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg mr-2"><TrendingUp size={18}/></button>
                                      <button onClick={() => setDeleteModal(s)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {hasMoreStudents && <div className="p-4 text-center"><button onClick={() => loadStudents(false)} className="text-blue-600 font-bold hover:underline">Carregar Mais</button></div>}
              </div>
          )}
      </main>

      {/* MODALS E EDITORES (MANTIDOS IGUAIS MAS CONECTADOS ÀS NOVAS FUNÇÕES) */}
      {/* (Vou omitir o código repetitivo dos Modais de Edição/Criação pois eles não mudaram a lógica, apenas certifique-se de que estão no final do return como antes) */}
      {/* EDIT QUESTION MODAL */}
      {editingQuestion && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto animate-in fade-in duration-200">
              <div className="max-w-4xl mx-auto p-6 pb-20">
                  <div className="flex items-center justify-between mb-8 sticky top-0 bg-white py-4 border-b border-gray-100 z-10">
                      <div className="flex items-center gap-3">
                          <button onClick={() => { setEditingQuestion(null); setAssociatedReport(null); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft size={24} /></button>
                          <h2 className="text-2xl font-bold text-slate-900">Editar Questão</h2>
                      </div>
                      <button onClick={() => handleSave(false)} disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg flex items-center gap-2">{isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar</button>
                  </div>
                  <form className="space-y-8">
                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div><label className="block text-sm font-bold text-gray-600 mb-2">Instituição</label><input value={editingQuestion.institution} onChange={e => setEditingQuestion({...editingQuestion, institution: e.target.value})} className="w-full pl-3 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: SUS-SP"/></div>
                          <div><label className="block text-sm font-bold text-gray-600 mb-2">Ano</label><input type="number" value={editingQuestion.year} onChange={e => setEditingQuestion({...editingQuestion, year: e.target.value})} className="w-full pl-3 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="2025"/></div>
                          <div><label className="block text-sm font-bold text-gray-600 mb-2">Área</label><select value={editingQuestion.area} onChange={e => setEditingQuestion({...editingQuestion, area: e.target.value, topic: ''})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">{areasBase.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                          <div><label className="block text-sm font-bold text-gray-600 mb-2">Tópico</label><select value={editingQuestion.topic} onChange={e => setEditingQuestion({...editingQuestion, topic: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">{(themesMap[editingQuestion.area] || []).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                          <div className="col-span-1 md:col-span-2">
                              <label className="block text-sm font-bold text-gray-600 mb-2">URL da Imagem</label>
                              <div className="flex gap-2">
                                <input value={editingQuestion.image || ''} onChange={e => setEditingQuestion({...editingQuestion, image: e.target.value})} className="w-full pl-3 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..."/>
                                {editingQuestion.image && <a href={editingQuestion.image} target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 flex items-center justify-center text-gray-600"><ExternalLink size={20}/></a>}
                              </div>
                          </div>
                      </div>
                      <div><label className="block text-lg font-bold text-slate-900 mb-3">Enunciado</label><textarea value={editingQuestion.text} onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})} rows={6} className="w-full p-4 border border-gray-300 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-lg leading-relaxed text-slate-800"/></div>
                      <div className="space-y-4"><label className="block text-lg font-bold text-slate-900">Alternativas (Clique na letra p/ marcar correta)</label>{editingQuestion.options.map((opt, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-colors ${editingQuestion.correctOptionId === opt.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}><div onClick={() => setEditingQuestion({...editingQuestion, correctOptionId: opt.id})} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer font-bold flex-shrink-0 mt-1 transition-colors ${editingQuestion.correctOptionId === opt.id ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>{opt.id.toUpperCase()}</div><textarea value={opt.text} onChange={e => { const newOpts = [...editingQuestion.options]; newOpts[idx].text = e.target.value; setEditingQuestion({...editingQuestion, options: newOpts}); }} rows={2} className="flex-1 bg-transparent border-none outline-none resize-none text-slate-700"/></div>))}</div>
                      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100"><label className="block text-sm font-bold text-amber-800 uppercase tracking-wider mb-3">Comentário / Explicação</label><textarea value={editingQuestion.explanation} onChange={e => setEditingQuestion({...editingQuestion, explanation: e.target.value})} rows={5} className="w-full p-4 bg-white border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"/></div>
                  </form>
              </div>
          </div>
      )}

      {/* CREATE USER MODAL */}
      {isCreatingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                  <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                      <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><UserPlus size={24}/></div>
                      <h2 className="text-xl font-bold text-slate-800">Novo Aluno</h2>
                  </div>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label><input name="name" required className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50" placeholder="Ex: Ana Silva" /></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label><input name="email" type="email" required className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50" placeholder="email@exemplo.com" /></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha (Provisória)</label><input name="password" type="text" required className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50" placeholder="123456" /></div>
                      <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setIsCreatingUser(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
                          <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg">{isSaving ? <Loader2 className="animate-spin mx-auto"/> : 'Criar Aluno'}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      
      {/* (Outros modais como Delete e Stats continuam aqui, se precisar me avise que incluo, mas o foco é a lógica de busca acima) */}
      {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center">
                  <h2 className="text-xl font-bold mb-2">Excluir Definitivamente?</h2>
                  <div className="flex gap-3 w-full mt-4">
                      <button onClick={() => setDeleteModal(null)} className="flex-1 py-3 border rounded-xl font-bold">Cancelar</button>
                      <button onClick={deleteModal.email ? handleDeleteUser : handleDeleteQuestion} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Excluir</button>
                  </div>
              </div>
          </div>
      )}
      {rejectReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center">
                  <h2 className="text-xl font-bold mb-2">Recusar Reporte?</h2>
                  <div className="flex gap-3 w-full mt-4">
                      <button onClick={() => setRejectReportModal(null)} className="flex-1 py-3 border rounded-xl font-bold">Cancelar</button>
                      <button onClick={handleRejectReport} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Apagar</button>
                  </div>
              </div>
          </div>
      )}
      {viewingUserStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                  <button onClick={() => setViewingUserStats(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-2xl">
                          {viewingUserStats.name ? viewingUserStats.name.charAt(0) : 'U'}
                      </div>
                      <div>
                          <h2 className="text-xl font-bold text-slate-800">{viewingUserStats.name}</h2>
                          <p className="text-sm text-gray-500">{viewingUserStats.email}</p>
                      </div>
                  </div>
                  {viewingUserStats.loading ? (
                      <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-purple-600" size={32} /></div>
                  ) : (
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-100"><div className="flex justify-center text-orange-600 mb-1"><Zap size={24}/></div><div className="text-3xl font-bold text-slate-800">{viewingUserStats.stats?.streak || 0}</div><div className="text-xs uppercase font-bold text-orange-600">Dias em Sequência</div></div>
                          <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100"><div className="flex justify-center text-blue-600 mb-1"><CheckSquare size={24}/></div><div className="text-3xl font-bold text-slate-800">{viewingUserStats.stats?.totalAnswers || 0}</div><div className="text-xs uppercase font-bold text-blue-600">Questões Totais</div></div>
                      </div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
}
