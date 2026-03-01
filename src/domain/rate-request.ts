import { Address } from "./address";
import { Package } from "./package";
//Note: This shape is not UPS-specific,
// and it’s the shape my app will keep even after you add FedEx/DHL.
export interface RateRequest {
  origin: Address;
  destination: Address;
  packages: Package[];

  /**
   * Optional carrier service code (e.g. "GROUND", "2DAY")
   * If undefined, carrier should return all available services
   */
  serviceLevel?: string;

  /**
   * Optional carrier selection
   * If undefined, service may query all registered carriers
   */
  carrier?: string;
}
