import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Configure esta URL (https://SEU-DOMINIO/api/mp-webhook) no painel do
// Mercado Pago em: Developers > Suas integrações > Webhooks.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  // Mercado Pago manda vários tipos de evento; nos interessa "preapproval"
  const preapprovalId = body?.data?.id;
  if (body.type !== 'preapproval' || !preapprovalId) {
    return NextResponse.json({ ok: true });
  }

  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  const preapproval = new PreApproval(client);

  try {
    const sub = await preapproval.get({ id: preapprovalId });
    const userId = sub.external_reference; // setamos isso ao criar a assinatura
    const status = sub.status === 'authorized' ? 'active' : 'inactive';

    const admin = supabaseAdmin();
    await admin.from('subscriptions').upsert({
      user_id: userId,
      status,
      mp_subscription_id: preapprovalId,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro no webhook MP:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
