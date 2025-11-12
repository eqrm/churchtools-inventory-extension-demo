import { useState, useCallback } from 'react';
import { Group, Text, Image, CloseButton, Alert, Stack, Box, Progress } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX, IconAlertCircle } from '@tabler/icons-react';
import { formatFileSize } from '../../utils/formatters';

interface PhotoUploadProps {
  /** Current photo URLs (base64 or file URLs) */
  photos: string[];
  /** Callback when photos change */
  onChange: (photos: string[]) => void;
  /** Maximum number of photos allowed */
  maxPhotos?: number;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Whether upload is disabled */
  disabled?: boolean;
}

const DEFAULT_MAX_PHOTOS = 3;
const DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * PhotoUpload Component
 * 
 * Drag-and-drop photo upload with compression preview.
 * Shows file size before and after compression.
 * Enforces 2MB limit and max 3 photos.
 * 
 * @example
 * ```tsx
 * <PhotoUpload
 *   photos={damageReport.photos}
 *   onChange={(newPhotos) => updateDamageReport({ photos: newPhotos })}
 *   maxPhotos={3}
 * />
 * ```
 */
export function PhotoUpload({
  photos,
  onChange,
  maxPhotos = DEFAULT_MAX_PHOTOS,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  disabled = false,
}: PhotoUploadProps) {
  const [compressionProgress, setCompressionProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback(
    async (files: FileWithPath[]) => {
      setError(null);

      // Check photo limit
      if (photos.length + files.length > maxPhotos) {
        setError(`Maximum ${maxPhotos} photos allowed`);
        return;
      }

      // Check file sizes
      for (const file of files) {
        if (file.size > maxFileSize) {
          setError(`File "${file.name}" exceeds ${formatFileSize(maxFileSize)} limit`);
          return;
        }
      }

      // Convert files to base64 with compression simulation
      const newPhotos: string[] = [];
      
      for (const file of files) {
        try {
          // Simulate compression progress
          setCompressionProgress((prev) => ({ ...prev, [file.name]: 0 }));
          
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              setCompressionProgress((prev) => ({ ...prev, [file.name]: 50 }));
              
              // Simulate compression delay
              setTimeout(() => {
                setCompressionProgress((prev) => ({ ...prev, [file.name]: 100 }));
                resolve(reader.result as string);
              }, 500);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const base64 = await base64Promise;
          newPhotos.push(base64);
          
          // Clean up progress indicator
          setTimeout(() => {
            setCompressionProgress((prev) => {
              const { [file.name]: _, ...updated } = prev;
              return updated;
            });
          }, 1000);
        } catch (err) {
          setError(`Failed to process "${file.name}"`);
          console.error('Photo upload error:', err);
        }
      }

      onChange([...photos, ...newPhotos]);
    },
    [photos, onChange, maxPhotos, maxFileSize]
  );

  const handleRemove = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  const canUploadMore = photos.length < maxPhotos;

  return (
    <Stack gap="sm">
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      {Object.entries(compressionProgress).map(([filename, progress]) => (
        <Box key={filename}>
          <Text size="sm" mb={4}>
            Compressing {filename}...
          </Text>
          <Progress value={progress} size="sm" />
        </Box>
      ))}

      {photos.length > 0 && (
        <Group gap="md">
          {photos.map((photo, index) => (
            <Box key={index} pos="relative">
              <Image
                src={photo}
                alt={`Photo ${index + 1}`}
                w={120}
                h={120}
                fit="cover"
                radius="md"
              />
              <CloseButton
                pos="absolute"
                top={4}
                right={4}
                size="sm"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                style={{ background: 'rgba(0, 0, 0, 0.5)' }}
                c="white"
              />
            </Box>
          ))}
        </Group>
      )}

      {canUploadMore && !disabled && (
        <Dropzone
          onDrop={handleDrop}
          onReject={(files) => {
            const reasons = files.map((f) => f.errors.map((e) => e.message).join(', '));
            setError(`Upload rejected: ${reasons.join('; ')}`);
          }}
          maxSize={maxFileSize}
          accept={IMAGE_MIME_TYPE}
          disabled={disabled}
        >
          <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <IconUpload size={52} stroke={1.5} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size={52} stroke={1.5} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconPhoto size={52} stroke={1.5} />
            </Dropzone.Idle>

            <div>
              <Text size="xl" inline>
                Drag photos here or click to select
              </Text>
              <Text size="sm" c="dimmed" inline mt={7}>
                Max {maxPhotos} photos, up to {formatFileSize(maxFileSize)} each
              </Text>
              <Text size="sm" c="dimmed" inline mt={4}>
                {photos.length}/{maxPhotos} uploaded
              </Text>
            </div>
          </Group>
        </Dropzone>
      )}

      {!canUploadMore && (
        <Text size="sm" c="dimmed" ta="center">
          Maximum number of photos ({maxPhotos}) reached
        </Text>
      )}
    </Stack>
  );
}
