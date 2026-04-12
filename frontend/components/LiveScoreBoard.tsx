import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import Flag from 'react-world-flags';
import { getCode } from 'country-list';
import { useLanguage } from '../contexts/LanguageContext';
import {
    ChevronDown, RefreshCw, Trophy, Globe, MessageSquare, X, Send, Clock,
    CalendarDays, Shield, Gamepad2, Flag as FlagIcon, Target, Bike, Car, Dna,
    Activity, Dumbbell, Club, CircleDot, Shell, Sword, Search,
} from 'lucide-react';

/* --- TRANSLATIONS --- */
const translations: Record<string, any> = {
    en: {
        all: 'ALL', live: 'LIVE', odds: 'ODDS', finished: 'FINISHED', scheduled: 'SCHEDULED',
        yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow',
        countries: 'Countries', pinnedLeagues: 'Pinned Leagues',
        noMatches: 'No matches found for', filter: 'Filter', resetFilters: 'Reset Filters',
        loading: 'LOADING', standings: 'Standings', askPrediction: 'Ask me for a prediction...',
        athenaSportAI: 'Athena Sport AI', observing: "I'm observing the pitch. Ask me anything.",
        networkError: 'Network error.',
        esportsUnavailable: 'Esports live scores are not available from this data source yet. Try football, tennis, or basketball.',
        sportsNavLabel: 'Sports categories',
        filtersLabel: 'Match filters',
        countryFilterLabel: 'Filter by country or region',
        allCountries: 'All countries & regions',
        searchCountries: 'Search…',
        pickDateLabel: 'Pick a date',
        openChatLabel: 'Open sports assistant chat',
        closeChatLabel: 'Close chat',
        sendMessageLabel: 'Send message',
        sportUnsupported: 'This sport is not available in the live scores feed.',
        searchNoResults: 'No matching countries',
        livescoreComEmpty: 'No matches from LiveScore.com for this date. Try another day or switch data source in admin.',
        livescoreComFootballOnly: 'LiveScore.com mode covers football only. Showing other sports from Flashscore.',
        engineMaintenance: 'Live scores are temporarily unavailable (maintenance).',
        engineMockMode: 'Sports engine is in mock mode (no live data).',
    },
    ar: {
        all: 'الكل', live: 'مباشر', odds: 'احتمالات', finished: 'انتهت', scheduled: 'مجدولة',
        yesterday: 'أمس', today: 'اليوم', tomorrow: 'غدا',
        countries: 'الدول', pinnedLeagues: 'الدوريات المفضلة',
        noMatches: 'لا توجد مباريات لـ', filter: 'تصفية', resetFilters: 'إعادة تعيين الفلاتر',
        loading: 'جاري التحميل', standings: 'الترتيب', askPrediction: 'اسألني عن توقع...',
        athenaSportAI: 'أثينا الرياضية AI', observing: 'أراقب الملعب. اسألني أي شيء.',
        networkError: 'خطأ في الشبكة.',
        esportsUnavailable: 'نتائج الرياضات الإلكترونية غير متوفرة من هذا المصدر حالياً. جرّب كرة القدم أو التنس أو كرة السلة.',
        sportsNavLabel: 'فئات الرياضات',
        filtersLabel: 'تصفية المباريات',
        countryFilterLabel: 'تصفية حسب الدولة أو المنطقة',
        allCountries: 'كل الدول والمناطق',
        searchCountries: 'بحث…',
        pickDateLabel: 'اختر التاريخ',
        openChatLabel: 'فتح مساعد رياضي',
        closeChatLabel: 'إغلاق الدردشة',
        sendMessageLabel: 'إرسال',
        sportUnsupported: 'هذا الرياضة غير متوفرة في بث النتائج المباشرة.',
        searchNoResults: 'لا توجد دول مطابقة',
        livescoreComEmpty: 'لا مباريات من LiveScore.com لهذا التاريخ. جرّب يوماً آخر أو غيّر المصدر من لوحة الإدارة.',
        livescoreComFootballOnly: 'وضع LiveScore.com يغطي كرة القدم فقط. الرياضات الأخرى تُعرض من Flashscore.',
        engineMaintenance: 'النتائج المباشرة غير متاحة مؤقتاً (صيانة).',
        engineMockMode: 'محرك الرياضة في وضع تجريبي بدون بيانات حية.',
    },
    tr: {
        all: 'TÜMÜ', live: 'CANLI', odds: 'ORANLAR', finished: 'BİTTİ', scheduled: 'PLANLI',
        yesterday: 'Dün', today: 'Bugün', tomorrow: 'Yarın',
        countries: 'Ülkeler', pinnedLeagues: 'Favori Ligler',
        noMatches: 'Maç bulunamadı', filter: 'Filtre', resetFilters: 'Filtreleri Sıfırla',
        loading: 'YÜKLENİYOR', standings: 'Puan Durumu', askPrediction: 'Tahmin sor...',
        athenaSportAI: 'Athena Spor AI', observing: 'Sahayı izliyorum. Bana sor.',
        networkError: 'Ağ hatası.',
        esportsUnavailable: 'E-spor canlı skorları bu kaynakta henüz yok. Futbol, tenis veya basketbol deneyin.',
        sportsNavLabel: 'Spor kategorileri',
        filtersLabel: 'Maç filtreleri',
        countryFilterLabel: 'Ülke veya bölgeye göre filtrele',
        allCountries: 'Tüm ülkeler ve bölgeler',
        searchCountries: 'Ara…',
        pickDateLabel: 'Tarih seç',
        openChatLabel: 'Spor asistanı sohbetini aç',
        closeChatLabel: 'Sohbeti kapat',
        sendMessageLabel: 'Gönder',
        sportUnsupported: 'Bu spor canlı skor akışında yok.',
        searchNoResults: 'Eşleşen ülke yok',
        livescoreComEmpty: 'Bu tarih için LiveScore.com’da maç yok. Başka gün deneyin veya yönetimden kaynağı değiştirin.',
        livescoreComFootballOnly: 'LiveScore.com modu yalnızca futbol içerir. Diğer sporlar Flashscore’dan gösteriliyor.',
        engineMaintenance: 'Canlı skorlar geçici olarak kapalı (bakım).',
        engineMockMode: 'Spor motoru sahte modda (canlı veri yok).',
    }
};

