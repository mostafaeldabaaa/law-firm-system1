const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const { initFirebase } = require("../src/config/firebase");
const connectDB = require("../src/config/db");
const app = require("../app");

// init services مرة واحدة
let isInitialized = false;

module.exports = async (req, res) => {
  try {
    if (!isInitialized) {
      await connectDB();
      initFirebase();
      isInitialized = true;
      console.log("✅ Server initialized");
    }

    return app(req, res); // تشغيل express
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};
