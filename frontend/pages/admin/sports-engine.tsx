import React, { useState, useEffect } from 'react';
import { Activity, Database, RefreshCw, Server, Play, ShieldAlert, Code } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';

const SportsEngine = () => {
    const [status, setStatus] = useState<"online" | "offline">("offline");
    const [config, setConfig] = useState<any>({ mode: "mock", maintenance: false });
    const [previewQuery, setPreviewQuery] = useState("Premier League");
    const [previewData, setPreviewData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const ENGINE_URL = "/api/sports-engine"; // Access via proxy

    useEffect(() => {
        checkHealth();
        fetchConfig();
    }, []);

    const checkHealth = async () => {
        try {
            const res = await fetch(`${ENGINE_URL}/`);
            if (res.ok) setStatus("online");
            else setStatus("offline");
        } catch {
            setStatus("offline");
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${ENGINE_URL}/api/config`);
            const data = await res.json();
            setConfig(data);
        } catch (err) {
            console.error("Config fetch failed", err);
        }
    };

    const updateConfig = async (newConfig: any) => {
        try {
            const res = await fetch(`${ENGINE_URL}/api/admin/config`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newConfig)
            });
            if (res.ok) {
                setConfig(newConfig);
                alert("Configuration Updated!");
            }
        } catch (err) {
            alert("Failed to update config");
        }
    };

    const clearCache = async () => {
        if (!confirm("Flush all Redis cache?")) return;
        try {
            await fetch(`${ENGINE_URL}/api/admin/clear-cache`, { method: "POST" });
            alert("Cache Cleared Successfully");
        } catch (err) {
            alert("Failed to clear cache");
        }
    };

    const fetchPreview = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${ENGINE_URL}/api/league/${previewQuery}`);
            const data = await res.json();
            setPreviewData(data);
        } catch (err) {
            setPreviewData({ error: "Failed to fetch data" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white">Sports Engine Control</h2>
                        <p className="text-gray-400">Manage the Python Play-by-Play Ingestion Service</p>
                    </div>
                    <div className={`px-4 py-2 rounded-full flex items-center gap-2 border ${status === 'online' ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400' : 'bg-red-900/20 border-red-500/50 text-red-400'}`}>
                        <div className={`w-3 h-3 rounded-full ${status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                        <span className="font-mono font-bold uppercase">{status}</span>
                    </div>
                </div>

                {/* Control Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="glass-panel p-6 rounded-2xl space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Server className="text-emerald-energy" size={24} />
                            <h3 className="text-xl font-bold text-white">Engine Mode</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                                <div>
                                    <h4 className="font-bold text-white">Data Source</h4>
                                    <p className="text-xs text-gray-400">Switch between Mock Data and Live API</p>
                                </div>
                                <button
                                    onClick={() => updateConfig({ ...config, mode: config.mode === 'mock' ? 'live' : 'mock' })}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${config.mode === 'mock' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'}`}
                                >
                                    {config.mode === 'mock' ? 'MOCK DATA' : 'LIVE API'}
                                </button>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                                <div>
                                    <h4 className="font-bold text-white">Maintenance</h4>
                                    <p className="text-xs text-gray-400">Stop all ingestion and show maintenance</p>
                                </div>
                                <button
                                    onClick={() => updateConfig({ ...config, maintenance: !config.maintenance })}
                                    className={`w-12 h-6 rounded-full relative transition-colors ${config.maintenance ? 'bg-red-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${config.maintenance ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Database className="text-blue-400" size={24} />
                            <h3 className="text-xl font-bold text-white">Cache Management</h3>
                        </div>
                        <p className="text-sm text-gray-400">
                            Clear the Redis cache to force fresh data fetching on the next request. Use this if live scores are stuck.
                        </p>
                        <button
                            onClick={clearCache}
                            className="w-full btn-secondary flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} /> Flush Redis Cache
                        </button>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldAlert className="text-yellow-400" size={24} />
                            <h3 className="text-xl font-bold text-white">System Status</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Port</span>
                                <span className="text-white font-mono">8001</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Uptime</span>
                                <span className="text-white font-mono">--:--:--</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Requests/min</span>
                                <span className="text-white font-mono">0</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Window */}
                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <Code className="text-purple-400" size={24} />
                            <div>
                                <h3 className="text-xl font-bold text-white">Live Data Preview</h3>
                                <p className="text-sm text-gray-400">Test the engine response directly</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <input
                                type="text"
                                value={previewQuery}
                                onChange={(e) => setPreviewQuery(e.target.value)}
                                className="bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white w-full md:w-64"
                                placeholder="League Name..."
                            />
                            <button onClick={fetchPreview} className="btn-primary py-2 px-6">
                                {loading ? 'Fetching...' : 'Test'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-black/80 rounded-xl p-4 border border-gray-800 font-mono text-sm h-96 overflow-y-auto relative">
                        {previewData ? (
                            <pre className="text-emerald-400">{JSON.stringify(previewData, null, 2)}</pre>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                                Run a test to see the JSON response here...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default SportsEngine;
