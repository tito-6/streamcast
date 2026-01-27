import React, { useEffect, useState, useRef } from 'react';
import Flag from 'react-world-flags';
import { getCode } from 'country-list';
import { useLanguage } from '../contexts/LanguageContext';
import {
    ChevronDown, ChevronRight, Star, Calendar, Search, RefreshCw,
    Trophy, Globe, Layout, Table as TableIcon, List, MessageSquare,
    X, Send, Clock, CheckCircle, Radio, CalendarDays, Shield,
    Gamepad2, Flag as FlagIcon, Target, Crosshair, Bike, Car, Dna,
    Activity, Dumbbell, Club, LocateFixed, MapPin,
    CircleDot, Shell, Sword, Anchor, Menu
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
        networkError: 'Network error.'
    },
    ar: {
        all: 'الكل', live: 'مباشر', odds: 'احتمالات', finished: 'انتهت', scheduled: 'مجدولة',
        yesterday: 'أمس', today: 'اليوم', tomorrow: 'غدا',
        countries: 'الدول', pinnedLeagues: 'الدوريات المفضلة',
        noMatches: 'لا توجد مباريات لـ', filter: 'تصفية', resetFilters: 'إعادة تعيين الفلاتر',
        loading: 'جاري التحميل', standings: 'الترتيب', askPrediction: 'اسألني عن توقع...',
        athenaSportAI: 'أثينا الرياضية AI', observing: 'أراقب الملعب. اسألني أي شيء.',
        networkError: 'خطأ في الشبكة.'
    },
    tr: {
        all: 'TÜMÜ', live: 'CANLI', odds: 'ORANLAR', finished: 'BİTTİ', scheduled: 'PLANLI',
        yesterday: 'Dün', today: 'Bugün', tomorrow: 'Yarın',
        countries: 'Ülkeler', pinnedLeagues: 'Favori Ligler',
        noMatches: 'Maç bulunamadı', filter: 'Filtre', resetFilters: 'Filtreleri Sıfırla',
        loading: 'YÜKLENİYOR', standings: 'Puan Durumu', askPrediction: 'Tahmin sor...',
        athenaSportAI: 'Athena Spor AI', observing: 'Sahayı izliyorum. Bana sor.',
        networkError: 'Ağ hatası.'
    }
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
    "australia & oceania": "AU"
};

