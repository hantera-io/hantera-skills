import test from 'node:test';
import assert from 'node:assert/strict';
import { ingress } from '@hantera/cli/test';

const route = 'skill-examples/pricing-plan';

test('applies the second rate to the reduced basis', async () => {
  const result = await ingress(route, { basis: 1000, productRate: 0.1, orderRate: 0.15 });
  assert.equal(Number(result.productDiscount), 100);
  assert.equal(Number(result.orderDiscount), 135);
  assert.equal(Number(result.totalDiscount), 235);
  assert.equal(Number(result.finalAmount), 765);
});

test('supports zero basis and rates', async () => {
  const result = await ingress(route, { basis: 0, productRate: 0, orderRate: 0 });
  assert.equal(Number(result.totalDiscount), 0);
  assert.equal(Number(result.finalAmount), 0);
});

test('rejects a rate outside the supported range', async () => {
  const result = await ingress(route, { basis: 1000, productRate: 1.1, orderRate: 0 });
  assert.equal(result.errors?.[0]?.code, 'INVALID_PRICING_INPUT');
});