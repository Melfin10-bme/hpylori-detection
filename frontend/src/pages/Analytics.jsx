import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Users, Activity, AlertCircle, Calendar, Download } from 'lucide-react';
import { getAnalyticsSummary, getAnalyticsTrends, getTests, getPatients } from '../services/api';

function Analytics({ showToast }) {
  const [summary, setSummary] = useState({ totalTests: 0, positiveCases: 0, negativeCases: 0, pendingTests: 0, infectionRate: 0 });
  const [trends, setTrends] = useState({ labels: [], positive: [], negative: [], total: [] });
  const [ageDistribution, setAgeDistribution] = useState([]);
  const [genderDistribution, setGenderDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, trendsData, testsData, patientsData] = await Promise.all([
          getAnalyticsSummary(),
          getAnalyticsTrends(),
          getTests(),
          getPatients()
        ]);

        setSummary(summaryData);
        setTrends(trendsData);

        // Calculate age distribution from patients
        const ageGroups = { '18-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };
        patientsData.forEach(p => {
          if (p.age >= 18 && p.age <= 30) ageGroups['18-30']++;
          else if (p.age >= 31 && p.age <= 45) ageGroups['31-45']++;
          else if (p.age >= 46 && p.age <= 60) ageGroups['46-60']++;
          else if (p.age > 60) ageGroups['60+']++;
        });
        setAgeDistribution(Object.entries(ageGroups).map(([name, value]) => ({ name, value })));

        // Calculate gender distribution
        const genderGroups = { Male: 0, Female: 0, Other: 0 };
        patientsData.forEach(p => {
          if (genderGroups[p.gender] !== undefined) {
            genderGroups[p.gender]++;
          }
        });
        setGenderDistribution(Object.entries(genderGroups).map(([name, value]) => ({ name, value })));

      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const trendChartData = trends.labels.map((date, idx) => ({
    date: date.slice(5), // Show MM-DD
    positive: trends.positive[idx] || 0,
    negative: trends.negative[idx] || 0,
    total: trends.total[idx] || 0
  }));

  const pieColors = ['#ef4444', '#10b981', '#f59e0b'];
  const genderColors = ['#3b82f6', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Infection trends and patient statistics</p>
        </div>
        <button
          onClick={() => showToast('Export functionality coming soon!')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-600 rounded-xl text-white text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Tests</p>
              <p className="text-xl font-bold text-white">{summary.totalTests}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Positive Cases</p>
              <p className="text-xl font-bold text-red-400">{summary.positiveCases}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Negative Cases</p>
              <p className="text-xl font-bold text-green-400">{summary.negativeCases}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Infection Rate</p>
              <p className="text-xl font-bold text-amber-400">{summary.infectionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Infection Trend */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Infection Trend Over Time</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Legend />
                <Line type="monotone" dataKey="positive" stroke="#ef4444" strokeWidth={2} name="Positive" />
                <Line type="monotone" dataKey="negative" stroke="#10b981" strokeWidth={2} name="Negative" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Test Results Pie */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Test Results Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Positive', value: summary.positiveCases },
                    { name: 'Negative', value: summary.negativeCases },
                    { name: 'Pending', value: summary.pendingTests }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {[{ name: 'Positive', value: summary.positiveCases }, { name: 'Negative', value: summary.negativeCases }, { name: 'Pending', value: summary.pendingTests }].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Patient Age Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Bar dataKey="value" fill="#0f766e" radius={[4, 4, 0, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Patient Gender Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {genderDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={genderColors[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;