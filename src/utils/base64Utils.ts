const DATA_URL_PREFIX_REGEX = /^data:(?<mimeType>.*?);base64,/u;

export const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to convert blob to base64 string.'));
        return;
      }

      resolve(result);
    };
    reader.onerror = () => reject(new Error('Error reading blob for base64 conversion.'));
    reader.readAsDataURL(blob);
  });

export const base64ToBlob = (base64: string, fallbackMimeType = 'application/octet-stream'): Blob => {
  const match = DATA_URL_PREFIX_REGEX.exec(base64);
  const mimeType = match?.groups?.['mimeType'] ?? fallbackMimeType;
  const data = base64.replace(DATA_URL_PREFIX_REGEX, '');
  const binaryString = atob(data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
};

export const stripDataUrlPrefix = (base64: string): string => base64.replace(DATA_URL_PREFIX_REGEX, '');
