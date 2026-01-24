import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, Smartphone, Globe, Activity } from 'lucide-react';

const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#8884d8'];

const InsightsPage = () => {
    // Realtime State
    const [realtime, setRealtime] = useState({
        total_viewers: 0,
        languages: {} as Record<string, number>,
        devices: {} as Record<string, number>
    });

    // Historical State
    const [history, setHistory] = useState<any[]>([]);
    const [period, setPeriod] = useState('24h');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [loading, setLoading] = useState(true);

    // Fetch Realtime Every 5s
    useEffect(() => {
        const fetchRealtime = async () => {
            try {
                const res = await fetch('/api/admin/insights/realtime');
                const data = await res.json();
                if (data) setRealtime(data);
            } catch (err) { console.error(err); }
        };
        fetchRealtime();
        const interval = setInterval(fetchRealtime, 5000);
        return () => clearInterval(interval);
    }, []);

    // Fetch Historical on Period/Range Change
    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                let url = `/api/admin/insights/historical?period=${period}`;
                if (period === 'custom' && dateRange.start && dateRange.end) {
                    // Convert date strings to RFC3339
                    const start = new Date(dateRange.start).toISOString();
                    const end = new Date(dateRange.end).toISOString();
                    url += `&start=${start}&end=${end}`;
                }

                const res = await fetch(url);
                const json = await res.json();
                if (json.chart) setHistory(json.chart);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };

        if (period !== 'custom' || (dateRange.start && dateRange.end)) {
            fetchHistory();
        }
    }, [period, dateRange]);

    // Transform Data for Pie Charts
    const deviceData = Object.entries(realtime.devices).map(([name, value]) => ({ name, value }));
    const langData = Object.entries(realtime.languages).map(([name, value]) => ({ name, value }));

    return (
        <AdminLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Live Insights</h1>
                    <p className="text-gray-400">Real-time audience insights and historical trends.</p>
                </div>

                {/* Realtime KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Viewers */}
                    <div className="glass-panel p-8 rounded-2xl border border-emerald-500/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Activity size={100} className="text-emerald-500" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                <h3 className="text-gray-400 font-bold uppercase tracking-wider text-sm">Live Viewers</h3>
                            </div>
                            <div className="text-5xl font-black text-white">{realtime.total_viewers}</div>
                            <p className="text-emerald-400 text-sm mt-2 font-medium">
                                +{Object.values(realtime.devices).reduce((a, b) => a + b, 0)} new sessions / min
                            </p>
                        </div>
                    </div>

                    {/* Top Device */}
                    <div className="glass-panel p-6 rounded-2xl flex items-center gap-6">
                        <div className="p-4 bg-blue-500/10 rounded-xl text-blue-400">
                            <Smartphone size={32} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm font-bold uppercase">Top Device</p>
                            <h3 className="text-2xl font-bold text-white">
                                {deviceData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}
                            </h3>
                            <p className="text-blue-400 text-xs">Most used platform</p>
                        </div>
                    </div>

                    {/* Top Language */}
                    <div className="glass-panel p-6 rounded-2xl flex items-center gap-6">
                        <div className="p-4 bg-purple-500/10 rounded-xl text-purple-400">
                            <Globe size={32} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm font-bold uppercase">Top Language</p>
                            <h3 className="text-2xl font-bold text-white">
                                {langData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}
                            </h3>
                            <p className="text-purple-400 text-xs">Audience preference</p>
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Historical Chart */}
                    <div className="lg:col-span-2 glass-panel p-6 rounded-xl">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <h3 className="text-xl font-bold text-white">Traffic Trends</h3>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex bg-black/40 rounded-lg p-1">
                                    {['24h', '7d', '30d'].map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => { setPeriod(p); setDateRange({ start: '', end: '' }); }}
                                            className={`px-4 py-1 rounded text-sm font-medium transition-colors ${period === p ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPeriod('custom')}
                                        className={`px-4 py-1 rounded text-sm font-medium transition-colors ${period === 'custom' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Custom
                                    </button>
                                </div>

                                {period === 'custom' && (
                                    <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-gray-700">
                                        <input
                                            type="date"
                                            className="bg-transparent text-white text-sm px-2 py-1 outline-none"
                                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input
                                            type="date"
                                            className="bg-transparent text-white text-sm px-2 py-1 outline-none"
                                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00FF7F" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00FF7F" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="time" stroke="#666" fontSize={12} tickFormatter={(str) => str.split(' ')[1] || str} />
                                    <YAxis stroke="#666" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#060918', border: '1px solid #333', borderRadius: '8px' }}
                                        labelStyle={{ color: '#aaa' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#00FF7F" fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Breakdown Charts */}
                    <div className="space-y-8">
                        {/* Device Breakdown */}
                        <div className="glass-panel p-6 rounded-xl h-[200px] flex flex-col">
                            <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase">Device Breakdown</h3>
                            <div className="w-full h-[120px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={deviceData.length ? deviceData : [{ name: 'No Data', value: 1 }]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={30}
                                            outerRadius={50}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {deviceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Language Breakdown */}
                        <div className="glass-panel p-6 rounded-xl h-[200px] flex flex-col">
                            <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase">Language Breakdown</h3>
                            <div className="w-full h-[120px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={langData.length ? langData : [{ name: 'No Data', value: 1 }]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={30}
                                            outerRadius={50}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {langData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default InsightsPage;
