import { useCallback, useState } from 'react';
import { Alert, Box, CloseButton, Group, Image, Progress, Stack, Text } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from '@mantine/dropzone';
import { IconAlertCircle, IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { formatFileSize } from '../../utils/formatters';

interface PhotoUploadProps {
	photos: string[];
	onChange: (photos: string[]) => void;
	maxPhotos?: number;
	maxFileSize?: number;
	disabled?: boolean;
}

const DEFAULT_MAX_PHOTOS = 3;
const DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Allows selecting up to three photos while simulating compression feedback.
 */
export function PhotoUpload({
	photos,
	onChange,
	maxPhotos = DEFAULT_MAX_PHOTOS,
	maxFileSize = DEFAULT_MAX_FILE_SIZE,
	disabled = false,
}: PhotoUploadProps) {
	const { t } = useTranslation('damage');
	const [compressionProgress, setCompressionProgress] = useState<Record<string, number>>({});
	const [error, setError] = useState<string | null>(null);

	const handleDrop = useCallback(
		async (files: FileWithPath[]) => {
			setError(null);

			if (photos.length + files.length > maxPhotos) {
				setError(t('photoUpload.error.maxPhotos', { count: maxPhotos }));
				return;
			}

			for (const file of files) {
				if (file.size > maxFileSize) {
					setError(
						t('photoUpload.error.fileTooLarge', {
							name: file.name,
							limit: formatFileSize(maxFileSize),
						}),
					);
					return;
				}
			}

			const generatedPhotos: string[] = [];

			for (const file of files) {
				try {
					setCompressionProgress((prev) => ({ ...prev, [file.name]: 0 }));

					const reader = new FileReader();
					const base64 = await new Promise<string>((resolve, reject) => {
						reader.onload = () => {
							setCompressionProgress((prev) => ({ ...prev, [file.name]: 50 }));
							setTimeout(() => {
								setCompressionProgress((prev) => ({ ...prev, [file.name]: 100 }));
								resolve(reader.result as string);
							}, 500);
						};
						reader.onerror = reject;
						reader.readAsDataURL(file);
					});

					generatedPhotos.push(base64);

					setTimeout(() => {
						setCompressionProgress((prev) => {
							const { [file.name]: _removed, ...rest } = prev;
							return rest;
						});
					}, 1000);
				} catch (uploadError) {
								console.error('Photo upload error', uploadError);
					setError(t('photoUpload.error.processFailed', { name: file.name }));
				}
			}

			if (generatedPhotos.length > 0) {
				onChange([...photos, ...generatedPhotos]);
			}
		},
		[photos, onChange, maxPhotos, maxFileSize, t],
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
						{t('photoUpload.compressing', { filename })}
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
								alt={t('photoUpload.dropzone.imageAlt', { index: index + 1 })}
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
												style={{
													background: 'rgba(0, 0, 0, 0.5)',
													color: 'white',
												}}
											/>
						</Box>
					))}
				</Group>
			)}

			{canUploadMore && !disabled && (
				<Dropzone
					onDrop={handleDrop}
					onReject={(fileErrors) => {
						const reasons = fileErrors.map((item) => item.errors.map((errorItem) => errorItem.message).join(', '));
						setError(t('photoUpload.error.rejected', { reason: reasons.join('; ') }));
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
								{t('photoUpload.dropzone.title')}
							</Text>
							<Text size="sm" c="dimmed" inline mt={7}>
								{t('photoUpload.dropzone.subtitle', {
									count: maxPhotos,
									limit: formatFileSize(maxFileSize),
								})}
							</Text>
							<Text size="sm" c="dimmed" inline mt={4}>
								{t('photoUpload.dropzone.count', {
									current: photos.length,
									max: maxPhotos,
								})}
							</Text>
						</div>
					</Group>
				</Dropzone>
			)}

			{!canUploadMore && (
				<Text size="sm" c="dimmed" ta="center">
					{t('photoUpload.maxReached', { count: maxPhotos })}
				</Text>
			)}
		</Stack>
	);
}
