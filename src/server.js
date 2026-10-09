const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { initSocket } = require("./socket");
const { port } = require("./config/env");

(async () => {
  await connectDB();
  const server = http.createServer(app);
  initSocket(server);
  server.listen(port, () => console.log(`Server running on :${port}`));
})();
