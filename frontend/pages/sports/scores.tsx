import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    Zap, RefreshCw, Trophy, Globe, CalendarDays, Search, X,
    Dumbbell, Activity, Club, Target, Swords, Volleyball, CircleDot, Hand,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types matching /api/v2/scores                                       */
/* ------------------------------------------------------------------ */
interface TeamSide { name: string; logo: string; score: number | null }
interface MatchItem {
    id: string;
    status: 'LIVE' | 'FINISHED' | 'UPCOMING';
    status_text: string;
    minute: string;
    start_time: string;
    start_ts: number;
    home: TeamSide;
    away: TeamSide;
}
interface Competition {
    id: string;
    name: string;
    country: string;
    logo: string;
    flag: string;
    matches: MatchItem[];
}
interface ScoresV2 {
    date: string;
    sport: string;
    provider: string;
    competitions: Competition[];
    summary: { total: number; live: number; finished: number; upcoming: number };
    notice?: string;
}

/* ------------------------------------------------------------------ */
/* i18n                                                                */
/* ------------------------------------------------------------------ */
const L: Record<string, any> = {
    en: {
        title: 'Live Scores', heading: 'SCORE CENTER',
        sub: 'Live results with team crests and minute-by-minute updates, across every sport.',
        liveBadge: 'Live updates', yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow',
        all: 'All', live: 'Live', finished: 'Finished', upcoming: 'Upcoming',
        noMatches: 'No matches found', searchPh: 'Search team or competition…',
        matches: 'matches', updated: 'Updated', refresh: 'Refresh', ft: 'FT',
        sports: {
            football: 'Football', basketball: 'Basketball', tennis: 'Tennis', hockey: 'Hockey',
            'american-football': 'NFL', baseball: 'Baseball', handball: 'Handball',
            volleyball: 'Volleyball', cricket: 'Cricket', mma: 'MMA',
        },
    },
    ar: {
        title: 'النتائج المباشرة', heading: 'مركز النتائج',
        sub: 'نتائج مباشرة مع شعارات الفرق وتحديثات دقيقة بدقيقة، لجميع الرياضات.',
        liveBadge: 'تحديثات مباشرة', yesterday: 'أمس', today: 'اليوم', tomorrow: 'غدا',
        all: 'الكل', live: 'مباشر', finished: 'انتهت', upcoming: 'قادمة',
        noMatches: 'لا توجد مباريات', searchPh: 'ابحث عن فريق أو بطولة…',
        matches: 'مباراة', updated: 'آخر تحديث', refresh: 'تحديث', ft: 'انتهت',
        sports: {
            football: 'كرة القدم', basketball: 'كرة السلة', tennis: 'التنس', hockey: 'الهوكي',
            'american-football': 'كرة القدم الأمريكية', baseball: 'البيسبول', handball: 'كرة اليد',
            volleyball: 'الكرة الطائرة', cricket: 'الكريكيت', mma: 'فنون قتالية',
        },
    },
    tr: {
        title: 'Canlı Skorlar', heading: 'SKOR MERKEZİ',
        sub: 'Takım armaları ve dakika dakika güncellemelerle tüm sporlarda canlı sonuçlar.',
        liveBadge: 'Canlı güncellemeler', yesterday: 'Dün', today: 'Bugün', tomorrow: 'Yarın',
        all: 'Tümü', live: 'Canlı', finished: 'Bitti', upcoming: 'Yaklaşan',
        noMatches: 'Maç bulunamadı', searchPh: 'Takım veya turnuva ara…',
        matches: 'maç', updated: 'Güncellendi', refresh: 'Yenile', ft: 'MS',
        sports: {
            football: 'Futbol', basketball: 'Basketbol', tennis: 'Tenis', hockey: 'Hokey',
            'american-football': 'NFL', baseball: 'Beyzbol', handball: 'Hentbol',
            volleyball: 'Voleybol', cricket: 'Kriket', mma: 'MMA',
        },
    },
};

