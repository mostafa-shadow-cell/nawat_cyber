import {
  detectMaliciousPayload,
  isSafeRecordKey,
  sanitizeTextInput,
} from './security';

export type ArabCountryCode =
  | 'EG'
  | 'SA'
  | 'AE'
  | 'KW'
  | 'QA'
  | 'OM'
  | 'BH'
  | 'JO'
  | 'IQ'
  | 'MA'
  | 'DZ'
  | 'TN'
  | 'LB'
  | 'PS'
  | 'SD'
  | 'LY'
  | 'YE'
  | 'SY'
  | 'MR'
  | 'DJ'
  | 'SO'
  | 'KM';

export type CountryCode = ArabCountryCode | 'INTL';

export type CurrencyCode = 'EGP' | 'USD';

export type LocalCurrencyCode =
  | 'EGP'
  | 'SAR'
  | 'AED'
  | 'KWD'
  | 'QAR'
  | 'OMR'
  | 'BHD'
  | 'JOD'
  | 'IQD'
  | 'MAD'
  | 'DZD'
  | 'TND'
  | 'LBP'
  | 'ILS'
  | 'SDG'
  | 'LYD'
  | 'YER'
  | 'SYP'
  | 'MRU'
  | 'DJF'
  | 'SOS'
  | 'KMF'
  | 'USD';

export type CustomerPaymentMethodId =
  | 'vodafone_cash'
  | 'instapay'
  | 'egypt_card'
  | 'mada'
  | 'stc_pay'
  | 'apple_pay'
  | 'uae_card'
  | 'aani_pay'
  | 'knet'
  | 'qpay'
  | 'oman_net'
  | 'benefit_pay'
  | 'cliq_jo'
  | 'efawateercom'
  | 'zain_cash_iq'
  | 'qi_card'
  | 'cmi_ma'
  | 'cash_plus'
  | 'cib_dahabia'
  | 'edinar_tn'
  | 'whish_money'
  | 'palpay'
  | 'bankak_sd'
  | 'fawry_sd'
  | 'sadad_ly'
  | 'local_card_ly'
  | 'kuraimi_ye'
  | 'onecash_ye'
  | 'syriatel_cash'
  | 'bankily_mr'
  | 'waafi_dj'
  | 'evc_plus'
  | 'huri_money'
  | 'intl_card'
  | 'paypal'
  | 'digital_wallet';

export type DeveloperPayoutMethodId =
  | 'visa'
  | 'bank_transfer'
  | 'instapay'
  | 'vodafone_cash'
  | 'crypto_ewallet';

export interface CountryOption {
  code: CountryCode;
  isArabLeague: boolean;
  labelAr: string;
  currency: LocalCurrencyCode;
  currencyNameAr: string;
  priceAmount: number;
  formattedPrice: string;
  settlementCurrency: CurrencyCode;
  settlementAmount: number;
  usdEquivalent: number | null;
}

export interface LocalizedPaymentMethod {
  id: CustomerPaymentMethodId;
  labelAr: string;
  subLabelAr: string;
  inputLabelAr: string;
  inputPlaceholder: string;
}

export interface DeveloperPayoutMethod {
  id: DeveloperPayoutMethodId;
  labelAr: string;
  subLabelAr: string;
  destinationLabelAr: string;
  destinationPlaceholder: string;
}

export interface VipSaleRecord {
  id: string;
  buyerUserId: string;
  buyerUsername: string;
  buyerNickname: string;
  countryCode: CountryCode;
  currency: CurrencyCode;
  amount: number;
  localCurrency?: LocalCurrencyCode;
  localAmount?: number;
  paymentMethod: CustomerPaymentMethodId;
  paymentAccountMasked: string;
  createdAt: number;
}

export interface DeveloperPayoutRecord {
  id: string;
  currency: CurrencyCode;
  amount: number;
  method: DeveloperPayoutMethodId;
  destination: string;
  status: 'completed';
  createdAt: number;
}

export interface PlatformFinanceState {
  totalRevenueEgp: number;
  totalRevenueUsd: number;
  withdrawnEgp: number;
  withdrawnUsd: number;
  sales: VipSaleRecord[];
  payouts: DeveloperPayoutRecord[];
}

export const VIP_PRICE_EGP = 500;
export const VIP_PRICE_USD = 15;

const FINANCE_STORAGE_KEY = 'nawat_cyber_platform_finance_v1';
const VIP_PRIVILEGE_KEY = 'nawat_cyber_vip_membership_v1';

