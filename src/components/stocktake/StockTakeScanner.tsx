import { Box, Card, Text, Stack } from '@mantine/core';

interface StockTakeScannerProps {
  sessionId: string;
}

/**
 * StockTakeScanner component - Full-screen scanning interface (T153)
 * Displays live connectivity state to gate scanning workflows.
 */
export function StockTakeScanner({ sessionId }: StockTakeScannerProps) {
  return (
    <Box>
      <Stack gap="md">
        <Card>
          <Text>Stock Take Scanner for session {sessionId}</Text>
          <Text c="dimmed">Scanner integration pending</Text>
        </Card>
      </Stack>
    </Box>
  );
}
