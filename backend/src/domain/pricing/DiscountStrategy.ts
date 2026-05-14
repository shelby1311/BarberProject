export interface IDiscountStrategy {
  apply(priceInCents: number): number;
}

export class NoDiscount implements IDiscountStrategy {
  apply(priceInCents: number) {
    return priceInCents;
  }
}

export class OnlineBookingDiscount implements IDiscountStrategy {
  constructor(private readonly percent: number = 10) {}
  apply(priceInCents: number) {
    return Math.round(priceInCents * (1 - this.percent / 100));
  }
}
