export type SupportedLanguage = 'en' | 'am';

export type TranslationKey =
  | 'badRequest'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'internalServerError'
  | 'serviceUnavailable'
  | 'validationFailed'
  | 'tooManyRequests';

const translations: Record<TranslationKey, Record<SupportedLanguage, string>> = {
  badRequest: {
    en: 'Bad request',
    am: 'ትክክለኛ ያልሆነ ጥያቄ',
  },
  unauthorized: {
    en: 'Unauthorized',
    am: 'ያልተፈቀደ ተጠቃሚ',
  },
  forbidden: {
    en: 'Forbidden',
    am: 'ፈቃድ የለዎትም',
  },
  notFound: {
    en: 'Resource not found',
    am: 'ሀብቱ አልተገኘም',
  },
  conflict: {
    en: 'Conflict',
    am: 'ግጭት ተፈጥሯል',
  },
  internalServerError: {
    en: 'An unexpected error occurred. Please try again later.',
    am: 'ያልተጠበቀ ስህተት ተፈጥሯል። እባክዎ ቆይተው ይሞክሩ።',
  },
  serviceUnavailable: {
    en: 'Service is temporarily unavailable. Please try again later.',
    am: 'አገልግሎቱ ለጊዜው አይገኝም። እባክዎ ቆይተው ይሞክሩ።',
  },
  validationFailed: {
    en: 'Validation failed',
    am: 'ማረጋገጫ አልተሳካም',
  },
  tooManyRequests: {
    en: 'Too many requests. Please slow down.',
    am: 'ብዙ ጥያቄዎች ተልከዋል። እባክዎ ቀስ ይበሉ።',
  },
};

/**
 * Returns the translated message for the given key and language.
 * Falls back to English if the key or language is not found.
 */
export function getTranslation(
  key: string,
  lang: string,
): string {
  const entry = translations[key as TranslationKey];
  if (!entry) return key;

  const normalizedLang = lang.startsWith('am') ? 'am' : 'en';
  return entry[normalizedLang] ?? entry['en'];
}
