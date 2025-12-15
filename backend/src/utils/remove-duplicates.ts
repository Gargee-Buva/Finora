// backend/src/utils/remove-duplicates.ts
import mongoose from "mongoose";
import connectDatabase from "../config/database.config.js";
import TransactionModel from "../models/transaction.model.js";

(async () => {
  try {
    await connectDatabase();

    const groups = await TransactionModel.aggregate([
      {
        $group: {
          _id: { userId: "$userId", title: "$title", date: "$date" },
          ids: { $push: { id: "$_id", amount: "$amount", createdAt: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    console.log("Duplicate groups found:", groups.length);

    for (const g of groups) {
      // sort group items by amount ascending -> keep smallest
      const items = g.ids.sort((a: any, b: any) => a.amount - b.amount);
      const keep = items[0].id;
      const remove = items.slice(1).map((it: any) => it.id);
      if (remove.length) {
        await TransactionModel.deleteMany({ _id: { $in: remove } });
        console.log(`Kept ${keep.toString()} — removed ${remove.length} duplicates for:`, g._id);
      }
    }

    console.log("✅ Duplicate cleanup finished.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
  }
})();
