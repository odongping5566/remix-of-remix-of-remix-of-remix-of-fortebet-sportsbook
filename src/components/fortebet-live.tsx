import { useEffect, useState, type CSSProperties } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getHomeData, getLiveData, getEventDetail, type Match } from "@/lib/fortebet.functions";

// ---------- Live data (Fortebet feeds) ----------
export type Sel = { key: string; eventId: string; match: string; pick: string; odds: number };
export const PICKS = ["1", "X", "2", "1X", "X2", "12"];
const homeQuery = queryOptions({ queryKey: ["fb-home"], queryFn: () => getHomeData(), refetchInterval: 60_000 });
export const liveQuery = queryOptions({ queryKey: ["fb-live"], queryFn: () => getLiveData(), refetchInterval: 15_000 });

export function fmtTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const tom = new Date(now.getTime() + 864e5);
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const day = d.toDateString() === now.toDateString() ? "Today" : d.toDateString() === tom.toDateString() ? "Tomorrow" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { day, time };
}

function useHome() {
  return useQuery(homeQuery);
}

export function TopBetsList() {
  const { data } = useHome();
  if (!data) return <ul className="topbets"><li><a> Loading…</a></li></ul>;
  return (
    <ul className="topbets">
      {data.topTournaments.slice(0, 3).map((g: any, i: number) => (
        <li key={g.name}>
          <a> {g.name} <span>({g.count}x)</span></a>
          <span className="toRight"><input className="white items-center justify-center" type="checkbox" id={`tb${i}`} /><label htmlFor={`tb${i}`} /></span>
        </li>
      ))}
      <hr />
      {data.popularTournaments.map((t: any, i: number) => (
        <li key={t.id}>
          <a> {t.name} </a>
          <span className="toRight"><input className="items-center justify-center" type="checkbox" id={`pt${i}`} /><label htmlFor={`pt${i}`} /></span>
        </li>
      ))}
    </ul>
  );
}

export function SportsList() {
  const { data } = useHome();
  return (
    <ul className="events [font-weight:700]">
      {(data?.sports ?? []).map((s: any) => (
        <li key={s.id}><a><span className={`h16 ico ${s.icon} wp21`} /> {s.name} <small>{s.count}</small></a></li>
      ))}
    </ul>
  );
}

export function BannerSlider() {
  const { data } = useHome();
  const list = data?.banners ?? [];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % list.length), 6000);
    return () => clearInterval(t);
  }, [list.length]);
  const img = list[i % Math.max(list.length, 1)]?.image ?? "/site-assets/05bbece20555e650.webp";
  return (
    <div className="slider">
      <div><div style={{ backgroundImage: `url("${img}")` }} /></div>
      <div className="sliderDots justify-center [bottom:calc(32px_*_var(--factor))] [gap:calc(10px_*_var(--factor))]">
        {list.map((b: any, k: number) => (
          <div key={b.label + k} className={k === i ? "active" : ""} onClick={() => setI(k)} role="button" aria-label={`Banner ${k + 1}`} />
        ))}
      </div>
    </div>
  );
}

