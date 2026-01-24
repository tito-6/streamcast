import React from 'react';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';

const PrivacyPage = () => {
    const { language } = useLanguage();

    const Content = () => {
        if (language === 'ar') {
            return (
                <div className="space-y-8 text-gray-300">
                    <h1 className="text-3xl font-bold text-white mb-6">سياسة الخصوصية</h1>
                    <p>تصف هذه السياسة كيف يقوم موقع "الحدث الرياضي" (Sport Events) بجمع واستخدام ومشاركة معلوماتك عند استخدامك لموقعنا.</p>

                    <section>
                        <h2 className="text-xl font-bold text-emerald-400 mb-3">1. المعلومات التي نجمعها</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li><strong>معلومات الأجهزة:</strong> نوع الجهاز، نظام التشغيل، عنوان IP، والمتصفح.</li>
                            <li><strong>بيانات الاستخدام:</strong> الصفحات التي تزورها، مدة الزيارة، والتفاعلات مع الإعلانات.</li>
                            <li><strong>الكوكيز:</strong> نستخدم الكوكيز لتحسين تجربتك وتوفير إعلانات مخصصة.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-emerald-400 mb-3">2. إعلانات Google AdSense</h2>
                        <p className="mb-2">نحن نستخدم Google AdSense لعرض الإعلانات. قد تستخدم Google وشركاؤها ملفات تعريف الارتباط (Cookies) لتقديم إعلانات بناءً على زياراتك السابقة لموقعنا أو لمواقع أخرى على الويب.</p>
                        <ul className="list-disc list-inside space-y-2">
                            <li>تستخدم Google ملف تعريف الارتباط DoubleClick لتقديم إعلانات مخصصة.</li>
                            <li>يمكنك تعطيل الإعلانات المخصصة بزيارة <a href="https://www.google.com/settings/ads" target="_blank" className="text-emerald-400 underline" rel="noopener noreferrer">إعدادات الإعلانات</a>.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-emerald-400 mb-3">3. حقوق CCPA (حقوق الخصوصية في كاليفورنيا)</h2>
                        <p>بموجب قانون CCPA، يحق للمقيمين في كاليفورنيا طلب عدم بيع بياناتهم الشخصية. نحن لا نبيع بياناتك الشخصية لأطراف ثالثة.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-emerald-400 mb-3">4. حقوق GDPR (حماية البيانات في أوروبا)</h2>
                        <p>إذا كنت مقيماً في المنطقة الاقتصادية الأوروبية، فلديك حقوق معينة تتعلق ببياناتك، بما في ذلك الحق في الوصول والتصحيح والحذف.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-emerald-400 mb-3">5. الاتصال بنا</h2>
                        <p>إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يمكنك الاتصال بنا عبر: <a href="mailto:contact@sportevent.online" className="text-emerald-400 underline">contact@sportevent.online</a></p>
                    </section>
                </div>
            );
        }
        return (
            <div className="space-y-8 text-gray-300">
                <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
                <p>This Privacy Policy describes how Sport Events collects, uses, and shares your information when you use our website.</p>

                <section>
                    <h2 className="text-xl font-bold text-emerald-400 mb-3">1. Information We Collect</h2>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Device Information:</strong> Device type, OS, IP address, and browser type.</li>
                        <li><strong>Usage Data:</strong> Pages visited, duration, and ad interactions.</li>
                        <li><strong>Cookies:</strong> We use cookies to enhance your experience and provide personalized ads.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-emerald-400 mb-3">2. Google AdSense & Cookies</h2>
                    <p className="mb-2">We use Google AdSense to display ads. Google and its partners use cookies to serve ads based on your prior visits to our site or other websites.</p>
                    <ul className="list-disc list-inside space-y-2">
                        <li>Google uses the DoubleClick cookie for interest-based advertising.</li>
                        <li>You can opt-out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" className="text-emerald-400 underline" rel="noopener noreferrer">Ads Settings</a>.</li>
                        <li>See <a href="https://www.google.com/policies/technologies/ads/" target="_blank" className="text-emerald-400 underline" rel="noopener noreferrer">How Google uses data</a> for more info.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-emerald-400 mb-3">3. CCPA Privacy Rights</h2>
                    <p>Under the CCPA, California consumers have the right to request that a business that collects a consumer's personal data not sell that data. We do not sell your personal data.</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-emerald-400 mb-3">4. GDPR Data Protection Rights</h2>
                    <p>We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to: The right to access, rectification, erasure, restrict processing, and data portability.</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-emerald-400 mb-3">5. Contact Us</h2>
                    <p>If you have questions about this policy, contact us at: <a href="mailto:contact@sportevent.online" className="text-emerald-400 underline">contact@sportevent.online</a></p>
                </section>
            </div>
        );
    };

    return (
        <Layout title={language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}>
            <div className="max-w-4xl mx-auto px-6 py-20">
                <div className="glass-panel p-8 md:p-12 rounded-3xl">
                    <Content />
                </div>
            </div>
        </Layout>
    );
};

export default PrivacyPage;
