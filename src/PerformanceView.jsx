import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Target, X, Zap, Play, PlayCircle, TrendingUp, 
  Activity, Calendar, TrendingDown, CheckSquare, Square, Loader2 
} from 'lucide-react';

export default function PerformanceView({ 
    detailedStats, 
    simulations, 
    allQuestions, 
    onLaunchExam, 
    onLaunchSmartExam, 
    onBack,
    areasBase // <--- Recebendo as áreas via props
}) {
    // 1. Loading Geral: Se não tiver questões, retorna loading IMEDIATAMENTE.
    if (allQuestions.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 pb-20">
                <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-700 animate-pulse">Carregando dados...</h3>
                <p className="text-slate-400 text-sm">Analisando seu desempenho</p>
            </div>
        );
    }

    const [scope, setScope] = useState('Todas'); 
    const [topicSort, setTopicSort] = useState('worst'); 
    const [areaSort, setAreaSort] = useState('default');

    // Estado para os Modais
    const [trainModalOpen, setTrainModalOpen] = useState(false);
    const [smartReviewModalOpen, setSmartReviewModalOpen] = useState(false);
    const [trainQuantity, setTrainQuantity] = useState(10);
    const [selectedTrainTopics, setSelectedTrainTopics] = useState([]);

    const { totalQuestions, totalCorrect } = detailedStats;
    const globalPercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // --- DADOS DOS ÚLTIMOS 7 DIAS ---
    const statsLast7Days = useMemo(() => {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        sevenDaysAgo.setHours(0,0,0,0);

        let total = 0;
        let correct = 0;

        simulations.forEach(sim => {
            if (sim.status !== 'finished' || !sim.answersData || !sim.date) return;
            const parts = sim.date.split('/');
            if(parts.length !== 3) return;
            const simDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            
            if (simDate >= sevenDaysAgo) {
                 const questions = sim.questionsData || (sim.questionIds ? sim.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) : []);
                 questions.forEach((q, idx) => {
                     const userAnswer = sim.answersData[idx];
                     if(userAnswer) {
                         total++;
                         if(userAnswer === q.correctOptionId) correct++;
                     }
                 });
            }
        });
        return { total, correct };
    }, [simulations, allQuestions]);

    // --- LOGICA DO CADERNO DE ERROS ---
    const errorPool = useMemo(() => {
        const wrongQuestionIds = new Set();
        simulations.forEach(sim => {
            if (sim.status !== 'finished' || !sim.answersData) return;
            const questions = sim.questionsData || (sim.questionIds ? sim.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) : []);
            questions.forEach((q, idx) => {
                const userAnswer = sim.answersData[idx];
                if (userAnswer && userAnswer !== q.correctOptionId) {
                    wrongQuestionIds.add(q.id);
                }
            });
        });
        return allQuestions.filter(q => wrongQuestionIds.has(q.id));
    }, [simulations, allQuestions]);

    // --- DADOS DO GRÁFICO DE EVOLUÇÃO ---
    const evolutionData = useMemo(() => {
        const finished = simulations.filter(s => s.status === 'finished');
        const last10 = finished.slice(0, 10).reverse();
        return last10.map(sim => {
            const pct = sim.total > 0 ? Math.round((sim.correct / sim.total) * 100) : 0;
            const shortDate = sim.date.split('/').slice(0, 2).join('/'); 
            return { id: sim.id, date: shortDate, percentage: pct, total: sim.total };
        });
    }, [simulations]);

    // --- CÁLCULO BRUTO DE TÓPICOS ---
    const allTopicsRaw = useMemo(() => {
        if (simulations.length === 0 || allQuestions.length === 0) return [];
        const stats = {};
        simulations.forEach(sim => {
            if (sim.status !== 'finished' || !sim.answersData) return;
            const questions = sim.questionsData || (sim.questionIds ? sim.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) : []);
            questions.forEach((q, idx) => {
                const userAnswer = sim.answersData[idx];
                if (!userAnswer) return; 
                const isCorrect = userAnswer === q.correctOptionId;
                const key = q.topic;
                if (!stats[key]) { stats[key] = { name: key, area: q.area, total: 0, correct: 0 }; }
                stats[key].total++;
                if (isCorrect) stats[key].correct++;
            });
        });
        return Object.values(stats).map(item => ({ ...item, percentage: Math.round((item.correct / item.total) * 100) }));
    }, [simulations, allQuestions]);

    // --- FILTRO E ORDENAÇÃO ---
    const filteredTopics = useMemo(() => {
        let filtered = [...allTopicsRaw]; 
        if (scope !== 'Todas') { filtered = filtered.filter(t => t.area === scope); }
        filtered.sort((a, b) => {
            if (topicSort === 'best') return b.percentage - a.percentage || b.total - a.total;
            return a.percentage - b.percentage || b.total - a.total; 
        });
        return filtered.slice(0, 5);
    }, [allTopicsRaw, scope, topicSort]);

    // Ordenação das Áreas
    const sortedAreas = useMemo(() => {
        const areasWithStats = areasBase.map(area => {
            const st = detailedStats.byArea[area.title] || { total: 0, correct: 0 };
            const pct = st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0;
            return { ...area, stats: st, percentage: pct };
        });
        if (areaSort === 'best') return areasWithStats.sort((a, b) => b.percentage - a.percentage);
        if (areaSort === 'worst') return areasWithStats.sort((a, b) => a.percentage - b.percentage);
        return areasWithStats;
    }, [detailedStats, areaSort, areasBase]);

    // --- AÇÕES DOS MODAIS ---
    const handleOpenTrainModal = () => {
        setSelectedTrainTopics(filteredTopics.map(t => t.name));
        setTrainQuantity(10);
        setTrainModalOpen(true);
    };

    const handleConfirmTrain = () => {
        if (selectedTrainTopics.length === 0) return;
        onLaunchExam(selectedTrainTopics, trainQuantity);
        setTrainModalOpen(false);
    };

    const handleOpenSmartReview = () => {
        setTrainQuantity(10);
        setSmartReviewModalOpen(true);
    };

    const handleConfirmSmartReview = () => {
        const limit = trainQuantity;
        const shuffledErrors = [...errorPool].sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffledErrors.slice(0, limit);
        if (onLaunchSmartExam) {
            onLaunchSmartExam(selectedQuestions);
        }
        setSmartReviewModalOpen(false);
    };

    const toggleTrainTopic = (topicName) => {
        setSelectedTrainTopics(prev => 
            prev.includes(topicName) ? prev.filter(t => t !== topicName) : [...prev, topicName]
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto pb-10 relative">
             
             {/* MODAL DE TREINO DE TÓPICOS */}
             {trainModalOpen && (
                 <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                     <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 m-4">
                         <div className="flex justify-between items-center mb-6">
                             <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Target className="text-blue-600"/> Treinar Tópicos</h3>
                             <button onClick={() => setTrainModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                         </div>
                         <div className="mb-6">
                             <label className="block text-sm font-bold text-slate-700 mb-3">Quantidade</label>
                             <div className="flex flex-wrap gap-2">{[10, 20, 30, 40, 50].map(qtd => (<button key={qtd} onClick={() => setTrainQuantity(qtd)} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${trainQuantity === qtd ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{qtd}</button>))}</div>
                         </div>
                         <div className="mb-8">
                             <label className="block text-sm font-bold text-slate-700 mb-3">Temas Selecionados</label>
                             <div className="bg-gray-50 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 border border-gray-200">
                                 {filteredTopics.map(topic => (
                                     <div key={topic.name} onClick={() => toggleTrainTopic(topic.name)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white cursor-pointer transition-colors">
                                         <div className={selectedTrainTopics.includes(topic.name) ? "text-blue-600" : "text-gray-300"}>{selectedTrainTopics.includes(topic.name) ? <CheckSquare size={20} /> : <Square size={20} />}</div>
                                         <span className="text-sm font-medium text-slate-700">{topic.name}</span>
                                     </div>
                                 ))}
                             </div>
                         </div>
                         <button onClick={handleConfirmTrain} disabled={selectedTrainTopics.length === 0} className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"><Play size={20} fill="currentColor" /> Começar</button>
                     </div>
                 </div>
             )}

             {/* MODAL DO CADERNO DE ERROS */}
             {smartReviewModalOpen && (
                 <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                     <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 m-4">
                         <div className="flex justify-between items-center mb-6">
                             <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Zap className="text-yellow-500" fill="currentColor"/> Caderno de Erros</h3>
                             <button onClick={() => setSmartReviewModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                         </div>
                         <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-6 text-yellow-800 text-sm">
                             Vamos criar um simulado focado apenas nas questões que você já errou anteriormente.
                             <br/><strong>Disponíveis: {errorPool.length} questões.</strong>
                         </div>
                         <div className="mb-8">
                             <label className="block text-sm font-bold text-slate-700 mb-3">Quantidade de Questões</label>
                             <div className="flex flex-wrap gap-2">
                                 {[10, 20, 30, 40, 50].map(qtd => (
                                     <button key={qtd} onClick={() => setTrainQuantity(qtd)} disabled={qtd > errorPool.length && errorPool.length >= 10 && qtd !== 10} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${trainQuantity === qtd ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} disabled:opacity-30 disabled:cursor-not-allowed`}>{qtd}</button>
                                 ))}
                             </div>
                             {errorPool.length < 10 && <p className="text-xs text-red-500 mt-2 font-bold">Você tem menos de 10 erros registrados. O simulado terá {errorPool.length} questões.</p>}
                         </div>
                         <button onClick={handleConfirmSmartReview} disabled={errorPool.length === 0} className="w-full py-3.5 rounded-xl bg-yellow-500 text-white font-bold hover:bg-yellow-600 shadow-lg shadow-yellow-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"><Play size={20} fill="currentColor" /> Matar Erros</button>
                     </div>
                 </div>
             )}

             <div className="flex items-center justify-between mb-8"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Voltar</button><h1 className="text-2xl font-bold text-slate-900">Desempenho Detalhado</h1></div>
             
             {/* STATS GERAIS E ÚLTIMOS 7 DIAS */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <h2 className="text-lg font-semibold text-slate-600 mb-2">Aproveitamento Geral</h2>
                    <div className="text-5xl font-bold text-blue-600 mb-2">{globalPercentage}%</div>
                    <p className="text-gray-400">{totalCorrect} acertos de {totalQuestions} questões</p>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-purple-600"><Calendar size={100} /></div>
                    <h2 className="text-lg font-semibold text-slate-600 mb-4 relative z-10">Últimos 7 Dias</h2>
                    <div className="flex justify-around items-center relative z-10">
                        <div><div className="text-3xl font-bold text-slate-800">{statsLast7Days.total}</div><p className="text-xs text-gray-400 uppercase font-bold tracking-wider mt-1">Feitas</p></div>
                        <div className="w-px h-12 bg-gray-100"></div>
                        <div><div className="text-3xl font-bold text-emerald-600">{statsLast7Days.correct}</div><p className="text-xs text-gray-400 uppercase font-bold tracking-wider mt-1">Acertos</p></div>
                    </div>
                </div>
             </div>

             {/* CARD CADERNO DE ERROS */}
             <div className="mb-8 bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="absolute top-0 right-0 p-6 opacity-10"><Zap size={150} /></div>
                 <div className="relative z-10">
                     <h2 className="text-2xl font-bold flex items-center gap-2 mb-2"><Zap className="text-yellow-400" fill="currentColor" /> Simulado Inteligente</h2>
                     <p className="text-slate-300 max-w-lg">O sistema identificou <strong>{errorPool.length} questões</strong> que você errou anteriormente. Crie um simulado personalizado para revisar e eliminar esses erros.</p>
                 </div>
                 <button 
                    onClick={handleOpenSmartReview}
                    disabled={errorPool.length === 0}
                    className="relative z-10 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-4 px-8 rounded-xl shadow-lg shadow-yellow-500/20 transition-transform active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                 >
                    <PlayCircle size={24} fill="currentColor" />
                    Matar {errorPool.length} Erros
                 </button>
             </div>

             {/* GRÁFICO DE EVOLUÇÃO */}
             {evolutionData.length > 1 && (
                 <div className="mb-8 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                     <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6"><TrendingUp size={24} className="text-blue-600" /> Evolução (Últimos Simulados)</h2>
                     <div className="h-48 flex items-end justify-between gap-2 px-2">
                         {evolutionData.map((data) => {
                             let colorClass = 'bg-blue-400 group-hover:bg-blue-500';
                             if(data.percentage >= 80) colorClass = 'bg-emerald-400 group-hover:bg-emerald-500';
                             else if(data.percentage < 50) colorClass = 'bg-orange-400 group-hover:bg-orange-500';

                             return (
                                 <div key={data.id} className="flex flex-col items-center flex-1 group relative h-full justify-end">
                                     <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs rounded py-1 px-2 pointer-events-none whitespace-nowrap z-10">{data.percentage}% ({data.total} Questões)</div>
                                     <div 
                                        className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 relative ${colorClass}`} 
                                        style={{ height: `${Math.max(data.percentage, 5)}%` }} 
                                     ></div>
                                     <span className="text-[10px] text-gray-400 mt-2 font-bold">{data.date}</span>
                                 </div>
                             );
                         })}
                     </div>
                 </div>
             )}

             {/* RADAR DE DESEMPENHO */}
             <div className="mb-10 bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6"><Activity size={24} className="text-blue-600" /> Radar de Desempenho</h2>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                    <div className="flex bg-gray-100/50 rounded-xl p-1 overflow-x-auto max-w-full no-scrollbar">
                        <button onClick={() => setScope('Todas')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${scope === 'Todas' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Todas</button>
                        {areasBase.map(a => (<button key={a.id} onClick={() => setScope(a.title)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${scope === a.title ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{a.title}</button>))}
                    </div>
                    <button onClick={() => setTopicSort(prev => prev === 'worst' ? 'best' : 'worst')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-colors ${topicSort === 'worst' ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>{topicSort === 'worst' ? <><TrendingDown size={18}/> Piores temas</> : <><TrendingUp size={18}/> Melhores temas</>}</button>
                </div>
                <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden mb-6 min-h-[200px]">
                    {filteredTopics.length > 0 ? (
                        <div className="divide-y divide-gray-200">{filteredTopics.map((topic, i) => (<div key={i} className="p-4 flex items-center justify-between hover:bg-white transition-colors"><div><div className="flex items-center gap-2 mb-1"><span className="font-bold text-slate-800">{i + 1}. {topic.name}</span>{scope === 'Todas' && <span className="text-[10px] uppercase font-bold text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded">{topic.area}</span>}</div><div className="text-xs text-gray-500 font-medium">{topic.correct} acertos em {topic.total} questões</div></div><div className="text-right"><span className={`text-lg font-bold ${topic.percentage >= 80 ? 'text-emerald-600' : topic.percentage < 50 ? 'text-red-600' : 'text-blue-600'}`}>{topic.percentage}%</span></div></div>))}</div>
                    ) : (<div className="flex flex-col items-center justify-center h-[200px] text-gray-400 italic p-4 text-center"><p>Nenhum dado suficiente encontrado para esta seleção.</p><span className="text-xs mt-2">Resolva mais questões desta área para ver estatísticas.</span></div>)}
                </div>
                <button onClick={handleOpenTrainModal} disabled={filteredTopics.length === 0} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-transform active:scale-95 mx-auto md:mx-0"><PlayCircle size={20} /> Treinar estes temas</button>
             </div>

             {/* ÁREAS OVERVIEW */}
             <div className="mt-12">
                 <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-slate-800">Desempenho por Área</h2><select value={areaSort} onChange={(e) => setAreaSort(e.target.value)} className="bg-white border border-gray-200 text-slate-600 text-sm font-bold py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="default">Padrão</option><option value="best">Melhor Desempenho</option><option value="worst">Pior Desempenho</option></select></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{sortedAreas.map(area => (<div key={area.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"><div className="flex items-center gap-3 mb-3"><div className={`p-2 rounded-lg ${area.color} bg-opacity-10`}><area.icon size={20} /></div><h3 className="font-bold text-slate-800">{area.title}</h3></div><div><div className="flex items-center justify-between mb-2"><span className={`text-2xl font-bold ${area.percentage >= 80 ? 'text-emerald-600' : area.percentage < 50 ? 'text-red-600' : 'text-slate-700'}`}>{area.percentage}%</span><span className="text-xs text-gray-400">{area.stats.correct}/{area.stats.total}</span></div><div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full ${area.color.split(' ')[0].replace('bg-', 'bg-')}`} style={{ width: `${area.percentage}%` }} ></div></div></div></div>))}</div>
             </div>
        </div>
    )
}s
