import React, { useMemo } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Navbar from '../../../../components/Navbar';
import Footer from '../../../../components/Footer';
import { useLanguage } from '../../../../contexts/LanguageContext';

const LeagueStandingsDetail = dynamic(
    () => import('../../../../components/LeagueStandingsDetail').then((m) => m.LeagueStandingsDetail),
    { ssr: false, loading: () => <div className="min-h-[50vh] bg-[#0b1215] text-gray-500 flex items-center justify-center text-sm">…</div> }
);

const LeagueStandingsPage = () => {
    const router = useRouter();
    const { language } = useLanguage();
    const { pair, sport, c, l, logo, fi } = router.query;

    const ids = useMemo(() => {
        const p = typeof pair === 'string' ? pair : '';
        const u = p.indexOf('_');
        if (u <= 0 || u >= p.length - 1) return { ze: '', zc: '' };
        return { ze: p.slice(0, u), zc: p.slice(u + 1) };
    }, [pair]);

    const sportStr = typeof sport === 'string' ? sport : 'football';
    const countryStr = typeof c === 'string' ? c : '';
    const leagueStr = typeof l === 'string' ? l : '';
    const logoStr = typeof logo === 'string' ? logo : '';
    const flagStr = typeof fi === 'string' ? fi : '';

    const title =
        language === 'tr' ? 'Puan durumu' : language === 'ar' ? 'الترتيب' : 'Standings';

    if (!router.isReady) {
        return (
            <div className="min-h-screen bg-[#0b1215] text-gray-400 flex items-center justify-center text-sm">
                …
            </div>
        );
    }

    if (!ids.ze || !ids.zc) {
        return (
            <div className="min-h-screen bg-[#0b1215] text-gray-300 flex flex-col items-center justify-center gap-4 px-4">
                <p className="text-sm">Invalid league link.</p>
                <a href="/sports/live-scores" className="text-emerald-400 font-semibold text-sm underline">
                    Live scores
                </a>
            </div>
        );
    }

    return (
        <div className={`bg-[#0b1215] min-h-screen ${language === 'ar' ? 'rtl' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <Head>
                <title>{`${leagueStr || title} | StreamCast`}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#0b1215" />
            </Head>
            <Navbar />
            <main className="pt-20 sm:pt-24">
                <LeagueStandingsDetail
                    ze={ids.ze}
                    zc={ids.zc}
                    sport={sportStr}
                    countryQ={countryStr}
                    leagueQ={leagueStr}
                    logoQ={logoStr}
                    flagIso={flagStr}
                />
            </main>
            <Footer />
        </div>
    );
};

export default LeagueStandingsPage;
