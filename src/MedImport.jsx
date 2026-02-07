import React, { useState, useEffect, useRef } from 'react';
import { 
  Map, Save, Trash2, Settings, CheckCircle, 
  AlertCircle, FileText, Database, 
  Loader2, Wand2, Cpu, RefreshCw, User, X,
  LogOut, Send, Brain, Image as ImageIcon, UploadCloud, Lock, CloudLightning, ArrowLeft,
  AlertTriangle, ExternalLink, Key, Play, Pause, AlertOctagon, Terminal, ShieldCheck, ShieldAlert, 
  ToggleLeft, ToggleRight, Layers, Filter, Eraser, RefreshCcw, XCircle, RotateCcw, Copy,
  SkipForward, BookOpen, Clock, Files, Info, History, FastForward, Globe, ListFilter,
  FileType, BarChart3
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";

// 1. Banco de Dados (Firestore)
import { 
  getFirestore, collection, addDoc, doc, getDoc, deleteDoc, onSnapshot, query, orderBy, setDoc, writeBatch, updateDoc, arrayUnion, arrayRemove, increment 
} from "firebase/firestore";

// 2. Autenticação (Auth)
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "firebase/auth";

// 3. Arquivos (Storage)
import { 
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject 
} from "firebase/storage";

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
const storage = getStorage(app);

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

// --- HELPER: OTIMIZADOR DE IMAGEM (WEB CLIENT-SIDE) ---
const optimizeImageForWeb = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1920; // Padrão HD
                
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                            type: "image/webp",
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        reject(new Error("Falha na conversão para WebP"));
                    }
                }, 'image/webp', 0.90);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
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

