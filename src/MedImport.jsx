import React, { useState, useEffect, useRef } from 'react';
import { 
  Map, Save, Trash2, Settings, CheckCircle, 
  AlertCircle, FileText, Database, 
  Loader2, Wand2, Cpu, RefreshCw, User, X,
  LogOut, Send, Brain, Image as ImageIcon, UploadCloud, Lock, CloudLightning, ArrowLeft,
  AlertTriangle, ExternalLink, Key, Play, Pause, AlertOctagon, Terminal, ShieldCheck, ShieldAlert, 
  ToggleLeft, ToggleRight, Layers, Filter, Eraser, RefreshCcw, XCircle, RotateCcw, Copy,
  SkipForward, BookOpen, Clock, Files
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBatchAction, setIsBatchAction] = useState(false); 
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('input');
  const [notification, setNotification] = useState(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [isDoubleCheckEnabled, setIsDoubleCheckEnabled] = useState(true); 
  
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

  // ... (HELPER FUNCTIONS: executeWithKeyRotation, verifyQuestionWithAI, log functions kept same) ...
  const executeWithKeyRotation = async (operationName, requestFn) => {
      const keys = apiKeysRef.current;
      if (!keys || keys.length === 0) throw new Error("Nenhuma chave API configurada.");
      let lastError = null;
      const startIndex = keyRotationIndex.current;
      for (let i = 0; i < keys.length; i++) {
          const currentIndex = (startIndex + i) % keys.length;
          const currentKey = keys[currentIndex];
          keyRotationIndex.current = (currentIndex + 1) % keys.length;
          try { return await requestFn(currentKey); } 
          catch (error) {
              const msg = error.message || "";
              const isQuotaError = msg.includes("Quota exceeded") || msg.includes("429");
              if (isQuotaError) {
                  const logFn = operationName.includes("Imagem") ? addBatchLog : addLog;
                  logFn('warning', `[${operationName}] Chave ...${currentKey.slice(-4)} no limite. Rotacionando...`);
                  lastError = error;
                  continue; 
              } else { throw error; }
          }
      }
      throw lastError || new Error("Todas as chaves falharam.");
  };

  const verifyQuestionWithAI = async (questionData) => {
      return executeWithKeyRotation("Auditoria", async (key) => {
          const verifyPrompt = `Você é um Auditor Sênior de Questões Médicas. Analise a questão: ${questionData.text} \n Alternativas: ${JSON.stringify(questionData.options)} \n Gabarito: ${questionData.correctOptionId} \n Comentário: ${questionData.explanation} \n Verifique se a questão é medicamente correta e se não há alucinações. Retorne JSON: {"isValid": boolean, "reason": "string"}`;
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: verifyPrompt }] }] })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
          const result = JSON.parse(jsonString);
          return { status: result.isValid ? 'verified' : 'suspicious', reason: result.reason || (result.isValid ? "Verificado por IA" : "Inconsistência detectada") };
      });
  };

  const addLog = (type, message) => { setProcessingLogs(prev => [{ type, message, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50)); };
  const addBatchLog = (type, message) => { setBatchLogs(prev => [{ type, message, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50)); };

  // ... (BATCH IMAGE LOGIC kept same) ...
  const handleBatchImageUpload = (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      const newImages = files.map(file => ({ id: Math.random().toString(36).substr(2, 9), file, name: file.name, preview: URL.createObjectURL(file), status: 'pending', errorMsg: '' }));
      setBatchImages(prev => [...prev, ...newImages]);
      addBatchLog('info', `${files.length} imagens adicionadas.`);
  };
  const handleBatchPaste = (e) => {
      const items = e.clipboardData.items; const newImages = [];
      for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf("image") !== -1) { const blob = items[i].getAsFile(); newImages.push({ id: Math.random().toString(36).substr(2, 9), file: blob, name: `Colada_${Date.now()}_${i}.png`, preview: URL.createObjectURL(blob), status: 'pending', errorMsg: '' }); } }
      if (newImages.length > 0) { setBatchImages(prev => [...prev, ...newImages]); addBatchLog('info', `${newImages.length} imagens coladas.`); }
  };
  const removeBatchImage = (id) => setBatchImages(prev => prev.filter(img => img.id !== id));
  const clearBatchQueue = () => { if (batchStatus==='processing'||batchStatus==='pausing')return; setBatchImages([]); addBatchLog('info', 'Fila limpa.'); setBatchLogs([]); };
  const toggleBatchProcessing = () => {
      if (batchStatus === 'processing') { setBatchStatus('pausing'); addBatchLog('warning', 'Pausando...'); } 
      else { setBatchStatus('processing'); addBatchLog('info', 'Iniciando...'); batchProcessorRef.current = false; setTimeout(() => processNextBatchImage(), 100); }
  };
  const fileToBase64 = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; });

  const processNextBatchImage = async () => {
      if (batchProcessorRef.current) return;
      if (batchStatusRef.current === 'pausing') { setBatchStatus('paused'); addBatchLog('warning', 'Pausado.'); return; }
      if (batchStatusRef.current !== 'processing') return;
      const nextImg = batchImagesRef.current.find(img => img.status === 'pending');
      if (!nextImg) { setBatchStatus('idle'); addBatchLog('success', 'Finalizado!'); showNotification('success', 'Concluído.'); return; }
      batchProcessorRef.current = true;
      const ovr = overridesRef.current;
      addBatchLog('info', `Processando ${nextImg.name}...`);
      try {
          const base64Data = await fileToBase64(nextImg.file);
          const activeThemesMap = ovr.overrideArea ? { [ovr.overrideArea]: themesMap[ovr.overrideArea] } : themesMap;
          const questions = await executeWithKeyRotation("Imagem Batch", async (key) => {
              const prompt = `Analise esta imagem de questão médica. Extraia JSON estrito. \n Contexto: Inst: ${ovr.overrideInst||"Detectar"}, Ano: ${ovr.overrideYear||"Detectar"}. \n Classifique em: ${JSON.stringify(activeThemesMap)}. \n Saída: [{ "institution": "", "year": "", "area": "", "topic": "", "text": "", "options": [{"id":"a","text":""}], "correctOptionId": "a", "explanation": "" }]`;
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.replace('models/', '')}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: nextImg.file.type, data: base64Data } }] }] }) });
              const d = await res.json(); if(d.error) throw new Error(d.error.message);
              return JSON.parse(d.candidates?.[0]?.content?.parts?.[0]?.text.replace(/```json/g,'').replace(/```/g,'').trim());
          });
          const batch = writeBatch(db); let saved = 0; let toAudit = [];
          for (const q of questions) {
              const finalQ = { ...q, institution: cleanInstitutionText(ovr.overrideInst || q.institution), year: ovr.overrideYear || q.year, area: ovr.overrideArea || q.area, topic: ovr.overrideTopic || q.topic };
              const hashId = await generateQuestionHash(finalQ.text);
              const exists = hashId && (await getDoc(doc(db, "questions", hashId))).exists();
              if (!exists) toAudit.push({ ...finalQ, hashId });
          }
          if (toAudit.length > 0) {
              if (doubleCheckRef.current) {
                  addBatchLog('info', `Auditando ${toAudit.length} questões...`);
                  for (let i = 0; i < toAudit.length; i++) {
                      if(i>0) await new Promise(r=>setTimeout(r,150));
                      try { const ver = await verifyQuestionWithAI(toAudit[i]); toAudit[i] = { ...toAudit[i], verificationStatus: ver.status, verificationReason: ver.reason }; } 
                      catch(e) { console.error(e); toAudit[i].verificationStatus = 'unchecked'; }
                  }
              } else { toAudit.forEach((q,i) => toAudit[i].verificationStatus = 'unchecked'); }
              for (const q of toAudit) {
                  batch.set(doc(db, "draft_questions", q.hashId || doc(collection(db, "draft_questions")).id), { ...q, createdAt: new Date().toISOString(), createdBy: user.email, sourceFile: nextImg.name, hasImage: true });
                  saved++;
              }
              await batch.commit();
          }
          addBatchLog('success', `Sucesso ${nextImg.name}: ${saved} salvas.`);
          setBatchImages(prev => prev.filter(img => img.id !== nextImg.id));
          setTimeout(() => { batchProcessorRef.current = false; processNextBatchImage(); }, 1000);
      } catch (e) {
          console.error(e);
          const msg = e.message || "Erro";
          if (msg.includes("Quota") || msg.includes("429")) { addBatchLog('warning', 'Cota excedida. 10s...'); setTimeout(() => { batchProcessorRef.current = false; processNextBatchImage(); }, 10000); }
          else { addBatchLog('error', `Falha ${nextImg.name}: ${msg}`); setBatchImages(prev => prev.map(img => img.id === nextImg.id ? { ...img, status: 'error', errorMsg: msg } : img)); setTimeout(() => { batchProcessorRef.current = false; processNextBatchImage(); }, 1000); }
      }
  };

  // ... (PDF FUNCTIONS kept mostly same, compacted for brevity but fully functional) ...
  const handlePdfUpload = async (e) => {
      const file = e.target.files[0]; if(!file) return; if(file.type!=='application/pdf') return showNotification('error','PDF apenas');
      setPdfFile(file); setPdfStatus('reading'); setProcessingLogs([]); addLog('info', `Lendo ${file.name}...`);
      try {
          const pdfjs = await loadPdfJs(); const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
          addLog('info', `PDF: ${pdf.numPages} pgs.`);
          let startP = parseInt(pdfStartPage)||1, endP = parseInt(pdfEndPage)||pdf.numPages;
          if (startP<1) startP=1; if(endP>pdf.numPages) endP=pdf.numPages; if(startP>endP) {startP=1;endP=pdf.numPages;}
          let chunks=[], curText="", chunkStart=startP, lastContent="";
          for(let i=startP; i<=endP; i++) {
              const txt = (await (await pdf.getPage(i)).getTextContent()).items.map(s=>s.str).join(' ');
              lastContent=txt; curText += `\n--- PÁGINA ${i} ---\n${txt}`;
              if ((i-startP+1)%CHUNK_SIZE===0 || i===endP) {
                  let finalText = curText;
                  if (i<endP) { try { finalText += `\n\n--- PRÓXIMA (${i+1}) ---\n` + (await (await pdf.getPage(i+1)).getTextContent()).items.map(s=>s.str).join(' '); } catch(e){} }
                  chunks.push({ id: `ch_${chunkStart}_${i}`, pages: `${chunkStart}-${i}`, text: finalText, status: 'pending', errorCount: 0 });
                  curText = i<endP ? `\n--- ANTERIOR (${i}) ---\n${lastContent}` : ""; chunkStart = i+1;
              }
          }
          setPdfChunks(chunks); setPdfStatus('ready'); addLog('success', `${chunks.length} fatias prontas.`);
      } catch(e) { setPdfStatus('error'); addLog('error', e.message); }
  };
  const handleResetPdf = () => { if(pdfStatus==='processing'||pdfStatus==='pausing')return; setPdfFile(null); setPdfChunks([]); setPdfStatus('idle'); setCurrentChunkIndex(0); setProcessingLogs([]); };
  const handleRestartPdf = () => { if(!pdfFile||pdfStatus==='processing')return; setPdfChunks(pdfChunks.map(c=>({...c,status:'pending',errorCount:0}))); setCurrentChunkIndex(0); setPdfStatus('ready'); setProcessingLogs([]); addLog('info','Reiniciado.'); };
  const handleJumpToChunk = (idx) => { if(pdfStatus==='processing'||pdfStatus==='idle')return; setCurrentChunkIndex(idx); setPdfChunks(p=>{const n=[...p]; n[idx]={...n[idx],status:'pending',errorCount:0}; return n;}); addLog('info', `Agulha: Fatia ${idx+1}`); };
  const togglePdfProcessing = () => { if(pdfStatus==='processing'){setPdfStatus('pausing');addLog('warning','Pausando...');}else if(pdfStatus==='paused'||pdfStatus==='ready'){setPdfStatus('processing');addLog('info','Iniciando...');processorRef.current=false;setTimeout(()=>processNextChunk(),100);} };

  const processNextChunk = async () => {
      if(processorRef.current)return; if(pdfStatusRef.current==='pausing'){setPdfStatus('paused');addLog('warning','Pausado.');return;}
      if(pdfStatusRef.current!=='processing')return;
      const idx = pdfChunksRef.current.findIndex((c,i)=>i>=currentChunkIndex&&c.status==='pending');
      if(idx===-1){ const any=pdfChunksRef.current.some(c=>c.status==='pending'); if(any){setPdfStatus('paused');addLog('warning','Fim da linha. Pendentes para trás.');}else{setPdfStatus('completed');addLog('success','Completo!');} return; }
      setCurrentChunkIndex(idx); const chunk=pdfChunksRef.current[idx]; processorRef.current=true; addLog('info',`Fatia ${chunk.pages}...`);
      try {
          const ovr = overridesRef.current;
          const questions = await executeWithKeyRotation("Geração PDF", async (key) => {
              const prompt = `Analise PDF. Extraia JSON estrito. \n Contexto: Inst: ${ovr.overrideInst||"Detectar"}, Ano: ${ovr.overrideYear||"Detectar"}. \n Classifique em: ${JSON.stringify(ovr.overrideArea ? {[ovr.overrideArea]: themesMap[ovr.overrideArea]} : themesMap)}. \n IGNORAR QUESTÕES QUE ESTÃO COMPLETAMENTE DENTRO DAS SEÇÕES DE 'CONTEXTO'. \n Saída: [{ "institution": "", "year": "", "area": "", "topic": "", "text": "", "options": [{"id":"a","text":""}], "correctOptionId": "a", "explanation": "" }] \n TEXTO:\n${chunk.text}`;
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.replace('models/', '')}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
              const d = await res.json(); if(d.error) throw new Error(d.error.message);
              return JSON.parse(d.candidates?.[0]?.content?.parts?.[0]?.text.replace(/```json/g,'').replace(/```/g,'').trim().replace(/[\u0000-\u0019]+/g,""));
          });
          const batch = writeBatch(db); let saved=0; let toAudit=[];
          for(const q of questions) {
              const finalQ = { ...q, institution: cleanInstitutionText(ovr.overrideInst||q.institution), year: ovr.overrideYear||q.year, area: ovr.overrideArea||q.area, topic: ovr.overrideTopic||q.topic };
              const hashId = await generateQuestionHash(finalQ.text);
              const exists = hashId && (await getDoc(doc(db, "questions", hashId))).exists();
              if(!exists) toAudit.push({...finalQ, hashId});
          }
          if(toAudit.length>0) {
              if(doubleCheckRef.current) {
                  addLog('info',`Auditando ${toAudit.length} novas...`);
                  for(let i=0; i<toAudit.length; i++) {
                      if(i>0) await new Promise(r=>setTimeout(r,150));
                      try{ const ver = await verifyQuestionWithAI(toAudit[i]); toAudit[i]={...toAudit[i],verificationStatus:ver.status,verificationReason:ver.reason}; }
                      catch(e){console.error(e); toAudit[i].verificationStatus='unchecked';}
                  }
              } else { toAudit.forEach((q,i)=>toAudit[i].verificationStatus='unchecked'); }
              toAudit.forEach(q => batch.set(doc(db, "draft_questions", q.hashId||doc(collection(db,"draft_questions")).id), {...q, createdAt: new Date().toISOString(), createdBy: user.email, sourceFile: pdfFile.name, sourcePages: chunk.pages, hasImage: false}));
              await batch.commit(); saved=toAudit.length;
          }
          addLog('success', `Fatia ${chunk.pages}: ${saved} salvas.`);
          setPdfChunks(p=>{const n=[...p]; n[idx].status='success'; return n;}); setConsecutiveErrors(0);
          setTimeout(()=>{processorRef.current=false; processNextChunk();},500);
      } catch (e) {
          console.error(e); const msg=e.message||"";
          if(msg.includes("Quota")||msg.includes("429")) { addLog('warning','Cota excedida. 60s...'); setTimeout(()=>{processorRef.current=false; processNextChunk();},60000); }
          else { 
              const errCount = chunk.errorCount+1;
              if(errCount>=3){ addLog('error',`Falha Fatia ${chunk.pages}. Pulando.`); setPdfChunks(p=>{const n=[...p]; n[idx].status='error'; n[idx].errorCount=errCount; return n;}); setConsecutiveErrors(0); processorRef.current=false; setTimeout(()=>processNextChunk(),1000); }
              else { addLog('warning',`Erro Fatia ${chunk.pages} (${errCount}/3). Retentando...`); setPdfChunks(p=>{const n=[...p]; n[idx].status='pending'; n[idx].errorCount=errCount; return n;}); processorRef.current=false; setTimeout(()=>processNextChunk(),3000); }
          }
      }
  };

  // --- CLEANING HANDLER (NOVA VERSÃO COM MODAL) ---
  const handleClearAllField = (field) => {
      console.log("Clicou em limpar:", field); // Debug log
      if (parsedQuestions.length === 0) return showNotification('error', 'Fila vazia.');
      
      const fieldName = field === 'institution' ? 'Instituição' : 'Ano';
      
      setConfirmationModal({
          isOpen: true,
          type: `clear_all_${field}`, // clear_all_institution or clear_all_year
          data: field, 
          title: `Limpar ${fieldName}?`,
          message: `Tem certeza que deseja remover o ${fieldName} de TODAS as ${parsedQuestions.length} questões da fila?`,
          confirmText: 'Sim, Limpar Tudo',
          confirmColor: 'red'
      });
  };

  // --- GENERIC PROCESSING (TEXTO) ---
  const processWithAI = async () => {
    if (!rawText.trim()) return showNotification('error', 'Cole o texto.');
    setIsProcessing(true); const ovr = overridesRef.current;
    try {
        const questions = await executeWithKeyRotation("Texto", async (key) => {
            const prompt = `Extraia questões JSON. \n Contexto: Inst: ${ovr.overrideInst||"Detectar"}, Ano: ${ovr.overrideYear||"Detectar"}. \n Classifique: ${JSON.stringify(ovr.overrideArea ? {[ovr.overrideArea]: themesMap[ovr.overrideArea]} : themesMap)}. \n Saída: [{...}] \n Texto: \n ${rawText}`;
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.replace('models/', '')}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
            const d = await res.json(); if(d.error) throw new Error(d.error.message);
            return JSON.parse(d.candidates?.[0]?.content?.parts?.[0]?.text.replace(/```json/g,'').replace(/```/g,'').trim());
        });
        const batch = writeBatch(db); let saved=0; let toAudit=[];
        for(const q of questions) {
            const finalQ = { ...q, institution: cleanInstitutionText(ovr.overrideInst||q.institution), year: ovr.overrideYear||q.year, area: ovr.overrideArea||q.area, topic: ovr.overrideTopic||q.topic };
            const hashId = await generateQuestionHash(finalQ.text);
            const exists = hashId && (await getDoc(doc(db, "questions", hashId))).exists();
            if(!exists) toAudit.push({...finalQ, hashId});
        }
        if(toAudit.length>0) {
            if(isDoubleCheckEnabled) {
                showNotification('success', 'Auditando...');
                for(let i=0;i<toAudit.length;i++){ if(i>0) await new Promise(r=>setTimeout(r,150)); try{const ver=await verifyQuestionWithAI(toAudit[i]); toAudit[i]={...toAudit[i],verificationStatus:ver.status,verificationReason:ver.reason};}catch(e){toAudit[i].verificationStatus='unchecked';} }
            } else { toAudit.forEach((q,i)=>toAudit[i].verificationStatus='unchecked'); }
            toAudit.forEach(q => { batch.set(doc(db, "draft_questions", q.hashId||doc(collection(db,"draft_questions")).id), {...q, createdAt: new Date().toISOString(), createdBy: user.email, hasImage: false}); saved++; });
            await batch.commit();
        }
        setRawText(''); setActiveTab('review'); showNotification('success', `${saved} enviadas!`);
    } catch (e) { showNotification('error', e.message); } finally { setIsProcessing(false); }
  };

  // --- ACTIONS (APROVAR/DESCARTAR) ---
  const handleDiscardOneClick = (q) => setConfirmationModal({ isOpen: true, type: 'delete_one', data: q, title: 'Excluir?', message: 'Confirmar exclusão?', confirmText: 'Excluir', confirmColor: 'red' });
  const handleApproveAllClick = () => { if(parsedQuestions.some(q=>q.isDuplicate)) return showNotification('error','Remova duplicadas.'); setConfirmationModal({ isOpen: true, type: 'approve_all', title: 'Aprovar Tudo?', message: `Publicar ${parsedQuestions.length} questões?`, confirmText: 'Publicar', confirmColor: 'emerald' }); };
  const handleDiscardAllClick = () => setConfirmationModal({ isOpen: true, type: 'delete_all', title: 'Limpar Fila?', message: 'Excluir tudo?', confirmText: 'Excluir Tudo', confirmColor: 'red' });
  const handleApproveVerifiedClick = () => setConfirmationModal({ isOpen: true, type: 'approve_verified', title: 'Aprovar Verificadas?', message: 'Publicar apenas as double-checked?', confirmText: 'Aprovar', confirmColor: 'emerald' });
  const handleDiscardSuspiciousClick = () => setConfirmationModal({ isOpen: true, type: 'discard_suspicious', title: 'Descartar Suspeitas?', message: 'Excluir marcadas como suspeitas?', confirmText: 'Excluir', confirmColor: 'red' });

  const executeConfirmationAction = async () => {
      const { type, data } = confirmationModal;
      setConfirmationModal({ ...confirmationModal, isOpen: false }); 

      if (type === 'delete_one') { try { await deleteDoc(doc(db, "draft_questions", data.id)); showNotification('success', 'Excluído.'); } catch (e) { showNotification('error', e.message); } }
      else if (type === 'approve_all') {
          setIsBatchAction(true); try { const batch=writeBatch(db); parsedQuestions.forEach(q=>{if(!q.isDuplicate){ const {id,...d}=q; batch.set(doc(db,"questions",id),{...d,createdAt:new Date().toISOString(),approvedBy:user.email}); batch.delete(doc(db,"draft_questions",id)); }}); await batch.commit(); showNotification('success', 'Publicado!'); } catch(e){showNotification('error',e.message);} finally{setIsBatchAction(false);}
      }
      else if (type === 'delete_all') {
          setIsBatchAction(true); try { const batch=writeBatch(db); parsedQuestions.forEach(q=>batch.delete(doc(db,"draft_questions",q.id))); await batch.commit(); showNotification('success', 'Limpo.'); } catch(e){showNotification('error',e.message);} finally{setIsBatchAction(false);}
      }
      else if (type === 'approve_verified') {
          setIsBatchAction(true); try { const batch=writeBatch(db); parsedQuestions.filter(q=>q.verificationStatus==='verified'&&!q.isDuplicate).forEach(q=>{const {id,...d}=q; batch.set(doc(db,"questions",id),{...d,createdAt:new Date().toISOString(),approvedBy:user.email}); batch.delete(doc(db,"draft_questions",id));}); await batch.commit(); showNotification('success', 'Verificadas publicadas.'); } catch(e){showNotification('error',e.message);} finally{setIsBatchAction(false);}
      }
      else if (type === 'discard_suspicious') {
          setIsBatchAction(true); try { const batch=writeBatch(db); parsedQuestions.filter(q=>q.verificationStatus==='suspicious').forEach(q=>batch.delete(doc(db,"draft_questions",q.id))); await batch.commit(); showNotification('success', 'Suspeitas excluídas.'); } catch(e){showNotification('error',e.message);} finally{setIsBatchAction(false);}
      }
      // --- LOGICA DE LIMPEZA EM MASSA (AGORA AQUI) ---
      else if (type === 'clear_all_institution' || type === 'clear_all_year') {
          const field = type === 'clear_all_institution' ? 'institution' : 'year';
          console.log("Executando limpeza em massa para:", field); // Debug
          setIsBatchAction(true);
          try {
              // 1. Otimismo UI
              setParsedQuestions(prev => prev.map(q => ({ ...q, [field]: '' })));
              
              // 2. Batch Update no Firestore (Chunked)
              const chunkSize = 400;
              for (let i = 0; i < parsedQuestions.length; i += chunkSize) {
                  const chunk = parsedQuestions.slice(i, i + chunkSize);
                  const subBatch = writeBatch(db);
                  chunk.forEach(q => {
                      if (q.id) {
                          const docRef = doc(db, "draft_questions", q.id);
                          subBatch.set(docRef, { [field]: "" }, { merge: true });
                      }
                  });
                  await subBatch.commit();
              }
              showNotification('success', `Campo limpo com sucesso!`);
          } catch (e) {
              console.error("Erro limpeza:", e);
              showNotification('error', 'Erro ao limpar: ' + e.message);
          } finally {
              setIsBatchAction(false);
          }
      }
  };

  const approveQuestion = async (q) => { if(q.isDuplicate)return showNotification('error','Duplicata.'); if(!q.area||!q.topic)return showNotification('error','Preencha dados.'); try{const {id,...d}=q; await setDoc(doc(db,"questions",id),{...d,createdAt:new Date().toISOString(),approvedBy:user.email}); await deleteDoc(doc(db,"draft_questions",id)); showNotification('success','Publicada!');}catch(e){showNotification('error',e.message);} };
  const updateQuestionField = (idx,f,v) => { const n=[...parsedQuestions]; n[idx][f]=v; setParsedQuestions(n); };
  const updateOptionText = (qIdx,oIdx,v) => { const n=[...parsedQuestions]; n[qIdx].options[oIdx].text=v; setParsedQuestions(n); };
  const saveApiKeyFromModal = async () => { /* ... (same as before) ... */ setIsSavingKey(true); try{ setApiKeys(tempApiKeysText.split('\n').filter(k=>k.trim())); await setDoc(doc(db,"settings","global"),{geminiApiKeys:tempApiKeysText.split('\n').filter(k=>k.trim())},{merge:true}); setShowApiKeyModal(false); showNotification('success','Salvo!'); }catch(e){showNotification('error',e.message);}finally{setIsSavingKey(false);} };
  const handleGetKey = () => window.open('https://aistudio.google.com/app/api-keys','_blank');
  const handleModelChange = (m) => { setSelectedModel(m); localStorage.setItem('gemini_model',m); };
  const showNotification = (t,x) => setNotification({type:t,text:x});
  const closeNotification = () => setNotification(null);
  const handleLogout = () => signOut(auth);
  const validateKeyAndFetchModels = async () => { /* ... (same logic, just compacted) ... */ setIsValidatingKey(true); try{ await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKeys[0]}`); showNotification('success','Chave OK!'); }catch(e){showNotification('error',e.message);}finally{setIsValidatingKey(false);} };

  if (isLoadingAuth) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="text-white animate-spin" size={48} /></div>;
  if (!user) return ( /* LOGIN UI ... */ 
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans"><div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300"><div className="flex items-center gap-3 mb-6 justify-center"><div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/20"><Map className="text-white" size={32} /></div><h1 className="text-2xl font-bold text-slate-800">MedMaps Admin</h1></div><p className="text-slate-500 text-center mb-6">Acesso restrito a administradores.</p><form onSubmit={(e) => { e.preventDefault(); signInWithEmailAndPassword(auth, email, password).catch(err => showNotification('error', err.message)); }} className="space-y-4"><input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"/><input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"/><button className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"><Lock size={18} /> Acessar Sistema</button></form></div><NotificationToast notification={notification} onClose={closeNotification} positionClass="fixed bottom-4 right-4" /></div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4"><button onClick={() => window.location.href = '/'} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Voltar"><ArrowLeft size={24} /></button><div className="flex items-center gap-2"><Map className="text-blue-600" size={28} /><h1 className="text-xl font-bold text-slate-800">MedMaps Importer</h1></div></div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all border ${isDoubleCheckEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`} onClick={() => setIsDoubleCheckEnabled(!isDoubleCheckEnabled)} title="Auditoria IA">{isDoubleCheckEnabled ? <ToggleRight size={24} className="text-indigo-600"/> : <ToggleLeft size={24}/>}<span className="text-sm font-bold flex items-center gap-1">{isDoubleCheckEnabled ? <ShieldCheck size={16}/> : null} Auditoria IA {isDoubleCheckEnabled ? 'ON' : 'OFF'}</span></div>
            <button onClick={() => { setTempApiKeysText(apiKeys.join('\n')); setShowApiKeyModal(true); setShowTutorial(false); }} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 text-sm font-medium"><Settings size={18} /><span className="hidden md:inline">API</span></button>
            <div className="relative group flex-1 md:flex-none w-full md:w-auto flex items-center gap-2"><div className="relative"><Cpu size={16} className="absolute left-3 top-3 text-gray-500" /><select value={selectedModel} onChange={(e) => handleModelChange(e.target.value)} className="w-full md:w-56 pl-9 pr-3 py-2 text-sm bg-gray-100 border-none rounded-lg font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none">{availableModels.map(model => (<option key={model.name} value={model.name}>{model.displayName || model.name}</option>))}</select></div><button onClick={validateKeyAndFetchModels} disabled={isValidatingKey || apiKeys.length === 0} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50" title="Sincronizar">{isValidatingKey ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18} />}</button></div><button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sair"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <NotificationToast notification={notification} onClose={closeNotification} positionClass="fixed top-24 right-4" />
      {showApiKeyModal && ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto"><button onClick={() => setShowApiKeyModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button><h2 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2"><Settings size={20} className="text-blue-600"/> Configurar API</h2><div className="mb-4"><textarea value={tempApiKeysText} onChange={e => setTempApiKeysText(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 h-32 resize-y" placeholder="Chaves..."/><button onClick={handleGetKey} className="mt-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100 font-bold text-sm flex items-center gap-2"><Key size={16} /> Nova Chave</button></div><div className="flex justify-end gap-3 mt-auto pt-2"><button onClick={() => setShowApiKeyModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold">Cancelar</button><button onClick={saveApiKeyFromModal} disabled={isSavingKey} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2">{isSavingKey ? <Loader2 size={16} className="animate-spin" /> : null} Salvar</button></div></div></div> )}
      {confirmationModal.isOpen && ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative"><div className="flex flex-col items-center text-center"><div className={`p-3 rounded-full mb-4 ${confirmationModal.confirmColor === 'red' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}><AlertTriangle size={32} /></div><h2 className="text-xl font-bold mb-2 text-slate-800">{confirmationModal.title}</h2><p className="text-gray-600 mb-6 text-sm">{confirmationModal.message}</p><div className="flex gap-3 w-full"><button onClick={() => setConfirmationModal({ ...confirmationModal, isOpen: false })} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50">Cancelar</button><button onClick={executeConfirmationAction} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg ${confirmationModal.confirmColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{confirmationModal.confirmText}</button></div></div></div></div> )}

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex justify-center mb-8">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex overflow-x-auto max-w-full">
                <button onClick={() => setActiveTab('input')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'input' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><FileText size={18} /> Texto</button>
                <button onClick={() => setActiveTab('batch_images')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'batch_images' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Files size={18} /> Imagens (Lote)</button>
                <button onClick={() => setActiveTab('pdf')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'pdf' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Database size={18} /> PDF Massivo</button>
                <button onClick={() => setActiveTab('review')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'review' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><CloudLightning size={18} /> Fila de Aprovação {parsedQuestions.length > 0 && <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{parsedQuestions.length}</span>}</button>
            </div>
        </div>

        {(activeTab==='input'||activeTab==='pdf'||activeTab==='batch_images') && (
            <div className="max-w-4xl mx-auto mb-6 animate-in slide-in-from-top-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2"><Filter size={16} className="text-gray-500"/><span className="text-sm font-bold text-slate-700">Filtros de Pré-definição</span></div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Instituição</label><input value={overrideInst} onChange={e=>setOverrideInst(e.target.value)} placeholder="Ex: ENARE" className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none"/></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ano</label><input type="number" value={overrideYear} onChange={e=>setOverrideYear(e.target.value)} placeholder="Ex: 2026" className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none"/></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Área</label><select value={overrideArea} onChange={e=>{setOverrideArea(e.target.value); setOverrideTopic('');}} className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none bg-white"><option value="">Automático</option>{areasBase.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tópico</label><select value={overrideTopic} onChange={e=>setOverrideTopic(e.target.value)} disabled={!overrideArea} className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none bg-white disabled:bg-gray-50"><option value="">Automático</option>{(themesMap[overrideArea]||[]).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                    </div>
                    {(overrideInst||overrideYear||overrideArea)&&(<div className="bg-blue-50 px-4 py-2 border-t border-blue-100 flex justify-between items-center"><span className="text-xs text-blue-700 font-medium">Filtros ativos.</span><button onClick={()=>{setOverrideInst('');setOverrideYear('');setOverrideArea('');setOverrideTopic('');}} className="text-xs text-red-500 font-bold flex items-center gap-1"><Eraser size={12}/> Limpar</button></div>)}
                </div>
            </div>
        )}

        {activeTab === 'input' && (
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-lg font-bold text-slate-800 mb-2">Cole suas questões</label>
                    <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Cole aqui..." className="w-full h-96 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-mono text-sm resize-y mb-4"/>
                    <div className="flex justify-end gap-3 mt-4"><button onClick={()=>{setRawText('');}} className="px-4 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-bold">Limpar</button><button onClick={processWithAI} disabled={isProcessing||apiKeys.length===0} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 disabled:opacity-50">{isProcessing?<><Loader2 className="animate-spin" size={20}/> Processando...</>:<><Wand2 size={20}/> Enviar</>}</button></div>
                </div>
            </div>
        )}

        {activeTab === 'batch_images' && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-6"><div><label className="block text-lg font-bold text-slate-800 mb-1">Importador de Imagens</label><p className="text-sm text-gray-500">Arraste ou cole (Ctrl+V).</p></div><div className="flex items-center gap-2"><button onClick={clearBatchQueue} disabled={batchStatus!=='idle'&&batchStatus!=='paused'} className="p-2 text-gray-400 hover:text-red-500 rounded-lg disabled:opacity-30"><Trash2 size={20}/></button>{batchStatus==='processing'?<button onClick={toggleBatchProcessing} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-bold flex items-center gap-2"><Pause size={18}/> Pausar</button>:<button onClick={toggleBatchProcessing} disabled={batchImages.length===0} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"><Play size={18}/> Iniciar</button>}</div></div>
                    <div onPaste={handleBatchPaste} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 mb-6 hover:border-blue-400 relative" tabIndex="0"><div className="text-center pointer-events-none p-4"><UploadCloud size={32} className="mx-auto text-gray-400 mb-2"/><p className="text-gray-600 font-bold text-sm">Clique ou Cole (Ctrl+V)</p></div><input type="file" accept="image/*" multiple onChange={handleBatchImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/></div>
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200 h-[500px] overflow-y-auto"><h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex justify-between"><span>Fila ({batchImages.length})</span>{batchStatus==='processing'&&<span className="text-blue-600 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Processando...</span>}</h3>{batchImages.length===0?(<div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50"><Files size={48} className="mb-2"/><p className="text-sm">Vazia</p></div>):(<div className="grid grid-cols-2 md:grid-cols-3 gap-3">{batchImages.map((img)=>(<div key={img.id} className={`relative group rounded-lg overflow-hidden border aspect-square ${img.status==='error'?'border-red-300':'border-gray-200'}`}><img src={img.preview} className="w-full h-full object-cover"/><button onClick={()=>removeBatchImage(img.id)} className="absolute top-1 right-1 bg-white/80 p-1 rounded-full opacity-0 group-hover:opacity-100"><X size={14}/></button>{img.status==='error'&&<div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><span className="text-xs font-bold text-white bg-red-600 px-2 py-1 rounded">{img.errorMsg||'Erro'}</span></div>}</div>))}</div>)}</div>
                        <div className="w-full lg:w-1/3 flex flex-col h-[500px]"><div className="bg-slate-900 rounded-xl overflow-hidden shadow-inner flex flex-col h-full"><div className="p-3 bg-slate-800 border-b border-slate-700 text-gray-400 text-xs font-bold flex items-center gap-2"><Terminal size={14}/> Console</div><div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-gray-300 space-y-1">{batchLogs.map((l,i)=>(<div key={i} className={l.type==='error'?'text-red-400':l.type==='success'?'text-emerald-400':l.type==='warning'?'text-amber-400':'text-blue-300'}><span className="opacity-50 mr-2">[{l.time}]</span>{l.message}</div>))}</div></div></div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'pdf' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-6"><div><label className="block text-lg font-bold text-slate-800 mb-1">Importador PDF</label><p className="text-sm text-gray-500">Massivo (Até 1000 pgs).</p></div><div className="flex gap-2">{pdfStatus!=='idle'&&( <><button onClick={handleResetPdf} disabled={pdfStatus==='processing'} className="p-2 text-gray-400 hover:text-red-500 rounded-lg"><XCircle size={20}/></button><button onClick={handleRestartPdf} disabled={pdfStatus==='processing'} className="p-2 text-gray-400 hover:text-blue-500 rounded-lg"><RotateCcw size={20}/></button></> )}{pdfStatus==='processing'?<button onClick={togglePdfProcessing} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-bold flex items-center gap-2"><Pause size={18}/> Pausar</button>:<button onClick={togglePdfProcessing} disabled={pdfStatus==='idle'||pdfStatus==='reading'||pdfStatus==='completed'||pdfStatus==='error'} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"><Play size={18}/> Iniciar</button>}</div></div>
                    {pdfStatus==='idle'&&( <div className="space-y-4"><div className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-dashed"><div className="flex-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Início</label><input type="number" value={pdfStartPage} onChange={e=>setPdfStartPage(e.target.value)} className="w-full p-2 text-sm border rounded-lg"/></div><div className="flex-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fim</label><input type="number" value={pdfEndPage} onChange={e=>setPdfEndPage(e.target.value)} className="w-full p-2 text-sm border rounded-lg"/></div></div><div className="w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center bg-gray-50 relative"><div className="text-center pointer-events-none p-4"><FileText size={32} className="mx-auto text-gray-400 mb-2"/><p className="text-gray-600 font-bold text-sm">Arraste PDF</p></div><input type="file" accept="application/pdf" onChange={handlePdfUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/></div></div> )}
                    {pdfStatus!=='idle'&&( <div className="space-y-6"><div className="bg-gray-100 rounded-xl p-4 flex justify-between items-center"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${pdfStatus==='error'?'bg-red-100 text-red-600':'bg-blue-100 text-blue-600'}`}>{pdfStatus==='processing'?<Cpu size={24} className="animate-pulse"/>:<CheckCircle size={24}/>}</div><div><p className="font-bold text-slate-800 text-sm uppercase">{pdfStatus}</p><p className="text-xs text-gray-500">{pdfFile?.name} • {pdfChunks.length} partes</p></div></div></div><div className="border rounded-xl p-4 max-h-40 overflow-y-auto"><div className="grid grid-cols-8 gap-2">{pdfChunks.map((c,i)=>(<button key={c.id} onClick={()=>handleJumpToChunk(i)} disabled={pdfStatus==='processing'} className={`h-6 rounded text-xs font-bold ${c.status==='pending'?'bg-gray-50 text-gray-400':c.status==='success'?'bg-emerald-500 text-white':'bg-red-500 text-white'} ${i===currentChunkIndex?'ring-2 ring-blue-500':''}`}>{i+1}</button>))}</div></div><div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-gray-300 h-40 overflow-y-auto shadow-inner flex flex-col-reverse">{processingLogs.map((l,i)=>(<div key={i} className={l.type==='error'?'text-red-400':l.type==='success'?'text-emerald-400':'text-blue-300'}>[{l.time}] {l.message}</div>))}</div></div> )}
                </div>
            </div>
        )}

        {activeTab === 'review' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
                {parsedQuestions.length > 0 && (
                     <div className="flex flex-col gap-4 mb-4">
                         <div className="flex flex-col xl:flex-row justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 gap-4">
                            <div className="flex items-center gap-2 text-blue-800"><CloudLightning size={20} /><span className="font-bold">Fila de Aprovação ({parsedQuestions.length})</span></div>
                            <div className="flex flex-wrap gap-2 justify-end">
                                <button onClick={handleDiscardSuspiciousClick} disabled={isBatchAction} className="bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">{isBatchAction?<Loader2 className="animate-spin" size={14}/>:<ShieldAlert size={14}/>} Descartar Suspeitas</button>
                                <button onClick={handleApproveVerifiedClick} disabled={isBatchAction} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">{isBatchAction?<Loader2 className="animate-spin" size={14}/>:<ShieldCheck size={14}/>} Aprovar Verificadas</button>
                                <div className="w-px h-6 bg-blue-200 mx-1 hidden md:block"></div>
                                <button onClick={handleDiscardAllClick} disabled={isBatchAction} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"><Trash2 size={14}/> Limpar Tudo</button>
                                <button onClick={handleApproveAllClick} disabled={isBatchAction} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50"><CheckCircle size={14}/> Aprovar Tudo</button>
                            </div>
                         </div>
                         <div className="flex items-center gap-2 px-1">
                            <span className="text-xs font-bold text-gray-400 uppercase">Ações Rápidas:</span>
                            <button onClick={() => handleClearAllField('institution')} disabled={isBatchAction} className="text-xs bg-white border border-gray-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 font-medium flex items-center gap-1 shadow-sm disabled:opacity-50">{isBatchAction?<Loader2 size={12} className="animate-spin"/>:<Eraser size={12}/>} Limpar Inst</button>
                            <button onClick={() => handleClearAllField('year')} disabled={isBatchAction} className="text-xs bg-white border border-gray-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 font-medium flex items-center gap-1 shadow-sm disabled:opacity-50">{isBatchAction?<Loader2 size={12} className="animate-spin"/>:<Eraser size={12}/>} Limpar Anos</button>
                         </div>
                     </div>
                )}

                {parsedQuestions.length === 0 ? (
                    <div className="text-center py-20 opacity-50"><Database size={64} className="mx-auto mb-4 text-gray-300" /><p className="text-xl font-medium text-gray-500">Fila vazia.</p><button onClick={() => setActiveTab('input')} className="mt-4 text-blue-600 font-bold hover:underline">Adicionar</button></div>
                ) : (
                    parsedQuestions.map((q, idx) => (
                        <div key={q.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden relative group transition-colors ${q.isDuplicate ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200'}`}>
                            <div className="absolute top-0 right-0 z-10 flex flex-col items-end gap-1">
                                <div className={`p-2 rounded-bl-xl shadow-sm text-xs font-bold flex items-center gap-1 ${q.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-700' : q.verificationStatus === 'suspicious' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{q.verificationStatus === 'verified' && <><ShieldCheck size={14}/> Double-Checked</>}{q.verificationStatus === 'suspicious' && <><ShieldAlert size={14}/> Suspeita</>}{(!q.verificationStatus || q.verificationStatus === 'unchecked') && 'Não Verificada'}</div>
                                {q.isDuplicate && (<div className="bg-amber-100 text-amber-800 p-2 rounded-l-lg shadow-sm text-xs font-bold flex items-center gap-1 animate-pulse"><Copy size={14}/> DUPLICATA</div>)}
                            </div>
                            <div className="h-1.5 w-full bg-gray-100"><div className="h-full bg-orange-400 w-full animate-pulse"></div></div>
                            <div className="p-6 pt-10">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Inst</label><input value={q.institution} onChange={e=>updateQuestionField(idx,'institution',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"/></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Ano</label><input type="number" value={q.year} onChange={e=>updateQuestionField(idx,'year',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"/></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Área</label><select value={q.area} onChange={e=>updateQuestionField(idx,'area',e.target.value)} className="w-full p-2 bg-blue-50 border border-blue-100 rounded-lg text-sm font-bold text-blue-800"><option value="">Selecione...</option>{areasBase.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Tópico</label><select value={q.topic} onChange={e=>updateQuestionField(idx,'topic',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"><option value="">Selecione...</option>{(themesMap[q.area]||[]).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                                </div>
                                <div className="mb-6"><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Enunciado</label><textarea value={q.text} onChange={e=>updateQuestionField(idx,'text',e.target.value)} rows={4} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-800 text-sm outline-none"/></div>
                                <div className="space-y-2 mb-6">{q.options?.map((opt, optIdx) => (<div key={opt.id} className="flex items-center gap-3"><div onClick={()=>updateQuestionField(idx,'correctOptionId',opt.id)} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer font-bold text-sm flex-shrink-0 ${q.correctOptionId===opt.id?'bg-emerald-500 text-white':'bg-gray-100 text-gray-400'}`}>{opt.id.toUpperCase()}</div><input value={opt.text} onChange={e=>updateOptionText(idx,optIdx,e.target.value)} className={`w-full p-2 border rounded-lg text-sm ${q.correctOptionId===opt.id?'border-emerald-200 bg-emerald-50':'bg-white'}`}/></div>))}</div>
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100"><label className="text-xs font-bold text-amber-700 uppercase flex items-center gap-1 mb-2"><Brain size={12}/> Comentário IA</label><textarea value={q.explanation} onChange={e=>updateQuestionField(idx,'explanation',e.target.value)} rows={3} className="w-full p-3 bg-white/50 border border-amber-200/50 rounded-lg text-slate-700 text-sm outline-none"/></div>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
                                <button onClick={()=>handleDiscardOneClick(q)} className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-1"><Trash2 size={16}/> Descartar</button>
                                {q.isDuplicate ? (<button disabled className="bg-amber-200 text-amber-700 font-bold text-sm px-6 py-2.5 rounded-lg flex items-center gap-2 cursor-not-allowed opacity-70"><Copy size={18}/> Duplicada</button>) : (<button onClick={()=>approveQuestion(q)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-lg flex items-center gap-2"><CheckCircle size={18}/> Aprovar</button>)}
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
