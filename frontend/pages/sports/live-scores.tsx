import React, { useState } from 'react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import SportsWidget from '../../components/SportsWidget';
import LiveScoreBoard from '../../components/LiveScoreBoard';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useLanguage } from '../../contexts/LanguageContext';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const LiveScoresPage = () => {
    const { language } = useLanguage();
    const [globalDate, setGlobalDate] = useState('today');

    // Date Labels based on lang
    const dateLabels = {
        ar: { yesterday: 'أمس', today: 'اليوم', tomorrow: 'غدا' },
        tr: { yesterday: 'Dün', today: 'Bugün', tomorrow: 'Yarın' },
        en: { yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow' }
    };

    const labels = dateLabels[language] || dateLabels.en;
    const isRTL = language === 'ar';

    return (
        <div className={`bg-midnight-black min-h-screen text-white font-cairo ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <Head>
                <title>{language === 'tr' ? 'Canlı Skorlar' : language === 'ar' ? 'النتائج المباشرة' : 'Live Scores'} | StreamCast</title>
            </Head>

            <Navbar />

            <main className="container mx-auto px-4 py-12 pt-28 relative z-10">
                {/* Stunning Header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                            {language === 'tr' ? 'MAÇ MERKEZİ' : language === 'ar' ? 'مركز المباريات' : 'MATCH CENTER'}
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light">
                        {language === 'tr' ? 'Dünyanın en büyük liglerinden anlık skorlar ve detaylı istatistikler.' :
                            language === 'ar' ? 'تابع النتائج المباشرة والإحصائيات من أكبر الدوريات العالمية.' :
                                'Real-time scores, deep stats, and live updates from the world\'s biggest leagues.'}
                    </p>
                </div>



                {/* Live Flashscore Board */}
                <div className="w-full">
                    <LiveScoreBoard globalDate={globalDate} />
                </div>
            </main>

            <div className="geometric-pattern fixed inset-0 pointer-events-none z-0 opacity-30" />
            <Footer />
        </div>
    );
};

export default LiveScoresPage;
