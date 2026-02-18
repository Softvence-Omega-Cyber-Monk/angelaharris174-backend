import { PrismaClient } from './prisma/generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Plans ---');
    try {
        const plans = await (prisma as any).plan.findMany();
        console.log(JSON.stringify(plans, null, 2));
    } catch (err) {
        console.error('Error fetching plans:', err.message);
    }

    console.log('\n--- Users with Stripe Customer IDs ---');
    try {
        const users = await (prisma as any).user.findMany({
            where: {
                stripeCustomerId: { not: null }
            },
            select: {
                id: true,
                email: true,
                stripeCustomerId: true,
                subscribeStatus: true
            }
        });
        console.log(JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Error fetching users:', err.message);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
