import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Badge from './Badge.jsx';

describe('Badge', () => {
  it('maps a known status value to its tone class and label', () => {
    const html = renderToStaticMarkup(<Badge value="active" />);
    expect(html).toContain('badge green');
    expect(html).toContain('Active');
  });

  it('uses an explicit tone override when provided', () => {
    const html = renderToStaticMarkup(<Badge tone="purple" value="growth" />);
    expect(html).toContain('badge purple');
  });

  it('renders children instead of the value label when given', () => {
    const html = renderToStaticMarkup(<Badge value="draft">Custom</Badge>);
    expect(html).toContain('Custom');
  });
});
