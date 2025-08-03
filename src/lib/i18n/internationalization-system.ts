/**
 * Internationalization System for RankPilot
 * Priority 3 Feature Implementation - DevReady Phase 3
 * 
 * Features:
 * - Multi-language support with RTL layout capabilities
 * - Dynamic language switching
 * - Pluralization and number formatting
 * - Date and time localization
 * - Accessibility-aware translations
 */

import { useEffect, useState } from 'react';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'nl' | 'ru' | 'zh' | 'ja' | 'ko' | 'ar' | 'he';

export interface TranslationKey {
    _key: string;
    defaultValue: string;
    context?: string;
    description?: string;
}

export interface PluralOptions {
    zero?: string;
    one?: string;
    two?: string;
    few?: string;
    many?: string;
    other: string;
}

export interface InterpolationValues {
    [_key: string]: string | number | Date;
}

export interface LanguageConfig {
    code: SupportedLanguage;
    name: string;
    nativeName: string;
    rtl: boolean;
    pluralRules: (count: number) => keyof PluralOptions;
    numberFormat: Intl.NumberFormatOptions;
    dateFormat: Intl.DateTimeFormatOptions;
    currencyFormat: Intl.NumberFormatOptions;
}

// Language configurations
export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
    en: {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        rtl: false,
        pluralRules: (count) => count === 1 ? 'one' : 'other',
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'USD' },
    },
    es: {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        rtl: false,
        pluralRules: (count) => count === 1 ? 'one' : 'other',
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'EUR' },
    },
    fr: {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        rtl: false,
        pluralRules: (count) => count <= 1 ? 'one' : 'other',
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'EUR' },
    },
    de: {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        rtl: false,
        pluralRules: (count) => count === 1 ? 'one' : 'other',
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'EUR' },
    },
    pt: {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        rtl: false,
        pluralRules: (count) => count === 1 ? 'one' : 'other',
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'EUR' },
    },
    it: {
        code: 'it',
        name: 'Italian',
        nativeName: 'Italiano',
        rtl: false,
        pluralRules: (count) => count === 1 ? 'one' : 'other',
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'EUR' },
    },
    nl: {
        code: 'nl',
        name: 'Dutch',
        nativeName: 'Nederlands',
        rtl: false,
        pluralRules: (count) => count === 1 ? 'one' : 'other',
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'EUR' },
    },
    ru: {
        code: 'ru',
        name: 'Russian',
        nativeName: 'Русский',
        rtl: false,
        pluralRules: (count) => {
            if (count % 10 === 1 && count % 100 !== 11) return 'one';
            if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'few';
            return 'other';
        },
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'RUB' },
    },
    zh: {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        rtl: false,
        pluralRules: () => 'other',
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'CNY' },
    },
    ja: {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        rtl: false,
        pluralRules: () => 'other',
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'JPY' },
    },
    ko: {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        rtl: false,
        pluralRules: () => 'other',
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'KRW' },
    },
    ar: {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        rtl: true,
        pluralRules: (count) => {
            if (count === 0) return 'zero';
            if (count === 1) return 'one';
            if (count === 2) return 'two';
            if (count % 100 >= 3 && count % 100 <= 10) return 'few';
            if (count % 100 >= 11) return 'many';
            return 'other';
        },
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'SAR' },
    },
    he: {
        code: 'he',
        name: 'Hebrew',
        nativeName: 'עברית',
        rtl: true,
        pluralRules: (count) => {
            if (count === 1) return 'one';
            if (count === 2) return 'two';
            if (count % 10 === 0 && count !== 0) return 'many';
            return 'other';
        },
        numberFormat: { notation: 'standard' },
        dateFormat: { month: 'long', day: 'numeric', year: 'numeric' },
        currencyFormat: { style: 'currency', currency: 'ILS' },
    },
};

