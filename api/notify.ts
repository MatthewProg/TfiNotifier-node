import { VercelRequest, VercelResponse } from '@vercel/node';
import FundsService, { FundEntry } from '../lib/funds.service.js';
import { FundStats } from '../lib/fund-stats.model.js';
import { sendStats } from '../lib/email.service.js';
import { getBrowser } from '../lib/browser-factory.service.js';

export default async (req: VercelRequest, res: VercelResponse): Promise<VercelResponse> => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  console.log('Auth passed');

  const browser = await getBrowser();
  const page = await browser.newPage();
  const fundsService = new FundsService(page);
  console.log('Browser started');

  const fundsList = fundsService.getFundsList();
  if (fundsList.length === 0) {
    console.warn('No funds defined');
    return res.status(204).end();
  }

  const fundsMetadata = await fundsService.getFundsMetadata();
  const statRequests = fundsList.map(x => fetchStats(x));
  const statsRaw = await Promise.all(statRequests);

  const stats: FundStats[] = [];
  for (const stat of statsRaw) {
    if (!stat) {
      continue;
    }

    stat.name = fundsMetadata.get(stat.id);

    stats.push(stat);
  }

  const body = await sendStats(stats);
  console.log('Stats send!');

  return res.status(200).end(body);
};

async function fetchStats(fund: FundEntry): Promise<FundStats | undefined> {
  const isProduction = process.env.NODE_ENV === 'production';
  const url = `${isProduction ? 'https://' : 'http://'}${process.env.VERCEL_URL}/api/scrape`;
  console.log('Calling', url);

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      'Content-Type': 'application/json'
    },

    body: JSON.stringify(fund)
  });

  console.log(`Response for '${fund.url}' is ${response.status}`);
  if (!response.ok) {
    return undefined;
  }

  const body = await response.json();
  const rawBody = body as FundStats;

  return {
    ...rawBody,
    lastUpdated: rawBody.lastUpdated ? new Date(rawBody.lastUpdated) : undefined
  };
}