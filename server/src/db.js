import mongoose from 'mongoose';

/* اتصال به مونگو‌دی‌بی.

   پیام‌های این فایل عمداً انگلیسی‌اند: اینجا خروجیِ خط فرمان
   است، و پنجرهٔ cmd ویندوز حروف فارسی را «?» چاپ می‌کند.
   متن‌هایی که مشتری در سایت می‌بیند همچنان فارسی‌اند. */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('\nX  MONGODB_URI is not set in server/.env\n');
    process.exit(1);
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000
    });
    console.log('OK Database connected:', mongoose.connection.name);
  } catch (err) {
    console.error('\nX  Could not connect to MongoDB.');
    console.error('   URI:  ', uri);
    console.error('   Error:', err.message);
    console.error('\n   Make sure the MongoDB service is running.');
    console.error('   In PowerShell as administrator:  net start MongoDB\n');
    process.exit(1);
  }

  /* اگر وسط کار اتصال قطع شد، فقط لاگ می‌کنیم؛
     mongoose خودش دوباره وصل می‌شود. */
  mongoose.connection.on('disconnected', () => {
    console.warn('.. Database disconnected, retrying');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('OK Database reconnected');
  });
}
