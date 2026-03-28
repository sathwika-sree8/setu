import { getStartupUpdates } from "@/app/actions/founderFeed";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Globe, Heart, Lock, MessageCircle, Share2 } from "lucide-react";

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
      <div className="rounded-2xl border border-white/15 bg-[#121416] py-12 text-center text-white/65 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
        <p>No updates yet.</p>
        {isFounder && (
          <p className="mt-2 text-sm text-white/45">
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
        <div className="rounded-2xl border border-orange-400/25 bg-orange-400/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-orange-300" />
            <h3 className="font-semibold text-orange-200">Investor-Only Updates</h3>
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
            <div className="mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-white/70" />
              <h3 className="font-semibold text-white/85">Public Updates</h3>
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
    REVENUE: "bg-orange-500/10 text-orange-200 border border-orange-400/30",
    FUNDRAISING: "bg-orange-500/10 text-orange-200 border border-orange-400/30",
    PRODUCT: "bg-white/5 text-white/80 border border-white/15",
    HIRING: "bg-white/5 text-white/80 border border-white/15",
    RISKS: "bg-red-500/10 text-red-300 border border-red-400/30",
    GENERAL: "bg-white/5 text-white/80 border border-white/15",
  };

  return (
    <article
      className={`group rounded-2xl border bg-[#131518] p-5 text-white shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(0,0,0,0.30)] ${
        isPrivate ? "border-orange-400/35 hover:border-orange-400/50" : "border-white/15 hover:border-orange-400/35"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-3">
            {update.author?.image ? (
              <img
                src={update.author.image}
                alt={update.author.name || "Author"}
                className="h-10 w-10 rounded-full border border-white/20 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm font-semibold text-white/80">
                {(update.author?.name || "A").charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{update.author?.name || "Founder"}</p>
              <p className="text-xs text-white/55">{formatRelativeTime(update.createdAt)}</p>
            </div>
          </div>

          {/* Header with badges */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {update.title && (
              <h4 className="font-semibold text-white">{update.title}</h4>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                typeColors[update.updateType] || typeColors.GENERAL
              }`}
            >
              {update.updateType.charAt(0) + update.updateType.slice(1).toLowerCase()}
            </span>
            {isPrivate && (
              <Badge variant="outline" className="border-orange-400/35 bg-orange-500/10 text-orange-200">
                🔒 Investors Only
              </Badge>
            )}
          </div>

          {/* Content */}
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">{update.content}</p>

          {update.imageUrl && (
            <img
              src={update.imageUrl}
              alt="update"
              className="mt-4 max-h-96 w-full rounded-xl border border-white/10 object-cover"
            />
          )}

          {/* Footer */}
          <div className="mt-4 border-t border-white/10 pt-2">
            <div className="mb-3 flex items-center justify-between text-xs text-white/60">
              <span>{isPrivate ? "Private visibility" : "Public visibility"}</span>
              <span>{formatRelativeTime(update.createdAt)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition-all duration-200 hover:bg-white/5 hover:text-white">
                <Heart className="h-4 w-4" />
                Like
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition-all duration-200 hover:bg-white/5 hover:text-white">
                <MessageCircle className="h-4 w-4" />
                Comment
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition-all duration-200 hover:bg-white/5 hover:text-white">
                <Share2 className="h-4 w-4" />
                Share
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

