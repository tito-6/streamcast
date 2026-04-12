import React, { useMemo, useState, useTransition } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useLanguage } from '../../contexts/LanguageContext';
import { Zap } from 'lucide-react';

const LiveScoreBoard = dynamic(() => import('../../components/LiveScoreBoard'), {
    ssr: false,
    loading: () => (
        <div
            className="min-h-[min(400px,60vh)] flex items-center justify-center px-4"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <span className="text-emerald-500/90 text-sm font-semibold tracking-wide">Loading live scores…</span>
        </div>
    ),
});

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://sportevent.online';

const LiveScoresPage = () => {
    const { language } = useLanguage();
    const [globalDate, setGlobalDate] = useState('today');
    const [, startTransition] = useTransition();

    const dateLabels = {
        ar: {
            yesterday: 'أمس',
            today: 'اليوم',
            tomorrow: 'غدا',
            matchCenter: 'مركز المباريات',
            subtext: 'نتائج مباشرة وإحصائيات محدثة من أهم الدوريات العالمية.',
            liveBadge: 'تحديثات مباشرة',
            dateScopeLabel: 'نطاق التاريخ',
        },
        tr: {
            yesterday: 'Dün',
            today: 'Bugün',
            tomorrow: 'Yarın',
            matchCenter: 'MAÇ MERKEZİ',
            subtext: 'Dünyanın en büyük liglerinden anlık skorlar ve detaylı istatistikler.',
            liveBadge: 'Canlı güncellemeler',
            dateScopeLabel: 'Tarih aralığı',
        },
        en: {
            yesterday: 'Yesterday',
            today: 'Today',
            tomorrow: 'Tomorrow',
            matchCenter: 'MATCH CENTER',
            subtext: "Real-time scores, deep stats, and live updates from the world's biggest leagues.",
            liveBadge: 'Live updates',
            dateScopeLabel: 'Date range',
        },
    };

    const t = dateLabels[language] || dateLabels.en;
    const isRTL = language === 'ar';

    const pageTitle =
        language === 'tr' ? 'Canlı Skorlar' : language === 'ar' ? 'النتائج المباشرة' : 'Live Scores';

    const canonicalPath = '/sports/live-scores';
    const canonicalUrl = `${SITE_ORIGIN.replace(/\/$/, '')}${canonicalPath}`;
    const ogLocale = language === 'ar' ? 'ar_AE' : language === 'tr' ? 'tr_TR' : 'en_US';

    const jsonLd = useMemo(
        () =>
            JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebPage',
                name: `${pageTitle} | StreamCast`,
                description: t.subtext,
                url: canonicalUrl,
                inLanguage: language === 'ar' ? 'ar' : language === 'tr' ? 'tr' : 'en',
            }),
        [canonicalUrl, language, pageTitle, t.subtext]
    );

    return (
        <div className={`bg-[#0b0e11] min-h-screen text-white font-cairo ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <Head>
                <title>{`${pageTitle} | StreamCast`}</title>
                <meta name="description" content={t.subtext} />
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="robots" content="index,follow" />
                <meta name="theme-color" content="#0b0e11" />
                <link rel="canonical" href={canonicalUrl} />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

                <meta property="og:type" content="website" />
                <meta property="og:site_name" content="StreamCast" />
                <meta property="og:title" content={`${pageTitle} | StreamCast`} />
                <meta property="og:description" content={t.subtext} />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:locale" content={ogLocale} />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${pageTitle} | StreamCast`} />
                <meta name="twitter:description" content={t.subtext} />

                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
            </Head>

            <Navbar />

            <main className="relative z-10 pt-20 sm:pt-24 pb-20" id="main-content">
                <div className="container mx-auto px-3 sm:px-4 mb-6 sm:mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/5 pb-6 sm:pb-8">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest inline-flex items-center gap-1">
                                    <Zap size={10} fill="currentColor" className="shrink-0 motion-reduce:animate-none" aria-hidden />
                                    {t.liveBadge}
                                </span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-2 break-words">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                                    {t.matchCenter}
                                </span>
                            </h1>
                            <p className="text-gray-400 max-w-xl text-sm md:text-base font-medium opacity-90 leading-relaxed">
                                {t.subtext}
                            </p>
                        </div>

                        <div
                            className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 self-stretch sm:self-start"
                            role="group"
                            aria-label={t.dateScopeLabel}
                        >
                            {[
                                { id: 'yesterday', label: t.yesterday },
                                { id: 'today', label: t.today },
                                { id: 'tomorrow', label: t.tomorrow },
                            ].map((d) => (
                                <button
                                    key={d.id}
                                    type="button"
                                    aria-pressed={globalDate === d.id}
                                    onClick={() => startTransition(() => setGlobalDate(d.id))}
                                    className={`
                                        min-h-[44px] px-4 sm:px-6 py-2.5 rounded-lg text-xs font-bold transition-all duration-300
                                        focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e11]
                                        ${globalDate === d.id
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }
                                    `}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-0 sm:px-4">
                    <LiveScoreBoard globalDate={globalDate} />
                </div>
            </main>

            <div className="geometric-pattern fixed inset-0 pointer-events-none z-0 opacity-10" aria-hidden />
            <Footer />

            <style jsx global>{`
                .font-cairo {
                    font-family: 'Cairo', sans-serif;
                }
                .rtl {
                    direction: rtl;
                }
            `}</style>
        </div>
    );
};

export default LiveScoresPage;