export const COUNTRY_OPTIONS: CountryOption[] = [
  {
    code: 'EG',
    isArabLeague: true,
    labelAr: 'مصر',
    currency: 'EGP',
    currencyNameAr: 'جنيه مصري',
    priceAmount: VIP_PRICE_EGP,
    formattedPrice: '500 EGP',
    settlementCurrency: 'EGP',
    settlementAmount: VIP_PRICE_EGP,
    usdEquivalent: null,
  },
  {
    code: 'SA',
    isArabLeague: true,
    labelAr: 'السعودية',
    currency: 'SAR',
    currencyNameAr: 'ريال سعودي',
    priceAmount: 56.25,
    formattedPrice: '56.25 SAR',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'AE',
    isArabLeague: true,
    labelAr: 'الإمارات',
    currency: 'AED',
    currencyNameAr: 'درهم إماراتي',
    priceAmount: 55,
    formattedPrice: '55 AED',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'KW',
    isArabLeague: true,
    labelAr: 'الكويت',
    currency: 'KWD',
    currencyNameAr: 'دينار كويتي',
    priceAmount: 4.6,
    formattedPrice: '4.60 KWD',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'QA',
    isArabLeague: true,
    labelAr: 'قطر',
    currency: 'QAR',
    currencyNameAr: 'ريال قطري',
    priceAmount: 54.6,
    formattedPrice: '54.60 QAR',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'OM',
    isArabLeague: true,
    labelAr: 'سلطنة عمان',
    currency: 'OMR',
    currencyNameAr: 'ريال عماني',
    priceAmount: 5.78,
    formattedPrice: '5.78 OMR',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'BH',
    isArabLeague: true,
    labelAr: 'البحرين',
    currency: 'BHD',
    currencyNameAr: 'دينار بحريني',
    priceAmount: 5.65,
    formattedPrice: '5.65 BHD',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'JO',
    isArabLeague: true,
    labelAr: 'الأردن',
    currency: 'JOD',
    currencyNameAr: 'دينار أردني',
    priceAmount: 10.65,
    formattedPrice: '10.65 JOD',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'IQ',
    isArabLeague: true,
    labelAr: 'العراق',
    currency: 'IQD',
    currencyNameAr: 'دينار عراقي',
    priceAmount: 19650,
    formattedPrice: '19,650 IQD',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'MA',
    isArabLeague: true,
    labelAr: 'المغرب',
    currency: 'MAD',
    currencyNameAr: 'درهم مغربي',
    priceAmount: 149,
    formattedPrice: '149 MAD',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'DZ',
    isArabLeague: true,
    labelAr: 'الجزائر',
    currency: 'DZD',
    currencyNameAr: 'دينار جزائري',
    priceAmount: 2010,
    formattedPrice: '2,010 DZD',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'TN',
    isArabLeague: true,
    labelAr: 'تونس',
    currency: 'TND',
    currencyNameAr: 'دينار تونسي',
    priceAmount: 46.8,
    formattedPrice: '46.80 TND',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'LB',
    isArabLeague: true,
    labelAr: 'لبنان',
    currency: 'LBP',
    currencyNameAr: 'ليرة لبنانية',
    priceAmount: 1342500,
    formattedPrice: '1,342,500 LBP',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'PS',
    isArabLeague: true,
    labelAr: 'فلسطين',
    currency: 'ILS',
    currencyNameAr: 'شيكل / دينار أردني',
    priceAmount: 55,
    formattedPrice: '55 ILS',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'SD',
    isArabLeague: true,
    labelAr: 'السودان',
    currency: 'SDG',
    currencyNameAr: 'جنيه سوداني',
    priceAmount: 9000,
    formattedPrice: '9,000 SDG',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'LY',
    isArabLeague: true,
    labelAr: 'ليبيا',
    currency: 'LYD',
    currencyNameAr: 'دينار ليبي',
    priceAmount: 72.5,
    formattedPrice: '72.50 LYD',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'YE',
    isArabLeague: true,
    labelAr: 'اليمن',
    currency: 'YER',
    currencyNameAr: 'ريال يمني',
    priceAmount: 3750,
    formattedPrice: '3,750 YER',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'SY',
    isArabLeague: true,
    labelAr: 'سوريا',
    currency: 'SYP',
    currencyNameAr: 'ليرة سورية',
    priceAmount: 195000,
    formattedPrice: '195,000 SYP',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'MR',
    isArabLeague: true,
    labelAr: 'موريتانيا',
    currency: 'MRU',
    currencyNameAr: 'أوقية موريتانية',
    priceAmount: 595,
    formattedPrice: '595 MRU',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'DJ',
    isArabLeague: true,
    labelAr: 'جيبوتي',
    currency: 'DJF',
    currencyNameAr: 'فرنك جيبوتي',
    priceAmount: 2665,
    formattedPrice: '2,665 DJF',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'SO',
    isArabLeague: true,
    labelAr: 'الصومال',
    currency: 'SOS',
    currencyNameAr: 'شلن صومالي',
    priceAmount: 8550,
    formattedPrice: '8,550 SOS',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'KM',
    isArabLeague: true,
    labelAr: 'جزر القمر',
    currency: 'KMF',
    currencyNameAr: 'فرنك قمري',
    priceAmount: 6810,
    formattedPrice: '6,810 KMF',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
  {
    code: 'INTL',
    isArabLeague: false,
    labelAr: 'دول أخرى (عالمي)',
    currency: 'USD',
    currencyNameAr: 'دولار أمريكي',
    priceAmount: VIP_PRICE_USD,
    formattedPrice: '$15 USD',
    settlementCurrency: 'USD',
    settlementAmount: VIP_PRICE_USD,
    usdEquivalent: VIP_PRICE_USD,
  },
];

const PAYMENT_METHOD_CATALOG: Record<
  CustomerPaymentMethodId,
  LocalizedPaymentMethod
> = {
  vodafone_cash: {
    id: 'vodafone_cash',
    labelAr: 'فودافون كاش (Vodafone Cash)',
    subLabelAr: 'محفظة الهاتف المحمول في مصر',
    inputLabelAr: 'رقم محفظة فودافون كاش',
    inputPlaceholder: '010XXXXXXXX',
  },
  instapay: {
    id: 'instapay',
    labelAr: 'إنستا باي (InstaPay)',
    subLabelAr: 'تحويل لحظي عبر شبكة المدفوعات اللحظية في مصر',
    inputLabelAr: 'عنوان الدفع (IPA) أو رقم الهاتف',
    inputPlaceholder: 'username@instapay',
  },
  egypt_card: {
    id: 'egypt_card',
    labelAr: 'بطاقة بنكية محلية (Meeza / Visa / MC)',
    subLabelAr: 'بطاقات البنوك المصرية المحلية وميزة',
    inputLabelAr: 'آخر 4 أرقام من البطاقة أو اسم حاملها',
    inputPlaceholder: '4242 · Ahmed',
  },
  mada: {
    id: 'mada',
    labelAr: 'بطاقة مدى (Mada)',
    subLabelAr: 'شبكة المدفوعات الوطنية في المملكة العربية السعودية',
    inputLabelAr: 'آخر 4 أرقام من بطاقة مدى أو اسم الحامل',
    inputPlaceholder: '4012 · Fahad',
  },
  stc_pay: {
    id: 'stc_pay',
    labelAr: 'إس تي سي باي (STC Pay)',
    subLabelAr: 'المحفظة الرقمية الفورية في السعودية',
    inputLabelAr: 'رقم جوال STC Pay',
    inputPlaceholder: '05XXXXXXXX',
  },
  apple_pay: {
    id: 'apple_pay',
    labelAr: 'أبل باي (Apple Pay)',
    subLabelAr: 'دفع فوري وآمن عبر Apple Pay',
    inputLabelAr: 'معرف Apple Pay أو البريد المرتبط',
    inputPlaceholder: 'name@icloud.com',
  },
  uae_card: {
    id: 'uae_card',
    labelAr: 'بطاقة بنكية إماراتية (Visa / Mastercard)',
    subLabelAr: 'البطاقات الائتمانية والخصم في الإمارات',
    inputLabelAr: 'آخر 4 أرقام أو اسم حامل البطاقة',
    inputPlaceholder: '4532 · Rashid',
  },
  aani_pay: {
    id: 'aani_pay',
    labelAr: 'آني / محفظة e& money (Aani)',
    subLabelAr: 'نظام الدفع الفوري الإماراتي والمحافظ الرقمية',
    inputLabelAr: 'رقم الهاتف أو معرف Aani',
    inputPlaceholder: '+9715XXXXXXXX',
  },
  knet: {
    id: 'knet',
    labelAr: 'كي نت (KNET)',
    subLabelAr: 'بوابة الدفع الوطنية المعتمدة في الكويت',
    inputLabelAr: 'رمز مرجع KNET أو البنك الكويتي',
    inputPlaceholder: 'KNET-NBK-4421',
  },
  qpay: {
    id: 'qpay',
    labelAr: 'الشبكة القطرية (QPay / NAPS)',
    subLabelAr: 'بطاقات الخصم الوطنية وبوابة QPay في قطر',
    inputLabelAr: 'رقم البطاقة القطرية أو الاسم',
    inputPlaceholder: 'QNB · 5210',
  },
  oman_net: {
    id: 'oman_net',
    labelAr: 'عمان نت / ثواني (OmanNet / Thawani)',
    subLabelAr: 'بوابة الدفع الوطنية والمحافظ في سلطنة عمان',
    inputLabelAr: 'معرف ثواني أو آخر 4 أرقام من بطاقة عمان نت',
    inputPlaceholder: 'thawani_user / 9XXXXXXX',
  },
  benefit_pay: {
    id: 'benefit_pay',
    labelAr: 'بنفت باي (BenefitPay)',
    subLabelAr: 'التحويل الفوري وبوابة البنوك الوطنية في البحرين',
    inputLabelAr: 'رقم الهاتف أو IBAN البحريني في BenefitPay',
    inputPlaceholder: '+9733XXXXXXX',
  },
  cliq_jo: {
    id: 'cliq_jo',
    labelAr: 'كليك الأردن (CliQ Instant)',
    subLabelAr: 'التحويل اللحظي بين البنوك والمحافظ في الأردن',
    inputLabelAr: 'الاسم المستعار (Alias) في CliQ',
    inputPlaceholder: 'ALI.JO',
  },
  efawateercom: {
    id: 'efawateercom',
    labelAr: 'إي فواتيركم / زين كاش (eFAWATEERcom)',
    subLabelAr: 'الدفع الإلكتروني والمحافظ المحلية في الأردن',
    inputLabelAr: 'رقم محفظة زين كاش أو الحساب',
    inputPlaceholder: '079XXXXXXX',
  },
  zain_cash_iq: {
    id: 'zain_cash_iq',
    labelAr: 'زين كاش العراق (Zain Cash)',
    subLabelAr: 'المحفظة الرقمية الأكثر انتشاراً في العراق',
    inputLabelAr: 'رقم محفظة زين كاش',
    inputPlaceholder: '0780XXXXXXX',
  },
  qi_card: {
    id: 'qi_card',
    labelAr: 'كي كارد / ماستركارد الرافدين (Qi Card)',
    subLabelAr: 'بطاقات كي كارد والماستركارد المحلية في العراق',
    inputLabelAr: 'آخر 4 أرقام من بطاقة Qi Card',
    inputPlaceholder: '5190 · Baghdad',
  },
  cmi_ma: {
    id: 'cmi_ma',
    labelAr: 'الشبكة المغربية للبطاقات (CMI)',
    subLabelAr: 'بوابة الدفع البنكية الوطنية في المغرب',
    inputLabelAr: 'اسم حامل البطاقة أو آخر 4 أرقام',
    inputPlaceholder: 'CMI · 4210',
  },
  cash_plus: {
    id: 'cash_plus',
    labelAr: 'كاش بلوس / وفاكاش (Cash Plus)',
    subLabelAr: 'المحفظة الرقمية والدفع النقدي الإلكتروني في المغرب',
    inputLabelAr: 'رقم حساب Cash Plus أو الهاتف',
    inputPlaceholder: '06XXXXXXXX',
  },
  cib_dahabia: {
    id: 'cib_dahabia',
    labelAr: 'البطاقة الذهبية / CIB (BaridiMob)',
    subLabelAr: 'بريد الجزائر والشبكة البنكية الجزائرية CIB',
    inputLabelAr: 'رقم هاتف BaridiMob أو معرف البطاقة',
    inputPlaceholder: '055XXXXXXX',
  },
  edinar_tn: {
    id: 'edinar_tn',
    labelAr: 'بطاقة دينار الإلكتروني (e-Dinar / Sobflous)',
    subLabelAr: 'الدفع الوطني التونسي عبر البريد والبطاقات البنكية',
    inputLabelAr: 'رقم بطاقة e-Dinar أو معرف Sobflous',
    inputPlaceholder: '216-9XXXXXXX',
  },
  whish_money: {
    id: 'whish_money',
    labelAr: 'ويش موني / OMT Pay (Whish Money)',
    subLabelAr: 'محافظ التحويل والدفع الفوري في لبنان',
    inputLabelAr: 'رقم حساب Whish أو OMT',
    inputPlaceholder: '+96170XXXXXX',
  },
  palpay: {
    id: 'palpay',
    labelAr: 'بال باي / جوال باي (PalPay)',
    subLabelAr: 'المحافظ الرقمية والبطاقات البنكية في فلسطين',
    inputLabelAr: 'رقم الجوال في PalPay أو Jawwal Pay',
    inputPlaceholder: '059XXXXXXX',
  },
  bankak_sd: {
    id: 'bankak_sd',
    labelAr: 'تطبيق بنكك (Bankak / BOK)',
    subLabelAr: 'التحويل البنكي الفوري في السودان',
    inputLabelAr: 'رقم حساب بنكك أو المرجع',
    inputPlaceholder: 'BOK-2491234',
  },
  fawry_sd: {
    id: 'fawry_sd',
    labelAr: 'محفظة أوكاش / فوري السودان',
    subLabelAr: 'المحافظ الإلكترونية المحلية في السودان',
    inputLabelAr: 'رقم الهاتف المسجل في المحفظة',
    inputPlaceholder: '09XXXXXXXX',
  },
  sadad_ly: {
    id: 'sadad_ly',
    labelAr: 'سداد / موبي كاش ليبيا (Sadad)',
    subLabelAr: 'الدفع الإلكتروني عبر الهاتف المحمول في ليبيا',
    inputLabelAr: 'رقم الهاتف المرتبط بخدمة سداد',
    inputPlaceholder: '091XXXXXXX',
  },
  local_card_ly: {
    id: 'local_card_ly',
    labelAr: 'بطاقة تداول / المصارف الليبية المحلية',
    subLabelAr: 'بطاقات الدفع المحلية للمصارف الليبية',
    inputLabelAr: 'معرف البطاقة المحلية أو الاسم',
    inputPlaceholder: 'LY-CARD-4011',
  },
  kuraimi_ye: {
    id: 'kuraimi_ye',
    labelAr: 'حاسب الكريمي / إم فلوس (Kuraimi)',
    subLabelAr: 'تطبيق الكريمي جوال وحاسب في اليمن',
    inputLabelAr: 'رقم حساب حاسب أو المميز',
    inputPlaceholder: '3001XXXXXX',
  },
  onecash_ye: {
    id: 'onecash_ye',
    labelAr: 'ون كاش / جوالي (OneCash)',
    subLabelAr: 'المحافظ الرقمية المحلية في اليمن',
    inputLabelAr: 'رقم محفظة ون كاش',
    inputPlaceholder: '77XXXXXXXX',
  },
  syriatel_cash: {
    id: 'syriatel_cash',
    labelAr: 'سيريتل كاش / MTN كاش',
    subLabelAr: 'محافظ الدفع الإلكتروني بالهاتف في سوريا',
    inputLabelAr: 'رقم محفظة سيريتل / MTN كاش',
    inputPlaceholder: '093XXXXXXX',
  },
  bankily_mr: {
    id: 'bankily_mr',
    labelAr: 'بنكيلي / السداد الموريتاني (Bankily)',
    subLabelAr: 'المحفظة المصرفية الأولى في موريتانيا',
    inputLabelAr: 'رقم الهاتف المسجل في Bankily',
    inputPlaceholder: '+2222XXXXXXX',
  },
  waafi_dj: {
    id: 'waafi_dj',
    labelAr: 'وافي / دي موني (Waafi / D-Money)',
    subLabelAr: 'الدفع الإلكتروني بالهاتف في جيبوتي',
    inputLabelAr: 'رقم محفظة Waafi أو D-Money',
    inputPlaceholder: '+25377XXXXXX',
  },
  evc_plus: {
    id: 'evc_plus',
    labelAr: 'إي في سي بلس / زاد (EVC Plus / Zaad)',
    subLabelAr: 'شبكة المدفوعات الرقمية بالهاتف في الصومال',
    inputLabelAr: 'رقم هاتف EVC Plus أو Zaad',
    inputPlaceholder: '+25261XXXXXXX',
  },
  huri_money: {
    id: 'huri_money',
    labelAr: 'هوري موني / هولو (HuriMoney)',
    subLabelAr: 'المحفظة الرقمية المعتمدة في جزر القمر',
    inputLabelAr: 'رقم محفظة HuriMoney',
    inputPlaceholder: '+2693XXXXXX',
  },
  intl_card: {
    id: 'intl_card',
    labelAr: 'بطاقة ائتمان / خصم (Visa / Mastercard)',
    subLabelAr: 'دفع آمن بالبطاقات البنكية المحلية والدولية',
    inputLabelAr: 'اسم حامل البطاقة أو آخر 4 أرقام',
    inputPlaceholder: '4532 · Global Card',
  },
  paypal: {
    id: 'paypal',
    labelAr: 'باي بال (PayPal)',
    subLabelAr: 'الدفع السريع عبر حساب PayPal الدولي',
    inputLabelAr: 'بريد حساب PayPal',
    inputPlaceholder: 'user@paypal-mail.com',
  },
  digital_wallet: {
    id: 'digital_wallet',
    labelAr: 'محفظة رقمية دولية (Apple Pay / Google Pay)',
    subLabelAr: 'دفع فوري عبر المحافظ الرقمية العالمية',
    inputLabelAr: 'معرف المحفظة أو البريد المرتبط',
    inputPlaceholder: 'wallet@example.com',
  },
};

export const EGYPT_PAYMENT_METHODS: LocalizedPaymentMethod[] = [
  PAYMENT_METHOD_CATALOG.vodafone_cash,
  PAYMENT_METHOD_CATALOG.instapay,
  PAYMENT_METHOD_CATALOG.egypt_card,
];

export const INTL_PAYMENT_METHODS: LocalizedPaymentMethod[] = [
  PAYMENT_METHOD_CATALOG.intl_card,
  PAYMENT_METHOD_CATALOG.paypal,
  PAYMENT_METHOD_CATALOG.digital_wallet,
];

const COUNTRY_PAYMENT_METHOD_IDS: Record<CountryCode, CustomerPaymentMethodId[]> = {
  EG: ['vodafone_cash', 'instapay', 'egypt_card'],
  SA: ['mada', 'stc_pay', 'apple_pay'],
  AE: ['uae_card', 'apple_pay', 'aani_pay'],
  KW: ['knet', 'apple_pay', 'intl_card'],
  QA: ['qpay', 'apple_pay', 'intl_card'],
  OM: ['oman_net', 'apple_pay', 'intl_card'],
  BH: ['benefit_pay', 'apple_pay', 'intl_card'],
  JO: ['cliq_jo', 'efawateercom', 'intl_card'],
  IQ: ['zain_cash_iq', 'qi_card', 'intl_card'],
  MA: ['cmi_ma', 'cash_plus', 'intl_card'],
  DZ: ['cib_dahabia', 'intl_card'],
  TN: ['edinar_tn', 'intl_card'],
  LB: ['whish_money', 'intl_card', 'paypal'],
  PS: ['palpay', 'intl_card'],
  SD: ['bankak_sd', 'fawry_sd', 'intl_card'],
  LY: ['sadad_ly', 'local_card_ly', 'intl_card'],
  YE: ['kuraimi_ye', 'onecash_ye', 'intl_card'],
  SY: ['syriatel_cash', 'intl_card'],
  MR: ['bankily_mr', 'intl_card'],
  DJ: ['waafi_dj', 'intl_card'],
  SO: ['evc_plus', 'intl_card'],
  KM: ['huri_money', 'intl_card'],
  INTL: ['intl_card', 'paypal', 'digital_wallet'],
};

export const DEVELOPER_PAYOUT_METHODS: DeveloperPayoutMethod[] = [
  {
    id: 'visa',
    labelAr: 'فيزا / ماستركارد (Visa)',
    subLabelAr: 'تحويل مباشر على البطاقة البنكية',
    destinationLabelAr: 'رقم أو معرف البطاقة المستلمة',
    destinationPlaceholder: '4242-XXXX-XXXX-9910',
  },
  {
    id: 'bank_transfer',
    labelAr: 'تحويل بنكي (Bank Transfer / IBAN)',
    subLabelAr: 'حوالة مصرفية دولية أو محلية',
    destinationLabelAr: 'رقم الحساب / IBAN',
    destinationPlaceholder: 'EG380002000156700000123456',
  },
  {
    id: 'instapay',
    labelAr: 'إنستا باي (InstaPay)',
    subLabelAr: 'تحويل فوري للجنيه المصري',
    destinationLabelAr: 'عنوان InstaPay',
    destinationPlaceholder: 'shadow@instapay',
  },
  {
    id: 'vodafone_cash',
    labelAr: 'فودافون كاش (Vodafone Cash)',
    subLabelAr: 'استلام فوري على محفظة الهاتف',
    destinationLabelAr: 'رقم محفظة فودافون كاش',
    destinationPlaceholder: '01000000000',
  },
  {
    id: 'crypto_ewallet',
    labelAr: 'عملات رقمية / محافظ إلكترونية (Crypto / E-Wallets)',
    subLabelAr: 'USDT (TRC20) / PayPal / Wise',
    destinationLabelAr: 'عنوان المحفظة الرقمية أو الحساب',
    destinationPlaceholder: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
  },
];

const TZ_COUNTRY_RULES: Array<{ keyword: string; code: CountryCode }> = [
  { keyword: 'cairo', code: 'EG' },
  { keyword: 'riyadh', code: 'SA' },
  { keyword: 'dubai', code: 'AE' },
  { keyword: 'kuwait', code: 'KW' },
  { keyword: 'qatar', code: 'QA' },
  { keyword: 'muscat', code: 'OM' },
  { keyword: 'bahrain', code: 'BH' },
  { keyword: 'amman', code: 'JO' },
  { keyword: 'baghdad', code: 'IQ' },
  { keyword: 'casablanca', code: 'MA' },
  { keyword: 'algiers', code: 'DZ' },
  { keyword: 'tunis', code: 'TN' },
  { keyword: 'beirut', code: 'LB' },
  { keyword: 'gaza', code: 'PS' },
  { keyword: 'hebron', code: 'PS' },
  { keyword: 'jerusalem', code: 'PS' },
  { keyword: 'khartoum', code: 'SD' },
  { keyword: 'tripoli', code: 'LY' },
  { keyword: 'aden', code: 'YE' },
  { keyword: 'damascus', code: 'SY' },
  { keyword: 'nouakchott', code: 'MR' },
  { keyword: 'djibouti', code: 'DJ' },
  { keyword: 'mogadishu', code: 'SO' },
  { keyword: 'comoro', code: 'KM' },
];

export function detectDefaultCountryFromLocale(params?: {
  timeZone?: string;
  languages?: readonly string[];
}): CountryCode {
  try {
    const tz =
      params?.timeZone ??
      (typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : '');
    const langs =
      params?.languages ??
      (typeof navigator !== 'undefined'
        ? navigator.languages ?? [navigator.language]
        : []);

    const normalizedTz = String(tz || '').toLowerCase();
    const normalizedLangs = langs.map((l) => String(l).toLowerCase());

    for (const rule of TZ_COUNTRY_RULES) {
      if (normalizedTz.includes(rule.keyword)) {
        return rule.code;
      }
    }

    for (const option of COUNTRY_OPTIONS) {
      if (option.code === 'INTL') continue;
      const suffix = `-${option.code.toLowerCase()}`;
      if (
        normalizedLangs.some(
          (l) => l === `ar${suffix}` || l.endsWith(suffix)
        )
      ) {
        return option.code;
      }
    }
  } catch {
    // Fallback cleanly
  }
  return 'INTL';
}

export function getCountryPricing(countryCode: CountryCode): CountryOption {
  return (
    COUNTRY_OPTIONS.find((c) => c.code === countryCode) ??
    COUNTRY_OPTIONS[COUNTRY_OPTIONS.length - 1]
  );
}

export function getPaymentMethodsForCountry(
  countryCode: CountryCode
): LocalizedPaymentMethod[] {
  const ids = COUNTRY_PAYMENT_METHOD_IDS[countryCode] ?? COUNTRY_PAYMENT_METHOD_IDS.INTL;
  return ids.map((id) => PAYMENT_METHOD_CATALOG[id]);
}

export function getPaymentMethodLabelAr(methodId: CustomerPaymentMethodId): string {
  return PAYMENT_METHOD_CATALOG[methodId]?.labelAr ?? methodId;
}

export function getPayoutMethodLabelAr(methodId: DeveloperPayoutMethodId): string {
  return (
    DEVELOPER_PAYOUT_METHODS.find((m) => m.id === methodId)?.labelAr ?? methodId
  );
}

export function createInitialFinanceState(): PlatformFinanceState {
  return {
    totalRevenueEgp: 0,
    totalRevenueUsd: 0,
    withdrawnEgp: 0,
    withdrawnUsd: 0,
    sales: [],
    payouts: [],
  };
}

export function getAvailableBalances(state: PlatformFinanceState): {
  availableEgp: number;
  availableUsd: number;
} {
  return {
    availableEgp: Math.max(0, state.totalRevenueEgp - state.withdrawnEgp),
    availableUsd: Math.max(0, state.totalRevenueUsd - state.withdrawnUsd),
  };
}

export function recordVipPurchase(
  state: PlatformFinanceState,
  params: {
    buyerUserId: string;
    buyerUsername: string;
    buyerNickname: string;
    countryCode: CountryCode;
    paymentMethod: CustomerPaymentMethodId;
    paymentReference: string;
    now?: number;
  }
): {
  success: boolean;
  nextState: PlatformFinanceState;
  sale: VipSaleRecord | null;
  errorAr?: string;
} {
  const rawRef = params.paymentReference.trim();
  const threat = detectMaliciousPayload(rawRef, { checkSqlInjection: true });
  if (!threat.safe) {
    return {
      success: false,
      nextState: state,
      sale: null,
      errorAr: threat.reasonAr,
    };
  }

  const cleanRef = sanitizeTextInput(rawRef, { maxLength: 64 });
  if (cleanRef.length < 3) {
    return {
      success: false,
      nextState: state,
      sale: null,
      errorAr: 'يرجى إدخال بيانات وسيلة الدفع المختارة (3 أحرف فأكثر).',
    };
  }

  const allowedMethods = getPaymentMethodsForCountry(params.countryCode);
  if (!allowedMethods.some((m) => m.id === params.paymentMethod)) {
    return {
      success: false,
      nextState: state,
      sale: null,
      errorAr: 'وسيلة الدفع المختارة غير متاحة لهذه الدولة.',
    };
  }

  const pricing = getCountryPricing(params.countryCode);
  const now = params.now ?? Date.now();
  const maskedRef =
    cleanRef.length > 6
      ? `${cleanRef.slice(0, 3)}***${cleanRef.slice(-3)}`
      : cleanRef;

  const sale: VipSaleRecord = {
    id: `sale_${now}_${Math.floor(Math.random() * 10000)}`,
    buyerUserId: isSafeRecordKey(params.buyerUserId)
      ? params.buyerUserId
      : 'guest_user',
    buyerUsername: sanitizeTextInput(params.buyerUsername || 'guest', {
      maxLength: 32,
    }),
    buyerNickname: sanitizeTextInput(params.buyerNickname || 'زائر المنصة', {
      maxLength: 40,
    }),
    countryCode: pricing.code,
    currency: pricing.settlementCurrency,
    amount: pricing.settlementAmount,
    localCurrency: pricing.currency,
    localAmount: pricing.priceAmount,
    paymentMethod: params.paymentMethod,
    paymentAccountMasked: maskedRef,
    createdAt: now,
  };

  const nextState: PlatformFinanceState = {
    ...state,
    totalRevenueEgp:
      pricing.settlementCurrency === 'EGP'
        ? state.totalRevenueEgp + pricing.settlementAmount
        : state.totalRevenueEgp,
    totalRevenueUsd:
      pricing.settlementCurrency === 'USD'
        ? state.totalRevenueUsd + pricing.settlementAmount
        : state.totalRevenueUsd,
    sales: [sale, ...state.sales].slice(0, 200),
  };

  return {
    success: true,
    nextState,
    sale,
  };
}

export function processDeveloperWithdrawal(
  state: PlatformFinanceState,
  params: {
    currency: CurrencyCode;
    amount: number;
    method: DeveloperPayoutMethodId;
    destination: string;
    now?: number;
  }
): {
  success: boolean;
  nextState: PlatformFinanceState;
  payout: DeveloperPayoutRecord | null;
  errorAr?: string;
} {
  const { availableEgp, availableUsd } = getAvailableBalances(state);
  const available = params.currency === 'EGP' ? availableEgp : availableUsd;

  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    return {
      success: false,
      nextState: state,
      payout: null,
      errorAr: 'يرجى إدخال مبلغ سحب صالح أكبر من الصفر.',
    };
  }

  const roundedAmount = Math.round(params.amount * 100) / 100;
  if (roundedAmount > available) {
    return {
      success: false,
      nextState: state,
      payout: null,
      errorAr: `الرصيد المتاح بعملة ${params.currency} لا يكفي لإتمام هذا السحب.`,
    };
  }

  const rawDest = params.destination.trim();
  const threat = detectMaliciousPayload(rawDest, { checkSqlInjection: true });
  if (!threat.safe) {
    return {
      success: false,
      nextState: state,
      payout: null,
      errorAr: threat.reasonAr,
    };
  }

  const cleanDest = sanitizeTextInput(rawDest, { maxLength: 80 });
  if (cleanDest.length < 4) {
    return {
      success: false,
      nextState: state,
      payout: null,
      errorAr: 'يرجى إدخال حساب أو عنوان الاستلام بشكل صحيح.',
    };
  }

  if (!DEVELOPER_PAYOUT_METHODS.some((m) => m.id === params.method)) {
    return {
      success: false,
      nextState: state,
      payout: null,
      errorAr: 'طريقة السحب المختارة غير مدعومة.',
    };
  }

  const now = params.now ?? Date.now();
  const payout: DeveloperPayoutRecord = {
    id: `pay_${now}_${Math.floor(Math.random() * 10000)}`,
    currency: params.currency,
    amount: roundedAmount,
    method: params.method,
    destination: cleanDest,
    status: 'completed',
    createdAt: now,
  };

  const nextState: PlatformFinanceState = {
    ...state,
    withdrawnEgp:
      params.currency === 'EGP'
        ? state.withdrawnEgp + roundedAmount
        : state.withdrawnEgp,
    withdrawnUsd:
      params.currency === 'USD'
        ? state.withdrawnUsd + roundedAmount
        : state.withdrawnUsd,
    payouts: [payout, ...state.payouts].slice(0, 200),
  };

  return {
    success: true,
    nextState,
    payout,
  };
}

