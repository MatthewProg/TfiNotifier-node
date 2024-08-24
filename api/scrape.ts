import { VercelRequest, VercelResponse } from "@vercel/node";
import { getBrowser } from "../lib/browser-factory.service.js";
import FundsService, { FundEntry } from "../lib/funds.service.js";

export default async (req: VercelRequest, res: VercelResponse): Promise<VercelResponse> => {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).end('Unauthorized');
    }

    console.log('Auth passed');

    const payload = req.body as FundEntry;
    if (!payload || !payload.refValue || !payload.url) {
        return res.status(400).end('Payload values are missing!');
    }
    console.log('Payload:', payload);

    const browser = await getBrowser();
    const page = await browser.newPage();
    const fundsService = new FundsService(page);
    console.log('Browser started');

    const stats = await fundsService.getFundStats(payload.url);
    stats.refChange = !payload.refValue ? 0 : ((stats.current ?? 0) / payload.refValue) - 1.0;

    console.log('Sending stats back');
    return res.status(200).json({
        ...stats,
        lastUpdated: stats.lastUpdated?.getTime()
    });
}
