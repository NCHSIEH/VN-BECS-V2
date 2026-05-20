import Database from 'better-sqlite3';
import path from 'path';

const sqlite = new Database(path.join('.data', 'lims.sqlite'));
const orders = sqlite.prepare("SELECT * FROM orders WHERE status = 'APPROVED'").all();
console.log('Approved Orders Count:', orders.length);
if (orders.length > 0) {
    console.log('First Order ID:', orders[0].id);
    console.log('First Order Status:', orders[0].status);
}
const allStatuses = sqlite.prepare('SELECT DISTINCT status FROM orders').all();
console.log('All Order Statuses:', allStatuses);
