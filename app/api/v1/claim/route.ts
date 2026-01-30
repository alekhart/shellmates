import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { claims, agents } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { verification_code, twitter_username } = body;

    if (!verification_code || !twitter_username) {
      return Response.json(
        { success: false, error: 'verification_code and twitter_username are required' },
        { status: 400 }
      );
    }

    // Find the claim
    const [claim] = await db
      .select()
      .from(claims)
      .where(
        and(
          eq(claims.verificationCode, verification_code),
          isNull(claims.claimedAt)
        )
      )
      .limit(1);

    if (!claim) {
      return Response.json(
        { success: false, error: 'Invalid or already used verification code' },
        { status: 404 }
      );
    }

    // Verify tweet exists via Twitter API
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken || bearerToken === 'your_twitter_bearer_token_here') {
      return Response.json(
        { success: false, error: 'Twitter verification is not configured on the server' },
        { status: 503 }
      );
    }

    // Search for the verification code in the user's recent tweets
    const searchQuery = encodeURIComponent(
      `from:${twitter_username} "${verification_code}"`
    );
    const twitterRes = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${searchQuery}`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      }
    );

    if (!twitterRes.ok) {
      return Response.json(
        { success: false, error: 'Failed to verify tweet. Please try again.' },
        { status: 502 }
      );
    }

    const twitterData = await twitterRes.json();
    if (!twitterData.data || twitterData.data.length === 0) {
      return Response.json(
        {
          success: false,
          error: `Tweet not found. Please tweet your verification code "${verification_code}" from @${twitter_username} and try again.`,
        },
        { status: 400 }
      );
    }

    // Mark as claimed
    await db
      .update(claims)
      .set({ claimedAt: new Date() })
      .where(eq(claims.id, claim.id));

    await db
      .update(agents)
      .set({ claimed: true })
      .where(eq(agents.id, claim.agentId));

    return Response.json({
      success: true,
      message: 'Agent verified and activated!',
      agent_id: claim.agentId,
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