// Default translations
const DEFAULT_TRANSLATIONS: Record<string, Record<SupportedLanguage, string | PluralOptions>> = {
    // Navigation
    'nav.dashboard': {
        en: 'Dashboard',
        es: 'Panel de Control',
        fr: 'Tableau de Bord',
        de: 'Dashboard',
        pt: 'Painel',
        it: 'Cruscotto',
        nl: 'Dashboard',
        ru: 'Панель управления',
        zh: '仪表板',
        ja: 'ダッシュボード',
        ko: '대시보드',
        ar: 'لوحة القيادة',
        he: 'לוח בקרה',
    },
    'nav.tools': {
        en: 'SEO Tools',
        es: 'Herramientas SEO',
        fr: 'Outils SEO',
        de: 'SEO-Tools',
        pt: 'Ferramentas SEO',
        it: 'Strumenti SEO',
        nl: 'SEO-tools',
        ru: 'SEO инструменты',
        zh: 'SEO工具',
        ja: 'SEOツール',
        ko: 'SEO 도구',
        ar: 'أدوات السيو',
        he: 'כלי SEO',
    },
    'nav.analytics': {
        en: 'Analytics',
        es: 'Analíticas',
        fr: 'Analytique',
        de: 'Analytik',
        pt: 'Análises',
        it: 'Analisi',
        nl: 'Analytics',
        ru: 'Аналитика',
        zh: '分析',
        ja: '分析',
        ko: '분석',
        ar: 'التحليلات',
        he: 'אנליטיקה',
    },

    // Common actions
    'action.save': {
        en: 'Save',
        es: 'Guardar',
        fr: 'Enregistrer',
        de: 'Speichern',
        pt: 'Salvar',
        it: 'Salva',
        nl: 'Opslaan',
        ru: 'Сохранить',
        zh: '保存',
        ja: '保存',
        ko: '저장',
        ar: 'حفظ',
        he: 'שמור',
    },
    'action.cancel': {
        en: 'Cancel',
        es: 'Cancelar',
        fr: 'Annuler',
        de: 'Abbrechen',
        pt: 'Cancelar',
        it: 'Annulla',
        nl: 'Annuleren',
        ru: 'Отмена',
        zh: '取消',
        ja: 'キャンセル',
        ko: '취소',
        ar: 'إلغاء',
        he: 'בטל',
    },
    'action.delete': {
        en: 'Delete',
        es: 'Eliminar',
        fr: 'Supprimer',
        de: 'Löschen',
        pt: 'Excluir',
        it: 'Elimina',
        nl: 'Verwijderen',
        ru: 'Удалить',
        zh: '删除',
        ja: '削除',
        ko: '삭제',
        ar: 'حذف',
        he: 'מחק',
    },

    // Status messages
    'status.loading': {
        en: 'Loading...',
        es: 'Cargando...',
        fr: 'Chargement...',
        de: 'Wird geladen...',
        pt: 'Carregando...',
        it: 'Caricamento...',
        nl: 'Laden...',
        ru: 'Загрузка...',
        zh: '加载中...',
        ja: '読み込み中...',
        ko: '로딩 중...',
        ar: 'جاري التحميل...',
        he: 'טוען...',
    },
    'status.error': {
        en: 'An error occurred',
        es: 'Ocurrió un error',
        fr: 'Une erreur s\'est produite',
        de: 'Ein Fehler ist aufgetreten',
        pt: 'Ocorreu um erro',
        it: 'Si è verificato un errore',
        nl: 'Er is een fout opgetreden',
        ru: 'Произошла ошибка',
        zh: '发生错误',
        ja: 'エラーが発生しました',
        ko: '오류가 발생했습니다',
        ar: 'حدث خطأ',
        he: 'אירעה שגיאה',
    },

    // Pluralization examples
    'items.count': {
        en: {
            zero: 'No items',
            one: '1 item',
            other: '{{count}} items',
        },
        es: {
            zero: 'Sin elementos',
            one: '1 elemento',
            other: '{{count}} elementos',
        },
        fr: {
            zero: 'Aucun élément',
            one: '1 élément',
            other: '{{count}} éléments',
        },
        de: {
            zero: 'Keine Elemente',
            one: '1 Element',
            other: '{{count}} Elemente',
        },
        pt: {
            zero: 'Nenhum item',
            one: '1 item',
            other: '{{count}} itens',
        },
        it: {
            zero: 'Nessun elemento',
            one: '1 elemento',
            other: '{{count}} elementi',
        },
        nl: {
            zero: 'Geen items',
            one: '1 item',
            other: '{{count}} items',
        },
        ru: {
            zero: 'Нет элементов',
            one: '1 элемент',
            few: '{{count}} элемента',
            other: '{{count}} элементов',
        },
        zh: {
            other: '{{count}} 项目',
        },
        ja: {
            other: '{{count}} 項目',
        },
        ko: {
            other: '{{count}} 항목',
        },
        ar: {
            zero: 'لا توجد عناصر',
            one: 'عنصر واحد',
            two: 'عنصران',
            few: '{{count}} عناصر',
            many: '{{count}} عنصراً',
            other: '{{count}} عنصر',
        },
        he: {
            zero: 'אין פריטים',
            one: 'פריט אחד',
            two: 'שני פריטים',
            many: '{{count}} פריטים',
            other: '{{count}} פריטים',
        },
    },
};

