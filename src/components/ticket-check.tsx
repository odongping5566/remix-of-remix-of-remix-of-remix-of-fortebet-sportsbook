import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkTicket, type TicketDTO, type TicketResult } from "@/lib/fortebet.functions";

const G = "rgb(0,166,90)";
const WIN_BG = "#2fd36f";
const LOST_BG = "#e0433a";
const PANEL = "#3d3f49";
const LIST = "#2e3038";
const LINE = "rgba(255,255,255,0.08)";

/** Grey padlock used for suspended odds (same shape as Fortebet's lock). */
export function LockIcon({ size = 12, color = "#8b8d96" }: { size?: number; color?: string }) {
  return (
    <svg width={size * (16 / 21)} height={size} viewBox="0 0 16 21" aria-label="Suspended" role="img" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path fill={color} d="M5,7v-2c0,-1.66 1.34,-3 3,-3c1.66,0 3,1.34 3,3v2zM8,16c-1.1,0 -2,-0.9 -2,-2c0,-1.1 0.9,-2 2,-2c1.1,0 2,0.9 2,2c0,1.1 -0.9,2 -2,2zM14,7h-1v-2c0,-2.76 -2.24,-5 -5,-5c-2.76,0 -5,2.24 -5,5v2h-1c-1.1,0 -2,0.9 -2,2v10c0,1.1 0.9,2 2,2h12c1.1,0 2,-0.9 2,-2v-10c0,-1.1 -0.9,-2 -2,-2z" />
    </svg>
  );
}

function StatusDot({ status }: { status: string }) {
  const base: CSSProperties = { width: 18, height: 18, borderRadius: 99, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 900, flexShrink: 0 };
  if (status === "LOCKED") return <span style={{ ...base, background: "#25262c" }}><LockIcon size={11} /></span>;
  if (status === "WIN") return <span style={{ ...base, background: WIN_BG }} aria-label="Won">✓</span>;
  if (status === "LOST") return <span style={{ ...base, background: LOST_BG }} aria-label="Lost">✕</span>;
  if (status === "VOID" || status === "CANCELED" || status === "CANCELLED") return <span style={{ ...base, background: "#8b8d96" }} aria-label="Void">–</span>;
  return <span style={{ ...base, border: "2px solid #8b8d96", width: 14, height: 14 }} aria-label="Open" />;
}

export const fmtMoney = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtStamp = (ts: string) => {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("en-US", { month: "short", day: "2-digit" })} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
};
const fmtItemTime = (ts: string) => {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("en-US", { month: "short", day: "2-digit" })} | ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
};

export type SheetItem = { key: string; time: string; match: string; market: string; outcome: string; odds: number; oldOdds?: number | undefined; result?: string | null; status: string };
export type SheetRow = { label: string; value: string; accent?: boolean };

