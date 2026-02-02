import React, { useState, useEffect, useRef } from 'react';
import { 
  Map, Save, Trash2, Settings, CheckCircle, 
  AlertCircle, FileText, Database, 
  Loader2, Wand2, Cpu, RefreshCw, User, X,
  LogOut, Send, Brain, Image as ImageIcon, UploadCloud, Lock, CloudLightning, ArrowLeft,
  AlertTriangle, ExternalLink, Key, Play, Pause, AlertOctagon, Terminal, ShieldCheck, ShieldAlert, 
  ToggleLeft, ToggleRight, Layers, Filter, Eraser, RefreshCcw, XCircle, RotateCcw, Copy,
  SkipForward, BookOpen, Clock, Images
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
        className={`${positionClass} z-[100] p-4 rounded-xl shadow-xl flex items-start gap-3 animate-in slide-in-from-right-10 duration-300 max-w-sm border transition-all ${notification.type === 'error' ? 'bg-white border-red-200 text-red-700' : notification.type === 'warning' ? 'bg-white border-amber-200 text-amber-700' : 'bg-white border-emerald-200 text-emerald-700'}`}
    >
        <div className={`mt-0.5 p-1 rounded-full ${notification.type === 'error' ? 'bg-red-100' : notification.type === 'warning' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            {notification.type === 'error' ? <AlertCircle size={20} /> : notification.type === 'warning' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
        </div>
        <div className="flex-1">
            <p className="font-bold text-sm mb-1">{notification.type === 'error' ? 'Erro' : notification.type === 'warning' ? 'Atenção' : 'Sucesso'}</p>
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
  // const [selectedImage, setSelectedImage] = useState(null); // REMOVIDO: Unificado no batch
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBatchAction, setIsBatchAction] = useState(false); 
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('input');
  const [notification, setNotification] = useState(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [isDoubleCheckEnabled, setIsDoubleCheckEnabled] = useState(false); 
  
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
  const overridesRef = useRef({ overrideInst, overrideYear, overrideArea, overrideTopic });

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
  useEffect(() => { overridesRef.current = { overrideInst, overrideYear, overrideArea, overrideTopic }; }, [overrideInst, overrideYear, overrideArea, overrideTopic]);

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

  // --- LOGIC: VERIFICATION AGENT (DOUBLE CHECK) ---
  const verifyQuestionWithAI = async (questionData) => {
      return executeWithKeyRotation("Auditoria", async (key) => {
          const verifyPrompt = `
            Você é um Auditor Sênior de Questões Médicas.
            Analise a questão abaixo gerada por uma IA.
            
            QUESTÃO:
            Enunciado: ${questionData.text}
            Alternativas: ${JSON.stringify(questionData.options)}
            Gabarito Indicado: ${questionData.correctOptionId}
            Comentário Gerado: ${questionData.explanation}
            
            TAREFA:
            Verifique se a questão é medicamente correta, se o gabarito faz sentido e se não há alucinações graves.
            
            Retorne APENAS um JSON:
            {
                "isValid": boolean (true se aceitável, false se tiver erro grave/alucinação),
                "reason": "Explicação curta se for false"
            }
          `;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: verifyPrompt }] }] })
          });
          
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);

          let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
          const result = JSON.parse(jsonString);
          
          return {
              status: result.isValid ? 'verified' : 'suspicious',
              reason: result.reason || (result.isValid ? "Verificado por IA" : "Inconsistência detectada")
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
      const doDoubleCheck = doubleCheckRef.current; // Ler status do Double Check
      addBatchLog('info', `Processando imagem: ${nextImg.name}...`);

      try {
          // 1. Converter Base64
          const base64Data = await fileToBase64(nextImg.file);
          const activeThemesMap = ovr.overrideArea ? { [ovr.overrideArea]: themesMap[ovr.overrideArea] } : themesMap;

          // 2. Chamar IA (Geração)
          const questions = await executeWithKeyRotation("Imagem Batch", async (key) => {
              const systemPrompt = `
                Você é um especialista em banco de dados médicos (MedMaps).
                Analise esta imagem (print de questão médica).
                Extraia questões no formato JSON ESTRITO.
                
                CONTEXTO (Informacional):
                - Instituição: ${ovr.overrideInst ? ovr.overrideInst : "Não informado (Detectar da imagem)"}
                - Ano: ${ovr.overrideYear ? ovr.overrideYear : "Não informado (Detectar da imagem)"}

                REGRAS:
                1. Retorne APENAS o JSON (sem markdown).
                2. CLASSIFICAÇÃO (OBRIGATÓRIO):
                   - Classifique CADA questão usando a lista abaixo.
                   - LISTA VÁLIDA: ${JSON.stringify(activeThemesMap)}
                3. GABARITO E COMENTÁRIO: 
                   - Tente encontrar o gabarito visual na imagem. Se não houver, RESOLVA a questão.
                   - Gere sempre um campo "explanation".
                
                Formato Saída:
                [
                  {
                    "institution": "String", "year": Number|String, "area": "String", "topic": "String",
                    "text": "String", "options": [{"id": "a", "text": "String"}],
                    "correctOptionId": "char", "explanation": "String"
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
              jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

              try {
                  return JSON.parse(jsonString);
              } catch (e) {
                  jsonString = jsonString.replace(/[\u0000-\u0019]+/g,""); 
                  return JSON.parse(jsonString);
              }
          });

          // 3. Pós-Processamento, Verificação de Duplicatas e Auditoria
          const batch = writeBatch(db);
          let savedCount = 0;
          let newQuestionsForAudit = [];

          for (const q of questions) {
              const rawInst = ovr.overrideInst || q.institution;
              const cleanInst = cleanInstitutionText(rawInst);
              
              const finalQ = {
                  ...q,
                  institution: cleanInst,
                  year: ovr.overrideYear || q.year,
                  area: ovr.overrideArea || q.area,
                  topic: ovr.overrideTopic || q.topic
              };

              // Hash Check
              const hashId = await generateQuestionHash(finalQ.text);
              let isDuplicate = false;
              if (hashId) {
                  const existingDoc = await getDoc(doc(db, "questions", hashId));
                  if (existingDoc.exists()) isDuplicate = true;
              }

              if (!isDuplicate) {
                  // Adiciona para auditoria
                  newQuestionsForAudit.push({ ...finalQ, hashId });
              }
          }

          // 4. Auditoria IA (Double Check)
          if (newQuestionsForAudit.length > 0) {
              if (doDoubleCheck) {
                  addBatchLog('info', `Auditando ${newQuestionsForAudit.length} questões (Double Check)...`);
                  
                  for (let i = 0; i < newQuestionsForAudit.length; i++) {
                      // Pequeno delay para não sobrecarregar
                      if (i > 0) await new Promise(resolve => setTimeout(resolve, 150));
                      
                      try {
                          const verification = await verifyQuestionWithAI(newQuestionsForAudit[i]);
                          newQuestionsForAudit[i] = { 
                              ...newQuestionsForAudit[i], 
                              verificationStatus: verification.status, 
                              verificationReason: verification.reason 
                          };
                      } catch (err) {
                          console.error("Falha na auditoria (Imagem):", err);
                          newQuestionsForAudit[i] = { 
                              ...newQuestionsForAudit[i], 
                              verificationStatus: 'unchecked', 
                              verificationReason: 'Falha na auditoria (Erro genérico)' 
                          };
                      }
                  }
              } else {
                  // Marca como não verificada se a flag estiver off
                  newQuestionsForAudit.forEach((q, idx) => {
                      newQuestionsForAudit[idx] = { ...q, verificationStatus: 'unchecked', verificationReason: '' };
                  });
              }

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
          }

          // 6. Sucesso -> Remover da fila ("Joga fora")
          addBatchLog('success', `Sucesso em ${nextImg.name}: ${savedCount} questões salvas.`);
          setBatchImages(prev => prev.filter(img => img.id !== nextImg.id));

          // Delay pequeno para não atropelar
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
              // Erro real na imagem -> Marca como erro e mantém na lista
              addBatchLog('error', `Falha em ${nextImg.name}: ${errorMessage}`);
              setBatchImages(prev => prev.map(img => img.id === nextImg.id ? { ...img, status: 'error', errorMsg: errorMessage } : img));
              
              setTimeout(() => {
                  batchProcessorRef.current = false;
                  processNextBatchImage(); // Vai para a próxima
              }, 1000);
          }
      }
  };

  // --- LOGIC: PDF HANDLING (Mantido igual) ---
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

          for (let i = startP; i <= endP; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const text = content.items.map(item => item.str).join(' ');
              
              currentChunkText += `\n--- PÁGINA ${i} ---\n${text}`;

              // Fatia a cada CHUNK_SIZE páginas OU se for a última página do range
              if ((i - startP + 1) % CHUNK_SIZE === 0 || i === endP) {
                  chunks.push({
                      id: `chunk_${chunkStartPage}_${i}`,
                      pages: `${chunkStartPage} a ${i}`,
                      text: currentChunkText,
                      status: 'pending',
                      errorCount: 0
                  });
                  currentChunkText = "";
                  chunkStartPage = i + 1;
              }
          }

          setPdfChunks(chunks);
          setPdfStatus('ready');
          addLog('success', `Pronto! ${chunks.length} partes geradas (${startP}-${endP}).`);

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
      addLog('info', 'Processamento reiniciado.');
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
      const ovr = overridesRef.current; 

      if (processorRef.current) return; 
      // Se estiver pausado ou erro e a função for chamada (ex: retry), ok.
      // Se estiver 'completed', para.
      if (currentStatus === 'completed') return;
      
      // LÓGICA DE SEEK: Procura a próxima pendente A PARTIR do índice atual
      const chunkIndex = currentChunks.findIndex((c, i) => i >= currentChunkIndex && c.status === 'pending');
      
      if (chunkIndex === -1) {
          // Verifica se acabou tudo MESMO ou se só acabou a partir da agulha
          const anyPending = currentChunks.some(c => c.status === 'pending');
          if (anyPending) {
               addLog('warning', 'Fim da linha de tempo. Existem fatias anteriores pendentes.');
               setPdfStatus('paused'); 
          } else {
               setPdfStatus('completed');
               addLog('success', 'Processamento Completo!');
               showNotification('success', 'Todas as partes selecionadas foram processadas.');
          }
          return;
      }

      setCurrentChunkIndex(chunkIndex); // Atualiza agulha visual
      const chunk = currentChunks[chunkIndex];

      // Se não estiver 'pausing', garante que está 'processing'
      if (currentStatus !== 'pausing' && currentStatus !== 'processing') setPdfStatus('processing');
      
      processorRef.current = true; 
      addLog('info', `Processando fatia ${chunk.pages}...`);

      try {
          // --- CONSTRUÇÃO INTELIGENTE DO MAPA DE TEMAS E PROMPT ---
          const activeThemesMap = ovr.overrideArea ? { [ovr.overrideArea]: themesMap[ovr.overrideArea] } : themesMap;

          // USANDO ROTAÇÃO DE CHAVES PARA A GERAÇÃO PRINCIPAL
          const questions = await executeWithKeyRotation("Geração", async (key) => {
              const systemPrompt = `
                Você é um especialista em provas de Residência Médica (MedMaps).
                Analise o texto extraído de um PDF.
                
                CONTEXTO (Informacional):
                - Instituição: ${ovr.overrideInst ? ovr.overrideInst : "Não informado (Detectar do texto)"}
                - Ano: ${ovr.overrideYear ? ovr.overrideYear : "Não informado (Detectar do texto)"}

                SUA MISSÃO:
                1. Identificar questões (Enunciado + Alternativas).
                
                2. CLASSIFICAÇÃO (OBRIGATÓRIO):
                   - Classifique CADA questão em uma das Áreas e Tópicos da lista abaixo.
                   - É CRUCIAL que a classificação esteja correta.
                   - LISTA DE CLASSIFICAÇÃO VÁLIDA:
                   ${JSON.stringify(activeThemesMap)}

                3. GABARITO E COMENTÁRIO:
                   - Se o gabarito estiver no texto, use-o. Se NÃO, RESOLVA a questão.
                   - Gere sempre um campo "explanation".
                
                4. DADOS DE CABEÇALHO:
                   - IGNORE nomes de cursos preparatórios (Medgrupo, Medcurso, Estratégia, etc) no campo "institution".
                   - Procure pelo nome do HOSPITAL ou BANCA.
                   - Se não encontrar, deixe "".
                
                Retorne JSON ESTRITO:
                [{ 
                    "institution": "String", "year": Number|"", "area": "String", "topic": "String", 
                    "text": "String", "options": [{"id": "a", "text": "..."}], 
                    "correctOptionId": "char", "explanation": "String" 
                }]
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
              jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
              jsonString = jsonString.replace(/[\u0000-\u0019]+/g,"");
              
              let extracted = [];
              if (jsonString.startsWith('[') && jsonString.endsWith(']')) {
                 extracted = JSON.parse(jsonString);
              } else if (jsonString === '' || jsonString === '[]') {
                 extracted = [];
              } else {
                 const match = jsonString.match(/\[.*\]/s);
                 if (match) extracted = JSON.parse(match[0]);
              }
              return extracted;
          });

          // --- PÓS-PROCESSAMENTO (O "ROLO COMPRESSOR") ---
          let processedQuestions = await Promise.all(questions.map(async (q) => {
              // 1. Aplica overrides E limpa instituição
              const rawInst = ovr.overrideInst || q.institution;
              const cleanInst = cleanInstitutionText(rawInst);

              const finalQ = {
                  ...q,
                  institution: cleanInst, 
                  year: ovr.overrideYear || q.year,
                  area: ovr.overrideArea || q.area,
                  topic: ovr.overrideTopic || q.topic 
              };

              // 2. GERA HASH (ID ÚNICO)
              const hashId = await generateQuestionHash(finalQ.text);
              
              // 3. VERIFICA DUPLICATA NO BANCO FINAL (QUESTIONS)
              let isDuplicate = false;
              if (hashId) {
                  const existingDoc = await getDoc(doc(db, "questions", hashId));
                  if (existingDoc.exists()) {
                      isDuplicate = true;
                  }
              }

              return { ...finalQ, hashId, isDuplicate };
          }));

          // --- LOGICA DOUBLE CHECK SEQUENCIAL ---
          const newQuestions = processedQuestions.filter(q => !q.isDuplicate);
          const duplicateCount = processedQuestions.length - newQuestions.length;

          if (newQuestions.length > 0) {
              if (doDoubleCheck) {
                  addLog('info', `Iniciando Auditoria IA sequencial para ${newQuestions.length} questões novas...`);
                  
                  for (let i = 0; i < newQuestions.length; i++) {
                      if (i > 0) await new Promise(resolve => setTimeout(resolve, 100));
                      
                      try {
                          const verification = await verifyQuestionWithAI(newQuestions[i]);
                          newQuestions[i] = { 
                              ...newQuestions[i], 
                              verificationStatus: verification.status, 
                              verificationReason: verification.reason 
                          };
                      } catch (err) {
                          const msg = err.message || "";
                          if (msg.includes("Quota exceeded") || msg.includes("429")) {
                              throw err; 
                          }
                          console.error("Falha na auditoria individual:", err);
                          newQuestions[i] = { 
                              ...newQuestions[i], 
                              verificationStatus: 'unchecked', 
                              verificationReason: 'Falha na auditoria (Erro genérico)' 
                          };
                      }
                  }
              } else {
                  // Mapeia sem verificação
                  newQuestions.forEach((q, idx) => {
                      newQuestions[idx] = { ...q, verificationStatus: 'unchecked', verificationReason: '' };
                  });
              }

              const batch = writeBatch(db);
              newQuestions.forEach(q => {
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
          }

          addLog('success', `Sucesso fatia ${chunk.pages}: ${newQuestions.length} novas, ${duplicateCount} duplicatas descartadas.`);
          setPdfChunks(prev => {
              const newChunks = [...prev];
              newChunks[chunkIndex] = { ...newChunks[chunkIndex], status: 'success' };
              return newChunks;
          });
          setConsecutiveErrors(0); 

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

          // Continua o loop
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
                      newChunks[chunkIndex] = { ...newChunks[chunkIndex], status: 'error', errorCount: newErrorCount };
                      return newChunks;
                  });
                  setConsecutiveErrors(0);
                  processorRef.current = false;
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
              newChunks[chunkIndex] = { ...newChunks[chunkIndex], status: 'pending' };
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

    try {
        const activeThemesMap = ovr.overrideArea ? { [ovr.overrideArea]: themesMap[ovr.overrideArea] } : themesMap;

        const questions = await executeWithKeyRotation("Processamento Único", async (key) => {
            const systemPrompt = `
              Você é um especialista em banco de dados médicos (MedMaps).
              Extraia questões no formato JSON ESTRITO.
              
              CONTEXTO (Informacional):
              - Instituição: ${ovr.overrideInst ? ovr.overrideInst : "Não informado (Detectar do texto)"}
              - Ano: ${ovr.overrideYear ? ovr.overrideYear : "Não informado (Detectar do texto)"}

              REGRAS:
              1. Retorne APENAS o JSON (sem markdown).
              2. CLASSIFICAÇÃO (OBRIGATÓRIO):
                 - Classifique CADA questão usando a lista abaixo.
                 - LISTA VÁLIDA: ${JSON.stringify(activeThemesMap)}
              3. GABARITO E COMENTÁRIO: 
                 - Tente encontrar o gabarito. Se não houver, RESOLVA a questão.
                 - Gere sempre um campo "explanation".
              4. DADOS DE CABEÇALHO:
                 - IGNORE nomes de cursos preparatórios no campo "institution".
              
              Formato Saída:
              [
                {
                  "institution": "String", "year": Number|String, "area": "String", "topic": "String",
                  "text": "String", "options": [{"id": "a", "text": "String"}],
                  "correctOptionId": "char", "explanation": "String"
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
            jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                return JSON.parse(jsonString);
            } catch (e) {
                jsonString = jsonString.replace(/[\u0000-\u0019]+/g,""); 
                return JSON.parse(jsonString);
            }
        });

        // Pós-processamento e Auditoria
        let finalQuestions = await Promise.all(questions.map(async (q) => {
            // Limpeza de instituição
            const rawInst = ovr.overrideInst || q.institution;
            const cleanInst = cleanInstitutionText(rawInst);
            
            const finalQ = {
                ...q,
                institution: cleanInst,
                year: ovr.overrideYear || q.year,
                area: ovr.overrideArea || q.area,
                topic: ovr.overrideTopic || q.topic
            };

            // GERAÇÃO DE HASH E VERIFICAÇÃO DE DUPLICATA
            const hashId = await generateQuestionHash(finalQ.text);
            let isDuplicate = false;
            if (hashId) {
                const existingDoc = await getDoc(doc(db, "questions", hashId));
                if (existingDoc.exists()) isDuplicate = true;
            }

            return { ...finalQ, hashId, isDuplicate };
        }));

        // FILTRA DUPLICATAS ANTES DO DOUBLE CHECK
        const uniqueQuestions = finalQuestions.filter(q => !q.isDuplicate);
        const duplicateCount = finalQuestions.length - uniqueQuestions.length;

        if (isDoubleCheckEnabled && uniqueQuestions.length > 0) {
            showNotification('success', 'Iniciando Auditoria IA nas questões novas...');
            for (let i = 0; i < uniqueQuestions.length; i++) {
                // OTIMIZAÇÃO: Delay reduzido para 200ms
                if (i > 0) await new Promise(resolve => setTimeout(resolve, 200));
                try {
                    const verification = await verifyQuestionWithAI(uniqueQuestions[i]);
                    uniqueQuestions[i] = { 
                        ...uniqueQuestions[i], 
                        verificationStatus: verification.status, 
                        verificationReason: verification.reason 
                    };
                } catch (err) {
                    console.error("Erro auditoria unica:", err);
                    uniqueQuestions[i] = { ...uniqueQuestions[i], verificationStatus: 'unchecked' };
                }
            }
        } else {
            uniqueQuestions.forEach((q, idx) => {
                 uniqueQuestions[idx] = { ...q, verificationStatus: 'unchecked', verificationReason: '' };
            });
        }

        let savedCount = 0;
        const batch = writeBatch(db);
        
        for (const q of uniqueQuestions) {
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
        
        // NOTIFICAÇÕES MELHORADAS
        if (savedCount === 0 && duplicateCount > 0) {
            showNotification('warning', `Todas as ${duplicateCount} questões eram duplicatas e foram descartadas.`);
        } else if (duplicateCount > 0) {
            showNotification('success', `${savedCount} enviadas. ${duplicateCount} duplicatas descartadas.`);
        } else {
            showNotification('success', `${savedCount} questões enviadas para fila!`);
        }

    } catch (error) {
        console.error(error);
        showNotification('error', 'Erro: ' + error.message);
    } finally {
        setIsProcessing(false);
    }
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

  const handleApproveAllClick = () => {
      if (parsedQuestions.length === 0) return;
      // Verifica se tem alguma duplicata na lista (segurança extra)
      const hasDuplicates = parsedQuestions.some(q => q.isDuplicate);
      if (hasDuplicates) {
          showNotification('error', 'Remova as questões duplicadas antes de aprovar tudo.');
          return;
      }

      setConfirmationModal({
          isOpen: true,
          type: 'approve_all',
          data: null,
          title: 'Aprovar Todas?',
          message: `Tem certeza que deseja publicar TODAS as ${parsedQuestions.length} questões?`,
          confirmText: 'Sim, Publicar Tudo',
          confirmColor: 'emerald'
      });
  };

  const handleDiscardAllClick = () => {
      if (parsedQuestions.length === 0) return;
      setConfirmationModal({
          isOpen: true,
          type: 'delete_all',
          data: null,
          title: 'Limpar Fila Completa?',
          message: `Isso excluirá TODAS as ${parsedQuestions.length} questões do rascunho.`,
          confirmText: 'Sim, Excluir Tudo',
          confirmColor: 'red'
      });
  };

  const handleApproveVerifiedClick = () => {
      const verifiedCount = parsedQuestions.filter(q => q.verificationStatus === 'verified').length;
      if (verifiedCount === 0) return showNotification('error', 'Nenhuma questão verificada (Double-Checked) na fila.');
      setConfirmationModal({
          isOpen: true, type: 'approve_verified', data: null,
          title: 'Aprovar Verificadas?', message: `Publicar apenas as ${verifiedCount} questões validadas pela Auditoria IA?`,
          confirmText: `Aprovar ${verifiedCount}`, confirmColor: 'emerald'
      });
  };

  const handleDiscardSuspiciousClick = () => {
      const suspiciousCount = parsedQuestions.filter(q => q.verificationStatus === 'suspicious').length;
      if (suspiciousCount === 0) return showNotification('error', 'Nenhuma questão suspeita (Alucinada) na fila.');
      setConfirmationModal({
          isOpen: true, type: 'discard_suspicious', data: null,
          title: 'Descartar Suspeitas?', message: `Excluir as ${suspiciousCount} questões marcadas como suspeitas/alucinadas pela IA?`,
          confirmText: `Excluir ${suspiciousCount}`, confirmColor: 'red'
      });
  };

  const executeConfirmationAction = async () => {
      const { type, data } = confirmationModal;
      setConfirmationModal({ ...confirmationModal, isOpen: false }); 

      if (type === 'delete_one') {
          if (!data || !data.id) return;
          try { await deleteDoc(doc(db, "draft_questions", data.id)); showNotification('success', 'Excluído.'); } catch (e) { showNotification('error', e.message); }
      } 
      else if (type === 'approve_all') {
          setIsBatchAction(true);
          let count = 0;
          try {
              for (const q of parsedQuestions) {
                  if (q.isDuplicate) continue; // Pula duplicatas por segurança

                  const { id, status, createdAt, createdBy, verificationStatus, verificationReason, isDuplicate, hashId, ...finalData } = q;
                  if (q.area && q.topic && q.text) {
                     // SETDOC para garantir ID idempotente
                     await setDoc(doc(db, "questions", id), { ...finalData, createdAt: new Date().toISOString(), approvedBy: user.email, hasImage: false });
                     await deleteDoc(doc(db, "draft_questions", id));
                     count++;
                  }
              }
              showNotification('success', `${count} questões publicadas!`);
          } catch (e) { showNotification('error', e.message); } finally { setIsBatchAction(false); }
      }
      else if (type === 'delete_all') {
          setIsBatchAction(true);
          try {
              const batch = writeBatch(db);
              parsedQuestions.forEach(q => batch.delete(doc(db, "draft_questions", q.id)));
              await batch.commit();
              showNotification('success', 'Fila limpa.');
          } catch (e) { showNotification('error', e.message); } finally { setIsBatchAction(false); }
      }
      else if (type === 'approve_verified') {
          setIsBatchAction(true);
          let count = 0;
          try {
              const toApprove = parsedQuestions.filter(q => q.verificationStatus === 'verified' && !q.isDuplicate);
              for (const q of toApprove) {
                  const { id, status, createdAt, createdBy, verificationStatus, verificationReason, isDuplicate, hashId, ...finalData } = q;
                  if (q.area && q.topic && q.text) {
                     await setDoc(doc(db, "questions", id), { ...finalData, createdAt: new Date().toISOString(), approvedBy: user.email, hasImage: false });
                     await deleteDoc(doc(db, "draft_questions", id));
                     count++;
                  }
              }
              showNotification('success', `${count} questões verificadas foram publicadas!`);
          } catch (e) { showNotification('error', e.message); } finally { setIsBatchAction(false); }
      }
      else if (type === 'discard_suspicious') {
          setIsBatchAction(true);
          try {
              const batch = writeBatch(db);
              const toDelete = parsedQuestions.filter(q => q.verificationStatus === 'suspicious');
              toDelete.forEach(q => batch.delete(doc(db, "draft_questions", q.id)));
              await batch.commit();
              showNotification('success', `${toDelete.length} questões suspeitas excluídas.`);
          } catch (e) { showNotification('error', e.message); } finally { setIsBatchAction(false); }
      }
  };

  const approveQuestion = async (q) => {
    if (q.isDuplicate) {
        return showNotification('error', 'Esta questão já existe no banco de dados (Duplicata).');
    }
    if (!q.area || !q.topic || !q.text || !q.options || q.options.length < 2) {
      return showNotification('error', 'Preencha os campos obrigatórios.');
    }
    try {
      const { id, status, createdAt, createdBy, verificationStatus, verificationReason, isDuplicate, hashId, ...finalData } = q;
      // Garante o ID
      await setDoc(doc(db, "questions", id), {
        ...finalData,
        createdAt: new Date().toISOString(),
        approvedBy: user.email,
        hasImage: false
      });
      await deleteDoc(doc(db, "draft_questions", id));
      showNotification('success', 'Publicada!');
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

  // --- RENDER LOGIN ---
  if (isLoadingAuth) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="text-white animate-spin" size={48} /></div>;
  
  if (!user) return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3 mb-6 justify-center">
             <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/20"><Map className="text-white" size={32} /></div>
             <h1 className="text-2xl font-bold text-slate-800">MedMaps Admin</h1>
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
            <div className="flex items-center gap-2"><Map className="text-blue-600" size={28} /><h1 className="text-xl font-bold text-slate-800">MedMaps Importer</h1></div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
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

      {/* API KEY MODAL (Omitted for brevity) */}
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

      {/* CONFIRMATION MODAL (Omitted for brevity) */}
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
                <button onClick={() => setActiveTab('batch_images')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'batch_images' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Images size={18} /> Imagens (Lote)</button>
                <button onClick={() => setActiveTab('pdf')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'pdf' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Database size={18} /> PDF Massivo</button>
                <button onClick={() => setActiveTab('review')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'review' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                    <CloudLightning size={18} /> Fila de Aprovação 
                    {parsedQuestions.length > 0 && <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{parsedQuestions.length}</span>}
                </button>
            </div>
        </div>

        {/* OVERRIDES SECTION (PRÉ-DEFINIÇÕES) */}
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

        {/* BATCH IMAGES TAB (UNIFICADA) */}
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

                    {/* DROPZONE MULTIPLE + PASTE SUPPORT */}
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
                                    <Images size={48} className="mb-2"/>
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

                        {/* CONSOLE / LOGS (SEPARADO E CORRIGIDO) */}
                        <div className="w-full lg:w-1/3 flex flex-col h-[500px]">
                            <div className="bg-slate-900 rounded-xl overflow-hidden shadow-inner flex flex-col h-full">
                                {/* Header no TOPO */}
                                <div className="p-3 bg-slate-800 border-b border-slate-700 text-gray-400 text-xs font-bold flex items-center gap-2">
                                    <Terminal size={14}/> Console de Imagens
                                </div>
                                {/* Logs rolando abaixo */}
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

                            {/* GRID DE CHUNKS - INTERATIVO SE PAUSADO */}
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

                            {/* TERMINAL DE LOGS DO PDF (AGORA SEPARADO) */}
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

        {/* REVIEW TAB */}
        {activeTab === 'review' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
                {parsedQuestions.length > 0 && (
                     <div className="flex flex-col xl:flex-row justify-between items-center mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100 gap-4">
                        <div className="flex items-center gap-2 text-blue-800">
                            <CloudLightning size={20} />
                            <span className="font-bold">Fila de Aprovação ({parsedQuestions.length} itens)</span>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                            <button onClick={handleDiscardSuspiciousClick} disabled={isBatchAction} className="bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-70">
                                {isBatchAction ? <Loader2 className="animate-spin" size={14} /> : <ShieldAlert size={14} />}
                                Descartar Suspeitas
                            </button>
                            <button onClick={handleApproveVerifiedClick} disabled={isBatchAction} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-70">
                                {isBatchAction ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
                                Aprovar Verificadas
                            </button>
                            <div className="w-px h-6 bg-blue-200 mx-1 hidden md:block"></div>
                            <button onClick={handleDiscardAllClick} disabled={isBatchAction} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-70">
                                <Trash2 size={14} /> Descartar Tudo
                            </button>
                            <button onClick={handleApproveAllClick} disabled={isBatchAction} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all disabled:opacity-70">
                                <CheckCircle size={14} /> Aprovar Tudo
                            </button>
                        </div>
                     </div>
                )}

                {parsedQuestions.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Database size={64} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-xl font-medium text-gray-500">Fila de aprovação vazia.</p>
                        <button onClick={() => setActiveTab('input')} className="mt-4 text-blue-600 font-bold hover:underline">Adicionar novas</button>
                    </div>
                ) : (
                    parsedQuestions.map((q, idx) => (
                        <div key={q.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden relative group transition-colors ${q.isDuplicate ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200'}`}>
                            {/* STATUS BADGES */}
                            <div className="absolute top-0 right-0 z-10 flex flex-col items-end gap-1">
                                <div className={`p-2 rounded-bl-xl shadow-sm text-xs font-bold flex items-center gap-1
                                    ${q.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-700' : 
                                    q.verificationStatus === 'suspicious' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {q.verificationStatus === 'verified' && <><ShieldCheck size={14}/> Double-Checked</>}
                                    {q.verificationStatus === 'suspicious' && <><ShieldAlert size={14}/> Suspeita: {q.verificationReason}</>}
                                    {(!q.verificationStatus || q.verificationStatus === 'unchecked') && 'Não Verificada'}
                                </div>
                                
                                {q.isDuplicate && (
                                    <div className="bg-amber-100 text-amber-800 p-2 rounded-l-lg shadow-sm text-xs font-bold flex items-center gap-1 animate-pulse">
                                        <Copy size={14}/> JÁ CADASTRADA
                                    </div>
                                )}
                            </div>

                            <div className="h-1.5 w-full bg-gray-100"><div className="h-full bg-orange-400 w-full animate-pulse"></div></div>
                            <div className="p-6 pt-10">
                                {/* METADATA FIELDS */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Inst</label><input value={q.institution} onChange={e=>updateQuestionField(idx,'institution',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"/></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Ano</label><input type="number" value={q.year} onChange={e=>updateQuestionField(idx,'year',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"/></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Área</label><select value={q.area} onChange={e=>updateQuestionField(idx,'area',e.target.value)} className="w-full p-2 bg-blue-50 border border-blue-100 rounded-lg text-sm font-bold text-blue-800"><option value="">Selecione...</option>{areasBase.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Tópico</label><select value={q.topic} onChange={e=>updateQuestionField(idx,'topic',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"><option value="">Selecione...</option>{(themesMap[q.area]||[]).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                                </div>

                                {/* QUESTION CONTENT */}
                                <div className="mb-6"><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Enunciado</label><textarea value={q.text} onChange={e=>updateQuestionField(idx,'text',e.target.value)} rows={4} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"/></div>

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
                                
                                {q.isDuplicate ? (
                                    <button disabled className="bg-amber-200 text-amber-700 font-bold text-sm px-6 py-2.5 rounded-lg flex items-center gap-2 cursor-not-allowed opacity-70">
                                        <Copy size={18}/> Questão Duplicada
                                    </button>
                                ) : (
                                    <button onClick={()=>approveQuestion(q)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-lg flex items-center gap-2"><CheckCircle size={18}/> Aprovar e Publicar</button>
                                )}
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
