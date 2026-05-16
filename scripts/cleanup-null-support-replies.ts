const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("Checking MongoDB collections...");

    const collectionsResult = await prisma.$runCommandRaw({
        listCollections: 1,
    });

    const collections = collectionsResult.cursor.firstBatch.map((c) => c.name);

    console.log("Collections found:");
    console.log(collections);

    const possibleCollections = collections.filter((name) =>
        name.toLowerCase().includes("support") ||
        name.toLowerCase().includes("reply")
    );

    console.log("Possible support/reply collections:");
    console.log(possibleCollections);

    for (const collectionName of possibleCollections) {
        console.log(`Checking collection: ${collectionName}`);

        const countResult = await prisma.$runCommandRaw({
            count: collectionName,
            query: {
                $or: [
                    { authorId: null },
                    { authorId: { $exists: false } },
                ],
            },
        });

        console.log(`Invalid rows in ${collectionName}:`, countResult.n);

        if (countResult.n > 0) {
            const deleteResult = await prisma.$runCommandRaw({
                delete: collectionName,
                deletes: [
                    {
                        q: {
                            $or: [
                                { authorId: null },
                                { authorId: { $exists: false } },
                            ],
                        },
                        limit: 0,
                    },
                ],
            });

            console.log(`Deleted from ${collectionName}:`, deleteResult);
        }
    }

    console.log("Cleanup finished.");
}

main()
    .catch((error) => {
        console.error("Cleanup failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });