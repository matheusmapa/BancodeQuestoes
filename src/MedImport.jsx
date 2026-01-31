import React, { useState, useEffect } from 'react';
import { 
  Map, Save, Trash2, Settings, CheckCircle, 
  AlertCircle, FileText, Database, 
  Loader2, Wand2, Cpu, RefreshCw, User, X,
  LogOut, Send, Brain, Image as ImageIcon, UploadCloud, Lock
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, doc, getDoc 
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
  
  // Chave API FIXA (Padrão)
  const DEFAULT_KEY = 'AIzaSyDzH8eYaJTdlNGM17CUE0eyCEYPo6lTupA';
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || DEFAULT_KEY);
  
  // Lista de modelos inicial
  const [availableModels, setAvailableModels] = useState([
      { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (Padrão)' }
  ]);
  
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('gemini_model') || 'models/gemini-2.5-flash');
  
  // Estados de Entrada e UI
  const [rawText, setRawText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('input');
  const [notification, setNotification] = useState(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  
  // Estados dos Modais
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(''); // Para edição no modal
  
  // Login Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- AUTH CHECK COM ROLE ADMIN ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (u) {
            // Se logou, verifica se é admin
            try {
                const userDocRef = doc(db, "users", u.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    setUser(u);
                } else {
                    // Se não for admin ou não tiver doc, desloga
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

  // --- GERENCIAMENTO DA API KEY ---
  const openApiKeyModal = () => {
      setTempApiKey(apiKey);
      setShowApiKeyModal(true);
  };

  const saveApiKeyFromModal = () => {
      setApiKey(tempApiKey);
      localStorage.setItem('gemini_api_key', tempApiKey);
      setShowApiKeyModal(false);
      showNotification('success', 'Chave de API atualizada!');
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

  // --- TRATAMENTO DE IMAGEM ---
  const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          const result = reader.result;
          const base64Data = result.split(',')[1];
          setSelectedImage({
              data: base64Data,
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
                  const result = reader.result;
                  const base64Data = result.split(',')[1];
                  setSelectedImage({
                      data: base64Data,
                      mime: blob.type,
                      preview: result
                  });
              };
              reader.readAsDataURL(blob);
          }
      }
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
              m.supportedGenerationMethods?.includes("generateContent") &&
              (m.name.includes("gemini"))
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

  // --- PROCESSAMENTO COM IA ---
  const processWithAI = async () => {
    if (!apiKey) return showNotification('error', 'Chave API inválida.');
    
    if (activeTab === 'input' && !rawText.trim()) return showNotification('error', 'Cole o texto da questão.');
    if (activeTab === 'image' && !selectedImage) return showNotification('error', 'Selecione ou cole uma imagem.');

    setIsProcessing(true);

    const systemPrompt = `
      Você é um especialista em banco de dados médicos (MedMaps).
      Analise o conteúdo (texto ou imagem) e extraia as questões no formato JSON ESTRITO.

      REGRAS CRÍTICAS:
      1. Retorne APENAS o array JSON. Nada de markdown (sem \`\`\`json).
      2. Tópico: DEVE ser um destes, baseado na Área detectada: ${JSON.stringify(themesMap)}. Se não encaixar perfeitamente, escolha o mais próximo dessa lista.
      3. Instituição: Se não encontrar no texto, retorne STRING VAZIA "".
      4. Ano: Se não encontrar, retorne NULL ou numero 0.
      5. JSON Limpo: Não use quebras de linha reais dentro das strings. Use \\n para quebras de linha no texto.
      6. Gabarito: Se não houver, deduza e marque.
      
      Formato de Saída (Array de Objetos):
      [
        {
          "institution": "String ou Vazio",
          "year": Number ou Null,
          "area": "Uma das Grandes Áreas",
          "topic": "Um dos tópicos da lista acima",
          "text": "Enunciado completo",
          "options": [{"id": "a", "text": "Texto da alternativa"}],
          "correctOptionId": "letra minúscula",
          "explanation": "Comentário didático"
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

      let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!jsonString) throw new Error("A IA não retornou texto.");

      jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

      let questions;
      try {
        questions = JSON.parse(jsonString);
      } catch (e) {
        jsonString = jsonString.replace(/[\u0000-\u0019]+/g,""); 
        questions = JSON.parse(jsonString);
      }
      
      const questionsWithIds = questions.map(q => ({
        ...q,
        institution: q.institution || "", 
        year: q.year || "",
        tempId: Date.now() + Math.random(),
        status: 'pending'
      }));

      setParsedQuestions(prev => [...prev, ...questionsWithIds]);
      setRawText('');
      setSelectedImage(null);
      setActiveTab('review');
      showNotification('success', `${questions.length} questões processadas!`);

    } catch (error) {
      if (error.message.includes('JSON')) {
          showNotification('error', 'A IA errou a formatação. Tente novamente.');
      } else {
          showNotification('error', 'Erro: ' + error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // --- FIREBASE ACTIONS ---
  const saveQuestion = async (index) => {
    const q = parsedQuestions[index];
    if (!q.area || !q.topic || !q.text || q.options.length < 2) {
      return showNotification('error', 'Preencha os campos obrigatórios.');
    }

    try {
      const { tempId, status, ...dbData } = q;
      await addDoc(collection(db, "questions"), {
        ...dbData,
        createdAt: new Date().toISOString(),
        hasImage: false
      });

      const newQuestions = [...parsedQuestions];
      newQuestions[index].status = 'saved';
      setParsedQuestions(newQuestions);
      return true;

    } catch (error) {
      showNotification('error', 'Erro ao salvar. Verifique permissões.');
      return false;
    }
  };

  const saveAllPending = async () => {
    const pendingIndexes = parsedQuestions
        .map((q, idx) => q.status === 'pending' ? idx : -1)
        .filter(idx => idx !== -1);
    
    if (pendingIndexes.length === 0) return showNotification('info', 'Nada pendente para salvar.');
    
    if (!window.confirm(`Deseja salvar ${pendingIndexes.length} questões de uma vez?`)) return;

    setIsSavingAll(true);
    let successCount = 0;

    for (const idx of pendingIndexes) {
        const success = await saveQuestion(idx);
        if (success) successCount++;
        await new Promise(r => setTimeout(r, 200)); 
    }

    setIsSavingAll(false);
    showNotification('success', `${successCount} questões salvas com sucesso!`);
  };

  // --- LOGIN HANDLE ---
  const handleLogin = (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
          // A verificação real de role acontece no onAuthStateChanged
          // mas podemos dar um feedback inicial
          showNotification('success', 'Verificando permissões...');
      })
      .catch(err => showNotification('error', 'Login falhou: ' + err.message));
  };

  const removeQuestion = (idx) => setParsedQuestions(prev => prev.filter((_, i) => i !== idx));
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

  // --- RENDER: LOGIN SCREEN (BLOQUEANTE) ---
  if (isLoadingAuth) {
      return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="text-white animate-spin" size={48} /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3 mb-6 justify-center">
             <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/20"><Map className="text-white" size={32} /></div>
             <h1 className="text-2xl font-bold text-slate-800">MedMaps Admin</h1>
          </div>
          <p className="text-slate-500 text-center mb-6">Área restrita para administradores.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" placeholder="Email admin" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <input 
              type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <button className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-2">
                <Lock size={18} /> Acessar Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER: MAIN APP ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 pb-20">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Map className="text-blue-600" size={28} />
            <h1 className="text-xl font-bold text-slate-800">MedMaps Importer</h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
            
            {/* BOTÃO DE CONFIGURAÇÃO DA CHAVE (MODAL) */}
            <button 
                onClick={openApiKeyModal}
                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 text-sm font-medium"
                title="Configurar API Key"
            >
                <Settings size={18} />
                <span className="hidden md:inline">API Config</span>
            </button>

            {/* SELETOR DE MODELO */}
            <div className="relative group flex-1 md:flex-none w-full md:w-auto flex items-center gap-2">
                <div className="relative">
                    <Cpu size={16} className="absolute left-3 top-3 text-gray-500" />
                    <select 
                        value={selectedModel} 
                        onChange={(e) => handleModelChange(e.target.value)}
                        className="w-full md:w-56 pl-9 pr-3 py-2 text-sm bg-gray-100 border-none rounded-lg font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                    >
                        {availableModels.map(model => (
                            <option key={model.name} value={model.name}>
                                {model.displayName || model.name.replace('models/', '')}
                            </option>
                        ))}
                    </select>
                </div>
                <button 
                    onClick={validateKeyAndFetchModels}
                    disabled={isValidatingKey || !apiKey}
                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                    title="Sincronizar Modelos"
                >
                    {isValidatingKey ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18} />}
                </button>
            </div>

            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sair">
                <LogOut size={20} />
            </button>
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

      {/* MODAL DE API KEY */}
      {showApiKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                  <button onClick={() => setShowApiKeyModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  <h2 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2"><Settings size={20} className="text-blue-600"/> Configurar API Gemini</h2>
                  
                  <div className="mb-4">
                      <label className="block text-sm font-bold text-gray-600 mb-2">Chave da API (Google AI Studio)</label>
                      <input 
                        type="password" 
                        value={tempApiKey} 
                        onChange={e => setTempApiKey(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                        placeholder="Cole sua chave AIza..."
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Essa chave é salva apenas no seu navegador local.
                      </p>
                  </div>

                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowApiKeyModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold">Cancelar</button>
                      <button onClick={saveApiKeyFromModal} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg">Salvar Alterações</button>
                  </div>
              </div>
          </div>
      )}

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {/* TABS */}
        <div className="flex justify-center mb-8">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
                <button onClick={() => setActiveTab('input')} className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'input' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                    <FileText size={18} /> Texto
                </button>
                <button onClick={() => setActiveTab('image')} className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'image' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                    <ImageIcon size={18} /> Imagem
                </button>
                <button onClick={() => setActiveTab('review')} className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'review' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                    <CheckCircle size={18} /> Revisão ({parsedQuestions.filter(q => q.status !== 'saved').length})
                </button>
            </div>
        </div>

        {activeTab === 'input' && (
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-lg font-bold text-slate-800 mb-2">Cole suas questões (Texto)</label>
                    <p className="text-sm text-gray-500 mb-4">
                        A IA irá classificar automaticamente com base nos temas cadastrados.
                    </p>
                    
                    <textarea 
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="Cole aqui o texto do PDF..."
                        className="w-full h-96 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-mono text-sm resize-y mb-4"
                    />

                    <div className="flex justify-end gap-3">
                        <button onClick={() => setRawText('')} className="px-4 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-bold">Limpar</button>
                        <button onClick={processWithAI} disabled={isProcessing || !apiKey} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isProcessing ? <><Loader2 className="animate-spin" size={20} /> Processando...</> : <><Wand2 size={20} /> Processar Texto</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'image' && (
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" onPaste={handlePasteImage}>
                    <label className="block text-lg font-bold text-slate-800 mb-2">Envie uma Imagem (Print ou Foto)</label>
                    <p className="text-sm text-gray-500 mb-4">
                        Arraste, selecione ou dê <b>Ctrl+V</b> na imagem da questão.
                    </p>
                    
                    <div className="w-full h-96 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden transition-all hover:border-blue-400">
                        {selectedImage ? (
                            <>
                                <img src={selectedImage.preview} alt="Preview" className="w-full h-full object-contain p-2" />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
                                    className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </>
                        ) : (
                            <div className="text-center pointer-events-none p-4">
                                <UploadCloud size={48} className="mx-auto text-gray-400 mb-3" />
                                <p className="text-gray-500 font-medium">Clique para selecionar ou cole (Ctrl+V)</p>
                            </div>
                        )}
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={!!selectedImage}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => setSelectedImage(null)} className="px-4 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-bold" disabled={!selectedImage}>Remover</button>
                        <button onClick={processWithAI} disabled={isProcessing || !apiKey || !selectedImage} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isProcessing ? <><Loader2 className="animate-spin" size={20} /> Lendo Imagem...</> : <><Wand2 size={20} /> Processar Imagem</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'review' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
                {/* BULK ACTION HEADER */}
                {parsedQuestions.filter(q => q.status !== 'saved').length > 0 && (
                     <div className="flex justify-end mb-4">
                        <button 
                            onClick={saveAllPending}
                            disabled={isSavingAll}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSavingAll ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                            {isSavingAll ? 'Enviando...' : 'Salvar Todas Pendentes'}
                        </button>
                     </div>
                )}

                {parsedQuestions.filter(q => q.status !== 'saved').length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Database size={64} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-xl font-medium text-gray-500">Tudo limpo por aqui.</p>
                        <button onClick={() => setActiveTab('input')} className="mt-4 text-blue-600 font-bold hover:underline">Adicionar mais</button>
                    </div>
                ) : (
                    parsedQuestions.map((q, idx) => {
                        if (q.status === 'saved') return null;
                        return (
                            <div key={q.tempId} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative group">
                                <div className="h-1.5 w-full bg-gray-100"><div className="h-full bg-orange-400 w-1/3"></div></div>
                                <div className="p-6">
                                    {/* CAMPOS SUPERIORES */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Inst</label>
                                            <input value={q.institution} onChange={e=>updateQuestionField(idx,'institution',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold" placeholder="Vazio se n/a"/>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Ano</label>
                                            <input type="number" value={q.year} onChange={e=>updateQuestionField(idx,'year',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold" placeholder="Vazio se n/a"/>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Área</label>
                                            <select value={q.area} onChange={e=>updateQuestionField(idx,'area',e.target.value)} className="w-full p-2 bg-blue-50 border border-blue-100 rounded-lg text-sm font-bold text-blue-800"><option value="">Selecione...</option>{areasBase.map(a=><option key={a} value={a}>{a}</option>)}</select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Tópico</label>
                                            <select value={q.topic} onChange={e=>updateQuestionField(idx,'topic',e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-sm font-bold"><option value="">Selecione...</option>{(themesMap[q.area]||[]).map(t=><option key={t} value={t}>{t}</option>)}</select>
                                        </div>
                                    </div>

                                    {/* ENUNCIADO */}
                                    <div className="mb-6">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Enunciado</label>
                                        <textarea value={q.text} onChange={e=>updateQuestionField(idx,'text',e.target.value)} rows={4} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"/>
                                    </div>

                                    {/* ALTERNATIVAS */}
                                    <div className="space-y-2 mb-6">
                                        {q.options.map((opt, optIdx) => (
                                            <div key={opt.id} className="flex items-center gap-3">
                                                <div onClick={()=>updateQuestionField(idx,'correctOptionId',opt.id)} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer font-bold text-sm flex-shrink-0 ${q.correctOptionId===opt.id?'bg-emerald-500 text-white':'bg-gray-100 text-gray-400'}`}>{opt.id.toUpperCase()}</div>
                                                <input value={opt.text} onChange={e=>updateOptionText(idx,optIdx,e.target.value)} className={`w-full p-2 border rounded-lg text-sm ${q.correctOptionId===opt.id?'border-emerald-200 bg-emerald-50':'bg-white'}`}/>
                                            </div>
                                        ))}
                                    </div>

                                    {/* COMENTÁRIO */}
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                        <label className="text-xs font-bold text-amber-700 uppercase flex items-center gap-1 mb-2"><Brain size={12}/> Comentário IA</label>
                                        <textarea value={q.explanation} onChange={e=>updateQuestionField(idx,'explanation',e.target.value)} rows={3} className="w-full p-3 bg-white/50 border border-amber-200/50 rounded-lg text-slate-700 text-sm focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"/>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
                                    <button onClick={()=>removeQuestion(idx)} className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-1"><Trash2 size={16}/> Descartar</button>
                                    <button onClick={()=>saveQuestion(idx)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-lg flex items-center gap-2"><Save size={18}/> Salvar</button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        )}
      </main>
    </div>
  );
}
