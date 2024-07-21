import { VercelRequest, VercelResponse } from '@vercel/node';
import puppeteer from 'puppeteer';
import FundsService from '../lib/funds.service.js';
import { FundStats } from '../lib/fund-stats.model.js';

export default async (req: VercelRequest, res: VercelResponse): Promise<VercelResponse> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--headless',
      '--disable-gpu'
    ],
    headless: true,
    channel: 'chrome'
  });

  const page = await browser.newPage();
  const fundsService = new FundsService(page);

  const fundsList = fundsService.getFundsList();
  if (fundsList.length === 0) {
    console.warn('No funds defined');
    return res.status(204).end();
  }

  const fundsMetadata = await fundsService.getFundsMetadata();
  const stats: FundStats[] = [];
  for (const fund of fundsList) {
    const stat = await fundsService.getFundStats(fund.url);

    stat.name = fundsMetadata.get(stat.id);
    stat.refChange = !fund.refValue ? 0 : (stat.current ?? 0 / stat.refChange!) - 1.0;

    stats.push(stat);
  }

  return res.json(stats);
};