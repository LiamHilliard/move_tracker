/** A title as shown in a poster grid, with the user's tracking state attached. */
export interface ListItem {
  titleId: number;
  mediaType: "movie" | "tv";
  name: string;
  year: number | null;
  posterPath: string | null;
  genres: string[];
  rank?: number;
  onWatchlist: boolean;
  seasonCount: number | null;
  /** Latest rating per watched scope (season for TV, null season for movies). */
  scopes: { season: number | null; rating: number; count: number }[];
  /** Rating of the most recent watch, for the card overlay. */
  displayRating: number | null;
}

export function isWatched(item: ListItem): boolean {
  return item.scopes.length > 0;
}
