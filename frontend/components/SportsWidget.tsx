import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronDown, Trophy, Users, Calendar, BarChart2, Filter, AlertCircle } from 'lucide-react';
import { getImageUrl } from '../utils/image';

// --- Types ---
interface Match {
    id: number;
    home: string;
    away: string;
    score: string;
    time: string;
    status: string;
    home_logo?: string;
    away_logo?: string;
}

interface MatchGroup {
    group_title: string;
    items: Match[];
}

interface Standing {
    rank: number;
    team: string;
    logo: string;
    played: number;
    points: number;
    won: number;
    drawn: number;
    lost: number;
    gd: number;
    form: string[];
}

interface Player {
    number: number;
    name: string;
    pos: string;
    rating: number;
    image?: string;
}

interface StatLeader {
    rank: number;
    name: string;
    team: string;
    value: number;
    image?: string;
}

interface SportsWidgetProps {
    league: string;
    globalDate: string;
}

// --- Labels & Translations ---
const getLabels = (lang: string) => {
    switch (lang) {
        case 'ar':
            return {
                overview: 'نظرة عامة', matches: 'المباريات', standings: 'الترتيب', stats: 'الإحصائيات', players: 'اللاعبين',
                games: 'لعب', w: 'ف', d: 'ت', l: 'خ', pts: 'ن', form: 'شكل', gd: '+/-',
                scorers: 'الهدافين', assists: 'التمريرات',
                season: 'الموسم', no_data: 'لا تتوفر بيانات'
            };
        case 'tr':
            return {
                overview: 'Genel Bakış', matches: 'Maçlar', standings: 'Puan Durumu', stats: 'İstatistikler', players: 'Oyuncular',
                games: 'O', w: 'G', d: 'B', l: 'M', pts: 'P', form: 'Form', gd: 'Av',
                scorers: 'Gol Krallığı', assists: 'Asist Krallığı',
                season: 'Sezon', no_data: 'Veri yok'
            };
        default:
            return {
                overview: 'Overview', matches: 'Matches', standings: 'Standings', stats: 'Stats', players: 'Players',
                games: 'GP', w: 'W', d: 'D', l: 'L', pts: 'Pts', form: 'Form', gd: 'GD',
                scorers: 'Top Scorers', assists: 'Top Assists',
                season: 'Season', no_data: 'No data available'
            };
    }
}

