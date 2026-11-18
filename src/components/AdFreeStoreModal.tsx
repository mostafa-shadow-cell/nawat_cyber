import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Crown,
  Globe2,
  Info,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import {
  COUNTRY_OPTIONS,
  detectDefaultCountryFromLocale,
  getCountryPricing,
  getPaymentMethodsForCountry,
  type CountryCode,
  type CustomerPaymentMethodId,
} from '../utils/finance';

export interface VipCheckoutPayload {
  countryCode: CountryCode;
  paymentMethod: CustomerPaymentMethodId;
  paymentReference: string;
}

interface AdFreeStoreModalProps {
  isOpen: boolean;
  isAdFree: boolean;
  isVipMember: boolean;
  onClose: () => void;
  onActivatePaidPass: (
    payload: VipCheckoutPayload
  ) => Promise<{ success: boolean; errorAr?: string }>;
}

export function AdFreeStoreModal({
  isOpen,
  isAdFree,
  isVipMember,
  onClose,
  onActivatePaidPass,
}: AdFreeStoreModalProps) {
  const [countryCode, setCountryCode] = useState<CountryCode>(() =>
    detectDefaultCountryFromLocale()
  );
  const [paymentMethod, setPaymentMethod] = useState<CustomerPaymentMethodId>(
    () => getPaymentMethodsForCountry(detectDefaultCountryFromLocale())[0].id
  );
  const [paymentReference, setPaymentReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPurchased(false);
      setErrorMsg(null);
      setPaymentReference('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pricing = getCountryPricing(countryCode);
  const availableMethods = getPaymentMethodsForCountry(countryCode);
  const activeMethod =
    availableMethods.find((m) => m.id === paymentMethod) ?? availableMethods[0];

  const arabCountries = COUNTRY_OPTIONS.filter((c) => c.isArabLeague);
  const otherCountries = COUNTRY_OPTIONS.filter((c) => !c.isArabLeague);

  const handleCountryChange = (nextCountry: CountryCode) => {
    setCountryCode(nextCountry);
    const methods = getPaymentMethodsForCountry(nextCountry);
    setPaymentMethod(methods[0].id);
    setPaymentReference('');
    setErrorMsg(null);
  };

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const res = await onActivatePaidPass({
        countryCode,
        paymentMethod: activeMethod.id,
        paymentReference,
      });
      if (!res.success) {
        setErrorMsg(res.errorAr ?? 'تعذر إتمام عملية الدفع. تحقق من البيانات.');
        return;
      }
      setPaymentReference('');
      setPurchased(true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="متجر ترقية العضوية إلى VIP"
      data-testid="vip-store-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-cyan-500/35 bg-[#0B0F16] shadow-[0_24px_64px_rgba(0,0,0,0.85)]">
        <header className="flex items-center justify-between border-b border-slate-800 bg-[#0E141E] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Crown className="h-5 w-5 text-amber-300" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-slate-50">
              ترقية العضوية — باقة VIP / Pro الشاملة
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة المتجر"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-slate-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-5 p-6">
          {/* Dynamic Regional VIP Pricing Card */}
          <div className="rounded-xl border border-amber-500/35 bg-[#07090D] p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <span className="font-display text-sm font-bold text-slate-100">
                  عضوية VIP / Pro (دائمة الحساب)
                </span>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  التسعير في {pricing.labelAr} ({pricing.currencyNameAr})
                </p>
              </div>
              <div className="text-left">
                <span
                  dir="ltr"
                  data-testid="vip-dynamic-price"
                  className="inline-block rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-base font-bold text-amber-300 tabular-nums"
                >
                  {pricing.formattedPrice}
                </span>
                {pricing.usdEquivalent && pricing.currency !== 'USD' && (
                  <p
                    data-testid="vip-usd-equivalent"
                    className="mt-1 text-[10px] text-slate-400"
                  >
                    محوّل تلقائياً من{' '}
                    <span dir="ltr" className="font-mono text-cyan-300">
                      ${pricing.usdEquivalent} USD
                    </span>
                  </p>
                )}
              </div>
            </div>
            <ul className="space-y-1.5 text-xs leading-relaxed text-slate-300">
              <li>• إزالة جميع الإعلانات نهائياً من كامل صفحات المنصة.</li>
              <li>• شارة عضوية VIP / Pro الذهبية داخل ملفك ولوحة التقدم.</li>
              <li>• تحويل تلقائي للعملة المحلية مع وسائل الدفع المعتمدة في {pricing.labelAr}.</li>
            </ul>
          </div>

          {purchased || isVipMember ? (
            <div
              role="status"
              data-testid="vip-active-status"
              className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs leading-relaxed text-emerald-200"
            >
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-emerald-300">
                  {isVipMember || purchased
                    ? 'عضوية VIP / Pro مفعّلة بنجاح على حسابك!'
                    : 'وضع التصفح بدون إعلانات مفعّل حالياً.'}
                </p>
                <p className="mt-0.5 text-slate-300">
                  تم تفعيل الامتيازات وإخفاء جميع الإعلانات وتسجيل الفاتورة بنجاح.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="space-y-4">
              {/* Country / Region Auto-Detection Selector (All 22 Arab Countries + INTL) */}
              <div>
                <label
                  htmlFor="vip-country-select"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-200"
                >
                  <Globe2 className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>اختر دولتك (جميع الدول العربية وعملاتها المحلية)</span>
                </label>
                <select
                  id="vip-country-select"
                  value={countryCode}
                  onChange={(e) =>
                    handleCountryChange(e.target.value as CountryCode)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3.5 py-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <optgroup label="الدول العربية (22 دولة)">
                    {arabCountries.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.labelAr} ({opt.currencyNameAr}) — {opt.formattedPrice}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="دول أخرى حول العالم">
                    {otherCountries.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.labelAr} — {opt.formattedPrice}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Smart Localized Payment Method Selector */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Wallet className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span>
                      وسائل الدفع المحلية في {pricing.labelAr}
                    </span>
                  </p>
                  <span className="font-mono text-[10px] text-cyan-300 tabular-nums">
                    {availableMethods.length} طرق متاحة
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label="وسائل الدفع المتاحة"
                  data-testid="vip-localized-payment-list"
                  className="grid grid-cols-1 gap-2"
                >
                  {availableMethods.map((method) => {
                    const selected = activeMethod.id === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        data-testid={`payment-method-${method.id}`}
                        onClick={() => {
                          setPaymentMethod(method.id);
                          setErrorMsg(null);
                        }}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-right transition-colors ${
                          selected
                            ? 'border-cyan-400 bg-cyan-500/10 text-slate-50'
                            : 'border-slate-800 bg-[#07090D] text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold">{method.labelAr}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {method.subLabelAr}
                          </p>
                        </div>
                        <CreditCard
                          className={`h-4 w-4 shrink-0 ${
                            selected ? 'text-cyan-300' : 'text-slate-500'
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Reference Input */}
              <div>
                <label
                  htmlFor="vip-payment-reference"
                  className="mb-1.5 block text-xs text-slate-300"
                >
                  {activeMethod.inputLabelAr}
                </label>
                <input
                  id="vip-payment-reference"
                  type="text"
                  dir="ltr"
                  required
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={activeMethod.inputPlaceholder}
                  className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3.5 py-2.5 text-left font-mono text-xs text-cyan-200 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {errorMsg && (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200"
                >
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                data-testid="vip-checkout-submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>
                  {isProcessing
                    ? 'جاري تأكيد الدفع وترقية العضوية...'
                    : `ترقية إلى VIP الآن (${pricing.formattedPrice})`}
                </span>
              </button>
            </form>
          )}

          {/* Google Checkout & Escrow Note */}
          <div className="flex items-start gap-2.5 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3.5 text-xs leading-relaxed text-cyan-100">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-cyan-300">
                بوابة دفع محلية ودولية مؤمّنة
              </p>
              <p className="mt-0.5 text-[11px] text-slate-300">
                تُحصّل المبالغ بعملة دولتك وتُرحّل مباشرة إلى لوحة أرباح المطور مع دعم السحب الفوري عبر Google Checkout أو البطاقات والمحافظ المحلية.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
