export interface Party { hash: string; ens_domain_name?: string | null; is_contract?: boolean }
export interface Transaction {
  hash: string; block_number: number; timestamp: string; result: string; value: string;
  raw_input: string; from: Party; to: Party | null; successful: boolean;
}

