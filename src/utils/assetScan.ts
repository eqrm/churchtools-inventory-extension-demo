import type { Asset, ScannerFunction, ScannerModel } from '../types/entities'

export type AssetScanMatchType = 'barcode' | 'assetNumber' | 'qrCode'

export interface AssetScanResult {
  asset?: Asset
  normalizedValue: string
  matchType?: AssetScanMatchType
}

export interface AssetScanOptions {
  assets?: Asset[]
  scannerModel?: ScannerModel | null
}

/**
 * Normalize scanned input by trimming whitespace and removing configured prefixes/suffixes
 */
export function normalizeScanValue(value: string, scannerModel?: ScannerModel | null): string {
  if (!value) {
    return ''
  }

  let normalized = value.trim()
  if (!normalized) {
    return ''
  }

  const { prefixes, suffixes } = extractScannerAffixes(scannerModel)

  normalized = stripAffixes(normalized, prefixes, 'start')
  normalized = stripAffixes(normalized, suffixes, 'end')

  return normalized.trim()
}

/**
 * Find an asset by scanned value using barcode -> QR code -> asset number precedence
 */
export function findAssetByScanValue(value: string, options: AssetScanOptions = {}): AssetScanResult {
  const normalizedValue = normalizeScanValue(value, options.scannerModel)
  if (!normalizedValue) {
    return { normalizedValue: '' }
  }

  const assets = options.assets ?? []
  if (!assets.length) {
    return { normalizedValue }
  }

  const normalizedLower = normalizedValue.toLocaleLowerCase()

  const barcodeMatch = assets.find((asset) => asset.barcode?.trim().toLocaleLowerCase() === normalizedLower)
  if (barcodeMatch) {
    return { asset: barcodeMatch, normalizedValue, matchType: 'barcode' }
  }

  const qrMatch = assets.find((asset) => asset.qrCode?.trim().toLocaleLowerCase() === normalizedLower)
  if (qrMatch) {
    return { asset: qrMatch, normalizedValue, matchType: 'qrCode' }
  }

  const assetNumberMatch = assets.find((asset) => asset.assetNumber?.trim().toLocaleLowerCase() === normalizedLower)
  if (assetNumberMatch) {
    return { asset: assetNumberMatch, normalizedValue, matchType: 'assetNumber' }
  }

  return { normalizedValue }
}

interface ScannerAffixes {
  prefixes: string[]
  suffixes: string[]
}

function extractScannerAffixes(scannerModel?: ScannerModel | null): ScannerAffixes {
  if (!scannerModel || !Array.isArray(scannerModel.supportedFunctions)) {
    return { prefixes: [], suffixes: [] }
  }

  return scannerModel.supportedFunctions.reduce<ScannerAffixes>((acc, func) => {
    const extracted = extractFunctionValue(func)
    if (!extracted) {
      return acc
    }

    if (func.category === 'prefix') {
      acc.prefixes.push(extracted)
    } else if (func.category === 'suffix') {
      acc.suffixes.push(extracted)
    }

    return acc
  }, { prefixes: [], suffixes: [] })
}

function extractFunctionValue(func: ScannerFunction): string | null {
  const sources = [func.description, func.configBarcode, func.name]
  for (const source of sources) {
    if (!source) continue
    const match = source.match(/(?:prefix|suffix|value)\s*[:=]\s*([^\s]+)/i)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  return null
}

function stripAffixes(value: string, affixes: string[], side: 'start' | 'end'): string {
  if (!affixes.length) {
    return value
  }

  for (const affix of affixes) {
    if (!affix) continue
    const normalizedAffix = affix.trim()
    if (!normalizedAffix) continue

    if (side === 'start' && value.toLocaleLowerCase().startsWith(normalizedAffix.toLocaleLowerCase())) {
      return value.slice(normalizedAffix.length)
    }

    if (side === 'end' && value.toLocaleLowerCase().endsWith(normalizedAffix.toLocaleLowerCase())) {
      return value.slice(0, value.length - normalizedAffix.length)
    }
  }

  return value
}
