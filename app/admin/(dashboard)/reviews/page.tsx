import { createServerSupabaseClient } from "@/lib/supabase/server";
import ReviewsModerationList from "@/components/admin/ReviewsModerationList";

export default async function AdminReviewsPage() {
  const supabase = createServerSupabaseClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, customer_name, rating, review_text, is_approved, created_at, products(name)")
    .order("is_approved", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-semibold">Reviews</h1>
      <ReviewsModerationList reviews={(reviews ?? []) as any} />
    </div>
  );
}
