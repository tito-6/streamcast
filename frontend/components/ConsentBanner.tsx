import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ConsentBannerProps {
    language: string;
}

const ConsentBanner: React.FC<ConsentBannerProps> = ({ language }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookieConstraints');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConstraints', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-700 p-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-gray-300 text-sm flex-1">
                    {language === 'ar' ? (
                        <p>
                            نحن نستخدم ملفات تعريف الارتباط (الكوكيز) لتحسين تجربتك، وتحليل زيارات الموقع، وعرض إعلانات مخصصة.
                            استمرارك في تصفح الموقع يعني موافقتك على استخدامنا للكوكيز وفقاً
                            <Link href="/privacy" className="text-emerald-500 hover:text-emerald-400 underline mx-1">
                                لسياسة الخصوصية
                            </Link>.
                        </p>
                    ) : (
                        <p>
                            We use cookies to improve your experience, analyze site traffic, and show personalized ads.
                            By continuing to use our site, you consent to our use of cookies as described in our
                            <Link href="/privacy" className="text-emerald-500 hover:text-emerald-400 underline mx-1">
                                Privacy Policy
                            </Link>.
                        </p>
                    )}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleAccept}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold transition-colors text-sm whitespace-nowrap"
                    >
                        {language === 'ar' ? 'موافق' : 'Accept All'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConsentBanner;
