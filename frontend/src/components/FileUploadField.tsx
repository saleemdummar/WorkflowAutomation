'use client';

import React, { useState } from 'react';
import FileService, { FileUploadResult } from '../services/fileService';

interface FileUploadFieldProps {
    fieldId: string;
    formId?: string;
    label: string;
    required?: boolean;
    disabled?: boolean;
    allowedTypes?: string[];
    maxSize?: number;
    multiple?: boolean;
    onChange?: (fileIds: string[]) => void;
    onUploadingChange?: (uploading: boolean) => void;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
    fieldId,
    formId,
    label,
    required = false,
    disabled = false,
    allowedTypes,
    maxSize,
    multiple = false,
    onChange,
    onUploadingChange,
}) => {
    const [uploadResults, setUploadResults] = useState<FileUploadResult[]>([]);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) {
            setUploadResults([]);
            setErrors([]);
            if (onChange) onChange([]);
            return;
        }

        setUploading(true);
        setErrors([]);
        onUploadingChange?.(true);

        try {
            const results = await FileService.uploadFiles(Array.from(files), {
                formId,
                fieldId,
            });

            setUploadResults(results);

            const allErrors: string[] = [];
            results.forEach((result) => {
                if (!result.isValid) {
                    allErrors.push(...result.errors);
                }
            });
            setErrors(allErrors);

            if (onChange) {
                const successfulFileIds = results
                    .filter((r) => r.isValid && r.fileId)
                    .map((r) => r.fileId!);
                onChange(successfulFileIds);
            }
        } catch (error) {
            setErrors([error instanceof Error ? error.message : 'Upload failed']);
        } finally {
            setUploading(false);
            onUploadingChange?.(false);
        }
    };

    const acceptedTypes = allowedTypes?.map(type =>
        type.startsWith('.') ? type : `.${type}`
    ).join(',');

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>

            <div className="space-y-2">
                <input
                    type="file"
                    onChange={handleFileChange}
                    required={required}
                    disabled={disabled || uploading}
                    multiple={multiple}
                    accept={acceptedTypes}
                    className="block w-full text-sm text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-bold
                        file:bg-fcc-charcoal file:text-fcc-gold
                        hover:file:bg-fcc-midnight
                        disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {allowedTypes && allowedTypes.length > 0 && (
                    <p className="text-xs text-gray-400">
                        Allowed types: {allowedTypes.join(', ')}
                    </p>
                )}

                {maxSize && (
                    <p className="text-xs text-gray-400">
                        Maximum file size: {maxSize}MB
                    </p>
                )}

                {uploading && (
                    <div className="flex items-center space-x-2 text-sm text-fcc-gold">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-fcc-gold"></div>
                        <span>Uploading...</span>
                    </div>
                )}

                {uploadResults.length > 0 && (
                    <div className="space-y-1">
                        {uploadResults.map((result, index) => (
                            <div
                                key={index}
                                className={`text-sm ${result.isValid ? 'text-green-600' : 'text-red-600'
                                    }`}
                            >
                                {result.isValid ? (
                                    <div className="flex items-center space-x-2">
                                        <span>✓</span>
                                        <span>
                                            {result.fileName} ({(result.fileSize / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-start space-x-2">
                                        <span>✗</span>
                                        <div>
                                            <div className="font-medium">{result.fileName}</div>
                                            {result.errors.map((err, i) => (
                                                <div key={i} className="text-xs">{err}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {errors.length > 0 && uploadResults.length === 0 && (
                    <div className="text-sm text-red-600">
                        {errors.map((error, i) => (
                            <div key={i}>{error}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUploadField;
