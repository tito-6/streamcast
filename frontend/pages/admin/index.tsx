import React, { useState, useEffect } from 'react';
import { Activity, Users, Signal, Play, Square, Wifi, Cpu, HardDrive } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminLayout from '../../components/AdminLayout';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    subtext: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="glass-panel p-6 rounded-2xl">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
                <Icon className={`${color}`} size={24} />
            </div>
        </div>
        {subtext && <p className="text-xs text-gray-500 mt-4">{subtext}</p>}
    </div>
);

const AdminDashboard = () => {
    const [isLive, setIsLive] = useState(false);
    const [stats, setStats] = useState({
        system: { cpu_usage: 0, ram_usage: 0, go_routines: 0, active_users: 0, viewer_count: 0 },
        history: [] as any[]
    });

    // Polling for real-time stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('http://localhost:8080/api/stats');
                const data = await res.json();
                if (data.system) {
                    setStats(data);
                    // Check actual stream status (mock logic here, ideally check /api/streams)
                    setIsLive(data.system.viewer_count > 0);
                }
            } catch (err) {
                console.error("Failed to fetch stats", err);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 2000); // 2s refresh for "Real-time" feel
        return () => clearInterval(interval);
    }, []);

    const toggleStream = async () => {
        // Existing toggle logic...
        if (!isLive) {
            alert("Start ingest via your RTMP software (OBS) to: rtmp://localhost/live");
            return;
        }

        if (!confirm("Are you sure you want to STOP the active stream?")) return;

        try {
            const res = await fetch('http://localhost:8080/api/streams');
            const json = await res.json();
            const liveStream = json.data?.find((s: any) => s.is_live);

            if (liveStream) {
                await fetch(`http://localhost:8080/api/streams/${liveStream.id}/stop`, { method: 'POST' });
                setIsLive(false);
                alert("Stream stopped successfully.");
            } else {
                alert("No active stream found to stop.");
            }
        } catch (err) {
            console.error("Failed to stop stream", err);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Live Viewers"
                        value={stats.system.viewer_count}
                        icon={Users}
                        color="text-blue-500"
                        subtext="Real-time count"
                    />
                    <StatCard
                        title="CPU Load"
                        value={`${stats.system.cpu_usage.toFixed(1)}%`}
                        icon={Cpu}
                        color="text-emerald-energy"
                        subtext="Sever Processing"
                    />
                    <StatCard
                        title="RAM Usage"
                        value={`${stats.system.ram_usage.toFixed(1)}%`}
                        icon={HardDrive}
                        color="text-purple-500"
                        subtext="Memory Allocation"
                    />
                    <StatCard
                        title="System Routines"
                        value={stats.system.go_routines}
                        icon={Activity}
                        color="text-orange-500"
                        subtext="Active Go Routines"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Graph Area - Owncast Style */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-panel p-6 rounded-2xl">
                            <h3 className="text-lg font-bold text-white mb-6">Viewer Traffic</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats.history}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="time" stroke="#666" fontSize={12} />
                                        <YAxis stroke="#666" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Live Monitor (Compact) */}
                        <div className="glass-panel p-4 rounded-xl flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`w-3 h-3 rounded-full ${isLive ? "bg-red-500 animate-pulse" : "bg-gray-600"}`} />
                                <div>
                                    <h4 className="text-white font-bold">Stream Ingest</h4>
                                    <p className="text-xs text-gray-500">rtmp://localhost/live</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleStream}
                                className={`px-4 py-2 rounded-lg font-bold text-sm ${isLive
                                    ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                                    : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                                    }`}
                            >
                                {isLive ? "STOP STREAM" : "START INGEST"}
                            </button>
                        </div>
                    </div>

                    {/* Quick Logs / Details */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-panel p-6 rounded-2xl h-full">
                            <h3 className="font-bold text-white mb-4">Stream Info</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                    <span className="text-gray-400">Resolution</span>
                                    <span className="text-white">1080p (Target)</span>
                                </div>
                                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                    <span className="text-gray-400">Bitrate</span>
                                    <span className="text-emerald-400">6000 kbps (Target)</span>
                                </div>
                                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                    <span className="text-gray-400">Latency</span>
                                    <span className="text-white">~2s (Low Latency)</span>
                                </div>
                                <div className="mt-8 pt-6 border-t border-white/10">
                                    <p className="text-xs text-gray-500 text-center">
                                        Powered by StreamCast Engine v2.0
                                        <br /> Based on Owncast Architecture
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;


