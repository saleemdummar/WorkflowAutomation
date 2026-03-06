'use client';

import React from 'react';
import { Upload, X } from 'lucide-react';

interface WorkflowImportModalProps {
    importName: string;
    setImportName: (name: string) => void;
    importData: string;
    setImportData: (data: string) => void;
    importing: boolean;
    onImport: () => void;
    onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClose: () => void;
}

export function WorkflowImportModal({
    importName,
    setImportName,
    importData,
    setImportData,
    importing,
    onImport,
    onImportFile,
    onClose,
}: WorkflowImportModalProps) {
    const handleClose = () => {
        setImportData('');
        setImportName('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-fcc-midnight border border-fcc-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-fcc-border">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Upload className="text-blue-400" size={24} />
                        Import Workflow
                    </h3>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Workflow Name</label>
                        <input
                            type="text"
                            value={importName}
                            onChange={(e) => setImportName(e.target.value)}
                            placeholder="Enter workflow name..."
                            className="w-full bg-fcc-charcoal border border-fcc-border text-white px-4 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Upload JSON File</label>
                        <input
                            type="file"
                            accept=".json"
                            onChange={onImportFile}
                            className="w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-fcc-gold file:text-fcc-charcoal hover:file:bg-yellow-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Or Paste JSON</label>
                        <textarea
                            value={importData}
                            onChange={(e) => setImportData(e.target.value)}
                            placeholder='{"name": "...", "definition": "...", "description": "..."}'
                            rows={8}
                            className="w-full bg-fcc-charcoal border border-fcc-border text-white px-4 py-2 rounded-lg focus:outline-none focus:border-fcc-gold font-mono text-sm"
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-fcc-border flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-fcc-charcoal text-gray-300 font-medium rounded-lg hover:bg-fcc-midnight transition-colors border border-fcc-border"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onImport}
                        disabled={!importData.trim() || importing}
                        className="px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
                    >
                        {importing ? 'Importing...' : 'Import Workflow'}
                    </button>
                </div>
            </div>
        </div>
    );
}
