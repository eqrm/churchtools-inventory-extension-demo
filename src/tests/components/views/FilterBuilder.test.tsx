import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterBuilder } from '../../../components/views/FilterBuilder';
import { createFilterCondition, createFilterGroup } from '../../../utils/viewFilters';

function renderFilterBuilder(initial = createFilterGroup('AND')) {
  const handleChange = vi.fn();
  render(
    <MantineProvider>
      <FilterBuilder value={initial} onChange={handleChange} />
    </MantineProvider>,
  );
  return { handleChange };
}

describe('FilterBuilder', () => {
  it('adds a filter row from the compact builder', async () => {
    const user = userEvent.setup();
    renderFilterBuilder();

    const addButton = screen.getByRole('button', { name: /add filter/i });
    await user.click(addButton);

    expect(screen.getByPlaceholderText('Value')).toBeInTheDocument();
  });

  it('lets the user pick a field from the Notion-style dropdown', async () => {
    const user = userEvent.setup();
    renderFilterBuilder();

    await user.click(screen.getByRole('button', { name: /add filter/i }));
    const fieldButton = await screen.findByRole('button', { name: /^name$/i });
    await user.click(fieldButton);
    await user.click(await screen.findByRole('option', { name: /asset type/i }));

    expect(fieldButton).toHaveTextContent('Asset Type');
  });

  it('switches logic between AND/OR using the connector control', async () => {
    const user = userEvent.setup();
    const initialGroup = createFilterGroup('AND', [
      createFilterCondition({ field: 'name', value: 'alpha' }),
      createFilterCondition({ field: 'name', value: 'beta' }),
    ]);
    const { handleChange } = renderFilterBuilder(initialGroup);

    const logicRadio = screen.getByRole('radio', { name: /match any/i });
    await user.click(logicRadio);

    const latestGroup = handleChange.mock.calls.at(-1)?.[0];
    expect(latestGroup?.logic).toBe('OR');
  });

  it('opens the advanced builder modal when requested', async () => {
    const user = userEvent.setup();
    renderFilterBuilder();

    const advancedButton = screen.getByRole('button', { name: /advanced builder/i });
    await user.click(advancedButton);

    expect(await screen.findByText('Advanced filters')).toBeInTheDocument();
  });

  it('renders the full tree inline when advanced mode is used', () => {
    const handleChange = vi.fn();
    render(
      <MantineProvider>
        <FilterBuilder mode="advanced" value={createFilterGroup('AND')} onChange={handleChange} />
      </MantineProvider>,
    );

    expect(screen.getByRole('button', { name: /add condition/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /advanced builder/i })).not.toBeInTheDocument();
  });
});
