import * as dotenv from 'dotenv';
import { getConsulAPI } from './get-consul-api.js';
import { isMainModule } from '../utils/utils.js';

dotenv.config();

export const deregisterServiceFromConsul = async () => {
  const [, , svcId, agentHost, agentPort] = process.argv;

  if (!svcId) {
    throw new Error('Service ID (svcId) is required');
  }

  const { deregister } = await getConsulAPI();

  try {
    await deregister(svcId, agentHost, agentPort);
  } catch (err) {
    console.error(err);
  }
};

if (isMainModule(import.meta.url)) {
  deregisterServiceFromConsul().then(() => 0);
}
