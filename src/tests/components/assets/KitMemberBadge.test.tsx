import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { KitMemberBadge } from '../../../components/assets/KitMemberBadge';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('KitMemberBadge', () => {
  it('shows tooltip content for each kit member', async () => {
    const members = [
      { assetId: 'a1', assetNumber: 'A-001', name: 'Wireless Mic' },
      { assetId: 'a2', assetNumber: 'A-002', name: 'Body Pack' },
      { assetId: 'a3', assetNumber: 'A-003', name: 'In-Ear Monitor' },
    ];

    render(<KitMemberBadge members={members} withinPortal={false} />, { wrapper });
    const badge = screen.getByTestId('kit-member-badge');
    expect(badge).toHaveTextContent('3 members');

    await userEvent.hover(badge);
    const tooltip = await screen.findByRole('tooltip');

    expect(tooltip).toHaveTextContent('3 members');
    expect(tooltip).toHaveTextContent('A-001');
    expect(tooltip).toHaveTextContent('Wireless Mic');
    expect(tooltip).toHaveTextContent('A-003');
    expect(tooltip).toHaveTextContent('In-Ear Monitor');
  });

  it('shows fallback text when no members exist', async () => {
    render(<KitMemberBadge members={[]} withinPortal={false} />, { wrapper });
    const badge = screen.getByTestId('kit-member-badge');
    expect(badge).toHaveTextContent('0 members');

    await userEvent.hover(badge);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('No kit members linked yet');
  });
});
