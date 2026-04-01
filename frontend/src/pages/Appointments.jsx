import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Edit, X, Check } from 'lucide-react';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, getPatients } from '../services/api';

function Appointments({ showToast }) {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ patientId: '', date: '', time: '', notes: '' });

  const fetchData = async () => {
    try {
      const [appointmentsData, patientsData] = await Promise.all([
        getAppointments(),
        getPatients()
      ]);
      setAppointments(appointmentsData);
      setPatients(patientsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAppointment(editingId, formData);
        showToast('Appointment updated successfully');
      } else {
        await createAppointment(formData);
        showToast('Appointment booked successfully');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ patientId: '', date: '', time: '', notes: '' });
      fetchData();
    } catch (error) {
      showToast('Error saving appointment', 'error');
    }
  };

  const handleEdit = (apt) => {
    setEditingId(apt.id);
    setFormData({
      patientId: apt.patientId,
      date: apt.date,
      time: apt.time,
      notes: apt.notes
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await deleteAppointment(id);
      showToast('Appointment cancelled');
      fetchData();
    } catch (error) {
      showToast('Error cancelling appointment', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-500/20 text-blue-400';
      case 'Completed': return 'bg-green-500/20 text-green-400';
      case 'Cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Appointments</h1>
          <p className="text-slate-400 text-sm mt-1">Manage patient appointments</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setEditingId(null); setFormData({ patientId: '', date: '', time: '', notes: '' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-600 rounded-xl text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Book Appointment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {appointments.map((apt) => (
          <div key={apt.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-medium">{apt.patientName}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                  {apt.status}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(apt)} className="p-1 text-slate-400 hover:text-white">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(apt.id)} className="p-1 text-red-400 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>{apt.date}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4" />
                <span>{apt.time}</span>
              </div>
              {apt.notes && <p className="text-slate-500 text-xs">{apt.notes}</p>}
            </div>
          </div>
        ))}
        {appointments.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No appointments found</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingId ? 'Edit Appointment' : 'Book Appointment'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Patient</label>
                <select
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  required
                >
                  <option value="">Select Patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary-700 hover:bg-primary-600 rounded-lg text-white"
                >
                  {editingId ? 'Update' : 'Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;