export function MatchRow({ m, sels, toggle, open, stats }: { m: Match; sels: Sel[]; toggle: (s: Sel) => void; open: (id: string) => void; stats: (id: string) => void }) {
  const t = fmtTime(m.startTs);
  const fav = Math.min(...[m.odds[0], m.odds[2]].filter((x): x is number => x != null));
  return (
    <div className="offerMatch">
      <div className="app-widget-event-set curPointer" onClick={() => open(m.id)}>
        <span className="matchName"><span> {m.home} </span> - <span> {m.away} </span><span className="tooltip">{m.league}</span></span>
        <div><span><span className="ico star h13 opa06 deadSpace" /><span className="liveIco">Live</span><span className="ico chart h13 opa06 deadSpace curPointer" role="button" aria-label="Match statistics" style={{ display: "inline-block", minWidth: 14, minHeight: 13 }} onClick={(e) => { e.stopPropagation(); stats(m.id); }} /><span className="ico hearth h13 opa06 deadSpace" /></span></div>
      </div>
      <div className="app-widget-time-set">
        <div>{m.score ? <><span className="textOrange"> {m.score} </span> | {m.status ?? "LIVE"}</> : <><span className="textOrange"> {t.day} </span> | {t.time}</>}</div>
      </div>
      <div className="app-widget-market-set">
        {m.odds.map((o, k) => {
          const key = `${m.id}-${k}`;
          const on = sels.some((s) => s.key === key);
          return (
            <div className="odds" key={k}>
              <div
                className={`${o === fav && k !== 1 ? "favorite" : ""} ${on ? "selected" : ""}`}
                style={on ? { background: "rgb(0,166,90)", color: "#fff" } : undefined}
                onClick={() => o && toggle({ key, eventId: m.id, match: `${m.home} - ${m.away}`, pick: PICKS[k] ?? "", odds: o })}
              >
                {o ? ` ${o.toFixed(2)} ` : " - "}
              </div>
            </div>
          );
        })}
      </div>
      <div className="curPointer" onClick={() => open(m.id)}>+{m.extra}</div>
    </div>
  );
}

