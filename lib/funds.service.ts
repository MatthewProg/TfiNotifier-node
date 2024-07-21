import puppeteer from 'puppeteer';
import { FundStats } from './fund-stats.model.js';

interface FundsMetadata {
  funduszId: string,
  nazwa: string
};

interface Fund {
  funduszId: string,
  cenaTable: [number, number][]
};

interface FundValue {
  date: Date,
  value: number
};

interface FundEntry {
  url: string,
  refValue: number
}

export default class FundsService {
  private readonly page: puppeteer.Page;

  constructor(page: puppeteer.Page) {
    this.page = page;
  }

  public getFundsList(): FundEntry[] {
    const envVariables = Object.entries(process.env);
    const fundKeys = envVariables.filter(x => x[0].startsWith('Fund_') && x[0].endsWith('_Url'))
                                      .map(x => x[0].split('_').at(1));

    const entries = fundKeys.map<FundEntry | undefined>(x => {
        if (!x) return undefined;

        const valueUrl = process.env[`Fund_${x}_Url`]?.trim();
        const valueRef = process.env[`Fund_${x}_Ref`]?.trim();

        if (!valueUrl) return undefined;

        const parsedRef = valueRef ? parseFloat(valueRef) : 0;

        return {
            url: valueUrl,
            refValue: isNaN(parsedRef) ? 0 : parsedRef
        };
    });

    return entries.filter(x => !!x) as FundEntry[];
  }

  public async getFundsMetadata(): Promise<Map<string, string>> {
    await this.page.goto('https://inpzu.pl/tfi/kup-lista-funduszy/index');

    const fundsResponse = await this.page.waitForResponse('https://inpzu.pl/afi-websrv-dystr-prod/api/open/fundusze');
    const fundsJson: FundsMetadata[] = await fundsResponse.json();
  
    const fundsMetadata = new Map(Array.from(fundsJson).map(x => [x.funduszId, x.nazwa]));

    return fundsMetadata;
  }

  public async getFundStats(url: string): Promise<FundStats> {
    await this.page.goto(url);

    const fundResponse = await this.page.waitForResponse('https://inpzu.pl/afi-websrv-dystr-prod/api/open/wyceny');
    const fundJson: Fund[] = await fundResponse.json();
    const fund = fundJson?.at(0);

    if (!fund?.cenaTable?.length) {
      return {
        id: 'Error',
        name: 'Error',
        url: url
      };
    }

    const fundValues = fund.cenaTable.map<FundValue>(x => ({ date: new Date(x[0]), value: x[1] }));

    const newestItem = fundValues.at(-1)!;
    const current = newestItem.value;
    const lastUpdated = newestItem.date;
    const last1day = this.getChange(fundValues, 1);
    const last3days = this.getChange(fundValues, 3);
    const last7days = this.getChange(fundValues, 7);
    const last30days = this.getChange(fundValues, 30);
    const last90days = this.getChange(fundValues, 90);
    const last180days = this.getChange(fundValues, 180);

    return {
      id: fund.funduszId,
      url,
      lastUpdated,
      current,
      last1day,
      last3days,
      last7days,
      last30days,
      last90days,
      last180days
    };
  }

  private getChange(values: FundValue[], days: number): number {
    const maxItems = days + 1;
    const dayMilis = 24 * 60 * 60 * 1000;

    const range = values.slice(-maxItems);
    const newest = range.at(-1)!;
    const oldest = range.find(x => x.date.getTime() >= (newest.date.getTime() - (dayMilis * days)))!;

    return (newest.value / oldest.value) - 1.0;
  }
}