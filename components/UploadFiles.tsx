import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadFiles } from "@/lib/api";

/**
 * Props for the UploadFiles component.
 * @interface UploadFilesProps
 */
interface UploadFilesProps {
  selectedFolder: string;
  onUploadComplete: () => void;
}

/**
 * UploadFiles component that provides a drag-and-drop interface for file uploads.
 * It handles file selection, upload progress, and communicates with the API.
 *
 * @component
 * @param {UploadFilesProps} props - The props for the UploadFiles component.
 * @returns {JSX.Element} A file upload interface with drag-and-drop functionality.
 */
const UploadFiles: React.FC<UploadFilesProps> = ({
  selectedFolder,
  onUploadComplete,
}) => {
  // State to track upload progress
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  // State to track if an upload is in progress
  const [isUploading, setIsUploading] = useState<boolean>(false);

  /**
   * Handles the file drop event.
   * Initiates the file upload process and manages upload state.
   *
   * @param {File[]} acceptedFiles - Array of files accepted by the dropzone.
   */
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Return early if no files were accepted
      if (acceptedFiles.length === 0) return;

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
      } catch (error) {
        console.error("Upload failed:", error);
        // TODO: Implement proper error handling and user feedback
      } finally {
        // Reset upload state regardless of success or failure
        setIsUploading(false);
      }
    },
    [selectedFolder, onUploadComplete]
  );

  // Use the useDropzone hook to handle drag and drop functionality
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    // Dropzone container with styling
    <div
      {...getRootProps()}
      className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center cursor-pointer bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors duration-200"
    >
      {/* Hidden file input */}
      <input {...getInputProps()} />
      {/* Display different text based on drag state */}
      {isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
        <p>Drag 'n' drop some files here, or click to select files</p>
      )}
      {/* Display upload progress when uploading */}
      {isUploading && (
        <div className="mt-2">
          <div className="w-full bg-gray-600 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="mt-1">{uploadProgress.toFixed(0)}% uploaded</p>
        </div>
      )}
    </div>
  );
};

export default UploadFiles;