const toScoreNum = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

/* --- TIMEZONE CONVERSION --- */
const convertToIstanbulTime = (timeStr: string): string => {
    // If it's a time like "15:30", convert from UTC to Istanbul (UTC+3)
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const utcDate = new Date();
        utcDate.setUTCHours(hours, minutes, 0, 0);

        // Convert to Istanbul time (UTC+3)
        const istanbulDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
        const istHours = istanbulDate.getUTCHours().toString().padStart(2, '0');
        const istMinutes = istanbulDate.getUTCMinutes().toString().padStart(2, '0');
        return `${istHours}:${istMinutes}`;
    }
    return timeStr;
};

/* --- ICONS MAPPING --- */
const SportIcons: Record<string, React.ReactNode> = {
    football: <Trophy size={14} />,
    tennis: <Activity size={14} />,
    basketball: <Dumbbell size={14} />,
    hockey: <Club size={14} />,
    "american-football": <Trophy size={14} className="rotate-90" />,
    baseball: <Target size={14} />,
    handball: <CircleDot size={14} />,
    "rugby-union": <Shell size={14} />,
    "rugby-league": <Shell size={14} />,
    volleyball: <div className="w-3 h-3 rounded-full border-2 border-current" />,
    cricket: <Sword size={14} className="rotate-45" />,
    darts: <Target size={14} />,
    snooker: <CircleDot size={14} />,
    boxing: <Sword size={14} />,
    mma: <Sword size={14} />,
    "beach-volleyball": <div className="w-3 h-3 rounded-full border-2 border-dotted border-current" />,
    badminton: <Activity size={14} />,
    golf: <FlagIcon size={14} />,
    "table-tennis": <CircleDot size={14} />,
    esports: <Gamepad2 size={14} />,
    motorsport: <Car size={14} />,
    cycling: <Bike size={14} />,
    "winter-sports": <div className="text-[10px] font-bold">W</div>,
    kabaddi: <Dna size={14} />,
};

const getSportIcon = (id: string) => SportIcons[id] || <Trophy size={14} />;

// --- Country Code Mapping ---
const SPECIAL_CODES: Record<string, string> = {
    "england": "GB-ENG",
    "scotland": "GB-SCT",
    "wales": "GB-WLS",
    "northern ireland": "GB-NIR",
    "usa": "US",
    "united states": "US",
    "south korea": "KR",
    "russia": "RU",
    "china": "CN",
    "turkiye": "TR",
    "turkey": "TR",
    "uae": "AE",
    "united arab emirates": "AE",
    "iran": "IR",
    "vietnam": "VN",
    "czech republic": "CZ",
    "bosnia and herzegovina": "BA",
    "antigua and barbuda": "AG",
    "world": "UN",
    "europe": "EU",
    "asia": "CN",
    "africa": "NG",
    "south america": "BR",
    "north & central america": "US",
    "australia & oceania": "AU",
    abd: "US",
    almanya: "DE",
    ispanya: "ES",
    italya: "IT",
    ingiltere: "GB",
    fransa: "FR",
    hollanda: "NL",
    portekiz: "PT",
    belcika: "BE",
    isvec: "SE",
    norvec: "NO",
    cek: "CZ",
    polonya: "PL",
    rusya: "RU",
    ukrayna: "UA",
    brezilya: "BR",
    arjantin: "AR",
    meksika: "MX",
    japonya: "JP",
    cin: "CN",
    avustralya: "AU",
};

/** ISO-like code from feed country label (may be 2-letter or e.g. GB-ENG). */
function resolveCountryToFlagCode(country: string, flagIso?: string): string {
    if (flagIso && /^[A-Za-z]{2}$/.test(flagIso.trim())) return flagIso.trim().toUpperCase();
    if (!country) return 'UN';
    const clean = country.toLowerCase().trim();
    if (SPECIAL_CODES[clean]) return SPECIAL_CODES[clean];
    const code = getCode(country);
    if (code) return code;
    return 'UN';
}

