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
    key: string;
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
    [key: string]: string | number | Date;
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

    // Settings: Language (core subset used by language selector & settings page)
    'settings.language': {
        en: 'Language', es: 'Idioma', fr: 'Langue', de: 'Sprache', pt: 'Idioma', it: 'Lingua', nl: 'Taal', ru: 'Язык', zh: '语言', ja: '言語', ko: '언어', ar: 'اللغة', he: 'שפה'
    },
    'settings.selectLanguage': {
        en: 'Select Language', es: 'Seleccionar idioma', fr: 'Sélectionner la langue', de: 'Sprache wählen', pt: 'Selecionar idioma', it: 'Seleziona lingua', nl: 'Selecteer taal', ru: 'Выберите язык', zh: '选择语言', ja: '言語を選択', ko: '언어 선택', ar: 'اختر اللغة', he: 'בחר שפה'
    },
    'settings.languageDescription': {
        en: 'Choose your interface language', es: 'Elige el idioma de la interfaz', fr: 'Choisissez la langue de l’interface', de: 'Wählen Sie Ihre Oberflächensprache', pt: 'Escolha o idioma da interface', it: 'Scegli la lingua dell’interfaccia', nl: 'Kies uw interface taal', ru: 'Выберите язык интерфейса', zh: '选择界面语言', ja: 'インターフェース言語を選択', ko: '인터페이스 언어 선택', ar: 'اختر لغة الواجهة', he: 'בחר שפת ממשק'
    },
    // (Granular settings.language.* keys in UI supply inline fallbacks; add later if needed for full localization)

    // Command Palette
    'commandPalette.open': {
        en: 'Command palette', es: 'Paleta de comandos', fr: 'Palette de commandes', de: 'Befehlspalette', pt: 'Paleta de comandos', it: 'Palette comandi', nl: 'Opdrachtpalet', ru: 'Палитра команд', zh: '命令面板', ja: 'コマンドパレット', ko: '명령 팔레트', ar: 'لوحة الأوامر', he: 'פלטת פקודות'
    },
    'commandPalette.shortcut': {
        en: 'Ctrl/Cmd + K', es: 'Ctrl/Cmd + K', fr: 'Ctrl/Cmd + K', de: 'Strg/Cmd + K', pt: 'Ctrl/Cmd + K', it: 'Ctrl/Cmd + K', nl: 'Ctrl/Cmd + K', ru: 'Ctrl/Cmd + K', zh: 'Ctrl/Cmd + K', ja: 'Ctrl/Cmd + K', ko: 'Ctrl/Cmd + K', ar: 'Ctrl/Cmd + K', he: 'Ctrl/Cmd + K'
    },
    'commandPalette.title': { en: 'Quick Actions', es: 'Acciones Rápidas', fr: 'Actions Rapides', de: 'Schnellaktionen', pt: 'Ações Rápidas', it: 'Azioni Rapide', nl: 'Snelle Acties', ru: 'Быстрые действия', zh: '快速操作', ja: 'クイックアクション', ko: '빠른 작업', ar: 'إجراءات سريعة', he: 'פעולות מהירות' },
    'commandPalette.escHint': { en: 'Press Esc to close', es: 'Pulsa Esc para cerrar', fr: 'Appuyez sur Échap pour fermer', de: 'Esc zum Schließen', pt: 'Pressione Esc para fechar', it: 'Premi Esc per chiudere', nl: 'Druk Esc om te sluiten', ru: 'Нажмите Esc для закрытия', zh: '按 Esc 关闭', ja: 'Esc で閉じる', ko: 'Esc 로 닫기', ar: 'اضغط Esc للإغلاق', he: 'Esc לסגירה' },
    'commandPalette.section.search': { en: 'Search', es: 'Buscar', fr: 'Recherche', de: 'Suche', pt: 'Pesquisar', it: 'Cerca', nl: 'Zoeken', ru: 'Поиск', zh: '搜索', ja: '検索', ko: '검색', ar: 'بحث', he: 'חיפוש' },
    'commandPalette.section.interface': { en: 'Interface', es: 'Interfaz', fr: 'Interface', de: 'Interface', pt: 'Interface', it: 'Interfaccia', nl: 'Interface', ru: 'Интерфейс', zh: '界面', ja: 'インターフェース', ko: '인터페이스', ar: 'الواجهة', he: 'ממשק' },
    'commandPalette.theme.label': { en: 'Theme', es: 'Tema', fr: 'Thème', de: 'Thema', pt: 'Tema', it: 'Tema', nl: 'Thema', ru: 'Тема', zh: '主题', ja: 'テーマ', ko: '테마', ar: 'السمة', he: 'ערכת נושא' },
    'commandPalette.section.account': { en: 'Account', es: 'Cuenta', fr: 'Compte', de: 'Konto', pt: 'Conta', it: 'Account', nl: 'Account', ru: 'Аккаунт', zh: '账户', ja: 'アカウント', ko: '계정', ar: 'الحساب', he: 'חשבון' },
    'commandPalette.login': { en: 'Log in', es: 'Iniciar sesión', fr: 'Se connecter', de: 'Anmelden', pt: 'Entrar', it: 'Accedi', nl: 'Inloggen', ru: 'Войти', zh: '登录', ja: 'ログイン', ko: '로그인', ar: 'تسجيل الدخول', he: 'התחבר' },

    // Settings headers & tabs
    'settings.header.title': { en: 'Account Settings', es: 'Configuración de la cuenta', fr: 'Paramètres du compte', de: 'Kontoeinstellungen', pt: 'Configurações da conta', it: 'Impostazioni account', nl: 'Accountinstellingen', ru: 'Настройки аккаунта', zh: '账户设置', ja: 'アカウント設定', ko: '계정 설정', ar: 'إعدادات الحساب', he: 'הגדרות חשבון' },
    'settings.header.desc': { en: 'Manage your preferences and configuration', es: 'Administra tus preferencias y configuración', fr: 'Gérez vos préférences et configurations', de: 'Verwalten Sie Ihre Präferenzen und Konfiguration', pt: 'Gerencie suas preferências e configurações', it: 'Gestisci preferenze e configurazioni', nl: 'Beheer uw voorkeuren en configuraties', ru: 'Управляйте своими настройками', zh: '管理您的首选项和配置', ja: '設定と環境を管理', ko: '환경설정과 구성을 관리', ar: 'إدارة التفضيلات والإعدادات', he: 'נהל העדפות והגדרות' },
    'common.secure': { en: 'Secure', es: 'Seguro', fr: 'Sécurisé', de: 'Sicher', pt: 'Seguro', it: 'Sicuro', nl: 'Veilig', ru: 'Безопасно', zh: '安全', ja: '安全', ko: '안전', ar: 'آمن', he: 'מאובטח' },
    'status.ready': { en: 'Ready', es: 'Listo', fr: 'Prêt', de: 'Bereit', pt: 'Pronto', it: 'Pronto', nl: 'Gereed', ru: 'Готово', zh: '就绪', ja: '準備完了', ko: '준비됨', ar: 'جاهز', he: 'מוכן' },
    'settings.tabs.label': { en: 'Account settings sections', es: 'Secciones de configuración de la cuenta', fr: 'Sections des paramètres du compte', de: 'Kontoeinstellungsbereiche', pt: 'Seções de configurações da conta', it: 'Sezioni impostazioni account', nl: 'Accountinstellingen secties', ru: 'Разделы настроек аккаунта', zh: '账户设置部分', ja: 'アカウント設定セクション', ko: '계정 설정 섹션', ar: 'أقسام إعدادات الحساب', he: 'מדורי הגדרות חשבון' },
    'settings.tabs.account': { en: 'Account', es: 'Cuenta', fr: 'Compte', de: 'Konto', pt: 'Conta', it: 'Account', nl: 'Account', ru: 'Аккаунт', zh: '账户', ja: 'アカウント', ko: '계정', ar: 'الحساب', he: 'חשבון' },
    'settings.tabs.theme': { en: 'Theme', es: 'Tema', fr: 'Thème', de: 'Thema', pt: 'Tema', it: 'Tema', nl: 'Thema', ru: 'Тема', zh: '主题', ja: 'テーマ', ko: '테마', ar: 'السمة', he: 'ערכת נושא' },
    'settings.tabs.accessibility': { en: 'Accessibility', es: 'Accesibilidad', fr: 'Accessibilité', de: 'Barrierefreiheit', pt: 'Acessibilidade', it: 'Accessibilità', nl: 'Toegankelijkheid', ru: 'Доступность', zh: '无障碍', ja: 'アクセシビリティ', ko: '접근성', ar: 'إمكانية الوصول', he: 'נגישות' },
    'settings.tabs.accessibilityShort': { en: 'A11y', es: 'Acc.', fr: 'Acc.', de: 'Bar.', pt: 'Aces.', it: 'Acc.', nl: 'Toeg.', ru: 'Дост.', zh: '无障', ja: 'A11y', ko: '접근', ar: 'وصول', he: 'נגיש' },
    'settings.tabs.language': { en: 'Language', es: 'Idioma', fr: 'Langue', de: 'Sprache', pt: 'Idioma', it: 'Lingua', nl: 'Taal', ru: 'Язык', zh: '语言', ja: '言語', ko: '언어', ar: 'اللغة', he: 'שפה' },
    'settings.tabs.security': { en: 'Security', es: 'Seguridad', fr: 'Sécurité', de: 'Sicherheit', pt: 'Segurança', it: 'Sicurezza', nl: 'Beveiliging', ru: 'Безопасность', zh: '安全', ja: 'セキュリティ', ko: '보안', ar: 'الأمن', he: 'אבטחה' },
    'settings.tabs.notifications': { en: 'Notifications', es: 'Notificaciones', fr: 'Notifications', de: 'Benachrichtigungen', pt: 'Notificações', it: 'Notifiche', nl: 'Meldingen', ru: 'Уведомления', zh: '通知', ja: '通知', ko: '알림', ar: 'إشعارات', he: 'התראות' },
    'settings.tabs.billing': { en: 'Billing', es: 'Facturación', fr: 'Facturation', de: 'Abrechnung', pt: 'Cobrança', it: 'Fatturazione', nl: 'Facturering', ru: 'Выставление счетов', zh: '结算', ja: '請求', ko: '결제', ar: 'الفوترة', he: 'חיוב' },
    'settings.tabs.privacy': { en: 'Privacy', es: 'Privacidad', fr: 'Confidentialité', de: 'Datenschutz', pt: 'Privacidade', it: 'Privacy', nl: 'Privacy', ru: 'Конфиденциальность', zh: '隐私', ja: 'プライバシー', ko: '개인정보', ar: 'الخصوصية', he: 'פרטיות' },

    // Accessibility section
    'settings.accessibility.title': { en: 'Accessibility Features', es: 'Funciones de Accesibilidad', fr: 'Fonctionnalités d’accessibilité', de: 'Barrierefreiheitsfunktionen', pt: 'Recursos de Acessibilidade', it: 'Funzioni di Accessibilità', nl: 'Toegankelijkheidsfuncties', ru: 'Функции доступности', zh: '辅助功能', ja: 'アクセシビリティ機能', ko: '접근성 기능', ar: 'ميزات إمكانية الوصول', he: 'תכונות נגישות' },
    'settings.accessibility.desc': { en: 'Enhance your experience with accessibility options', es: 'Mejora tu experiencia con opciones de accesibilidad', fr: 'Améliorez votre expérience avec les options d’accessibilité', de: 'Verbessern Sie Ihre Erfahrung mit Barrierefreiheitsoptionen', pt: 'Melhore sua experiência com opções de acessibilidade', it: 'Migliora l’esperienza con le opzioni di accessibilità', nl: 'Verbeter uw ervaring met toegankelijkheidsopties', ru: 'Улучшите работу с параметрами доступности', zh: '使用辅助选项提升体验', ja: 'アクセシビリティオプションで体験を向上', ko: '접근성 옵션으로 경험 향상', ar: 'عزّز تجربتك بخيارات إمكانية الوصول', he: 'שפר את החוויה עם אפשרויות נגישות' },
    'settings.accessibility.highContrast': { en: 'High Contrast Mode', es: 'Modo de alto contraste', fr: 'Mode contraste élevé', de: 'Hoher Kontrastmodus', pt: 'Modo de alto contraste', it: 'Modalità alto contrasto', nl: 'Hoog contrast modus', ru: 'Режим высокого контраста', zh: '高对比度模式', ja: 'ハイコントラストモード', ko: '고대비 모드', ar: 'وضع التباين العالي', he: 'מצב ניגודיות גבוהה' },
    'settings.accessibility.highContrastDesc': { en: 'Enhanced visibility for users with visual impairments', es: 'Visibilidad mejorada para usuarios con discapacidades visuales', fr: 'Visibilité améliorée pour les déficients visuels', de: 'Verbesserte Sichtbarkeit für sehbehinderte Nutzer', pt: 'Visibilidade aprimorada para usuários com deficiência visual', it: 'Maggiore visibilità per utenti con deficit visivo', nl: 'Verbeterde zichtbaarheid voor visueel beperkten', ru: 'Улучшенная видимость для слабовидящих пользователей', zh: '提升视障用户可见度', ja: '視覚障害者向けの視認性向上', ko: '시각 장애 사용자를 위한 가시성 향상', ar: 'رؤية محسنة للمستخدمين ذوي الإعاقات البصرية', he: 'נראות משופרת לבעלי לקות ראייה' },
    'settings.accessibility.reducedMotion': { en: 'Reduced Motion', es: 'Movimiento reducido', fr: 'Mouvements réduits', de: 'Reduzierte Animationen', pt: 'Movimento reduzido', it: 'Movimento ridotto', nl: 'Verminderde beweging', ru: 'Уменьшенное движение', zh: '减少动画', ja: '視差効果を減らす', ko: '감소된 동작', ar: 'تقليل الحركة', he: 'הפחתת תנועה' },
    'settings.accessibility.reducedMotionDesc': { en: 'Minimize animations for motion-sensitive users', es: 'Minimiza animaciones para usuarios sensibles al movimiento', fr: 'Réduire les animations pour les utilisateurs sensibles', de: 'Animationen minimieren für empfindliche Nutzer', pt: 'Minimize animações para usuários sensíveis a movimento', it: 'Riduci le animazioni per utenti sensibili', nl: 'Minimaliseer animaties voor gevoelige gebruikers', ru: 'Минимизируйте анимацию для чувствительных пользователей', zh: '为对动态敏感的用户减少动画', ja: '動きに敏感なユーザー向けにアニメを最小化', ko: '동작 민감 사용자 위한 애니메이션 최소화', ar: 'تقليل الحركات للمستخدمين الحساسين', he: 'צמצום אנימציות לרגישים' },
    'settings.accessibility.voiceCommands': { en: 'Voice Commands', es: 'Comandos de voz', fr: 'Commandes vocales', de: 'Sprachbefehle', pt: 'Comandos de voz', it: 'Comandi vocali', nl: 'Spraakopdrachten', ru: 'Голосовые команды', zh: '语音指令', ja: '音声コマンド', ko: '음성 명령', ar: 'أوامر صوتية', he: 'פקודות קוליות' },
    'settings.accessibility.voiceCommandsDesc': { en: 'Use voice commands to navigate the interface', es: 'Usa comandos de voz para navegar', fr: 'Utilisez des commandes vocales pour naviguer', de: 'Verwenden Sie Sprachbefehle zur Navigation', pt: 'Use comandos de voz para navegar', it: 'Usa comandi vocali per navigare', nl: 'Gebruik spraakopdrachten om te navigeren', ru: 'Используйте голосовые команды для навигации', zh: '使用语音命令进行导航', ja: '音声で操作', ko: '음성 명령으로 탐색', ar: 'استخدم الأوامر الصوتية للتنقل', he: 'שימוש בפקודות קוליות' },
    'settings.accessibility.liveAnnouncements': { en: 'Live Announcements', es: 'Anuncios en vivo', fr: 'Annonces en direct', de: 'Live-Ankündigungen', pt: 'Anúncios em tempo real', it: 'Annunci in tempo reale', nl: 'Live aankondigingen', ru: 'Живые объявления', zh: '实时公告', ja: 'ライブアナウンス', ko: '실시간 안내', ar: 'إعلانات مباشرة', he: 'הודעות בזמן אמת' },
    'settings.accessibility.noAnnouncements': { en: 'No recent announcements', es: 'Sin anuncios recientes', fr: 'Aucune annonce récente', de: 'Keine aktuellen Ankündigungen', pt: 'Sem anúncios recentes', it: 'Nessun annuncio recente', nl: 'Geen recente aankondigingen', ru: 'Нет недавних объявлений', zh: '暂无公告', ja: '最近の通知なし', ko: '최근 공지 없음', ar: 'لا إعلانات حديثة', he: 'אין הודעות אחרונות' },

    // Billing
    'settings.billing.title': { en: 'Billing & Subscription', es: 'Facturación y suscripción', fr: 'Facturation et abonnement', de: 'Abrechnung & Abonnement', pt: 'Faturamento e assinatura', it: 'Fatturazione e abbonamento', nl: 'Facturering & abonnement', ru: 'Выставление счетов и подписка', zh: '账单与订阅', ja: '請求とサブスクリプション', ko: '청구 및 구독', ar: 'الفوترة والاشتراك', he: 'חיוב ומנוי' },
    'settings.billing.desc': { en: 'Manage your subscription plan and billing information', es: 'Administra tu plan y datos de facturación', fr: 'Gérez votre plan et vos informations de facturation', de: 'Verwalten Sie Ihr Abo und Ihre Abrechnungsdaten', pt: 'Gerencie seu plano e dados de cobrança', it: 'Gestisci piano e fatturazione', nl: 'Beheer uw abonnement en facturatie', ru: 'Управляйте подпиской и платежной информацией', zh: '管理订阅和账单信息', ja: 'プランと請求情報を管理', ko: '구독과 결제정보 관리', ar: 'إدارة الاشتراك والفوترة', he: 'נהל את המנוי והחיוב' },
    'settings.billing.ctaTitle': { en: 'Complete Billing Management', es: 'Gestión de facturación completa', fr: 'Gestion complète de facturation', de: 'Umfassende Abrechnungsverwaltung', pt: 'Gestão completa de faturamento', it: 'Gestione completa della fatturazione', nl: 'Volledige factuurbeheer', ru: 'Полное управление счетами', zh: '完整账单管理', ja: '完全な請求管理', ko: '전체 청구 관리', ar: 'إدارة فوترة كاملة', he: 'ניהול חיוב מלא' },
    'settings.billing.ctaDesc': { en: 'Access your full billing dashboard with subscription details, payment history, and plan management.', es: 'Accede al panel de facturación con detalles, historial y gestión.', fr: 'Accédez au tableau de facturation complet avec détails et historique.', de: 'Greifen Sie auf das vollständige Abrechnungs-Dashboard zu.', pt: 'Acesse o painel completo com detalhes e histórico.', it: 'Accedi al pannello completo con dettagli e cronologia.', nl: 'Volledig factureringsdashboard met details en historie.', ru: 'Полная панель выставления счетов с деталями и историей.', zh: '访问完整账单面板，含详细与历史', ja: '請求ダッシュボードへアクセス', ko: '전체 청구 대시보드 접근', ar: 'الوصول إلى لوحة الفوترة الكاملة', he: 'גש ללוח חיוב מלא' },
    'settings.billing.go': { en: 'Go to Billing Dashboard', es: 'Ir al panel de facturación', fr: 'Aller au tableau de facturation', de: 'Zum Abrechnungs-Dashboard', pt: 'Ir ao painel de faturamento', it: 'Vai al pannello di fatturazione', nl: 'Ga naar factureringsdashboard', ru: 'Перейти к панели выставления счетов', zh: '前往账单面板', ja: '請求ダッシュボードへ', ko: '청구 대시보드 이동', ar: 'اذهب إلى لوحة الفوترة', he: 'לך ללוח חיוב' },

    // Privacy & audit trail
    'settings.privacy.auditTrail': { en: 'Privacy Audit Trail', es: 'Registro de privacidad', fr: 'Journal de confidentialité', de: 'Datenschutzprotokoll', pt: 'Trilha de auditoria de privacidade', it: 'Registro privacy', nl: 'Privacy audittrail', ru: 'Журнал конфиденциальности', zh: '隐私审计记录', ja: 'プライバシー監査ログ', ko: '개인정보 감사 기록', ar: 'سجل تدقيق الخصوصية', he: 'יומן פרטיות' },
    'settings.privacy.auditTrailDesc': { en: 'Recent privacy-related account actions', es: 'Acciones recientes relacionadas con la privacidad', fr: 'Actions récentes liées à la confidentialité', de: 'Letzte datenschutzbezogene Aktionen', pt: 'Ações recentes relacionadas à privacidade', it: 'Azioni recenti relative alla privacy', nl: 'Recente privacy-acties', ru: 'Недавние действия по конфиденциальности', zh: '近期隐私相关操作', ja: '最近のプライバシー関連操作', ko: '최근 개인정보 관련 작업', ar: 'إجراءات الخصوصية الأخيرة', he: 'פעולות פרטיות אחרונות' },
    'settings.privacy.lastExport': { en: 'Last Data Export', es: 'Última exportación', fr: 'Dernière exportation', de: 'Letzter Export', pt: 'Última exportação', it: 'Ultima esportazione', nl: 'Laatste export', ru: 'Последний экспорт', zh: '上次数据导出', ja: '最終エクスポート', ko: '마지막 내보내기', ar: 'آخر تصدير', he: 'ייצוא אחרון' },
    'settings.privacy.deletionRequested': { en: 'Deletion Requested', es: 'Eliminación solicitada', fr: 'Suppression demandée', de: 'Löschung angefordert', pt: 'Exclusão solicitada', it: 'Eliminazione richiesta', nl: 'Verwijdering aangevraagd', ru: 'Запрошено удаление', zh: '请求删除', ja: '削除を要求', ko: '삭제 요청됨', ar: 'تم طلب الحذف', he: 'בקשת מחיקה' },
    'settings.privacy.cancelDeletionConfirm': { en: 'Cancel scheduled deletion and keep your account?', es: '¿Cancelar la eliminación programada y mantener la cuenta?', fr: 'Annuler la suppression programmée et garder votre compte ?', de: 'Geplante Löschung abbrechen und Konto behalten?', pt: 'Cancelar exclusão programada e manter a conta?', it: 'Annullare l’eliminazione pianificata e mantenere l’account?', nl: 'Geplande verwijdering annuleren en account behouden?', ru: 'Отменить запланированное удаление и сохранить аккаунт?', zh: '取消计划删除并保留账户？', ja: '予定された削除をキャンセルしてアカウントを保持しますか？', ko: '예약된 삭제를 취소하고 계정을 유지하시겠습니까?', ar: 'إلغاء الحذف المجدول والاحتفاظ بالحساب؟', he: 'לבטל מחיקה מתוכננת ולשמור את החשבון?' },
    'settings.privacy.cancelDeletion': { en: 'Cancel Deletion', es: 'Cancelar eliminación', fr: 'Annuler la suppression', de: 'Löschung abbrechen', pt: 'Cancelar exclusão', it: 'Annulla eliminazione', nl: 'Verwijdering annuleren', ru: 'Отменить удаление', zh: '取消删除', ja: '削除をキャンセル', ko: '삭제 취소', ar: 'إلغاء الحذف', he: 'בטל מחיקה' },
    'settings.privacy.deletionScheduled': { en: 'Account Deletion Scheduled', es: 'Eliminación de cuenta programada', fr: 'Suppression du compte planifiée', de: 'Kontolöschung geplant', pt: 'Exclusão de conta agendada', it: 'Eliminazione account pianificata', nl: 'Accountverwijdering gepland', ru: 'Удаление аккаунта запланировано', zh: '账户删除已计划', ja: 'アカウント削除が予定されています', ko: '계정 삭제 예정', ar: 'تمت جدولة حذف الحساب', he: 'מחיקת חשבון מתוכננת' },
    'settings.privacy.deletionScheduledDesc': { en: 'Your account is pending deletion. Contact support to cancel.', es: 'Tu cuenta está pendiente de eliminación. Contacta soporte para cancelar.', fr: 'Votre compte est en attente de suppression. Contactez le support pour annuler.', de: 'Ihr Konto wird gelöscht. Support kontaktieren zum Abbrechen.', pt: 'Sua conta está pendente de exclusão. Contate o suporte para cancelar.', it: 'Eliminazione in sospeso. Contatta il supporto per annullare.', nl: 'Uw account wordt verwijderd. Neem contact op met support.', ru: 'Аккаунт ожидает удаления. Свяжитесь с поддержкой для отмены.', zh: '账户待删除，如需取消请联系支持', ja: 'アカウントは削除予定です。サポートに連絡してください。', ko: '계정 삭제 대기 중. 지원에 연락해 취소하세요.', ar: 'حسابك قيد الحذف. اتصل بالدعم للإلغاء.', he: 'החשבון ממתין למחיקה. פנה לתמיכה לביטול.' },
};

