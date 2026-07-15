import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    RefreshCw, Trophy, Globe, Search, X, ChevronLeft, ChevronRight,
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
        title: 'Live Scores', heading: 'Scores',
        sub: 'Live results with team crests and minute-by-minute updates, across every sport.',
        all: 'All', live: 'Live', finished: 'Finished', upcoming: 'Upcoming',
        noMatches: 'No matches found', searchPh: 'Search team or competition',
        matches: 'matches', updated: 'Updated', refresh: 'Refresh', ft: 'FT',
        today: 'Today', locale: 'en', otherComps: 'Other competitions',
        sports: {
            football: 'Football', basketball: 'Basketball', tennis: 'Tennis', hockey: 'Hockey',
            'american-football': 'NFL', baseball: 'Baseball', handball: 'Handball',
            volleyball: 'Volleyball', cricket: 'Cricket', mma: 'MMA',
        },
    },
    ar: {
        title: 'النتائج المباشرة', heading: 'النتائج',
        sub: 'نتائج مباشرة مع شعارات الفرق وتحديثات دقيقة بدقيقة، لجميع الرياضات.',
        all: 'الكل', live: 'مباشر', finished: 'انتهت', upcoming: 'قادمة',
        noMatches: 'لا توجد مباريات', searchPh: 'ابحث عن فريق أو بطولة',
        matches: 'مباراة', updated: 'آخر تحديث', refresh: 'تحديث', ft: 'انتهت',
        today: 'اليوم', locale: 'ar', otherComps: 'بطولات أخرى',
        sports: {
            football: 'كرة القدم', basketball: 'كرة السلة', tennis: 'التنس', hockey: 'الهوكي',
            'american-football': 'كرة القدم الأمريكية', baseball: 'البيسبول', handball: 'كرة اليد',
            volleyball: 'الكرة الطائرة', cricket: 'الكريكيت', mma: 'فنون قتالية',
        },
    },
    tr: {
        title: 'Canlı Skorlar', heading: 'Skorlar',
        sub: 'Takım armaları ve dakika dakika güncellemelerle tüm sporlarda canlı sonuçlar.',
        all: 'Tümü', live: 'Canlı', finished: 'Bitti', upcoming: 'Yaklaşan',
        noMatches: 'Maç bulunamadı', searchPh: 'Takım veya turnuva ara',
        matches: 'maç', updated: 'Güncellendi', refresh: 'Yenile', ft: 'MS',
        today: 'Bugün', locale: 'tr', otherComps: 'Diğer turnuvalar',
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

/* ------------------------------------------------------------------ */
/* Featured leagues: pinned order + localized names (football)         */
/* ------------------------------------------------------------------ */

/* Lowercase, strip accents and Turkish diacritics so matching survives
   whatever language the upstream feed is in. */
const norm = (s: string) =>
    (s || '')
        .toLowerCase()
        .replace(/ş/g, 's').replace(/ü/g, 'u').replace(/ö/g, 'o')
        .replace(/ç/g, 'c').replace(/ı/g, 'i').replace(/ğ/g, 'g')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

interface FeaturedLeague {
    id: string;
    flag: string;                        // ISO2 when the competition is national
    countries: string[];                 // normalized country names (any feed language)
    include: RegExp;                     // tested against normalized league name
    exclude?: RegExp;
    names: { en: string; ar: string; tr: string };
    region: { en: string; ar: string; tr: string };
}

const FEATURED_LEAGUES: FeaturedLeague[] = [
    {
        id: 'bundesliga', flag: 'DE', countries: ['almanya', 'germany', 'deutschland'],
        include: /\bbundesliga\b/, exclude: /\b2\b|\bfrauen\b|women|bayanlar/,
        names: { en: 'Bundesliga', ar: 'الدوري الألماني - بوندسليغا', tr: 'Bundesliga' },
        region: { en: 'Germany', ar: 'ألمانيا', tr: 'Almanya' },
    },
    {
        id: 'ligue1', flag: 'FR', countries: ['fransa', 'france'],
        include: /\bligue 1\b|\blig 1\b/, exclude: /women|bayanlar/,
        names: { en: 'Ligue 1', ar: 'الدوري الفرنسي - ليغ 1', tr: 'Ligue 1' },
        region: { en: 'France', ar: 'فرنسا', tr: 'Fransa' },
    },
    {
        id: 'premier-league', flag: 'GB', countries: ['ingiltere', 'england'],
        include: /\bpremier (league|lig)\b/, exclude: /women|bayanlar|u21|u18|2\b/,
        names: { en: 'Premier League', ar: 'الدوري الإنجليزي الممتاز', tr: 'Premier Lig' },
        region: { en: 'England', ar: 'إنجلترا', tr: 'İngiltere' },
    },
    {
        id: 'laliga', flag: 'ES', countries: ['ispanya', 'spain', 'espana'],
        include: /\blaliga\b|\bla liga\b/, exclude: /\b2\b|women|bayanlar/,
        names: { en: 'LaLiga', ar: 'الدوري الإسباني - لا ليغا', tr: 'LaLiga' },
        region: { en: 'Spain', ar: 'إسبانيا', tr: 'İspanya' },
    },
    {
        id: 'serie-a', flag: 'IT', countries: ['italya', 'italy', 'italia'],
        include: /\bserie a\b/, exclude: /women|bayanlar/,
        names: { en: 'Serie A', ar: 'الدوري الإيطالي - سيري آ', tr: 'Serie A' },
        region: { en: 'Italy', ar: 'إيطاليا', tr: 'İtalya' },
    },
    {
        id: 'super-lig', flag: 'TR', countries: ['turkiye', 'turkey'],
        include: /\bsuper lig\b/, exclude: /women|bayanlar/,
        names: { en: 'Süper Lig', ar: 'الدوري التركي الممتاز', tr: 'Süper Lig' },
        region: { en: 'Türkiye', ar: 'تركيا', tr: 'Türkiye' },
    },
    {
        id: 'tff-1-lig', flag: 'TR', countries: ['turkiye', 'turkey'],
        include: /\b1\.? lig\b/, exclude: /super|women|bayanlar/,
        names: { en: 'TFF 1. Lig', ar: 'دوري الدرجة الأولى التركي', tr: 'TFF 1. Lig' },
        region: { en: 'Türkiye', ar: 'تركيا', tr: 'Türkiye' },
    },
    {
        id: 'turkiye-kupasi', flag: 'TR', countries: ['turkiye', 'turkey'],
        include: /kupa|\bcup\b/, exclude: /super kupa|super cup|women|bayanlar/,
        names: { en: 'Turkish Cup', ar: 'كأس تركيا', tr: 'Türkiye Kupası' },
        region: { en: 'Türkiye', ar: 'تركيا', tr: 'Türkiye' },
    },
    {
        id: 'champions-league', flag: '', countries: ['avrupa', 'europe'],
        include: /sampiyonlar|champions league/, exclude: /women|bayanlar/,
        names: { en: 'Champions League', ar: 'دوري أبطال أوروبا', tr: 'Şampiyonlar Ligi' },
        region: { en: 'Europe', ar: 'أوروبا', tr: 'Avrupa' },
    },
    {
        id: 'europa-league', flag: '', countries: ['avrupa', 'europe'],
        include: /\bavrupa ligi\b|\beuropa league\b/, exclude: /konferans|conference/,
        names: { en: 'Europa League', ar: 'الدوري الأوروبي', tr: 'Avrupa Ligi' },
        region: { en: 'Europe', ar: 'أوروبا', tr: 'Avrupa' },
    },
    {
        id: 'conference-league', flag: '', countries: ['avrupa', 'europe'],
        include: /konferans|conference league/,
        names: { en: 'Conference League', ar: 'دوري المؤتمر الأوروبي', tr: 'Konferans Ligi' },
        region: { en: 'Europe', ar: 'أوروبا', tr: 'Avrupa' },
    },
    {
        id: 'nations-league', flag: '', countries: ['avrupa', 'europe'],
        include: /uluslar|nations league/, exclude: /women|bayanlar/,
        names: { en: 'UEFA Nations League', ar: 'دوري الأمم الأوروبية', tr: 'UEFA Uluslar Ligi' },
        region: { en: 'Europe', ar: 'أوروبا', tr: 'Avrupa' },
    },
    {
        id: 'world-cup', flag: '', countries: ['dunya', 'world'],
        include: /dunya kupasi|world cup/, exclude: /women|bayanlar|u20|u17|kulupler|club/,
        names: { en: 'World Cup', ar: 'كأس العالم', tr: 'Dünya Kupası' },
        region: { en: 'World', ar: 'العالم', tr: 'Dünya' },
    },
];

/* Match a competition from the feed to a featured league. Returns index or -1. */
const featuredIndex = (comp: Competition): number => {
    const league = norm(comp.name);
    const country = norm(comp.country);
    for (let i = 0; i < FEATURED_LEAGUES.length; i++) {
        const f = FEATURED_LEAGUES[i];
        const countryOk =
            (f.flag && comp.flag && comp.flag.toUpperCase() === f.flag) ||
            f.countries.some((c) => country.includes(c));
        if (!countryOk) continue;
        if (f.exclude && f.exclude.test(league)) continue;
        if (f.include.test(league)) return i;
    }
    return -1;
};

/* Common stage qualifiers appended after the league name, localized. */
const SUFFIX_I18N: Record<string, { en: string; ar: string; tr: string }> = {
    'elemeler': { en: 'Qualification', ar: 'التصفيات', tr: 'Elemeler' },
    'playofflar': { en: 'Play-offs', ar: 'الملحق', tr: 'Playofflar' },
    'play offs': { en: 'Play-offs', ar: 'الملحق', tr: 'Playofflar' },
    'qualification': { en: 'Qualification', ar: 'التصفيات', tr: 'Elemeler' },
    'grup asamasi': { en: 'Group stage', ar: 'دور المجموعات', tr: 'Grup Aşaması' },
    'group stage': { en: 'Group stage', ar: 'دور المجموعات', tr: 'Grup Aşaması' },
    'final': { en: 'Final', ar: 'النهائي', tr: 'Final' },
};

/* Suffix after the base name (e.g. " - Elemeler"), localized when known. */
const leagueSuffix = (rawName: string, lang3: 'en' | 'ar' | 'tr'): string => {
    const m = rawName.match(/\s[-–]\s(.+)$/);
    if (!m) return '';
    const raw = m[1];
    const tr = SUFFIX_I18N[norm(raw)];
    return tr ? tr[lang3] : raw;
};

/* Google dark-theme palette */
const G = {
    bg: '#202124',
    card: '#303134',
    cardHover: '#35363a',
    border: '#3c4043',
    text: '#e8eaed',
    dim: '#9aa0a6',
    blue: '#8ab4f8',
    red: '#f28b82',
    green: '#81c995',
};

/* ------------------------------------------------------------------ */
/* Date strip: 7-day carousel centered on today (Google "Matches" tab) */
/* ------------------------------------------------------------------ */
const buildDates = (locale: string, todayLabel: string) => {
    const out: { id: string; day: string; label: string; isToday: boolean }[] = [];
    for (let off = -3; off <= 3; off++) {
        const d = new Date();
        d.setDate(d.getDate() + off);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const id = off === -1 ? 'yesterday' : off === 0 ? 'today' : off === 1 ? 'tomorrow' : iso;
        out.push({
            id,
            day: d.toLocaleDateString(locale, { weekday: 'short' }),
            label: off === 0 ? todayLabel : d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
            isToday: off === 0,
        });
    }
    return out;
};

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
    if (!code || failed) return <Globe size={14} style={{ color: G.dim }} />;
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

const TeamLogo = ({ src, name, size = 24 }: { src: string; name: string; size?: number }) => {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return (
            <div
                className="rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{ width: size, height: size, background: G.border, color: G.dim }}
            >
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
            className="object-contain shrink-0"
            style={{ width: size, height: size }}
        />
    );
};

/* ------------------------------------------------------------------ */
/* Google-style match card                                             */
/* ------------------------------------------------------------------ */
const MatchCard = ({ m, t }: { m: MatchItem; t: any }) => {
    const homeWin = m.status === 'FINISHED' && (m.home.score ?? 0) > (m.away.score ?? 0);
    const awayWin = m.status === 'FINISHED' && (m.away.score ?? 0) > (m.home.score ?? 0);

    const headerLeft =
        m.status === 'UPCOMING'
            ? localKickoff(m)
            : m.start_ts > 0
                ? new Date(m.start_ts * 1000).toLocaleDateString(t.locale, { weekday: 'short', day: 'numeric', month: 'short' })
                : '';

    return (
        <div
            className="g-card rounded-xl p-3 transition-colors"
            style={{ background: G.card, border: `1px solid ${G.border}` }}
        >
            {/* Header: date/time + status pill */}
            <div className="flex items-center justify-between mb-2.5">
                <span className="text-[12px] font-medium" style={{ color: G.dim }}>{headerLeft}</span>
                {m.status === 'LIVE' ? (
                    <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded"
                        style={{ color: G.red, background: 'rgba(242,139,130,0.12)' }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: G.red }} />
                        {m.minute || m.status_text || t.live}
                    </span>
                ) : m.status === 'FINISHED' ? (
                    <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded"
                        style={{ color: G.dim, background: G.border }}
                    >
                        {t.ft}
                    </span>
                ) : null}
            </div>

            {/* Teams */}
            {([['home', homeWin, awayWin], ['away', awayWin, homeWin]] as const).map(([side, isWin, otherWin]) => {
                const team = m[side];
                const dimmed = m.status === 'FINISHED' && otherWin;
                return (
                    <div key={side} className="flex items-center gap-2.5 py-1 min-w-0">
                        <TeamLogo src={team.logo} name={team.name} />
                        <span
                            className="truncate text-[14px] flex-1"
                            style={{ color: dimmed ? G.dim : G.text, fontWeight: isWin ? 700 : 500 }}
                        >
                            {team.name}
                        </span>
                        <span
                            className="text-[15px] tabular-nums shrink-0 w-7 text-end"
                            style={{
                                color: m.status === 'LIVE' ? G.red : dimmed ? G.dim : G.text,
                                fontWeight: isWin || m.status === 'LIVE' ? 700 : 500,
                            }}
                        >
                            {team.score === null ? '' : team.score}
                        </span>
                        {isWin && (
                            <span className="shrink-0 text-[10px]" style={{ color: G.dim }} aria-hidden>◂</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

/* ------------------------------------------------------------------ */
const GoogleScoresPage = () => {
    const { language } = useLanguage();
    const t = L[language] || L.en;
    const isRTL = language === 'ar';

    const [sport, setSport] = useState('football');
    const [date, setDate] = useState('today');
    const [statusFilter, setStatusFilter] = useState<'all' | 'LIVE' | 'FINISHED' | 'UPCOMING'>('all');
    const [leagueFilter, setLeagueFilter] = useState<string>('');
    const [query, setQuery] = useState('');
    const [data, setData] = useState<ScoresV2 | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const dateStripRef = useRef<HTMLDivElement | null>(null);

    const dates = useMemo(() => buildDates(t.locale, t.today), [t]);

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

    type AnnotatedComp = Competition & { fIdx: number; displayName: string; displayRegion: string };

    const annotated = useMemo<AnnotatedComp[]>(() => {
        const comps = data?.competitions || [];
        const lang3 = (language === 'ar' || language === 'tr' ? language : 'en') as 'en' | 'ar' | 'tr';
        return comps.map((c) => {
            const fIdx = sport === 'football' ? featuredIndex(c) : -1;
            let displayName = c.name;
            let displayRegion = countryLabel(c, language);
            if (fIdx >= 0) {
                const f = FEATURED_LEAGUES[fIdx];
                const suffix = leagueSuffix(c.name, lang3);
                displayName = f.names[lang3] + (suffix ? ` — ${suffix}` : '');
                displayRegion = f.region[lang3];
            }
            return { ...c, fIdx, displayName, displayRegion };
        });
    }, [data, sport, language]);

    /* Featured chips for leagues that actually have matches on the selected day. */
    const featuredChips = useMemo(() => {
        const found = new Map<number, { logo: string; flag: string }>();
        for (const c of annotated) {
            if (c.fIdx >= 0 && !found.has(c.fIdx)) found.set(c.fIdx, { logo: c.logo, flag: c.flag });
        }
        const lang3 = (language === 'ar' || language === 'tr' ? language : 'en') as 'en' | 'ar' | 'tr';
        return FEATURED_LEAGUES
            .map((f, i) => ({ id: f.id, idx: i, label: f.names[lang3], flag: f.flag, present: found.has(i), logo: found.get(i)?.logo || '' }))
            .filter((f) => f.present);
    }, [annotated, language]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return annotated
            .filter((c) => !leagueFilter || (c.fIdx >= 0 && FEATURED_LEAGUES[c.fIdx].id === leagueFilter))
            .map((c) => ({
                ...c,
                matches: c.matches.filter((m) => {
                    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
                    if (!q) return true;
                    return (
                        m.home.name.toLowerCase().includes(q) ||
                        m.away.name.toLowerCase().includes(q) ||
                        c.name.toLowerCase().includes(q) ||
                        c.displayName.toLowerCase().includes(q) ||
                        c.country.toLowerCase().includes(q)
                    );
                }),
            }))
            .filter((c) => c.matches.length > 0)
            .sort((a, b) => {
                /* Featured leagues first in the pinned order, then live, then rest. */
                const fa = a.fIdx >= 0 ? a.fIdx : 999;
                const fb = b.fIdx >= 0 ? b.fIdx : 999;
                if (fa !== fb) return fa - fb;
                const la = a.matches.some((m) => m.status === 'LIVE') ? 0 : 1;
                const lb = b.matches.some((m) => m.status === 'LIVE') ? 0 : 1;
                return la - lb;
            });
    }, [annotated, statusFilter, query, leagueFilter]);

    const summary = data?.summary || { total: 0, live: 0, finished: 0, upcoming: 0 };
    const canonicalUrl = `${SITE_ORIGIN.replace(/\/$/, '')}/sports/scores`;

    const scrollStrip = (dir: number) => {
        dateStripRef.current?.scrollBy({ left: dir * 180 * (isRTL ? -1 : 1), behavior: 'smooth' });
    };

    return (
        <div className={`min-h-screen g-root ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'} style={{ background: G.bg, color: G.text }}>
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

            <main className="relative z-10 pt-20 sm:pt-24 pb-20 g-font" id="main-content">
                <div className="max-w-3xl lg:max-w-6xl mx-auto px-3 sm:px-5">

                    {/* Title card (Google knowledge-panel header) */}
                    <div
                        className="rounded-2xl px-5 py-4 mb-3 flex items-center gap-4"
                        style={{ background: G.card, border: `1px solid ${G.border}` }}
                    >
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: G.border }}
                        >
                            <Trophy size={22} style={{ color: G.blue }} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-[22px] sm:text-[26px] font-normal leading-tight" style={{ color: G.text }}>
                                {t.heading}
                                <span className="ms-2 align-middle text-[12px] font-medium" style={{ color: G.dim }}>
                                    {t.sports[sport] || sport}
                                </span>
                            </h1>
                            {updatedAt && (
                                <p className="text-[12px]" style={{ color: G.dim }}>
                                    {t.updated} {updatedAt.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => fetchScores()}
                            className="p-2.5 rounded-full transition-colors hover:bg-white/5 shrink-0"
                            aria-label={t.refresh}
                            style={{ color: G.dim }}
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Sport chips */}
                    <div className="flex gap-2 overflow-x-auto pb-1 mb-3 no-scrollbar" role="tablist">
                        {SPORTS.map((s) => (
                            <button
                                key={s.id}
                                role="tab"
                                aria-selected={sport === s.id}
                                onClick={() => { setSport(s.id); setLeagueFilter(''); }}
                                className="g-chip flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors"
                                style={
                                    sport === s.id
                                        ? { background: G.text, color: G.bg, border: `1px solid ${G.text}`, fontWeight: 700 }
                                        : { background: 'transparent', color: G.text, border: `1px solid ${G.border}` }
                                }
                            >
                                {s.icon} {t.sports[s.id] || s.id}
                            </button>
                        ))}
                    </div>

                    {/* Featured league chips (football only, when present on this day) */}
                    {featuredChips.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 no-scrollbar">
                            {featuredChips.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setLeagueFilter(leagueFilter === f.id ? '' : f.id)}
                                    aria-pressed={leagueFilter === f.id}
                                    className="g-chip flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors"
                                    style={
                                        leagueFilter === f.id
                                            ? { background: 'rgba(138,180,248,0.18)', color: G.blue, border: `1px solid rgba(138,180,248,0.5)`, fontWeight: 700 }
                                            : { background: G.card, color: G.text, border: `1px solid ${G.border}` }
                                    }
                                >
                                    {f.logo ? (
                                        <img src={f.logo} alt="" className="w-4 h-4 object-contain" loading="lazy" />
                                    ) : f.flag ? (
                                        <span className="w-4 h-3 overflow-hidden rounded-[2px]">
                                            <CountryFlag code={f.flag} />
                                        </span>
                                    ) : (
                                        <Trophy size={12} style={{ color: G.blue }} />
                                    )}
                                    {f.label}
                                </button>
                            ))}
                            {leagueFilter && (
                                <button
                                    onClick={() => setLeagueFilter('')}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap"
                                    style={{ color: G.dim, border: `1px dashed ${G.border}` }}
                                >
                                    <X size={12} /> {t.all}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Date strip */}
                    <div
                        className="rounded-2xl mb-3 flex items-center"
                        style={{ background: G.card, border: `1px solid ${G.border}` }}
                    >
                        <button onClick={() => scrollStrip(-1)} className="p-2 hover:bg-white/5 rounded-s-2xl self-stretch" aria-label="prev" style={{ color: G.dim }}>
                            {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                        <div ref={dateStripRef} className="flex-1 flex gap-1 overflow-x-auto no-scrollbar px-1 py-2">
                            {dates.map((d) => (
                                <button
                                    key={d.id}
                                    onClick={() => setDate(d.id)}
                                    aria-pressed={date === d.id}
                                    className="flex flex-col items-center px-4 py-1.5 rounded-lg min-w-[76px] transition-colors"
                                    style={
                                        date === d.id
                                            ? { background: 'rgba(138,180,248,0.15)' }
                                            : {}
                                    }
                                >
                                    <span className="text-[11px] font-medium uppercase" style={{ color: date === d.id ? G.blue : G.dim }}>
                                        {d.day}
                                    </span>
                                    <span className="text-[13px] font-bold" style={{ color: date === d.id ? G.blue : G.text }}>
                                        {d.label}
                                    </span>
                                </button>
                            ))}
                            <label className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg cursor-pointer min-w-[76px]">
                                <input
                                    type="date"
                                    className="bg-transparent text-[12px] font-medium outline-none [color-scheme:dark] w-[104px]"
                                    style={{ color: G.dim }}
                                    onChange={(e) => e.target.value && setDate(e.target.value)}
                                    aria-label="date"
                                />
                            </label>
                        </div>
                        <button onClick={() => scrollStrip(1)} className="p-2 hover:bg-white/5 rounded-e-2xl self-stretch" aria-label="next" style={{ color: G.dim }}>
                            {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </button>
                    </div>

                    {/* Status chips + search */}
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                        {([
                            ['all', t.all, summary.total],
                            ['LIVE', t.live, summary.live],
                            ['FINISHED', t.finished, summary.finished],
                            ['UPCOMING', t.upcoming, summary.upcoming],
                        ] as const).map(([id, label, count]) => (
                            <button
                                key={id}
                                onClick={() => setStatusFilter(id as any)}
                                className="px-3.5 py-1.5 rounded-full text-[12px] font-medium inline-flex items-center gap-2 transition-colors"
                                style={
                                    statusFilter === id
                                        ? id === 'LIVE'
                                            ? { background: 'rgba(242,139,130,0.15)', color: G.red, border: `1px solid rgba(242,139,130,0.4)` }
                                            : { background: 'rgba(138,180,248,0.15)', color: G.blue, border: `1px solid rgba(138,180,248,0.4)` }
                                        : { background: 'transparent', color: G.dim, border: `1px solid ${G.border}` }
                                }
                            >
                                {id === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: G.red }} />}
                                {label}
                                <span className="opacity-70 tabular-nums">{count}</span>
                            </button>
                        ))}

                        <div className="relative ms-auto min-w-[200px] flex-1 sm:flex-none sm:w-72">
                            <Search size={14} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'}`} style={{ color: G.dim }} />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t.searchPh}
                                className={`w-full rounded-full py-2 text-[13px] outline-none transition-colors ${isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'}`}
                                style={{ background: G.card, border: `1px solid ${G.border}`, color: G.text }}
                            />
                            {query && (
                                <button onClick={() => setQuery('')} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'}`} style={{ color: G.dim }} aria-label="clear">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    {loading && !data && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" aria-busy="true">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-[116px] rounded-xl animate-pulse" style={{ background: G.card }} />
                            ))}
                        </div>
                    )}

                    {!loading && filtered.length === 0 && (
                        <div className="text-center py-24" style={{ color: G.dim }}>
                            <Globe size={40} className="mx-auto mb-4 opacity-40" />
                            <p className="font-medium">{t.noMatches}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {filtered.map((comp, ci) => {
                            const isFeatured = comp.fIdx >= 0;
                            const prevFeatured = ci > 0 ? filtered[ci - 1].fIdx >= 0 : true;
                            const showDivider = !isFeatured && prevFeatured && ci > 0 && !leagueFilter;
                            return (
                                <React.Fragment key={comp.id}>
                                    {showDivider && (
                                        <div className="flex items-center gap-3 pt-2" aria-hidden>
                                            <span className="flex-1 h-px" style={{ background: G.border }} />
                                            <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: G.dim }}>
                                                {t.otherComps}
                                            </span>
                                            <span className="flex-1 h-px" style={{ background: G.border }} />
                                        </div>
                                    )}
                                    <section>
                                        {/* Competition header (Google league strip) */}
                                        <header className="flex items-center gap-2.5 px-1 mb-2.5">
                                            {comp.logo ? (
                                                <img src={comp.logo} alt="" className="w-[22px] h-[22px] object-contain shrink-0 drop-shadow" loading="lazy" />
                                            ) : comp.flag ? (
                                                <span className="w-5 h-[14px] overflow-hidden rounded-[2px] shrink-0">
                                                    <CountryFlag code={comp.flag} />
                                                </span>
                                            ) : (
                                                <Globe size={14} style={{ color: G.dim }} className="shrink-0" />
                                            )}
                                            <h2 className="text-[14px] font-bold truncate" style={{ color: isFeatured ? G.blue : G.text }}>
                                                {comp.displayName}
                                            </h2>
                                            {comp.logo && comp.flag && (
                                                <span className="w-4 h-3 overflow-hidden rounded-[2px] shrink-0">
                                                    <CountryFlag code={comp.flag} />
                                                </span>
                                            )}
                                            <span className="text-[12px] truncate" style={{ color: G.dim }}>
                                                · {comp.displayRegion}
                                            </span>
                                            <span className="ms-auto text-[11px] tabular-nums shrink-0" style={{ color: G.dim }}>
                                                {comp.matches.length} {t.matches}
                                            </span>
                                        </header>

                                        {/* Match cards grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                            {comp.matches.map((m) => (
                                                <MatchCard key={m.id} m={m} t={t} />
                                            ))}
                                        </div>
                                    </section>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </main>

            <Footer />

            <style jsx global>{`
                .g-root { background: ${G.bg}; }
                .g-font { font-family: 'Google Sans', Roboto, 'Segoe UI', Cairo, Arial, sans-serif; }
                .rtl { direction: rtl; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .g-card:hover { background: ${G.cardHover} !important; }
                .g-chip:hover { background: rgba(255,255,255,0.05); }
            `}</style>
        </div>
    );
};

export default GoogleScoresPage;
