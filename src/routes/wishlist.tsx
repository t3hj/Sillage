import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FragranceCard } from "@/components/FragranceCard";
import { Button } from "@/components/ui/button";
import { useSillage } from "@/hooks/useSillage";
import { addToCollection, removeFromWishlist } from "@/lib/storage";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — Sillage" },
      { name: "description", content: "Fragrances you want to try or buy next." },
      { property: "og:title", content: "Wishlist — Sillage" },
      {
        property: "og:description",
        content: "Fragrances you want to try or buy next.",
      },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { data, update } = useSillage();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        Wishlist
      </h1>

      {data.wishlist.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">Nothing saved yet.</p>
          <Button asChild className="mt-4">
            <Link to="/discover">Browse fragrances</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.wishlist.map((w) => (
            <FragranceCard
              key={w.fragrance.id}
              fragrance={w.fragrance}
              footer={
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      update((d) => addToCollection(d, w.fragrance));
                      toast.success(`${w.fragrance.name} moved to your collection`);
                    }}
                  >
                    I bought it
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update((d) => removeFromWishlist(d, w.fragrance.id))}
                  >
                    Remove
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
