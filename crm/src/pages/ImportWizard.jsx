import React, { useState, useRef } from 'react';

export default function ImportWizard() {
  const [step, setStep] = useState('upload'); // upload | preview | result
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/crm/api/import/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setPreview(data);
      setStep('preview');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/crm/api/import/commit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: preview.preview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
      setStep('result');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-display font-bold text-timber mb-6">Import Guests</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-6">
          <p className="text-rawhide mb-4">Upload a CSV or XLSX file with guest data. Required columns: <code>first_name</code>, <code>last_name</code>.</p>
          <form onSubmit={handleUpload}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="block w-full text-sm text-rawhide file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-creek file:text-white file:cursor-pointer"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-4 px-4 py-2 bg-creek text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload & Preview'}
            </button>
          </form>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-6">
          <p className="text-rawhide mb-2">{preview.total_rows} rows found. Columns: {preview.columns.join(', ')}</p>
          <p className="text-sm text-rawhide mb-4">Showing first {preview.preview.length} rows:</p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead className="bg-snow">
                <tr>
                  {preview.columns.map((col) => (
                    <th key={col} className="p-2 text-left font-medium text-rawhide">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i} className="border-t border-wheat/10">
                    {preview.columns.map((col) => (
                      <td key={col} className="p-2 text-timber">{row[col] || ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCommit}
              disabled={loading}
              className="px-4 py-2 bg-creek text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import All'}
            </button>
            <button
              onClick={() => { setStep('upload'); setPreview(null); }}
              className="px-4 py-2 border border-wheat/40 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-6">
          <h2 className="text-lg font-display font-bold text-timber mb-3">Import Complete</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-700">{result.created}</div>
              <div className="text-xs text-green-600">Created</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-700">{result.updated}</div>
              <div className="text-xs text-blue-600">Updated</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-700">{result.skipped}</div>
              <div className="text-xs text-yellow-600">Skipped</div>
            </div>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="text-sm text-red-600 mb-4">
              {result.errors.map((e, i) => <p key={i}>Row {e.row}: {e.error}</p>)}
            </div>
          )}
          <button
            onClick={() => { setStep('upload'); setPreview(null); setResult(null); }}
            className="px-4 py-2 bg-creek text-white rounded-lg text-sm font-medium"
          >
            Import More
          </button>
        </div>
      )}
    </div>
  );
}
