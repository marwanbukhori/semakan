import { Spinner } from '@govtechmy/myds-react/spinner';

export function PageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size="medium" />
    </div>
  );
}
