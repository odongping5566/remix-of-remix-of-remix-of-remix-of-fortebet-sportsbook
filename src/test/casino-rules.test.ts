import { describe, expect, it } from "vitest";
import { filterGames, popularGames, DEFAULT_CASINO_FILTER } from "@/lib/casino";
import type { CasinoGame } from "@/lib/fortebet.functions";

const g = (id: number, name: string, provider: string, tags: string[], popular: number | null = null, sortOrder = 10): CasinoGame => ({
  id, name, provider, ident: name.toLowerCase().replace(/\s/g, ""), image: "", tags, playReal: true, playFun: true, sortOrder, popular, portrait: false,
});

const games = [
  g(204, "Aviator", "Spribe", ["crash"], 1, 40),
  g(20, "Midnight Fruits 81", "Apollo Casino", ["jackpot", "slots"], 2),
  g(5, "Bonus Joker II", "Apollo Casino", ["jackpot", "slots"]),
  g(517, "Hot to Burn", "Pragmatic Play", ["slots"], null, 30),
  g(7, "Crystal miners", "Apollo Casino", ["jackpot", "slots"]),
];

describe("casino lobby rules", () => {
  it("most popular games follow Fortebet's preferred order", () => {
    expect(popularGames(games).map((x) => x.name)).toEqual(["Aviator", "Midnight Fruits 81"]);
  });
  it("unfiltered grid leaves out popular games and sorts by provider order then id", () => {
    expect(filterGames(games, DEFAULT_CASINO_FILTER).map((x) => x.id)).toEqual([5, 7, 517]);
  });
  it("provider filter keeps only that provider (popular included)", () => {
    expect(filterGames(games, { ...DEFAULT_CASINO_FILTER, provider: "apollo_casino" }).map((x) => x.id)).toEqual([5, 7, 20]);
  });
  it("game type filter uses the game tags", () => {
    expect(filterGames(games, { ...DEFAULT_CASINO_FILTER, category: "crash" }).map((x) => x.name)).toEqual(["Aviator"]);
  });
  it("search matches part of the name, any case", () => {
    expect(filterGames(games, { ...DEFAULT_CASINO_FILTER, q: "joker" }).map((x) => x.id)).toEqual([5]);
  });
});
