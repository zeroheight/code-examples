export function extractCollectionAndMode(link) {
  const searchParams = new URLSearchParams(link);
  const collection = searchParams.get("collection_name");
  const mode = searchParams.get("mode_name");
  return [collection, mode];
}

export function extractCollectionModes(links) {
  return links.reduce((acc, link) => {
    const [collection, mode] = extractCollectionAndMode(link);
    if (!acc[collection]) {
      acc[collection] = [];
    }
    acc[collection].push(mode);
    return acc;
  }, {});
}
