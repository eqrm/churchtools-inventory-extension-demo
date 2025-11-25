import { useState } from 'react';
import {
  Card,
  Group,
  Stack,
  Text,
  Button,
  Image,
  Loader,
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from '@mantine/dropzone';
import { IconPhoto, IconUpload, IconX, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { compressImageToDataUrl } from '../../utils/imageCompression';

interface MainImageUploadProps {
  label: string;
  description?: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  maxCharacters?: number;
}

export function MainImageUpload({
  label,
  description,
  value,
  onChange,
  disabled = false,
  maxCharacters = 10_000,
}: MainImageUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrop = async (files: FileWithPath[]) => {
    if (files.length === 0) {
      return;
    }

    const [file] = files;
    if (!file) {
      return;
    }

    try {
      setIsProcessing(true);
      const dataUrl = await compressImageToDataUrl(file, undefined, maxCharacters);
      onChange(dataUrl);
      notifications.show({
        title: 'Image ready',
        message: 'Main image updated successfully.',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unable to process the selected image.',
        color: 'red',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    notifications.show({
      title: 'Unsupported image',
      message: 'Please upload a JPEG, PNG, or WebP image smaller than 5MB.',
      color: 'red',
    });
  };

  return (
    <Stack gap="sm">
      <div>
        <Text fw={500}>{label}</Text>
        {description && (
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          Images are compressed and must remain under {maxCharacters.toLocaleString()} characters.
        </Text>
      </div>

      <Dropzone
        onDrop={handleDrop}
        onReject={handleReject}
        accept={IMAGE_MIME_TYPE}
        maxFiles={1}
        disabled={disabled || isProcessing}
        loading={isProcessing}
      >
        <Group justify="center" gap="xs" style={{ minHeight: 100, pointerEvents: 'none' }}>
          {isProcessing ? (
            <Loader size="sm" />
          ) : (
            <>
              <Dropzone.Accept>
                <IconUpload size={32} />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={32} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhoto size={32} />
              </Dropzone.Idle>
            </>
          )}
          <div>
            <Text size="sm">Drag an image here or click to browse</Text>
            <Text size="xs" c="dimmed">
              Supported formats: JPEG, PNG, WebP. Maximum size 5MB.
            </Text>
          </div>
        </Group>
      </Dropzone>

      {value && (
        <Card withBorder padding="sm">
          <Stack gap="xs">
            <Image
              src={value}
              alt="Main image preview"
              radius="sm"
              fit="cover"
              style={{ maxHeight: 240, borderRadius: 'var(--mantine-radius-sm)' }}
            />
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Current image ({value.length.toLocaleString()} characters)
              </Text>
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<IconTrash size={14} />}
                onClick={() => onChange(null)}
                disabled={disabled || isProcessing}
              >
                Remove image
              </Button>
            </Group>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
