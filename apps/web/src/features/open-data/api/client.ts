import { createApiClient } from '@/shared/api/client';

/** Same validation and error mapping as the app's own API, pointed at data.gov.my. */
export const dataGovClient = createApiClient({ baseUrl: 'https://api.data.gov.my' });
