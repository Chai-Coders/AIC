import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";

// Components used by the backend. The Agent component stores the AI
// Assistant's chat threads and messages in its own tables.
const app = defineApp();
app.use(agent);

export default app;
