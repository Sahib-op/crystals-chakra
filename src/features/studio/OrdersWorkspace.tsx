import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { StudioOrder } from '../../../shared/studio-contracts.ts';
import { studioApi } from './api.ts';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

function statusLabel(status: string | null) {
  if (!status) return 'Not reported';
  if (status === 'partial') return 'Partially fulfilled';
  return status[0]!.toUpperCase() + status.slice(1).replaceAll('_', ' ');
}

function OrderRow({ order }: { order: StudioOrder }) {
  const total = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: order.currency,
    minimumFractionDigits: order.currencyDecimals,
    maximumFractionDigits: order.currencyDecimals,
  }).format(order.totalMinor / 10 ** order.currencyDecimals);
  return (
    <li className="studio-order">
      <div className="studio-order-reference">
        <h3>{order.name}</h3>
        <time dateTime={order.createdAt}>
          {dateFormat.format(new Date(order.createdAt))} IST
        </time>
        {order.cancelledAt && (
          <span className="studio-order-cancelled">Cancelled</span>
        )}
      </div>
      <dl className="studio-order-details">
        <div>
          <dt>Payment</dt>
          <dd>{statusLabel(order.financialStatus)}</dd>
        </div>
        <div>
          <dt>Fulfilment</dt>
          <dd>{statusLabel(order.fulfillmentStatus)}</dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd>{order.itemCount}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{total}</dd>
        </div>
      </dl>
    </li>
  );
}

export default function OrdersWorkspace({
  token,
  userId,
  onAccessError,
}: {
  token: string;
  userId: string;
  onAccessError: (error: unknown) => void;
}) {
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1) ?? null;
  const orders = useQuery({
    queryKey: ['studio', userId, 'orders', cursor],
    queryFn: ({ signal }) => studioApi.orders(token, cursor, signal),
  });
  useEffect(() => {
    if (orders.error) onAccessError(orders.error);
  }, [orders.error, onAccessError]);
  const page = orders.data;
  const nextCursor = page?.nextCursor;
  return (
    <section className="studio-workspace" aria-labelledby="studio-orders-title">
      <header className="studio-toolbar">
        <h2 id="studio-orders-title">Orders</h2>
        <button
          type="button"
          className="studio-secondary studio-order-refresh"
          disabled={orders.isFetching}
          onClick={() => void orders.refetch()}
        >
          {orders.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>
      <div className="studio-orders-body">
        {orders.isPending && <p role="status">Loading orders…</p>}
        {orders.isError && (
          <p className="studio-error" role="alert">
            {page
              ? 'Orders could not be refreshed.'
              : 'Orders could not be loaded.'}
          </p>
        )}
        {page && page.items.length === 0 && (
          <p role="status">
            {cursor
              ? 'There are no orders on this page.'
              : 'Shopify orders will appear here as they are received.'}
          </p>
        )}
        {page && page.items.length > 0 && (
          <ul className="studio-order-list" aria-label="Shopify orders">
            {page.items.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
        )}
        {(cursor || nextCursor) && (
          <nav className="studio-order-pages" aria-label="Order pages">
            <button
              className="studio-secondary"
              type="button"
              disabled={!cursor}
              onClick={() => setCursors((previous) => previous.slice(0, -1))}
            >
              Newer orders
            </button>
            <span aria-live="polite">Page {cursors.length + 1}</span>
            <button
              className="studio-secondary"
              type="button"
              disabled={!nextCursor}
              onClick={() => {
                if (nextCursor)
                  setCursors((previous) => [...previous, nextCursor]);
              }}
            >
              Older orders
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}