/** Shared ticket layout: header bar, picks on the left, status and totals on the right. */
export function TicketSheet({ title, items, status, rows, number, actions, onClose }: {
  title: string;
  items: SheetItem[];
  status: string;
  rows: SheetRow[];
  number?: string | undefined;
  actions?: ReactNode;
  onClose: () => void;
}) {
  const [byTime, setByTime] = useState(true);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const list = useMemo(() => (byTime ? [...items].sort((a, b) => a.time.localeCompare(b.time)) : items), [items, byTime]);
  const statusBg = status === "WIN" ? WIN_BG : status === "LOST" ? LOST_BG : status === "OPEN" || status === "ACTIVE" ? "#f0b429" : "#6b6d76";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Ticket detail"
        style={{ width: "min(750px,100%)", height: "min(700px,92vh)", display: "flex", flexDirection: "column", background: PANEL, color: "#e6e6e8", borderRadius: 4, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.6)", fontFamily: "inherit" }}>
        <div style={{ display: "flex", alignItems: "stretch", background: G, color: "#fff", fontWeight: 700, fontSize: 13 }}>
          <div style={{ flex: 1, padding: "8px 12px" }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: 0, borderLeft: "1px solid rgba(255,255,255,0.35)", color: "#fff", width: 30, fontSize: 18, fontWeight: 900, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)" }}>
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: LIST, borderRight: "1px solid #1f2025" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 14px", fontSize: 12, background: PANEL }}>
              <span>Sort by match start time</span>
              <button aria-label="Sort by match start time" onClick={() => setByTime((v) => !v)}
                style={{ width: 28, height: 16, borderRadius: 99, border: 0, background: byTime ? "#1f2025" : "#5a5c66", position: "relative", cursor: "pointer", padding: 0 }}>
                <span style={{ position: "absolute", top: 2, left: byTime ? 14 : 2, width: 12, height: 12, borderRadius: 99, background: byTime ? G : "#c9cacf", transition: "left .15s" }} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
              {list.map((it) => (
                <div key={it.key} style={{ padding: "10px 0", borderBottom: `1px solid ${LINE}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span>{fmtItemTime(it.time)} <span className="ico soccer h12 opa06" style={{ display: "inline-block", marginLeft: 6 }} /></span>
                    <StatusDot status={it.status} />
                  </div>
                  <div style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 12, margin: "6px 0 5px" }}>{it.match}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                    <span>{it.market} : <b>{it.outcome}</b></span>
                    <b style={{ whiteSpace: "nowrap" }}>
                      {it.status === "LOCKED" ? <LockIcon size={12} /> : <>{it.oldOdds != null && <s style={{ opacity: 0.5, fontSize: 10, marginRight: 4 }}>{it.oldOdds.toFixed(2)}</s>}{it.odds.toFixed(2)}</>}
                    </b>
                  </div>
                  {it.result && <span style={{ display: "inline-block", marginTop: 6, background: "#d9d9dc", color: "#222", fontWeight: 700, fontSize: 11, padding: "1px 5px", borderRadius: 3 }}>{it.result}</span>}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid #1f2025", minHeight: 50 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 14px" }}>
                <svg width="48" height="26" viewBox="0 0 47 26" aria-hidden="true"><rect x="0" y="0" width="47" height="26" rx="3" fill="#c9cacf" /><rect x="4" y="0" width="5" height="26" fill="#9a9ba2" /></svg>
              </div>
              <div style={{ display: "flex", alignItems: "center", padding: "0 10px", fontWeight: 700, fontSize: 13 }}>STATUS:</div>
              <div style={{ minWidth: 80, display: "flex", alignItems: "center", justifyContent: "center", background: statusBg, color: "#1f2025", fontSize: 18, padding: "0 12px" }}>{status}</div>
            </div>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #1f2025", lineHeight: 1.75, fontSize: 12, fontWeight: 700 }}>
              {rows.map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", color: r.accent ? "#22d47e" : undefined }}><span>{r.label}</span><span>{r.value}</span></div>
              ))}
            </div>
            {actions && <div style={{ padding: 12, borderBottom: "1px solid #1f2025", display: "grid", gap: 8 }}>{actions}</div>}
            {number && <div style={{ margin: 12, background: "#e9e9eb", color: "#333", textAlign: "center", fontSize: 13, padding: "3px 6px" }}>Ticket No. {number}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export const sheetBtn: CSSProperties = { display: "flex", alignItems: "center", gap: 10, background: "#d9d9dc", color: "#222", border: 0, borderRadius: 3, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%" };

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" aria-hidden="true">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

const MODE_LABEL: Record<TicketDTO["mode"], string> = { PREMATCH: "PREMATCH", LIVE: "LIVE", MIXED: "PREMATCH + LIVE", VIRTUAL: "VIRTUAL SOCCER" };

export function TicketDetailModal({ ticket, onClose }: { ticket: TicketDTO; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}/?ticket=${ticket.number}`;
    try {
      if (navigator.share) await navigator.share({ title: `Ticket ${ticket.number}`, url });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled */
    }
  };
  const type = ticket.type === "COMBI" ? "COMBO" : ticket.type;
  const rows: SheetRow[] = [
    { label: "TOTAL ODDS", value: fmtMoney(ticket.totalOdds, 2) },
    { label: "STAKE", value: `${fmtMoney(ticket.stake)} UGX` },
    { label: ticket.status === "WIN" ? "REAL WIN" : "POSSIBLE WIN", value: `${fmtMoney(ticket.status === "WIN" ? ticket.payout : ticket.possible)} UGX`, accent: true },
  ];
  if (ticket.taxRate > 0) rows.push({ label: `WIN TAX ${Math.round(ticket.taxRate * 100)}%`, value: `${fmtMoney(ticket.tax)} UGX` });
  rows.push({ label: "TOTAL PAYOUT", value: `${fmtMoney(ticket.payout)} UGX` });
  return (
    <TicketSheet
      title={`${MODE_LABEL[ticket.mode]} | ${type} ${ticket.items.length} event${ticket.items.length === 1 ? "" : "s"} | ${fmtStamp(ticket.placedAt)}`}
      status={ticket.status}
      rows={rows}
      number={ticket.number}
      onClose={onClose}
      items={ticket.items.map((i, k) => ({ key: String(k), time: i.time, match: i.match, market: i.market, outcome: i.outcome, odds: i.odds, result: i.result, status: i.status }))}
      actions={<button style={sheetBtn} onClick={share}><ShareIcon /> {copied ? "Link copied" : "Share ticket"}</button>}
    />
  );
}

const ERRORS: Record<Exclude<TicketResult, { ok: true }>["error"], string> = {
  SHORT: "The ticket number is at least 14 digits",
  NOT_FOUND: "Ticket number not found",
  UNAVAILABLE: "Ticket check is not available right now. Try again.",
};

/** Right-bar "Ticket search" box: checks a real Fortebet ticket and opens it. */
export function TicketSearch() {
  const check = useServerFn(checkTicket);
  const [num, setNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketDTO | null>(null);
  const run = async (n: string) => {
    setError(null);
    if (!n) return;
    if (n.length < 14) return setError(ERRORS.SHORT);
    setLoading(true);
    try {
      const r = await check({ data: { number: n } });
      if (r.ok) setTicket(r.ticket);
      else setError(ERRORS[r.error]);
    } catch {
      setError(ERRORS.UNAVAILABLE);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("ticket")?.replace(/\D/g, "");
    if (t) {
      setNum(t);
      void run(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div data-ce="sbticket-search" style={{ position: "relative" }}>
      <form className="ticketSearch" onSubmit={(e) => { e.preventDefault(); void run(num); }}>
        <h3>Ticket search</h3>
        <input className="w100p" type="text" placeholder="Insert ticket number ..." name="ticketSearch" inputMode="numeric" aria-label="Ticket number"
          value={num} onChange={(e) => { setNum(e.target.value.replace(/\D/g, "")); setError(null); }} />
        {error && <div className="error-message" role="alert" style={{ fontSize: 12 }}>⚠ {error}</div>}
        <div className="buttons uppercase [font-weight:700]">
          <a className="curPointer" role="button" onClick={() => void run(num)} style={{ opacity: loading ? 0.6 : 1 }}> {loading ? "Checking…" : "Check ticket"} </a>
        </div>
      </form>
      {ticket && <TicketDetailModal ticket={ticket} onClose={() => setTicket(null)} />}
    </div>
  );
}