// --- HELPER: CLEAN INSTITUTION (ATUALIZADO - ANTI-CURSINHO) ---
const cleanInstitutionText = (inst) => {
    if (!inst) return "";
    let text = inst.toString().trim();
    const lower = text.toLowerCase();

    // 1. Lista Negra de Cursinhos (Meta-dados que não são bancas)
    const blockList = [
        "medcurso", "medgrupo", "medcel", "medcof", 
        "sanar", "estrategia", "hardwork", "sic", "residencia médica", "medicina livre"
    ];

    // Se o texto for EXATAMENTE um desses, limpa.
    if (blockList.includes(lower)) return "";
    
    // Se começar com termos de material de estudo
    if (lower.startsWith("apostila") || lower.startsWith("simulado") || lower.includes("banco de questões")) return "";

    // 2. Termos genéricos de erro da IA
    if (
        lower.includes("não informado") || 
        lower.includes("nao informado") || 
        lower.includes("detectar") ||
        lower.includes("nao consta")
    ) return "";

    return text;
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
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(true); 

  // --- NOVA BLINDAGEM: COTA GLOBAL ---
  const [searchQuota, setSearchQuota] = useState({ count: 0, lastReset: '' });
  const [isSearchLimitEnabled, setIsSearchLimitEnabled] = useState(true); // O "Safe Mode"
  const DAILY_SEARCH_LIMIT = 1400; // Margem de segurança (Max 1500)

  // Estado para loading de imagem individual
  const [uploadingImageId, setUploadingImageId] = useState(null);
  
  // --- Estado para Filtros Múltiplos (ATUALIZADO: text_only por padrão) ---
  const [activeFilters, setActiveFilters] = useState(['verified', 'source', 'text_only']); 
  const [filterLogic, setFilterLogic] = useState('AND'); 
  
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

  // --- SESSION STATE ---
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
  const searchQuotaRef = useRef(searchQuota);
  const isSearchLimitEnabledRef = useRef(isSearchLimitEnabled);

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
  useEffect(() => { searchQuotaRef.current = searchQuota; }, [searchQuota]);
  useEffect(() => { isSearchLimitEnabledRef.current = isSearchLimitEnabled; }, [isSearchLimitEnabled]);

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
              // Sync Search Limit Toggle Global
              if (data.isSearchLimitEnabled !== undefined) {
                  setIsSearchLimitEnabled(data.isSearchLimitEnabled);
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

  // --- SYNC PROGRESSO DO PDF ---
  useEffect(() => {
      if (!user) {
          setLastSessionData(null);
          return;
      }
      const unsubscribe = onSnapshot(doc(db, "users", user.uid, "progress", "pdf_session"), (docSnap) => {
          if (docSnap.exists()) {
              setLastSessionData(docSnap.data());
          } else {
              setLastSessionData(null);
          }
      });
      return () => unsubscribe();
  }, [user]);

  // --- SYNC COTA DE PESQUISA (NOVO) ---
  useEffect(() => {
      if (!user) return;
      
      const unsubscribe = onSnapshot(doc(db, "settings", "search_quota"), (docSnap) => {
          const today = new Date().toISOString().split('T')[0];

          if (!docSnap.exists()) {
              // Cria se não existe
              setDoc(doc(db, "settings", "search_quota"), { count: 0, lastReset: today });
          } else {
              const data = docSnap.data();
              
              // Reset Diário Automático (First-win logic)
              if (data.lastReset !== today) {
                  setDoc(doc(db, "settings", "search_quota"), { count: 0, lastReset: today }, { merge: true })
                      .then(() => console.log("Cota diária resetada!"));
                  setSearchQuota({ count: 0, lastReset: today });
              } else {
                  setSearchQuota(data);
              }
          }
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
              const isQuotaError = msg.includes("Quota exceeded") || msg.includes("429") || msg.includes("Resource has been exhausted");
              
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
      throw lastError || new Error("Todas as chaves falharam. Aguardando recarga...");
  };

  // --- HELPER: SLEEP ---
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // --- HELPER: EXECUTOR BLINDADO (RETRY INFINITO COM PAUSA) ---
  const executeBlindlyWithRetry = async (operationName, taskFn, setStatusLog, shouldStopFn) => {
      let attempts = 0;
      
      while (true) {
          // 1. CHECAGEM PRÉVIA: Se o usuário pediu pausa, aborta ANTES de tentar
          if (shouldStopFn && shouldStopFn()) {
               throw new Error("ABORT_RETRY"); 
          }

          try {
              return await executeWithKeyRotation(operationName, taskFn);
          } catch (error) {
              // 2. CHECAGEM PÓS-ERRO: Se o usuário pediu pausa durante o erro, aborta
              if (shouldStopFn && shouldStopFn()) {
                   throw new Error("ABORT_RETRY");
              }

              // Se for erro de COTA GLOBAL, repassa o erro para parar o fluxo
              if (error.message.includes("Cota de Pesquisa Diária Atingida")) {
                  throw error;
              }

              attempts++;
              const msg = error.message || "Erro desconhecido";
              // O limite máximo de espera será de 2 minutos (120000 ms)
              const waitTime = Math.min(2000 * Math.pow(2, attempts), 120000); 
              
              console.warn(`[${operationName}] Tentativa ${attempts} falhou. Retentando em ${waitTime/1000}s... Erro: ${msg}`);
              
              if (setStatusLog) {
                  setStatusLog('warning', `[${operationName}] Falha ${attempts}. Aguardando ${Math.ceil(waitTime/1000)}s... (Pause para cancelar)`);
              }

              await sleep(waitTime);
          }
      }
  };

  // --- INCREMENTO ATÔMICO DE COTA ---
  const incrementSearchCount = async () => {
      try {
          const ref = doc(db, "settings", "search_quota");
          await updateDoc(ref, { count: increment(1) });
      } catch (e) {
          console.warn("Falha ao incrementar cota:", e);
      }
  };

  // --- FUNÇÃO DE PESQUISA BLINDADA (COM CONTROLE DE COTA) ---
  const searchQuestionSource = async (questionText, checkStop) => {
      // 1. VERIFICAÇÃO DE COTA ANTES DE GASTAR
      if (isSearchLimitEnabledRef.current) {
          const quota = searchQuotaRef.current;
          if (quota.count >= DAILY_SEARCH_LIMIT) {
              throw new Error(`Cota de Pesquisa Diária Atingida (${quota.count}/${DAILY_SEARCH_LIMIT}). Pause ou desative o Limite.`);
          }
      }

      const searchPromptText = questionText.length > 400 
        ? questionText.substring(0, 400) + "..." 
        : questionText;

      const modelNameClean = selectedModel.startsWith('models/') ? selectedModel.replace('models/', '') : selectedModel;

      const result = await executeBlindlyWithRetry("Pesquisa Web", async (key) => {
          const systemPrompt = `Você é um verificador de questões de residência médica.
              Sua missão: Identificar a origem da questão usando a Pesquisa Google.
              CRITÉRIOS DE ESCOLHA:
              - Se a questão apareceu em múltiplas provas, escolha a ORIGINAL ou a MAIS RECENTE.
              REGRAS DE FORMATAÇÃO DE NOME:
              - Resuma nomes longos para o formato: "UF - Nome Curto / Sigla".
              - Exemplo Ruim: "Secretaria da Saúde do Estado da Bahia (SESAB) - Processo Unificado"
              - Exemplo Bom: "BA - SUS Bahia"
              - Exemplo Bom: "SP - USP São Paulo"
              - Exemplo Bom: "Nacional - ENARE"
              {
                "institution": "Nome da Instituição Resumido (ou vazio se não achar)",
                "year": "Ano (apenas números, ou vazio se não achar)"
              }`;

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelNameClean}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `IDENTIFICAR ORIGEM:\n${searchPromptText}` }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                tools: [{ google_search: {} }] 
              })
            }
          );

          if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              throw new Error(errData.error?.message || "Erro HTTP na API Search");
          }
          
          const data = await response.json();
          let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
          
          try { 
              return JSON.parse(jsonString); 
          } catch(e) { 
              console.warn("JSON inválido na busca, assumindo não encontrado.");
              return { institution: "", year: "" }; 
          }
      }, addLog, checkStop);

      // 2. INCREMENTO ATÔMICO APÓS SUCESSO
      await incrementSearchCount();

      return result;
  };

  // --- LOGIC: VERIFICATION AGENT BLINDADO ---
  const verifyQuestionWithAI = async (questionData, checkStop) => {
      //Fixado no PRO por que ele valida melhor (Tirar o // e colocar no de baixo se quiser habilitar o PRO fixo pra auditoria:
      //const modelNameClean = "gemini-2.5-pro";
      const modelNameClean = selectedModel.startsWith('models/') ? selectedModel.replace('models/', '') : selectedModel;
      
      return executeBlindlyWithRetry("Auditoria", async (key) => {
          const verifyPrompt = `
    Você é um Auditor Sênior de Questões Médicas.
    Sua missão é validar se esta questão é SEGURA e COERENTE para um banco de dados de estudo.
    ATENÇÃO: Você NÃO tem acesso à internet. Use exclusivamente seu conhecimento médico treinado.

    DADOS DA QUESTÃO:
    Banca: ${questionData.institution || "Não informada"}
    Ano: ${questionData.year || "Não informado"}
    Enunciado: "${questionData.text}"
    Alternativas: ${JSON.stringify(questionData.options)}
    Gabarito Proposto: ${questionData.correctOptionId}
    Explicação Gerada: "${questionData.explanation}"

    PASSO A PASSO DA AUDITORIA:
    1. Analise se o gabarito faz sentido clinicamente.
    2. Verifique se a "Explicação Gerada" realmente justifica o gabarito.
    3. Aplique as REGRAS DE JULGAMENTO abaixo.

    REGRAS DE JULGAMENTO (HIERARQUIA DE DECISÃO):

    [NÍVEL 1: FATOS OBJETIVOS E ABSURDOS - TOLERÂNCIA ZERO]
    - Se a questão contém ERROS GRAVES de números (Doses letais, Anatomia impossível).
    - Se o gabarito é ABSURDAMENTE errado (ex: tratar parada cardíaca com dipirona).
    - Se a Explicação contradiz o próprio Gabarito.
    -> AÇÃO: REPROVE ("isValid": false).

    [NÍVEL 2: ANACRONISMO (IMPORTANTE)]
    - Se a questão parece "errada" hoje, mas estava CERTA no Ano da questão (mudança de diretriz/protocolo).
    -> AÇÃO: APROVE com ressalva no motivo ("isValid": true, "reason": "Correto para a época").

    [NÍVEL 3: ZONA CINZENTA E CONDUTAS]
    - Se houver divergência na literatura médica.
    - Se o gabarito for defendido por PELO MENOS UMA corrente bibliográfica (Harrison, Cecil, MS, UpToDate).
    -> AÇÃO: APROVE ("isValid": true).

    [NÍVEL 4: "NA DÚVIDA"]
    - Se não for um erro médico grosseiro.
    -> AÇÃO: APROVE ("isValid": true).

    SAÍDA OBRIGATÓRIA (JSON):
    {
        "isValid": boolean, 
        "reason": "Explicação breve e direta (máx 15 palavras)"
    }
`;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelNameClean}:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: verifyPrompt }] }], 
            })
          });
          
          if (!response.ok) {
               const errData = await response.json().catch(() => ({}));
               throw new Error(errData.error?.message || "Erro na API Audit");
          }

          const data = await response.json();
          let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
          const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
          if (jsonMatch) jsonString = jsonMatch[0];
          return safeJsonParse(jsonString);
          
      }, addLog, checkStop).then(result => {
          return {
              status: result.isValid ? 'verified' : 'suspicious',
              reason: result.reason || (result.isValid ? "Validado (Web/Lógica)" : "Erro Fatual ou Divergência Grave")
          };
      });
  };

  // --- COMMON: LOGS ---
  const addLog = (type, message) => {
      const time = new Date().toLocaleTimeString();
      setProcessingLogs(prev => [{ type, message, time }, ...prev].slice(0, 50)); 
  };
  
  const addBatchLog = (type, message) => {
      const time = new Date().toLocaleTimeString();
      setBatchLogs(prev => [{ type, message, time }, ...prev].slice(0, 50));
  };

  // --- FILTROS COM LÓGICA 'OR' (SOMA) ---
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
      if (!activeFilters.includes('duplicates') && q.isDuplicate) return false;

      const results = activeFilters.map(filterKey => {
          if (filterKey === 'verified') return q.verificationStatus === 'verified';
          if (filterKey === 'suspicious') return q.verificationStatus === 'suspicious';
          if (filterKey === 'source') return !!q.sourceFound;
          if (filterKey === 'no_source') return !q.sourceFound;
          if (filterKey === 'duplicates') return !!q.isDuplicate;
          if (filterKey === 'needs_image') return !!q.needsImage; 
          if (filterKey === 'text_only') return !q.needsImage; 
          return true;
      });

      if (filterLogic === 'AND') {
          return results.every(r => r === true);
      } else {
          return results.some(r => r === true);
      }
    });
  };

  // --- FILTER CONFIG (ATUALIZADA) ---
  const filterLabels = {
      'all': 'Todas',
      'verified': 'Verificadas',
      'source': 'Com Fonte',
      'no_source': 'Sem Fonte', 
      'suspicious': 'Suspeitas',
      'duplicates': 'Duplicadas',
      'needs_image': 'Requer Imagem',
      'text_only': 'Texto Puro (Sem Imagem)' 
  };

  // --- UPLOAD MULTI-IMAGEM ---
  const handleImageUploadToQuestion = async (e, idx, questionData) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploadingImageId(questionData.id);

      try {
          const optimizedFile = await optimizeImageForWeb(file);
          const timestamp = Date.now();
          const fileName = `${questionData.id}_${timestamp}.webp`;
          const storageRef = ref(storage, `questions_images/${fileName}`);
          
          const snapshot = await uploadBytes(storageRef, optimizedFile);
          const downloadURL = await getDownloadURL(snapshot.ref);

          await updateDoc(doc(db, "draft_questions", questionData.id), {
              images: arrayUnion(downloadURL), 
              hasImage: true
          });

          const newQ = [...parsedQuestions];
          if (newQ[idx]) {
              const currentImages = newQ[idx].images || [];
              newQ[idx].images = [...currentImages, downloadURL];
              newQ[idx].hasImage = true;
              setParsedQuestions(newQ);
          }
          
          showNotification('success', 'Imagem adicionada à galeria!');

      } catch (error) {
          console.error(error);
          showNotification('error', 'Erro ao enviar: ' + error.message);
      } finally {
          setUploadingImageId(null);
      }
  };
  
  const deleteImageFromQuestion = async (idx, questionData, urlToDelete) => {
      if (!window.confirm("Remover esta imagem específica?")) return;

      try {
          try {
              const fileRef = ref(storage, urlToDelete);
              await deleteObject(fileRef);
          } catch (e) { console.warn("Erro storage:", e); }

          await updateDoc(doc(db, "draft_questions", questionData.id), {
              images: arrayRemove(urlToDelete)
          });

          const newQ = [...parsedQuestions];
          if (newQ[idx]) {
              newQ[idx].images = newQ[idx].images.filter(url => url !== urlToDelete);
              if (newQ[idx].images.length === 0) newQ[idx].hasImage = false;
              setParsedQuestions(newQ);
          }
          showNotification('success', 'Imagem removida.');
      } catch (error) {
          showNotification('error', 'Erro ao remover imagem.');
      }
  };

  // --- LOGIC: BATCH IMAGE PROCESSING ---
  const handleBatchImageUpload = (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      const newImages = files.map(file => ({
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          preview: URL.createObjectURL(file),
          status: 'pending',
          errorMsg: ''
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
                  file: blob,
                  name: `Colada_${new Date().getTime()}_${i}.png`,
                  preview: URL.createObjectURL(blob),
                  status: 'pending',
                  errorMsg: ''
              });
          }
      }
      if (newImages.length > 0) {
          setBatchImages(prev => [...prev, ...newImages]);
          addBatchLog('info', `${newImages.length} imagens coladas (Ctrl+V) na fila.`);
      }
  };

  const removeBatchImage = (id) => {
      setBatchImages(prev => prev.filter(img => img.id !== id));
  };

  const clearBatchQueue = () => {
      if (batchStatus === 'processing' || batchStatus === 'pausing') return;
      setBatchImages([]);
      addBatchLog('info', 'Fila de imagens limpa.');
      setBatchLogs([]);
  };

  const toggleBatchProcessing = () => {
      const currentStatus = batchStatusRef.current;
      
      if (currentStatus === 'processing') {
          setBatchStatus('pausing');
          addBatchLog('warning', 'Solicitando pausa... Aguardando a imagem atual finalizar.');
      } else if (currentStatus === 'paused' || currentStatus === 'idle') {
          setBatchStatus('processing');
          addBatchLog('info', 'Iniciando processamento de imagens...');
          batchProcessorRef.current = false;
          setTimeout(() => processNextBatchImage(), 100);
      }
  };

  const fileToBase64 = (file) => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = error => reject(error);
      });
  };

  const processNextBatchImage = async () => {
      if (batchProcessorRef.current) return;

      const currentStatus = batchStatusRef.current;
      if (currentStatus === 'pausing') {
          setBatchStatus('paused');
          addBatchLog('warning', 'Processamento pausado com segurança.');
          return;
      }
      if (currentStatus !== 'processing') return;

      const queue = batchImagesRef.current;
      const nextImg = queue.find(img => img.status === 'pending');

      if (!nextImg) {
          setBatchStatus('idle');
          addBatchLog('success', 'Fila de imagens finalizada!');
          showNotification('success', 'Todas as imagens foram processadas.');
          return;
      }

      batchProcessorRef.current = true;
      const ovr = overridesRef.current;
      addBatchLog('info', `Processando imagem: ${nextImg.name}...`);

      try {
          const base64Data = await fileToBase64(nextImg.file);
          const activeThemesMap = ovr.overrideArea ? { [ovr.overrideArea]: themesMap[ovr.overrideArea] } : themesMap;

          // Define callback de parada para o Batch
          const shouldStopBatch = () => batchStatusRef.current === 'pausing';

          const questions = await executeBlindlyWithRetry("Imagem Batch", async (key) => {
              const systemPrompt = `
              Você é um especialista em banco de dados médicos (MedMaps).
              Analise o conteúdo e gere um JSON ESTRITO.
              
              CONTEXTO (Informacional):
              - Instituição: ${ovr.overrideInst ? ovr.overrideInst : "Não informado (Detectar do texto)"}
              - Ano: ${ovr.overrideYear ? ovr.overrideYear : "Não informado (Detectar do texto)"}

              REGRAS DE EXTRAÇÃO E LIMPEZA:
              1. LIMPEZA DE INÍCIO:
                 - Remova APENAS índices/rótulos de questão (ex: "1)", "159048)", "05.", "Questão 1:", "Enunciado:").
                 - MANTENHA números que fazem parte da frase (ex: "3 pacientes...", "40 anos...").
                 - Comece o texto direto no conteúdo do caso clínico.

              2. SEPARAÇÃO DAS ALTERNATIVAS:
                 - O campo "text" DEVE TERMINAR antes das alternativas.
                 - NUNCA inclua "A) ... B) ..." ou "a. ... b. ..." dentro do campo "text".
                 - As alternativas DEVEM ser extraídas separadamente no array "options".

              3. DETECÇÃO DE IMAGEM (LÓGICA CONTEXTUAL):
                 - MARQUE "needsImage": true SE:
                   * O texto MANDA olhar: "Vide figura", "Observe a imagem", "A figura abaixo", "Ver anexo".
                   * O texto DEPENDE do visual: "De acordo com o exame de imagem", "Baseado no ECG apresentado".
                   * O texto é vago sobre o resultado: "O Raio-X revela... (e não diz o que)".
                 - MARQUE "needsImage": false SE:
                   * O texto já DESCREVE o resultado: "ECG normal", "Raio-X evidenciando fratura".
                   * Apenas cita que o exame foi feito: "Foi solicitada tomografia".

              4. CLASSIFICAÇÃO E RESOLUÇÃO:
                 - Classifique usando a lista: ${JSON.stringify(activeThemesMap)}
                 - Tente encontrar o gabarito. Se não houver, RESOLVA a questão.
                 - Gere sempre "explanation".

              Formato Saída JSON:
              [
                {
                  "institution": "String", "year": Number|String, "area": "String", "topic": "String",
                  "text": "String", "options": [{"id": "a", "text": "String"}],
                  "correctOptionId": "char", "explanation": "String",
                  "needsImage": boolean
                }
              ]
            `;

              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.replace('models/', '')}:generateContent?key=${key}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      contents: [{
                          parts: [
                              { text: systemPrompt },
                              { inline_data: { mime_type: nextImg.file.type, data: base64Data } }
                          ]
                      }]
                  })
              });

              if (!response.ok) {
                   const errData = await response.json().catch(() => ({}));
                   throw new Error(errData.error?.message || "Erro na API Gemini");
              }

              const data = await response.json();
              let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              const parsed = safeJsonParse(jsonString);
              return parsed.filter(q => q.options && q.options.length >= 2);
          }, addBatchLog, shouldStopBatch);

          // Pós-Processamento Inteligente
          let processedQuestions = await Promise.all(questions.map(async (q) => {
              const hashId = await generateQuestionHash(q.text);
              let isDuplicate = false;
              let oldData = null;

              if (hashId) {
                  const existingDoc = await getDoc(doc(db, "questions", hashId));
                  if (existingDoc.exists()) {
                      isDuplicate = true;
                      oldData = existingDoc.data();
                  }
              }

              const shouldRunAPIs = !isDuplicate; 

              // --- FIX: PRÉ-LIMPEZA DE INSTITUIÇÃO ---
              let preCleanedInst = cleanInstitutionText(q.institution);
              
              let finalInst = preCleanedInst;
              let finalYear = q.year;
              let sourceFound = false;
              let verificationStatus = 'unchecked';
              let verificationReason = '';

              if (shouldRunAPIs) {
                  const doWebSearch = webSearchRef.current; 
                  const doDoubleCheck = doubleCheckRef.current; 

                  const searchPromise = (async () => {
                      if (doWebSearch && (!preCleanedInst || !q.year)) { 
                         return await searchQuestionSource(q.text, shouldStopBatch);
                      }
                      return null;
                  })();

                  const auditPromise = (async () => {
                      if (doDoubleCheck) {
                          return await verifyQuestionWithAI(q, shouldStopBatch);
                      }
                      return { status: 'unchecked', reason: '' };
                  })();

                  const [searchResult, auditResult] = await Promise.all([searchPromise, auditPromise]);

                  if (searchResult) {
                      if (searchResult.institution) { finalInst = searchResult.institution; sourceFound = true; }
                      if (searchResult.year) finalYear = searchResult.year;
                  }
                  verificationStatus = auditResult.status;
                  verificationReason = auditResult.reason;

              } else {
                  if (oldData) {
                      finalInst = oldData.institution || q.institution;
                      finalYear = oldData.year || q.year;
                      sourceFound = oldData.sourceFound || false; 
                      verificationStatus = oldData.verificationStatus || 'unchecked';
                      verificationReason = oldData.verificationReason || 'Duplicata recuperada';
                  }
              }

              finalInst = cleanInstitutionText(finalInst);

              const ovr = overridesRef.current || { overrideInst, overrideYear, overrideArea, overrideTopic };
              if (ovr.overrideInst) finalInst = ovr.overrideInst;
              if (ovr.overrideYear) finalYear = ovr.overrideYear;

              return {
                  ...q,
                  institution: finalInst,
                  year: finalYear,
                  area: ovr.overrideArea || q.area,
                  topic: ovr.overrideTopic || q.topic,
                  sourceFound,
                  verificationStatus,
                  verificationReason,
                  hashId,
                  isDuplicate
              };
          }));
        
          const batch = writeBatch(db);
          let savedCount = 0;
          
          for (const q of processedQuestions) {
              const docId = q.hashId || doc(collection(db, "draft_questions")).id;
              const docRef = doc(db, "draft_questions", docId);
              batch.set(docRef, {
                  ...q,
                  institution: q.institution || "", 
                  year: q.year || "",
                  createdAt: new Date().toISOString(),
                  createdBy: user.email,
                  sourceFile: nextImg.name,
                  hasImage: true 
              });
              savedCount++;
          }
          await batch.commit();
          
          addBatchLog('success', `Sucesso em ${nextImg.name}: ${savedCount} questões salvas.`);
          setBatchImages(prev => prev.filter(img => img.id !== nextImg.id));

          setTimeout(() => {
              batchProcessorRef.current = false;
              processNextBatchImage();
          }, 1000);

      } catch (error) {
          console.error(error);
          
          if (error.message === 'ABORT_RETRY') {
              addBatchLog('warning', `Processamento interrompido manualmente pelo usuário.`);
              setBatchStatus('paused');
              batchProcessorRef.current = false;
              showNotification('info', 'Pausado! Agora você pode remover a imagem se desejar.');
              return;
          }
          
          if (error.message.includes("Cota de Pesquisa")) {
              addBatchLog('error', error.message);
              setBatchStatus('paused');
              batchProcessorRef.current = false;
              showNotification('error', error.message);
              return;
          }

          const errorMessage = error.message || "Erro desconhecido";
          addBatchLog('error', `Falha em ${nextImg.name}: ${errorMessage}`);
          setBatchImages(prev => prev.map(img => img.id === nextImg.id ? { ...img, status: 'error', errorMsg: errorMessage } : img));
          
          setTimeout(() => {
              batchProcessorRef.current = false;
              processNextBatchImage();
          }, 1000);
      }
  };

  // --- LOGIC: PDF HANDLING ---
  const handlePdfUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.type !== 'application/pdf') return showNotification('error', 'Por favor, envie um arquivo PDF.');
      
      setPdfFile(file);
      setPdfStatus('reading');
      setProcessingLogs([]);
      addLog('info', `Iniciando leitura de: ${file.name}`);

      try {
          const pdfjs = await loadPdfJs();
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          
          addLog('info', `PDF carregado. Total: ${pdf.numPages} págs.`);
          
          let startP = parseInt(pdfStartPage) || 1;
          let endP = parseInt(pdfEndPage) || pdf.numPages;

          if (startP < 1) startP = 1;
          if (endP > pdf.numPages) endP = pdf.numPages;
          if (startP > endP) {
               startP = 1; 
               endP = pdf.numPages;
               showNotification('warning', 'Intervalo inválido. Usando PDF completo.');
          } else {
               if (startP !== 1 || endP !== pdf.numPages) {
                   addLog('info', `Recortando páginas: ${startP} até ${endP}`);
               }
          }

          let chunks = [];
          let currentChunkText = "";
          let chunkStartPage = startP;
          let lastPageContent = "";

          for (let i = startP; i <= endP; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const text = content.items.map(item => item.str).join(' ');
              
              lastPageContent = text; 

              const pageTextFormatted = `\n--- PÁGINA ${i} ---\n${text}`;
              currentChunkText += pageTextFormatted;

              if ((i - startP + 1) % CHUNK_SIZE === 0 || i === endP) {
                  
                  let finalChunkText = currentChunkText;

                  if (i < endP) {
                      try {
                          const nextPage = await pdf.getPage(i + 1);
                          const nextContent = await nextPage.getTextContent();
                          const nextText = nextContent.items.map(item => item.str).join(' ');
                          finalChunkText += `\n\n--- CONTEXTO DA PRÓXIMA PÁGINA (${i+1}) ---\n${nextText}`;
                      } catch (err) {
                          console.warn("Não foi possível buscar o contexto da próxima página:", err);
                      }
                  }

                  chunks.push({
                      id: `chunk_${chunkStartPage}_${i}`,
                      pages: `${chunkStartPage} a ${i}`,
                      text: finalChunkText,
                      status: 'pending',
                      errorCount: 0
                  });
                  
                  if (i < endP) {
                      currentChunkText = `\n--- CONTEXTO DA PÁGINA ANTERIOR (${i}) ---\n${lastPageContent}`;
                  } else {
                      currentChunkText = "";
                  }
                  
                  chunkStartPage = i + 1;
              }
          }

          setPdfChunks(chunks);
          setPdfStatus('ready');
          addLog('success', `Pronto! ${chunks.length} partes geradas (${startP}-${endP}).`);

          if (lastSessionData && lastSessionData.fileName === file.name) {
              const lastIdx = lastSessionData.lastChunkIndex;
              const nextIndex = lastIdx + 1;

              if (nextIndex < chunks.length) {
                  setCurrentChunkIndex(nextIndex);
                  
                  for(let i = 0; i < nextIndex; i++) {
                      chunks[i].status = 'restored';
                  }

                  addLog('info', `Sessão encontrada no DB! Agulha movida para a fatia ${chunks[nextIndex].pages}.`);
                  showNotification('info', `Retomando ${file.name} a partir da fatia ${chunks[nextIndex].pages}.`);
              } else {
                  setCurrentChunkIndex(chunks.length - 1);
                  chunks.forEach(c => c.status = 'restored');
                  
                  addLog('success', `Este arquivo já foi finalizado na última sessão.`);
                  showNotification('success', 'Arquivo já finalizado anteriormente.');
              }
          } else {
              const newSession = {
                  fileName: file.name,
                  lastChunkIndex: -1, 
                  lastChunkPages: 'Início',
                  timestamp: new Date().toISOString()
              };
              
              if (user) {
                  try {
                      await setDoc(doc(db, "users", user.uid, "progress", "pdf_session"), newSession);
                      addLog('info', 'Novo arquivo detectado. Progresso resetado no banco.');
                  } catch (e) {
                      console.error("Erro ao salvar inicio de sessão:", e);
                  }
              }
          }

      } catch (error) {
          console.error(error);
          setPdfStatus('error');
          addLog('error', `Erro crítico ao ler PDF: ${error.message}`);
          showNotification('error', 'Erro ao ler PDF.');
      }
  };

  const handleResetPdf = () => {
      if (pdfStatus === 'processing' || pdfStatus === 'pausing') return; 
      setPdfFile(null);
      setPdfChunks([]);
      setPdfStatus('idle');
      setCurrentChunkIndex(0);
      setProcessingLogs([]);
      setConsecutiveErrors(0);
      setPdfStartPage('');
      setPdfEndPage('');
  };

  const handleRestartPdf = () => {
      if (!pdfFile || pdfStatus === 'processing' || pdfStatus === 'pausing') return;
      const resetChunks = pdfChunks.map(c => ({ ...c, status: 'pending', errorCount: 0 }));
      setPdfChunks(resetChunks);
      setCurrentChunkIndex(0);
      setPdfStatus('ready');
      setProcessingLogs([]);
      setConsecutiveErrors(0);
      
      const resetSession = {
          fileName: pdfFile.name,
          lastChunkIndex: -1,
          lastChunkPages: 'Início',
          timestamp: new Date().toISOString()
      };
      
      if (user) {
          setDoc(doc(db, "users", user.uid, "progress", "pdf_session"), resetSession)
            .catch(e => console.error("Erro ao resetar sessão:", e));
      }
      
      addLog('info', 'Processamento reiniciado do zero.');
  };

  const handleJumpToChunk = (index) => {
      if (pdfStatus === 'processing' || pdfStatus === 'idle' || pdfStatus === 'pausing' || pdfStatus === 'reading') return;
      
      const chunk = pdfChunks[index];
      addLog('info', `Agulha movida para fatia ${chunk.pages} (Aguardando Início)...`);
      
      setCurrentChunkIndex(index);

      setPdfChunks(prev => {
          const newChunks = [...prev];
          newChunks[index] = { ...newChunks[index], status: 'pending', errorCount: 0 };
          return newChunks;
      });
  };

  const processNextChunk = async () => {
      const currentStatus = pdfStatusRef.current;
      const currentChunks = pdfChunksRef.current;
      const doDoubleCheck = doubleCheckRef.current;
      const doWebSearch = webSearchRef.current; 
      const ovr = overridesRef.current; 
      const currentFile = pdfFile; 
      const activeIndex = currentChunkIndexRef.current;

      if (currentStatus === 'pausing' || currentStatus === 'paused') {
          if (currentStatus === 'pausing') {
              setPdfStatus('paused');
              addLog('warning', 'Pausa solicitada. Sistema parado com segurança.');
          }
          processorRef.current = false; 
          return; 
      }
      
      if (processorRef.current) return; 
      if (currentStatus === 'completed') return;
      
      if (activeIndex >= currentChunks.length) {
           setPdfStatus('completed');
           addLog('success', 'Processamento Completo!');
           showNotification('success', 'Todas as partes selecionadas foram processadas.');
           return;
      }

      const chunk = currentChunks[activeIndex];

      if (currentStatus !== 'pausing' && currentStatus !== 'processing') setPdfStatus('processing');
      
      processorRef.current = true; 
      addLog('info', `Processando fatia ${chunk.pages}...`);

      try {
          const activeThemesMap = ovr.overrideArea ? { [ovr.overrideArea]: themesMap[ovr.overrideArea] } : themesMap;

          // Define callback de parada para o PDF
          const shouldStopPdf = () => pdfStatusRef.current === 'pausing';

          const questions = await executeBlindlyWithRetry("Geração", async (key) => {
              const systemPrompt = `
              Você é um especialista em banco de dados médicos (MedMaps).
              Analise o conteúdo e gere um JSON ESTRITO.
              
              CONTEXTO (Informacional):
              - Instituição: ${ovr.overrideInst ? ovr.overrideInst : "Não informado (Detectar do texto)"}
              - Ano: ${ovr.overrideYear ? ovr.overrideYear : "Não informado (Detectar do texto)"}

              OBSERVAÇÃO SOBRE CONTEXTO (CRÍTICO PARA PDF):
              - O texto contém seções de 'CONTEXTO' (Anterior e Próxima). 
              - Use essas seções APENAS para reconstruir questões quebradas nas bordas do conteúdo principal.
              - Se uma questão estiver 100% contida dentro de uma área de contexto, ignore-a (ela será processada no outro lote).

              REGRAS DE EXTRAÇÃO E LIMPEZA:
              1. LIMPEZA DE INÍCIO:
                 - Remova APENAS índices/rótulos de questão (ex: "1)", "159048)", "05.", "Questão 1:", "Enunciado:").
                 - MANTENHA números que fazem parte da frase (ex: "3 pacientes...", "40 anos...").
                 - Comece o texto direto no conteúdo do caso clínico.
                 
              2. SEPARAÇÃO DAS ALTERNATIVAS:
                 - O campo "text" DEVE TERMINAR antes das alternativas.
                 - NUNCA inclua "A) ... B) ..." ou "a. ... b. ..." dentro do campo "text".
                 - As alternativas DEVEM ser extraídas separadamente no array "options".

              3. DETECÇÃO DE IMAGEM (LÓGICA CONTEXTUAL):
                 - MARQUE "needsImage": true SE:
                   * O texto MANDA olhar: "Vide figura", "Observe a imagem", "A figura abaixo", "Ver anexo".
                   * O texto DEPENDE do visual: "De acordo com o exame de imagem", "Baseado no ECG apresentado".
                   * O texto é vago sobre o resultado: "O Raio-X revela... (e não diz o que)".
                 - MARQUE "needsImage": false SE:
                   * O texto já DESCREVE o resultado: "ECG normal", "Raio-X evidenciando fratura".
                   * Apenas cita que o exame foi feito: "Foi solicitada tomografia".

              4. CLASSIFICAÇÃO E RESOLUÇÃO:
                - Se o gabarito estiver no texto, use-o. Se NÃO, RESOLVA a questão.
                - Gere sempre um campo "explanation".
                 - Classifique CADA questão em uma das Áreas e Tópicos da lista abaixo.
                  - É CRUCIAL que a classificação esteja correta.
                  - LISTA DE CLASSIFICAÇÃO VÁLIDA:
                   ${JSON.stringify(activeThemesMap)}

              5. DADOS DE CABEÇALHO:
                  - IGNORE nomes de cursos preparatórios (Medgrupo, Medcurso, Estratégia, etc) no campo "institution".
                  - Procure pelo nome do HOSPITAL ou BANCA.
                  - Se não encontrar, deixe "".

              Formato Saída JSON:
              [
                {
                  "institution": "String", "year": Number|String, "area": "String", "topic": "String",
                  "text": "String", "options": [{"id": "a", "text": "String"}],
                  "correctOptionId": "char", "explanation": "String",
                  "needsImage": boolean
                }
              ]
            `;
            
              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.replace('models/', '')}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt + "\n\nTEXTO DO PDF:\n" + chunk.text }] }]
                })
              });

              if (!response.ok) {
                  const errData = await response.json().catch(() => ({}));
                  throw new Error(errData.error?.message || "Erro na API Geração");
              }

              const data = await response.json();
              let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              const parsed = safeJsonParse(jsonString);
              return parsed.filter(q => q.options && q.options.length >= 2);
          }, addLog, shouldStopPdf);

          addLog('info', `Pós-processando ${questions.length} questões (Search + Audit)...`);

          let processedQuestions = await Promise.all(questions.map(async (q) => {
              const hashId = await generateQuestionHash(q.text);
              let isDuplicate = false;
              let oldData = null;

              if (hashId) {
                  const existingDoc = await getDoc(doc(db, "questions", hashId));
                  if (existingDoc.exists()) {
                      isDuplicate = true;
                      oldData = existingDoc.data();
                  }
              }

              const shouldRunAPIs = !isDuplicate; 

              let preCleanedInst = cleanInstitutionText(q.institution);
              let finalInst = preCleanedInst;
              let finalYear = q.year;
              let sourceFound = false;
              let verificationStatus = 'unchecked';
              let verificationReason = '';

              if (shouldRunAPIs) {
                  const doWebSearch = webSearchRef.current; 
                  const doDoubleCheck = doubleCheckRef.current; 

                  const searchPromise = (async () => {
                      if (doWebSearch && (!preCleanedInst || !q.year)) { 
                         return await searchQuestionSource(q.text, shouldStopPdf);
                      }
                      return null;
                  })();

                  const auditPromise = (async () => {
                      if (doDoubleCheck) {
                          return await verifyQuestionWithAI(q, shouldStopPdf);
                      }
                      return { status: 'unchecked', reason: '' };
                  })();

                  const [searchResult, auditResult] = await Promise.all([searchPromise, auditPromise]);

                  if (searchResult) {
                      if (searchResult.institution) { finalInst = searchResult.institution; sourceFound = true; }
                      if (searchResult.year) finalYear = searchResult.year;
                  }
                  verificationStatus = auditResult.status;
                  verificationReason = auditResult.reason;

              } else {
                  if (oldData) {
                      finalInst = oldData.institution || q.institution;
                      finalYear = oldData.year || q.year;
                      sourceFound = oldData.sourceFound || false; 
                      verificationStatus = oldData.verificationStatus || 'unchecked';
                      verificationReason = oldData.verificationReason || 'Duplicata recuperada';
                  }
              }

              finalInst = cleanInstitutionText(finalInst);

              const ovr = overridesRef.current || { overrideInst, overrideYear, overrideArea, overrideTopic }; 
              if (ovr.overrideInst) finalInst = ovr.overrideInst;
              if (ovr.overrideYear) finalYear = ovr.overrideYear;

              return {
                  ...q,
                  institution: finalInst,
                  year: finalYear,
                  area: ovr.overrideArea || q.area,
                  topic: ovr.overrideTopic || q.topic,
                  sourceFound,
                  verificationStatus,
                  verificationReason,
                  hashId,
                  isDuplicate
              };
          }));

          const batch = writeBatch(db);
          processedQuestions.forEach(q => {
              const docId = q.hashId || doc(collection(db, "draft_questions")).id;
              const docRef = doc(db, "draft_questions", docId);
              
              batch.set(docRef, {
                  ...q,
                  institution: q.institution || "", 
                  year: q.year || "",
                  createdAt: new Date().toISOString(),
                  createdBy: user.email,
                  sourceFile: pdfFile.name,
                  sourcePages: chunk.pages,
                  hasImage: false
              });
          });
          await batch.commit();

          addLog('success', `Sucesso fatia ${chunk.pages}: ${processedQuestions.length} questões salvas.`);
          setPdfChunks(prev => {
              const newChunks = [...prev];
              newChunks[activeIndex] = { ...newChunks[activeIndex], status: 'success' };
              return newChunks;
          });
          setConsecutiveErrors(0); 

          if (currentFile && currentFile.name && user) {
              const sessionData = {
                  fileName: currentFile.name,
                  lastChunkIndex: activeIndex, 
                  lastChunkPages: chunk.pages,
                  timestamp: new Date().toISOString()
              };
              setDoc(doc(db, "users", user.uid, "progress", "pdf_session"), sessionData)
                .catch(err => console.error("Erro ao salvar progresso no DB:", err));
          }

          if (pdfStatusRef.current === 'pausing') {
              setPdfStatus('paused');
              addLog('warning', 'Pausa solicitada. Ciclo atual concluído e salvo.');
              processorRef.current = false;
              return; 
          }

          if (pdfStatusRef.current === 'paused' || pdfStatusRef.current === 'idle') {
              processorRef.current = false;
              return;
          }

          setCurrentChunkIndex(prev => prev + 1);
          setTimeout(() => {
              processorRef.current = false; 
              processNextChunk(); 
          }, 500); 

      } catch (error) {
          console.error(error);
          
          if (error.message === 'ABORT_RETRY') {
              addLog('warning', `Processamento interrompido manualmente pelo usuário.`);
              setPdfStatus('paused');
              processorRef.current = false;
              return;
          }

          if (error.message.includes("Cota de Pesquisa")) {
              addLog('error', error.message);
              setPdfStatus('paused');
              processorRef.current = false;
              showNotification('error', error.message);
              return;
          }

          const errorMessage = error.message || "";
          const newErrorCount = chunk.errorCount + 1;
          const delay = 3000 * Math.pow(2, newErrorCount);
          
          if (newErrorCount >= 3) {
              addLog('error', `Fatia ${chunk.pages} marcada com ERRO APÓS 3 TENTATIVAS.`);
              setPdfChunks(prev => {
                  const newChunks = [...prev];
                  newChunks[activeIndex] = { ...newChunks[activeIndex], status: 'error', errorCount: newErrorCount };
                  return newChunks;
              });
              setConsecutiveErrors(0);
              processorRef.current = false;
              
              setCurrentChunkIndex(prev => prev + 1);
              setTimeout(() => processNextChunk(), 1000); 
              return;
          }

          setPdfChunks(prev => {
              const newChunks = [...prev];
              newChunks[activeIndex] = { ...newChunks[activeIndex], status: 'pending' };
              return newChunks;
          });

          setTimeout(() => {
              processorRef.current = false;
              processNextChunk();
          }, delay);
      }
  };

  const togglePdfProcessing = () => {
      const currentStatus = pdfStatusRef.current;
      if (currentStatus === 'processing') {
          setPdfStatus('pausing');
          addLog('warning', 'Solicitando pausa... Aguardando conclusão da fatia atual.');
      } else if (currentStatus === 'paused' || currentStatus === 'ready') {
          setPdfStatus('processing');
          addLog('info', currentStatus === 'ready' ? 'Iniciando processamento...' : 'Retomando...');
          processorRef.current = false; 
          setTimeout(() => processNextChunk(), 100);
      }
  };

  // --- HELPER FUNCTIONS ---
  const saveApiKeyFromModal = async () => {
      const rawKeys = tempApiKeysText.split('\n').map(k => k.trim()).filter(k => k.length > 0);
      const uniqueKeys = [...new Set(rawKeys)];

      if (uniqueKeys.length === 0) return showNotification('error', 'Adicione pelo menos uma chave.');
      
      setIsSavingKey(true);
      try {
          setApiKeys(uniqueKeys);
          localStorage.setItem('gemini_api_keys', JSON.stringify(uniqueKeys));
          apiKeysRef.current = uniqueKeys;
          keyRotationIndex.current = 0; 

          await setDoc(doc(db, "settings", "global"), {
              geminiApiKeys: uniqueKeys, 
              geminiApiKey: uniqueKeys[0], 
              updatedBy: user.email,
              updatedAt: new Date().toISOString()
          }, { merge: true });
          
          setShowApiKeyModal(false);
          setShowTutorial(false);
          showNotification('success', `${uniqueKeys.length} Chaves API Salvas!`);
          
          if (pdfStatus === 'paused') addLog('success', 'Novas chaves detectadas! Clique em "Continuar".');

      } catch (error) {
          showNotification('error', 'Erro ao salvar: ' + error.message);
      } finally {
          setIsSavingKey(false);
      }
  };
  
  // Função para salvar o estado do toggle globalmente
  const toggleSearchLimit = async () => {
      const newState = !isSearchLimitEnabled;
      setIsSearchLimitEnabled(newState);
      
      try {
          await setDoc(doc(db, "settings", "global"), { isSearchLimitEnabled: newState }, { merge: true });
      } catch (e) {
          console.error("Erro ao salvar toggle:", e);
      }
  };

  const handleGetKey = () => { window.open('https://aistudio.google.com/app/api-keys', '_blank'); setShowTutorial(true); };
  const handleModelChange = (modelName) => { setSelectedModel(modelName); localStorage.setItem('gemini_model', modelName); };
  const showNotification = (type, text) => { setNotification({ type, text }); };
  const closeNotification = () => { setNotification(null); };
  const handleLogout = () => { signOut(auth); setParsedQuestions([]); setActiveTab('input'); };

  const validateKeyAndFetchModels = async () => {
      const currentKey = apiKeysRef.current[0]; 
      if (!currentKey) return showNotification('error', 'Configure as chaves API primeiro.');
      setIsValidatingKey(true);
      try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${currentKey}`);
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          if (!data.models) throw new Error("Sem acesso a modelos.");
          const genModels = data.models.filter(m => m.supportedGenerationMethods?.includes("generateContent") && (m.name.includes("gemini")));
          if (genModels.length > 0) {
              setAvailableModels(genModels);
              showNotification('success', `${genModels.length} modelos liberados!`);
          } else {
              showNotification('error', 'Chave válida mas sem modelos.');
          }
      } catch (error) {
          showNotification('error', `Erro na chave principal: ${error.message}`);
      } finally {
          setIsValidatingKey(false);
      }
  };

  // --- PROCESSAMENTO IA (Texto Único) ---
  const processWithAI = async () => {
    if (activeTab === 'input' && !rawText.trim()) return showNotification('error', 'Cole o texto.');
    
    setIsProcessing(true);

    const ovr = { overrideInst, overrideYear, overrideArea, overrideTopic };
    
    try {
        const activeThemesMap = ovr.overrideArea ? { [ovr.overrideArea]: themesMap[ovr.overrideArea] } : themesMap;

        const questions = await executeWithKeyRotation("Processamento Único", async (key) => {
            const systemPrompt = `
              Você é um especialista em banco de dados médicos (MedMaps).
              Analise o conteúdo e gere um JSON ESTRITO.
              
              CONTEXTO (Informacional):
              - Instituição: ${ovr.overrideInst ? ovr.overrideInst : "Não informado (Detectar do texto)"}
              - Ano: ${ovr.overrideYear ? ovr.overrideYear : "Não informado (Detectar do texto)"}

              REGRAS DE EXTRAÇÃO E LIMPEZA:
              1. LIMPEZA DE INÍCIO:
                 - Remova APENAS índices/rótulos de questão (ex: "1)", "159048)", "05.", "Questão 1:", "Enunciado:").
                 - MANTENHA números que fazem parte da frase (ex: "3 pacientes...", "40 anos...").
                 - Comece o texto direto no conteúdo do caso clínico.

              2. SEPARAÇÃO DAS ALTERNATIVAS:
                 - O campo "text" DEVE TERMINAR antes das alternativas.
                 - NUNCA inclua "A) ... B) ..." ou "a. ... b. ..." dentro do campo "text".
                 - As alternativas DEVEM ser extraídas separadamente no array "options".

              3. DETECÇÃO DE IMAGEM (LÓGICA CONTEXTUAL):
                 - MARQUE "needsImage": true SE:
                   * O texto MANDA olhar: "Vide figura", "Observe a imagem", "A figura abaixo", "Ver anexo".
                   * O texto DEPENDE do visual: "De acordo com o exame de imagem", "Baseado no ECG apresentado".
                   * O texto é vago sobre o resultado: "O Raio-X revela... (e não diz o que)".
                 - MARQUE "needsImage": false SE:
                   * O texto já DESCREVE o resultado: "ECG normal", "Raio-X evidenciando fratura".
                   * Apenas cita que o exame foi feito: "Foi solicitada tomografia".

              4. CLASSIFICAÇÃO E RESOLUÇÃO:
                 - Classifique usando a lista: ${JSON.stringify(activeThemesMap)}
                 - Tente encontrar o gabarito. Se não houver, RESOLVA a questão.
                 - Gere sempre "explanation".

              Formato Saída JSON:
              [
                {
                  "institution": "String", "year": Number|String, "area": "String", "topic": "String",
                  "text": "String", "options": [{"id": "a", "text": "String"}],
                  "correctOptionId": "char", "explanation": "String",
                  "needsImage": boolean
                }
              ]
            `;

            let contentsPayload = [{ parts: [{ text: systemPrompt + "\n\nCONTEÚDO:\n" + rawText }] }];
            
            const modelNameClean = selectedModel.startsWith('models/') ? selectedModel.replace('models/', '') : selectedModel;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelNameClean}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: contentsPayload })
            });
            
            if (!response.ok) {
                 const errData = await response.json().catch(() => ({}));
                 throw new Error(errData.error?.message || "Erro na API Geração");
            }

            const data = await response.json();
            let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const parsed = safeJsonParse(jsonString);
            return parsed.filter(q => q.options && q.options.length >= 2);
        });

        showNotification('info', `Pós-processando ${questions.length} questões...`);

          let processedQuestions = await Promise.all(questions.map(async (q) => {
              const hashId = await generateQuestionHash(q.text);
              let isDuplicate = false;
              let oldData = null;

              if (hashId) {
                  const existingDoc = await getDoc(doc(db, "questions", hashId));
                  if (existingDoc.exists()) {
                      isDuplicate = true;
                      oldData = existingDoc.data();
                  }
              }

              const shouldRunAPIs = !isDuplicate; 

              // --- FIX: PRÉ-LIMPEZA DE INSTITUIÇÃO ---
              let preCleanedInst = cleanInstitutionText(q.institution);

              let finalInst = preCleanedInst;
              let finalYear = q.year;
              let sourceFound = false;
              let verificationStatus = 'unchecked';
              let verificationReason = '';

              if (shouldRunAPIs) {
                  const doWebSearch = webSearchRef.current; 
                  const doDoubleCheck = doubleCheckRef.current; 

                  const searchPromise = (async () => {
                      if (doWebSearch && (!preCleanedInst || !q.year)) { // VALOR LIMPO
                         // ATENÇÃO: Agora com retry interno
                         return await searchQuestionSource(q.text);
                      }
                      return null;
                  })();

                  const auditPromise = (async () => {
                      if (doDoubleCheck) {
                          // ATENÇÃO: Agora com retry interno
                          return await verifyQuestionWithAI(q);
                      }
                      return { status: 'unchecked', reason: '' };
                  })();

                  const [searchResult, auditResult] = await Promise.all([searchPromise, auditPromise]);

                  if (searchResult) {
                      if (searchResult.institution) { finalInst = searchResult.institution; sourceFound = true; }
                      if (searchResult.year) finalYear = searchResult.year;
                  }
                  verificationStatus = auditResult.status;
                  verificationReason = auditResult.reason;

              } else {
                  if (oldData) {
                      finalInst = oldData.institution || q.institution;
                      finalYear = oldData.year || q.year;
                      sourceFound = oldData.sourceFound || false; 
                      
                      verificationStatus = oldData.verificationStatus || 'unchecked';
                      verificationReason = oldData.verificationReason || 'Duplicata recuperada';
                  }
              }

              // Limpeza Final
              finalInst = cleanInstitutionText(finalInst);

              const ovr = overridesRef.current || { overrideInst, overrideYear, overrideArea, overrideTopic }; 
              if (ovr.overrideInst) finalInst = ovr.overrideInst;
              if (ovr.overrideYear) finalYear = ovr.overrideYear;

              return {
                  ...q,
                  institution: finalInst,
                  year: finalYear,
                  area: ovr.overrideArea || q.area,
                  topic: ovr.overrideTopic || q.topic,
                  sourceFound,
                  verificationStatus,
                  verificationReason,
                  hashId,
                  isDuplicate
              };
          }));

        let savedCount = 0;
        const batch = writeBatch(db);
        
        for (const q of processedQuestions) {
            const docId = q.hashId || doc(collection(db, "draft_questions")).id;
            const docRef = doc(db, "draft_questions", docId);
            
            batch.set(docRef, {
                ...q,
                institution: q.institution || "", 
                year: q.year || "",
                createdAt: new Date().toISOString(),
                createdBy: user.email,
                hasImage: false
            });
            savedCount++;
        }
        
        if (savedCount > 0) await batch.commit();

        setRawText('');
        setActiveTab('review');
        
        showNotification('success', `${savedCount} questões enviadas para fila (inclusive duplicatas)!`);

    } catch (error) {
        console.error(error);
        showNotification('error', 'Erro: ' + error.message);
    } finally {
        setIsProcessing(false);
    }
  };

  // --- BULK METADATA CLEANING ---
  const clearAllField = (field) => {
      const targetQuestions = getFilteredQuestions();
      if (targetQuestions.length === 0) return;
      
      setConfirmationModal({
          isOpen: true,
          type: field === 'institution' ? 'clear_institution' : 'clear_year',
          data: null,
          title: `Limpar ${field === 'institution' ? 'Instituições' : 'Anos'}?`,
          message: `Deseja limpar o campo "${field === 'institution' ? 'Instituição' : 'Ano'}" de ${targetQuestions.length} questões exibidas?`,
          confirmText: 'Sim, Limpar',
          confirmColor: 'red'
      });
  };

  // --- FUNÇÕES DE MODAL DE CONFIRMAÇÃO ---
  const handleDiscardOneClick = (q) => {
      setConfirmationModal({
          isOpen: true,
          type: 'delete_one',
          data: q,
          title: 'Excluir Rascunho?',
          message: 'Tem certeza que deseja excluir esta questão?',
          confirmText: 'Sim, Excluir',
          confirmColor: 'red'
      });
  };

  const handleApproveFilteredClick = () => {
      const targetQuestions = getFilteredQuestions();
      if (targetQuestions.length === 0) return;
      
      const count = targetQuestions.length;

      const activeLabels = activeFilters.map(f => filterLabels[f]).join(' + ');

      setConfirmationModal({
          isOpen: true,
          type: 'approve_filtered',
          data: null,
          title: `Aprovar ${count} Questões?`,
          message: `Você está prestes a publicar (ou atualizar) ${count} questões dos filtros: ${activeLabels}.`,
          confirmText: 'Sim, Publicar/Atualizar',
          confirmColor: 'emerald'
      });
  };

  const handleDiscardFilteredClick = () => {
      const targetQuestions = getFilteredQuestions();
      if (targetQuestions.length === 0) return;

      const activeLabels = activeFilters.map(f => filterLabels[f]).join(' + ');

      setConfirmationModal({
          isOpen: true,
          type: 'delete_filtered',
          data: null,
          title: `Excluir ${targetQuestions.length} Questões?`,
          message: `Isso excluirá permanentemente as questões dos filtros: ${activeLabels}.`,
          confirmText: 'Sim, Excluir',
          confirmColor: 'red'
      });
  };

  const executeConfirmationAction = async () => {
      const { type, data } = confirmationModal;
      setConfirmationModal({ ...confirmationModal, isOpen: false }); 

      if (type === 'clear_institution' || type === 'clear_year') {
          const field = type === 'clear_institution' ? 'institution' : 'year';
          const targetQuestions = getFilteredQuestions();
          
          const updated = parsedQuestions.map(q => {
              if (targetQuestions.some(t => t.id === q.id)) {
                  return { ...q, [field]: '' };
              }
              return q;
          });
          setParsedQuestions(updated);

          const batch = writeBatch(db);
          targetQuestions.forEach(q => {
              const docRef = doc(db, "draft_questions", q.id);
              batch.update(docRef, { [field]: '' });
          });
          batch.commit().then(() => {
              showNotification('success', `Campo ${field === 'institution' ? 'Instituição' : 'Ano'} limpo em ${targetQuestions.length} questões.`);
          }).catch(err => {
              console.error(err);
              showNotification('error', 'Erro ao salvar limpeza no banco.');
          });
          return;
      }

      if (type === 'delete_one') {
          if (!data || !data.id) return;
          try { await deleteDoc(doc(db, "draft_questions", data.id)); showNotification('success', 'Excluído.'); } catch (e) { showNotification('error', e.message); }
      } 
      else if (type === 'approve_filtered') {
          setIsBatchAction(true);
          let count = 0;
          const targetQuestions = getFilteredQuestions();

          try {
              for (const q of targetQuestions) {
                  const { id, status, createdAt, createdBy, verificationStatus, verificationReason, isDuplicate, hashId, sourceFound, ...finalData } = q;
                  if (q.area && q.topic && q.text) {
                     await setDoc(doc(db, "questions", id), { 
                         ...finalData, 
                         updatedAt: new Date().toISOString(), 
                         approvedBy: user.email
                     });
                     await deleteDoc(doc(db, "draft_questions", id));
                     count++;
                  }
              }
              showNotification('success', `${count} questões processadas (criadas ou atualizadas)!`);
          } catch (e) { showNotification('error', e.message); } finally { setIsBatchAction(false); }
      }
      else if (type === 'delete_filtered') {
          setIsBatchAction(true);
          const targetQuestions = getFilteredQuestions();
          try {
              const batch = writeBatch(db);
              targetQuestions.forEach(q => batch.delete(doc(db, "draft_questions", q.id)));
              await batch.commit();
              showNotification('success', 'Fila limpa.');
          } catch (e) { showNotification('error', e.message); } finally { setIsBatchAction(false); }
      }
  };

  const approveQuestion = async (q) => {
    if (!q.area || !q.topic || !q.text || !q.options || q.options.length < 2) {
      return showNotification('error', 'Preencha os campos obrigatórios.');
    }
    try {
      const { id, status, createdAt, createdBy, verificationStatus, verificationReason, isDuplicate, hashId, sourceFound, ...finalData } = q;
      
      await setDoc(doc(db, "questions", id), {
        ...finalData,
        updatedAt: new Date().toISOString(), 
        approvedBy: user.email
      });
      
      await deleteDoc(doc(db, "draft_questions", id));
      
      if (q.isDuplicate) {
          showNotification('success', 'Questão original ATUALIZADA com sucesso!');
      } else {
          showNotification('success', 'Publicada!');
      }
    } catch (error) {
      showNotification('error', 'Erro: ' + error.message);
    }
  };

  // --- FUNÇÕES DE ATUALIZAÇÃO (CORRIGIDO PARA USAR ID) ---
  const updateQuestionField = (id, field, val) => {
      setParsedQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: val } : q));
  };

  const updateOptionText = (qId, optIdx, val) => {
      setParsedQuestions(prev => prev.map(q => {
          if (q.id === qId) {
              const newOptions = [...q.options];
              newOptions[optIdx].text = val;
              return { ...q, options: newOptions };
          }
          return q;
      }));
  };

  const currentFilteredList = getFilteredQuestions();

  // --- RENDER LOGIN ---
  if (isLoadingAuth) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="text-white animate-spin" size={48} /></div>;
  
  if (!user) return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3 mb-6 justify-center">
             <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/20"><Brain className="text-white" size={32} /></div>
             <h1 className="text-2xl font-bold text-slate-800">MedImporter Admin</h1>
          </div>
          <p className="text-slate-500 text-center mb-6">Acesso restrito a administradores.</p>
          <form onSubmit={(e) => { e.preventDefault(); signInWithEmailAndPassword(auth, email, password).catch(err => showNotification('error', err.message)); }} className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"/>
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"/>
            <button className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"><Lock size={18} /> Acessar Sistema</button>
          </form>
        </div>
        <NotificationToast notification={notification} onClose={closeNotification} positionClass="fixed bottom-4 right-4" />
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 pb-20">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => window.location.href = '/'} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voltar para o App Principal"><ArrowLeft size={24} /></button>
            <div className="flex items-center gap-2"><Brain className="text-blue-600" size={28} /><h1 className="text-xl font-bold text-slate-800">MedImporter</h1></div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
            
            {/* --- DISPLAY DA COTA DIÁRIA (NOVO) --- */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${searchQuota.count >= DAILY_SEARCH_LIMIT ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`} title="Contador Global de Pesquisas Google (Todos os Admins)">
                <BarChart3 size={16}/>
                <span>{searchQuota.count} / {DAILY_SEARCH_LIMIT}</span>
            </div>

            <div 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all border ${isSearchLimitEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                onClick={toggleSearchLimit}
                title="Ativar/Desativar Limite Seguro de 1400 Pesquisas/Dia"
            >
                {isSearchLimitEnabled ? <ToggleRight size={24} className="text-emerald-600"/> : <ToggleLeft size={24}/>}
                <span className="text-sm font-bold whitespace-nowrap flex items-center gap-1">
                    {isSearchLimitEnabled ? <ShieldCheck size={16}/> : <AlertTriangle size={16}/>}
                    Limite
                </span>
            </div>

            <div 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all border ${isWebSearchEnabled ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                title="A IA vai pesquisar no Google a origem de cada questão"
            >
                {isWebSearchEnabled ? <ToggleRight size={24} className="text-teal-600"/> : <ToggleLeft size={24}/>}
                <span className="text-sm font-bold whitespace-nowrap flex items-center gap-1">
                    {isWebSearchEnabled ? <Globe size={16}/> : null}
                    Busca Web
                </span>
            </div>

            <div 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all border ${isDoubleCheckEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                onClick={() => setIsDoubleCheckEnabled(!isDoubleCheckEnabled)}
                title="A IA vai auditar cada questão gerada (Double Check)"
            >
                {isDoubleCheckEnabled ? <ToggleRight size={24} className="text-indigo-600"/> : <ToggleLeft size={24}/>}
                <span className="text-sm font-bold whitespace-nowrap flex items-center gap-1">
                    {isDoubleCheckEnabled ? <ShieldCheck size={16}/> : null}
                    Auditoria
                </span>
            </div>

            <button onClick={() => { 
                setTempApiKeysText(apiKeys.join('\n')); 
                setShowApiKeyModal(true); 
                setShowTutorial(false); 
            }} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 text-sm font-medium"><Settings size={18} /><span className="hidden md:inline">API</span></button>
            
            <div className="relative group flex-1 md:flex-none w-full md:w-auto flex items-center gap-2">
                <div className="relative">
                    <Cpu size={16} className="absolute left-3 top-3 text-gray-500" />
                    <select value={selectedModel} onChange={(e) => handleModelChange(e.target.value)} className="w-full md:w-56 pl-9 pr-3 py-2 text-sm bg-gray-100 border-none rounded-lg font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none">
                        {availableModels.map(model => (<option key={model.name} value={model.name}>{model.displayName || model.name}</option>))}
                    </select>
                </div>
                <button onClick={validateKeyAndFetchModels} disabled={isValidatingKey || apiKeys.length === 0} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50" title="Sincronizar Modelos">
                    {isValidatingKey ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18} />}
                </button>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sair"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      {/* NOTIFICATION */}
      <NotificationToast notification={notification} onClose={closeNotification} positionClass="fixed top-24 right-4" />

      {/* API KEY MODAL */}
      {showApiKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
                  <button onClick={() => setShowApiKeyModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  <h2 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2"><Settings size={20} className="text-blue-600"/> Configurar API Gemini</h2>
                  <div className="mb-4">
                      <label className="block text-sm font-bold text-gray-600 mb-2">Chaves da API (Uma por linha)</label>
                      <div className="flex flex-col gap-2">
                        <textarea 
                            value={tempApiKeysText} 
                            onChange={e => setTempApiKeysText(e.target.value)} 
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-mono text-sm h-32 resize-y" 
                            placeholder="AIza...&#10;AIza...&#10;AIza..."
                        />
                        <button onClick={handleGetKey} className="self-end px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100 font-bold whitespace-nowrap flex items-center gap-2 transition-colors text-sm"><Key size={16} /> Gerar Nova Chave</button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><Layers size={14}/> Dica: Adicione múltiplas chaves para evitar limites de uso (Erro 429). O sistema fará o rodízio automático.</p>
                  </div>
                  {showTutorial && (
                      <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in slide-in-from-top-2">
                          <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2"><ExternalLink size={16}/> Como gerar chaves extras:</h3>
                          <ol className="text-sm text-blue-800/80 space-y-1.5 list-decimal list-inside">
                              <li>Clique em "Gerar Nova Chave" para abrir o Google AI Studio.</li>
                              <li>Clique em "Create API key".</li>
                              <li>Escolha <strong>"Create API key in new project"</strong>.</li>
                              <li>Copie a chave e cole uma em cada linha acima.</li>
                              <li>Repita para criar quantos projetos quiser (cada projeto tem sua cota).</li>
                          </ol>
                      </div>
                  )}
                  <div className="flex justify-end gap-3 mt-auto pt-2">
                      <button onClick={() => setShowApiKeyModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold">Cancelar</button>
                      <button onClick={saveApiKeyFromModal} disabled={isSavingKey} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2">{isSavingKey ? <Loader2 size={16} className="animate-spin" /> : null} Salvar Chaves</button>
                  </div>
              </div>
          </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmationModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200">
                  <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-full mb-4 ${confirmationModal.confirmColor === 'red' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}><AlertTriangle size={32} /></div>
                    <h2 className="text-xl font-bold mb-2 text-slate-800">{confirmationModal.title}</h2>
                    <p className="text-gray-600 mb-6 text-sm">{confirmationModal.message}</p>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setConfirmationModal({ ...confirmationModal, isOpen: false })} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                        <button onClick={executeConfirmationAction} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-colors ${confirmationModal.confirmColor === 'red' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}>{confirmationModal.confirmText}</button>
                    </div>
                  </div>
              </div>
          </div>
      )}

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex justify-center mb-8">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex overflow-x-auto max-w-full">
                <button onClick={() => setActiveTab('input')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'input' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><FileText size={18} /> Texto</button>
                <button onClick={() => setActiveTab('batch_images')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'batch_images' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Files size={18} /> Imagens (Lote)</button>
                <button onClick={() => setActiveTab('pdf')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'pdf' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Database size={18} /> PDF Massivo</button>
                <button onClick={() => setActiveTab('review')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'review' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                    <CloudLightning size={18} /> Fila de Aprovação 
                    {parsedQuestions.length > 0 && <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{parsedQuestions.length}</span>}
                </button>
            </div>
        </div>

        {/* OVERRIDES SECTION */}
        {(activeTab === 'input' || activeTab === 'pdf' || activeTab === 'batch_images') && (
            <div className="max-w-4xl mx-auto mb-6 animate-in slide-in-from-top-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                        <Filter size={16} className="text-gray-500"/>
                        <span className="text-sm font-bold text-slate-700">Filtros de Pré-definição (Forçar Dados)</span>
                        <span className="text-xs text-gray-400 font-normal ml-auto">Opcional • Se preenchido, a IA será obrigada a usar</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Instituição</label>
                            <input value={overrideInst} onChange={e=>setOverrideInst(e.target.value)} placeholder="Ex: ENARE" className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ano</label>
                            <input type="number" value={overrideYear} onChange={e=>setOverrideYear(e.target.value)} placeholder="Ex: 2026" className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Área Forçada</label>
                            <select value={overrideArea} onChange={e=>{setOverrideArea(e.target.value); setOverrideTopic('');}} className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                <option value="">Automático (IA)</option>
                                {areasBase.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tópico Forçado</label>
                            <select value={overrideTopic} onChange={e=>setOverrideTopic(e.target.value)} disabled={!overrideArea} className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400">
                                <option value="">Automático (IA)</option>
                                {(themesMap[overrideArea] || []).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    {(overrideInst || overrideYear || overrideArea) && (
                        <div className="bg-blue-50 px-4 py-2 border-t border-blue-100 flex justify-between items-center">
                            <span className="text-xs text-blue-700 font-medium">As próximas questões serão geradas com esses dados fixos.</span>
                            <button onClick={()=>{setOverrideInst('');setOverrideYear('');setOverrideArea('');setOverrideTopic('');}} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"><Eraser size={12}/> Limpar Filtros</button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* INPUT TABS */}
        {activeTab === 'input' && (
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-lg font-bold text-slate-800 mb-2">
                        Cole suas questões (Texto)
                    </label>
                    <p className="text-sm text-gray-500 mb-4">A IA vai analisar e enviar para a fila de aprovação (Database).</p>
                    
                    <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Cole aqui o texto..." className="w-full h-96 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-mono text-sm resize-y mb-4"/>

                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => { setRawText(''); }} className="px-4 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-bold">Limpar</button>
                        <button onClick={processWithAI} disabled={isProcessing || apiKeys.length === 0} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isProcessing ? <><Loader2 className="animate-spin" size={20} /> Processando...</> : <><Wand2 size={20} /> Enviar para Fila</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* BATCH IMAGES TAB */}
        {activeTab === 'batch_images' && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <label className="block text-lg font-bold text-slate-800 mb-1">
                                Importador de Imagens (Lote ou Única)
                            </label>
                            <p className="text-sm text-gray-500">Adicione ou cole (Ctrl+V) várias imagens. As processadas com sucesso serão removidas automaticamente.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={clearBatchQueue} disabled={batchStatus === 'processing' || batchStatus === 'pausing'} title="Limpar Tudo" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"><Trash2 size={20}/></button>
                            
                            {batchStatus === 'processing' ? (
                                <button onClick={toggleBatchProcessing} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-bold flex items-center gap-2 hover:bg-amber-200 transition-colors"><Pause size={18}/> Pausar</button>
                            ) : batchStatus === 'pausing' ? (
                                <button disabled className="px-4 py-2 bg-amber-50 text-amber-400 border border-amber-100 rounded-lg font-bold flex items-center gap-2 cursor-wait"><Loader2 size={18} className="animate-spin"/> Pausando...</button>
                            ) : (
                                <button onClick={toggleBatchProcessing} disabled={batchImages.length === 0} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-200 transition-colors disabled:opacity-50"><Play size={18}/> {batchStatus === 'paused' ? 'Continuar' : 'Iniciar'}</button>
                            )}
                        </div>
                    </div>

                    <div 
                        onPaste={handleBatchPaste}
                        className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden transition-all hover:border-blue-400 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        tabIndex="0"
                    >
                        <div className="text-center pointer-events-none p-4">
                            <UploadCloud size={32} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-600 font-bold text-sm">Arraste, Clique ou Cole (Ctrl+V)</p>
                        </div>
                        <input type="file" accept="image/*" multiple onChange={handleBatchImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200 h-[500px] overflow-y-auto">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex justify-between">
                                <span>Fila ({batchImages.length})</span>
                                {batchStatus === 'processing' && <span className="text-blue-600 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Processando...</span>}
                                {batchStatus === 'pausing' && <span className="text-amber-600 flex items-center gap-1"><Clock size={10} className="animate-spin"/> Pausando...</span>}
                            </h3>
                            
                            {batchImages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                                    <Files size={48} className="mb-2"/>
                                    <p className="text-sm">Nenhuma imagem na fila</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {batchImages.map((img) => (
                                        <div key={img.id} className={`relative group rounded-lg overflow-hidden border bg-white aspect-square shadow-sm ${img.status === 'error' ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'}`}>
                                            <img src={img.preview} alt="Preview" className="w-full h-full object-cover" />
                                            <button onClick={() => removeBatchImage(img.id)} disabled={batchStatus === 'processing' || batchStatus === 'pausing'} className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"><X size={14}/></button>
                                            
                                            {img.status === 'error' && (
                                                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center p-2 text-center">
                                                    <span className="text-xs font-bold text-white bg-red-600 px-2 py-1 rounded shadow-sm truncate max-w-full">{img.errorMsg || 'Erro'}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="w-full lg:w-1/3 flex flex-col h-[500px]">
                            <div className="bg-slate-900 rounded-xl overflow-hidden shadow-inner flex flex-col h-full">
                                <div className="p-3 bg-slate-800 border-b border-slate-700 text-gray-400 text-xs font-bold flex items-center gap-2">
                                    <Terminal size={14}/> Console de Imagens
                                </div>
                                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-gray-300 space-y-1">
                                    {batchLogs.length === 0 && <span className="opacity-50">Aguardando logs de imagem...</span>}
                                    {batchLogs.map((log, i) => (
                                        <div key={i} className={`mb-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-blue-300'}`}>
                                            <span className="opacity-50 mr-2">[{log.time}]</span>
                                            {log.message}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* PDF TAB */}
        {activeTab === 'pdf' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <label className="block text-lg font-bold text-slate-800 mb-1">
                                Importador Massivo de PDF (Até 1000 pgs)
                            </label>
                            <p className="text-sm text-gray-500">Fatiamento automático: 10 páginas por ciclo. Detecção de erros e pausa inteligente.</p>
                        </div>
                        {pdfStatus !== 'idle' && (
                            <div className="flex items-center gap-2">
                                <button onClick={handleResetPdf} disabled={pdfStatus === 'processing' || pdfStatus === 'pausing'} title="Cancelar e Novo PDF" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><XCircle size={20}/></button>
                                <button onClick={handleRestartPdf} disabled={pdfStatus === 'processing' || pdfStatus === 'pausing'} title="Reiniciar Processamento" className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors mr-2 disabled:opacity-30 disabled:cursor-not-allowed"><RotateCcw size={20}/></button>
                                
                                {pdfStatus === 'processing' ? (
                                    <button onClick={togglePdfProcessing} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-bold flex items-center gap-2 hover:bg-amber-200 transition-colors"><Pause size={18}/> Pausar</button>
                                ) : pdfStatus === 'pausing' ? (
                                    <button disabled className="px-4 py-2 bg-amber-50 text-amber-400 border border-amber-100 rounded-lg font-bold flex items-center gap-2 cursor-wait"><Loader2 size={18} className="animate-spin"/> Pausando...</button>
                                ) : (
                                    <button onClick={togglePdfProcessing} disabled={pdfStatus === 'reading' || pdfStatus === 'completed' || pdfStatus === 'error'} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-200 transition-colors disabled:opacity-50"><Play size={18}/> {pdfStatus === 'paused' ? 'Continuar' : 'Iniciar'}</button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {pdfStatus === 'idle' && (
                        <div className="space-y-4">
                             {lastSessionData && (
                                 <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4 animate-in slide-in-from-top-2">
                                     <div className="bg-blue-200 text-blue-700 p-2 rounded-lg">
                                         <History size={24} />
                                     </div>
                                     <div className="flex-1">
                                         <p className="text-xs font-bold text-blue-500 uppercase">Última Sessão Detectada</p>
                                         <p className="font-bold text-slate-700 text-sm">Arquivo: {lastSessionData.fileName}</p>
                                         <p className="text-xs text-slate-500">Parou na fatia: <strong>{lastSessionData.lastChunkPages || 'Desconhecido'}</strong></p>
                                     </div>
                                     <div className="text-xs text-blue-400 bg-white/50 px-2 py-1 rounded">
                                         Se enviar este arquivo novamente,<br/>o sistema continuará automaticamente.
                                     </div>
                                 </div>
                             )}

                             <div className="flex items-end gap-3 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><BookOpen size={12}/> De pg.</label>
                                    <input type="number" min="1" value={pdfStartPage} onChange={e=>setPdfStartPage(e.target.value)} placeholder="Início" className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"/>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><SkipForward size={12}/> Até pg.</label>
                                    <input type="number" min="1" value={pdfEndPage} onChange={e=>setPdfEndPage(e.target.value)} placeholder="Fim" className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"/>
                                </div>
                                <div className="text-xs text-gray-400 pb-2 w-1/3 leading-tight">
                                    Deixe em branco para processar o PDF inteiro.
                                </div>
                             </div>

                             <div className="w-full h-56 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden transition-all hover:border-blue-400">
                                <div className="text-center pointer-events-none p-4">
                                    <FileText size={48} className="mx-auto text-gray-400 mb-3" />
                                    <p className="text-gray-600 font-bold mb-1">Arraste seu PDF aqui</p>
                                    <p className="text-gray-400 text-sm">Suporta arquivos grandes (100MB+)</p>
                                </div>
                                <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                             </div>
                        </div>
                    )}

                    {pdfStatus !== 'idle' && (
                        <div className="space-y-6">
                            <div className="bg-gray-100 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg 
                                        ${pdfStatus === 'error' ? 'bg-red-100 text-red-600' : 
                                          pdfStatus === 'processing' ? 'bg-blue-100 text-blue-600 animate-pulse' : 
                                          pdfStatus === 'pausing' ? 'bg-amber-100 text-amber-600 animate-pulse' :
                                          'bg-gray-200 text-gray-600'}`}>
                                        {pdfStatus === 'reading' && <Loader2 className="animate-spin" size={24}/>}
                                        {pdfStatus === 'ready' && <CheckCircle size={24}/>}
                                        {pdfStatus === 'processing' && <Cpu size={24}/>}
                                        {pdfStatus === 'pausing' && <Clock size={24}/>}
                                        {pdfStatus === 'paused' && <Pause size={24}/>}
                                        {pdfStatus === 'completed' && <CheckCircle size={24}/>}
                                        {pdfStatus === 'error' && <AlertOctagon size={24}/>}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm uppercase">
                                            {pdfStatus === 'reading' ? 'Lendo Arquivo...' : 
                                             pdfStatus === 'pausing' ? 'Pausando...' : pdfStatus}
                                        </p>
                                        <p className="text-xs text-gray-500">{pdfFile?.name} • {pdfChunks.length} fatias</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-slate-700">{Math.round((parsedQuestions.filter(q => q.sourceFile === pdfFile?.name).length))} <span className="text-sm font-normal text-gray-400">questões</span></p>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-xl p-4 max-h-60 overflow-y-auto">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2 flex justify-between">
                                    <span>Timeline (Navegação)</span>
                                    {pdfStatus === 'paused' && <span className="text-blue-500 text-[10px]">Clique para Navegar (Seek)</span>}
                                </p>
                                <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
                                    {pdfChunks.map((chunk, idx) => (
                                        <button key={chunk.id} 
                                            onClick={() => handleJumpToChunk(idx)}
                                            disabled={pdfStatus === 'reading' || pdfStatus === 'processing' || pdfStatus === 'pausing'}
                                            className={`h-8 rounded-md flex items-center justify-center text-xs font-bold transition-all border
                                            ${chunk.status === 'pending' ? 'bg-gray-50 text-gray-400 border-gray-200' : ''}
                                            ${chunk.status === 'success' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : ''}
                                            ${chunk.status === 'restored' ? 'bg-indigo-100 text-indigo-600 border-indigo-200 shadow-sm' : ''} 
                                            ${chunk.status === 'error' ? 'bg-red-500 text-white border-red-600 shadow-sm' : ''}
                                            ${idx === currentChunkIndex && (pdfStatus === 'processing' || pdfStatus === 'pausing') ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50 text-blue-600 border-blue-200 animate-pulse' : ''}
                                            ${(pdfStatus === 'paused' || pdfStatus === 'ready' || pdfStatus === 'completed') ? 'hover:bg-blue-100 hover:text-blue-600 cursor-pointer hover:border-blue-300' : ''}
                                            ${(pdfStatus === 'processing' || pdfStatus === 'pausing') && idx !== currentChunkIndex ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                            title={`Páginas ${chunk.pages} | Erros: ${chunk.errorCount}`}
                                        >
                                            {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-gray-300 h-48 overflow-y-auto shadow-inner flex flex-col-reverse">
                                {processingLogs.length === 0 && <span className="opacity-50">Aguardando logs...</span>}
                                {processingLogs.map((log, i) => (
                                    <div key={i} className={`mb-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-blue-300'}`}>
                                        <span className="opacity-50 mr-2">[{log.time}]</span>
                                        {log.message}
                                    </div>
                                ))}
                                <div className="text-gray-500 border-b border-gray-800 mb-2 pb-1 flex items-center gap-2 sticky top-0 bg-slate-900"><Terminal size={12}/> Console de PDF</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* REVIEW TAB (ATUALIZADA) */}
        {activeTab === 'review' && (
            <div className="max-w-4xl mx-auto space-y-4">
                {parsedQuestions.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-col gap-3 sticky top-20 z-10 animate-in slide-in-from-top-2">
                        
                        {/* CABEÇALHO: Título + Lógica + Contador */}
                        <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Filter size={10}/> Filtros</span>
                                
                                <button 
                                    onClick={() => setFilterLogic(prev => prev === 'OR' ? 'AND' : 'OR')}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 transition-all ${filterLogic === 'AND' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                                    title={filterLogic === 'AND' ? "Mostra questões que têm TODAS as características" : "Mostra questões que têm QUALQUER uma das características"}
                                >
                                    {filterLogic === 'AND' ? <ToggleRight size={12}/> : <ToggleLeft size={12}/>}
                                    {filterLogic === 'AND' ? 'E (Restritivo)' : 'OU (Soma)'}
                                </button>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">{currentFilteredList.length} questões</span>
                        </div>
                        
                        {/* --- ÁREA DOS BOTÕES (DIVIDIDA EM 2 LINHAS FIXAS) --- */}
                        <div className="flex flex-col gap-1.5">
                            
                            {/* LINHA 1: STATUS & VALIDAÇÃO */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button onClick={() => toggleFilter('all')} className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all border ${activeFilters.includes('all') ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                                    Todas
                                </button>
                                <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                <button onClick={() => toggleFilter('verified')} className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold border flex items-center gap-1.5 transition-all ${activeFilters.includes('verified') ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                    <ShieldCheck size={12}/> Verificadas
                                </button>
                                <button onClick={() => toggleFilter('suspicious')} className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold border flex items-center gap-1.5 transition-all ${activeFilters.includes('suspicious') ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                    <AlertTriangle size={12}/> Suspeitas
                                </button>
                                <button onClick={() => toggleFilter('duplicates')} className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold border flex items-center gap-1.5 transition-all ${activeFilters.includes('duplicates') ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                    <Copy size={12}/> Duplicadas
                                </button>
                            </div>

                            {/* LINHA 2: CONTEÚDO & FONTE */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[9px] font-bold text-gray-300 uppercase mr-1 select-none">Tipo:</span>
                                <button onClick={() => toggleFilter('source')} className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold border flex items-center gap-1.5 transition-all ${activeFilters.includes('source') ? 'bg-teal-100 text-teal-700 border-teal-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                    <Globe size={12}/> Com Fonte
                                </button>
                                <button onClick={() => toggleFilter('no_source')} className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold border flex items-center gap-1.5 transition-all ${activeFilters.includes('no_source') ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                    <AlertOctagon size={12}/> Sem Fonte
                                </button>
                                <button onClick={() => toggleFilter('needs_image')} className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold border flex items-center gap-1.5 transition-all ${activeFilters.includes('needs_image') ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                    <ImageIcon size={12}/> Requer Imagem
                                </button>
                                <button onClick={() => toggleFilter('text_only')} className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold border flex items-center gap-1.5 transition-all ${activeFilters.includes('text_only') ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                    <FileType size={12}/> Texto Puro
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100 w-full"></div>

                        <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => clearAllField('institution')} className="text-[10px] bg-gray-50 border border-gray-200 text-slate-500 px-2 py-1.5 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-bold flex items-center gap-1 whitespace-nowrap"><Eraser size={10}/> Inst.</button>
                                <button onClick={() => clearAllField('year')} className="text-[10px] bg-gray-50 border border-gray-200 text-slate-500 px-2 py-1.5 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-bold flex items-center gap-1 whitespace-nowrap"><Eraser size={10}/> Ano</button>
                            </div>

                            <div className="flex items-center gap-2">
                                <button onClick={handleDiscardFilteredClick} disabled={isBatchAction || currentFilteredList.length === 0} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 whitespace-nowrap">
                                    <Trash2 size={14} /> Descartar
                                </button>
                                
                                <button onClick={handleApproveFilteredClick} disabled={isBatchAction || currentFilteredList.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 whitespace-nowrap">
                                    {isBatchAction ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle size={14} />} 
                                    Aprovar {currentFilteredList.length}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- LISTAGEM DAS QUESTÕES (CORRIGIDO: Passando q.id em vez de idx) --- */}
                {currentFilteredList.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Database size={64} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-xl font-medium text-gray-500">Nenhuma questão encontrada neste filtro.</p>
                        {parsedQuestions.length === 0 && <button onClick={() => setActiveTab('input')} className="mt-4 text-blue-600 font-bold hover:underline">Adicionar novas</button>}
                    </div>
                ) : (
                    currentFilteredList.map((q, idx) => (
                        <div key={q.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden relative group transition-colors ${q.isDuplicate ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200'}`}>
                            
                            <div className="h-1.5 w-full bg-gray-100"><div className="h-full bg-orange-400 w-full animate-pulse"></div></div>
                            
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-end items-center gap-2 flex-wrap min-h-[40px]">
                                <div className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 max-w-[250px] ${q.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-700' : q.verificationStatus === 'suspicious' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`} title={q.verificationReason || "Status da verificação"}>
                                    {q.verificationStatus === 'verified' && <><ShieldCheck size={12} className="flex-shrink-0"/> Double-Checked</>}
                                    {q.verificationStatus === 'suspicious' && <><ShieldAlert size={12} className="flex-shrink-0"/> <span className="truncate">Suspeita: {q.verificationReason}</span></>}
                                    {(!q.verificationStatus || q.verificationStatus === 'unchecked') && 'Não Verificada'}
                                </div>
                                {q.sourceFound && <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1"><Globe size={12}/> FONTE OK</div>}
                                {q.isDuplicate && <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 animate-pulse"><Copy size={12}/> DUPLICADA</div>}
                                {q.needsImage && <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 animate-pulse border border-purple-200"><ImageIcon size={12}/> REQUER IMAGEM</div>}
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Inst</label><input value={q.institution} onChange={e=>updateQuestionField(q.id,'institution',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"/></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Ano</label><input type="number" value={q.year} onChange={e=>updateQuestionField(q.id,'year',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"/></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Área</label><select value={q.area} onChange={e=>updateQuestionField(q.id,'area',e.target.value)} className="w-full p-2 bg-blue-50 border border-blue-100 rounded-lg text-sm font-bold text-blue-800"><option value="">Selecione...</option>{areasBase.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Tópico</label><select value={q.topic} onChange={e=>updateQuestionField(q.id,'topic',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"><option value="">Selecione...</option>{(themesMap[q.area]||[]).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                                </div>

                                <div className="mb-6"><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Enunciado</label><textarea value={q.text} onChange={e=>updateQuestionField(q.id,'text',e.target.value)} rows={4} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"/></div>

                                <div className="mb-6 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><ImageIcon size={12}/> Galeria de Imagens ({q.images?.length || 0})</label>
                                        {uploadingImageId === q.id && <span className="text-xs text-blue-600 animate-pulse font-bold flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Enviando...</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-3 items-start">
                                        {q.images?.map((imgUrl, i) => (
                                            <div key={i} className="relative group w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-lg border border-gray-200 shadow-sm flex-shrink-0">
                                                <img src={imgUrl} alt={`Img ${i}`} className="w-full h-full object-cover rounded-lg" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                                                    <a href={imgUrl} target="_blank" rel="noreferrer" className="text-white hover:text-blue-300"><ExternalLink size={16}/></a>
                                                    <button onClick={() => deleteImageFromQuestion(idx, q, imgUrl)} className="text-white hover:text-red-400"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                        ))}
                                        <label className={`cursor-pointer w-24 h-24 sm:w-32 sm:h-32 bg-white hover:bg-blue-50 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 transition-all ${uploadingImageId === q.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <UploadCloud size={24}/> <span className="text-[10px] font-bold uppercase">Adicionar</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUploadToQuestion(e, idx, q)} disabled={uploadingImageId === q.id}/>
                                        </label>
                                    </div>
                                    {q.needsImage && (!q.images || q.images.length === 0) && <p className="mt-2 text-xs text-purple-600 flex items-center gap-1 animate-pulse font-bold"><AlertCircle size={12}/> Esta questão pede imagem!</p>}
                                </div>
                              
                                <div className="space-y-2 mb-6">
                                    {q.options?.map((opt, optIdx) => (
                                        <div key={opt.id} className="flex items-center gap-3">
                                            <div onClick={()=>updateQuestionField(q.id,'correctOptionId',opt.id)} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer font-bold text-sm flex-shrink-0 ${q.correctOptionId===opt.id?'bg-emerald-500 text-white':'bg-gray-100 text-gray-400'}`}>{opt.id.toUpperCase()}</div>
                                            <input value={opt.text} onChange={e=>updateOptionText(q.id,optIdx,e.target.value)} className={`w-full p-2 border rounded-lg text-sm ${q.correctOptionId===opt.id?'border-emerald-200 bg-emerald-50':'bg-white'}`}/>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                    <label className="text-xs font-bold text-amber-700 uppercase flex items-center gap-1 mb-2"><Brain size={12}/> Comentário IA</label>
                                    <textarea value={q.explanation} onChange={e=>updateQuestionField(q.id,'explanation',e.target.value)} rows={3} className="w-full p-3 bg-white/50 border border-amber-200/50 rounded-lg text-slate-700 text-sm focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"/>
                                </div>
                            </div>

                            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
                                <button onClick={()=>handleDiscardOneClick(q)} className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-1"><Trash2 size={16}/> Descartar</button>
                                <button onClick={()=>approveQuestion(q)} className={`font-bold text-sm px-6 py-2.5 rounded-lg shadow-lg flex items-center gap-2 transition-all ${q.isDuplicate ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                                    {q.isDuplicate ? <Copy size={18}/> : <CheckCircle size={18}/>} 
                                    {q.isDuplicate ? 'Atualizar Duplicata' : 'Aprovar e Publicar'}
                                </button>
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
