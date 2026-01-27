import React, { useState } from 'react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import LiveScoreBoard from '../../components/LiveScoreBoard';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useLanguage } from '../../contexts/LanguageContext';
import { CalendarDays, ChevronLeft, ChevronRight, Trophy, Zap } from 'lucide-react';

const LiveScoresPage = () => {
    const { language } = useLanguage();
    const [globalDate, setGlobalDate] = useState('today');

    // Date Labels based on lang
    const dateLabels = {
        ar: { yesterday: 'أمس', today: 'اليوم', tomorrow: 'غدا', matchCenter: 'مركز المباريات', subtext: 'نتائج مباشرة وإحصائيات محدثة من أهم الدوريات العالمية.' },
        tr: { yesterday: 'Dün', today: 'Bugün', tomorrow: 'Yarın', matchCenter: 'MAÇ MERKEZİ', subtext: 'Dünyanın en büyük liglerinden anlık skorlar ve detaylı istatistikler.' },
        en: { yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow', matchCenter: 'MATCH CENTER', subtext: 'Real-time scores, deep stats, and live updates from the world\'s biggest leagues.' }
    };

    const t = dateLabels[language] || dateLabels.en;
    const isRTL = language === 'ar';

    return (
        <div className={`bg-[#0b0e11] min-h-screen text-white font-cairo ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <Head>
                <title>{language === 'tr' ? 'Canlı Skorlar' : language === 'ar' ? 'النتائج المباشرة' : 'Live Scores'} | StreamCast</title>
                <meta name="description" content={t.subtext} />
            </Head>

            <Navbar />

            <main className="relative pt-24 pb-20">
                {/* Hero / Header Section Area */}
                <div className="container mx-auto px-4 mb-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                                    <Zap size={10} fill="currentColor" /> Live Updates
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                                    {t.matchCenter}
                                </span>
                            </h1>
                            <p className="text-gray-400 max-w-xl text-sm md:text-base font-medium opacity-80">
                                {t.subtext}
                            </p>
                        </div>

                        {/* Direct Control of Date from Parent */}
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 self-start">
                            {[
                                { id: 'yesterday', label: t.yesterday },
                                { id: 'today', label: t.today },
                                { id: 'tomorrow', label: t.tomorrow }
                            ].map((d) => (
                                <button
                                    key={d.id}
                                    onClick={() => setGlobalDate(d.id)}
                                    className={`
                                        px-6 py-2.5 rounded-lg text-xs font-bold transition-all duration-300
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

                {/* Main Dashboard Container */}
                <div className="container mx-auto px-0 md:px-4">
                    <LiveScoreBoard globalDate={globalDate} />
                </div>
            </main>

            <div className="geometric-pattern fixed inset-0 pointer-events-none z-0 opacity-10" />
            <Footer />

            <style jsx global>{`
                .font-cairo { font-family: 'Cairo', sans-serif; }
                .rtl { direction: rtl; }
            `}</style>
        </div>
    );
};

export default LiveScoresPage;
