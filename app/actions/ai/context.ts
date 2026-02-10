export function investmentsToContext(investments: Array<{
  id: string;
  amount: number;
  startupId: string;
  dealStage: string;
  investmentType: string;
  createdAt: Date;
  startup?: {
    id: string;
    name: string;
    sector: string | null;
    description: string | null;
  } | null;
}>): string {
  if (investments.length === 0) {
    return "You haven't made any investments yet.";
  }

  const investmentList = investments.map((inv) => {
    const date = new Date(inv.createdAt).toLocaleDateString();
    return `- Investment in: ${inv.startup?.name || 'Unknown Startup'}
  Amount: $${inv.amount.toLocaleString()}
  Deal Stage: ${inv.dealStage}
  Type: ${inv.investmentType}
  Sector: ${inv.startup?.sector || 'N/A'}
  Date: ${date}`;
  }).join("\n");

  return `Your Investments:\n\n${investmentList}\n\nTotal investments: ${investments.length}`;
}

export function startupsToContext(startups: Array<{
  id: string;
  name: string;
  sector: string | null;
  description: string | null;
  website: string | null;
  createdAt: Date;
}>): string {
  if (startups.length === 0) {
    return "No startups available in the database.";
  }

  const startupList = startups.map((s, i) => {
    return `${i + 1}. ${s.name}
Sector: ${s.sector || 'N/A'}
Description: ${s.description || 'No description'}
Website: ${s.website || 'N/A'}`;
  }).join("\n\n");

  return `Available Startups:\n\n${startupList}`;
}

export function updatesToContext(updates: Array<{
  id: string;
  title: string | null;
  content: string;
  updateType: string;
  createdAt: Date;
}>): string {
  if (updates.length === 0) {
    return "No updates available.";
  }

  const updateList = updates.map((u) => {
    const date = new Date(u.createdAt).toLocaleDateString();
    return `- ${u.title || u.updateType}
  ${u.content}
  Date: ${date}`;
  }).join("\n");

  return `Startup Updates:\n\n${updateList}`;
}
