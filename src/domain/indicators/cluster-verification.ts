import type { ClusterDefinition } from '../schemas/cluster';

// Reports data. It never throws and never signals failure (TD-10).

/** Ids of clusters with no source reference, in the original order. */
export function findUnverifiedClusters(
  clusters: readonly ClusterDefinition[],
): readonly string[] {
  return clusters
    .filter((cluster) => cluster.sources.length === 0)
    .map((cluster) => cluster.id);
}
