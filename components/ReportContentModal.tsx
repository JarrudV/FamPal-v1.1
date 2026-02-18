import React from 'react';
import { UGC_REPORT_REASONS, type UgcReportReason } from '../src/services/ugcReports';

interface ReportContentModalProps {
  isOpen: boolean;
  targetLabel: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (reason: UgcReportReason) => Promise<void> | void;
}

const ReportContentModal: React.FC<ReportContentModalProps> = ({
  isOpen,
  targetLabel,
  submitting = false,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-200">
        <h3 className="text-lg font-black text-slate-900">Report</h3>
        <p className="text-sm text-slate-500 mt-1">Select a reason for reporting {targetLabel}.</p>
        <div className="mt-4 space-y-2">
          {UGC_REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => onSubmit(reason)}
              disabled={submitting}
              className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              {reason}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="w-full mt-4 px-4 py-3 rounded-xl bg-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-300 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ReportContentModal;