/** react-world-flags expects ISO 3166-1 alpha-2. */
function iso2ForWorldFlag(code: string): string {
    if (!code || code === 'UN') return 'UN';
    if (code.length === 2) return code.toUpperCase();
    const i = code.indexOf('-');
    if (i === 2) return code.slice(0, 2).toUpperCase();
    return code.length >= 2 ? code.slice(0, 2).toUpperCase() : 'UN';
}

// --- Sub-components ---
const LeagueIcon = ({ country, flagIso }: { country: string; flagIso?: string }) => {
    const raw = resolveCountryToFlagCode(country, flagIso);
    const code = iso2ForWorldFlag(raw);

    return (
        <div className="w-5 h-5 flex items-center justify-center overflow-hidden rounded-sm shadow-sm bg-transparent">
            {code === 'UN' ? (
                <Globe size={14} className="text-gray-500" aria-hidden />
            ) : (
                <Flag code={code} height="16" fallback={<Globe size={14} className="text-gray-500" aria-hidden />} />
            )}
        </div>
    );
};

type TDict = (typeof translations)['en'];

const CountryFilterMenu = ({
    countries,
    value,
    onChange,
    t,
    isRTL,
}: {
    countries: string[];
    value: string | null;
    onChange: (v: string | null) => void;
    t: TDict;
    isRTL: boolean;
}) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const wrapRef = useRef<HTMLDivElement>(null);
    const listId = 'live-scores-country-listbox';

    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);

    useEffect(() => {
        if (!open) setQ('');
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    const filtered = useMemo(() => {
        if (!q.trim()) return countries;
        const s = q.toLowerCase();
        return countries.filter((c) => c.toLowerCase().includes(s));
    }, [countries, q]);

    const label = value || t.countries;

    return (
        <div className="relative flex-1 md:w-72 min-w-0 z-50" ref={wrapRef}>
            <button
                type="button"
                id="live-scores-country-trigger"
                aria-label={value ? `${t.countryFilterLabel}: ${value}` : `${t.countryFilterLabel}: ${t.allCountries}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                onClick={() => setOpen((o) => !o)}
                className="w-full min-h-[44px] h-11 flex items-center gap-2 ps-3 pe-3 rounded-xl bg-[#121619] text-gray-100 text-[13px] font-semibold border border-white/15 shadow-inner outline-none hover:border-emerald-500/40 hover:bg-[#161c22] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1f24] transition-colors"
            >
                <Globe size={16} className="text-emerald-500 shrink-0" aria-hidden />
                <span className="flex-1 min-w-0 truncate text-start">{label}</span>
                <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
            </button>

            {open ? (
                <>
                    <div
                        className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-[1px]"
                        aria-hidden
                        onClick={() => setOpen(false)}
                    />
                    <div
                        id={listId}
                        role="listbox"
                        aria-labelledby="live-scores-country-trigger"
                        dir={isRTL ? 'rtl' : 'ltr'}
                        className="absolute start-0 end-0 top-full mt-1.5 z-[60] max-h-[min(70vh,22rem)] flex flex-col rounded-xl border border-emerald-500/25 bg-[#121619] shadow-2xl shadow-black/50 overflow-hidden"
                    >
                        <div className="sticky top-0 z-[1] px-3 py-2.5 border-b border-white/10 bg-[#161c22]">
                            <div className="relative">
                                <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-emerald-500/80 pointer-events-none" aria-hidden />
                                <input
                                    type="search"
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder={t.searchCountries}
                                    className="w-full h-9 rounded-lg bg-[#0b0e11] border border-white/10 ps-9 pe-3 text-[13px] text-white placeholder:text-gray-500 outline-none focus:border-emerald-500/50"
                                    autoComplete="off"
                                    autoCorrect="off"
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto overscroll-contain flex-1 py-1 custom-scrollbar">
                            <button
                                type="button"
                                role="option"
                                aria-selected={value === null}
                                onClick={() => {
                                    onChange(null);
                                    setOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-start text-[13px] transition-colors hover:bg-emerald-500/10 ${value === null ? 'bg-emerald-500/15 text-white' : 'text-gray-300'}`}
                            >
                                <span className="w-6 flex justify-center shrink-0">
                                    <Globe size={16} className="text-emerald-500" />
                                </span>
                                <span className="font-medium truncate">{t.allCountries}</span>
                            </button>
                            {filtered.length === 0 ? (
                                <div className="px-3 py-6 text-center text-gray-500 text-sm">
                                    {q.trim() ? t.searchNoResults : t.noMatches}
                                </div>
                            ) : (
                                filtered.map((c) => {
                                    const raw = resolveCountryToFlagCode(c);
                                    const fc = iso2ForWorldFlag(raw);
                                    const sel = value === c;
                                    return (
                                        <button
                                            key={c}
                                            type="button"
                                            role="option"
                                            aria-selected={sel}
                                            onClick={() => {
                                                onChange(c);
                                                setOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-start text-[13px] border-t border-white/[0.06] transition-colors hover:bg-white/5 ${sel ? 'bg-emerald-500/15 text-white' : 'text-gray-200'}`}
                                        >
                                            <span className="w-6 h-4 flex justify-center items-center shrink-0 overflow-hidden rounded-sm">
                                                {fc === 'UN' ? (
                                                    <Globe size={14} className="text-gray-500" />
                                                ) : (
                                                    <Flag code={fc} height="14" className="max-h-3.5 w-auto object-contain" fallback={<Globe size={14} className="text-gray-500" />} />
                                                )}
                                            </span>
                                            <span className="font-medium truncate">{c}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
};

const TeamEmblem = ({ logoUrl }: { logoUrl?: string }) => (
    <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center border border-white/5 shadow-inner overflow-hidden">
        {logoUrl ? (
            <img
                src={logoUrl}
                alt=""
                width={32}
                height={32}
                className="w-full h-full object-contain p-0.5"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
            />
        ) : (
            <Shield size={14} className="text-gray-400 sm:w-4 sm:h-4" aria-hidden />
        )}
    </div>
);

// --- Interfaces ---
interface Odds {
    "1": number;
    "X": number;
    "2": number;
}

interface Match {
    id: any;
    time: string;
    home: string;
    away: string;
    score: string;
    status: string;
    home_logo: string;
    away_logo: string;
    score_home: number;
    score_away: number;
    odds?: Odds;
}

interface LeagueGroup {
    id: any;
    group_title: string;
    country: string;
    league: string;
    logo: string;
    country_flag_code?: string;
    /** Flashscore Mobi standings path /standings/{ze}/{zc}/ (Ninja feed ZE, ZC). */
    ze?: string;
    zc?: string;
    tournament_id?: string;
    items: Match[];
}

function standingsLeagueHref(group: LeagueGroup, sport: string): string | null {
    if (sport !== 'football' || !group.ze || !group.zc) return null;
    const pair = `${group.ze}_${group.zc}`;
    const q = new URLSearchParams();
    q.set('sport', sport);
    q.set('c', group.country);
    q.set('l', group.league);
    if (group.logo) q.set('logo', group.logo);
    if (group.country_flag_code) q.set('fi', group.country_flag_code);
    return `/sports/live-scores/league/${pair}?${q.toString()}`;
}

interface LiveScoreBoardProps {
    globalDate: string;
}

// Full Flashscore List
const getSportLabel = (id: string, lang: string) => {
    const labels: Record<string, Record<string, string>> = {
        football: { en: 'Football', ar: 'كرة القدم', tr: 'Futbol' },
        tennis: { en: 'Tennis', ar: 'التنس', tr: 'Tenis' },
        basketball: { en: 'Basketball', ar: 'كرة السلة', tr: 'Basketbol' },
        hockey: { en: 'Hockey', ar: 'الهوكي', tr: 'Hokey' },
        "american-football": { en: 'Am. Football', ar: 'كرة قدم أمريكية', tr: 'Am. Futbolu' },
        baseball: { en: 'Baseball', ar: 'بيسبول', tr: 'Beyzbol' },
        handball: { en: 'Handball', ar: 'كرة اليد', tr: 'Hentbol' },
        "rugby-union": { en: 'Rugby Union', ar: 'الرجبي', tr: 'Ragbi' },
        volleyball: { en: 'Volleyball', ar: 'الكرة الطائرة', tr: 'Voleybol' },
        cricket: { en: 'Cricket', ar: 'الكريكت', tr: 'Kriket' },
        darts: { en: 'Darts', ar: 'السهام', tr: 'Dart' },
        snooker: { en: 'Snooker', ar: 'السنوكر', tr: 'Snooker' },
        boxing: { en: 'Boxing', ar: 'الملاكمة', tr: 'Boks' },
        mma: { en: 'MMA', ar: 'فنون القتال', tr: 'MMA' },
        esports: { en: 'Esports', ar: 'الرياضات الإلكترونية', tr: 'E-Spor' },
    };
    return labels[id]?.[lang] || labels[id]?.en || id;
};

const SPORTS_LIST = ['football', 'tennis', 'basketball', 'hockey', 'american-football', 'baseball', 'handball', 'volleyball', 'cricket', 'mma', 'esports'];

export const LiveScoreBoard: React.FC<LiveScoreBoardProps> = ({ globalDate: initialDate }) => {
    const { language } = useLanguage();
    const ENGINE_URL = "/api/sports-engine";
    const t = translations[language] || translations.en;
    const isRTL = language === 'ar';
    const [, startTransition] = useTransition();

    // --- State ---
    const [sport, setSport] = useState('football');
    const [date, setDate] = useState(initialDate);

    useEffect(() => {
        setDate(initialDate);
    }, [initialDate]);

    const [displayDateLabel, setDisplayDateLabel] = useState('TODAY');
    const [filter, setFilter] = useState('ALL');
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [matches, setMatches] = useState<LeagueGroup[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [engineNotice, setEngineNotice] = useState<string | null>(null);

    const matchesRef = useRef<LeagueGroup[] | null>(null);
    matchesRef.current = matches;
    const activeFetchRef = useRef<AbortController | null>(null);
    const loadScoresRef = useRef<() => void>(() => {});

    // Chat
    const [chatOpen, setChatOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const loadScores = useCallback(async () => {
        activeFetchRef.current?.abort();
        const ac = new AbortController();
        activeFetchRef.current = ac;

        const hadData = matchesRef.current !== null;
        if (!hadData) setLoading(true);
        else setRefreshing(true);
        setEngineNotice(null);

        if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log(`Fetching scores for sport: ${sport}, date: ${date}, lang: ${language}`);
        }

        const url = `${ENGINE_URL}/api/scores?sport=${encodeURIComponent(sport)}&date=${encodeURIComponent(date)}&lang=${encodeURIComponent(language)}`;

        try {
            const res = await fetch(url, { signal: ac.signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (ac.signal.aborted) return;

            if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log(`Received data for ${sport}:`, json.all_leagues?.length || 0, 'leagues');
            }

            const next: LeagueGroup[] = Array.isArray(json.all_leagues) ? json.all_leagues : [];
            let notice: string | null = null;
            const nc = json.notice as string | undefined;
            if (nc === 'ESPORTS_NOT_AVAILABLE_ON_MOBI') notice = t.esportsUnavailable;
            else if (nc === 'UNKNOWN_SPORT') notice = t.sportUnsupported;
            else if (nc === 'LIVESCORE_COM_EMPTY') notice = t.livescoreComEmpty;
            else if (nc === 'LIVESCORE_COM_FOOTBALL_ONLY') notice = t.livescoreComFootballOnly;
            else if (nc === 'MAINTENANCE') notice = t.engineMaintenance;
            else if (nc === 'MOCK_MODE') notice = t.engineMockMode;

            startTransition(() => {
                setMatches(next);
                setEngineNotice(notice);
                if (date === 'today') setDisplayDateLabel('TODAY');
                else if (date === 'yesterday') setDisplayDateLabel('YESTERDAY');
                else if (date === 'tomorrow') setDisplayDateLabel('TOMORROW');
                else setDisplayDateLabel(date);
            });
        } catch (e) {
            if (ac.signal.aborted) return;
            if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.error('Error fetching scores:', e);
            }
            startTransition(() => {
                setMatches([]);
                setEngineNotice(t.networkError);
            });
        } finally {
            if (activeFetchRef.current === ac) {
                setLoading(false);
                setRefreshing(false);
                activeFetchRef.current = null;
            }
        }
    }, [sport, date, language, ENGINE_URL, t, startTransition]);

    loadScoresRef.current = () => {
        void loadScores();
    };

    useEffect(() => {
        void loadScores();
        return () => {
            activeFetchRef.current?.abort();
        };
    }, [loadScores]);

    useEffect(() => {
        setSelectedCountry(null);
    }, [sport, date]);

    useEffect(() => {
        if (date !== 'today') return;
        const i = setInterval(() => {
            loadScoresRef.current();
        }, 60000);
        return () => clearInterval(i);
    }, [date]);

    // --- Derived Data ---
    const filteredMatches = React.useMemo(() => {
        if (!matches) return [];

        let processed = matches;

        if (selectedCountry) {
            processed = processed.filter(g => g.country === selectedCountry);
        }

        return processed.map(group => {
            const items = group.items.filter(m => {
                if (filter === 'ALL') return true;
                if (filter === 'LIVE') return m.status === 'LIVE';
                if (filter === 'FINISHED') return m.status === 'FINISHED';
                if (filter === 'SCHEDULED') return m.status === 'UPCOMING';
                if (filter === 'ODDS') return true;
                return true;
            });
            return { ...group, items };
        }).filter(g => g.items.length > 0);
    }, [matches, filter, selectedCountry]);

    const countries = React.useMemo(() => {
        if (!matches) return [];
        const map = new Set<string>();
        matches.forEach(g => map.add(g.country));
        return Array.from(map).sort();
    }, [matches]);

    // Chat Send
    const sendChat = async () => {
        if (!chatInput.trim()) return;
        const msg = chatInput;
        setChatInput("");
        setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
        setChatLoading(true);
        try {
            const res = await fetch(`${ENGINE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg, history: chatHistory })
            });
            const json = await res.json();
            setChatHistory(prev => [...prev, { role: 'model', content: json.response }]);
        } catch {
            setChatHistory(prev => [...prev, { role: 'model', content: "Network error." }]);
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, chatOpen]);

    return (
        <div className="flex flex-col min-h-screen bg-[#0b0e11] font-sans text-[#e9ecef]">

            {/* 1. TOP SPORTS NAVIGATION */}
            <nav
                className="bg-[#121619]/90 backdrop-blur-md border-b border-white/5 sticky top-16 sm:top-20 z-40"
                aria-label={t.sportsNavLabel}
            >
                <div className="max-w-[1400px] mx-auto px-2 sm:px-4 flex items-center gap-0.5 overflow-x-auto no-scrollbar py-1 scroll-pl-2 snap-x snap-mandatory">
                    {SPORTS_LIST.map(id => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => startTransition(() => setSport(id))}
                            aria-pressed={sport === id}
                            aria-current={sport === id ? 'page' : undefined}
                            className={`flex items-center gap-2 min-h-[44px] px-4 sm:px-6 py-3 text-[11px] sm:text-xs font-bold uppercase transition-all whitespace-nowrap border-b-2 snap-start shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121619]
                                ${sport === id
                                    ? 'text-emerald-400 border-emerald-400 bg-emerald-400/5'
                                    : 'text-gray-500 border-transparent hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className={`text-base sm:text-lg shrink-0 ${sport === id ? 'text-emerald-400' : 'opacity-60'}`} aria-hidden>{getSportIcon(id)}</span>
                            <span>{getSportLabel(id, language)}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* 2. FILTER & DATE BAR - Mobile Optimized */}
            <div className="bg-[#1a1f24]/80 backdrop-blur-md border-b border-white/5 mb-4 sm:mb-6 z-30 shadow-xl sticky top-[7.25rem] sm:top-[8.5rem] md:top-[9rem]">
                <div className="max-w-[1400px] mx-auto px-3 py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4">

                    {/* Filters */}
                    <div
                        role="toolbar"
                        aria-label={t.filtersLabel}
                        className="flex bg-black/20 p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar"
                    >
                        {['ALL', 'LIVE', 'FINISHED', 'SCHEDULED', 'ODDS'].map(f => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => startTransition(() => setFilter(f))}
                                aria-pressed={filter === f}
                                className={`
                                    flex-1 md:flex-none min-h-[44px] px-3 sm:px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest
                                    transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1f24]
                                    ${filter === f
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'text-gray-500 hover:text-white'
                                    }
                                `}
                            >
                                {t[f.toLowerCase()] || f}
                            </button>
                        ))}
                    </div>

                    {/* Countries & date */}
                    <div className="flex items-center gap-2 w-full md:w-auto min-w-0">
                        <CountryFilterMenu
                            countries={countries}
                            value={selectedCountry}
                            onChange={setSelectedCountry}
                            t={t}
                            isRTL={isRTL}
                        />

                        <div className="relative group shrink-0">
                            <input
                                type="date"
                                aria-label={t.pickDateLabel}
                                className="absolute inset-0 w-11 h-11 opacity-0 cursor-pointer z-10"
                                onChange={(e) => {
                                    const v = e.target.value;
                                    startTransition(() => setDate(v));
                                }}
                            />
                            <div className="w-11 h-11 min-w-[44px] min-h-[44px] bg-white/5 rounded-xl border border-white/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-colors pointer-events-none" aria-hidden>
                                <CalendarDays size={18} className="text-emerald-500 group-hover:text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. MAIN LAYOUT */}
            <div className="max-w-[1400px] mx-auto px-3 sm:px-4 w-full pb-24 sm:pb-20">

                {/* MAIN FEED */}
                <div className="min-h-[min(500px,70vh)]">
                    {refreshing && matches !== null ? (
                        <div
                            className="mb-3 h-1 w-full max-w-md mx-auto rounded-full bg-emerald-500/25 animate-pulse motion-reduce:animate-none"
                            role="status"
                            aria-live="polite"
                            aria-busy="true"
                        />
                    ) : null}
                    {loading && matches === null ? (
                        <div className="p-12 sm:p-20 flex flex-col items-center justify-center" role="status" aria-live="polite">
                            <RefreshCw className="animate-spin text-emerald-500 mb-6 motion-reduce:animate-none" size={48} aria-hidden />
                            <div className="text-[10px] font-black tracking-[0.3em] text-emerald-500/60 uppercase">{t.loading}</div>
                        </div>
                    ) : filteredMatches.length > 0 ? (
                        <div className="space-y-3">
                            {filteredMatches.map(group => {
                                const stHref = standingsLeagueHref(group, sport);
                                return (
                                <div key={group.id} className="bg-[#1a1f24] rounded-lg overflow-hidden border border-white/5 shadow-sm">
                                    {/* League Header */}
                                    <div className="bg-[#23282d] px-3 sm:px-4 py-2 flex items-center justify-between border-b border-white/5 gap-2">
                                        {stHref ? (
                                            <Link
                                                href={stHref}
                                                className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#23282d] hover:bg-white/[0.04] -m-1 p-1 transition-colors"
                                            >
                                                {group.logo ? (
                                                    <img
                                                        src={group.logo}
                                                        alt=""
                                                        width={28}
                                                        height={28}
                                                        className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
                                                        loading="lazy"
                                                        decoding="async"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : null}
                                                <LeagueIcon country={group.country} flagIso={group.country_flag_code} />
                                                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 min-w-0">
                                                    <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest truncate">{group.country}</span>
                                                    <span className="hidden sm:inline text-gray-600">/</span>
                                                    <span className="text-xs sm:text-sm font-bold text-white tracking-tight line-clamp-2">{group.league}</span>
                                                </div>
                                            </Link>
                                        ) : (
                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                            {group.logo ? (
                                                <img
                                                    src={group.logo}
                                                    alt=""
                                                    width={28}
                                                    height={28}
                                                    className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
                                                    loading="lazy"
                                                    decoding="async"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : null}
                                            <LeagueIcon country={group.country} flagIso={group.country_flag_code} />
                                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 min-w-0">
                                                <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest truncate">{group.country}</span>
                                                <span className="hidden sm:inline text-gray-600">/</span>
                                                <span className="text-xs sm:text-sm font-bold text-white tracking-tight line-clamp-2">{group.league}</span>
                                            </div>
                                        </div>
                                        )}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {stHref ? (
                                                <Link
                                                    href={stHref}
                                                    className="text-[10px] font-bold text-gray-400 px-3 py-2 min-h-[44px] inline-flex items-center rounded-lg bg-white/5 hover:bg-emerald-500/15 hover:text-emerald-300 transition-all uppercase tracking-wider border border-white/5"
                                                >
                                                    {t.standings}
                                                </Link>
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* Match rows */}
                                    <ul className="divide-y divide-white/[0.03] list-none m-0 p-0">
                                        {group.items.map(match => {
                                            const sh = toScoreNum(match.score_home);
                                            const sa = toScoreNum(match.score_away);
                                            const homeLeads = sh > sa;
                                            const awayLeads = sa > sh;
                                            return (
                                            <li key={match.id} className="group hover:bg-white/[0.02] transition-colors px-2 sm:px-4 py-3 sm:py-4">
                                                <div className="grid grid-cols-[minmax(4rem,4.5rem)_1fr] md:grid-cols-[minmax(5rem,6rem)_1fr_minmax(0,9rem)] items-center gap-2 sm:gap-3">

                                                    <div className="flex flex-col items-center justify-center text-center border-r border-white/5 pr-2 min-h-[52px]">
                                                        {match.status === 'LIVE' ? (
                                                            <>
                                                                <span className="text-[10px] font-black text-red-500 motion-reduce:animate-none animate-pulse tracking-tighter">LIVE</span>
                                                                {match.time ? (
                                                                    <span className="text-[11px] sm:text-xs font-black text-white leading-tight tabular-nums">
                                                                        {/^\d/.test(String(match.time).trim()) ? `${match.time}'` : match.time}
                                                                    </span>
                                                                ) : null}
                                                            </>
                                                        ) : match.status === 'FINISHED' ? (
                                                            <>
                                                                <span className="text-[10px] font-bold text-gray-500">FT</span>
                                                                <span className="text-[10px] text-gray-600 mt-1 font-mono tabular-nums">{match.score}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Clock size={12} className="text-gray-600 mb-1 shrink-0" aria-hidden />
                                                                <span className="text-[11px] sm:text-xs font-bold text-gray-400 tabular-nums">{convertToIstanbulTime(match.time)}</span>
                                                            </>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-2 sm:gap-3 px-1 md:px-4 min-w-0">
                                                        <div className="flex items-center justify-between gap-2 min-w-0">
                                                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                                <TeamEmblem logoUrl={match.home_logo || undefined} />
                                                                <span className={`text-xs sm:text-sm md:text-base truncate ${homeLeads ? 'font-bold text-white' : 'text-gray-300'}`}>
                                                                    {match.home}
                                                                </span>
                                                            </div>
                                                            {match.status !== 'UPCOMING' && (
                                                                <span className={`text-base sm:text-lg font-mono tabular-nums shrink-0 ${homeLeads ? 'text-emerald-400 font-black' : 'text-white'}`}>
                                                                    {sh}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between gap-2 min-w-0">
                                                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                                <TeamEmblem logoUrl={match.away_logo || undefined} />
                                                                <span className={`text-xs sm:text-sm md:text-base truncate ${awayLeads ? 'font-bold text-white' : 'text-gray-300'}`}>
                                                                    {match.away}
                                                                </span>
                                                            </div>
                                                            {match.status !== 'UPCOMING' && (
                                                                <span className={`text-base sm:text-lg font-mono tabular-nums shrink-0 ${awayLeads ? 'text-emerald-400 font-black' : 'text-white'}`}>
                                                                    {sa}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="hidden md:flex flex-col gap-2 scale-90 origin-right justify-center">
                                                        {match.odds ? (
                                                            <div className="flex gap-1" role="group" aria-label={t.odds}>
                                                                <div className="h-10 w-12 bg-white/5 rounded flex flex-col items-center justify-center text-[10px] font-bold text-gray-400 border border-white/5 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all">
                                                                    <span className="opacity-50 text-[8px]">1</span>{match.odds["1"]}
                                                                </div>
                                                                <div className="h-10 w-12 bg-white/5 rounded flex flex-col items-center justify-center text-[10px] font-bold text-gray-400 border border-white/5 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all">
                                                                    <span className="opacity-50 text-[8px]">X</span>{match.odds["X"]}
                                                                </div>
                                                                <div className="h-10 w-12 bg-white/5 rounded flex flex-col items-center justify-center text-[10px] font-bold text-gray-400 border border-white/5 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all">
                                                                    <span className="opacity-50 text-[8px]">2</span>{match.odds["2"]}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] uppercase tracking-widest text-gray-600 font-bold border border-white/5 px-2 py-1 rounded">No Odds</div>
                                                        )}
                                                    </div>

                                                </div>
                                            </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            );
                            })}
                        </div>
                    ) : matches && matches.length > 0 ? (
                        <div className="bg-[#1a1f24] rounded-2xl p-8 sm:p-16 text-center border border-white/5 flex flex-col items-center shadow-2xl" role="status">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 sm:mb-6">
                                <Trophy size={36} className="text-amber-500/40 sm:w-10 sm:h-10" aria-hidden />
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">{t.filter}</h2>
                            <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
                                {t.noMatches} {displayDateLabel}. {t.resetFilters}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none justify-center">
                                <button
                                    type="button"
                                    onClick={() => { setFilter('ALL'); setSelectedCountry(null); }}
                                    className="min-h-[44px] px-6 py-2.5 bg-emerald-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                                >
                                    {t.resetFilters}
                                </button>
                            </div>
                        </div>
                    ) : engineNotice ? (
                        <div className="bg-[#1a1f24] rounded-2xl p-8 sm:p-12 text-center border border-amber-500/20 flex flex-col items-center shadow-2xl" role="alert">
                            <p className="text-gray-200 text-sm sm:text-base max-w-lg leading-relaxed">{engineNotice}</p>
                            <button
                                type="button"
                                onClick={() => setSport('football')}
                                className="mt-8 min-h-[44px] px-6 py-2.5 bg-emerald-500 rounded-xl text-xs font-bold text-white shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                            >
                                {getSportLabel('football', language)}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-[#1a1f24] rounded-2xl p-8 sm:p-16 text-center border border-white/5 flex flex-col items-center shadow-2xl">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/5 flex items-center justify-center mb-4 sm:mb-6">
                                <Trophy size={36} className="text-emerald-500/20 sm:w-10 sm:h-10" aria-hidden />
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">No Matches Scheduled</h2>
                            <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
                                There are no <span className="text-emerald-400 font-bold">{getSportLabel(sport, language)}</span> matches for {displayDateLabel}. Try another sport or date.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none justify-center">
                                <button
                                    type="button"
                                    onClick={() => { setFilter('ALL'); setSelectedCountry(null); }}
                                    className="min-h-[44px] px-6 py-2.5 bg-emerald-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                                >
                                    {t.resetFilters}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSport('football')}
                                    className="min-h-[44px] px-6 py-2.5 bg-white/5 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                                >
                                    {getSportLabel('football', language)}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. ATHENA CHAT WIDGET */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
                <div
                    id="live-scores-chat-panel"
                    className={`
                    pointer-events-auto bg-[#1a1f24] border border-[#10b981]/20 shadow-2xl rounded-xl w-[min(100vw-2rem,20rem)] max-w-[20rem] mb-4 overflow-hidden 
                    transition-all duration-300 origin-bottom-right
                    ${chatOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8 pointer-events-none'}
                 `}
                    role="dialog"
                    aria-modal="true"
                    aria-label={t.athenaSportAI}
                    aria-hidden={!chatOpen}
                >
                    <div className="bg-[#10b981] p-3 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full motion-reduce:animate-none animate-pulse" aria-hidden />
                            <span className="font-bold text-sm">Athena Sport AI</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setChatOpen(false)}
                            className="p-1 rounded hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            aria-label={t.closeChatLabel}
                        >
                            <X size={16} aria-hidden />
                        </button>
                    </div>
                    <div className="h-72 bg-[#121619] p-3 overflow-y-auto space-y-3 custom-scrollbar" role="log" aria-live="polite" aria-relevant="additions">
                        {chatHistory.length === 0 && (
                            <div className="text-center text-gray-600 text-xs mt-10 italic">
                                "I'm observing the pitch. Ask me anything."
                            </div>
                        )}
                        {chatHistory.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`
                                    max-w-[85%] p-2.5 rounded-lg text-xs leading-relaxed
                                    ${m.role === 'user'
                                        ? 'bg-[#2a2f35] text-white border border-white/10'
                                        : 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20'}
                                 `}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-2 bg-[#1a1f24] border-t border-white/5 flex gap-2">
                        <label htmlFor="live-scores-chat-input" className="sr-only">{t.askPrediction}</label>
                        <input
                            id="live-scores-chat-input"
                            className="bg-[#121619] flex-1 min-h-[44px] rounded px-3 py-2 text-xs text-white border border-white/5 focus:border-[#10b981] outline-none"
                            placeholder={t.askPrediction}
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                            autoComplete="off"
                        />
                        <button type="button" onClick={sendChat} className="text-[#10b981] hover:text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label={t.sendMessageLabel}>
                            <Send size={16} aria-hidden />
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setChatOpen(!chatOpen)}
                    aria-expanded={chatOpen}
                    aria-controls="live-scores-chat-panel"
                    aria-label={t.openChatLabel}
                    className="pointer-events-auto bg-[#10b981] hover:bg-[#059669] text-white min-w-[52px] min-h-[52px] p-3.5 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center group focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50"
                >
                    <MessageSquare size={24} fill="currentColor" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform motion-reduce:transform-none" aria-hidden />
                </button>
            </div>

        </div>
    );
};

export default LiveScoreBoard;
