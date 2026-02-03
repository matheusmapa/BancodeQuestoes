import React, { useState, useEffect, useRef } from 'react';
import { 
  Map, Save, Trash2, Settings, CheckCircle, 
  AlertCircle, FileText, Database, 
  Loader2, Wand2, Cpu, RefreshCw, User, X,
  LogOut, Send, Brain, Image as ImageIcon, UploadCloud, Lock, CloudLightning, ArrowLeft,
  AlertTriangle, ExternalLink, Key, Play, Pause, AlertOctagon, Terminal, ShieldCheck, ShieldAlert, 
  ToggleLeft, ToggleRight, Layers, Filter, Eraser, RefreshCcw, XCircle, RotateCcw, Copy,
  SkipForward, BookOpen, Clock, Files, Info, History, FastForward, Globe, ListFilter
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, doc, getDoc, deleteDoc, onSnapshot, query, orderBy, setDoc, writeBatch 
} from "firebase/firestore";
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "firebase/auth";

// --- PDF.JS IMPORT (Dynamic CDN) ---
const loadPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve(window.pdfjsLib);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

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

// --- DADOS DE REFERÊNCIA ---
const areasBase = [
  'Clínica Médica', 
  'Cirurgia Geral', 
  'Ginecologia e Obstetrícia', 
  'Pediatria', 
  'Preventiva'
];

const themesMap = {
    'Clínica Médica': [
        'Cardiologia', 'Dermatologia', 'Endocrinologia e Metabologia', 'Gastroenterologia', 'Hematologia', 'Hepatologia', 'Infectologia', 'Nefrologia', 'Neurologia', 'Pneumologia', 'Psiquiatria', 'Reumatologia'
    ],
    'Cirurgia Geral': [
        'Abdome Agudo', 'Cirurgia Hepatobiliopancreática', 'Cirurgia Torácica e de Cabeça e Pescoço', 'Cirurgia Vascular', 'Cirurgia do Esôfago e Estômago', 'Coloproctologia', 'Hérnias e Parede Abdominal', 'Pré e Pós-Operatório', 'Queimaduras', 'Resposta Metabólica e Cicatrização', 'Trauma', 'Urologia'
    ],
    'Ginecologia e Obstetrícia': [
        'Ciclo Menstrual e Anticoncepção', 'Climatério e Menopausa', 'Doenças Intercorrentes na Gestação', 'Infecções Congênitas e Gestacionais', 'Infecções Ginecológicas e ISTs', 'Mastologia', 'Obstetrícia Fisiológica e Pré-Natal', 'Oncologia Pélvica', 'Parto e Puerpério', 'Sangramentos da Gestação', 'Uroginecologia e Distopias', 'Vitalidade Fetal e Amniograma'
    ],
    'Pediatria': [
        'Adolescência e Puberdade', 'Afecções Respiratórias', 'Aleitamento Materno e Nutrição', 'Cardiologia e Reumatologia Pediátrica', 'Crescimento e Desenvolvimento', 'Emergências e Acidentes', 'Gastroenterologia Pediátrica', 'Imunizações', 'Infectopediatria e Exantemáticas', 'Nefrologia Pediátrica', 'Neonatologia: Patologias', 'Neonatologia: Sala de Parto'
    ],
    'Preventiva': [
        'Atenção Primária e Saúde da Família', 'Estudos Epidemiológicos', 'Financiamento e Gestão', 'História e Princípios do SUS', 'Indicadores de Saúde e Demografia', 'Medicina Baseada em Evidências', 'Medicina Legal', 'Medidas de Associação e Testes Diagnósticos', 'Políticas Nacionais de Saúde', 'Saúde do Trabalhador', 'Vigilância em Saúde', 'Ética Médica e Bioética'
    ]
};

// --- HELPER: HASH ID GENERATOR (DEDUPLICATION) ---
const generateQuestionHash = async (text) => {
    if (!text) return null;
    const normalized = text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    
    const msgBuffer = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
};

// --- HELPER: CLEAN INSTITUTION ---
const cleanInstitutionText = (inst) => {
    if (!inst) return "";
    const lower = inst.toString().toLowerCase();
    if (
        lower.includes("não informado") || 
        lower.includes("nao informado") || 
        lower.includes("detectar") ||
        lower.includes("nao consta")
    ) return "";
    return inst;
};

// --- HELPER: EXTRAIR TEMPO DE ESPERA DA MENSAGEM DE ERRO ---
const extractRetryTime = (message) => {
    const match = message.match(/retry in ([0-9\.]+)s/);
    return match ? parseFloat(match[1]) : null;
};

// --- HELPER: PARSER JSON BLINDADO (RECUPERAÇÃO ITERATIVA) ---
const safeJsonParse = (jsonString) => {
    let clean = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    clean = clean.replace(/[\u0000-\u0019]+/g, ""); 

    const startIndex = clean.indexOf('[');
    if (startIndex === -1) {
        try { return JSON.parse(clean); } catch(e) { 
            throw new Error("Formato inválido: JSON não encontrado."); 
        }
    }
    clean = clean.substring(startIndex);

    try {
        const parsed = JSON.parse(clean);
        if (!Array.isArray(parsed) && typeof parsed === 'object') return [parsed];
        return parsed;
    } catch (e) {
        console.warn("JSON quebrado detectado. Iniciando recuperação iterativa...", e.message);
        
        let currentString = clean;
        let attempts = 0;
        const maxAttempts = 50;

        while (currentString.length > 2 && attempts < maxAttempts) {
            attempts++;
            const lastClose = currentString.lastIndexOf('}');
            
            if (lastClose === -1) {
                console.error("Recuperação falhou: nenhum objeto válido encontrado.");
                return []; 
            }
            
            const candidate = currentString.substring(0, lastClose + 1) + ']';
            
            try {
                const result = JSON.parse(candidate);
                console.log(`Recuperação com sucesso na tentativa ${attempts}! ${result.length} itens salvos.`);
                return result;
            } catch (e2) {
                currentString = currentString.substring(0, lastClose);
            }
        }
        
        console.error("Falha total na recuperação do JSON.");
        return [];
    }
};

