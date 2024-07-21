import { VercelRequest, VercelResponse } from '@vercel/node';
import Chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer';
import FundsService from '../lib/funds.service.js';
import { FundStats } from '../lib/fund-stats.model.js';
import { sendStats } from '../lib/email.service.js';

export default async (req: VercelRequest, res: VercelResponse): Promise<VercelResponse> => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  console.log('Auth passed');

  const browser = await Chromium.puppeteer.launch({
    args: [...Chromium.args],
    defaultViewport: Chromium.defaultViewport,
    executablePath: await Chromium.executablePath,
    headless: true,
    ignoreHTTPSErrors: true
  });

  const page = await browser.newPage();
  const fundsService = new FundsService(page);
  console.log('Browser started');

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
    stat.refChange = !fund.refValue ? 0 : ((stat.current ?? 0) / fund.refValue) - 1.0;

    stats.push(stat);
  }

  await sendStats(stats);
  console.log('Stats send!');

  return res.status(200).end();
};