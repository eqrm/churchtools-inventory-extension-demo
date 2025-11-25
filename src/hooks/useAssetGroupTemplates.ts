import { useCallback, useEffect, useState } from 'react';
import type {
  AssetGroupInheritanceRule,
  CustomFieldValue,
} from '../types/entities';

const STORAGE_KEY = 'asset-group-templates-v1';

export interface AssetGroupTemplateData {
  manufacturer?: string;
  model?: string;
  description?: string;
  inheritanceRules: Record<string, AssetGroupInheritanceRule>;
  customFieldRules: Record<string, AssetGroupInheritanceRule>;
  sharedCustomFields: Record<string, CustomFieldValue>;
}

export interface AssetGroupTemplate {
  id: string;
  name: string;
  assetTypeId: string;
  data: AssetGroupTemplateData;
  createdAt: string;
}

function readTemplates(): AssetGroupTemplate[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return null;
        }

        const candidate = item as Partial<AssetGroupTemplate> & { categoryId?: unknown };
        const assetTypeId = typeof candidate.assetTypeId === 'string'
          ? candidate.assetTypeId
          : typeof candidate.categoryId === 'string'
            ? candidate.categoryId
            : null;

        if (
          typeof candidate.id !== 'string' ||
          typeof candidate.name !== 'string' ||
          !assetTypeId ||
          typeof candidate.createdAt !== 'string' ||
          typeof candidate.data !== 'object' ||
          candidate.data === null
        ) {
          return null;
        }

        return {
          id: candidate.id,
          name: candidate.name,
          assetTypeId,
          data: candidate.data as AssetGroupTemplateData,
          createdAt: candidate.createdAt,
        } satisfies AssetGroupTemplate;
      })
      .filter((item): item is AssetGroupTemplate => item !== null);
  } catch (error) {
    console.warn('Failed to parse asset group templates from storage', error);
    return [];
  }
}

export function useAssetGroupTemplates() {
  const [templates, setTemplates] = useState<AssetGroupTemplate[]>(() => readTemplates());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
      console.warn('Failed to persist asset group templates', error);
    }
  }, [templates]);

  const addTemplate = useCallback((template: {
    name: string;
    assetTypeId: string;
    data: AssetGroupTemplateData;
  }) => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `tmpl-${Date.now().toString(36)}`;

    setTemplates((prev) => [
      ...prev,
      {
        id,
        name: template.name,
        assetTypeId: template.assetTypeId,
        data: template.data,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const removeTemplate = useCallback((templateId: string) => {
    setTemplates((prev) => prev.filter((template) => template.id !== templateId));
  }, []);

  return {
    templates,
    addTemplate,
    removeTemplate,
  } as const;
}