// --- COMPONENTE DE NOTIFICAÇÃO INTELIGENTE ---
function NotificationToast({ notification, onClose, positionClass }) {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!notification || isHovered) return;
    const timer = setTimeout(() => { onClose(); }, 6000);
    return () => clearTimeout(timer);
  }, [notification, isHovered, onClose]);

  if (!notification) return null;

  return (
    <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${positionClass} z-[100] p-4 rounded-xl shadow-xl flex items-start gap-3 animate-in slide-in-from-right-10 duration-300 max-w-sm border transition-all ${notification.type === 'error' ? 'bg-white border-red-200 text-red-700' : notification.type === 'warning' ? 'bg-white border-amber-200 text-amber-700' : notification.type === 'info' ? 'bg-white border-blue-200 text-blue-700' : 'bg-white border-emerald-200 text-emerald-700'}`}
    >
        <div className={`mt-0.5 p-1 rounded-full ${notification.type === 'error' ? 'bg-red-100' : notification.type === 'warning' ? 'bg-amber-100' : notification.type === 'info' ? 'bg-blue-100' : 'bg-emerald-100'}`}>
            {notification.type === 'error' ? <AlertCircle size={20} /> : notification.type === 'warning' ? <AlertTriangle size={20} /> : notification.type === 'info' ? <Info size={20}/> : <CheckCircle size={20} />}
        </div>
        <div className="flex-1">
            <p className="font-bold text-sm mb-1">{notification.type === 'error' ? 'Erro' : notification.type === 'warning' ? 'Atenção' : notification.type === 'info' ? 'Info' : 'Sucesso'}</p>
            <p className="text-sm opacity-90 leading-tight">{notification.text}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18}/>
        </button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // Gestão de Chaves API
  const [apiKeys, setApiKeys] = useState(() => JSON.parse(localStorage.getItem('gemini_api_keys') || '[]'));
  
  // Modelos
  const [availableModels, setAvailableModels] = useState([
      { name: 'models/gemini-2.5-pro', displayName: 'Gemini 2.5 Pro (Padrão)' },
      { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' }
  ]);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('gemini_model') || 'models/gemini-2.5-pro');
  
  // Estados UI Básicos
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBatchAction, setIsBatchAction] = useState(false); 
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('input');
  const [notification, setNotification] = useState(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [isDoubleCheckEnabled, setIsDoubleCheckEnabled] = useState(true);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  
  // --- MUDANÇA: ARRAY DE FILTROS ---
  const [activeFilters, setActiveFilters] = useState(['all']); 
  
  // Override States
  const [overrideInst, setOverrideInst] = useState('');
  const [overrideYear, setOverrideYear] = useState('');
  const [overrideArea, setOverrideArea] = useState('');
  const [overrideTopic, setOverrideTopic] = useState('');

  // Modais
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKeysText, setTempApiKeysText] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  
  const [confirmationModal, setConfirmationModal] = useState({
      isOpen: false, type: null, data: null, title: '', message: '', confirmText: '', confirmColor: ''
  });
  
  // Login Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- BATCH IMAGE STATES ---
  const [batchImages, setBatchImages] = useState([]);
  const [batchStatus, setBatchStatus] = useState('idle');
  const [batchLogs, setBatchLogs] = useState([]);

  // --- PDF PROCESSING STATES ---
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfStatus, setPdfStatus] = useState('idle');
  const [pdfChunks, setPdfChunks] = useState([]); 
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [processingLogs, setProcessingLogs] = useState([]);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  
  const [pdfStartPage, setPdfStartPage] = useState('');
  const [pdfEndPage, setPdfEndPage] = useState('');

  const [lastSessionData, setLastSessionData] = useState(null);

  const processorRef = useRef(null); 
  const batchProcessorRef = useRef(null);
  
  // --- REFS ---
  const pdfStatusRef = useRef(pdfStatus);
  const pdfChunksRef = useRef(pdfChunks);
  const batchImagesRef = useRef(batchImages);
  const batchStatusRef = useRef(batchStatus);
  const apiKeysRef = useRef(apiKeys);
  const keyRotationIndex = useRef(0);
  const doubleCheckRef = useRef(isDoubleCheckEnabled); 
  const webSearchRef = useRef(isWebSearchEnabled);
  const overridesRef = useRef({ overrideInst, overrideYear, overrideArea, overrideTopic });
  const currentChunkIndexRef = useRef(currentChunkIndex);

  const CHUNK_SIZE = 10; 

  // --- AUTH CHECK ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (u) {
            try {
                const userDocRef = doc(db, "users", u.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    setUser(u);
                } else {
                    await signOut(auth);
                    setUser(null);
                    showNotification('error', 'Acesso negado: Usuário não é administrador.');
                }
            } catch (error) {
                console.error("Erro ao verificar role:", error);
                await signOut(auth);
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- SYNC REFS ---
  useEffect(() => { pdfStatusRef.current = pdfStatus; }, [pdfStatus]);
  useEffect(() => { pdfChunksRef.current = pdfChunks; }, [pdfChunks]);
  useEffect(() => { batchImagesRef.current = batchImages; }, [batchImages]);
  useEffect(() => { batchStatusRef.current = batchStatus; }, [batchStatus]);
  useEffect(() => { apiKeysRef.current = apiKeys; }, [apiKeys]);
  useEffect(() => { doubleCheckRef.current = isDoubleCheckEnabled; }, [isDoubleCheckEnabled]);
  useEffect(() => { webSearchRef.current = isWebSearchEnabled; }, [isWebSearchEnabled]);
  useEffect(() => { overridesRef.current = { overrideInst, overrideYear, overrideArea, overrideTopic }; }, [overrideInst, overrideYear, overrideArea, overrideTopic]);
  useEffect(() => { currentChunkIndexRef.current = currentChunkIndex; }, [currentChunkIndex]);

  // --- SYNC CHAVES API ---
  useEffect(() => {
      if (!user) return;
      const unsubscribe = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              let newKeys = [];
              if (data.geminiApiKeys && Array.isArray(data.geminiApiKeys)) {
                  newKeys = data.geminiApiKeys;
              } else if (data.geminiApiKey) {
                  newKeys = [data.geminiApiKey];
              }
              const uniqueKeys = [...new Set(newKeys.filter(k => k && k.trim().length > 0))];
              if (JSON.stringify(uniqueKeys) !== JSON.stringify(apiKeysRef.current)) {
                  setApiKeys(uniqueKeys);
                  localStorage.setItem('gemini_api_keys', JSON.stringify(uniqueKeys));
              }
          }
      }, (error) => console.error("Erro ao sincronizar chaves:", error));
      return () => unsubscribe();
  }, [user]);

  // --- SYNC RASCUNHOS ---
  useEffect(() => {
      if (!user) { setParsedQuestions([]); return; }
      const q = query(collection(db, "draft_questions"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const drafts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, status: 'draft' }));
          setParsedQuestions(drafts);
      });
      return () => unsubscribe();
  }, [user]);

  // --- SYNC PROGRESSO PDF ---
  useEffect(() => {
      if (!user) { setLastSessionData(null); return; }
      const unsubscribe = onSnapshot(doc(db, "users", user.uid, "progress", "pdf_session"), (docSnap) => {
          if (docSnap.exists()) { setLastSessionData(docSnap.data()); } else { setLastSessionData(null); }
      });
      return () => unsubscribe();
  }, [user]);

  // --- ROTATION HELPER ---
  const executeWithKeyRotation = async (operationName, requestFn) => {
      const keys = apiKeysRef.current;
      if (!keys || keys.length === 0) throw new Error("Nenhuma chave API configurada.");

      let lastError = null;
      const startIndex = keyRotationIndex.current;

      for (let i = 0; i < keys.length; i++) {
          const currentIndex = (startIndex + i) % keys.length;
          const currentKey = keys[currentIndex];
          keyRotationIndex.current = (currentIndex + 1) % keys.length;

          try {
              return await requestFn(currentKey);
          } catch (error) {
              const msg = error.message || "";
              const isQuotaError = msg.includes("Quota exceeded") || msg.includes("429");
              if (isQuotaError) {
                  const logFn = operationName.includes("Imagem") ? addBatchLog : addLog;
                  logFn('warning', `[${operationName}] Chave ...${currentKey.slice(-4)} no limite. Rotacionando...`);
                  lastError = error;
                  continue; 
              } else {
                  throw error; 
              }
          }
      }
      throw lastError || new Error("Todas as chaves falharam.");
  };

  // --- SEARCH AGENT ---
  const searchQuestionSource = async (questionText) => {
      return executeWithKeyRotation("Pesquisa Web", async (key) => {
          const systemPrompt = `Você é um verificador de questões de residência médica.
          Sua missão: Identificar a origem da questão usando a Pesquisa Google.
          CRITÉRIOS DE ESCOLHA:
          - Se a questão apareceu em múltiplas provas, escolha a ORIGINAL ou a MAIS RECENTE (priorize a prova principal).
          REGRAS DE FORMATAÇÃO DE NOME:
          - Resuma nomes longos para o formato: "UF - Nome Curto / Sigla".
          SAÍDA OBRIGATÓRIA (JSON):
          { "institution": "Nome...", "year": "Ano..." }`;

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `QUESTÃO PARA IDENTIFICAR:\n${questionText}` }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                tools: [{ google_search: {} }] 
              })
            }
          );
          if (!response.ok) throw new Error("Erro na API Search");
          const data = await response.json();
          let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          try { return safeJsonParse(jsonString); } catch(e) { return { institution: "", year: "" }; }
      });
  };

  // --- DOUBLE CHECK AGENT ---
  const verifyQuestionWithAI = async (questionData) => {
      return executeWithKeyRotation("Auditoria", async (key) => {
          const verifyPrompt = `
            Você é um Auditor Sênior de Questões Médicas.
            QUESTÃO: ${questionData.text}
            Alternativas: ${JSON.stringify(questionData.options)}
            Gabarito Indicado: ${questionData.correctOptionId}
            
            TAREFA: Verifique se a questão é medicamente correta e não é alucinação.
            Retorne JSON: { "isValid": boolean, "reason": "Explicação curta" }
          `;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: verifyPrompt }] }] })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return safeJsonParse(jsonString); 
      }).then(result => {
          return {
              status: result.isValid ? 'verified' : 'suspicious',
              reason: result.reason || (result.isValid ? "Verificado por IA" : "Inconsistência detectada")
          };
      });
  };

  // --- LOGS ---
  const addLog = (type, message) => {
      const time = new Date().toLocaleTimeString();
      setProcessingLogs(prev => [{ type, message, time }, ...prev].slice(0, 50)); 
  };
  const addBatchLog = (type, message) => {
      const time = new Date().toLocaleTimeString();
      setBatchLogs(prev => [{ type, message, time }, ...prev].slice(0, 50));
  };

  // --- LOGIC: MULTI-FILTER ---
  const toggleFilter = (filterKey) => {
      setActiveFilters(prev => {
          if (filterKey === 'all') return ['all'];
          let newFilters = prev.filter(f => f !== 'all');
          
          if (newFilters.includes(filterKey)) {
              newFilters = newFilters.filter(f => f !== filterKey);
          } else {
              newFilters.push(filterKey);
          }
          
          if (newFilters.length === 0) return ['all'];
          return newFilters;
      });
  };

  const getFilteredQuestions = () => {
    if (activeFilters.includes('all')) return parsedQuestions;
    
    return parsedQuestions.filter(q => {
      // Lógica Union (OR): Se bater com QUALQUER um dos filtros ativos, exibe.
      // Isso permite agrupar "Suspeitas" e "Duplicadas" na mesma tela.
      
      const matchesVerified = activeFilters.includes('verified') && q.verificationStatus === 'verified';
      const matchesSuspicious = activeFilters.includes('suspicious') && q.verificationStatus === 'suspicious';
      const matchesSource = activeFilters.includes('source') && q.sourceFound;
      const matchesNoSource = activeFilters.includes('no_source') && !q.sourceFound;
      const matchesDuplicates = activeFilters.includes('duplicates') && q.isDuplicate;

      const isMatch = matchesVerified || matchesSuspicious || matchesSource || matchesNoSource || matchesDuplicates;
      
      // Regra de Ouro: Duplicadas são ocultas por padrão, A MENOS que o filtro 'duplicates' esteja ativo.
      if (!activeFilters.includes('duplicates') && q.isDuplicate) return false;

      return isMatch;
    });
  };

  // --- FILTER CONFIG ---
  const filterLabels = {
      'all': 'Todas',
      'verified': 'Verificadas',
      'source': 'Com Fonte',
      'no_source': 'Sem Fonte',
      'suspicious': 'Suspeitas',
      'duplicates': 'Duplicadas'
  };

  // --- LOGIC: BATCH IMAGE PROCESSING ---
  const handleBatchImageUpload = (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      const newImages = files.map(file => ({
          id: Math.random().toString(36).substr(2, 9),
          file, name: file.name, preview: URL.createObjectURL(file), status: 'pending', errorMsg: ''
      }));
      setBatchImages(prev => [...prev, ...newImages]);
      addBatchLog('info', `${files.length} imagens adicionadas à fila.`);
  };

  const handleBatchPaste = (e) => {
      const items = e.clipboardData.items;
      const newImages = [];
      for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
              const blob = items[i].getAsFile();
              newImages.push({
                  id: Math.random().toString(36).substr(2, 9),
                  file: blob, name: `Colada_${Date.now()}_${i}.png`, preview: URL.createObjectURL(blob), status: 'pending', errorMsg: ''
              });
          }
      }
      if (newImages.length > 0) {
          setBatchImages(prev => [...prev, ...newImages]);
          addBatchLog('info', `${newImages.length} imagens coladas.`);
      }
  };

  const removeBatchImage = (id) => setBatchImages(prev => prev.filter(img => img.id !== id));
  
  const clearBatchQueue = () => {
      if (batchStatus === 'processing' || batchStatus === 'pausing') return;
      setBatchImages([]); addBatchLog('info', 'Fila de imagens limpa.'); setBatchLogs([]);
  };

  const toggleBatchProcessing = () => {
      if (batchStatusRef.current === 'processing') {
          setBatchStatus('pausing'); addBatchLog('warning', 'Solicitando pausa...');
      } else if (batchStatusRef.current === 'paused' || batchStatusRef.current === 'idle') {
          setBatchStatus('processing'); addBatchLog('info', 'Processando imagens...');
          batchProcessorRef.current = false; setTimeout(() => processNextBatchImage(), 100);
      }
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject;
  });

  const processNextBatchImage = async () => {
      if (batchProcessorRef.current) return;
      if (batchStatusRef.current === 'pausing') { setBatchStatus('paused'); return; }
      if (batchStatusRef.current !== 'processing') return;

      const queue = batchImagesRef.current;
      const nextImg = queue.find(img => img.status === 'pending');

      if (!nextImg) { setBatchStatus('idle'); addBatchLog('success', 'Fila finalizada!'); return; }

      batchProcessorRef.current = true;
      const ovr = overridesRef.current;
      addBatchLog('info', `Processando: ${nextImg.name}...`);

      try {
          const base64Data = await fileToBase64(nextImg.file);
          const activeThemesMap = ovr.overrideArea ? { [ovr.overrideArea]: themesMap[ovr.overrideArea] } : themesMap;

          const questions = await executeWithKeyRotation("Imagem Batch", async (key) => {
              const systemPrompt = `
                Você é um especialista em banco de dados médicos. Analise esta imagem.
                Extraia questões no formato JSON ESTRITO.
                - Instituição: ${ovr.overrideInst || "Detectar"}
                - Ano: ${ovr.overrideYear || "Detectar"}
                - LISTA CLASSIFICAÇÃO: ${JSON.stringify(activeThemesMap)}
                Saída: [{ "institution": "...", "year": "...", "area": "...", "topic": "...", "text": "...", "options": [...], "correctOptionId": "...", "explanation": "..." }]
              `;
              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.replace('models/', '')}:generateContent?key=${key}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }, { inline_data: { mime_type: nextImg.file.type, data: base64Data } }] }] })
              });
              const data = await response.json();
              if (data.error) throw new Error(data.error.message);
              return safeJsonParse(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
          });

          let processedQuestions = await Promise.all(questions.map(async (q) => {
              let finalInst = ovr.overrideInst || cleanInstitutionText(q.institution);
              let finalYear = ovr.overrideYear || q.year;
              let foundOnWeb = false;

              if (webSearchRef.current && (!finalInst || !finalYear)) {
                  try {
                      await new Promise(r => setTimeout(r, Math.random() * 2000));
                      const searchResult = await searchQuestionSource(q.text);
                      if (searchResult.institution) { finalInst = searchResult.institution; foundOnWeb = true; }
                      if (searchResult.year) finalYear = searchResult.year;
                  } catch (err) { console.warn("Search Fail:", err); }
              }

              const hashId = await generateQuestionHash(q.text);
              let isDuplicate = false;
              if (hashId) { const ex = await getDoc(doc(db, "questions", hashId)); if (ex.exists()) isDuplicate = true; }

              return { ...q, institution: finalInst, year: finalYear, area: ovr.overrideArea || q.area, topic: ovr.overrideTopic || q.topic, sourceFound: foundOnWeb, hashId, isDuplicate };
          }));

          const batch = writeBatch(db);
          let newQuestions = processedQuestions.filter(q => !q.isDuplicate);

          if (newQuestions.length > 0 && doubleCheckRef.current) {
              addBatchLog('info', `Auditando ${newQuestions.length} questões...`);
              for (let i = 0; i < newQuestions.length; i++) {
                   if(i>0) await new Promise(r=>setTimeout(r,150));
                   try {
                       const ver = await verifyQuestionWithAI(newQuestions[i]);
                       newQuestions[i] = { ...newQuestions[i], verificationStatus: ver.status, verificationReason: ver.reason };
                   } catch(e) { newQuestions[i].verificationStatus = 'unchecked'; }
              }
          }

          newQuestions.forEach(q => {
              const docId = q.hashId || doc(collection(db, "draft_questions")).id;
              batch.set(doc(db, "draft_questions", docId), { ...q, createdAt: new Date().toISOString(), createdBy: user.email, sourceFile: nextImg.name, hasImage: true });
          });
          await batch.commit();

          addBatchLog('success', `Sucesso em ${nextImg.name}: ${newQuestions.length} salvas.`);
          setBatchImages(prev => prev.filter(img => img.id !== nextImg.id));
          setTimeout(() => { batchProcessorRef.current = false; processNextBatchImage(); }, 1000);

      } catch (error) {
          const msg = error.message || "Erro";
          if (msg.includes("Quota") || msg.includes("429")) {
              addBatchLog('warning', 'Cota excedida. 10s...'); setTimeout(() => { batchProcessorRef.current = false; processNextBatchImage(); }, 10000);
          } else {
              addBatchLog('error', `Falha em ${nextImg.name}: ${msg}`);
              setBatchImages(prev => prev.map(img => img.id === nextImg.id ? { ...img, status: 'error', errorMsg: msg } : img));
              setTimeout(() => { batchProcessorRef.current = false; processNextBatchImage(); }, 1000);
          }
      }
  };

  // --- LOGIC: PDF HANDLING ---
  const handlePdfUpload = async (e) => {
      const file = e.target.files[0]; if (!file || file.type !== 'application/pdf') return;
      setPdfFile(file); setPdfStatus('reading'); setProcessingLogs([]); addLog('info', `Lendo: ${file.name}`);

      try {
          const pdfjs = await loadPdfJs();
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          
          let startP = parseInt(pdfStartPage) || 1;
          let endP = parseInt(pdfEndPage) || pdf.numPages;
          if (startP < 1) startP = 1; if (endP > pdf.numPages) endP = pdf.numPages;

          let chunks = [];
          let currentChunkText = "";
          let chunkStartPage = startP;
          let lastPageContent = "";

          for (let i = startP; i <= endP; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const text = content.items.map(item => item.str).join(' ');
              lastPageContent = text; 
              currentChunkText += `\n--- PÁGINA ${i} ---\n${text}`;

              if ((i - startP + 1) % CHUNK_SIZE === 0 || i === endP) {
                  let finalChunkText = currentChunkText;
                  if (i < endP) {
                      const np = await pdf.getPage(i+1); const nc = await np.getTextContent();
                      finalChunkText += `\n\n--- NEXT CTX ---\n${nc.items.map(i=>i.str).join(' ')}`;
                  }
                  chunks.push({ id: `chunk_${chunkStartPage}_${i}`, pages: `${chunkStartPage}-${i}`, text: finalChunkText, status: 'pending', errorCount: 0 });
                  currentChunkText = i < endP ? `\n--- PREV CTX ---\n${lastPageContent}` : "";
                  chunkStartPage = i + 1;
              }
          }

          setPdfChunks(chunks); setPdfStatus('ready');
          
          if (lastSessionData && lastSessionData.fileName === file.name) {
              const nextIndex = lastSessionData.lastChunkIndex + 1;
              if (nextIndex < chunks.length) {
                  setCurrentChunkIndex(nextIndex);
                  for(let i = 0; i < nextIndex; i++) chunks[i].status = 'restored';
                  addLog('info', `Sessão restaurada na fatia ${chunks[nextIndex].pages}.`);
              } else {
                  setCurrentChunkIndex(chunks.length - 1); chunks.forEach(c => c.status = 'restored');
                  addLog('success', 'Arquivo já finalizado anteriormente.');
              }
          } else {
             if (user) setDoc(doc(db, "users", user.uid, "progress", "pdf_session"), { fileName: file.name, lastChunkIndex: -1, timestamp: new Date().toISOString() });
          }
      } catch (error) { setPdfStatus('error'); addLog('error', `Erro PDF: ${error.message}`); }
  };

  const handleResetPdf = () => { if (pdfStatus === 'processing') return; setPdfFile(null); setPdfChunks([]); setPdfStatus('idle'); setCurrentChunkIndex(0); };
  const handleRestartPdf = () => { if (!pdfFile || pdfStatus === 'processing') return; setPdfChunks(pdfChunks.map(c => ({...c, status: 'pending'}))); setCurrentChunkIndex(0); setPdfStatus('ready'); };
  const handleJumpToChunk = (index) => { if(pdfStatus==='processing') return; setCurrentChunkIndex(index); setPdfChunks(p=>{const n=[...p]; n[index]={...n[index], status:'pending'}; return n;}); };
  const togglePdfProcessing = () => {
     if (pdfStatusRef.current === 'processing') { setPdfStatus('pausing'); addLog('warning', 'Pausando...'); }
     else { setPdfStatus('processing'); processorRef.current = false; setTimeout(() => processNextChunk(), 100); }
  };

  const processNextChunk = async () => {
      const activeIndex = currentChunkIndexRef.current;
      if (processorRef.current || pdfStatusRef.current === 'completed') return;
      if (activeIndex >= pdfChunksRef.current.length) { setPdfStatus('completed'); addLog('success', 'Finalizado!'); return; }

      const chunk = pdfChunksRef.current[activeIndex];
      if (pdfStatusRef.current !== 'pausing') setPdfStatus('processing');
      processorRef.current = true;
      addLog('info', `Processando fatia ${chunk.pages}...`);

      try {
          const ovr = overridesRef.current;
          const questions = await executeWithKeyRotation("Geração PDF", async (key) => {
               const prompt = `Extraia questões médicas (MedMaps) deste texto.
               - Instituição: ${ovr.overrideInst || "Detectar"}
               - Ano: ${ovr.overrideYear || "Detectar"}
               - Use JSON ESTRITO.`;
               const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.replace('models/', '')}:generateContent?key=${key}`, {
                   method: 'POST', headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ contents: [{ parts: [{ text: prompt + "\nTEXTO:\n" + chunk.text }] }] })
               });
               const d = await res.json(); if(d.error) throw new Error(d.error.message);
               return safeJsonParse(d.candidates?.[0]?.content?.parts?.[0]?.text || "");
          });

          let processed = await Promise.all(questions.map(async (q) => {
              let finalInst = ovr.overrideInst || cleanInstitutionText(q.institution);
              let finalYear = ovr.overrideYear || q.year;
              let foundOnWeb = false;
              if (webSearchRef.current && (!finalInst || !finalYear)) {
                  try {
                      await new Promise(r => setTimeout(r, Math.random() * 2000));
                      const sr = await searchQuestionSource(q.text);
                      if (sr.institution) { finalInst = sr.institution; foundOnWeb = true; }
                      if (sr.year) finalYear = sr.year;
                  } catch(e){}
              }
              const hashId = await generateQuestionHash(q.text);
              let isDup = false; if(hashId) { const e = await getDoc(doc(db,"questions",hashId)); if(e.exists()) isDup=true; }
              return { ...q, institution: finalInst, year: finalYear, area: ovr.overrideArea||q.area, topic: ovr.overrideTopic||q.topic, sourceFound: foundOnWeb, hashId, isDuplicate: isDup };
          }));

          const newQs = processed.filter(q => !q.isDuplicate);
          if (newQs.length > 0 && doubleCheckRef.current) {
              addLog('info', `Auditando ${newQs.length} questões...`);
              for(let i=0; i<newQs.length; i++) {
                  if(i>0) await new Promise(r=>setTimeout(r,150));
                  try { const v = await verifyQuestionWithAI(newQs[i]); newQs[i] = {...newQs[i], verificationStatus: v.status, verificationReason: v.reason}; }
                  catch(e) { newQs[i].verificationStatus = 'unchecked'; }
              }
          }

          const batch = writeBatch(db);
          newQs.forEach(q => {
              batch.set(doc(db, "draft_questions", q.hashId || doc(collection(db,"draft_questions")).id), {
                  ...q, createdAt: new Date().toISOString(), createdBy: user.email, sourceFile: pdfFile.name, sourcePages: chunk.pages
              });
          });
          await batch.commit();

          setPdfChunks(p => { const n = [...p]; n[activeIndex] = { ...n[activeIndex], status: 'success' }; return n; });
          setConsecutiveErrors(0);
          if (user) setDoc(doc(db, "users", user.uid, "progress", "pdf_session"), { fileName: pdfFile.name, lastChunkIndex: activeIndex, lastChunkPages: chunk.pages, timestamp: new Date().toISOString() });

          if (pdfStatusRef.current === 'pausing') { setPdfStatus('paused'); processorRef.current = false; return; }
          setCurrentChunkIndex(p => p + 1); setTimeout(() => { processorRef.current = false; processNextChunk(); }, 500);

      } catch (error) {
          console.error(error);
          const msg = error.message || "";
          const retry = extractRetryTime(msg);
          let delay = retry ? (retry*1000)+2000 : 3000;
          if (msg.includes("Quota") || msg.includes("429")) { delay = 60000; addLog('warning', 'Cota cheia. 60s...'); }
          
          const newErr = chunk.errorCount + 1;
          if (newErr >= 3) {
              setPdfChunks(p => { const n = [...p]; n[activeIndex] = { ...n[activeIndex], status: 'error', errorCount: newErr }; return n; });
              processorRef.current = false; setCurrentChunkIndex(p=>p+1); setTimeout(()=>processNextChunk(), 1000); return;
          }
          setPdfChunks(p => { const n = [...p]; n[activeIndex] = { ...n[activeIndex], status: 'pending', errorCount: newErr }; return n; });
          setTimeout(() => { processorRef.current = false; processNextChunk(); }, delay);
      }
  };

  // --- ACTIONS ---
  const saveApiKeyFromModal = async () => {
      const keys = tempApiKeysText.split('\n').map(k => k.trim()).filter(k => k);
      if (keys.length === 0) return showNotification('error', 'Adicione chaves.');
      setIsSavingKey(true);
      try {
          setApiKeys(keys); localStorage.setItem('gemini_api_keys', JSON.stringify(keys));
          await setDoc(doc(db, "settings", "global"), { geminiApiKeys: keys, updatedAt: new Date().toISOString() }, { merge: true });
          setShowApiKeyModal(false); showNotification('success', 'Chaves Salvas!');
      } catch(e) { showNotification('error', e.message); } finally { setIsSavingKey(false); }
  };

  const processWithAI = async () => {
    if (!rawText.trim()) return showNotification('error', 'Cole o texto.');
    setIsProcessing(true);
    try {
        const ovr = { overrideInst, overrideYear, overrideArea, overrideTopic };
        const questions = await executeWithKeyRotation("Processamento Único", async (key) => {
             const prompt = `Extraia questões médicas JSON ESTRITO.
             - Instituição: ${ovr.overrideInst || "Detectar"}
             - Ano: ${ovr.overrideYear || "Detectar"}`;
             const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.replace('models/', '')}:generateContent?key=${key}`, {
                 method: 'POST', headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ contents: [{ parts: [{ text: prompt + "\nCONTEÚDO:\n" + rawText }] }] })
             });
             const d = await res.json(); if(d.error) throw new Error(d.error.message);
             return safeJsonParse(d.candidates?.[0]?.content?.parts?.[0]?.text || "");
        });

        let finalQs = await Promise.all(questions.map(async (q) => {
             let finalInst = ovr.overrideInst || cleanInstitutionText(q.institution);
             let finalYear = ovr.overrideYear || q.year;
             let foundOnWeb = false;
             if (isWebSearchEnabled && (!finalInst || !finalYear)) {
                 try {
                     await new Promise(r=>setTimeout(r, Math.random()*2000));
                     const s = await searchQuestionSource(q.text);
                     if(s.institution) { finalInst=s.institution; foundOnWeb=true; }
                     if(s.year) finalYear=s.year;
                 } catch(e){}
             }
             const hash = await generateQuestionHash(q.text);
             let isDup = false; if(hash) { const e = await getDoc(doc(db,"questions",hash)); if(e.exists()) isDup=true; }
             return { ...q, institution: finalInst, year: finalYear, area: ovr.overrideArea||q.area, topic: ovr.overrideTopic||q.topic, sourceFound: foundOnWeb, hashId: hash, isDuplicate: isDup };
        }));

        const uniqueQs = finalQs.filter(q => !q.isDuplicate);
        if (isDoubleCheckEnabled && uniqueQs.length > 0) {
            showNotification('success', 'Auditando...');
            for(let i=0; i<uniqueQs.length; i++) {
                if(i>0) await new Promise(r=>setTimeout(r,200));
                try { const v = await verifyQuestionWithAI(uniqueQs[i]); uniqueQs[i] = {...uniqueQs[i], verificationStatus:v.status, verificationReason:v.reason}; }
                catch(e){ uniqueQs[i].verificationStatus='unchecked'; }
            }
        }

        const batch = writeBatch(db);
        uniqueQs.forEach(q => batch.set(doc(db,"draft_questions",q.hashId || doc(collection(db,"draft_questions")).id), {...q, createdAt: new Date().toISOString(), createdBy: user.email}));
        await batch.commit();

        setRawText(''); setActiveTab('review'); showNotification('success', 'Enviado para fila!');
    } catch (error) { showNotification('error', error.message); } finally { setIsProcessing(false); }
  };

  const clearAllField = (field) => {
      const targetQuestions = getFilteredQuestions();
      if (targetQuestions.length === 0) return;
      setConfirmationModal({
          isOpen: true, type: field === 'institution' ? 'clear_institution' : 'clear_year',
          data: null, title: `Limpar ${field}?`,
          message: `Limpar em ${targetQuestions.length} questões exibidas?`, confirmText: 'Sim', confirmColor: 'red'
      });
  };

  const handleDiscardOneClick = (q) => setConfirmationModal({ isOpen: true, type: 'delete_one', data: q, title: 'Excluir?', message: 'Certeza?', confirmText: 'Excluir', confirmColor: 'red' });
  
  const handleApproveFilteredClick = () => {
      const targetQuestions = getFilteredQuestions();
      const count = targetQuestions.filter(q => !q.isDuplicate).length;
      if (count === 0) return showNotification('error', 'Nada válido para aprovar.');
      const activeLabels = activeFilters.map(f => filterLabels[f]).join(' + ');
      setConfirmationModal({ isOpen: true, type: 'approve_filtered', title: `Aprovar ${count}?`, message: `Filtros: ${activeLabels}`, confirmText: 'Publicar', confirmColor: 'emerald' });
  };

  const handleDiscardFilteredClick = () => {
      const targetQuestions = getFilteredQuestions();
      const activeLabels = activeFilters.map(f => filterLabels[f]).join(' + ');
      setConfirmationModal({ isOpen: true, type: 'delete_filtered', title: `Excluir ${targetQuestions.length}?`, message: `Filtros: ${activeLabels}`, confirmText: 'Excluir', confirmColor: 'red' });
  };

  const executeConfirmationAction = async () => {
      const { type, data } = confirmationModal; setConfirmationModal({ ...confirmationModal, isOpen: false });
      if (type === 'delete_one') { await deleteDoc(doc(db, "draft_questions", data.id)); showNotification('success', 'Excluído.'); return; }

      const targetQuestions = getFilteredQuestions();
      if (type.startsWith('clear_')) {
          const field = type === 'clear_institution' ? 'institution' : 'year';
          const batch = writeBatch(db);
          targetQuestions.forEach(q => batch.update(doc(db,"draft_questions",q.id), {[field]: ''}));
          await batch.commit(); showNotification('success', 'Limpo.'); return;
      }
      
      setIsBatchAction(true);
      const batch = writeBatch(db);
      try {
          if (type === 'approve_filtered') {
              let c = 0;
              targetQuestions.filter(q=>!q.isDuplicate).forEach(q => {
                  const { id, ...rest } = q;
                  if (q.area && q.topic && q.text) {
                      batch.set(doc(db,"questions",id), {...rest, createdAt: new Date().toISOString(), approvedBy: user.email});
                      batch.delete(doc(db,"draft_questions",id)); c++;
                  }
              });
              await batch.commit(); showNotification('success', `${c} publicadas!`);
          } else if (type === 'delete_filtered') {
              targetQuestions.forEach(q => batch.delete(doc(db,"draft_questions",q.id)));
              await batch.commit(); showNotification('success', 'Excluídas.');
          }
      } catch(e) { showNotification('error', e.message); } finally { setIsBatchAction(false); }
  };

  const approveQuestion = async (q) => {
    if (q.isDuplicate) return showNotification('error', 'Duplicata.');
    if (!q.area || !q.topic) return showNotification('error', 'Preencha campos.');
    try {
       const { id, ...rest } = q;
       await setDoc(doc(db, "questions", id), { ...rest, createdAt: new Date().toISOString(), approvedBy: user.email });
       await deleteDoc(doc(db, "draft_questions", id)); showNotification('success', 'Publicada!');
    } catch(e) { showNotification('error', e.message); }
  };

  const updateQuestionField = (idx, f, v) => { const n = [...parsedQuestions]; n[idx][f] = v; setParsedQuestions(n); };
  const updateOptionText = (qi, oi, v) => { const n = [...parsedQuestions]; n[qi].options[oi].text = v; setParsedQuestions(n); };

  const currentFilteredList = getFilteredQuestions();

  if (isLoadingAuth) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="text-white animate-spin" size={48} /></div>;
  if (!user) return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">MedImporter Admin</h1>
          <form onSubmit={(e) => { e.preventDefault(); signInWithEmailAndPassword(auth, email, password).catch(err => showNotification('error', err.message)); }} className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-xl"/>
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-xl"/>
            <button className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl">Entrar</button>
          </form>
        </div>
        <NotificationToast notification={notification} onClose={() => setNotification(null)} positionClass="fixed bottom-4 right-4" />
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => window.location.href = '/'} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><ArrowLeft size={24} /></button>
            <div className="flex items-center gap-2"><Brain className="text-blue-600" size={28} /><h1 className="text-xl font-bold text-slate-800">MedImporter</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border ${isWebSearchEnabled ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`} onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}>
                {isWebSearchEnabled ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>} <span className="text-sm font-bold flex gap-1"><Globe size={16}/> Busca Web</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border ${isDoubleCheckEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`} onClick={() => setIsDoubleCheckEnabled(!isDoubleCheckEnabled)}>
                {isDoubleCheckEnabled ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>} <span className="text-sm font-bold flex gap-1"><ShieldCheck size={16}/> Auditoria</span>
            </div>
            <button onClick={() => { setTempApiKeysText(apiKeys.join('\n')); setShowApiKeyModal(true); }} className="p-2 bg-gray-100 rounded-lg"><Settings size={18} /></button>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="bg-gray-100 border-none rounded-lg text-sm font-medium p-2">
                {availableModels.map(m => (<option key={m.name} value={m.name}>{m.displayName}</option>))}
            </select>
            <button onClick={() => signOut(auth)} className="p-2 text-gray-400 hover:text-red-500"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <NotificationToast notification={notification} onClose={() => setNotification(null)} positionClass="fixed top-24 right-4" />

      {showApiKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl">
                  <h2 className="text-xl font-bold mb-4">Configurar API Gemini</h2>
                  <textarea value={tempApiKeysText} onChange={e => setTempApiKeysText(e.target.value)} className="w-full p-3 border rounded-xl h-32 font-mono text-sm" placeholder="Uma chave por linha..."/>
                  <div className="flex justify-end gap-3 mt-4">
                      <button onClick={() => setShowApiKeyModal(false)} className="px-4 py-2 text-gray-500 font-bold">Cancelar</button>
                      <button onClick={saveApiKeyFromModal} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Salvar</button>
                  </div>
              </div>
          </div>
      )}

      {confirmationModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
                  <div className={`p-3 rounded-full mb-4 mx-auto w-fit ${confirmationModal.confirmColor === 'red' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}><AlertTriangle size={32} /></div>
                  <h2 className="text-xl font-bold mb-2">{confirmationModal.title}</h2>
                  <p className="text-gray-600 mb-6 text-sm">{confirmationModal.message}</p>
                  <div className="flex gap-3">
                      <button onClick={() => setConfirmationModal({ ...confirmationModal, isOpen: false })} className="flex-1 py-3 border rounded-xl font-bold">Cancelar</button>
                      <button onClick={executeConfirmationAction} className={`flex-1 py-3 rounded-xl font-bold text-white ${confirmationModal.confirmColor === 'red' ? 'bg-red-600' : 'bg-emerald-600'}`}>{confirmationModal.confirmText}</button>
                  </div>
              </div>
          </div>
      )}

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex justify-center mb-8 gap-2">
            {['input', 'batch_images', 'pdf', 'review'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-lg font-bold text-sm capitalize ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                    {tab === 'input' ? 'Texto' : tab === 'batch_images' ? 'Imagens' : tab === 'pdf' ? 'PDF Massivo' : `Fila (${parsedQuestions.length})`}
                </button>
            ))}
        </div>

        {(activeTab === 'input' || activeTab === 'pdf' || activeTab === 'batch_images') && (
            <div className="max-w-4xl mx-auto mb-6 bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3"><Filter size={16}/><span className="text-sm font-bold">Forçar Dados (Opcional)</span></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <input value={overrideInst} onChange={e=>setOverrideInst(e.target.value)} placeholder="Instituição Fixa" className="p-2 border rounded-lg text-sm"/>
                    <input type="number" value={overrideYear} onChange={e=>setOverrideYear(e.target.value)} placeholder="Ano Fixo" className="p-2 border rounded-lg text-sm"/>
                    <select value={overrideArea} onChange={e=>{setOverrideArea(e.target.value); setOverrideTopic('');}} className="p-2 border rounded-lg text-sm bg-white"><option value="">Área Automática</option>{areasBase.map(a=><option key={a} value={a}>{a}</option>)}</select>
                    <select value={overrideTopic} onChange={e=>setOverrideTopic(e.target.value)} disabled={!overrideArea} className="p-2 border rounded-lg text-sm bg-white disabled:bg-gray-50"><option value="">Tópico Automático</option>{(themesMap[overrideArea]||[]).map(t=><option key={t} value={t}>{t}</option>)}</select>
                </div>
            </div>
        )}

        {activeTab === 'input' && (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border p-6 shadow-sm">
                <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Cole o texto aqui..." className="w-full h-96 p-4 bg-gray-50 border rounded-xl font-mono text-sm mb-4"/>
                <div className="flex justify-end gap-3">
                    <button onClick={processWithAI} disabled={isProcessing} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2">{isProcessing ? <Loader2 className="animate-spin" /> : <Wand2 />} Processar</button>
                </div>
            </div>
        )}

        {activeTab === 'batch_images' && (
            <div className="max-w-5xl mx-auto bg-white rounded-2xl border p-6 shadow-sm">
                <div className="flex justify-between mb-6">
                    <h2 className="font-bold text-lg">Importador de Imagens</h2>
                    <div className="flex gap-2">
                        <button onClick={clearBatchQueue} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={20}/></button>
                        <button onClick={toggleBatchProcessing} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${batchStatus==='processing'?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>{batchStatus==='processing'?<Pause size={18}/>:<Play size={18}/>} {batchStatus==='processing'?'Pausar':'Iniciar'}</button>
                    </div>
                </div>
                <div onPaste={handleBatchPaste} className="border-2 border-dashed rounded-xl p-8 text-center bg-gray-50 relative mb-6">
                    <UploadCloud size={32} className="mx-auto text-gray-400 mb-2"/>
                    <p className="font-bold text-gray-600">Arraste ou Cole (Ctrl+V)</p>
                    <input type="file" multiple accept="image/*" onChange={handleBatchImageUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                </div>
                <div className="flex gap-6 h-[500px]">
                    <div className="flex-1 bg-gray-50 rounded-xl p-4 overflow-y-auto grid grid-cols-3 gap-3 content-start">
                        {batchImages.map(img => (
                            <div key={img.id} className={`relative aspect-square rounded-lg overflow-hidden border bg-white group ${img.status==='error'?'ring-2 ring-red-400':''}`}>
                                <img src={img.preview} className="w-full h-full object-cover"/>
                                <button onClick={()=>removeBatchImage(img.id)} className="absolute top-1 right-1 bg-white/80 p-1 rounded-full opacity-0 group-hover:opacity-100"><X size={14}/></button>
                                {img.status==='error'&&<div className="absolute inset-0 bg-red-500/50 flex items-center justify-center text-white text-xs font-bold p-1 text-center">{img.errorMsg}</div>}
                            </div>
                        ))}
                    </div>
                    <div className="w-1/3 bg-slate-900 rounded-xl p-4 font-mono text-xs text-gray-300 overflow-y-auto">
                        {batchLogs.map((l,i)=><div key={i} className={`mb-1 ${l.type==='error'?'text-red-400':l.type==='success'?'text-emerald-400':'text-blue-300'}`}>{l.message}</div>)}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'pdf' && (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border p-6 shadow-sm">
                <div className="flex justify-between mb-6">
                    <h2 className="font-bold text-lg">PDF Massivo</h2>
                    {pdfStatus !== 'idle' && (
                        <div className="flex gap-2">
                            <button onClick={handleResetPdf} className="p-2 text-red-500"><XCircle size={20}/></button>
                            <button onClick={handleRestartPdf} className="p-2 text-blue-500"><RotateCcw size={20}/></button>
                            <button onClick={togglePdfProcessing} className={`px-4 py-2 rounded-lg font-bold flex gap-2 ${pdfStatus==='processing'?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>{pdfStatus==='processing'?<Pause/>:<Play/>} {pdfStatus==='processing'?'Pausar':'Iniciar'}</button>
                        </div>
                    )}
                </div>
                {pdfStatus === 'idle' && (
                    <div className="space-y-4">
                        {lastSessionData && (
                            <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-4 text-sm text-blue-800">
                                <History size={24}/> <div><p className="font-bold">Sessão Anterior: {lastSessionData.fileName}</p><p>Parou em: {lastSessionData.lastChunkPages}</p></div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <input type="number" placeholder="Início Pg" value={pdfStartPage} onChange={e=>setPdfStartPage(e.target.value)} className="flex-1 p-2 border rounded-lg"/>
                            <input type="number" placeholder="Fim Pg" value={pdfEndPage} onChange={e=>setPdfEndPage(e.target.value)} className="flex-1 p-2 border rounded-lg"/>
                        </div>
                        <div className="border-2 border-dashed rounded-xl p-12 text-center relative hover:bg-gray-50 transition-colors">
                            <FileText size={48} className="mx-auto text-gray-400 mb-2"/>
                            <p className="font-bold text-gray-600">Arraste PDF</p>
                            <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                        </div>
                    </div>
                )}
                {pdfStatus !== 'idle' && (
                    <div className="space-y-6">
                        <div className="bg-gray-100 rounded-xl p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3"><Cpu size={24} className={pdfStatus==='processing'?'animate-pulse text-blue-600':''}/> <span className="font-bold uppercase">{pdfStatus}</span></div>
                            <div className="text-2xl font-bold">{parsedQuestions.filter(q=>q.sourceFile===pdfFile?.name).length} <span className="text-sm font-normal text-gray-500">questões</span></div>
                        </div>
                        <div className="grid grid-cols-10 gap-2 max-h-60 overflow-y-auto p-2 border rounded-xl">
                            {pdfChunks.map((c,i)=>(
                                <button key={c.id} onClick={()=>handleJumpToChunk(i)} className={`h-8 rounded text-xs font-bold ${c.status==='success'?'bg-emerald-500 text-white':c.status==='pending'?'bg-gray-100':c.status==='restored'?'bg-indigo-100 text-indigo-600':'bg-red-500 text-white'} ${i===currentChunkIndex?'ring-2 ring-blue-500':''}`}>{i+1}</button>
                            ))}
                        </div>
                        <div className="bg-slate-900 rounded-xl p-4 h-48 overflow-y-auto font-mono text-xs text-gray-300 flex flex-col-reverse">
                            {processingLogs.map((l,i)=><div key={i} className={l.type==='error'?'text-red-400':l.type==='success'?'text-emerald-400':'text-blue-300'}>{l.message}</div>)}
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'review' && (
            <div className="max-w-4xl mx-auto space-y-4">
                {parsedQuestions.length > 0 && (
                     <div className="bg-white rounded-xl border p-2 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm sticky top-20 z-10">
                        {/* --- NOVO FILTRO MÚLTIPLO --- */}
                        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 scrollbar-hide">
                            <button onClick={()=>toggleFilter('all')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${activeFilters.includes('all')?'bg-blue-100 text-blue-700 border-blue-200':'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}>Todas</button>
                            <button onClick={()=>toggleFilter('verified')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border flex items-center gap-1 transition-all ${activeFilters.includes('verified')?'bg-emerald-100 text-emerald-700 border-emerald-200':'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}><ShieldCheck size={14}/> Verificadas</button>
                            <button onClick={()=>toggleFilter('source')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border flex items-center gap-1 transition-all ${activeFilters.includes('source')?'bg-teal-100 text-teal-700 border-teal-200':'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}><Globe size={14}/> Com Fonte</button>
                            <button onClick={()=>toggleFilter('no_source')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border flex items-center gap-1 transition-all ${activeFilters.includes('no_source')?'bg-slate-100 text-slate-700 border-slate-300':'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}><AlertOctagon size={14}/> Sem Fonte</button>
                            <button onClick={()=>toggleFilter('suspicious')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border flex items-center gap-1 transition-all ${activeFilters.includes('suspicious')?'bg-red-100 text-red-700 border-red-200':'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}><AlertTriangle size={14}/> Suspeitas</button>
                            <button onClick={()=>toggleFilter('duplicates')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border flex items-center gap-1 transition-all ${activeFilters.includes('duplicates')?'bg-amber-100 text-amber-700 border-amber-200':'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}><Copy size={14}/> Duplicadas</button>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={handleDiscardFilteredClick} disabled={currentFilteredList.length===0} className="px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-bold flex items-center gap-2"><Trash2 size={14}/> Descartar {currentFilteredList.length}</button>
                            <button onClick={handleApproveFilteredClick} disabled={currentFilteredList.length===0} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"><CheckCircle size={14}/> Aprovar {currentFilteredList.length}</button>
                        </div>
                        <div className="flex gap-1 pr-2">
                             <button onClick={()=>clearAllField('institution')} className="p-2 text-gray-400 hover:text-red-500" title="Limpar Instituições"><Eraser size={16}/></button>
                             <button onClick={()=>clearAllField('year')} className="p-2 text-gray-400 hover:text-red-500" title="Limpar Anos"><Eraser size={16}/></button>
                        </div>
                     </div>
                )}

                {currentFilteredList.length === 0 ? (
                    <div className="text-center py-20 opacity-50"><Database size={64} className="mx-auto mb-4 text-gray-300"/><p className="text-xl text-gray-500">Nenhuma questão encontrada.</p></div>
                ) : (
                    currentFilteredList.map((q, idx) => (
                        <div key={q.id} className={`bg-white rounded-2xl shadow-sm border p-6 relative ${q.isDuplicate ? 'border-amber-300 ring-2 ring-amber-50' : ''}`}>
                            <div className="absolute top-0 right-0 flex flex-col items-end">
                                {q.verificationStatus==='verified' && <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-bl-lg text-xs font-bold flex gap-1"><ShieldCheck size={14}/> Verificada</div>}
                                {q.verificationStatus==='suspicious' && <div className="bg-red-100 text-red-700 px-3 py-1 rounded-bl-lg text-xs font-bold flex gap-1"><ShieldAlert size={14}/> Suspeita: {q.verificationReason}</div>}
                                {q.sourceFound && <div className="bg-teal-100 text-teal-700 px-3 py-1 rounded-bl-lg text-xs font-bold flex gap-1"><Globe size={14}/> Fonte Web</div>}
                                {q.isDuplicate && <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-bl-lg text-xs font-bold flex gap-1"><Copy size={14}/> Duplicada</div>}
                            </div>

                            <div className="grid grid-cols-4 gap-4 mb-4 mt-4">
                                <div><label className="text-xs font-bold text-gray-500">Inst</label><input value={q.institution} onChange={e=>updateQuestionField(idx,'institution',e.target.value)} className="w-full p-2 border rounded-lg text-sm font-bold"/></div>
                                <div><label className="text-xs font-bold text-gray-500">Ano</label><input value={q.year} onChange={e=>updateQuestionField(idx,'year',e.target.value)} className="w-full p-2 border rounded-lg text-sm font-bold"/></div>
                                <div><label className="text-xs font-bold text-gray-500">Área</label><select value={q.area} onChange={e=>updateQuestionField(idx,'area',e.target.value)} className="w-full p-2 border rounded-lg text-sm font-bold text-blue-700 bg-blue-50"><option value="">...</option>{areasBase.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
                                <div><label className="text-xs font-bold text-gray-500">Tópico</label><select value={q.topic} onChange={e=>updateQuestionField(idx,'topic',e.target.value)} className="w-full p-2 border rounded-lg text-sm font-bold"><option value="">...</option>{(themesMap[q.area]||[]).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                            </div>

                            <textarea value={q.text} onChange={e=>updateQuestionField(idx,'text',e.target.value)} rows={3} className="w-full p-3 border rounded-xl text-sm mb-4 bg-gray-50 focus:bg-white transition-colors"/>

                            <div className="space-y-2 mb-4">
                                {q.options?.map((opt, oi) => (
                                    <div key={opt.id} className="flex gap-2 items-center">
                                        <div onClick={()=>updateQuestionField(idx,'correctOptionId',opt.id)} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer ${q.correctOptionId===opt.id?'bg-emerald-500 text-white':'bg-gray-100 text-gray-400'}`}>{opt.id.toUpperCase()}</div>
                                        <input value={opt.text} onChange={e=>updateOptionText(idx,oi,e.target.value)} className={`w-full p-2 border rounded-lg text-sm ${q.correctOptionId===opt.id?'bg-emerald-50 border-emerald-200':''}`}/>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 mb-4">
                                <label className="text-xs font-bold text-amber-700 flex gap-1 mb-1"><Brain size={12}/> Explicação</label>
                                <textarea value={q.explanation} onChange={e=>updateQuestionField(idx,'explanation',e.target.value)} rows={2} className="w-full p-2 bg-white/50 border border-amber-200 rounded-lg text-sm"/>
                            </div>

                            <div className="flex justify-between pt-4 border-t">
                                <button onClick={()=>handleDiscardOneClick(q)} className="text-red-500 text-xs font-bold flex gap-1 items-center hover:bg-red-50 px-3 py-2 rounded-lg"><Trash2 size={14}/> Descartar</button>
                                {!q.isDuplicate && <button onClick={()=>approveQuestion(q)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-emerald-700 flex gap-2 items-center"><CheckCircle size={14}/> Publicar</button>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}
      </main>
    </div>
  );
}
