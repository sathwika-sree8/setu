declare module "xirr" {
  type Transaction = {
    amount: number;
    when: Date;
  };

  export default function xirr(
    transactions: Transaction[],
    options?: {
      guess?: number;
      maxIterations?: number;
      tolerance?: number;
      epsilon?: number;
    },
  ): number;
}
