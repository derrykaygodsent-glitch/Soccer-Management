const test = require("node:test"),
  a = require("node:assert/strict"),
  T = require("../src/transfer-centre");
test("deal room separates registered moves from offers and scheduled deals, never uses a valuation as a price", () => {
  const s = {
    club: { name: "Port" },
    moves: [
      { id: "old", day: 1, from: "Gate", to: "Port" },
      { id: "sale", day: 2, from: "Port", to: "Gate", price: 1250000 },
    ],
    plans: [
      {
        kind: "marketDeal",
        type: "loan",
        id: "next",
        due: 4,
        to: "Port",
        from: "City",
        price: 9000,
      },
    ],
    bids: {
      b: {
        id: "b",
        from: "Port",
        to: "City",
        price: 20000,
        status: "open",
        opened: 3,
      },
    },
  };
  const d = T.deals(s);
  a.deepEqual(
    d.in.map((x) => x.id),
    ["next", "old"],
  );
  a.deepEqual(
    d.out.map((x) => x.id),
    ["b", "sale"],
  );
  a.equal(d.in[1].price, null);
  a.equal(d.out[1].price, 1250000);
  a.deepEqual(
    d.world.map((x) => x.id),
    ["sale", "old"],
  );
  s.transferWire = [
    { id: "old", day: 1, text: "Gate to Port · permanent transfer · ₥51,000." },
  ];
  a.equal(T.deals(s).in[1].price, 51000);
});
