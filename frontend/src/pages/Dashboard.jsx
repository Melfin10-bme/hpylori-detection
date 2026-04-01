import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Activity, CheckCircle, XCircle, Clock, Plus, FileText, RefreshCw, Volume2 } from 'lucide-react';
import { getAnalyticsSummary, getAnalyticsTrends, getTests, generateFakeData } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { speak } from '../components/TextToSpeech';

function Dashboard({ showToast }) {
  const [stats, setStats] = useState({ totalTests: 0, positiveCases: 0, negativeCases: 0, pendingTests: 0, infectionRate: 0 });
  const [recentTests, setRecentTests] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [summary, tests, trendsData] = await Promise.all([
        getAnalyticsSummary(),
        getTests(),
        getAnalyticsTrends()
      ]);
      setStats(summary);
      setRecentTests(tests.slice(-5).reverse());

      // Process trends data for chart (2025-2026 only)
      const trendChartData = trendsData.labels.map((date, idx) => ({
        date: date, // Show full date
        positive: trendsData.positive[idx] || 0,
        negative: trendsData.negative[idx] || 0
      })).filter(d => d.date.startsWith('2025') || d.date.startsWith('2026'));
      setTrends(trendChartData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateFakeData = async () => {
    try {
      setLoading(true);
      await generateFakeData(50);
      showToast('Fake data generated successfully!');
      fetchData();
    } catch (error) {
      showToast('Error generating fake data', 'error');
    }
  };

  const statCards = [
    { label: 'Total Tests', value: stats.totalTests, icon: Activity, color: 'from-blue-500 to-blue-700', text: 'text-blue-400' },
    { label: 'Positive Cases', value: stats.positiveCases, icon: XCircle, color: 'from-red-500 to-red-700', text: 'text-red-400' },
    { label: 'Negative Cases', value: stats.negativeCases, icon: CheckCircle, color: 'from-green-500 to-green-700', text: 'text-green-400' },
    { label: 'Infection Rate', value: `${stats.infectionRate}%`, icon: Activity, color: 'from-amber-500 to-amber-700', text: 'text-amber-400' },
  ];


  const pieData = [
    { name: 'Positive', value: stats.positiveCases, color: '#ef4444' },
    { name: 'Negative', value: stats.negativeCases, color: '#10b981' },
  ];

  const guideText = "Welcome to the H. pylori Detection Dashboard. This page shows an overview of all tests. At the top, you see 4 cards: Total Tests, Positive Cases, Negative Cases, and Infection Rate. Below are two charts: Infection Trends showing positive and negative cases over time, and Test Results Distribution showing the pie chart. You can click the Patients Name button to generate fake patient data for testing, or click New Test to create a new H. pylori test.";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Overview of H. pylori detection system</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => speak(guideText)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white text-sm font-medium transition-colors"
            title="Listen to guide"
          >
            <Volume2 className="w-4 h-4" />
            Guide
          </button>
          <button
            onClick={handleGenerateFakeData}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-white text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Patients Name
          </button>
          <Link
            to="/new-test"
            className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-600 rounded-xl text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Test
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-slate-800 rounded-2xl p-5 border border-slate-700 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.text}`}>{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Infection Trends</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Line type="monotone" dataKey="positive" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} name="Positive" />
                <Line type="monotone" dataKey="negative" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="Negative" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Test Results Distribution</h2>
          <div className="h-64 flex items-center justify-center">
            {stats.totalTests > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No data available</p>
                <p className="text-sm">Generate fake data to see results</p>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-300">Positive ({stats.positiveCases})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-slate-300">Negative ({stats.negativeCases})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tests */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Tests</h2>
          <Link to="/patients" className="text-sm text-primary-400 hover:text-primary-300">View All</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-700">
                <th className="pb-3 text-sm font-medium text-slate-400">Patient</th>
                <th className="pb-3 text-sm font-medium text-slate-400">Date</th>
                <th className="pb-3 text-sm font-medium text-slate-400">Result</th>
                <th className="pb-3 text-sm font-medium text-slate-400">Confidence</th>
                <th className="pb-3 text-sm font-medium text-slate-400">Nanopaper</th>
              </tr>
            </thead>
            <tbody>
              {recentTests.length > 0 ? (
                recentTests.map((test) => (
                  <tr key={test.id} className="border-b border-slate-700/50">
                    <td className="py-3 text-sm text-white">{test.patientName || 'Unknown'}</td>
                    <td className="py-3 text-sm text-slate-400">{new Date(test.analyzedAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        test.prediction === 'Positive'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {test.prediction}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-slate-300">{test.confidence}%</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${
                          test.nanopaperColor === 'Yellow' ? 'bg-amber-400' : 'bg-amber-800'
                        }`}></div>
                        <span className="text-sm text-slate-300">{test.nanopaperColor}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    No tests yet. Generate fake data or create a new test.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;