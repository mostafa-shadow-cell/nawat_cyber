import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRY_OPTIONS,
  VIP_PRICE_EGP,
  VIP_PRICE_USD,
  createInitialFinanceState,
  detectDefaultCountryFromLocale,
  getAvailableBalances,
  getCountryPricing,
  getPaymentMethodsForCountry,
  processDeveloperWithdrawal,
  recordVipPurchase,
  sanitizePlatformFinanceState,
} from './finance';

test('COUNTRY_OPTIONS includes all 22 Arab League nations explicitly plus INTL fallback', () => {
  const expectedArabCodes = [
    'EG',
    'SA',
    'AE',
    'KW',
    'QA',
    'OM',
    'BH',
    'JO',
    'IQ',
    'MA',
    'DZ',
    'TN',
    'LB',
    'PS',
    'SD',
    'LY',
    'YE',
    'SY',
    'MR',
    'DJ',
    'SO',
    'KM',
  ];
  const arabOptions = COUNTRY_OPTIONS.filter((c) => c.isArabLeague);
  assert.equal(arabOptions.length, 22);
  for (const code of expectedArabCodes) {
    assert.ok(
      arabOptions.some((o) => o.code === code),
      `Missing Arab country code: ${code}`
    );
  }
  assert.ok(COUNTRY_OPTIONS.some((o) => o.code === 'INTL'));
});

test('detectDefaultCountryFromLocale and getCountryPricing detect Arab locales and convert currencies accurately', () => {
  assert.equal(
    detectDefaultCountryFromLocale({ timeZone: 'Africa/Cairo', languages: ['ar-EG'] }),
    'EG'
  );
  assert.equal(
    detectDefaultCountryFromLocale({ timeZone: 'Asia/Riyadh', languages: ['ar-SA'] }),
    'SA'
  );
  assert.equal(
    detectDefaultCountryFromLocale({ timeZone: 'Asia/Kuwait', languages: ['ar-KW'] }),
    'KW'
  );
  assert.equal(
    detectDefaultCountryFromLocale({ timeZone: 'Africa/Casablanca', languages: ['ar-MA'] }),
    'MA'
  );
  assert.equal(
    detectDefaultCountryFromLocale({ timeZone: 'America/New_York', languages: ['en-US'] }),
    'INTL'
  );

  const eg = getCountryPricing('EG');
  assert.equal(eg.currency, 'EGP');
  assert.equal(eg.priceAmount, VIP_PRICE_EGP);
  assert.equal(eg.settlementCurrency, 'EGP');
  assert.equal(eg.settlementAmount, 500);

  const sa = getCountryPricing('SA');
  assert.equal(sa.currency, 'SAR');
  assert.equal(sa.priceAmount, 56.25);
  assert.equal(sa.settlementCurrency, 'USD');
  assert.equal(sa.settlementAmount, VIP_PRICE_USD);

  const kw = getCountryPricing('KW');
  assert.equal(kw.currency, 'KWD');
  assert.equal(kw.formattedPrice, '4.60 KWD');

  const ma = getCountryPricing('MA');
  assert.equal(ma.currency, 'MAD');
  assert.equal(ma.formattedPrice, '149 MAD');

  const intl = getCountryPricing('INTL');
  assert.equal(intl.currency, 'USD');
  assert.equal(intl.priceAmount, VIP_PRICE_USD);
  assert.equal(intl.priceAmount, 15);
});

test('getPaymentMethodsForCountry renders strictly localized gateways per country', () => {
  const egMethods = getPaymentMethodsForCountry('EG').map((m) => m.id);
  assert.deepEqual(egMethods, ['vodafone_cash', 'instapay', 'egypt_card']);

  const saMethods = getPaymentMethodsForCountry('SA').map((m) => m.id);
  assert.deepEqual(saMethods, ['mada', 'stc_pay', 'apple_pay']);

  const kwMethods = getPaymentMethodsForCountry('KW').map((m) => m.id);
  assert.deepEqual(kwMethods, ['knet', 'apple_pay', 'intl_card']);

  const joMethods = getPaymentMethodsForCountry('JO').map((m) => m.id);
  assert.deepEqual(joMethods, ['cliq_jo', 'efawateercom', 'intl_card']);

  const maMethods = getPaymentMethodsForCountry('MA').map((m) => m.id);
  assert.deepEqual(maMethods, ['cmi_ma', 'cash_plus', 'intl_card']);

  const intlMethods = getPaymentMethodsForCountry('INTL').map((m) => m.id);
  assert.deepEqual(intlMethods, ['intl_card', 'paypal', 'digital_wallet']);
});