export function sanitizePlatformFinanceState(raw: unknown): PlatformFinanceState {
  if (!raw || typeof raw !== 'object') return createInitialFinanceState();
  const c = raw as Partial<PlatformFinanceState>;

  const safeNum = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;

  const sales: VipSaleRecord[] = Array.isArray(c.sales)
    ? c.sales
        .filter(
          (s): s is VipSaleRecord =>
            Boolean(s) &&
            typeof s === 'object' &&
            typeof s.id === 'string' &&
            typeof s.buyerUsername === 'string' &&
            (s.currency === 'EGP' || s.currency === 'USD') &&
            typeof s.amount === 'number' &&
            Number.isFinite(s.amount) &&
            s.amount > 0 &&
            typeof s.createdAt === 'number'
        )
        .slice(0, 200)
    : [];

  const payouts: DeveloperPayoutRecord[] = Array.isArray(c.payouts)
    ? c.payouts
        .filter(
          (p): p is DeveloperPayoutRecord =>
            Boolean(p) &&
            typeof p === 'object' &&
            typeof p.id === 'string' &&
            (p.currency === 'EGP' || p.currency === 'USD') &&
            typeof p.amount === 'number' &&
            Number.isFinite(p.amount) &&
            p.amount > 0 &&
            typeof p.destination === 'string' &&
            typeof p.createdAt === 'number'
        )
        .slice(0, 200)
    : [];

  return {
    totalRevenueEgp: safeNum(c.totalRevenueEgp),
    totalRevenueUsd: safeNum(c.totalRevenueUsd),
    withdrawnEgp: safeNum(c.withdrawnEgp),
    withdrawnUsd: safeNum(c.withdrawnUsd),
    sales,
    payouts,
  };
}

export function loadPlatformFinanceFromStorage(): PlatformFinanceState {
  if (typeof window === 'undefined') return createInitialFinanceState();
  try {
    const raw = window.localStorage.getItem(FINANCE_STORAGE_KEY);
    if (!raw) return createInitialFinanceState();
    return sanitizePlatformFinanceState(JSON.parse(raw));
  } catch {
    return createInitialFinanceState();
  }
}

export function savePlatformFinanceToStorage(state: PlatformFinanceState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadVipStatusMapFromStorage(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(VIP_PRIVILEGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (isSafeRecordKey(k) && typeof v === 'number' && Number.isFinite(v)) {
        clean[k] = v;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

export function saveVipStatusMapToStorage(map: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VIP_PRIVILEGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}
