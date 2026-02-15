import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, Filter, Edit3, Trash2, Save, X, CheckCircle, 
  AlertCircle, Database, List, ArrowLeft, LogOut, Loader2, 
  CheckSquare, BookOpen, AlertTriangle, Copy, Hash,
  MessageSquare, ThumbsUp, ThumbsDown, User, Calendar, Building, Phone,
  Users, TrendingUp, Target, Zap, PlusCircle, Lock, RefreshCw, ChevronDown,
  Shield, Award, UserPlus, ExternalLink, HelpCircle, ImageIcon, ScanLine,
  Clock, RotateCcw, Search as SearchIcon
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp, deleteApp } from "firebase/app"; 
import { 
  getFirestore, collection, doc, getDoc, updateDoc, deleteDoc, 
  onSnapshot, query, orderBy, where, writeBatch, setDoc, 
  limit, startAfter, getDocs, startAt, endAt, documentId
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

// Evita reinicialização múltipla
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
            {notification.link && (
                <a href={notification.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded mt-2 inline-flex items-center gap-1 hover:bg-blue-100">
                    <ExternalLink size={12}/> Criar Índice no Firebase Agora
                </a>
            )}
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
  const [missingIndexLink, setMissingIndexLink] = useState(null); 
  
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
  
  // --- FILTROS ---
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros "Categoria"
  const [selectedArea, setSelectedArea] = useState('Todas');
  const [selectedTopic, setSelectedTopic] = useState('Todos');
  
  // Filtros "Server-Side" (Banca e Ano)
  // Agora esses estados controlam a query real no DB
  const [serverInstitution, setServerInstitution] = useState(''); 
  const [serverYear, setServerYear] = useState(''); 
  
  const [reportFilterQuestionId, setReportFilterQuestionId] = useState(null);
  const [auditFilter, setAuditFilter] = useState('none'); 

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

  const showNotification = (type, text, link = null) => setNotification({ type, text, link });

  // --- AUTH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (u) {
            try {
                const userDoc = await getDoc(doc(db, "users", u.uid));
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    setUser(u);
                    loadQuestions(true);
                } else {
                    await signOut(auth);
                    showNotification('error', 'Acesso negado: Apenas administradores.');
                    setUser(null);
                }
            } catch (e) {
                console.error(e);
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- REALTIME REPORTS ---
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


  // --- LOAD QUESTIONS (QUERY NO BANCO) ---
  const loadQuestions = async (reset = false) => {
      // Se tiver busca textual (ID/Enunciado), deixa o handleServerSearch lidar
      if (searchTerm && !reset) return; 

      if (loadingQuestions) return;
      if (!reset && !hasMoreQuestions) return;

      setLoadingQuestions(true);
      setMissingIndexLink(null); 
      
      try {
          let q = collection(db, "questions");
          let constraints = [];

          // -- AUDITORIA --
          if (auditFilter !== 'none') {
             if (auditFilter === 'missing_meta') { constraints.push(orderBy("institution")); constraints.push(where("institution", "==", "")); }
             else if (auditFilter === 'missing_topic') { constraints.push(where("area", "==", "")); }
             else if (auditFilter === 'has_image') { constraints.push(orderBy("image")); constraints.push(startAfter("")); }
          } 
          // -- MODO PADRÃO DE FILTRAGEM --
          else {
              // 1. ÁREA / TÓPICO
              if (selectedArea !== 'Todas') constraints.push(where("area", "==", selectedArea));
              if (selectedTopic !== 'Todos') constraints.push(where("topic", "==", selectedTopic));

              // 2. BANCA (INSTITUTION) - BUSCA EXATA
              // Isso permite você filtrar "MG - SCMBH" direto no banco
              if (serverInstitution.trim()) {
                  constraints.push(where("institution", "==", serverInstitution.trim()));
              }

              // 3. ANO - BUSCA EXATA
              if (serverYear.trim()) {
                  // Tenta converter pra numero se possível, ou string dependendo de como salvou
                  // Assumindo que no banco salvou como string ou number. 
                  // Para garantir, se for numero no banco, o filtro precisa ser numero.
                  const yearNum = parseInt(serverYear.trim());
                  if(!isNaN(yearNum)) {
                       // Idealmente, verifique como salvou. Vamos tentar string se falhar ou hibrido
                       // Se salvou como string "2024", passar number falha.
                       constraints.push(where("year", "==", serverYear.trim())); 
                  }
              }

              // 4. ORDENAÇÃO: Sempre por ID (Fallback seguro)
              // Não usamos mais createdAt para evitar ocultar questões sem data
              // Se não tiver nenhum filtro que exija ordem especifica (como audit), 
              // firestore ordena implicitamente por __name__
          }

          // Paginação
          if (!reset && lastQuestionDoc) {
              constraints.push(startAfter(lastQuestionDoc));
          }
          
          constraints.push(limit(ITEMS_PER_PAGE));
          
          const finalQuery = query(q, ...constraints);
          const snapshot = await getDocs(finalQuery);
          
          const newQuestions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

          if (reset) {
              setQuestions(newQuestions);
          } else {
              setQuestions(prev => [...prev, ...newQuestions]);
          }

          setLastQuestionDoc(snapshot.docs[snapshot.docs.length - 1]);
          setHasMoreQuestions(snapshot.docs.length === ITEMS_PER_PAGE);

          // Feedback se filtrou por banca e não achou
          if (reset && newQuestions.length === 0 && serverInstitution) {
             showNotification('error', `Nenhuma questão encontrada com a banca exata: "${serverInstitution}"`);
          }

      } catch (error) {
          console.error("Erro ao carregar questões:", error);
          if (error.message.includes("requires an index")) {
              const linkMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
              const link = linkMatch ? linkMatch[0] : null;
              setMissingIndexLink(link);
              showNotification('error', 'O Firestore precisa de um índice para combinar esses filtros (Ex: Área + Banca).', link);
          } else {
              showNotification('error', 'Erro ao carregar dados: ' + error.message);
          }
      } finally {
          setLoadingQuestions(false);
      }
  };

  // --- SERVER SIDE SEARCH (TEXTO/ID) ---
  const handleServerSearch = async () => {
      const term = searchTerm.trim();
      if (!term) {
          handleClearQuestionFilters();
          return;
      }

      setIsSearchingServer(true);
      setLoadingQuestions(true);
      setMissingIndexLink(null);
      
      // Reseta filtros de categoria/banca visualmente (mas mantém o estado limpo para não conflitar)
      setSelectedArea('Todas');
      setSelectedTopic('Todos');
      setServerInstitution('');
      setServerYear('');
      setAuditFilter('none');
      setHasMoreQuestions(false);
      
      let foundDocs = [];

      try {
          // 1. Busca ID
          try {
            const docRef = doc(db, "questions", term);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) foundDocs.push({ id: docSnap.id, ...docSnap.data() });
          } catch(e) { }

          // 2. Busca Texto (StartAt)
          if (foundDocs.length === 0) {
              const qText = query(
                  collection(db, "questions"),
                  orderBy("text"),
                  startAt(term),
                  endAt(term + '\uf8ff'),
                  limit(20)
              );
              
              const textSnap = await getDocs(qText);
              textSnap.forEach(d => {
                  if (!foundDocs.some(f => f.id === d.id)) foundDocs.push({ id: d.id, ...d.data() });
              });
          }

          setQuestions(foundDocs); 
          
          if (foundDocs.length > 0) showNotification('success', `Encontrado(s) ${foundDocs.length} resultado(s)!`);
          else showNotification('error', 'Nada encontrado. Dica: O Firestore diferencia Maiúsculas de minúsculas.');

      } catch (error) {
          console.error("Erro na busca:", error);
          if (error.message.includes("requires an index")) {
              const linkMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
              const link = linkMatch ? linkMatch[0] : null;
              setMissingIndexLink(link);
              showNotification('error', 'Falta um índice para buscar por texto!', link);
          } else {
              showNotification('error', 'Erro ao buscar no servidor.');
          }
      } finally {
          setIsSearchingServer(false);
          setLoadingQuestions(false);
      }
  };

  const handleKeyDownSearch = (e) => {
      if (e.key === 'Enter') handleServerSearch();
  };

  // --- LOAD STUDENTS ---
  const loadStudents = async (reset = false) => {
      if (loadingStudents) return;
      if (!reset && !hasMoreStudents) return;

      setLoadingStudents(true);
      try {
          let q = collection(db, "users");
          let constraints = [orderBy("name")]; 

          if (studentRoleFilter !== 'all') constraints.push(where("role", "==", studentRoleFilter));
          if (!reset && lastStudentDoc) constraints.push(startAfter(lastStudentDoc));

          constraints.push(limit(ITEMS_PER_PAGE));
          const finalQuery = query(q, ...constraints);
          const snapshot = await getDocs(finalQuery);
          const newStudents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

          if (reset) setStudents(newStudents);
          else setStudents(prev => [...prev, ...newStudents]);

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
      if (activeView === 'students' && students.length === 0) loadStudents(true);
  }, [activeView]);

  // Listener para mudança de Área/Tópico (Automático)
  useEffect(() => {
      if(user && !searchTerm) {
          // Pequeno delay
          const timer = setTimeout(() => {
             loadQuestions(true);
          }, 500);
          return () => clearTimeout(timer);
      }
  }, [selectedArea, selectedTopic, auditFilter]); 

  // Listener para mudança nos filtros de Servidor (Banca/Ano) - MANUAL (OnEnter)
  // Nota: Não coloquei no useEffect automático para evitar requests enquanto digita
  // O usuário deve apertar Enter ou o botão de busca na sidebar.

  useEffect(() => {
      if(user && activeView === 'students') loadStudents(true);
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

  // --- FILTERS MEMO & SORTING (LOCAL) ---
  // Apenas para sugestão na interface, pegamos o que já foi carregado
  const availableInstitutionsHint = useMemo(() => Array.from(new Set(questions.map(q => q.institution).filter(i => i))).sort(), [questions]);
  
  const filteredQuestions = useMemo(() => {
      // 1. Merge
      const allQuestionsMap = new Map();
      questions.forEach(q => allQuestionsMap.set(q.id, q));
      extraReportedQuestions.forEach(q => allQuestionsMap.set(q.id, q));
      
      const allQuestions = Array.from(allQuestionsMap.values());

      // 2. Filtra (Apenas refinamento local, o grosso já veio do servidor)
      let result = allQuestions.filter(q => {
          const term = searchTerm.toLowerCase().trim();
          if (term) {
             const inText = (q.text || '').toLowerCase().includes(term);
             const inId = q.id === term; 
             const inInst = (q.institution || '').toLowerCase().includes(term);
             return inText || inId || inInst;
          }

          let matchesAudit = true;
          if (auditFilter === 'missing_meta') matchesAudit = !q.institution || !q.year;
          if (auditFilter === 'missing_topic') matchesAudit = !q.area || !q.topic || q.area === 'Todas';
          if (auditFilter === 'has_image') matchesAudit = !!q.image;
          if (auditFilter === 'short_text') matchesAudit = (q.text || '').length < 50;
          if (auditFilter !== 'none') return matchesAudit;

          // Os filtros de Banca e Ano agora são server-side, então teoricamente o que veio já é o certo.
          // Mas mantemos a consistência visual caso algo "escape"
          return true;
      });

      // 3. Ordena Localmente (Para garantir ordem de reports)
      result.sort((a, b) => {
          const countA = reportsCountByQuestion[a.id] || 0;
          const countB = reportsCountByQuestion[b.id] || 0;
          if (countA > 0 || countB > 0) {
              if (countA !== countB) return countB - countA; 
          }
          // Fallback ID (cronológico reverso aproximado)
          return (a.id > b.id) ? -1 : 1;
      });

      return result;
  }, [questions, extraReportedQuestions, reportsCountByQuestion, searchTerm, auditFilter]);

  const filteredReports = useMemo(() => {
      let result = reports;
      if (reportFilterQuestionId) result = result.filter(r => r.questionId === reportFilterQuestionId);
      if (activeView === 'reports' && searchTerm) {
          const lower = searchTerm.toLowerCase();
          result = result.filter(r => r.userId?.toLowerCase().includes(lower) || r.questionId?.toLowerCase().includes(lower) || r.text?.toLowerCase().includes(lower) || r.details?.toLowerCase().includes(lower) || (userProfiles[r.userId]?.name || '').toLowerCase().includes(lower));
      }
      return result;
  }, [reports, reportFilterQuestionId, searchTerm, activeView, userProfiles]);

  const filteredStudents = useMemo(() => {
      if (activeView !== 'students') return [];
      const lower = searchTerm.toLowerCase();
      return students.filter(s => {
          const matchesSearch = s.name?.toLowerCase().includes(lower) || s.email?.toLowerCase().includes(lower) || s.id?.toLowerCase().includes(lower);
          const isPremium = s.subscriptionUntil && new Date(s.subscriptionUntil) > new Date();
          let matchesStatus = true;
          if (studentStatusFilter === 'active') matchesStatus = isPremium;
          if (studentStatusFilter === 'expired') matchesStatus = !isPremium;
          return matchesSearch && matchesStatus;
      });
  }, [students, searchTerm, activeView, studentStatusFilter]);


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
      setReportFilterQuestionId(questionId);
      setSearchTerm('');
      setActiveView('reports');
  };

  const handleClearReportFilter = () => setReportFilterQuestionId(null);
  
  const handleClearQuestionFilters = () => { 
      setSearchTerm(''); 
      setSelectedArea('Todas'); 
      setSelectedTopic('Todos'); 
      setServerInstitution('');
      setServerYear('');
      setAuditFilter('none');
      setQuestions([]); 
      setTimeout(() => loadQuestions(true), 100); 
  };

  const handleTriggerServerFilter = () => {
      // Botão para forçar busca por Banca/Ano
      setQuestions([]);
      loadQuestions(true);
  };

  // --- CRIAÇÃO DE USUÁRIO (AUTENTICAÇÃO + BANCO) ---
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
          
          const newUserObj = {
              id: newUserId,
              name: userData.name,
              email: userData.email,
              role: userData.role || 'student',
              createdAt: new Date().toISOString(),
              subscriptionUntil: userData.subscriptionUntil || null,
              whatsapp: userData.whatsapp || '',
              dailyGoal: 50,
              stats: { correctAnswers: 0, totalAnswers: 0, streak: 0 }
          };
          
          await setDoc(doc(db, "users", newUserId), newUserObj);
          await setDoc(doc(db, "users", newUserId, "stats", "main"), {
              correctAnswers: 0, totalAnswers: 0, questionsToday: 0, streak: 0, lastStudyDate: null
          });
          
          setStudents(prev => [newUserObj, ...prev]);
          showNotification('success', 'Aluno criado com acesso ao sistema!');
          setIsCreatingUser(false);
      } catch (error) {
          console.error(error);
          if (error.code === 'auth/email-already-in-use') {
              showNotification('error', 'Este email já está em uso.');
          } else {
              showNotification('error', 'Erro ao criar: ' + error.message);
          }
      } finally {
          if (secondaryApp) {
              try { await deleteApp(secondaryApp); } catch (e) { console.error("Erro ao limpar app secundário", e); }
          }
          setIsSaving(false);
      }
  };

  const updateLocalList = (listType, id, newData) => {
      if (listType === 'questions') {
          setQuestions(prev => prev.map(item => item.id === id ? { ...item, ...newData } : item));
          setExtraReportedQuestions(prev => prev.map(item => item.id === id ? { ...item, ...newData } : item));
      } else if (listType === 'students') {
          setStudents(prev => prev.map(item => item.id === id ? { ...item, ...newData } : item));
      }
  };

  const removeLocalList = (listType, id) => {
      if (listType === 'questions') {
          setQuestions(prev => prev.filter(item => item.id !== id));
          setExtraReportedQuestions(prev => prev.filter(item => item.id !== id));
      } else if (listType === 'students') {
          setStudents(prev => prev.filter(item => item.id !== id));
      }
  };

  const handleInlineUserUpdate = async (id, field, value) => {
      try {
          await updateDoc(doc(db, "users", id), { [field]: value });
          updateLocalList('students', id, { [field]: value }); 
          showNotification('success', 'Atualizado com sucesso!');
      } catch (error) { showNotification('error', 'Erro: ' + error.message); }
  };

  const handleAdd30Days = async (student) => {
      const now = new Date(); let newDate = new Date();
      if (student.subscriptionUntil) { const currentExpiry = new Date(student.subscriptionUntil); if (currentExpiry > now) { newDate = new Date(currentExpiry); } }
      newDate.setDate(newDate.getDate() + 30);
      try {
          const isoDate = newDate.toISOString();
          await updateDoc(doc(db, "users", student.id), { subscriptionUntil: isoDate });
          updateLocalList('students', student.id, { subscriptionUntil: isoDate });
          showNotification('success', '+30 dias adicionados!');
      } catch (error) { showNotification('error', 'Erro: ' + error.message); }
  };

  const handleDeleteUser = async () => {
      if (!deleteModal || !deleteModal.email) return; 
      try {
          await deleteDoc(doc(db, "users", deleteModal.id));
          removeLocalList('students', deleteModal.id);
          showNotification('success', 'Dados do aluno excluídos (Login permanece no Auth).');
          setDeleteModal(null);
      } catch (error) { showNotification('error', 'Erro ao excluir.'); }
  };

  const fetchUserStats = async (student) => {
      setViewingUserStats({ ...student, loading: true });
      try {
          const statsSnap = await getDoc(doc(db, "users", student.id, "stats", "main"));
          if (statsSnap.exists()) { setViewingUserStats({ ...student, stats: statsSnap.data(), loading: false }); } 
          else { setViewingUserStats({ ...student, stats: null, loading: false }); }
      } catch (e) { console.error(e); setViewingUserStats({ ...student, stats: null, loading: false }); }
  };

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
          updateLocalList('questions', id, data);
          showNotification('success', shouldResolveReport ? 'Salvo e resolvido!' : 'Atualizado!');
          setEditingQuestion(null);
          setAssociatedReport(null);
      } catch (error) { console.error(error); showNotification('error', error.message); } finally { setIsSaving(false); }
  };

  const handleRejectReport = async () => {
      if (!rejectReportModal) return;
      try {
          await deleteDoc(doc(db, "reports", rejectReportModal.id));
          showNotification('success', 'Reporte excluído.');
          if (associatedReport && associatedReport.id === rejectReportModal.id) { setAssociatedReport(null); setEditingQuestion(null); }
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

  const handleDeleteQuestion = async () => {
      if (!deleteModal || deleteModal.email) return; 
      try {
          await deleteDoc(doc(db, "questions", deleteModal.id));
          removeLocalList('questions', deleteModal.id); 
          showNotification('success', 'Questão excluída.');
          if (editingQuestion && editingQuestion.id === deleteModal.id) { setEditingQuestion(null); setAssociatedReport(null); }
          setDeleteModal(null);
      } catch (error) { showNotification('error', 'Erro ao excluir.'); }
  };

  const copyToClipboard = async (text) => {
      try {
          await navigator.clipboard.writeText(text);
          showNotification('success', 'Copiado!');
      } catch (err) { showNotification('error', 'Erro ao copiar.'); }
  };

  const formatReportCategory = (c) => ({'metadata_suggestion':'Sugestão Metadados','suggestion_update':'Sugestão Atualização','Enunciado incorreto/confuso':'Enunciado Errado'}[c] || c || 'Geral');
  const getUserDetails = (uid) => { const p = userProfiles[uid]; return { name: p?.name || '...', whatsapp: p?.whatsapp || '' }; };
  const checkSubscriptionStatus = (d, role) => { 
      if (role === 'admin') return { status: 'Admin', color: 'indigo', label: 'Admin' };
      if (!d) return { status: 'Expirado', color: 'red', label: 'Expirado' }; 
      return new Date(d) > new Date() ? { status: 'Ativo', color: 'emerald', label: 'Ativo' } : { status: 'Expirado', color: 'red', label: 'Expirado' }; 
  };
  const getReportDetails = (r) => {
      if (r.category === "metadata_suggestion" || r.category === "suggestion_update") {
          return (
              <div className="flex gap-4 mt-2">
                 <div className="flex flex-col"><span className="text-xs uppercase text-gray-500 font-bold">Banca Sugerida</span><span className="text-sm font-medium text-slate-800">{r.suggestedInstitution || 'N/A'}</span></div>
                 <div className="flex flex-col"><span className="text-xs uppercase text-gray-500 font-bold">Ano Sugerido</span><span className="text-sm font-medium text-slate-800">{r.suggestedYear || 'N/A'}</span></div>
              </div>
          );
      }
      return <p className="text-slate-700 text-sm italic mt-1">"{r.details || r.text || 'Sem detalhes'}"</p>;
  };

  const availableTopics = selectedArea === 'Todas' ? [] : (themesMap[selectedArea] || []);
  const pendingReportsCount = reports.length;

  if (isLoadingAuth) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="text-white animate-spin" size={48} /></div>;
  if (!user) return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
              <div className="flex justify-center mb-4"><div className="bg-blue-100 p-4 rounded-full"><Lock className="w-8 h-8 text-blue-600"/></div></div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">MedManager</h1>
              <p className="text-sm text-gray-500 mb-6">Acesso restrito a administradores</p>
              <form onSubmit={(e) => { e.preventDefault(); signInWithEmailAndPassword(auth, email, password).catch(err => showNotification('error', "Erro de login: " + err.message)); }} className="space-y-4">
                  <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required/>
                  <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required/>
                  <button className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-colors">Entrar</button>
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
              <p className="text-xs text-gray-400">Gestão Otimizada v5.0</p>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-2">
              <button onClick={() => { setActiveView('questions'); setReportFilterQuestionId(null); setSearchTerm(''); }} className={`w-full flex items-center justify-between p-3 rounded-xl font-bold text-sm transition-all ${activeView === 'questions' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}><span className="flex items-center gap-2"><List size={18} /> Questões</span></button>
              <button onClick={() => { setActiveView('reports'); setReportFilterQuestionId(null); setSearchTerm(''); }} className={`w-full flex items-center justify-between p-3 rounded-xl font-bold text-sm transition-all ${activeView === 'reports' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:bg-gray-50'}`}><span className="flex items-center gap-2"><MessageSquare size={18} /> Reportes</span>{pendingReportsCount > 0 && <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{pendingReportsCount}</span>}</button>
              <button onClick={() => { setActiveView('students'); setReportFilterQuestionId(null); setSearchTerm(''); }} className={`w-full flex items-center justify-between p-3 rounded-xl font-bold text-sm transition-all ${activeView === 'students' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}><span className="flex items-center gap-2"><Users size={18} /> Alunos</span></button>
              
              {/* FILTERS FOR QUESTIONS */}
              {activeView === 'questions' && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Filtros & Auditoria</label>
                        <button onClick={handleClearQuestionFilters} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"><RefreshCw size={10}/> Limpar</button>
                    </div>
                    {missingIndexLink && (
                        <a href={missingIndexLink} target="_blank" rel="noopener noreferrer" className="block text-xs bg-red-100 text-red-700 p-2 rounded border border-red-200 hover:bg-red-200 transition-colors mb-2 font-bold animate-pulse">
                            <AlertTriangle size={12} className="inline mr-1"/> Índice Ausente! Clique aqui
                        </a>
                    )}
                    
                    {/* Filtro de Auditoria */}
                    <div className="relative">
                        <ScanLine size={16} className={`absolute left-3 top-3 ${auditFilter !== 'none' ? 'text-red-500' : 'text-gray-400'}`} />
                        <select 
                            value={auditFilter} 
                            onChange={e => { setAuditFilter(e.target.value); if(e.target.value !== 'none') setSearchTerm(''); }} 
                            className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm font-medium outline-none ${auditFilter !== 'none' ? 'bg-red-50 border-red-200 text-red-700 font-bold' : 'bg-gray-50 border-gray-200'}`}
                        >
                            <option value="none">Navegação Padrão</option>
                            <option value="missing_meta">⚠️ Banca/Ano Vazios</option>
                            <option value="missing_topic">⚠️ Sem Tópico/Área</option>
                            <option value="has_image">🖼️ Com Imagem (Check)</option>
                            <option value="short_text">📝 Enunciado Curto (Erro?)</option>
                        </select>
                    </div>
                    
                    {auditFilter === 'none' && !searchTerm && (
                        <>
                            <div className="text-[10px] text-gray-400 mb-2 leading-tight">Filtrar por Área/Tópico (Automático).</div>
                            <div className="relative"><Filter size={16} className="absolute left-3 top-3 text-gray-400" /><select value={selectedArea} onChange={e => { setSelectedArea(e.target.value); setSelectedTopic('Todos'); }} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium outline-none"><option value="Todas">Todas as Áreas</option>{areasBase.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                            <div className="relative"><BookOpen size={16} className="absolute left-3 top-3 text-gray-400" /><select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} disabled={selectedArea === 'Todas'} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium outline-none disabled:opacity-50"><option value="Todos">Todos os Tópicos</option>{availableTopics.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                        </>
                    )}

                    {searchTerm && (
                         <div className="bg-blue-50 border border-blue-100 text-blue-700 p-2 rounded text-xs font-bold text-center">
                             Busca textual ativa.<br/>Filtros de Área desativados.
                         </div>
                    )}
                    
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mt-4">Buscar no Servidor (Padronização)</label>
                    <p className="text-[10px] text-gray-400 mb-2 leading-tight">Digite a Banca ou Ano EXATO para buscar no banco todo. (Enter p/ buscar)</p>
                    
                    <div className="relative">
                        <Building size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input 
                            list="availableInstitutions"
                            type="text" 
                            placeholder="Ex: MG - SCMBH" 
                            value={serverInstitution} 
                            onChange={e => setServerInstitution(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleTriggerServerFilter()}
                            className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={handleTriggerServerFilter} className="absolute right-2 top-2 text-gray-400 hover:text-blue-600"><SearchIcon size={14}/></button>
                        <datalist id="availableInstitutions">
                            {availableInstitutionsHint.map(i => <option key={i} value={i} />)}
                        </datalist>
                    </div>

                    <div className="relative mt-2">
                        <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Ex: 2024" 
                            value={serverYear} 
                            onChange={e => setServerYear(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleTriggerServerFilter()}
                            className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                        />
                         <button onClick={handleTriggerServerFilter} className="absolute right-2 top-2 text-gray-400 hover:text-blue-600"><SearchIcon size={14}/></button>
                    </div>
                </div>
              )}

              {/* FILTERS FOR STUDENTS */}
              {activeView === 'students' && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                    <div className="relative"><Shield size={16} className="absolute left-3 top-3 text-gray-400" /><select value={studentRoleFilter} onChange={e => setStudentRoleFilter(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium outline-none"><option value="all">Todas as Funções</option><option value="student">Alunos</option><option value="admin">Admins</option></select></div>
                    <div className="relative"><Award size={16} className="absolute left-3 top-3 text-gray-400" /><select value={studentStatusFilter} onChange={e => setStudentStatusFilter(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium outline-none"><option value="all">Todos os Status</option><option value="active">Ativos</option><option value="expired">Expirados</option></select></div>
                </div>
              )}
          </div>
          
          <div className="p-4 border-t border-gray-100 space-y-1">
              <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 text-sm font-bold w-full p-2 rounded-lg hover:bg-gray-50 transition-colors"><ArrowLeft size={16} /> Voltar ao App</button>
              <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-600 text-sm font-bold w-full p-2 rounded-lg hover:bg-red-50 transition-colors"><LogOut size={16} /> Sair</button>
          </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-64 flex-1 p-8 overflow-y-auto">
          
          {/* SEARCH HEADER */}
          <div className="flex items-center justify-between mb-8 gap-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  {activeView === 'questions' && <><List className="text-blue-600"/> Questões</>}
                  {activeView === 'reports' && <><MessageSquare className="text-red-600"/> Reportes <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{pendingReportsCount} Pendentes</span></>}
                  {activeView === 'students' && <><Users className="text-purple-600"/> Gestão de Alunos</>}
              </h2>
              <div className="relative flex-1 max-w-md group">
                  <div className="absolute left-4 top-3.5 z-10">
                      {isSearchingServer ? <Loader2 className="animate-spin text-blue-600" size={20}/> : <Search onClick={handleServerSearch} className="text-gray-400 cursor-pointer hover:text-blue-600" size={20} />}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Cole o ID ou digite o começo do enunciado..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    onKeyDown={handleKeyDownSearch}
                    className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" 
                  />
                  {searchTerm && (
                      <button onClick={handleClearQuestionFilters} className="absolute right-3 top-3.5 text-gray-400 hover:text-red-500" title="Limpar Busca"><X size={16}/></button>
                  )}
                  {!searchTerm && <div className="absolute right-3 top-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-help" title="Busca exata por ID ou pelo COMEÇO do texto (Case Sensitive)"><HelpCircle size={16}/></div>}
              </div>
              {activeView === 'students' && (
                  <button onClick={() => setIsCreatingUser(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2 transition-transform hover:scale-105">
                      <UserPlus size={20} /> Novo Aluno
                  </button>
              )}
          </div>

          {/* VIEW: QUESTIONS */}
          {activeView === 'questions' && (
              <div className="space-y-4 pb-10">
                  {missingIndexLink && (
                       <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-4 mb-4">
                           <AlertTriangle size={32} className="flex-shrink-0"/>
                           <div>
                               <h3 className="font-bold text-lg">Índice do Firebase Ausente</h3>
                               <p className="text-sm mb-2">Para filtrar por Área e Tópico, o Firebase exige um índice composto.</p>
                               <a href={missingIndexLink} target="_blank" rel="noopener noreferrer" className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm inline-flex items-center gap-2 hover:bg-red-700">
                                   <ExternalLink size={16}/> Criar Índice Agora
                               </a>
                           </div>
                       </div>
                  )}

                  <div className="flex gap-2 mb-2 flex-wrap">
                     {/* BADGES DE STATUS */}
                     {searchTerm && (
                         <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-lg flex items-center gap-2 text-xs font-bold">
                             <Search size={12}/> Busca Textual
                         </div>
                     )}
                     {!searchTerm && auditFilter === 'none' && selectedArea === 'Todas' && !serverInstitution && (
                         <div className="bg-gray-100 border border-gray-200 text-gray-600 px-3 py-1 rounded-lg flex items-center gap-2 text-xs font-bold">
                             <RotateCcw size={12}/> Ordenação Padrão (ID)
                         </div>
                     )}
                     {serverInstitution && (
                         <div className="bg-purple-50 border border-purple-200 text-purple-800 px-3 py-1 rounded-lg flex items-center gap-2 text-xs font-bold">
                             <Building size={12}/> Filtro Banca: "{serverInstitution}"
                         </div>
                     )}
                  </div>

                  {auditFilter !== 'none' && (
                       <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold mb-4">
                           <ScanLine size={16}/>
                           Modo de Auditoria Ativo: Mostrando questões filtradas por problemas ou critérios específicos.
                       </div>
                  )}

                  {loadingQuestions && questions.length === 0 ? (
                      <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>
                  ) : (
                      <>
                        {filteredQuestions.map(q => {
                            const reportCount = reportsCountByQuestion[q.id] || 0;
                            const missingTopic = !q.area || !q.topic || q.area === 'Todas';
                            
                            return (
                                <div key={q.id} className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-5 flex flex-col md:flex-row gap-4 items-start ${reportCount > 0 ? 'border-amber-200 shadow-amber-100 ring-2 ring-amber-100' : 'border-gray-200'}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-3 mb-3">
                                            <span onClick={() => copyToClipboard(q.id)} className="bg-slate-100 text-slate-500 text-xs font-mono px-2 py-1 rounded cursor-pointer hover:bg-slate-200 flex items-center gap-1 border border-slate-200" title="Copiar ID"><Hash size={10}/> {q.id.slice(0, 8)}...</span>
                                            {reportCount > 0 && (
                                                <button onClick={(e) => { e.stopPropagation(); handleGoToReports(q.id); }} className="bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1 border border-amber-200 animate-pulse transition-colors cursor-pointer"><AlertTriangle size={12}/> {reportCount} Reportes (Ver)</button>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border ${!q.institution ? 'bg-red-100 text-red-600 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}><Building size={10}/> {q.institution || 'SEM BANCA'}</span>
                                                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border ${!q.year ? 'bg-red-100 text-red-600 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}><Calendar size={10}/> {q.year || 'SEM ANO'}</span>
                                            </div>
                                            <div className="flex items-center flex-wrap gap-1">
                                                {missingTopic ? (
                                                    <span className="text-xs font-bold text-red-500 bg-red-50 px-1 rounded">Sem Classificação!</span>
                                                ) : (
                                                    <><span className="text-xs font-bold text-slate-600 whitespace-nowrap">{q.area}</span><span className="text-xs font-medium text-gray-400">/</span><span className="text-xs font-medium text-slate-500">{q.topic}</span></>
                                                )}
                                            </div>
                                            {q.image && <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100 flex items-center gap-1"><ImageIcon size={10}/> Com Imagem</span>}
                                        </div>
                                        <p className="text-slate-800 text-sm line-clamp-2 mb-3">{q.text}</p>
                                    </div>
                                    <div className="flex items-center gap-2 self-start md:self-center">
                                        <button onClick={() => setEditingQuestion(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg hover:border-blue-100 border border-transparent"><Edit3 size={18}/></button>
                                        <button onClick={() => setDeleteModal(q)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg hover:border-red-100 border border-transparent"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* LOAD MORE BUTTON */}
                        {hasMoreQuestions && !searchTerm && (
                            <button 
                                onClick={() => loadQuestions(false)} 
                                disabled={loadingQuestions}
                                className="w-full py-4 mt-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                {loadingQuestions ? <Loader2 className="animate-spin" size={20}/> : <ChevronDown size={20}/>}
                                {loadingQuestions ? 'Carregando...' : 'Carregar Mais Questões'}
                            </button>
                        )}
                        {!hasMoreQuestions && questions.length > 0 && (
                            <p className="text-center text-gray-400 text-sm py-4">Fim da lista.</p>
                        )}
                        {questions.length === 0 && !loadingQuestions && (
                            <div className="text-center py-10 text-gray-500">
                                <Database size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>Nenhuma questão encontrada.</p>
                                <button onClick={handleClearQuestionFilters} className="mt-4 text-blue-600 font-bold hover:underline">Limpar Filtros e Tentar Novamente</button>
                            </div>
                        )}
                      </>
                  )}
              </div>
          )}

          {/* VIEW: REPORTS */}
          {activeView === 'reports' && (
              <div className="max-w-4xl mx-auto space-y-6">
                  {reportFilterQuestionId && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 font-medium"><Filter size={18} /> Filtrando reportes da questão <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-100">{reportFilterQuestionId}</span></div>
                          <button onClick={handleClearReportFilter} className="text-sm underline hover:text-amber-900 font-bold">Limpar Filtro</button>
                      </div>
                  )}
                  {filteredReports.map(report => {
                      const reporter = getUserDetails(report.userId);
                      return (
                          <div key={report.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><User size={20} /></div>
                                      <div><p className="text-sm font-bold text-slate-800">{reporter.name}</p><div onClick={() => copyToClipboard(report.userId)} className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer hover:text-blue-600" title="Copiar ID">ID: {report.userId.slice(0,8)}... <Copy size={10} /></div></div>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${report.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{report.type === 'error' ? <AlertTriangle size={12}/> : <MessageSquare size={12}/>}{formatReportCategory(report.category)}</span>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">{getReportDetails(report)}</div>
                              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                  <button onClick={() => setRejectReportModal(report)} className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg font-bold text-sm flex items-center gap-2"><ThumbsDown size={16}/> Recusar</button>
                                  <button onClick={() => handleOpenFromReport(report)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center gap-2"><Edit3 size={16}/> Ver Questão</button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}

          {/* VIEW: STUDENTS TABLE */}
          {activeView === 'students' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden pb-4">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                          <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b border-gray-200">
                              <tr>
                                  <th className="px-6 py-4">Aluno / Email</th>
                                  <th className="px-6 py-4">Função</th>
                                  <th className="px-6 py-4">ID</th>
                                  <th className="px-6 py-4">Status / Vencimento</th>
                                  <th className="px-6 py-4 text-right">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {filteredStudents.map(student => {
                                  const subStatus = checkSubscriptionStatus(student.subscriptionUntil, student.role);
                                  const isAdmin = student.role === 'admin';
                                  
                                  return (
                                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-6 py-4">
                                              <div className="font-bold text-slate-900">{student.name || 'Sem Nome'}</div>
                                              <div className="text-xs text-gray-500 mb-1">{student.email}</div>
                                              {student.whatsapp && (
                                                  <div className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                                                      <Phone size={12}/> {student.whatsapp}
                                                  </div>
                                              )}
                                          </td>
                                          <td className="px-6 py-4">
                                              <select 
                                                  value={student.role} 
                                                  onChange={(e) => handleInlineUserUpdate(student.id, 'role', e.target.value)}
                                                  className={`px-2 py-1 rounded text-xs font-bold uppercase outline-none cursor-pointer border-none bg-transparent ${student.role === 'admin' ? 'text-indigo-700 bg-indigo-100' : 'text-gray-600 bg-gray-100'}`}
                                              >
                                                  <option value="student">Aluno</option>
                                                  <option value="admin">Admin</option>
                                              </select>
                                          </td>
                                          <td className="px-6 py-4 font-mono text-xs text-gray-400 flex items-center gap-1 cursor-pointer hover:text-purple-600" onClick={()=>copyToClipboard(student.id)}>
                                              {student.id.slice(0, 8)}... <Copy size={12}/>
                                          </td>
                                          <td className="px-6 py-4">
                                              {!isAdmin ? (
                                                  <>
                                                      <div className={`text-xs font-bold uppercase mb-1 ${subStatus.color === 'emerald' ? 'text-emerald-600' : 'text-red-500'}`}>{subStatus.label}</div>
                                                      <div className="flex items-center gap-2">
                                                          <input 
                                                              type="date" 
                                                              value={student.subscriptionUntil ? student.subscriptionUntil.split('T')[0] : ''}
                                                              onChange={(e) => handleInlineUserUpdate(student.id, 'subscriptionUntil', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                                              className="text-xs text-gray-500 bg-transparent border-b border-dashed border-gray-300 focus:border-purple-500 outline-none hover:border-gray-400 cursor-pointer w-24"
                                                          />
                                                          <button onClick={() => handleAdd30Days(student)} className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors" title="Adicionar 30 dias"><PlusCircle size={10}/> +30</button>
                                                      </div>
                                                  </>
                                              ) : ( <span className="text-gray-400 text-sm font-medium">–</span> )}
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <div className="flex justify-end gap-2">
                                                  <button onClick={() => fetchUserStats(student)} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors" title="Ver Desempenho"><TrendingUp size={18}/></button>
                                                  <button onClick={() => setDeleteModal(student)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Excluir"><Trash2 size={18}/></button>
                                              </div>
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
                  {/* PAGINATION FOR STUDENTS */}
                  <div className="p-4 border-t border-gray-100">
                      {loadingStudents && <div className="text-center py-2"><Loader2 className="animate-spin inline text-purple-600"/> Carregando alunos...</div>}
                      {hasMoreStudents && !loadingStudents && (
                          <button onClick={() => loadStudents(false)} className="w-full py-2 bg-gray-50 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-100">Carregar Mais Alunos</button>
                      )}
                  </div>
              </div>
          )}
      </main>

      {/* --- MODALS --- */}

      {/* EDIT QUESTION MODAL */}
      {editingQuestion && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto animate-in fade-in duration-200">
              <div className="max-w-4xl mx-auto p-6 pb-20">
                  {associatedReport && (
                      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm">
                          <div className="flex items-start gap-3 w-full">
                              <div className="bg-amber-100 p-2 rounded-full text-amber-600 mt-1 flex-shrink-0"><MessageSquare size={20}/></div>
                              <div className="w-full">
                                  <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">Atenção: Reporte Pendente <span className="text-xs font-normal bg-white/50 px-2 py-0.5 rounded text-amber-800">{formatReportCategory(associatedReport.category)}</span></h3>
                                  <div className="mt-2 bg-white/60 p-3 rounded-lg border border-amber-100 text-amber-900 text-sm">{getReportDetails(associatedReport)}</div>
                              </div>
                          </div>
                      </div>
                  )}
                  <div className="flex items-center justify-between mb-8 sticky top-0 bg-white py-4 border-b border-gray-100 z-10">
                      <div className="flex items-center gap-3">
                          <button onClick={() => { setEditingQuestion(null); setAssociatedReport(null); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft size={24} /></button>
                          <h2 className="text-2xl font-bold text-slate-900">Editar Questão</h2>
                      </div>
                      <div className="flex gap-3">
                          {associatedReport && <button onClick={() => setRejectReportModal(associatedReport)} className="px-6 py-2 bg-orange-600 text-white hover:bg-orange-700 shadow-lg rounded-lg font-bold flex items-center gap-2"><ThumbsDown size={18} /> <span className="hidden sm:inline">Recusar</span></button>}
                          {associatedReport ? (
                              <button onClick={() => handleSave(true)} disabled={isSaving} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-lg flex items-center gap-2">{isSaving ? <Loader2 className="animate-spin" size={20} /> : <ThumbsUp size={20} />} Aprovar</button>
                          ) : (
                              <button onClick={() => handleSave(false)} disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg flex items-center gap-2">{isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar</button>
                          )}
                          <button onClick={() => setDeleteModal(editingQuestion)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 ml-2" title="Excluir Questão"><Trash2 size={20} /></button>
                      </div>
                  </div>
                  <form className="space-y-8">
                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div><label className="block text-sm font-bold text-gray-600 mb-2">Instituição</label><input value={editingQuestion.institution} onChange={e => setEditingQuestion({...editingQuestion, institution: e.target.value})} className="w-full pl-3 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: SUS-SP"/></div>
                          <div><label className="block text-sm font-bold text-gray-600 mb-2">Ano</label><input type="number" value={editingQuestion.year} onChange={e => setEditingQuestion({...editingQuestion, year: e.target.value})} className="w-full pl-3 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="2025"/></div>
                          <div><label className="block text-sm font-bold text-gray-600 mb-2">Área</label><select value={editingQuestion.area} onChange={e => setEditingQuestion({...editingQuestion, area: e.target.value, topic: ''})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">{areasBase.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                          <div><label className="block text-sm font-bold text-gray-600 mb-2">Tópico</label><select value={editingQuestion.topic} onChange={e => setEditingQuestion({...editingQuestion, topic: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">{(themesMap[editingQuestion.area] || []).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                          {/* Campo de Imagem adicionado */}
                          <div className="col-span-1 md:col-span-2">
                              <label className="block text-sm font-bold text-gray-600 mb-2">URL da Imagem (Opcional)</label>
                              <div className="flex gap-2">
                                <input value={editingQuestion.image || ''} onChange={e => setEditingQuestion({...editingQuestion, image: e.target.value})} className="w-full pl-3 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..."/>
                                {editingQuestion.image && <a href={editingQuestion.image} target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 flex items-center justify-center text-gray-600"><ExternalLink size={20}/></a>}
                              </div>
                              {editingQuestion.image && <div className="mt-2 h-32 w-full bg-gray-100 rounded-lg bg-contain bg-no-repeat bg-center border border-gray-200" style={{backgroundImage: `url(${editingQuestion.image})`}}></div>}
                          </div>
                      </div>
                      <div><label className="block text-lg font-bold text-slate-900 mb-3">Enunciado</label><textarea value={editingQuestion.text} onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})} rows={6} className="w-full p-4 border border-gray-300 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-lg leading-relaxed text-slate-800"/></div>
                      <div className="space-y-4"><label className="block text-lg font-bold text-slate-900">Alternativas</label>{editingQuestion.options.map((opt, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-colors ${editingQuestion.correctOptionId === opt.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}><div onClick={() => setEditingQuestion({...editingQuestion, correctOptionId: opt.id})} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer font-bold flex-shrink-0 mt-1 transition-colors ${editingQuestion.correctOptionId === opt.id ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>{opt.id.toUpperCase()}</div><textarea value={opt.text} onChange={e => { const newOpts = [...editingQuestion.options]; newOpts[idx].text = e.target.value; setEditingQuestion({...editingQuestion, options: newOpts}); }} rows={2} className="flex-1 bg-transparent border-none outline-none resize-none text-slate-700"/></div>))}</div>
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
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp (Opcional)</label><input name="whatsapp" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50" placeholder="31999999999" /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Função</label><select name="role" className="w-full p-3 border rounded-xl outline-none bg-white"><option value="student">Aluno</option><option value="admin">Administrador</option></select></div>
                          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vencimento</label><input name="subscriptionUntil" type="date" className="w-full p-3 border rounded-xl outline-none bg-white"/></div>
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setIsCreatingUser(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
                          <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg">{isSaving ? <Loader2 className="animate-spin mx-auto"/> : 'Criar Aluno'}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* USER STATS MODAL */}
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
                          <div className="flex gap-2 mt-1">
                              {checkSubscriptionStatus(viewingUserStats.subscriptionUntil, viewingUserStats.role).status === 'Ativo' ? <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded font-bold">Premium</span> : <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-bold">Free</span>}
                              <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-bold flex items-center gap-1"><Target size={10}/> Meta: {viewingUserStats.dailyGoal || 50}</span>
                          </div>
                      </div>
                  </div>
                  {viewingUserStats.loading ? (
                      <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-purple-600" size={32} /></div>
                  ) : (
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-100"><div className="flex justify-center text-orange-600 mb-1"><Zap size={24}/></div><div className="text-3xl font-bold text-slate-800">{viewingUserStats.stats?.streak || 0}</div><div className="text-xs uppercase font-bold text-orange-600">Dias em Sequência</div></div>
                          <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100"><div className="flex justify-center text-blue-600 mb-1"><CheckSquare size={24}/></div><div className="text-3xl font-bold text-slate-800">{viewingUserStats.stats?.totalAnswers || 0}</div><div className="text-xs uppercase font-bold text-blue-600">Questões Totais</div></div>
                          <div className="bg-emerald-50 p-4 rounded-xl text-center border border-emerald-100 col-span-2">
                              <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-emerald-800 flex items-center gap-1"><Award size={16}/> Taxa de Acerto</span><span className="text-2xl font-bold text-emerald-600">{viewingUserStats.stats?.totalAnswers > 0 ? Math.round((viewingUserStats.stats.correctAnswers / viewingUserStats.stats.totalAnswers) * 100) : 0}%</span></div>
                              <div className="w-full bg-emerald-200 rounded-full h-2.5"><div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${viewingUserStats.stats?.totalAnswers > 0 ? (viewingUserStats.stats.correctAnswers / viewingUserStats.stats.totalAnswers) * 100 : 0}%` }}></div></div>
                              <p className="text-xs text-emerald-600 mt-2 text-right">{viewingUserStats.stats?.correctAnswers || 0} acertos em {viewingUserStats.stats?.totalAnswers || 0} tentativas</p>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-red-100 p-3 rounded-full text-red-600 mb-4"><AlertTriangle size={32}/></div>
                    <h2 className="text-xl font-bold mb-2 text-slate-800">Excluir Definitivamente?</h2>
                    <p className="text-gray-600 mb-6 text-sm">{deleteModal.email ? `O aluno ${deleteModal.name} será removido.` : 'Essa questão será removida do banco de dados oficial.'}</p>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setDeleteModal(null)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
                        <button onClick={deleteModal.email ? handleDeleteUser : handleDeleteQuestion} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200">Sim, Excluir</button>
                    </div>
                  </div>
              </div>
          </div>
      )}

      {/* REJECT REPORT MODAL */}
      {rejectReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-orange-100 p-3 rounded-full text-orange-600 mb-4"><ThumbsDown size={32}/></div>
                    <h2 className="text-xl font-bold mb-2 text-slate-800">Recusar Sugestão?</h2>
                    <p className="text-gray-600 mb-6 text-sm">Esta ação vai <strong>APAGAR</strong> o reporte do banco de dados.</p>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setRejectReportModal(null)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleRejectReport} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200">Sim, Apagar</button>
                    </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
