const mongoose = require('mongoose');

const connectDB = async () => {
    try {

        if (!process.env.MONGO_URL) {
            throw new Error("MONGO_URL not found in .env");
        }

        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log("✅ MongoDB Connected Successfully");

    } catch (err) {
        console.log("❌ MongoDB Error:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
