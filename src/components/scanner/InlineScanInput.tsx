import { useState, type KeyboardEvent } from 'react'
import { Button, Group, TextInput } from '@mantine/core'
import { IconBarcode, IconScan } from '@tabler/icons-react'

interface InlineScanInputProps {
  onScan: (value: string) => void
  label?: string
  placeholder?: string
  buttonLabel?: string
  size?: 'xs' | 'sm'
  disabled?: boolean
  ariaLabel?: string
}

export function InlineScanInput({
  onScan,
  label = 'Scan asset',
  placeholder = 'Scan barcode or enter number',
  buttonLabel = 'Apply',
  size = 'xs',
  disabled = false,
  ariaLabel,
}: InlineScanInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Scan value required')
      return
    }

    setError(null)
    onScan(trimmed)
    setValue('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Group gap="xs" align="flex-end" wrap="nowrap">
      <TextInput
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          setValue(event.currentTarget.value)
          if (error) {
            setError(null)
          }
        }}
        onKeyDown={handleKeyDown}
        leftSection={<IconBarcode size={14} />}
        size={size}
        error={error}
        aria-label={ariaLabel || label}
        disabled={disabled}
        style={{ minWidth: 220 }}
        data-testid="inline-scan-input"
      />
      <Button
        leftSection={<IconScan size={14} />}
        size={size}
        variant="light"
        onClick={handleSubmit}
        disabled={disabled}
        data-testid="inline-scan-submit"
      >
        {buttonLabel}
      </Button>
    </Group>
  )
}
