import React, { useState, useMemo } from 'react';
import { X, AlertCircle, CreditCard, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PagBankCheckout } from './PagBankCheckout';

export const DepositModal = ({ isOpen, onClose, token, onDepositSuccess }: any) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'pix' | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setError(null);
      setPaymentMode(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#12182B] border border-[#2A3441] text-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#2A3441] flex justify-between items-center bg-[#1A2235] text-white">
          <h2 className="text-xl font-black uppercase italic tracking-wider">Depositar na Carteira</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 flex items-start text-sm border border-red-500/20">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {!paymentMode ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Valor do Depósito (R$)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ex: 50.00"
                  className="w-full p-4 bg-[#0A0F1E] text-white border border-[#2A3441] rounded-xl focus:ring-2 focus:ring-[#32CD32] focus:border-[#32CD32] text-lg font-black outline-none"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {[10, 20, 50, 100, 200].map(val => (
                  <button
                    key={val}
                    onClick={() => setAmount(val.toString())}
                    className="py-2 border border-[#2A3441] bg-[#1A2235] rounded-xl text-gray-300 font-black uppercase tracking-wider hover:bg-[#2A3441] hover:text-[#32CD32] transition-colors"
                  >
                    R$ {val}
                  </button>
                ))}
              </div>

              <div className="pt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (parseFloat(amount) >= 1) setPaymentMode('pix');
                    else setError('O valor mínimo para depósito é R$ 1,00');
                  }}
                  className="w-full bg-[#00BFA5] text-black font-black uppercase tracking-wider py-4 rounded-xl hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,191,165,0.3)]"
                >
                  <CreditCard className="w-5 h-5" />
                  PIX
                </button>
                <button
                  onClick={() => {
                    if (parseFloat(amount) >= 1) setPaymentMode('credit_card');
                    else setError('O valor minimum para depósito é R$ 1,00');
                  }}
                  className="w-full bg-[#32CD32] text-black font-black uppercase tracking-wider py-4 rounded-xl hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(50,205,50,0.3)]"
                >
                  <CreditCard className="w-5 h-5" />
                  Cartão
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <PagBankCheckout 
                amount={amount} 
                token={token}
                initialMethod={paymentMode === 'pix' ? 'pix' : 'credit_card'}
                onSuccess={() => {
                  onDepositSuccess();
                  onClose();
                }}
                onCancel={() => setPaymentMode(null)}
              />
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-6 border-t border-[#2A3441] mt-8">
            <img src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/PagBank.jpg" alt="PagBank" className="h-4 grayscale opacity-70 rounded" referrerPolicy="no-referrer" />
            <div className="h-4 w-[1px] bg-[#2A3441]"></div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#32CD32]" />
              <span className="text-[10px] font-black text-[#32CD32] uppercase tracking-widest">Ambiente Seguro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
