import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
const FileUpload = ({ selectedFolder, onUploadComplete }) => {
    const [uploading, setUploading] = useState(false);
    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploading(true);
            const formData = new FormData();
            formData.append('folder', selectedFolder);
            for (let i = 0; i < e.target.files.length; i++) {
                formData.append('file', e.target.files[i]);
            }
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                if (response.ok) {
                    onUploadComplete();
                }
                else {
                    console.error('Upload failed');
                }
            }
            catch (error) {
                console.error('Error uploading files:', error);
            }
            finally {
                setUploading(false);
            }
        }
    };
    return (_jsxs("div", { className: "mt-8", children: [_jsx("h2", { className: "text-xl font-semibold text-sage mb-4", children: "Upload Files" }), _jsxs("div", { className: "border-2 border-dashed border-gray rounded-lg p-8 text-center", children: [_jsx("input", { type: "file", onChange: handleFileChange, multiple: true, disabled: uploading, className: "hidden", id: "file-upload" }), _jsx("label", { htmlFor: "file-upload", className: "cursor-pointer bg-red text-peach px-4 py-2 rounded-md hover:bg-red/80 focus:outline-none focus:ring-2 focus:ring-red", children: uploading ? 'Uploading...' : 'Drop files here or click to upload' }), _jsx("p", { className: "mt-2 text-sm text-gray", children: "You can upload files up to 1.5GB in size." })] })] }));
};
export default FileUpload;
//# sourceMappingURL=FileUpload.js.map