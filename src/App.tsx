import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './contexts/AuthContext';
import { 
  Trophy, 
  LayoutDashboard, 
  History, 
  ShieldCheck, 
  LogOut, 
  User as UserIcon,
  Menu,
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Upload,
  Copy,
  Check,
  TrendingUp,
  Gift,
  Wallet,
  DollarSign,
  FileText,
  BarChart2,
  ListOrdered,
  TrendingDown,
  Info,
  ArrowLeft,
  Bell,
  Mail,
  MessageCircle,
  Eye,
  EyeOff,
  Send,
  Trash2,
  CheckCircle,
  Plus,
  Edit,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  MinusCircle,
  XCircle,
  Users,
  ArrowUpCircle,
  ArrowDownCircle,
  Landmark,
  Ticket
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';
import QRCode from 'react-qr-code';
import { generatePixPayload } from './utils/pix';
import { DepositModal } from './components/DepositModal';
import { PagBankCheckout } from './components/PagBankCheckout';
import { PromoPopup } from './components/PromoPopup';
import { Toaster, toast } from 'sonner';
import { CopaDashboard } from './pages/CopaDashboard';

// --- HELPERS ---

const parseDate = (date: any) => {
  if (!date) return null;
  if (typeof date === 'string') {
    // Safari compatibility: replace space with T for ISO-like strings
    return new Date(date.replace(' ', 'T'));
  }
  return new Date(date);
};

const formatDate = (date: any, formatStr: string, options?: any) => {
  if (!date) return '-';
  const d = parseDate(date);
  if (!d || isNaN(d.getTime())) return '-';
  return format(d, formatStr, options);
};

export const safeJson = async (res: Response) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error(`JSON parse error for ${res.url}. Status: ${res.status}. Text: ${text.substring(0, 200)}`);
    throw new Error(`Invalid JSON response from ${res.url}`);
  }
};

