import { Link } from 'react-router-dom';
import { Check, Clock, MessageSquare, UserPlus, X } from 'lucide-react';
import { useConnectionWith, useRequestConnection, useRespondToConnection } from '../../api/connections.js';
import Button from '../ui/Button.jsx';

/** Connect / Request sent / Accept–Decline / Message, depending on the connection with `userId`. */
export default function ConnectButton({ userId }) {
  const { data: conn, isLoading } = useConnectionWith(userId);
  const request = useRequestConnection();
  const respond = useRespondToConnection();
  const error = request.error || respond.error;

  let content;
  if (isLoading) {
    content = <Button disabled>…</Button>;
  } else if (conn?.status === 'accepted') {
    content = (
      <Button as={Link} to={`/inbox/${conn.id}`}>
        <MessageSquare size={16} /> Message
      </Button>
    );
  } else if (conn?.status === 'pending' && conn.direction === 'outgoing') {
    content = (
      <Button variant="secondary" disabled>
        <Clock size={16} /> Request sent
      </Button>
    );
  } else if (conn?.status === 'pending' && conn.direction === 'incoming') {
    content = (
      <>
        <Button onClick={() => respond.mutate({ id: conn.id, status: 'accepted' })} disabled={respond.isPending}>
          <Check size={16} /> Accept request
        </Button>
        <Button variant="secondary" onClick={() => respond.mutate({ id: conn.id, status: 'declined' })} disabled={respond.isPending}>
          <X size={16} /> Decline
        </Button>
      </>
    );
  } else if (conn?.status === 'declined' && conn.direction === 'outgoing') {
    content = <Button variant="secondary" disabled>Not accepting requests</Button>;
  } else {
    content = (
      <Button onClick={() => request.mutate(Number(userId))} disabled={request.isPending}>
        <UserPlus size={16} /> {request.isPending ? 'Sending…' : 'Connect'}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex gap-2">{content}</div>
      {error && <p role="alert" className="text-xs font-semibold">{error.message}</p>}
    </div>
  );
}
