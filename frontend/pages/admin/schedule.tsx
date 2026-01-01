import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit2, Save, X, Clock, Shield } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';

import ImageUpload from '../../components/ImageUpload';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Event {
    id: number;
    title_ar: string; title_en: string; title_tr: string;
    league_ar: string; league_en: string; league_tr: string;
    team_home_ar: string; team_home_en: string; team_home_tr: string;
    team_away_ar: string; team_away_en: string; team_away_tr: string;
    sport_category: string;
    start_time: string;
    description: string;
    thumbnail: string;
    stream_link: string;
}

const EventsPage = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'ar' | 'en' | 'tr'>('ar');
    const [form, setForm] = useState<Partial<Event>>({
        sport_category: 'Football'
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/events');
            const data = await res.json();
            if (data.data) setEvents(data.data);
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this event?")) return;
        await fetch(`/api/events/${id}`, { method: 'DELETE' });
        setEvents(events.filter(e => e.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = isEditing && form.id
            ? `/api/events/${form.id}`
            : '/api/events';

        const method = isEditing && form.id ? 'PUT' : 'POST';

        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });

        setForm({ sport_category: 'Football' });
        setIsEditing(false);
        fetchEvents();
    };

    const handleEdit = (event: Event) => {
        setForm(event);
        setIsEditing(true);
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Events & Matches</h2>
                        <p className="text-gray-400">Manage schedule with localization and images</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Form */}
                    <div className="glass-panel p-6 rounded-2xl h-fit">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            {isEditing ? <Edit2 size={18} /> : <Plus size={18} />}
                            {isEditing ? 'Edit Event' : 'New Event'}
                        </h3>

                        {/* Language Tabs */}
                        <div className="flex gap-2 mb-4 bg-midnight-black p-1 rounded-lg">
                            {(['ar', 'en', 'tr'] as const).map(lang => (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => setActiveTab(lang)}
                                    className={`flex-1 py-1 rounded text-sm font-bold uppercase transition-colors ${activeTab === lang ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-white'}`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Match Title ({activeTab.toUpperCase()})</label>
                                <input className="input-field w-full bg-midnight-black p-2 rounded border border-gray-700 text-white"
                                    placeholder={activeTab === 'ar' ? "مثال: الكلاسيكو" : "ex: El Classico"}
                                    value={form[`title_${activeTab}`] || ''}
                                    onChange={e => setForm({ ...form, [`title_${activeTab}`]: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">League ({activeTab.toUpperCase()})</label>
                                <input className="input-field w-full bg-midnight-black p-2 rounded border border-gray-700 text-white"
                                    value={form[`league_${activeTab}`] || ''}
                                    onChange={e => setForm({ ...form, [`league_${activeTab}`]: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Team 1 ({activeTab.toUpperCase()})</label>
                                    <input className="input-field w-full bg-midnight-black p-2 rounded border border-gray-700 text-white"
                                        placeholder="Home"
                                        value={form[`team_home_${activeTab}`] || ''}
                                        onChange={e => setForm({ ...form, [`team_home_${activeTab}`]: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Team 2 ({activeTab.toUpperCase()})</label>
                                    <input className="input-field w-full bg-midnight-black p-2 rounded border border-gray-700 text-white"
                                        placeholder="Away"
                                        value={form[`team_away_${activeTab}`] || ''}
                                        onChange={e => setForm({ ...form, [`team_away_${activeTab}`]: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400">Category</label>
                                <select className="input-field w-full bg-midnight-black p-2 rounded border border-gray-700 text-white"
                                    value={form.sport_category} onChange={e => setForm({ ...form, sport_category: e.target.value })}>
                                    <option>Football</option>
                                    <option>Basketball</option>
                                    <option>Tennis</option>
                                    <option>Esports</option>
                                    <option>Combat</option>
                                </select>
                            </div>

                            <ImageUpload
                                value={form.thumbnail || ''}
                                onChange={(url) => setForm({ ...form, thumbnail: url })}
                                label="Event Thumbnail / Logo"
                            />

                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 relative z-20">
                                <label className="text-sm font-bold text-emerald-400 mb-3 block flex items-center gap-2">
                                    <Clock size={16} /> Event Timing
                                </label>
                                <DatePicker
                                    selected={form.start_time ? new Date(form.start_time) : null}
                                    onChange={(date: Date | null) => setForm({ ...form, start_time: date ? date.toISOString() : '' })}
                                    showTimeSelect
                                    filterTime={(time) => {
                                        const currentDate = new Date();
                                        const selectedDate = new Date(time);
                                        return currentDate.getTime() < selectedDate.getTime();
                                    }}
                                    timeFormat="HH:mm"
                                    timeIntervals={15}
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    className="input-field w-full bg-midnight-black p-3 rounded border border-gray-700 text-white focus:border-emerald-500 transition-colors cursor-pointer"
                                    placeholderText="Click to select Date & Time"
                                    wrapperClassName="w-full"
                                    popperClassName="!z-50"
                                />
                                <style jsx global>{`
                                    .react-datepicker-wrapper { width: 100%; }
                                    .react-datepicker {
                                        background-color: #1a1a2e;
                                        border-color: #333;
                                        color: #fff;
                                        font-family: inherit;
                                    }
                                    .react-datepicker__header {
                                        background-color: #16213e;
                                        border-bottom: 1px solid #333;
                                    }
                                    .react-datepicker__current-month, .react-datepicker-time__header, .react-datepicker-year-header {
                                        color: #fff;
                                    }
                                    .react-datepicker__day-name, .react-datepicker__day, .react-datepicker__time-name {
                                        color: #ccc;
                                    }
                                    .react-datepicker__day:hover, .react-datepicker__month-text:hover, .react-datepicker__quarter-text:hover, .react-datepicker__year-text:hover {
                                        background-color: #0f3460;
                                        color: #fff;
                                    }
                                    .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected {
                                        background-color: #e94560 !important;
                                        color: #fff;
                                    }
                                    .react-datepicker__time-container {
                                        border-left: 1px solid #333;
                                    }
                                    .react-datepicker__time-container .react-datepicker__time {
                                        background: #1a1a2e;
                                        color: #fff;
                                    }
                                    .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item:hover {
                                        background-color: #0f3460;
                                        color: #fff;
                                    }
                                    .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--selected {
                                        background-color: #e94560 !important;
                                    }
                                `}</style>
                            </div>

                            <div className="flex gap-2">
                                <button className="flex-1 btn-primary py-2 flex justify-center items-center gap-2">
                                    <Save size={16} /> Save
                                </button>
                                {isEditing && (
                                    <button type="button" onClick={() => { setIsEditing(false); setForm({ sport_category: 'Football' }); }}
                                        className="btn-secondary py-2 px-3">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2 space-y-4">
                        {events.map(event => (
                            <div key={event.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex gap-4 group hover:border-emerald-energy transition-colors items-center">
                                {event.thumbnail ? (
                                    <div className="w-16 h-16 bg-gray-800 rounded-lg overflow-hidden shrink-0">
                                        <img src={event.thumbnail} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="p-3 bg-gray-800 rounded-lg text-emerald-500 shrink-0">
                                        <Calendar size={24} />
                                    </div>
                                )}
                                <div className="flex-1 ml-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs text-emerald-energy bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-900/50">
                                                    {event.sport_category}
                                                </span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Clock size={12} /> {new Date(event.start_time).toLocaleString()}
                                                </span>
                                            </div>
                                            <h4 className="text-lg font-bold text-white">
                                                {event.team_home_ar && event.team_away_ar ? `${event.team_home_ar} vs ${event.team_away_ar}` : (event.title_ar || event.title_en)}
                                            </h4>
                                            {event.league_ar && (
                                                <p className="text-sm text-gray-400">{event.league_ar} • {event.league_en}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(event)} className="p-2 text-blue-400 hover:bg-blue-900/20 rounded"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(event.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {events.length === 0 && (
                            <div className="text-center text-gray-500 py-10">No upcoming events scheduled.</div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default EventsPage;