const NotificationsDropdown = () => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/my-notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
          
          let readIds = [];
          try {
            readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
          } catch (e) {
            readIds = [];
          }
          const unread = data.filter((n: any) => !readIds.includes(n.id));
          setUnreadCount(unread.length);
        }
      } catch (err) {
        console.error('Failed to fetch notifications');
      }
    };
    
    fetchNotifications();

    // Request Notification Permissions
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // WebSocket Connection
    if (token) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', token }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'notification') {
            const newNotif = message.data;
            
            setNotifications(prev => {
              // Avoid duplicates
              if (prev.some(n => n.id === newNotif.id)) return prev;
              
              const updated = [newNotif, ...prev];
              
              // Update unread count
              let readIds = [];
              try {
                readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
              } catch (e) {
                readIds = [];
              }
              if (!readIds.includes(newNotif.id)) {
                setUnreadCount(c => c + 1);
              }
              
              // Show toast notification only for new notifications
              // We do this inside a setTimeout to avoid React state update warnings
              setTimeout(() => {
                if (newNotif.msgType === 'success') {
                  toast.success(newNotif.title || 'Sucesso', { description: newNotif.message });
                } else if (newNotif.msgType === 'error') {
                  toast.error(newNotif.title || 'Erro', { description: newNotif.message });
                } else if (newNotif.msgType === 'warning') {
                  toast.warning(newNotif.title || 'Aviso', { description: newNotif.message });
                } else {
                  toast.info(newNotif.title || 'Nova Notificação', { description: newNotif.message });
                }

                // Optional: Play a sound or show a browser notification
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification(newNotif.title, { body: newNotif.message });
                }
              }, 0);

              return updated;
            });

            // Dispatch custom event for other components to react
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('new_notification', { detail: newNotif }));
            }
          }
        } catch (err) {
          console.error('WS Message error:', err);
        }
      };

      return () => {
        ws.close();
      };
    }
  }, [token]);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      let readIds = [];
      try {
        readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
      } catch (e) {
        readIds = [];
      }
      const newReadIds = [...new Set([...readIds, ...notifications.map(n => n.id)])];
      localStorage.setItem('read_notifications', JSON.stringify(newReadIds));
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleOpen}
        className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-[#12182B]"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF6B00] rounded-full border-2 border-[#0A0F1E]"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-[#12182B] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-[#2A3441] overflow-hidden z-50"
          >
            <div className="p-4 border-b border-[#2A3441] bg-[#0A0F1E] flex justify-between items-center">
              <h3 className="font-bold text-white uppercase tracking-wider text-sm">Notificações</h3>
              {unreadCount > 0 && (
                <span className="bg-[#32CD32] text-black text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-widest">
                  {unreadCount} novas
                </span>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-wider">Nenhuma notificação.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#2A3441]">
                  {notifications.map((notif) => {
                    const isAdminMsg = notif.type === 'admin_msg';
                    const iconColor = isAdminMsg ? (
                      notif.msgType === 'success' ? 'bg-[#32CD32]/20 text-[#32CD32]' :
                      notif.msgType === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
                      (notif.msgType === 'alert' || notif.msgType === 'error') ? 'bg-[#FF6B00]/20 text-[#FF6B00]' :
                      'bg-blue-500/20 text-blue-500'
                    ) : 'bg-[#32CD32]/20 text-[#32CD32]';

                    const Icon = isAdminMsg ? (
                      (notif.msgType === 'alert' || notif.msgType === 'error') ? AlertCircle :
                      notif.msgType === 'warning' ? Info :
                      notif.msgType === 'success' ? CheckCircle :
                      Bell
                    ) : Trophy;

                    return (
                      <div key={notif.id} className="p-4 hover:bg-[#1A2235] transition-colors">
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-black text-white">{notif.title}</p>
                            <p className="text-sm text-gray-400 mt-0.5 leading-snug">{notif.message}</p>
                            <div className="flex items-center justify-between mt-2">
                              {isAdminMsg && (
                                <p className="text-[10px] text-gray-500 uppercase font-black">Aviso Oficial</p>
                              )}
                              {notif.createdAt && (
                                <p className="text-[10px] text-gray-500 uppercase font-bold">{formatDate(notif.createdAt, 'dd/MM HH:mm')}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Navbar = ({ onNavigate, currentPage }: { onNavigate: (page: string) => void, currentPage: string }) => {
  const { user, logout, isAdmin, hasAdminAccess, isAuditor } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Consider isAuditor as admin for menu hiding purposes (so they don't see normal user menus)
  const hideFromAdmin = isAdmin || isAuditor;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: !!user },
    { id: 'predictions', label: 'Fazer Palpite', icon: Trophy, show: !!user && !hideFromAdmin },
    { id: 'wallet', label: 'Minha Carteira', icon: Wallet, show: !!user && !hideFromAdmin },
    { id: 'referral', label: 'Indique e Ganhe', icon: Users, show: !!user && !hideFromAdmin },
    { id: 'transparency', label: 'Transparência', icon: ShieldCheck, show: !!user },
    { id: 'ranking', label: 'Ranking', icon: BarChart2, show: !!user },
    { id: 'admin', label: 'Admin', icon: ShieldCheck, show: hasAdminAccess },
    { id: 'admin-rounds', label: 'Gerenciar Rodadas', icon: ListOrdered, show: hasAdminAccess },
  ];

  return (
    <nav className="bg-[#0A0F1E] border-b border-[#2A3441] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => onNavigate('landing')}>
              <img src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/logo01.png" alt="Bolão 10" className="h-12 object-contain" />
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {navItems.filter(i => i.show).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold uppercase transition-colors ${
                    currentPage === item.id 
                      ? 'border-[#32CD32] text-white' 
                      : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <NotificationsDropdown />
                <button 
                  onClick={() => onNavigate('profile')}
                  className="flex items-center text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase"
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  {user.name}
                </button>
                <button
                  onClick={logout}
                  className="text-gray-500 hover:text-[#FF6B00] transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="bg-[#32CD32] text-black px-6 py-2 rounded-lg text-sm font-black uppercase hover:scale-105 transition-all shadow-[0_0_15px_rgba(50,205,50,0.4)]"
              >
                Entrar / Depositar
              </button>
            )}
          </div>
          <div className="flex items-center sm:hidden space-x-2">
            {user && <NotificationsDropdown />}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-400 hover:text-white"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden bg-[#0A0F1E] border-b border-[#2A3441]"
          >
            <div className="pt-2 pb-3 space-y-1">
              {navItems.filter(i => i.show).map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setIsMenuOpen(false); }}
                  className="flex items-center w-full px-4 py-3 text-base font-bold uppercase text-gray-400 hover:text-white hover:bg-[#12182B]"
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              ))}
              {user ? (
                <button
                  onClick={logout}
                  className="flex items-center w-full px-4 py-3 text-base font-bold uppercase text-[#FF6B00] hover:bg-[#12182B]"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sair
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="flex items-center w-full px-4 py-3 text-base font-black uppercase text-[#32CD32] hover:bg-[#12182B]"
                >
                  Entrar / Depositar
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- PAGES ---

const LandingPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <img src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/promo01.png" alt="Promoção" className="w-full max-w-4xl mx-auto rounded-2xl shadow-[0_0_20px_rgba(255,107,0,0.2)] border border-[#2A3441]" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl font-black text-white uppercase italic tracking-tight"
          >
            O BOLÃO MAIS AGRESSIVO DO BRASIL.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-xl text-gray-400 font-bold uppercase"
          >
            MOSTRE QUE VOCÊ SABE E DOMINE A RODADA.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-col items-center justify-center gap-6"
          >
            <button 
              onClick={() => onNavigate('login')}
              className="bg-[#32CD32] text-black px-10 py-5 rounded-full font-black text-2xl uppercase italic tracking-wider hover:scale-105 transition-all shadow-[0_0_15px_rgba(50,205,50,0.4)]"
            >
              Criar Conta / Depositar
            </button>
            
             <img src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/game.png" alt="Game Stick" className="h-32 object-contain drop-shadow-[0_0_15px_rgba(50,205,50,0.3)] mt-6" />
          </motion.div>
        </div>

        <div className="mt-20 border-t border-[#2A3441] flex flex-wrap justify-center items-center gap-6 pt-12">
            <div className="bg-[#12182B] border border-[#2A3441] p-4 rounded-2xl flex flex-col items-center justify-center min-w-[200px]">
               <span className="text-gray-400 font-bold uppercase text-xs mb-3 text-center w-full">Ambiente 100% Seguro</span>
               <img src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/PagBank.jpg" alt="PagBank" className="h-8 object-contain rounded-lg" referrerPolicy="no-referrer" />
            </div>
            <div className="bg-[#12182B] border border-[#2A3441] p-4 rounded-2xl flex items-center justify-center min-w-[200px] h-[90px]">
              <span className="text-white font-black text-3xl italic tracking-wider">+18</span>
              <span className="text-gray-400 uppercase font-bold text-[10px] ml-3 leading-tight text-left">Jogue com<br/>Responsabilidade</span>
            </div>
        </div>
      </div>
    </div>
  );
};

const LoginPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState(localStorage.getItem('referredBy') || '');
  const { login } = useAuth();

  // Recovery State
  const [recoveryStep, setRecoveryStep] = useState<'none' | 'request' | 'verify' | 'reset'>('none');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 10) {
      value = `${value.slice(0, 10)}-${value.slice(10)}`;
    }
    setPhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const referralCode = isRegister ? referralCodeInput : null;
    const body = isRegister 
      ? { email, password, name, nickname, phone, referralCode } 
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        if (isRegister) {
          localStorage.removeItem('referredBy');
        }
        login(data.token, data.user);
        onNavigate('dashboard');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, digite seu e-mail cadastrado.');
      return;
    }
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.mailSent) {
          setSuccess('Um código de segurança com 6 dígitos foi enviado ao seu e-mail cadastrado com sucesso!');
        } else {
          let alertMsg = 'Código de segurança gerado com sucesso!';
          if (data.isAuthError) {
            alertMsg += ' ⚠️ (Aviso: Ocorreu um erro de autenticação SMTP no servidor da Hostinger. Verifique as credenciais SMTP_USER e SMTP_PASS nas variáveis de ambiente do seu painel).';
          } else {
            alertMsg += ' ⚠️ (Aviso: Servidor de e-mail SMTP não respondeu e foi usado o modo de contingência).';
          }
          if (data.developmentCode) {
            alertMsg += `\n\nComo estamos em modo de homologação/teste, você pode prosseguir usando este código: [ ${data.developmentCode} ]`;
          }
          setSuccess(alertMsg);
        }
        setRecoveryStep('verify');
      } else {
        setError(data.error || 'Erro ao processar solicitação.');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode || recoveryCode.length < 6) {
      setError('Digite o código de 6 dígitos recebido.');
      return;
    }
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: recoveryCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Código verificado! Crie sua nova de senha de acesso.');
        setRecoveryStep('reset');
      } else {
        setError(data.error || 'Código incorreto ou expirado.');
      }
    } catch (err) {
      setError('Erro ao verificar código de segurança.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: recoveryCode, password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Senha alterada com sucesso! Você já pode entrar com a sua nova senha.');
        setRecoveryStep('none');
        setPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setRecoveryCode('');
      } else {
        setError(data.error || 'Erro ao redefinir sua senha.');
      }
    } catch (err) {
      setError('Erro ao concluir redefinição de senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#12182B] p-8 rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] w-full max-w-md border border-[#2A3441]"
      >
        {recoveryStep !== 'none' ? (
          <div>
            <h2 className="text-3xl font-black text-white italic uppercase mb-2">
              {recoveryStep === 'request' && 'Recuperar Senha'}
              {recoveryStep === 'verify' && 'Verificar Código'}
              {recoveryStep === 'reset' && 'Nova Senha'}
            </h2>
            <p className="text-gray-400 mb-8 font-bold text-xs uppercase tracking-wider">
              {recoveryStep === 'request' && 'DIGITE SEU E-MAIL PARA ENVIARMOS UM CÓDIGO.'}
              {recoveryStep === 'verify' && `INSERIR O CÓDIGO DE 6 DÍGITOS ENVIADO PARA ${email}.`}
              {recoveryStep === 'reset' && 'ESCOLHA UMA SENHA FORTE COM MAIS DE 6 CARACTERES.'}
            </p>

            {error && (
              <div className="mb-6 p-4 bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] rounded-xl text-sm flex items-center font-bold uppercase tracking-wide">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" /> <span className="flex-1">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-[#32CD32]/10 border border-[#32CD32]/30 text-[#32CD32] rounded-xl text-sm flex items-center font-bold uppercase tracking-wide">
                <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0" /> <span className="flex-1">{success}</span>
              </div>
            )}

            {recoveryStep === 'request' && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">E-mail Cadastrado</label>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-600"
                    placeholder="seu@email.com"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#32CD32] text-black py-4 rounded-xl font-black uppercase italic tracking-wider hover:scale-105 transition-all mt-4 shadow-[0_0_15px_rgba(50,205,50,0.4)] disabled:opacity-50"
                >
                  {isLoading ? 'Enviando...' : 'Enviar Código por E-mail'}
                </button>
                <div className="text-center mt-6">
                  <button 
                    type="button" 
                    onClick={() => { setRecoveryStep('none'); setError(''); setSuccess(''); }}
                    className="text-xs text-gray-400 hover:text-white font-extrabold uppercase tracking-widest"
                  >
                    Voltar para o Login
                  </button>
                </div>
              </form>
            )}

            {recoveryStep === 'verify' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Código de Segurança</label>
                  <input 
                    type="text" 
                    required 
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-600 text-center tracking-[0.5em] text-xl font-bold font-mono"
                    placeholder="000000"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#32CD32] text-black py-4 rounded-xl font-black uppercase italic tracking-wider hover:scale-105 transition-all mt-4 shadow-[0_0_15px_rgba(50,205,50,0.4)] disabled:opacity-50"
                >
                  {isLoading ? 'Confirmando...' : 'Confirmar Código'}
                </button>
                <div className="flex justify-between items-center mt-6">
                  <button 
                    type="button" 
                    onClick={handleRequestCode}
                    className="text-[10px] text-[#32CD32] hover:underline font-extrabold uppercase tracking-wider"
                  >
                    Reenviar Código
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setRecoveryStep('none'); setError(''); setSuccess(''); }}
                    className="text-[10px] text-gray-400 hover:text-white font-extrabold uppercase tracking-wider"
                  >
                    Voltar para o Login
                  </button>
                </div>
              </form>
            )}

            {recoveryStep === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Nova Senha</label>
                  <input 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-600"
                    placeholder="No mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Confirmar Nova Senha</label>
                  <input 
                    type="password" 
                    required 
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-600"
                    placeholder="Repita a nova senha"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#32CD32] text-black py-4 rounded-xl font-black uppercase italic tracking-wider hover:scale-105 transition-all mt-4 shadow-[0_0_15px_rgba(50,205,50,0.4)] disabled:opacity-50"
                >
                  {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
                <div className="text-center mt-6">
                  <button 
                    type="button" 
                    onClick={() => { setRecoveryStep('none'); setError(''); setSuccess(''); }}
                    className="text-xs text-gray-400 hover:text-white font-extrabold uppercase tracking-widest"
                  >
                    Cancelar e Voltar
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-black text-white italic uppercase mb-2">
              {isRegister ? 'Criar Conta' : 'Bem-vindo'}
            </h2>
            <p className="text-gray-400 mb-8 font-bold">
              {isRegister ? 'JUNTE-SE AO BOLÃO MAIS AGRESSIVO.' : 'ACESSE SUA CONTA PARA PALPITAR.'}
            </p>

            {error && (
              <div className="mb-6 p-4 bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] rounded-xl text-sm flex items-center font-bold uppercase tracking-wide">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" /> <span className="flex-1">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-[#32CD32]/10 border border-[#32CD32]/30 text-[#32CD32] rounded-xl text-sm flex items-center font-bold uppercase tracking-wide">
                <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0" /> <span className="flex-1">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Nome Completo</label>
                    <input 
                      type="text" 
                      required 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-600"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Nickname (Apelido)</label>
                    <input 
                      type="text" 
                      required 
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-600"
                      placeholder="Ex: artilheiro10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Telefone (WhatsApp)</label>
                    <input 
                      type="tel" 
                      required 
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-600"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Código de Indicação (Opcional)</label>
                    <input 
                      type="text" 
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all uppercase placeholder-gray-600"
                      placeholder="Ex: 50969B51"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">E-mail</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-600"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Senha</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all pr-12 placeholder-gray-600"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {!isRegister && (
                <div className="text-right">
                  <button 
                    type="button"
                    onClick={() => { setRecoveryStep('request'); setError(''); setSuccess(''); }}
                    className="text-xs text-[#32CD32] hover:underline font-bold uppercase tracking-wider"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-[#32CD32] text-black py-4 rounded-xl font-black uppercase italic tracking-wider hover:scale-105 transition-all mt-4 shadow-[0_0_15px_rgba(50,205,50,0.4)]"
              >
                {isRegister ? 'Criar Conta' : 'Entrar na Plataforma'}
              </button>
            </form>
          </>
        )}

        <div className="mt-8 text-center space-y-6">
          <button 
            onClick={() => { setIsRegister(!isRegister); setRecoveryStep('none'); setError(''); setSuccess(''); }}
            className="text-sm font-bold text-gray-400 uppercase hover:text-white transition-colors tracking-wider"
          >
            {isRegister ? 'JÁ TEM UMA CONTA? ENTRE' : 'NÃO TEM UMA CONTA? CADASTRE-SE'}
          </button>

          <div className="pt-6 border-t border-[#2A3441] flex items-center justify-center gap-3">
            <img src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/PagBank.jpg" alt="PagBank" className="h-5 object-contain rounded" referrerPolicy="no-referrer" />
            <div className="h-4 w-[1px] bg-[#2A3441]"></div>
            <span className="text-[10px] font-bold text-[#32CD32] uppercase tracking-widest">Ambiente Seguro</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const getTransactionIcon = (type: string, amount: number, description: string = '') => {
  if (type === 'prize_credit' && description.toLowerCase().includes('indicação')) return <Gift className="w-5 h-5" />;
  
  switch (type) {
    case 'deposit': return <ArrowDownCircle className="w-5 h-5" />;
    case 'withdrawal': return <ArrowUpCircle className="w-5 h-5" />;
    case 'bet_deduction': return <Trophy className="w-5 h-5" />;
    case 'prize_credit': return <Trophy className="w-5 h-5" />;
    case 'admin_adjustment': return <ShieldCheck className="w-5 h-5" />;
    default: return amount > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />;
  }
};

const getTransactionColor = (type: string, amount: number, description: string = '') => {
  if (type === 'prize_credit' && description.toLowerCase().includes('indicação')) return 'bg-purple-100 text-purple-600';

  switch (type) {
    case 'deposit': return 'bg-green-100 text-green-600';
    case 'withdrawal': return 'bg-red-100 text-red-600';
    case 'bet_deduction': return 'bg-orange-100 text-orange-600';
    case 'prize_credit': return 'bg-yellow-100 text-yellow-600';
    case 'admin_adjustment': return 'bg-blue-100 text-blue-600';
    default: return amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
  }
};

const getTransactionLabel = (type: string, description: string = '') => {
  if (type === 'prize_credit' && description.toLowerCase().includes('indicação')) return 'Bônus de Indicação';

  switch (type) {
    case 'deposit': return 'Depósito';
    case 'withdrawal': return 'Saque';
    case 'bet_deduction': return 'Taxa de Palpite';
    case 'prize_credit': return 'Prêmio';
    case 'admin_adjustment': return 'Ajuste Admin';
    default: return 'Transação';
  }
};

const WalletPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { token, user } = useAuth();
  const [walletData, setWalletData] = useState<any>(null);
  const [myPredictions, setMyPredictions] = useState<any[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [expandedPrediction, setExpandedPrediction] = useState<number | null>(null);
  const [filterRound, setFilterRound] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchWallet = async () => {
    if (!token) return;
    try {
      // Sync pending PagBank deposits first
      try {
        await fetch('/api/pagbank/sync-pending', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        console.error('Failed to sync pending deposits');
      }

      const [walletRes, predRes, balanceRes, transRes] = await Promise.all([
        fetch('/api/my-wallet', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/my-predictions', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/wallet/balance', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/wallet/transactions', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (!walletRes.ok || !predRes.ok) throw new Error('Falha ao carregar resumo financeiro');
      
      const wData = await safeJson(walletRes);
      const pData = await safeJson(predRes);
      const bData = await safeJson(balanceRes);
      const tData = await safeJson(transRes);
      
      setWalletData(wData);
      setMyPredictions(pData);
      setBalance(bData?.balance || 0);
      setTransactions(tData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();

    const handleNewNotification = (e: any) => {
      const notif = e.detail;
      if (notif && notif.id && (
        notif.id.startsWith('dep-app-') || 
        notif.id.startsWith('dep-paid-') || 
        notif.id.startsWith('dep-rej-') ||
        notif.id.startsWith('withdraw-app-') ||
        notif.id.startsWith('withdraw-rej-')
      )) {
        fetchWallet();
      }
    };

    window.addEventListener('new_notification', handleNewNotification);
    return () => {
      window.removeEventListener('new_notification', handleNewNotification);
    };
  }, [token]);

  const handleUpdateProof = async (id: number) => {
    if (!proofFile) return alert('Selecione o comprovante.');
    
    setUploadingId(id);
    const formData = new FormData();
    formData.append('proof', proofFile);

    try {
      const res = await fetch(`/api/predictions/${id}/proof`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Falha ao enviar comprovante');
      alert('Comprovante enviado com sucesso! Aguarde a validação.');
      setProofFile(null);
      setUploadingId(null);
      fetchWallet();
    } catch (err: any) {
      alert(err.message);
      setUploadingId(null);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return toast.error('Valor inválido');
    if (amount > balance) return toast.error('Saldo insuficiente');
    if (!pixKey.trim()) return toast.error('Chave PIX é obrigatória');

    setWithdrawing(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount, pixKey })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Pedido de saque enviado com sucesso!');
        setIsWithdrawModalOpen(false);
        setWithdrawAmount('');
        setPixKey('');
        fetchWallet();
      } else {
        toast.error(data.error || 'Erro ao solicitar saque');
      }
    } catch (err) {
      toast.error('Erro na conexão');
    } finally {
      setWithdrawing(false);
    }
  };

  const filteredPredictions = myPredictions.filter(p => {
    const matchRound = filterRound === 'all' || p.round_number.toString() === filterRound;
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchRound && matchStatus;
  });

  const availableRounds = [...new Set(myPredictions.map(p => Number(p.round_number)))].sort((a: number, b: number) => b - a);

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent flex flex-col">
      <header className="bg-[#12182B] text-white p-4 flex justify-between items-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-b border-[#2A3441] sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <button onClick={() => onNavigate('dashboard')} className="hover:bg-[#1A2235] p-2 rounded-full transition-colors group">
            <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-white" />
          </button>
          <h1 className="text-xl font-black uppercase italic tracking-wider">Resumo Financeiro</h1>
        </div>
        <div className="hidden sm:flex items-center gap-3 bg-[#1A2235] px-4 py-1.5 rounded-full backdrop-blur-sm border border-[#2A3441]">
          <img src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/PagBank.jpg" alt="PagBank" className="h-4 object-contain rounded" referrerPolicy="no-referrer" />
          <div className="h-4 w-[1px] bg-[#2A3441]"></div>
          <span className="text-[10px] font-bold text-[#32CD32] uppercase tracking-widest">Ambiente Seguro</span>
        </div>
      </header>
      
      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
        {error && (
          <div className="bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] px-4 py-3 rounded-xl mb-6 flex items-center font-bold uppercase tracking-wide text-sm">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <div className="bg-[#12182B] rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[#2A3441] p-6 md:p-8 mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-[#1A2235] rounded-full flex items-center justify-center text-gray-400 border border-[#2A3441]">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic uppercase tracking-wider">Minha Carteira</h2>
              <p className="text-gray-400 font-bold uppercase tracking-wider text-xs mt-1">Resumo da sua conta</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-[#1A2235] rounded-2xl p-6 border border-[#2A3441] text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400 font-bold uppercase tracking-wider text-xs">Saldo Disponível</h3>
                  <Wallet className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-black text-[#32CD32] italic mb-4">
                  R$ {balance.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2 mt-auto">
                <button 
                  onClick={() => setIsDepositModalOpen(true)}
                  className="flex-1 bg-[#32CD32] text-black font-black uppercase tracking-wider py-2 rounded-xl hover:scale-105 transition-all text-sm shadow-[0_0_10px_rgba(50,205,50,0.3)]"
                >
                  Depositar
                </button>
                <button 
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="flex-1 border border-[#2A3441] bg-transparent text-white font-black uppercase tracking-wider py-2 rounded-xl hover:bg-[#2A3441] transition-all text-sm"
                >
                  Sacar
                </button>
              </div>
            </div>

            <div className="bg-[#0A0F1E] rounded-2xl p-6 border border-[#2A3441] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400 font-bold uppercase tracking-wider text-xs">Total Ganho</h3>
                  <TrendingUp className="w-5 h-5 text-[#32CD32]" />
                </div>
                <p className="text-3xl font-black italic text-[#32CD32]">
                  R$ {walletData?.totalWinnings?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>

            <div className="bg-[#0A0F1E] rounded-2xl p-6 border border-[#2A3441] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400 font-bold uppercase tracking-wider text-xs">Palpites Feitos</h3>
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <p className="text-3xl font-black italic text-white">
                  {walletData?.predictionsMade || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#FF6B00]/10 rounded-2xl p-6 border border-[#FF6B00]/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#FF6B00] font-black uppercase tracking-wider text-xs">Depósitos Pendentes</h3>
                  <Clock className="w-5 h-5 text-[#FF6B00]" />
                </div>
                <p className="text-3xl font-black italic text-[#FF6B00]">
                  R$ {(walletData?.pendingDeposits?.reduce((acc: number, d: any) => acc + d.amount, 0) || 0).toFixed(2)}
                </p>
                <p className="text-[10px] text-[#FF6B00]/80 mt-2 font-bold uppercase tracking-widest">
                  {walletData?.pendingDeposits?.length || 0} solicitação(ões) em análise
                </p>
              </div>
            </div>

            <div className="bg-[#32CD32]/10 rounded-2xl p-6 border border-[#32CD32]/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#32CD32] font-black uppercase tracking-wider text-xs">Saques Pendentes</h3>
                  <Clock className="w-5 h-5 text-[#32CD32]" />
                </div>
                <p className="text-3xl font-black italic text-[#32CD32]">
                  R$ {(walletData?.pendingWithdrawals?.reduce((acc: number, d: any) => acc + Math.abs(d.amount), 0) || 0).toFixed(2)}
                </p>
                <p className="text-[10px] text-[#32CD32]/80 mt-2 font-bold uppercase tracking-widest">
                  {walletData?.pendingWithdrawals?.length || 0} solicitação(ões) em análise
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-[#2A3441] border border-[#2A3441] text-gray-400 rounded-xl text-sm flex items-start">
            <Info className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-blue-400" />
            <p className="uppercase tracking-wider font-bold text-xs leading-relaxed">
              O total gasto considera apenas os palpites que foram validados pelo administrador. 
              Os ganhos são calculados com base nas rodadas finalizadas onde você foi um dos vencedores.
            </p>
          </div>
        </div>

        {walletData?.pendingPredictions?.length > 0 && (
          <div className="bg-[#12182B] rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[#2A3441] p-6 md:p-8 mb-8">
            <h3 className="text-xl font-black text-[#FF6B00] mb-6 flex items-center uppercase italic tracking-wider">
              <Clock className="w-5 h-5 mr-3" /> Palpites Pendentes de Pagamento
            </h3>
            <div className="space-y-4">
              {walletData.pendingPredictions.map((p: any) => (
                <div key={p.id} className="p-4 bg-[#0A0F1E] border border-[#FF6B00]/30 rounded-2xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <p className="font-black text-white italic text-lg uppercase">Rodada #{p.rounds?.number}</p>
                      <p className="text-sm font-bold text-[#FF6B00] uppercase tracking-wider mt-1">Aguardando validação do comprovante.</p>
                      <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest">Enviado em: {formatDate(p.created_at, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    <div className="w-full md:w-auto">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-black text-white uppercase tracking-widest">Reenviar Comprovante:</label>
                        <div className="flex gap-2">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                            className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-[#1A2235] file:text-white hover:file:bg-[#2A3441] w-full max-w-[200px] text-gray-400"
                          />
                          <button 
                            onClick={() => handleUpdateProof(p.id)}
                            disabled={uploadingId === p.id || !proofFile}
                            className="bg-[#32CD32] text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex-shrink-0"
                          >
                            {uploadingId === p.id ? 'Enviando...' : 'Pagar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {walletData?.pendingDeposits?.length > 0 && (
          <div className="bg-[#12182B] rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[#2A3441] p-6 md:p-8 mb-8">
            <h3 className="text-xl font-black text-[#FF6B00] mb-6 flex items-center uppercase italic tracking-wider">
              <Clock className="w-5 h-5 mr-3" /> Depósitos em Análise
            </h3>
            <div className="space-y-4">
              {walletData.pendingDeposits.map((d: any) => (
                <div key={d.id} className="p-4 bg-[#0A0F1E] border border-orange-500/30 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-500/10 border border-orange-500/30 text-[#FF6B00]">
                      <ArrowDownCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white uppercase tracking-wide text-sm">Depósito via PIX</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-orange-500/20 text-[#FF6B00] border border-orange-500/30">Pendente</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide font-medium">Solicitado em: {formatDate(d.created_at, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#FF6B00] text-lg">R$ {d.amount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {walletData?.pendingWithdrawals?.length > 0 && (
          <div className="bg-[#12182B] rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[#2A3441] p-6 md:p-8 mb-8">
            <h3 className="text-xl font-black text-blue-400 mb-6 flex items-center uppercase italic tracking-wider">
              <Clock className="w-5 h-5 mr-3" /> Saques em Análise
            </h3>
            <div className="space-y-4">
              {walletData.pendingWithdrawals.map((w: any) => (
                <div key={w.id} className="p-4 bg-[#0A0F1E] border border-blue-500/30 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 border border-blue-500/30 text-blue-400">
                      <ArrowUpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white uppercase tracking-wide text-sm">Saque PIX</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">Pendente</span>
                      </div>
                      <p className="text-xs text-gray-300 mt-0.5 font-medium">Chave: {w.reference_id?.replace('pending_', '')}</p>
                      <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide font-medium">Solicitado em: {formatDate(w.created_at, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-blue-400 text-lg">R$ {Math.abs(w.amount).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[#12182B] rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[#2A3441] p-6 md:p-8 mb-8">
          <h3 className="text-xl font-black text-white mb-6 flex items-center uppercase italic tracking-wider">
            <History className="w-5 h-5 mr-3 text-[#32CD32]" /> Extrato da Carteira
          </h3>
          <div className="space-y-4">
            {transactions.length > 0 ? transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-4 border border-[#2A3441]/50 rounded-2xl bg-[#0A0F1E]">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.amount > 0 ? 'bg-[#32CD32]/10 text-[#32CD32] border border-[#32CD32]/25' : 'bg-red-500/10 text-red-500 border border-red-500/25'
                  }`}>
                    {getTransactionIcon(tx.type, tx.amount, tx.description)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white font-sans text-sm md:text-base leading-snug">{tx.description}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${
                        tx.amount > 0 ? 'bg-[#32CD32]/15 text-[#32CD32] border-[#32CD32]/35' : 'bg-red-500/15 text-red-500 border-red-500/35'
                      }`}>
                        {getTransactionLabel(tx.type, tx.description)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide font-bold">{formatDate(tx.created_at, 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-lg ${tx.amount > 0 ? 'text-[#32CD32]' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}R$ {Math.abs(tx.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 font-bold">Saldo: R$ {tx.balance_after.toFixed(2)}</p>
                </div>
              </div>
            )) : (
              <p className="text-gray-400 text-center py-4 font-bold uppercase tracking-wider text-sm">Nenhuma transação encontrada.</p>
            )}
          </div>
        </div>

        <div className="bg-[#12182B] rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[#2A3441] p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h3 className="text-xl font-black text-white flex items-center uppercase italic tracking-wider">
              <History className="w-5 h-5 mr-3 text-[#32CD32]" /> Histórico de Palpites
            </h3>
            
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rodada:</label>
                <select 
                  value={filterRound}
                  onChange={(e) => setFilterRound(e.target.value)}
                  className="bg-[#1A2235] border border-[#2A3441] text-[#32CD32] rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#32CD32]"
                >
                  <option value="all">Todas</option>
                  {availableRounds.map(r => (
                    <option key={r} value={r.toString()}>#{r}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status:</label>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-[#1A2235] border border-[#2A3441] text-[#32CD32] rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#32CD32]"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendente</option>
                  <option value="approved">Aprovado</option>
                  <option value="rejected">Rejeitado</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredPredictions.length > 0 ? filteredPredictions.map((pred) => (
              <div key={pred.id} className="border border-[#2A3441] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div 
                  onClick={() => setExpandedPrediction(expandedPrediction === pred.id ? null : pred.id)}
                  className="flex items-center justify-between p-4 bg-[#0A0F1E] hover:bg-[#1A2235]/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      pred.status === 'approved' ? 'bg-[#32CD32]/10 text-[#32CD32] border border-[#32CD32]/20' : 
                      pred.status === 'rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    }`}>
                      {pred.status === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : 
                       pred.status === 'rejected' ? <X className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-white uppercase tracking-wide text-sm">Rodada #{pred.round_number}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5 font-bold">{formatDate(pred.created_at, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-200">
                        {pred.status === 'approved' 
                          ? (pred.round_status === 'finished' ? `${pred.score} pontos` : 'Em andamento') 
                          : 'Aguardando'}
                      </p>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${
                        pred.status === 'approved' ? 'text-[#32CD32]' : 
                        pred.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'
                      }`}>
                        {pred.status === 'approved' ? 'Validado' : 
                         pred.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${expandedPrediction === pred.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedPrediction === pred.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-[#12182B] border-t border-[#2A3441]"
                    >
                      <div className="p-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#32CD32] mb-3">Seus Palpites</h4>
                        {pred.items && pred.games ? (
                          <div className="space-y-2">
                            {pred.games.map((game: any) => {
                              const item = pred.items.find((i: any) => i.game_id === game.id);
                              const guess = item?.guess;
                              const isCorrect = game.result && guess === game.result;
                              const isFinished = !!game.result;
                              
                              return (
                                <div key={game.id} className="flex items-center justify-between bg-[#0A0F1E] p-3 rounded-xl border border-[#2A3441]">
                                  <div className="flex items-center space-x-3 flex-1">
                                    <span className="text-xs font-bold text-gray-500 w-4">{game.game_order + 1}</span>
                                    <div className="flex-1 flex justify-between items-center text-sm">
                                      <div className="flex items-center gap-2 flex-1 justify-end">
                                        <span className={`font-black uppercase text-xs md:text-sm truncate text-right ${guess === '1' ? 'text-[#32CD32]' : 'text-gray-400'}`}>{game.home_team}</span>
                                        {getTeamCrestUrl(game.home_team) && (
                                          <div className="w-5 h-5 rounded-full border border-[#2A3441]/50 bg-[#1A2235]/60 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                                            <img src={getTeamCrestUrl(game.home_team)!} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-gray-600 mx-3 text-[10px] font-black italic">VS</span>
                                      <div className="flex items-center gap-2 flex-1 justify-start">
                                        {getTeamCrestUrl(game.away_team) && (
                                          <div className="w-5 h-5 rounded-full border border-[#2A3441]/50 bg-[#1A2235]/60 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                                            <img src={getTeamCrestUrl(game.away_team)!} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                          </div>
                                        )}
                                        <span className={`font-black uppercase text-xs md:text-sm truncate text-left ${guess === '2' ? 'text-[#32CD32]' : 'text-gray-400'}`}>{game.away_team}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="ml-4 flex items-center space-x-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-[#1A2235] px-2 py-1 rounded text-[#32CD32] border border-[#2A3441]">
                                      {guess === '1' ? 'Casa' : guess === '2' ? 'Fora' : 'Empate'}
                                    </span>
                                    {isFinished && (
                                      isCorrect 
                                        ? <CheckCircle2 className="w-4 h-4 text-[#32CD32]" />
                                        : <X className="w-4 h-4 text-red-500" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest italic">Detalhes não disponíveis.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8 font-bold uppercase tracking-wider text-sm">Nenhum palpite encontrado para os filtros selecionados.</p>
            )}
          </div>
        </div>
      </main>

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        token={token}
        onDepositSuccess={() => {
          setIsDepositModalOpen(false);
          fetchWallet();
        }}
      />

      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#12182B] border border-[#2A3441] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white italic uppercase tracking-wider">Solicitar Saque</h3>
              <button onClick={() => setIsWithdrawModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Valor do Saque (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={balance}
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  className="w-full p-3 bg-[#0A0F1E] border border-[#2A3441] rounded-xl text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-700"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 font-bold uppercase tracking-wide">Saldo disponível: R$ {balance.toFixed(2)}</p>
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Chave PIX</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  className="w-full p-3 bg-[#0A0F1E] border border-[#2A3441] rounded-xl text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-700"
                  placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={withdrawing || !withdrawAmount || !pixKey}
                className="w-full bg-[#32CD32] text-black font-black py-4 rounded-xl hover:scale-105 transition-all disabled:opacity-50 mt-6 shadow-[0_0_15px_rgba(50,205,50,0.4)] uppercase tracking-wider block text-center"
              >
                {withdrawing ? 'Processando...' : 'Confirmar Saque'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfilePage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { token, user, login } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 10) {
      value = `${value.slice(0, 10)}-${value.slice(10)}`;
    }
    setPhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password && password !== confirmPassword) {
      return setError('As senhas não coincidem');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/my-profile', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, nickname, phone, password: password || undefined })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar perfil');

      login(data.token, data.user);
      setSuccess('Perfil atualizado com sucesso!');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col text-white">
      <header className="bg-[#12182B] text-white p-4 flex justify-between items-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-b border-[#2A3441] sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <button onClick={() => onNavigate('dashboard')} className="hover:bg-[#1A2235] p-2 rounded-full transition-colors group">
            <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-white" />
          </button>
          <h1 className="text-xl font-black uppercase italic tracking-wider">Editar Perfil</h1>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#12182B] rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[#2A3441] p-8 md:p-12"
        >
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-16 h-16 bg-[#1A2235] text-[#32CD32] rounded-full border border-[#2A3441] flex items-center justify-center">
              <UserIcon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-wider text-white">Configurações da Conta</h2>
              <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">Mantenha seus dados atualizados</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl text-sm flex items-center font-bold uppercase tracking-wide">
              <AlertCircle className="w-4 h-4 mr-2" /> {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-[#32CD32]/10 text-[#32CD32] border border-[#32CD32]/20 rounded-2xl text-sm flex items-center font-bold uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 mr-2" /> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Nome Completo</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0F1E] text-white border border-[#232F47] rounded-xl focus:ring-2 focus:ring-[#32CD32] outline-none transition-all text-sm font-bold"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Nickname (Apelido)</label>
                <input 
                  type="text" 
                  required 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0F1E] text-white border border-[#232F47] rounded-xl focus:ring-2 focus:ring-[#32CD32] outline-none transition-all text-sm font-bold"
                  placeholder="Seu apelido"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Telefone (WhatsApp)</label>
              <input 
                type="tel" 
                required 
                value={phone}
                onChange={handlePhoneChange}
                className="w-full px-4 py-3 bg-[#0A0F1E] text-white border border-[#232F47] rounded-xl focus:ring-2 focus:ring-[#32CD32] outline-none transition-all text-sm font-bold"
                placeholder="(00) 00000-0000"
              />
            </div>

            <hr className="border-[#2A3441] my-8" />
            
            <h3 className="text-lg font-black uppercase italic tracking-wider text-white mb-2">Alterar Senha</h3>
            <p className="text-sm font-bold text-gray-400 mb-6">Deixe em branco se não desejar alterar sua senha atual.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Nova Senha</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0F1E] text-white border border-[#232F47] rounded-xl focus:ring-2 focus:ring-[#32CD32] outline-none transition-all pr-12 text-sm font-bold"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Confirmar Nova Senha</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0F1E] text-white border border-[#232F47] rounded-xl focus:ring-2 focus:ring-[#32CD32] outline-none transition-all text-sm font-bold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#32CD32] text-black py-4 rounded-xl font-black uppercase italic tracking-wider text-lg hover:scale-105 transition-all shadow-[0_0_15px_rgba(50,205,50,0.4)] disabled:opacity-50 mt-8"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
};

const Dashboard = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { token, user, logout } = useAuth();
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [myPredictions, setMyPredictions] = useState<any[]>([]);
  const [luckyNumbers, setLuckyNumbers] = useState<any[]>([]);
  const [walletData, setWalletData] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPrediction, setExpandedPrediction] = useState<string | null>(null);
  const [engagementTab, setEngagementTab] = useState<'lideres' | 'aovivo' | 'tendencia'>('tendencia');
  const [annualRanking, setAnnualRanking] = useState<any[]>([]);
  const [liveScores, setLiveScores] = useState<any[]>([]);
  const [roundTrends, setRoundTrends] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!currentRound?.start_time) return;

    const calculateTimeLeft = () => {
      const difference = new Date(currentRound.start_time).getTime() - new Date().getTime();

      if (difference <= 0) {
        setTimeLeft('ENCERRADO');
        setIsUrgent(false);
        return;
      }

      const d = Math.floor(difference / (1000 * 60 * 60 * 24));
      const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const m = Math.floor((difference / 1000 / 60) % 60);
      const s = Math.floor((difference / 1000) % 60);

      // Se faltar menos de 24 horas, ativa o modo de urgência (muda a cor para laranja/vermelho)
      setIsUrgent(d === 0);

      setTimeLeft(`${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [currentRound]);

  useEffect(() => {
    if (engagementTab !== 'aovivo') return;

    const fetchLiveScores = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch('/api/live-scores', { headers });
        if (res.ok) {
          const data = await res.json();
          setLiveScores(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching live scores:', err);
      }
    };

    fetchLiveScores();
    const interval = setInterval(fetchLiveScores, 60000);
    return () => clearInterval(interval);
  }, [engagementTab, token]);

  useEffect(() => {
    if (engagementTab !== 'tendencia' || !currentRound?.id) return;

    const fetchTrends = async () => {
      try {
        const res = await fetch(`/api/round/trends/${currentRound.id}`);
        if (res.ok) {
          const data = await res.json();
          setRoundTrends(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching round trends:', err);
      }
    };

    fetchTrends();
  }, [engagementTab, currentRound?.id]);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [roundRes, predRes, walletRes, balanceRes, luckyRes, rankingRes] = await Promise.all([
        fetch('/api/rounds/current'),
        fetch('/api/my-predictions', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/my-wallet', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/wallet/balance', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/me/lucky-numbers', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/ranking/anual')
      ]);
      
      if (roundRes.status === 401 || predRes.status === 401 || walletRes.status === 401 || luckyRes.status === 401) {
        logout();
        return;
      }

      if (!roundRes.ok) {
        const errorData = await safeJson(roundRes).catch(() => ({}));
        throw new Error(`Erro ao carregar rodada: ${errorData?.error || roundRes.statusText}`);
      }
      if (!predRes.ok) {
        const errorData = await safeJson(predRes).catch(() => ({}));
        throw new Error(`Erro ao carregar palpites: ${errorData?.error || predRes.statusText}`);
      }
      if (!walletRes.ok) {
        const errorData = await safeJson(walletRes).catch(() => ({}));
        throw new Error(`Erro ao carregar carteira: ${errorData?.error || walletRes.statusText}`);
      }

      const roundData = await safeJson(roundRes);
      const predData = await safeJson(predRes);
      const walletData = await safeJson(walletRes);
      const balanceData = await safeJson(balanceRes).catch(() => ({ balance: 0 }));
      const luckyData = await safeJson(luckyRes).catch(() => []);
      const rankingData = await safeJson(rankingRes).catch(() => []);
      
      setCurrentRound(roundData);
      setMyPredictions(Array.isArray(predData) ? predData : []);
      setWalletData(walletData);
      setBalance(balanceData?.balance || 0);
      setLuckyNumbers(Array.isArray(luckyData) ? luckyData : []);
      setAnnualRanking(Array.isArray(rankingData) ? rankingData : []);
    } catch (err: any) {
      console.error('Dashboard error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleNewNotification = (e: any) => {
      const notif = e.detail;
      if (notif && notif.id && (
        notif.id.startsWith('dep-app-') || 
        notif.id.startsWith('dep-rej-') ||
        notif.id.startsWith('withdraw-app-') ||
        notif.id.startsWith('withdraw-rej-')
      )) {
        fetchData();
      }
    };

    window.addEventListener('new_notification', handleNewNotification);
    return () => {
      window.removeEventListener('new_notification', handleNewNotification);
    };
  }, [token]);

  if (loading) return <div className="flex justify-center items-center h-64 font-black text-[#32CD32] uppercase tracking-widest text-2xl animate-pulse">Carregando...</div>;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="bg-[#FF6B00]/10 p-8 rounded-3xl border border-[#FF6B00]/30 inline-block shadow-[0_0_20px_rgba(255,107,0,0.2)]">
          <AlertCircle className="w-12 h-12 text-[#FF6B00] mx-auto mb-4" />
          <h3 className="text-xl font-black text-white italic uppercase tracking-wider mb-2">Erro ao carregar Dashboard</h3>
          <p className="text-[#FF6B00] mb-6 font-bold uppercase tracking-wider">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#FF6B00] text-black px-6 py-2 rounded-xl font-black uppercase italic tracking-wider hover:scale-105 transition-all shadow-[0_0_15px_rgba(255,107,0,0.4)]"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full mt-6">
      <div className="mb-8">
         <img src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/promo01.png" alt="Promoção" className="w-full max-w-4xl mx-auto rounded-2xl shadow-[0_0_20px_rgba(255,107,0,0.2)] border border-[#2A3441]" />
      </div>

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white italic uppercase">Olá, {user?.nickname || user?.name}! DOMINE A RODADA 👋</h1>
          <p className="text-gray-400">Bem-vindo de volta ao Bolão10.</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto flex flex-col gap-6 w-full pb-12">
        {/* Wallet Summary Consolidated - 1 */}
        {walletData && (
          <div className="bg-[#12182B] border border-[#2A3441] rounded-xl flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#1A2235] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            {/* Saldo - Maior destaque */}
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1A2235] border border-[#2A3441] rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Saldo em Carteira</p>
                    <h2 className="text-3xl font-black text-white italic tracking-tight">R$ {balance.toFixed(2)}</h2>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsDepositModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#32CD32] text-black py-3 rounded-lg font-black uppercase text-xs hover:scale-105 transition-all shadow-[0_0_15px_rgba(50,205,50,0.3)]"
                >
                  <span className="whitespace-nowrap">Depositar Agora</span>
                </button>
                <button
                  onClick={() => onNavigate('wallet')}
                  className="flex items-center justify-center px-4 bg-[#1A2235] text-white border border-[#2A3441] rounded-lg font-black uppercase text-xs hover:bg-[#2A3441] transition-all"
                  title="Extrato"
                >
                  Extrato
                </button>
              </div>
            </div>

            {/* Grid 2 colunas para o resto */}
            <div className="flex-1 grid grid-cols-2 divide-x divide-[#1A2235]">
              <div className="p-4 flex flex-col justify-center">
                <p className="font-bold uppercase tracking-wider mb-1 text-[10px] text-[#32CD32]">Total Ganho</p>
                <p className="text-xl font-black italic text-white mb-2">R$ {walletData.totalWinnings?.toFixed(2) || '0.00'}</p>
                <div className="w-8 h-8 bg-[#32CD32]/10 rounded-lg flex items-center justify-center border border-[#32CD32]/20 mt-auto">
                  <TrendingUp className="w-4 h-4 text-[#32CD32]" />
                </div>
              </div>

              <div className="p-4 flex flex-col justify-center">
                <p className="font-bold uppercase tracking-wider mb-1 text-[10px] text-[#FF6B00]">Bônus 10 Ac</p>
                <p className="text-xl font-black italic text-white mb-2">R$ {walletData?.jackpotPool?.toFixed(2) || '0.00'}</p>
                <div className="w-8 h-8 bg-[#FF6B00]/10 rounded-lg flex items-center justify-center border border-[#FF6B00]/20 mt-auto">
                  <Trophy className="w-4 h-4 text-[#FF6B00]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Round Card - 2 */}
        <div className="bg-[#12182B] rounded-xl p-6 border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-black text-white italic uppercase">Rodada Atual</h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Rodada #{currentRound?.number || '?'}</p>
            </div>
            <div className="bg-[#32CD32]/10 border border-[#32CD32]/30 text-[#32CD32] px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider">
              {currentRound?.status === 'open' ? 'Aberta' : 'Fechada'}
            </div>
          </div>

          {currentRound ? (
            <div className="space-y-4">
              <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-[#0A0F1E] p-2 rounded-lg w-fit border border-[#1A2235]">
                <Clock className="w-3 h-3 mr-2 text-[#32CD32]" />
                Início: {formatDate(currentRound.start_time, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </div>

              {timeLeft && (
                <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${isUrgent ? 'bg-red-500/15 border-red-500/40 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-[#0A0F1E] border-[#1A2235] text-amber-500'}`}>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-500 animate-bounce' : 'text-amber-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Encerra em:</span>
                  </div>
                  <span className="font-mono text-sm font-black tracking-wider">{timeLeft}</span>
                </div>
              )}
              <div className="p-4 bg-[#0A0F1E] rounded-xl flex justify-between items-center border border-[#1A2235]">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Valor do Palpite</p>
                  <p className="text-2xl font-black text-white italic">R$ {currentRound.entry_value.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => onNavigate('predictions')}
                  disabled={currentRound.status !== 'open'}
                  className="bg-[#32CD32] text-black px-6 py-3 rounded-lg font-black uppercase text-xs hover:scale-105 transition-all shadow-[0_0_15px_rgba(50,205,50,0.4)] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
                >
                  Palpitar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic text-sm">Nenhuma rodada ativa no momento.</p>
          )}
        </div>

        {/* Portal de Engajamento - 3 */}
        <div className="bg-[#12182B] rounded-xl p-4 border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] flex flex-col h-[400px]">
          <div className="flex bg-[#0A0F1E] rounded-lg p-1 border border-[#1A2235] mb-4 shrink-0">
            <button 
              onClick={() => setEngagementTab('lideres')}
              className={`flex-1 py-1.5 rounded text-[10px] sm:text-xs font-black uppercase transition-all ${engagementTab === 'lideres' ? 'bg-[#1A2235] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Líderes
            </button>
            <button 
              onClick={() => setEngagementTab('aovivo')}
              className={`flex-1 py-1.5 rounded text-[10px] sm:text-xs font-black uppercase transition-all ${engagementTab === 'aovivo' ? 'bg-[#1A2235] text-[#32CD32] shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Ao Vivo
            </button>
            <button 
              onClick={() => setEngagementTab('tendencia')}
              className={`flex-1 py-1.5 rounded text-[10px] sm:text-xs font-black uppercase transition-all ${engagementTab === 'tendencia' ? 'bg-[#1A2235] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Tendência
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {engagementTab === 'lideres' && (
              <div className="space-y-2.5">
                {annualRanking.length > 0 ? (
                  annualRanking.map((player, i) => {
                    const isMe = player.userId === user?.id;
                    return (
                      <div key={player.userId || i} className={`flex items-center justify-between p-3 rounded-lg border ${isMe ? 'bg-[#32CD32]/10 border-[#32CD32]/30' : 'bg-[#0A0F1E] border-[#1A2235]'}`}>
                        <div className="flex items-center gap-4">
                          <span className={`w-8 h-8 rounded flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : i === 1 ? 'bg-gray-300/20 text-gray-300 border border-gray-300/50' : i === 2 ? 'bg-orange-400/20 text-orange-400 border border-orange-400/50' : 'bg-[#1A2235] text-gray-400 border border-[#2A3441]'}`}>
                            {i === 0 || i === 1 || i === 2 ? <Trophy className="w-4 h-4" /> : i + 1}
                          </span>
                          <span className={`text-sm md:text-base font-black uppercase ${isMe ? 'text-[#32CD32]' : 'text-white'}`}>{isMe ? 'Você' : player.nickname}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-400">{player.totalPoints} <span className="text-[10px] uppercase">pts</span></span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center py-8 font-black uppercase text-xs">Nenhum palpiteceiro pontuado até o momento.</p>
                )}
              </div>
            )}
            
            {engagementTab === 'aovivo' && (
              <div className="space-y-3">
                {liveScores.length > 0 ? (
                  liveScores.map((game) => (
                    <div key={game.id} className="bg-[#0A0F1E] border border-[#2A3441] rounded-xl p-4">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">
                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> {game.league || 'Brasileirão'}</span>
                        <span className="text-[#32CD32] bg-[#32CD32]/10 px-2 py-0.5 rounded">{game.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-white text-base md:text-lg w-16 text-right">{game.home.short}</span>
                        <div className="flex-1 flex justify-center">
                          <span className="font-mono font-black text-2xl text-white bg-[#12182B] border border-[#2A3441] px-4 py-1.5 rounded shadow-inner tracking-widest">{game.home.score} - {game.away.score}</span>
                        </div>
                        <span className="font-black text-white text-base md:text-lg w-16 text-left">{game.away.short}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-12 italic text-sm">Nenhum jogo do Brasileirão ao vivo no momento.</p>
                )}
              </div>
            )}
            
            {engagementTab === 'tendencia' && (
              <div className="space-y-4">
                {roundTrends.length > 0 ? (
                  roundTrends.map((game, i) => (
                    <div key={game.gameId || i} className="bg-[#0A0F1E] border border-[#2A3441] rounded-xl p-4">
                      <div className="text-xs font-black uppercase text-gray-400 mb-3 text-center">{game.home} <span className="text-[10px] italic text-gray-600 mx-2">VS</span> {game.away}</div>
                      <div className="flex h-4 bg-[#1A2235] rounded-full overflow-hidden">
                        <div style={{ width: `${game.p1}%` }} className="bg-[#32CD32] relative group cursor-pointer hover:brightness-110 transition-all"></div>
                        <div style={{ width: `${game.pX}%` }} className="bg-gray-500 relative group cursor-pointer hover:brightness-110 transition-all"></div>
                        <div style={{ width: `${game.p2}%` }} className="bg-red-500 relative group cursor-pointer hover:brightness-110 transition-all"></div>
                      </div>
                      <div className="flex justify-between text-[10px] md:text-xs font-black uppercase text-gray-500 mt-3">
                        <span className="text-[#32CD32] flex items-center gap-1">Casa {game.p1}%</span>
                        <span className="text-gray-400">Empate {game.pX}%</span>
                        <span className="text-red-500 flex items-center gap-1">{game.p2}% Fora</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-12 italic text-sm">Sem tendências disponíveis para esta rodada.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lucky Numbers Banner - 4 */}
        {luckyNumbers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-[#12182B] to-[#1A2235] text-white rounded-xl p-4 shadow-[0_0_20px_rgba(50,205,50,0.1)] border border-[#32CD32]/30 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#32CD32] opacity-5 rounded-full -mr-32 -mt-32 pointer-events-none blur-3xl"></div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full justify-between">
              <div className="flex items-center gap-4">
                <div className="shrink-0 relative group">
                  <img 
                    src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/game.png" 
                    alt="Game Stick M15" 
                    className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(50,205,50,0.5)] transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-[#32CD32] text-black font-black px-1.5 py-0.5 rounded text-[8px] uppercase">
                    M15 PRO
                  </div>
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Trophy className="w-3 h-3 text-[#32CD32] drop-shadow-sm" />
                    <span className="text-[#32CD32] font-black text-[10px] tracking-widest uppercase">Promoção Especial</span>
                  </div>
                  <h2 className="text-lg font-black leading-tight tracking-tighter italic text-white uppercase">
                    Sorteio Dia 19/07
                  </h2>
                  <p className="text-gray-400 font-bold text-[10px] uppercase">
                    Ganhe cupons a cada palpite!
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end items-center gap-1.5 mt-2 sm:mt-0">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Meus Cupons:</span>
                <div className="flex flex-wrap gap-1">
                  {luckyNumbers.slice(0, 4).map((num, i) => (
                    <span key={i} className="bg-[#0A0F1E] px-2 py-1 rounded font-mono font-bold text-xs border border-[#32CD32]/30 text-[#32CD32]">
                      {num.number}
                    </span>
                  ))}
                  {luckyNumbers.length > 4 && (
                    <span className="text-[10px] font-bold text-[#FF6B00] bg-[#FF6B00]/10 px-2 py-1 rounded border border-[#FF6B00]/30">
                      +{luckyNumbers.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Ranking & Transparência - 5 */}
        <div className="bg-[#12182B] text-white rounded-xl p-6 shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[#2A3441] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Trophy className="w-10 h-10 text-[#32CD32]" />
            <div>
              <h3 className="text-xl font-black mb-1 uppercase italic">Ranking & Transparência</h3>
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider leading-relaxed">Acompanhe seus adversários e os maiores pontuadores da plataforma.</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('ranking')}
            className="w-full md:w-auto shrink-0 px-6 bg-[#1A2235] text-white border border-[#2A3441] py-3 rounded-lg font-black uppercase text-xs hover:border-[#32CD32] hover:text-[#32CD32] hover:bg-[#32CD32]/10 transition-all group shadow-sm flex items-center justify-center gap-2"
          >
            <span>Entrar no Ranking</span>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#32CD32]" />
          </button>
        </div>

        {/* History / Meus Palpites - 6 */}
        <div className="bg-[#12182B] rounded-xl p-6 border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <h2 className="text-xl font-black text-white italic uppercase mb-4">Meus Palpites</h2>
          <div className="space-y-3">
            {myPredictions.length > 0 ? myPredictions.map((pred) => (
              <div key={pred.id} className="border border-[#2A3441] rounded-lg overflow-hidden bg-[#0A0F1E]">
                <div 
                  onClick={() => setExpandedPrediction(expandedPrediction === pred.id ? null : pred.id)}
                  className="flex items-center justify-between p-3 hover:bg-[#1A2235] transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                      pred.status === 'approved' ? 'bg-[#32CD32]/10 border-[#32CD32]/30 text-[#32CD32]' : 
                      pred.status === 'rejected' ? 'bg-[#FF6B00]/10 border-[#FF6B00]/30 text-[#FF6B00]' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                    }`}>
                      {pred.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : 
                       pred.status === 'rejected' ? <X className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-black text-white text-sm uppercase italic">Rodada #{pred.round_number}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{formatDate(pred.created_at, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-300 uppercase">
                        {pred.status === 'approved' 
                          ? (pred.round_status === 'finished' ? `${pred.score} pts` : 'Em andamento') 
                          : 'Aguardando'}
                      </p>
                      <p className={`text-[9px] font-bold uppercase tracking-widest rounded px-1.5 py-0.5 mt-0.5 inline-block ${
                        pred.status === 'approved' ? 'text-[#32CD32] bg-[#32CD32]/10' : 
                        pred.status === 'rejected' ? 'text-[#FF6B00] bg-[#FF6B00]/10' : 'text-yellow-500 bg-yellow-500/10'
                      }`}>
                        {pred.status === 'approved' ? 'Validado' : 
                         pred.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${expandedPrediction === pred.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedPrediction === pred.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-[#12182B] border-t border-[#1A2235]"
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Suas Escolhas</h4>
                          {pred.lucky_number && (
                            <div className="flex items-center gap-1.5 bg-[#32CD32]/10 px-2 py-1 rounded border border-[#32CD32]/30">
                              <Ticket className="w-3 h-3 text-[#32CD32]" />
                              <span className="text-[9px] font-bold text-[#32CD32] uppercase tracking-wider mr-1">Cupom:</span>
                              <span className="font-mono font-black text-[#32CD32] text-xs leading-none">{pred.lucky_number}</span>
                            </div>
                          )}
                        </div>
                        {pred.items && pred.games ? (
                          <div className="space-y-1.5">
                            {pred.games.map((game: any) => {
                              const item = pred.items.find((i: any) => i.game_id === game.id);
                              const guess = item?.guess;
                              const isCorrect = game.result && guess === game.result;
                              const isFinished = !!game.result;
                              
                              return (
                                <div key={game.id} className="flex items-center justify-between bg-[#0A0F1E] p-2 rounded-lg border border-[#1A2235]">
                                  <div className="flex items-center space-x-2 flex-1">
                                    <span className="text-[10px] font-bold text-gray-500 w-3">{game.game_order + 1}</span>
                                    <div className="flex items-center gap-1.5 flex-1 justify-end">
                                      <span className={`font-black uppercase tracking-wider truncate text-right ${guess === '1' ? 'text-[#32CD32]' : 'text-gray-400'}`}>{game.home_team}</span>
                                      {getTeamCrestUrl(game.home_team) && (
                                        <div className="w-4 h-4 rounded-full border border-[#2A3441]/50 bg-[#1A2235]/60 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                                          <img src={getTeamCrestUrl(game.home_team)!} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-gray-600 mx-2 text-[8px] italic">VS</span>
                                    <div className="flex items-center gap-1.5 flex-1 justify-start">
                                      {getTeamCrestUrl(game.away_team) && (
                                        <div className="w-4 h-4 rounded-full border border-[#2A3441]/50 bg-[#1A2235]/60 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                                          <img src={getTeamCrestUrl(game.away_team)!} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        </div>
                                      )}
                                      <span className={`font-black uppercase tracking-wider truncate text-left ${guess === '2' ? 'text-[#32CD32]' : 'text-gray-400'}`}>{game.away_team}</span>
                                    </div>
                                  </div>
                                  <div className="ml-2 flex items-center space-x-1.5 shrink-0">
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-[#1A2235] border border-[#2A3441] px-1.5 py-0.5 rounded text-gray-400">
                                      {guess === '1' ? 'Casa' : guess === '2' ? 'Fora' : 'Empate'}
                                    </span>
                                    {isFinished && (
                                      isCorrect 
                                        ? <CheckCircle2 className="w-3 h-3 text-[#32CD32]" />
                                        : <X className="w-3 h-3 text-[#FF6B00]" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Detalhes não disponíveis.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8 font-black uppercase text-xs">Você ainda não fez nenhum palpite hoje.</p>
            )}
          </div>
        </div>

        {/* PagBank & WhatsApp Group Footer Section */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 pt-6 border-t border-[#2A3441]/40">
          <div className="bg-[#12182B] px-4 py-2 rounded-2xl border border-[#2A3441] shadow-sm flex items-center gap-3 h-[48px]">
            <img src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/PagBank.jpg" alt="PagBank" className="h-6 object-contain rounded" referrerPolicy="no-referrer" />
            <div className="h-8 w-[1px] bg-[#2A3441]"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Ambiente</span>
              <span className="text-xs font-bold text-[#32CD32] uppercase tracking-wider">100% Seguro</span>
            </div>
          </div>
          <a 
            href="https://chat.whatsapp.com/LWJCq74sKbvGav8mYX6Kx7?mode=gi_t" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-2xl font-bold hover:bg-[#128C7E] transition-all shadow-sm hover:shadow-md h-[48px]"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            Entrar no Grupo
          </a>
        </div>
      </div>
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        token={token}
        onDepositSuccess={() => {
          setIsDepositModalOpen(false);
          fetchData();
        }}
      />
    </div>
  );
};

export const getTeamCrestUrl = (teamName: string) => {
  if (!teamName) return null;
  const name = teamName.toLowerCase().trim();
  
  const countryCodes: Record<string, string> = {
    'brasil': 'br', 'argentina': 'ar', 'méxico': 'mx', 'mexico': 'mx', 'coreia do sul': 'kr',
    'rep. checa': 'cz', 'áfrica do sul': 'za', 'africa do sul': 'za', 'frança': 'fr',
    'alemanha': 'de', 'espanha': 'es', 'inglaterra': 'gb-eng', 'itália': 'it', 'italia': 'it',
    'portugal': 'pt', 'colômbia': 'co', 'colombia': 'co', 'uruguai': 'uy', 'chile': 'cl',
    'estados unidos': 'us', 'eua': 'us', 'japão': 'jp', 'japao': 'jp'
  };
  
  if (countryCodes[name]) {
    return `https://flagcdn.com/${countryCodes[name]}.svg`;
  }

  const clubLogos: Record<string, string> = {
    'flamengo': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Flamengo.png',
    'palmeiras': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Palmeiras.png',
    'são paulo': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/SaoPaulo.png',
    'sao paulo': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/SaoPaulo.png',
    'corinthians': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Corinthians.png',
    'fluminense': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Fluminense.png',
    'vasco': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Vasco.png',
    'vasco da gama': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Vasco.png',
    'botafogo': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Botafogo.png',
    'atlético-mg': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Atletico-MG.png',
    'atlético mg': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Atletico-MG.png',
    'atletico mg': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Atletico-MG.png',
    'atletico-mg': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Atletico-MG.png',
    'cruzeiro': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Cruzeiro.png',
    'grêmio': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Gremio.png',
    'gremio': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Gremio.png',
    'internacional': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Internacional.png',
    'bahia': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Bahia.png',
    'vitoria': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Vitoria.png',
    'vitória': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Vitoria.png',
    'fortaleza': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Fortaleza_Esporte_Clube_logo.svg/1000px-Fortaleza_Esporte_Clube_logo.svg.png',
    'ceará': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Cear%C3%A1_Sporting_Club_logo.svg/1000px-Cear%C3%A1_Sporting_Club_logo.svg.png',
    'ceara': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Cear%C3%A1_Sporting_Club_logo.svg/1000px-Cear%C3%A1_Sporting_Club_logo.svg.png',
    'athletico-pr': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Athletico-PR.png',
    'athletico pr': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Athletico-PR.png',
    'atletico pr': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Athletico-PR.png',
    'atletico-pr': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Athletico-PR.png',
    'coritiba': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Coritiba.png',
    'juventude': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Esporte_Clube_Juventude_logo.svg/1000px-Esporte_Clube_Juventude_logo.svg.png',
    'cuiabá': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Cuiab%C3%A1_Esporte_Clube_logo.svg/1000px-Cuiab%C3%A1_Esporte_Clube_logo.svg.png',
    'cuiaba': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Cuiab%C3%A1_Esporte_Clube_logo.svg/1000px-Cuiab%C3%A1_Esporte_Clube_logo.svg.png',
    'atlético-go': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Atl%C3%A9tico_Clube_Goianiense_logo.svg/1000px-Atl%C3%A9tico_Clube_Goianiense_logo.svg.png',
    'bragantino': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Bragantino.png',
    'red bull bragantino': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Bragantino.png',
    'chapecoense': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Chapecoense.png',
    'mirassol': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Mirassol.png',
    'remo': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Remo.png',
    'santos': 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/escudos/Santos.png',
    'sport': 'https://upload.wikimedia.org/wikipedia/pt/1/16/Sport_Club_do_Recife.png',
    'goiás': 'https://upload.wikimedia.org/wikipedia/commons/4/41/Goi%C3%A1s_Esporte_Clube_logo.svg',
    'goias': 'https://upload.wikimedia.org/wikipedia/commons/4/41/Goi%C3%A1s_Esporte_Clube_logo.svg',
  };

  if (clubLogos[name]) return clubLogos[name];

  return null;
};

const PredictionsPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { token, user } = useAuth();
  const [round, setRound] = useState<any>(null);
  const [guesses, setGuesses] = useState<Record<number, string>>({});
  const [predictionsList, setPredictionsList] = useState<Record<number, string>[]>(() => {
    try {
      const saved = localStorage.getItem('bolao10_predictions_list');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [step, setStep] = useState(() => {
    try {
      const saved = localStorage.getItem('bolao10_prediction_step');
      return saved ? parseInt(saved) : 1;
    } catch (e) {
      return 1;
    }
  }); // 1: Palpites, 2: Pagamento

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('bolao10_predictions_list', JSON.stringify(predictionsList));
  }, [predictionsList]);

  useEffect(() => {
    localStorage.setItem('bolao10_prediction_step', step.toString());
  }, [step]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDeadlinePopup, setShowDeadlinePopup] = useState(false);
  const [luckyNumbers, setLuckyNumbers] = useState<any[]>([]);
  const [showLuckyNumberPopup, setShowLuckyNumberPopup] = useState(false);
  const [lastLuckyNumbers, setLastLuckyNumbers] = useState<string[]>([]);

  const fetchWalletBalance = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/wallet/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance || 0);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  useEffect(() => {
    fetchWalletBalance();

    const handleNewNotification = (e: any) => {
      const notif = e.detail;
      if (notif && notif.id && (
        notif.id.startsWith('dep-app-') || 
        notif.id.startsWith('dep-rej-') ||
        notif.id.startsWith('withdraw-app-') ||
        notif.id.startsWith('withdraw-rej-')
      )) {
        fetchWalletBalance();
      }
    };

    window.addEventListener('new_notification', handleNewNotification);
    return () => {
      window.removeEventListener('new_notification', handleNewNotification);
    };
  }, [token]);

  useEffect(() => {
    fetch('/api/rounds/current')
      .then(res => {
        if (!res.ok) throw new Error('Erro ao carregar rodada');
        return res.json();
      })
      .then(data => {
        setRound(data);
        setLoading(false);
        
        // Clear session if it's a different round
        const savedRoundId = localStorage.getItem('bolao10_current_round_id');
        if (savedRoundId && data && savedRoundId !== data.id.toString()) {
          localStorage.removeItem('bolao10_predictions_list');
          localStorage.removeItem('bolao10_prediction_step');
          setPredictionsList([]);
          setStep(1);
        }
        if (data) {
          localStorage.setItem('bolao10_current_round_id', data.id.toString());
        }

        if (data && data.start_time && new Date() > (parseDate(data.start_time) || new Date(0))) {
          setShowDeadlinePopup(true);
        }
      })
      .catch(err => {
        console.error('Predictions error:', err);
        setLoading(false);
      });
  }, []);

  const handleGuess = (gameId: number, guess: string) => {
    if (round && round.start_time && new Date() > (parseDate(round.start_time) || new Date(0))) {
      setShowDeadlinePopup(true);
      return;
    }
    setGuesses(prev => ({ ...prev, [gameId]: guess }));
  };

  const handleAddPrediction = () => {
    if (round && round.start_time && new Date() > (parseDate(round.start_time) || new Date(0))) {
      setShowDeadlinePopup(true);
      return;
    }
    if (Object.keys(guesses).length < 10) {
      return alert('Por favor, complete todos os 10 palpites antes de adicionar outro.');
    }
    
    setPredictionsList(prev => [...prev, guesses]);
    setGuesses({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToPayment = () => {
    if (round && round.start_time && new Date() > (parseDate(round.start_time) || new Date(0))) {
      setShowDeadlinePopup(true);
      return;
    }
    
    if (Object.keys(guesses).length === 10) {
      setPredictionsList(prev => [...prev, guesses]);
      setGuesses({});
      setStep(2);
    } else if (predictionsList.length > 0) {
      setStep(2);
    } else {
      alert('Complete seu palpite antes de prosseguir.');
    }
  };

  const totalAmount = (predictionsList.length) * (round?.entry_value || 10);

  const handleSubmit = async () => {
    if (round && round.start_time && new Date() > (parseDate(round.start_time) || new Date(0))) {
      setShowDeadlinePopup(true);
      return;
    }
    
    if (walletBalance < totalAmount) {
      alert('Saldo insuficiente. Por favor, deposite fundos na sua carteira.');
      setIsDepositModalOpen(true);
      return;
    }

    setSubmitting(true);
    
    const formData = new FormData();
    formData.append('roundId', round.id.toString());
    formData.append('guesses', JSON.stringify(predictionsList));

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setLastLuckyNumbers(data.luckyNumbers || []);
        setShowLuckyNumberPopup(true);
        localStorage.removeItem('bolao10_predictions_list');
        localStorage.removeItem('bolao10_prediction_step');
        setPredictionsList([]);
        setStep(1);
        // onNavigate('wallet'); // Don't navigate yet, show popup first
      } else {
        alert(data.error || 'Erro ao salvar palpites');
      }
    } catch (err) {
      alert('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Carregando...</div>;
  if (!round || round.status !== 'open') return <div className="text-center py-20">Nenhuma rodada aberta no momento.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-white italic uppercase">Rodada #{round.number}</h2>
        <div className="flex items-center gap-3 bg-[#12182B] px-4 py-2 rounded-2xl border border-[#2A3441] shadow-sm w-fit h-[48px]">
          <img src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/PagBank.jpg" alt="PagBank" className="h-5 object-contain rounded" referrerPolicy="no-referrer" />
          <div className="h-6 w-[1px] bg-[#2A3441]"></div>
          <span className="text-[10px] font-bold text-[#32CD32] uppercase tracking-widest">Ambiente Seguro</span>
        </div>
      </div>

      {step === 1 ? (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

          
          {predictionsList.length > 0 && (
            <div className="bg-[#32CD32] bg-opacity-20 p-4 rounded-2xl border border-[#32CD32]/30 text-[#32CD32] text-sm mb-6 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-black uppercase tracking-wide">{predictionsList.length} palpite(s) adicionado(s) ao carrinho.</span>
                <span className="font-black">Total: R$ {(predictionsList.length * (round.entry_value || 10)).toFixed(2)}</span>
              </div>
              <button 
                onClick={() => {
                  if(confirm('Deseja limpar todos os palpites salvos nesta sessão?')) {
                    localStorage.removeItem('bolao10_predictions_list');
                    setPredictionsList([]);
                  }
                }}
                className="text-xs bg-[#12182B] text-red-500 px-3 py-2 rounded-lg font-black uppercase tracking-widest border border-red-500/50 hover:bg-red-500/20 transition-colors"
              >
                Limpar
              </button>
            </div>
          )}

          <div className="bg-[#12182B] border border-[#2A3441] rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
          {round.games.map((game: any, index: number) => {
  // Função para pegar as iniciais do time (ex: "São Paulo" -> "SÃ")
  const getInitials = (name: string) => {
    if (!name) return '??';
    const words = name.trim().split(' ');
    if (words.length > 1) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div key={game.id} className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-[#1A2235] hover:bg-[#1A2235]/50 transition-colors">
      
      {/* Container dos Times e Escudos */}
      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
        
        {/* Mandante */}
        <div className="flex items-center justify-end gap-3">
          <span className="font-black text-white text-sm md:text-base text-right">{game.home_team}</span>
          {getTeamCrestUrl(game.home_team) ? (
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.3)] border border-[#2A3441] bg-[#1A2235]/50 flex items-center justify-center p-1.5 flex-shrink-0 transition-transform hover:scale-105">
              <img src={getTeamCrestUrl(game.home_team)!} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
          ) : (
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-[#1A2235] border border-[#2A3441] shadow-md flex items-center justify-center flex-shrink-0">
              <span className="font-black text-[#32CD32] text-xs md:text-sm tracking-tighter">
                {getInitials(game.home_team)}
              </span>
            </div>
          )}
        </div>

        {/* VS */}
        <span className="text-gray-600 font-black text-xs md:text-sm mx-2 italic">VS</span>

        {/* Visitante */}
        <div className="flex items-center justify-start gap-3">
          {getTeamCrestUrl(game.away_team) ? (
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.3)] border border-[#2A3441] bg-[#1A2235]/50 flex items-center justify-center p-1.5 flex-shrink-0 transition-transform hover:scale-105">
              <img src={getTeamCrestUrl(game.away_team)!} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
          ) : (
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-[#1A2235] border border-[#2A3441] shadow-md flex items-center justify-center flex-shrink-0">
              <span className="font-black text-[#32CD32] text-xs md:text-sm tracking-tighter">
                {getInitials(game.away_team)}
              </span>
            </div>
          )}
          <span className="font-black text-white text-sm md:text-base text-left">{game.away_team}</span>
        </div>
      </div>

      {/* Botões de Aposta [1] [X] [2] */}
      <div className="flex justify-center space-x-2">
        {['1', 'X', '2'].map((opt) => (
          <button
            key={opt}
            onClick={() => handleGuess(game.id, opt)}
            className={`w-12 h-10 md:w-14 md:h-11 rounded-lg font-black text-sm md:text-base transition-all ${
              guesses[game.id] === opt 
                ? 'bg-[#32CD32] text-black border border-[#32CD32] shadow-[0_0_15px_rgba(50,205,50,0.4)] scale-105 transform' 
                : 'bg-[#0A0F1E] text-gray-400 border border-[#2A3441] hover:border-[#32CD32] hover:text-[#32CD32]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
})}
          </div>

          <div className="flex flex-col gap-3 mt-8 sticky bottom-4 z-40 bg-[#12182B] p-4 md:p-6 rounded-2xl border border-[#2A3441] shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
            {Object.keys(guesses).length === 10 && (
              <button
                disabled={submitting}
                onClick={handleAddPrediction}
                className="w-full bg-[#1A2235] text-gray-400 border border-[#2A3441] py-3 rounded-lg font-black uppercase tracking-wider text-xs hover:border-gray-500 transition-all hover:text-white"
              >
                {submitting ? 'Aguarde...' : '+ Adicionar Palpite Extra (Opcional)'}
              </button>
            )}
            <button
              disabled={(Object.keys(guesses).length < 10 && predictionsList.length === 0) || submitting}
              onClick={handleProceedToPayment}
              className="w-full bg-[#32CD32] text-black py-4 rounded-xl font-black uppercase italic tracking-wider text-lg sm:text-xl hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(50,205,50,0.4)] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
            >
              {submitting ? 'Aguarde...' : 'Confirmar Palpite'}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
          <div className="bg-[#12182B] p-8 rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] text-center">
            <h3 className="text-2xl font-black text-white uppercase italic mb-4">Confirmar Palpites</h3>
            <p className="text-gray-400 mb-6">
              Você está prestes a validar <span className="text-white font-bold">{predictionsList.length}</span> palpite(s). O valor total de <span className="font-black text-[#32CD32]">R$ {totalAmount.toFixed(2)}</span> será debitado da sua carteira.
            </p>

            <div className="bg-[#0A0F1E] p-6 rounded-2xl mb-8 max-w-md mx-auto border border-[#2A3441]">
              <div className="flex justify-between items-center mb-4 text-sm font-bold uppercase tracking-wider">
                <span className="text-gray-400">Saldo Atual:</span>
                <span className="text-white">R$ {walletBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-4 text-sm font-bold uppercase tracking-wider">
                <span className="text-gray-400">Valor a Pagar:</span>
                <span className="text-red-500">- R$ {totalAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-[#2A3441] pt-4 flex justify-between items-center text-sm font-black uppercase tracking-wider">
                <span className="text-white">Saldo Final:</span>
                <span className={`text-xl ${walletBalance >= totalAmount ? 'text-[#32CD32]' : 'text-red-500'}`}>
                  R$ {(walletBalance - totalAmount).toFixed(2)}
                </span>
              </div>
            </div>

            {walletBalance < totalAmount && (
              <div className="mb-8 p-6 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-2xl text-[#FF6B00] flex items-start text-left">
                <AlertCircle className="w-6 h-6 mr-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black uppercase tracking-wide mb-1">Saldo Insuficiente</p>
                  <p className="text-sm font-medium">Você precisa adicionar fundos à sua carteira para confirmar estes palpites.</p>
                  <button 
                    onClick={() => setIsDepositModalOpen(true)}
                    className="mt-3 bg-[#FF6B00] text-black px-4 py-2 rounded-lg text-sm font-black uppercase tracking-wider hover:opacity-90 transition-colors"
                  >
                    Depositar Agora
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4 max-w-md mx-auto">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-[#1A2235] text-white border border-[#2A3441] py-4 rounded-xl font-black uppercase tracking-wider text-sm sm:text-lg hover:bg-opacity-80 transition-all"
              >
                Voltar
              </button>
              <button
                disabled={submitting || walletBalance < totalAmount}
                onClick={handleSubmit}
                className="flex-[2] bg-[#32CD32] text-black py-4 rounded-xl font-black uppercase italic tracking-wider text-sm sm:text-lg hover:scale-105 transition-all shadow-[0_0_15px_rgba(50,205,50,0.4)] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none flex items-center justify-center"
              >
                {submitting ? 'Processando...' : 'Confirmar e Pagar'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {showDeadlinePopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-[#12182B] border border-[#2A3441] rounded-[32px] p-8 max-w-md w-full shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-wider mb-2">Prazo Encerrado</h3>
            <p className="text-gray-400 font-bold uppercase tracking-wide text-xs mb-8 leading-relaxed">
              O prazo para enviar palpites nesta rodada já encerrou.
            </p>
            <button
              onClick={() => {
                setShowDeadlinePopup(false);
                onNavigate('dashboard');
              }}
              className="w-full bg-[#32CD32] text-black py-4 rounded-xl font-black uppercase italic tracking-wider hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(50,205,50,0.4)] hover:shadow-[0_0_30px_rgba(50,205,50,0.6)]"
            >
              Voltar ao Início
            </button>
          </motion.div>
        </div>
      )}

      <LuckyNumberPopup 
        isOpen={showLuckyNumberPopup}
        onClose={() => {
          setShowLuckyNumberPopup(false);
          onNavigate('wallet');
        }}
        numbers={lastLuckyNumbers}
        userName={user?.name || user?.nickname}
      />

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        token={token}
        onDepositSuccess={() => {
          setIsDepositModalOpen(false);
          fetchWalletBalance();
        }}
      />
    </div>
  );
};

const ReferralPage = () => {
  const { token, user } = useAuth();
  const [referralInfo, setReferralInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReferralInfo = async () => {
    try {
      const res = await fetch('/api/user/referral-info', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReferralInfo(await res.json());
      }
    } catch (err) {
      console.error('Error fetching referral info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralInfo();
  }, [token]);

  const referralLink = `${window.location.origin}/?ref=${referralInfo?.referral_code}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Link de indicação copiado!');
  };

  if (loading) return <div className="flex justify-center items-center h-64">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="text-center">
          <h2 className="text-4xl font-black text-white italic uppercase tracking-wider mb-4">Indique e Ganhe</h2>
          <p className="text-gray-400 max-w-2xl mx-auto font-medium">
            Convide seus amigos para o Bolão 10 e ganhe <span className="font-bold text-[#32CD32]">R$ 2,00</span> por cada amigo que fizer o primeiro depósito de pelo menos R$ 10,00.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] text-center">
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            <div className="text-3xl font-black text-white">{referralInfo?.total_referred || 0}</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-black mt-2">Amigos Indicados</div>
          </div>
          <div className="bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] text-center">
            <CheckCircle className="w-8 h-8 text-[#32CD32] mx-auto mb-4" />
            <div className="text-3xl font-black text-white">{referralInfo?.paid_referrals || 0}</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-black mt-2">Indicações Pagas</div>
          </div>
          <div className="bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] text-center">
            <Wallet className="w-8 h-8 text-[#32CD32] mx-auto mb-4" />
            <div className="text-3xl font-black text-[#32CD32]">R$ {(referralInfo?.total_bonus || 0).toFixed(2)}</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-black mt-2">Bônus Recebido</div>
          </div>
        </div>

        <div className="bg-[#12182B] text-white p-8 rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-black italic uppercase tracking-wider text-white mb-4">Seu Link de Indicação</h3>
            <p className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-6">Compartilhe este link com seus amigos para começar a ganhar.</p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 bg-[#0A0F1E] border border-[#232F47] rounded-2xl p-4 font-mono text-sm break-all text-gray-300">
                {referralLink}
              </div>
              <button 
                onClick={copyToClipboard}
                className="bg-[#32CD32] text-black px-8 py-4 rounded-2xl font-black uppercase hover:scale-105 transition-all shadow-[0_0_15px_rgba(50,205,50,0.4)] flex items-center justify-center gap-2"
              >
                <Copy className="w-5 h-5" />
                Copiar Link
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="bg-[#12182B] p-8 rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2 uppercase italic tracking-wider">
            <Gift className="w-6 h-6 text-[#32CD32]" />
            Como funciona?
          </h3>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-[#1A2235] text-[#32CD32] border border-[#2A3441] rounded-full flex items-center justify-center font-black flex-shrink-0">1</div>
              <div>
                <h4 className="font-bold text-white text-base">Compartilhe seu link</h4>
                <p className="text-gray-400 text-sm mt-0.5">Envie seu link exclusivo para seus amigos via WhatsApp, Redes Sociais ou E-mail.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-[#1A2235] text-[#32CD32] border border-[#2A3441] rounded-full flex items-center justify-center font-black flex-shrink-0">2</div>
              <div>
                <h4 className="font-bold text-white text-base">Amigo se cadastra</h4>
                <p className="text-gray-400 text-sm mt-0.5">Seu amigo deve se cadastrar usando seu link exclusivo.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-[#1A2235] text-[#32CD32] border border-[#2A3441] rounded-full flex items-center justify-center font-black flex-shrink-0">3</div>
              <div>
                <h4 className="font-bold text-white text-base">Primeiro depósito de R$ 10+</h4>
                <p className="text-gray-400 text-sm mt-0.5">Assim que seu amigo fizer o primeiro depósito de no mínimo R$ 10,00 e ele for aprovado, você ganha o bônus.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-[#1A2235] text-[#32CD32] border border-[#2A3441] rounded-full flex items-center justify-center font-black flex-shrink-0">4</div>
              <div>
                <h4 className="font-bold text-white text-base">Bônus na carteira!</h4>
                <p className="text-gray-400 text-sm mt-0.5">O valor de R$ 2,00 será creditado automaticamente na sua carteira para você usar como quiser.</p>
              </div>
            </div>
          </div>
        </div>

        {referralInfo?.referrals?.length > 0 && (
          <div className="bg-[#12182B] p-8 rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
            <h3 className="text-xl font-black text-white mb-6 uppercase italic tracking-wider">Suas Indicações</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#2A3441]">
                    <th className="pb-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Amigo</th>
                    <th className="pb-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Data</th>
                    <th className="pb-4 font-bold text-gray-400 uppercase text-xs tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A2235]">
                  {referralInfo.referrals.map((ref: any) => (
                    <tr key={ref.id} className="hover:bg-[#1A2235]/25 transition-colors">
                      <td className="py-4">
                        <div className="font-bold text-white">{ref.referred_name}</div>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">@{ref.referred_nickname}</div>
                      </td>
                      <td className="py-4 text-sm text-gray-300 font-medium">
                        {new Date(ref.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 text-center">
                        {ref.bonus_paid ? (
                          <span className="bg-[#32CD32]/10 text-[#32CD32] border border-[#32CD32]/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Pago</span>
                        ) : (
                          <span className="bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Pendente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const AdminDashboard = () => {
  const { token, isAdmin } = useAuth();
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userWallets, setUserWallets] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [financialDetails, setFinancialDetails] = useState<any>({ jackpotPool: 0, prizesHistory: [], withdrawalsHistory: [] });
  const [profitDistributions, setProfitDistributions] = useState<any[]>([]);
  const [newWithdrawal, setNewWithdrawal] = useState({ amount: '', reason: '' });
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [newJackpotInjection, setNewJackpotInjection] = useState({ amount: '', description: '' });
  const [showJackpotForm, setShowJackpotForm] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralFilter, setReferralFilter] = useState('');
  const [allLuckyNumbers, setAllLuckyNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingProof, setViewingProof] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'users' | 'financial' | 'user-wallets' | 'history' | 'notifications' | 'messages' | 'referrals' | 'lucky-numbers'>('withdrawals');
  const [roundHistory, setRoundHistory] = useState<any[]>([]);
  
  // Notification Form State
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info',
    target_type: 'all',
    user_id: ''
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  
  // Edit User State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [manualDepositForm, setManualDepositForm] = useState({ userId: '', amount: '', description: '' });
  const [showManualDepositModal, setShowManualDepositModal] = useState(false);
  const [walletSearch, setWalletSearch] = useState('');
  const [viewingWalletHistory, setViewingWalletHistory] = useState<any>(null);

  const fetchPendingDeposits = async () => {
    const res = await fetch('/api/admin/deposits', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setPendingDeposits(data);
    }
  };

  const fetchPendingWithdrawals = async () => {
    const res = await fetch('/api/admin/pending-withdrawals', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setPendingWithdrawals(data);
    }
  };

  const fetchWithdrawalHistory = async () => {
    const res = await fetch('/api/admin/withdrawal-history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setWithdrawalHistory(data);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setUsers(data);
  };

  const fetchUserWallets = async () => {
    const res = await fetch('/api/admin/user-wallets', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setUserWallets(data);
    }
  };

  const fetchFinancials = async () => {
    const res = await fetch('/api/admin/financial-summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setFinancials(data);
  };

  const fetchFinancialDetails = async () => {
    const res = await fetch('/api/admin/financial-details', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setFinancialDetails(await res.json());
  };

  const fetchProfitDistributions = async () => {
    const res = await fetch('/api/admin/profit-distributions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setProfitDistributions(data);
    }
  };

  const handleAddWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/withdrawals', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newWithdrawal)
    });
    if (res.ok) {
      alert('Saque registrado com sucesso!');
      setNewWithdrawal({ amount: '', reason: '' });
      setShowWithdrawalForm(false);
      fetchFinancialDetails();
    }
  };

  const handleInjectJackpot = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/jackpot/inject', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newJackpotInjection)
    });
    if (res.ok) {
      alert('Bônus injetado com sucesso!');
      setNewJackpotInjection({ amount: '', description: '' });
      setShowJackpotForm(false);
      fetchFinancialDetails();
    }
  };

  const handleManualDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDepositForm.userId || !manualDepositForm.amount) return;

    try {
      const res = await fetch('/api/admin/wallets/deposit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(manualDepositForm)
      });

      if (res.ok) {
        toast.success('Depósito realizado com sucesso!');
        setManualDepositForm({ userId: '', amount: '', description: '' });
        setShowManualDepositModal(false);
        fetchUserWallets();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao realizar depósito');
      }
    } catch (err) {
      console.error('Manual deposit error:', err);
      toast.error('Erro de conexão ao realizar depósito');
    }
  };

  const [showManualWithdrawModal, setShowManualWithdrawModal] = useState(false);
  const [manualWithdrawForm, setManualWithdrawForm] = useState({ userId: '', amount: '', description: '' });

  const handleManualWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualWithdrawForm.userId || !manualWithdrawForm.amount) return;

    try {
      const res = await fetch('/api/admin/wallets/withdraw', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(manualWithdrawForm)
      });

      if (res.ok) {
        toast.success('Retirada realizada com sucesso!');
        setManualWithdrawForm({ userId: '', amount: '', description: '' });
        setShowManualWithdrawModal(false);
        fetchUserWallets();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao realizar retirada');
      }
    } catch (err) {
      console.error('Manual withdraw error:', err);
      toast.error('Erro de conexão ao realizar retirada');
    }
  };

  const [allDeposits, setAllDeposits] = useState<any[]>([]);
  const fetchAllDeposits = async () => {
    const res = await fetch('/api/admin/deposits/all', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setAllDeposits(await res.json());
    }
  };

  const handleDownloadPagBankLogs = async () => {
    try {
      const res = await fetch('/api/admin/pagbank-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Erro ao baixar o log. Talvez ele ainda não exista.');
        return;
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'pagbank-homologation.log';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading log', e);
      alert('Erro ao baixar o log');
    }
  };

  const fetchRoundHistory = async () => {
    const res = await fetch('/api/admin/rounds', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setRoundHistory(data);
  };

  const fetchNotifications = async () => {
    const res = await fetch('/api/admin/notifications', { 
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setAdminNotifications(await res.json());
    }
  };

  const fetchSentNotifications = async () => {
    const res = await fetch('/api/admin/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setSentNotifications(await res.json());
  };

  const fetchReferrals = async () => {
    const res = await fetch('/api/admin/referrals', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setReferrals(await res.json());
  };

  const fetchAllLuckyNumbers = async () => {
    const res = await fetch('/api/admin/lucky-numbers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setAllLuckyNumbers(await res.json());
  };

  useEffect(() => { 
    setLoading(true);
    const promises = [];
    if (activeTab === 'withdrawals') {
      promises.push(fetchPendingWithdrawals());
      promises.push(fetchWithdrawalHistory());
    }
    if (activeTab === 'users' || activeTab === 'messages') promises.push(fetchUsers());
    if (activeTab === 'notifications') promises.push(fetchNotifications());
    if (activeTab === 'messages') promises.push(fetchSentNotifications());
    if (activeTab === 'referrals') promises.push(fetchReferrals());
    if (activeTab === 'lucky-numbers') promises.push(fetchAllLuckyNumbers());
    if (activeTab === 'financial') {
      promises.push(fetchFinancials());
      promises.push(fetchFinancialDetails());
      promises.push(fetchProfitDistributions());
    }
    if (activeTab === 'user-wallets') {
      promises.push(fetchUserWallets());
      promises.push(fetchPendingDeposits());
      promises.push(fetchAllDeposits());
    }
    if (activeTab === 'history') promises.push(fetchRoundHistory());
    Promise.all(promises).finally(() => setLoading(false));

    const handleNewNotification = (e: any) => {
      const notif = e.detail;
      if (notif && notif.id) {
        if ((notif.id.startsWith('dep-req-') || notif.id.startsWith('dep-proof-') || notif.id.startsWith('dep-upd-')) && activeTab === 'user-wallets') fetchPendingDeposits();
        if (notif.id.startsWith('withdraw-req-') && activeTab === 'withdrawals') fetchPendingWithdrawals();
      }
    };

    window.addEventListener('new_notification', handleNewNotification);
    return () => {
      window.removeEventListener('new_notification', handleNewNotification);
    };
  }, [token, activeTab]);

  const handleValidateDeposit = async (id: number, status: 'approved' | 'rejected') => {
    const res = await fetch(`/api/admin/deposits/${id}/approve`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    if (res.ok) fetchPendingDeposits();
  };

  const handleValidateWithdrawal = async (id: number, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/${action}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        toast.success(`Saque ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso!`);
        fetchPendingWithdrawals();
        fetchWithdrawalHistory();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao processar saque');
      }
    } catch (err) {
      toast.error('Erro na conexão');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/admin/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editingUser)
    });
    if (res.ok) {
      alert('Usuário atualizado!');
      setEditingUser(null);
      fetchUsers();
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchUsers();
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingNotification(true);
    try {
      const res = await fetch('/api/admin/send-notification', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationForm)
      });
      if (res.ok) {
        alert('Notificação enviada com sucesso!');
        setNotificationForm({
          title: '',
          message: '',
          type: 'info',
          target_type: 'all',
          user_id: ''
        });
        fetchSentNotifications();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao enviar notificação');
      }
    } catch (err) {
      alert('Erro de conexão');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Deseja excluir esta mensagem do histórico?')) return;
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSentNotifications();
      }
    } catch (err) {
      alert('Erro ao excluir');
    }
  };

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-white">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-wider text-white">Painel Administrativo</h2>
          <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">Monitore saques, usuários, carteiras e financeiro.</p>
        </div>
        <div className="flex bg-[#0A0F1E] p-1.5 rounded-xl overflow-x-auto max-w-full border border-[#2A3441] shadow-inner">
          {[
            { id: 'withdrawals', label: 'Saques' },
            { id: 'users', label: 'Usuários' },
            { id: 'financial', label: 'Financeiro' },
            { id: 'user-wallets', label: 'Carteiras' },
            { id: 'history', label: 'Histórico' },
            { id: 'referrals', label: 'Indicações' },
            { id: 'lucky-numbers', label: '🏆 Sorteio' },
            { id: 'notifications', label: 'Alertas' },
            { id: 'messages', label: 'Mensagens' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#32CD32] text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {activeTab === 'withdrawals' && (
        <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="p-6 border-b border-[#2A3441] bg-[#1A2235] flex justify-between items-center">
            <h3 className="font-black uppercase italic tracking-wider text-white">Saques Pendentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#2A3441]">
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Data Solicitação</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Chave PIX</th>
                  <th className="px-6 py-4 font-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3441]">
                {pendingWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-[#1A2235] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{w.user_name} ({w.user_nickname})</p>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {new Date(w.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      R$ {Math.abs(w.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-[#32CD32]">
                      {w.pix_key || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleValidateWithdrawal(w.id, 'approve')}
                            className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-green-500/20 transition-colors flex items-center"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleValidateWithdrawal(w.id, 'reject')}
                            className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-red-500/20 transition-colors flex items-center"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeitar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {pendingWithdrawals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-bold uppercase tracking-wider text-xs">
                      Nenhum saque pendente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'withdrawals' && withdrawalHistory && withdrawalHistory.length > 0 && (
        <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden mt-8">
          <div className="p-6 border-b border-[#2A3441] bg-[#1A2235] flex justify-between items-center">
            <h3 className="font-black uppercase italic tracking-wider text-white">Histórico de Saques</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#2A3441]">
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Data Solicitação</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Chave PIX</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3441]">
                {withdrawalHistory.map((w) => (
                  <tr key={w.id} className="hover:bg-[#1A2235] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{w.user_name} ({w.user_nickname})</p>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {new Date(w.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      R$ {Math.abs(w.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-[#32CD32]">
                      {w.pix_key || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                        w.status === 'Aprovado' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        w.status === 'Rejeitado' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        'bg-[#1A2235] text-gray-300 border-[#2A3441]'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="p-6 border-b border-[#2A3441] bg-[#1A2235]">
            <h3 className="font-black uppercase italic tracking-wider text-white">Gerenciamento de Usuários</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#2A3441]">
                  <th className="px-6 py-4">Nome / Nickname</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Senha</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3441]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#1A2235] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{u.name}</p>
                      <p className="text-xs text-[#32CD32]">@{u.nickname}</p>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <p className="text-gray-200 font-semibold">{u.email}</p>
                      {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <code className="bg-[#0A0F1E] border border-[#2A3441] text-gray-300 px-2.5 py-1 rounded-lg text-xs font-mono">{u.password}</code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-[#1A2235] text-gray-400 border-[#2A3441]'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3">
                        {isAdmin && (
                          <button 
                            onClick={() => setEditingUser(u)}
                            className="text-blue-400 hover:text-blue-300 hover:underline text-xs font-bold uppercase tracking-wider"
                          >
                            Editar
                          </button>
                        )}
                        <a 
                          href={`mailto:${u.email}`}
                          className="text-green-400 hover:text-green-300 hover:underline text-xs font-bold uppercase tracking-wider"
                        >
                          E-mail
                        </a>
                        {u.phone && (
                          <a 
                            href={`https://wa.me/55${u.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#32CD32] hover:underline text-xs font-bold uppercase tracking-wider"
                          >
                            WhatsApp
                          </a>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-400 hover:text-red-300 hover:underline text-xs font-bold uppercase tracking-wider"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'referrals' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#12182B] p-8 rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-xl font-black uppercase italic tracking-wider text-[#32CD32]">Monitoramento de Indicações</h3>
            <input
              type="text"
              placeholder="Filtrar por indicador..."
              value={referralFilter}
              onChange={(e) => setReferralFilter(e.target.value)}
              className="px-4 py-3 bg-[#0A0F1E] border border-[#2A3441] text-white rounded-xl text-sm w-full md:w-64 focus:ring-2 focus:ring-[#32CD32] outline-none transition-all placeholder-gray-600 font-bold"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#2A3441]">
                  <th className="pb-4 font-black text-gray-400 uppercase text-xs tracking-wider">Indicador</th>
                  <th className="pb-4 font-black text-gray-400 uppercase text-xs tracking-wider">Indicado</th>
                  <th className="pb-4 font-black text-gray-400 uppercase text-xs tracking-wider">Data</th>
                  <th className="pb-4 font-black text-gray-400 uppercase text-xs tracking-wider text-center">Bônus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3441]">
                {referrals.filter(ref => {
                  if (!referralFilter) return true;
                  const search = referralFilter.toLowerCase();
                  const referrerName = ref.referrer?.name || ref.referrer?.nickname || '';
                  const referrerEmail = ref.referrer?.email || '';
                  return referrerName.toLowerCase().includes(search) || referrerEmail.toLowerCase().includes(search);
                }).map((ref: any) => (
                  <tr key={ref.id} className="hover:bg-[#1A2235] transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-white">{ref.referrer?.nickname || ref.referrer?.name || 'Desconhecido'}</div>
                      <div className="text-xs text-gray-400">{ref.referrer?.email || '-'}</div>
                    </td>
                    <td className="py-4">
                      <div className="font-bold text-white">{ref.referred?.nickname || ref.referred?.name || 'Desconhecido'}</div>
                      <div className="text-xs text-gray-400">{ref.referred?.email || '-'}</div>
                    </td>
                    <td className="py-4 text-sm text-gray-300">
                      {new Date(ref.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-4 text-center">
                      {ref.bonus_paid ? (
                        <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Pago (R$ {Number(ref.bonus_amount).toFixed(2)})</span>
                      ) : (
                        <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Pendente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === 'lucky-numbers' && (
        <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="p-6 border-b border-[#2A3441] bg-[#1A2235] flex justify-between items-center">
            <h3 className="font-black uppercase italic tracking-wider text-white">Controle de Sorteio</h3>
            <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
              Total Gerado: {allLuckyNumbers.length}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#2A3441]">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4 font-mono">Número da Sorte</th>
                  <th className="px-6 py-4">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3441]">
                {allLuckyNumbers.map((num) => (
                  <tr key={num.id} className="hover:bg-[#1A2235] transition-colors">
                    <td className="px-6 py-4">
                      <span className="w-8 h-8 bg-[#32CD32]/10 text-[#32CD32] border border-[#32CD32]/30 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5" />
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{num.users?.name || 'Usuário Deletado'}</p>
                      <p className="text-xs text-gray-400">@{num.users?.nickname}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-[#32CD32] text-black px-3 py-1 rounded-lg font-mono font-black text-lg shadow-[0_0_12px_rgba(50,205,50,0.4)]">
                        {num.number}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(num.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
                {allLuckyNumbers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-bold uppercase tracking-wider text-xs italic">
                      Nenhum número da sorte gerado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="p-6 border-b border-[#2A3441] bg-[#1A2235] flex justify-between items-center">
            <h3 className="font-black uppercase italic tracking-wider text-white">Alertas e Solicitações</h3>
            <Bell className="w-5 h-5 text-[#32CD32] animate-bounce" />
          </div>
          <div className="divide-y divide-[#2A3441]">
            {adminNotifications.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-bold uppercase tracking-wider text-xs italic">
                Nenhum alerta pendente.
              </div>
            ) : (
              adminNotifications.map((n: any) => (
                <div key={n.id} className="p-6 hover:bg-[#1A2235] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        n.type === 'forgot_password' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                        n.type === 'withdrawal_request' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        (n.type === 'deposit_request' || n.type === 'deposit_pending') ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {n.type === 'forgot_password' ? <AlertCircle className="w-5 h-5" /> : 
                         n.type === 'withdrawal_request' ? <ArrowUpCircle className="w-5 h-5" /> :
                         (n.type === 'deposit_request' || n.type === 'deposit_pending') ? <ArrowDownCircle className="w-5 h-5" /> :
                         <Bell className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-white">{n.title || n.message}</p>
                        {n.title && <p className="text-sm text-gray-300 mt-0.5">{n.message}</p>}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(n.created_at || n.date, 'dd/MM/yyyy HH:mm')}
                        </p>
                        
                        <div className="mt-4 flex flex-wrap gap-2">
                           {n.type === 'forgot_password' && (
                            <>
                              <a 
                                href={`mailto:${n.user_email}?subject=Recuperação de Senha - Bolão10&body=Olá ${n.user_name}, recebemos sua solicitação de recuperação de senha.`}
                                className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-500/20 transition-all flex items-center"
                              >
                                <Mail className="w-3.5 h-3.5 mr-1.5" /> Enviar E-mail
                              </a>
                              {n.user_phone && (
                                <a 
                                  href={`https://wa.me/55${n.user_phone.replace(/\D/g, '')}?text=Olá ${n.user_name}, recebemos sua solicitação de recuperação de senha no Bolão10.`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-[#32CD32]/10 text-[#32CD32] border border-[#32CD32]/30 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-[#32CD32]/20 transition-all flex items-center"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Enviar WhatsApp
                                </a>
                              )}
                            </>
                          )}

                          {n.type === 'withdrawal_request' && (
                            <button 
                              onClick={() => setActiveTab('withdrawals')}
                              className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-red-500/20 transition-all flex items-center"
                            >
                              <ArrowUpCircle className="w-3.5 h-3.5 mr-1.5" /> Ver Pedidos de Saque
                            </button>
                          )}

                          {n.type === 'deposit_request' && (
                            <button 
                              onClick={() => setActiveTab('user-wallets')}
                              className="bg-[#32CD32]/10 text-[#32CD32] border border-[#32CD32]/20 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-[#32CD32]/20 transition-all flex items-center"
                            >
                              <ArrowDownCircle className="w-3.5 h-3.5 mr-1.5" /> Validar Depósitos
                            </button>
                          )}

                          {n.type === 'deposit_pending' && (
                            <button 
                              onClick={() => setActiveTab('user-wallets')}
                              className="bg-[#32CD32]/10 text-[#32CD32] border border-[#32CD32]/20 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-[#32CD32]/20 transition-all flex items-center"
                            >
                              <ArrowDownCircle className="w-3.5 h-3.5 mr-1.5" /> Ver Carteiras
                            </button>
                          )}

                          {(n.type === 'withdrawal_request' || n.type === 'deposit_request' || n.type === 'deposit_pending') && n.user_phone && (
                            <a 
                              href={`https://wa.me/55${n.user_phone.replace(/\D/g, '')}?text=Olá ${n.user_name}, sobre seu pedido de ${n.type === 'withdrawal_request' ? 'saque' : 'depósito'} no Bolão10...`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#32CD32]/10 text-[#32CD32] border border-[#32CD32]/20 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-[#32CD32]/20 transition-all flex items-center"
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Contatar Usuário
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/admin/notifications/${n.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (res.ok) fetchNotifications();
                        } catch (err) {
                          console.error('Error deleting notification:', err);
                        }
                      }}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                      title="Remover alerta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {isAdmin && (
            <div className="lg:col-span-1">
              <div className="bg-[#12182B] p-8 rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] sticky top-8 text-white">
                <h3 className="text-xl font-black uppercase italic tracking-wider text-[#32CD32] mb-6">Enviar Notificação</h3>
                <form onSubmit={handleSendNotification} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Título</label>
                    <input 
                      type="text" 
                      required 
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0A0F1E] border border-[#2A3441] text-white rounded-xl focus:ring-2 focus:ring-[#32CD32] outline-none transition-all placeholder-gray-600 font-bold"
                      placeholder="Ex: Nova Rodada Aberta!"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Mensagem</label>
                    <textarea 
                      required 
                      rows={4}
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0A0F1E] border border-[#2A3441] text-white rounded-xl focus:ring-2 focus:ring-[#32CD32] outline-none transition-all placeholder-gray-600 font-bold resize-none"
                      placeholder="Digite o conteúdo da mensagem..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Tipo de Alerta</label>
                    <select 
                      value={notificationForm.type}
                      onChange={(e) => setNotificationForm({...notificationForm, type: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0A0F1E] border border-[#2A3441] text-white rounded-xl focus:ring-2 focus:ring-[#32CD32] outline-none transition-all font-bold"
                    >
                      <option value="info">ℹ️ Informação (Azul)</option>
                      <option value="success">✅ Sucesso (Verde)</option>
                      <option value="warning">⚠️ Aviso (Amarelo)</option>
                      <option value="error">❌ Erro / Crítico (Vermelho)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Destinatário</label>
                    <select 
                      value={notificationForm.target_type}
                      onChange={(e) => setNotificationForm({...notificationForm, target_type: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0A0F1E] border border-[#2A3441] text-white rounded-xl focus:ring-2 focus:ring-[#32CD32] outline-none transition-all font-bold"
                    >
                      <option value="all">Todos os Usuários</option>
                      <option value="individual">Usuário Específico</option>
                    </select>
                  </div>
                  {notificationForm.target_type === 'individual' && (
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Selecionar Usuário</label>
                      <select 
                        required
                        value={notificationForm.user_id}
                        onChange={(e) => setNotificationForm({...notificationForm, user_id: e.target.value})}
                        className="w-full px-4 py-3 bg-[#0A0F1E] border border-[#2A3441] text-white rounded-xl focus:ring-2 focus:ring-[#32CD32] outline-none transition-all font-bold"
                      >
                        <option value="">Selecione um usuário...</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name} (@{u.nickname})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button 
                    type="submit" 
                    disabled={sendingNotification}
                    className="w-full bg-[#32CD32] text-black py-4 rounded-xl font-black uppercase italic tracking-wider text-sm hover:scale-105 transition-all shadow-[0_0_15px_rgba(50,205,50,0.4)] disabled:opacity-50 flex items-center justify-center mt-4"
                  >
                    {sendingNotification ? 'Enviando...' : (
                      <>
                        <Send className="w-4 h-4 mr-2" /> Enviar Agora
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
          
          <div className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden text-white">
              <div className="p-6 border-b border-[#2A3441] bg-[#1A2235]">
                <h3 className="font-black uppercase italic tracking-wider text-[#32CD32]">Histórico de Mensagens</h3>
              </div>
              <div className="divide-y divide-[#2A3441]">
                {sentNotifications.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 font-bold uppercase tracking-wider text-xs italic">
                    Nenhuma mensagem enviada ainda.
                  </div>
                ) : (
                  sentNotifications.map((n) => (
                    <div key={n.id} className="p-6 hover:bg-[#1A2235] transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            n.type === 'success' ? 'bg-green-500 animate-pulse' : 
                            n.type === 'warning' ? 'bg-yellow-500' : 
                            (n.type === 'alert' || n.type === 'error') ? 'bg-red-500' : 'bg-blue-500'
                          }`} />
                          <h4 className="font-bold text-white">{n.title}</h4>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-gray-400 font-bold font-mono">
                            {formatDate(n.created_at, 'dd/MM/yyyy HH:mm')}
                          </span>
                          {isAdmin && (
                            <button 
                              onClick={() => handleDeleteNotification(n.id)}
                              className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                              title="Excluir mensagem"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mb-3 font-medium">{n.message}</p>
                      <div className="flex items-center text-[10px] font-black uppercase tracking-wider">
                        <span className="text-gray-500 mr-2">Para:</span>
                        {n.target_type === 'all' ? (
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">Todos</span>
                        ) : (
                          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded">
                            Individual (ID: {n.user_id})
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'user-wallets' && (() => {
        const totalBalance = userWallets.reduce((acc, uw) => acc + (uw.balance || 0), 0);
        const totalDeposited = userWallets.reduce((acc, uw) => acc + (uw.totalDeposited || 0), 0);
        const totalWinnings = userWallets.reduce((acc, uw) => acc + (uw.totalWinnings || 0), 0);
        const totalWithdrawn = userWallets.reduce((acc, uw) => acc + (uw.totalWithdrawn || 0), 0);
        const activeUsersCount = userWallets.filter(uw => uw.balance > 0).length;

        return (
          <div className="space-y-8 text-white">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] border-l-4 border-l-[#32CD32] shadow-[0_0_15px_rgba(0,0,0,0.5)] flex justify-between items-center text-white">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">BANCO Bolão 10</p>
                  <p className="text-2xl font-black text-white">R$ {totalBalance.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#1A2235] text-[#32CD32] rounded-full flex items-center justify-center">
                  <Landmark className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] border-l-4 border-l-blue-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex justify-between items-center text-white">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Total Depositado</p>
                  <p className="text-2xl font-black text-blue-400">R$ {totalDeposited.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#1A2235] text-blue-400 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] border-l-4 border-l-purple-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex justify-between items-center text-white">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Total de Prêmios</p>
                  <p className="text-2xl font-black text-purple-400">R$ {totalWinnings.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#1A2235] text-purple-400 rounded-full flex items-center justify-center">
                  <Gift className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] border-l-4 border-l-red-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex justify-between items-center text-white">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Total Sacado</p>
                  <p className="text-2xl font-black text-red-500">R$ {totalWithdrawn.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#1A2235] text-red-500 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] border-l-4 border-l-orange-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex justify-between items-center text-white">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Usuários Ativos</p>
                  <p className="text-2xl font-black text-orange-400">{activeUsersCount}</p>
                </div>
                <div className="w-12 h-12 bg-[#1A2235] text-orange-400 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="p-6 border-b border-[#2A3441] bg-[#1A2235] flex justify-between items-center flex-wrap gap-4">
                <h3 className="font-black uppercase italic tracking-wider text-[#32CD32] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Validação de Depósitos
                </h3>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleDownloadPagBankLogs}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all font-black text-xs uppercase tracking-wider cursor-pointer outline-none"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Log PagBank
                  </button>
                  <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/25 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                    {pendingDeposits.length} Pendentes
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#2A3441]">
                      <th className="px-6 py-4">Usuário</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Valor</th>
                      <th className="px-6 py-4">Comprovante</th>
                      <th className="px-6 py-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A3441]">
                    {pendingDeposits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-bold uppercase tracking-wider text-xs italic">Nenhum depósito pendente de validação.</td>
                      </tr>
                    ) : (
                      pendingDeposits.map((d) => (
                        <tr key={d.id} className="hover:bg-[#1A2235] transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-white">{d.user_name} ({d.user_nickname})</p>
                            <p className="text-xs text-gray-400">{d.user_email}</p>
                          </td>
                          <td className="px-6 py-4 text-gray-300 text-sm">
                            {new Date(d.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 font-bold text-[#32CD32]">
                            R$ {d.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            {d.proof_url ? (
                              <button 
                                onClick={() => setViewingProof(d.proof_url)}
                                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm font-black uppercase tracking-wider"
                              >
                                <Eye className="w-4 h-4" /> Ver Comprovante
                              </button>
                            ) : (
                              <span className="text-gray-500 text-xs italic">Sem comprovante</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isAdmin && (
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleValidateDeposit(d.id, 'approved')}
                                  className="p-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-all"
                                  title="Aprovar"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => handleValidateDeposit(d.id, 'rejected')}
                                  className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all"
                                  title="Rejeitar"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="p-6 border-b border-[#2A3441] flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-xl font-black uppercase italic tracking-wider text-white flex items-center gap-2">
                  <Wallet className="w-6 h-6 text-[#32CD32]" />
                  Carteiras dos Usuários
                </h3>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="relative flex-grow sm:flex-grow-0">
                    <input 
                      type="text" 
                      placeholder="Buscar por nome ou email..." 
                      value={walletSearch}
                      onChange={(e) => setWalletSearch(e.target.value)}
                      className="w-full sm:w-64 pl-10 pr-4 py-3 bg-[#0A0F1E] border border-[#2A3441] text-white rounded-xl text-sm focus:ring-2 focus:ring-[#32CD32] outline-none transition-all placeholder-gray-600 font-bold"
                    />
                    <Users className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <button onClick={() => { fetchUserWallets(); fetchAllDeposits(); }} className="text-xs font-black uppercase tracking-wider text-blue-400 hover:text-blue-300">
                    Atualizar
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1A2235] text-gray-400 text-xs font-black uppercase tracking-widest border-b border-[#2A3441]">
                      <th className="px-6 py-4">Usuário</th>
                      <th className="px-6 py-4">Saldo Atual</th>
                      <th className="px-6 py-4">Total Depositado</th>
                      <th className="px-6 py-4">Total Ganho</th>
                      <th className="px-6 py-4">Saques</th>
                      <th className="px-6 py-4">Histórico</th>
                      <th className="px-6 py-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A3441]">
                    {(() => {
                      const filtered = userWallets.filter((uw: any) => 
                        uw.user.name.toLowerCase().includes(walletSearch.toLowerCase()) ||
                        uw.user.email.toLowerCase().includes(walletSearch.toLowerCase())
                      );
                      
                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500 font-bold uppercase tracking-wider text-xs">Nenhum usuário encontrado.</td>
                          </tr>
                        );
                      }

                      return filtered.map((uw: any) => (
                        <tr key={uw.user.id} className="hover:bg-[#1A2235] transition-colors text-gray-200">
                          <td className="px-6 py-4">
                            <p className="font-bold text-white">{uw.user.name}</p>
                            <p className="text-xs text-gray-400">{uw.user.email}</p>
                            {uw.user.nickname && <p className="text-xs text-[#32CD32]">@{uw.user.nickname}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-bold ${uw.balance > 0 ? 'text-[#32CD32]' : 'text-gray-500'}`}>
                              R$ {uw.balance.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-300">R$ {uw.totalDeposited.toFixed(2)}</td>
                          <td className="px-6 py-4 text-blue-400">R$ {uw.totalWinnings.toFixed(2)}</td>
                          <td className="px-6 py-4 text-red-400">R$ {uw.totalWithdrawn.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => setViewingWalletHistory(uw)}
                              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-gray-300 hover:text-white transition-colors bg-[#1A2235] border border-[#2A3441] px-3 py-2 rounded-lg"
                            >
                              <History className="w-3.5 h-3.5" />
                              Ver Extrato ({uw.deposits.length})
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2">
                              <button 
                                onClick={() => {
                                  setManualDepositForm({ ...manualDepositForm, userId: uw.user.id });
                                  setShowManualDepositModal(true);
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-green-500/20 transition-all"
                                title="Depósito Manual"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Depósito
                              </button>
                              <button 
                                onClick={() => {
                                  setManualWithdrawForm({ ...manualWithdrawForm, userId: uw.user.id });
                                  setShowManualWithdrawModal(true);
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-500/20 transition-all"
                                title="Retirada Manual"
                              >
                                <MinusCircle className="w-3.5 h-3.5" />
                                Retirada
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="p-6 border-b border-[#2A3441] bg-[#1A2235] flex justify-between items-center">
                <h3 className="font-black uppercase italic tracking-wider text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Histórico de Depósitos
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#2A3441]">
                      <th className="px-6 py-4">Usuário</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Valor</th>
                      <th className="px-6 py-4">Método</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A3441]">
                    {allDeposits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-bold uppercase tracking-wider text-xs italic">Nenhum depósito encontrado.</td>
                      </tr>
                    ) : (
                      allDeposits.slice(0, 50).map((d) => (
                        <tr key={d.id} className="hover:bg-[#1A2235] transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-white">{d.user_name} ({d.user_nickname})</p>
                            <p className="text-xs text-gray-400">{d.user_email}</p>
                          </td>
                          <td className="px-6 py-4 text-gray-300 text-sm font-mono">
                            {new Date(d.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 font-bold text-white text-sm">
                            R$ {d.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-black uppercase text-[#32CD32]">
                              {d.payment_method === 'pix' ? 'PIX' : d.payment_method === 'credit_card' ? 'Cartão' : 'Manual'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${
                              d.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                              d.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                              'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }`}>
                              {d.status === 'approved' ? 'Aprovado' : d.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === 'financial' && (() => {
        const totalAdminFee = financials.reduce((acc, f) => acc + (f.admin_fee_collected || 0), 0);
        const totalWithdrawals = financialDetails.withdrawalsHistory.reduce((acc: number, w: any) => acc + w.amount, 0);
        const caixa = totalAdminFee - totalWithdrawals;

        const handleDownloadProfitPDF = async () => {
          try {
            const { jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const doc = new jsPDF();

            // Background header panel
            doc.setFillColor(18, 24, 43);
            doc.rect(0, 0, doc.internal.pageSize.width, 35, 'F');

            // Document branding
            doc.setTextColor(255, 255, 255);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(16);
            doc.text("BOLAO10 - RELATORIO DE DISTRIBUICAO DE LUCROS", 14, 20);

            doc.setFontSize(9);
            doc.setFont('Helvetica', 'normal');
            doc.text(`Data de Emissao: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);

            // Summary math
            const totalAdminSum = profitDistributions.reduce((acc, log) => acc + (log.total_admin_fee || 0), 0);
            const pauloSum = profitDistributions.reduce((acc, log) => acc + (log.paulo_share || 0), 0);
            const jairoSum = profitDistributions.reduce((acc, log) => acc + (log.jairo_share || 0), 0);
            const igorSum = profitDistributions.reduce((acc, log) => acc + (log.igor_share || 0), 0);

            // Subtitle metadata
            doc.setTextColor(30, 41, 59);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(12);
            doc.text("Resumo de Distribuicao de Lucros por Socio:", 14, 48);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`- Paulo Rezende (50%): R$ ${pauloSum.toFixed(2)}`, 14, 55);
            doc.text(`- Jairo Lourenco (25%): R$ ${jairoSum.toFixed(2)}`, 14, 61);
            doc.text(`- Igor (25%): R$ ${igorSum.toFixed(2)}`, 14, 67);
            doc.text(`- Total Taxa Adm Acumulada (20%): R$ ${totalAdminSum.toFixed(2)}`, 110, 55);

            // Divider Rule Line
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 73, doc.internal.pageSize.width - 14, 73);

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(12);
            doc.text("Historico Analitico das Rodadas e Splits:", 14, 82);

            // Build analytical table body
            const tableHeaders = [
              ["ID", "Rodada", "Finalizacao", "Receita Total", "Taxa Admin (20%)", "Paulo (50%)", "Jairo (25%)", "Igor (25%)"]
            ];

            const tableBody = profitDistributions.map((log: any) => {
              const totalCollected = log.total_admin_fee ? (log.total_admin_fee / 0.20) : 0.00;
              return [
                log.id || `PD-${log.round_id}`,
                `Rodada #${log.round_number}`,
                new Date(log.created_at).toLocaleDateString('pt-BR'),
                `R$ ${totalCollected.toFixed(2)}`,
                `R$ ${Number(log.total_admin_fee || 0).toFixed(2)}`,
                `R$ ${Number(log.paulo_share || 0).toFixed(2)}`,
                `R$ ${Number(log.jairo_share || 0).toFixed(2)}`,
                `R$ ${Number(log.igor_share || 0).toFixed(2)}`
              ];
            });

            autoTable(doc, {
              startY: 88,
              head: tableHeaders,
              body: tableBody,
              theme: 'striped',
              headStyles: {
                fillColor: [26, 34, 53],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
              },
              columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 25 },
                2: { cellWidth: 25 },
                3: { cellWidth: 32 },
                4: { cellWidth: 30 },
                5: { cellWidth: 20 },
                6: { cellWidth: 20 },
                7: { cellWidth: 20 }
              },
              styles: {
                fontSize: 8,
                cellPadding: 3
              }
            });

            doc.save(`bolao10-historico-lucros-${new Date().toISOString().slice(0, 10)}.pdf`);
          } catch (pdfErr) {
            console.error("Failed to generate PDF:", pdfErr);
            alert("Erro ao exportar PDF. Consulte os logs.");
          }
        };

        return (
          <div className="space-y-8 text-white">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] border-l-4 border-l-blue-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex justify-between items-center text-white">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Total Arrecadação</p>
                  <p className="text-2xl font-black text-blue-400">R$ {financials.reduce((acc, f) => acc + (f.total_collected || 0), 0).toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#1A2235] text-blue-400 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] border-l-4 border-l-[#32CD32] shadow-[0_0_15px_rgba(0,0,0,0.5)] flex justify-between items-center text-white">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Valor Distribuído (75%)</p>
                  <p className="text-2xl font-black text-[#32CD32]">R$ {financials.reduce((acc, f) => acc + (f.winners_prize || 0), 0).toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#1A2235] text-[#32CD32] rounded-full flex items-center justify-center">
                  <Gift className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] border-l-4 border-l-gray-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex justify-between items-center text-white">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Taxa Admin (20%)</p>
                  <p className="text-2xl font-black text-gray-300">R$ {totalAdminFee.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#1A2235] text-gray-400 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] border-l-4 border-l-purple-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex justify-between items-center text-white">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Bônus Acumulado</p>
                  <p className="text-2xl font-black text-purple-400">R$ {financialDetails.jackpotPool.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#1A2235] text-purple-400 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Sociedade & Split Section */}
            <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="p-6 border-b border-[#2A3441] bg-[#1A2235] flex justify-between items-center">
                <h3 className="font-black uppercase italic tracking-wider text-orange-400 flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-400 animate-pulse" />
                  SOCIEDADE & SPLIT
                </h3>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-gray-400 font-medium mb-6 leading-relaxed">
                  Divisão automática e em tempo real sobre a Taxa de Administração de 20% recolhida no momento do fechamento bi-semanal. Os fundos são transferidos de forma imediata à carteira virtual de cada sócio.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Paulo Rezende Card */}
                  <div className="bg-[#1A2235]/60 border border-[#2A3441] rounded-2xl p-5 flex flex-col justify-between hover:border-orange-500/40 transition-all duration-300 relative overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div>
                      <span className="text-xs font-black text-orange-400 uppercase tracking-widest bg-orange-500/10 px-2 py-1 rounded-md">Paulo Rezende</span>
                      <h4 className="text-3xl font-black text-white mt-3 italic">50% <span className="text-xs text-gray-400 not-italic font-medium">do split</span></h4>
                    </div>
                    <div className="mt-4 pt-4 border-t border-[#2A3441]">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Total Recebido</span>
                      <span className="text-lg font-black text-[#32CD32] block">R$ {profitDistributions.reduce((acc, log) => acc + (log.paulo_share || 0), 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Jairo Lourenço Card */}
                  <div className="bg-[#1A2235]/60 border border-[#2A3441] rounded-2xl p-5 flex flex-col justify-between hover:border-orange-500/40 transition-all duration-300 relative overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div>
                      <span className="text-xs font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-md">Jairo Lourenço</span>
                      <h4 className="text-3xl font-black text-white mt-3 italic">25% <span className="text-xs text-gray-400 not-italic font-medium">do split</span></h4>
                    </div>
                    <div className="mt-4 pt-4 border-t border-[#2A3441]">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Total Recebido</span>
                      <span className="text-lg font-black text-[#32CD32] block">R$ {profitDistributions.reduce((acc, log) => acc + (log.jairo_share || 0), 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Igor Card */}
                  <div className="bg-[#1A2235]/60 border border-[#2A3441] rounded-2xl p-5 flex flex-col justify-between hover:border-orange-500/40 transition-all duration-300 relative overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div>
                      <span className="text-xs font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 px-2 py-1 rounded-md">Igor</span>
                      <h4 className="text-3xl font-black text-white mt-3 italic">25% <span className="text-xs text-gray-400 not-italic font-medium">do split</span></h4>
                    </div>
                    <div className="mt-4 pt-4 border-t border-[#2A3441]">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Total Recebido</span>
                      <span className="text-lg font-black text-[#32CD32] block">R$ {profitDistributions.reduce((acc, log) => acc + (log.igor_share || 0), 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-start">
                  <button
                    onClick={handleDownloadProfitPDF}
                    className="flex items-center gap-2 bg-transparent hover:bg-white/10 text-white font-black uppercase tracking-wider text-xs py-3 px-6 rounded-xl border border-gray-500/60 hover:border-white transition-all duration-300 shadow-md cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                    Baixar Histórico de Lucros (PDF)
                  </button>
                </div>
              </div>
            </div>

            {/* Jackpot Injection Form */}
            <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="p-6 border-b border-[#2A3441] bg-[#1A2235] flex justify-between items-center">
                <h3 className="font-black uppercase italic tracking-wider text-[#32CD32] flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-400" />
                  Injetar Patrocínio no Bônus (Jackpot)
                </h3>
                {isAdmin && (
                  <button 
                    onClick={() => setShowJackpotForm(!showJackpotForm)}
                    className="text-xs bg-purple-600 border border-purple-500/30 text-white px-4 py-2 rounded-full hover:bg-purple-700 transition-all font-black uppercase tracking-wider shadow-md"
                  >
                    {showJackpotForm ? 'Cancelar' : '+ Injetar Bônus'}
                  </button>
                )}
              </div>
              
              {showJackpotForm && (
                <div className="p-6 bg-[#1A2235] border-b border-[#2A3441]">
                  <form onSubmit={handleInjectJackpot} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Valor do Patrocínio (R$)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={newJackpotInjection.amount}
                          onChange={(e) => setNewJackpotInjection({...newJackpotInjection, amount: e.target.value})}
                          className="w-full bg-[#0A0F1E] border border-[#2A3441] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-white font-bold"
                          placeholder="Ex: 100.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Descrição / Patrocinador</label>
                        <input 
                          type="text" 
                          required
                          value={newJackpotInjection.description}
                          onChange={(e) => setNewJackpotInjection({...newJackpotInjection, description: e.target.value})}
                          className="w-full bg-[#0A0F1E] border border-[#2A3441] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-white font-bold"
                          placeholder="Ex: Patrocínio NavalTech"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-purple-600 text-white font-black uppercase tracking-wider py-3 rounded-xl hover:bg-purple-700 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none text-xs">
                      <TrendingUp className="w-4 h-4" /> Confirmar Injeção de Bônus
                    </button>
                  </form>
                </div>
              )}
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Prizes History */}
            <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="p-6 border-b border-[#2A3441] bg-[#1A2235] flex justify-between items-center">
                <h3 className="font-black uppercase italic tracking-wider text-[#32CD32]">Prêmios Pagos</h3>
                <Gift className="w-5 h-5 text-green-400" />
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-[#12182B] shadow-sm z-10">
                    <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#2A3441]">
                      <th className="px-6 py-4">Rodada</th>
                      <th className="px-6 py-4">Usuário</th>
                      <th className="px-6 py-4">Valor</th>
                      <th className="px-6 py-4">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A3441]">
                    {financialDetails.prizesHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500 font-bold uppercase tracking-wider text-xs italic">Nenhum prêmio registrado ainda.</td>
                      </tr>
                    ) : (
                      financialDetails.prizesHistory.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#1A2235] transition-colors">
                          <td className="px-6 py-4 font-bold text-[#32CD32]">#{p.round_number}</td>
                          <td className="px-6 py-4 text-sm text-gray-200 font-semibold">{p.winner_name}</td>
                          <td className="px-6 py-4 text-sm font-bold text-[#32CD32]">R$ {p.amount.toFixed(2)}</td>
                          <td className="px-6 py-4 text-xs text-gray-400 font-mono">{formatDate(p.date, 'dd/MM/yy HH:mm')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Withdrawals */}
            <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[#2A3441] bg-[#1A2235] flex justify-between items-center">
                <h3 className="font-black uppercase italic tracking-wider text-white">Saques Administrativos</h3>
                {isAdmin && (
                  <button 
                    onClick={() => setShowWithdrawalForm(!showWithdrawalForm)}
                    className="text-xs bg-blue-600 border border-blue-500/30 text-white px-3 py-2 rounded-full hover:bg-blue-700 transition-all font-black uppercase tracking-wider cursor-pointer"
                  >
                    {showWithdrawalForm ? 'Cancelar' : '+ Novo Saque'}
                  </button>
                )}
              </div>
              
              {showWithdrawalForm && (
                <div className="p-6 bg-[#1A2235] border-b border-[#2A3441]">
                  <form onSubmit={handleAddWithdrawal} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Valor (R$)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={newWithdrawal.amount}
                          onChange={(e) => setNewWithdrawal({...newWithdrawal, amount: e.target.value})}
                          className="w-full bg-[#0A0F1E] border border-[#2A3441] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white font-bold"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Motivo / Descrição</label>
                        <input 
                          type="text" 
                          required
                          value={newWithdrawal.reason}
                          onChange={(e) => setNewWithdrawal({...newWithdrawal, reason: e.target.value})}
                          className="w-full bg-[#0A0F1E] border border-[#2A3441] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white font-bold"
                          placeholder="Ex: Pagamento servidor"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-[#32CD32] uppercase font-black tracking-wider text-black text-xs py-3 rounded-xl hover:bg-green-400 transition-colors shadow-md border-none cursor-pointer">
                      Confirmar Saque
                    </button>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto flex-1 max-h-[400px]">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-[#12182B] shadow-sm z-10">
                    <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#2A3441]">
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Motivo</th>
                      <th className="px-6 py-4">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A3441]">
                    {financialDetails.withdrawalsHistory.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500 font-bold uppercase tracking-wider text-xs italic">Nenhum saque registrado ainda.</td>
                      </tr>
                    ) : (
                      financialDetails.withdrawalsHistory.map((w: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#1A2235] transition-colors">
                          <td className="px-6 py-4 text-xs text-gray-400 font-mono">{formatDate(w.date, 'dd/MM/yy HH:mm')}</td>
                          <td className="px-6 py-4 text-sm text-gray-200 font-semibold">{w.reason}</td>
                          <td className="px-6 py-4 text-sm font-bold text-red-400">- R$ {w.amount.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-6 border-b border-[#2A3441] bg-[#1A2235]">
              <h3 className="font-black uppercase italic tracking-wider text-white">Histórico por Rodada</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#2A3441]">
                    <th className="px-6 py-4">Rodada</th>
                    <th className="px-6 py-4">Arrecadação (R$)</th>
                    <th className="px-6 py-4">Distribuído (75%)</th>
                    <th className="px-6 py-4">Taxa Admin (20%)</th>
                    <th className="px-6 py-4">Bônus (5%)</th>
                    <th className="px-6 py-4">Vencedores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3441]">
                  {financials.map((f) => (
                    <tr key={f.id} className="hover:bg-[#1A2235] transition-colors">
                      <td className="px-6 py-4 font-bold text-[#32CD32]">#{f.number}</td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-400 font-mono">R$ {f.total_collected?.toFixed(2) || '0.00'}</td>
                      <td className="px-6 py-4 text-sm text-[#32CD32] font-bold font-mono">R$ {f.winners_prize?.toFixed(2) || '0.00'}</td>
                      <td className="px-6 py-4 text-sm text-gray-300 font-bold font-mono">R$ {f.admin_fee_collected?.toFixed(2) || '0.00'}</td>
                      <td className="px-6 py-4 text-sm text-purple-400 font-bold font-mono">R$ {f.jackpot_contribution?.toFixed(2) || '0.00'}</td>
                      <td className="px-6 py-4 text-xs text-gray-400 max-w-[200px] truncate font-semibold" title={f.winners_names}>{f.winners_names || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      })()}

      {activeTab === 'history' && (
        <div className="bg-[#12182B] rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden text-white">
          <div className="p-6 border-b border-[#2A3441] bg-[#1A2235] flex justify-between items-center">
            <h3 className="font-black uppercase italic tracking-wider text-white">Histórico Completo de Rodadas</h3>
            <History className="w-5 h-5 text-[#32CD32]" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#2A3441]">
                  <th className="px-6 py-4">Rodada</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Início</th>
                  <th className="px-6 py-4">Arrecadação</th>
                  <th className="px-6 py-4">Prêmio Pago</th>
                  <th className="px-6 py-4">Vencedores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3441]">
                {roundHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-bold uppercase tracking-wider text-xs italic">Nenhuma rodada encontrada.</td>
                  </tr>
                ) : (
                  roundHistory.map((r) => (
                    <tr key={r.id} className="hover:bg-[#1A2235] transition-colors">
                      <td className="px-6 py-4 font-bold text-white">#{r.number}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-black uppercase border ${r.status === 'open' ? 'bg-[#32CD32]/10 text-[#32CD32] border-[#32CD32]/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                          {r.status === 'open' ? 'Aberta' : 'Finalizada'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 font-mono">
                        {formatDate(r.start_time, 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-400 font-mono">
                        R$ {r.total_collected?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[#32CD32] font-mono">
                        R$ {r.winners_prize?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 max-w-[300px] truncate font-semibold" title={r.winners_names}>
                        {r.winners_names || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-[#02050A] bg-opacity-80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
          <div className="bg-[#12182B] border border-[#2A3441] rounded-3xl p-8 max-w-md w-full text-white shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            <h3 className="text-xl font-black uppercase italic tracking-wider text-[#32CD32] mb-6">Editar Usuário</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Nome</label>
                <input 
                  type="text" 
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-[#2A3441] bg-[#0A0F1E] text-white focus:ring-2 focus:ring-[#32CD32] outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Nickname</label>
                <input 
                  type="text" 
                  value={editingUser.nickname}
                  onChange={(e) => setEditingUser({...editingUser, nickname: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-[#2A3441] bg-[#0A0F1E] text-white focus:ring-2 focus:ring-[#32CD32] outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Telefone</label>
                <input 
                  type="tel" 
                  value={editingUser.phone || ''}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 11) value = value.slice(0, 11);
                    if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                    if (value.length > 10) value = `${value.slice(0, 10)}-${value.slice(10)}`;
                    setEditingUser({...editingUser, phone: value});
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-[#2A3441] bg-[#0A0F1E] text-white focus:ring-2 focus:ring-[#32CD32] outline-none font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Role</label>
                <select 
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-[#2A3441] bg-[#0A0F1E] text-white focus:ring-2 focus:ring-[#32CD32] outline-none font-bold cursor-pointer"
                >
                  <option value="user" className="bg-[#12182B]">User</option>
                  <option value="admin" className="bg-[#12182B]">Admin</option>
                  <option value="auditor" className="bg-[#12182B]">Auditor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Senha</label>
                <input 
                  type="text" 
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-[#2A3441] bg-[#0A0F1E] text-white focus:ring-2 focus:ring-[#32CD32] outline-none font-bold"
                  placeholder="Senha do usuário"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-[#1A2235] hover:bg-[#2A3441] transition-colors rounded-xl border border-[#2A3441] text-xs font-black uppercase tracking-wider cursor-pointer text-white">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-[#32CD32] hover:bg-green-400 transition-colors text-black rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Deposit Modal */}
      {showManualDepositModal && (
        <div className="fixed inset-0 bg-[#02050A] bg-opacity-80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
          <div className="bg-[#12182B] border border-[#2A3441] rounded-3xl p-8 max-w-md w-full text-white shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            <h3 className="text-xl font-black uppercase italic tracking-wider text-[#32CD32] mb-6 flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-[#32CD32]" />
              Depósito Manual
            </h3>
            <form onSubmit={handleManualDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={manualDepositForm.amount}
                  onChange={(e) => setManualDepositForm({...manualDepositForm, amount: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-[#2A3441] bg-[#0A0F1E] text-white focus:ring-2 focus:ring-[#32CD32] outline-none font-bold"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Motivo / Descrição</label>
                <input 
                  type="text" 
                  required
                  value={manualDepositForm.description}
                  onChange={(e) => setManualDepositForm({...manualDepositForm, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-[#2A3441] bg-[#0A0F1E] text-white focus:ring-2 focus:ring-[#32CD32] outline-none font-bold"
                  placeholder="Ex: Pagamento via PIX direto"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowManualDepositModal(false)} 
                  className="flex-1 py-3 bg-[#1A2235] hover:bg-gray-800 transition-colors rounded-xl text-xs font-black uppercase tracking-wider text-white border border-[#2A3441] cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-[#32CD32] text-black rounded-xl font-black text-xs uppercase tracking-wider hover:bg-green-400 transition-colors shadow-md cursor-pointer border-none"
                >
                  Confirmar Depósito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Withdrawal Modal */}
      {showManualWithdrawModal && (
        <div className="fixed inset-0 bg-[#02050A] bg-opacity-80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
          <div className="bg-[#12182B] border border-[#2A3441] rounded-[32px] p-8 max-w-md w-full shadow-[0_0_30px_rgba(0,0,0,0.8)] text-white">
            <div className="flex items-center gap-2 mb-2">
              <MinusCircle className="w-6 h-6 text-red-500" />
              <h3 className="text-xl font-black uppercase italic tracking-wider text-white">Retirada Manual</h3>
            </div>
            <p className="text-xs text-red-400 mb-6 font-semibold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              Atenção: O valor inserido será subtraído do saldo disponível do usuário.
            </p>
            <form onSubmit={handleManualWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={manualWithdrawForm.amount}
                  onChange={(e) => setManualWithdrawForm({...manualWithdrawForm, amount: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-[#2A3441] bg-[#0A0F1E] text-white focus:ring-2 focus:ring-red-500 outline-none font-bold placeholder-gray-600"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Motivo / Descrição</label>
                <input 
                  type="text" 
                  required
                  value={manualWithdrawForm.description}
                  onChange={(e) => setManualWithdrawForm({...manualWithdrawForm, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-[#2A3441] bg-[#0A0F1E] text-white focus:ring-2 focus:ring-red-500 outline-none font-bold placeholder-gray-600"
                  placeholder="Ex: Correção de erro / Estorno"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowManualWithdrawModal(false)} 
                  className="flex-1 py-3 bg-[#1A2235] border border-[#2A3441] text-white rounded-xl hover:bg-gray-800 transition-colors text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-red-700 transition-colors shadow-md cursor-pointer border-none"
                >
                  Confirmar Retirada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wallet History Modal */}
      {viewingWalletHistory && (
        <div className="fixed inset-0 bg-[#02050A] bg-opacity-80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
          <div className="bg-[#12182B] border border-[#2A3441] rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] flex flex-col text-white shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-wider text-[#32CD32] flex items-center gap-2">
                  <History className="w-6 h-6 text-blue-400" />
                  Extrato de Depósitos
                </h3>
                <p className="text-xs text-gray-400 font-semibold">{viewingWalletHistory.user.name} ({viewingWalletHistory.user.email})</p>
              </div>
              <button 
                onClick={() => setViewingWalletHistory(null)}
                className="p-2 bg-[#1A2235] hover:bg-gray-800 text-white border border-[#2A3441] rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto pr-2">
              {viewingWalletHistory.deposits.length === 0 ? (
                <div className="py-12 text-center text-gray-500 font-bold uppercase tracking-wider text-xs italic">
                  Nenhum depósito registrado para este usuário.
                </div>
              ) : (
                <div className="space-y-3">
                  {viewingWalletHistory.deposits.map((d: any) => (
                    <div key={d.id} className="bg-[#1A2235] p-4 rounded-2xl border border-[#2A3441] flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          d.status === 'approved' ? 'bg-[#32CD32]/10 text-[#32CD32]' :
                          d.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                          'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {d.status === 'approved' ? <CheckCircle className="w-5 h-5" /> : 
                           d.status === 'rejected' ? <XCircle className="w-5 h-5" /> : 
                           <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-black text-white font-mono">R$ {d.amount.toFixed(2)}</p>
                          <p className="text-[11px] text-gray-400 font-medium">{formatDate(d.created_at, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                          d.status === 'approved' ? 'bg-[#32CD32]/10 text-[#32CD32] border-[#32CD32]/20' :
                          d.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                        }`}>
                          {d.status === 'approved' ? 'Aprovado' : d.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                        </span>
                        {d.proof_url && (
                          <button 
                            onClick={() => setViewingProof(d.proof_url)}
                            className="block mt-2 text-[10px] text-blue-400 hover:text-blue-300 font-black uppercase tracking-wider cursor-pointer bg-none border-none outline-none text-right ml-auto"
                          >
                            Ver Comprovante
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-[#2A3441] flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Saldo Atual</p>
                <p className="text-xl font-bold text-[#32CD32] font-mono">R$ {viewingWalletHistory.balance.toFixed(2)}</p>
              </div>
              <button 
                onClick={() => {
                  setManualDepositForm({ ...manualDepositForm, userId: viewingWalletHistory.user.id });
                  setViewingWalletHistory(null);
                  setShowManualDepositModal(true);
                }}
                className="bg-[#32CD32] text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-green-400 transition-all shadow-md flex items-center gap-2 cursor-pointer border-none"
              >
                <PlusCircle className="w-5 h-5" />
                Novo Depósito
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {viewingProof && (
          <div className="fixed inset-0 bg-[#02050A] bg-opacity-80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              key="proof-modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#12182B] border border-[#2A3441] p-6 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-auto relative text-white"
            >
              <button 
                onClick={() => setViewingProof(null)}
                className="absolute top-4 right-4 bg-[#1A2235] hover:bg-gray-800 text-white p-2 rounded-full border border-[#2A3441] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h4 className="text-lg font-black uppercase italic tracking-wider text-[#32CD32] mb-4">Comprovante de Pagamento</h4>
              {viewingProof.toLowerCase().endsWith('.pdf') ? (
                <iframe src={`/${viewingProof}`} className="w-full h-[70vh] rounded-xl border border-[#2A3441]" />
              ) : (
                <img src={`/${viewingProof}`} alt="Comprovante" className="w-full rounded-xl border border-[#2A3441]" />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TransparencyPage = () => {
  const { token, isAdmin } = useAuth();
  const [rounds, setRounds] = useState<any[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [round, setRound] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = async () => {
    if (!selectedRoundId) return;
    setLoading(true);
    
    // Fetch round details first to check status
    const roundRes = await fetch(`/api/rounds/${selectedRoundId}`);
    const roundData = await safeJson(roundRes);
    setRound(roundData);

    // Check access
    const accessRes = await fetch(`/api/rounds/${selectedRoundId}/check-prediction`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const accessData = await safeJson(accessRes);
    
    // Logic for transparency access
    // 1. Admin always has access
    // 2. If round betting is still open (status is open and start_time not passed), block for non-admins
    // 3. Otherwise, check if user has a validated prediction
    const isBettingClosed = roundData && (roundData.status !== 'open' || (roundData.start_time && new Date() > (parseDate(roundData.start_time) || new Date(0))));
    let userHasAccess = accessData?.hasPrediction || isAdmin;
    if (!isBettingClosed && !isAdmin) {
      userHasAccess = false;
    }
    
    setHasAccess(userHasAccess);

    if (userHasAccess) {
      const transRes = await fetch(`/api/rounds/${selectedRoundId}/transparency`);
      if (transRes.ok) {
        const transData = await safeJson(transRes);
        setPredictions(transData || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchRounds = async () => {
      const res = await fetch('/api/rounds');
      const data = await res.json();
      setRounds(data);
      if (data.length > 0) {
        setSelectedRoundId(data[0].id.toString());
      }
    };
    fetchRounds();
  }, []);

  useEffect(() => {
    fetchData();
    
    // Auto refresh every 30 seconds if round is active
    let interval: any;
    if (round?.status === 'in_progress' || round?.status === 'closed') {
      interval = setInterval(fetchData, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedRoundId, token, rounds, isAdmin, round?.status]);

  const handleDeletePrediction = async (id: number) => {
    if (!confirm('Tem certeza que deseja EXCLUIR este palpite? Esta ação é irreversível.')) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/predictions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Palpite excluído com sucesso!');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao excluir palpite');
      }
    } catch (err) {
      toast.error('Erro na conexão');
    } finally {
      setDeletingId(null);
    }
  };

  const downloadPDF = () => {
    if (!hasAccess) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text(`BOLÃO10 - Transparência Rodada #${round?.number || ''}`, 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Data de Início: ${formatDate(round?.start_time, 'dd/MM/yyyy HH:mm')}`, 14, 30);
    doc.text(`Status: ${round?.status === 'open' ? 'Aberta' : round?.status === 'finished' ? 'Finalizada' : 'Fechada'}`, 14, 35);
    
    if (round?.status === 'finished') {
      doc.text(`Vencedor(es) Rodada (75%): ${round.winners_names || 'Ninguém'}`, 14, 45);
      doc.text(`Prêmio Rodada Pago: R$ ${round.winners_prize?.toFixed(2) || '0.00'}`, 14, 50);
      
      if (round.jackpot_winners_names) {
        doc.text(`Vencedor(es) Bônus 10: ${round.jackpot_winners_names}`, 14, 60);
        doc.text(`Bônus 10 Pago: R$ ${round.jackpot_prize_paid?.toFixed(2) || '0.00'}`, 14, 65);
      }
    }

    // Games Table
    doc.setFontSize(14);
    doc.text('Lista de Jogos', 14, 65);
    // Note: We might need to fetch games for the selected round if not in 'round' object
    // For now assuming we have them or can fetch them
    const gamesData = round?.games?.map((g: any, i: number) => [
      `Jogo ${i + 1}`,
      `${g.home_team} vs ${g.away_team}`,
      g.result || 'Pendente'
    ]) || [];

    autoTable(doc, {
      head: [['#', 'Confronto', 'Resultado']],
      body: gamesData,
      startY: 70,
      theme: 'grid',
      headStyles: { fillColor: [10, 45, 100] }
    });

    // Predictions Table
    const finalY = (doc as any).lastAutoTable.finalY || 70;
    doc.setFontSize(14);
    doc.text('Palpites dos Usuários', 14, finalY + 15);

    const tableData = predictions.map(p => [
      p.user_name,
      p.score,
      (p.items || []).map((item: any) => item.guess).join(' | ')
    ]);

    autoTable(doc, {
      head: [['Usuário', 'Pontos', 'Palpites (J1-J10)']],
      body: tableData,
      startY: finalY + 20,
      theme: 'striped'
    });

    doc.save(`bolao10-transparencia-rodada-${round?.number || '?'}.pdf`);
  };

  if (loading && rounds.length === 0) return <div className="p-8 font-black text-[#32CD32] uppercase tracking-widest text-2xl animate-pulse text-center">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-2xl flex items-center justify-center text-[#FF6B00]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-wider">Transparência</h2>
          </div>
          <div className="mt-4 flex items-center gap-3 bg-[#0A0F1E] p-3 rounded-2xl border border-[#2A3441] w-fit">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">Selecione a Rodada:</p>
            <select 
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="bg-[#1A2235] border border-[#2A3441] text-[#32CD32] rounded-xl px-4 py-2 text-sm font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#32CD32]"
            >
              <option value="" disabled>Selecione...</option>
              {rounds.map(r => (
                <option key={r.id} value={r.id}>Rodada #{r.number}</option>
              ))}
            </select>
          </div>
        </div>
        {hasAccess && (
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <button 
              onClick={downloadPDF}
              className="flex items-center bg-[#1A2235] text-white border border-[#2A3441] px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-[#2A3441] transition-all hover:scale-105"
            >
              <Download className="w-4 h-4 mr-3 text-[#32CD32]" /> Baixar PDF
            </button>
          </div>
        )}
      </div>

      {!hasAccess ? (
        <div className="bg-[#12182B] p-12 rounded-[40px] border border-dashed border-[#2A3441] text-center shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="w-20 h-20 bg-[#1A2235] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#2A3441]">
            <ShieldCheck className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-wider">Acesso Restrito</h3>
          <p className="text-gray-400 font-bold uppercase tracking-wider max-w-md mx-auto text-sm leading-relaxed">
            {(!round || (round.status === 'open' && round.start_time && new Date() <= (parseDate(round.start_time) || new Date(0)))) && !isAdmin
              ? "A transparência só será liberada após o fechamento da rodada (fim das apostas)."
              : "Você só pode visualizar a transparência de rodadas em que possui palpites validados."}
          </p>
        </div>
      ) : (
        <>
          {round?.status === 'finished' && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-[#32CD32]/10 border border-[#32CD32]/30 rounded-3xl">
                <h3 className="text-lg font-black text-[#32CD32] mb-2 uppercase italic tracking-wider">Prêmio da Rodada (75%)</h3>
                <p className="text-gray-300 font-medium">
                  Vencedor(es): <span className="font-extrabold text-white">{round.winners_names || 'Ninguém'}</span>
                </p>
                <p className="text-gray-300 font-medium mt-1">
                  Prêmio Pago: <span className="font-black text-[#32CD32]">R$ {round.winners_prize?.toFixed(2) || '0.00'}</span>
                </p>
              </div>
              
              {round.jackpot_winners_names && (
                <div className="p-6 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-3xl">
                  <h3 className="text-lg font-black text-[#FF6B00] mb-2 uppercase italic tracking-wider">Bônus 10 (Jackpot)</h3>
                  <p className="text-gray-300 font-medium">
                    Vencedor(es): <span className="font-extrabold text-white">{round.jackpot_winners_names}</span>
                  </p>
                  <p className="text-gray-300 font-medium mt-1">
                    Bônus Pago: <span className="font-black text-[#FF6B00]">R$ {round.jackpot_prize_paid?.toFixed(2) || '0.00'}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Lista de Jogos da Rodada */}
          {round && round.games && round.games.length > 0 && (
            <div className="mb-8 bg-[#12182B] rounded-2xl border border-[#2A3441] overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-[#0A0F1E] border-b border-[#2A3441]">
                    <tr>
                      <th className="px-6 py-3 font-black border-r border-[#2A3441]">#</th>
                      <th className="px-6 py-3 font-black border-r border-[#2A3441] text-center">Confronto</th>
                      <th className="px-6 py-3 font-black text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2235]">
                    {round.games.map((g: any, i: number) => (
                      <tr key={g.id} className="hover:bg-[#1A2235]/35 transition-all">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-bold uppercase tracking-wider text-xs border-r border-[#2A3441]/40">
                          Jogo {i + 1}
                        </td>
                        <td className="px-6 py-4 uppercase text-white border-r border-[#2A3441]/40">
                          <div className="flex items-center gap-2 max-w-md mx-auto justify-center">
                            <span className="font-black flex-1 text-right text-xs md:text-sm">{g.home_team}</span>
                            {getTeamCrestUrl(g.home_team) && (
                              <div className="w-5 h-5 rounded-full border border-[#2A3441]/50 bg-[#1A2235]/60 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                                <img src={getTeamCrestUrl(g.home_team)!} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              </div>
                            )}
                            <span className="text-gray-500 font-black mx-2 text-[10px] italic">VS</span>
                            {getTeamCrestUrl(g.away_team) && (
                              <div className="w-5 h-5 rounded-full border border-[#2A3441]/50 bg-[#1A2235]/60 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                                <img src={getTeamCrestUrl(g.away_team)!} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              </div>
                            )}
                            <span className="font-black flex-1 text-left text-xs md:text-sm">{g.away_team}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-[#32CD32] text-center text-sm md:text-base">
                          {g.result || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ranking Info */}
          <div className="mb-6 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Líder(es)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-500"></div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Ainda na Disputa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Sem Chances</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(() => {
              const sorted = [...predictions].sort((a, b) => (b.score || 0) - (a.score || 0));
              const maxScore = sorted[0]?.score || 0;
              const totalGames = round?.games?.length || 10;
              const finishedGames = round?.games?.filter((g: any) => g.result).length || 0;
              const remainingGames = totalGames - finishedGames;

              return sorted.map((p, index) => {
                const scoreVal = p.score || 0;
                let badgeColor = 'bg-[#1A2235] text-gray-400 border border-[#2A3441]';
                
                if (round?.status !== 'open') {
                  if (scoreVal === maxScore && maxScore > 0) {
                    badgeColor = 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]';
                  } else if (scoreVal + remainingGames >= maxScore) {
                    badgeColor = 'bg-[#1A2235] text-gray-300 border border-[#2A3441]';
                  } else {
                    badgeColor = 'bg-red-500/10 text-red-500 border border-red-500/20';
                  }
                }

                return (
                  <div key={p.id} className={`bg-[#12182B] p-6 rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.8)] ${scoreVal === maxScore && maxScore > 0 ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1A2235] border border-[#2A3441] flex items-center justify-center font-black text-white text-xs shrink-0">
                          {index + 1}º
                        </div>
                        <div className="flex flex-col">
                          <h4 className="font-extrabold text-white leading-tight text-sm truncate max-w-[120px]">{p.user_name}</h4>
                          <span className="text-[10px] text-gray-500 italic font-bold uppercase tracking-wider">@{p.user_nickname}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`${badgeColor} px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5`}>
                          {scoreVal === maxScore && maxScore > 0 && <Trophy className="w-3 h-3 text-black" />}
                          {scoreVal} Pontos
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeletePrediction(p.id)}
                            disabled={deletingId === p.id}
                            className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase tracking-widest flex items-center gap-1 transition-colors mt-1"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            {deletingId === p.id ? '...' : 'Excluir'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 bg-[#0A0F1E] p-3 rounded-2xl border border-[#1A2235]">
                      {(p.items || []).map((item: any, i: number) => {
                        const game = round?.games?.[i];
                        const isCorrect = game?.result && game.result === item.guess;
                        const isIncorrect = game?.result && game.result !== item.guess;

                        return (
                          <div key={i} className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-gray-500 mb-1">J{i+1}</span>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black border transition-all
                              ${isCorrect ? 'bg-[#32CD32] text-black border-[#32CD32] shadow-[0_0_10px_rgba(50,205,50,0.3)]' : 
                                isIncorrect ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                'bg-[#12182B] text-gray-400 border-[#2A3441]'}`}
                            >
                              {item.guess}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
            {predictions.length === 0 && (
              <div className="col-span-full py-20 text-center bg-[#12182B] rounded-3xl border border-dashed border-[#2A3441]">
                <ShieldCheck className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 font-extrabold uppercase tracking-wider text-sm">Nenhum palpite aprovado encontrado para esta rodada.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const AdminRoundsPage = () => {
  const { token, isAdmin } = useAuth();
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRound, setEditingRound] = useState<any>(null);
  const [partialResults, setPartialResults] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [newRound, setNewRound] = useState({
    number: '',
    startTime: '',
    entryValue: '10',
    isActive: false,
    games: Array(10).fill({ home: '', away: '' })
  });

  const fetchRounds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/rounds', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRounds(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, []);

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/rounds', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRound)
      });
      if (res.ok) {
        alert('Rodada criada com sucesso!');
        setShowCreateForm(false);
        setNewRound({
          number: '',
          startTime: '',
          entryValue: '10',
          isActive: false,
          games: Array(10).fill({ home: '', away: '' })
        });
        fetchRounds();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao criar rodada');
      }
    } catch (err) {
      alert('Erro na conexão');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePartialResults = async (roundId: number) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/rounds/${roundId}/partial-results`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ results: partialResults })
      });
      if (res.ok) {
        alert('Resultados parciais salvos e ranking atualizado!');
        setEditingRound(null);
        fetchRounds();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar resultados');
      }
    } catch (err) {
      alert('Erro na conexão');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateRound = async (roundId: number) => {
    if (!confirm('Deseja ativar esta rodada? Ela ficará visível e aberta para todos os usuários.')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/rounds/${roundId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert('Rodada ativada com sucesso!');
        setEditingRound(null);
        fetchRounds();
      } else {
        alert('Erro ao ativar rodada');
      }
    } catch (err) {
      alert('Erro na conexão');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishRound = async (roundId: number, distributeJackpot: boolean) => {
    if (!confirm('Tem certeza que deseja FINALIZAR esta rodada? Esta ação é irreversível e calculará todos os prêmios.')) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/rounds/${roundId}/finish`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ results: partialResults, distributeJackpot })
      });
      if (res.ok) {
        alert('Rodada finalizada com sucesso!');
        setEditingRound(null);
        fetchRounds();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao finalizar rodada');
      }
    } catch (err) {
      alert('Erro na conexão');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && rounds.length === 0) return <div className="p-8 text-white font-black uppercase text-sm animate-pulse">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-wider text-white">Gerenciar Rodadas</h1>
          <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">Crie, edite e finalize as rodadas do bolão.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-[#32CD32] text-black px-6 py-3 rounded-xl font-black uppercase italic tracking-wider hover:scale-105 transition-all flex items-center shadow-[0_0_15px_rgba(50,205,50,0.4)]"
          >
            {showCreateForm ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
            {showCreateForm ? 'Cancelar' : 'Nova Rodada'}
          </button>
        )}
      </div>

      {showCreateForm && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#12182B] p-8 rounded-[32px] border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] mb-8 text-white"
        >
          <h2 className="text-xl font-black uppercase italic tracking-wider text-[#32CD32] mb-6">Configurar Nova Rodada</h2>
          <form onSubmit={handleCreateRound} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Número da Rodada</label>
                <input 
                  type="number" 
                  required 
                  value={newRound.number}
                  onChange={(e) => setNewRound({...newRound, number: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-600 font-bold"
                  placeholder="Ex: 15"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Limite para Palpites</label>
                <input 
                  type="datetime-local" 
                  required 
                  value={newRound.startTime}
                  onChange={(e) => setNewRound({...newRound, startTime: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-600 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Valor de Entrada (R$)</label>
                <input 
                  type="number" 
                  required 
                  value={newRound.entryValue}
                  onChange={(e) => setNewRound({...newRound, entryValue: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-[#0A0F1E] border border-[#2A3441] text-white focus:ring-2 focus:ring-[#32CD32] focus:border-transparent outline-none transition-all placeholder-gray-600 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Visibilidade da Rodada</label>
                <div className="flex items-center gap-3 bg-[#0A0F1E] p-3 h-[50px] rounded-xl border border-[#2A3441] mt-[1px]">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newRound.isActive}
                    onChange={(e) => setNewRound({...newRound, isActive: e.target.checked})}
                    className="w-5 h-5 rounded text-[#32CD32] focus:ring-[#32CD32] bg-[#12182B] border-[#2A3441]"
                  />
                  <label htmlFor="isActive" className="text-xs font-black text-gray-400 uppercase tracking-widest cursor-pointer select-none">
                    Ativar para Usuários
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Jogos da Rodada (10)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newRound.games.map((g, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#0A0F1E] rounded-2xl border border-[#2A3441]">
                    <span className="text-xs font-black text-gray-400 w-6">{i + 1}</span>
                    <input 
                      placeholder="Time Mandante" 
                      required 
                      value={g.home}
                      onChange={(e) => {
                        const games = [...newRound.games];
                        games[i] = { ...games[i], home: e.target.value };
                        setNewRound({ ...newRound, games });
                      }}
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#12182B] border border-[#2A3441] text-white outline-none focus:border-[#32CD32] font-bold uppercase tracking-wider"
                    />
                    <span className="text-gray-400 font-bold">x</span>
                    <input 
                      placeholder="Time Visitante" 
                      required 
                      value={g.away}
                      onChange={(e) => {
                        const games = [...newRound.games];
                        games[i] = { ...games[i], away: e.target.value };
                        setNewRound({ ...newRound, games });
                      }}
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#12182B] border border-[#2A3441] text-white outline-none focus:border-[#32CD32] font-bold uppercase tracking-wider"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-[#32CD32] text-black py-4 rounded-xl font-black uppercase italic tracking-wider text-lg hover:scale-105 transition-all shadow-[0_0_15px_rgba(50,205,50,0.4)] disabled:opacity-50"
            >
              {submitting ? 'Criando...' : 'Criar Rodada e Abrir para Palpites'}
            </button>
          </form>
        </motion.div>
      )}

      <div className="space-y-6">
        {rounds.map((round) => (
          <div key={round.id} className="bg-[#12182B] rounded-[32px] border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden text-white">
            <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border ${round.status === 'open' ? 'bg-[#32CD32]/10 text-[#32CD32] border-[#32CD32]/30' : 'bg-[#1A2235] text-gray-400 border-[#2A3441]'}`}>
                  #{round.number}
                </div>
                <div>
                  <h3 className="font-extrabold uppercase italic tracking-wider text-white text-lg">Rodada {round.number}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {round.status === 'open' ? 'Aberta para palpites' : round.status === 'closed' ? 'Em andamento' : round.status === 'draft' ? 'Rascunho' : 'Finalizada'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button 
                    onClick={async () => {
                      if (editingRound?.id === round.id) {
                        setEditingRound(null);
                        return;
                      }
                      const res = await fetch(`/api/rounds/${round.id}`);
                      const data = await res.json();
                      setEditingRound(data);
                      const initialResults: any = {};
                      data.games.forEach((g: any) => {
                        if (g.result) initialResults[g.id] = g.result;
                      });
                      setPartialResults(initialResults);
                    }}
                    className="px-4 py-2 bg-[#1A2235] border border-[#2A3441] text-gray-300 hover:text-white hover:border-[#32CD32] rounded-xl text-sm font-black uppercase tracking-wider transition-all"
                  >
                    {editingRound?.id === round.id ? 'Fechar' : 'Gerenciar Resultados'}
                  </button>
                )}
                {round.status === 'open' && (
                  <span className="bg-[#32CD32]/10 text-[#32CD32] border border-[#32CD32]/30 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">Ativa</span>
                )}
                {round.status === 'draft' && (
                  <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">Rascunho</span>
                )}
              </div>
            </div>

            {editingRound?.id === round.id && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="px-6 pb-8 border-t border-[#2A3441] pt-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-black uppercase italic tracking-wider text-white mb-4 flex items-center text-sm md:text-base">
                      <Edit className="w-4 h-4 mr-2 text-[#32CD32]" /> Inserir Resultados
                    </h4>
                    <div className="space-y-3">
                      {editingRound.games.map((game: any) => (
                        <div key={game.id} className="flex items-center justify-between p-3 bg-[#0A0F1E] rounded-2xl border border-[#2A3441]">
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="text-sm font-black uppercase tracking-wider text-gray-200 truncate">{game.home_team} x {game.away_team}</p>
                          </div>
                          <div className="flex gap-1">
                            {['1', 'X', '2'].map(opt => (
                              <button
                                key={opt}
                                onClick={() => setPartialResults({...partialResults, [game.id]: opt})}
                                className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${partialResults[game.id] === opt ? 'bg-[#32CD32] text-black shadow-lg scale-105' : 'bg-[#12182B] text-gray-400 border border-[#2A3441] hover:border-gray-500 hover:text-white'}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between">
                    {isAdmin && (
                      <div>
                        <h4 className="font-black uppercase italic tracking-wider text-white mb-4 text-sm md:text-base">Ações da Rodada</h4>
                        <div className="space-y-4">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                          <p className="text-sm text-blue-300 font-bold uppercase tracking-wider mb-2">Resultados Parciais</p>
                          <p className="text-xs text-gray-400 mb-4 font-semibold">Salve os resultados dos jogos que já terminaram para atualizar o ranking parcial em tempo real.</p>
                          <button 
                            onClick={() => handleSavePartialResults(round.id)}
                            disabled={submitting}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase italic tracking-wider text-xs hover:scale-105 transition-all disabled:opacity-50"
                          >
                            Salvar Parciais e Ranking
                          </button>
                        </div>

                        {round.status === 'draft' && (
                          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                            <p className="text-sm text-yellow-300 font-bold uppercase tracking-wider mb-2">Ativar Rodada</p>
                            <p className="text-xs text-gray-400 mb-4 font-semibold">Torna a rodada visível para todos os usuários e permite a realização de palpites.</p>
                            <button 
                              onClick={() => handleActivateRound(round.id)}
                              disabled={submitting}
                              className="w-full bg-yellow-600 text-black py-3 rounded-xl font-black uppercase italic tracking-wider text-xs hover:scale-105 transition-all disabled:opacity-50"
                            >
                              Ativar Rodada
                            </button>
                          </div>
                        )}

                        {round.status !== 'finished' && (
                          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <p className="text-sm text-red-300 font-bold uppercase tracking-wider mb-2">Finalizar Rodada</p>
                            <p className="text-xs text-gray-400 mb-4 font-semibold">Encerra a rodada definitivamente, calcula os prêmios e distribui os saldos para os vencedores.</p>
                            
                            <div className="flex items-center gap-2 mb-4">
                              <input 
                                type="checkbox" 
                                id={`jackpot-${round.id}`}
                                className="w-4 h-4 rounded text-red-500 focus:ring-red-500 border-[#2A3441] bg-[#0A0F1E]"
                                onChange={(e) => (window as any).distributeJackpot = e.target.checked}
                              />
                              <label htmlFor={`jackpot-${round.id}`} className="text-xs font-black text-red-400 uppercase tracking-widest cursor-pointer select-none">Distribuir Bônus Acumulado</label>
                            </div>

                            <button 
                              onClick={() => handleFinishRound(round.id, (window as any).distributeJackpot)}
                              disabled={submitting}
                              className="w-full bg-red-600 text-white py-3 rounded-xl font-black uppercase italic tracking-wider text-xs hover:scale-105 transition-all disabled:opacity-50 shadow-md"
                            >
                              Finalizar e Pagar Prêmios
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                    <button 
                      onClick={() => setEditingRound(null)}
                      className="mt-8 text-gray-400 hover:text-white text-xs font-black uppercase tracking-wider transition-all hover:underline text-left"
                    >
                      Fechar Painel de Gerenciamento
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const Podium = ({ top3, roundStatus }: { top3: any[], roundStatus?: string }) => {
  if (!top3 || top3.length === 0) return null;

  // Reorder to 2, 1, 3 for podium look
  const podiumOrder = [];
  if (top3[1]) podiumOrder.push({ ...top3[1], pos: 2 });
  if (top3[0]) podiumOrder.push({ ...top3[0], pos: 1 });
  if (top3[2]) podiumOrder.push({ ...top3[2], pos: 3 });

  return (
    <div className="flex items-end justify-center gap-2 md:gap-6 mb-12 mt-8 px-2">
      {podiumOrder.map((item) => (
        <div key={item.id} className={`flex flex-col items-center transition-all duration-700 ${item.pos === 1 ? 'z-10 scale-110 md:scale-125' : 'z-0'}`}>
          <div className="mb-3 text-center px-1">
            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">
              {item.pos === 1 ? '🏆 Campeão' : item.pos === 2 ? '🥈 2º Lugar' : '🥉 3º Lugar'}
            </p>
            <p className="text-[10px] md:text-xs font-black text-white truncate max-w-[70px] md:max-w-[100px]">
              {item.user_name}
            </p>
          </div>
          
          <div className={`relative flex flex-col items-center justify-end rounded-t-[20px] md:rounded-t-[32px] shadow-xl border-x border-t border-white/20 ${
            item.pos === 1 
              ? 'w-24 md:w-32 h-32 md:h-40 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600' 
              : item.pos === 2 
                ? 'w-20 md:w-28 h-24 md:h-32 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-400' 
                : 'w-20 md:w-28 h-20 md:h-24 bg-gradient-to-b from-orange-300 via-orange-400 to-orange-500'
          }`}>
            <div className="absolute -top-4 md:-top-6 bg-[#1A2235] border border-[#2A3441] rounded-full p-2 md:p-3 shadow-xl">
              {item.pos === 1 ? <Trophy className="w-5 h-5 md:w-8 md:h-8 text-yellow-500" /> : 
               item.pos === 2 ? <Trophy className="w-4 h-4 md:w-6 md:h-6 text-gray-400" /> : 
               <Trophy className="w-4 h-4 md:w-6 md:h-6 text-orange-500" />}
            </div>
            
            <div className="pb-4 md:pb-6 text-center text-white">
              <p className="text-lg md:text-2xl font-black leading-none">{item.score}</p>
              <p className="text-[8px] md:text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">
                Pontos
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const RankingPage = () => {
  const { token, isAdmin } = useAuth();
  const [rounds, setRounds] = useState<any[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const fetchRounds = async () => {
      const res = await fetch('/api/rounds');
      const data = await res.json();
      setRounds(data);
      if (data.length > 0) {
        setSelectedRoundId(data[0].id.toString());
      }
    };
    fetchRounds();
  }, []);

  useEffect(() => {
    if (!selectedRoundId) return;
    const fetchData = async () => {
      setLoading(true);
      
      // Check access
      const accessRes = await fetch(`/api/rounds/${selectedRoundId}/check-prediction`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const accessData = await safeJson(accessRes);
      
      const roundToCheck = rounds.find(r => r.id.toString() === selectedRoundId);
      const isBettingClosed = roundToCheck && (roundToCheck.status !== 'open' || (roundToCheck.start_time && new Date() > (parseDate(roundToCheck.start_time) || new Date(0))));
      let userHasAccess = accessData?.hasPrediction || isAdmin;
      if (!isBettingClosed && !isAdmin) {
        userHasAccess = false;
      }

      setHasAccess(userHasAccess);

      if (userHasAccess) {
        const res = await fetch(`/api/rounds/${selectedRoundId}/transparency`);
        if (res.ok) {
          const data = await res.json();
          // Sort by score descending
          const sorted = data.sort((a: any, b: any) => b.score - a.score);
          setRanking(sorted);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedRoundId, token, isAdmin]);

  if (loading && rounds.length === 0) return <div className="p-8 font-black text-[#32CD32] uppercase tracking-widest text-2xl animate-pulse text-center">Carregando...</div>;

  const selectedRound = rounds.find(r => r.id.toString() === selectedRoundId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-8 gap-6 text-center md:text-left">
        <div className="w-full">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
            <div className="w-12 h-12 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-2xl flex items-center justify-center text-[#FF6B00]">
              <Trophy className="w-6 h-6" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-wider">Ranking</h2>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 bg-[#0A0F1E] p-4 rounded-3xl border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">Selecione a Rodada</p>
            <div className="flex flex-wrap justify-center gap-2">
              {rounds.slice(0, 5).map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoundId(r.id.toString())}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    selectedRoundId === r.id.toString()
                      ? 'bg-[#FF6B00] text-black shadow-[0_0_15px_rgba(255,107,0,0.4)] scale-105 border-transparent'
                      : 'bg-[#1A2235] text-gray-400 border border-[#2A3441] hover:text-white'
                  }`}
                >
                  #{r.number}
                </button>
              ))}
              {rounds.length > 5 && (
                <select
                  value={selectedRoundId}
                  onChange={(e) => setSelectedRoundId(e.target.value)}
                  className="bg-[#1A2235] border border-[#2A3441] text-[#32CD32] rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#32CD32]"
                >
                  <option value="" disabled>Outras...</option>
                  {rounds.slice(5).map(r => (
                    <option key={r.id} value={r.id}>Rodada #{r.number}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {!hasAccess ? (
        <div className="bg-[#12182B] p-12 rounded-[40px] border border-dashed border-[#2A3441] text-center shadow-[0_0_15px_rgba(0,0,0,0.5)] mt-8">
          <div className="w-20 h-20 bg-[#1A2235] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#2A3441]">
            <ShieldCheck className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-2xl font-black text-white italic uppercase tracking-wider mb-2">Acesso Restrito</h3>
          <p className="text-gray-400 font-bold uppercase tracking-wider max-w-md mx-auto text-sm md:text-base leading-relaxed">
            {(!selectedRound || (selectedRound.status === 'open' && selectedRound.start_time && new Date() <= (parseDate(selectedRound.start_time) || new Date(0)))) && !isAdmin
              ? "O ranking só será liberado após o fechamento da rodada (fim das apostas)."
              : "Você só pode visualizar o ranking de rodadas em que possui palpites validados."}
          </p>
        </div>
      ) : (
        <>
          {ranking.length > 0 && <Podium top3={ranking.slice(0, 3)} roundStatus={selectedRound?.status} />}

          <div className="bg-[#12182B] rounded-[32px] md:rounded-[40px] border border-[#2A3441] shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Header for Desktop */}
            <div className="hidden md:grid grid-cols-12 bg-[#0A0F1E] text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-[#2A3441] px-8 py-4">
              <div className="col-span-2">Posição</div>
              <div className="col-span-7">Participante</div>
              <div className="col-span-3 text-right">Pontuação</div>
            </div>

            <div className="divide-y divide-[#1A2235]">
              {ranking.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`group hover:bg-[#1A2235]/30 transition-all px-4 md:px-8 py-4 md:py-5 grid grid-cols-12 items-center gap-3 ${
                    index < 3 ? 'bg-[#32CD32]/[0.02]' : ''
                  }`}
                >
                  {/* Position */}
                  <div className="col-span-2 md:col-span-2">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-xs md:text-sm transition-transform group-hover:scale-110 ${
                      index === 0 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/35' : 
                      index === 1 ? 'bg-slate-400/10 text-slate-300 border border-slate-400/35' :
                      index === 2 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/35' : 
                      'bg-[#1A2235] text-gray-400 border border-[#2A3441]'
                    }`}>
                      {index + 1}º
                    </div>
                  </div>

                  {/* User Name */}
                  <div className="col-span-7 md:col-span-7">
                    <div className="flex flex-col">
                      <p className="font-extrabold text-white text-sm md:text-base truncate">
                        {item.user_name}
                      </p>
                      {index < 3 && (
                        <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                          {index === 0 ? '🥇 Líder da Rodada' : index === 1 ? '🥈 Vice-Líder' : '🥉 3º Colocado'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="col-span-3 md:col-span-3 text-right">
                    <div className="flex flex-col items-end">
                      <div className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-2xl font-black text-xs md:text-sm shadow-sm transition-all group-hover:translate-x-[-4px] ${
                        selectedRound?.status === 'finished' 
                          ? 'bg-[#32CD32] text-black shadow-[0_0_10px_rgba(50,205,50,0.3)]' 
                          : 'bg-[#1A2235] text-[#32CD32] border border-[#2A3441]'
                      }`}>
                        <span>{item.score || 0}</span>
                        <span className="text-[8px] md:text-[10px] opacity-70 uppercase">pts</span>
                      </div>
                      {selectedRound?.status !== 'finished' && (
                        <span className="text-[8px] md:text-[9px] font-black text-[#32CD32] opacity-80 uppercase mt-1 tracking-widest">Parcial</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {ranking.length === 0 && !loading && (
                <div className="px-8 py-20 text-center bg-[#12182B]">
                  <div className="w-16 h-16 bg-[#1A2235] border border-[#2A3441] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-400 font-extrabold uppercase tracking-wider text-sm">Nenhum resultado disponível para esta rodada.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const LuckyNumberPopup = ({ isOpen, onClose, numbers, userName }: { isOpen: boolean, onClose: () => void, numbers: string[], userName?: string }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[40px] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative scrollbar-hide"
          >
            {/* Header with Image Background or Gradient */}
            <div className="h-40 sm:h-48 bg-gradient-to-br from-primary to-blue-900 flex flex-col items-center justify-center text-center p-6 relative shrink-0">
              <div className="absolute top-4 right-4">
                <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <img 
                src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/Game_Stick.webp" 
                alt="Game Stick M15" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain mb-2 drop-shadow-lg"
                referrerPolicy="no-referrer"
              />
              <h3 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">Parabéns! No Jogo!</h3>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-10 text-center">
              <div className="mb-6 sm:mb-8">
                <h4 className="text-lg sm:text-xl font-bold text-primary mb-2">Olá, {userName || 'Amigo'}!</h4>
                <p className="text-sm sm:text-base text-gray-600 mb-6 leading-relaxed">
                  Seu palpite foi registrado com sucesso em nosso sistema! 🚀<br /><br />
                  Ficamos muito felizes em ter você conosco. Como forma de agradecimento, você acaba de receber seus <strong>Números da Sorte</strong> para o sorteio do <strong>GAME STICK M15</strong>!
                </p>
                
                <div className="flex flex-wrap justify-center gap-4">
                  {numbers.map((num, i) => (
                    <div 
                      key={i}
                      className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 min-w-[120px] shadow-sm animate-pulse"
                    >
                      <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">CUPOM</span>
                      <span className="text-3xl font-black text-primary tracking-tighter">{num}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-3 justify-center">
                  <Clock className="w-5 h-5 text-secondary" />
                  <span className="font-bold text-primary">Sorteio: 19 de Julho de 2026</span>
                </div>
                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider italic">
                  Dia da Final da Copa do Mundo FIFA 2026
                </p>
              </div>

              <button 
                onClick={onClose}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg hover:shadow-xl transition-all active:scale-[0.98]"
              >
                Continuar para minha Carteira
              </button>
              
              <p className="text-xs text-gray-400 mt-6">
                Você pode consultar seus números a qualquer momento no seu perfil.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- MAIN APP ---

const TermsPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100"
      >
        <h1 className="text-4xl font-bold text-primary mb-8">Termos de Uso e Regras – BOLÃO10</h1>
        
        <div className="prose prose-slate max-w-none space-y-8 text-gray-600 leading-relaxed">
          <p>
            Bem-vindo ao BOLÃO10. Esta é uma plataforma privada de entretenimento esportivo, criada para promover a interação e a competição saudável entre participantes. Ao utilizar nosso sistema, você concorda com as diretrizes descritas abaixo, que visam garantir a total transparência e justiça para todos os membros.
          </p>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">1. Dinâmica da Participação</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>A Rodada:</strong> O BOLÃO10 baseia-se em 10 partidas de futebol selecionadas do Campeonato Brasileiro.</li>
              <li><strong>O Palpite:</strong> Para cada partida, o usuário deve prognosticar um dos três resultados possíveis: Vitória do Time 1, Empate ou Vitória do Time 2.</li>
              <li><strong>Carteira Virtual:</strong> O sistema utiliza uma carteira virtual. Você deve depositar saldo em sua conta para poder realizar palpites.</li>
              <li><strong>Custo do Palpite:</strong> Cada palpite realizado debita automaticamente o valor da inscrição do seu saldo disponível na carteira.</li>
              <li><strong>Prazo:</strong> As apostas devem ser enviadas até o limite estipulado pelo sistema (geralmente 1 hora antes do início da primeira partida da rodada).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">2. Divisão da Arrecadação (Premiação)</h2>
            <p className="mb-4">A transparência é o nosso pilar. Todo o valor arrecadado em uma rodada é dividido estritamente da seguinte forma:</p>
            <ul className="list-disc pl-5 space-y-4">
              <li>
                <strong>75% – Prêmio da Rodada:</strong> Distribuído entre o(s) participante(s) que obtiver(em) o maior número de acertos na rodada. Em caso de empate entre dois ou mais participantes, o valor é dividido igualmente entre eles.
              </li>
              <li>
                <strong>20% – Taxa de Gestão:</strong> Destinado à manutenção, custos operacionais e administração da plataforma.
              </li>
              <li>
                <strong>5% – Bônus Acumulado:</strong> Destinado a um "Pote Acumulado".
                <ul className="list-circle pl-5 mt-2 space-y-1">
                  <li>Este bônus será pago integralmente ao usuário que acertar os 10 jogos (Gabarito).</li>
                  <li>Caso mais de uma pessoa acerte os 10 jogos, o bônus é dividido entre elas.</li>
                  <li>Caso ninguém acerte os 10 jogos, o valor de 5% permanece acumulado para a rodada seguinte, crescendo o pote até que alguém consiga o feito.</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">3. Carteira, Depósitos e Saques</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Depósitos:</strong> Os depósitos são processados via PagBank, oferecendo opções de PIX e Cartão de Crédito. O saldo é creditado automaticamente em sua carteira virtual assim que a confirmação for recebida pelo gateway.</li>
              <li><strong>Premiação:</strong> Os prêmios conquistados são creditados diretamente em sua carteira virtual após a finalização e auditoria da rodada.</li>
              <li><strong>Saques:</strong> Você pode solicitar o saque do seu saldo disponível a partir do valor mínimo estipulado. O processamento é realizado via PIX para a chave cadastrada em seu perfil.</li>
              <li><strong>Transparência:</strong> Garantimos a integridade do jogo. Após o início da rodada, os palpites de todos os participantes ficam disponíveis para consulta pública no Ranking de Transparência.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">4. Sistema de Indicações (Afiliados)</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>O Bônus:</strong> O usuário ganha R$ 2,00 de bônus por cada novo usuário indicado que realizar seu primeiro depósito (mínimo R$ 10,00).</li>
              <li><strong>Uso do Link:</strong> A indicação só é válida se o novo usuário se cadastrar utilizando o link exclusivo do indicador.</li>
              <li><strong>Limites:</strong> O bônus é creditado automaticamente na carteira virtual e pode ser usado para novos palpites.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">5. Sorteios e Promoções</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Elegibilidade:</strong> Cada palpite (aposta) realizado e pago garante ao usuário um "Número da Sorte" (Cupom) gerado aleatoriamente ou deterministicamente pelo sistema.</li>
              <li><strong>O Prêmio:</strong> O sorteio atual refere-se a um GAME STICK M15 PRO.</li>
              <li><strong>Data do Sorteio:</strong> O sorteio será realizado no dia 19 de Julho de 2026, coincidindo com a final da Copa do Mundo FIFA 2026.</li>
              <li><strong>Divulgação:</strong> O ganhador será anunciado na plataforma e contatado via e-mail/telefone cadastrado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">6. Regras Gerais e Conduta</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Não comercialização:</strong> O BOLÃO10 não é uma casa de apostas. Trata-se de um bolão colaborativo entre amigos e conhecidos.</li>
              <li><strong>Imprevistos:</strong> Caso uma partida seja cancelada ou adiada por tempo indeterminado pela CBF, a partida será considerada "anulada" para fins de pontuação, e o cálculo da rodada será feito com base nas partidas restantes.</li>
              <li><strong>Decisão Administrativa:</strong> O Administrador do sistema possui a palavra final em casos de conflitos técnicos ou interpretação de resultados, sempre zelando pela boa-fé e transparência da comunidade.</li>
            </ul>
          </section>

          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 mt-12">
            <p className="text-blue-800 font-medium">
              <strong>Importante:</strong> A participação no BOLÃO10 deve ser encarada como uma forma de entretenimento. Jogue com responsabilidade e aproveite a emoção do futebol.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const PrivacyPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100"
      >
        <h1 className="text-4xl font-bold text-primary mb-8">POLÍTICA DE PRIVACIDADE – BOLÃO10</h1>
        
        <div className="prose prose-slate max-w-none space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">1. Introdução</h2>
            <p>
              A plataforma Bolão10 valoriza a privacidade de seus usuários. Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações pessoais ao utilizar nosso site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">2. Coleta de Dados</h2>
            <p className="mb-4">Para o funcionamento da plataforma e processamento de pagamentos, coletamos:</p>
            <ul className="list-disc pl-5 space-y-4">
              <li>
                <strong>Dados de Identificação:</strong> Nome completo, e-mail e CPF (necessário para emissão de pagamentos e segurança).
              </li>
              <li>
                <strong>Dados de Pagamento:</strong> As transações são processadas pelo gateway PagBank. O Bolão10 não armazena dados sensíveis de cartões de crédito em seus servidores, utilizando apenas tokens de transação seguros.
              </li>
              <li>
                <strong>Dados de Uso:</strong> Registros de palpites, histórico de depósitos e movimentações de saldo dentro da plataforma.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">3. Finalidade dos Dados</h2>
            <p className="mb-4">Os dados coletados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Gerenciar sua conta e garantir o acesso aos bolões.</li>
              <li>Processar depósitos e resgates de prêmios.</li>
              <li>Garantir a integridade e transparência das rodadas.</li>
              <li>Prevenir fraudes e garantir a conformidade com as normas financeiras.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">4. Compartilhamento de Informações</h2>
            <p className="mb-4">O Bolão10 não vende ou aluga dados de usuários. O compartilhamento ocorre apenas com:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>PagBank:</strong> Para o processamento das transações financeiras.</li>
              <li><strong>Autoridades Legais:</strong> Caso seja exigido por lei ou ordem judicial.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">5. Segurança</h2>
            <p>
              Utilizamos certificados SSL para criptografia de dados e o banco de dados Supabase para garantir o armazenamento seguro das informações. Adotamos as melhores práticas de desenvolvimento para proteger o ambiente contra acessos não autorizados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">6. Seus Direitos</h2>
            <p>
              O usuário tem o direito de solicitar a correção, atualização ou exclusão de seus dados pessoais, bem como o encerramento de sua conta a qualquer momento, desde que não haja pendências financeiras.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">7. Contato</h2>
            <p>
              Para dúvidas sobre esta política, entre em contato através do e-mail: <a href="mailto:admin@bolao10.com" className="text-primary hover:underline font-bold">admin@bolao10.com</a>
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [page, setPage] = useState(() => {
    const p = window.location.pathname.replace(/^\/+/, '');
    if (p === 'copa2026') return 'copa2026';
    return p || 'landing';
  });
  const { isAuthenticated, isAdmin, hasAdminAccess, token } = useAuth();

  // Push Notifications Setup
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const registerPush = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported');
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          if (!vapidPublicKey) return;

          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });

          await fetch('/api/push-subscriptions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ subscription })
          });
        }
      } catch (err) {
        console.error('Error registering push:', err);
      }
    };

    registerPush();
  }, [isAuthenticated, token]);

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('referredBy', ref);
      // Clean up URL
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && (page === 'landing' || page === '')) setPage('dashboard');
  }, [isAuthenticated, page]);

  const renderPage = () => {
    switch (page) {
      case 'landing': return <LandingPage onNavigate={setPage} />;
      case 'login': return <LoginPage onNavigate={setPage} />;
      case 'dashboard': return <Dashboard onNavigate={setPage} />;
      case 'copa2026': return <CopaDashboard onNavigate={setPage} />;
      case 'wallet': return <WalletPage onNavigate={setPage} />;
      case 'referral': return <ReferralPage />;
      case 'profile': return <ProfilePage onNavigate={setPage} />;
      case 'predictions': return <PredictionsPage onNavigate={setPage} />;
      case 'admin': return hasAdminAccess ? <AdminDashboard /> : <Dashboard onNavigate={setPage} />;
      case 'admin-rounds': return hasAdminAccess ? <AdminRoundsPage /> : <Dashboard onNavigate={setPage} />;
      case 'transparency': return <TransparencyPage />;
      case 'ranking': return <RankingPage />;
      case 'terms': return <TermsPage />;
      case 'privacy': return <PrivacyPage />;
      default: return <LandingPage onNavigate={setPage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[url('https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/fundo.png')] bg-cover bg-fixed bg-center text-white">
      <Toaster position="top-right" richColors />
      <Navbar onNavigate={setPage} currentPage={page} />
      {/* <PromoPopup onNavigate={setPage} /> */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="bg-[#0A0F1E] border-t border-[#2A3441] py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="mb-4 flex justify-center space-x-6">
            <button 
              onClick={() => setPage('terms')}
              className="text-xs font-black text-gray-500 hover:text-white uppercase tracking-wider transition-colors"
            >
              Termos de Uso
            </button>
            <button 
              onClick={() => setPage('privacy')}
              className="text-xs font-black text-gray-500 hover:text-white uppercase tracking-wider transition-colors"
            >
              Política de Privacidade
            </button>
          </div>
          <p className="text-sm font-black text-gray-300">© 2026 BOLÃO10 - Entretenimento baseado em conhecimento esportivo.</p>
          <p className="text-xs font-bold text-gray-500 mt-2">Plataforma transparente e auditável entre amigos.</p>
          <div className="mt-4 flex justify-center items-center space-x-4">
            <span className="text-gray-500 text-xs font-black uppercase tracking-widest">Contato:</span>
            <a href="mailto:admin@bolao10.com" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" title="admin@bolao10.com">
              <Mail className="w-5 h-5" />
            </a>
            <a href="https://wa.me/5521989886916" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#32CD32] transition-colors flex items-center text-sm" title="(21) 98988-6916">
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
