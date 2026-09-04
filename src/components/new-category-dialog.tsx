import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCategory } from "@/hooks/use-categories";
import type { Category, CategoryType } from "@/types/finance";

interface NewCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: CategoryType;
  onCreated: (category: Category) => void;
}

/** Quick "+ Nova categoria" flow triggered from the category select on the compra de cartão,
 * despesa and receita forms — creates a user-owned category without leaving the parent dialog. */
export function NewCategoryDialog({ open, onOpenChange, type, onCreated }: NewCategoryDialogProps) {
  const [name, setName] = useState("");
  const createCategory = useCreateCategory();
  const kindLabel = type === "EXPENSE" ? "despesa" : "receita";

  function handleOpenChange(next: boolean) {
    if (!next) setName("");
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    createCategory.mutate(
      { name: trimmed, type },
      {
        onSuccess: (category) => {
          setName("");
          onOpenChange(false);
          onCreated(category);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova categoria</DialogTitle>
          <DialogDescription>
            Cadastre uma categoria de {kindLabel} personalizada para usar nos seus lançamentos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-category-name">Nome da categoria</Label>
            <Input
              id="new-category-name"
              placeholder={
                type === "EXPENSE" ? "Assinaturas, Farmácia..." : "Freelance, Aluguel..."
              }
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createCategory.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createCategory.isPending || name.trim().length < 2}
              className="bg-gradient-brand font-semibold"
            >
              {createCategory.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Salvando...
                </>
              ) : (
                "Criar categoria"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