const SPORTS: { id: string; icon: React.ReactNode }[] = [
    { id: 'football', icon: <Trophy size={15} /> },
    { id: 'basketball', icon: <Dumbbell size={15} /> },
    { id: 'tennis', icon: <Activity size={15} /> },
    { id: 'hockey', icon: <Club size={15} /> },
    { id: 'american-football', icon: <Target size={15} /> },
    { id: 'baseball', icon: <CircleDot size={15} /> },
    { id: 'handball', icon: <Hand size={15} /> },
    { id: 'volleyball', icon: <Volleyball size={15} /> },
    { id: 'cricket', icon: <Globe size={15} /> },
    { id: 'mma', icon: <Swords size={15} /> },
];

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://sportevent.online';

/* Country label: prefer localized name from the ISO flag code. */
const countryLabel = (comp: Competition, lang: string): string => {
    if (comp.flag) {
        try {
            const dn = new Intl.DisplayNames([lang], { type: 'region' });
            const name = dn.of(comp.flag.toUpperCase());
            if (name && name !== comp.flag.toUpperCase()) return name;
        } catch { /* fall back below */ }
    }
    return comp.country;
};

/* Convert HH:MM UTC to the viewer's local time. */
const localKickoff = (m: MatchItem): string => {
    if (m.start_ts > 0) {
        try {
            return new Date(m.start_ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { /* noop */ }
    }
    return m.start_time || m.status_text || '';
};

/* Lightweight flag via flagcdn (avoids bundling every SVG flag). */
const CountryFlag = ({ code }: { code: string }) => {
    const [failed, setFailed] = useState(false);
    if (!code || failed) return <Globe size={14} className="text-gray-500" />;
    return (
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
            alt={code}
            loading="lazy"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover"
        />
    );
};

const TeamLogo = ({ src, name }: { src: string; name: string }) => {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black text-white/70 shrink-0">
                {(name || '?').slice(0, 2).toUpperCase()}
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={name}
            loading="lazy"
            onError={() => setFailed(true)}
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow"
        />
    );
};

const StatusBadge = ({ m, t }: { m: MatchItem; t: any }) => {
    if (m.status === 'LIVE') {
        return (
            <span className="inline-flex items-center gap-1.5 text-red-400 font-black text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping-slow" />
                {m.minute || m.status_text || t.live}
            </span>
        );
    }
    if (m.status === 'FINISHED') {
        return <span className="text-gray-500 font-bold text-xs uppercase">{t.ft}</span>;
    }
    return <span className="text-gray-400 font-semibold text-xs tabular-nums">{localKickoff(m)}</span>;
};

const ScoreCell = ({ m }: { m: MatchItem }) => {
    const s = (v: number | null) => (v === null ? '–' : v);
    const homeWin = m.status === 'FINISHED' && (m.home.score ?? 0) > (m.away.score ?? 0);
    const awayWin = m.status === 'FINISHED' && (m.away.score ?? 0) > (m.home.score ?? 0);
    const liveCls = m.status === 'LIVE' ? 'text-red-400' : 'text-white';
    return (
        <div className={`flex flex-col items-center justify-center leading-tight tabular-nums font-black text-base sm:text-lg ${liveCls}`}>
            <span className={homeWin ? '' : awayWin ? 'opacity-50' : ''}>{s(m.home.score)}</span>
            <span className={awayWin ? '' : homeWin ? 'opacity-50' : ''}>{s(m.away.score)}</span>
        </div>
    );
};

const GoogleScoresPage = () => {
    const { language } = useLanguage();
    const t = L[language] || L.en;
    const isRTL = language === 'ar';

    const [sport, setSport] = useState('football');
    const [date, setDate] = useState('today');
    const [statusFilter, setStatusFilter] = useState<'all' | 'LIVE' | 'FINISHED' | 'UPCOMING'>('all');
    const [query, setQuery] = useState('');
    const [data, setData] = useState<ScoresV2 | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetchScores = useCallback(async (silent = false) => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        if (!silent) setLoading(true);
        try {
            const res = await fetch(
                `/api/sports-engine/api/v2/scores?sport=${encodeURIComponent(sport)}&date=${encodeURIComponent(date)}&lang=${language}`,
                { signal: ac.signal }
            );
            const json: ScoresV2 = await res.json();
            setData(json);
            setUpdatedAt(new Date());
        } catch (e: any) {
            if (e?.name !== 'AbortError') console.error('scores v2 fetch', e);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [sport, date, language]);

    useEffect(() => { fetchScores(); }, [fetchScores]);

    /* Auto-refresh: 30s while the tab is visible. */
    useEffect(() => {
        const id = setInterval(() => {
            if (document.visibilityState === 'visible') fetchScores(true);
        }, 30000);
        return () => clearInterval(id);
    }, [fetchScores]);

    const filtered = useMemo(() => {
        const comps = data?.competitions || [];
        const q = query.trim().toLowerCase();
        return comps
            .map((c) => ({
                ...c,
                matches: c.matches.filter((m) => {
                    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
                    if (!q) return true;
                    return (
                        m.home.name.toLowerCase().includes(q) ||
                        m.away.name.toLowerCase().includes(q) ||
                        c.name.toLowerCase().includes(q) ||
                        c.country.toLowerCase().includes(q)
                    );
                }),
            }))
            .filter((c) => c.matches.length > 0)
            .sort((a, b) => {
                const la = a.matches.some((m) => m.status === 'LIVE') ? 0 : 1;
                const lb = b.matches.some((m) => m.status === 'LIVE') ? 0 : 1;
                return la - lb;
            });
    }, [data, statusFilter, query]);

    const summary = data?.summary || { total: 0, live: 0, finished: 0, upcoming: 0 };
    const canonicalUrl = `${SITE_ORIGIN.replace(/\/$/, '')}/sports/scores`;

    return (
        <div className={`bg-[#0b0e11] min-h-screen text-white font-cairo ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <Head>
                <title>{`${t.title} | Sport Events`}</title>
                <meta name="description" content={t.sub} />
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="robots" content="index,follow" />
                <link rel="canonical" href={canonicalUrl} />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <meta property="og:type" content="website" />
                <meta property="og:title" content={`${t.title} | Sport Events`} />
                <meta property="og:description" content={t.sub} />
                <meta property="og:url" content={canonicalUrl} />
            </Head>

            <Navbar />

            <main className="relative z-10 pt-20 sm:pt-24 pb-20" id="main-content">
                {/* Header */}
                <div className="container mx-auto px-3 sm:px-4 mb-5">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-white/5 pb-6">
                        <div className="min-w-0">
                            <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest inline-flex items-center gap-1 mb-2">
                                <Zap size={10} fill="currentColor" aria-hidden /> {t.liveBadge}
                            </span>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-2">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">{t.heading}</span>
                            </h1>
                            <p className="text-gray-400 max-w-xl text-sm md:text-base font-medium leading-relaxed">{t.sub}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5" role="group">
                                {[
                                    { id: 'yesterday', label: t.yesterday },
                                    { id: 'today', label: t.today },
                                    { id: 'tomorrow', label: t.tomorrow },
                                ].map((d) => (
                                    <button
                                        key={d.id}
                                        type="button"
                                        aria-pressed={date === d.id}
                                        onClick={() => setDate(d.id)}
                                        className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                            date === d.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                            <label className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 min-h-[50px] cursor-pointer">
                                <CalendarDays size={16} className="text-emerald-400" />
                                <input
                                    type="date"
                                    className="bg-transparent text-xs font-bold text-gray-300 outline-none [color-scheme:dark]"
                                    onChange={(e) => e.target.value && setDate(e.target.value)}
                                    aria-label="date"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Sport tabs */}
                <div className="container mx-auto px-3 sm:px-4 mb-4">
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar" role="tablist">
                        {SPORTS.map((s) => (
                            <button
                                key={s.id}
                                role="tab"
                                aria-selected={sport === s.id}
                                onClick={() => setSport(s.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                                    sport === s.id
                                        ? 'bg-white text-black border-white shadow-lg'
                                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                                }`}
                            >
                                {s.icon} {t.sports[s.id] || s.id}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters row */}
                <div className="container mx-auto px-3 sm:px-4 mb-6 flex flex-wrap items-center gap-2">
                    {([
                        ['all', t.all, summary.total],
                        ['LIVE', t.live, summary.live],
                        ['FINISHED', t.finished, summary.finished],
                        ['UPCOMING', t.upcoming, summary.upcoming],
                    ] as const).map(([id, label, count]) => (
                        <button
                            key={id}
                            onClick={() => setStatusFilter(id as any)}
                            className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-all inline-flex items-center gap-2 ${
                                statusFilter === id
                                    ? id === 'LIVE'
                                        ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                        : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                            }`}
                        >
                            {id === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                            {label}
                            <span className="opacity-60 tabular-nums">{count}</span>
                        </button>
                    ))}

                    <div className="relative ms-auto min-w-[220px] flex-1 sm:flex-none sm:w-72">
                        <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-gray-500 ${isRTL ? 'right-3' : 'left-3'}`} />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t.searchPh}
                            className={`w-full bg-white/5 border border-white/10 rounded-lg py-2.5 text-xs text-white outline-none focus:border-emerald-500 ${isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'}`}
                        />
                        {query && (
                            <button onClick={() => setQuery('')} className={`absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-white ${isRTL ? 'left-2.5' : 'right-2.5'}`} aria-label="clear">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => fetchScores()}
                        className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
                        aria-label={t.refresh}
                        title={updatedAt ? `${t.updated} ${updatedAt.toLocaleTimeString()}` : t.refresh}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Content */}
                <div className="container mx-auto px-3 sm:px-4 space-y-4">
                    {loading && !data && (
                        <div className="space-y-3" aria-busy="true">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-24 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
                            ))}
                        </div>
                    )}

                    {!loading && filtered.length === 0 && (
                        <div className="text-center py-24 text-gray-500 font-semibold">
                            <Globe size={40} className="mx-auto mb-4 opacity-30" />
                            {t.noMatches}
                        </div>
                    )}

                    {filtered.map((comp) => (
                        <section key={comp.id} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
                            <header className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border-b border-white/5">
                                {comp.flag ? (
                                    <span className="w-6 h-4 overflow-hidden rounded-[3px] shrink-0 shadow">
                                        <CountryFlag code={comp.flag} />
                                    </span>
                                ) : comp.logo ? (
                                    <img src={comp.logo} alt="" className="w-5 h-5 object-contain shrink-0" loading="lazy" />
                                ) : (
                                    <Globe size={14} className="text-gray-500 shrink-0" />
                                )}
                                <div className="min-w-0">
                                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold truncate">
                                        {countryLabel(comp, language)}
                                    </div>
                                    <h2 className="text-sm font-black text-white truncate">{comp.name}</h2>
                                </div>
                                <span className="ms-auto text-[10px] text-gray-500 font-bold tabular-nums shrink-0">
                                    {comp.matches.length} {t.matches}
                                </span>
                            </header>

                            <ul className="divide-y divide-white/5">
                                {comp.matches.map((m) => (
                                    <li key={m.id} className={`px-3 sm:px-4 py-3 hover:bg-white/[0.03] transition-colors ${m.status === 'LIVE' ? 'bg-red-500/[0.04]' : ''}`}>
                                        <div className="grid grid-cols-[64px_1fr_auto] sm:grid-cols-[80px_1fr_auto] items-center gap-3">
                                            <div className="text-center">
                                                <StatusBadge m={m} t={t} />
                                            </div>
                                            <div className="min-w-0 space-y-1.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <TeamLogo src={m.home.logo} name={m.home.name} />
                                                    <span className={`truncate text-sm font-bold ${m.status === 'FINISHED' && (m.home.score ?? 0) < (m.away.score ?? 0) ? 'text-gray-500' : 'text-white'}`}>
                                                        {m.home.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <TeamLogo src={m.away.logo} name={m.away.name} />
                                                    <span className={`truncate text-sm font-bold ${m.status === 'FINISHED' && (m.away.score ?? 0) < (m.home.score ?? 0) ? 'text-gray-500' : 'text-white'}`}>
                                                        {m.away.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <ScoreCell m={m} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </main>

            <div className="geometric-pattern fixed inset-0 pointer-events-none z-0 opacity-10" aria-hidden />
            <Footer />

            <style jsx global>{`
                .font-cairo { font-family: 'Cairo', sans-serif; }
                .rtl { direction: rtl; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes ping-slow {
                    0% { opacity: 1; }
                    50% { opacity: 0.35; }
                    100% { opacity: 1; }
                }
                .animate-ping-slow { animation: ping-slow 1.4s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default GoogleScoresPage;
