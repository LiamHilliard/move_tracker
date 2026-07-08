import { redirect } from "next/navigation";

// Logging moved onto the Top Lists page (search icon). Keep this route as a
// redirect so old links/bookmarks still land somewhere sensible.
export default function LogPage() {
  redirect("/");
}
