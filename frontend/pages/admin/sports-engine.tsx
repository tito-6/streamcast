import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Server, ShieldAlert, Code, Globe2 } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';

const SportsEngine = () => {
    const [status, setStatus] = useState<'online' | 'offline'>('offline');
    const [config, setConfig] = useState<any>({
        mode: 'live',
        maintenance: false,
        scores_provider: 'flashscore',
        livescore_com_country_code: 'GB',
        livescore_com_page_url: 'https://www.livescore.com/en/football/live/',
    });
    const [configError, setConfigError] = useState<string | null>(null);
    const [previewQuery, setPreviewQuery] = useState('Premier League');
    const [previewData, setPreviewData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const ENGINE_URL = '/api/sports-engine';

    useEffect(() => {
        checkHealth();
        fetchConfig();
    }, []);

    const checkHealth = async () => {
        try {
            const res = await fetch(`${ENGINE_URL}/`);
            setStatus(res.ok ? 'online' : 'offline');
        } catch {
            setStatus('offline');
        }
    };

    const fetchConfig = async () => {
        setConfigError(null);
        try {
            const res = await fetch(`${ENGINE_URL}/api/config`);
            const text = await res.text();
            let data: any = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch {
                setConfigError('Sports engine returned non-JSON (is the service running on port 8001?)');
                return;
            }
            if (!res.ok) {
                setConfigError(data.detail || data.error || `HTTP ${res.status}`);
                return;
            }
            if (typeof data === 'object' && data !== null) {
                setConfig((prev: any) => ({ ...prev, ...data }));
            }
        } catch (err) {
            console.error('Config fetch failed', err);
            setConfigError('Cannot reach sports engine. On the VPS, ensure Python runs on 8001 and Next.js can proxy to it.');
        }
    };

    const updateConfig = async (newConfig: any) => {
        setConfigError(null);
        try {
            const res = await fetch(`${ENGINE_URL}/api/admin/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
            const text = await res.text();
            let data: any = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch {
                if (!res.ok) {
                    alert(`Save failed (${res.status}). Is the sports engine running?`);
                    return;
                }
            }
            if (!res.ok) {
                alert(data.detail || data.error || `Save failed: HTTP ${res.status}`);
                return;
            }
            setConfig((prev: any) => ({ ...prev, ...data }));
            alert('Configuration updated.');
            void checkHealth();
        } catch {
            alert('Failed to update configuration (network error).');
        }
    };

    const clearCache = async () => {
        if (!confirm('Flush all Redis cache?')) return;
        try {
            const res = await fetch(`${ENGINE_URL}/api/admin/clear-cache`, { method: 'POST' });
            if (!res.ok) {
                alert(`Cache flush failed: ${res.status}`);
                return;
            }
            alert('Cache cleared.');
        } catch {
            alert('Failed to clear cache');
        }
    };

    const fetchPreview = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${ENGINE_URL}/api/league/${encodeURIComponent(previewQuery)}`);
            const data = await res.json();
            setPreviewData(data);
        } catch (err) {
            setPreviewData({ error: 'Failed to fetch data' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white">Sports Engine</h2>
                        <p className="text-gray-400">Live scores source, cache, and diagnostics</p>
                    </div>
                    <div
                        className={`px-4 py-2 rounded-full flex items-center gap-2 border shrink-0 ${
                            status === 'online'
                                ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400'
                                : 'bg-red-900/20 border-red-500/50 text-red-400'
                        }`}
                    >
                        <div
                            className={`w-3 h-3 rounded-full ${status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
                        />
                        <span className="font-mono font-bold uppercase text-sm">Engine {status}</span>
                    </div>
                </div>

                {configError ? (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm">
                        <strong className="block text-amber-200 mb-1">Could not load engine config</strong>
                        {configError}
                        <button
                            type="button"
                            onClick={() => fetchConfig()}
                            className="mt-2 text-xs font-bold underline text-amber-200"
                        >
                            Retry
                        </button>
                    </div>
                ) : null}

                {/* Full-width: impossible to miss on desktop or mobile */}
                <div className="glass-panel p-6 rounded-2xl border-2 border-emerald-500/30 space-y-4">
                    <div className="flex items-start gap-3">
                        <Globe2 className="text-emerald-400 shrink-0 mt-0.5" size={28} />
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-bold text-white">Live scores data source</h3>
                            <p className="text-sm text-gray-400 mt-1">
                                Choose <strong className="text-white">Flashscore</strong> (all sports) or{' '}
                                <strong className="text-white">LiveScore.com</strong> (football, English region names — USA
                                not ABD). Then click <strong className="text-white">Save</strong>. Reference:{' '}
                                <a
                                    href="https://www.livescore.com/en/football/live/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-400 underline"
                                >
                                    livescore.com/en/football/live
                                </a>
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Provider
                            </label>
                            <select
                                value={config.scores_provider === 'livescore_com' ? 'livescore_com' : 'flashscore'}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        scores_provider: e.target.value,
                                    })
                                }
                                className="w-full bg-black/50 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm font-medium"
                            >
                                <option value="flashscore">Flashscore / Livescore.in Ninja (default)</option>
                                <option value="livescore_com">LiveScore.com API (football only)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                LiveScore region (ISO)
                            </label>
                            <input
                                type="text"
                                value={config.livescore_com_country_code || 'GB'}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        livescore_com_country_code: e.target.value.toUpperCase().slice(0, 4),
                                    })
                                }
                                className="w-full bg-black/50 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm font-mono uppercase"
                                maxLength={4}
                                placeholder="GB"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">Try GB, US, or DE for English-friendly labels.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Reference page URL (stored only)
                        </label>
                        <input
                            type="text"
                            value={config.livescore_com_page_url || ''}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    livescore_com_page_url: e.target.value,
                                })
                            }
                            className="w-full bg-black/50 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm"
                            placeholder="https://www.livescore.com/en/football/live/"
                        />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => updateConfig(config)}
                            disabled={status === 'offline'}
                            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm"
                        >
                            Save provider settings
                        </button>
                        <button
                            type="button"
                            onClick={() => fetchConfig()}
                            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/10"
                        >
                            Reload from server
                        </button>
                    </div>
                    {status === 'offline' ? (
                        <p className="text-xs text-red-300">
                            Engine is offline — saving is disabled. On production, run the sports_engine service (port 8001)
                            and set <code className="text-red-200">SPORTS_ENGINE_INTERNAL_URL</code> in Next if it is not
                            on 127.0.0.1:8001.
                        </p>
                    ) : null}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="glass-panel p-6 rounded-2xl space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Server className="text-emerald-energy" size={24} />
                            <h3 className="text-xl font-bold text-white">Engine mode</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 gap-3">
                                <div className="min-w-0">
                                    <h4 className="font-bold text-white">Data mode</h4>
                                    <p className="text-xs text-gray-400">Mock vs live API</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => updateConfig({ ...config, mode: config.mode === 'mock' ? 'live' : 'mock' })}
                                    className={`shrink-0 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                                        config.mode === 'mock' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'
                                    }`}
                                >
                                    {config.mode === 'mock' ? 'MOCK' : 'LIVE'}
                                </button>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 gap-3">
                                <div className="min-w-0">
                                    <h4 className="font-bold text-white">Maintenance</h4>
                                    <p className="text-xs text-gray-400">Stop live scores output</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => updateConfig({ ...config, maintenance: !config.maintenance })}
                                    className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${
                                        config.maintenance ? 'bg-red-500' : 'bg-gray-600'
                                    }`}
                                >
                                    <div
                                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                            config.maintenance ? 'translate-x-6' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Database className="text-blue-400" size={24} />
                            <h3 className="text-xl font-bold text-white">Cache</h3>
                        </div>
                        <p className="text-sm text-gray-400">
                            Flush Redis so the next scores request fetches fresh data.
                        </p>
                        <button
                            type="button"
                            onClick={clearCache}
                            className="w-full btn-secondary flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} /> Flush Redis cache
                        </button>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldAlert className="text-yellow-400" size={24} />
                            <h3 className="text-xl font-bold text-white">Service</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Port</span>
                                <span className="text-white font-mono">8001</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Health</span>
                                <span className={status === 'online' ? 'text-emerald-400' : 'text-red-400'}>{status}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <Code className="text-purple-400" size={24} />
                            <div>
                                <h3 className="text-xl font-bold text-white">Preview</h3>
                                <p className="text-sm text-gray-400">Optional league probe (if implemented)</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <input
                                type="text"
                                value={previewQuery}
                                onChange={(e) => setPreviewQuery(e.target.value)}
                                className="bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white w-full md:w-64"
                                placeholder="League name..."
                            />
                            <button type="button" onClick={fetchPreview} className="btn-primary py-2 px-6">
                                {loading ? '…' : 'Test'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-black/80 rounded-xl p-4 border border-gray-800 font-mono text-sm h-96 overflow-y-auto relative">
                        {previewData ? (
                            <pre className="text-emerald-400 whitespace-pre-wrap break-words">{JSON.stringify(previewData, null, 2)}</pre>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                                Run a test to see JSON here…
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default SportsEngine;
