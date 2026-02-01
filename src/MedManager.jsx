import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Edit3, Trash2, Save, X, CheckCircle, 
  AlertCircle, Database, LayoutGrid, List, ChevronDown, 
  ChevronRight, ArrowLeft, LogOut, Loader2, FileText, 
  CheckSquare, BookOpen, AlertTriangle, Copy, Hash
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, doc, getDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy
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
        className="fixed top-24 right-4 z-[100] p-4 rounded-xl shadow-xl flex items-start gap-3 animate-in slide-in-from-right-10 duration-300 max-w-sm border bg-white border-gray-200 text-slate-800"
    >
        <div className={`mt-0.5 p-1 rounded-full ${notification.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
        </div>
        <div className="flex-1">
            <p className="font-bold text-sm mb-1">{notification.type === 'error' ? 'Erro' : 'Sucesso'}</p>
            <p className="text-sm opacity-90 leading-tight">{notification.text}</p>
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
  const [loadingData, setLoadingData] = useState(true);
  
  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('Todas');
  const [selectedTopic, setSelectedTopic] = useState('Todos');
  
  // Edit State
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // UI State
  const [notification, setNotification] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  
  // Login Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- AUTH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (u) {
            const userDoc = await getDoc(doc(db, "users", u.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                setUser(u);
            } else {
                await signOut(auth);
                showNotification('error', 'Acesso negado.');
            }
        }
        setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- LOAD QUESTIONS ---
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setQuestions(list);
        setLoadingData(false);
    });
    return () => unsubscribe();
  }, [user]);

  // --- FILTER LOGIC ---
  const filteredQuestions = useMemo(() => {
      return questions.filter(q => {
          const matchesSearch = 
              q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
              q.institution?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              q.year?.toString().includes(searchTerm) ||
              q.id.toLowerCase().includes(searchTerm.toLowerCase()); // Incluindo ID na busca
          
          const matchesArea = selectedArea === 'Todas' || q.area === selectedArea;
          const matchesTopic = selectedTopic === 'Todos' || q.topic === selectedTopic;

          return matchesSearch && matchesArea && matchesTopic;
      });
  }, [questions, searchTerm, selectedArea, selectedTopic]);

  const showNotification = (type, text) => setNotification({ type, text });

  // --- ACTIONS ---
  const handleSave = async (e) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          const { id, ...data } = editingQuestion;
          await updateDoc(doc(db, "questions", id), data);
          showNotification('success', 'Questão atualizada com sucesso!');
          setEditingQuestion(null);
      } catch (error) {
          console.error(error);
          showNotification('error', 'Erro ao salvar: ' + error.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async () => {
      if (!deleteModal) return;
      try {
          await deleteDoc(doc(db, "questions", deleteModal.id));
          showNotification('success', 'Questão excluída.');
          setDeleteModal(null);
      } catch (error) {
          showNotification('error', 'Erro ao excluir.');
      }
  };

  // --- COPY FUNCTION BLINDADA ---
  const copyToClipboard = async (text) => {
      // Tenta API moderna primeiro
      if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
              await navigator.clipboard.writeText(text);
              showNotification('success', 'ID copiado!');
              return;
          } catch (err) {
              console.warn("Clipboard API falhou, tentando fallback...", err);
          }
      }

      // Fallback para iframes/ambientes restritos (execCommand)
      try {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          
          // Estiliza para ficar invisível mas interativo
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          textArea.style.top = "0";
          
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
              showNotification('success', 'ID copiado!');
          } else {
              throw new Error("Comando de cópia falhou");
          }
      } catch (err) {
          console.error("Fallback também falhou", err);
          showNotification('error', 'Não foi possível copiar automaticamente. Copie manualmente.');
      }
  };

  // --- RENDER HELPERS ---
  const availableTopics = selectedArea === 'Todas' ? [] : (themesMap[selectedArea] || []);

  if (isLoadingAuth) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="text-white animate-spin" size={48} /></div>;
  if (!user) return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">MedManager</h1>
          <p className="text-gray-500 text-center mb-6">Gestão de Acervo</p>
          <form onSubmit={(e) => { e.preventDefault(); signInWithEmailAndPassword(auth, email, password); }} className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-xl"/>
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-xl"/>
            <button className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900">Entrar</button>
          </form>
        </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 flex">
      <NotificationToast notification={notification} onClose={() => setNotification(null)} />
      
      {/* SIDEBAR FILTER */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-10 flex flex-col">
          <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-xl mb-1">
                  <Database /> MedManager
              </div>
              <p className="text-xs text-gray-400">Gestão de Acervo v1.0</p>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-6">
              <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Filtros</label>
                  <div className="space-y-2">
                      <div className="relative">
                          <Filter size={16} className="absolute left-3 top-3 text-gray-400" />
                          <select 
                            value={selectedArea} 
                            onChange={e => { setSelectedArea(e.target.value); setSelectedTopic('Todos'); }} 
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                          >
                              <option value="Todas">Todas as Áreas</option>
                              {areasBase.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                      </div>

                      <div className="relative">
                          <BookOpen size={16} className="absolute left-3 top-3 text-gray-400" />
                          <select 
                            value={selectedTopic} 
                            onChange={e => setSelectedTopic(e.target.value)} 
                            disabled={selectedArea === 'Todas'}
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none disabled:opacity-50"
                          >
                              <option value="Todos">Todos os Tópicos</option>
                              {availableTopics.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                      </div>
                  </div>
              </div>

              <div>
                  <div className="flex items-center justify-between mb-2">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estatísticas</label>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <div className="text-3xl font-bold text-blue-700">{filteredQuestions.length}</div>
                      <div className="text-xs text-blue-600 font-medium">Questões Listadas</div>
                  </div>
              </div>
          </div>

          <div className="p-4 border-t border-gray-100">
              <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 text-sm font-bold w-full p-2 rounded-lg hover:bg-gray-50 transition-colors mb-2">
                  <ArrowLeft size={16} /> Voltar ao App
              </button>
              <button onClick={() => signOut(auth)} className="flex items-center gap-2 text-red-400 hover:text-red-600 text-sm font-bold w-full p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <LogOut size={16} /> Sair
              </button>
          </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-64 flex-1 p-8">
          {/* HEADER SEARCH */}
          <div className="flex items-center justify-between mb-8 gap-4">
              <div className="relative flex-1 max-w-2xl">
                  <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar por enunciado, instituição, ano ou ID..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  />
              </div>
          </div>

          {/* LIST */}
          {loadingData ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>
          ) : (
              <div className="space-y-4">
                  {filteredQuestions.length === 0 ? (
                      <div className="text-center py-20 opacity-50">
                          <Database size={64} className="mx-auto mb-4 text-gray-300" />
                          <p className="text-xl font-medium text-gray-500">Nenhuma questão encontrada com estes filtros.</p>
                      </div>
                  ) : (
                      filteredQuestions.map(q => (
                          <div key={q.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col md:flex-row gap-4 items-start">
                              <div className="flex-1 min-w-0">
                                  {/* CORREÇÃO DO LAYOUT DAS TAGS */}
                                  <div className="flex flex-wrap items-center gap-y-2 gap-x-2 mb-2">
                                      <span 
                                        onClick={() => copyToClipboard(q.id)}
                                        className="bg-slate-100 text-slate-500 text-xs font-mono px-2 py-1 rounded cursor-pointer hover:bg-slate-200 flex items-center gap-1 border border-slate-200 transition-colors"
                                        title="Clique para copiar ID"
                                      >
                                          <Hash size={10}/> {q.id.slice(0, 8)}...
                                      </span>
                                      
                                      <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase whitespace-nowrap">{q.institution || 'N/A'}</span>
                                      <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{q.year || '----'}</span>
                                      
                                      <span className="text-xs font-medium text-gray-400 hidden sm:inline">•</span>
                                      
                                      {/* Grupo Área + Tópico para evitar quebra feia */}
                                      <div className="flex items-center flex-wrap gap-1">
                                          <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{q.area}</span>
                                          <span className="text-xs font-medium text-gray-400">/</span>
                                          <span className="text-xs font-medium text-slate-500">{q.topic}</span>
                                      </div>
                                  </div>

                                  <p className="text-slate-800 text-sm line-clamp-2 mb-3">{q.text}</p>
                                  <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                                      <span className="flex items-center gap-1"><CheckSquare size={14}/> Gab: {q.correctOptionId?.toUpperCase()}</span>
                                      <span className="flex items-center gap-1"><FileText size={14}/> {q.options?.length} Alternativas</span>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2 self-start md:self-center">
                                  <button onClick={() => setEditingQuestion(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Editar Completo">
                                      <Edit3 size={18} />
                                  </button>
                                  <button onClick={() => setDeleteModal(q)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Excluir">
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          )}
      </main>

      {/* EDIT MODAL - FULL SCREEN OVERLAY */}
      {editingQuestion && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto animate-in fade-in duration-200">
              <div className="max-w-4xl mx-auto p-6 pb-20">
                  <div className="flex items-center justify-between mb-8 sticky top-0 bg-white py-4 border-b border-gray-100 z-10">
                      <div>
                          <div className="flex items-center gap-3">
                              <button onClick={() => setEditingQuestion(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft size={24} /></button>
                              <h2 className="text-2xl font-bold text-slate-900">Editar Questão</h2>
                          </div>
                          <div 
                              onClick={() => copyToClipboard(editingQuestion.id)}
                              className="ml-12 mt-1 text-xs font-mono text-gray-400 flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors w-fit"
                              title="Copiar ID Completo"
                          >
                              ID: {editingQuestion.id} <Copy size={12}/>
                          </div>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => setEditingQuestion(null)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
                          <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg flex items-center gap-2">
                              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                              Salvar Alterações
                          </button>
                      </div>
                  </div>

                  <form className="space-y-8">
                      {/* Metadata */}
                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-bold text-gray-600 mb-2">Instituição</label>
                              <input value={editingQuestion.institution} onChange={e => setEditingQuestion({...editingQuestion, institution: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"/>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-600 mb-2">Ano</label>
                              <input type="number" value={editingQuestion.year} onChange={e => setEditingQuestion({...editingQuestion, year: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"/>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-600 mb-2">Área</label>
                              <select value={editingQuestion.area} onChange={e => setEditingQuestion({...editingQuestion, area: e.target.value, topic: ''})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                                  {areasBase.map(a => <option key={a} value={a}>{a}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-600 mb-2">Tópico</label>
                              <select value={editingQuestion.topic} onChange={e => setEditingQuestion({...editingQuestion, topic: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                                  {(themesMap[editingQuestion.area] || []).map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                      </div>

                      {/* Enunciado */}
                      <div>
                          <label className="block text-lg font-bold text-slate-900 mb-3">Enunciado</label>
                          <textarea 
                              value={editingQuestion.text} 
                              onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})}
                              rows={6}
                              className="w-full p-4 border border-gray-300 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-lg leading-relaxed text-slate-800"
                          />
                      </div>

                      {/* Options */}
                      <div className="space-y-4">
                          <label className="block text-lg font-bold text-slate-900">Alternativas</label>
                          {editingQuestion.options.map((opt, idx) => (
                              <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-colors ${editingQuestion.correctOptionId === opt.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                                  <div 
                                    onClick={() => setEditingQuestion({...editingQuestion, correctOptionId: opt.id})}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer font-bold flex-shrink-0 mt-1 transition-colors ${editingQuestion.correctOptionId === opt.id ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                                  >
                                      {opt.id.toUpperCase()}
                                  </div>
                                  <textarea 
                                      value={opt.text}
                                      onChange={e => {
                                          const newOpts = [...editingQuestion.options];
                                          newOpts[idx].text = e.target.value;
                                          setEditingQuestion({...editingQuestion, options: newOpts});
                                      }}
                                      rows={2}
                                      className="flex-1 bg-transparent border-none outline-none resize-none text-slate-700"
                                  />
                              </div>
                          ))}
                      </div>

                      {/* Explanation */}
                      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                          <label className="block text-sm font-bold text-amber-800 uppercase tracking-wider mb-3">Comentário / Explicação</label>
                          <textarea 
                              value={editingQuestion.explanation} 
                              onChange={e => setEditingQuestion({...editingQuestion, explanation: e.target.value})}
                              rows={5}
                              className="w-full p-4 bg-white border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
                          />
                      </div>
                  </form>
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
                    <p className="text-gray-600 mb-6 text-sm">Essa questão será removida do banco de dados oficial. Isso pode afetar simulados passados de alunos.</p>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setDeleteModal(null)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200">Sim, Excluir</button>
                    </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
