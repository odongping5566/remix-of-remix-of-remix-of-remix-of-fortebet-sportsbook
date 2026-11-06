import { createServerFn } from "@tanstack/react-start";

const BASE = "https://www.fortebet.ug/api/web/v1";
export const BANNER_BASE = "https://www.fortebet.ug/static/temp/cms/";

type Raw = any;
const cache = new Map<string, { at: number; data: Raw }>();

async function getJson(path: string, ttl = 30_000): Promise<{ at: number; data: Raw }> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < ttl) return hit;
  const res = await fetch(BASE + path, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Fortebet feed failed (${res.status})`);
  const data = await res.json();
  const entry = { at: Date.now(), data };
  cache.set(path, entry);
  return entry;
}

// ---------- Normalised offer ----------
/** One odds cell: oddsId, value, locked flag. */
export type Cell = { id: number; v: number; l?: 1 } | null;
export type OfferSport = { id: string; name: string; icon: string; order: number; count: number; market: string; cols: string[] };
export type OfferCategory = { id: string; sportId: string; name: string; icon: string; order: number; count: number };
export type OfferTournament = { id: string; categoryId: string; sportId: string; name: string; order: number; count: number };
export type OfferEvent = {
  id: string;
  sp: string; // sport id
  t: string; // tournament id
  h: string;
  a: string;
  s: string; // start ISO
  mc: number; // market count
  mk: number[]; // market db ids feeding the main cells (for lock updates)
  c: Cell[];
  sc?: string | undefined; // live score
  st?: string | undefined; // live status
};
export type QuickFilter = { key: string; marketId: number; spec: string; label: string; cols: string[]; outcomes: number[] };
export type Offer = {
  at: number;
  live: boolean;
  sports: OfferSport[];
  categories: OfferCategory[];
  tournaments: OfferTournament[];
  events: OfferEvent[];
  top: { name: string; ids: string[] }[];
  popularEvents: string[];
  popularTournaments: string[];
  quick: Record<string, QuickFilter[]>;
};

const DC_SHORTS = ["1X", "X2", "12"];

function fillName(s: string, home = "Home", away = "Away") {
  return s.replace(/\{\$competitor1\}/g, home).replace(/\{\$competitor2\}/g, away);
}

function scoreOf(e: Raw) {
  const st = e.scoreboard?.status;
  const sb = st?.scoreboard;
  const score = sb && sb.h != null ? `${sb.hg ?? sb.h}:${sb.ag ?? sb.a}` : undefined;
  const status = st?.status ? String(st.status).replace(/_/g, " ") + (st.time ? ` ${st.time}'` : "") : undefined;
  return { score, status };
}

