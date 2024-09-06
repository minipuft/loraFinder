import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from "react";
import { useDropzone } from 'react-dropzone';
import { uploadFiles } from "../lib/api.js";
/**
 * UploadFiles component that provides a drag-and-drop interface for file uploads.
 * It handles file selection, upload progress, and communicates with the API.
 *
 * @component
 * @param {UploadFilesProps} props - The props for the UploadFiles component.
 * @returns {JSX.Element} A file upload interface with drag-and-drop functionality.
 */
const UploadFiles = ({ selectedFolder, onUploadComplete, }) => {
    // State to track upload progress
    const [uploadProgress, setUploadProgress] = useState(0);
    // State to track if an upload is in progress
    const [isUploading, setIsUploading] = useState(false);
    /**
     * Handles the file drop event.
     * Initiates the file upload process and manages upload state.
     *
     * @param {File[]} acceptedFiles - Array of files accepted by the dropzone.
     */
    const onDrop = useCallback(async (acceptedFiles) => {
        // Return early if no files were accepted
        if (acceptedFiles.length === 0)
            return;
        // Set upload state to true and reset progress
        setIsUploading(true);
        setUploadProgress(0);
        try {
            // Attempt to upload files and update progress
            await uploadFiles(selectedFolder, acceptedFiles, (progress) => {
                setUploadProgress(progress);
            });
            // Call the onUploadComplete callback when upload is successful
            onUploadComplete();
        }
        catch (error) {
            console.error("Upload failed:", error);
            // TODO: Implement proper error handling and user feedback
        }
        finally {
            // Reset upload state regardless of success or failure
            setIsUploading(false);
        }
    }, [selectedFolder, onUploadComplete]);
    // Use the useDropzone hook to handle drag and drop functionality
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
    return (
    // Dropzone container with styling
    _jsxs("div", { ...getRootProps(), className: "border-2 border-dashed border-gray-500 rounded-lg p-4 text-center cursor-pointer bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors duration-200", children: [_jsx("input", { ...getInputProps() }), isDragActive ? (_jsx("p", { children: "Drop the files here ..." })) : (_jsx("p", { children: "Drag 'n' drop some files here, or click to select files" })), isUploading && (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "w-full bg-gray-600 rounded-full h-2.5", children: _jsx("div", { className: "bg-primary h-2.5 rounded-full", style: { width: `${uploadProgress}%` } }) }), _jsxs("p", { className: "mt-1", children: [uploadProgress.toFixed(0), "% uploaded"] })] }))] }));
};
export default UploadFiles;
//# sourceMappingURL=UploadFiles.js.map