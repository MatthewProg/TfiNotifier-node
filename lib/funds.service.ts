import { FundStats } from "./fund-stats.model.js";
import axios, { AxiosInstance } from "axios";

interface FundsMetadata {
  funduszId: string;
  nazwa: string;
}

interface Fund {
  funduszId: string;
  cenaTable: [number, number][];
}

interface FundValue {
  date: Date;
  value: number;
}

interface FundEntry {
  id: string;
  refValue: number;
}

export default class FundsService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "https://inpzu.pl/afi-websrv-dystr-prod/api",
      headers: {
        "x-afiapi-clientappname": "inpzu-prod",
        "x-afiapi-ustawienia": "pl",
      },
    });
  }

  public async init() {
    console.log("Initializing FundsService");
    const tokenResponse = await this.client.post<{ token: string }>("/preLogowanie");
    const token = tokenResponse.data.token;

    this.client.defaults.headers["Authorization"] = `Bearer ${token}`;
    console.log("Got access token");
  }

  public getFundsList(): FundEntry[] {
    const envVariables = Object.entries(process.env);
    const fundKeys = envVariables
      .filter((x) => x[0].startsWith("Fund_") && x[0].endsWith("_Id"))
      .map((x) => x[0].split("_").at(1));

    const entries = fundKeys.map<FundEntry | undefined>((x) => {
      if (!x) return undefined;

      const valueId = process.env[`Fund_${x}_Id`]?.trim();
      const valueRef = process.env[`Fund_${x}_Ref`]?.trim();

      if (!valueId) return undefined;

      const parsedRef = valueRef ? parseFloat(valueRef) : 0;

      return {
        id: valueId,
        refValue: isNaN(parsedRef) ? 0 : parsedRef,
      };
    });

    return entries.filter((x) => !!x) as FundEntry[];
  }

  public async getFundsMetadata(): Promise<Map<string, string>> {
    const fundsResponse = await this.client.get<FundsMetadata[]>("/open/fundusze");

    const fundsMetadata = new Map(
      Array.from(fundsResponse.data).map((x) => [x.funduszId, x.nazwa])
    );
    console.log("Got metadata for %d funds", fundsMetadata.size);

    return fundsMetadata;
  }

  public async getFundStats(fundId: string): Promise<FundStats> {
    console.log('Getting stats for fund: ', fundId);
    const fundRequest = {
      cenaTable: true,
      tableFunduszId: [fundId],
    };
    const fundResponse = await this.client.post<Fund[]>("/open/wyceny", fundRequest);
    const fund = fundResponse.data?.at(0);

    if (!fund?.cenaTable?.length) {
      return {
        id: "Error",
        name: "Error",
        url: "",
      };
    }

    const fundValues = fund.cenaTable.map<FundValue>((x) => ({
      date: new Date(x[0]),
      value: x[1],
    }));

    const newestItem = fundValues.at(-1)!;
    const current = newestItem.value;
    const lastUpdated = newestItem.date;
    const last1day = this.getChange(fundValues, 1);
    const last3days = this.getChange(fundValues, 3);
    const last7days = this.getChange(fundValues, 7);
    const last30days = this.getChange(fundValues, 30);
    const last90days = this.getChange(fundValues, 90);
    const last180days = this.getChange(fundValues, 180);

    console.log("Got stats for fund ID: ", fund.funduszId);

    return {
      id: fund.funduszId,
      url: "",
      lastUpdated,
      current,
      last1day,
      last3days,
      last7days,
      last30days,
      last90days,
      last180days,
    };
  }

  private getChange(values: FundValue[], days: number): number {
    const maxItems = days + 1;
    const dayMilis = 24 * 60 * 60 * 1000;

    const range = values.slice(-maxItems);
    const newest = range.at(-1)!;
    const oldest = range.find(
      (x) => x.date.getTime() >= newest.date.getTime() - dayMilis * days
    )!;

    return newest.value / oldest.value - 1.0;
  }
}
