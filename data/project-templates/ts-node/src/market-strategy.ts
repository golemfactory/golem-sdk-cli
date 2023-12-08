import { MarketHelpers, ProposalFilter, ProposalFilters } from "@golem-sdk/golem-js";
import { MarketOptions } from "@golem-sdk/golem-js/dist/market/service";

/**
 * Helper function wrapping the logic of creating a custom market strategy for the TaskExecutor
 *
 * Feel free to adjust the contents of this method to reflect your needs. The default implementation
 * contains some recommended steps and checks.
 */
export default async function buildMarketStrategy(): Promise<Partial<MarketOptions>> {
  const reliableProviders = await MarketHelpers.getHealthyProvidersWhiteList();

  const filterByReliable = ProposalFilters.whiteListProposalIdsFilter(reliableProviders);

  const filterByPrice = ProposalFilters.limitPriceFilter({
    start: 0.1,
    cpuPerSec: 0.1 / 3600,
    envPerSec: 0.1 / 3600,
  });

  const proposalFilter: ProposalFilter = async (proposal) => {
    const [isReliable, isWithinPriceRange] = await Promise.all([filterByReliable(proposal), filterByPrice(proposal)]);

    return isReliable && isWithinPriceRange;
  };

  return {
    proposalFilter,
  };
}
