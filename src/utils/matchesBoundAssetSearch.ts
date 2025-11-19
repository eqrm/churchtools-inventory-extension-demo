export interface SearchableAssetOption {
  assetNumber?: string;
  assetName?: string;
  assetDescription?: string;
  assetLocation?: string;
  label?: string;
  value?: string;
}

export function matchesBoundAssetSearch(value: unknown, option?: SearchableAssetOption | null): boolean {
  if (!option) {
    return true;
  }

  const query = String(value ?? '').trim().toLowerCase();
  if (query.length === 0) {
    return true;
  }

  const haystack = [option.assetNumber, option.assetName, option.assetDescription, option.assetLocation];
  return haystack.some((field) => (field ?? '').toLowerCase().includes(query));
}
