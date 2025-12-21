import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FiHome, FiTrendingUp, FiUser, FiSearch, FiMenu, FiX, FiGlobe, FiChevronDown } from 'react-icons/fi';
import { BiJoystick, BiFootball } from 'react-icons/bi';
import { MdLiveTv, MdArticle } from 'react-icons/md';
import { useLanguage } from '../contexts/LanguageContext';
import { translations, Language } from '../utils/translations';

interface NavbarProps {
  lang?: Language;
}

const Navbar: React.FC<NavbarProps> = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const { language: currentLang, setLanguage } = useLanguage();
  const t = translations[currentLang];
  const isRTL = currentLang === 'ar';

  // IDK if I need to handle click outside, but valid for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [langMenuRef]);

  const toggleLang = (lang: Language) => {
    setLanguage(lang);
    setIsLangOpen(false);
  };

  const getFlag = (lang: Language) => {
    switch (lang) {
      case 'ar': return '🇦🇪';
      case 'en': return '🇺🇸';
      case 'tr': return '🇹🇷';
      default: return '🏳️';
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                <BiJoystick className="text-2xl text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-black" />
            </div>
            <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-400 hidden md:block tracking-wide uppercase">
              {t.logo}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/5">
            <Link href="/" className="nav-item">
              <FiHome /> <span>{t.home}</span>
            </Link>

            <Link href="/live" className="nav-item text-red-400 hover:text-red-300">
              <MdLiveTv /> <span>{t.live}</span>
            </Link>

            <Link href="/sports" className="nav-item">
              <BiFootball /> <span>{t.sports}</span>
            </Link>

            <Link href="/articles" className="nav-item">
              <MdArticle /> <span>{t.articles}</span>
            </Link>

            <Link href="/schedule" className="nav-item">
              <FiTrendingUp /> <span>{t.schedule}</span>
            </Link>

            <Link href="/archive" className="nav-item">
              <MdLiveTv className="opacity-70" /> <span>{t.archive}</span>
            </Link>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Search */}
            <div className="relative group">
              <input
                type="text"
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 focus:w-64 transition-all duration-300 bg-black/40 border border-white/10 rounded-full px-4 py-2 pl-10 text-sm focus:outline-none focus:border-emerald-500"
              />
              <FiSearch className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'left-3' : 'left-3'}`} />
            </div>

            {/* Lang Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="h-10 px-3 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-white font-medium text-sm border border-white/5 transition-colors"
              >
                <span className="text-lg">{getFlag(currentLang)}</span>
                <span className="uppercase">{currentLang}</span>
                <FiChevronDown className={`transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangOpen && (
                <div className="absolute top-full mt-2 w-32 bg-midnight-black border border-gray-800 rounded-xl shadow-xl overflow-hidden animate-slide-up z-50 ltr:right-0 rtl:left-0">
                  <button onClick={() => toggleLang('ar')} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-left transition-colors text-white">
                    <span className="text-lg">🇦🇪</span>
                    <span>العربية</span>
                  </button>
                  <button onClick={() => toggleLang('en')} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-left transition-colors text-white">
                    <span className="text-lg">🇺🇸</span>
                    <span>English</span>
                  </button>
                  <button onClick={() => toggleLang('tr')} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-left transition-colors text-white">
                    <span className="text-lg">🇹🇷</span>
                    <span>Türkçe</span>
                  </button>
                </div>
              )}
            </div>

            {/* Profile */}
            <Link href="/profile" className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-lg hover:shadow-emerald-500/20 transition-all">
              <FiUser />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            {isMenuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 space-y-2 animate-slide-down border-t border-white/5 mt-2">
            <Link href="/" className="mobile-link">
              <FiHome /> {t.home}
            </Link>
            <Link href="/live" className="mobile-link text-red-400">
              <MdLiveTv /> {t.live}
            </Link>
            <Link href="/sports" className="mobile-link">
              <BiFootball /> {t.sports}
            </Link>
            <Link href="/articles" className="mobile-link">
              <MdArticle /> {t.articles}
            </Link>
            <Link href="/schedule" className="mobile-link">
              <FiTrendingUp /> {t.schedule}
            </Link>
            <Link href="/archive" className="mobile-link">
              <MdLiveTv /> {t.archive}
            </Link>

            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="flex gap-2 px-2">
                <button onClick={() => toggleLang('ar')} className={`flex-1 py-2 rounded-lg flex flex-col items-center justify-center gap-1 border ${currentLang === 'ar' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-transparent text-gray-400'}`}>
                  <span className="text-xl">🇦🇪</span>
                  <span className="text-xs">AR</span>
                </button>
                <button onClick={() => toggleLang('en')} className={`flex-1 py-2 rounded-lg flex flex-col items-center justify-center gap-1 border ${currentLang === 'en' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-transparent text-gray-400'}`}>
                  <span className="text-xl">🇺🇸</span>
                  <span className="text-xs">EN</span>
                </button>
                <button onClick={() => toggleLang('tr')} className={`flex-1 py-2 rounded-lg flex flex-col items-center justify-center gap-1 border ${currentLang === 'tr' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-transparent text-gray-400'}`}>
                  <span className="text-xl">🇹🇷</span>
                  <span className="text-xs">TR</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .nav-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            color: #ccc;
            font-weight: 500;
            font-size: 0.95rem;
            border-radius: 9999px;
            transition: all 0.2s;
        }
        .nav-item:hover {
            color: white;
            background: rgba(255,255,255,0.08);
        }
        .mobile-link {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: rgba(0,0,0,0.3);
            border-radius: 0.75rem;
            color: #eee;
        }
        .mobile-link:active {
            background: rgba(16, 185, 129, 0.2);
        }
        @keyframes slide-down {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
            animation: slide-down 0.2s ease-out;
        }
        @keyframes slide-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
            animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
