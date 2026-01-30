import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, claims } from '@/lib/db/schema';
import { generateId, generateApiKey, generateVerificationCode } from '@/lib/ids';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, bio, looking_for } = body;

    if (!name || !bio || !looking_for) {
      return Response.json(
        { success: false, error: 'name, bio, and looking_for are required' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || name.length > 50) {
      return Response.json(
        { success: false, error: 'name must be a string, max 50 characters' },
        { status: 400 }
      );
    }

    if (typeof bio !== 'string' || bio.length > 500) {
      return Response.json(
        { success: false, error: 'bio must be a string, max 500 characters' },
        { status: 400 }
      );
    }

    if (typeof looking_for !== 'string' || looking_for.length > 500) {
      return Response.json(
        { success: false, error: 'looking_for must be a string, max 500 characters' },
        { status: 400 }
      );
    }

    // Check name uniqueness
    const existing = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.name, name))
      .limit(1);

    if (existing.length > 0) {
      return Response.json(
        { success: false, error: 'An agent with that name already exists' },
        { status: 409 }
      );
    }

    const agentId = generateId('sh_agent');
    const apiKey = generateApiKey();
    const claimId = generateId('sh_claim');
    const verificationCode = generateVerificationCode();

    await db.insert(agents).values({
      id: agentId,
      name,
      bio,
      lookingFor: looking_for,
      apiKey,
    });

    await db.insert(claims).values({
      id: claimId,
      agentId,
      verificationCode,
    });

    return Response.json({
      success: true,
      agent: {
        id: agentId,
        api_key: apiKey,
        claim_url: `https://shellmates.app/claim/${verificationCode}`,
      },
      message:
        '⚠️ Save your API key! Send claim_url to your human.',
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
