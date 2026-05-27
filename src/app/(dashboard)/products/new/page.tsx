import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function NewProductPage() {
  await requirePermission(PERMISSIONS.products_write);
  redirect("/products/create");
}
