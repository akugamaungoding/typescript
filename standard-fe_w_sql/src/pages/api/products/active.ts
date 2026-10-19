import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
  }

  try {
    const products = await prisma.product_mst.findMany({
      where: {
        is_active: true,
      },
      orderBy: { product_name: "asc" },
      select: {
        product_id: true,
        product_name: true,
        price: true,
        stock: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    console.error("API Error (GET /api/products/active):", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch active products",
    });
  }
}
