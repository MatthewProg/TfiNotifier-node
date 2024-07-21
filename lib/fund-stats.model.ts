export interface FundStats {
  id: string,
  url: string,
  name?: string,
  lastUpdated?: Date,
  current?: number,
  last1day?: number,
  last3days?: number,
  last7days?: number,
  last30days?: number,
  last90days?: number,
  last180days?: number,
  refChange?: number
}