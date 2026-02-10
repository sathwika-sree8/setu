#!/usr/bin/env python3

content = '''import { getInvestorRequests } from "@/app/actions/relationships";

export default async function InvestorRequestsPage() {
  const requests = await getInvestorRequests();

  const pending = requests.filter(r => r.status === "PENDING");
  const discussing = requests.filter(r => r.status === "IN_DISCUSSION");
  const accepted = requests.filter(r => r.status === "DEAL_ACCEPTED");

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-bold">My Investment Requests</h1>

      {/* PENDING */}
      <Section title="Pending Responses">
        {pending.map(r => (
          <Card key={r.id}>
            <p>Startup: {r.startupId}</p>
            <span className="text-yellow-600">Awaiting founder response</span>
          </Card>
        ))}
      </Section>

      {/* IN DISCUSSION */}
      <Section title="In Discussion">
        {discussing.map(r => (
          <Card key={r.id}>
            <p>Startup: {r.startupId}</p>
            <span className="text-blue-600">In active discussion</span>
          </Card>
        ))}
      </Section>

      {/* ACCEPTED */}
      <Section title="Accepted Deals">
        {accepted.map(r => (
          <Card key={r.id}>
            <p>Startup: {r.startupId}</p>
            <span className="text-green-600">Deal accepted</span>
          </Card>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-semibold mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border p-4 rounded space-y-2">
      {children}
    </div>
  );
}'''

with open('app/investor/requests/page.tsx', 'w') as f:
    f.write(content)

print('File updated successfully')