export function EventDetail({ id, live, onClose, sels, toggle }: { id: string; live: boolean; onClose: () => void; sels: Sel[]; toggle: (s: Sel) => void }) {
  const q = useQuery({ queryKey: ["fb-ev", id, live], queryFn: () => getEventDetail({ data: { id, live } }), refetchInterval: 20_000 });
  const [stats, setStats] = useState(false);
  const ev = q.data;
  return (
    <div style={{ display: "block" }}>
      <div className="mainOffer"><div className="offerMenu baseLeft center">
        <div className="active"><a>{ev ? `${ev.home} - ${ev.away}` : "Loading…"}</a></div>
        <div><a onClick={onClose} className="curPointer">← BACK</a></div>
      </div></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.08)", color: "#e6e6e8", fontWeight: 700, fontSize: 13, marginTop: 6 }}>
        <div>{ev ? `${ev.league} · ${fmtTime(ev.startTs).day} ${fmtTime(ev.startTs).time}` : ""}</div>
        <div><a onClick={() => setStats(true)} className="textOrange curPointer">Match statistics</a></div>
        {stats && <StatsModal id={id} live={live} onClose={() => setStats(false)} />}
      </div>
      {q.isError && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.08)", color: "#e6e6e8", fontWeight: 700, fontSize: 13, marginTop: 6 }}><div>Odds for this match are not available right now.</div></div>}
      {ev?.markets.map((mk, mi) => (
        <div key={mi}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.08)", color: "#e6e6e8", fontWeight: 700, fontSize: 13, marginTop: 6 }}><span>{mk.name}</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 6, padding: 8 }}>
            <div style={{ display: "contents" }}>
              {mk.outcomes.map((o, oi) => {
                const key = `${id}-m${mi}-${oi}`;
                const on = sels.some((s) => s.key === key);
                return (
                  <div key={oi}>
                    <div
                      className="curPointer"
                      style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderRadius: 3, background: on ? "rgb(0,166,90)" : "rgba(255,255,255,0.06)", color: on ? "#fff" : "#c9c9cb", fontSize: 13 }}
                      onClick={() => o.odds && toggle({ key, eventId: id, match: `${ev.home} - ${ev.away}`, pick: `${mk.name}: ${o.name}`, odds: o.odds })}
                    >
                      <span>{o.name}</span> <b style={{ color: on ? "#fff" : "#22d47e" }}>{o.odds ? o.odds.toFixed(2) : "-"}</b>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MatchesPanel({ mode, sels, toggle }: { mode: "home" | "live"; sels: Sel[]; toggle: (s: Sel) => void }) {
  const home = useQuery({ ...homeQuery, enabled: mode === "home" });
  const live = useQuery({ ...liveQuery, enabled: mode === "live" });
  const [tab, setTab] = useState(0);
  const [limit, setLimit] = useState(8);
  const [open, setOpen] = useState<string | null>(null);
  const [statsId, setStatsId] = useState<string | null>(null);
  useEffect(() => setOpen(null), [mode]);
  const tabs = mode === "live" ? ["LIVE MATCHES"] : ["MOST POPULAR MATCHES", "SOCCER ODDS UNDER 1.30", "LOW SOCCER ODDS (1.31 - 1.50)"];
  const q = mode === "live" ? live : home;
  const list: Match[] = mode === "live" ? live.data?.matches ?? [] : home.data ? [home.data.popular, home.data.under130, home.data.low][tab] ?? [] : [];
  return (
    <div className="mainOffer">
      <div className="offerMenu baseLeft center">
        {tabs.map((t, k) => (
          <div key={t} className={k === tab || mode === "live" ? "active" : ""}><a className="curPointer" onClick={() => { setTab(k); setLimit(8); }}>{t}</a></div>
        ))}
      </div>
      <div className="emptyLow" />
      <div className="offerHead"><div />{PICKS.map((p) => <div key={p}>{p}</div>)}</div>
      {q.isLoading && <div className="offerHead"><div>Loading matches…</div></div>}
      {q.isError && <div className="offerHead"><div>Could not load matches. Retrying…</div></div>}
      {!q.isLoading && list.length === 0 && !q.isError && <div className="offerHead"><div>No matches right now.</div></div>}
      {list.slice(0, limit).map((m) => <div key={m.id}><MatchRow m={m} sels={sels} toggle={toggle} open={(id) => setOpen((o) => (o === id ? null : id))} stats={setStatsId} />{open === m.id && <MarketsDropdown id={m.id} live={mode === "live"} sels={sels} toggle={toggle} />}</div>)}
      {statsId && <StatsModal id={statsId} live={mode === "live"} onClose={() => setStatsId(null)} />}
      <div className="offerButtons">
        {limit < list.length && <div className="buttons empty"><a className="curPointer" onClick={() => setLimit((l) => l + 10)}>SHOW MORE</a></div>}
      </div>
    </div>
  );
}

export function BetSlip({ sels, remove, clear, title = "Sportsbook" }: { sels: Sel[]; remove: (k: string) => void; clear: () => void; title?: string }) {
  const [stake, setStake] = useState(1000);
  const total = sels.reduce((a, s) => a * s.odds, 1);
  return (
    <div className="ticket">
      <div className="ticketHead"> Bet slip - {title} <div /></div>
      <div className="betSlipMenu"><div><a className="active"> 1 <span>{sels.length}</span></a><a> 2 <span>0</span></a><a> 3 <span>0</span></a><a> 4 <span>0</span></a></div></div>
      {sels.length === 0 ? (
        <div className="empty"> Your Ticket is still empty </div>
      ) : (
        <div style={{ padding: 10, color: "#333", fontSize: 13 }}>
          {sels.map((s) => (
            <div key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px solid #ddd" }}>
              <div><b>{s.match}</b><div>{s.pick}</div></div>
              <div style={{ textAlign: "right" }}><b>{s.odds.toFixed(2)}</b><div><a className="curPointer" onClick={() => remove(s.key)} aria-label="Remove">✕</a></div></div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}><span>Total odds</span><b>{total.toFixed(2)}</b></div>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>Stake (UGX)
            <input type="number" min={1000} value={stake} onChange={(e) => setStake(Number(e.target.value))} style={{ width: 110, border: "1px solid #ccc", padding: 4 }} />
          </label>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span>Possible win</span><b>{(stake * total).toLocaleString("en-US", { maximumFractionDigits: 0 })} UGX</b></div>
          <div className="buttons" style={{ marginTop: 8 }}><a className="curPointer" onClick={clear}>Clear ticket</a></div>
        </div>
      )}
    </div>
  );
}

export function StatsModal({ id, onClose }: { id: string; live?: boolean; onClose: () => void }) {
  const num = id.replace(/\D/g, "");
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Statistics center" style={{ width: "min(520px, 100%)", height: "min(780px, 92vh)", display: "flex", flexDirection: "column", background: "#2a2b31", color: "#e6e6e8", borderRadius: 4, boxShadow: "0 10px 40px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#1f2025", fontWeight: 700, fontSize: 13 }}>
          <span>STATISTICS CENTER</span>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: 0, color: "#e6e6e8", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <iframe title="Match statistics" src={`https://fortebet-ug.24liveresults.com/match-widget/${num}?displayMode=kiosk&utm_source=fortebet&utm_medium=web&utm_campaign=match_detail&language=en&lang=en`} style={{ flex: 1, width: "100%", border: 0, background: "#2a2b31" }} />
      </div>
    </div>
  );
}

export function useSels() {
  const [sels, setSels] = useState<Sel[]>([]);
  const toggle = (sel: Sel) =>
    setSels((s) => (s.some((x) => x.key === sel.key) ? s.filter((x) => x.key !== sel.key) : [...s.filter((x) => x.eventId !== sel.eventId), sel]));
  return { sels, toggle, remove: (k: string) => setSels((s) => s.filter((x) => x.key !== k)), clear: () => setSels([]) };
}

export function LivePreviewList({ sels, toggle }: { sels: Sel[]; toggle: (s: Sel) => void }) {
  const q = useQuery(liveQuery);
  const [open, setOpen] = useState<string | null>(null);
  const go = (id: string) => setOpen((o) => (o === id ? null : id));
  const [statsId, setStatsId] = useState<string | null>(null);
  const list: Match[] = q.data?.matches ?? [];
  const groups: [string, Match[]][] = [];
  for (const m of list) {
    const g = groups.find((x) => x[0] === m.league);
    if (g) g[1].push(m); else groups.push([m.league, [m]]);
  }
  return (
    <div className="live">
      <div className="live__head live__head--space" />
      <div data-ce="live-preview">
        <div className="match headOdds uppercase [font-weight:700]">
          <div><span className="ico soccer" /></div>
          <div>Live matches</div>
          <div className="matchOdds"> Full Time Result </div>
          <div className="matchOdds"> Double Chance </div>
          <div />
        </div>
        {q.isLoading && <div className="match tournament"><div /><div>Loading live matches…</div></div>}
        {q.isError && <div className="match tournament"><div /><div>Could not load live matches. Retrying…</div></div>}
        {!q.isLoading && !q.isError && list.length === 0 && <div className="match tournament"><div /><div>No live matches right now.</div></div>}
        {groups.map(([league, ms]) => (
          <div key={league} style={{ display: "contents" }}>
            <div className="match tournament [font-weight:700]">
              <div><span className="ico soccer" /></div>
              <div><span>{league}</span><span> ({ms.length})</span></div>
              <div className="matchOdds"><div>1 </div><div>X </div><div>2 </div></div>
              <div className="matchOdds"><div>1X </div><div>X2 </div><div>12 </div></div>
              <div />
            </div>
            {ms.map((m) => (
              <div key={m.id} className="data match [font-weight:700]">
                <div className="matchInfo curPointer" onClick={() => go(m.id)}>
                  <div className="app-widget-event-set">
                    <div className="starFavorite"><span className="ico chart h13 opa06 curPointer" role="button" aria-label="Match statistics" style={{ display: "inline-block", minWidth: 14, minHeight: 13 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStatsId(m.id); }} /></div>
                    <div className="teamsName"><span> {m.home} </span><span> {m.away} </span></div>
                    <div className="teamsScore"><div>{m.score ?? "0 : 0"}</div><div /></div>
                    <div className="status"><i>{m.status ?? "Live"}</i></div>
                  </div>
                </div>
                <div className="app-widget-market-set">
                  {[0, 1].map((g) => (
                    <div className="odds" key={g}>
                      {m.odds.slice(g * 3, g * 3 + 3).map((o, j) => {
                        const k = g * 3 + j;
                        const key = `${m.id}-${k}`;
                        const on = sels.some((s) => s.key === key);
                        return (
                          <div key={k} className="curPointer" style={on ? { background: "rgb(0,166,90)", color: "#fff" } : undefined}
                            onClick={() => o && toggle({ key, eventId: m.id, match: `${m.home} - ${m.away}`, pick: PICKS[k] ?? "", odds: o })}>
                            {o ? ` ${o.toFixed(2)} ` : " - "}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="curPointer" onClick={() => go(m.id)}> +{m.extra} </div>
              </div>
              {open === m.id && <MarketsDropdown id={m.id} live sels={sels} toggle={toggle} />}
            ))}
          </div>
        ))}
      </div>
      {statsId && <StatsModal id={statsId} live onClose={() => setStatsId(null)} />}
    </div>
  );
}

export function LiveEventHeader({ id, onBack }: { id: string; onBack: () => void }) {
  const q = useQuery(liveQuery);
  const m = q.data?.matches.find((x) => x.id === id);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", background: "rgba(255,255,255,0.08)", color: "#e6e6e8", fontWeight: 700, fontSize: 13 }}>
      <a className="curPointer" onClick={onBack} style={{ color: "#22d47e" }}>← Back</a>
      <span style={{ flex: 1 }}>{m ? `${m.home} - ${m.away}` : "Live match"}</span>
      {m && <span><span style={{ color: "#22d47e" }}>{m.score ?? "0:0"}</span> · {m.status ?? "Live"}</span>}
    </div>
  );
}

export function MarketsDropdown({ id, live, sels, toggle }: { id: string; live: boolean; sels: Sel[]; toggle: (s: Sel) => void }) {
  const q = useQuery({ queryKey: ["fb-ev", id, live], queryFn: () => getEventDetail({ data: { id, live } }), refetchInterval: live ? 10_000 : 20_000 });
  const ev = q.data;
  const [closed, setClosed] = useState<number[]>([]);
  const box: CSSProperties = { background: "#2e3139", color: "#e6e6e8", fontSize: 12, padding: "4px 6px 8px", marginBottom: 2 };
  if (q.isLoading) return <div style={box}>Loading odds…</div>;
  if (q.isError || !ev) return <div style={box}>Odds for this match are not available right now.</div>;
  return (
    <div style={box}>
      {ev.markets.map((mk, mi) => {
        const isClosed = closed.includes(mi);
        const cols = mk.outcomes.length % 3 === 0 && mk.outcomes.length <= 9 ? 3 : 2;
        return (
          <div key={mi} style={{ background: "#3a3d47", marginTop: 6, borderRadius: 2 }}>
            <div className="curPointer" onClick={() => setClosed((c) => (isClosed ? c.filter((x) => x !== mi) : [...c, mi]))}
              style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", fontWeight: 700, textTransform: "uppercase" }}>
              <span>{mk.name}</span><span>{isClosed ? "▾" : "▴"}</span>
            </div>
            {!isClosed && (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 3, padding: "0 10px 10px" }}>
                {mk.outcomes.map((o, oi) => {
                  const key = `${id}-m${mi}-${oi}`;
                  const on = sels.some((x) => x.key === key);
                  return (
                    <div key={oi} className="curPointer"
                      onClick={() => o.odds && toggle({ key, eventId: id, match: `${ev.home} - ${ev.away}`, pick: `${mk.name}: ${o.name}`, odds: o.odds })}
                      style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 10px", background: on ? "rgb(0,166,90)" : "#2a2c33", color: on ? "#fff" : "#e6e6e8", fontWeight: 700, textTransform: "uppercase" }}>
                      <span>{o.name}</span><b style={{ color: on ? "#fff" : "#22d47e" }}>{o.odds ? o.odds.toFixed(2) : "-"}</b>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
