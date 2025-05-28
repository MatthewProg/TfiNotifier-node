import { VercelRequest, VercelResponse } from '@vercel/node';
import FundsService from '../lib/funds.service.js';
import { FundStats } from '../lib/fund-stats.model.js';
import { sendStats } from '../lib/email.service.js';

export default async (req: VercelRequest, res: VercelResponse): Promise<VercelResponse> => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

  const fundsMetadata = await fundsService.getFundsMetadata();
  const statRequests = fundsList.map(x => fundsService.getFundStats(x.id).catch(err => console.error(err)));
  const statsRaw = await Promise.all(statRequests);

  const stats: FundStats[] = [];
  for (const stat of statsRaw) {
    if (!stat) {
      continue;
    }

    const fund = fundsList.find(x => x.id === stat.id);

    stat.refChange = !fund?.refValue ? 0 : ((stat.current ?? 0) / fund.refValue) - 1.0;
    stat.name = fundsMetadata.get(stat.id);

    stats.push(stat);
  }

  if (stats.length === 0) {
    console.warn('Empty stats!');
    return res.status(204).end();
  }

  const body = await sendStats(stats);
  console.log('Stats send!');

  return res.status(200).end(body);
};
