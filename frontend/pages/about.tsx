import React from 'react';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';
import { MdSportsSoccer, MdLiveTv, MdPeople } from 'react-icons/md';

const AboutPage = () => {
    const { language } = useLanguage();

    return (
        <Layout title={language === 'ar' ? 'من نحن - الحدث الرياضي' : 'About Us - Sport Events'}>
            <div className="container mx-auto px-6 py-20">
                <div className="max-w-4xl mx-auto space-y-12">

                    {/* Header */}
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-emerald-400 bg-clip-text text-transparent">
                            {language === 'ar' ? 'عن الحدث الرياضي' : 'About Sport Events'}
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            {language === 'ar'
                                ? 'وجهتك الأولى لمتابعة الأحداث الرياضية والبث المباشر بجودة عالية.'
                                : 'Your premier destination for live sports coverage and high-quality streaming.'}
                        </p>
                    </div>

                    {/* Mission Cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="glass-panel p-8 rounded-2xl text-center space-y-4 hover:border-emerald-500/50 transition-colors">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-400 text-3xl">
                                <MdLiveTv />
                            </div>
                            <h3 className="text-xl font-bold text-white">
                                {language === 'ar' ? 'بث مباشر' : 'Live Streaming'}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {language === 'ar'
                                    ? 'تغطية حية لأهم المباريات والبطولات العالمية بأعلى جودة وبدون تقطيع.'
                                    : 'Live coverage of major matches and global tournaments in high quality without buffering.'}
                            </p>
                        </div>

                        <div className="glass-panel p-8 rounded-2xl text-center space-y-4 hover:border-emerald-500/50 transition-colors">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-400 text-3xl">
                                <MdSportsSoccer />
                            </div>
                            <h3 className="text-xl font-bold text-white">
                                {language === 'ar' ? 'تغطية شاملة' : 'Comprehensive Coverage'}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {language === 'ar'
                                    ? 'أخبار، تحليلات، وجداول المباريات لجميع الدوريات الكبرى.'
                                    : 'News, analysis, and match schedules for all major leagues.'}
                            </p>
                        </div>

                        <div className="glass-panel p-8 rounded-2xl text-center space-y-4 hover:border-emerald-500/50 transition-colors">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-400 text-3xl">
                                <MdPeople />
                            </div>
                            <h3 className="text-xl font-bold text-white">
                                {language === 'ar' ? 'مجتمع رياضي' : 'Sports Community'}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {language === 'ar'
                                    ? 'منصة تجمع عشاق الرياضة لمشاركة شغفهم ومتابعة فرقهم المفضلة.'
                                    : 'A platform connecting sports fans to share their passion and follow their favorite teams.'}
                            </p>
                        </div>
                    </div>

                    {/* Story Section */}
                    <div className="glass-panel p-8 md:p-12 rounded-3xl">
                        <div className="prose prose-invert max-w-none">
                            <h2 className="text-2xl font-bold text-white mb-4">
                                {language === 'ar' ? 'رسالتنا' : 'Our Mission'}
                            </h2>
                            <p className="text-gray-300 leading-relaxed">
                                {language === 'ar'
                                    ? 'تأسست منصة "الحدث الرياضي" بهدف توفير تجربة مشاهدة رياضية متميزة للمستخدم العربي. نحن نؤمن بأن الرياضة لغة عالمية تجمع الشعوب، وهدفنا هو تقديم محتوى رياضي راقٍ وموثوق ومتاح للجميع. نحن نلتزم بأعلى معايير الجودة التقنية والأخلاقية في نقل الحدث.'
                                    : 'Sport Events was founded with the mission to provide a premium sports viewing experience. We believe sports are a universal language that brings people together. Our goal is to deliver high-quality, reliable, and accessible sports content to everyone, adhering to the highest technical and ethical standards.'}
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
};

export default AboutPage;
