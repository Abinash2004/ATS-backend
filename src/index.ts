import { httpsServer } from "./config/server";
import dotenv from "dotenv";
import { startInitialServers } from "./handler/startup";

const port = process.env.PORT || 3000;
dotenv.config({ quiet: true });

startInitialServers().catch(console.error);
httpsServer.listen(port, () => console.log(`server started on port ${port}`));
