import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '../services/catalogApi';
import type { Context } from '../types';

export const useContextMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (context: Partial<Context>) => catalogApi.createContext(context),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contexts'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, context }: { id: string; context: Partial<Context> }) => 
      catalogApi.updateContext(id, context),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contexts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => catalogApi.deleteContext(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contexts'] });
    },
  });

  return {
    createContext: createMutation.mutateAsync,
    updateContext: updateMutation.mutateAsync,
    deleteContext: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
