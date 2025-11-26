import { Group, Text } from '@mantine/core';
import { IconDisplay } from './IconDisplay';

interface AssetTypeSelectOptionProps {
  icon?: string;
  name: string;
  size?: number;
}

/**
 * Reusable component for rendering asset type options in Select dropdowns.
 * Displays an icon (if provided) alongside the name, without showing raw icon text.
 * 
 * Use this component with Mantine Select's renderOption prop to properly display
 * asset type icons instead of concatenating icon text.
 * 
 * @example
 * <Select
 *   data={assetTypes.map(type => ({ value: type.id, label: type.name }))}
 *   renderOption={({ option }) => {
 *     const assetType = assetTypes.find(t => t.id === option.value);
 *     return <AssetTypeSelectOption icon={assetType?.icon} name={option.label} />;
 *   }}
 * />
 */
export function AssetTypeSelectOption({ icon, name, size = 16 }: AssetTypeSelectOptionProps) {
  return (
    <Group gap="xs" wrap="nowrap">
      {icon && <IconDisplay iconName={icon} size={size} />}
      <Text size="sm" truncate>
        {name}
      </Text>
    </Group>
  );
}
