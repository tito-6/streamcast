import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Flag from 'react-world-flags';
import { ArrowLeft, ChevronDown, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ENGINE_URL = '/api/sports-engine';

type StandingsRow = {
    rank: number;
    team: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goals_for: number;
    goals_against: number;
    goals_str: string;
    goal_diff: number;
    points: number;
    form: string[];
};

type StandingsSection = { key: number; label: string; rows: StandingsRow[] };

type MatchLite = {
    id: string;
    status: string;
    home: string;
    away: string;
    score_home: number;
    score_away: number;
};

const copy = {
    en: {
        back: 'Back to live scores',
        liveTable: 'Live standings',
        table: 'Standings',
        formTab: 'Form',
        ouTab: 'O/U',
        htftTab: 'HT/FT',
        scorersTab: 'Top scorers',
        season: '2025/2026',
        colRank: '#',
        colTeam: 'Team',
        colPld: 'MP',
        colW: 'W',
        colD: 'D',
        colL: 'L',
        colG: 'G',
        colGd: 'GD',
        colPts: 'Pts',
        colForm: 'Form',
        tabSoon: 'Coming soon',
        loading: 'Loading…',
        error: 'Could not load standings.',
        conf: 'Group',
    },
    ar: {
        back: 'العودة للنتائج المباشرة',
        liveTable: 'الترتيب المباشر',
        table: 'الترتيب',
        formTab: 'الشكل',
        ouTab: 'أكثر/أقل',
        htftTab: 'ش/ن',
        scorersTab: 'الهدافون',
        season: '2025/2026',
        colRank: '#',
        colTeam: 'الفريق',
        colPld: 'ل',
        colW: 'ف',
        colD: 'ت',
        colL: 'خ',
        colG: 'أ',
        colGd: 'ف.أ',
        colPts: 'ن',
        colForm: 'الشكل',
        tabSoon: 'قريباً',
        loading: 'جاري التحميل…',
        error: 'تعذر تحميل الترتيب.',
        conf: 'مجموعة',
    },
    tr: {
        back: 'Canlı skorlara dön',
        liveTable: 'Canlı puan durumu',
        table: 'Puan durumu',
        formTab: 'Form',
        ouTab: 'Üst/Alt',
        htftTab: 'İY/MS',
        scorersTab: 'Gol krallığı',
        season: '2025/2026',
        colRank: '#',
        colTeam: 'Takım',
        colPld: 'O',
        colW: 'G',
        colD: 'B',
        colL: 'M',
        colG: 'G',
        colGd: 'AV',
        colPts: 'P',
        colForm: 'Form',
        tabSoon: 'Yakında',
        loading: 'Yükleniyor…',
        error: 'Puan durumu yüklenemedi.',
        conf: 'Grup',
    },
};

function normTeam(s: string) {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function liveContextForTeam(team: string, live: MatchLite[]) {
    const t = normTeam(team);
    for (const m of live) {
        if (m.status !== 'LIVE') continue;
        if (normTeam(m.home) === t || normTeam(m.away) === t) {
            return { score: `${m.score_home}:${m.score_away}` };
        }
    }
    return null;
}

function posBadgeClass(rank: number) {
    if (rank <= 2) return 'bg-[#2563eb] text-white shadow-[0_0_0_2px_rgba(37,99,235,0.35)]';
    if (rank <= 4) return 'bg-[#be185d] text-white shadow-[0_0_0_2px_rgba(190,24,93,0.35)]';
    return 'bg-white/10 text-gray-200';
}

const FormCells = ({ form }: { form: string[] }) => (
    <div className="flex items-center gap-0.5 justify-end shrink-0">
        <span
            className="w-4 h-4 rounded-[2px] bg-white/15 flex items-center justify-center text-[8px] font-black text-gray-500"
            title=""
            aria-hidden
        >
            ?
        </span>
        {Array.from({ length: 5 }).map((_, i) => {
            const ch = form[i];
            const cls =
                ch === 'W' || ch === 'G'
                    ? 'bg-emerald-600 text-white'
                    : ch === 'D' || ch === 'B'
                      ? 'bg-amber-500 text-black'
                      : ch === 'L' || ch === 'M'
                        ? 'bg-red-600 text-white'
                        : 'bg-white/10 text-gray-600';
            return (
                <span
                    key={i}
                    className={`w-4 h-4 rounded-[2px] text-[8px] font-black flex items-center justify-center ${cls}`}
                    aria-hidden
                >
                    {ch || '·'}
                </span>
            );
        })}
    </div>
);

export const LeagueStandingsDetail: React.FC<{
    ze: string;
    zc: string;
    sport: string;
    countryQ: string;
    leagueQ: string;
    logoQ: string;
    flagIso: string;
}> = ({ ze, zc, sport, countryQ, leagueQ, logoQ, flagIso }) => {
    const { language } = useLanguage();
    const t = copy[language as keyof typeof copy] || copy.en;
    const isRTL = language === 'ar';
    const [tab, setTab] = useState<'live' | 'table' | 'form' | 'ou' | 'htft' | 'scorers'>('live');
    const [, startTransition] = useTransition();
    const [standings, setStandings] = useState<{
        page_title: string;
        sections: StandingsSection[];
        error?: string;
    } | null>(null);
    const [liveMatches, setLiveMatches] = useState<MatchLite[]>([]);

    const headerLeague = leagueQ || standings?.page_title || '';
    const headerCountry = countryQ;

    const loadStandings = useCallback(async () => {
        setStandings(null);
        try {
            const res = await fetch(
                `${ENGINE_URL}/api/standings?${new URLSearchParams({ ze, zc }).toString()}`
            );
            const json = await res.json();
            setStandings(json);
        } catch {
            setStandings({ page_title: '', sections: [], error: 'network' });
        }
    }, [ze, zc]);

    const loadLive = useCallback(async () => {
        if (sport !== 'football') {
            setLiveMatches([]);
            return;
        }
        try {
            const res = await fetch(
                `${ENGINE_URL}/api/scores?sport=football&date=today&lang=${encodeURIComponent(language)}`
            );
            const json = await res.json();
            const leagues = json.all_leagues || [];
            const items: MatchLite[] = [];
            for (const g of leagues) {
                if (g.ze === ze && g.zc === zc && Array.isArray(g.items)) {
                    for (const m of g.items) {
                        items.push({
                            id: String(m.id),
                            status: m.status,
                            home: m.home,
                            away: m.away,
                            score_home: Number(m.score_home) || 0,
                            score_away: Number(m.score_away) || 0,
                        });
                    }
                }
            }
            setLiveMatches(items);
        } catch {
            setLiveMatches([]);
        }
    }, [ze, zc, sport, language]);

    useEffect(() => {
        void loadStandings();
    }, [loadStandings]);

    useEffect(() => {
        void loadLive();
        const i = setInterval(() => void loadLive(), 60000);
        return () => clearInterval(i);
    }, [loadLive]);

    const tabs: { id: typeof tab; label: string }[] = useMemo(
        () => [
            { id: 'live', label: t.liveTable },
            { id: 'table', label: t.table },
            { id: 'form', label: t.formTab },
            { id: 'ou', label: t.ouTab },
            { id: 'htft', label: t.htftTab },
            { id: 'scorers', label: t.scorersTab },
        ],
        [t]
    );

    const showTable = tab === 'live' || tab === 'table';
    const showPlaceholder = tab !== 'live' && tab !== 'table';

    return (
        <div
            className="min-h-screen bg-[#0b1215] text-gray-100 font-sans pb-16"
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            <div className="sticky top-0 z-30 bg-[#0b1215]/95 backdrop-blur border-b border-white/5">
                <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-2">
                    <Link
                        href="/sports/live-scores"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 min-h-[44px] px-2 rounded-lg hover:bg-white/5"
                    >
                        <ArrowLeft className="w-4 h-4 shrink-0 rtl:rotate-180" aria-hidden />
                        {t.back}
                    </Link>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-2 sm:px-4 pt-3">
                <div className="rounded-t-xl overflow-hidden border border-white/10 bg-[#0f171b] shadow-xl">
                    <div className="flex flex-wrap items-center gap-3 px-3 sm:px-4 py-3 bg-[#121c21] border-b border-white/5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            {logoQ ? (
                                <img
                                    src={logoQ}
                                    alt=""
                                    width={36}
                                    height={36}
                                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
                                    loading="eager"
                                    referrerPolicy="no-referrer"
                                />
                            ) : null}
                            <div className="w-7 h-7 shrink-0 flex items-center justify-center overflow-hidden rounded-sm">
                                {flagIso && /^[A-Za-z]{2}$/.test(flagIso) ? (
                                    <Flag code={flagIso.toUpperCase()} height="22" className="rounded-sm" />
                                ) : (
                                    <Globe className="w-5 h-5 text-gray-500" aria-hidden />
                                )}
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-white/90 truncate">
                                    {headerCountry ? `${headerCountry}: ` : ''}
                                    {headerLeague}
                                </h1>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                                    {standings?.page_title || headerLeague}
                                </p>
                            </div>
                        </div>
                        <div className="relative ms-auto">
                            <span className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-[#1a2429] border border-white/10 text-[11px] font-bold text-gray-300">
                                {t.season}
                                <ChevronDown className="w-3.5 h-3.5 text-gray-500" aria-hidden />
                            </span>
                        </div>
                    </div>

                    <div
                        className="flex gap-1 overflow-x-auto no-scrollbar px-2 py-2 bg-[#0f171b] border-b border-white/5"
                        role="tablist"
                        aria-label="Standings views"
                    >
                        {tabs.map((x) => (
                            <button
                                key={x.id}
                                type="button"
                                role="tab"
                                aria-selected={tab === x.id}
                                onClick={() => startTransition(() => setTab(x.id))}
                                className={`shrink-0 px-3 sm:px-4 py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wide transition-colors min-h-[40px] whitespace-nowrap ${
                                    tab === x.id
                                        ? 'bg-[#e6005c] text-white shadow-lg shadow-pink-900/30'
                                        : 'bg-[#1a2429] text-gray-400 hover:text-white border border-transparent hover:border-white/10'
                                }`}
                            >
                                {x.label}
                            </button>
                        ))}
                    </div>
                </div>

                {showPlaceholder ? (
                    <div className="mt-6 rounded-xl border border-white/10 bg-[#0f171b] px-6 py-16 text-center text-gray-500 text-sm font-medium">
                        {t.tabSoon}
                    </div>
                ) : null}

                {showTable ? (
                    <div className="mt-2 rounded-b-xl border border-t-0 border-white/10 bg-[#0f171b] overflow-hidden">
                        {!standings ? (
                            <div className="py-20 text-center text-gray-500 text-sm">{t.loading}</div>
                        ) : standings.error && !standings.sections?.length ? (
                            <div className="py-20 text-center text-red-400/90 text-sm">{t.error}</div>
                        ) : (
                            <div className="overflow-x-auto">
                                {(standings.sections || []).map((sec, si) => (
                                    <div key={sec.key} className={si > 0 ? 'border-t border-white/10' : ''}>
                                        {(standings.sections || []).length > 1 ? (
                                            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-[#0c1215]">
                                                {sec.label || `${t.conf} ${si + 1}`}
                                            </div>
                                        ) : null}
                                        <table className="w-full text-[11px] sm:text-xs border-collapse min-w-[640px]">
                                            <thead>
                                                <tr className="bg-[#121c21] text-gray-500 font-black uppercase tracking-wider text-[9px] sm:text-[10px]">
                                                    <th className="py-2.5 ps-2 pe-1 text-start w-10">{t.colRank}</th>
                                                    <th className="py-2.5 px-1 text-start min-w-[8rem]">{t.colTeam}</th>
                                                    <th className="py-2.5 px-1 text-center w-8">{t.colPld}</th>
                                                    <th className="py-2.5 px-1 text-center w-8">{t.colW}</th>
                                                    <th className="py-2.5 px-1 text-center w-8">{t.colD}</th>
                                                    <th className="py-2.5 px-1 text-center w-8">{t.colL}</th>
                                                    <th className="py-2.5 px-1 text-center w-12 font-mono">{t.colG}</th>
                                                    <th className="py-2.5 px-1 text-center w-10 font-mono">{t.colGd}</th>
                                                    <th className="py-2.5 px-1 text-center w-10 font-bold text-white">{t.colPts}</th>
                                                    <th className="py-2.5 pe-3 ps-1 text-end min-w-[7rem]">{t.colForm}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sec.rows.map((row, ri) => {
                                                    const zebra = ri % 2 === 1 ? 'bg-white/[0.02]' : 'bg-transparent';
                                                    const live = liveContextForTeam(row.team, liveMatches);
                                                    const gdStr =
                                                        row.goal_diff > 0
                                                            ? `+${row.goal_diff}`
                                                            : String(row.goal_diff);
                                                    const liveHighlight = tab === 'live' && !!live;
                                                    return (
                                                        <tr
                                                            key={`${row.rank}-${row.team}`}
                                                            className={`border-t border-white/[0.04] ${zebra} hover:bg-white/[0.04]`}
                                                        >
                                                            <td className="py-2.5 ps-2 pe-1 align-middle">
                                                                <span
                                                                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black ${posBadgeClass(row.rank)}`}
                                                                >
                                                                    {row.rank}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-1 align-middle">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shrink-0" />
                                                                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                                                        <span className="font-bold text-white truncate">
                                                                            {row.team}
                                                                        </span>
                                                                        {live ? (
                                                                            <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-600 text-white tabular-nums">
                                                                                {live.score}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-1 text-center text-gray-400 tabular-nums align-middle">
                                                                {row.played}
                                                            </td>
                                                            <td className="py-2.5 px-1 text-center text-gray-400 tabular-nums align-middle">
                                                                {row.won}
                                                            </td>
                                                            <td className="py-2.5 px-1 text-center text-gray-400 tabular-nums align-middle">
                                                                {row.drawn}
                                                            </td>
                                                            <td className="py-2.5 px-1 text-center text-gray-400 tabular-nums align-middle">
                                                                {row.lost}
                                                            </td>
                                                            <td
                                                                className={`py-2.5 px-1 text-center font-mono tabular-nums align-middle ${
                                                                    liveHighlight ? 'text-red-500 font-bold' : 'text-gray-300'
                                                                }`}
                                                            >
                                                                {row.goals_str}
                                                            </td>
                                                            <td className="py-2.5 px-1 text-center font-mono tabular-nums text-gray-400 align-middle">
                                                                {gdStr}
                                                            </td>
                                                            <td
                                                                className={`py-2.5 px-1 text-center font-black tabular-nums align-middle ${
                                                                    liveHighlight ? 'text-red-500' : 'text-white'
                                                                }`}
                                                            >
                                                                {row.points}
                                                            </td>
                                                            <td className="py-2.5 pe-3 ps-1 align-middle">
                                                                <FormCells form={row.form} />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
};
