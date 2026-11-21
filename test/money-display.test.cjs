const test=require('node:test'),a=require('node:assert/strict'),L=require('../src/luma');
test('money is grouped in threes; reading an old report leaves dates and non-currency numbers alone',()=>{a.equal(L.format(1000000),'₥1,000,000');a.equal(L.format(-12500),'−₥12,500');a.equal(L.inText('2026: ₥1250000 and £5000, then ₥4,000.'),'2026: ₥1,250,000 and £5,000, then ₥4,000.');});
