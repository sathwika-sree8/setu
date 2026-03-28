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

export function investorSummaryToContext(summary: {
  totalInvested: number;
  activeInvestments: number;
  investmentCount: number;
}): string {
  const total = summary.totalInvested.toLocaleString();
  return `Portfolio Summary:\n\nTotal invested: $${total}\nActive investments: ${summary.activeInvestments}\nTotal deals: ${summary.investmentCount}`;
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

export function startupDetailsToContext(args: {
  startup: {
    id: string;
    name: string;
    sector: string | null;
    description: string | null;
    website: string | null;
    createdAt: Date;
  } | null;
  investments: Array<{
    id: string;
    amount: number;
    equity: number | null;
    dealStage: string;
    investmentType: string;
    createdAt: Date;
  }>;
  updates: Array<{
    id: string;
    title: string | null;
    content: string;
    updateType: string;
    createdAt: Date;
  }>;
}): string {
  const { startup, investments, updates } = args;

  if (!startup) {
    return "No data is available for the selected startup.";
  }

  const createdAt = new Date(startup.createdAt).toLocaleDateString();

  const header = `Startup: ${startup.name}
Sector: ${startup.sector || "N/A"}
Website: ${startup.website || "N/A"}
Created: ${createdAt}

Description:
${startup.description || "No description available."}`;

  const investmentsContext = investmentsToContext(
    investments.map((inv) => ({
      id: inv.id,
      amount: inv.amount,
      startupId: startup.id,
      dealStage: inv.dealStage,
      investmentType: inv.investmentType,
      createdAt: inv.createdAt,
      startup: {
        id: startup.id,
        name: startup.name,
        sector: startup.sector,
        description: startup.description,
      },
    }))
  );

  const updatesContext = updatesToContext(updates);

  return `${header}\n\n${investmentsContext}\n\n${updatesContext}`;
}