export class InternationalizationSystem {
    private static instance: InternationalizationSystem;
    private currentLanguage: SupportedLanguage = 'en';
    private translations: Record<string, Record<SupportedLanguage, string | PluralOptions>> = { ...DEFAULT_TRANSLATIONS };
    private listeners: Set<(language: SupportedLanguage) => void> = new Set();

    private constructor() {
        this.initializeLanguage();
        this.applyLanguageSettings();
    }

    static getInstance(): InternationalizationSystem {
        if (!InternationalizationSystem.instance) {
            InternationalizationSystem.instance = new InternationalizationSystem();
        }
        return InternationalizationSystem.instance;
    }

    private initializeLanguage(): void {
        // Order of precedence (client): explicit cookie -> localStorage -> browser -> default
        if (typeof window === 'undefined') return; // On server we keep default 'en' until client hydration

        // 1. Cookie (SSR parity key written by client setLanguage)
        try {
            const match = document.cookie.match(/(?:^|; )rp_lang=([^;]+)/);
            if (match) {
                const code = decodeURIComponent(match[1]);
                if (this.isSupportedLanguage(code)) {
                    this.currentLanguage = code as SupportedLanguage;
                    return;
                }
            }
        } catch { }

        // 2. LocalStorage (legacy preference)
        try {
            const stored = localStorage.getItem('rankpilot-language');
            if (stored && this.isSupportedLanguage(stored)) {
                this.currentLanguage = stored as SupportedLanguage;
                return;
            }
        } catch { }

        // 3. Browser language
        try {
            const browserLanguage = navigator.language.toLowerCase();
            const languageCode = browserLanguage.split('-')[0];
            if (this.isSupportedLanguage(languageCode)) {
                this.currentLanguage = languageCode as SupportedLanguage;
            }
        } catch { }
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
        // Preserve existing body classes (theme, accessibility) and only adjust language specific markers
        document.body.className = document.body.className.replace(/lang-\w+/g, '').trim();
        if (!document.body.classList.contains(`lang-${config.code}`)) {
            document.body.classList.add(`lang-${config.code}`);
        }

        // Add RTL class if needed
        if (config.rtl) {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }
    }

