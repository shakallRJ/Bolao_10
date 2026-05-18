import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Trophy, 
  Settings, 
  Calendar, 
  BarChart2, 
  Globe, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Plus,
  Save,
  Trash2,
  Lock,
  Home,
  Info,
  Wallet,
  PlusCircle,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { safeJson } from '../App';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const CopaDashboard = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { user, token, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('inicio');
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [transparencyStatus, setTransparencyStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCopaData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [mRes, pRes, rRes, bRes, tRes] = await Promise.all([
         fetch('/api/copa/matches', { headers }),
         fetch('/api/copa/my-predictions', { headers }),
         fetch('/api/copa/ranking', { headers }),
         fetch('/api/wallet/balance', { headers }),
         fetch('/api/copa/transparency', { headers })
      ]);
      
      if (mRes.ok) setMatches(await mRes.json());
      if (pRes.ok) {
        const carts = await pRes.json();
        setPredictions(carts);
      }
      if (rRes.ok) setRanking(await rRes.json());
      if (bRes.ok) {
        const bData = await bRes.json();
        setBalance(bData.balance || 0);
      }
      if (tRes.ok) {
        setTransparencyStatus(await tRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCopaData();
  }, [token]);

  const tabs = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'palpites', label: 'Palpites', icon: Trophy },
    { id: 'ranking', label: 'Ranking', icon: BarChart2 },
    { id: 'minhas_apostas', label: 'Aproveitamento', icon: CheckCircle2 },
    { id: 'transparencia', label: 'Transparência', icon: FileText },
    { id: 'regras', label: 'Regras', icon: AlertCircle },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Settings }] : [])
  ];

  const [activeCartelaId, setActiveCartelaId] = useState<string | null>(null);
  const [creatingCartela, setCreatingCartela] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);

  const handleCreateCartela = async () => {
    if (balance < 10) {
      toast.error('Saldo insuficiente. Recarregue R$ 10,00 na sua carteira para criar uma nova cartela da Copa.');
      return;
    }
    
    setShowCreateConfirm(true);
  };

  const confirmCreateCartela = async () => {
    setShowCreateConfirm(false);
    setCreatingCartela(true);
    try {
      const res = await fetch('/api/copa/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: [] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar cartela');
      
      toast.success('Cartela criada com sucesso!');
      if (data.luckyNumber) {
        toast.success(`Seu Número da Sorte: ${data.luckyNumber}`, { duration: 8000 });
      }
      await fetchCopaData(); // Atualiza as cartelas e o saldo
      setActiveCartelaId(data.predictionId);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreatingCartela(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Globe className="w-8 h-8 text-[#002B5B] animate-spin" /></div>;

  const currentCartela = activeCartelaId ? predictions.find(p => p.id === activeCartelaId) || { copa_prediction_items: [] } : { copa_prediction_items: [] };
  const currentItems = currentCartela.copa_prediction_items || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {showCreateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
            <h3 className="text-2xl font-bold text-[#002B5B] mb-2 flex items-center">
              <Wallet className="w-6 h-6 mr-2 text-[#1A5F3A]" />
              Confirmar Pagamento
            </h3>
            <p className="text-gray-600 mb-6">Você está prestes a criar uma nova cartela da Copa do Mundo 2026.</p>
            
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Valor da Cartela:</span>
                <span className="font-bold text-lg text-[#002B5B]">R$ 10.00</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                disabled={creatingCartela}
              >
                Cancelar
              </button>
              <button
                onClick={confirmCreateCartela}
                disabled={creatingCartela}
                className="flex-1 px-4 py-3 bg-[#1A5F3A] text-white rounded-xl font-bold hover:bg-[#124228] transition-colors disabled:opacity-50"
              >
                {creatingCartela ? 'Processando...' : 'Confirmar e Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-[#002B5B] text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <Globe className="w-6 h-6 text-[#1A5F3A]" />
            <span className="font-bold text-xl tracking-tight">Copa 2026</span>
          </div>
          <button 
            onClick={() => onNavigate('dashboard')} 
            className="text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors font-medium flex items-center gap-2"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Bolão Tradicional
          </button>
        </div>
      </header>

      <div className="bg-white border-b sticky top-[68px] z-10 pb-0 overflow-x-auto">
        <div className="max-w-4xl mx-auto px-4 flex gap-4 md:gap-8 whitespace-nowrap">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#1A5F3A] text-[#1A5F3A] font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 py-8">
        {activeTab === 'inicio' && <CopaInicio setTab={setActiveTab} balance={balance} onNavigate={onNavigate} transparencyStatus={transparencyStatus} />}
        {activeTab === 'palpites' && (
          <div className="space-y-4">
            {!activeCartelaId ? (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                  <h3 className="text-xl font-bold text-[#002B5B] mb-2">Seus Palpites</h3>
                  <p className="text-gray-600 mb-6">Você pode criar várias cartelas e aumentar suas chances de ganhar!</p>
                  <button 
                    onClick={handleCreateCartela}
                    disabled={creatingCartela}
                    className="inline-flex items-center gap-2 bg-[#1A5F3A] text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-[#124228] transition-colors shadow-lg hover:shadow-xl hover:shadow-[#1A5F3A]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingCartela ? (
                      <><Globe className="w-6 h-6 animate-spin" /> Criando...</>
                    ) : (
                      <><PlusCircle className="w-6 h-6" /> Criar Nova Cartela</>
                    )}
                  </button>
                </div>
                
                {predictions.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {predictions.map((p, idx) => (
                      <button
                        key={p.id}
                        onClick={() => setActiveCartelaId(p.id)}
                        className="bg-white border text-left border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group flex items-center justify-between"
                      >
                        <div>
                          <p className="text-lg font-bold text-[#002B5B] mb-1">Cartela #{idx + 1}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(p.created_at).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
                          </p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Trophy className="w-6 h-6" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <button 
                  onClick={() => setActiveCartelaId(null)}
                  className="flex items-center gap-2 text-gray-600 font-medium hover:text-gray-900 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm w-fit transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar para Minhas Cartelas
                </button>
                <CopaPalpites 
                  matches={matches} 
                  userPredictions={currentItems} 
                  predictionId={activeCartelaId} 
                  onRefresh={fetchCopaData} 
                  onCartelaCreated={setActiveCartelaId}
                />
              </div>
            )}
          </div>
        )}
        {activeTab === 'ranking' && <CopaRanking ranking={ranking} />}
        {activeTab === 'minhas_apostas' && <CopaMinhasApostas ranking={ranking} userId={user?.id} predictions={predictions} />}
        {activeTab === 'transparencia' && <CopaTransparencia transparencyStatus={transparencyStatus} matches={matches} />}
        {activeTab === 'regras' && <CopaRegras />}
        {activeTab === 'admin' && isAdmin && <CopaAdmin matches={matches} onRefresh={fetchCopaData} />}
      </main>
    </div>
  );
};

const CopaInicio = ({ setTab, balance, onNavigate, transparencyStatus }: { setTab: (tab: string) => void, balance: number, onNavigate: (page: string) => void, transparencyStatus: any }) => {
  return (
    <div className="space-y-6">
      <div className="bg-[#002B5B] rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-5 rounded-full -ml-10 -mb-10 pointer-events-none"></div>

        <div className="relative z-10 flex items-center gap-6 w-full md:w-auto">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-white/80 font-medium mb-1">Saldo em Carteira</p>
            <h2 className="text-4xl font-bold tracking-tight">R$ {balance.toFixed(2)}</h2>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => onNavigate('wallet')}
            className="flex items-center justify-center gap-2 bg-[#22c55e] text-white px-6 py-4 rounded-2xl font-bold hover:bg-[#16a34a] transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            Depositar Agora
          </button>
          <button
            onClick={() => onNavigate('wallet')}
            className="flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-4 rounded-2xl font-bold hover:bg-white/20 transition-all backdrop-blur-sm"
          >
            Ver Extrato
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#002B5B] to-[#1A5F3A] text-white p-6 md:p-8 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20">
          <Globe className="w-48 h-48" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
            Bolão Especial<br/>Copa 2026
          </h2>
          <p className="text-lg md:text-xl font-medium text-white/90 mb-8 leading-relaxed">
            Bem-vindo ao Bolão da Copa! Aqui você compra sua cartela por apenas <strong className="text-[#FFC107]">R$ 10,00</strong>, descontado diretamente do seu saldo na plataforma. Cada cartela contempla <strong className="text-white">todos os 104 jogos</strong> da primeira fase.
          </p>
          <button 
            onClick={() => setTab('palpites')} 
            className="px-8 py-4 bg-[#FFC107] text-[#002B5B] rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20"
          >
            <Trophy className="w-5 h-5" /> Iniciar Meus Palpites
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
          <div className="bg-blue-50 text-blue-600 p-4 rounded-xl shrink-0 self-start">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Data Limite</h3>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Você pode enviar ou alterar seus palpites quantas vezes quiser até o dia <strong>06 de junho às 15:30h (Brasília)</strong>. Após essa data, nenhuma alteração será permitida e os dados serão salvos definitivamente para o ranking inicial.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl shrink-0 self-start">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Premiação e Valores</h3>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              A cada cartela de <strong>R$ 10,00</strong>, o valor arrecadado é distribuído da seguinte forma:
            </p>
            <ul className="text-gray-700 space-y-1 mt-2 text-sm md:text-base list-disc pl-5">
              <li><strong>1º Colocado:</strong> 50% do valor arrecadado</li>
              <li><strong>2º Colocado:</strong> 20% do valor arrecadado</li>
              <li><strong>3º Colocado:</strong> 10% do valor arrecadado</li>
              <li>A administração recebe 20% para a manutenção da plataforma.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex gap-4">
        <div className="bg-amber-100 text-amber-600 p-4 rounded-xl shrink-0 self-start">
          <Info className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Regras de Pontuação Simplificadas</h3>
          <ul className="text-gray-700 space-y-2 mt-2">
            <li><strong>10 pontos:</strong> Acerto exato do placar.</li>
            <li><strong>5 pontos:</strong> Acerto do vencedor, mas com placar parcial diferente.</li>
            <li><strong>3 pontos:</strong> Acerto do empate, mas com placar parcial diferente.</li>
            <li><strong>2 pontos:</strong> Errou o resultado final, mas acertou os gols de apenas 1 time.</li>
          </ul>
        </div>
      </div>
      
      {transparencyStatus?.totalCartelas !== undefined && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center mt-8">
            <p className="text-gray-600 font-medium text-lg">Quantidade de Cartelas Preenchidas</p>
            <p className="font-black text-[#002B5B] text-4xl mt-2">{transparencyStatus.totalCartelas}</p>
        </div>
      )}
    </div>
  );
};

const CopaPalpites = ({ matches, userPredictions, predictionId, onRefresh, onCartelaCreated }: { matches: any[], userPredictions: any[], predictionId: string | null, onRefresh: () => void, onCartelaCreated?: (id: string) => void }) => {
  const { token } = useAuth();
  const [localPreds, setLocalPreds] = useState<{ [key: string]: { home: string, away: string } }>({});
  const [saving, setSaving] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('Grupo A');

  useEffect(() => {
    const initial: any = {};
    userPredictions.forEach(p => {
      initial[p.match_id] = { home: p.home_score?.toString() ?? '', away: p.away_score?.toString() ?? '' };
    });
    setLocalPreds(initial);
  }, [userPredictions]);

  // All groups
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => `Grupo ${g}`);
  // Maybe later add other phases like 'Oitavas de Final' if needed

  const phaseMatches = matches.filter(m => m.group_name === selectedGroup);
  
  // Try to determine "Rodada" automatically by date or just divide in 2s since we know there are 6 matches
  // Assuming matches are correctly sorted by date.
  const sortedMatches = [...phaseMatches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  
  const rodadas: any[][] = [];
  for (let i = 0; i < sortedMatches.length; i += 2) {
    if (sortedMatches.slice(i, i + 2).length > 0) {
      rodadas.push(sortedMatches.slice(i, i + 2));
    }
  }

  const handleSaveAll = async () => {
    const payload = phaseMatches.map((m: any) => {
      const g = localPreds[m.id];
      if (g && g.home !== '' && g.away !== '') {
        return { match_id: m.id, home_score: parseInt(g.home), away_score: parseInt(g.away) };
      }
      return null;
    }).filter(Boolean);

    if (payload.length === 0) {
      toast.error('Preencha pelo menos um palpite para salvar.');
      return;
    }

    confirmSaveAll(payload);
  };

  const confirmSaveAll = async (payload: any[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/copa/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ predictionId, items: payload })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao salvar palpites');
      }
      
      const data = await res.json();
      toast.success(`Palpites do ${selectedGroup} salvos com sucesso!`);
      if (data.predictionId && !predictionId && onCartelaCreated) {
         onCartelaCreated(data.predictionId);
      }
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const calculateStandings = () => {
    const teams: Record<string, { name: string; flag: string; pts: number; j: number; v: number; e: number; d: number; gp: number; gc: number; sg: number }> = {};
    
    // Initialize teams
    phaseMatches.forEach(m => {
      if (!teams[m.home_team]) teams[m.home_team] = { name: m.home_team, flag: m.home_flag || '', pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 };
      if (!teams[m.away_team]) teams[m.away_team] = { name: m.away_team, flag: m.away_flag || '', pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 };
    });

    // Apply predictions or official results
    phaseMatches.forEach((m: any) => {
      let hScore: number | null = null;
      let aScore: number | null = null;
      
      const p = localPreds[m.id];
      const saved = userPredictions.find(up => up.match_id === m.id);
      
      if (m.status === 'finished') {
        hScore = m.home_score;
        aScore = m.away_score;
      } else if (p && p.home !== '' && p.away !== '') {
        hScore = parseInt(p.home);
        aScore = parseInt(p.away);
      } else if (saved) {
         hScore = saved.home_score;
         aScore = saved.away_score;
      }

      if (hScore !== null && aScore !== null && !isNaN(hScore) && !isNaN(aScore)) {
        teams[m.home_team].j++;
        teams[m.away_team].j++;
        
        teams[m.home_team].gp += hScore;
        teams[m.home_team].gc += aScore;
        teams[m.away_team].gp += aScore;
        teams[m.away_team].gc += hScore;
        
        if (hScore > aScore) {
          teams[m.home_team].pts += 3;
          teams[m.home_team].v++;
          teams[m.away_team].d++;
        } else if (aScore > hScore) {
          teams[m.away_team].pts += 3;
          teams[m.away_team].v++;
          teams[m.home_team].d++;
        } else {
          teams[m.home_team].pts += 1;
          teams[m.away_team].pts += 1;
          teams[m.home_team].e++;
          teams[m.away_team].e++;
        }
      }
    });

    // Calculate SG and sort
    Object.values(teams).forEach(t => t.sg = t.gp - t.gc);
    
    return Object.values(teams).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.sg !== a.sg) return b.sg - a.sg;
      if (b.gp !== a.gp) return b.gp - a.gp;
      return a.name.localeCompare(b.name);
    });
  };

  const standings = calculateStandings();

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center min-h-[300px]">
        <Clock className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">Aguardando Jogos</h3>
        <p className="text-gray-500 text-center max-w-md mt-2">
          Os jogos da Copa do Mundo 2026 estarão disponíveis em breve.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#FAF8F5] rounded-xl border border-[#EBE5D9] p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Selecione o Grupo</p>
        <div className="flex flex-wrap gap-2">
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center transition-all ${selectedGroup === g ? 'bg-[#FFC107] text-black shadow-md' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              {g.replace('Grupo ', '')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1A5F3A] rounded-t-xl p-4 flex justify-between items-center text-white">
        <h2 className="text-xl font-bold">{selectedGroup}</h2>
        <div className="bg-[#13482B] px-3 py-1 rounded-full text-xs font-semibold">Provisional</div>
      </div>

      <div className="bg-[#FAF8F5] border border-t-0 border-[#EBE5D9] rounded-b-xl overflow-hidden pb-4">
        {rodadas.map((rodadaMatches, idx) => (
          <div key={idx}>
            <div className="bg-[#EBE5D9]/50 px-4 py-2 border-y border-[#EBE5D9]/60">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rodada {idx + 1}</span>
            </div>
            
            <div className="divide-y divide-[#EBE5D9]/50">
              {rodadaMatches.map((match: any) => {
                const isLocked = match.status !== 'pending';
                const p = localPreds[match.id] || { home: '', away: '' };
                const saved = userPredictions.find(up => up.match_id === match.id);
                
                return (
                  <div key={match.id} className="p-4 md:px-8 py-6 relative flex flex-col md:flex-row items-center justify-center gap-4 hover:bg-white/50 transition-colors">
                    
                    <div className="flex flex-1 items-center justify-end gap-3 min-w-0">
                      <span className="font-semibold text-gray-800 hidden md:block">{match.home_team}</span>
                      <div className="w-8 h-6 border border-gray-300 rounded overflow-hidden flex items-center justify-center shrink-0 bg-gray-100">
                        {match.home_flag ? <img src={match.home_flag} alt="" className="w-full h-full object-cover" /> : <Globe className="w-3 h-3 text-gray-400" />}
                      </div>
                      <span className="font-semibold text-gray-800 md:hidden block">{match.home_team.substring(0, 3).toUpperCase()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="0" max="20"
                          value={p.home ?? ''}
                          disabled={isLocked}
                          onChange={(e) => setLocalPreds({ ...localPreds, [match.id]: { ...p, home: e.target.value } })}
                          className="w-12 h-14 text-center text-2xl font-bold bg-white text-[#1A5F3A] border-2 border-[#1A5F3A] rounded-xl focus:ring-2 focus:ring-[#FFC107] focus:outline-none disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-gray-400 font-medium text-xs px-2">x</span>
                        <input 
                          type="number" 
                          min="0" max="20"
                          value={p.away ?? ''}
                          disabled={isLocked}
                          onChange={(e) => setLocalPreds({ ...localPreds, [match.id]: { ...p, away: e.target.value } })}
                          className="w-12 h-14 text-center text-2xl font-bold bg-white text-[#1A5F3A] border-2 border-[#1A5F3A] rounded-xl focus:ring-2 focus:ring-[#FFC107] focus:outline-none disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>

                    <div className="flex flex-1 items-center justify-start gap-3 min-w-0">
                      <span className="font-semibold text-gray-800 md:hidden block">{match.away_team.substring(0, 3).toUpperCase()}</span>
                      <div className="w-8 h-6 border border-gray-300 rounded overflow-hidden flex items-center justify-center shrink-0 bg-gray-100">
                        {match.away_flag ? <img src={match.away_flag} alt="" className="w-full h-full object-cover" /> : <Globe className="w-3 h-3 text-gray-400" />}
                      </div>
                      <span className="font-semibold text-gray-800 hidden md:block">{match.away_team}</span>
                    </div>

                    {/* Status badges absolute right on desktop */}
                    <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {isLocked && saved && <div className="text-xs bg-yellow-100 text-yellow-800 font-bold px-2 py-1 rounded-full text-center">+{saved.points || 0} pts<br/><span className="text-[10px] font-normal">{match.home_score}x{match.away_score}</span></div>}
                      {saved && !isLocked && <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center border border-green-200"><CheckCircle2 className="w-5 h-5"/></div>}
                      {isLocked && !saved && <div className="text-xs text-red-500 font-bold border border-red-200 bg-red-50 px-2 py-1 rounded">Sem Palpite</div>}
                    </div>
                    {/* Time indicator absolute left on desktop */}
                    <div className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 hidden md:flex items-center text-xs text-gray-400 gap-1 font-medium bg-white/50 px-2 py-1 rounded border border-gray-200">
                       <Clock className="w-3 h-3" />
                       {new Date(match.match_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {rodadas.length > 0 && (
          <div className="px-4 mt-6 mb-8">
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full py-4 bg-[#1A5F3A] hover:bg-[#13482B] text-white flex items-center justify-center gap-2 font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : `Salvar todos do ${selectedGroup}`} 
              <span className="bg-[#FFC107] text-black text-xs px-2 py-0.5 rounded-full">+12</span>
            </button>
          </div>
        )}

        {/* Group Standings Simulation */}
        {standings.length > 0 && (
          <div className="mx-4 mb-4 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-gray-500" />
              <h3 className="font-bold text-[#002B5B] text-sm uppercase tracking-wider">Simulação de Classificação</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="p-3 w-8 text-center">#</th>
                    <th className="p-3">Seleção</th>
                    <th className="p-3 text-center">PTS</th>
                    <th className="p-3 text-center text-gray-400">J</th>
                    <th className="p-3 text-center text-gray-400">V</th>
                    <th className="p-3 text-center text-gray-400">E</th>
                    <th className="p-3 text-center text-gray-400">D</th>
                    <th className="p-3 text-center text-gray-400">GP</th>
                    <th className="p-3 text-center text-gray-400">GC</th>
                    <th className="p-3 text-center text-gray-400">SG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {standings.map((t, idx) => (
                    <tr key={t.name} className={`${idx < 2 ? 'bg-green-50/30' : 'hover:bg-gray-50'}`}>
                      <td className="p-3 text-center font-bold text-gray-500">
                        <span className={idx < 2 ? 'text-[#1A5F3A]' : ''}>{idx + 1}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-4 bg-gray-100 border border-gray-200 rounded-sm overflow-hidden flex items-center justify-center">
                            {t.flag ? <img src={t.flag} alt="" className="w-full h-full object-cover" /> : <Globe className="w-3 h-3 text-gray-300" />}
                          </div>
                          <span className="font-bold text-gray-800">{t.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold text-gray-900">{t.pts}</td>
                      <td className="p-3 text-center text-gray-500">{t.j}</td>
                      <td className="p-3 text-center text-gray-500">{t.v}</td>
                      <td className="p-3 text-center text-gray-500">{t.e}</td>
                      <td className="p-3 text-center text-gray-500">{t.d}</td>
                      <td className="p-3 text-center text-gray-500">{t.gp}</td>
                      <td className="p-3 text-center text-gray-500">{t.gc}</td>
                      <td className="p-3 text-center font-semibold text-gray-700">{t.sg > 0 ? `+${t.sg}` : t.sg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {rodadas.length === 0 && (
          <div className="p-8 text-center text-gray-500">Nenhum jogo encontrado para este grupo.</div>
        )}
      </div>
    </div>
  );
};

const CopaRanking = ({ ranking }: { ranking: any[] }) => {
  if (ranking.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center min-h-[300px]">
        <BarChart2 className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500">Ranking estará disponível após os primeiros resultados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#002B5B]">Ranking Geral</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="p-4 text-center w-16">Pos</th>
              <th className="p-4">Participante</th>
              <th className="p-4 text-center">Pontos</th>
              <th className="p-4 text-center hidden sm:table-cell">Acertos</th>
              <th className="p-4 text-center hidden sm:table-cell">Placares Exatos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ranking.map((cartela, idx) => (
              <tr key={cartela.predictionId} className={`${idx < 3 ? 'bg-amber-50/30' : 'hover:bg-gray-50'} transition-colors`}>
                <td className="p-4 text-center">
                  {idx === 0 ? <span className="text-2xl">🥇</span> : 
                   idx === 1 ? <span className="text-2xl">🥈</span> : 
                   idx === 2 ? <span className="text-2xl">🥉</span> : 
                   <span className="font-bold text-gray-500">{cartela.position}º</span>}
                </td>
                <td className="p-4 font-semibold text-gray-900">{cartela.nickname}</td>
                <td className="p-4 text-center font-bold text-[#1A5F3A] text-lg">{cartela.totalPoints}</td>
                <td className="p-4 text-center text-gray-500 hidden sm:table-cell">{cartela.totalHits}</td>
                <td className="p-4 text-center text-gray-500 hidden sm:table-cell">{cartela.exactHits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CopaMinhasApostas = ({ ranking, userId, predictions }: { ranking: any[], userId?: number, predictions: any[] }) => {
  const myRankings = ranking.filter(r => r.userId === userId);
  
  if (myRankings.length === 0 && (!predictions || predictions.length === 0)) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center min-h-[300px]">
        <CheckCircle2 className="w-12 h-12 text-gray-200 mb-4" />
        <p className="text-gray-500 font-medium">Você ainda não tem apostas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#002B5B]">Meu Aproveitamento</h2>
      
      {predictions?.map((p, idx) => {
        const myRank = myRankings.find(r => r.predictionId === p.id);
        return (
          <div key={p.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col space-y-4">
             <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-lg font-bold text-[#002B5B]">Cartela #{idx + 1}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {p.status === 'approved' ? 'Aprovada' : 'Pendente'}
                </span>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Posição', value: myRank ? `${myRank.position}º` : '-' },
                { label: 'Pontos Totais', value: myRank?.totalPoints || 0 },
                { label: 'Placares Exatos (10pts)', value: myRank?.exactHits || 0 },
                { label: 'Total de Acertos', value: myRank?.totalHits || 0 }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center justify-center text-center p-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</span>
                  <span className="text-2xl font-black text-[#1A5F3A]">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CopaRegras = () => {
   // ... (same as previous iteration, kept for brevity)
   return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
      <h2 className="text-2xl font-bold text-[#002B5B]">Sistema de Pontuação</h2>
      <div className="space-y-4">
        {[
          { pts: '10', color: 'green', title: 'Placar Exato', desc: 'Acertou o resultado exato da partida.', ex: 'Palpite 2x1, Resultado 2x1' },
          { pts: '7', color: 'blue', title: 'Vencedor + Parcial', desc: 'Acertou vencedor e os gols de uma das seleções.', ex: 'Palpite 2x1, Resultado 3x1' },
          { pts: '5', color: 'purple', title: 'Apenas Vencedor', desc: 'Acertou o ganhador sem placar parcial.', ex: 'Palpite 2x1, Resultado 1x0' },
          { pts: '3', color: 'yellow', title: 'Empate sem placar exato', desc: 'Acertou que seria empate mas errou o placar.', ex: 'Palpite 1x1, Resultado 0x0' },
          { pts: '2', color: 'gray', title: 'Gols de 1 seleção', desc: 'Errou vencedor, mas acertou os gols de um time.', ex: 'Palpite 2x3, Resultado 2x0' }
        ].map(r => (
          <div key={r.pts} className="flex gap-4 p-4 rounded-xl border border-gray-50 bg-gray-50/50 items-center">
            <div className={`bg-${r.color}-100 text-${r.color}-700 font-bold p-3 rounded-xl text-xl w-16 text-center shrink-0`}>
              {r.pts}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{r.title}</p>
              <p className="text-gray-600">{r.desc}</p>
              <p className="text-sm text-gray-400 mt-1 font-mono">{r.ex}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CopaTransparencia = ({ transparencyStatus, matches }: { transparencyStatus: any, matches: any[] }) => {
  if (!transparencyStatus) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  if (!transparencyStatus.hasCartela) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center min-h-[300px]">
        <Lock className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium text-center">
          Você precisa ter pelo menos uma cartela salva para visualizar os palpites de outros usuários (Medida de Transparência).
        </p>
      </div>
    );
  }

  const handleDownloadPDF = (cartela: any) => {
    const pItems = cartela.copa_prediction_items || [];
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text('Bolão da Copa 2026', 14, 20);
    doc.setFontSize(14);
    doc.text(`Participante: ${cartela.users?.nickname || cartela.users?.name}`, 14, 30);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date(cartela.created_at).toLocaleDateString('pt-BR')}`, 14, 38);

    const groupMatches = matches.filter(m => m.phase === 'Fase de Grupos');
    
    let startY = 45;

    const groups = groupMatches.reduce((acc, m) => {
      const g = m.group_name || 'Fase de Grupos';
      if (!acc[g]) acc[g] = [];
      acc[g].push(m);
      return acc;
    }, {} as Record<string, any[]>);

    const groupKeys = Object.keys(groups).sort();

    groupKeys.forEach((gKey) => {
      if (startY > doc.internal.pageSize.getHeight() - 30) {
         doc.addPage();
         startY = 20;
      }
      
      doc.setFontSize(12);
      doc.setTextColor(0, 43, 91);
      doc.text(gKey, 14, startY);
      startY += 4;

      const gMatches = groups[gKey].sort((a: any, b: any) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());

      const tableData = gMatches.map((m: any, i: number) => {
         const guess = pItems.find((p: any) => p.match_id === m.id);
         const hScore = guess?.home_score ?? '';
         const aScore = guess?.away_score ?? '';
         return [
           i + 1,
           `${new Date(m.match_date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}`,
           `${m.home_team}  ${hScore} x ${aScore}  ${m.away_team}`
         ];
      });

      autoTable(doc, {
        head: [['#', 'Data', 'Palpite (Casa x Fora)']],
        body: tableData,
        startY: startY,
        theme: 'grid',
        headStyles: { fillColor: [0, 43, 91] },
        styles: { fontSize: 9 }
      });

      startY = (doc as any).lastAutoTable.finalY + 12;
    });

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#002B5B]">Transparência e Cartelas Salvas</h2>
      <p className="text-gray-600">Confira abaixo todas as cartelas preenchidas e validadas.</p>

      {transparencyStatus.cartelas?.length === 0 ? (
         <p className="text-gray-500 text-sm">Nenhuma cartela preenchida ainda.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {transparencyStatus.cartelas?.map((c: any, idx: number) => (
            <div key={idx} className="bg-white border text-center border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                 <FileText className="w-6 h-6" />
               </div>
               <p className="font-bold text-gray-800 mb-1 line-clamp-1" title={c.users?.nickname || c.users?.name}>{c.users?.nickname || c.users?.name}</p>
               <p className="text-xs text-gray-400 mb-4">{new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
               <button 
                 onClick={() => handleDownloadPDF(c)}
                 className="w-full bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm flex items-center justify-center gap-2"
               >
                 <FileText className="w-4 h-4" /> Ver Cartela
               </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CopaAdmin = ({ matches, onRefresh }: { matches: any[], onRefresh: () => void }) => {
  const { token } = useAuth();
  const [localMatches, setLocalMatches] = useState<any[]>(matches || []);
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{message: string, onConfirm: () => void} | null>(null);

  useEffect(() => setLocalMatches(matches), [matches]);

  const handleUpdate = (id: string, field: string, val: any) => {
    setLocalMatches(localMatches.map(m => m.id === id ? { ...m, [field]: val } : m));
  };

  const executeSaveAndRecalculate = async () => {
    setConfirmAction(null);
    setLoading(true);
    try {
      // For games with both scores defined, ensure status is 'finished'
      const matchesToSave = localMatches.map(m => {
        const sanitized = { 
          id: m.id, 
          home_score: m.home_score, 
          away_score: m.away_score, 
          status: m.status,
          home_team: m.home_team,
          away_team: m.away_team,
          home_flag: m.home_flag,
          away_flag: m.away_flag,
          match_date: m.match_date,
          group_name: m.group_name,
          phase: m.phase
        };
        
        if (sanitized.home_score !== '' && sanitized.home_score !== null && sanitized.home_score !== undefined && typeof sanitized.home_score === 'number' && !isNaN(sanitized.home_score) &&
            sanitized.away_score !== '' && sanitized.away_score !== null && sanitized.away_score !== undefined && typeof sanitized.away_score === 'number' && !isNaN(sanitized.away_score)) {
           sanitized.status = 'finished';
        } else {
           sanitized.home_score = null;
           sanitized.away_score = null;
           if (sanitized.status === 'finished') {
             sanitized.status = 'pending';
           }
        }
        return sanitized;
      });

      // 1. Salvar os jogos
      const resSave = await fetch('/api/admin/copa/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ matches: matchesToSave })
      });
      if (!resSave.ok) {
        const errorData = await resSave.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao salvar os jogos');
      }

      // 2. Recalcular ranking
      const resRecalc = await fetch('/api/admin/copa/recalculate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resRecalc.ok) {
        const errorData = await resRecalc.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao recalcular ranking');
      }

      toast.success('Placares salvos e Ranking atualizado com sucesso!');
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 pb-8 border-t border-gray-50 pt-6 bg-white rounded-2xl shadow-sm border mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
              <h3 className="text-xl font-bold text-[#002B5B] mb-4 text-center"> Confirmação </h3>
              <p className="text-gray-700 mb-8 text-center">{confirmAction.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmAction(null)} disabled={loading} className="flex-1 py-3 px-4 bg-gray-100 font-bold rounded-xl text-gray-700 hover:bg-gray-200">Cancelar</button>
                <button onClick={confirmAction.onConfirm} disabled={loading} className="flex-1 py-3 px-4 bg-blue-600 font-bold rounded-xl text-white hover:bg-blue-700">Confirmar</button>
              </div>
            </div>
          </div>
        )}
        <div>
          <h4 className="font-bold text-[#002B5B] mb-6 flex items-center text-lg">
            <Trophy className="w-5 h-5 mr-3 text-[#1A5F3A]" /> Inserir Resultados
          </h4>
          <div className="space-y-3">
            {localMatches.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-bold text-[#002B5B] truncate">{m.home_team} x {m.away_team}</p>
                  <p className="text-xs text-gray-400 mt-1">{m.phase} - {m.group_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="0"
                    placeholder=" "
                    value={m.home_score ?? ''} 
                    onChange={e => handleUpdate(m.id, 'home_score', e.target.value === '' ? null : parseInt(e.target.value))} 
                    className="w-12 h-10 text-center text-lg font-bold bg-white text-[#1A5F3A] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FFC107] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-gray-400 font-bold">X</span>
                  <input 
                    type="number" 
                    min="0"
                    placeholder=" "
                    value={m.away_score ?? ''} 
                    onChange={e => handleUpdate(m.id, 'away_score', e.target.value === '' ? null : parseInt(e.target.value))} 
                    className="w-12 h-10 text-center text-lg font-bold bg-white text-[#1A5F3A] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FFC107] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <h4 className="font-bold text-[#002B5B] mb-6 text-lg">Ações da Rodada</h4>
          <div className="sticky top-24 space-y-4">
            <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm">
              <p className="text-base text-blue-800 font-bold mb-2">Resultados Parciais</p>
              <p className="text-sm text-blue-600 mb-6 leading-relaxed">Salve os resultados dos jogos que já terminaram para atualizar o ranking parcial em tempo real.</p>
              <button 
                onClick={() => setConfirmAction({
                  message: 'Deseja salvar os jogos e atualizar o ranking agora?',
                  onConfirm: executeSaveAndRecalculate
                })}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar Parciais e Atualizar Ranking'}
              </button>
            </div>

            <div className="p-6 bg-red-50 border border-red-100 rounded-2xl shadow-sm">
              <p className="text-base text-red-800 font-bold mb-2">Finalizar Copa</p>
              <p className="text-sm text-red-600 mb-6 leading-relaxed">
                Encerra o campeonato definitivamente, calcula os prêmios (50%, 20%, 10%) e distribui os saldos para os 1º, 2º e 3º colocados no ranking final.
              </p>
              
              <button 
                onClick={() => setConfirmAction({
                  message: 'Tem certeza que deseja encerrar e DISTRIBUIR as premiações agora? Esta ação é IRREVERSÍVEL!',
                  onConfirm: async () => {
                    setConfirmAction(null);
                    setLoading(true);
                    try {
                      const res = await fetch('/api/admin/copa/finish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ distributePrizes: true })
                      });
                      const result = await res.json();
                      if (!res.ok) throw new Error(result.error || 'Erro ao finalizar campeonato');
                      toast.success(result.message);
                      onRefresh();
                    } catch (err: any) {
                      toast.error(err.message);
                    } finally {
                      setLoading(false);
                    }
                  }
                })}
                disabled={loading}
                className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-md shadow-red-500/20 disabled:opacity-50 mt-4"
              >
                {loading ? 'Processando...' : 'Finalizar e Pagar Prêmios'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

