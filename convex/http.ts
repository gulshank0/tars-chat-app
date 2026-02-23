import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

// Clerk webhook to sync users
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();

    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.log("No webhook secret configured, accepting request");
      // Process without verification for development
    } else {
      try {
        const wh = new Webhook(webhookSecret);
        wh.verify(body, {
          "svix-id": svix_id,
          "svix-timestamp": svix_timestamp,
          "svix-signature": svix_signature,
        });
      } catch (err) {
        console.error("Webhook verification failed:", err);
        return new Response("Webhook verification failed", { status: 400 });
      }
    }

    const event = JSON.parse(body);

    if (event.type === "user.created" || event.type === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } = event.data;
      
      const email = email_addresses?.[0]?.email_address || "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || "User";

      await ctx.runMutation(api.users.upsertUser, {
        clerkId: id,
        email,
        name,
        imageUrl: image_url,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
