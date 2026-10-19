import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const productId = parseInt(String(id), 10);

  if (isNaN(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  if (req.method === "GET") {
    try {
      const product = await prisma.product_mst.findUnique({
        where: { product_id: productId },
      });

      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      return res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      console.error("API Error (GET /api/products/[id]):", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch product",
      });
    }
  }

  if (req.method === "PUT") {
    try {
      const { product_name, description, price, stock, is_active } = req.body;

      const existing = await prisma.product_mst.findUnique({
        where: { product_id: productId },
      });

      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      const updateData: any = {};

      if (product_name !== undefined) {
        if (typeof product_name !== "string" || product_name.trim() === "") {
          return res.status(400).json({
            success: false,
            message: "Product name cannot be empty",
          });
        }
        updateData.product_name = product_name.trim();
      }

      if (description !== undefined) {
        updateData.description = description ? String(description).trim() : null;
      }

      if (price !== undefined) {
        const numPrice = Number(price);
        if (isNaN(numPrice) || numPrice < 0) {
          return res.status(400).json({
            success: false,
            message: "Price must be a non-negative number",
          });
        }
        updateData.price = numPrice;
      }

      if (stock !== undefined) {
        const numStock = parseInt(stock, 10);
        if (isNaN(numStock) || numStock < 0) {
          return res.status(400).json({
            success: false,
            message: "Stock cannot be negative",
          });
        }
        updateData.stock = numStock;
      }

      if (is_active !== undefined) {
        updateData.is_active = Boolean(is_active);
      }

      updateData.updated_at = new Date();

      const updated = await prisma.product_mst.update({
        where: { product_id: productId },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: updated,
      });
    } catch (error: any) {
      console.error("API Error (PUT /api/products/[id]):", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update product",
      });
    }
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
}
