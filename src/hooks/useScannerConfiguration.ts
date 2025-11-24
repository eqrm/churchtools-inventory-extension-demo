import { useEffect, useMemo, useState } from 'react'
import type { ScannerModel } from '../types/entities'
import { loadScannerModels } from '../services/settings/scannerModels'
import { useScannerPreference } from './useScannerPreference'

export function useScannerConfiguration() {
  const { preferredScannerId, setPreference, clearPreference } = useScannerPreference()
  const [scannerModels, setScannerModels] = useState<ScannerModel[]>([])

  useEffect(() => {
    setScannerModels(loadScannerModels())
  }, [])

  const activeScanner = useMemo(() => {
    if (scannerModels.length === 0) {
      return null
    }

    if (!preferredScannerId) {
      return scannerModels[0]
    }

    return scannerModels.find((model) => model.id === preferredScannerId) ?? scannerModels[0]
  }, [preferredScannerId, scannerModels])

  const refreshScannerModels = () => {
    setScannerModels(loadScannerModels())
  }

  return {
    scannerModels,
    activeScanner,
    preferredScannerId,
    setPreferredScannerId: setPreference,
    clearPreferredScannerId: clearPreference,
    refreshScannerModels,
  }
}