function normalise(d: Raw, at: number, live: boolean): Offer {
  const ml = d.market_list ?? {};
  const mainDef: Record<string, { id: number; def: Raw; outs: [string, Raw][] }> = {};
  for (const sid of Object.keys(ml)) {
    const entry = Object.entries<Raw>(ml[sid]).find(([, v]) => v.main);
    if (!entry) continue;
    const outs = Object.entries<Raw>(entry[1].outcome ?? {}).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
    mainDef[sid] = { id: Number(entry[0]), def: entry[1], outs };
  }

  const sports: OfferSport[] = Object.entries<Raw>(d.sport ?? {})
    .map(([id, s]) => {
      const md = mainDef[id];
      return { id, name: s.name, icon: s.icon, order: s.order ?? 99, count: s.eventCount ?? 0, market: md?.def.name ?? "Match Winner", cols: md ? md.outs.map(([, o]) => o.short ?? "") : ["1", "2"] };
    })
    .sort((a, b) => a.order - b.order);
  const categories: OfferCategory[] = Object.entries<Raw>(d.category ?? {})
    .map(([id, c]) => ({ id, sportId: String(c.sportId), name: c.name, icon: c.icon, order: c.order ?? 99, count: c.eventCount ?? 0 }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const catSport = new Map(categories.map((c) => [c.id, c.sportId]));
  const tournaments: OfferTournament[] = Object.entries<Raw>(d.tournament ?? {})
    .map(([id, t]) => ({ id, categoryId: String(t.categoryId), sportId: catSport.get(String(t.categoryId)) ?? "", name: t.name, order: t.order ?? 99, count: t.eventCount ?? 0 }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const tourSport = new Map(tournaments.map((t) => [t.id, t.sportId]));

  // index markets by event
  const byEvent = new Map<string, [string, Raw][]>();
  for (const [mid, m] of Object.entries<Raw>(d.markets ?? {})) {
    const arr = byEvent.get(m.eventId);
    if (arr) arr.push([mid, m]);
    else byEvent.set(m.eventId, [[mid, m]]);
  }

  const events: OfferEvent[] = [];
  for (const [id, e] of Object.entries<Raw>(d.event ?? {})) {
    const sp = tourSport.get(e.tournamentId) ?? "";
    const md = mainDef[sp];
    const mks = byEvent.get(id) ?? [];
    const main = md ? mks.find(([, m]) => m.marketId === md.id && !m.specifiers) : undefined;
    const dc = mks.find(([, m]) => m.marketId === 10 && !m.specifiers);
    const dcDef = ml[sp]?.["10"];
    const mk: number[] = [];
    if (main) mk.push(Number(main[0]));
    const cells: Cell[] = (md?.outs ?? []).map(([oid, od]) => {
      const pick = (m: Raw, outcomeId: number) => {
        const hit = Object.entries<Raw>(m.odds ?? {}).find(([, o]) => o.outcomeId === outcomeId);
        return hit ? ({ id: Number(hit[0]), v: Number(hit[1].odds), ...(hit[1].locked ? { l: 1 as const } : {}) }) : null;
      };
      let cell = main ? pick(main[1], Number(oid)) : null;
      if (!cell && dc && dcDef && DC_SHORTS.includes(od.short)) {
        const alt = Object.entries<Raw>(dcDef.outcome ?? {}).find(([, o]) => o.short === od.short);
        if (alt) {
          cell = pick(dc[1], Number(alt[0]));
          if (cell && !mk.includes(Number(dc[0]))) mk.push(Number(dc[0]));
        }
      }
      return cell;
    });
    const { score, status } = live ? scoreOf(e) : { score: undefined, status: undefined };
    events.push({
      id,
      sp,
      t: e.tournamentId,
      h: d.competitors?.[e.competitors?.[0]]?.name ?? "Home",
      a: d.competitors?.[e.competitors?.[1]]?.name ?? "Away",
      s: e.startTs,
      mc: e.marketCount ?? 1,
      mk,
      c: cells,
      sc: score,
      st: status,
    });
  }
  events.sort((a, b) => a.s.localeCompare(b.s));

  const quick: Record<string, QuickFilter[]> = {};
  for (const sid of Object.keys(ml)) {
    const list: QuickFilter[] = [];
    for (const [mid, def] of Object.entries<Raw>(ml[sid]).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0))) {
      if (!def.quickFilter) continue;
      const outs = Object.entries<Raw>(def.outcome ?? {}).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
      const short = (o: Raw, p?: string) => String(o.short ?? o.name ?? "").replace(/\{\$?total\}/g, p ?? "").trim();
      const label = (p?: string) => fillName(String(def.short ?? def.name), "Home", "Away").replace(/\{\$?total\}/g, "").trim() + (p ? ` ${p}` : "");
      if (def.spec?.params?.length) {
        for (const p of def.spec.params as string[]) {
          list.push({ key: `${mid}|${def.spec.type}=${p}`, marketId: Number(mid), spec: `${def.spec.type}=${p}`, label: label(p), cols: outs.map(([, o]) => short(o, p)), outcomes: outs.map(([o]) => Number(o)) });
        }
      } else {
        list.push({ key: mid, marketId: Number(mid), spec: "", label: label(), cols: outs.map(([, o]) => short(o)), outcomes: outs.map(([o]) => Number(o)) });
      }
    }
    if (list.length) quick[sid] = list;
  }

  return {
    at,
    live,
    sports,
    categories,
    tournaments,
    events,
    top: (d.top_tournaments ?? []).map((g: Raw) => ({ name: g.name, ids: g.tournaments ?? [] })),
    popularEvents: d.popular_events ?? [],
    popularTournaments: d.popular_tournaments ?? [],
    quick,
  };
}

export const getPrematchOffer = createServerFn({ method: "GET" }).handler(async () => {
  const r = await getJson("/offer/full-prematch-en", 30_000);
  return normalise(r.data.data, r.at, false);
});

export const getLiveOffer = createServerFn({ method: "GET" }).handler(async () => {
  const r = await getJson("/offer/full-live-en", 5_000);
  return normalise(r.data.data, r.at, true);
});

export const getBanners = createServerFn({ method: "GET" }).handler(async () => {
  const r = await getJson("/cms/banners?language=en&category=MAIN", 300_000).catch(() => null);
  const now = Date.now();
  return ((r?.data?.data ?? []) as Raw[])
    .flatMap((b: Raw) => b.banner_list ?? [])
    .filter((b: Raw) => b.image && (!b.valid_to || Date.parse(b.valid_to) > now))
    .map((b: Raw) => ({ label: b.label as string, image: BANNER_BASE + b.image }));
});

/** Odds for one market (e.g. Match Goals 2.5) across all events of a sport. */
export const getMarketOffer = createServerFn({ method: "GET" })
  .inputValidator((input: { sportId: string; marketId: number; spec: string; outcomes: number[] }) => {
    if (!/^\d+$/.test(input.sportId) || !Number.isInteger(input.marketId)) throw new Error("Invalid market");
    if (!/^[a-z_]*=?[\d.]*$/i.test(input.spec)) throw new Error("Invalid specifier");
    if (!Array.isArray(input.outcomes) || input.outcomes.length > 12) throw new Error("Invalid outcomes");
    return input;
  })
  .handler(async ({ data }) => {
    const q = `/offer/markets?sportId=${data.sportId}&marketId=${data.marketId}${data.spec ? `&specifiers=${encodeURIComponent(data.spec)}` : ""}&offerMode=prematch&lang=en`;
    const r = await getJson(q, 30_000);
    const out: Record<string, { mk: number; c: Cell[] }> = {};
    for (const [mid, m] of Object.entries<Raw>(r.data.data ?? {})) {
      if (data.spec && m.specifiers && m.specifiers !== data.spec) continue;
      const odds = Object.entries<Raw>(m.odds ?? {});
      out[m.eventId] = {
        mk: Number(mid),
        c: data.outcomes.map((oid) => {
          const hit = odds.find(([, o]) => o.outcomeId === oid);
          return hit ? { id: Number(hit[0]), v: Number(hit[1].odds), ...(hit[1].locked ? { l: 1 as const } : {}) } : null;
        }),
      };
    }
    return { at: r.at, events: out };
  });

export type MarketDTO = { id: number; name: string; outcomes: { id: number; name: string; odds: number | null; locked: boolean }[] };

export const getEventDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string; live?: boolean }) => {
    if (!/^[A-Z]{2}\d+$/.test(input.id)) throw new Error("Invalid event id");
    return input;
  })
  .handler(async ({ data }) => {
    const mode = data.live ? "live" : "prematch";
    const [detail, full] = await Promise.all([
      getJson(`/offer/event_detail?offerMode=${mode}&lang=en&id_event=${data.id}`, data.live ? 5_000 : 10_000),
      getJson(data.live ? "/offer/full-live-en" : "/offer/full-prematch-en", data.live ? 5_000 : 30_000),
    ]);
    const e = detail.data.data;
    const f = full.data.data;
    const home = f.competitors?.[e.competitors?.[0]]?.name ?? "Home";
    const away = f.competitors?.[e.competitors?.[1]]?.name ?? "Away";
    const t = f.tournament?.[e.tournamentId];
    const c = t ? f.category?.[t.categoryId] : null;
    const fill = (s: string) => fillName(s, home, away).replace(/\{\$?(\w+)\}/g, "$1");
    const markets: (MarketDTO & { order: number })[] = Object.entries<Raw>(e.markets ?? {}).map(([mid, m]) => {
      const def = f.market_list?.[String(c?.sportId ?? 1)]?.[m.marketId] ?? {};
      const spec = m.specifiers ? ` (${String(m.specifiers).split("|").map((p: string) => (p.split("=")[1] ?? "").replace(/^sr:[a-z_]+:/, "").replace(/_/g, " ")).join(", ")})` : "";
      const outcomes = Object.entries<Raw>(m.odds)
        .map(([oid, o]) => {
          const od = def.outcome?.[o.outcomeId];
          return { id: Number(oid), name: fill(od?.name ?? String(o.outcomeId)), odds: Number(o.odds) || null, locked: !!o.locked || m.marketStatusId === 0, order: od?.order ?? 99 };
        })
        .sort((a, b) => a.order - b.order)
        .map(({ id, name, odds, locked }) => ({ id, name, odds, locked }));
      return { id: Number(mid), name: fill(def.name ?? `Market ${m.marketId}`).trim() + spec, outcomes, order: (def.order ?? 999) * 1000 };
    });
    markets.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const { score, status } = scoreOf(e);
    return {
      at: Math.min(detail.at, full.at),
      id: data.id,
      home,
      away,
      sportId: String(c?.sportId ?? ""),
      league: [c?.name, t?.name].filter(Boolean).join(" / "),
      startTs: e.startTs as string,
      score: data.live ? score : undefined,
      status: data.live ? status : undefined,
      markets: markets.map(({ id, name, outcomes }) => ({ id, name, outcomes })),
    };
  });
