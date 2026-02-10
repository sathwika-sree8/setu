import { getStartupUpdates } from "@/app/actions/founderFeed";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StartupUpdatesFeedProps {
  startupId: string;
  viewerId?: string;
  isFounder: boolean;
}

export default async function StartupUpdatesFeed({
  startupId,
  viewerId,
  isFounder,
}: StartupUpdatesFeedProps) {
  const updates = await getStartupUpdates(startupId, viewerId, isFounder);

  if (!updates.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No updates yet.</p>
        {isFounder && (
          <p className="text-sm mt-2 text-gray-400">
            Post an update to keep your investors informed.
          </p>
        )}
      </div>
    );
  }

  // Separate public and private updates for display
  const publicUpdates = updates.filter((u) => (u as any).visibility === "PUBLIC");
  const privateUpdates = updates.filter((u) => (u as any).visibility === "INVESTORS_ONLY");

  return (
    <div className="space-y-6">
      {/* Private Updates Section (only show if there are any and user can see them) */}
      {privateUpdates.length > 0 && (isFounder || viewerId) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-600">🔒</span>
            <h3 className="font-semibold text-amber-800">Investor-Only Updates</h3>
          </div>
          <div className="space-y-4">
            {privateUpdates.map((update) => (
              <UpdateCard key={update.id} update={update} isPrivate />
            ))}
          </div>
        </div>
      )}

      {/* Public Updates Section */}
      {publicUpdates.length > 0 && (
        <div>
          {privateUpdates.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span>🌍</span>
              <h3 className="font-semibold">Public Updates</h3>
            </div>
          )}
          <div className="space-y-4">
            {publicUpdates.map((update) => (
              <UpdateCard key={update.id} update={update} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UpdateCard({
  update,
  isPrivate = false,
}: {
  update: any;
  isPrivate?: boolean;
}) {
  const typeColors: Record<string, string> = {
    REVENUE: "bg-green-100 text-green-700",
    FUNDRAISING: "bg-purple-100 text-purple-700",
    PRODUCT: "bg-blue-100 text-blue-700",
    HIRING: "bg-yellow-100 text-yellow-700",
    RISKS: "bg-red-100 text-red-700",
    GENERAL: "bg-gray-100 text-gray-700",
  };

  return (
    <div className={`border rounded-xl p-4 bg-white ${isPrivate ? "border-amber-200" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header with badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {update.title && (
              <h4 className="font-semibold text-gray-900">{update.title}</h4>
            )}
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${
                typeColors[update.updateType] || typeColors.GENERAL
              }`}
            >
              {update.updateType.charAt(0) + update.updateType.slice(1).toLowerCase()}
            </span>
            {isPrivate && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                🔒 Investors Only
              </Badge>
            )}
          </div>

          {/* Content */}
          <p className="text-gray-700 whitespace-pre-wrap">{update.content}</p>

          {/* Footer */}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            {update.author && (
              <div className="flex items-center gap-1">
                {update.author.image && (
                  <img
                    src={update.author.image}
                    alt={update.author.name}
                    className="w-5 h-5 rounded-full"
                  />
                )}
                <span>{update.author.name}</span>
              </div>
            )}
            <span>{formatRelativeTime(update.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

