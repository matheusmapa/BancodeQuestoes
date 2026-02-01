import React, { useState, useEffect } from 'react';
import { 
  Map, Save, Trash2, Settings, CheckCircle, 
  AlertCircle, FileText, Database, 
  Loader2, Wand2, Cpu, RefreshCw, User, X,
  LogOut, Send, Brain, Image as ImageIcon, UploadCloud, Lock, CloudLightning, ArrowLeft
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, doc, getDoc, deleteDoc, onSnapshot, query, orderBy, setDoc 
} from "firebase/firestore";
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
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

// --- DADOS DE REFERÊNCIA ---
const areasBase = [
  'Clínica Médica', 'Cirurgia Geral', 'Ginecologia e Obstetrícia', 'Pediatria', 'Geriatria'
];

const themesMap = {
    'Clínica Médica': ['Cardiologia', 'Pneumologia', 'Nefrologia', 'Gastroenterologia', 'Endocrinologia', 'Hematologia', 'Reumatologia', 'Infectologia', 'Dermatologia', 'Neurologia'],
    'Cirurgia Geral': ['Trauma (ATLS)', 'Abdome Agudo', 'Hérnias', 'Aparelho Digestivo', 'Pré e Pós-Operatório', 'Cirurgia Vascular', 'Urologia', 'Cirurgia Pediátrica', 'Cirurgia Torácica', 'Queimaduras'],
    'Ginecologia e Obstetrícia': ['Pré-Natal', 'Sangramentos', 'DHEG', 'Parto e Puerpério', 'Anticoncepção', 'Climatério', 'Oncologia Ginecológica', 'Infecções', 'Amenorreias', 'Infertilidade'],
    'Pediatria': ['Neonatologia', 'Crescimento e Desenvolvimento', 'Aleitamento', 'Imunizações', 'Doenças Exantemáticas', 'Doenças Respiratórias', 'Gastro', 'Nefro', 'Emergências', 'Adolescência'],
    'Geriatria': ['Grandes Síndromes', 'Demências', 'Delirium', 'Quedas', 'Polifarmácia', 'Cuidados Paliativos']
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // Chave API FIXA (Fallback Inicial)
  const DEFAULT_KEY = 'AIzaSyDzH8eYaJTdlNGM17CUE0eyCEYPo6lTupA';
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || DEFAULT_KEY);
  
  // Lista de modelos
  const [availableModels, setAvailableModels] = useState([
      { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (Padrão)' }
  ]);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('gemini_model') || 'models/gemini-2.5-flash');
  
  // Estados de Entrada e UI
  const [rawText, setRawText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false); // Loading state para salvar chave
  
  // parsedQuestions reflete os RASCUNHOS do Firebase
  const [parsedQuestions, setParsedQuestions] = useState([]);
  
  const [activeTab, setActiveTab] = useState('input');
  const [notification, setNotification] = useState(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  
  // Estados dos Modais
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  
  // Login Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- AUTH CHECK ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (u) {
            try {
                const userDocRef = doc(db, "users", u.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    setUser(u);
                    // --- PUXAR API KEY GERAL DO BANCO AO LOGAR ---
                    fetchGlobalApiKey();
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

  // --- BUSCAR API KEY GERAL ---
  const fetchGlobalApiKey = async () => {
      try {
          const settingsRef = doc(db, "settings", "global");
          const settingsSnap = await getDoc(settingsRef);
          
          if (settingsSnap.exists() && settingsSnap.data().geminiApiKey) {
              const globalKey = settingsSnap.data().geminiApiKey;
              setApiKey(globalKey);
              localStorage.setItem('gemini_api_key', globalKey); // Atualiza cache local
              // showNotification('success', 'Chave API sincronizada com o banco de dados.');
          }
      } catch (error) {
          console.error("Erro ao buscar chave global:", error);
      }
  };

  // --- LISTENER DE RASCUNHOS (REAL-TIME) ---
  useEffect(() => {
      if (!user) {
          setParsedQuestions([]);
          return;
      }

      // Escuta a coleção 'draft_questions'
      const q = query(collection(db, "draft_questions"), orderBy("createdAt", "desc"));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const drafts = snapshot.docs.map(doc => ({
              ...doc.data(),
              id: doc.id,
              status: 'draft'
          }));
          setParsedQuestions(drafts);
      }, (error) => {
          console.error("Erro ao buscar rascunhos:", error);
          showNotification('error', 'Erro ao sincronizar fila de aprovação.');
      });

      return () => unsubscribe();
  }, [user]);

  // --- HELPER FUNCTIONS ---
  
  // Salvar API Key (NO BANCO GERAL)
  const saveApiKeyFromModal = async () => {
      if (!tempApiKey.trim()) return showNotification('error', 'A chave não pode estar vazia.');
      
      setIsSavingKey(true);
      try {
          // Salva no documento 'settings/global'
          await setDoc(doc(db, "settings", "global"), {
              geminiApiKey: tempApiKey,
              updatedBy: user.email,
              updatedAt: new Date().toISOString()
          }, { merge: true });

          setApiKey(tempApiKey);
          localStorage.setItem('gemini_api_key', tempApiKey);
          setShowApiKeyModal(false);
          showNotification('success', 'Chave API salva no Banco de Dados Geral!');
      } catch (error) {
          console.error(error);
          showNotification('error', 'Erro ao salvar chave no banco: ' + error.message);
      } finally {
          setIsSavingKey(false);
      }
  };

  const handleModelChange = (modelName) => {
      setSelectedModel(modelName);
      localStorage.setItem('gemini_model', modelName);
  };

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogout = () => {
      signOut(auth);
      setParsedQuestions([]);
      setActiveTab('input');
  };

  const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
          const result = reader.result;
          setSelectedImage({
              data: result.split(',')[1],
              mime: file.type,
              preview: result
          });
      };
      reader.readAsDataURL(file);
  };

  const handlePasteImage = (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
              const blob = items[i].getAsFile();
              const reader = new FileReader();
              reader.onloadend = () => {
                  setSelectedImage({
                      data: reader.result.split(',')[1],
                      mime: blob.type,
                      preview: reader.result
                  });
              };
              reader.readAsDataURL(blob);
          }
      }
  };

  // --- PROCESSAMENTO IA ---
  const processWithAI = async () => {
    if (!apiKey) return showNotification('error', 'Chave API inválida.');
    if (activeTab === 'input' && !rawText.trim()) return showNotification('error', 'Cole o texto.');
    if (activeTab === 'image' && !selectedImage) return showNotification('error', 'Selecione uma imagem.');

    setIsProcessing(true);

    const systemPrompt = `
      Você é um especialista em banco de dados médicos (MedMaps).
      Extraia questões no formato JSON ESTRITO.
      
      REGRAS:
      1. Retorne APENAS o JSON (sem markdown).
      2. Tópico: Escolha baseado na lista: ${JSON.stringify(themesMap)}.
      3. Instituição: Se não tiver, vazio "".
      4. Ano: Se não tiver, vazio "".
      5. Gabarito: Deduza se não houver.
      
      Formato Saída:
      [
        {
          "institution": "String", "year": Number|String, "area": "String", "topic": "String",
          "text": "String", "options": [{"id": "a", "text": "String"}],
          "correctOptionId": "char", "explanation": "String"
        }
      ]
    `;

    let contentsPayload = [];
    if (activeTab === 'input') {
        contentsPayload = [{ parts: [{ text: systemPrompt + "\n\nCONTEÚDO:\n" + rawText }] }];
    } else {
        contentsPayload = [{
            parts: [
                { text: systemPrompt + "\n\nAnalise esta imagem:" },
                { inline_data: { mime_type: selectedImage.mime, data: selectedImage.data } }
            ]
        }];
    }

    try {
      const modelNameClean = selectedModel.startsWith('models/') ? selectedModel.replace('models/', '') : selectedModel;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelNameClean}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: contentsPayload })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

      let questions;
      try {
        questions = JSON.parse(jsonString);
      } catch (e) {
        jsonString = jsonString.replace(/[\u0000-\u0019]+/g,""); 
        questions = JSON.parse(jsonString);
      }
      
      let savedCount = 0;
      for (const q of questions) {
          await addDoc(collection(db, "draft_questions"), {
              ...q,
              institution: q.institution || "", 
              year: q.year || "",
              createdAt: new Date().toISOString(),
              createdBy: user.email,
              hasImage: false
          });
          savedCount++;
      }

      setRawText('');
      setSelectedImage(null);
      setActiveTab('review');
      showNotification('success', `${savedCount} questões enviadas para fila de aprovação!`);

    } catch (error) {
      console.error(error);
      if (error.message.includes('JSON')) {
          showNotification('error', 'Erro de formatação da IA. Tente novamente.');
      } else {
          showNotification('error', 'Erro: ' + error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // --- ACTIONS DE APROVAÇÃO ---
  const approveQuestion = async (index) => {
    const q = parsedQuestions[index];
    if (!q.area || !q.topic || !q.text || !q.options || q.options.length < 2) {
      return showNotification('error', 'Preencha os campos obrigatórios antes de aprovar.');
    }

    try {
      const { id, status, createdAt, createdBy, ...finalData } = q;
      await addDoc(collection(db, "questions"), {
        ...finalData,
        createdAt: new Date().toISOString(),
        approvedBy: user.email,
        hasImage: false
      });
      await deleteDoc(doc(db, "draft_questions", id));
      showNotification('success', 'Questão aprovada e publicada!');
      return true;
    } catch (error) {
      console.error(error);
      showNotification('error', 'Erro ao aprovar. Verifique permissões.');
      return false;
    }
  };

  const discardQuestion = async (index) => {
      const q = parsedQuestions[index];
      if (!window.confirm("Tem certeza que deseja excluir este rascunho permanentemente?")) return;
      try {
          await deleteDoc(doc(db, "draft_questions", q.id));
          showNotification('info', 'Rascunho excluído.');
      } catch (error) {
          console.error(error);
          showNotification('error', 'Erro ao excluir.');
      }
  };

  const approveAllDrafts = async () => {
    if (parsedQuestions.length === 0) return;
    if (!window.confirm(`Deseja aprovar e publicar TODAS as ${parsedQuestions.length} questões da fila?`)) return;

    setIsSavingAll(true);
    let successCount = 0;
    const queue = [...parsedQuestions];

    for (let i = 0; i < queue.length; i++) {
        try {
            const q = queue[i];
            const { id, status, createdAt, createdBy, ...finalData } = q;
            await addDoc(collection(db, "questions"), {
                ...finalData,
                createdAt: new Date().toISOString(),
                approvedBy: user.email,
                hasImage: false
            });
            await deleteDoc(doc(db, "draft_questions", id));
            successCount++;
        } catch (err) {
            console.error("Erro ao aprovar em massa:", err);
        }
        await new Promise(r => setTimeout(r, 100));
    }

    setIsSavingAll(false);
    showNotification('success', `${successCount} questões aprovadas!`);
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

  // --- AUTO-DIAGNÓSTICO ---
  const validateKeyAndFetchModels = async () => {
      if (!apiKey) return showNotification('error', 'Configure uma chave API primeiro.');
      setIsValidatingKey(true);
      try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          if (!data.models) throw new Error("Sem acesso a modelos.");

          const genModels = data.models.filter(m => 
              m.supportedGenerationMethods?.includes("generateContent") && (m.name.includes("gemini"))
          );
          
          if (genModels.length > 0) {
              setAvailableModels(genModels);
              const flash25 = genModels.find(m => m.name.includes('2.5-flash') && !m.name.includes('lite'));
              if (flash25) setSelectedModel(flash25.name);
              showNotification('success', `${genModels.length} modelos liberados e sincronizados!`);
          } else {
              showNotification('error', 'Chave válida mas sem modelos Gemini.');
          }
      } catch (error) {
          showNotification('error', `Erro na chave: ${error.message}`);
      } finally {
          setIsValidatingKey(false);
      }
  };

  // --- RENDER LOGIN ---
  const renderLogin = () => (
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
      </div>
  );

  if (isLoadingAuth) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="text-white animate-spin" size={48} /></div>;
  if (!user) return renderLogin();

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 pb-20">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* BOTÃO VOLTAR */}
            <button 
                onClick={() => window.location.href = '/'}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Voltar para o App Principal"
            >
                <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-2">
                <Map className="text-blue-600" size={28} />
                <h1 className="text-xl font-bold text-slate-800">MedMaps Importer</h1>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
            <button onClick={() => { setTempApiKey(apiKey); setShowApiKeyModal(true); }} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 text-sm font-medium"><Settings size={18} /><span className="hidden md:inline">API</span></button>
            <div className="relative group flex-1 md:flex-none w-full md:w-auto flex items-center gap-2">
                <div className="relative">
                    <Cpu size={16} className="absolute left-3 top-3 text-gray-500" />
                    <select value={selectedModel} onChange={(e) => handleModelChange(e.target.value)} className="w-full md:w-56 pl-9 pr-3 py-2 text-sm bg-gray-100 border-none rounded-lg font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none">
                        {availableModels.map(model => (<option key={model.name} value={model.name}>{model.displayName || model.name}</option>))}
                    </select>
                </div>
                <button onClick={validateKeyAndFetchModels} disabled={isValidatingKey || !apiKey} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50" title="Sincronizar Modelos">
                    {isValidatingKey ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18} />}
                </button>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sair"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      {/* NOTIFICATION */}
      {notification && (
        <div className={`fixed top-24 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span className="font-medium">{notification.text}</span>
        </div>
      )}

      {/* API KEY MODAL */}
      {showApiKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                  <button onClick={() => setShowApiKeyModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  <h2 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2"><Settings size={20} className="text-blue-600"/> Configurar API Gemini</h2>
                  <div className="mb-4">
                      <label className="block text-sm font-bold text-gray-600 mb-2">Chave da API (Global)</label>
                      <input type="password" value={tempApiKey} onChange={e => setTempApiKey(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" placeholder="AIza..."/>
                      <p className="text-xs text-gray-500 mt-2">Atenção: Ao salvar, essa chave será usada por TODOS os administradores.</p>
                  </div>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowApiKeyModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold">Cancelar</button>
                      <button 
                        onClick={saveApiKeyFromModal} 
                        disabled={isSavingKey}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2"
                      >
                          {isSavingKey ? <Loader2 size={16} className="animate-spin" /> : null}
                          Salvar Global
                      </button>
                  </div>
              </div>
          </div>
      )}

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex justify-center mb-8">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
                <button onClick={() => setActiveTab('input')} className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'input' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><FileText size={18} /> Texto</button>
                <button onClick={() => setActiveTab('image')} className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'image' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><ImageIcon size={18} /> Imagem</button>
                <button onClick={() => setActiveTab('review')} className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'review' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                    <CloudLightning size={18} /> Fila de Aprovação 
                    {parsedQuestions.length > 0 && <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{parsedQuestions.length}</span>}
                </button>
            </div>
        </div>

        {/* INPUT TABS */}
        {(activeTab === 'input' || activeTab === 'image') && (
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-lg font-bold text-slate-800 mb-2">
                        {activeTab === 'input' ? 'Cole suas questões (Texto)' : 'Envie uma Imagem'}
                    </label>
                    <p className="text-sm text-gray-500 mb-4">A IA vai analisar e enviar para a fila de aprovação (Database).</p>
                    
                    {activeTab === 'input' ? (
                        <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Cole aqui o texto..." className="w-full h-96 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-mono text-sm resize-y mb-4"/>
                    ) : (
                        <div className="w-full h-96 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden transition-all hover:border-blue-400" onPaste={handlePasteImage}>
                            {selectedImage ? (
                                <>
                                    <img src={selectedImage.preview} alt="Preview" className="w-full h-full object-contain p-2" />
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }} className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600"><Trash2 size={20} /></button>
                                </>
                            ) : (
                                <div className="text-center pointer-events-none p-4"><UploadCloud size={48} className="mx-auto text-gray-400 mb-3" /><p className="text-gray-500 font-medium">Clique ou cole (Ctrl+V)</p></div>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={!!selectedImage}/>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => { setRawText(''); setSelectedImage(null); }} className="px-4 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-bold">Limpar</button>
                        <button onClick={processWithAI} disabled={isProcessing || !apiKey} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isProcessing ? <><Loader2 className="animate-spin" size={20} /> Processando...</> : <><Wand2 size={20} /> Enviar para Fila</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* REVIEW TAB */}
        {activeTab === 'review' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
                {parsedQuestions.length > 0 && (
                     <div className="flex justify-between items-center mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-800">
                            <CloudLightning size={20} />
                            <span className="font-bold">Fila de Aprovação (Banco de Dados)</span>
                        </div>
                        <button onClick={approveAllDrafts} disabled={isSavingAll} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed">
                            {isSavingAll ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                            {isSavingAll ? 'Aprovando...' : 'Aprovar Tudo'}
                        </button>
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
                        <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative group">
                            <div className="h-1.5 w-full bg-gray-100"><div className="h-full bg-orange-400 w-full animate-pulse"></div></div>
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
                                <button onClick={()=>discardQuestion(idx)} className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-1"><Trash2 size={16}/> Descartar</button>
                                <button onClick={()=>approveQuestion(idx)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-lg flex items-center gap-2"><CheckCircle size={18}/> Aprovar e Publicar</button>
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
