import { VercelRequest, VercelResponse } from '@vercel/node';
import FundsService from '../lib/services/funds.js';
import { FundStats } from '../lib/models/fund-stats.js';
import { sendStats } from '../lib/services/email.js';

export default async (req: VercelRequest, res: VercelResponse): Promise<VercelResponse> => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Unauthorized!');
    return res.status(401).end('Unauthorized');
  }
  console.log('Auth passed');

  const fundsService = new FundsService();
  await fundsService.init();

  const fundsList = fundsService.getFundsList();
  if (fundsList.length === 0) {
    console.warn('No funds defined');
    return res.status(204).end();
  }

  const fundsMetadata = await fundsService.fetchFundsMetadata();

  const fundStatsRequests = fundsList.map(x => fundsService.fetchFundStats(x.id).catch(err => console.error(err)));
  const fundStatsRaw = await Promise.all(fundStatsRequests);

  const fundStats: FundStats[] = [];
  for (const fundStat of fundStatsRaw) {
    if (!fundStat) {
      continue;
    }

    const fundEntry = fundsList.find(x => x.id === fundStat.id);
    const fundMetadata = fundsMetadata.find(x => x.id === fundStat.id);

    fundStat.url = fundMetadata?.url;
    fundStat.name = fundMetadata?.name;
    fundStat.refChange = !fundEntry?.refValue ? 0 : ((fundStat.current ?? 0) / fundEntry.refValue) - 1.0;

    fundStats.push(fundStat);
  }

  if (fundStats.length === 0) {
    console.warn('Empty stats!');
    return res.status(204).end();
  }

  const body = await sendStats(fundStats);
  console.log('Stats send!');

  return res.status(200).end(body);
};