// --- Sub-components ---
const LeagueIcon = ({ country }: { country: string }) => {
    // Resolve Code
    const getCountryCode = (name: string) => {
        if (!name) return 'UN';
        const clean = name.toLowerCase().trim();
        if (SPECIAL_CODES[clean]) return SPECIAL_CODES[clean];

        // Try exact match via library
        const code = getCode(name);
        if (code) return code;

        return 'UN'; // Fallback
    };

    const code = getCountryCode(country);

    return (
        <div className="w-5 h-5 flex items-center justify-center overflow-hidden rounded-sm shadow-sm bg-transparent">
            {code === 'UN' ? (
                <Globe size={14} className="text-gray-500" />
            ) : (
                <Flag code={code} height="16" fallback={<Globe size={14} className="text-gray-500" />} />
            )}
        </div>
    );
};

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
    items: Match[];
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

    // --- State ---
    const [sport, setSport] = useState('football');
    const [date, setDate] = useState(initialDate);

    // Sync from parent
    useEffect(() => {
        if (initialDate !== date) {
            setDate(initialDate);
        }
    }, [initialDate]);

    const [displayDateLabel, setDisplayDateLabel] = useState('TODAY');
    const [filter, setFilter] = useState('ALL');
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [matches, setMatches] = useState<LeagueGroup[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Chat
    const [chatOpen, setChatOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // --- Data Fetching ---
    const fetchScores = async () => {
        setLoading(true);
        console.log(`Fetching scores for sport: ${sport}, date: ${date}, lang: ${language}`);
        try {
            const res = await fetch(`${ENGINE_URL}/api/scores?sport=${sport}&date=${date}&lang=${language}`);
            const json = await res.json();
            console.log(`Received data for ${sport}:`, json.all_leagues?.length || 0, 'leagues');
            if (json.all_leagues) setMatches(json.all_leagues);
            else setMatches([]);

            if (date === 'today') setDisplayDateLabel('TODAY');
            else if (date === 'yesterday') setDisplayDateLabel('YESTERDAY');
            else if (date === 'tomorrow') setDisplayDateLabel('TOMORROW');
            else setDisplayDateLabel(date);

        } catch (e) {
            console.error('Error fetching scores:', e);
            setMatches([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMatches(null);
        setSelectedCountry(null);
        fetchScores();
    }, [sport, date, language]);

    useEffect(() => {
        const i = setInterval(() => { if (date === 'today') fetchScores(); }, 60000);
        return () => clearInterval(i);
    }, [sport, date, language]);

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
            <div className="bg-[#121619]/90 backdrop-blur-md border-b border-white/5 sticky top-[80px] z-40">
                <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                    {SPORTS_LIST.map(id => (
                        <button
                            key={id}
                            onClick={() => setSport(id)}
                            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase transition-all whitespace-nowrap border-b-2
                                ${sport === id
                                    ? 'text-emerald-400 border-emerald-400 bg-emerald-400/5'
                                    : 'text-gray-500 border-transparent hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className={`text-lg ${sport === id ? 'text-emerald-400' : 'opacity-60'}`}>{getSportIcon(id)}</span>
                            {getSportLabel(id, language)}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. FILTER & DATE BAR - Mobile Optimized */}
            <div className="bg-[#1a1f24]/80 backdrop-blur-md border-b border-white/5 mb-6 z-30 shadow-xl sticky top-[136px] md:top-[144px]">
                <div className="max-w-[1400px] mx-auto px-3 py-3 flex flex-col md:flex-row items-center justify-between gap-4">

                    {/* Filters */}
                    <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar">
                        {['ALL', 'LIVE', 'FINISHED', 'SCHEDULED', 'ODDS'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`
                                    flex-1 md:flex-none px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest
                                    transition-all duration-200 whitespace-nowrap
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

                    {/* Countries & Search */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <select
                                value={selectedCountry || ''}
                                onChange={(e) => setSelectedCountry(e.target.value || null)}
                                className="w-full h-10 bg-white/5 text-white text-[11px] font-bold px-10 rounded-xl border border-white/10 outline-none cursor-pointer hover:bg-white/10 transition-colors appearance-none"
                            >
                                <option value="">{t.countries}</option>
                                {countries.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        </div>

                        {/* Calendar Picker (Icon Only) */}
                        <div className="relative group">
                            <input
                                type="date"
                                className="w-10 h-10 scale-0 absolute inset-0 z-10 cursor-pointer"
                                onChange={(e) => setDate(e.target.value)}
                            />
                            <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all">
                                <CalendarDays size={18} className="text-emerald-500 group-hover:text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. MAIN LAYOUT */}
            <div className="max-w-[1400px] mx-auto px-4 w-full pb-20">

                {/* MAIN FEED */}
                <div className="min-h-[500px]">
                    {loading && !matches ? (
                        <div className="p-20 flex flex-col items-center justify-center">
                            <RefreshCw className="animate-spin text-emerald-500 mb-6" size={48} />
                            <div className="text-[10px] font-black tracking-[0.3em] text-emerald-500/60 uppercase">Analysing Pitch...</div>
                        </div>
                    ) : filteredMatches.length === 0 ? (
                        <div className="bg-[#1a1f24] rounded-2xl p-16 text-center border border-white/5 flex flex-col items-center shadow-2xl">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/5 flex items-center justify-center mb-6">
                                <Trophy size={40} className="text-emerald-500/20" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No Matches Scheduled</h3>
                            <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8">
                                There are no <span className="text-emerald-400 font-bold">{sport}</span> matches found for {displayDateLabel}. Try another sport or date.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setFilter('ALL'); setSelectedCountry(null); }}
                                    className="px-6 py-2.5 bg-emerald-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
                                >
                                    Reset Filters
                                </button>
                                <button
                                    onClick={() => setSport('football')}
                                    className="px-6 py-2.5 bg-white/5 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all"
                                >
                                    Browse Football
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredMatches.map(group => (
                                <div key={group.id} className="bg-[#1a1f24] rounded-lg overflow-hidden border border-white/5 shadow-sm">
                                    {/* League Header */}
                                    <div className="bg-[#23282d] px-4 py-2 flex items-center justify-between border-b border-white/5">
                                        <div className="flex items-center gap-3">
                                            <LeagueIcon country={group.country} />
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">{group.country}</span>
                                                <span className="text-gray-600">/</span>
                                                <span className="text-sm font-bold text-white tracking-tight">{group.league}</span>
                                            </div>
                                        </div>
                                        <div className="hidden md:flex items-center gap-2">
                                            <button className="text-[10px] font-bold text-gray-500 px-3 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-white transition-all uppercase tracking-wider">{t.standings}</button>
                                        </div>
                                    </div>

                                    {/* Match Rows - Google Styled */}
                                    <div className="divide-y divide-white/[0.03]">
                                        {group.items.map(match => (
                                            <div key={match.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer px-4 py-4">
                                                <div className="grid grid-cols-[80px_1fr_auto] md:grid-cols-[100px_1fr_150px] items-center gap-2">

                                                    {/* Time / Status Container */}
                                                    <div className="flex flex-col items-center justify-center text-center border-r border-white/5 pr-2">
                                                        {match.status === 'LIVE' ? (
                                                            <>
                                                                <span className="text-[10px] font-black text-red-500 animate-pulse tracking-tighter">LIVE</span>
                                                                <span className="text-xs font-black text-white">{match.time}'</span>
                                                            </>
                                                        ) : match.status === 'FINISHED' ? (
                                                            <>
                                                                <span className="text-[10px] font-bold text-gray-500">FT</span>
                                                                <span className="text-[10px] text-gray-600 mt-1 font-mono">{match.score}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Clock size={12} className="text-gray-600 mb-1" />
                                                                <span className="text-xs font-bold text-gray-400">{convertToIstanbulTime(match.time)}</span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Match Content */}
                                                    <div className="flex flex-col gap-3 px-2 md:px-6">
                                                        {/* Home Team */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                                                                    <Shield size={16} className="text-gray-400" />
                                                                </div>
                                                                <span className={`text-sm md:text-base ${match.score_home > match.score_away ? 'font-bold text-white' : 'text-gray-300'}`}>
                                                                    {match.home}
                                                                </span>
                                                            </div>
                                                            {match.status !== 'UPCOMING' && (
                                                                <span className={`text-lg font-mono ${match.score_home > match.score_away ? 'text-emerald-400 font-black' : 'text-white'}`}>
                                                                    {match.score_home}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Away Team */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                                                                    <Shield size={16} className="text-gray-400" />
                                                                </div>
                                                                <span className={`text-sm md:text-base ${match.score_away > match.score_home ? 'font-bold text-white' : 'text-gray-300'}`}>
                                                                    {match.away}
                                                                </span>
                                                            </div>
                                                            {match.status !== 'UPCOMING' && (
                                                                <span className={`text-lg font-mono ${match.score_away > match.score_home ? 'text-emerald-400 font-black' : 'text-white'}`}>
                                                                    {match.score_away}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Odds / Actions (Desktop) */}
                                                    <div className="hidden md:flex flex-col gap-2 scale-90 origin-right">
                                                        {match.odds ? (
                                                            <div className="flex gap-1">
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
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 4. ATHENA CHAT WIDGET */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
                <div className={`
                    pointer-events-auto bg-[#1a1f24] border border-[#10b981]/20 shadow-2xl rounded-xl w-80 mb-4 overflow-hidden 
                    transition-all duration-300 origin-bottom-right
                    ${chatOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8 pointer-events-none'}
                 `}>
                    <div className="bg-[#10b981] p-3 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <span className="font-bold text-sm">Athena Sport AI</span>
                        </div>
                        <X size={16} className="cursor-pointer hover:rotate-90 transition-transform" onClick={() => setChatOpen(false)} />
                    </div>
                    <div className="h-72 bg-[#121619] p-3 overflow-y-auto space-y-3 custom-scrollbar">
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
                        <input
                            className="bg-[#121619] flex-1 rounded px-3 py-2 text-xs text-white border border-white/5 focus:border-[#10b981] outline-none"
                            placeholder="Ask me for a prediction..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                        />
                        <button onClick={sendChat} className="text-[#10b981] hover:text-white p-2 transition-colors">
                            <Send size={16} />
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => setChatOpen(!chatOpen)}
                    className="pointer-events-auto bg-[#10b981] hover:bg-[#059669] text-white p-3.5 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center group"
                >
                    <MessageSquare size={24} fill="currentColor" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
            </div>

        </div>
    );
};

export default LiveScoreBoard;
