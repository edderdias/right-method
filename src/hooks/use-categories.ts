import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import { createCategory } from "@/lib/finance-api";
import type { CreateCategoryInput } from "@/types/finance";

const GENERIC_ERROR_MESSAGE = "Não foi possível salvar a categoria. Tente novamente.";

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}

/** Shared by every "+ Nova categoria" flow (compras de cartão, despesas, receitas) — invalidates
 * just the list for the created category's type, keyed the same way as useExpenseCategories /
 * useRevenueCategories: ["categories", type]. */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: (category) => {
      toast.success("Categoria cadastrada com sucesso!");
      void queryClient.invalidateQueries({ queryKey: ["categories", category.type] });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}
