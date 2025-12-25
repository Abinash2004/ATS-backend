import {httpsServer} from "./config/server.ts";
import dotenv from "dotenv";
import {startInitialServers} from "./handler/startup.ts";

const port = process.env.PORT || 3000;
dotenv.config({quiet: true});

startInitialServers().catch(console.error);
httpsServer.listen(port, () => console.log(`server started on port ${port}`));