export class InternationalizationSystem {
    private static instance: InternationalizationSystem;
    private currentLanguage: SupportedLanguage = 'en';
    private translations: Record<string, Record<SupportedLanguage, string | PluralOptions>> = { ...DEFAULT_TRANSLATIONS };
    private listeners: Set<(language: SupportedLanguage) => void> = new Set();

    private constructor() {
        this.detectBrowserLanguage();
        this.applyLanguageSettings();
    }

    static getInstance(): InternationalizationSystem {
        if (!InternationalizationSystem.instance) {
            InternationalizationSystem.instance = new InternationalizationSystem();
        }
        return InternationalizationSystem.instance;
    }

    private detectBrowserLanguage(): void {
        if (typeof window === 'undefined') return;

        const stored = localStorage.getItem('rankpilot-language');
        if (stored && this.isSupportedLanguage(stored)) {
            this.currentLanguage = stored as SupportedLanguage;
            return;
        }

        const browserLanguage = navigator.language.toLowerCase();
        const languageCode = browserLanguage.split('-')[0];

        if (this.isSupportedLanguage(languageCode)) {
            this.currentLanguage = languageCode as SupportedLanguage;
        }
    }

    private isSupportedLanguage(code: string): boolean {
        return Object.keys(LANGUAGE_CONFIGS).includes(code);
    }

    private applyLanguageSettings(): void {
        if (typeof document === 'undefined') return;

        const config = LANGUAGE_CONFIGS[this.currentLanguage];

        // Set document language and direction
        document.documentElement.lang = config.code;
        document.documentElement.dir = config.rtl ? 'rtl' : 'ltr';

        // Add language-specific CSS class
        document.body.className = document.body.className.replace(/lang-\w+/g, '');
        document.body.classList.add(`lang-${config.code}`);

        // Add RTL class if needed
        if (config.rtl) {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }
    }

