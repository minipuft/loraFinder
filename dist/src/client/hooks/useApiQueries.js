import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../../shared/lib/api";
export function useFoldersQuery() {
    return useQuery({
        queryKey: ["folders"],
        queryFn: api.getFolders,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 3,
    });
}
export function useImagesQuery(folder) {
    return useQuery({
        queryKey: ["images", folder],
        queryFn: () => api.getImages(folder),
        enabled: !!folder,
        staleTime: 2 * 60 * 1000, // 2 minutes
        retry: 2,
    });
}
export const useUploadFilesMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ folder, files, onProgress }) => api.uploadFiles(folder, files, onProgress),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["images"] });
        },
        onError: (error) => {
            console.error("Error uploading files:", error);
        },
    });
};
export const useDeleteImageMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (imageId) => api.deleteImage(imageId),
        onSuccess: (_, imageId) => {
            queryClient.invalidateQueries({ queryKey: ["images"] });
        },
        onError: (error) => {
            console.error("Error deleting image:", error);
        },
    });
};
//# sourceMappingURL=useApiQueries.js.map