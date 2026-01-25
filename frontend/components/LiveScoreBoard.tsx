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
    CircleDot, Shell, Sword, Anchor
} from 'lucide-react';

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
const SPORTS = [
    { id: 'football', label: 'Football' },
    { id: 'tennis', label: 'Tennis' },
    { id: 'basketball', label: 'Basketball' },
    { id: 'hockey', label: 'Hockey' },
    { id: 'american-football', label: 'Am. Football' },
    { id: 'baseball', label: 'Baseball' },
    { id: 'handball', label: 'Handball' },
    { id: 'rugby-union', label: 'Rugby Union' },
    { id: 'rugby-league', label: 'Rugby League' },
    { id: 'volleyball', label: 'Volleyball' },
    { id: 'cricket', label: 'Cricket' },
    { id: 'darts', label: 'Darts' },
    { id: 'snooker', label: 'Snooker' },
    { id: 'boxing', label: 'Boxing' },
    { id: 'mma', label: 'MMA' },
    { id: 'esports', label: 'Esports' },
    { id: 'badminton', label: 'Badminton' },
    { id: 'golf', label: 'Golf' },
    { id: 'motorsport', label: 'Motorsport' },
    { id: 'table-tennis', label: 'Table Tennis' },
];

export const LiveScoreBoard: React.FC<LiveScoreBoardProps> = ({ globalDate: initialDate }) => {
    const { language } = useLanguage();
    const ENGINE_URL = "/api/sports-engine";

    // --- State ---
    const [sport, setSport] = useState('football');
    const [date, setDate] = useState(initialDate);
    const [displayDateLabel, setDisplayDateLabel] = useState('TODAY');
    const [filter, setFilter] = useState('ALL');
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [matches, setMatches] = useState<LeagueGroup[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [datePickerOpen, setDatePickerOpen] = useState(false);

    // Chat
    const [chatOpen, setChatOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // --- Data Fetching ---
    const fetchScores = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${ENGINE_URL}/api/scores?sport=${sport}&date=${date}&lang=${language}`);
            const json = await res.json();
            if (json.all_leagues) setMatches(json.all_leagues);
            else setMatches([]);

            if (date === 'today') setDisplayDateLabel('TODAY');
            else if (date === 'yesterday') setDisplayDateLabel('YESTERDAY');
            else if (date === 'tomorrow') setDisplayDateLabel('TOMORROW');
            else setDisplayDateLabel(date);

        } catch (e) {
            console.error(e);
            setMatches([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScores();
        setMatches(null);
        setSelectedCountry(null);
    }, [sport, date]);

    useEffect(() => {
        const i = setInterval(() => { if (date === 'today') fetchScores(); }, 60000);
        return () => clearInterval(i);
    }, [sport, date]);

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
            <div className="bg-[#121619] border-b border-white/10 sticky top-0 z-40">
                <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-1 overflow-x-auto custom-scrollbar no-scrollbar">
                    {SPORTS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSport(s.id)}
                            className={`flex items-center gap-2 px-4 py-4 text-xs font-bold uppercase transition-all whitespace-nowrap border-b-2
                                ${sport === s.id
                                    ? 'text-[#ff3c00] border-[#ff3c00] bg-white/5'
                                    : 'text-[#9ca3af] border-transparent hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className={`text-sm ${sport === s.id ? 'text-[#ff3c00]' : 'opacity-80'}`}>{getSportIcon(s.id)}</span>
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. FILTER & DATE BAR */}
            <div className="bg-[#1a1f24] border-b border-white/10 mb-4 z-30 shadow-md">
                <div className="max-w-[1400px] mx-auto px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-4">

                    {/* Filters */}
                    <div className="flex items-center gap-1 overflow-x-auto">
                        {['ALL', 'LIVE', 'ODDS', 'FINISHED', 'SCHEDULED'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all border border-transparent
                                    ${filter === f
                                        ? 'bg-[#3b4046] text-white border-white/10 shadow-sm'
                                        : 'text-[#9ca3af] hover:bg-[#2a2f35] hover:text-white'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Date Navigation & Picker */}
                    <div className="flex items-center gap-2 bg-[#2a2f35] p-1 rounded-lg border border-white/5 overflow-x-auto">
                        <button
                            onClick={() => setDate('yesterday')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors whitespace-nowrap ${date === 'yesterday' ? 'bg-[#10b981] text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Yesterday
                        </button>
                        <button
                            onClick={() => setDate('today')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors whitespace-nowrap ${date === 'today' ? 'bg-[#10b981] text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setDate('tomorrow')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors whitespace-nowrap ${date === 'tomorrow' ? 'bg-[#10b981] text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Tomorrow
                        </button>

                        <div className="w-px h-4 bg-white/10 mx-1"></div>

                        <div className="relative flex items-center gap-2 px-2">
                            <CalendarDays size={14} className="text-[#10b981]" />
                            <input
                                type="date"
                                className="bg-transparent text-white text-[10px] font-bold outline-none uppercase cursor-pointer"
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. MAIN LAYOUT */}
            <div className="max-w-[1400px] mx-auto px-4 w-full flex flex-col lg:flex-row gap-6 pb-20">

                {/* SIDEBAR (Left) */}
                <div className="lg:w-60 flex-shrink-0 flex flex-col gap-4 hidden lg:flex">

                    {/* Pinned Leagues */}
                    <div className="bg-[#1a1f24] rounded-lg overflow-hidden border border-white/5">
                        <div className="p-3 bg-[#23282d] text-[11px] font-bold text-white uppercase flex items-center gap-2 border-b border-white/5">
                            <Star size={12} className="text-[#10b981]" fill="currentColor" />
                            Pinned Leagues
                        </div>
                        <div className="p-2 space-y-1">
                            {['Premier League', 'LaLiga', 'Champions League', 'Bundesliga'].map(l => (
                                <div key={l} className="px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#2a2f35] rounded cursor-pointer transition-colors flex items-center justify-between group">
                                    {l}
                                    <Star size={10} className="opacity-0 group-hover:opacity-100 text-gray-600" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Countries List */}
                    <div className="bg-[#1a1f24] rounded-lg overflow-hidden border border-white/5 flex-1 relative">
                        <div className="p-3 bg-[#23282d] text-[11px] font-bold text-white uppercase flex items-center gap-2 border-b border-white/5 sticky top-0 z-10">
                            <Globe size={12} className="text-gray-400" />
                            Countries
                        </div>
                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                            {countries.length === 0 && <div className="p-4 text-xs text-gray-500 italic">No leagues available</div>}
                            {countries.map(c => (
                                <div
                                    key={c}
                                    onClick={() => setSelectedCountry(selectedCountry === c ? null : c)}
                                    className={`px-4 py-2 border-b border-white/5 text-xs font-medium cursor-pointer transition-colors flex items-center justify-between
                                        ${selectedCountry === c
                                            ? 'bg-[#10b981] text-white'
                                            : 'text-gray-300 hover:bg-[#2a2f35] hover:text-white'
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <LeagueIcon country={c} />
                                        {c}
                                    </span>
                                    {selectedCountry === c && <CheckCircle size={12} />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MAIN FEED (Center) */}
                <div className="flex-1 min-h-[500px]">
                    {loading && !matches ? (
                        <div className="p-20 flex flex-col items-center justify-center opacity-50">
                            <RefreshCw className="animate-spin text-[#10b981] mb-4" size={32} />
                            <div className="text-xs font-bold tracking-widest text-[#10b981]">LOADING {sport.toUpperCase()}...</div>
                        </div>
                    ) : filteredMatches.length === 0 ? (
                        <div className="bg-[#1a1f24] rounded-lg p-12 text-center border border-white/5 flex flex-col items-center">
                            <Trophy size={48} className="text-gray-700 mb-4" />
                            <div className="text-gray-500 text-sm">No matches found for <span className="text-white font-bold">{displayDateLabel}</span></div>
                            {selectedCountry && (
                                <div className="mt-2 text-xs text-red-400">Filter: {selectedCountry}</div>
                            )}
                            <button onClick={() => { setFilter('ALL'); setSelectedCountry(null); }} className="mt-4 px-4 py-2 bg-[#2a2f35] rounded text-xs text-white hover:bg-[#3b4046]">Reset Filters</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredMatches.map(group => (
                                <div key={group.id} className="bg-[#1a1f24] rounded-lg overflow-hidden border border-white/5 shadow-sm">
                                    {/* League Header */}
                                    <div className="bg-[#23282d] px-4 py-2 flex items-center justify-between border-b border-white/5">
                                        <div className="flex items-center gap-3">
                                            {/* Local Logo Fallback */}
                                            <LeagueIcon country={group.country} />

                                            <div className="flex flex-col leading-tight">
                                                <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-wide">{group.country}</span>
                                                <span className="text-sm font-bold text-white tracking-tight">{group.league}</span>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-500 cursor-pointer hover:text-white uppercase tracking-wider">Standings</div>
                                    </div>

                                    {/* Match Rows */}
                                    <div className="divide-y divide-white/5">
                                        {group.items.map(match => (
                                            <div key={match.id} className="group hover:bg-[#2a2f35] transition-colors cursor-pointer px-4 py-3 flex items-center gap-3 md:gap-4">

                                                {/* Status / Time */}
                                                <div className="w-12 md:w-14 flex-shrink-0 text-center">
                                                    {match.status === 'LIVE' ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[9px] font-black text-[#ff3c00] animate-pulse">LIVE</span>
                                                            <span className="text-xs font-bold text-[#ff3c00]">{match.time}'</span>
                                                        </div>
                                                    ) : match.status === 'FINISHED' ? (
                                                        <span className="text-xs font-bold text-gray-500">FT</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-400">{match.time}</span>
                                                    )}
                                                </div>

                                                {/* Teams & Scores */}
                                                <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-6">
                                                    {/* Home */}
                                                    <div className={`flex items-center justify-end gap-2 md:gap-3 ${match.score_home > match.score_away ? 'font-bold text-white' : 'text-gray-300'}`}>
                                                        <span className="text-sm text-right leading-tight line-clamp-1">{match.home}</span>
                                                        <Shield size={14} className="text-gray-600 flex-shrink-0" />
                                                    </div>

                                                    {/* Score */}
                                                    <div className="bg-[#121619] text-white font-bold font-mono text-sm px-2 py-1 rounded min-w-[40px] text-center tracking-widest border border-white/5">
                                                        {match.status === 'UPCOMING' ? '-:-' : match.score}
                                                    </div>

                                                    {/* Away */}
                                                    <div className={`flex items-center justify-start gap-2 md:gap-3 ${match.score_away > match.score_home ? 'font-bold text-white' : 'text-gray-300'}`}>
                                                        <Shield size={14} className="text-gray-600 flex-shrink-0" />
                                                        <span className="text-sm text-left leading-tight line-clamp-1">{match.away}</span>
                                                    </div>
                                                </div>

                                                {/* Odds Column (Right Side) */}
                                                {(filter === 'ODDS' || match.odds) && (
                                                    <div className="hidden md:flex gap-1 ml-4 border-l border-white/5 pl-4">
                                                        {match.odds ? (
                                                            <>
                                                                <div className="flex flex-col items-center justify-center bg-[#23282d] hover:bg-[#32383e] w-10 h-8 rounded text-[10px] text-gray-300 font-bold cursor-pointer transition-colors border border-white/5">
                                                                    <span className="text-[8px] opacity-50">1</span>
                                                                    {match.odds["1"]}
                                                                </div>
                                                                <div className="flex flex-col items-center justify-center bg-[#23282d] hover:bg-[#32383e] w-10 h-8 rounded text-[10px] text-gray-300 font-bold cursor-pointer transition-colors border border-white/5">
                                                                    <span className="text-[8px] opacity-50">X</span>
                                                                    {match.odds["X"]}
                                                                </div>
                                                                <div className="flex flex-col items-center justify-center bg-[#23282d] hover:bg-[#32383e] w-10 h-8 rounded text-[10px] text-gray-300 font-bold cursor-pointer transition-colors border border-white/5">
                                                                    <span className="text-[8px] opacity-50">2</span>
                                                                    {match.odds["2"]}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="text-[9px] text-gray-600 italic">No Odds</div>
                                                        )}
                                                    </div>
                                                )}

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
