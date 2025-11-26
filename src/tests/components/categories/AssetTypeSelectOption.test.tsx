import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { AssetTypeSelectOption } from '../../../components/categories/AssetTypeSelectOption';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('AssetTypeSelectOption', () => {
  it('renders icon and name when icon is provided', () => {
    const { container } = render(
      <AssetTypeSelectOption 
        icon="mdi:office-building-cog-outline" 
        name="Gebäudetechnik" 
      />,
      { wrapper }
    );

    // Should display the name
    expect(screen.getByText('Gebäudetechnik')).toBeInTheDocument();
    
    // Should NOT display the icon text as plain text
    expect(screen.queryByText('mdi:office-building-cog-outline')).not.toBeInTheDocument();
    
    // Should render an SVG icon (mdi/Icon uses role="presentation")
    const svgIcon = container.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  it('renders only name when icon is not provided', () => {
    const { container } = render(
      <AssetTypeSelectOption 
        icon={undefined} 
        name="Test Category" 
      />,
      { wrapper }
    );

    expect(screen.getByText('Test Category')).toBeInTheDocument();
    // Should not render an SVG when icon is undefined
    const svgIcon = container.querySelector('svg');
    expect(svgIcon).not.toBeInTheDocument();
  });

  it('renders only name when icon is empty string', () => {
    const { container } = render(
      <AssetTypeSelectOption 
        icon="" 
        name="Empty Icon Category" 
      />,
      { wrapper }
    );

    expect(screen.getByText('Empty Icon Category')).toBeInTheDocument();
    // Should not render an SVG when icon is empty string
    const svgIcon = container.querySelector('svg');
    expect(svgIcon).not.toBeInTheDocument();
  });

  it('handles tabler icons as well as mdi icons', () => {
    render(
      <AssetTypeSelectOption 
        icon="tabler:device-laptop" 
        name="IT Equipment" 
      />,
      { wrapper }
    );

    expect(screen.getByText('IT Equipment')).toBeInTheDocument();
    // Should NOT display the icon text as plain text
    expect(screen.queryByText('tabler:device-laptop')).not.toBeInTheDocument();
  });
});
