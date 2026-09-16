import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const PERIOD_DAYS = 30;

// Configure esta URL (https://SEU-DOMINIO/api/mp-webhook) no painel do
// Mercado Pago em: Developers > Suas integrações > Webhooks.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  const admin = supabaseAdmin();

  try {
    // Checkout Pro (pagamento único — Pix, cartão, boleto)
    if (body.type === 'payment' && body?.data?.id) {
      const payment = new Payment(client);
      const info = await payment.get({ id: body.data.id });
      const userId = info.external_reference;
      if (!userId) return NextResponse.json({ ok: true });

      if (info.status === 'approved') {
        const validUntil = new Date(Date.now() + PERIOD_DAYS * 86400000).toISOString();
        await admin.from('subscriptions').upsert({
          user_id: userId,
          status: 'active',
          mp_subscription_id: String(body.data.id),
          valid_until: validUntil,
          updated_at: new Date().toISOString(),
        });
      }
      return NextResponse.json({ ok: true });
    }

    // Assinaturas recorrentes (preapproval) — mantido para quando/se vocês
    // ativarem esse produto no painel do Mercado Pago.
    if (body.type === 'preapproval' && body?.data?.id) {
      const preapproval = new PreApproval(client);
      const sub = await preapproval.get({ id: body.data.id });
      const userId = sub.external_reference;
      const status = sub.status === 'authorized' ? 'active' : 'inactive';
      await admin.from('subscriptions').upsert({
        user_id: userId,
        status,
        mp_subscription_id: body.data.id,
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro no webhook MP:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
