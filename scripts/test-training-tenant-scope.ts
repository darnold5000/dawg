/**
 * Unit tests for training tenant scoping on the service-role Supabase wrapper.
 * Run: npm run test:training-tenant
 */
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  tenantRpcArgs,
  wrapTableClient,
  wrapTrainingServiceClient,
} from "../lib/supabase/training-client-scope";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

function mockFilterBuilder(calls: string[]) {
  const chain: Record<string, unknown> = {};
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push(`${name}:${JSON.stringify(args)}`);
      return chain;
    };
  chain.eq = record("eq");
  chain.neq = record("neq");
  chain.in = record("in");
  chain.or = record("or");
  chain.select = record("select");
  chain.update = record("update");
  chain.delete = record("delete");
  chain.insert = record("insert");
  chain.upsert = record("upsert");
  return chain;
}

function mockTableClient(calls: string[]) {
  const root = mockFilterBuilder(calls);
  return {
    select: (...args: unknown[]) => {
      calls.push(`table.select:${JSON.stringify(args)}`);
      return root;
    },
    update: (...args: unknown[]) => {
      calls.push(`table.update:${JSON.stringify(args)}`);
      return root;
    },
    delete: () => {
      calls.push("table.delete:[]");
      return root;
    },
    insert: (...args: unknown[]) => {
      calls.push(`table.insert:${JSON.stringify(args)}`);
      return root;
    },
    upsert: (...args: unknown[]) => {
      calls.push(`table.upsert:${JSON.stringify(args)}`);
      return root;
    },
  };
}

function testTenantRpcArgs() {
  assert.deepEqual(tenantRpcArgs(TENANT_A), { p_tenant_id: TENANT_A });
  assert.deepEqual(tenantRpcArgs(TENANT_A, { p_session_id: "s" }), {
    p_tenant_id: TENANT_A,
    p_session_id: "s",
  });
  assert.deepEqual(
    tenantRpcArgs(TENANT_A, { p_tenant_id: TENANT_B, p_session_id: "s" }),
    { p_tenant_id: TENANT_B, p_session_id: "s" },
  );
}

function testSelectUpdateDeleteScope() {
  const calls: string[] = [];
  const table = mockTableClient(calls) as unknown as ReturnType<
    SupabaseClient["from"]
  >;
  const scoped = wrapTableClient(table, TENANT_A);

  scoped.select("*").eq("id", "x");
  assert.ok(
    calls.some((c) => c.startsWith('eq:["tenant_id"') && c.includes(TENANT_A)),
    `expected tenant_id eq, got ${calls.join(" | ")}`,
  );

  calls.length = 0;
  scoped.update({ processed: true }).eq("stripe_event_id", "evt_1");
  assert.ok(calls.some((c) => c.includes("tenant_id")));

  calls.length = 0;
  scoped.delete().eq("id", "row");
  assert.ok(calls.some((c) => c.includes("tenant_id")));
}

function testChainedOrStillWorks() {
  const calls: string[] = [];
  const table = mockTableClient(calls) as unknown as ReturnType<
    SupabaseClient["from"]
  >;
  const scoped = wrapTableClient(table, TENANT_A);
  scoped.select("id").or("status.eq.pending,status.eq.confirmed");
  assert.ok(calls.some((c) => c.startsWith("or:")));
  assert.ok(calls.some((c) => c.includes("tenant_id")));
}

function testInsertUpsertTenantInjection() {
  const calls: string[] = [];
  const table = mockTableClient(calls) as unknown as ReturnType<
    SupabaseClient["from"]
  >;
  const scoped = wrapTableClient(table, TENANT_A);

  scoped.insert({ stripe_event_id: "evt_1" });
  const insertCall = calls.find((c) => c.startsWith("table.insert:"));
  assert.ok(insertCall?.includes(TENANT_A));

  calls.length = 0;
  scoped.upsert(
    { stripe_event_id: "evt_2" },
    { onConflict: "tenant_id,stripe_event_id" },
  );
  const upsertCall = calls.find((c) => c.startsWith("table.upsert:"));
  assert.ok(upsertCall?.includes(TENANT_A));
  assert.ok(upsertCall?.includes("onConflict"));
}

function testRpcWrap() {
  const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
  const base = {
    from: () => mockTableClient([]),
    rpc: (fn: string, args?: Record<string, unknown>) => {
      rpcCalls.push({ fn, args: args ?? {} });
      return Promise.resolve({ data: null, error: null });
    },
  } as unknown as SupabaseClient;

  const wrapped = wrapTrainingServiceClient(base, TENANT_A);
  wrapped.rpc("training_expire_stale_pending_bookings");
  assert.equal(rpcCalls[0]?.args.p_tenant_id, TENANT_A);

  wrapped.rpc("training_merge_guardians", {
    p_canonical_id: "a",
    p_duplicate_id: "b",
  });
  assert.equal(rpcCalls[1]?.args.p_tenant_id, TENANT_A);
  assert.equal(rpcCalls[1]?.args.p_canonical_id, "a");
}

function run() {
  testTenantRpcArgs();
  testSelectUpdateDeleteScope();
  testChainedOrStillWorks();
  testInsertUpsertTenantInjection();
  testRpcWrap();
  console.log("training-tenant-scope: ok");
}

run();
