import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, File, Calendar, User, Filter } from 'lucide-react';
import { getPatients, getTests, generatePDFReport, generateCSVReport } from '../services/api';

// Helper function to download base64 data
const downloadBase64File = (base64Data, filename, mimeType) => {
  const link = document.createElement('a');
  link.href = base64Data;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function Reports({ showToast }) {
  const [patients, setPatients] = useState([]);
  const [tests, setTests] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedTest, setSelectedTest] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsData, testsData] = await Promise.all([getPatients(), getTests()]);
        setPatients(patientsData);
        setTests(testsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const patientTests = tests.filter(t => t.patientId === selectedPatient);

  const handleGeneratePDF = async () => {
    if (!selectedPatient || !selectedTest) {
      showToast('Please select a patient and test', 'warning');
      return;
    }

    setGenerating(true);
    try {
      const result = await generatePDFReport(selectedPatient, selectedTest);
      const filename = `HPylori_Report_${selectedTest.substring(0, 8)}.pdf`;
      downloadBase64File(result.downloadUrl, filename, 'application/pdf');
      showToast('PDF report generated successfully!');
    } catch (error) {
      showToast('Error generating PDF report', 'error');
    }
    setGenerating(false);
  };

  const handleGenerateCSV = async () => {
    if (!selectedPatient || !selectedTest) {
      showToast('Please select a patient and test', 'warning');
      return;
    }

    setGenerating(true);
    try {
      const result = await generateCSVReport(selectedPatient, selectedTest);
      const filename = `HPylori_Report_${selectedTest.substring(0, 8)}.csv`;
      downloadBase64File(result.downloadUrl, filename, 'text/csv');
      showToast('CSV report generated successfully!');
    } catch (error) {
      showToast('Error generating CSV report', 'error');
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-400 text-sm mt-1">Generate and download patient reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generate Report */}
        <div className="lg:col-span-1 bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Generate New Report</h2>

          <div className="space-y-4">
            {/* Patient Selection */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Select Patient</label>
              <select
                value={selectedPatient}
                onChange={(e) => { setSelectedPatient(e.target.value); setSelectedTest(''); }}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-primary-600"
              >
                <option value="">Choose a patient...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Test Selection */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Select Test</label>
              <select
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                disabled={!selectedPatient}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-primary-600 disabled:opacity-50"
              >
                <option value="">Choose a test...</option>
                {patientTests.map(t => (
                  <option key={t.id} value={t.id}>
                    {new Date(t.analyzedAt).toLocaleDateString()} - {t.prediction} ({t.confidence}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Generate Buttons */}
            <div className="pt-2 space-y-3">
              <button
                onClick={handleGeneratePDF}
                disabled={generating || !selectedPatient || !selectedTest}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-medium transition-colors disabled:opacity-50"
              >
                <FileText className="w-5 h-5" />
                Generate PDF Report
              </button>
              <button
                onClick={handleGenerateCSV}
                disabled={generating || !selectedPatient || !selectedTest}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-medium transition-colors disabled:opacity-50"
              >
                <File className="w-5 h-5" />
                Generate CSV Report
              </button>
            </div>
          </div>
        </div>

        {/* Report Instructions */}
        <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Report Information</h2>

          <div className="space-y-6">
            {/* PDF Report */}
            <div className="flex items-start gap-4 p-4 bg-slate-700/50 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">PDF Report</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Generates a formatted medical report containing patient information, test results, diagnosis, and timestamps. Perfect for printing and sharing with patients.
                </p>
                <ul className="mt-2 text-xs text-slate-500 space-y-1">
                  <li>• Patient details and demographics</li>
                  <li>• Test results and analysis</li>
                  <li>• Diagnosis interpretation</li>
                  <li>• Professional medical formatting</li>
                </ul>
              </div>
            </div>

            {/* CSV Report */}
            <div className="flex items-start gap-4 p-4 bg-slate-700/50 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <File className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">CSV Report</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Exports raw test data in CSV format for further analysis, research, or integration with other systems. Contains all binary signal data.
                </p>
                <ul className="mt-2 text-xs text-slate-500 space-y-1">
                  <li>• Raw patient data</li>
                  <li>• Complete binary signal</li>
                  <li>• All test metadata</li>
                  <li>• Compatible with Excel/Spreadsheets</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Generate from Recent Tests */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Tests - Quick Generate</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-700">
                <th className="pb-3 text-sm font-medium text-slate-400">Patient</th>
                <th className="pb-3 text-sm font-medium text-slate-400">Date</th>
                <th className="pb-3 text-sm font-medium text-slate-400">Result</th>
                <th className="pb-3 text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.slice(0, 10).reverse().map((test) => {
                const patient = patients.find(p => p.id === test.patientId);
                return (
                  <tr key={test.id} className="border-b border-slate-700/50">
                    <td className="py-3 text-sm text-white">{patient?.name || 'Unknown'}</td>
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
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const result = await generatePDFReport(test.patientId, test.id);
                            const filename = `HPylori_Report_${test.id.substring(0, 8)}.pdf`;
                            downloadBase64File(result.downloadUrl, filename, 'application/pdf');
                            showToast('PDF generated!');
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-white text-xs transition-colors"
                        >
                          PDF
                        </button>
                        <button
                          onClick={async () => {
                            const result = await generateCSVReport(test.patientId, test.id);
                            const filename = `HPylori_Report_${test.id.substring(0, 8)}.csv`;
                            downloadBase64File(result.downloadUrl, filename, 'text/csv');
                            showToast('CSV generated!');
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-white text-xs transition-colors"
                        >
                          CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Reports;