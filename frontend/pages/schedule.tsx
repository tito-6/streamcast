import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { FiCalendar, FiClock, FiMapPin } from 'react-icons/fi';
import { GiSoccerBall, GiBasketballBall, GiTennisRacket } from 'react-icons/gi';
import { MdNotificationsActive } from 'react-icons/md';

interface ScheduledMatch {
  id: number;
  title: string;
  sport: string;
  league: string;
  date: string; // ISO string
  time: string; // "HH:MM"
  venue: string;
  teams: { home: string; away: string };
  broadcaster?: string;
}

import { useLanguage } from '../contexts/LanguageContext';

export default function SchedulePage() {
  const { language: lang, setLanguage } = useLanguage();
  const [matches, setMatches] = useState<any[]>([]);

  // Translations...
  const translations = {
    ar: { title: 'جدول المباريات', subtitle: 'لا تفوت مبارياتك المفضلة', vs: 'ضد', remind: 'تذكير' },
    en: { title: 'Match Schedule', subtitle: 'Don\'t miss your favorite matches', vs: 'vs', remind: 'Remind Me' },
    tr: { title: 'Maç Programı', subtitle: 'Favori maçlarınızı kaçırmayın', vs: 'vs', remind: 'Hatırlat' }
  };
  // @ts-ignore
  const t = translations[lang] || translations['ar'];

  useEffect(() => {
    fetch('http://localhost:8080/api/events')
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setMatches(json.data);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const getSportIcon = (sport: string) => {
    switch (sport?.toLowerCase()) {
      case 'basketball': return GiBasketballBall;
      case 'tennis': return GiTennisRacket;
      default: return GiSoccerBall;
    }
  };

  return (
    <Layout lang={lang}>
      <div className="min-h-screen pt-32 pb-20">
        <div className="container mx-auto px-4 lg:px-8">

          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FiCalendar className="text-4xl text-emerald-energy" />
              <h1 className="h1 text-gradient-oasis">{t.title}</h1>
            </div>
            <p className="text-white/70 text-lg">{t.subtitle}</p>
          </div>

          <div className="space-y-6">
            {matches.length === 0 ? (
              <div className="text-center text-gray-500 py-10">No upcoming matches scheduled. Check back later!</div>
            ) : matches.map((match) => {
              const SportIcon = getSportIcon(match.sport);

              // Resolve Localized Content
              // @ts-ignore
              const title = match[`title_${lang}`] || match[`title_en`] || match.title;
              // @ts-ignore
              const teamHome = match[`team_home_${lang}`] || match.team_home_en || match.team_home;
              // @ts-ignore
              const teamAway = match[`team_away_${lang}`] || match.team_away_en || match.team_away;
              // @ts-ignore
              const league = match[`league_${lang}`] || match.league_en || match.league;

              const displayTitle = (teamHome && teamAway) ?
                <><span>{teamHome}</span> <span className="text-emerald-energy mx-2">{t.vs}</span> <span>{teamAway}</span></>
                : title;

              return (
                <div key={match.id} className="glass-panel p-6 rounded-xl hover:border-emerald-energy transition-all">
                  <div className="flex flex-col lg:flex-row gap-6">

                    <div className="lg:w-1/3">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-cosmic-navy flex items-center justify-center">
                        {match.thumbnail ? (
                          <img src={match.thumbnail} alt={title} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <SportIcon className="text-6xl text-emerald-energy/20" />
                            <div className="absolute top-3 left-3 w-12 h-12 rounded-full bg-emerald-energy/20 backdrop-blur-sm flex items-center justify-center border-2 border-emerald-energy">
                              <SportIcon className="text-2xl text-emerald-energy" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="lg:w-2/3 flex flex-col justify-between">
                      <div>
                        {/* League & Date */}
                        <div className="flex flex-wrap items-center gap-4 mb-3">
                          {league && (
                            <span className="px-3 py-1 bg-cosmic-navy rounded-full text-emerald-energy text-sm font-semibold">
                              {league}
                            </span>
                          )}
                          <div className="flex items-center gap-2 text-white/70">
                            <FiCalendar />
                            <span>{new Date(match.start_time).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/70">
                            <FiClock />
                            <span>{new Date(match.start_time).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {/* Match Title / Teams */}
                        <h3 className="text-2xl font-bold text-white mb-4">
                          {displayTitle}
                        </h3>

                        {/* Additional Info */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-white/70">
                            <FiMapPin className="text-emerald-energy" />
                            <span>{match.venue || 'TBA'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-emerald-energy text-midnight-black hover:bg-emerald-400 transition-colors">
                          <MdNotificationsActive className="text-xl" />
                          {t.remind}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </Layout>
  );
}


