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

// 1. Banco de Dados (Firestore) - CORRIGIDO: arrayUnion e arrayRemove adicionados aqui
import { 
  getFirestore, collection, addDoc, doc, getDoc, deleteDoc, onSnapshot, query, orderBy, setDoc, writeBatch, updateDoc, arrayUnion, arrayRemove 
} from "firebase/firestore";

// 2. Autenticação (Auth)
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "firebase/auth";

// 3. Arquivos (Storage) - CORRIGIDO: Removidos daqui
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

// --- HELPER: CLEAN INSTITUTION ---
const cleanInstitutionText = (inst) => {
    if (!inst) return "";
    const lower = inst.toString().toLowerCase();
    // Lista de termos que indicam "não informado" para serem limpos
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
// Tenta salvar o que for possível de um JSON cortado
const safeJsonParse = (jsonString) => {
    // 1. Limpeza básica
    let clean = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    clean = clean.replace(/[\u0000-\u0019]+/g, ""); 

    // 2. Encontrar inicio do array
    const startIndex = clean.indexOf('[');
    if (startIndex === -1) {
        // Tenta parsing direto caso não seja array
        try { return JSON.parse(clean); } catch(e) { 
            // Se falhar e não tiver array, tenta forçar como array vazio ou joga erro
            throw new Error("Formato inválido: JSON não encontrado."); 
        }
    }
    clean = clean.substring(startIndex);

    // 3. Tenta parse direto (Caminho Feliz)
    try {
        const parsed = JSON.parse(clean);
        if (!Array.isArray(parsed) && typeof parsed === 'object') return [parsed];
        return parsed;
    } catch (e) {
        console.warn("JSON quebrado detectado. Iniciando recuperação iterativa...", e.message);
        
        // 4. Estratégia de Recuperação Iterativa (Backtracking)
        let currentString = clean;
        let attempts = 0;
        const maxAttempts = 50; // Evita loop infinito

        while (currentString.length > 2 && attempts < maxAttempts) {
            attempts++;
            
            // Acha o último '}'
            const lastClose = currentString.lastIndexOf('}');
            
            if (lastClose === -1) {
                // Não tem mais objetos fechados, recuperação falhou total
                console.error("Recuperação falhou: nenhum objeto válido encontrado.");
                return []; // Retorna vazio para não travar o processo
            }
            
            // Tenta fechar o array ali
            const candidate = currentString.substring(0, lastClose + 1) + ']';
            
            try {
                const result = JSON.parse(candidate);
                console.log(`Recuperação com sucesso na tentativa ${attempts}! ${result.length} itens salvos de um JSON quebrado.`);
                return result;
            } catch (e2) {
                currentString = currentString.substring(0, lastClose);
            }
        }
        
        // Se saiu do loop, falhou. Retorna array vazio para continuar o fluxo.
        console.error("Falha total na recuperação do JSON após múltiplas tentativas.");
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
  
  // Gestão de Chaves API (Múltiplas)
  const [apiKeys, setApiKeys] = useState(() => JSON.parse(localStorage.getItem('gemini_api_keys') || '[]'));
  
  // Modelos - ATUALIZADO PARA PRO PADRÃO
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

  // Estado para loading de imagem individual
  const [uploadingImageId, setUploadingImageId] = useState(null);
  
  // --- Estado para Filtros Múltiplos ---
  const [activeFilters, setActiveFilters] = useState(['verified', 'source']); 
  const [filterLogic, setFilterLogic] = useState('AND'); // 'OR' (Soma) ou 'AND' (Restritivo)
  
  // Override States (Pré-definições)
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
  const [batchImages, setBatchImages] = useState([]); // { id, file, preview, status: 'pending'|'success'|'error', errorMsg }
  const [batchStatus, setBatchStatus] = useState('idle'); // idle, processing, pausing, paused
  const [batchLogs, setBatchLogs] = useState([]); // SEPARADO: Logs de imagens

  // --- PDF PROCESSING STATES ---
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfStatus, setPdfStatus] = useState('idle'); // idle, reading, ready, processing, pausing, paused, error, completed
  const [pdfChunks, setPdfChunks] = useState([]); 
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [processingLogs, setProcessingLogs] = useState([]);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  
  // PDF Range Inputs
  const [pdfStartPage, setPdfStartPage] = useState('');
  const [pdfEndPage, setPdfEndPage] = useState('');

  // --- SESSION STATE (ÚLTIMO PDF) - AGORA VEM DO DB ---
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
  
  // SYNC REF DO INDEX
  useEffect(() => { currentChunkIndexRef.current = currentChunkIndex; }, [currentChunkIndex]);

  // --- SYNC CHAVES API (GLOBAL SETTINGS) ---
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

              // Normaliza chaves e remove duplicatas no carregamento também
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

  // --- SYNC PROGRESSO DO PDF (POR USUÁRIO) ---
  useEffect(() => {
      if (!user) {
          setLastSessionData(null);
          return;
      }
      // Escuta mudanças em tempo real no documento de progresso do usuário
      const unsubscribe = onSnapshot(doc(db, "users", user.uid, "progress", "pdf_session"), (docSnap) => {
          if (docSnap.exists()) {
              setLastSessionData(docSnap.data());
          } else {
              setLastSessionData(null);
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
  // --- FUNÇÃO DE PESQUISA OTIMIZADA (Flash + Truncate) ---
  const searchQuestionSource = async (questionText) => {
      // 1. Trunca o texto para economizar tokens e focar no início da questão
      const searchPromptText = questionText.length > 400 
        ? questionText.substring(0, 400) + "..." 
        : questionText;

      return executeWithKeyRotation("Pesquisa Web", async (key) => {
          const systemPrompt = `Você é um verificador de questões de residência médica.

          Sua missão: Identificar a origem da questão usando a Pesquisa Google.

          CRITÉRIOS DE ESCOLHA:

          - Se a questão apareceu em múltiplas provas, escolha a ORIGINAL ou a MAIS RECENTE (priorize a prova principal sobre simulados).

          REGRAS DE FORMATAÇÃO DE NOME (CRÍTICO):

          - Resuma nomes longos para o formato: "UF - Nome Curto / Sigla".

          - Exemplo Ruim: "Secretaria da Saúde do Estado da Bahia (SESAB) - Processo Unificado"

          - Exemplo Bom: "BA - SUS Bahia"

          - Exemplo Bom: "SP - USP São Paulo"

          - Exemplo Bom: "Nacional - ENARE"



          SAÍDA OBRIGATÓRIA (JSON):

          {

            "institution": "Nome da Instituição Resumido (ou vazio se não achar)",

            "year": "Ano (apenas números, ou vazio se não achar)"

          }

          `;

          // 2. Força o modelo FLASH (Free Tier Friendly)
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
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

          if (!response.ok) throw new Error("Erro na API Search");
          
          const data = await response.json();
          let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
          try { return JSON.parse(jsonString); } 
          catch(e) { return { institution: "", year: "" }; }
      });
  };

  // --- LOGIC: VERIFICATION AGENT (DOUBLE CHECK) ---
  // --- LOGIC: VERIFICATION AGENT (AUDITORIA HÍBRIDA: RIGOROSA NOS FATOS, TOLERANTE NAS CONDUTAS) ---
  const verifyQuestionWithAI = async (questionData) => {
      return executeWithKeyRotation("Auditoria", async (key) => {
          // 1. Contexto da Banca (Jurisprudência)
          const contextBanca = questionData.institution 
            ? `PRIORIDADE MÁXIMA: Tente encontrar o entendimento específico da banca "${questionData.institution}" (${questionData.year || ''}).`
            : "Baseie-se na literatura médica de referência (Harrison, Cecil, Sabiston).";

          const verifyPrompt = `
            Você é um Auditor Sênior de Questões Médicas.
            Sua missão é validar se esta questão é SEGURA para um banco de dados de estudo.
            
            DADOS DA QUESTÃO:
            Banca: ${questionData.institution || "Não informada"}
            Enunciado: "${questionData.text}"
            Alternativas: ${JSON.stringify(questionData.options)}
            Gabarito Proposto: ${questionData.correctOptionId}
            Explicação: "${questionData.explanation}"
            
            PASSO A PASSO DA AUDITORIA:
            1. Use o Google Search para buscar a questão ou o tema médico.
            2. Aplique as REGRAS DE JULGAMENTO abaixo rigorosamente.

            REGRAS DE JULGAMENTO (HIERARQUIA DE DECISÃO):

            [NÍVEL 1: FATOS OBJETIVOS - TOLERÂNCIA ZERO]
            - Se a questão contém ERROS DE NÚMEROS (Doses, Artigos de Lei, Datas, Percentuais).
            - Se a questão cita FATOS ERRADOS (Ex: "Lei 8.080 é de 2025", "Fêmur é no braço").
            -> AÇÃO: REPROVE IMEDIATAMENTE ("isValid": false).
            -> MOTIVO: "Erro fatual grave".

            [NÍVEL 2: A JURISPRUDÊNCIA DA BANCA]
            - Se você encontrar essa questão em uma prova real da banca citada.
            - E o gabarito bater com o oficial da banca.
            -> AÇÃO: APROVE ("isValid": true). (A banca é soberana, mesmo que polêmica).

            [NÍVEL 3: CONDUTAS E ZONA CINZENTA - TOLERÂNCIA ALTA]
            - Se for questão de conduta ("Qual a melhor cirurgia?", "Qual o diagnóstico mais provável?").
            - E houver divergência na literatura (autores dizem coisas diferentes).
            - Se o gabarito proposto for defendido por PELO MENOS UMA corrente séria.
            -> AÇÃO: APROVE ("isValid": true).
            -> MOTIVO: "Divergência aceitável".

            [NÍVEL 4: "NA DÚVIDA"]
            - Se não achar nada específico e não for erro fatual.
            - Se a explicação fizer sentido fisiopatológico.
            -> AÇÃO: APROVE.
            
            SAÍDA OBRIGATÓRIA (JSON):
            {
                "isValid": boolean, 
                "reason": "Se false, explique o erro fatual ou a contradição absoluta. Se true, pode ser breve."
            }
          `;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: verifyPrompt }] }],
                tools: [{ google_search: {} }] 
            })
          });
          
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);

          let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          // Limpeza do JSON
          jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
          const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
          if (jsonMatch) jsonString = jsonMatch[0];

          return safeJsonParse(jsonString); 
      }).then(result => {
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
  
  // --- BATCH LOGS (SEPARADO) ---
  const addBatchLog = (type, message) => {
      const time = new Date().toLocaleTimeString();
      setBatchLogs(prev => [{ type, message, time }, ...prev].slice(0, 50));
  };

  // --- MUDANÇA 2: FUNÇÃO DE TOGGLE DO FILTRO ---
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

  // --- MUDANÇA 3: FILTRO COM LÓGICA 'OR' (SOMA) ---
  const getFilteredQuestions = () => {
    if (activeFilters.includes('all')) return parsedQuestions;
    
    return parsedQuestions.filter(q => {
      // Regra Global: Se for duplicata e o filtro de duplicata NÃO estiver ativo, esconde sempre
      if (!activeFilters.includes('duplicates') && q.isDuplicate) return false;

      // Define as condições baseadas nos filtros ativos
      // Mapeia cada filtro ativo para um booleano (se a questão atende aquele filtro específico)
      const results = activeFilters.map(filterKey => {
          if (filterKey === 'verified') return q.verificationStatus === 'verified';
          if (filterKey === 'suspicious') return q.verificationStatus === 'suspicious';
          if (filterKey === 'source') return !!q.sourceFound;
          if (filterKey === 'no_source') return !q.sourceFound;
          if (filterKey === 'duplicates') return !!q.isDuplicate;
          if (filterKey === 'needs_image') return !!q.needsImage; // NOVO
          return true; // Fallback
      });

      // Aplica a Lógica Selecionada
      if (filterLogic === 'AND') {
          // Lógica E: A questão precisa atender TODAS as condições dos filtros ativos
          return results.every(r => r === true);
      } else {
          // Lógica OU (Padrão): A questão precisa atender PELO MENOS UMA condição
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
      'needs_image': 'Requer Imagem' // NOVO LABEL
  };

  // --- UPLOAD MULTI-IMAGEM (COM PERMANÊNCIA NO FILTRO) ---
  const handleImageUploadToQuestion = async (e, idx, questionData) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploadingImageId(questionData.id);

      try {
          // 1. Otimiza
          const optimizedFile = await optimizeImageForWeb(file);
          
          // 2. Nome Único
          const timestamp = Date.now();
          const fileName = `${questionData.id}_${timestamp}.webp`;
          const storageRef = ref(storage, `questions_images/${fileName}`);
          
          // 3. Upload
          const snapshot = await uploadBytes(storageRef, optimizedFile);
          const downloadURL = await getDownloadURL(snapshot.ref);

          // 4. Atualiza Firestore (Adiciona ao array 'images')
          await updateDoc(doc(db, "draft_questions", questionData.id), {
              images: arrayUnion(downloadURL), 
              hasImage: true
              // REMOVIDO: needsImage: false (Assim ela não sai do filtro)
          });

          // 5. Atualiza Estado Local
          const newQ = [...parsedQuestions];
          if (newQ[idx]) {
              const currentImages = newQ[idx].images || [];
              newQ[idx].images = [...currentImages, downloadURL];
              newQ[idx].hasImage = true;
              // REMOVIDO: newQ[idx].needsImage = false; (Mantém o alerta visual)
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
          // Tenta apagar do Storage
          try {
              const fileRef = ref(storage, urlToDelete);
              await deleteObject(fileRef);
          } catch (e) { console.warn("Erro storage:", e); }

          // Remove do array no Firestore
          await updateDoc(doc(db, "draft_questions", questionData.id), {
              images: arrayRemove(urlToDelete)
          });

          // Atualiza Local
          const newQ = [...parsedQuestions];
          if (newQ[idx]) {
              newQ[idx].images = newQ[idx].images.filter(url => url !== urlToDelete);
              // Se zerou as imagens, marca hasImage false
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
          // LÓGICA DE PAUSA SUAVE
          setBatchStatus('pausing');
          addBatchLog('warning', 'Solicitando pausa... Aguardando a imagem atual finalizar.');
      } else if (currentStatus === 'paused' || currentStatus === 'idle') {
          setBatchStatus('processing');
          addBatchLog('info', 'Iniciando processamento de imagens...');
          batchProcessorRef.current = false; // Reset lock
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
      // Verifica Bloqueio
      if (batchProcessorRef.current) return;

      // Verifica Status e Pausa Suave
      const currentStatus = batchStatusRef.current;
      
      // Se estava pausando, agora efetiva a pausa
      if (currentStatus === 'pausing') {
          setBatchStatus('paused');
          addBatchLog('warning', 'Processamento pausado com segurança.');
          return;
      }

      if (currentStatus !== 'processing') return;

      // Encontra a próxima pendente
      const queue = batchImagesRef.current;
      const nextImg = queue.find(img => img.status === 'pending');

      if (!nextImg) {
          setBatchStatus('idle');
          addBatchLog('success', 'Fila de imagens finalizada!');
          showNotification('success', 'Todas as imagens foram processadas.');
          return;
      }

      batchProcessorRef.current = true; // Lock
      const ovr = overridesRef.current;
      const doDoubleCheck = doubleCheckRef.current; 
      const doWebSearch = webSearchRef.current; // Ler status do Web Search
      addBatchLog('info', `Processando imagem: ${nextImg.name}...`);

      try {
          // 1. Converter Base64
          const base64Data = await fileToBase64(nextImg.file);
          const activeThemesMap = ovr.overrideArea ? { [ovr.overrideArea]: themesMap[ovr.overrideArea] } : themesMap;

          // 2. Chamar IA (Geração)
          const questions = await executeWithKeyRotation("Imagem Batch", async (key) => {
              const systemPrompt = `
              Você é um especialista em banco de dados médicos (MedMaps).
              Analise o conteúdo e gere um JSON ESTRITO.
              
              CONTEXTO (Informacional):
              - Instituição: ${ovr.overrideInst ? ovr.overrideInst : "Não informado (Detectar do texto)"}
              - Ano: ${ovr.overrideYear ? ovr.overrideYear : "Não informado (Detectar do texto)"}

              REGRAS CRÍTICAS DE EXTRAÇÃO:
              1. LIMPEZA DE INÍCIO:
                 - Remova APENAS índices/rótulos de questão (ex: "1)", "159048)", "05.", "Questão 1:", "Enunciado:").
                 - MANTENHA números que fazem parte da frase (ex: "3 pacientes deram entrada...", "40 anos é a idade...").
                 - Exemplo: Se o texto for "15) 3 pacientes chegaram...", salve apenas "3 pacientes chegaram...".
                 - Comece o texto direto no conteúdo do caso clínico.

              2. SEPARAÇÃO DAS ALTERNATIVAS (IMPORTANTE):
                 - O campo "text" DEVE TERMINAR antes das alternativas.
                 - NUNCA inclua "A) ... B) ..." ou "a. ... b. ..." dentro do campo "text".
                 - Se o texto original for "Qual a conduta? A) Realizar X...", o campo "text" deve ser apenas "Qual a conduta?".
                 - As alternativas DEVEM ser extraídas separadamente no array "options".

              3. DETECÇÃO DE IMAGEM (LÓGICA CONTEXTUAL):
                 - O objetivo é detectar se a questão É IMPOSSÍVEL de responder sem ver o anexo.
                 
                 - MARQUE "needsImage": true SE:
                   * O texto MANDA olhar: "Vide figura", "Observe a imagem", "A figura abaixo", "Ver anexo".
                   * O texto DEPENDE do visual: "De acordo com o exame de imagem", "Baseado no ECG apresentado", "Pela análise da lâmina".
                   * O texto é vago sobre o resultado: "O Raio-X revela... (e não diz o que, forçando a olhar)", "Qual o diagnóstico da imagem?".

                 - MARQUE "needsImage": false SE (CASOS DE PEGADINHA):
                   * O texto já DESCREVE o resultado: "ECG normal", "Raio-X evidenciando fratura", "TC mostrou tumor".
                   * Apenas cita que o exame foi feito: "Foi solicitada tomografia", "Paciente trouxe ultrassom anterior".

                 - NO CASO ESPECÍFICO DO USUÁRIO: "De acordo com o caso descrito e com o exame de imagem" -> TRUE (Pois cria dependência explícita).

              4. CLASSIFICAÇÃO:
                 - Classifique usando a lista: ${JSON.stringify(activeThemesMap)}

              5. GABARITO:
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

              const data = await response.json();
              if (data.error) throw new Error(data.error.message);

              let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              
              // --- ALTERAÇÃO AQUI: TRAVA ANTI-DISCURSIVA ---
              const parsed = safeJsonParse(jsonString);
              // Só aceita se tiver options E se tiver 2 ou mais alternativas
              return parsed.filter(q => q.options && q.options.length >= 2);
          });

          // 3. Pós-Processamento e Pesquisa Web (NOVO - AGORA PARALELO)
         // --- PÓS-PROCESSAMENTO INTELIGENTE (ECONOMIA DE API) ---
          let processedQuestions = await Promise.all(questions.map(async (q) => {
              
              // 1. GERA O HASH PRIMEIRO (Antes de gastar API)
              const hashId = await generateQuestionHash(q.text);
              let isDuplicate = false;
              let oldData = null;

              // 2. CONSULTA O BANCO DE DADOS
              if (hashId) {
                  const existingDoc = await getDoc(doc(db, "questions", hashId));
                  if (existingDoc.exists()) {
                      isDuplicate = true;
                      oldData = existingDoc.data();
                  }
              }

              // 3. DECIDE SE EXECUTA AS IAs (Search + Audit)
              // Se for duplicata, PULA as APIs e economiza cota!
              const shouldRunAPIs = !isDuplicate; 

              let finalInst = q.institution;
              let finalYear = q.year;
              let sourceFound = false;
              let verificationStatus = 'unchecked';
              let verificationReason = '';

              if (shouldRunAPIs) {
                  // --- FLUXO NORMAL (Gasta API) ---
                  const doWebSearch = webSearchRef.current; 
                  const doDoubleCheck = doubleCheckRef.current; // (No processWithAI use isDoubleCheckEnabled direto)

                  // TASK A: SEARCH WEB
                  const searchPromise = (async () => {
                      if (doWebSearch && (!q.institution || !q.year)) {
                          try {
                              await new Promise(r => setTimeout(r, Math.random() * 1000));
                              return await searchQuestionSource(q.text);
                          } catch (err) { return null; }
                      }
                      return null;
                  })();

                  // TASK B: AUDIT
                  const auditPromise = (async () => {
                      if (doDoubleCheck) {
                          try {
                              await new Promise(r => setTimeout(r, Math.random() * 500)); 
                              return await verifyQuestionWithAI(q);
                          } catch (err) { return { status: 'unchecked', reason: 'Audit failed' }; }
                      }
                      return { status: 'unchecked', reason: '' };
                  })();

                  // WAIT FOR BOTH
                  const [searchResult, auditResult] = await Promise.all([searchPromise, auditPromise]);

                  // APLICA RESULTADOS
                  if (searchResult) {
                      if (searchResult.institution) { finalInst = searchResult.institution; sourceFound = true; }
                      if (searchResult.year) finalYear = searchResult.year;
                  }
                  verificationStatus = auditResult.status;
                  verificationReason = auditResult.reason;

              } else {
                  // --- FLUXO ECONÔMICO (Recupera do Banco) ---
                  if (oldData) {
                      finalInst = oldData.institution || q.institution;
                      finalYear = oldData.year || q.year;
                      sourceFound = oldData.sourceFound || false; // Mantém histórico se já achou fonte antes
                      
                      // Opcional: Se quiser re-auditar duplicatas, mude aqui.
                      // Mas para economia máxima, mantemos o status antigo:
                      verificationStatus = oldData.verificationStatus || 'unchecked';
                      verificationReason = oldData.verificationReason || 'Duplicata recuperada';
                  }
              }

              // APLICA OVERRIDES (Sempre vencem)
              const ovr = overridesRef.current || { overrideInst, overrideYear, overrideArea, overrideTopic }; // Fallback para processWithAI
              if (ovr.overrideInst) finalInst = ovr.overrideInst;
              if (ovr.overrideYear) finalYear = ovr.overrideYear;

              finalInst = cleanInstitutionText(finalInst);

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
          
          let newQuestionsForAudit = processedQuestions; 

          // 5. Salvar no Firestore
          for (const q of newQuestionsForAudit) {
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
          const errorMessage = error.message || "Erro desconhecido";
          
          if (errorMessage.includes("Quota exceeded") || errorMessage.includes("429")) {
              addBatchLog('warning', `Cota excedida. Aguardando 10s...`);
              setTimeout(() => {
                  batchProcessorRef.current = false;
                  processNextBatchImage(); // Tenta a mesma imagem de novo
              }, 10000);
          } else {
              addBatchLog('error', `Falha em ${nextImg.name}: ${errorMessage}`);
              setBatchImages(prev => prev.map(img => img.id === nextImg.id ? { ...img, status: 'error', errorMsg: errorMessage } : img));
              
              setTimeout(() => {
                  batchProcessorRef.current = false;
                  processNextBatchImage();
              }, 1000);
          }
      }
  };

  // --- LOGIC: PDF HANDLING (ATUALIZADO COM DOUBLE OVERLAP) ---
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
          
          // Lógica de Range de Páginas
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
          let lastPageContent = ""; // Variável para segurar o contexto da página anterior

          for (let i = startP; i <= endP; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const text = content.items.map(item => item.str).join(' ');
              
              lastPageContent = text; // Guarda para ser o "passado" da próxima fatia

              const pageTextFormatted = `\n--- PÁGINA ${i} ---\n${text}`;
              currentChunkText += pageTextFormatted;

              // Verifica se é hora de fatiar OU se é a última página selecionada
              if ((i - startP + 1) % CHUNK_SIZE === 0 || i === endP) {
                  
                  let finalChunkText = currentChunkText;

                  // --- OLHAR PARA O FUTURO (NEXT PAGE CONTEXT) ---
                  // Se não for a última página do intervalo selecionado, espia a próxima
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
                      text: finalChunkText, // Usa o texto com o futuro anexado
                      status: 'pending',
                      errorCount: 0
                  });
                  
                  // --- PREPARAR A PRÓXIMA FATIA (PREVIOUS PAGE CONTEXT) ---
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

          // --- LOGICA DE RESTAURAÇÃO DE PROGRESSO (VIA DB) ---
          // Verifica se o lastSessionData (vindo do DB) bate com o arquivo atual
          if (lastSessionData && lastSessionData.fileName === file.name) {
              const lastIdx = lastSessionData.lastChunkIndex;
              const nextIndex = lastIdx + 1; // PULA PARA A PRÓXIMA FATIA APÓS A SUCESSO

              if (nextIndex < chunks.length) {
                  setCurrentChunkIndex(nextIndex);
                  
                  // --- VISUAL FEEDBACK: MARCA AS FATIAS ANTERIORES COMO RESTAURADAS ---
                  for(let i = 0; i < nextIndex; i++) {
                      chunks[i].status = 'restored';
                  }

                  addLog('info', `Sessão encontrada no DB! Agulha movida para a fatia ${chunks[nextIndex].pages}.`);
                  showNotification('info', `Retomando ${file.name} a partir da fatia ${chunks[nextIndex].pages}.`);
              } else {
                  // Se já acabou
                  setCurrentChunkIndex(chunks.length - 1);
                  // Marca TUDO como restaurado
                  chunks.forEach(c => c.status = 'restored');
                  
                  addLog('success', `Este arquivo já foi finalizado na última sessão.`);
                  showNotification('success', 'Arquivo já finalizado anteriormente.');
              }
          } else {
              // ARQUIVO NOVO -> RESETA O DB PARA O NOVO ARQUIVO
              const newSession = {
                  fileName: file.name,
                  lastChunkIndex: -1, // Nada processado ainda
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
      
      // Reseta progresso no DB para este arquivo
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

  // --- NOVA LÓGICA DE NAVEGAÇÃO ("SEEK") ---
  const handleJumpToChunk = (index) => {
      if (pdfStatus === 'processing' || pdfStatus === 'idle' || pdfStatus === 'pausing' || pdfStatus === 'reading') return;
      
      const chunk = pdfChunks[index];
      addLog('info', `Agulha movida para fatia ${chunk.pages} (Aguardando Início)...`);
      
      // 1. Move a agulha para o índice clicado
      setCurrentChunkIndex(index);

      // 2. Força o status da fatia clicada para 'pending' (para reprocessar se quiser)
      //    Isso permite "tocar" o vídeo a partir daqui.
      setPdfChunks(prev => {
          const newChunks = [...prev];
          // Reseta APENAS a fatia atual para garantir que ela rode
          newChunks[index] = { ...newChunks[index], status: 'pending', errorCount: 0 };
          return newChunks;
      });
  };

  const processNextChunk = async () => {
      const currentStatus = pdfStatusRef.current;
      const currentChunks = pdfChunksRef.current;
      const doDoubleCheck = doubleCheckRef.current;
      const doWebSearch = webSearchRef.current; // LER CHAVE WEB SEARCH
      const ovr = overridesRef.current; 
      const currentFile = pdfFile; // Pega referência atual do arquivo
      // USA O REF PARA EVITAR CLOSURE STALE
      const activeIndex = currentChunkIndexRef.current;

      if (processorRef.current) return; 
      // Se estiver pausado ou erro e a função for chamada (ex: retry), ok.
      // Se estiver 'completed', para.
      if (currentStatus === 'completed') return;
      
      // --- LÓGICA DE VÍDEO PLAYER (LINEAR) ---
      // Não busca mais o "próximo pendente". Confia na agulha (activeIndex).
      
      if (activeIndex >= currentChunks.length) {
           setPdfStatus('completed');
           addLog('success', 'Processamento Completo!');
           showNotification('success', 'Todas as partes selecionadas foram processadas.');
           return;
      }

      const chunk = currentChunks[activeIndex];

      // Se não estiver 'pausing', garante que está 'processing'
      if (currentStatus !== 'pausing' && currentStatus !== 'processing') setPdfStatus('processing');
      
      processorRef.current = true; 

      // --- COMPORTAMENTO DE PLAYER: SEMPRE PROCESSA O QUE ESTIVER NA AGULHA ---
      // Mesmo se já foi "success" ou "restored", se a agulha está lá, processa de novo.
      addLog('info', `Processando fatia ${chunk.pages}...`);

      try {
          // --- CONSTRUÇÃO INTELIGENTE DO MAPA DE TEMAS E PROMPT ---
          const activeThemesMap = ovr.overrideArea ? { [ovr.overrideArea]: themesMap[ovr.overrideArea] } : themesMap;

          // USANDO ROTAÇÃO DE CHAVES PARA A GERAÇÃO PRINCIPAL
          const questions = await executeWithKeyRotation("Geração", async (key) => {
              const systemPrompt = `
              Você é um especialista em banco de dados médicos (MedMaps).
              Analise o conteúdo e gere um JSON ESTRITO.
              
              CONTEXTO (Informacional):
              - Instituição: ${ovr.overrideInst ? ovr.overrideInst : "Não informado (Detectar do texto)"}
              - Ano: ${ovr.overrideYear ? ovr.overrideYear : "Não informado (Detectar do texto)"}

              REGRAS CRÍTICAS DE EXTRAÇÃO:
              1. LIMPEZA DE INÍCIO:
                 - Remova APENAS índices/rótulos de questão (ex: "1)", "159048)", "05.", "Questão 1:", "Enunciado:").
                 - MANTENHA números que fazem parte da frase (ex: "3 pacientes deram entrada...", "40 anos é a idade...").
                 - Exemplo: Se o texto for "15) 3 pacientes chegaram...", salve apenas "3 pacientes chegaram...".
                 - Comece o texto direto no conteúdo do caso clínico.

              2. SEPARAÇÃO DAS ALTERNATIVAS (IMPORTANTE):
                 - O campo "text" DEVE TERMINAR antes das alternativas.
                 - NUNCA inclua "A) ... B) ..." ou "a. ... b. ..." dentro do campo "text".
                 - Se o texto original for "Qual a conduta? A) Realizar X...", o campo "text" deve ser apenas "Qual a conduta?".
                 - As alternativas DEVEM ser extraídas separadamente no array "options".

              3. DETECÇÃO DE IMAGEM:
                 - Analise se o enunciado cita ou DEPENDE de uma imagem/gráfico/ECG não presente.
                 - Termos: "Vide figura", "A imagem mostra", "Observe o ECG".
                 - Se precisar, marque "needsImage": true.

              4. CLASSIFICAÇÃO:
                 - Classifique usando a lista: ${JSON.stringify(activeThemesMap)}

              5. GABARITO:
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
                    contents: [{ parts: [{ text: systemPrompt + "\n\nTEXTO DO PDF:\n" + chunk.text }] }]
                })
              });

              const data = await response.json();
              if (data.error) throw new Error(data.error.message);

              let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              
              // --- ALTERAÇÃO AQUI: TRAVA ANTI-DISCURSIVA ---
              const parsed = safeJsonParse(jsonString);
              return parsed.filter(q => q.options && q.options.length >= 2);
          });

          // --- PÓS-PROCESSAMENTO (PESQUISA + LIMPEZA + AUDITORIA PARALELA) ---
          addLog('info', `Pós-processando ${questions.length} questões (Search + Audit)...`);

          // --- PÓS-PROCESSAMENTO INTELIGENTE (ECONOMIA DE API) ---
          let processedQuestions = await Promise.all(questions.map(async (q) => {
              
              // 1. GERA O HASH PRIMEIRO (Antes de gastar API)
              const hashId = await generateQuestionHash(q.text);
              let isDuplicate = false;
              let oldData = null;

              // 2. CONSULTA O BANCO DE DADOS
              if (hashId) {
                  const existingDoc = await getDoc(doc(db, "questions", hashId));
                  if (existingDoc.exists()) {
                      isDuplicate = true;
                      oldData = existingDoc.data();
                  }
              }

              // 3. DECIDE SE EXECUTA AS IAs (Search + Audit)
              // Se for duplicata, PULA as APIs e economiza cota!
              const shouldRunAPIs = !isDuplicate; 

              let finalInst = q.institution;
              let finalYear = q.year;
              let sourceFound = false;
              let verificationStatus = 'unchecked';
              let verificationReason = '';

              if (shouldRunAPIs) {
                  // --- FLUXO NORMAL (Gasta API) ---
                  const doWebSearch = webSearchRef.current; // (No processWithAI use isWebSearchEnabled direto)
                  const doDoubleCheck = doubleCheckRef.current; // (No processWithAI use isDoubleCheckEnabled direto)

                  // TASK A: SEARCH WEB
                  const searchPromise = (async () => {
                      if (doWebSearch && (!q.institution || !q.year)) {
                          try {
                              await new Promise(r => setTimeout(r, Math.random() * 1000));
                              return await searchQuestionSource(q.text);
                          } catch (err) { return null; }
                      }
                      return null;
                  })();

                  // TASK B: AUDIT
                  const auditPromise = (async () => {
                      if (doDoubleCheck) {
                          try {
                              await new Promise(r => setTimeout(r, Math.random() * 500)); 
                              return await verifyQuestionWithAI(q);
                          } catch (err) { return { status: 'unchecked', reason: 'Audit failed' }; }
                      }
                      return { status: 'unchecked', reason: '' };
                  })();

                  // WAIT FOR BOTH
                  const [searchResult, auditResult] = await Promise.all([searchPromise, auditPromise]);

                  // APLICA RESULTADOS
                  if (searchResult) {
                      if (searchResult.institution) { finalInst = searchResult.institution; sourceFound = true; }
                      if (searchResult.year) finalYear = searchResult.year;
                  }
                  verificationStatus = auditResult.status;
                  verificationReason = auditResult.reason;

              } else {
                  // --- FLUXO ECONÔMICO (Recupera do Banco) ---
                  if (oldData) {
                      finalInst = oldData.institution || q.institution;
                      finalYear = oldData.year || q.year;
                      sourceFound = oldData.sourceFound || false; // Mantém histórico se já achou fonte antes
                      
                      // Opcional: Se quiser re-auditar duplicatas, mude aqui.
                      // Mas para economia máxima, mantemos o status antigo:
                      verificationStatus = oldData.verificationStatus || 'unchecked';
                      verificationReason = oldData.verificationReason || 'Duplicata recuperada';
                  }
              }

              // APLICA OVERRIDES (Sempre vencem)
              const ovr = overridesRef.current || { overrideInst, overrideYear, overrideArea, overrideTopic }; // Fallback para processWithAI
              if (ovr.overrideInst) finalInst = ovr.overrideInst;
              if (ovr.overrideYear) finalYear = ovr.overrideYear;

              finalInst = cleanInstitutionText(finalInst);

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

          // --- SALVA O ÚLTIMO PROGRESSO NO DB (SOBRESCREVENDO SEMPRE) ---
          if (currentFile && currentFile.name && user) {
              const sessionData = {
                  fileName: currentFile.name,
                  lastChunkIndex: activeIndex, // Salva o índice que acabou de ser sucesso
                  lastChunkPages: chunk.pages,
                  timestamp: new Date().toISOString()
              };
              setDoc(doc(db, "users", user.uid, "progress", "pdf_session"), sessionData)
                .catch(err => console.error("Erro ao salvar progresso no DB:", err));
          }

          // --- VERIFICAÇÃO DE PAUSA NO FINAL DO CICLO ---
          if (pdfStatusRef.current === 'pausing') {
              setPdfStatus('paused');
              addLog('warning', 'Pausa solicitada. Ciclo atual concluído e salvo.');
              processorRef.current = false;
              return; // PARA A RECURSÃO AQUI
          }

          // Se estiver pausado ou idle por outro motivo
          if (pdfStatusRef.current === 'paused' || pdfStatusRef.current === 'idle') {
              processorRef.current = false;
              return;
          }

          // MOVER A AGULHA E CONTINUAR
          setCurrentChunkIndex(prev => prev + 1);
          setTimeout(() => {
              processorRef.current = false; 
              processNextChunk(); 
          }, 500); 

      } catch (error) {
          console.error(error);
          const errorMessage = error.message || "";
          const retrySeconds = extractRetryTime(errorMessage);
          
          let delay = 3000;

          if (errorMessage.includes("Quota exceeded") || errorMessage.includes("429")) {
              if (retrySeconds) {
                  delay = (retrySeconds * 1000) + 2000; 
                  addLog('warning', `Todas as chaves esgotadas. Aguardando ${Math.ceil(retrySeconds)}s...`);
              } else {
                  delay = 60000; 
                  addLog('warning', `Todas as chaves esgotadas. Aguardando 60s...`);
              }
          } else if (errorMessage.includes("API key expired")) {
              setPdfStatus('paused');
              addLog('error', `ERRO CRÍTICO: Chaves API Inválidas! Pausado.`);
              showNotification('error', 'Chaves API Inválidas.');
              processorRef.current = false;
              return; 
          } else {
              const newErrorCount = chunk.errorCount + 1;
              delay = 3000 * Math.pow(2, newErrorCount);
              
              if (newErrorCount >= 3) {
                  addLog('error', `Fatia ${chunk.pages} marcada com ERRO APÓS 3 TENTATIVAS.`);
                  setPdfChunks(prev => {
                      const newChunks = [...prev];
                      newChunks[activeIndex] = { ...newChunks[activeIndex], status: 'error', errorCount: newErrorCount };
                      return newChunks;
                  });
                  setConsecutiveErrors(0);
                  processorRef.current = false;
                  
                  // Tenta a próxima fatia mesmo com erro nesta?
                  // O usuário pediu comportamento linear. Se falhar 3x, marca erro e avança.
                  setCurrentChunkIndex(prev => prev + 1);
                  setTimeout(() => processNextChunk(), 1000); 
                  return;
              }
          }

          const newConsecutiveErrors = consecutiveErrors + 1;
          setConsecutiveErrors(newConsecutiveErrors);

          if (newConsecutiveErrors >= 10) { 
              setPdfStatus('paused'); 
              addLog('error', 'PAUSADO: Muitos erros consecutivos.');
              processorRef.current = false;
              return; 
          }

          // Se deu erro, mas o usuário pediu pausa, vamos respeitar a pausa
          if (pdfStatusRef.current === 'pausing') {
              setPdfStatus('paused');
              addLog('warning', 'Pausa solicitada durante erro. Sistema pausado.');
              processorRef.current = false;
              return;
          }

          setPdfChunks(prev => {
              const newChunks = [...prev];
              newChunks[activeIndex] = { ...newChunks[activeIndex], status: 'pending' };
              return newChunks;
          });

          // Tenta a MESMA fatia de novo (retry)
          setTimeout(() => {
              processorRef.current = false;
              processNextChunk();
          }, delay);
      }
  };

  const togglePdfProcessing = () => {
      const currentStatus = pdfStatusRef.current;
      if (currentStatus === 'processing') {
          // EM VEZ DE PAUSED DIRETO, VAI PARA PAUSING
          setPdfStatus('pausing');
          addLog('warning', 'Solicitando pausa... Aguardando conclusão da fatia atual.');
      } else if (currentStatus === 'paused' || currentStatus === 'ready') {
          // ADICIONADO 'ready' PARA O BOTÃO INICIAR FUNCIONAR
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

  const handleGetKey = () => { window.open('https://aistudio.google.com/app/api-keys', '_blank'); setShowTutorial(true); };
  const handleModelChange = (modelName) => { setSelectedModel(modelName); localStorage.setItem('gemini_model', modelName); };
  const showNotification = (type, text) => { setNotification({ type, text }); };
  const closeNotification = () => { setNotification(null); };
  const handleLogout = () => { signOut(auth); setParsedQuestions([]); setActiveTab('input'); };

  // --- IMAGEM ÚNICA (AGORA REDUNDANTE MAS NECESSÁRIA PARA O TAB INPUT)
  // Mas como removemos a tab, podemos remover esses handlers ou adaptar se quiseres manter texto
  
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
    const doWebSearch = isWebSearchEnabled;

    try {
        const activeThemesMap = ovr.overrideArea ? { [ovr.overrideArea]: themesMap[ovr.overrideArea] } : themesMap;

        const questions = await executeWithKeyRotation("Processamento Único", async (key) => {
            const systemPrompt = `
              Você é um especialista em banco de dados médicos (MedMaps).
              Analise o conteúdo e gere um JSON ESTRITO.
              
              CONTEXTO (Informacional):
              - Instituição: ${ovr.overrideInst ? ovr.overrideInst : "Não informado (Detectar do texto)"}
              - Ano: ${ovr.overrideYear ? ovr.overrideYear : "Não informado (Detectar do texto)"}

              REGRAS CRÍTICAS DE EXTRAÇÃO:
              1. LIMPEZA DE INÍCIO:
                 - Remova APENAS índices/rótulos de questão (ex: "1)", "159048)", "05.", "Questão 1:", "Enunciado:").
                 - MANTENHA números que fazem parte da frase (ex: "3 pacientes deram entrada...", "40 anos é a idade...").
                 - Exemplo: Se o texto for "15) 3 pacientes chegaram...", salve apenas "3 pacientes chegaram...".
                 - Comece o texto direto no conteúdo do caso clínico.

              2. SEPARAÇÃO DAS ALTERNATIVAS (IMPORTANTE):
                 - O campo "text" DEVE TERMINAR antes das alternativas.
                 - NUNCA inclua "A) ... B) ..." ou "a. ... b. ..." dentro do campo "text".
                 - Se o texto original for "Qual a conduta? A) Realizar X...", o campo "text" deve ser apenas "Qual a conduta?".
                 - As alternativas DEVEM ser extraídas separadamente no array "options".

              3. DETECÇÃO DE IMAGEM:
                 - Analise se o enunciado cita ou DEPENDE de uma imagem/gráfico/ECG não presente.
                 - Termos: "Vide figura", "A imagem mostra", "Observe o ECG".
                 - Se precisar, marque "needsImage": true.

              4. CLASSIFICAÇÃO:
                 - Classifique usando a lista: ${JSON.stringify(activeThemesMap)}

              5. GABARITO:
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
            
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            
            // --- ALTERAÇÃO AQUI: TRAVA ANTI-DISCURSIVA ---
            const parsed = safeJsonParse(jsonString);
            return parsed.filter(q => q.options && q.options.length >= 2);
        });

        // --- PÓS-PROCESSAMENTO PARALELO (NOVO) ---
        showNotification('info', `Pós-processando ${questions.length} questões...`);

       // --- PÓS-PROCESSAMENTO INTELIGENTE (ECONOMIA DE API) ---
          let processedQuestions = await Promise.all(questions.map(async (q) => {
              
              // 1. GERA O HASH PRIMEIRO (Antes de gastar API)
              const hashId = await generateQuestionHash(q.text);
              let isDuplicate = false;
              let oldData = null;

              // 2. CONSULTA O BANCO DE DADOS
              if (hashId) {
                  const existingDoc = await getDoc(doc(db, "questions", hashId));
                  if (existingDoc.exists()) {
                      isDuplicate = true;
                      oldData = existingDoc.data();
                  }
              }

              // 3. DECIDE SE EXECUTA AS IAs (Search + Audit)
              // Se for duplicata, PULA as APIs e economiza cota!
              const shouldRunAPIs = !isDuplicate; 

              let finalInst = q.institution;
              let finalYear = q.year;
              let sourceFound = false;
              let verificationStatus = 'unchecked';
              let verificationReason = '';

              if (shouldRunAPIs) {
                  // --- FLUXO NORMAL (Gasta API) ---
                  const doWebSearch = webSearchRef.current; // (No processWithAI use isWebSearchEnabled direto)
                  const doDoubleCheck = doubleCheckRef.current; // (No processWithAI use isDoubleCheckEnabled direto)

                  // TASK A: SEARCH WEB
                  const searchPromise = (async () => {
                      if (doWebSearch && (!q.institution || !q.year)) {
                          try {
                              await new Promise(r => setTimeout(r, Math.random() * 1000));
                              return await searchQuestionSource(q.text);
                          } catch (err) { return null; }
                      }
                      return null;
                  })();

                  // TASK B: AUDIT
                  const auditPromise = (async () => {
                      if (doDoubleCheck) {
                          try {
                              await new Promise(r => setTimeout(r, Math.random() * 500)); 
                              return await verifyQuestionWithAI(q);
                          } catch (err) { return { status: 'unchecked', reason: 'Audit failed' }; }
                      }
                      return { status: 'unchecked', reason: '' };
                  })();

                  // WAIT FOR BOTH
                  const [searchResult, auditResult] = await Promise.all([searchPromise, auditPromise]);

                  // APLICA RESULTADOS
                  if (searchResult) {
                      if (searchResult.institution) { finalInst = searchResult.institution; sourceFound = true; }
                      if (searchResult.year) finalYear = searchResult.year;
                  }
                  verificationStatus = auditResult.status;
                  verificationReason = auditResult.reason;

              } else {
                  // --- FLUXO ECONÔMICO (Recupera do Banco) ---
                  if (oldData) {
                      finalInst = oldData.institution || q.institution;
                      finalYear = oldData.year || q.year;
                      sourceFound = oldData.sourceFound || false; // Mantém histórico se já achou fonte antes
                      
                      // Opcional: Se quiser re-auditar duplicatas, mude aqui.
                      // Mas para economia máxima, mantemos o status antigo:
                      verificationStatus = oldData.verificationStatus || 'unchecked';
                      verificationReason = oldData.verificationReason || 'Duplicata recuperada';
                  }
              }

              // APLICA OVERRIDES (Sempre vencem)
              const ovr = overridesRef.current || { overrideInst, overrideYear, overrideArea, overrideTopic }; // Fallback para processWithAI
              if (ovr.overrideInst) finalInst = ovr.overrideInst;
              if (ovr.overrideYear) finalYear = ovr.overrideYear;

              finalInst = cleanInstitutionText(finalInst);

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
            // USA HASH COMO ID
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
      // Aplica a TODOS os itens filtrados ou a lista completa? 
      // Por consistência com a nova lógica, aplica aos filtrados.
      const targetQuestions = getFilteredQuestions();
      if (targetQuestions.length === 0) return;
      
      // SUBSTITUIÇÃO DO WINDOW CONFIRM PELO MODAL
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
      
      // --- ALTERAÇÃO AQUI: CONTA TUDO, INCLUINDO DUPLICATAS ---
      // Antes: const count = targetQuestions.filter(q => !q.isDuplicate).length;
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

      // --- LOGICA PARA LIMPEZA DE CAMPOS (NOVO - FILTRADO) ---
      if (type === 'clear_institution' || type === 'clear_year') {
          const field = type === 'clear_institution' ? 'institution' : 'year';
          const targetQuestions = getFilteredQuestions();
          
          // Atualiza localmente (apenas os filtrados)
          const updated = parsedQuestions.map(q => {
              // Se a questão está no filtro, limpa. Se não, mantem.
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
                  // --- ALTERAÇÃO AQUI: NÃO PULA MAIS AS DUPLICATAS ---
                  // if (q.isDuplicate) continue; 

                  const { id, status, createdAt, createdBy, verificationStatus, verificationReason, isDuplicate, hashId, sourceFound, ...finalData } = q;
                  if (q.area && q.topic && q.text) {
                     // setDoc vai SOBRESCREVER se já existir (id = hash)
                     await setDoc(doc(db, "questions", id), { 
                         ...finalData, 
                         updatedAt: new Date().toISOString(), 
                         approvedBy: user.email, 
                         // REMOVIDO: hasImage: false (Correção do Bug) 
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
    // --- ALTERAÇÃO AQUI: PERMITIR APROVAR INDIVIDUALMENTE DUPLICATAS ---
    /*
    if (q.isDuplicate) {
        return showNotification('error', 'Esta questão já existe no banco de dados (Duplicata).');
    }
    */

    if (!q.area || !q.topic || !q.text || !q.options || q.options.length < 2) {
      return showNotification('error', 'Preencha os campos obrigatórios.');
    }
    try {
      const { id, status, createdAt, createdBy, verificationStatus, verificationReason, isDuplicate, hashId, sourceFound, ...finalData } = q;
      
      // Garante o ID e Atualiza se existir
      await setDoc(doc(db, "questions", id), {
        ...finalData,
        updatedAt: new Date().toISOString(), // Marca atualização
        approvedBy: user.email,
        // REMOVIDO: hasImage: false (Correção do Bug)
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

  const updateQuestionField = (idx, field, val) => {
      const newQ = [...parsedQuestions];
      newQ[idx][field] = val;
      setParsedQuestions(newQ);
  };
  const updateOptionText = (qIdx, optIdx, val) => {
      const newQ = [...parsedQuestions];
      newQ[qIdx].options[optIdx].text = val;
      setParsedQuestions(newQ);
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
            
            {/* TOGGLE WEB SEARCH */}
            <div 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all border ${isWebSearchEnabled ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                title="A IA vai pesquisar no Google a origem de cada questão"
            >
                {isWebSearchEnabled ? <ToggleRight size={24} className="text-teal-600"/> : <ToggleLeft size={24}/>}
                <span className="text-sm font-bold whitespace-nowrap flex items-center gap-1">
                    {isWebSearchEnabled ? <Globe size={16}/> : null}
                    Busca Web (Bancas)
                </span>
            </div>

            {/* TOGGLE DOUBLE CHECK */}
            <div 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all border ${isDoubleCheckEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                onClick={() => setIsDoubleCheckEnabled(!isDoubleCheckEnabled)}
                title="A IA vai auditar cada questão gerada (Double Check)"
            >
                {isDoubleCheckEnabled ? <ToggleRight size={24} className="text-indigo-600"/> : <ToggleLeft size={24}/>}
                <span className="text-sm font-bold whitespace-nowrap flex items-center gap-1">
                    {isDoubleCheckEnabled ? <ShieldCheck size={16}/> : null}
                    Auditoria IA {isDoubleCheckEnabled ? 'ON' : 'OFF'}
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

        {/* INPUT TABS (TEXTO ÚNICO) */}
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
                        {/* QUEUE GRID */}
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

                        {/* CONSOLE / LOGS */}
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
                    
                    {/* DROPZONE PDF */}
                    {pdfStatus === 'idle' && (
                        <div className="space-y-4">
                             {/* LAST SESSION INFO BOX */}
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

                             {/* RANGE INPUTS */}
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

                    {/* PDF PROGRESS UI */}
                    {pdfStatus !== 'idle' && (
                        <div className="space-y-6">
                            {/* STATUS BAR */}
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

                            {/* GRID DE CHUNKS */}
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

                            {/* TERMINAL DE LOGS DO PDF */}
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

        {/* REVIEW TAB (ATUALIZADA COM FILTROS MÚLTIPLOS) */}
        {activeTab === 'review' && (
            <div className="max-w-4xl mx-auto space-y-4">
                {parsedQuestions.length > 0 && (
                    /* --- BARRA DE FERRAMENTAS (NOVO LAYOUT) --- */
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-4 sticky top-20 z-10">
                        
                        {/* Linha 1: Filtros */}
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Filter size={12}/> Filtros Ativos</span>
                                
                                {/* --- NOVO: SWITCH DE LÓGICA --- */}
                                <button 
                                    onClick={() => setFilterLogic(prev => prev === 'OR' ? 'AND' : 'OR')}
                                    className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center gap-1 transition-all ${filterLogic === 'AND' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                                    title={filterLogic === 'AND' ? "Mostra questões que têm TODAS as características" : "Mostra questões que têm QUALQUER uma das características"}
                                >
                                    {filterLogic === 'AND' ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                                    Lógica: {filterLogic === 'AND' ? 'E (Restritivo)' : 'OU (Soma)'}
                                </button>
                                {/* ------------------------------ */}

                                <span className="text-xs text-gray-400">{currentFilteredList.length} questões</span>
                            </div>
                            
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {/* ... MANTENHA OS BOTÕES DE FILTRO EXISTENTES AQUI ... */}
                                <button onClick={() => toggleFilter('all')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${activeFilters.includes('all') ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}>Todas</button>
                                <button onClick={() => toggleFilter('verified')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border flex items-center gap-1 transition-all ${activeFilters.includes('verified') ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}><ShieldCheck size={14}/> Verificadas</button>
                                <button onClick={() => toggleFilter('source')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border flex items-center gap-1 transition-all ${activeFilters.includes('source') ? 'bg-teal-100 text-teal-700 border-teal-200' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}><Globe size={14}/> Com Fonte</button>
                                <button onClick={() => toggleFilter('no_source')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border flex items-center gap-1 transition-all ${activeFilters.includes('no_source') ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}><AlertOctagon size={14}/> Sem Fonte</button>
                                <button onClick={() => toggleFilter('suspicious')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border flex items-center gap-1 transition-all ${activeFilters.includes('suspicious') ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}><AlertTriangle size={14}/> Suspeitas</button>
                                <button onClick={() => toggleFilter('duplicates')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border flex items-center gap-1 transition-all ${activeFilters.includes('duplicates') ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}><Copy size={14}/> Duplicadas</button>
                                <button onClick={() => toggleFilter('needs_image')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border flex items-center gap-1 transition-all ${activeFilters.includes('needs_image') ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}><ImageIcon size={14}/> Requer Imagem</button>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100 w-full"></div>

                        {/* Linha 2: Ações */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                                <button onClick={() => clearAllField('institution')} className="text-xs bg-white border border-gray-200 text-slate-500 px-3 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-medium flex items-center gap-1 shadow-sm whitespace-nowrap"><Eraser size={14}/> Limpar Inst.</button>
                                <button onClick={() => clearAllField('year')} className="text-xs bg-white border border-gray-200 text-slate-500 px-3 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-medium flex items-center gap-1 shadow-sm whitespace-nowrap"><Eraser size={14}/> Limpar Anos</button>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button onClick={handleDiscardFilteredClick} disabled={isBatchAction || currentFilteredList.length === 0} className="flex-1 sm:flex-none bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap shadow-sm">
                                    <Trash2 size={16} /> Descartar {currentFilteredList.length}
                                </button>
                                
                                <button onClick={handleApproveFilteredClick} disabled={isBatchAction || currentFilteredList.length === 0} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0">
                                    {isBatchAction ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16} />} 
                                    Aprovar {currentFilteredList.length}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

               {/* --- LISTAGEM DAS QUESTÕES (MODIFICADO) --- */}
                {currentFilteredList.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Database size={64} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-xl font-medium text-gray-500">Nenhuma questão encontrada neste filtro.</p>
                        {parsedQuestions.length === 0 && <button onClick={() => setActiveTab('input')} className="mt-4 text-blue-600 font-bold hover:underline">Adicionar novas</button>}
                    </div>
                ) : (
                    currentFilteredList.map((q, idx) => (
                        <div key={q.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden relative group transition-colors ${q.isDuplicate ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200'}`}>
                            
                            {/* Loading Bar Visual */}
                            <div className="h-1.5 w-full bg-gray-100"><div className="h-full bg-orange-400 w-full animate-pulse"></div></div>
                            
                            {/* --- NOVA BARRA DE CABEÇALHO (SUBSTITUI AS TAGS FLUTUANTES) --- */}
                            {/* Isso resolve o problema de sobreposição. As tags ficam numa linha dedicada. */}
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-end items-center gap-2 flex-wrap min-h-[40px]">
                                
                                {/* Tag: Status de Verificação (Com TRUNCATE para não quebrar) */}
                                <div 
                                    className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 max-w-[250px] ${q.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-700' : q.verificationStatus === 'suspicious' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}
                                    title={q.verificationReason || "Status da verificação"}
                                >
                                    {q.verificationStatus === 'verified' && <><ShieldCheck size={12} className="flex-shrink-0"/> Double-Checked</>}
                                    {q.verificationStatus === 'suspicious' && <><ShieldAlert size={12} className="flex-shrink-0"/> <span className="truncate">Suspeita: {q.verificationReason}</span></>}
                                    {(!q.verificationStatus || q.verificationStatus === 'unchecked') && 'Não Verificada'}
                                </div>
                                
                                {/* Tag: Fonte Encontrada */}
                                {q.sourceFound && (
                                    <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                                        <Globe size={12}/> FONTE OK
                                    </div>
                                )}

                                {/* Tag: Duplicada */}
                                {q.isDuplicate && (
                                    <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 animate-pulse">
                                        <Copy size={12}/> DUPLICADA
                                    </div>
                                )}

                                {/* Tag: Precisa de Imagem (NOVO) */}
                                {q.needsImage && (
                                    <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 animate-pulse border border-purple-200">
                                        <ImageIcon size={12}/> REQUER IMAGEM
                                    </div>
                                )}
                            </div>

                            <div className="p-6">
                                {/* METADATA FIELDS */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Inst</label><input value={q.institution} onChange={e=>updateQuestionField(idx,'institution',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"/></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Ano</label><input type="number" value={q.year} onChange={e=>updateQuestionField(idx,'year',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"/></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Área</label><select value={q.area} onChange={e=>updateQuestionField(idx,'area',e.target.value)} className="w-full p-2 bg-blue-50 border border-blue-100 rounded-lg text-sm font-bold text-blue-800"><option value="">Selecione...</option>{areasBase.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Tópico</label><select value={q.topic} onChange={e=>updateQuestionField(idx,'topic',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"><option value="">Selecione...</option>{(themesMap[q.area]||[]).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                                </div>

                                {/* QUESTION CONTENT */}
                                <div className="mb-6"><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Enunciado</label><textarea value={q.text} onChange={e=>updateQuestionField(idx,'text',e.target.value)} rows={4} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"/></div>

                            {/* --- ÁREA DA GALERIA DE IMAGENS --- */}
                            <div className="mb-6 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <ImageIcon size={12}/> Galeria de Imagens ({q.images?.length || 0})
                                    </label>
                                    {uploadingImageId === q.id && <span className="text-xs text-blue-600 animate-pulse font-bold flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Enviando...</span>}
                                </div>
                                
                                <div className="flex flex-wrap gap-3 items-start">
                                    {/* LISTA DE IMAGENS EXISTENTES */}
                                    {q.images?.map((imgUrl, i) => (
                                        <div key={i} className="relative group w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-lg border border-gray-200 shadow-sm flex-shrink-0">
                                            <img src={imgUrl} alt={`Img ${i}`} className="w-full h-full object-cover rounded-lg" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                                                <a href={imgUrl} target="_blank" rel="noreferrer" className="text-white hover:text-blue-300"><ExternalLink size={16}/></a>
                                                <button onClick={() => deleteImageFromQuestion(idx, q, imgUrl)} className="text-white hover:text-red-400"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* BOTÃO DE ADICIONAR (SEMPRE VISÍVEL) */}
                                    <label className={`cursor-pointer w-24 h-24 sm:w-32 sm:h-32 bg-white hover:bg-blue-50 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 transition-all ${uploadingImageId === q.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <UploadCloud size={24}/>
                                        <span className="text-[10px] font-bold uppercase">Adicionar</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUploadToQuestion(e, idx, q)} disabled={uploadingImageId === q.id}/>
                                    </label>
                                </div>
                                
                                {q.needsImage && (!q.images || q.images.length === 0) && (
                                    <p className="mt-2 text-xs text-purple-600 flex items-center gap-1 animate-pulse font-bold"><AlertCircle size={12}/> Esta questão pede imagem!</p>
                                )}
                            </div>
                              
                                <div className="space-y-2 mb-6">
                                    {q.options?.map((opt, optIdx) => (
                                        <div key={opt.id} className="flex items-center gap-3">
                                            <div onClick={()=>updateQuestionField(idx,'correctOptionId',opt.id)} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer font-bold text-sm flex-shrink-0 ${q.correctOptionId===opt.id?'bg-emerald-500 text-white':'bg-gray-100 text-gray-400'}`}>{opt.id.toUpperCase()}</div>
                                            <input value={opt.text} onChange={e=>updateOptionText(idx,optIdx,e.target.value)} className={`w-full p-2 border rounded-lg text-sm ${q.correctOptionId===opt.id?'border-emerald-200 bg-emerald-50':'bg-white'}`}/>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                    <label className="text-xs font-bold text-amber-700 uppercase flex items-center gap-1 mb-2"><Brain size={12}/> Comentário IA</label>
                                    <textarea value={q.explanation} onChange={e=>updateQuestionField(idx,'explanation',e.target.value)} rows={3} className="w-full p-3 bg-white/50 border border-amber-200/50 rounded-lg text-slate-700 text-sm focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"/>
                                </div>
                            </div>

                            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
                                <button onClick={()=>handleDiscardOneClick(q)} className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-1"><Trash2 size={16}/> Descartar</button>
                                
                                {/* --- BOTÃO DE APROVAÇÃO UNIFICADO (FIX: Desbloqueado para Duplicadas) --- */}
                                <button 
                                    onClick={()=>approveQuestion(q)} 
                                    className={`font-bold text-sm px-6 py-2.5 rounded-lg shadow-lg flex items-center gap-2 transition-all ${q.isDuplicate ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                                >
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
