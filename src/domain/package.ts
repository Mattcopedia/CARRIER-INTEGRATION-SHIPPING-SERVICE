export interface Package {
  weight: {
    value: number;
    unit: "LB" | "KG";
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: "IN" | "CM";
  };
}