test('recordVipPurchase records EGP and USD settlement revenue with local currency tracking and blocks XSS/invalid methods', () => {
  let state = createInitialFinanceState();

  const badXss = recordVipPurchase(state, {
    buyerUserId: 'usr_1',
    buyerUsername: 'ali',
    buyerNickname: 'علي',
    countryCode: 'EG',
    paymentMethod: 'vodafone_cash',
    paymentReference: '<script>alert(1)</script>',
  });
  assert.equal(badXss.success, false);

  const mismatchedMethod = recordVipPurchase(state, {
    buyerUserId: 'usr_1',
    buyerUsername: 'fahad_sa',
    buyerNickname: 'فهد',
    countryCode: 'SA',
    paymentMethod: 'vodafone_cash',
    paymentReference: '0501234567',
  });
  assert.equal(mismatchedMethod.success, false);

  const egRes = recordVipPurchase(state, {
    buyerUserId: 'usr_1',
    buyerUsername: 'ali_eg',
    buyerNickname: 'علي المصري',
    countryCode: 'EG',
    paymentMethod: 'vodafone_cash',
    paymentReference: '01012345678',
    now: 1_700_000_000_000,
  });
  assert.equal(egRes.success, true);
  state = egRes.nextState;

  const saRes = recordVipPurchase(state, {
    buyerUserId: 'usr_2',
    buyerUsername: 'omar_sa',
    buyerNickname: 'عمر السعودي',
    countryCode: 'SA',
    paymentMethod: 'stc_pay',
    paymentReference: '0501234567',
    now: 1_700_000_100_000,
  });
  assert.equal(saRes.success, true);
  assert.equal(saRes.sale?.localCurrency, 'SAR');
  assert.equal(saRes.sale?.localAmount, 56.25);
  assert.equal(saRes.sale?.currency, 'USD');
  assert.equal(saRes.sale?.amount, 15);
  state = saRes.nextState;

  assert.equal(state.totalRevenueEgp, 500);
  assert.equal(state.totalRevenueUsd, 15);
  assert.equal(state.sales.length, 2);
});

test('processDeveloperWithdrawal deducts available balance for all payout methods and prevents overdraft', () => {
  let state = createInitialFinanceState();
  state = recordVipPurchase(state, {
    buyerUserId: 'usr_1',
    buyerUsername: 'ali_eg',
    buyerNickname: 'علي',
    countryCode: 'EG',
    paymentMethod: 'instapay',
    paymentReference: 'ali@instapay',
  }).nextState;
  state = recordVipPurchase(state, {
    buyerUserId: 'usr_2',
    buyerUsername: 'omar_sa',
    buyerNickname: 'عمر',
    countryCode: 'INTL',
    paymentMethod: 'intl_card',
    paymentReference: '4242 Omar',
  }).nextState;

  // Overdraft fails cleanly
  const tooMuch = processDeveloperWithdrawal(state, {
    currency: 'EGP',
    amount: 900,
    method: 'instapay',
    destination: 'shadow@instapay',
  });
  assert.equal(tooMuch.success, false);

  // Valid EGP withdrawal via InstaPay
  const w1 = processDeveloperWithdrawal(state, {
    currency: 'EGP',
    amount: 500,
    method: 'instapay',
    destination: 'shadow@instapay',
    now: 1_700_000_200_000,
  });
  assert.equal(w1.success, true);
  state = w1.nextState;

  // Valid USD withdrawal via Crypto/E-wallet
  const w2 = processDeveloperWithdrawal(state, {
    currency: 'USD',
    amount: 15,
    method: 'crypto_ewallet',
    destination: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
    now: 1_700_000_300_000,
  });
  assert.equal(w2.success, true);
  state = w2.nextState;

  const balances = getAvailableBalances(state);
  assert.equal(balances.availableEgp, 0);
  assert.equal(balances.availableUsd, 0);
  assert.equal(state.withdrawnEgp, 500);
  assert.equal(state.withdrawnUsd, 15);
  assert.equal(state.payouts.length, 2);

  const sanitized = sanitizePlatformFinanceState(JSON.parse(JSON.stringify(state)));
  assert.equal(sanitized.totalRevenueEgp, 500);
  assert.equal(sanitized.withdrawnUsd, 15);
});
