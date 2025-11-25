import { Card, Checkbox, Group, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type {
  AssetGroupInheritanceRule,
  CustomFieldDefinition,
} from '../../types/entities';

const CORE_FIELDS: Array<{
  key: string;
  label: string;
  description: string;
  allowOverride: boolean;
}> = [
  {
    key: 'category',
    label: 'Category',
    description: 'All members remain in the same asset category.',
    allowOverride: false,
  },
  {
    key: 'manufacturer',
    label: 'Manufacturer',
    description: 'Useful when every unit shares the same brand.',
    allowOverride: false,
  },
  {
    key: 'model',
    label: 'Model',
    description: 'Keeps model identifier consistent across members.',
    allowOverride: false,
  },
  {
    key: 'description',
    label: 'Description',
    description: 'Template copy shown on each member. Allow overrides for per-unit notes.',
    allowOverride: true,
  },
];

interface InheritanceRuleEditorProps {
  rules: Record<string, AssetGroupInheritanceRule>;
  customFieldRules?: Record<string, AssetGroupInheritanceRule>;
  customFieldDefinitions?: CustomFieldDefinition[];
  onChange?: (value: {
    rules: Record<string, AssetGroupInheritanceRule>;
    customFieldRules: Record<string, AssetGroupInheritanceRule>;
  }) => void;
  readOnly?: boolean;
}

function ensureRule(rule?: AssetGroupInheritanceRule): AssetGroupInheritanceRule {
  return rule ?? { inherited: false, overridable: false };
}

function mergeRules(
  source: Record<string, AssetGroupInheritanceRule>,
  field: string,
  value: Partial<AssetGroupInheritanceRule>,
): Record<string, AssetGroupInheritanceRule> {
  const next: Record<string, AssetGroupInheritanceRule> = { ...source };
  const base = ensureRule(next[field]);
  next[field] = {
    ...base,
    ...value,
  };
  return next;
}

export function InheritanceRuleEditor({
  rules,
  customFieldRules = {},
  customFieldDefinitions,
  onChange,
  readOnly,
}: InheritanceRuleEditorProps) {
  const groupedCustomFields = (customFieldDefinitions ?? []).sort((a, b) => a.name.localeCompare(b.name));

  const handleRuleToggle = (field: string, patch: Partial<AssetGroupInheritanceRule>, isCustomField?: boolean) => {
    const nextRules = isCustomField
      ? { ...rules }
      : mergeRules(rules, field, patch);
    const nextCustomRules = isCustomField
      ? mergeRules(customFieldRules, field, patch)
      : { ...customFieldRules };

    if (onChange) {
      onChange({
        rules: nextRules,
        customFieldRules: nextCustomRules,
      });
    }
  };

  const renderRuleRow = (
    fieldKey: string,
    label: string,
    description: string,
    allowOverride: boolean,
    rule: AssetGroupInheritanceRule,
    isCustomField?: boolean,
  ) => {
    const inherited = rule.inherited;
    const overridable = rule.overridable && inherited;

    return (
      <Group key={fieldKey} justify="space-between" align="flex-start">
        <Stack gap={0} style={{ flex: 1 }}>
          <Group gap="xs">
            <Text fw={500}>{label}</Text>
            <Tooltip label={description} withArrow>
              <IconInfoCircle size={14} color="var(--mantine-color-gray-6)" />
            </Tooltip>
          </Group>
          <Text size="xs" c="dimmed">{description}</Text>
        </Stack>
        <Group gap="sm">
          <Checkbox
            size="sm"
            label="Inherited"
            checked={inherited}
            disabled={readOnly}
            onChange={(event) => {
              const nextInherited = event.currentTarget.checked;
              const patch: Partial<AssetGroupInheritanceRule> = { inherited: nextInherited };
              if (!nextInherited) {
                patch.overridable = false;
              }
              handleRuleToggle(fieldKey, patch, isCustomField);
            }}
          />
          {allowOverride && (
            <Checkbox
              size="sm"
              label="Members can override"
              checked={overridable}
              disabled={readOnly || !inherited}
              onChange={(event) => {
                handleRuleToggle(
                  fieldKey,
                  { overridable: event.currentTarget.checked },
                  isCustomField,
                );
              }}
            />
          )}
        </Group>
      </Group>
    );
  };

  return (
    <Card withBorder>
      <Stack gap="md">
        <Title order={5}>Inheritance Rules</Title>
        <Stack gap="sm">
          {CORE_FIELDS.map((field) =>
            renderRuleRow(
              field.key,
              field.label,
              field.description,
              field.allowOverride,
              ensureRule(rules[field.key]),
            )
          )}
        </Stack>

        {groupedCustomFields.length > 0 && (
          <Stack gap="sm">
            <Title order={6}>Custom Fields</Title>
            {groupedCustomFields.map((definition) =>
              renderRuleRow(
                definition.id,
                definition.name,
                `Applies to custom field "${definition.name}"`,
                true,
                ensureRule(customFieldRules[definition.id]),
                true,
              )
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