const SportsWidget: React.FC<SportsWidgetProps> = ({ league, globalDate }) => {
    const { language } = useLanguage();
    const t = getLabels(language);

    // Tab State: 0=Overview, 1=Matches, 2=Standings, 3=Stats, 4=Players
    const [activeTab, setActiveTab] = useState(0);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [imgError, setImgError] = useState<Record<string, boolean>>({});

    const ENGINE_URL = "/api/sports-engine";

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${ENGINE_URL}/api/league/${encodeURIComponent(league)}?date=${globalDate}&lang=${language}`);
            const json = await res.json();
            if (json.overview) {
                setData(json.overview);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // 10s poll
        return () => clearInterval(interval);
    }, [league, globalDate, language]);

    // Handle Image Fallback
    const handleImgError = (id: string | number) => {
        setImgError(prev => ({ ...prev, [id]: true }));
    };

    const getLogo = (url: string | undefined, id: string | number) => {
        if (!url || imgError[id]) return "https://upload.wikimedia.org/wikipedia/commons/d/d3/Soccerball.svg";
        return getImageUrl(url);
    };

    // --- Sub-Components ---

    const MatchesList = ({ limit }: { limit?: number }) => {
        const groups = data?.matches || [];
        if (!groups.length) return <div className="p-8 text-center text-gray-500">{t.no_data}</div>;

        return (
            <div className="space-y-6">
                {groups.map((group: MatchGroup, idx: number) => (
                    <div key={idx}>
                        {/* Google-like date header */}
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{group.group_title}</span>
                            <div className="flex-1 h-px bg-white/10"></div>
                        </div>
                        <div className="bg-[#1e1e1e] border border-white/5 rounded-xl overflow-hidden shadow-sm">
                            {group.items.slice(0, limit || 999).map((match) => (
                                <div key={match.id} className="flex items-center py-3 px-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer group">
                                    {/* Home */}
                                    <div className="flex items-center gap-3 w-[40%]">
                                        <div className="w-6 h-6 flex-shrink-0">
                                            <img
                                                src={getLogo(match.home_logo, `m_h_${match.id}`)}
                                                onError={() => handleImgError(`m_h_${match.id}`)}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <span className={`text-sm font-medium truncate ${match.score && match.score.split('-')[0] > match.score.split('-')[1] ? 'text-white' : 'text-gray-400'}`}>
                                            {match.home}
                                        </span>
                                    </div>

                                    {/* Score */}
                                    <div className="flex flex-col items-center justify-center w-[20%]">
                                        {match.status === 'UPCOMING' ? (
                                            <span className="text-xs font-mono text-gray-500">{match.time}</span>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-1 font-bold text-white tracking-widest bg-[#0a0a0a] px-2 py-0.5 rounded border border-white/5">
                                                    {match.score}
                                                </div>
                                                {match.status === 'LIVE' && <span className="text-[9px] text-red-500 animate-pulse mt-1 font-bold">• LIVE {match.time}</span>}
                                            </>
                                        )}
                                    </div>

                                    {/* Away */}
                                    <div className="flex items-center justify-end gap-3 w-[40%]">
                                        <span className={`text-sm font-medium text-right truncate ${match.score && match.score.split('-')[1] > match.score.split('-')[0] ? 'text-white' : 'text-gray-400'}`}>
                                            {match.away}
                                        </span>
                                        <div className="w-6 h-6 flex-shrink-0">
                                            <img
                                                src={getLogo(match.away_logo, `m_a_${match.id}`)}
                                                onError={() => handleImgError(`m_a_${match.id}`)}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const StandingsTable = ({ compact }: { compact?: boolean }) => {
        const list = data?.standings || [];
        if (!list.length) return <div className="p-8 text-center text-gray-500">{t.no_data}</div>;

        const displayList = compact ? list.slice(0, 5) : list;

        return (
            <div className="bg-[#1e1e1e] border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-[10px] text-gray-500 border-b border-white/10 uppercase bg-[#252525]">
                            <th className="p-3 w-8 text-center">#</th>
                            <th className="p-3">Team</th>
                            <th className="p-3 text-center">{t.games}</th>
                            <th className="p-3 text-center">{t.pts}</th>
                            {!compact && <>
                                <th className="p-3 text-center hidden sm:table-cell">{t.w}</th>
                                <th className="p-3 text-center hidden sm:table-cell">{t.d}</th>
                                <th className="p-3 text-center hidden sm:table-cell">{t.l}</th>
                                <th className="p-3 text-center hidden sm:table-cell">{t.gd}</th>
                                <th className="p-3 text-center hidden md:table-cell">{t.form}</th>
                            </>}
                        </tr>
                    </thead>
                    <tbody>
                        {displayList.map((row: Standing, i: number) => (
                            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                                <td className={`p-3 text-center text-xs font-bold ${row.rank <= 4 ? 'text-emerald-400 border-l-2 border-emerald-500' : 'text-gray-500'}`}>
                                    {row.rank}
                                </td>
                                <td className="p-3 flex items-center gap-3">
                                    <img src={getLogo(row.logo, `t_${row.rank}`)} onError={() => handleImgError(`t_${row.rank}`)} className="w-5 h-5 object-contain" />
                                    <span className={`text-sm font-medium ${row.rank <= 4 ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                        {row.team}
                                    </span>
                                </td>
                                <td className="p-3 text-center text-xs text-gray-400">{row.played}</td>
                                <td className="p-3 text-center text-sm font-bold text-white">{row.points}</td>
                                {!compact && <>
                                    <td className="p-3 text-center text-xs text-gray-500 hidden sm:table-cell">{row.won}</td>
                                    <td className="p-3 text-center text-xs text-gray-500 hidden sm:table-cell">{row.drawn}</td>
                                    <td className="p-3 text-center text-xs text-gray-500 hidden sm:table-cell">{row.lost}</td>
                                    <td className="p-3 text-center text-xs text-gray-500 hidden sm:table-cell">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                                    <td className="p-3 text-center hidden md:table-cell">
                                        <div className="flex justify-center gap-0.5">
                                            {row.form?.map((f, fi) => (
                                                <div key={fi} className={`w-1.5 h-4 rounded-sm ${f === 'W' ? 'bg-green-500' : f === 'D' ? 'bg-gray-500' : 'bg-red-500'}`} />
                                            ))}
                                        </div>
                                    </td>
                                </>}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {compact && (
                    <div className="p-2 text-center border-t border-white/5">
                        <span className="text-xs text-emerald-400 font-bold cursor-pointer hover:underline" onClick={() => setActiveTab(2)}>
                            Show Full Table
                        </span>
                    </div>
                )}
            </div>
        );
    };

    const StatsList = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1e1e1e] border border-white/5 rounded-xl p-4">
                <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
                    <Trophy size={14} className="text-yellow-400" /> {t.scorers}
                </h4>
                <div className="space-y-3">
                    {data?.stats?.top_scorers?.map((p: StatLeader, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-black text-gray-700 w-4">{p.rank}</span>
                                <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden">
                                    {p.image && <img src={getImageUrl(p.image)} className="w-full h-full object-cover" />}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">{p.name}</div>
                                    <div className="text-[10px] text-gray-500">{p.team}</div>
                                </div>
                            </div>
                            <div className="text-lg font-bold text-emerald-400">{p.value}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-[#1e1e1e] border border-white/5 rounded-xl p-4">
                <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
                    <Users size={14} className="text-blue-400" /> {t.assists}
                </h4>
                <div className="space-y-3">
                    {data?.stats?.assists?.map((p: StatLeader, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-black text-gray-700 w-4">{p.rank}</span>
                                <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden">
                                    {p.image && <img src={getImageUrl(p.image)} className="w-full h-full object-cover" />}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">{p.name}</div>
                                    <div className="text-[10px] text-gray-500">{p.team}</div>
                                </div>
                            </div>
                            <div className="text-lg font-bold text-blue-400">{p.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const PlayersGrid = () => (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {data?.players?.map((p: Player, i: number) => (
                <div key={i} className="bg-[#1e1e1e] border border-white/5 p-3 rounded-lg hover:border-emerald-500/50 transition-all cursor-pointer group">
                    <div className="aspect-square rounded-lg bg-black/20 mb-3 overflow-hidden relative">
                        {p.image ? (
                            <img src={getImageUrl(p.image)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                            <Users className="text-gray-700" size={32} />
                        )}
                        <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-bold px-1.5 rounded backdrop-blur-md">
                            {p.rating}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-white text-xs font-bold truncate">{p.name}</div>
                        <div className="text-[10px] text-gray-500 uppercase">{p.pos} • #{p.number}</div>
                    </div>
                </div>
            ))}
        </div>
    );

    // --- Main Render ---

    const Tabs = [
        { id: 0, label: t.overview, icon: Filter },
        { id: 1, label: t.matches, icon: Calendar },
        { id: 2, label: t.standings, icon: Trophy },
        { id: 3, label: t.stats, icon: BarChart2 },
        { id: 4, label: t.players, icon: Users },
    ];

    if (loading && !data) return <div className="h-64 bg-white/5 animate-pulse rounded-2xl"></div>;

    return (
        <div className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl font-sans mb-12">
            {/* Header / Dropdowns */}
            <div className="p-6 pb-0 bg-gradient-to-b from-[#1a1a1a] to-[#121212]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg p-2">
                            <img
                                src={
                                    league.includes("Premier") ? "https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg" :
                                        league.includes("Liga") ? "https://upload.wikimedia.org/wikipedia/commons/0/0f/LaLiga_logo_2023.svg" :
                                            "/placeholder.png"
                                }
                                className="w-full h-full object-contain"
                                alt={league}
                            />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">{league}</h2>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                <span>Football</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600" />
                                <span>England</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors">
                            {t.season} 2024/25 <ChevronDown size={14} />
                        </button>
                    </div>
                </div>

                {/* Tabs Row */}
                <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                    {Tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'border-emerald-500 text-emerald-400'
                                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                                }`}
                        >
                            {/* {tab.id === 0 && <tab.icon size={14} />} */}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 bg-[#121212] min-h-[400px]">

                {/* 0: Overview Mode (Split View) */}
                {activeTab === 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: Matches */}
                        <div className="lg:col-span-2 space-y-8">
                            <div>
                                <h3 className="text-white font-bold mb-4">{t.matches}</h3>
                                <MatchesList limit={5} />
                                <button className="w-full py-3 mt-2 text-sm font-bold text-gray-400 hover:text-white bg-[#1e1e1e] rounded-b-xl border border-t-0 border-white/5 transition-colors" onClick={() => setActiveTab(1)}>
                                    Show all matches
                                </button>
                            </div>

                            <div>
                                <h3 className="text-white font-bold mb-4">{t.standings}</h3>
                                <StandingsTable compact />
                            </div>
                        </div>

                        {/* Right: Stats & Info */}
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-white font-bold mb-4">{t.stats}</h3>
                                <div className="bg-[#1e1e1e] border border-white/5 rounded-xl p-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">{t.scorers}</h4>
                                    <div className="space-y-4">
                                        {data?.stats?.top_scorers?.slice(0, 5).map((p: StatLeader, i: number) => (
                                            <div key={i} className="flex items-center justify-between group cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-black/40 overflow-hidden ring-1 ring-white/10 group-hover:ring-emerald-500 transition-all">
                                                        {p.image && <img src={getImageUrl(p.image)} className="w-full h-full object-cover" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">{p.name}</div>
                                                        <div className="text-[9px] text-gray-500">{p.team}</div>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-black text-white">{p.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 1: Matches Mode (Full) */}
                {activeTab === 1 && <MatchesList />}

                {/* 2: Standings Mode (Full) */}
                {activeTab === 2 && <StandingsTable />}

                {/* 3: Stats Mode (Full) */}
                {activeTab === 3 && <StatsList />}

                {/* 4: Players Mode (Full) */}
                {activeTab === 4 && <PlayersGrid />}

            </div>
        </div>
    );
};

export default SportsWidget;
