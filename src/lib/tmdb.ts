const TMDB_BASE = "https://api.themoviedb.org/3";

function token(): string {
  const t = process.env.TMDB_API_TOKEN;
  if (!t) throw new Error("TMDB_API_TOKEN is not set");
  return t;
}

export async function tmdb<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token()}`, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`TMDB ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export interface TmdbMovieResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
  genre_ids?: number[];
}

export interface TmdbTvResult {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  genre_ids?: number[];
}

export interface TmdbFindResponse {
  movie_results: TmdbMovieResult[];
  tv_results: TmdbTvResult[];
}

export function findByImdbId(imdbId: string): Promise<TmdbFindResponse> {
  return tmdb<TmdbFindResponse>(`/find/${imdbId}`, {
    external_source: "imdb_id",
  });
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
  genres: { id: number; name: string }[];
  imdb_id?: string | null;
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  external_ids?: { imdb_id?: string | null };
}

export function movieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  return tmdb<TmdbMovieDetails>(`/movie/${tmdbId}`);
}

export function tvDetails(tmdbId: number): Promise<TmdbTvDetails> {
  return tmdb<TmdbTvDetails>(`/tv/${tmdbId}`, { append_to_response: "external_ids" });
}

export interface TmdbMultiResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
}

export function searchMulti(query: string): Promise<{ results: TmdbMultiResult[] }> {
  return tmdb<{ results: TmdbMultiResult[] }>("/search/multi", {
    query,
    include_adult: "false",
  });
}

export interface TmdbRecResult {
  id: number;
  media_type?: "movie" | "tv";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average: number;
  vote_count: number;
}

export function recommendations(
  kind: "movie" | "tv",
  tmdbId: number,
): Promise<{ results: TmdbRecResult[] }> {
  return tmdb<{ results: TmdbRecResult[] }>(`/${kind}/${tmdbId}/recommendations`);
}

interface TmdbProviderEntry {
  provider_name: string;
  logo_path: string;
}

export async function watchProviders(
  kind: "movie" | "tv",
  tmdbId: number,
  region: string,
): Promise<{ name: string; logoPath: string }[]> {
  const data = await tmdb<{
    results: Record<
      string,
      { flatrate?: TmdbProviderEntry[]; free?: TmdbProviderEntry[] }
    >;
  }>(`/${kind}/${tmdbId}/watch/providers`);
  const regional = data.results[region];
  const entries = [...(regional?.flatrate ?? []), ...(regional?.free ?? [])];
  const seen = new Set<string>();
  return entries
    .filter((e) => !seen.has(e.provider_name) && seen.add(e.provider_name))
    .slice(0, 6)
    .map((e) => ({ name: e.provider_name, logoPath: e.logo_path }));
}

export async function genreMap(kind: "movie" | "tv"): Promise<Map<number, string>> {
  const data = await tmdb<{ genres: { id: number; name: string }[] }>(
    `/genre/${kind}/list`,
  );
  return new Map(data.genres.map((g) => [g.id, g.name]));
}
