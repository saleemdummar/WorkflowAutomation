'use client';

import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';

// Use react-quill-new which supports React 18+
// react-quill-new is a maintained fork of react-quill with React 18+ compatibility
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface QuillWrapperProps {
    value?: string;
    onChange?: (content: string) => void;
    readOnly?: boolean;
    theme?: string;
    placeholder?: string;
    className?: string;
}

const QuillWrapper = forwardRef<unknown, QuillWrapperProps>((props, ref) => {
    const wrapperRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => {
            const editor = wrapperRef.current?.querySelector('.ql-editor');
            if (editor instanceof HTMLElement) {
                editor.focus();
            }
        },
        blur: () => {
            const editor = wrapperRef.current?.querySelector('.ql-editor');
            if (editor instanceof HTMLElement) {
                editor.blur();
            }
        },
    }));

    return (
        <div ref={wrapperRef} className={props.className}>
            <ReactQuill {...props} />
        </div>
    );
});

QuillWrapper.displayName = 'QuillWrapper';

export default QuillWrapper;
