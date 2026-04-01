import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

function Toast({ message, type = 'success', onClose }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
  };

  const colors = {
    success: 'bg-green-500/10 border-green-500/30',
    error: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
  };

  return (
    <div className="fixed top-20 right-6 z-50 toast-enter">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[type]} backdrop-blur-sm shadow-lg`}>
        {icons[type]}
        <span className="text-sm text-slate-200">{message}</span>
        <button onClick={onClose} className="ml-2 p-1 rounded hover:bg-slate-700/50 transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}

export default Toast;