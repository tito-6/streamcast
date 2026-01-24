import React from 'react';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';

const TermsPage = () => {
    const { language } = useLanguage();

    const Content = () => {
        if (language === 'ar') {
            return (
                <div className="space-y-8 text-gray-300">
                    <h1 className="text-3xl font-bold text-white mb-6">شروط الاستخدام</h1>
                    <p>مرحباً بك في موقع "الحدث الرياضي". باستخدامك لهذا الموقع، فإنك توافق على الالتزام بهذه الشروط والأحكام.</p>

                    <section>
                        <h2 className="text-xl font-bold text-emerald-400 mb-3">1. المحتوى والاستخدام</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li>المحتوى المتوفر على هذا الموقع للأغراض الإعلامية والترفيهية فقط.</li>
                            <li>يمنع استخدام الموقع لأي أغراض غير قانونية أو ضارة.</li>
                            <li>نحتفظ بالحق في تعديل أو إيقاف الخدمة في أي وقت دون إشعار مسبق.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-emerald-400 mb-3">2. حقوق الملكية الفكرية</h2>
                        <p>جميع العلامات التجارية والشعارات والمحتوى المملوك لنا (مثل النصوص والتصميمات) هي ملك لنا. المحتوى الخاص بالبث المباشر قد يكون مملوكاً لأطراف ثالثة ونحن نعمل كمنصة عرض فقط ولا ندعي ملكية البثوث الخارجية ما لم ينص على ذلك.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-emerald-400 mb-3">3. إخلاء المسؤولية</h2>
                        <p>نحن لا نضمن دقة أو اكتمال المعلومات الواردة في الموقع. استخدامك للموقع وتصفحك للمحتوى هو على مسؤوليتك الخاصة. لا نتحمل مسؤولية أي محتوى يتم تضمينه من مصادر خارجية (iframe).</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-emerald-400 mb-3">4. التعديلات</h2>
                        <p>قد نقوم بتحديث شروط الاستخدام هذه من وقت لآخر. يُنصح بمراجعة هذه الصفحة بشكل دوري.</p>
                    </section>
                </div>
            );
        }
        return (
            <div className="space-y-8 text-gray-300">
                <h1 className="text-3xl font-bold text-white mb-6">Terms of Use</h1>
                <p>Welcome to Sport Events. By accessing this website, you agree to be bound by these Terms and Conditions.</p>

                <section>
                    <h2 className="text-xl font-bold text-emerald-400 mb-3">1. Use of Content</h2>
                    <ul className="list-disc list-inside space-y-2">
                        <li>The content provided on this site is for informational and entertainment purposes only.</li>
                        <li>You agree not to use the site for any unlawful or harmful purpose.</li>
                        <li>We reserve the right to modify or discontinue service at any time without notice.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-emerald-400 mb-3">2. Intellectual Property</h2>
                    <p>Unless otherwise stated, we own the intellectual property rights for all material on Sport Events. External streams embedded via iframes are the property of their respective owners.</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-emerald-400 mb-3">3. Disclaimer</h2>
                    <p>The materials on Sport Events are provided on an 'as is' basis. We make no warranties, expressed or implied. We differ any liability for content embedded from third-party sources.</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-emerald-400 mb-3">4. Changes to Terms</h2>
                    <p>We may revise these terms of service at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.</p>
                </section>
            </div>
        );
    };

    return (
        <Layout title={language === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}>
            <div className="max-w-4xl mx-auto px-6 py-20">
                <div className="glass-panel p-8 md:p-12 rounded-3xl">
                    <Content />
                </div>
            </div>
        </Layout>
    );
};

export default TermsPage;
