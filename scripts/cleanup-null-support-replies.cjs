const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning invalid SupportTicketReply records...");

  const result = await prisma.$runCommandRaw({
    delete: "SupportTicketReply",
    deletes: [
      {
        q: {
          $or: [
            { authorId: null },
            { authorId: { $exists: false } }
          ]
        },
        limit: 0
      }
    ]
  });

  console.log("Cleanup result:", result);
}

main()
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });