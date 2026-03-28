import { getFounderRequests, acceptRequest, rejectRequest } from "@/app/actions/relationships";

export default async function FounderRequestsPage() {
  const requests = await getFounderRequests();

  const pending = requests.filter(r => r.status === "PENDING");
  const chatting = requests.filter(r => r.status === "IN_DISCUSSION");
  const invested = requests.filter(r => r.status === "DEAL_ACCEPTED");

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-bold text-white">Requests</h1>

      {/* PENDING */}
      <Section title="Pending Requests">
        {pending.map(r => (
          <Card key={r.id}>
            <p className="text-white">Investor: {r.investorId}</p>

            <form action={acceptRequest}>
              <input type="hidden" name="relationshipId" value={r.id} />
              <button className="btn-primary">Accept</button>
            </form>

            <form action={rejectRequest}>
              <input type="hidden" name="relationshipId" value={r.id} />
              <button className="btn-secondary">Reject</button>
            </form>
          </Card>
        ))}
      </Section>

      {/* CHATTING */}
      <Section title="Active Chats">
        {chatting.map(r => (
          <Card key={r.id}>
            <p className="text-white">Investor: {r.investorId}</p>
            <span className="text-green-400">Chat active</span>
          </Card>
        ))}
      </Section>

      {/* INVESTED */}
      <Section title="Completed Deals">
        {invested.map(r => (
          <Card key={r.id}>
            <p className="text-white">Investor: {r.investorId}</p>
            <span className="text-white/65">Deal completed</span>
          </Card>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-semibold mb-3 text-white">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-white/15 p-4 rounded bg-[#131518] space-y-2">
      {children}
    </div>
  );
}
