import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Preço da "assinatura" (renovada manualmente por período — ver mp-webhook).
const SUBSCRIPTION_PRICE = 0.50;
const PERIOD_DAYS = 30;

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Faltando SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.' }, { status: 500 });
    }
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Faltando MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.' }, { status: 500 });
    }

    const admin = supabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated', debug_auth_error: authError?.message || null }, { status: 401 });
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL;
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [{
          title: `Assinatura Minuto de Reflexão (${PERIOD_DAYS} dias)`,
          quantity: 1,
          unit_price: SUBSCRIPTION_PRICE,
          currency_id: 'BRL',
        }],
        payer: { email: user.email },
        external_reference: user.id, // usamos isso no webhook pra saber de quem é
        back_urls: { success: `${site}/`, failure: `${site}/`, pending: `${site}/` },
        auto_return: 'approved',
        notification_url: `${site}/api/mp-webhook`,
      },
    });

    return NextResponse.json({ checkoutUrl: result.init_point });
  } catch (err) {
    // DEBUG TEMPORÁRIO: expõe o erro real na resposta. Remover depois.
    console.error('Erro ao criar pagamento:', err);
    return NextResponse.json({
      error: 'mp_error',
      debug_message: err?.message || String(err),
      debug_cause: err?.cause || null,
    }, { status: 500 });
  }
}
