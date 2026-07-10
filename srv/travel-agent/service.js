/* eslint-disable no-await-in-loop */
/**
 * Travel Agent — Deep agent orchestrator for @cap-js/agents.
 *
 * Lives in the same xtravels CAP process as the Fiori UI on :4004.
 *
 * Coordinates:
 *   - Downstream A2A agents (hotel, event) on xhotels :4006
 *   - MCP server (xflights) on :4005 for flight master data + bookings
 *   - Local CAP TravelService for write-back of the confirmed itinerary
 *     via the `createTravel` action defined on TravelAgentService itself.
 *
 * Wiring style (post-@cap-js/agents migration):
 *   - The plugin's auto-build path reads AGENTS.md + skills/ from the slug
 *     directory `srv/travel-agent/` (resolved from the service name) and
 *     constructs a deepagents graph.
 *   - We participate via three event handlers in init():
 *       buildTools         — extend the default CDS-derived tools with
 *                             externally-discovered A2A + MCP tools.
 *       buildContentFilter — return {} to keep the content filter off.
 *       createTravel       — perform the actual deep INSERT into Travels
 *                             and auto-derive the trip period from flight dates.
 *   - HITL on createTravel is declarative: the action is annotated with
 *     `@UI.IsActionCritical` in CDS; the plugin auto-applies `interruptOn`.
 *   - Tool instrumentation (tracing/audit/metrics) is auto-applied by the
 *     plugin's `srv.after("buildTools", instrumentTools)` default handler;
 *     we do not call instrumentTools ourselves.
 */
const cds = require("@sap/cds");

const LOG = cds.log("travel-agent");

const A2A_AGENTS = [
  "http://localhost:4006/a2a/hotel",
  "http://localhost:4006/a2a/event",
];

const MCP_SERVERS = {
  flights: { url: "http://localhost:4005/mcp/data" },
};

function extractText(result) {
  if (!result) return "No response from agent.";

  if (result.kind === "task") {
    const statusText = result.status?.message?.parts
      ?.filter((p) => p.kind === "text")
      .map((p) => p.text)
      .join("\n");
    if (statusText) return statusText;

    const artifactText = result.artifacts
      ?.flatMap((a) => a.parts)
      .filter((p) => p.kind === "text")
      .map((p) => p.text)
      .join("\n");
    if (artifactText) return artifactText;

    return `Task ${result.id}: ${result.status?.state || "unknown"}`;
  }

  if (result.kind === "message") {
    return (
      result.parts
        ?.filter((p) => p.kind === "text")
        .map((p) => p.text)
        .join("\n") || "Empty message."
    );
  }

  return JSON.stringify(result);
}

function createA2ATool(tool, client, agentCard) {
  const name = agentCard.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const skills =
    agentCard.skills
      ?.map((s) => `  - ${s.name}: ${s.description || ""}`)
      .join("\n") || "";
  const description = `${agentCard.description || agentCard.name}${skills ? "\nSkills:\n" + skills : ""}`;

  return tool(
    async ({ message }) => {
      try {
        const result = await client.sendMessage({
          message: {
            kind: "message",
            messageId: cds.utils.uuid(),
            role: "user",
            parts: [{ kind: "text", text: message }],
          },
        });
        return extractText(result);
      } catch (err) {
        LOG.warn("A2A tool error caught (deepagents workaround)", {
          agent: agentCard.name,
          error: err.message,
        });
        return `Error communicating with ${agentCard.name}: ${err.message}`;
      }
    },
    {
      name,
      description,
      // FIXME: Replace usage of zod in the lines below
      schema: z.object({
        message: z.string().describe("The request to send to this agent"),
      }),
    },
  );
}

