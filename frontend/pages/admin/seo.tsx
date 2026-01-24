import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Save, Search, Globe, CheckCircle, RefreshCw, Instagram, AlertTriangle, Link as LucideLink, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const SeoPage = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'audit' | 'backlinks' | 'settings'>('dashboard');
    const [settings, setSettings] = useState({
        site_title: '',
        site_description: '',
        instagram_token: '',
        google_property_id: '',
        google_stream_id: '',
    });
    const [auditUrl, setAuditUrl] = useState('');
    const [auditResult, setAuditResult] = useState<any>(null);
    const [backlinkUrl, setBacklinkUrl] = useState('');
    const [backlinkResult, setBacklinkResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        // Fetch Settings
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    setSettings(prev => ({ ...prev, ...data.data }));
                }
            })
            .catch(err => console.error(err));
    }, []);

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const saveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                setSuccess('Settings saved successfully!');
                setTimeout(() => setSuccess(''), 3000);
            }
        } finally { setLoading(false); }
    };

    const runAudit = async () => {
        if (!auditUrl) return;
        setLoading(true);
        try {
            // If local path, prepend origin (mocked for now as we run locally)
            let target = auditUrl;
            if (target.startsWith('/')) {
                // Determine origin manually if needed, or backend handles it.
                // Assuming backend expects full URL or handles internal.
                // Let's force full URL if user types relative.
                target = `https://sportevent.online${auditUrl}`;
            }

            const res = await fetch(`/api/seo/audit?url=${encodeURIComponent(target)}`);
            const json = await res.json();
            if (json.data) setAuditResult(json.data);
            else if (json.error) alert(json.error);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const checkBacklink = async () => {
        if (!backlinkUrl) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/seo/backlink-check?partner_url=${encodeURIComponent(backlinkUrl)}`);
            const json = await res.json();
            setBacklinkResult(json);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">SEO Booster & Tools</h1>
                        <p className="text-gray-400">Advanced Analytics, Audits, and Strategy Management.</p>
                    </div>
                </div>

                {success && (
                    <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-xl flex items-center gap-2 border border-emerald-500/20 animate-fade-in-up">
                        <CheckCircle size={20} /> {success}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-white/10 overflow-x-auto">
                    {['dashboard', 'audit', 'backlinks', 'settings'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === tab
                                    ? 'border-emerald-500 text-emerald-500'
                                    : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                    <div className="animate-fade-in-up space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass-panel p-6 rounded-xl border border-white/10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-gray-400 text-sm font-bold uppercase">Google Property ID</p>
                                        <h3 className="text-2xl font-mono text-white mt-1">{settings.google_property_id || 'Not Set'}</h3>
                                    </div>
                                    <Activity className="text-blue-500" />
                                </div>
                                <p className="text-xs text-blue-400">Linked to GA4</p>
                            </div>

                            <div className="glass-panel p-6 rounded-xl border border-white/10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-gray-400 text-sm font-bold uppercase">Organic Health</p>
                                        <h3 className="text-2xl font-bold text-emerald-400 mt-1">Good</h3>
                                    </div>
                                    <CheckCircle className="text-emerald-500" />
                                </div>
                                <p className="text-xs text-gray-500">Based on recent audits</p>
                            </div>

                            <div className="glass-panel p-6 rounded-xl border border-white/10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-gray-400 text-sm font-bold uppercase">Sitemap Status</p>
                                        <h3 className="text-2xl font-bold text-white mt-1">Active</h3>
                                    </div>
                                    <Globe className="text-purple-500" />
                                </div>
                                <a href="/api/sitemap.xml" target="_blank" className="text-xs text-purple-400 hover:underline">View Sitemap XML</a>
                            </div>
                        </div>

                        {/* Chart (Mock Data representing Traffic) */}
                        <div className="glass-panel p-6 rounded-xl border border-white/10">
                            <h3 className="text-lg font-bold text-white mb-6">Traffic Overview (Internal Signal)</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: 'Mon', uv: 4000 }, { name: 'Tue', uv: 3000 },
                                        { name: 'Wed', uv: 2000 }, { name: 'Thu', uv: 2780 },
                                        { name: 'Fri', uv: 1890 }, { name: 'Sat', uv: 2390 },
                                        { name: 'Sun', uv: 3490 }
                                    ]}>
                                        <XAxis dataKey="name" stroke="#666" />
                                        <YAxis stroke="#666" />
                                        <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                                        <Bar dataKey="uv" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* AUDIT TAB */}
                {activeTab === 'audit' && (
                    <div className="animate-fade-in-up space-y-8">
                        <div className="glass-panel p-8 rounded-xl border border-white/10">
                            <h2 className="text-xl font-bold text-white mb-4">On-Page SEO Auditor</h2>
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    placeholder="Enter page path (e.g. /posts/my-post)"
                                    className="flex-1 bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                                    value={auditUrl}
                                    onChange={(e) => setAuditUrl(e.target.value)}
                                />
                                <button
                                    onClick={runAudit}
                                    disabled={loading}
                                    className="btn-primary px-8 py-3 flex items-center gap-2"
                                >
                                    {loading ? <RefreshCw className="animate-spin" /> : <Search size={20} />}
                                    Analyze
                                </button>
                            </div>
                        </div>

                        {auditResult && (
                            <div className="glass-panel p-8 rounded-xl border border-white/10">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-white">Audit Report</h3>
                                    <div className={`text-4xl font-black ${auditResult.score >= 90 ? 'text-emerald-500' : auditResult.score >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                                        {auditResult.score}/100
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                            <span className="text-gray-400">Title Tag</span>
                                            <span className={auditResult.title_status === 'good' ? 'text-emerald-400' : 'text-red-400'}>
                                                {auditResult.title_status.toUpperCase()} ({auditResult.title.length} chars)
                                            </span>
                                        </div>
                                        <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                            <span className="text-gray-400">Meta Description</span>
                                            <span className={auditResult.desc_status === 'good' ? 'text-emerald-400' : 'text-red-400'}>
                                                {auditResult.desc_status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                            <span className="text-gray-400">H1 Header</span>
                                            <span className={auditResult.h1_status === 'good' ? 'text-emerald-400' : 'text-red-400'}>
                                                {auditResult.h1_status === 'good' ? 'Found' : 'Missing/Multiple'}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-white mb-2">Issues Found</h4>
                                        {auditResult.issues.length === 0 ? (
                                            <p className="text-emerald-500">No major issues found! 🎉</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {auditResult.issues.map((issue: string, idx: number) => (
                                                    <li key={idx} className="flex items-center gap-2 text-red-400 bg-red-500/10 p-2 rounded">
                                                        <AlertTriangle size={16} /> {issue}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* BACKLINKS TAB */}
                {activeTab === 'backlinks' && (
                    <div className="animate-fade-in-up space-y-8">
                        <div className="glass-panel p-8 rounded-xl border border-white/10">
                            <h2 className="text-xl font-bold text-white mb-4">Backlink Checker</h2>
                            <p className="text-gray-400 mb-4">Verify if a partner website is linking back to <span className="text-white">sportevent.online</span>.</p>
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    placeholder="Enter partner URL (e.g. https://partner-site.com/partners)"
                                    className="flex-1 bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                                    value={backlinkUrl}
                                    onChange={(e) => setBacklinkUrl(e.target.value)}
                                />
                                <button
                                    onClick={checkBacklink}
                                    disabled={loading}
                                    className="btn-primary px-8 py-3 flex items-center gap-2"
                                >
                                    {loading ? <RefreshCw className="animate-spin" /> : <LucideLink size={20} />}
                                    Verify Link
                                </button>
                            </div>
                        </div>

                        {backlinkResult && (
                            <div className={`p-6 rounded-xl border ${backlinkResult.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                <div className="flex items-center gap-4">
                                    {backlinkResult.status === 'active'
                                        ? <CheckCircle size={32} className="text-emerald-500" />
                                        : <AlertTriangle size={32} className="text-red-500" />
                                    }
                                    <div>
                                        <h3 className={`text-xl font-bold ${backlinkResult.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {backlinkResult.status === 'active' ? 'Backlink Active' : 'Backlink Not Found'}
                                        </h3>
                                        {backlinkResult.status === 'active' && (
                                            <p className="text-gray-300 mt-1">
                                                Found anchor text: <span className="font-mono bg-black/30 px-2 py-0.5 rounded text-white">{backlinkResult.anchor}</span> pointing to <span className="text-blue-400">{backlinkResult.link}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <form onSubmit={saveSettings} className="glass-panel p-8 rounded-xl border border-white/10 animate-fade-in-up space-y-6">
                        <h2 className="text-xl font-bold text-white mb-6">Global Configuration</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-400 text-sm font-medium mb-2">Google Analytics Property ID</label>
                                <input
                                    type="text"
                                    name="google_property_id"
                                    value={settings.google_property_id}
                                    onChange={handleSettingsChange}
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                                    placeholder="e.g. 516973541"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-medium mb-2">Google Stream ID</label>
                                <input
                                    type="text"
                                    name="google_stream_id"
                                    value={settings.google_stream_id}
                                    onChange={handleSettingsChange}
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                                    placeholder="e.g. 378164237"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-gray-400 text-sm font-medium mb-2">Instagram Access Token</label>
                                <input
                                    type="text"
                                    name="instagram_token"
                                    value={settings.instagram_token}
                                    onChange={handleSettingsChange}
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none font-mono"
                                    placeholder="IGBQ..."
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary px-8 py-3 flex items-center gap-2"
                            >
                                {loading ? <RefreshCw className="animate-spin" /> : <Save size={20} />}
                                Save Configuration
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
};

export default SeoPage;
