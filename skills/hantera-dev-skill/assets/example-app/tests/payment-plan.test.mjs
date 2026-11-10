import test from 'node:test';
import assert from 'node:assert/strict';
import { ingress } from '@hantera/cli/test';

const route = 'skill-examples/payment-plan';

test('plans charge, refund and no-op from provider net balance', async () => {
  const cases = [
    [{ captured: 100, refunded: 20, chargedBalance: 50 }, 'charge', 30],
    [{ captured: 100, refunded: 20, chargedBalance: 100 }, 'refund', 20],
    [{ captured: 100, refunded: 20, chargedBalance: 80 }, 'none', 0],
    [{ captured: 0, refunded: 0, chargedBalance: 0 }, 'none', 0],
  ];

  for (const [input, action, amount] of cases) {
    const result = await ingress(route, input);
    assert.equal(result.action, action);
    assert.equal(Number(result.amount), amount);
  }
});

test('rejects inconsistent provider balances', async () => {
  const result = await ingress(route, { captured: 10, refunded: 20, chargedBalance: 0 });
  assert.equal(result.errors?.[0]?.code, 'INVALID_PROVIDER_AMOUNTS');
});