import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFiles } from '@/lib/api';

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
const UploadFiles: React.FC<UploadFilesProps> = ({ selectedFolder, onUploadComplete }) => {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  /**
   * Handles the file drop event.
   * Initiates the file upload process and manages upload state.
   * 
   * @param {File[]} acceptedFiles - Array of files accepted by the dropzone.
   */
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await uploadFiles(selectedFolder, acceptedFiles, (progress) => {
        setUploadProgress(progress);
      });
      onUploadComplete();
    } catch (error) {
      console.error('Upload failed:', error);
      // TODO: Implement proper error handling and user feedback
    } finally {
      setIsUploading(false);
    }
  }, [selectedFolder, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer">
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
        <p>Drag 'n' drop some files here, or click to select files</p>
      )}
      {isUploading && (
        <div className="mt-2">
          <progress value={uploadProgress} max="100" />
          <p>{uploadProgress.toFixed(0)}% uploaded</p>
        </div>
      )}
    </div>
  );
};

export default UploadFiles;