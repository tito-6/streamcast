import React from 'react';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';
import { MdEmail, MdLocationOn } from 'react-icons/md';

const ContactPage = () => {
    const { language } = useLanguage();

    return (
        <Layout title={language === 'ar' ? 'اتصل بنا - الحدث الرياضي' : 'Contact Us - Sport Events'}>
            <div className="container mx-auto px-6 py-20">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-white mb-8 text-center">
                        {language === 'ar' ? 'اتصل بنا' : 'Contact Us'}
                    </h1>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Contact Info */}
                        <div className="space-y-6">
                            <div className="glass-panel p-8 rounded-2xl h-full">
                                <h3 className="text-xl font-bold text-white mb-6">
                                    {language === 'ar' ? 'معلومات التواصل' : 'Get in Touch'}
                                </h3>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-400">
                                            <MdEmail className="text-xl" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium">Email</h4>
                                            <a href="mailto:contact@sportevent.online" className="text-gray-400 hover:text-emerald-400 transition-colors">
                                                contact@sportevent.online
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-400">
                                            <MdLocationOn className="text-xl" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium">Location</h4>
                                            <p className="text-gray-400">
                                                Global Digital Service<br />
                                                Online Platform
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form (Mockup) */}
                        <div className="glass-panel p-8 rounded-2xl">
                            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">
                                        {language === 'ar' ? 'الاسم' : 'Name'}
                                    </label>
                                    <input type="text" className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">
                                        {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                                    </label>
                                    <input type="email" className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">
                                        {language === 'ar' ? 'الرسالة' : 'Message'}
                                    </label>
                                    <textarea rows={4} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none transition-colors"></textarea>
                                </div>
                                <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors">
                                    {language === 'ar' ? 'إرسال' : 'Send Message'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ContactPage;
