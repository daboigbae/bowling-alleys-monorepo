import { useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '../lib/api';
import type { UpdateProfileRequest, UpdateProfileResponse } from '../types/user';

/**
 * Mutation hook for updating the authenticated user's profile.
 * PUT /api/users/:userId — authenticated.
 * On success: invalidates the user profile query so the UI refreshes.
 */
export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<UpdateProfileResponse, Error, UpdateProfileRequest>({
    mutationFn: (body: UpdateProfileRequest) =>
      request<UpdateProfileRequest, UpdateProfileResponse>(
        'PUT',
        `/api/users/${userId}`,
        body,
        true, // authenticated
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', userId] });
    },
  });

  return {
    updateProfile: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}