    private saveLanguagePreference(): void {
        // LocalStorage (legacy / quick access)
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('rankpilot-language', this.currentLanguage);
            }
        } catch { }
        // Cookie for SSR parity (1 year)
        try {
            if (typeof document !== 'undefined') {
                const maxAge = 60 * 60 * 24 * 365; // 1 year
                const secure = location.protocol === 'https:' ? '; Secure' : '';
                document.cookie = `rp_lang=${encodeURIComponent(this.currentLanguage)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
            }
        } catch { }
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
            console.warn(`Translation missing for key: ${key}`);
            return key;
        }

        const languageTranslation = translation[this.currentLanguage];
        if (!languageTranslation) {
            // Fallback to English
            const englishTranslation = translation.en;
            if (typeof englishTranslation === 'string') {
                return this.interpolate(englishTranslation, values);
            }
            console.warn(`Translation missing for key: ${key} in language: ${this.currentLanguage}`);
            return key;
        }

        if (typeof languageTranslation === 'string') {
            return this.interpolate(languageTranslation, values);
        }

        console.warn(`Invalid translation format for key: ${key}`);
        return key;
    }

    translatePlural(key: string, count: number, values?: InterpolationValues): string {
        const translation = this.translations[key];
        if (!translation) {
            console.warn(`Translation missing for key: ${key}`);
            return key;
        }

        const languageTranslation = translation[this.currentLanguage];
        if (!languageTranslation || typeof languageTranslation === 'string') {
            console.warn(`Plural translation missing for key: ${key} in language: ${this.currentLanguage}`);
            return key;
        }

        const config = LANGUAGE_CONFIGS[this.currentLanguage];
        const pluralRule = config.pluralRules(count);
        const pluralTranslation = languageTranslation[pluralRule] || languageTranslation.other;

        if (!pluralTranslation) {
            console.warn(`Plural form missing for key: ${key}, rule: ${pluralRule}`);
            return key;
        }

        return this.interpolate(pluralTranslation, { count, ...values });
    }

    private interpolate(template: string, values?: InterpolationValues): string {
        if (!values) return template;

        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
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
export function t(key: string, values?: InterpolationValues): string {
    return i18nSystem.translate(key, values);
}

// Helper function for plural translations
export function tp(key: string, count: number, values?: InterpolationValues): string {
    return i18nSystem.translatePlural(key, count, values);
}
