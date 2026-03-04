interface AdminLinksProps {
  username?: string | null;
  email?: string | null;
  swapId?: string | null;
  ticketId?: number | null;
}

const linkClass = 'text-green hover:text-green/80 text-sm underline underline-offset-2';

export default function AdminLinks({ username, email, swapId, ticketId }: AdminLinksProps) {
  const userIdentifier = username || email;
  const hasUser = userIdentifier && userIdentifier !== 'N/A' && userIdentifier !== '';
  const hasSwap = swapId && swapId !== 'N/A' && swapId !== '';
  const hasTicket = ticketId != null;

  if (!hasUser && !hasSwap && !hasTicket) return null;

  return (
    <div className="flex flex-wrap gap-3 mt-1">
      {hasTicket && (
        <a
          href={`https://sidelineswap.zendesk.com/agent/tickets/${ticketId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Ticket #{ticketId}
        </a>
      )}
      {hasUser && (
        <a
          href={`https://admin.sidelineswap.com/admin/users/${userIdentifier}`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          User Admin
        </a>
      )}
      {hasSwap && (
        <a
          href={`https://admin.sidelineswap.com/admin/swaps/${swapId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Swap Admin
        </a>
      )}
    </div>
  );
}
