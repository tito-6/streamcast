import React from 'react';
import { FaTelegram, FaFacebook, FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="bg-gradient-to-t from-black to-midnight-black border-t border-gray-800 pt-16 pb-8">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
                    <div className="text-center md:text-right">
                        <h3 className="text-2xl font-bold text-white mb-2">نحن هنا 📍👇</h3>
                        <p className="text-gray-400">تابعنا على منصات التواصل الاجتماعي</p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-6">
                        <a
                            href="https://www.instagram.com/event_01s?igsh=djBvNGQzcTYxbDU3"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 flex items-center justify-center text-white transition-all transform hover:scale-110"
                            title="Instagram"
                        >
                            <FaInstagram size={24} />
                        </a>
                        <a
                            href="https://t.me/+s0fPfxWJrSNiNjRk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white transition-all transform hover:scale-110"
                            title="Telegram"
                        >
                            <FaTelegram size={24} />
                        </a>

                        <a
                            href="https://www.facebook.com/share/1Rvxt5zZrf/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-full bg-blue-700 hover:bg-blue-800 flex items-center justify-center text-white transition-all transform hover:scale-110"
                            title="Facebook"
                        >
                            <FaFacebook size={24} />
                        </a>

                        <a
                            href="https://www.tiktok.com/@event_01s?_t=ZS-90W0eApEqe8&_r=1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-full bg-black border border-gray-700 hover:border-gray-500 flex items-center justify-center text-white transition-all transform hover:scale-110 shadow-[2px_2px_0px_rgba(255,0,80,1),-2px_-2px_0px_rgba(0,242,234,1)]"
                            title="TikTok"
                        >
                            <FaTiktok size={24} />
                        </a>

                        <a
                            href="https://youtube.com/@event_01s?si=rZF69TCVr1gemOUy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-all transform hover:scale-110"
                            title="YouTube"
                        >
                            <FaYoutube size={24} />
                        </a>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
                    <p>© {new Date().getFullYear()} Event 01s. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
