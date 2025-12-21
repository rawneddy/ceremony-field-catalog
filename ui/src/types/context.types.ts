export interface MetadataExtractionRule {
  xpaths: string[];
  validationRegex?: string;
}

export interface Context {
  contextId: string;
  displayName: string;
  description: string | null;
  requiredMetadata: string[];
  optionalMetadata: string[] | null;
  metadataRules: Record<string, MetadataExtractionRule>;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface ContextWithCount extends Context {
  fieldCount: number;
}
