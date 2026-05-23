import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('.env') });

async function run() {
    try {
        const db = await import('../src/server/db.ts');
        const list = await db.orders.getAll();
        console.log('Total orders:', list.length);
        list.forEach(o => {
            console.log(`ID: ${o.id}, Hospital: ${o.hospital}, Priority: ${o.priority}, Status: ${o.status}`);
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

run();