    private saveLanguagePreference(): void {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('rankpilot-language', this.currentLanguage);
        }
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.currentLanguage));
    }

    // Public API methods
    setLanguage(language: SupportedLanguage): void {
        if (!this.isSupportedLanguage(language)) {
            console.warn(`Unsupported language: ${language}`);
            return;
        }

        this.currentLanguage = language;
        this.applyLanguageSettings();
        this.saveLanguagePreference();
        this.notifyListeners();
    }

    getLanguage(): SupportedLanguage {
        return this.currentLanguage;
    }

    getLanguageConfig(): LanguageConfig {
        return LANGUAGE_CONFIGS[this.currentLanguage];
    }

    isRTL(): boolean {
        return LANGUAGE_CONFIGS[this.currentLanguage].rtl;
    }

    // Translation methods
    translate(key: string, values?: InterpolationValues): string {
        const translation = this.translations[key];
        if (!translation) {
            console.warn(`Translation missing for _key: ${key}`);
            return key;
        }

        const languageTranslation = translation[this.currentLanguage];
        if (!languageTranslation) {
            // Fallback to English
            const englishTranslation = translation.en;
            if (typeof englishTranslation === 'string') {
                return this.interpolate(englishTranslation, values);
            }
            console.warn(`Translation missing for _key: ${key} in language: ${this.currentLanguage}`);
            return key;
        }

        if (typeof languageTranslation === 'string') {
            return this.interpolate(languageTranslation, values);
        }

        console.warn(`Invalid translation format for _key: ${key}`);
        return key;
    }

    translatePlural(key: string, count: number, values?: InterpolationValues): string {
        const translation = this.translations[key];
        if (!translation) {
            console.warn(`Translation missing for _key: ${key}`);
            return key;
        }

        const languageTranslation = translation[this.currentLanguage];
        if (!languageTranslation || typeof languageTranslation === 'string') {
            console.warn(`Plural translation missing for _key: ${key} in language: ${this.currentLanguage}`);
            return key;
        }

        const config = LANGUAGE_CONFIGS[this.currentLanguage];
        const pluralRule = config.pluralRules(count);
        const pluralTranslation = languageTranslation[pluralRule] || languageTranslation.other;

        if (!pluralTranslation) {
            console.warn(`Plural form missing for _key: ${key}, rule: ${pluralRule}`);
            return key;
        }

        return this.interpolate(pluralTranslation, { count, ...values });
    }

    private interpolate(template: string, values?: InterpolationValues): string {
        if (!values) return template;

        return template.replace(/{{(\w+)}}/g, (match, key) => {
            const value = values[key];
            if (value === undefined) return match;
            return String(value);
        });
    }

    // Formatting methods
    formatNumber(number: number, options?: Intl.NumberFormatOptions): string {
        const config = LANGUAGE_CONFIGS[this.currentLanguage];
        const formatOptions = { ...config.numberFormat, ...options };
        return new Intl.NumberFormat(this.currentLanguage, formatOptions).format(number);
    }

    formatCurrency(amount: number, currency?: string): string {
        const config = LANGUAGE_CONFIGS[this.currentLanguage];
        const formatOptions = { ...config.currencyFormat };
        if (currency) {
            formatOptions.currency = currency;
        }
        return new Intl.NumberFormat(this.currentLanguage, formatOptions).format(amount);
    }

    formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
        const config = LANGUAGE_CONFIGS[this.currentLanguage];
        const formatOptions = { ...config.dateFormat, ...options };
        return new Intl.DateTimeFormat(this.currentLanguage, formatOptions).format(date);
    }

    formatRelativeTime(date: Date): string {
        const now = new Date();
        const diffInSeconds = (now.getTime() - date.getTime()) / 1000;
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        const rtf = new Intl.RelativeTimeFormat(this.currentLanguage, { numeric: 'auto' });

        if (diffInDays > 0) {
            return rtf.format(-diffInDays, 'day');
        } else if (diffInHours > 0) {
            return rtf.format(-diffInHours, 'hour');
        } else if (diffInMinutes > 0) {
            return rtf.format(-diffInMinutes, 'minute');
        } else {
            return rtf.format(-Math.floor(diffInSeconds), 'second');
        }
    }

    // Translation management
    addTranslations(translations: Record<string, Record<SupportedLanguage, string | PluralOptions>>): void {
        this.translations = { ...this.translations, ...translations };
    }

    getAvailableLanguages(): LanguageConfig[] {
        return Object.values(LANGUAGE_CONFIGS);
    }

    // Event subscription
    subscribe(listener: (language: SupportedLanguage) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

// Export singleton instance
export const i18nSystem = InternationalizationSystem.getInstance();

// React hook for internationalization
export function useI18n() {
    const [language, setLanguage] = useState<SupportedLanguage>(() => i18nSystem.getLanguage());
    const [config, setConfig] = useState<LanguageConfig>(() => i18nSystem.getLanguageConfig());

    useEffect(() => {
        return i18nSystem.subscribe((newLanguage) => {
            setLanguage(newLanguage);
            setConfig(i18nSystem.getLanguageConfig());
        });
    }, []);

    return {
        language,
        config,
        isRTL: config.rtl,
        setLanguage: i18nSystem.setLanguage.bind(i18nSystem),
        translate: i18nSystem.translate.bind(i18nSystem),
        translatePlural: i18nSystem.translatePlural.bind(i18nSystem),
        formatNumber: i18nSystem.formatNumber.bind(i18nSystem),
        formatCurrency: i18nSystem.formatCurrency.bind(i18nSystem),
        formatDate: i18nSystem.formatDate.bind(i18nSystem),
        formatRelativeTime: i18nSystem.formatRelativeTime.bind(i18nSystem),
        availableLanguages: i18nSystem.getAvailableLanguages(),
    };
}

// Helper function for translations
export function t(_key: string, values?: InterpolationValues): string {
    return i18nSystem.translate(_key, values);
}

// Helper function for plural translations
export function tp(_key: string, count: number, values?: InterpolationValues): string {
    return i18nSystem.translatePlural(_key, count, values);
}
