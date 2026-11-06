import { createServerFn } from "@tanstack/react-start";

const BASE = "https://www.fortebet.ug/api/web/v1";
export const BANNER_BASE = "https://www.fortebet.ug/static/temp/cms/";

type Raw = any;
const cache = new Map<string, { at: number; data: Raw }>();

async function getJson(path: string, ttl = 30_000): Promise<Raw> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < ttl) return hit.data;
  const res = await fetch(BASE + path, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Fortebet feed failed (${res.status})`);
  const data = await res.json();
  cache.set(path, { at: Date.now(), data });
  return data;
}

export type Match = {
  id: string;
  home: string;
  away: string;
  league: string;
  sportId: string;
  startTs: string;
  extra: number;
  odds: (number | null)[]; // 1, X, 2, 1X, X2, 12
  score?: string | undefined;
  status?: string | undefined;
};

const MAIN_OUTCOMES = [1, 2, 3, 200002, 200004, 200003];

function buildMatches(d: Raw, ids: string[]): Match[] {
  const mainByEvent = new Map<string, Raw>();
  for (const m of Object.values<Raw>(d.markets ?? {})) {
    if (m.marketId === 1 && !m.specifiers) mainByEvent.set(m.eventId, m);
  }
  const out: Match[] = [];
  for (const id of ids) {
    const e = d.event?.[id];
    if (!e) continue;
    const t = d.tournament?.[e.tournamentId];
    const c = t ? d.category?.[t.categoryId] : null;
    const mk = mainByEvent.get(id);
    const odds = MAIN_OUTCOMES.map((o) => {
      const v = mk ? Object.values<Raw>(mk.odds).find((x) => x.outcomeId === o) : null;
      return v && !v.locked && v.odds ? Number(v.odds) : null;
    });
    const sb = e.scoreboard?.status?.scoreboard;
    out.push({
      id,
      home: d.competitors?.[e.competitors?.[0]]?.name ?? "Home",
      away: d.competitors?.[e.competitors?.[1]]?.name ?? "Away",
      league: [c?.name, t?.name].filter(Boolean).join(" / "),
      sportId: String(c?.sportId ?? ""),
      startTs: e.startTs,
      extra: Math.max(0, (e.marketCount ?? 1) - 1),
      odds,
      score: sb && sb.h != null ? `${sb.hg ?? sb.h}:${sb.ag ?? sb.a}` : undefined,
      status: e.scoreboard?.status?.status ? String(e.scoreboard.status.status).replace(/_/g, " ") : undefined,
    });
  }
  return out;
}

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const [pre, banners] = await Promise.all([
    getJson("/offer/full-prematch-en"),
    getJson("/cms/banners?language=en&category=MAIN", 300_000).catch(() => null),
  ]);
  const d = pre.data;
  const sports = Object.entries<Raw>(d.sport)
    .map(([id, s]) => ({ id, name: s.name as string, icon: s.icon as string, count: s.eventCount as number, order: s.order as number }))
    .sort((a, b) => a.order - b.order);
  const topTournaments = (d.top_tournaments ?? []).map((g: Raw) => ({ name: g.name, count: g.tournaments.length, ids: g.tournaments }));
  const popularTournaments = (d.popular_tournaments ?? []).map((id: string) => ({ id, name: d.tournament?.[id]?.name ?? id }));

  const popular = buildMatches(d, d.popular_events ?? []);
  const soccerIds = Object.entries<Raw>(d.event)
    .filter(([, e]) => d.category?.[d.tournament?.[e.tournamentId]?.categoryId]?.sportId === 1)
    .sort((a, b) => a[1].startTs.localeCompare(b[1].startTs))
    .map(([id]) => id);
  const soccer = buildMatches(d, soccerIds);
  const fav = (m: Match) => Math.min(...[m.odds[0], m.odds[2]].filter((x): x is number => x != null));
  const under130 = soccer.filter((m) => fav(m) <= 1.3).slice(0, 40);
  const low = soccer.filter((m) => fav(m) > 1.3 && fav(m) <= 1.5).slice(0, 40);

  const now = Date.now();
  const bannerList = (banners?.data ?? [])
    .flatMap((b: Raw) => b.banner_list ?? [])
    .filter((b: Raw) => b.image && (!b.valid_to || Date.parse(b.valid_to) > now))
    .map((b: Raw) => ({ label: b.label as string, image: BANNER_BASE + b.image }));

  return { sports, topTournaments, popularTournaments, popular, under130, low, banners: bannerList };
});

export const getLiveData = createServerFn({ method: "GET" }).handler(async () => {
  const live = await getJson("/offer/full-live-en", 10_000);
  const d = live.data;
  const ids = Object.entries<Raw>(d.event)
    .sort((a, b) => a[1].startTs.localeCompare(b[1].startTs))
    .map(([id]) => id);
  const sports = Object.fromEntries(Object.entries<Raw>(d.sport).map(([id, s]) => [id, s.name as string]));
  return { matches: buildMatches(d, ids), sports };
});

export type MarketDTO = { name: string; outcomes: { name: string; odds: number | null }[] };

export const getEventDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string; live?: boolean }) => {
    if (!/^[A-Z]{2}\d+$/.test(input.id)) throw new Error("Invalid event id");
    return input;
  })
  .handler(async ({ data }) => {
    const mode = data.live ? "live" : "prematch";
    const [detail, full] = await Promise.all([
      getJson(`/offer/event_detail?offerMode=${mode}&lang=en&id_event=${data.id}`, 10_000),
      getJson(data.live ? "/offer/full-live-en" : "/offer/full-prematch-en"),
    ]);
    const e = detail.data;
    const f = full.data;
    const home = f.competitors?.[e.competitors?.[0]]?.name ?? "Home";
    const away = f.competitors?.[e.competitors?.[1]]?.name ?? "Away";
    const t = f.tournament?.[e.tournamentId];
    const c = t ? f.category?.[t.categoryId] : null;
    const fill = (s: string) =>
      s.replace(/\{\$competitor1\}/g, home).replace(/\{\$competitor2\}/g, away).replace(/\{\$?(\w+)\}/g, "$1");
    const markets: (MarketDTO & { order: number })[] = Object.values<Raw>(e.markets ?? {}).map((m) => {
      const def = f.market_list?.[String(c?.sportId ?? 1)]?.[m.marketId] ?? {};
      const spec = m.specifiers ? ` (${String(m.specifiers).split("|").map((p: string) => (p.split("=")[1] ?? "").replace(/^sr:[a-z_]+:/, "").replace(/_/g, " ")).join(", ")})` : "";
      const outcomes = Object.values<Raw>(m.odds)
        .map((o) => {
          const od = def.outcome?.[o.outcomeId];
          return { name: fill(od?.name ?? String(o.outcomeId)), odds: o.locked ? null : Number(o.odds), order: od?.order ?? 99 };
        })
        .sort((a, b) => a.order - b.order)
        .map(({ name, odds }) => ({ name, odds }));
      return { name: fill(def.name ?? `Market ${m.marketId}`).trim() + spec, outcomes, order: (def.order ?? 999) * 1000 };
    });
    markets.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    return {
      id: data.id,
      home,
      away,
      league: [c?.name, t?.name].filter(Boolean).join(" / "),
      startTs: e.startTs as string,
      markets: markets.map(({ name, outcomes }) => ({ name, outcomes })),
    };
  });
