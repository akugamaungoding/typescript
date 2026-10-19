import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const {
        search = "",
        status, // 'all', '1', '0'
        sortBy = "product_id",
        sortOrder = "desc",
        page = "1",
        limit = "10",
      } = req.query;

      const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNumber = Math.max(1, parseInt(limit as string, 10) || 10);
      const skip = (pageNumber - 1) * limitNumber;

      const validSortFields = [
        "product_id",
        "product_name",
        "price",
        "stock",
        "is_active",
        "created_at",
      ];
      const sortField = validSortFields.includes(String(sortBy))
        ? String(sortBy)
        : "product_id";
      const orderDirection: "asc" | "desc" =
        String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

      const searchTrimmed = String(search).trim();

      const whereCondition: any = {
        AND: [
          searchTrimmed
            ? {
                OR: [
                  { product_name: { contains: searchTrimmed } },
                  { description: { contains: searchTrimmed } },
                ],
              }
            : {},
          status !== undefined && status !== "" && status !== "all"
            ? { is_active: status === "1" || status === "true" }
            : {},
        ],
      };

      const [data, total] = await Promise.all([
        prisma.product_mst.findMany({
          where: whereCondition,
          orderBy: { [sortField]: orderDirection },
          skip,
          take: limitNumber,
        }),
        prisma.product_mst.count({ where: whereCondition }),
      ]);

      return res.status(200).json({
        success: true,
        data,
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      });
    } catch (error: any) {
      console.error("API Error (GET /api/products):", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch products",
      });
    }
  }

  if (req.method === "POST") {
    try {
      const { product_name, description, price, stock } = req.body;

      if (
        !product_name ||
        typeof product_name !== "string" ||
        product_name.trim() === ""
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Product name is required" });
      }

      const numPrice = Number(price);
      const numStock = parseInt(stock, 10);

      if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid non-negative number",
        });
      }

      if (isNaN(numStock) || numStock < 0) {
        return res.status(400).json({
          success: false,
          message: "Stock must be a valid non-negative integer",
        });
      }

      const created = await prisma.product_mst.create({
        data: {
          product_name: product_name.trim(),
          description: description ? String(description).trim() : null,
          price: numPrice,
          stock: numStock,
          is_active: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: created,
      });
    } catch (error: any) {
      console.error("API Error (POST /api/products):", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create product",
      });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
}
