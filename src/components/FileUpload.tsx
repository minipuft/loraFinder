import React, { useState } from 'react';

interface FileUploadProps {
  selectedFolder: string;
  onUploadComplete: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ selectedFolder, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        } else {
          console.error('Upload failed');
        }
      } catch (error) {
        console.error('Error uploading files:', error);
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-sage mb-4">Upload Files</h2>
      <div className="border-2 border-dashed border-gray rounded-lg p-8 text-center">
        <input
          type="file"
          onChange={handleFileChange}
          multiple
          disabled={uploading}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer bg-red text-peach px-4 py-2 rounded-md hover:bg-red/80 focus:outline-none focus:ring-2 focus:ring-red"
        >
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </label>
        <p className="mt-2 text-sm text-gray">You can upload files up to 1.5GB in size.</p>
      </div>
    </div>
  );
};

export default FileUpload;