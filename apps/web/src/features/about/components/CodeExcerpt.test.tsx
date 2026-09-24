import { render, screen } from '@testing-library/react';
import { createWrapper } from '@/test/render';
import { CodeExcerpt } from './CodeExcerpt';

describe('CodeExcerpt', () => {
  it('shows a real excerpt with a link to its exact lines on GitHub', async () => {
    const { Wrapper } = createWrapper();
    render(
      <CodeExcerpt
        path="apps/web/src/features/applications/components/Timeline.tsx"
        region="exhaustive-switch"
      />,
      { wrapper: Wrapper },
    );

    expect(await screen.findByText(/function TimelineEntry/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /View on GitHub/ });
    expect(link.getAttribute('href')).toMatch(
      /^https:\/\/github\.com\/marwanbukhori\/semakan\/blob\/main\/apps\/web\/src\/features\/applications\/components\/Timeline\.tsx#L\d+-L\d+$/,
    );
  });

  it('says so when the region is missing', async () => {
    const { Wrapper } = createWrapper();
    render(<CodeExcerpt path="apps/web/src/shared/lib/assertNever.ts" region="does-not-exist" />, {
      wrapper: Wrapper,
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This excerpt couldn't be found in the source.",
    );
  });

  it('shows the same alert when the source file is unknown', async () => {
    const { Wrapper } = createWrapper();
    render(<CodeExcerpt path="apps/web/src/does/not/exist.ts" region="anything" />, {
      wrapper: Wrapper,
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This excerpt couldn't be found in the source.",
    );
  });
});
