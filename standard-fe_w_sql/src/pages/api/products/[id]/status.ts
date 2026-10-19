import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
  }

  const { id } = req.query;
  const productId = parseInt(String(id), 10);

  if (isNaN(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  try {
    const existing = await prisma.product_mst.findUnique({
      where: { product_id: productId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const newStatus =
      req.body.is_active !== undefined
        ? Boolean(req.body.is_active)
        : !existing.is_active;

    const updated = await prisma.product_mst.update({
      where: { product_id: productId },
      data: {
        is_active: newStatus,
        updated_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: newStatus
        ? "Product activated successfully"
        : "Product deactivated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("API Error (PUT /api/products/[id]/status):", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update product status",
    });
  }
}
