"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, CreditCard, Download, Wallet, Crown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { adminBlob, saveBlob } from "../adminFetch";
import type { Billing } from "./types";
import { cx, money, num, pkt } from "./format";
import s from "./AdminV2.module.css";

const STATUS_PILL: Record<string, string> = { PAID: s.pG, PENDING: s.pA, FAILED: s.pR, REFUNDED: s.pN };

export function BillingPanel() {
  const [data, setData] = useState<Billing | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams({ status, take: "50" });
      if (search.trim()) q.set("search", search.trim());
      setData(await apiFetch<Billing>(`/admin/billing?${q}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load billing");
    }
  }, [search, status]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, search]);

  async function pdf(id: string, number: string) {
    setBusy(id);
    try {
      const { blob, filename } = await adminBlob(`/admin/billing/invoices/${encodeURIComponent(id)}/pdf`);
      saveBlob(blob, filename || `invoice-${number}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBusy(null);
    }
  }

  const sm = data?.summary;
  const cur = sm?.currency || "USD";
  return (
    <>
      <div className={s.sh}>
        <div>
          <h2>Billing, invoices &amp; balances</h2>
          <p>Revenue, payouts and every invoice</p>
        </div>
      </div>
      {error && <div className={s.error} role="alert">{error}</div>}
      {sm && !sm.providerConnected && (
        <div className={s.notice} role="status">
          No payment provider is connected yet (Paddle / Safepay). Figures below are real database totals and stay at 0 until the first payment.
        </div>
      )}
      <div className={s.bill}>
        <div className={cx(s.card, s.bc, s.bcHero)}>
          <div className={s.kl}><i className={s.ki} style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}><CreditCard size={14} /></i><span>Total revenue</span></div>
          <div className={s.kv}>{sm ? money(sm.totalRevenueCents, cur) : "…"}</div>
          <div className={s.kd}>{sm ? `${num(sm.paidInvoices)} paid invoices` : ""}</div>
        </div>
        <div className={cx(s.card, s.bc)}>
          <div className={s.kl}><i className={s.ki} style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}><Wallet size={14} /></i><span>Available balance</span></div>
          <div className={s.kv}>{sm ? money(sm.availableBalanceCents, cur) : "…"}</div>
          <div className={s.kd}>Settled (older than 7 days)</div>
        </div>
        <div className={cx(s.card, s.bc)}>
          <div className={s.kl}><i className={s.ki} style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}><Clock3 size={14} /></i><span>Pending payout</span></div>
          <div className={s.kv}>{sm ? money(sm.pendingPayoutCents, cur) : "…"}</div>
          <div className={s.kd}>{sm ? `${money(sm.pendingInvoicesCents, cur)} in ${num(sm.pendingInvoices)} unpaid invoices` : ""}</div>
        </div>
        <div className={cx(s.card, s.bc)}>
          <div className={s.kl}><i className={s.ki} style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}><Crown size={14} /></i><span>Active Pro subs</span></div>
          <div className={s.kv}>{sm ? num(sm.activeProSubs) : "…"}</div>
          <div className={s.kd}>{sm ? `${num(sm.failedInvoices)} failed payments` : ""}</div>
        </div>
      </div>

      <section className={cx(s.card, s.pad)} style={{ marginTop: 18 }}>
        <div className={s.ttl}>
          <div><h3>Invoices</h3><small>{data ? `${num(data.total)} invoices` : "Loading…"}</small></div>
          <div className={s.filters}>
            <label className="sr-only" htmlFor="v2-inv-search">Search invoices</label>
            <input id="v2-inv-search" type="search" className={cx(s.input, s.search)} placeholder="Invoice # or email" value={search} maxLength={200} onChange={(e) => setSearch(e.target.value)} />
            <label className="sr-only" htmlFor="v2-inv-status">Status</label>
            <select id="v2-inv-status" className={s.select} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Status: All</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>
        <div className={s.tw}>
          <table className={cx(s.table, s.rt)}>
            <thead>
              <tr><th>Invoice #</th><th>User email</th><th>Plan</th><th>Issued</th><th className={s.right}>Amount</th><th>Status</th><th className={s.right}>PDF</th></tr>
            </thead>
            <tbody>
              {data && data.invoices.length === 0 && (
                <tr><td colSpan={7} className={cx(s.empty, s.tdFull)}>No invoices yet. They appear here automatically once payments are connected.</td></tr>
              )}
              {data?.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td data-l="Invoice #" className={s.amt}>{inv.invoiceNumber}</td>
                  <td data-l="Email" className={s.tdFull}>{inv.userEmail}</td>
                  <td data-l="Plan">{inv.plan === "PRO" ? "Pro" : inv.plan}</td>
                  <td data-l="Issued">{pkt(inv.issuedAt, false)}</td>
                  <td data-l="Amount" className={cx(s.right, s.amt)}>{money(inv.amountCents, inv.currency)}</td>
                  <td data-l="Status"><span className={cx(s.pill, STATUS_PILL[inv.status] || s.pN)}>{inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}</span></td>
                  <td className={s.right}>
                    <button type="button" className={cx(s.btn, s.sm, s.iconOnly)} disabled={busy === inv.id} onClick={() => void pdf(inv.id, inv.invoiceNumber)} aria-label={`Download invoice ${inv.invoiceNumber} PDF`} title="Download PDF">
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
