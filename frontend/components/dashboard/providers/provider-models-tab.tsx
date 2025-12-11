"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ModelsResponse } from "@/http/provider";
import { ModelCard } from "./model-card";

interface ProviderModelsTabProps {
  models?: ModelsResponse;
  canEdit: boolean;
  onEditPricing: (modelId: string) => void;
  onEditAlias: (modelId: string) => void;
  translations: {
    title: string;
    description: string;
    noModels: string;
  };
}

export const ProviderModelsTab = ({ 
  models, 
  canEdit, 
  onEditPricing, 
  onEditAlias, 
  translations 
}: ProviderModelsTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations.title}</CardTitle>
        <CardDescription>{translations.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!models?.models || models.models.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{translations.noModels}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.models.map((model) => (
              <ModelCard
                key={model.model_id}
                model={model}
                canEdit={canEdit}
                onEditPricing={() => onEditPricing(model.model_id)}
                onEditAlias={() => onEditAlias(model.model_id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