async function discoverTools({ tool }) {
  const { ClientFactory } = await import("@a2a-js/sdk/client");
  const { MultiServerMCPClient } = await import("@langchain/mcp-adapters");
  const factory = new ClientFactory();

  const tools = [];

  // Connect to A2A agents (natural language delegation)
  for (const url of A2A_AGENTS) {
    try {
      LOG.info("Connecting to A2A agent", { url });
      const cardRes = await fetch(`${url}/.well-known/agent-card.json`);
      if (!cardRes.ok)
        throw new Error(`Agent card fetch failed: ${cardRes.status}`);
      const card = await cardRes.json();
      const client = await factory.createFromAgentCard(card);
      tools.push(createA2ATool(tool, client, card));
      LOG.info("Connected to A2A agent", {
        agent: card.name,
        skills: card.skills?.length || 0,
      });
    } catch (err) {
      LOG.warn("Failed to connect to A2A agent", { url, error: err.message });
    }
  }

  for (const [serverName, serverConfig] of Object.entries(MCP_SERVERS)) {
    try {
      LOG.info("Connecting to MCP server", {
        server: serverName,
        url: serverConfig.url,
      });
      const mcpClient = new MultiServerMCPClient({
        mcpServers: { [serverName]: serverConfig },
      });
      const mcpTools = await mcpClient.getTools();
      for (const mcpTool of mcpTools) {
        const tracedInvoke = mcpTool.invoke.bind(mcpTool);
        mcpTool.invoke = async (args, config) => {
          try {
            return await tracedInvoke(args, config);
          } catch (err) {
            LOG.debug("MCP tool error caught (deepagents workaround)", {
              tool: mcpTool.name,
              error: err.message,
            });
            return `Error: ${err.message}`;
          }
        };
      }
      tools.push(...mcpTools);
      LOG.info("Connected to MCP server", {
        server: serverName,
        tools: mcpTools.length,
      });
    } catch (err) {
      LOG.warn("Failed to connect to MCP server", {
        server: serverName,
        error: err.message,
      });
    }
  }

  if (tools.length === 0) {
    throw new Error(
      "No downstream agents or MCP servers available. Make sure xhotels (4006) and xflights (4005) are running.",
    );
  }

  return tools;
}

module.exports = class TravelAgentServiceHandler extends (
  cds.ApplicationService
) {
  async init() {
    const { tool } = await import("@langchain/core/tools");

    this.on("buildTools", async (req, next) => {
      const tools = await next();
      tools.push(...(await discoverTools({ tool })));
      return tools;
    });

    this.on("buildContentFilter", () => ({}));

    this.on("createTravel", async (req) => {
      const TravelService = await cds.connect.to("TravelService");
      const today = new Date().toISOString().slice(0, 10);
      const {
        Description,
        Customer,
        BookingFee,
        Currency,
        Bookings = [],
      } = req.data;

      if (!Bookings.length) {
        return req.reject(
          400,
          "Bookings is required and must contain at least one flight.",
        );
      }

      // Trip period is derived from the actual flight dates, not from any
      // BeginDate/EndDate the LLM might have passed. This eliminates a class
      // of failures where the year of the trip period and the year of the
      // flight dates drift apart (LLMs occasionally do "this year" vs. "next
      // year" math wrong). Span = [min(flightDates) - 1 day, max(flightDates) + 1 day]
      // so the traveller arrives the day before the first flight and leaves
      // the day after the last flight.
      const flightDates = Bookings
        .map((b) => b.FlightDate)
        .filter(Boolean)
        .sort();
      if (flightDates.length === 0) {
        return req.reject(
          400,
          "Each booking must include a FlightDate (YYYY-MM-DD).",
        );
      }
      const shift = (iso, days) => {
        const d = new Date(`${iso}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
      };
      const BeginDate = shift(flightDates[0], -1);
      const EndDate = shift(flightDates[flightDates.length - 1], +1);

      const payload = {
        Description,
        BeginDate,
        EndDate,
        Customer_ID: Customer,
        Agency_ID: "070666", // AI Agency
        BookingFee: BookingFee ?? 0,
        Currency_code: Currency ?? "EUR",
        Bookings: Bookings.map((b, i) => ({
          Pos: i + 1,
          Flight_ID: b.Flight,
          Flight_date: b.FlightDate,
          FlightPrice: b.FlightPrice,
          Currency_code: b.Currency ?? Currency ?? "EUR",
          BookingDate: today,
        })),
      };

      const { Travels } = TravelService.entities;

      let created;
      try {
        created = await TravelService.run(
          INSERT.into(Travels).entries(payload),
        );
      } catch (e) {
        // Unwrap MULTIPLE_ERRORS / nested validation messages so the LLM
        // sees a useful description and can self-correct on the next turn,
        // instead of looping on the opaque "MULTIPLE_ERRORS" code.
        const flatten = (err) => {
          if (!err) return [];
          const here = [];
          if (err.message && err.message !== "MULTIPLE_ERRORS") here.push(err.message);
          for (const d of err.details || []) here.push(...flatten(d));
          return here;
        };
        const messages = [...new Set(flatten(e))].filter(Boolean);
        const detail = messages.length
          ? `: ${messages.join("; ")}`
          : "";
        throw new Error(`createTravel failed${detail}`, { cause: e });
      }

      const ID = (Array.isArray(created) ? created[0] : created)?.ID;
      return await TravelService.run(
        SELECT.one
          .from(Travels, ID)
          .columns("ID", "Description", "BeginDate", "EndDate"),
      );
    });

    await super.init();
  }
};
