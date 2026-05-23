import React, { useState } from 'react';
import { CreditCard, QrCode, CheckCircle, AlertCircle, Loader2, Copy, Check, Info } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import { generatePixPayload } from '../utils/pix';

declare const PagSeguro: any;

interface PagBankCheckoutProps {
  amount: string;
  token: string;
  initialMethod?: 'pix' | 'credit_card';
  onSuccess: () => void;
  onCancel: () => void;
}

export const PagBankCheckout: React.FC<PagBankCheckoutProps> = ({ amount, token, initialMethod = 'pix', onSuccess, onCancel }) => {
  const [method, setMethod] = useState<'pix' | 'credit_card'>(initialMethod);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrcode: string; text: string; depositId: string; manual?: boolean } | null>(null);
  const hasTriggeredRef = React.useRef(false);

  React.useEffect(() => {
    if (initialMethod === 'pix' && !hasTriggeredRef.current && !pixData) {
      hasTriggeredRef.current = true;
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handlePayment(fakeEvent);
    }
  }, [initialMethod]);
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });
  const [copied, setCopied] = useState(false);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let cardHash = null;

      if (method === 'credit_card') {
        // 1. Get Public Key from our backend
        const pkRes = await fetch('/api/pagbank/public-key', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!pkRes.ok) throw new Error('Falha ao obter chave de criptografia');
        const pkData = await pkRes.json();
        const publicKey = pkData.public_key;

        // 2. Encrypt card using PagBank SDK
        if (typeof PagSeguro === 'undefined') {
          throw new Error('SDK do PagBank não carregado. Verifique sua conexão.');
        }

        const card = PagSeguro.encryptCard({
          publicKey,
          holder: cardData.name,
          number: cardData.number.replace(/\s/g, ''),
          expMonth: cardData.expiry.split('/')[0],
          expYear: '20' + cardData.expiry.split('/')[1],
          securityCode: cardData.cvv
        });

        if (card.hasErrors) {
          const errorMap: any = {
            'INVALID_NUMBER': 'Número do cartão inválido',
            'INVALID_HOLDER': 'Nome do titular inválido',
            'INVALID_EXPIRATION_MONTH': 'Mês de expiração inválido',
            'INVALID_EXPIRATION_YEAR': 'Ano de expiração inválido',
            'INVALID_SECURITY_CODE': 'CVV inválido'
          };
          const firstError = Object.keys(card.errors)[0];
          throw new Error(errorMap[firstError] || 'Dados do cartão inválidos');
        }

        cardHash = card.encryptedCard;
      }

      const res = await fetch('/api/pagbank/create-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          method,
          cardHash
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao processar pagamento');

      if (method === 'pix') {
        let finalPixData = null;
        
        finalPixData = { ...data.pix, depositId: data.depositId };

        if (finalPixData) {
          setPixData(finalPixData);
          toast.success('PIX gerado com sucesso!');
        } else {
          throw new Error('Não foi possível gerar o PIX. Tente novamente mais tarde.');
        }
      } else {
        if (data.status === 'PAID') {
          toast.success('Pagamento com cartão aprovado!');
          onSuccess();
        } else if (data.status === 'IN_ANALYSIS') {
          toast.info('Pagamento em análise. O saldo será creditado em breve.');
          onSuccess();
        } else if (data.status === 'DECLINED') {
          toast.error('Pagamento recusado pelo cartão.');
        } else {
          toast.success('Pagamento com cartão processado!');
          onSuccess();
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPix = () => {
    if (pixData) {
      navigator.clipboard.writeText(pixData.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Código PIX copiado!');
    }
  };

  if (loading && !pixData && initialMethod === 'pix') {
    return (
      <div className="bg-[#12182B] border border-[#2A3441] p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-12 h-12 text-[#32CD32] animate-spin" />
          <p className="text-gray-400 font-black uppercase tracking-wider text-sm">Gerando seu QR Code PIX...</p>
        </div>
      </div>
    );
  }

  if (pixData) {
    return (
      <div className="bg-[#12182B] border border-[#2A3441] p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300 text-white">
        <div className="w-16 h-16 bg-[#32CD32]/10 text-[#32CD32] rounded-full flex items-center justify-center mx-auto border border-[#32CD32]/20">
          <QrCode className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase italic tracking-wider text-white">Pagamento PIX</h3>
          <p className="text-gray-400 mt-1 uppercase tracking-wider text-xs font-bold">Escaneie o código abaixo para concluir seu depósito de <span className="font-black text-[#32CD32]">R$ {parseFloat(amount).toFixed(2)}</span></p>
        </div>

        <div className="bg-white p-4 border border-[#2A3441] rounded-2xl inline-block shadow-md">
          {!pixData.qrcode ? (
            <div className="p-2 bg-white rounded-lg">
              <QRCode value={pixData.text} size={192} />
            </div>
          ) : (
            <img src={pixData.qrcode} alt="QR Code PIX" className="w-48 h-48 mx-auto rounded-lg" referrerPolicy="no-referrer" />
          )}
        </div>

        <div className="space-y-3">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Ou copie o código abaixo</p>
          <div className="flex items-center gap-2 bg-[#0A0F1E] p-3 rounded-xl border border-[#2A3441]">
            <code className="text-xs text-gray-300 truncate flex-grow text-left font-mono">{pixData.text}</code>
            <button onClick={copyPix} className="p-2 hover:bg-[#1A2235] rounded-lg transition-colors">
              {copied ? <Check className="w-4 h-4 text-[#32CD32]" /> : <Copy className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <button 
            onClick={async () => {
              try {
                setLoading(true);
                const res = await fetch(`/api/pagbank/check-status/${pixData.depositId || ''}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.status === 'PAID') {
                  toast.success('Pagamento confirmado!');
                  onSuccess();
                } else {
                  toast.info('Pagamento ainda não detectado. Se você já pagou, aguarde alguns instantes.');
                }
              } catch (e) {
                toast.error('Erro ao verificar status');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full bg-[#32CD32] text-black font-black uppercase italic tracking-wider py-4 rounded-xl hover:scale-105 transition-all shadow-[0_0_15px_rgba(50,205,50,0.4)] flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Já realizei o pagamento'}
          </button>
          <button 
            onClick={onCancel}
            className="w-full text-gray-400 hover:text-white font-black uppercase tracking-wider text-xs transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#12182B] border border-[#2A3441] text-white p-8 rounded-3xl shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black uppercase italic tracking-wider text-white">Concluir Depósito</h3>
        <span className="text-[#32CD32] font-black text-xl italic">R$ {parseFloat(amount).toFixed(2)}</span>
      </div>

      {method === 'pix' ? (
        <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20 flex items-start gap-4 mb-8">
          <QrCode className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
          <div className="space-y-1">
            <p className="font-bold text-blue-300 text-sm uppercase tracking-wider">Depósito via PIX</p>
            <p className="text-xs text-gray-400 leading-relaxed font-semibold">
              Ao clicar no botão abaixo, geraremos um código PIX para você realizar o pagamento. O saldo é creditado automaticamente.
            </p>
          </div>
        </div>
      ) : (
        <form id="cc-form" onSubmit={handlePayment} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Nome no Cartão</label>
            <input
              type="text"
              required
              value={cardData.name}
              onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
              className="w-full p-3 bg-[#0A0F1E] border border-[#2A3441] text-white rounded-xl focus:ring-2 focus:ring-[#32CD32] focus:border-[#32CD32] uppercase tracking-wider font-bold outline-none text-sm transition-all"
              placeholder="Como está no cartão"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Número do Cartão</label>
            <input
              type="text"
              required
              maxLength={19}
              value={cardData.number}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
                setCardData({ ...cardData, number: formatted });
              }}
              className="w-full p-3 bg-[#0A0F1E] border border-[#2A3441] text-white rounded-xl focus:ring-2 focus:ring-[#32CD32] focus:border-[#32CD32] font-mono text-sm outline-none transition-all"
              placeholder="0000 0000 0000 0000"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Validade</label>
              <input
                type="text"
                required
                maxLength={5}
                value={cardData.expiry}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length >= 2) {
                    val = val.substring(0, 2) + '/' + val.substring(2, 4);
                  }
                  setCardData({ ...cardData, expiry: val });
                }}
                className="w-full p-3 bg-[#0A0F1E] border border-[#2A3441] text-white rounded-xl focus:ring-2 focus:ring-[#32CD32] focus:border-[#32CD32] font-mono text-sm outline-none transition-all"
                placeholder="MM/AA"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">CVV</label>
              <input
                type="text"
                required
                maxLength={4}
                value={cardData.cvv}
                onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                className="w-full p-3 bg-[#0A0F1E] border border-[#2A3441] text-white rounded-xl focus:ring-2 focus:ring-[#32CD32] focus:border-[#32CD32] font-mono text-sm outline-none transition-all"
                placeholder="123"
              />
            </div>
          </div>
        </form>
      )}

      {method === 'pix' ? (
        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-[#00BFA5] text-black font-black uppercase tracking-wider py-4 rounded-xl hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(0,191,165,0.3)] disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
            <>
              <QrCode className="w-6 h-6" />
              Gerar QR Code PIX
            </>
          )}
        </button>
      ) : (
        <button
          type="submit"
          form="cc-form"
          disabled={loading || !cardData.name || !cardData.number || !cardData.expiry || !cardData.cvv}
          className="w-full bg-[#32CD32] text-black font-black uppercase tracking-wider py-4 rounded-xl hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(50,205,50,0.3)] disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
            <>
              <CreditCard className="w-6 h-6" />
              Pagar R$ {parseFloat(amount).toFixed(2)}
            </>
          )}
        </button>
      )}

      <button 
        onClick={onCancel}
        disabled={loading}
        className="w-full mt-4 text-gray-400 hover:text-white font-black uppercase tracking-wider text-xs transition-colors"
      >
        Cancelar
      </button>

      <div className="mt-8 pt-6 border-t border-[#2A3441] flex items-center justify-center gap-2 grayscale opacity-50">
        <img src="https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/PagBank.jpg" alt="PagBank" className="h-4 object-contain rounded" referrerPolicy="no-referrer" />
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ambiente Seguro</span>
      </div>
    </div>
  );
};
